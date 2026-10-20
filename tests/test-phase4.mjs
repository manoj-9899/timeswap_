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
  console.log('   TimeSwap Phase 4 Real-Time Messaging & Alerts     ');
  console.log('======================================================\n');

  // 1. Reset dedicated sandbox database
  const adminClient = new Client(PG_CONFIG);
  await adminClient.connect();

  console.log('[Setup] Initializing clean sandbox database timeswap_phase4_test...');
  await adminClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'timeswap_phase4_test' AND pid <> pg_backend_pid();
  `);
  await adminClient.query('DROP DATABASE IF EXISTS timeswap_phase4_test;');
  await adminClient.query('CREATE DATABASE timeswap_phase4_test;');
  await adminClient.end();

  // 2. Connect to sandbox
  const testClient = new Client({ ...PG_CONFIG, database: 'timeswap_phase4_test' });
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

      -- Create supabase_realtime publication to test publication wiring
      CREATE PUBLICATION supabase_realtime;
    `);

    // Apply all migrations 1 through 6
    const migrations = [
      'supabase/migrations/20261020000001_initial_schema.sql',
      'supabase/migrations/20261020000002_rls_policies.sql',
      'supabase/migrations/20261020000003_auth_welcome_credits_trigger.sql',
      'supabase/migrations/20261020000004_profiles_and_onboarding.sql',
      'supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql',
      'supabase/migrations/20261020000006_realtime_messaging_and_notifications.sql',
    ];

    for (const mig of migrations) {
      console.log(`[Migrations] Applying ${path.basename(mig)}...`);
      const sql = fs.readFileSync(mig, 'utf8');
      await testClient.query(sql);
    }
    assert(true, 'All 6 SQL migrations applied cleanly without errors');

    // Grant privileges AFTER all tables and routines are created
    await testClient.query(`
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, authenticated_user;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, authenticated_user;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, authenticated_user;
    `);

    // Helper functions for PostgREST simulation
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

    // Setup Test Users: Alice, Bob, Carol
    const userAlice = (await testClient.query(`
      INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
      VALUES ('alice@example.com', now(), '{"name":"Alice Walker","handle":"alicew"}'::jsonb)
      RETURNING id;
    `)).rows[0].id;

    const userBob = (await testClient.query(`
      INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
      VALUES ('bob@example.com', now(), '{"name":"Bob Miller","handle":"bobm"}'::jsonb)
      RETURNING id;
    `)).rows[0].id;

    const userCarol = (await testClient.query(`
      INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
      VALUES ('carol@example.com', now(), '{"name":"Carol Davis","handle":"carold"}'::jsonb)
      RETURNING id;
    `)).rows[0].id;

    // Verify profiles exist
    const profiles = (await testClient.query(`SELECT id, name FROM public.profiles;`)).rows;
    assert(profiles.length === 3, 'All 3 test user profiles provisioned');

    // =========================================================================
    // Test Group 1: 1-on-1 Conversation Creation & Idempotency
    // =========================================================================
    console.log('\n[Test Group 1] 1-on-1 Conversation Creation & Idempotency...');

    await setAuthUser(userAlice);
    const convRes = await testClient.query(`SELECT public.get_or_create_conversation($1) AS conv_id;`, [userBob]);
    const convId = convRes.rows[0].conv_id;
    await resetAuth();

    assert(Boolean(convId), 'Alice successfully initiated conversation container with Bob');

    // Verify membership rows
    const membersRes = await testClient.query(`
      SELECT profile_id FROM public.conversation_members WHERE conversation_id = $1 ORDER BY profile_id;
    `, [convId]);
    assert(membersRes.rows.length === 2, 'Exactly 2 conversation participants registered');

    // Bob calls get_or_create_conversation with Alice -> returns identical convId
    await setAuthUser(userBob);
    const bobConvRes = await testClient.query(`SELECT public.get_or_create_conversation($1) AS conv_id;`, [userAlice]);
    const bobConvId = bobConvRes.rows[0].conv_id;
    await resetAuth();

    assert(bobConvId === convId, 'get_or_create_conversation is reciprocal and idempotent');

    // Calling with oneself must be rejected
    let selfError = null;
    try {
      await setAuthUser(userAlice);
      await testClient.query(`SELECT public.get_or_create_conversation($1);`, [userAlice]);
    } catch (err) {
      selfError = err.message;
    } finally {
      await resetAuth();
    }
    assert(selfError && selfError.includes('Cannot create conversation with yourself'), 'Creating conversation with oneself rejected');

    // =========================================================================
    // Test Group 2: Message Sending, Persistence & Notifications
    // =========================================================================
    console.log('\n[Test Group 2] Message Sending, Persistence & Notifications...');

    await setAuthUser(userAlice);
    const msgRes1 = await testClient.query(`
      SELECT public.send_message($1, $2, false, NULL, $3) AS msg;
    `, [convId, 'Hi Bob, excited to swap skills with you!', 'cli_msg_001']);
    const msg1 = msgRes1.rows[0].msg;
    await resetAuth();

    assert(msg1.body === 'Hi Bob, excited to swap skills with you!', 'Message body persisted accurately');
    assert(msg1.sender_id === userAlice, 'Message sender derived from authenticated caller');
    assert(msg1.client_message_id === 'cli_msg_001', 'client_message_id recorded for deduplication');

    // Verify conversation updated_at was bumped
    const convUpdated = await testClient.query(`SELECT updated_at FROM public.conversations WHERE id = $1;`, [convId]);
    assert(Boolean(convUpdated.rows[0].updated_at), 'Conversation updated_at updated');

    // Verify Bob received an in-app notification
    const bobNotifs = await testClient.query(`
      SELECT id, user_id, type, title, body, action_url, is_read, idempotency_key
      FROM public.notifications
      WHERE user_id = $1 AND type = 'message';
    `, [userBob]);

    assert(bobNotifs.rows.length === 1, 'In-app notification created for recipient Bob');
    assert(bobNotifs.rows[0].type === 'message', 'Notification type is message');
    assert(bobNotifs.rows[0].action_url === `/messages?id=${convId}`, 'Notification points to conversation route');
    assert(bobNotifs.rows[0].is_read === false, 'Notification initially unread');

    // =========================================================================
    // Test Group 3: Message Deduplication via client_message_id
    // =========================================================================
    console.log('\n[Test Group 3] Message Deduplication via client_message_id...');

    await setAuthUser(userAlice);
    const retryRes = await testClient.query(`
      SELECT public.send_message($1, $2, false, NULL, $3) AS msg;
    `, [convId, 'Hi Bob, excited to swap skills with you!', 'cli_msg_001']);
    const retryMsg = retryRes.rows[0].msg;
    await resetAuth();

    assert(retryMsg.id === msg1.id, 'Idempotent retry returned the existing message without failure');

    const totalMsgs = await testClient.query(`SELECT count(*)::int AS cnt FROM public.messages WHERE conversation_id = $1;`, [convId]);
    assert(totalMsgs.rows[0].cnt === 1, 'Duplicate message prevented; table contains exactly 1 row');

    // Direct insert with duplicate client_message_id rejected by DB constraint
    let directDupError = null;
    try {
      await setAuthUser(userAlice);
      await testClient.query(`
        INSERT INTO public.messages (conversation_id, sender_id, body, client_message_id)
        VALUES ($1, $2, 'Duplicate test', 'cli_msg_001');
      `, [convId, userAlice]);
    } catch (err) {
      directDupError = err.message;
    } finally {
      await resetAuth();
    }
    assert(directDupError && directDupError.includes('client_message_id'), 'Database unique constraint prevents duplicate client_message_id');

    // =========================================================================
    // Test Group 4: RLS Authorization & Privacy Isolation
    // =========================================================================
    console.log('\n[Test Group 4] RLS Authorization & Privacy Isolation...');

    // Non-member Carol cannot view messages between Alice and Bob
    await setAuthUser(userCarol);
    const carolMessages = (await testClient.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [convId])).rows;
    await resetAuth();

    assert(carolMessages.length === 0, 'Third-party user Carol cannot view private messages between Alice & Bob (RLS enforced)');

    // Non-member Carol cannot send message to Alice-Bob conversation
    let carolSendError = null;
    try {
      await setAuthUser(userCarol);
      await testClient.query(`
        SELECT public.send_message($1, 'Intrusion message', false, NULL, 'carol_msg_1');
      `, [convId]);
    } catch (err) {
      carolSendError = err.message;
    } finally {
      await resetAuth();
    }
    assert(carolSendError && carolSendError.includes('Unauthorized'), 'Non-participant cannot send message to conversation via RPC');

    // Direct insert by Carol blocked by RLS
    let carolDirectError = null;
    try {
      await setAuthUser(userCarol);
      await testClient.query(`
        INSERT INTO public.messages (conversation_id, sender_id, body)
        VALUES ($1, $2, 'Direct intrusion');
      `, [convId, userCarol]);
    } catch (err) {
      carolDirectError = err.message;
    } finally {
      await resetAuth();
    }
    assert(carolDirectError !== null, 'Non-participant direct INSERT blocked by RLS');

    // Sender spoofing blocked: Bob cannot insert a message with sender_id = Alice
    let spoofError = null;
    try {
      await setAuthUser(userBob);
      await testClient.query(`
        INSERT INTO public.messages (conversation_id, sender_id, body)
        VALUES ($1, $2, 'Spoofed message');
      `, [convId, userAlice]);
    } catch (err) {
      spoofError = err.message;
    } finally {
      await resetAuth();
    }
    assert(spoofError !== null, 'Sender spoofing rejected by RLS (auth.uid() = sender_id check)');

    // =========================================================================
    // Test Group 5: Read Receipts & Dynamic Unread Counts
    // =========================================================================
    console.log('\n[Test Group 5] Read Receipts & Dynamic Unread Counts...');

    // Send 2 more messages from Alice
    await setAuthUser(userAlice);
    await testClient.query(`SELECT public.send_message($1, 'Second message', false, NULL, 'cli_msg_002');`, [convId]);
    await testClient.query(`SELECT public.send_message($1, 'Third message', false, NULL, 'cli_msg_003');`, [convId]);
    await resetAuth();

    // Check Bob's unread count
    await setAuthUser(userBob);
    const bobUnreadRes = await testClient.query(`SELECT public.get_conversation_unread_count($1) AS unread;`, [convId]);
    const bobUnread = bobUnreadRes.rows[0].unread;
    await resetAuth();
    assert(bobUnread === 3, 'Bob has exactly 3 unread messages');

    // Alice's unread count should be 0 (she sent the messages)
    await setAuthUser(userAlice);
    const aliceUnreadRes = await testClient.query(`SELECT public.get_conversation_unread_count($1) AS unread;`, [convId]);
    const aliceUnread = aliceUnreadRes.rows[0].unread;
    await resetAuth();
    assert(aliceUnread === 0, 'Alice unread count is 0 for her own sent messages');

    // Bob marks conversation as read
    await setAuthUser(userBob);
    await testClient.query(`SELECT public.mark_conversation_read($1);`, [convId]);
    const bobUnreadAfter = (await testClient.query(`SELECT public.get_conversation_unread_count($1) AS unread;`, [convId])).rows[0].unread;
    await resetAuth();
    assert(bobUnreadAfter === 0, 'Bob unread count drops to 0 after mark_conversation_read');

    // Verify Bob's notifications for this conversation were automatically marked read
    await setAuthUser(userBob);
    const unreadBobNotifs = (await testClient.query(`
      SELECT count(*)::int AS cnt FROM public.notifications WHERE user_id = $1 AND is_read = false;
    `, [userBob])).rows[0].cnt;
    await resetAuth();
    assert(unreadBobNotifs === 1, 'Only non-conversation notification (welcome) remains unread; message notif marked read');

    // =========================================================================
    // Test Group 6: Notification Center & Read State Operations
    // =========================================================================
    console.log('\n[Test Group 6] Notification Center & Read State Operations...');

    // Create 2 notifications for Carol directly (e.g. session request, completion)
    const notif1 = (await testClient.query(`
      INSERT INTO public.notifications (user_id, type, title, body, action_url, idempotency_key)
      VALUES ($1, 'session_request', 'New Session Request', 'Bob requested a skill exchange', '/sessions', 'carol_notif_1')
      RETURNING id;
    `, [userCarol])).rows[0].id;

    const notif2 = (await testClient.query(`
      INSERT INTO public.notifications (user_id, type, title, body, action_url, idempotency_key)
      VALUES ($1, 'credit_transfer', 'Credits Received', 'You received 1 credit', '/wallet', 'carol_notif_2')
      RETURNING id;
    `, [userCarol])).rows[0].id;

    // Idempotent duplicate insert prevented
    const dupNotif = await testClient.query(`
      INSERT INTO public.notifications (user_id, type, title, body, action_url, idempotency_key)
      VALUES ($1, 'session_request', 'Duplicate Request', 'Duplicate', '/sessions', 'carol_notif_1')
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id;
    `, [userCarol]);
    assert(dupNotif.rows.length === 0, 'Duplicate notification prevented by idempotency_key constraint');

    // Carol marks single notification as read
    await setAuthUser(userCarol);
    await testClient.query(`SELECT public.mark_notification_read($1);`, [notif1]);
    await resetAuth();

    const notif1Status = await testClient.query(`SELECT is_read FROM public.notifications WHERE id = $1;`, [notif1]);
    assert(notif1Status.rows[0].is_read === true, 'Single notification successfully marked as read');

    // Alice cannot mark Carol's notification as read
    await setAuthUser(userAlice);
    await testClient.query(`SELECT public.mark_notification_read($1);`, [notif2]);
    await resetAuth();

    const notif2Status = await testClient.query(`SELECT is_read FROM public.notifications WHERE id = $1;`, [notif2]);
    assert(notif2Status.rows[0].is_read === false, 'Unauthorized user cannot mark peer notification as read');

    // Carol marks all notifications read
    await setAuthUser(userCarol);
    const markedCount = (await testClient.query(`SELECT public.mark_all_notifications_read() AS count;`)).rows[0].count;
    await resetAuth();
    assert(markedCount >= 1, 'mark_all_notifications_read returns accurate count of updated notifications');

    const carolRemainingUnread = (await testClient.query(`
      SELECT count(*)::int AS cnt FROM public.notifications WHERE user_id = $1 AND is_read = false;
    `, [userCarol])).rows[0].cnt;
    assert(carolRemainingUnread === 0, 'All notifications for user marked read');

    // =========================================================================
    // Test Group 7: Offline Message Delivery Simulation
    // =========================================================================
    console.log('\n[Test Group 7] Offline Message Delivery Simulation...');

    // User A sends message with proposal details while User B is offline
    await setAuthUser(userAlice);
    const proposalRes = await testClient.query(`
      SELECT public.send_message(
        $1,
        'Here is a proposal for our 2-hour Figma workshop',
        true,
        '{"skill":"UI/UX Systems","duration":"120 min","creditCost":2}'::jsonb,
        'cli_prop_001'
      ) AS msg;
    `, [convId]);
    const proposalMsg = proposalRes.rows[0].msg;
    await resetAuth();

    assert(proposalMsg.is_proposal === true, 'Proposal message flag recorded');
    assert(proposalMsg.proposal_details.creditCost === 2, 'Proposal structured details preserved');

    // Bob reconnects (simulated by querying messages ordered by created_at)
    await setAuthUser(userBob);
    const bobsFeed = (await testClient.query(`
      SELECT id, body, is_proposal, proposal_details, client_message_id, created_at
      FROM public.messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC;
    `, [convId])).rows;
    await resetAuth();

    assert(bobsFeed.length === 4, 'Offline participant receives full chronological history upon reconnect');
    assert(bobsFeed[3].is_proposal === true, 'Last message in feed is the structured proposal');

    // =========================================================================
    // Test Group 8: Supabase Realtime Publication & Replica Identity
    // =========================================================================
    console.log('\n[Test Group 8] Supabase Realtime Publication & Replica Identity...');

    // Verify messages, notifications, conversation_members in publication
    const pubTables = await testClient.query(`
      SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
    `);
    const publishedTableNames = pubTables.rows.map(r => r.tablename);

    assert(publishedTableNames.includes('messages'), 'messages table published to supabase_realtime');
    assert(publishedTableNames.includes('notifications'), 'notifications table published to supabase_realtime');
    assert(publishedTableNames.includes('conversation_members'), 'conversation_members published to supabase_realtime');

    // Verify replica identity FULL
    const replIdentRes = await testClient.query(`
      SELECT relname, relreplident FROM pg_class
      WHERE relname IN ('messages', 'notifications', 'conversation_members')
        AND relnamespace = 'public'::regnamespace;
    `);

    for (const row of replIdentRes.rows) {
      assert(row.relreplident === 'f', `Table ${row.relname} configured with REPLICA IDENTITY FULL ('f')`);
    }

    console.log('\n======================================================');
    console.log('   Phase 4 Test Suite Summary:');
    console.log(`   Total Assertions: ${passed + failed}`);
    console.log(`   Passed:           ${passed}`);
    console.log(`   Failed:           ${failed}`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running Phase 4 tests:', err);
    process.exit(1);
  } finally {
    await testClient.end();
  }
}

run();
