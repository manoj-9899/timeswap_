# TimeSwap — Phase 5B: Hosted Supabase Project Preparation Report

> **Status**: Completed (Read-Only Inspection & Verification)  
> **Target**: Newly Created Hosted Supabase Project  
> **Environment Check**: Reachable (HTTP 200 via HTTPS REST Gateway)  
> **Schema State on Hosted Project**: Clean / Unmigrated (0 domain tables present)  
> **Deliverable**: `timeswap-backend-phase5b-preparation.md`

---

## Executive Summary

A comprehensive read-only audit was conducted to prepare TimeSwap for connection to your newly created hosted Supabase project. 

The hosted project endpoint is reachable and responsive. The database currently contains zero TimeSwap domain tables, representing a clean state ready for initial schema deployment. 

A critical environment variable name mismatch was detected: `.env.local` currently defines `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, whereas the Next.js application codebase expects `NEXT_PUBLIC_SUPABASE_ANON_KEY`. All 7 version-controlled SQL migrations were verified for compatibility with hosted Supabase, including trigger safety on `auth.users`, `SECURITY DEFINER` search path protections, and role-based permissions.

---

## 1. Supabase Client Initialization & Environment Audit

### 1.1 Client Code Architecture
Three client initialization entrypoints exist in [`src/lib/supabase/`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/):

1. **Browser Client** ([`src/lib/supabase/client.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/client.ts)):
   - Uses `@supabase/ssr` `createBrowserClient<Database>`.
   - Inspects `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - If either variable is missing, returns `null` and logs a console warning, placing the client store in demo fallback mode.
2. **Server Client** ([`src/lib/supabase/server.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/server.ts)):
   - `createSupabaseServerClient()`: Uses Next.js `cookies()` with `createServerClient<Database>`. Expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `createSupabaseAdminClient()`: Server-only administrative client with `persistSession: false`. Expects `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. **Session Middleware** ([`src/lib/supabase/middleware.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/middleware.ts)):
   - Intercepts requests to refresh expired auth tokens via `supabase.auth.getUser()`.
   - Expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Gracefully passes through if unconfigured.

### 1.2 Environment Variable Verification (.env.local vs Codebase)
Environment variables in `.env.local` were audited safely (names only; secret values were neither exposed nor logged):

| Variable Name in `.env.local` | Expected by Next.js Codebase | Status | Impact / Action Required |
|:---|:---|:---:|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | **MATCH** | Configured correctly. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **MISMATCH** | **Action Required**: The codebase checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. In `.env.local`, define `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the same key value. |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | **MATCH** | Configured correctly. Available for server-side admin operations. |

> [!WARNING]
> Because `.env.local` defines `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` rather than `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `getSupabaseBrowserClient()` and `updateSession()` currently evaluate the anon key as `undefined` and fall back to offline simulation mode.

### 1.3 Git Security & Secret Protection
- **`.gitignore` Verification**: Line 11 of [`.gitignore`](file:///home/manoj/Developer/timeswap_/.gitignore) explicitly contains `.env.*` (with exception for `!.env.example`).
- **Git Tracking Check**: `git check-ignore -v .env.local` confirmed that `.env.local` is ignored.
- **Repository Index Check**: `git ls-files .env.local` confirmed that `.env.local` has never been staged or committed. No secrets are tracked in version control.

---

## 2. Hosted Project Current State Check

A non-mutating, read-only REST inspection of the hosted project was performed using the credentials in `.env.local`:

1. **Gateway Reachability**: The hosted project endpoint responded with `HTTP 200` at `/rest/v1/`.
2. **OpenAPI Schema Discovery**: The OpenAPI schema root reports no user-defined endpoints (`paths: ['/']`).
3. **Table Inspection (`public.profiles`)**: A targeted read-only query to `/rest/v1/profiles` returned:
   ```json
   {
     "code": "PGRST205",
     "message": "Could not find the table 'public.profiles' in the schema cache"
   }
   ```
4. **Conclusion**: The hosted Supabase project is **completely unmigrated**. No conflicting tables, functions, or triggers exist.

---

## 3. SQL Migrations Compatibility Analysis

All 7 migrations in [`supabase/migrations/`](file:///home/manoj/Developer/timeswap_/supabase/migrations/) were reviewed for hosted Supabase compatibility:

### 3.1 Migration Sequence & Responsibilities

| Order | Migration File | Key Responsibilities | Hosted Supabase Compatibility |
|:---:|:---|:---|:---:|
| **1** | `20261020000001_initial_schema.sql` | • Enables `uuid-ossp`, `pgcrypto`<br>• Creates 11 core tables (`profiles`, `credit_wallets`, `credit_ledger`, `sessions`, etc.)<br>• Table constraints & whole-credit checks | **100% Compatible**<br>Both extensions are standard in hosted Supabase. Tables reference `auth.users(id)` which exists by default. |
| **2** | `20261020000002_rls_policies.sql` | • Enables RLS on all 11 tables<br>• Row-level isolation policies using `auth.uid()`<br>• Denies direct client writes on `credit_wallets` and `credit_ledger` | **100% Compatible**<br>Standard PostgreSQL RLS syntax. References standard `auth.uid()` helper. |
| **3** | `20261020000003_auth_trigger_welcome_credits.sql` | • Defines `fn_handle_user_verification_and_welcome_grant()`<br>• Creates trigger `trg_user_verification_welcome_grant` on `auth.users` | **100% Compatible**<br>Runs as `SECURITY DEFINER` with explicit `search_path`. Trigger executes upon email confirmation. |
| **4** | `20261020000004_phase2_profiles_and_onboarding.sql` | • Public read access for completed profiles<br>• Onboarding persistence indexes and RLS updates | **100% Compatible**<br>Additive indexes and policy updates. |
| **5** | `20261020000005_phase3_session_booking_and_escrow.sql` | • Booking RPC `create_session_request`<br>• Bilateral completion `confirm_session_completion`<br>• 2-hour cancellation workflow & review routing | **100% Compatible**<br>Atomic PL/pgSQL functions with explicit concurrency locks (`FOR UPDATE`). |
| **6** | `20261020000006_phase4_realtime_messaging_notifications.sql` | • Messaging RPCs (`send_message`, `mark_conversation_read`)<br>• Adds tables to `supabase_realtime` publication<br>• Sets `REPLICA IDENTITY FULL` | **Compatible**<br>*(See Note on Realtime Publication)* |
| **7** | `20261020000007_phase5a_security_hardening.sql` | • `trg_protect_profile_reputation` trigger on `public.profiles`<br>• SEC-01: Expiry deadline & participant check<br>• SEC-02: Authoritative availability (drops 3-arg `cancel_session`)<br>• SEC-04: Revokes batch worker routines from `PUBLIC`/`authenticated`<br>• SEC-06: Automatic handle collision resolution loop | **100% Compatible**<br>Essential security hardening layer. Protects ledger and profile integrity. |

### 3.2 Specific Compatibility Findings

1. **Trigger on `auth.users`**:
   - `trg_user_verification_welcome_grant` attaches to `auth.users`.
   - In hosted Supabase, creating triggers on `auth.users` requires the `postgres` role (which is the default execution role in the Supabase Dashboard SQL Editor and Supabase CLI).
2. **`SECURITY DEFINER` Protections**:
   - All 14 custom functions across the migrations enforce strict `search_path` declarations:
     `SET search_path = public, auth, pg_temp` or `SET search_path = public, pg_temp`.
   - This passes Supabase Security Advisor linter checks and prevents search path injection attacks.
3. **Realtime Publication (`20261020000006`)**:
   - Lines 312–320 of migration 6 execute:
     ```sql
     DO $$
     BEGIN
         IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
             ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
             ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
             ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
         END IF;
     END
     $$;
     ```
   - In hosted Supabase, `supabase_realtime` publication exists by default. The `ALTER PUBLICATION ... ADD TABLE` commands will execute cleanly on initial migration.
4. **Worker Permission Revocation (`20261020000007`)**:
   - `flag_unresolved_sessions()` and `expire_pending_requests()` have their `EXECUTE` privileges revoked from `PUBLIC`, `authenticated`, and `anon`.
   - Privileges are granted exclusively to `service_role`. In hosted Supabase, background workers or edge functions calling these routines must use the service role key.

---

## 4. Required Supabase Dashboard Configuration

Before inviting users or initiating skill exchanges, the following configuration must be set in the hosted Supabase Dashboard:

### 4.1 Authentication Settings (`Authentication -> Providers -> Email`)
- **Enable Email Provider**: `ON`
- **Confirm Email**: **`ON` (MANDATORY)**
  > [!IMPORTANT]
  > TimeSwap's 3-credit welcome grant trigger executes only when `email_confirmed_at IS NOT NULL`. If "Confirm Email" is disabled in the dashboard, Supabase sets `email_confirmed_at` immediately upon signup, bypassing the intended email verification step.

### 4.2 URL Configuration (`Authentication -> URL Configuration`)
- **Site URL**: `http://localhost:3000` (for local development) or production custom domain.
- **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/onboarding`
  - `http://localhost:3000/auth/reset-password`
  - `http://localhost:3000/dashboard`

### 4.3 Database / Realtime Settings (`Database -> Publications`)
- Verify that `supabase_realtime` is active.
- After running Migration 6, verify that `public.messages`, `public.notifications`, and `public.conversation_members` appear in the `supabase_realtime` publication list.

---

## 5. Migration Execution Strategy & Order

The migrations must be executed sequentially from **1 through 7**.

### Recommended Application Methods:

#### Option A: Supabase Dashboard SQL Editor (Quickest & Zero Setup)
1. Open the Supabase Dashboard -> **SQL Editor**.
2. Run each migration file in order (1 through 7) or execute them sequentially in a single script:
   - `20261020000001_initial_schema.sql`
   - `20261020000002_rls_policies.sql`
   - `20261020000003_auth_trigger_welcome_credits.sql`
   - `20261020000004_phase2_profiles_and_onboarding.sql`
   - `20261020000005_phase3_session_booking_and_escrow.sql`
   - `20261020000006_phase4_realtime_messaging_notifications.sql`
   - `20261020000007_phase5a_security_hardening.sql`

#### Option B: Direct PostgreSQL Connection via Node Runner
If you have the database connection string (`postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` from **Project Settings -> Database**), a dedicated migration script can apply all 7 files atomically.

---

## 6. Risks & Safe Next Steps

### 6.1 Identified Risks & Mitigations

1. **Risk: Environment Variable Key Name Mismatch**
   - *Detail*: Codebase expects `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but `.env.local` provides `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - *Mitigation*: Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` with the same token value, or update [`src/lib/supabase/client.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/client.ts) to accept either variable name.

2. **Risk: Unconfirmed Email Bypass**
   - *Detail*: If "Confirm Email" is left disabled in the Supabase Dashboard, users could exploit instant signup to claim welcome credits repeatedly without validating an inbox.
   - *Mitigation*: Ensure "Confirm Email" is toggled ON in the dashboard.

3. **Risk: Partial Migration Execution**
   - *Detail*: Applying migrations out of order (e.g. applying Phase 3 before Phase 1) will fail due to missing foreign key tables (`profiles`, `credit_wallets`).
   - *Mitigation*: Strictly follow the 1–7 sequence.

---

## 7. Items that Could Not Be Verified Remotely

Without administrative database connection credentials (password / direct connection URI) or dashboard session access:
1. The exact PostgreSQL minor version and extension configuration in your hosted project (though Supabase standard defaults are well known).
2. The current authentication email template and SMTP provider settings in your Supabase dashboard.
3. Whether custom project rate limits or IP allowlists have been configured in Supabase.

---

## 8. Recommended Next Steps

1. **Update `.env.local`**:
   Add the following line to `.env.local` (using the same value as your publishable key):
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_or_anon_key_here
   ```
2. **Apply Migrations 1 through 7**:
   Paste and execute the migration files in order in your Supabase Dashboard SQL Editor.
3. **Configure Auth & Redirects**:
   Set Site URL and Redirect URLs in the Supabase Dashboard.
4. **Run Live End-to-End Verification**:
   Test real user signup, email verification, 3-credit grant delivery, and session booking against the hosted backend.
