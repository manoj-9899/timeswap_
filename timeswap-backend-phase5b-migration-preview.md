# TimeSwap Phase 5B — Supabase Migration Preview (No Changes)

> **Execution Mode**: Preview & Read-Only Audit (Zero Database Mutations)  
> **Git Repository**: [`https://github.com/manoj-9899/timeswap_`](https://github.com/manoj-9899/timeswap_)  
> **Hosted Supabase Project Reference**: `mkbouvsozmzimheysuaz`  
> **Hosted Project Endpoint**: `https://mkbouvsozmzimheysuaz.supabase.co`  
> **Remote Gateway Health**: Responsive (`HTTP 200` via HTTPS REST Gateway)  
> **Hosted Schema State**: Completely Unmigrated (0 domain tables present)  
> **Local Migrations**: 7 files ready in execution sequence (including Phase 5A Hardening)

---

## Executive Summary

This preview verifies the migration readiness of the TimeSwap PostgreSQL backend for deployment to the hosted Supabase project (`mkbouvsozmzimheysuaz`). In strict compliance with instructions, **no migrations were applied, no database objects were modified or dropped, and no credentials or secret values were exposed.**

All 7 SQL migrations in [`supabase/migrations/`](file:///home/manoj/Developer/timeswap_/supabase/migrations/) were inspected. Phase 5A security hardening is confirmed present and positioned as the final migration. Remote inspection confirmed that the hosted Supabase database is completely unmigrated and clean. 

Before running migrations, one configuration mismatch requires attention: `.env.local` defines `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, whereas the Next.js application codebase expects `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 1. Migration Inventory & Execution Sequence

All 7 SQL migrations are located in [`supabase/migrations/`](file:///home/manoj/Developer/timeswap_/supabase/migrations/) and must be applied in the following chronological sequence:

| Step | Migration File | Size | Phase | Core Contents |
|:---:|:---|:---:|:---:|:---|
| **1** | [`20261020000001_initial_schema.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000001_initial_schema.sql) | 18,862 B | Phase 1 | Enables `uuid-ossp` & `pgcrypto`; creates 11 core tables (`profiles`, `skills`, `member_skills`, `availability_slots`, `sessions`, `credit_wallets`, `credit_ledger`, `reviews`, `notifications`, `conversations`, `messages`); sets whole-number credit constraints. |
| **2** | [`20261020000002_rls_policies.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000002_rls_policies.sql) | 12,583 B | Phase 1 | Enables Row Level Security (RLS) across all 11 tables; establishes `auth.uid()` participant isolation; enforces immutable ledger write-denial. |
| **3** | [`20261020000003_auth_trigger_welcome_credits.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000003_auth_trigger_welcome_credits.sql) | 4,879 B | Phase 1 | Implements `fn_handle_user_verification_and_welcome_grant()` and trigger `trg_user_verification_welcome_grant` on `auth.users` awarding exactly 3 welcome credits upon email verification. |
| **4** | [`20261020000004_phase2_profiles_and_onboarding.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000004_phase2_profiles_and_onboarding.sql) | 2,728 B | Phase 2 | Establishes public discovery RLS for completed profiles; adds onboarding step persistence and indexing. |
| **5** | [`20261020000005_phase3_session_booking_and_escrow.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_phase3_session_booking_and_escrow.sql) | 34,480 B | Phase 3 | Stored procedures: `create_session_request`, `accept_session_request`, `decline_session_request`, `cancel_session`, `confirm_session_completion`, `flag_unresolved_sessions`, `expire_pending_requests`. |
| **6** | [`20261020000006_phase4_realtime_messaging_notifications.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000006_phase4_realtime_messaging_notifications.sql) | 11,445 B | Phase 4 | Realtime messaging RPCs (`send_message`, `get_or_create_conversation`, `mark_conversation_read`); configures `supabase_realtime` publication; sets `REPLICA IDENTITY FULL`. |
| **7** | [`20261020000007_phase5a_security_hardening.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_phase5a_security_hardening.sql) | 29,253 B | Phase 5A | **Security Hardening**: `trg_protect_profile_reputation` on `public.profiles`; SEC-01 caller & deadline check; SEC-02 drop of 3-arg `cancel_session` & authoritative availability check; SEC-04 worker routine revocation from `PUBLIC`/`authenticated`; SEC-06 handle collision recovery loop. |

### Verification of Phase 5A Security Hardening
- **Migration 7 is verified present and properly ordered** at [`supabase/migrations/20261020000007_phase5a_security_hardening.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_phase5a_security_hardening.sql).
- It executes after Phase 3 and Phase 4, dropping the unhardened procedures and replacing them with hardened implementations while revoking batch worker privileges from `PUBLIC`, `authenticated`, and `anon`.

---

## 2. Supabase CLI Availability & Version

A non-intrusive environment check was conducted for the Supabase CLI:

- **System Binary (`which supabase`)**: Not installed in `$PATH`.
- **Project Local (`node_modules`)**: Not listed in `package.json` dependencies.
- **NPX Resolution (`npx supabase --version`)**: Resolves to package **`supabase@2.121.0`**.

> [!NOTE]
> The Supabase CLI can be executed without permanent installation using `npx -y supabase <command>`, or installed as a development dependency via `npm install -D supabase`. Alternatively, all migrations can be applied directly using the Supabase Dashboard SQL Editor without needing the CLI.

---

## 3. Project Link & Reference Verification

- **Configured Project URL**: `https://mkbouvsozmzimheysuaz.supabase.co`
- **Extracted Project Reference**: **`mkbouvsozmzimheysuaz`**
- **Link Status**: The local workspace is currently **unlinked** via the Supabase CLI (`.supabase/` config directory does not exist locally).
- **Remote Gateway Verification**: An authenticated, read-only GET request to `https://mkbouvsozmzimheysuaz.supabase.co/rest/v1/` returned `HTTP 200`, confirming the project reference and service keys are valid and active.

---

## 4. Local vs. Hosted Migration History Comparison

A safe, read-only comparison was performed between the local migration directory and the hosted database:

| Metric | Local Environment | Hosted Supabase Project (`mkbouvsozmzimheysuaz`) |
|:---|:---:|:---:|
| **Migration Files Present** | 7 files | 0 applied |
| **`supabase_migrations.schema_migrations`** | N/A (Local files) | Not yet created (`HTTP 404 / PGRST205`) |
| **Domain Tables (`profiles`, `sessions`, etc.)** | 11 tables (in local tests) | 0 tables (`HTTP 404 / PGRST205`) |
| **OpenAPI Schema Paths** | 11 table routes + 8 RPC routes | Only root path (`['/']`) |
| **Pending Migrations to Apply** | — | **7 migrations pending** (Sequential 1–7) |

**Conclusion**: The hosted database is in a clean, pristine state. There are no preexisting tables or partial migrations to conflict with the migration plan.

---

## 5. Preview Commands & Migration Strategy

Below are the exact commands to link the project and preview pending migrations safely without modifying database state.

### Option A: Using Supabase CLI (Preview Only)

#### 1. Link Local Workspace to Hosted Project (Read-Only Link)
```bash
npx -y supabase link --project-ref mkbouvsozmzimheysuaz
```
*Purpose*: Associates the local repository with your remote Supabase project.  
*Requirements*: Will prompt for your Supabase Access Token (or uses `SUPABASE_ACCESS_TOKEN` env var) and database password.

#### 2. Inspect Migration Status (Read-Only Preview)
```bash
npx -y supabase migration list
```
*Purpose*: Displays a side-by-side table comparing local migrations against remote applied migrations (`LOCAL` vs `REMOTE`).  
*Expected Output*: All 7 local migrations will show as unapplied on the remote database.

#### 3. Preview Schema Diff (Read-Only Dry Run)
```bash
npx -y supabase db diff --linked
```
*Purpose*: Generates the SQL diff between the remote schema and local migrations without applying any changes.

#### 4. Dry-Run Migration Push (Safe Simulation)
```bash
npx -y supabase db push --dry-run
```
*Purpose*: Simulates pushing pending migrations to the linked database and validates syntax without committing changes.

---

### Option B: Using Supabase Dashboard SQL Editor (Zero-Install Alternative)

If you prefer not to install the CLI or supply database passwords to a terminal:

1. Open your hosted project: [`https://supabase.com/dashboard/project/mkbouvsozmzimheysuaz/sql`](https://supabase.com/dashboard/project/mkbouvsozmzimheysuaz/sql)
2. Review each migration file in [`supabase/migrations/`](file:///home/manoj/Developer/timeswap_/supabase/migrations/) in sequential order (1 through 7).
3. Paste and execute them one by one, or combine them into a single migration run.

---

## 6. Pre-Execution Risk Analysis & Blockers

Before applying migrations or connecting the application to the hosted project, resolve the following items:

### 6.1 Blocker: Environment Variable Key Name Mismatch
- **Issue**: `.env.local` contains `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Impact**: [`src/lib/supabase/client.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/client.ts#L10), [`server.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/server.ts#L9), and [`middleware.ts`](file:///home/manoj/Developer/timeswap_/src/lib/supabase/middleware.ts#L13) explicitly look for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. As a result, the frontend will evaluate the key as `undefined` and stay in offline demo simulation mode.
- **Required Fix**: In `.env.local`, duplicate or rename the key to:
  ```bash
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_publishable_key_value>
  ```

### 6.2 Checklist: Supabase Dashboard Authentication Configuration
- **Confirm Email**: Must be set to **`ON`** under **Authentication -> Providers -> Email**. TimeSwap's 3-credit welcome grant trigger depends on `NEW.email_confirmed_at IS NOT NULL`. If disabled, credits would be awarded immediately upon unverified signup.
- **Redirect URLs**: Must include:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/onboarding`
  - `http://localhost:3000/auth/reset-password`
  - `http://localhost:3000/dashboard`

### 6.3 Realtime Publication Idempotency Note
- Migration 6 contains:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  ```
- Because the hosted database is unmigrated, these will execute cleanly on the first run. (If the migration is ever re-run, PostgreSQL will note that the tables are already members of the publication).

---

## 7. Git & Secret Exclusion Confirmation

A thorough audit of Git index and working tree confirmed that all credentials remain strictly excluded from version control:

1. **`.gitignore` Rule**: Line 11 of [`.gitignore`](file:///home/manoj/Developer/timeswap_/.gitignore) defines `.env.*`.
2. **Git Ignore Check**:
   ```bash
   git check-ignore -v .env.local
   # Output: .gitignore:11:.env.*	.env.local
   ```
3. **Repository Track Check**:
   ```bash
   git ls-files .env.local
   # Output: (empty — not tracked)
   ```
4. **Git History Inspection**:
   Commit history was audited across all branches; only `.env.example` (containing dummy placeholders) has ever been committed. No secrets, keys, or credentials exist in Git.
5. **Git Status**:
   `git status --short` confirms the working tree is clean. Only local markdown reports exist as untracked files.

---

## 8. Summary of Safe Next Steps (Upon Approval)

When ready to proceed with the migration:
1. Fix the environment variable name in `.env.local` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. Verify **Confirm Email** is enabled in the Supabase Dashboard.
3. Apply the 7 SQL migrations in order via the Supabase Dashboard SQL Editor or via `npx supabase db push`.
4. Run automated tests against the hosted database to verify end-to-end integration.
