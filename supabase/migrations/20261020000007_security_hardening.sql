-- ==============================================================================
-- TimeSwap Migration: 20261020000007_phase5a_security_hardening.sql
-- Description: Phase 5A Security Hardening & Integrity Fixes
-- Findings Addressed:
--   - SEC-01: Caller validation & deadline verification for expire_session_request
--   - SEC-02: Removal of client-supplied availability parameter in cancel_session
--   - SEC-03: Protection of reputation metrics (hours, rating, reviews) via trigger
--   - SEC-04: Revocation of public/authenticated grants on batch worker routines
--   - SEC-05: Formalization of background worker execution & no 72h auto-settlement
--   - SEC-06: Handle collision recovery during user registration trigger
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-03: Protect Reputation Metrics on public.profiles
-- Prevents authenticated users from forging hours_taught, hours_learned,
-- rating, or review_count via direct UPDATE on public.profiles.
-- Legitimate updates are only permitted when timeswap.allow_reputation_update = 'on'.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protect_profile_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (OLD.hours_taught IS DISTINCT FROM NEW.hours_taught OR
        OLD.hours_learned IS DISTINCT FROM NEW.hours_learned OR
        OLD.rating IS DISTINCT FROM NEW.rating OR
        OLD.review_count IS DISTINCT FROM NEW.review_count) THEN
        
        -- Check whether an authorized internal workflow (e.g. confirm_session_completion)
        -- explicitly enabled reputation updates for the local transaction.
        IF COALESCE(current_setting('timeswap.allow_reputation_update', true), 'off') != 'on' THEN
            RAISE EXCEPTION 'Permission denied: Direct modification of reputation metrics (hours_taught, hours_learned, rating, review_count) is prohibited.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_reputation ON public.profiles;
CREATE TRIGGER trg_protect_profile_reputation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_profile_reputation();


-- ------------------------------------------------------------------------------
-- 2. SEC-01: expire_session_request Security Hardening
-- Enforces:
-- 1. Caller authentication and authorization: If invoked by an authenticated
--    client (auth.uid() IS NOT NULL), caller MUST be learner or teacher.
-- 2. Authoritative cutoff deadline verification: Expiry only succeeds if
--    now() >= scheduled_start_at - 2 hours OR now() >= created_at + 48 hours.
-- 3. Idempotent: repeated calls on expired requests safely return without double-refund.
-- 4. Releases escrow reservation back to learner available balance exactly once.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_session_request(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_result JSONB;
    v_is_eligible BOOLEAN;
BEGIN
    v_caller_id := auth.uid();

    -- Lock session for update to prevent concurrent modifications
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- SEC-01 Authorization Check:
    -- If called by an authenticated user connection, enforce participant authorization.
    -- Trusted workers executing without auth.uid() (or service_role/superuser) are permitted.
    IF v_caller_id IS NOT NULL THEN
        IF v_caller_id != v_session.learner_id AND v_caller_id != v_session.teacher_id THEN
            RAISE EXCEPTION 'Unauthorized: Only session participants or system workers can expire a request.';
        END IF;
    END IF;

    -- Idempotent return if already expired
    IF v_session.status = 'expired' THEN
        SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
        RETURN v_result;
    END IF;

    IF v_session.status != 'requested' THEN
        RAISE EXCEPTION 'Cannot expire session in status "%". Only requested sessions can expire.', v_session.status;
    END IF;

    -- SEC-01 Deadline Verification:
    -- Authoritative cutoff: 2 hours prior to scheduled start OR 48 hours after request creation.
    v_is_eligible := (now() >= v_session.scheduled_start_at - interval '2 hours')
                  OR (now() >= v_session.created_at + interval '48 hours');

    IF NOT v_is_eligible THEN
        RAISE EXCEPTION 'Cannot expire request before the response cutoff deadline.';
    END IF;

    -- Release escrow reservation back to learner available balance atomically
    UPDATE public.credit_wallets
    SET available_balance = available_balance + v_session.credit_cost,
        escrow_balance = escrow_balance - v_session.credit_cost,
        updated_at = now()
    WHERE profile_id = v_session.learner_id;

    -- Ledger entry for expiry refund with unique idempotency key
    INSERT INTO public.credit_ledger (
        entry_type, source_wallet_id, destination_wallet_id, session_id,
        amount, idempotency_key, notes
    ) VALUES (
        'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
        v_session.credit_cost, 'escrow_refund_expired_' || v_session.id,
        'Automatic refund: session request expired without mentor response.'
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    -- Mark session expired
    UPDATE public.sessions
    SET status = 'expired',
        cancellation_reason = 'Request expired without response within allowed response window.',
        updated_at = now()
    WHERE id = p_session_id;

    -- Notify learner of restored credits
    INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
    VALUES (
        v_session.learner_id, 'session_cancelled', 'Session Request Expired',
        'Your request for "' || v_session.skill_title || '" expired. ' || v_session.credit_cost || ' credit(s) restored to your available wallet.',
        '/wallet', v_session.credit_cost
    );

    SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
    RETURN v_result;
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. SEC-02: cancel_session Security Hardening
-- Removes untrusted client parameter p_mentor_was_available.
-- Drops old 3-argument signature and establishes authoritative 2-argument signature.
-- Determines mentor availability strictly from database records:
--   - active availability_slots covering scheduled time OR status = 'accepted'
-- If late cancellation occurs and mentor was NOT available, routes to 'under_review'
-- rather than auto-awarding credits.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cancel_session(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.cancel_session(
    p_session_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_is_early BOOLEAN;
    v_mentor_available BOOLEAN;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Verify caller is an authorized session participant
    IF v_caller_id != v_session.learner_id AND v_caller_id != v_session.teacher_id THEN
        RAISE EXCEPTION 'Unauthorized: Only participants can cancel a session.';
    END IF;

    -- Check if already cancelled
    IF v_session.status IN ('cancelled_by_learner', 'cancelled_by_teacher') THEN
        SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
        RETURN v_result;
    END IF;

    -- Only allow cancellation for active/pending states
    IF v_session.status NOT IN ('requested', 'accepted', 'in_progress') THEN
        RAISE EXCEPTION 'Cannot cancel session in status "%".', v_session.status;
    END IF;

    -- Check timing (> 2 hours before scheduled start)
    v_is_early := (now() < (v_session.scheduled_start_at - interval '2 hours'));

    IF v_caller_id = v_session.teacher_id THEN
        -- Case 1: Mentor initiates cancellation -> Full refund to learner always
        UPDATE public.credit_wallets
        SET available_balance = available_balance + v_session.credit_cost,
            escrow_balance = escrow_balance - v_session.credit_cost,
            updated_at = now()
        WHERE profile_id = v_session.learner_id;

        INSERT INTO public.credit_ledger (
            entry_type, source_wallet_id, destination_wallet_id, session_id,
            amount, idempotency_key, notes
        ) VALUES (
            'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
            v_session.credit_cost, 'escrow_refund_mentor_cancel_' || v_session.id,
            'Full refund of ' || v_session.credit_cost || ' credit(s): mentor cancelled session.'
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        UPDATE public.sessions
        SET status = 'cancelled_by_teacher',
            cancellation_reason = p_reason,
            updated_at = now()
        WHERE id = p_session_id;

        INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
        VALUES (
            v_session.learner_id, 'session_cancelled', 'Mentor Cancelled Session',
            'Your mentor cancelled the session. ' || v_session.credit_cost || ' credit(s) have been returned to your wallet.',
            '/wallet', v_session.credit_cost
        );

    ELSIF v_is_early THEN
        -- Case 2: Learner cancels early (> 2h before start) -> Full refund to learner
        UPDATE public.credit_wallets
        SET available_balance = available_balance + v_session.credit_cost,
            escrow_balance = escrow_balance - v_session.credit_cost,
            updated_at = now()
        WHERE profile_id = v_session.learner_id;

        INSERT INTO public.credit_ledger (
            entry_type, source_wallet_id, destination_wallet_id, session_id,
            amount, idempotency_key, notes
        ) VALUES (
            'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
            v_session.credit_cost, 'escrow_refund_learner_early_cancel_' || v_session.id,
            'Full refund of ' || v_session.credit_cost || ' credit(s): learner cancelled more than 2 hours in advance.'
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        UPDATE public.sessions
        SET status = 'cancelled_by_learner',
            cancellation_reason = p_reason,
            updated_at = now()
        WHERE id = p_session_id;

        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            v_session.teacher_id, 'session_cancelled', 'Learner Cancelled Session',
            'The learner cancelled their session scheduled for ' || to_char(v_session.scheduled_start_at, 'YYYY-MM-DD HH24:MI') || '.',
            '/sessions'
        );

    ELSE
        -- Case 3: Learner cancels late (<= 2h before start)
        -- Authoritative database verification: Was mentor verified available?
        SELECT EXISTS (
            SELECT 1 FROM public.availability_slots
            WHERE profile_id = v_session.teacher_id
              AND day_of_week = EXTRACT(DOW FROM v_session.scheduled_start_at AT TIME ZONE 'UTC')
              AND start_time <= (v_session.scheduled_start_at AT TIME ZONE 'UTC')::time
              AND end_time >= (v_session.scheduled_end_at AT TIME ZONE 'UTC')::time
        ) OR (v_session.status = 'accepted') INTO v_mentor_available;

        IF v_mentor_available THEN
            -- Mentor verified available: Transfer reserved credits to mentor as compensation
            UPDATE public.credit_wallets
            SET escrow_balance = escrow_balance - v_session.credit_cost,
                lifetime_spent = lifetime_spent + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.learner_id;

            UPDATE public.credit_wallets
            SET available_balance = available_balance + v_session.credit_cost,
                lifetime_earned = lifetime_earned + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.teacher_id;

            INSERT INTO public.credit_ledger (
                entry_type, source_wallet_id, destination_wallet_id, session_id,
                amount, idempotency_key, notes
            ) VALUES (
                'escrow_cancellation_transfer', v_session.learner_id, v_session.teacher_id, v_session.id,
                v_session.credit_cost, 'escrow_cancellation_transfer_' || v_session.id,
                'Compensation transfer: Learner cancelled within 2 hours of scheduled start.'
            ) ON CONFLICT (idempotency_key) DO NOTHING;

            UPDATE public.sessions
            SET status = 'cancelled_by_learner',
                cancellation_reason = COALESCE(p_reason, 'Late learner cancellation (within 2h). Credits transferred to available mentor.'),
                updated_at = now()
            WHERE id = p_session_id;

            INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
            VALUES (
                v_session.teacher_id, 'credit_transfer', 'Cancellation Compensation Received',
                'Learner cancelled within 2 hours. ' || v_session.credit_cost || ' credit(s) transferred to your wallet.',
                '/wallet', v_session.credit_cost
            );
        ELSE
            -- Mentor availability unverified: Do NOT auto-pay mentor. Route to under_review.
            UPDATE public.sessions
            SET status = 'under_review',
                cancellation_reason = 'Late learner cancellation while mentor was not verified available. Preserved in escrow for stewardship review.',
                updated_at = now()
            WHERE id = p_session_id;

            INSERT INTO public.notifications (user_id, type, title, body, action_url)
            VALUES (
                v_session.learner_id, 'dispute_flagged', 'Session Placed Under Review',
                'Late cancellation occurred while mentor availability was unverified. Credits remain securely in escrow awaiting stewardship review.',
                '/sessions'
            );

            INSERT INTO public.notifications (user_id, type, title, body, action_url)
            VALUES (
                v_session.teacher_id, 'dispute_flagged', 'Session Placed Under Review',
                'A late learner cancellation was received, but your calendar availability was unverified. Case is under community review.',
                '/sessions'
            );
        END IF;
    END IF;

    SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
    RETURN v_result;
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. SEC-03: Update confirm_session_completion to set session config
-- Sets timeswap.allow_reputation_update = 'on' locally within transaction
-- so the reputation protection trigger permits profile hours updates.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_session_completion(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_role TEXT;
    v_counterparty_id UUID;
    v_confirmed_count INTEGER;
    v_already_settled BOOLEAN;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Verify caller is an authorized participant and determine role
    IF v_caller_id = v_session.teacher_id THEN
        v_role := 'teacher';
        v_counterparty_id := v_session.learner_id;
    ELSIF v_caller_id = v_session.learner_id THEN
        v_role := 'learner';
        v_counterparty_id := v_session.teacher_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only designated session participants can confirm completion.';
    END IF;

    -- Idempotent return if already fully completed
    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object(
            'session_id', p_session_id,
            'status', 'completed',
            'both_confirmed', true,
            'settled', true,
            'credit_cost', v_session.credit_cost
        );
    END IF;

    IF v_session.status NOT IN ('accepted', 'in_progress', 'awaiting_completion') THEN
        RAISE EXCEPTION 'Cannot confirm completion for session in status "%".', v_session.status;
    END IF;

    -- Insert participant's confirmation (idempotent ON CONFLICT)
    INSERT INTO public.session_confirmations (session_id, user_id, role)
    VALUES (p_session_id, v_caller_id, v_role)
    ON CONFLICT (session_id, user_id) DO NOTHING;

    -- Count distinct confirmations for this session
    SELECT COUNT(*) INTO v_confirmed_count
    FROM public.session_confirmations
    WHERE session_id = p_session_id;

    IF v_confirmed_count < 2 THEN
        -- Only one participant has confirmed so far: update status and wait
        UPDATE public.sessions
        SET status = 'awaiting_completion',
            updated_at = now()
        WHERE id = p_session_id;

        -- Notify counterparty that confirmation is pending
        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            v_counterparty_id, 'completion_pending', 'Confirmation Needed',
            'Your exchange partner has confirmed completion for "' || v_session.skill_title || '". Please confirm to finalize credit transfer.',
            '/sessions/' || p_session_id || '/complete'
        );

        RETURN jsonb_build_object(
            'session_id', p_session_id,
            'status', 'awaiting_completion',
            'both_confirmed', false,
            'settled', false,
            'credit_cost', v_session.credit_cost
        );
    ELSE
        -- Both participants confirmed: atomically settle reservation
        SELECT EXISTS (
            SELECT 1 FROM public.credit_ledger
            WHERE session_id = p_session_id
              AND entry_type = 'escrow_release_earned'
        ) INTO v_already_settled;

        IF NOT v_already_settled THEN
            -- Deduct escrow from learner, increment lifetime_spent
            UPDATE public.credit_wallets
            SET escrow_balance = escrow_balance - v_session.credit_cost,
                lifetime_spent = lifetime_spent + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.learner_id;

            -- Add available balance to mentor, increment lifetime_earned
            UPDATE public.credit_wallets
            SET available_balance = available_balance + v_session.credit_cost,
                lifetime_earned = lifetime_earned + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.teacher_id;

            -- Authorize reputation metric update for this transaction
            PERFORM set_config('timeswap.allow_reputation_update', 'on', true);

            -- Update profile hours
            UPDATE public.profiles
            SET hours_learned = hours_learned + (v_session.duration_minutes / 60),
                updated_at = now()
            WHERE id = v_session.learner_id;

            UPDATE public.profiles
            SET hours_taught = hours_taught + (v_session.duration_minutes / 60),
                updated_at = now()
            WHERE id = v_session.teacher_id;

            -- Record immutable ledger transfer
            INSERT INTO public.credit_ledger (
                entry_type, source_wallet_id, destination_wallet_id, session_id,
                amount, idempotency_key, notes
            ) VALUES (
                'escrow_release_earned',
                v_session.learner_id,
                v_session.teacher_id,
                v_session.id,
                v_session.credit_cost,
                'escrow_release_' || v_session.id,
                'Bilateral completion release: ' || v_session.credit_cost || ' credit(s) transferred to mentor.'
            );

            -- Mark session completed
            UPDATE public.sessions
            SET status = 'completed',
                updated_at = now()
            WHERE id = p_session_id;

            -- Notify both parties
            INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
            VALUES (
                v_session.teacher_id, 'credit_transfer', 'Credits Earned!',
                'Both participants confirmed "' || v_session.skill_title || '". ' || v_session.credit_cost || ' credit(s) added to your wallet.',
                '/wallet', v_session.credit_cost
            );

            INSERT INTO public.notifications (user_id, type, title, body, action_url)
            VALUES (
                v_session.learner_id, 'credit_transfer', 'Exchange Complete',
                'Both participants confirmed "' || v_session.skill_title || '". ' || v_session.credit_cost || ' credit(s) transferred to your mentor.',
                '/sessions'
            );
        END IF;

        RETURN jsonb_build_object(
            'session_id', p_session_id,
            'status', 'completed',
            'both_confirmed', true,
            'settled', true,
            'credit_cost', v_session.credit_cost
        );
    END IF;
END;
$$;


-- ------------------------------------------------------------------------------
-- 5. SEC-04: Revoke Execution Grants on Batch Worker Routines
-- Prevents ordinary authenticated or anonymous users from executing
-- background maintenance sweeps. Only trusted service_role or DB superuser can execute.
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.flag_unresolved_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_pending_requests() FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE EXECUTE ON FUNCTION public.flag_unresolved_sessions() FROM authenticated;
        REVOKE EXECUTE ON FUNCTION public.expire_pending_requests() FROM authenticated;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE EXECUTE ON FUNCTION public.flag_unresolved_sessions() FROM anon;
        REVOKE EXECUTE ON FUNCTION public.expire_pending_requests() FROM anon;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.flag_unresolved_sessions() TO service_role;
        GRANT EXECUTE ON FUNCTION public.expire_pending_requests() TO service_role;
    END IF;
END
$$;


-- ------------------------------------------------------------------------------
-- 6. SEC-06: Registration Handle Collision Recovery Trigger
-- Ensures unique handle generation without aborting auth.users transaction.
-- If user metadata specifies a handle already claimed by another user,
-- safely appends a pseudo-random numeric suffix to preserve transaction integrity.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_user_verification_and_welcome_grant()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_raw_handle TEXT;
    v_base_handle TEXT;
    v_handle TEXT;
    v_name TEXT;
    v_grant_inserted_id UUID;
    v_attempts INTEGER := 0;
    v_suffix TEXT;
BEGIN
    -- 1. Derive base handle from metadata or default
    v_raw_handle := COALESCE(
        NEW.raw_user_meta_data->>'handle',
        'member_' || substr(NEW.id::text, 1, 8)
    );
    -- Ensure handle conforms to format constraint ^[a-z0-9_]{3,30}$
    v_raw_handle := lower(regexp_replace(v_raw_handle, '[^a-z0-9_]', '', 'g'));
    IF char_length(v_raw_handle) < 3 THEN
        v_raw_handle := 'user_' || substr(NEW.id::text, 1, 8);
    ELSIF char_length(v_raw_handle) > 30 THEN
        v_raw_handle := substr(v_raw_handle, 1, 30);
    END IF;

    v_base_handle := substr(v_raw_handle, 1, 24);
    v_handle := v_raw_handle;

    -- SEC-06: Loop to resolve collisions if handle is already taken by another profile
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle AND id != NEW.id) LOOP
        v_attempts := v_attempts + 1;
        v_suffix := floor(1000 + random() * 9000)::text;
        v_handle := v_base_handle || '_' || v_suffix;
        IF v_attempts > 20 THEN
            -- Safe fallback to UUID-based deterministic unique handle
            v_handle := 'u_' || substr(replace(NEW.id::text, '-', ''), 1, 28);
            EXIT;
        END IF;
    END LOOP;

    v_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    IF char_length(trim(v_name)) < 2 THEN
        v_name := 'New Member';
    END IF;

    INSERT INTO public.profiles (
        id,
        handle,
        name,
        avatar_url,
        timezone
    )
    VALUES (
        NEW.id,
        v_handle,
        v_name,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
    )
    ON CONFLICT (id) DO UPDATE
    SET updated_at = now()
    WHERE profiles.id = NEW.id;

    -- 2. Ensure Wallet Container Exists (Initialized with 0 if new)
    INSERT INTO public.credit_wallets (
        profile_id,
        available_balance,
        escrow_balance,
        lifetime_earned,
        lifetime_spent
    )
    VALUES (
        NEW.id,
        0,
        0,
        0,
        0
    )
    ON CONFLICT (profile_id) DO NOTHING;

    -- 3. Check for Email Verification Status
    -- Rule: The 3-credit grant must be awarded ONLY when email is verified.
    IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
        
        -- Attempt to insert unique welcome grant ledger entry
        INSERT INTO public.credit_ledger (
            entry_type,
            destination_wallet_id,
            amount,
            idempotency_key,
            notes
        )
        VALUES (
            'welcome_grant',
            NEW.id,
            3,
            'welcome_grant_' || NEW.id::text,
            'Initial welcome grant of 3 whole time credits awarded upon verified email registration.'
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_grant_inserted_id;

        -- If grant was newly inserted, update wallet balance
        IF v_grant_inserted_id IS NOT NULL THEN
            UPDATE public.credit_wallets
            SET available_balance = available_balance + 3,
                lifetime_earned = lifetime_earned + 3,
                updated_at = now()
            WHERE profile_id = NEW.id;

            -- Create welcome notification
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                body,
                action_url,
                credit_impact
            )
            VALUES (
                NEW.id,
                'welcome',
                'Welcome to TimeSwap!',
                'You received 3 whole time credits to jumpstart your knowledge exchange journey.',
                '/wallet',
                3
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------------------------
-- 7. Grant user-facing RPC permissions to authenticated role
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION public.cancel_session(UUID, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.expire_session_request(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.confirm_session_completion(UUID) TO authenticated;
    END IF;
END
$$;
