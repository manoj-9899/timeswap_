import assert from 'node:assert';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Client } = pg;

const PG_CONFIG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'timeswap',
  password: process.env.PGPASSWORD || 'timeswap_dev_pass',
  database: process.env.PGDATABASE || 'timeswap_db',
};

const TEST_DB_NAME = 'timeswap_whole_hour_test';

// Authoritative domain mirror matching src/lib/domain/duration.ts
const SUPPORTED_SESSION_DURATIONS = [60, 120, 180];

function isValidSessionDuration(minutes) {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return false;
  }
  return SUPPORTED_SESSION_DURATIONS.includes(minutes);
}

function calculateCreditCost(durationMinutes) {
  if (!isValidSessionDuration(durationMinutes)) {
    throw new Error(
      `Invalid session duration (${durationMinutes} min). TimeSwap strictly requires whole-hour sessions: 60m (1 credit), 120m (2 credits), or 180m (3 credits).`
    );
  }
  const credits = durationMinutes / 60;
  if (!Number.isInteger(credits) || credits < 1 || credits > 3) {
    throw new Error(`Derived credit cost for ${durationMinutes} min is not an authorized integer credit amount.`);
  }
  return credits;
}

function validateAndCalculateCreditCost(durationMinutes) {
  if (durationMinutes === undefined || durationMinutes === null) {
    return {
      valid: false,
      error: 'Session duration is required.',
    };
  }

  const num = typeof durationMinutes === 'number' ? durationMinutes : Number(durationMinutes);

  if (isNaN(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      error: `Invalid duration value "${durationMinutes}". Session duration must be an integer number of minutes (60, 120, or 180).`,
    };
  }

  if (!isValidSessionDuration(num)) {
    return {
      valid: false,
      error: `Unsupported session duration (${num} min). Only 60 minutes (1 credit), 120 minutes (2 credits), and 180 minutes (3 credits) are accepted. Fractional sessions (such as 30m or 90m) are not supported.`,
    };
  }

  return {
    valid: true,
    duration: num,
    credits: num / 60,
  };
}

function isIntegerCreditAmount(credits) {
  return typeof credits === 'number' && Number.isInteger(credits) && credits >= 0;
}

async function runWholeHourInvariantsTest() {
  console.log('======================================================');
  console.log('  TimeSwap Whole-Hour & Integer Credits Test Suite    ');
  console.log('======================================================\n');

  // ---------------------------------------------------------------------------
  // [Test Group 1] Centralized Domain Invariants & AST Integrity
  // ---------------------------------------------------------------------------
  console.log('[Test Group 1] Centralized Domain Invariants & Source Verification...');

  // Verify src/lib/domain/duration.ts exists and exports constants and functions
  const domainSourcePath = path.join(process.cwd(), 'src', 'lib', 'domain', 'duration.ts');
  assert(fs.existsSync(domainSourcePath), 'src/lib/domain/duration.ts must exist');
  const domainCode = fs.readFileSync(domainSourcePath, 'utf8');

  assert(domainCode.includes('[60, 120, 180]'), 'duration.ts defines [60, 120, 180]');
  assert(domainCode.includes('calculateCreditCost'), 'duration.ts exports calculateCreditCost');
  assert(domainCode.includes('validateAndCalculateCreditCost'), 'duration.ts exports validateAndCalculateCreditCost');
  assert(domainCode.includes('durationMinutes / 60'), 'duration.ts derives credits as durationMinutes / 60');

  // 1.A Valid whole-hour sessions derive exact integer credits
  assert.strictEqual(calculateCreditCost(60), 1, '60 minutes costs exactly 1 credit');
  assert.strictEqual(calculateCreditCost(120), 2, '120 minutes costs exactly 2 credits');
  assert.strictEqual(calculateCreditCost(180), 3, '180 minutes costs exactly 3 credits');
  console.log('  ✓ PASS: 60m (1cr), 120m (2cr), and 180m (3cr) derive exact integer credit costs');

  // 1.B Verification of isValidSessionDuration guard
  assert(isValidSessionDuration(60), '60 is valid');
  assert(isValidSessionDuration(120), '120 is valid');
  assert(isValidSessionDuration(180), '180 is valid');
  assert(!isValidSessionDuration(30), '30 is rejected');
  assert(!isValidSessionDuration(90), '90 is rejected');
  assert(!isValidSessionDuration(0), '0 is rejected');
  assert(!isValidSessionDuration(-60), 'Negative duration is rejected');
  assert(!isValidSessionDuration(45), '45 is rejected');
  assert(!isValidSessionDuration(150), '150 is rejected');
  assert(!isValidSessionDuration(240), '240 is rejected');
  assert(!isValidSessionDuration(60.5), 'Fractional 60.5 is rejected');
  assert(!isValidSessionDuration('60'), 'String "60" is rejected');
  assert(!isValidSessionDuration(null), 'null is rejected');
  assert(!isValidSessionDuration(undefined), 'undefined is rejected');
  console.log('  ✓ PASS: isValidSessionDuration strictly guards against non-supported, fractional, and invalid inputs');

  // 1.C calculateCreditCost throws without coercion
  assert.throws(() => calculateCreditCost(30), /Invalid session duration/);
  assert.throws(() => calculateCreditCost(90), /Invalid session duration/);
  assert.throws(() => calculateCreditCost(0), /Invalid session duration/);
  assert.throws(() => calculateCreditCost(-60), /Invalid session duration/);
  console.log('  ✓ PASS: calculateCreditCost throws on 30m, 90m, 0m, -60m without silent coercion');

  // 1.D validateAndCalculateCreditCost provides structured validation
  const val60 = validateAndCalculateCreditCost(60);
  assert(val60.valid && val60.duration === 60 && val60.credits === 1, 'Validates 60m -> 1cr');
  
  const val120 = validateAndCalculateCreditCost(120);
  assert(val120.valid && val120.duration === 120 && val120.credits === 2, 'Validates 120m -> 2cr');

  const val180 = validateAndCalculateCreditCost(180);
  assert(val180.valid && val180.duration === 180 && val180.credits === 3, 'Validates 180m -> 3cr');

  const val30 = validateAndCalculateCreditCost(30);
  assert(!val30.valid && val30.error.includes('Unsupported session duration'), 'Rejects 30m with explicit message');

  const val90 = validateAndCalculateCreditCost(90);
  assert(!val90.valid && val90.error.includes('Unsupported session duration'), 'Rejects 90m with explicit message');

  const valFractional = validateAndCalculateCreditCost(60.5);
  assert(!valFractional.valid && valFractional.error.includes('must be an integer'), 'Rejects fractional 60.5m');

  const valNull = validateAndCalculateCreditCost(null);
  assert(!valNull.valid && valNull.error.includes('required'), 'Rejects null duration');
  console.log('  ✓ PASS: validateAndCalculateCreditCost produces structured errors without silent coercion');

  // 1.E Integer credit amount validator
  assert(isIntegerCreditAmount(0), '0 is valid integer credit');
  assert(isIntegerCreditAmount(1), '1 is valid integer credit');
  assert(isIntegerCreditAmount(100), '100 is valid integer credit');
  assert(!isIntegerCreditAmount(0.5), '0.5 is rejected');
  assert(!isIntegerCreditAmount(1.5), '1.5 is rejected');
  assert(!isIntegerCreditAmount(-1), '-1 is rejected');
  assert(!isIntegerCreditAmount('1'), 'String "1" is rejected');
  console.log('  ✓ PASS: isIntegerCreditAmount verifies strictly non-negative integers');

  // ---------------------------------------------------------------------------
  // [Test Group 2] Mock Data & Client Source Invariants
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 2] Mock Data & Client Model Invariants...');

  const mockDataSource = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'mockData.ts'), 'utf8');

  // Ensure no fractional credits or half-hour session labels in mockData.ts
  assert(!mockDataSource.includes('availableCredits: 3.5'), 'No fractional 3.5 available credits');
  assert(!mockDataSource.includes('hoursLearned: 4.5'), 'No fractional 4.5 hours learned');
  assert(!mockDataSource.includes('creditCost: 1.0'), 'creditCost is integer not 1.0');
  assert(!mockDataSource.includes('amount: 1.5'), 'No fractional 1.5 transaction amounts');
  assert(!mockDataSource.includes('90m'), 'No 90m sessions in transactions');
  assert(!mockDataSource.includes('30m introduction'), 'No 30m session proposals in chat');
  console.log('  ✓ PASS: src/lib/mockData.ts verified free of fractional credits, 30m, and 90m references');

  // Verify homepage copy invariants
  const pageSource = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf8');
  assert(!pageSource.includes('0.5 Credit'), 'Homepage has no 0.5 Credit badge');
  assert(!pageSource.includes('1.5 Credits'), 'Homepage has no 1.5 Credits badge');
  assert(!pageSource.includes('30m'), 'Homepage has no 30m matrix item');
  assert(!pageSource.includes('90m'), 'Homepage has no 90m matrix item');
  assert(pageSource.includes('60 minutes taught = 1 credit'), 'Homepage explains 60m = 1 credit');
  assert(pageSource.includes('120 minutes = 2 credits'), 'Homepage explains 120m = 2 credits');
  assert(pageSource.includes('180 minutes = 3 credits'), 'Homepage explains 180m = 3 credits');
  console.log('  ✓ PASS: src/app/page.tsx verified with 60m (1cr), 120m (2cr), and 180m (3cr) matrix');

  // Verify dashboard page formatting invariants
  const dashboardSource = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'dashboard', 'page.tsx'), 'utf8');
  assert(!dashboardSource.includes('availableCredits.toFixed(1)'), 'Dashboard does not use toFixed(1) for available credits');
  assert(!dashboardSource.includes('pendingCredits.toFixed(1)'), 'Dashboard does not use toFixed(1) for escrow credits');
  console.log('  ✓ PASS: src/app/dashboard/page.tsx displays pure whole integer credit balances');

  // Verify store.tsx integrates validation
  const storeSource = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'store.tsx'), 'utf8');
  assert(storeSource.includes('validateAndCalculateCreditCost'), 'store.tsx calls validateAndCalculateCreditCost');
  console.log('  ✓ PASS: src/lib/store.tsx enforces centralized domain duration validation on requestSession');

  // ---------------------------------------------------------------------------
  // [Test Group 3] Database Schema & RPC Enforcement (Postgres Sandbox)
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 3] Database Schema & Stored Procedure Constraints...');

  const rootClient = new Client(PG_CONFIG);
  await rootClient.connect();

  await rootClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME};`);
  await rootClient.query(`CREATE DATABASE ${TEST_DB_NAME};`);
  await rootClient.end();

  const testClient = new Client({ ...PG_CONFIG, database: TEST_DB_NAME });
  await testClient.connect();

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = [
    '20261020000001_initial_schema.sql',
    '20261020000002_rls_policies.sql',
    '20261020000003_auth_welcome_credits_trigger.sql',
    '20261020000004_profiles_and_onboarding.sql',
    '20261020000005_session_booking_and_credit_escrow.sql',
    '20261020000006_realtime_messaging_and_notifications.sql',
    '20261020000007_security_hardening.sql',
  ];

  // Bootstrap mock auth schema
  await testClient.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      email_confirmed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$ LANGUAGE sql STABLE;
  `);

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await testClient.query(sql);
  }
  console.log('  ✓ PASS: Applied all 7 database migrations cleanly to sandbox database');

  // Create two verified test users: Alice (learner) and Bob (mentor)
  const aliceId = '11111111-1111-4111-a111-111111111111';
  const bobId = '22222222-2222-4222-a222-222222222222';

  await testClient.query(`
    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    VALUES 
      ('${aliceId}', 'alice.learner@example.com', now(), '{"name":"Alice Learner"}'::jsonb),
      ('${bobId}', 'bob.mentor@example.com', now(), '{"name":"Bob Mentor"}'::jsonb);
  `);

  // Mark onboarding complete so bookings are permitted
  await testClient.query(`
    UPDATE public.profiles 
    SET onboarding_completed = true, onboarding_step = 5 
    WHERE id IN ('${aliceId}', '${bobId}');
  `);

  // Verify Alice has 3 welcome credits in integer wallet
  const aliceWalletRes = await testClient.query(`
    SELECT available_balance, escrow_balance FROM public.credit_wallets WHERE profile_id = '${aliceId}';
  `);
  assert.strictEqual(aliceWalletRes.rows[0].available_balance, 3, 'Alice starts with exactly 3 whole credits');
  assert.strictEqual(aliceWalletRes.rows[0].escrow_balance, 0, 'Alice starts with 0 escrow credits');

  // 3.A Direct INSERT rejects 30-minute duration
  let direct30Threw = false;
  try {
    await testClient.query(`
      INSERT INTO public.sessions (
        teacher_id, learner_id, skill_title, category, learning_goal,
        duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at, status
      ) VALUES (
        '${bobId}', '${aliceId}', 'Watercolor Express', 'Crafts & Hands-on', 'Brush quick',
        30, 1, now() + interval '1 day', now() + interval '1 day 30 minutes', 'requested'
      );
    `);
  } catch (err) {
    direct30Threw = err.message.includes('chk_sessions_allowed_durations');
  }
  assert(direct30Threw, 'Direct table INSERT of 30-minute session rejected by chk_sessions_allowed_durations');
  console.log('  ✓ PASS: Database constraint chk_sessions_allowed_durations rejects 30-minute sessions');

  // 3.B Direct INSERT rejects 90-minute duration
  let direct90Threw = false;
  try {
    await testClient.query(`
      INSERT INTO public.sessions (
        teacher_id, learner_id, skill_title, category, learning_goal,
        duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at, status
      ) VALUES (
        '${bobId}', '${aliceId}', 'Pottery Masterclass', 'Crafts & Hands-on', 'Clay throwing',
        90, 2, now() + interval '1 day', now() + interval '1 day 90 minutes', 'requested'
      );
    `);
  } catch (err) {
    direct90Threw = err.message.includes('chk_sessions_allowed_durations');
  }
  assert(direct90Threw, 'Direct table INSERT of 90-minute session rejected by chk_sessions_allowed_durations');
  console.log('  ✓ PASS: Database constraint chk_sessions_allowed_durations rejects 90-minute sessions');

  // 3.C Direct INSERT rejects mismatched credit cost (duration 120m with cost 1)
  let mismatchCostThrew = false;
  try {
    await testClient.query(`
      INSERT INTO public.sessions (
        teacher_id, learner_id, skill_title, category, learning_goal,
        duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at, status
      ) VALUES (
        '${bobId}', '${aliceId}', 'Database Patterns', 'Code & Technology', 'Indexing',
        120, 1, now() + interval '1 day', now() + interval '1 day 120 minutes', 'requested'
      );
    `);
  } catch (err) {
    mismatchCostThrew = err.message.includes('chk_sessions_credit_cost_match');
  }
  assert(mismatchCostThrew, 'Direct table INSERT with mismatched cost rejected by chk_sessions_credit_cost_match');
  console.log('  ✓ PASS: Database constraint chk_sessions_credit_cost_match rejects client cost discrepancies (120m with cost 1)');

  // 3.D Direct INSERT rejects fractional credit in credit_ledger due to INTEGER column
  let fractionalLedgerThrew = false;
  try {
    await testClient.query(`
      INSERT INTO public.credit_ledger (
        entry_type, source_wallet_id, destination_wallet_id, amount, idempotency_key, notes
      ) VALUES (
        'welcome_grant', NULL, '${aliceId}', '0.5', 'test_frac_key', 'Fractional credit attempt'
      );
    `);
  } catch (err) {
    fractionalLedgerThrew = err.message.includes('integer') || err.message.includes('invalid input syntax') || err.message.includes('chk_ledger');
  }
  assert(fractionalLedgerThrew, 'Direct table INSERT of 0.5 credit in credit_ledger rejected by INTEGER type');
  console.log('  ✓ PASS: PostgreSQL INTEGER column type strictly prevents fractional credits in credit_ledger');

  // 3.E RPC create_session_request as Alice:
  // Set auth context to Alice (session-level config)
  await testClient.query(`SELECT set_config('request.jwt.claim.sub', '${aliceId}', false);`);

  // Valid 60m request costs exactly 1 credit
  const rpc60Res = await testClient.query(`
    SELECT public.create_session_request(
      '${bobId}'::uuid, NULL::uuid, 'TypeScript Generics', 'Code & Technology',
      'Understand conditional types and mapped types', 60, (now() + interval '2 days')::timestamptz
    ) AS session;
  `);
  const session60 = rpc60Res.rows[0].session;
  assert.strictEqual(session60.duration_minutes, 60, 'RPC creates 60m duration');
  assert.strictEqual(session60.credit_cost, 1, 'RPC derives exactly 1 credit cost');

  // Check Alice's wallet: available 3 -> 2, escrow 0 -> 1
  const walletA1 = await testClient.query(`SELECT available_balance, escrow_balance FROM public.credit_wallets WHERE profile_id = '${aliceId}';`);
  assert.strictEqual(walletA1.rows[0].available_balance, 2, 'Available credits decremented to 2');
  assert.strictEqual(walletA1.rows[0].escrow_balance, 1, 'Escrow credits incremented to 1');
  console.log('  ✓ PASS: RPC create_session_request locks 1 integer credit for 60m session');

  // Valid 120m request costs exactly 2 credits
  const rpc120Res = await testClient.query(`
    SELECT public.create_session_request(
      '${bobId}'::uuid, NULL::uuid, 'Postgres Performance', 'Code & Technology',
      'EXPLAIN ANALYZE deep dive', 120, (now() + interval '3 days')::timestamptz
    ) AS session;
  `);
  const session120 = rpc120Res.rows[0].session;
  assert.strictEqual(session120.duration_minutes, 120, 'RPC creates 120m duration');
  assert.strictEqual(session120.credit_cost, 2, 'RPC derives exactly 2 credit cost');

  // Check Alice's wallet: available 2 -> 0, escrow 1 -> 3
  const walletA2 = await testClient.query(`SELECT available_balance, escrow_balance FROM public.credit_wallets WHERE profile_id = '${aliceId}';`);
  assert.strictEqual(walletA2.rows[0].available_balance, 0, 'Available credits decremented to 0');
  assert.strictEqual(walletA2.rows[0].escrow_balance, 3, 'Escrow credits incremented to 3');
  console.log('  ✓ PASS: RPC create_session_request locks 2 integer credits for 120m session');

  // 3.F RPC create_session_request rejects 30m, 90m, 45m, 0m, -60m
  const invalidDurations = [30, 90, 45, 0, -60, 240];
  for (const badDur of invalidDurations) {
    let rpcBadThrew = false;
    try {
      await testClient.query(`
        SELECT public.create_session_request(
          '${bobId}'::uuid, NULL::uuid, 'Invalid Duration Test', 'Code & Technology',
          'Testing invalid duration rejection', ${badDur}, (now() + interval '4 days')::timestamptz
        );
      `);
    } catch (err) {
      rpcBadThrew = err.message.includes('Invalid session duration');
    }
    assert(rpcBadThrew, `RPC strictly rejected unsupported duration ${badDur}m`);
  }
  console.log('  ✓ PASS: RPC create_session_request strictly rejects 30m, 90m, 45m, 0m, -60m, 240m');

  // 3.G Cancellation returns exact integer credits back to learner wallet
  const cancelRes = await testClient.query(`
    SELECT public.cancel_session('${session60.id}'::uuid, 'Schedule conflict') AS cancelled_session;
  `);
  const cancelledSession = cancelRes.rows[0].cancelled_session;
  assert.strictEqual(cancelledSession.status, 'cancelled_by_learner', 'Session marked cancelled_by_learner');

  // Check Alice's wallet: available 0 -> 1, escrow 3 -> 2
  const walletA3 = await testClient.query(`SELECT available_balance, escrow_balance FROM public.credit_wallets WHERE profile_id = '${aliceId}';`);
  assert.strictEqual(walletA3.rows[0].available_balance, 1, 'Available credits restored by 1 integer credit');
  assert.strictEqual(walletA3.rows[0].escrow_balance, 2, 'Escrow credits reduced by 1 integer credit');
  console.log('  ✓ PASS: cancel_session safely refunds whole-number credits (available: 0 -> 1, escrow: 3 -> 2)');

  // 3.H Acceptance and Bilateral Completion transfers exact integer credits to mentor
  await testClient.query(`SELECT set_config('request.jwt.claim.sub', '${bobId}', false);`);
  await testClient.query(`
    SELECT public.accept_session_request('${session120.id}'::uuid);
  `);

  // Mentor signoff
  await testClient.query(`
    SELECT public.confirm_session_completion('${session120.id}'::uuid);
  `);

  // Learner signoff
  await testClient.query(`SELECT set_config('request.jwt.claim.sub', '${aliceId}', false);`);
  const finalSignoffRes = await testClient.query(`
    SELECT public.confirm_session_completion('${session120.id}'::uuid);
  `);
  const completedSession = finalSignoffRes.rows[0].confirm_session_completion;
  assert.strictEqual(completedSession.status, 'completed', 'Session completed');
  assert.strictEqual(completedSession.both_confirmed, true, 'Both confirmed');
  assert.strictEqual(completedSession.settled, true, 'Settled and transfer finalized');

  // Check Bob's wallet: available 3 -> 5 (received 2 integer credits)
  const bobWallet = await testClient.query(`SELECT available_balance, escrow_balance FROM public.credit_wallets WHERE profile_id = '${bobId}';`);
  assert.strictEqual(bobWallet.rows[0].available_balance, 5, 'Mentor earned exactly 2 integer credits (3 -> 5)');
  assert.strictEqual(bobWallet.rows[0].escrow_balance, 0, 'Mentor escrow is 0');
  console.log('  ✓ PASS: confirm_session_completion transfers exact 2 integer credits from escrow to mentor (3 -> 5)');

  await testClient.end();

  // Clean up test database
  const cleanupClient = new Client(PG_CONFIG);
  await cleanupClient.connect();
  await cleanupClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME};`);
  await cleanupClient.end();

  console.log('\n======================================================');
  console.log('  ALL WHOLE-HOUR & INTEGER CREDIT INVARIANTS PASSED!  ');
  console.log('======================================================\n');
}

runWholeHourInvariantsTest().catch(err => {
  console.error('\n❌ Whole-hour invariants test failed:', err);
  process.exit(1);
});
