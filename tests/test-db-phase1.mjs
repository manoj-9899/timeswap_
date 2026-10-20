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
  console.log('   TimeSwap Phase 1 Database & Security Test Suite   ');
  console.log('======================================================\n');
  
  // 1. Reset dedicated sandbox database
  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();
  
  console.log('[Setup] Initializing clean sandbox database timeswap_test...');
  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_test;');
  await adminClient.query('CREATE DATABASE timeswap_test;');
  await adminClient.end();

  // 2. Connect to timeswap_test
  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_test' });
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
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated_user') THEN
          CREATE ROLE authenticated_user NOLOGIN;
        END IF;
      END
      $$;

      GRANT USAGE ON SCHEMA public TO authenticated_user;
    `);

    // 4. Apply migrations in order
    const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationFiles = [
      '20261020000001_initial_schema.sql',
      '20261020000002_rls_policies.sql',
      '20261020000003_auth_trigger_welcome_credits.sql',
    ];

    for (const file of migrationFiles) {
      console.log(`[Migrations] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await testClient.query(sql);
    }
    assert(true, 'All 3 SQL migrations applied cleanly without errors');

    // Grant access to application tables for the authenticated role
    await testClient.query(`
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated_user;
    `);

    // Helper to simulate PostgREST authenticated user context
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

    // --------------------------------------------------------------------------
    // Test Group 1: Whole-Number Durations & Credit Constraints
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 1] Session Duration & Whole-Number Credit Enforcement...');
    
    const userAId = 'a0000000-0000-0000-0000-000000000001';
    const userBId = 'b0000000-0000-0000-0000-000000000002';
    const userCId = 'c0000000-0000-0000-0000-000000000003';

    await testClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
      VALUES 
        ('${userAId}', 'alice@example.com', now(), '{"name": "Alice Mentor", "handle": "alice_mentor"}'::jsonb),
        ('${userBId}', 'bob@example.com', now(), '{"name": "Bob Learner", "handle": "bob_learner"}'::jsonb),
        ('${userCId}', 'carol@example.com', now(), '{"name": "Carol Stranger", "handle": "carol_stranger"}'::jsonb);
    `);

    // Verify trigger initialized Alice with 3 welcome credits
    const walletA = (await testClient.query(`SELECT available_balance, lifetime_earned FROM public.credit_wallets WHERE profile_id = '${userAId}';`)).rows[0];
    assert(walletA.available_balance === 3 && walletA.lifetime_earned === 3, 'Alice received exactly 3 welcome credits upon verification');

    // 1.A: Duration of 30 minutes MUST FAIL
    let threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.sessions (
          teacher_id, learner_id, skill_title, category, learning_goal,
          duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at
        ) VALUES (
          '${userAId}', '${userBId}', 'Web Design', 'Design & Creative', 'Master layout',
          30, 1, now() + interval '1 day', now() + interval '1 day 30 minutes'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Duration of 30 minutes is rejected by chk_sessions_allowed_durations');

    // 1.B: Duration of 90 minutes MUST FAIL
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.sessions (
          teacher_id, learner_id, skill_title, category, learning_goal,
          duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at
        ) VALUES (
          '${userAId}', '${userBId}', 'Web Design', 'Design & Creative', 'Master layout',
          90, 1, now() + interval '1 day', now() + interval '1 day 90 minutes'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Duration of 90 minutes is rejected by chk_sessions_allowed_durations');

    // 1.C: Mismatched credit cost (120m duration with cost 1) MUST FAIL
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.sessions (
          teacher_id, learner_id, skill_title, category, learning_goal,
          duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at
        ) VALUES (
          '${userAId}', '${userBId}', 'Web Design', 'Design & Creative', 'Master layout',
          120, 1, now() + interval '1 day', now() + interval '1 day 2 hours'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Mismatched credit cost (120m with cost 1) rejected by chk_sessions_credit_cost_match');

    // 1.D: Valid sessions: 60m=1cr, 120m=2cr, 180m=3cr MUST SUCCEED
    const validSessRes = await testClient.query(`
      INSERT INTO public.sessions (
        teacher_id, learner_id, skill_title, category, learning_goal,
        duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at
      ) VALUES 
        ('${userAId}', '${userBId}', 'Design Systems (60m)', 'Design & Creative', 'Tokens', 60, 1, now() + interval '1 day', now() + interval '1 day 1 hour'),
        ('${userAId}', '${userBId}', 'Typography Deep Dive (120m)', 'Design & Creative', 'Grids', 120, 2, now() + interval '2 days', now() + interval '2 days 2 hours'),
        ('${userAId}', '${userBId}', 'Brand Masterclass (180m)', 'Design & Creative', 'Identity', 180, 3, now() + interval '3 days', now() + interval '3 days 3 hours')
      RETURNING id, credit_cost;
    `);
    assert(validSessRes.rows.length === 3, 'Valid 60m (1cr), 120m (2cr), and 180m (3cr) sessions inserted successfully');

    const testSessionId = validSessRes.rows[0].id;

    // --------------------------------------------------------------------------
    // Test Group 2: Credit Ledger Accounting Integrity & Immutability
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 2] Credit Ledger Accounting Integrity & Immutability...');

    // 2.A: Verify welcome grant in credit_ledger
    const grantRows = (await testClient.query(`
      SELECT entry_type, amount, idempotency_key FROM public.credit_ledger WHERE destination_wallet_id = '${userAId}';
    `)).rows;
    assert(grantRows.length === 1 && grantRows[0].amount === 3, 'Auditable welcome_grant of 3 credits recorded in credit_ledger');

    // 2.B: Prohibit modification of ledger records (UPDATE)
    threw = false;
    try {
      await testClient.query(`
        UPDATE public.credit_ledger SET amount = 10 WHERE destination_wallet_id = '${userAId}';
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Direct UPDATE on credit_ledger is prevented by trg_credit_ledger_immutability');

    // 2.C: Prohibit deletion of ledger records (DELETE)
    threw = false;
    try {
      await testClient.query(`
        DELETE FROM public.credit_ledger WHERE destination_wallet_id = '${userAId}';
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Direct DELETE on credit_ledger is prevented by trg_credit_ledger_immutability');

    // 2.D: Prevent duplicate welcome grant for same user (Idempotency)
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.credit_ledger (
          entry_type, destination_wallet_id, amount, idempotency_key, notes
        ) VALUES (
          'welcome_grant', '${userAId}', 3, 'welcome_grant_${userAId}', 'Duplicate attempt'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Duplicate welcome grant prevented by unique constraint on idempotency_key');

    // 2.E: Prevent fractional credit in ledger
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.credit_ledger (
          entry_type, source_wallet_id, destination_wallet_id, session_id, amount, idempotency_key, notes
        ) VALUES (
          'escrow_hold', '${userBId}', NULL, '${testSessionId}', '0.5', 'hold_fractional', 'Fractional test'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Fractional credit amount (0.5) rejected by column constraints and INTEGER type');

    // 2.F: Prevent negative balance in wallet
    threw = false;
    try {
      await testClient.query(`
        UPDATE public.credit_wallets SET available_balance = -1 WHERE profile_id = '${userAId}';
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Negative wallet balance rejected by chk_wallets_available_non_negative');

    // --------------------------------------------------------------------------
    // Test Group 3: Email Verification Trigger Nuance
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 3] Unverified Account Email Trigger Behavior...');

    const unverifiedId = 'd0000000-0000-0000-0000-000000000004';
    await testClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
      VALUES ('${unverifiedId}', 'unverified@example.com', NULL, '{"name": "Dan Pending", "handle": "dan_pending"}'::jsonb);
    `);

    const unverifiedWallet = (await testClient.query(`
      SELECT available_balance FROM public.credit_wallets WHERE profile_id = '${unverifiedId}';
    `)).rows[0];
    const unverifiedLedger = (await testClient.query(`
      SELECT count(*) FROM public.credit_ledger WHERE destination_wallet_id = '${unverifiedId}';
    `)).rows[0].count;

    assert(unverifiedWallet.available_balance === 0, 'Unverified user starts with 0 credits');
    assert(parseInt(unverifiedLedger, 10) === 0, 'No welcome grant in ledger for unverified user');

    // Now verify the email
    await testClient.query(`
      UPDATE auth.users SET email_confirmed_at = now() WHERE id = '${unverifiedId}';
    `);

    const verifiedWallet = (await testClient.query(`
      SELECT available_balance FROM public.credit_wallets WHERE profile_id = '${unverifiedId}';
    `)).rows[0];
    const verifiedLedger = (await testClient.query(`
      SELECT count(*) FROM public.credit_ledger WHERE destination_wallet_id = '${unverifiedId}';
    `)).rows[0].count;

    assert(verifiedWallet.available_balance === 3, 'User awarded exactly 3 credits upon email verification update');
    assert(parseInt(verifiedLedger, 10) === 1, 'Welcome grant journal entry created upon verification update');

    // --------------------------------------------------------------------------
    // Test Group 4: Row Level Security (RLS) Isolation Tests
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 4] Row Level Security (RLS) Policy Verification...');

    // Seed a specific private notification for Alice
    await testClient.query(`
      INSERT INTO public.notifications (user_id, type, title, body, credit_impact)
      VALUES ('${userAId}', 'session_request', 'Alice Private Request', 'Alice secret alert', 1);
    `);

    // 4.A: As Carol, cannot see Alice's notifications
    await setAuthUser(userCId);
    const carolNotifs = (await testClient.query(`SELECT * FROM public.notifications;`)).rows;
    assert(carolNotifs.every(n => n.user_id === userCId), 'Carol can only read her own notifications (Alice records hidden)');

    // 4.B: As Alice, can see her own notification
    await setAuthUser(userAId);
    const aliceNotifs = (await testClient.query(`SELECT * FROM public.notifications;`)).rows;
    assert(
      aliceNotifs.length > 0 && aliceNotifs.every(n => n.user_id === userAId),
      'Alice can read all and only her own notifications'
    );

    // 4.C: As Carol, cannot see session between Alice and Bob
    await setAuthUser(userCId);
    const carolSessions = (await testClient.query(`SELECT * FROM public.sessions;`)).rows;
    assert(carolSessions.length === 0, 'Third-party user Carol cannot read sessions between Alice and Bob');

    // 4.D: As Alice, can see sessions where she is teacher
    await setAuthUser(userAId);
    const aliceSessions = (await testClient.query(`SELECT * FROM public.sessions;`)).rows;
    assert(aliceSessions.length === 3, 'Participant Alice can read her own sessions');

    // 4.E: As Alice, direct client wallet balance manipulation is DENIED
    const updateWalletRes = await testClient.query(`
      UPDATE public.credit_wallets SET available_balance = 999 WHERE profile_id = '${userAId}';
    `);
    assert(updateWalletRes.rowCount === 0, 'Direct client UPDATE on credit_wallets affects 0 rows due to RLS deny');

    // 4.F: As Alice, direct client insert into credit_ledger is DENIED
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.credit_ledger (
          entry_type, destination_wallet_id, amount, idempotency_key, notes
        ) VALUES (
          'welcome_grant', '${userAId}', 3, 'cheat_key', 'Cheat grant'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Direct client INSERT into credit_ledger is rejected with RLS violation');

    // 4.G: Messages isolation: Carol cannot read conversation between Alice and Bob
    await resetAuth();
    const convId = (await testClient.query(`
      INSERT INTO public.conversations DEFAULT VALUES RETURNING id;
    `)).rows[0].id;

    await testClient.query(`
      INSERT INTO public.conversation_members (conversation_id, profile_id)
      VALUES ('${convId}', '${userAId}'), ('${convId}', '${userBId}');
      INSERT INTO public.messages (conversation_id, sender_id, body)
      VALUES ('${convId}', '${userAId}', 'Secret message to Bob');
    `);

    await setAuthUser(userCId);
    const carolMsgs = (await testClient.query(`SELECT * FROM public.messages;`)).rows;
    assert(carolMsgs.length === 0, 'Non-member Carol cannot read messages in private conversation');

    // 4.H: Carol cannot insert into conversation between Alice and Bob
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.messages (conversation_id, sender_id, body)
        VALUES ('${convId}', '${userCId}', 'Intruder message');
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Non-member Carol cannot insert messages into private conversation');

    // 4.I: Saved members isolation: Carol cannot see Alice's saved members
    await resetAuth();
    await testClient.query(`
      INSERT INTO public.saved_members (user_id, saved_profile_id)
      VALUES ('${userAId}', '${userBId}');
    `);

    await setAuthUser(userCId);
    const carolSaved = (await testClient.query(`SELECT * FROM public.saved_members;`)).rows;
    assert(carolSaved.length === 0, 'Carol cannot see Alice saved mentors bookmarks');

    // Reset role back to superuser
    await resetAuth();

    // --------------------------------------------------------------------------
    // Test Group 5: Foreign Keys and Domain Checks
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 5] Foreign Key & Relational Domain Constraints...');

    // 5.A: Session with same teacher and learner MUST FAIL
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.sessions (
          teacher_id, learner_id, skill_title, category, learning_goal,
          duration_minutes, credit_cost, scheduled_start_at, scheduled_end_at
        ) VALUES (
          '${userAId}', '${userAId}', 'Self mentoring', 'Design & Creative', 'Goal',
          60, 1, now() + interval '1 day', now() + interval '1 day 1 hour'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Session with identical teacher and learner rejected by chk_sessions_distinct_participants');

    // 5.B: Review with author = recipient MUST FAIL
    threw = false;
    try {
      await testClient.query(`
        INSERT INTO public.reviews (
          session_id, author_id, recipient_id, rating, comment
        ) VALUES (
          '${testSessionId}', '${userAId}', '${userAId}', 5, 'Self praise review'
        );
      `);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Review with identical author and recipient rejected by chk_reviews_distinct_parties');

    // --------------------------------------------------------------------------
    // Summary
    // --------------------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`   Phase 1 Test Suite Summary:`);
    console.log(`   Total Assertions: ${passed + failed}`);
    console.log(`   Passed:           ${passed}`);
    console.log(`   Failed:           ${failed}`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await testClient.end();
  }
}

run().catch(err => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
