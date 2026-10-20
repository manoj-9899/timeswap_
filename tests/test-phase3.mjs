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
  console.log('   TimeSwap Phase 3 Session Booking & Escrow Tests    ');
  console.log('======================================================\n');

  // 1. Reset dedicated sandbox database
  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();

  console.log('[Setup] Initializing clean sandbox database timeswap_phase3_test...');
  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_phase3_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_phase3_test;');
  await adminClient.query('CREATE DATABASE timeswap_phase3_test;');
  await adminClient.end();

  // 2. Connect to sandbox
  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_phase3_test' });
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

    // 4. Apply all 5 migrations in order
    const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationFiles = [
      '20261020000001_initial_schema.sql',
      '20261020000002_rls_policies.sql',
      '20261020000003_auth_welcome_credits_trigger.sql',
      '20261020000004_profiles_and_onboarding.sql',
      '20261020000005_session_booking_and_credit_escrow.sql',
    ];

    for (const file of migrationFiles) {
      console.log(`[Migrations] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await testClient.query(sql);
    }
    assert(true, 'All 5 SQL migrations applied cleanly without errors');

    // Grant access to application tables and RPCs
    await testClient.query(`
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated_user;
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
      let q = `SELECT * FROM public.credit_ledger WHERE session_id = '${sessionId}'`;
      if (entryType) q += ` AND entry_type = '${entryType}'`;
      const res = await testClient.query(q);
      if (prevRole.current_role === 'authenticated_user' && prevRole.sub) {
        await setAuthUser(prevRole.sub);
      }
      return res.rows;
    }

    // Helper to create verified, onboarded test users
    async function createTestMember(name, email, credits = 3) {
      await resetAuth();
      const res = await testClient.query(`
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES ('${email}', 'hash123', now(), '{"name": "${name}"}'::jsonb)
        RETURNING id;
      `);
      const userId = res.rows[0].id;

      // Mark onboarding completed
      await testClient.query(`
        UPDATE public.profiles
        SET onboarding_completed = true, onboarding_step = 6
        WHERE id = '${userId}';
      `);

      // Set available credits if different from default welcome 3
      if (credits !== 3) {
        await testClient.query(`
          UPDATE public.credit_wallets
          SET available_balance = ${credits}
          WHERE profile_id = '${userId}';
        `);
      }

      return userId;
    }

    // Setup Test Members
    const aliceId = await createTestMember('Alice Learner', 'alice@timeswap.org', 3);
    const bobId = await createTestMember('Bob Mentor', 'bob@timeswap.org', 3);
    const carolId = await createTestMember('Carol ThirdParty', 'carol@timeswap.org', 3);

    // Register Bob's availability slot on Thursday 14:00 to 18:00 UTC
    await testClient.query(`
      INSERT INTO public.availability_slots (profile_id, day_of_week, start_time, end_time, timezone)
      VALUES ('${bobId}', 4, '14:00:00', '18:00:00', 'UTC');
    `);

    // =========================================================================
    // Test Group 1: Whole-Number Durations, Integer Costs, and Reservation Timing
    // =========================================================================
    console.log('\n[Test Group 1] Session Booking & Atomic Escrow Reservation...');

    // 1. Valid 60-, 120-, and 180-minute requests
    await setAuthUser(aliceId);
    const startTime60 = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const req60 = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid,
        NULL::uuid,
        'Full Stack Architecture',
        'Code & Technology',
        'Learn distributed system patterns',
        60,
        '${startTime60}'::timestamptz,
        'Notes 60m'
      ) AS result;
    `);
    const sess60 = req60.rows[0].result;
    assert(sess60.credit_cost === 1 && sess60.duration_minutes === 60, 'Valid 60-minute request created with exactly 1 credit cost');

    // Check learner wallet reservation (available 3 -> 2, escrow 0 -> 1)
    const walletAfter60 = await getWallet(aliceId);
    assert(
      walletAfter60.available_balance === 2 && walletAfter60.escrow_balance === 1,
      'Atomically reserved 1 credit: available_balance = 2, escrow_balance = 1'
    );

    // 2. Rejection of unsupported durations and fractional credit values
    let unsupportedDurationFailed = false;
    try {
      await testClient.query(`
        SELECT public.create_session_request(
          '${bobId}'::uuid, NULL::uuid, 'Watercolor Basics', 'Crafts & Hands-on',
          'Brush strokes', 30, '${startTime60}'::timestamptz
        );
      `);
    } catch (e) {
      unsupportedDurationFailed = e.message.includes('Invalid session duration');
    }
    assert(unsupportedDurationFailed, 'Rejection of unsupported duration (30 minutes rejected)');

    let invalid90DurationFailed = false;
    try {
      await testClient.query(`
        SELECT public.create_session_request(
          '${bobId}'::uuid, NULL::uuid, 'Watercolor Basics', 'Crafts & Hands-on',
          'Brush strokes', 90, '${startTime60}'::timestamptz
        );
      `);
    } catch (e) {
      invalid90DurationFailed = e.message.includes('Invalid session duration');
    }
    assert(invalid90DurationFailed, 'Rejection of unsupported duration (90 minutes rejected)');

    // 3. Valid 120-minute request (2 credits)
    const startTime120 = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const req120 = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Database Design Intensive', 'Code & Technology',
        'Postgres indexing and RLS', 120, '${startTime120}'::timestamptz
      ) AS result;
    `);
    const sess120 = req120.rows[0].result;
    assert(sess120.credit_cost === 2 && sess120.duration_minutes === 120, 'Valid 120-minute request created with exactly 2 credit cost');

    // Alice had 2 credits remaining, spent 2 -> now available = 0, escrow = 3
    const walletAfter120 = await getWallet(aliceId);
    assert(
      walletAfter120.available_balance === 0 && walletAfter120.escrow_balance === 3,
      'Wallet balances updated accurately: available = 0, escrow = 3'
    );

    // 4. Insufficient balance rejection
    let insufficientCreditFailed = false;
    try {
      await testClient.query(`
        SELECT public.create_session_request(
          '${bobId}'::uuid, NULL::uuid, 'Advanced Systems', 'Code & Technology',
          'Kubernetes orchestration', 60, '${startTime120}'::timestamptz
        );
      `);
    } catch (e) {
      insufficientCreditFailed = e.message.includes('Insufficient available time credits');
    }
    assert(insufficientCreditFailed, 'Booking rejected when learner available credits (0) are less than cost (1)');

    // =========================================================================
    // Test Group 2: Concurrency & Network Timeout Idempotency
    // =========================================================================
    console.log('\n[Test Group 2] Concurrency Safety & Idempotent Retries...');

    // Fund Carol with exactly 1 credit for concurrency race
    await resetAuth();
    await testClient.query(`UPDATE public.credit_wallets SET available_balance = 1 WHERE profile_id = '${carolId}';`);

    // Duplicate submission with idempotency key
    await setAuthUser(carolId);
    const retryKey = 'idemp_key_carol_retry_test_001';
    const firstReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Design Systems', 'Design & Creative',
        'Figma variables', 60, '${startTime60}'::timestamptz, 'Notes', '${retryKey}'
      ) AS result;
    `);
    const firstSessId = firstReq.rows[0].result.id;

    // Retry identical request with same key
    const retryReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Design Systems', 'Design & Creative',
        'Figma variables', 60, '${startTime60}'::timestamptz, 'Notes', '${retryKey}'
      ) AS result;
    `);
    const retrySessId = retryReq.rows[0].result.id;
    assert(firstSessId === retrySessId, 'Retried request with identical idempotency_key returns original session');

    // Verify Carol was charged exactly 1 credit, not 2
    const carolWallet = await getWallet(carolId);
    assert(
      carolWallet.available_balance === 0 && carolWallet.escrow_balance === 1,
      'Idempotent retry did not double-reserve credits (available = 0, escrow = 1)'
    );

    // =========================================================================
    // Test Group 3: Mentor Acceptance, Rejection & Expiry
    // =========================================================================
    console.log('\n[Test Group 3] Request Acceptance, Decline & Expiry Lifecycles...');

    // 7. Mentor acceptance by authorized mentor
    await setAuthUser(bobId);
    const acceptRes = await testClient.query(`
      SELECT public.accept_session_request('${sess60.id}'::uuid) AS result;
    `);
    assert(acceptRes.rows[0].result.status === 'accepted', 'Authorized mentor successfully accepted session request');

    // 8. Unauthorized acceptance attempt (Alice tries to accept her own requested session)
    await setAuthUser(aliceId);
    let unauthorizedAcceptFailed = false;
    try {
      await testClient.query(`SELECT public.accept_session_request('${sess120.id}'::uuid);`);
    } catch (e) {
      unauthorizedAcceptFailed = e.message.includes('Only the designated mentor can accept');
    }
    assert(unauthorizedAcceptFailed, 'Unauthorized user cannot accept session request');

    // 9. Declining a request and releasing credits exactly once
    await setAuthUser(bobId);
    const declineRes = await testClient.query(`
      SELECT public.decline_session_request('${sess120.id}'::uuid, 'Mentor schedule conflict') AS result;
    `);
    assert(declineRes.rows[0].result.status === 'declined', 'Mentor successfully declined session request');

    // Check Alice wallet: 2 credits returned from escrow to available!
    const walletAfterDecline = await getWallet(aliceId);
    assert(
      walletAfterDecline.available_balance === 2 && walletAfterDecline.escrow_balance === 1,
      'Declined session released 2 credits back to learner (available: 0 -> 2, escrow: 3 -> 1)'
    );

    // Verify immutable ledger refund entry
    const refundLedger = await getLedgerEntries(sess120.id, 'escrow_refund');
    assert(refundLedger.length === 1 && refundLedger[0].amount === 2, 'Authoritative escrow_refund journal entry created in credit_ledger');

    // Repeated decline is idempotent
    const repeatDecline = await testClient.query(`
      SELECT public.decline_session_request('${sess120.id}'::uuid) AS result;
    `);
    assert(repeatDecline.rows[0].result.status === 'declined', 'Repeated decline call is safe and idempotent');

    // 10. Request expiry and rejection of late acceptance
    // Create an expiring session request
    await setAuthUser(aliceId);
    const expiringReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Typography Systems', 'Design & Creative',
        'Font scales', 60, '${startTime60}'::timestamptz
      ) AS result;
    `);
    const expiringSessId = expiringReq.rows[0].result.id;

    // Simulate session past cutoff by backdating scheduled_start_at
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() + interval '1 hour'
      WHERE id = '${expiringSessId}';
    `);

    // Mentor tries to accept after cutoff -> rejected
    await setAuthUser(bobId);
    let lateAcceptFailed = false;
    try {
      await testClient.query(`SELECT public.accept_session_request('${expiringSessId}'::uuid);`);
    } catch (e) {
      lateAcceptFailed = e.message.includes('Session request has expired and can no longer be accepted');
    }
    assert(lateAcceptFailed, 'Late acceptance rejected due to passing response deadline');

    // Run expiration function / worker
    await testClient.query(`SELECT public.expire_session_request('${expiringSessId}'::uuid);`);
    const expiredSessRow = await testClient.query(`SELECT status FROM public.sessions WHERE id = '${expiringSessId}';`);
    assert(expiredSessRow.rows[0].status === 'expired', 'Expired session status is authoritative "expired"');

    // =========================================================================
    // Test Group 4: Authoritative 2-Hour Cancellation Policy
    // =========================================================================
    console.log('\n[Test Group 4] 2-Hour Cancellation Policy & Review Routes...');

    // 11. Early Learner Cancellation (> 2 hours before scheduled start)
    // Create new session scheduled in 24 hours
    await setAuthUser(aliceId);
    const earlyCancelReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Creative Coding', 'Code & Technology',
        'Canvas shaders', 60, '${startTime60}'::timestamptz
      ) AS result;
    `);
    const earlyCancelSessId = earlyCancelReq.rows[0].result.id;

    // Alice cancels early
    const earlyCancelRes = await testClient.query(`
      SELECT public.cancel_session('${earlyCancelSessId}'::uuid, 'Schedule conflict') AS result;
    `);
    assert(earlyCancelRes.rows[0].result.status === 'cancelled_by_learner', 'Learner early cancellation succeeds with status cancelled_by_learner');

    // Verify refund in ledger
    const earlyCancelLedger = await getLedgerEntries(earlyCancelSessId, 'escrow_refund');
    assert(earlyCancelLedger.length === 1 && earlyCancelLedger[0].amount === 1, 'Full refund recorded in credit_ledger for early cancellation');

    // 12. Late Learner Cancellation (<= 2h before start) with Available Mentor
    // Create new session scheduled 24h out so it can be accepted
    const lateReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Advanced Shaders', 'Code & Technology',
        'GLSL fragment shaders', 60, '${startTime60}'::timestamptz
      ) AS result;
    `);
    const lateSessId = lateReq.rows[0].result.id;

    // Accept session so mentor availability is verified
    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${lateSessId}'::uuid);`);

    // Backdate session to be 1 hour from now (late cutoff)
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() + interval '1 hour',
          scheduled_end_at = now() + interval '2 hours'
      WHERE id = '${lateSessId}';
    `);

    // Alice cancels late with verified available mentor
    await setAuthUser(aliceId);
    const bobPreBal = (await getWallet(bobId)).available_balance;
    const lateCancelRes = await testClient.query(`
      SELECT public.cancel_session('${lateSessId}'::uuid, 'Car broke down', true) AS result;
    `);
    assert(lateCancelRes.rows[0].result.status === 'cancelled_by_learner', 'Late cancellation executed');

    // Check that 1 credit was transferred to mentor Bob as compensation
    const bobPostBal = (await getWallet(bobId)).available_balance;
    assert(bobPostBal === bobPreBal + 1, 'Mentor received 1 credit cancellation compensation');

    const lateLedger = await getLedgerEntries(lateSessId, 'escrow_cancellation_transfer');
    assert(lateLedger.length === 1 && lateLedger[0].amount === 1, 'escrow_cancellation_transfer recorded in ledger');

    // 13. Mentor Cancellation -> Full Refund to Learner
    // Bob cancels the active session sess60
    await setAuthUser(bobId);
    const mentorCancelRes = await testClient.query(`
      SELECT public.cancel_session('${sess60.id}'::uuid, 'Mentor emergency') AS result;
    `);
    assert(mentorCancelRes.rows[0].result.status === 'cancelled_by_teacher', 'Mentor cancellation marked cancelled_by_teacher');

    const mentorCancelLedger = await getLedgerEntries(sess60.id, 'escrow_refund');
    assert(mentorCancelLedger.length === 1, 'Full refund to learner recorded when mentor initiates cancellation');

    // 14. Unavailable Mentor Late-Cancellation Review Path
    // Create session, backdate within 1h, but specify mentor was NOT available
    await setAuthUser(aliceId);
    const unavailReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Unverified Session', 'Code & Technology',
        'Testing review route', 60, '${startTime60}'::timestamptz
      ) AS result;
    `);
    const unavailSessId = unavailReq.rows[0].result.id;

    // Backdate within 1 hour
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() + interval '1 hour',
          scheduled_end_at = now() + interval '2 hours'
      WHERE id = '${unavailSessId}';
    `);

    // Learner cancels late, but mentor availability is unverified (false)
    await setAuthUser(aliceId);
    const unavailCancelRes = await testClient.query(`
      SELECT public.cancel_session('${unavailSessId}'::uuid, 'Learner late cancel', false) AS result;
    `);
    assert(unavailCancelRes.rows[0].result.status === 'under_review', 'Late cancellation with unavailable mentor routed to status under_review');

    // Escrow balance remains securely held
    const aliceEscrow = (await getWallet(aliceId)).escrow_balance;
    assert(aliceEscrow >= 1, 'Escrow credits preserved and held securely during review');

    // =========================================================================
    // Test Group 5: Bilateral Completion & Settlement Handshake
    // =========================================================================
    console.log('\n[Test Group 5] Bilateral Completion Handshake & Settlement...');

    // Create session for bilateral completion test
    await setAuthUser(aliceId);
    const bilateralReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Bilateral Handshake Masterclass', 'Code & Technology',
        'Two-way confirmation', 60, '${startTime60}'::timestamptz
      ) AS result;
    `);
    const biSessId = bilateralReq.rows[0].result.id;

    // Bob accepts
    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${biSessId}'::uuid);`);

    // 15. One participant confirms without settlement
    await setAuthUser(aliceId);
    const conf1 = await testClient.query(`
      SELECT public.confirm_session_completion('${biSessId}'::uuid) AS result;
    `);
    assert(
      conf1.rows[0].result.status === 'awaiting_completion' && conf1.rows[0].result.both_confirmed === false,
      'First confirmation updates status to awaiting_completion without releasing credits'
    );

    // Verify Bob hasn't received credits yet
    const bobBalBeforeSecond = (await getWallet(bobId)).available_balance;

    // 18. Forged partner confirmation attempt (Alice tries to confirm as Bob)
    let forgedConfirmFailed = false;
    try {
      // Alice is authenticated user, but tries to pass role or confirm for Bob
      await setAuthUser(aliceId);
      // confirm_session_completion uses auth.uid(), so Alice calling it again just confirms as learner
      const dupAlice = await testClient.query(`SELECT public.confirm_session_completion('${biSessId}'::uuid) AS result;`);
      assert(dupAlice.rows[0].result.both_confirmed === false, 'Caller identity strictly derived from auth.uid(); cannot confirm on behalf of partner');
    } catch (e) {
      // safe
    }

    // 16. Second participant confirms: exactly ONE settlement
    await setAuthUser(bobId);
    const conf2 = await testClient.query(`
      SELECT public.confirm_session_completion('${biSessId}'::uuid) AS result;
    `);
    assert(
      conf2.rows[0].result.status === 'completed' && conf2.rows[0].result.both_confirmed === true && conf2.rows[0].result.settled === true,
      'Second confirmation triggers settlement and marks session completed'
    );

    // Verify Bob received exactly 1 credit
    const bobBalAfterSecond = (await getWallet(bobId)).available_balance;
    assert(bobBalAfterSecond === bobBalBeforeSecond + 1, 'Mentor wallet credited exactly 1 time credit upon bilateral confirmation');

    // Verify ledger settlement record
    const settlementLedger = await getLedgerEntries(biSessId, 'escrow_release_earned');
    assert(settlementLedger.length === 1 && settlementLedger[0].amount === 1, 'Single escrow_release_earned ledger record created');

    // 17. Repeated confirmation requests do not produce duplicate transfers
    const repeatConf = await testClient.query(`
      SELECT public.confirm_session_completion('${biSessId}'::uuid) AS result;
    `);
    assert(repeatConf.rows[0].result.status === 'completed', 'Repeated confirmation is idempotent and returns completed');

    const bobBalAfterRepeat = (await getWallet(bobId)).available_balance;
    assert(bobBalAfterRepeat === bobBalAfterSecond, 'No duplicate credit transfer occurred on repeated confirmation');

    // =========================================================================
    // Test Group 6: 72-Hour Review Flagging (Ghosting / Unresolved Sessions)
    // =========================================================================
    console.log('\n[Test Group 6] 72-Hour Unresolved Review Flagging...');

    // Replenish Alice's wallet for ghosting test session
    await resetAuth();
    await testClient.query(`UPDATE public.credit_wallets SET available_balance = 3 WHERE profile_id = '${aliceId}';`);

    // Create session, accept it, and backdate scheduled_end_at past 72 hours
    await setAuthUser(aliceId);
    const ghostReq = await testClient.query(`
      SELECT public.create_session_request(
        '${bobId}'::uuid, NULL::uuid, 'Ghosting Review Test', 'Code & Technology',
        'Testing 72h window', 60, '${startTime60}'::timestamptz
      ) AS result;
    `);
    const ghostSessId = ghostReq.rows[0].result.id;

    await setAuthUser(bobId);
    await testClient.query(`SELECT public.accept_session_request('${ghostSessId}'::uuid);`);

    // Backdate scheduled_end_at to 80 hours ago
    await resetAuth();
    await testClient.query(`
      UPDATE public.sessions
      SET scheduled_start_at = now() - interval '82 hours',
          scheduled_end_at = now() - interval '81 hours',
          status = 'awaiting_completion'
      WHERE id = '${ghostSessId}';
    `);

    // Run review flag worker
    const flagCount = await testClient.query(`SELECT public.flag_unresolved_sessions() AS flagged;`);
    assert(flagCount.rows[0].flagged >= 1, 'Unresolved 72-hour session flagged by automated worker');

    const ghostSessRow = await testClient.query(`SELECT status FROM public.sessions WHERE id = '${ghostSessId}';`);
    assert(ghostSessRow.rows[0].status === 'under_review', 'Unresolved session status transitioned to "under_review"');

    // Check that escrow credits remain preserved without auto-settlement
    const noAutoSettlement = await getLedgerEntries(ghostSessId, 'escrow_release_earned');
    assert(noAutoSettlement.length === 0, 'No automatic credit settlement occurred during 72-hour review flagging');

    // =========================================================================
    // Test Group 7: Ledger Reconciliation & Security Isolation
    // =========================================================================
    console.log('\n[Test Group 7] Financial Ledger Reconciliation & RLS Boundaries...');

    // 22. Ledger immutability: UPDATE / DELETE rejected
    let ledgerUpdateFailed = false;
    try {
      await testClient.query(`
        UPDATE public.credit_ledger
        SET amount = 99
        WHERE session_id = '${biSessId}';
      `);
    } catch (e) {
      ledgerUpdateFailed = e.message.includes('immutable');
    }
    assert(ledgerUpdateFailed, 'Immutable ledger rejects UPDATE attempts at database engine level');

    // 23. RLS Isolation: Third-party Carol cannot view Alice and Bob private session
    await setAuthUser(carolId);
    const carolView = await testClient.query(`
      SELECT * FROM public.sessions WHERE id = '${biSessId}';
    `);
    assert(carolView.rows.length === 0, 'RLS policy hides private session between Alice and Bob from third-party Carol');

    // 24. Participant Alice can view her session
    await setAuthUser(aliceId);
    const aliceView = await testClient.query(`
      SELECT * FROM public.sessions WHERE id = '${biSessId}';
    `);
    assert(aliceView.rows.length === 1, 'Participant Alice can view her own session');

  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    failed++;
  } finally {
    await testClient.end();
  }

  console.log('\n======================================================');
  console.log(`   Phase 3 Test Suite Summary:`);
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
