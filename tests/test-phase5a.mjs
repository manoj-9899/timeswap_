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
  console.log('   TimeSwap Phase 5A Security Hardening Tests         ');
  console.log('======================================================\n');

  // 1. Reset dedicated sandbox database
  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();

  console.log('[Setup] Initializing clean sandbox database timeswap_phase5a_test...');
  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_phase5a_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_phase5a_test;');
  await adminClient.query('CREATE DATABASE timeswap_phase5a_test;');
  await adminClient.end();

  // 2. Connect to sandbox
  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_phase5a_test' });
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
    console.log('[Migrations] Bootstrapping Supabase auth mock environment...');
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
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated_user') THEN
          CREATE ROLE authenticated_user NOLOGIN IN ROLE authenticated;
        END IF;
      END
      $$;

      GRANT USAGE ON SCHEMA public TO authenticated, authenticated_user;
      GRANT USAGE ON SCHEMA auth TO authenticated, authenticated_user;
      GRANT SELECT ON auth.users TO authenticated, authenticated_user;
    `);

    // 4. Apply all 7 migrations in order
    const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationFiles = [
      '20261020000001_initial_schema.sql',
      '20261020000002_rls_policies.sql',
      '20261020000003_auth_trigger_welcome_credits.sql',
      '20261020000004_phase2_profiles_and_onboarding.sql',
      '20261020000005_phase3_session_booking_and_escrow.sql',
      '20261020000006_phase4_realtime_messaging_notifications.sql',
      '20261020000007_phase5a_security_hardening.sql'
    ];

    for (const file of migrationFiles) {
      console.log(`[Migrations] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await testClient.query(sql);
    }
    assert(true, 'All 7 SQL migrations applied cleanly without errors');

    // Grant access to tables and default routines to authenticated_user
    // Note: Migration 7 revoked flag_unresolved_sessions and expire_pending_requests
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

    // Helper functions for simulating PostgREST contexts
    async function setAuthUser(userId) {
      await testClient.query(`SET ROLE authenticated_user;`);
      if (userId) {
        await testClient.query(`SELECT set_config('request.jwt.claim.sub', '${userId}', false);`);
      } else {
        await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
      }
    }

    async function resetAuth() {
      await testClient.query(`RESET ROLE;`);
      await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
    }

    async function getWallet(userId) {
      const prevRole = (await testClient.query(`SELECT current_setting('request.jwt.claim.sub', true) AS sub, current_role;`)).rows[0];
      await resetAuth();
      const res = await testClient.query(`SELECT * FROM public.credit_wallets WHERE profile_id = '${userId}';`);
      if (prevRole.current_role === 'authenticated_user' && prevRole.sub) {
        await setAuthUser(prevRole.sub);
      }
      return res.rows[0];
    }

    async function getLedgerEntries(sessionId, entryType) {
      const prevRole = (await testClient.query(`SELECT current_setting('request.jwt.claim.sub', true) AS sub, current_role;`)).rows[0];
      await resetAuth();
      const res = await testClient.query(`
        SELECT * FROM public.credit_ledger 
        WHERE session_id = '${sessionId}' AND entry_type = '${entryType}';
      `);
      if (prevRole.current_role === 'authenticated_user' && prevRole.sub) {
        await setAuthUser(prevRole.sub);
      }
      return res.rows;
    }

    // Helper to register verified user
    async function createTestUser(email, name, handle) {
      await resetAuth();
      const res = await testClient.query(`
        INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
        VALUES ('${email}', now(), '{"name": "${name}", "handle": "${handle}"}'::jsonb)
        RETURNING id;
      `);
      const userId = res.rows[0].id;
      // Mark onboarding complete
      await testClient.query(`
        UPDATE public.profiles
        SET onboarding_completed = true, onboarding_step = 6
        WHERE id = '${userId}';
      `);
      return userId;
    }

    // Provision test participants
    const aliceId = await createTestUser('alice@example.com', 'Alice Learner', 'alice_5a');
    const bobId = await createTestUser('bob@example.com', 'Bob Mentor', 'bob_5a');
    const eveId = await createTestUser('eve@example.com', 'Eve Attacker', 'eve_5a');

    console.log('\n[SEC-01] Testing expire_session_request Security & Deadline Enforcement...');

    // Alice requests 1-hour session from Bob 24 hours in future
    await setAuthUser(aliceId);
    const start24h = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const reqRes = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Distributed Systems Hardening',
        p_category := 'Code & Technology',
        p_learning_goal := 'Master PostgreSQL concurrency',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${start24h}'::TIMESTAMPTZ,
        p_message_notes := 'Looking forward!',
        p_idempotency_key := 'req_sec01_test_1'
      ) AS session;
    `);
    const session1Id = reqRes.rows[0].session.id;

    // Test 1A: Eve (unrelated third party) tries to expire Alice's request
    await setAuthUser(eveId);
    let eveExpiredFailed = false;
    try {
      await testClient.query(`SELECT public.expire_session_request('${session1Id}'::UUID);`);
    } catch (err) {
      eveExpiredFailed = err.message.includes('Unauthorized');
    }
    assert(eveExpiredFailed, 'SEC-01: Unauthorized third party Eve cannot expire Alice and Bob request');

    // Test 1B: Alice (learner) tries to expire premature request before cutoff deadline
    await setAuthUser(aliceId);
    let prematureExpiredFailed = false;
    try {
      await testClient.query(`SELECT public.expire_session_request('${session1Id}'::UUID);`);
    } catch (err) {
      prematureExpiredFailed = err.message.includes('deadline');
    }
    assert(prematureExpiredFailed, 'SEC-01: Premature expiry rejected when scheduled start is > 2h away');

    // Test 1C: Advance session start to 1 hour from now (within 2h response window)
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() + interval '1 hour'
      WHERE id = '${session1Id}';
    `);

    // Now Alice can expire it
    await setAuthUser(aliceId);
    const expireRes = await testClient.query(`SELECT public.expire_session_request('${session1Id}'::UUID) AS session;`);
    const expiredSession = expireRes.rows[0].session;
    assert(expiredSession.status === 'expired', 'SEC-01: Eligible request expired after response deadline passed');

    const aliceWalletPostExpire = await getWallet(aliceId);
    assert(aliceWalletPostExpire.available_balance === 3 && aliceWalletPostExpire.escrow_balance === 0, 
      'SEC-01: Expiry restores escrowed credit to learner wallet (available: 3, escrow: 0)');

    const expireLedgerEntries = await getLedgerEntries(session1Id, 'escrow_refund');
    assert(expireLedgerEntries.length === 1 && expireLedgerEntries[0].amount === 1,
      'SEC-01: Escrow refund journal entry created with amount = 1');

    // Test 1D: Repeated expire call is idempotent
    const repeatExpireRes = await testClient.query(`SELECT public.expire_session_request('${session1Id}'::UUID) AS session;`);
    assert(repeatExpireRes.rows[0].session.status === 'expired', 'SEC-01: Repeated expire call is safe and idempotent');
    const aliceWalletRepeat = await getWallet(aliceId);
    assert(aliceWalletRepeat.available_balance === 3, 'SEC-01: Idempotent repeat did not double-refund credits');

    console.log('\n[SEC-02] Testing cancel_session Authoritative Availability & Signature...');

    // Test 2A: Dropped 3-argument function is inaccessible
    let callOldSignatureFailed = false;
    try {
      await testClient.query(`SELECT public.cancel_session('${session1Id}'::UUID, 'reason', true);`);
    } catch (err) {
      callOldSignatureFailed = err.message.includes('does not exist');
    }
    assert(callOldSignatureFailed, 'SEC-02: Old 3-argument cancel_session signature with untrusted param was dropped');

    // Test 2B: Late cancellation with mentor NOT verified available routes to 'under_review'
    // Create new booking for Alice and Bob
    await setAuthUser(aliceId);
    const startLate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour in future (<= 2h)
    const reqLateRes = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Late Cancellation Review Test',
        p_category := 'Code & Technology',
        p_learning_goal := 'Test late cancellation review path',
        p_duration_minutes := 60,
        p_scheduled_start_at := '${startLate}'::TIMESTAMPTZ,
        p_idempotency_key := 'req_sec02_test_2b'
      ) AS session;
    `);
    const session2bId = reqLateRes.rows[0].session.id;

    // Bob has NO availability slot covering this time and status is 'requested' (not accepted)
    // Alice cancels within 2 hours
    const cancel2bRes = await testClient.query(`
      SELECT public.cancel_session('${session2bId}'::UUID, 'Emergency conflict') AS session;
    `);
    assert(cancel2bRes.rows[0].session.status === 'under_review',
      'SEC-02: Late cancellation with unverified mentor routed to status "under_review"');

    const bobWallet2b = await getWallet(bobId);
    assert(bobWallet2b.available_balance === 3,
      'SEC-02: Credits NOT transferred to unverified mentor during late cancellation (held in escrow)');

    // Test 2C: Late cancellation with mentor verified available transfers credits
    // Accept session so mentor is verified accepted
    await setAuthUser(aliceId);
    const reqAcceptedRes = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Late Cancellation Available Test',
        p_category := 'Code & Technology',
        p_learning_goal := 'Test late cancellation with verified mentor',
        p_duration_minutes := 60,
        p_scheduled_start_at := now() + interval '24 hours',
        p_idempotency_key := 'req_sec02_test_2c'
      ) AS session;
    `);
    const session2cId = reqAcceptedRes.rows[0].session.id;

    // Bob accepts the session
    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${session2cId}'::UUID);`);

    // Advance start to 1 hour from now (within 2-hour window)
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() + interval '1 hour'
      WHERE id = '${session2cId}';
    `);

    // Alice cancels late
    await setAuthUser(aliceId);
    const cancel2cRes = await testClient.query(`
      SELECT public.cancel_session('${session2cId}'::UUID, 'Last minute emergency') AS session;
    `);
    assert(cancel2cRes.rows[0].session.status === 'cancelled_by_learner',
      'SEC-02: Late cancellation with verified mentor marked "cancelled_by_learner"');

    const bobWallet2c = await getWallet(bobId);
    assert(bobWallet2c.available_balance === 4,
      'SEC-02: Mentor received 1 compensation credit for late cancellation (available: 3 -> 4)');

    const compLedger = await getLedgerEntries(session2cId, 'escrow_cancellation_transfer');
    assert(compLedger.length === 1 && compLedger[0].amount === 1,
      'SEC-02: Authoritative escrow_cancellation_transfer recorded in ledger');

    console.log('\n[SEC-03] Testing Profile Reputation Metrics Protection Trigger...');

    // Test 3A: User Alice attempts direct UPDATE to hours_taught
    await setAuthUser(aliceId);
    let forgeHoursTaughtFailed = false;
    try {
      await testClient.query(`UPDATE public.profiles SET hours_taught = 100.0 WHERE id = '${aliceId}';`);
    } catch (err) {
      forgeHoursTaughtFailed = err.message.includes('Permission denied: Direct modification of reputation metrics');
    }
    assert(forgeHoursTaughtFailed, 'SEC-03: Direct update to hours_taught blocked by trigger');

    // Test 3B: User Alice attempts direct UPDATE to rating and review_count
    let forgeRatingFailed = false;
    try {
      await testClient.query(`UPDATE public.profiles SET rating = 4.99, review_count = 50 WHERE id = '${aliceId}';`);
    } catch (err) {
      forgeRatingFailed = err.message.includes('Permission denied: Direct modification of reputation metrics');
    }
    assert(forgeRatingFailed, 'SEC-03: Direct update to rating and review_count blocked by trigger');

    // Test 3C: Legitimate profile updates (headline, bio, name) succeed
    await setAuthUser(aliceId);
    await testClient.query(`
      UPDATE public.profiles 
      SET headline = 'Verified Security Engineer', bio = 'Focusing on database constraints.'
      WHERE id = '${aliceId}';
    `);
    const aliceProfile = (await testClient.query(`SELECT headline, bio, hours_taught FROM public.profiles WHERE id = '${aliceId}';`)).rows[0];
    assert(aliceProfile.headline === 'Verified Security Engineer' && Number(aliceProfile.hours_taught) === 0,
      'SEC-03: Legitimate profile edits succeed while reputation metrics remain unaltered');

    // Test 3D: Verified bilateral completion updates hours_taught and hours_learned authoritatively
    await resetAuth();
    await testClient.query(`UPDATE public.credit_wallets SET available_balance = 5 WHERE profile_id = '${aliceId}';`);
    await setAuthUser(aliceId);
    const sessionBilateralRes = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := 'Bilateral Reputation Test',
        p_category := 'Code & Technology',
        p_learning_goal := 'Verify trigger allows completion updates',
        p_duration_minutes := 120,
        p_scheduled_start_at := now() + interval '24 hours',
        p_idempotency_key := 'req_sec03_bilateral'
      ) AS session;
    `);
    const sessionBilateralId = sessionBilateralRes.rows[0].session.id;

    // Bob accepts
    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${sessionBilateralId}'::UUID);`);
    // Bob confirms completion
    await testClient.query(`SELECT public.confirm_session_completion('${sessionBilateralId}'::UUID);`);
    // Alice confirms completion
    await setAuthUser(aliceId);
    const completeRes = await testClient.query(`SELECT public.confirm_session_completion('${sessionBilateralId}'::UUID);`);
    assert(completeRes.rows[0].confirm_session_completion.settled === true,
      'SEC-03: Bilateral completion settled successfully through trusted transaction setting');

    await resetAuth();
    const bobUpdatedProfile = (await testClient.query(`SELECT hours_taught FROM public.profiles WHERE id = '${bobId}';`)).rows[0];
    const aliceUpdatedProfile = (await testClient.query(`SELECT hours_learned FROM public.profiles WHERE id = '${aliceId}';`)).rows[0];
    assert(Number(bobUpdatedProfile.hours_taught) === 2.0 && Number(aliceUpdatedProfile.hours_learned) === 2.0,
      'SEC-03: Profile hours_taught (Bob: 2.0h) and hours_learned (Alice: 2.0h) authoritatively updated via completion');

    console.log('\n[SEC-04] Testing Revocation of Batch Worker Functions from Public/Authenticated...');

    // Test 4A: Authenticated user calling flag_unresolved_sessions is rejected
    await setAuthUser(eveId);
    let workerCall1Failed = false;
    try {
      await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    } catch (err) {
      workerCall1Failed = err.message.includes('permission denied');
    }
    assert(workerCall1Failed, 'SEC-04: Authenticated user cannot execute flag_unresolved_sessions (permission denied)');

    // Test 4B: Authenticated user calling expire_pending_requests is rejected
    let workerCall2Failed = false;
    try {
      await testClient.query(`SELECT public.expire_pending_requests();`);
    } catch (err) {
      workerCall2Failed = err.message.includes('permission denied');
    }
    assert(workerCall2Failed, 'SEC-04: Authenticated user cannot execute expire_pending_requests (permission denied)');

    console.log('\n[SEC-05] Testing 72-Hour Unresolved Sweep and Escrow Preservation...');

    // Admin creates unresolved session 73 hours past end
    await resetAuth();
    await testClient.query(`UPDATE public.credit_wallets SET available_balance = 5 WHERE profile_id = '${aliceId}';`);
    await setAuthUser(aliceId);
    const unresolvedRes = await testClient.query(`
      SELECT public.create_session_request(
        p_teacher_id := '${bobId}'::UUID,
        p_skill_id := NULL,
        p_skill_title := '72h Unresolved Session',
        p_category := 'Code & Technology',
        p_learning_goal := 'Test 72h preservation',
        p_duration_minutes := 60,
        p_scheduled_start_at := now() + interval '24 hours',
        p_idempotency_key := 'req_sec05_unresolved'
      ) AS session;
    `);
    const unresolvedSessionId = unresolvedRes.rows[0].session.id;

    // Bob accepts
    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${unresolvedSessionId}'::UUID);`);

    // Fast-forward scheduled_end_at to 73 hours ago
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() - interval '75 hours',
          scheduled_end_at = now() - interval '73 hours',
          status = 'awaiting_completion'
      WHERE id = '${unresolvedSessionId}';
    `);

    // Trusted worker executes sweep as superuser/service_role
    const flaggedCountRes = await testClient.query(`SELECT public.flag_unresolved_sessions();`);
    assert(flaggedCountRes.rows[0].flag_unresolved_sessions >= 1, 'SEC-05: Trusted batch worker flagged unresolved session');

    const unresolvedCheck = (await testClient.query(`SELECT status FROM public.sessions WHERE id = '${unresolvedSessionId}';`)).rows[0];
    assert(unresolvedCheck.status === 'under_review', 'SEC-05: Unresolved session moved to "under_review"');

    const bobWallet72 = await getWallet(bobId);
    // Bob should NOT have received credits for 72h unresolved session
    const settledLedger72 = await getLedgerEntries(unresolvedSessionId, 'escrow_release_earned');
    assert(settledLedger72.length === 0, 'SEC-05: Escrow is NOT auto-settled after 72 hours; preserved safely for review');

    console.log('\n[SEC-06] Testing User Registration Handle Collision Recovery...');

    // Register user with handle 'charlie'
    await resetAuth();
    const charlie1Id = await createTestUser('charlie1@example.com', 'Charlie Prime', 'charlie');
    const charlie1Profile = (await testClient.query(`SELECT handle FROM public.profiles WHERE id = '${charlie1Id}';`)).rows[0];
    assert(charlie1Profile.handle === 'charlie', 'SEC-06: First user successfully claimed handle "charlie"');

    // Register second user with identical requested handle 'charlie'
    const charlie2Id = await createTestUser('charlie2@example.com', 'Charlie Second', 'charlie');
    const charlie2Profile = (await testClient.query(`SELECT handle FROM public.profiles WHERE id = '${charlie2Id}';`)).rows[0];
    assert(charlie2Profile.handle.startsWith('charlie_') && charlie2Profile.handle !== 'charlie',
      `SEC-06: Handle collision resolved automatically with unique suffix ("${charlie2Profile.handle}")`);

    // Verify both users received their 3 welcome credits
    const charlie1Wallet = await getWallet(charlie1Id);
    const charlie2Wallet = await getWallet(charlie2Id);
    assert(charlie1Wallet.available_balance === 3 && charlie2Wallet.available_balance === 3,
      'SEC-06: Both users received 3 welcome credits cleanly without transaction abort');

  } catch (err) {
    console.error('Fatal error in Phase 5A test execution:', err);
    failed++;
  } finally {
    await testClient.end();
  }

  console.log('\n======================================================');
  console.log('   Phase 5A Test Suite Summary:');
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
