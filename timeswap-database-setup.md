# TimeSwap — Database Setup, Migration Standardization & Hosted Project Link Report

> **Status**: Ready for User Review (Zero Database Mutations Executed)  
> **Git Repository**: [`https://github.com/manoj-9899/timeswap_.git`](https://github.com/manoj-9899/timeswap_.git)  
> **Hosted Supabase Project Reference**: `mkbouvsozmzimheysuaz`  
> **Database Host Endpoint**: `https://mkbouvsozmzimheysuaz.supabase.co`  
> **Supabase CLI Version**: `supabase@2.121.0` (invoked via `npx`)  
> **Automated Test Matrix**: 156 / 156 assertions passing across all test suites

---

## 1. Final Migration Filenames & Verified Purposes

All SQL migrations in [`supabase/migrations/`](file:///home/manoj/Developer/timeswap_/supabase/migrations/) have been standardized to match the exact required naming scheme. The SQL contents, constraints, search path declarations, and execution order have been strictly preserved.

```text
supabase/
└── migrations/
    ├── 20261020000001_initial_schema.sql
    ├── 20261020000002_rls_policies.sql
    ├── 20261020000003_auth_welcome_credits_trigger.sql
    ├── 20261020000004_profiles_and_onboarding.sql
    ├── 20261020000005_session_booking_and_credit_escrow.sql
    ├── 20261020000006_realtime_messaging_and_notifications.sql
    └── 20261020000007_security_hardening.sql
```

### Verified File Details & Roles:

| # | Standardized Migration File | Size | Phase | Verified Contents & Purpose |
|:---:|:---|:---:|:---:|:---|
| **1** | [`20261020000001_initial_schema.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000001_initial_schema.sql) | 18,862 B | Phase 1 | Enables `uuid-ossp` and `pgcrypto`. Creates 11 core tables (`profiles`, `skills`, `member_skills`, `availability_slots`, `sessions`, `credit_wallets`, `credit_ledger`, `reviews`, `notifications`, `conversations`, `messages`). Defines whole-number credit constraints (1h=1cr, 2h=2cr, 3h=3cr). Enforces credit ledger immutability trigger `trg_credit_ledger_immutability`. |
| **2** | [`20261020000002_rls_policies.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000002_rls_policies.sql) | 12,583 B | Phase 1 | Enables Row Level Security (RLS) on all 11 tables. Defines `auth.uid()` participant isolation policies. Denies direct client mutations on authoritative financial balances (`credit_wallets`, `credit_ledger`). Adds `fn_is_conversation_member` helper with `SECURITY DEFINER SET search_path = public, pg_temp`. |
| **3** | [`20261020000003_auth_welcome_credits_trigger.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000003_auth_welcome_credits_trigger.sql) | 4,879 B | Phase 1 | Defines `fn_handle_user_verification_and_welcome_grant()` and trigger `trg_user_verification_welcome_grant` on `auth.users`. Automatically creates profiles, initializes zero-balance wallets, and awards exactly 3 welcome credits with idempotent journal entries upon email verification. |
| **4** | [`20261020000004_profiles_and_onboarding.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000004_profiles_and_onboarding.sql) | 2,728 B | Phase 2 | Establishes public discovery policy (`profiles_select_public`) for profiles with `onboarding_completed = true`. Preserves onboarding state persistence for returning users. Adds performance indexes on `onboarding_completed` and `handle`. |
| **5** | [`20261020000005_session_booking_and_credit_escrow.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql) | 34,480 B | Phase 3 | Core transaction RPCs: `create_session_request` (atomic escrow hold), `accept_session_request`, `decline_session_request` (escrow release), `cancel_session`, `confirm_session_completion` (bilateral completion), `flag_unresolved_sessions`, `expire_pending_requests`. |
| **6** | [`20261020000006_realtime_messaging_and_notifications.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000006_realtime_messaging_and_notifications.sql) | 11,445 B | Phase 4 | Persistent messaging RPCs (`send_message`, `get_or_create_conversation`, `mark_conversation_read`). Configures `supabase_realtime` publication for `messages`, `notifications`, `conversation_members`. Sets `REPLICA IDENTITY FULL`. |
| **7** | [`20261020000007_security_hardening.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_security_hardening.sql) | 29,253 B | Phase 5A | **Security Hardening**: Adds `trg_protect_profile_reputation` trigger preventing users from forging reputation metrics (`hours_taught`, `hours_learned`, `rating`, `review_count`); SEC-01 caller & deadline check on `expire_session_request`; SEC-02 drops 3-arg `cancel_session` and evaluates availability authoritatively from DB records; SEC-04 revokes batch sweeps from `PUBLIC`/`authenticated`; SEC-06 handle collision recovery loop. |

---

## 2. Files Renamed or Moved

The following migrations were renamed using `git mv` to standardize directory naming while preserving Git history:

| Original Filename | Standardized Filename | Purpose Verified |
|:---|:---|:---:|
| `20261020000003_auth_trigger_welcome_credits.sql` | `20261020000003_auth_welcome_credits_trigger.sql` | Verified |
| `20261020000004_phase2_profiles_and_onboarding.sql` | `20261020000004_profiles_and_onboarding.sql` | Verified |
| `20261020000005_phase3_session_booking_and_escrow.sql` | `20261020000005_session_booking_and_credit_escrow.sql` | Verified |
| `20261020000006_phase4_realtime_messaging_notifications.sql` | `20261020000006_realtime_messaging_and_notifications.sql` | Verified |
| `20261020000007_phase5a_security_hardening.sql` | `20261020000007_security_hardening.sql` | Verified |

*(Files `20261020000001_initial_schema.sql` and `20261020000002_rls_policies.sql` were already named identically to the target convention).*

All test harnesses in [`tests/`](file:///home/manoj/Developer/timeswap_/tests/) were updated with the standardized filenames. `npm test` was executed and **all 156 assertions passed cleanly.**

---

## 3. SQL Content & Integrity Preservation Confirmation

- **Zero SQL logic changes**: The migration contents were neither rewritten, duplicated, nor altered during renaming.
- **Constraints Preserved**: Whole-number credits, chronological timestamps, immutable ledger write-denial, non-negative wallet checks, and category enums remain intact.
- **Search Path Integrity**: All `SECURITY DEFINER` functions explicitly declare `SET search_path = public, auth, pg_temp` or `SET search_path = public, pg_temp`.

---

## 4. Local Supabase Configuration Status

- **Config File**: [`supabase/config.toml`](file:///home/manoj/Developer/timeswap_/supabase/config.toml)
- **Project ID**: Configured with `project_id = "mkbouvsozmzimheysuaz"`.
- **API Configuration**: Port 54321, schemas `["public", "storage", "graphql_public"]`, extra search path `["public", "extensions"]`.
- **Auth Settings**: Site URL `http://localhost:3000`, `enable_confirmations = true`, `jwt_expiry = 3600`.
- **Ignore Rules**: Added `.supabase/` and `supabase/.temp/` to [`.gitignore`](file:///home/manoj/Developer/timeswap_/.gitignore) to keep CLI caches and local link state excluded from version control.

---

## 5. Environment Variable Audit & Verification

The environment file `.env.local` was inspected safely without printing or exposing any credentials:

| Variable | Present in `.env.local` | Verified Target | Status |
|:---|:---:|:---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | `https://mkbouvsozmzimheysuaz.supabase.co` | **Valid** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public client key | **Attention Required** *(See note below)* |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Valid `service_role` JWT (ref: `mkbouvsozmzimheysuaz`) | **Valid** |

> [!CRITICAL]
> **Key Format Check for `NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
> Inspection revealed that `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` contains Supabase's new publishable key format (prefix: `sb_publ...`).
> 
> When tested against the Supabase PostgREST endpoint, the gateway returned:
> `HTTP 401 Unauthorized: Secret API key required. Hint: Only secret API keys can be used for this endpoint.`
> 
> **Action Required**: The Supabase PostgREST client library (`@supabase/supabase-js` / `@supabase/ssr`) requires the **standard JWT `anon` key** (which starts with `eyJhbGci...` and has claim `role: "anon"`).
> 
> Please navigate to your Supabase Dashboard:
> **Project Settings -> API -> Project API keys -> `anon` `public`**  
> Copy the JWT string starting with `eyJ...` and paste it into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 6. Hosted Project Reference Confirmation

- **Project Reference**: `mkbouvsozmzimheysuaz`
- **Hosted Domain**: `mkbouvsozmzimheysuaz.supabase.co`
- **Gateway Health**: The HTTPS REST endpoint is active (`HTTP 200` with service role key).
- **Service Role Verification**: Decoded JWT claims confirmed `role: "service_role"`, `iss: "supabase"`, and `ref: "mkbouvsozmzimheysuaz"`.

---

## 7. Migration History Comparison

A read-only inspection of the hosted database confirmed:

| Metric | Local Repository | Hosted Project (`mkbouvsozmzimheysuaz`) |
|:---|:---:|:---:|
| **Migration Files** | 7 files | 0 applied |
| **`supabase_migrations.schema_migrations`** | N/A (Local filesystem) | Table does not exist (`HTTP 404 / PGRST205`) |
| **Domain Tables (`profiles`, `sessions`, etc.)** | 11 tables | 0 tables in schema cache (`PGRST205`) |
| **Pending Migrations** | — | **All 7 migrations pending** (Sequential 1–7) |

The hosted database is in a clean state with zero preexisting tables or partial migration records.

---

## 8. Dry-Run Result & Project Link Status

When invoking `npx supabase link --project-ref mkbouvsozmzimheysuaz`, the Supabase CLI reported:
```json
{
  "_tag": "Error",
  "error": {
    "code": "AccessTokenRequiredError",
    "message": "Access token not provided. Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable."
  }
}
```

Per your strict boundary instructions, **the command was paused rather than requesting you to disclose credentials in chat.**

---

## 9. Blockers & Security Checklist Before Execution

Before running the migration push:

1. **Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`**:
   Replace the `sb_publ...` key with the standard `anon` `public` JWT (`eyJ...`) from your Supabase Dashboard under **Project Settings -> API**.
2. **Confirm Email Setting**:
   Verify in **Authentication -> Providers -> Email** that **Confirm email** is set to **`ON`**.
3. **URL Configuration**:
   Ensure Redirect URLs include `http://localhost:3000/auth/callback`, `http://localhost:3000/onboarding`, `http://localhost:3000/auth/reset-password`.
4. **Git Protection**:
   Confirmed that `.env.local`, `.supabase/`, and `supabase/.temp/` are ignored by Git. No secrets are staged or committed.

---

## 10. Exact Commands to Proceed (Terminal Steps)

Once you have verified the checklist, run the following commands directly in your terminal:

### Step 1: Authenticate Supabase CLI
```bash
npx -y supabase login
```
*(This opens the browser for official Supabase authentication without exposing tokens to chat).*

### Step 2: Link to Hosted Project
```bash
npx -y supabase link --project-ref mkbouvsozmzimheysuaz
```
*(Enter your remote database password when prompted).*

### Step 3: Preview Pending Migrations (Read-Only)
```bash
npx -y supabase migration list
```
*(Verifies all 7 local migrations appear as pending on the remote project).*

### Step 4: Dry-Run Schema Push (Safe Simulation)
```bash
npx -y supabase db push --dry-run
```
*(Validates SQL syntax against the remote database without committing changes).*

### Step 5: Apply Migrations (Only When Approved)
```bash
npx -y supabase db push
```

---

## 11. Current Git Status

```text
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
	renamed:    supabase/migrations/20261020000003_auth_trigger_welcome_credits.sql -> supabase/migrations/20261020000003_auth_welcome_credits_trigger.sql
	renamed:    supabase/migrations/20261020000004_phase2_profiles_and_onboarding.sql -> supabase/migrations/20261020000004_profiles_and_onboarding.sql
	renamed:    supabase/migrations/20261020000005_phase3_session_booking_and_escrow.sql -> supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql
	renamed:    supabase/migrations/20261020000006_phase4_realtime_messaging_notifications.sql -> supabase/migrations/20261020000006_realtime_messaging_and_notifications.sql
	renamed:    supabase/migrations/20261020000007_phase5a_security_hardening.sql -> supabase/migrations/20261020000007_security_hardening.sql

Changes not staged for commit:
	modified:   .gitignore
	modified:   supabase/config.toml
	modified:   tests/test-db-phase1.mjs
	modified:   tests/test-phase2.mjs
	modified:   tests/test-phase3.mjs
	modified:   tests/test-phase4.mjs
	modified:   tests/test-phase5a.mjs

Untracked files:
	timeswap-backend-phase5b-migration-preview.md
	timeswap-backend-phase5b-preparation.md
	timeswap-database-setup.md
```
