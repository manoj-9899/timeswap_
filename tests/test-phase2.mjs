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
  console.log('   TimeSwap Phase 2 Authentication & Profile Tests   ');
  console.log('======================================================\n');
  
  // 1. Reset dedicated sandbox database
  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();
  
  console.log('[Setup] Initializing clean sandbox database timeswap_phase2_test...');
  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_phase2_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_phase2_test;');
  await adminClient.query('CREATE DATABASE timeswap_phase2_test;');
  await adminClient.end();

  // 2. Connect to timeswap_phase2_test
  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_phase2_test' });
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
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated_user') THEN
          CREATE ROLE authenticated_user NOLOGIN;
        END IF;
      END
      $$;

      GRANT USAGE ON SCHEMA public TO authenticated_user;
    `);

    // 4. Apply all 4 migrations in order
    const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationFiles = [
      '20261020000001_initial_schema.sql',
      '20261020000002_rls_policies.sql',
      '20261020000003_auth_trigger_welcome_credits.sql',
      '20261020000004_phase2_profiles_and_onboarding.sql',
    ];

    for (const file of migrationFiles) {
      console.log(`[Migrations] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await testClient.query(sql);
    }
    assert(true, 'All 4 SQL migrations applied cleanly without errors');

    // Grant access to application tables for the authenticated role
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

    // --------------------------------------------------------------------------
    // Test Group 1: Signup & Email Verification Flow
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 1] Signup & Email Verification Life Cycle...');

    const newUserId = 'f0000000-0000-0000-0000-000000000001';
    
    // 1.A: Signup unverified user
    await testClient.query(`
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
      VALUES (
        '${newUserId}', 
        'elena.smith@example.com', 
        crypt('initialpassword123', gen_salt('bf')),
        NULL, 
        '{"name": "Elena Smith", "handle": "elena_smith"}'::jsonb
      );
    `);

    const initialProfile = (await testClient.query(`SELECT * FROM public.profiles WHERE id = '${newUserId}';`)).rows[0];
    const initialWallet = (await testClient.query(`SELECT * FROM public.credit_wallets WHERE profile_id = '${newUserId}';`)).rows[0];
    const initialLedger = (await testClient.query(`SELECT count(*) FROM public.credit_ledger WHERE destination_wallet_id = '${newUserId}';`)).rows[0].count;

    assert(initialProfile !== undefined, 'Profile automatically provisioned upon signup');
    assert(initialProfile.onboarding_completed === false, 'New user profile defaults to onboarding_completed = false');
    assert(initialProfile.onboarding_step === 1, 'New user profile starts at onboarding_step = 1');
    assert(initialWallet.available_balance === 0, 'Unverified user starts with 0 available credits');
    assert(parseInt(initialLedger, 10) === 0, 'No ledger welcome grant entry exists for unverified user');

    // 1.B: Email verification event
    await testClient.query(`
      UPDATE auth.users SET email_confirmed_at = now() WHERE id = '${newUserId}';
    `);

    const verifiedWallet = (await testClient.query(`SELECT * FROM public.credit_wallets WHERE profile_id = '${newUserId}';`)).rows[0];
    const verifiedLedger = (await testClient.query(`
      SELECT entry_type, amount, idempotency_key 
      FROM public.credit_ledger 
      WHERE destination_wallet_id = '${newUserId}';
    `)).rows;

    assert(verifiedWallet.available_balance === 3, 'User awarded exactly 3 welcome credits upon email verification');
    assert(verifiedLedger.length === 1 && verifiedLedger[0].amount === 3, 'Auditable welcome_grant of 3 credits recorded in credit_ledger');
    assert(verifiedLedger[0].idempotency_key === `welcome_grant_${newUserId}`, 'Welcome grant idempotency key formatted correctly');

    // 1.C: Idempotency: Re-verifying email does NOT award extra credits
    await testClient.query(`
      UPDATE auth.users SET email_confirmed_at = now() WHERE id = '${newUserId}';
    `);
    const recheckedWallet = (await testClient.query(`SELECT * FROM public.credit_wallets WHERE profile_id = '${newUserId}';`)).rows[0];
    assert(recheckedWallet.available_balance === 3, 'Re-verification is idempotent; wallet remains at exactly 3 credits');

    // --------------------------------------------------------------------------
    // Test Group 2: Password Recovery
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 2] Password Recovery & Credential Update...');

    // Simulate password update through Supabase auth.users
    await testClient.query(`
      UPDATE auth.users 
      SET encrypted_password = crypt('newSecurePassword2026!', gen_salt('bf'))
      WHERE id = '${newUserId}';
    `);

    const passCheck = (await testClient.query(`
      SELECT (encrypted_password = crypt('newSecurePassword2026!', encrypted_password)) as match
      FROM auth.users WHERE id = '${newUserId}';
    `)).rows[0].match;

    assert(passCheck === true, 'Password successfully updated via encrypted hash verification');

    // --------------------------------------------------------------------------
    // Test Group 3: Onboarding State Persistence & Resumption
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 3] Onboarding State Persistence & Resumption...');

    // User is logged in as Elena
    await setAuthUser(newUserId);

    // 3.A: User updates Step 2 (Bio & Location) and advances to Step 3
    await testClient.query(`
      UPDATE public.profiles
      SET headline = 'Swiss Design & Typography Specialist',
          bio = 'Designing tokens and modular scales.',
          location = 'Zurich, Switzerland',
          onboarding_step = 3
      WHERE id = '${newUserId}';
    `);

    // 3.B: User logs out and returns later; check resumption state
    await resetAuth();
    const resumedProfile = (await testClient.query(`
      SELECT onboarding_step, onboarding_completed, headline, location 
      FROM public.profiles 
      WHERE id = '${newUserId}';
    `)).rows[0];

    assert(resumedProfile.onboarding_step === 3, 'Incomplete user can resume at saved onboarding_step = 3');
    assert(resumedProfile.onboarding_completed === false, 'User remains onboarding_completed = false while in wizard');
    assert(resumedProfile.location === 'Zurich, Switzerland', 'Intermediate draft inputs persisted correctly');

    // --------------------------------------------------------------------------
    // Test Group 4: Step 6 Onboarding Completion & Offerings Registration
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 4] Onboarding Completion & Offering Creation...');

    await setAuthUser(newUserId);

    // 4.A: Mentor registers custom skill in taxonomy
    const skillRes = await testClient.query(`
      INSERT INTO public.skills (name, category)
      VALUES ('Micro-interactions & Spring Physics', 'Design & Creative')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const customSkillId = skillRes.rows[0].id;
    assert(customSkillId !== undefined, 'Authenticated mentor can register custom skill in taxonomy');

    // 4.B: Mentor creates member_skills offering
    await testClient.query(`
      INSERT INTO public.member_skills (profile_id, skill_id, proficiency, description)
      VALUES ('${newUserId}', '${customSkillId}', 'Master', 'Hands-on springs, gestures, and physics tuning.');
    `);

    // 4.C: Mentor creates weekly availability slots
    await testClient.query(`
      INSERT INTO public.availability_slots (profile_id, day_of_week, start_time, end_time, timezone, preferred_cadence)
      VALUES 
        ('${newUserId}', 1, '18:00:00', '21:00:00', 'CET', 'Weekly 60m exchanges'),
        ('${newUserId}', 3, '18:00:00', '21:00:00', 'CET', 'Weekly 60m exchanges');
    `);

    // 4.D: Complete onboarding in profiles
    await testClient.query(`
      UPDATE public.profiles
      SET skills_learning = ARRAY['Conversational Japanese', 'Ceramics'],
          onboarding_completed = true,
          onboarding_step = 6
      WHERE id = '${newUserId}';
    `);

    await resetAuth();
    const finalProfile = (await testClient.query(`
      SELECT onboarding_completed, onboarding_step, skills_learning 
      FROM public.profiles 
      WHERE id = '${newUserId}';
    `)).rows[0];

    assert(finalProfile.onboarding_completed === true, 'Onboarding marked complete in database');
    assert(finalProfile.skills_learning.length === 2, 'Learning interests saved as array in profile');

    // --------------------------------------------------------------------------
    // Test Group 5: Discovery Access & Incomplete Profile Isolation
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 5] Discovery Visibility & Incomplete Profile Isolation...');

    // Create a second user who has NOT completed onboarding
    const incompleteUserId = 'f0000000-0000-0000-0000-000000000002';
    await testClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
      VALUES ('${incompleteUserId}', 'incomplete@example.com', now(), '{"name": "Incomplete User"}'::jsonb);
    `);

    // Public discovery query: Only users with onboarding_completed = true should appear
    const discoveryMembers = (await testClient.query(`
      SELECT p.id, p.name, p.onboarding_completed 
      FROM public.profiles p
      WHERE p.onboarding_completed = true;
    `)).rows;

    assert(discoveryMembers.some(m => m.id === newUserId), 'Completed mentor Elena appears in discovery results');
    assert(!discoveryMembers.some(m => m.id === incompleteUserId), 'Incomplete user is hidden from directory discovery');

    // --------------------------------------------------------------------------
    // Test Group 6: Profile Ownership & Security Isolation
    // --------------------------------------------------------------------------
    console.log('\n[Test Group 6] Profile Ownership & Security Boundaries...');

    // As incomplete user, attempt to maliciously modify Elena's profile
    await setAuthUser(incompleteUserId);

    const maliciousUpdateRes = await testClient.query(`
      UPDATE public.profiles SET headline = 'Defaced by Hacker' WHERE id = '${newUserId}';
    `);
    assert(maliciousUpdateRes.rowCount === 0, 'User cannot modify another user profile due to RLS');

    // Attempt to delete Elena's member_skills
    const maliciousSkillDelete = await testClient.query(`
      DELETE FROM public.member_skills WHERE profile_id = '${newUserId}';
    `);
    assert(maliciousSkillDelete.rowCount === 0, 'User cannot delete another user skill offering due to RLS');

    // Attempt to delete Elena's availability_slots
    const maliciousSlotDelete = await testClient.query(`
      DELETE FROM public.availability_slots WHERE profile_id = '${newUserId}';
    `);
    assert(maliciousSlotDelete.rowCount === 0, 'User cannot delete another user availability slot due to RLS');

    // Reset role
    await resetAuth();

    // --------------------------------------------------------------------------
    // Summary
    // --------------------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`   Phase 2 Test Suite Summary:`);
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
  console.error('Phase 2 test suite execution error:', err);
  process.exit(1);
});
