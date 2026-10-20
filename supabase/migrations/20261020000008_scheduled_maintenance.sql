-- ==============================================================================
-- TimeSwap Migration: 20261020000008_scheduled_maintenance.sql
-- Description: Automated Scheduled Maintenance for Expired Requests & Unresolved Sessions
-- Features:
--   1. Enables pg_cron extension safely if available on the PostgreSQL host.
--   2. Enforces strict schema access: revokes cron schema from public/anon/authenticated.
--   3. Schedules idempotent 5-minute background sweep for expire_pending_requests().
--   4. Schedules idempotent hourly background sweep for flag_unresolved_sessions().
--   5. Schedules daily midnight retention purge for cron.job_run_details (7-day window).
--   6. Creates secure maintenance_job_runs observability view for service_role.
-- ==============================================================================

DO $$
BEGIN
    -- --------------------------------------------------------------------------
    -- 1. Enable pg_cron if available on the database server
    -- --------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        -- ----------------------------------------------------------------------
        -- 2. Schema Permissions & Role Isolation
        -- Ensure cron schema is restricted strictly to postgres and service_role.
        -- Explicitly revoke all access from public, anon, and authenticated roles.
        -- ----------------------------------------------------------------------
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
            GRANT USAGE ON SCHEMA cron TO postgres;
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cron TO postgres;
            GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA cron TO postgres;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            GRANT USAGE ON SCHEMA cron TO service_role;
            GRANT SELECT ON ALL TABLES IN SCHEMA cron TO service_role;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            REVOKE ALL ON SCHEMA cron FROM anon;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            REVOKE ALL ON SCHEMA cron FROM authenticated;
        END IF;

        REVOKE ALL ON SCHEMA cron FROM PUBLIC;

        -- ----------------------------------------------------------------------
        -- 3. Schedule: timeswap_expire_pending_requests
        -- Frequency: Every 5 minutes (*/5 * * * *)
        -- Target: Pending requests reaching cutoff (2h before start OR 48h old)
        -- Idempotent: unschedules existing job first if present
        -- ----------------------------------------------------------------------
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'timeswap_expire_pending_requests') THEN
            PERFORM cron.unschedule('timeswap_expire_pending_requests');
        END IF;

        PERFORM cron.schedule(
            'timeswap_expire_pending_requests',
            '*/5 * * * *',
            'SELECT public.expire_pending_requests();'
        );

        -- ----------------------------------------------------------------------
        -- 4. Schedule: timeswap_flag_unresolved_sessions
        -- Frequency: Hourly at minute 0 (0 * * * *)
        -- Target: Sessions 72h past scheduled end without bilateral confirmation
        -- Idempotent: unschedules existing job first if present
        -- ----------------------------------------------------------------------
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'timeswap_flag_unresolved_sessions') THEN
            PERFORM cron.unschedule('timeswap_flag_unresolved_sessions');
        END IF;

        PERFORM cron.schedule(
            'timeswap_flag_unresolved_sessions',
            '0 * * * *',
            'SELECT public.flag_unresolved_sessions();'
        );

        -- ----------------------------------------------------------------------
        -- 5. Schedule: timeswap_cleanup_cron_history
        -- Frequency: Daily at midnight GMT (0 0 * * *)
        -- Target: Purge execution details older than 7 days to prevent table bloat
        -- ----------------------------------------------------------------------
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'timeswap_cleanup_cron_history') THEN
            PERFORM cron.unschedule('timeswap_cleanup_cron_history');
        END IF;

        PERFORM cron.schedule(
            'timeswap_cleanup_cron_history',
            '0 0 * * *',
            'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''7 days'';'
        );

        -- ----------------------------------------------------------------------
        -- 6. Observability View: public.maintenance_job_runs
        -- Provides administrative visibility into scheduled job execution and errors.
        -- Accessible only by service_role and postgres; denied to public/anon/authenticated.
        -- ----------------------------------------------------------------------
        EXECUTE $view$
            CREATE OR REPLACE VIEW public.maintenance_job_runs AS
            SELECT 
                r.runid,
                j.jobname,
                j.schedule,
                r.status,
                r.return_message,
                r.start_time,
                r.end_time,
                ROUND(EXTRACT(EPOCH FROM (r.end_time - r.start_time))::numeric, 3) AS duration_seconds
            FROM cron.job_run_details r
            JOIN cron.job j ON r.jobid = j.jobid
            WHERE j.jobname LIKE 'timeswap_%'
            ORDER BY r.start_time DESC;
        $view$;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            GRANT SELECT ON public.maintenance_job_runs TO service_role;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            REVOKE ALL ON public.maintenance_job_runs FROM anon;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            REVOKE ALL ON public.maintenance_job_runs FROM authenticated;
        END IF;

        REVOKE ALL ON public.maintenance_job_runs FROM PUBLIC;

        RAISE NOTICE 'TimeSwap pg_cron scheduled maintenance jobs registered successfully.';
    ELSE
        RAISE NOTICE 'Extension pg_cron is not available on this server. Skipping cron schedule registration.';
    END IF;
END
$$;
