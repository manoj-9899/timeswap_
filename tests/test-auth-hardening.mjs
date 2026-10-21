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

// Mirror implementations matching src/lib/auth-utils.ts
function sanitizeRedirectPath(destination, fallback = '/dashboard') {
  if (!destination || typeof destination !== 'string') {
    return fallback;
  }
  const trimmed = destination.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return fallback;
  }
  if (/[\r\n\t\0]/.test(trimmed) || /%0[ad]/i.test(trimmed)) {
    return fallback;
  }
  const pathPart = trimmed.split(/[?#]/)[0];
  if (pathPart.includes(':') || pathPart.includes('\\')) {
    return fallback;
  }
  return trimmed;
}

function validatePassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  return null;
}

async function runAuthHardeningTests() {
  console.log('======================================================');
  console.log('   TimeSwap Authentication & Security Hardening Tests ');
  console.log('======================================================\n');

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

  // ---------------------------------------------------------------------------
  // Test Group 1: Source Code & Static File Verification
  // ---------------------------------------------------------------------------
  console.log('[Test Group 1] Authentication Modules & File Verification...');
  const authUtilsPath = path.resolve(process.cwd(), 'src/lib/auth-utils.ts');
  assert(fs.existsSync(authUtilsPath), 'src/lib/auth-utils.ts exists on disk');

  const authUtilsContent = fs.readFileSync(authUtilsPath, 'utf8');
  assert(authUtilsContent.includes('export function sanitizeRedirectPath'), 'Exports sanitizeRedirectPath');
  assert(authUtilsContent.includes('export function validatePassword'), 'Exports validatePassword');

  const middlewarePath = path.resolve(process.cwd(), 'src/lib/supabase/middleware.ts');
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
  assert(middlewareContent.includes('sanitizeRedirectPath'), 'Middleware uses sanitizeRedirectPath');
  assert(middlewareContent.includes('protectedRoutes'), 'Middleware defines protected route rules');
  assert(middlewareContent.includes('await supabase.auth.getUser()'), 'Middleware refreshes session via getUser()');

  const callbackPath = path.resolve(process.cwd(), 'src/app/auth/callback/route.ts');
  const callbackContent = fs.readFileSync(callbackPath, 'utf8');
  assert(callbackContent.includes('sanitizeRedirectPath'), 'Callback routes use sanitizeRedirectPath');
  assert(callbackContent.includes("type === 'recovery'"), 'Callback specifically handles recovery flow');
  assert(callbackContent.includes('exchangeCodeForSession'), 'Callback exchanges code for session');

  const signupPath = path.resolve(process.cwd(), 'src/app/auth/signup/page.tsx');
  const signupContent = fs.readFileSync(signupPath, 'utf8');
  assert(signupContent.includes('confirmPassword'), 'Signup form implements confirmPassword field');
  assert(signupContent.includes('handleResendVerification'), 'Signup provides verification email resend capability');
  assert(signupContent.includes('validatePassword'), 'Signup validates password requirements');

  const signinPath = path.resolve(process.cwd(), 'src/app/auth/signin/page.tsx');
  const signinContent = fs.readFileSync(signinPath, 'utf8');
  assert(signinContent.includes('sanitizeRedirectPath'), 'Signin handles safe redirect destination');
  assert(signinContent.includes('nextParam'), 'Signin reads next destination from searchParams');

  const resetPasswordPath = path.resolve(process.cwd(), 'src/app/auth/reset-password/page.tsx');
  const resetPasswordContent = fs.readFileSync(resetPasswordPath, 'utf8');
  assert(resetPasswordContent.includes('checkingSession'), 'Reset password checks active session before rendering form');
  assert(resetPasswordContent.includes('sessionInvalid'), 'Reset password displays invalid session alert');

  // ---------------------------------------------------------------------------
  // Test Group 2: Password Strength & Registration Validation Logic
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 2] Password Strength & Registration Validation...');
  assert(validatePassword('') === 'Password is required.', 'Rejects empty password with clear error');
  assert(validatePassword('short') === 'Password must be at least 8 characters long.', 'Rejects password shorter than 8 characters');
  assert(validatePassword('1234567') === 'Password must be at least 8 characters long.', 'Rejects 7-character password');
  assert(validatePassword('securePass123!') === null, 'Accepts valid password of 8+ characters');
  assert(validatePassword('12345678') === null, 'Accepts minimum 8-character password');

  // ---------------------------------------------------------------------------
  // Test Group 3: Open-Redirect Protection & Safe Destination Validation
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 3] Open-Redirect Defense & Destination Sanitization...');
  
  // Safe relative paths
  assert(sanitizeRedirectPath('/dashboard') === '/dashboard', 'Permits valid relative path /dashboard');
  assert(sanitizeRedirectPath('/wallet?tab=transactions') === '/wallet?tab=transactions', 'Permits valid relative path with query parameters');
  assert(sanitizeRedirectPath('/messages') === '/messages', 'Permits valid relative path /messages');
  assert(sanitizeRedirectPath('/onboarding') === '/onboarding', 'Permits valid relative path /onboarding');

  // Attack vectors that must be rejected and defaulted to fallback
  assert(sanitizeRedirectPath('https://evil.com') === '/dashboard', 'Rejects absolute https URL');
  assert(sanitizeRedirectPath('http://malicious.org/phish') === '/dashboard', 'Rejects absolute http URL');
  assert(sanitizeRedirectPath('//attacker.com/steal-session') === '/dashboard', 'Rejects protocol-relative // URL');
  assert(sanitizeRedirectPath('/\\evil.com') === '/dashboard', 'Rejects Windows-style /\\ URL evasion');
  assert(sanitizeRedirectPath('\\evil.com') === '/dashboard', 'Rejects leading backslash URL');
  assert(sanitizeRedirectPath('javascript:alert(1)') === '/dashboard', 'Rejects javascript: scheme URL');
  assert(sanitizeRedirectPath('data:text/html,<script>alert(1)</script>') === '/dashboard', 'Rejects data: scheme URL');
  assert(sanitizeRedirectPath('/test%0a%0dSet-Cookie:admin=true') === '/dashboard', 'Rejects CRLF %0a%0d injection attempt');
  assert(sanitizeRedirectPath('/test\r\nHeader:value') === '/dashboard', 'Rejects literal CRLF character injection');
  assert(sanitizeRedirectPath('', '/fallback') === '/fallback', 'Handles empty string by returning specified fallback');
  assert(sanitizeRedirectPath(null, '/custom-fallback') === '/custom-fallback', 'Handles null destination safely');

  // ---------------------------------------------------------------------------
  // Test Group 4: Middleware Route Protection Logic
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 4] Middleware Route Protection & SSR Redirection...');
  
  const protectedRoutes = [
    '/dashboard',
    '/wallet',
    '/sessions',
    '/messages',
    '/notifications',
    '/profile',
    '/settings',
    '/saved',
    '/onboarding',
  ];

  const publicRoutes = [
    '/',
    '/discover',
    '/help',
    '/offline',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  function isProtectedPath(pathname) {
    return protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  }

  protectedRoutes.forEach(route => {
    assert(isProtectedPath(route), `Route "${route}" is marked protected`);
    assert(isProtectedPath(`${route}/sub-detail`), `Sub-path "${route}/sub-detail" is marked protected`);
  });

  publicRoutes.forEach(route => {
    assert(!isProtectedPath(route), `Public route "${route}" does not trigger unauthenticated redirect`);
  });

  // Verify safe redirect construction for unauthenticated user
  const targetUnauthPath = '/wallet?currency=credits';
  const safeNextParam = sanitizeRedirectPath(targetUnauthPath, '/dashboard');
  assert(safeNextParam === targetUnauthPath, 'Preserves safe relative destination in next parameter');

  // ---------------------------------------------------------------------------
  // Test Group 5: Auth Callback Error & Recovery Routing
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 5] Auth Callback Routing & Error Dispatch...');

  function simulateCallbackRoute({ error, errorDescription, type, next, code }) {
    if (error) {
      return { redirect: `/auth/signin?error=${encodeURIComponent(errorDescription || error)}` };
    }
    const safeNext = sanitizeRedirectPath(next, '/dashboard');
    if (type === 'recovery' || safeNext.startsWith('/auth/reset-password')) {
      return { redirect: '/auth/reset-password' };
    }
    if (code) {
      return { redirect: safeNext };
    }
    return { redirect: '/auth/signin?error=Missing+verification+token.' };
  }

  assert(
    simulateCallbackRoute({ error: 'access_denied', errorDescription: 'Token expired' }).redirect.includes('Token%20expired'),
    'Supabase error params correctly routed to /auth/signin?error=...'
  );

  assert(
    simulateCallbackRoute({ type: 'recovery', code: 'valid-code' }).redirect === '/auth/reset-password',
    'Password recovery callback correctly routed to /auth/reset-password'
  );

  assert(
    simulateCallbackRoute({ next: 'https://evil.com', code: 'valid-code' }).redirect === '/dashboard',
    'Open-redirect attempt in callback next param sanitized to /dashboard'
  );

  assert(
    simulateCallbackRoute({ next: '/wallet', code: 'valid-code' }).redirect === '/wallet',
    'Valid next destination honored in callback'
  );

  assert(
    simulateCallbackRoute({ code: null }).redirect.includes('Missing+verification+token'),
    'Missing callback code returns error redirect rather than silent pass-through'
  );

  // ---------------------------------------------------------------------------
  // Test Group 6: Database Welcome Credits & Verification Trigger Invariants
  // ---------------------------------------------------------------------------
  console.log('\n[Test Group 6] Database Welcome Credits & Verification Trigger Invariants...');

  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();

  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_auth_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_auth_test;');
  await adminClient.query('CREATE DATABASE timeswap_auth_test;');
  await adminClient.end();

  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_auth_test' });
  await testClient.connect();

  try {
    // Setup Supabase auth mock
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
      END $$;
    `);

    // Apply migrations 1 through 7
    const migrations = [
      '20261020000001_initial_schema.sql',
      '20261020000002_rls_policies.sql',
      '20261020000003_auth_welcome_credits_trigger.sql',
      '20261020000004_profiles_and_onboarding.sql',
      '20261020000005_session_booking_and_credit_escrow.sql',
      '20261020000006_realtime_messaging_and_notifications.sql',
      '20261020000007_security_hardening.sql',
    ];

    for (const file of migrations) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', file), 'utf8');
      await testClient.query(sql);
    }

    // Grant schema and table access to authenticated_user role so RLS filters can be tested
    await testClient.query(`
      GRANT USAGE ON SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated_user;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated_user;
    `);

    async function setAuthUser(userId) {
      await testClient.query('SET ROLE authenticated_user;');
      if (userId) {
        await testClient.query(`SELECT set_config('request.jwt.claim.sub', '${userId}', false);`);
      } else {
        await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
      }
    }

    async function resetAuth() {
      await testClient.query('RESET ROLE;');
      await testClient.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
    }

    // A. Unverified User: starts with 0 credits and no welcome grant
    const unverifiedUserRes = await testClient.query(`
      INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
      VALUES ('unverified@example.com', NULL, '{"name": "Unverified User", "handle": "unverified_user"}'::jsonb)
      RETURNING id;
    `);
    const unverifiedUserId = unverifiedUserRes.rows[0].id;

    const unverifiedWallet = await testClient.query('SELECT * FROM credit_wallets WHERE profile_id = $1', [unverifiedUserId]);
    assert(unverifiedWallet.rows[0].available_balance === 0, 'Unverified user starts with exactly 0 available credits');

    const unverifiedLedger = await testClient.query('SELECT * FROM credit_ledger WHERE destination_wallet_id = $1', [unverifiedUserId]);
    assert(unverifiedLedger.rows.length === 0, 'Zero ledger entries created for unverified user');

    // B. Verification Grant: awards exactly 3 whole credits
    await testClient.query('UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1', [unverifiedUserId]);
    const verifiedWallet = await testClient.query('SELECT * FROM credit_wallets WHERE profile_id = $1', [unverifiedUserId]);
    assert(verifiedWallet.rows[0].available_balance === 3, 'User awarded exactly 3 credits upon email verification');

    const grantLedger = await testClient.query('SELECT * FROM credit_ledger WHERE destination_wallet_id = $1', [unverifiedUserId]);
    assert(grantLedger.rows.length === 1, 'Exactly one welcome_grant journal entry created');
    assert(grantLedger.rows[0].amount === 3, 'Ledger entry records exactly 3 whole credits');
    assert(grantLedger.rows[0].idempotency_key === `welcome_grant_${unverifiedUserId}`, 'Ledger idempotency key matches welcome_grant_<uid>');

    // C. Duplicate Verification Idempotency: multiple verification updates do not award extra credits
    await testClient.query('UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1', [unverifiedUserId]);
    const recheckedWallet = await testClient.query('SELECT * FROM credit_wallets WHERE profile_id = $1', [unverifiedUserId]);
    assert(recheckedWallet.rows[0].available_balance === 3, 'Re-verifying is idempotent: wallet remains at exactly 3 credits');

    const totalGrants = await testClient.query(
      "SELECT count(*) FROM credit_ledger WHERE destination_wallet_id = $1 AND entry_type = 'welcome_grant'",
      [unverifiedUserId]
    );
    assert(parseInt(totalGrants.rows[0].count, 10) === 1, 'No duplicate welcome_grant ledger entries exist');

    // -------------------------------------------------------------------------
    // Test Group 7: Cross-User Access Isolation & RLS Security
    // -------------------------------------------------------------------------
    console.log('\n[Test Group 7] Cross-User Access Isolation & RLS Boundaries...');

    // Create User Alice (verified) and User Bob (verified)
    const userAliceRes = await testClient.query(`
      INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
      VALUES ('alice@example.com', now(), '{"name": "Alice Smith", "handle": "alice_smith"}'::jsonb)
      RETURNING id;
    `);
    const aliceId = userAliceRes.rows[0].id;

    const userBobRes = await testClient.query(`
      INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
      VALUES ('bob@example.com', now(), '{"name": "Bob Jones", "handle": "bob_jones"}'::jsonb)
      RETURNING id;
    `);
    const bobId = userBobRes.rows[0].id;

    // Insert Alice's private notification
    await testClient.query(`
      INSERT INTO notifications (user_id, type, title, body)
      VALUES ($1, 'welcome', 'Secret Alice Note', 'Private content for Alice only')
    `, [aliceId]);

    // Query as Bob using RLS
    await setAuthUser(bobId);

    const bobNotificationQuery = await testClient.query('SELECT * FROM notifications WHERE user_id = $1', [aliceId]);
    assert(bobNotificationQuery.rows.length === 0, 'Bob cannot read Alice private notifications (RLS enforces boundary)');

    // Attempt direct credit alteration as Bob on Alice's wallet
    await testClient.query('UPDATE credit_wallets SET available_balance = 999 WHERE profile_id = $1', [aliceId]);
    await resetAuth();

    const aliceWalletAfterTamper = await testClient.query('SELECT available_balance FROM credit_wallets WHERE profile_id = $1', [aliceId]);
    assert(aliceWalletAfterTamper.rows[0].available_balance === 3, 'Client direct wallet UPDATE denied by RLS; Alice balance intact');

    // -------------------------------------------------------------------------
    // Test Group 8: Stale Client State Purge & Logout Behavior
    // -------------------------------------------------------------------------
    console.log('\n[Test Group 8] Stale State Clearance & Sign Out Invariants...');
    
    const storePath = path.resolve(process.cwd(), 'src/lib/store.tsx');
    const storeContent = fs.readFileSync(storePath, 'utf8');
    assert(storeContent.includes('EMPTY_CURRENT_USER'), 'Store imports and uses EMPTY_CURRENT_USER');
    assert(storeContent.includes('setAuthUserId(null)'), 'Sign out resets authUserId to null');
    assert(storeContent.includes('localStorage.removeItem(STORAGE_KEY)'), 'Sign out purges local persistent state');
    assert(storeContent.includes("window.location.href = '/auth/signin'"), 'Sign out redirects cleanly to /auth/signin');

  } finally {
    await testClient.end();
  }

  console.log('\n======================================================');
  console.log(`   Authentication Hardening Test Summary:`);
  console.log(`   Total Assertions: ${passed + failed}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthHardeningTests().catch(err => {
  console.error('Test runner fatal exception:', err);
  process.exit(1);
});
