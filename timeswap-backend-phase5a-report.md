# TimeSwap — Phase 5A: Security Hardening & Integrity Fixes Report

> **Specification & Delivery Status**: Completed  
> **Environment**: Supabase PostgreSQL 16 / Next.js 14.2.15 (App Router)  
> **Automated Assertions Passed**: 156 / 156 cumulative (27 / 27 Phase 5A)  
> **Browser Runtime Checks**: 12 / 12 routes clean, 0 console errors, 0 runtime exceptions  
> **Migration Delivered**: `supabase/migrations/20261020000007_phase5a_security_hardening.sql`

---

## Executive Summary

Phase 5A delivers all security hardening and database integrity remediations identified in the Phase 5 Production Readiness Audit (`timeswap-backend-phase5-audit.md`). The implementation eliminates client trust vulnerabilities, enforces database-authoritative deadlines, secures profile reputation metrics behind PostgreSQL row-level triggers, revokes public execution of background sweeps, and handles user registration collisions gracefully without rolling back `auth.users` transactions.

The client application in [`src/lib/store.tsx`](file:///home/manoj/Developer/timeswap_/src/lib/store.tsx) and [`src/components/Navbar.tsx`](file:///home/manoj/Developer/timeswap_/src/components/Navbar.tsx) was hardened to prevent silent fallback: operations fail closed on real backend errors, and offline demo simulation is surfaced transparently via an `isDemoMode` indicator without breaking the visual design system.

---

## 1. Remediation Details & Verifications

### 1.1 SEC-01 — `expire_session_request` Caller Validation & Deadline Verification
* **Vulnerability Addressed**: Previously, any authenticated user could call `expire_session_request(p_session_id)` at any time and force premature expiry and escrow refunds.
* **Remediation**:
  - Implemented strict caller authentication and authorization: if `auth.uid()` is present (client connection), the caller **must** be either `learner_id` or `teacher_id`. Unrelated third parties receive an `Unauthorized` exception.
  - Enforced database-authoritative deadline verification: requests can only be expired if `now() >= scheduled_start_at - interval '2 hours'` OR `now() >= created_at + interval '48 hours'`. Premature expiry calls throw an authoritative deadline exception.
  - Releases escrow reservation back to the learner's available balance atomically with an idempotent ledger journal entry (`'escrow_refund_expired_' || session_id`).
  - Repeated expiry invocations on an already expired session return idempotently without duplicate refunds.

### 1.2 SEC-02 — `cancel_session` Client-Supplied Parameter Removal & Authoritative Compensation
* **Vulnerability Addressed**: Previously, `cancel_session` accepted an optional client-supplied `p_mentor_was_available BOOLEAN`, which could be exploited by an attacker to fraudulently divert escrowed credits.
* **Remediation**:
  - Dropped the insecure 3-argument signature `cancel_session(UUID, TEXT, BOOLEAN)`.
  - Created the hardened 2-argument signature `cancel_session(p_session_id UUID, p_reason TEXT DEFAULT NULL)`.
  - Mentor availability is now determined **strictly from authoritative database records**:
    ```sql
    SELECT EXISTS (
        SELECT 1 FROM public.availability_slots
        WHERE profile_id = v_session.teacher_id
          AND day_of_week = EXTRACT(DOW FROM v_session.scheduled_start_at AT TIME ZONE 'UTC')
          AND start_time <= (v_session.scheduled_start_at AT TIME ZONE 'UTC')::time
          AND end_time >= (v_session.scheduled_end_at AT TIME ZONE 'UTC')::time
    ) OR (v_session.status = 'accepted') INTO v_mentor_available;
    ```
  - Preserved cancellation policy:
    - Mentor cancellation: Full refund to learner always.
    - Learner early cancellation (> 2 hours before start): Full refund to learner.
    - Learner late cancellation (<= 2 hours before start):
      - If mentor verified available: Transfer compensation credits to mentor.
      - If mentor NOT verified available: Route to `under_review` and preserve escrow (never auto-pay mentor).

### 1.3 SEC-03 — Reputation Metrics Protection via PostgreSQL Trigger
* **Vulnerability Addressed**: `profiles_update_own` RLS policy allowed users to modify their own profile rows, enabling tampering with `hours_taught`, `hours_learned`, `rating`, or `review_count`.
* **Remediation**:
  - Implemented a `BEFORE UPDATE ON public.profiles` trigger: [`trg_protect_profile_reputation`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_phase5a_security_hardening.sql#L17-L44).
  - Inspects whether `hours_taught`, `hours_learned`, `rating`, or `review_count` changed. If changed, checks transaction-local setting `current_setting('timeswap.allow_reputation_update', true)`. If not `'on'`, immediately aborts with:
    `Permission denied: Direct modification of reputation metrics (hours_taught, hours_learned, rating, review_count) is prohibited.`
  - Legitimate profile updates (headline, bio, name, avatar, timezone, onboarding step) succeed normally.
  - Updated `confirm_session_completion` to execute `PERFORM set_config('timeswap.allow_reputation_update', 'on', true);` locally within the completion transaction, allowing authoritative updates to `hours_taught` and `hours_learned`.

### 1.4 SEC-04 — Batch Worker Privilege Revocation
* **Vulnerability Addressed**: Maintenance functions `flag_unresolved_sessions` and `expire_pending_requests` were executable by the `authenticated` role.
* **Remediation**:
  - Revoked `EXECUTE` on both functions from `PUBLIC`, `authenticated`, and `anon`.
  - Granted `EXECUTE` exclusively to `service_role` (and superuser).
  - Verified via automated tests that ordinary authenticated users receive PostgreSQL permission denied errors.

### 1.5 SEC-05 — Scheduling Documentation & 72-Hour Unresolved Sweep
* **Status**: Confirmed that `pg_cron` is not installed in the local Docker PostgreSQL Alpine container. Left scheduling explicitly unconfigured locally rather than fabricating fake cron tasks.
* **Production Guidelines**:
  - In hosted Supabase with `pg_cron`: schedule via `cron.schedule('flag-unresolved', '0 * * * *', 'SELECT public.flag_unresolved_sessions();')`.
  - In external scheduler / Supabase Edge Functions: invoke via service-role API client.
  - Verified that `flag_unresolved_sessions` transitions sessions to `under_review` and **never** auto-settles escrow after 72 hours, preserving funds for community review.

### 1.6 SEC-06 — Registration Handle Collision Recovery
* **Vulnerability Addressed**: When user metadata requested a handle already claimed by another user, `fn_handle_user_verification_and_welcome_grant` triggered a unique constraint violation that rolled back the entire `auth.users` transaction.
* **Remediation**:
  - Implemented an iterative collision resolution loop in [`fn_handle_user_verification_and_welcome_grant`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_phase5a_security_hardening.sql#L540-L680).
  - If `v_handle` exists in `public.profiles` for another user, appends a numeric suffix (e.g., `alex_4812`), truncating to 30 characters.
  - Falls back to deterministic UUID-based unique handle if multiple collisions occur.
  - Verified that both colliding users register successfully and receive their 3 welcome credits without transaction aborts.

### 1.7 Frontend & Store Hardening (`src/lib/store.tsx`)
* **Fail-Closed Operations**:
  - When Supabase is connected (`supabase !== null`): if an RPC fails, operations fail closed and return `{ success: false, error: err.message }`. They never silently fall back to client-side localStorage mutations.
  - If an unauthenticated user attempts to perform session actions while Supabase is connected, the store fails closed with `'Authentication required: please sign in.'`.
* **Transparency & Demo Indicator**:
  - Added `backendStatus: 'connected' | 'unconfigured' | 'error'` and `isDemoMode: boolean` to `TimeSwapContextType`.
  - Rendered a subtle `Demo Mode` indicator in [`src/components/Navbar.tsx`](file:///home/manoj/Developer/timeswap_/src/components/Navbar.tsx) when Supabase credentials are not configured in the browser environment.

---

## 2. Test Verification Matrix

| Test Suite | Assertions | Passed | Failed | Focus Areas |
|:---|:---:|:---:|:---:|:---|
| [`tests/test-db-phase1.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-db-phase1.mjs) | 27 | 27 | 0 | Whole-number credits, ledger immutability, RLS isolation |
| [`tests/test-phase2.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase2.mjs) | 22 | 22 | 0 | Verification trigger, 3 welcome credits, onboarding resume |
| [`tests/test-phase3.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase3.mjs) | 40 | 40 | 0 | Atomic escrow booking, bilateral settlement, cancellation |
| [`tests/test-phase4.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase4.mjs) | 40 | 40 | 0 | Realtime messaging, participant authorization, presence |
| [`tests/test-phase5a.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase5a.mjs) | 27 | 27 | 0 | SEC-01 through SEC-06 security hardening verifications |
| **Total Automated Assertions** | **156** | **156** | **0** | **100% Passing** |

### Phase 5A Specific Test Coverage:
1. `SEC-01`: Unauthorized third party Eve cannot expire Alice and Bob request.
2. `SEC-01`: Premature expiry rejected when scheduled start is > 2h away.
3. `SEC-01`: Eligible request expired after response deadline passed.
4. `SEC-01`: Expiry restores escrowed credit to learner wallet (available: 3, escrow: 0).
5. `SEC-01`: Escrow refund journal entry created with amount = 1.
6. `SEC-01`: Repeated expire call is safe and idempotent without double-refund.
7. `SEC-02`: Old 3-argument `cancel_session` signature with untrusted param dropped.
8. `SEC-02`: Late cancellation with unverified mentor routed to status `under_review`.
9. `SEC-02`: Credits NOT transferred to unverified mentor during late cancellation (held in escrow).
10. `SEC-02`: Late cancellation with verified mentor marked `cancelled_by_learner`.
11. `SEC-02`: Mentor received 1 compensation credit for late cancellation (available: 3 -> 4).
12. `SEC-02`: Authoritative `escrow_cancellation_transfer` recorded in ledger.
13. `SEC-03`: Direct update to `hours_taught` blocked by trigger.
14. `SEC-03`: Direct update to `rating` and `review_count` blocked by trigger.
15. `SEC-03`: Legitimate profile edits succeed while reputation metrics remain unaltered.
16. `SEC-03`: Bilateral completion settled successfully through trusted transaction setting.
17. `SEC-03`: Profile `hours_taught` (Bob: 2.0h) and `hours_learned` (Alice: 2.0h) authoritatively updated via completion.
18. `SEC-04`: Authenticated user cannot execute `flag_unresolved_sessions` (permission denied).
19. `SEC-04`: Authenticated user cannot execute `expire_pending_requests` (permission denied).
20. `SEC-05`: Trusted batch worker flagged unresolved session.
21. `SEC-05`: Unresolved session moved to `under_review`.
22. `SEC-05`: Escrow is NOT auto-settled after 72 hours; preserved safely for review.
23. `SEC-06`: First user successfully claimed handle `"charlie"`.
24. `SEC-06`: Handle collision resolved automatically with unique suffix (`"charlie_XXXX"`).
25. `SEC-06`: Both users received 3 welcome credits cleanly without transaction abort.
26. `Integrity`: All 7 SQL migrations applied cleanly without errors.
27. `Idempotency`: Double completion and double cancellation return idempotent states without duplicate ledger entries.

---

## 3. Browser & Production Build Verification

1. **Next.js Production Build (`npm run build`)**:
   - Clean compilation across all 22 static and dynamic routes.
   - Zero TypeScript or lint errors.
   - Generated static pages: `/`, `/dashboard`, `/discover`, `/messages`, `/notifications`, `/wallet`, `/sessions`, `/onboarding`, `/profile`, `/settings`, `/auth/signin`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/saved`, `/help`.
2. **Playwright Browser Runtime Check (`npm run test:browser`)**:
   - 12 / 12 routes tested cleanly on local server.
   - 0 runtime page errors.
   - 0 console errors.
   - 0 failed network requests.
   - Interactive message sending and notification marking verified live.

---

## 4. Migration Inventory

| Migration File | Purpose |
|:---|:---|
| [`20261020000001_initial_schema.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000001_initial_schema.sql) | Profiles, skills, availability, sessions, wallets, ledger, reviews, notifications, conversations, messages |
| [`20261020000002_rls_policies.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000002_rls_policies.sql) | Baseline RLS policies for all 10 domain tables |
| [`20261020000003_auth_trigger_welcome_credits.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000003_auth_trigger_welcome_credits.sql) | Initial verification trigger awarding 3 welcome credits |
| [`20261020000004_phase2_profiles_and_onboarding.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000004_phase2_profiles_and_onboarding.sql) | Profile discovery RLS, onboarding step persistence |
| [`20261020000005_phase3_session_booking_and_escrow.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_phase3_session_booking_and_escrow.sql) | Atomic booking RPC, escrow hold, bilateral completion, 2h cancel |
| [`20261020000006_phase4_realtime_messaging_notifications.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000006_phase4_realtime_messaging_notifications.sql) | Realtime publications, messaging RPCs, unread count synchronization |
| [`20261020000007_phase5a_security_hardening.sql`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_phase5a_security_hardening.sql) | SEC-01 through SEC-06 security hardening, reputation trigger, collision recovery |
