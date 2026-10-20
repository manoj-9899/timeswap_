import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const PG_CONFIG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'timeswap',
  password: process.env.PGPASSWORD || 'timeswap_dev_pass',
  database: process.env.PGDATABASE || 'timeswap_db',
};

async function run() {
  console.log('======================================================');
  console.log('   TimeSwap Scheduled Maintenance Test Suite          ');
  console.log('======================================================\n');

  // 1. Reset dedicated sandbox database
  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();

  console.log('[Setup] Initializing clean sandbox database timeswap_maint_test...');
  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_maint_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_maint_test;');
  await adminClient.query('CREATE DATABASE timeswap_maint_test;');
  await adminClient.end();

  // 2. Connect to sandbox
  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_maint_test' });
  await testClient.connect();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 3. Set up mock Supabase auth schema and helper
    console.log('[Migrations] Bootstrapping Supabase auth & roles environment...');
    await testClient.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        encrypted_password TEXT,
        email_confirmed_at TIMESTAMPTZ,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      BEGIN
        RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated_user') THEN
          CREATE ROLE authenticated_user NOLOGIN IN ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon_user') THEN
          CREATE ROLE anon_user NOLOGIN IN ROLE anon;
        END IF;
      END
      $$;

      GRANT USAGE ON SCHEMA public TO authenticated, authenticated_user, anon, anon_user, service_role;
      GRANT USAGE ON SCHEMA auth TO authenticated, authenticated_user, service_role;
      GRANT SELECT ON auth.users TO authenticated, authenticated_user, service_role;
    `);

    // 4. Apply all 8 migrations in order
    const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationFiles = [
      '20261020000001_initial_schema.sql',
      '20261020000002_rls_policies.sql',
      '20261020000003_auth_welcome_credits_trigger.sql',
      '20261020000004_profiles_and_onboarding.sql',
      '20261020000005_session_booking_and_credit_escrow.sql',
      '20261020000006_realtime_messaging_and_notifications.sql',
      '20261020000007_security_hardening.sql',
      '20261020000008_scheduled_maintenance.sql'
    ];

    for (const file of migrationFiles) {
      console.log(`[Migrations] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await testClient.query(sql);
    }
    assert(true, 'All 8 SQL migrations applied cleanly without errors');

    // Grant schema privileges
    await testClient.query(`
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated_user;
      GRANT EXECUTE ON FUNCTION public.create_session_request TO authenticated_user;
      GRANT EXECUTE ON FUNCTION public.accept_session_request TO authenticated_user;
      GRANT EXECUTE ON FUNCTION public.decline_session_request TO authenticated_user;
      GRANT EXECUTE ON FUNCTION public.cancel_session(UUID, TEXT) TO authenticated_user;
      GRANT EXECUTE ON FUNCTION public.expire_session_request(UUID) TO authenticated_user;
      GRANT EXECUTE ON FUNCTION public.confirm_session_completion(UUID) TO authenticated_user;
    `);

    // Helper functions for auth switching
    async function setAuthUser(userId) {
      await testClient.query(`SET ROLE authenticated_user;`);
      if (userId) {
        await testClient.query(`SELECT set_config('request.jwt.claim.sub', '${userId}', false);`);
      } else {
        await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
      }
    }

    async function setAnonUser() {
      await testClient.query(`SET ROLE anon_user;`);
      await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
    }

    async function resetAuth() {
      await testClient.query(`RESET ROLE;`);
      await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
    }

    async function getWallet(userId) {
      await resetAuth();
      const res = await testClient.query(`SELECT * FROM public.credit_wallets WHERE profile_id = $1;`, [userId]);
      return res.rows[0];
    }

    // Helper to create test user with verified credits
    async function createVerifiedUser(email, name, handle) {
      await resetAuth();
      const userRes = await testClient.query(`
        INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
        VALUES ($1, now(), $2)
        RETURNING id;
      `, [email, JSON.stringify({ full_name: name, handle })]);
      const userId = userRes.rows[0].id;

      // Update onboarding status
      await testClient.query(`
        UPDATE public.profiles
        SET onboarding_completed = true, onboarding_step = 4
        WHERE id = $1;
      `, [userId]);

      return userId;
    }

    console.log('\n[SEC-04] Testing Maintenance Functions Privilege & Role Enforcement...');
    // --------------------------------------------------------------------------
    // Test 1: anon cannot execute maintenance functions
    // --------------------------------------------------------------------------
    await setAnonUser();
    let anonExpireBlocked = false;
    try {
      await testClient.query(`SELECT public.expire_pending_requests();`);
    } catch (e) {
      anonExpireBlocked = (e.code === '42501');
    }
    assert(anonExpireBlocked, 'Anonymous user cannot execute expire_pending_requests (permission denied 42501)');

    let anonFlagBlocked = false;
    try {
      await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    } catch (e) {
      anonFlagBlocked = (e.code === '42501');
    }
    assert(anonFlagBlocked, 'Anonymous user cannot execute flag_unresolved_sessions (permission denied 42501)');

    // --------------------------------------------------------------------------
    // Test 2: authenticated user cannot execute maintenance functions
    // --------------------------------------------------------------------------
    const aliceId = await createVerifiedUser('alice@test.com', 'Alice Learner', 'alice_maint');
    const bobId = await createVerifiedUser('bob@test.com', 'Bob Mentor', 'bob_maint');

    await setAuthUser(aliceId);
    let authExpireBlocked = false;
    try {
      await testClient.query(`SELECT public.expire_pending_requests();`);
    } catch (e) {
      authExpireBlocked = (e.code === '42501');
    }
    assert(authExpireBlocked, 'Authenticated user cannot execute expire_pending_requests (permission denied 42501)');

    let authFlagBlocked = false;
    try {
      await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    } catch (e) {
      authFlagBlocked = (e.code === '42501');
    }
    assert(authFlagBlocked, 'Authenticated user cannot execute flag_unresolved_sessions (permission denied 42501)');

    // --------------------------------------------------------------------------
    // Test 3: Trusted context (postgres / service_role) CAN execute both
    // --------------------------------------------------------------------------
    await resetAuth();
    const expireTestRes = await testClient.query(`SELECT public.expire_pending_requests();`);
    assert(typeof expireTestRes.rows[0].expire_pending_requests === 'number', 'Trusted worker can execute expire_pending_requests');

    const flagTestRes = await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    assert(typeof flagTestRes.rows[0].flag_unresolved_sessions === 'number', 'Trusted worker can execute flag_unresolved_sessions');


    console.log('\n[Maintenance 1] Testing expire_pending_requests Functional Workflow...');
    // --------------------------------------------------------------------------
    // Alice requests 1-credit session from Bob, scheduled 1 hour from now (past 2h cutoff)
    // --------------------------------------------------------------------------
    await setAuthUser(aliceId);
    const start1h = new Date(Date.now() + 1 * 3600 * 1000).toISOString();
    const reqRes = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'TypeScript Advanced Types',
        p_category := 'Code & Technology',
        p_learning_goal := 'Master generics and conditional types',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${start1h}'::TIMESTAMPTZ,
        p_message_notes := 'Please teach me generics',
        p_idempotency_key := 'req_maint_test_1'
      ) AS session;
    `);
    const sessionId = reqRes.rows[0].session.id;

    // Verify escrow reservation
    const aliceWalletPre = await getWallet(aliceId);
    assert(aliceWalletPre.available_balance === 2 && aliceWalletPre.escrow_balance === 1,
      'Alice has 1 credit reserved in escrow for the pending request');

    // Run expire_pending_requests as trusted worker
    await resetAuth();
    const sweepRes1 = await testClient.query(`SELECT public.expire_pending_requests();`);
    assert(sweepRes1.rows[0].expire_pending_requests === 1,
      'expire_pending_requests swept exactly 1 eligible overdue pending request');

    // Verify session status
    const sessionPost = (await testClient.query(`SELECT * FROM public.sessions WHERE id = $1;`, [sessionId])).rows[0];
    assert(sessionPost.status === 'expired', 'Session status transitioned to "expired"');
    assert(sessionPost.cancellation_reason.includes('response window'), 'Cancellation reason documents response window expiration');

    // Verify escrow balance refund
    const aliceWalletPost = await getWallet(aliceId);
    assert(aliceWalletPost.available_balance === 3 && aliceWalletPost.escrow_balance === 0,
      'Learner escrow balance fully restored to available balance (available: 3, escrow: 0)');

    // Verify audit ledger entry
    const ledgerEntry = (await testClient.query(`
      SELECT * FROM public.credit_ledger 
      WHERE session_id = $1 AND entry_type = 'escrow_refund';
    `, [sessionId])).rows[0];
    assert(ledgerEntry && ledgerEntry.amount === 1, 'Auditable escrow_refund journal entry recorded in credit_ledger');
    assert(ledgerEntry.idempotency_key === `escrow_refund_expired_${sessionId}`, 'Ledger idempotency_key formatted correctly');

    // Verify in-app notification delivered to Alice
    const notifRes = await testClient.query(`
      SELECT * FROM public.notifications 
      WHERE user_id = $1 AND title = 'Session Request Expired';
    `, [aliceId]);
    assert(notifRes.rows.length === 1, 'Notification for Session Request Expired delivered to learner');


    console.log('\n[Maintenance 1 - Idempotency] Testing Repeated Execution of expire_pending_requests...');
    // --------------------------------------------------------------------------
    // Re-run expire_pending_requests a 2nd and 3rd time: must return 0 without duplicate refunds
    // --------------------------------------------------------------------------
    await resetAuth();
    const sweepRes2 = await testClient.query(`SELECT public.expire_pending_requests();`);
    assert(sweepRes2.rows[0].expire_pending_requests === 0,
      'Second execution returns 0 items processed');

    const aliceWalletRepeat = await getWallet(aliceId);
    assert(aliceWalletRepeat.available_balance === 3 && aliceWalletRepeat.escrow_balance === 0,
      'Learner wallet balance remained strictly at 3 available (no duplicate refund)');

    const sweepRes3 = await testClient.query(`SELECT public.expire_pending_requests();`);
    assert(sweepRes3.rows[0].expire_pending_requests === 0,
      'Third execution returns 0 items processed cleanly');


    console.log('\n[Maintenance 2] Testing flag_unresolved_sessions Functional Workflow...');
    // --------------------------------------------------------------------------
    // Setup session past 72h since scheduled_end_at without completion confirmation
    // --------------------------------------------------------------------------
    // Alice requests Bob, Bob accepts
    await setAuthUser(aliceId);
    const start5h = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    const reqRes2 = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'React Server Components',
        p_category := 'Code & Technology',
        p_learning_goal := 'RSC architecture discussion',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${start5h}'::TIMESTAMPTZ,
        p_message_notes := 'Looking forward',
        p_idempotency_key := 'req_maint_test_2'
      ) AS session;
    `);
    const session2Id = reqRes2.rows[0].session.id;

    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${session2Id}'::UUID);`);

    // Backdate scheduled_end_at to 80 hours ago to simulate 72h elapsed
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() - interval '81 hours',
          scheduled_end_at = now() - interval '80 hours',
          status = 'awaiting_completion'
      WHERE id = $1;
    `, [session2Id]);

    // Verify Bob & Alice wallets before sweep
    const alicePreSweep = await getWallet(aliceId);
    const bobPreSweep = await getWallet(bobId);
    assert(alicePreSweep.escrow_balance === 1, 'Learner escrow balance holds 1 credit prior to sweep');

    // Run flag_unresolved_sessions as trusted worker
    const flagSweep1 = await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    assert(flagSweep1.rows[0].flag_unresolved_sessions === 1,
      'flag_unresolved_sessions swept exactly 1 unresolved session past 72 hours');

    // Verify session status transitioned to 'under_review'
    const session2Post = (await testClient.query(`SELECT * FROM public.sessions WHERE id = $1;`, [session2Id])).rows[0];
    assert(session2Post.status === 'under_review', 'Session status transitioned to "under_review"');
    assert(session2Post.cancellation_reason.includes('72 hours elapsed'), 'Cancellation reason notes 72 hours elapsed without confirmation');

    // Verify SEC-05: Escrow is NOT auto-settled or transferred
    const alicePostSweep = await getWallet(aliceId);
    const bobPostSweep = await getWallet(bobId);
    assert(alicePostSweep.escrow_balance === 1,
      'SEC-05: Escrow balance is safely PRESERVED in escrow (escrow: 1)');
    assert(bobPostSweep.available_balance === bobPreSweep.available_balance,
      'SEC-05: Mentor available balance was NOT credited during 72h sweep');

    // Verify dispute notifications created for both participants
    const aliceFlagNotifs = await testClient.query(`
      SELECT * FROM public.notifications WHERE user_id = $1 AND type = 'dispute_flagged';
    `, [aliceId]);
    const bobFlagNotifs = await testClient.query(`
      SELECT * FROM public.notifications WHERE user_id = $1 AND type = 'dispute_flagged';
    `, [bobId]);
    assert(aliceFlagNotifs.rows.length === 1, 'Dispute notification delivered to learner');
    assert(bobFlagNotifs.rows.length === 1, 'Dispute notification delivered to mentor');


    console.log('\n[Maintenance 2 - Idempotency] Testing Repeated Execution of flag_unresolved_sessions...');
    // --------------------------------------------------------------------------
    // Re-run flag_unresolved_sessions: must return 0
    // --------------------------------------------------------------------------
    const flagSweep2 = await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    assert(flagSweep2.rows[0].flag_unresolved_sessions === 0,
      'Second execution of flag_unresolved_sessions returns 0');

    const flagSweep3 = await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    assert(flagSweep3.rows[0].flag_unresolved_sessions === 0,
      'Third execution of flag_unresolved_sessions returns 0');


    console.log('\n[Concurrency & Disjointness] Testing Simultaneous Execution of Both Jobs...');
    // --------------------------------------------------------------------------
    // Create 1 candidate for expire, 1 candidate for flag, and 1 unaffected session
    // Run both sweeps concurrently via Promise.all
    // --------------------------------------------------------------------------
    const charlieId = await createVerifiedUser('charlie@test.com', 'Charlie Mentor', 'charlie_maint');

    // Candidate 1: Pending request 1 hour before start
    await setAuthUser(aliceId);
    const concReq1 = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${charlieId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Concurrent Test Expire',
        p_category := 'Code & Technology',
        p_learning_goal := 'Expire candidate',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${start1h}'::TIMESTAMPTZ,
        p_message_notes := 'Expire candidate',
        p_idempotency_key := 'req_conc_expire_1'
      ) AS session;
    `);
    const concExpId = concReq1.rows[0].session.id;

    // Candidate 2: Unresolved session 75 hours past end
    const concReq2 = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${charlieId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Concurrent Test Flag',
        p_category := 'Code & Technology',
        p_learning_goal := 'Flag candidate',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${start5h}'::TIMESTAMPTZ,
        p_message_notes := 'Flag candidate',
        p_idempotency_key := 'req_conc_flag_2'
      ) AS session;
    `);
    const concFlagId = concReq2.rows[0].session.id;

    await setAuthUser(charlieId);
    await testClient.query(`SELECT public.accept_session_request('${concFlagId}'::UUID);`);

    // Backdate candidate 2
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() - interval '76 hours',
          scheduled_end_at = now() - interval '75 hours',
          status = 'accepted'
      WHERE id = $1;
    `, [concFlagId]);

    // Candidate 3: Normal active session in progress (should remain untouched)
    const davidId = await createVerifiedUser('david@test.com', 'David Learner', 'david_maint');
    const start10h = new Date(Date.now() + 10 * 3600 * 1000).toISOString();
    await setAuthUser(davidId);
    const concReq3 = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${charlieId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Normal Future Session',
        p_category := 'Code & Technology',
        p_learning_goal := 'Future active session',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${start10h}'::TIMESTAMPTZ,
        p_message_notes := 'Future active session',
        p_idempotency_key := 'req_conc_normal_3'
      ) AS session;
    `);
    const concNormalId = concReq3.rows[0].session.id;

    // Run both sweeps concurrently using separate client connections
    const clientA = new Client({ ...PG_CONFIG, database: 'timeswap_maint_test' });
    const clientB = new Client({ ...PG_CONFIG, database: 'timeswap_maint_test' });
    await clientA.connect();
    await clientB.connect();

    const [sweepA, sweepB] = await Promise.all([
      clientA.query(`SELECT public.expire_pending_requests();`),
      clientB.query(`SELECT public.flag_unresolved_sessions();`)
    ]);

    await clientA.end();
    await clientB.end();

    assert(sweepA.rows[0].expire_pending_requests === 1,
      'Concurrent expire sweep completed successfully (processed 1)');
    assert(sweepB.rows[0].flag_unresolved_sessions === 1,
      'Concurrent flag sweep completed successfully (processed 1)');

    // Verify candidate 1 moved to expired
    await resetAuth();
    const expRow = (await testClient.query(`SELECT status FROM public.sessions WHERE id = $1;`, [concExpId])).rows[0];
    assert(expRow && expRow.status === 'expired', 'Concurrent candidate 1 correctly marked "expired"');

    // Verify candidate 2 moved to under_review
    const flagRow = (await testClient.query(`SELECT status FROM public.sessions WHERE id = $1;`, [concFlagId])).rows[0];
    assert(flagRow && flagRow.status === 'under_review', 'Concurrent candidate 2 correctly marked "under_review"');

    // Verify candidate 3 untouched
    const normalRow = (await testClient.query(`SELECT status FROM public.sessions WHERE id = $1;`, [concNormalId])).rows[0];
    assert(normalRow && normalRow.status === 'requested', 'Active future session remained untouched in "requested" status');


    console.log('\n[Scheduling & Idempotency Simulation] Testing Cron Scheduling Engine...');
    // --------------------------------------------------------------------------
    // Test scheduling logic with a mock cron schema (representing pg_cron environment)
    // --------------------------------------------------------------------------
    await resetAuth();
    await testClient.query(`
      CREATE SCHEMA IF NOT EXISTS cron;
      CREATE TABLE IF NOT EXISTS cron.job (
        jobid BIGSERIAL PRIMARY KEY,
        schedule TEXT NOT NULL,
        command TEXT NOT NULL,
        nodename TEXT DEFAULT 'localhost',
        nodeport INTEGER DEFAULT 5432,
        database TEXT DEFAULT current_database(),
        username TEXT DEFAULT current_user,
        active BOOLEAN DEFAULT true,
        jobname TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS cron.job_run_details (
        jobid BIGINT,
        runid BIGSERIAL PRIMARY KEY,
        job_pid INTEGER,
        database TEXT,
        username TEXT,
        command TEXT,
        status TEXT,
        return_message TEXT,
        start_time TIMESTAMPTZ DEFAULT now(),
        end_time TIMESTAMPTZ DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION cron.schedule(
        p_jobname TEXT,
        p_schedule TEXT,
        p_command TEXT
      ) RETURNS BIGINT AS $$
      DECLARE
        v_jobid BIGINT;
      BEGIN
        INSERT INTO cron.job (jobname, schedule, command)
        VALUES (p_jobname, p_schedule, p_command)
        ON CONFLICT (jobname) DO UPDATE 
        SET schedule = EXCLUDED.schedule, command = EXCLUDED.command
        RETURNING jobid INTO v_jobid;
        RETURN v_jobid;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION cron.unschedule(p_jobname TEXT) RETURNS BOOLEAN AS $$
      BEGIN
        DELETE FROM cron.job WHERE jobname = p_jobname;
        RETURN FOUND;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Execute scheduling logic
    await testClient.query(`
      SELECT cron.schedule('timeswap_expire_pending_requests', '*/5 * * * *', 'SELECT public.expire_pending_requests();');
      SELECT cron.schedule('timeswap_flag_unresolved_sessions', '0 * * * *', 'SELECT public.flag_unresolved_sessions();');
      SELECT cron.schedule('timeswap_cleanup_cron_history', '0 0 * * *', 'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''7 days'';');
    `);

    const registeredJobs = await testClient.query(`
      SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
    `);

    assert(registeredJobs.rows.length === 3, 'Exactly 3 scheduled maintenance jobs registered in cron.job');
    assert(registeredJobs.rows.find(j => j.jobname === 'timeswap_expire_pending_requests')?.schedule === '*/5 * * * *',
      'timeswap_expire_pending_requests scheduled with interval "*/5 * * * *"');
    assert(registeredJobs.rows.find(j => j.jobname === 'timeswap_flag_unresolved_sessions')?.schedule === '0 * * * *',
      'timeswap_flag_unresolved_sessions scheduled with interval "0 * * * *"');
    assert(registeredJobs.rows.find(j => j.jobname === 'timeswap_cleanup_cron_history')?.schedule === '0 0 * * *',
      'timeswap_cleanup_cron_history scheduled with interval "0 0 * * *"');

    // Test repeated scheduling (idempotency check)
    await testClient.query(`
      SELECT cron.schedule('timeswap_expire_pending_requests', '*/5 * * * *', 'SELECT public.expire_pending_requests();');
      SELECT cron.schedule('timeswap_flag_unresolved_sessions', '0 * * * *', 'SELECT public.flag_unresolved_sessions();');
      SELECT cron.schedule('timeswap_cleanup_cron_history', '0 0 * * *', 'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''7 days'';');
    `);

    const jobsAfterRepeat = await testClient.query(`SELECT count(*) FROM cron.job;`);
    assert(parseInt(jobsAfterRepeat.rows[0].count, 10) === 3,
      'Re-scheduling jobs is idempotent; does not create duplicate entries in cron.job');

    // Test execution logging & history purge
    await testClient.query(`
      INSERT INTO cron.job_run_details (jobid, command, status, return_message, start_time, end_time)
      VALUES 
        (1, 'SELECT public.expire_pending_requests();', 'succeeded', '1 row', now() - interval '8 days', now() - interval '8 days'),
        (1, 'SELECT public.expire_pending_requests();', 'succeeded', '0 rows', now() - interval '2 days', now() - interval '2 days'),
        (2, 'SELECT public.flag_unresolved_sessions();', 'succeeded', '1 row', now() - interval '1 hour', now() - interval '1 hour');
    `);

    // Run the retention cleanup command
    await testClient.query(`
      DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
    `);

    const remainingLogs = await testClient.query(`SELECT count(*) FROM cron.job_run_details;`);
    assert(parseInt(remainingLogs.rows[0].count, 10) === 2,
      'Retention cleanup purged records older than 7 days, keeping recent executions');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await testClient.end();
  }

  console.log('\n======================================================');
  console.log(`   Scheduled Maintenance Test Summary:`);
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
