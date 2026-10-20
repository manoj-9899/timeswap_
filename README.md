# TimeSwap

> **Reciprocal Knowledge Exchange Powered by Whole-Number Time Credits**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-purple?style=flat&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Automated Tests](https://img.shields.io/badge/Tests-239%20Passing-brightgreen?style=flat)](tests/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](package.json)

TimeSwap is an open-source, non-monetary skill-sharing platform built with Next.js App Router and hosted Supabase PostgreSQL. It allows learners and mentors to exchange knowledge using **integer-only time credits** rather than currency. One hour taught earns exactly one credit, which can be spent learning any skill from any community mentor. All transactions are backed by an immutable ledger, atomic escrow reservations, and bilateral completion verification.

---

## Table of Contents

- [Overview](#overview)
  - [The Core Philosophy](#the-core-philosophy)
  - [The User Journey](#the-user-journey)
- [Key Features](#key-features)
- [Visual Identity & Preview](#visual-identity--preview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Time-Credit & Escrow Rules](#time-credit--escrow-rules)
  - [Allowed Durations & Integer Credits](#allowed-durations--integer-credits)
  - [Welcome Credit Lifecycle](#welcome-credit-lifecycle)
  - [Escrow Reservation & Cancellation Policy](#escrow-reservation--cancellation-policy)
  - [Bilateral Session Completion](#bilateral-session-completion)
  - [72-Hour Dispute Sweep (SEC-05)](#72-hour-dispute-sweep-sec-05)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Database Schema & Migrations](#database-schema--migrations)
- [Quality Assurance & Testing](#quality-assurance--testing)
  - [Test Suite Matrix](#test-suite-matrix)
  - [Running Tests](#running-tests)
- [Progressive Web App (PWA)](#progressive-web-app-pwa)
  - [Installation Support](#installation-support)
  - [Security & Caching Strategy](#security--caching-strategy)
  - [Safe Offline Fallback](#safe-offline-fallback)
- [Production Deployment (Vercel)](#production-deployment-vercel)
  - [Vercel Project Setup](#vercel-project-setup)
  - [Supabase Authentication URL Configuration](#supabase-authentication-url-configuration)
- [Security Architecture](#security-architecture)
- [Roadmap & Limitations](#roadmap--limitations)
- [Contributing](#contributing)
- [License](#license)
- [Author & Acknowledgments](#author--acknowledgments)

---

## Overview

### The Core Philosophy

In traditional education and tutoring marketplaces, financial barriers limit access to learning, and human attention is valued unequally. TimeSwap is built upon the principle of **reciprocal equality**:

$$\text{1 Hour Taught} = \text{1 Time Credit Earned} = \text{1 Hour Learned}$$

Whether an astrophysicist teaches orbital mechanics or an artisan baker teaches sourdough fermentation, one hour of human dedication equals one time credit. Credits cannot be purchased with fiat currency, cannot be fractionalized ($0.5$ credits are rejected at the database schema level), and can only be earned by contributing time to another community member.

### The User Journey

```text
[ Sign Up ] ──> [ Email Verification ] ──> [ Onboarding Wizard ] ──> [ Discover Mentors ]
                       │ (Unlocks 3 Credits)       │ (4 Steps: Bio,
                       ▼                           │  Skills, Schedule)
                 [ 3 Credits in Wallet ]           ▼
                       │                    [ Active Member Profile ]
                       ▼
       [ Request Session (60m / 120m / 180m) ] ──> [ Escrow Held ]
                       │
                       ├── (Mentor Declines / Cutoff Expired) ──> [ 100% Refunded to Learner ]
                       │
                       └── (Mentor Accepts) ──> [ Scheduled Room & Live Chat ]
                                                       │
                                                       ▼
                                    [ Bilateral Confirmation (Both Sign Off) ]
                                                       │
                                                       ▼
                                [ 100% Escrow Transferred to Mentor Wallet ]
                                [ Immutable Ledger Journal Entry Recorded ]
                                [ Mutual Reviews & Reputation Metrics Updated ]
```

1. **Registration & Welcome Credits:** A new user registers and verifies their email address. Upon verification, a PostgreSQL trigger automatically awards **3 welcome credits** to jumpstart reciprocal exchanges.
2. **Onboarding Wizard:** A 4-step wizard guides the user to define their handle, timezone, bio, skills offered, skills desired, and weekly availability slots.
3. **Skill Discovery:** Users search and filter mentors across 6 categories (Design & Creative, Code & Technology, Languages & Writing, Crafts & Hands-on, Music & Sound, Wellness & Lifestyle).
4. **Session Booking & Atomic Escrow:** The learner requests a 60, 120, or 180-minute session. The corresponding credits (1, 2, or 3) are atomically locked into escrow.
5. **Real-Time Collaboration:** When the mentor accepts, a private session conversation opens with live message delivery and structured proposal cards via Supabase Realtime.
6. **Bilateral Settlement:** After the session concludes, both mentor and learner confirm completion. When both parties submit confirmation, credits are settled from escrow into the mentor's available wallet, reputation hours are updated, and mutual reviews are published.

---

## Key Features

- **Integer-Only Credit Economy:** Enforced by PostgreSQL `INTEGER` column types and strict table constraints (`CHECK (available_balance >= 0)`). No fractional credits, floating-point rounding errors, or negative balances.
- **Atomic Escrow Engine:** Database-authoritative session booking ensures credits are reserved instantly, eliminating double-spending across concurrent requests.
- **Bilateral Completion Protocol:** Escrow settlement requires mutual confirmation from both teacher and learner. If one party does not confirm, the session enters review without auto-transferring funds.
- **Authoritative Cancellation Matrix:** Cancellation refunds are calculated authoritatively by database triggers based on actual session time and mentor availability records—never client assertions.
- **Supabase Realtime Messaging:** Low-latency in-app chat with database persistence, delivery indicators, unread badges, and offline reconnect reconciliation.
- **Progressive Web App (PWA):** Fully installable on iOS, Android, and desktop with a dedicated offline fallback page, high-DPI maskable icons, and zero-mutation caching safeguards.
- **Defense-in-Depth Security:** Every table is protected by PostgreSQL Row Level Security (RLS), immutability triggers on the financial ledger, and worker-only revocations on administrative maintenance routines.

---

## Visual Identity & Preview

TimeSwap features an editorial, high-contrast light theme built on warm off-white canvas tones (`#FAF9F6`), crisp typography, and evergreen accents (`#347A5C`).

| Asset | Preview Reference | Details |
|---|---|---|
| **OpenGraph Graphic** | `public/og.png` | 1200x630 dashboard and social sharing preview. |
| **Brand Icon** | `public/icon.svg` | Equilibrium dual-circle brand motif. |
| **PWA Launcher Icons** | `public/icons/icon-192.png`, `public/icons/icon-512.png` | Standalone device launch icons. |
| **Maskable Icon** | `public/icons/icon-maskable-512.png` | Android adaptive icon with 10% safe zone padding. |
| **Apple Touch Icon** | `public/icons/apple-touch-icon.png` | 180x180 iOS home screen bookmark. |

> Additional high-resolution interface captures are available in the `.shots/` directory.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | `14.2.15` | Hybrid Server/Client Components, file-based routing, SEO metadata. |
| **UI Library** | [React](https://react.dev/) | `18.3.1` | Declarative user interface, hooks, and context providers. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.6.3` | End-to-end static typing across App Router and Supabase schemas. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `3.4.14` | Design system with custom tokens (`canvas`, `ink`, `brand`, `line`). |
| **Icons** | [Lucide React](https://lucide.dev/) | `1.60.0` | Accessible iconography. |
| **Motion & FX** | [GSAP](https://greensock.com/) & [Canvas Confetti](https://github.com/catdad/canvas-confetti) | `3.15.0` / `1.9.4` | Micro-animations and celebratory completion confetti. |
| **Smooth Scroll** | [Lenis](https://lenis.darkroom.engineering/) | `1.3.27` | Momentum-based page scrolling. |
| **Backend & DB** | [Supabase](https://supabase.com/) (PostgreSQL) | `15.x` | Managed Postgres, Auth, Realtime publications, and Stored Procedures. |
| **Supabase SDKs** | `@supabase/ssr` / `@supabase/supabase-js` | `0.12.7` / `2.118.0` | Cookie-based SSR authentication and client data operations. |
| **Testing** | Node.js Test Harness & [Playwright](https://playwright.dev/) | `1.64.1` | Multi-phase regression tests and headless browser audits. |
| **Deployment Target** | [Vercel](https://vercel.com/) | Edge & Node.js | Global CDN, automatic previews, and serverless App Router execution. |

---

## System Architecture

```mermaid
flowchart TD
    subgraph Browser ["Client Browser / Mobile PWA"]
        App["Next.js App Router (React 18)"]
        SW["Service Worker (sw.js)"]
        Store["TimeSwap Store (Client State)"]
    end

    subgraph Vercel ["Vercel Edge & Serverless Runtime"]
        SSR["Server Components (Next.js SSR)"]
        Callback["Auth Callback (/auth/callback)"]
        AdminAPI["Admin Client (createSupabaseAdminClient)"]
    end

    subgraph Supabase ["Hosted Supabase (mkbouvsozmzimheysuaz)"]
        Auth["Supabase GoTrue Auth"]
        Realtime["Realtime Engine (WebSockets)"]
        PostgREST["PostgREST API Gateway"]
        
        subgraph Postgres ["PostgreSQL 15 Engine"]
            Tables["13 Relational Tables"]
            RLS["Row Level Security Policies"]
            RPC["14 Stored Procedures (SECURITY DEFINER)"]
            Ledger["Immutable Credit Ledger & Wallets"]
            Triggers["Integrity & Anti-Tamper Triggers"]
        end
    end

    App <--> |HTTP / RSC| SSR
    App <--> |Cache-first Static / Offline Fallback| SW
    Store <--> |Public Anon Queries (Subject to RLS)| PostgREST
    Store <--> |Subscribed Channels (messages, notifications)| Realtime
    Callback <--> |Exchange Auth Code for Session| Auth
    AdminAPI <--> |Trusted Background Sweeps (Service Role)| RPC
    PostgREST --> RLS --> Tables
    RPC --> Ledger
    Tables --> Triggers
```

### Application Directory Structure

```text
timeswap_/
├── public/                       # Static public assets
│   ├── icons/                    # Rasterized PWA icons (192, 512, maskable, apple)
│   ├── icon.svg                  # SVG Equilibrium logo
│   ├── og.png                    # OpenGraph banner image (1200x630)
│   ├── manifest.json             # W3C static manifest fallback
│   └── sw.js                     # Secure production service worker
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── auth/                 # Signin, signup, forgot/reset password, callback
│   │   ├── dashboard/            # Authenticated user dashboard
│   │   ├── discover/             # Skill & mentor discovery feed
│   │   ├── members/[id]/         # Member detail and booking modal
│   │   ├── messages/             # Real-time direct messaging
│   │   ├── notifications/        # In-app notification center
│   │   ├── offline/              # Safe PWA offline fallback page
│   │   ├── onboarding/           # 4-step user onboarding wizard
│   │   ├── profile/              # User profile & availability editor
│   │   ├── sessions/             # Active, completed, and pending sessions
│   │   │   └── [id]/complete/    # 2-way session completion confirmation
│   │   ├── wallet/               # Integer time credit balance & ledger history
│   │   ├── layout.tsx            # Root layout, metadata, viewport, service worker hook
│   │   ├── manifest.ts           # Dynamic App Router Web App Manifest
│   │   └── page.tsx              # Public landing page & FAQ
│   ├── components/               # UI components, modals, navbar, footer
│   ├── lib/
│   │   ├── store.tsx             # Central React Context state store & data fetching
│   │   └── supabase/             # Dual client setup (browser, SSR server, admin)
│   └── types/                    # TypeScript interfaces & domain types
├── supabase/
│   ├── config.toml               # Supabase CLI configuration (project mkbouvsozmzimheysuaz)
│   └── migrations/               # 7 production SQL migrations
├── tests/                        # 7 comprehensive test suites (239 assertions)
├── vercel.json                   # Production headers & cache policies
└── package.json                  # Dependencies, scripts, and build configuration
```

---

## Time-Credit & Escrow Rules

Every financial rule in TimeSwap is codified in PostgreSQL schema constraints, stored functions, and anti-tamper triggers.

### Allowed Durations & Integer Credits

Session durations are restricted to three whole-number ratios:
- **60 minutes** = `1` Time Credit
- **120 minutes** = `2` Time Credits
- **180 minutes** = `3` Time Credits

Enforced in `public.sessions` by:
```sql
CONSTRAINT chk_sessions_allowed_durations CHECK (duration_minutes IN (60, 120, 180)),
CONSTRAINT chk_sessions_credit_cost_match CHECK (
    (duration_minutes = 60  AND credit_cost = 1) OR
    (duration_minutes = 120 AND credit_cost = 2) OR
    (duration_minutes = 180 AND credit_cost = 3)
)
```

### Welcome Credit Lifecycle

1. **Unverified Accounts:** When a user registers, their available and escrow balances default to `0`. No welcome entry exists in the ledger.
2. **Verification Trigger (`trg_on_auth_user_created_welcome_credits`):** When `auth.users.email_confirmed_at` transitions from `NULL` to a timestamp, the trigger checks whether a welcome grant has already been issued.
3. **Ledger Grant:** Exactly `3` whole credits are deposited into `public.credit_wallets.available_balance`. An immutable journal record (`entry_type = 'welcome_grant'`) is inserted into `public.credit_ledger` with unique key `'welcome_' || user_id`.
4. **Idempotency:** Re-verifications safely execute `ON CONFLICT DO NOTHING`.

### Escrow Reservation & Cancellation Policy

When a session request is submitted via [`create_session_request`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql#L18):
- Learner available credits are checked: if `available_balance < credit_cost`, the transaction aborts with an exception.
- Credits are locked atomically: `available_balance -= credit_cost`, `escrow_balance += credit_cost`.
- A ledger entry of type `'escrow_hold'` is journaled.

Cancellation rules enforced by [`cancel_session`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000007_security_hardening.sql#L151) (SEC-02):
- **More than 2 hours before start:** 100% of escrowed credits are returned to the learner's available balance (`entry_type = 'escrow_refund'`).
- **Within 2 hours of start (Late Cancellation):**
  - If mentor availability was authoritatively verified in `availability_slots`: the reserved credits are transferred from escrow to the mentor's available balance as compensation (`entry_type = 'escrow_cancellation_transfer'`).
  - If mentor availability cannot be proven: the session is moved to `under_review` without credit transfers, preserving funds in escrow.
- **Mentor-initiated cancellation:** 100% of escrowed credits are returned to the learner at any time.

### Bilateral Session Completion

Settlement is governed by [`confirm_session_completion`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql#L614):
1. **Participant 1 Confirms:** Status changes to `'awaiting_completion'`. A confirmation receipt is inserted into `public.session_confirmations`. Credits remain in escrow.
2. **Participant 2 Confirms:** Both signatures are recorded. Status changes to `'completed'`.
3. **Escrow Transfer:** Escrow balance on learner wallet is reduced, and mentor wallet `available_balance` is credited. An `'escrow_settlement'` ledger entry is committed.
4. **Reputation Protection (SEC-03):** Session hours (`hours_taught`, `hours_learned`) are updated through a privileged trigger transaction setting (`timeswap.allow_reputation_update = 'on'`). Direct user edits to reputation metrics are blocked with `42501 (Permission Denied)`.

### 72-Hour Dispute Sweep (SEC-05)

Sessions that pass 72 hours after `scheduled_end_at` without bilateral confirmation are handled by [`flag_unresolved_sessions`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql#L769):
- The session is moved to `under_review`.
- Dispute notifications are delivered to both participants.
- **Funds are NOT automatically transferred or refunded.** Escrow remains safely locked pending human/community review.

---

## Getting Started

### Prerequisites

- **Node.js:** `v18.17.0` or `>= v20.0.0`
- **npm:** `v9.x` or `>= v10.0.0`
- **PostgreSQL:** `v15.x` (if running local test databases) or a hosted [Supabase](https://supabase.com/) project.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/manoj-9899/timeswap_.git
   cd timeswap_
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example template to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Populate `.env.local` with your Supabase credentials (see [Environment Variables](#environment-variables)).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable Name | Required | Environment | Exposure | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Dev, Preview, Prod | Public | Supabase project API gateway (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Dev, Preview, Prod | Public | Anonymous JWT key for browser/SSR queries subject to RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Dev, Preview, Prod | **Secret (Server Only)** | Administrative JWT key for trusted background sweeps. |
| `NEXT_PUBLIC_APP_URL` | Optional | Prod | Public | Canonical application URL (e.g. `https://timeswap.vercel.app`). |

> [!WARNING]
> `SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `NEXT_PUBLIC_` or imported into client components. It possesses superuser bypass privileges and must remain confined to `src/lib/supabase/server.ts`.

---

## Database Schema & Migrations

TimeSwap migrations reside in `supabase/migrations/` and must be applied in sequential order:

```text
supabase/migrations/
├── 20261020000001_initial_schema.sql
├── 20261020000002_rls_policies.sql
├── 20261020000003_auth_welcome_credits_trigger.sql
├── 20261020000004_profiles_and_onboarding.sql
├── 20261020000005_session_booking_and_credit_escrow.sql
├── 20261020000006_realtime_messaging_and_notifications.sql
└── 20261020000007_security_hardening.sql
```

### Migration Summary

1. **`20261020000001_initial_schema.sql`:** Creates core tables (`profiles`, `skills`, `member_skills`, `availability_slots`, `sessions`, `credit_wallets`, `credit_ledger`, `reviews`), defines duration/cost constraints, and seeds 15 foundational skills.
2. **`20261020000002_rls_policies.sql`:** Establishes granular Row Level Security (RLS) policies ensuring users cannot view or manipulate other users' wallets, private sessions, notifications, or messages.
3. **`20261020000003_auth_welcome_credits_trigger.sql`:** Attaches triggers to `auth.users` to automatically provision a profile and grant 3 welcome credits upon verified email confirmation.
4. **`20261020000004_profiles_and_onboarding.sql`:** Adds onboarding state tracking (`onboarding_step`, `onboarding_completed`), biography length constraints, and timezone defaults.
5. **`20261020000005_session_booking_and_credit_escrow.sql`:** Implements core transactional stored procedures: `create_session_request`, `accept_session_request`, `decline_session_request`, `cancel_session`, `confirm_session_completion`, `expire_session_request`, and `flag_unresolved_sessions`.
6. **`20261020000006_realtime_messaging_and_notifications.sql`:** Implements `conversations`, `conversation_members`, `messages`, and in-app notifications. Adds tables to `supabase_realtime` publication with `REPLICA IDENTITY FULL`.
7. **`20261020000007_security_hardening.sql`:** Phase 5A security hardening:
   - **SEC-01:** Caller authorization and database-authoritative deadline validation for session expiry.
   - **SEC-02:** Eliminates untrusted client availability flags in cancellations; evaluates database availability records.
   - **SEC-03:** Attaches trigger preventing client forgery of profile hours, ratings, or review counts.
   - **SEC-04:** Revokes execution grants on batch worker routines from public and authenticated users.
   - **SEC-05:** Prevents 72-hour auto-settlement; safely preserves unresolved escrow in place.
   - **SEC-06:** Handle collision recovery trigger avoiding transaction aborts during sign-up.

---

## Quality Assurance & Testing

TimeSwap includes a comprehensive, multi-phase automated test harness testing database constraints, auth triggers, escrow mechanics, RLS policies, PWA compliance, and browser runtime stability.

### Test Suite Matrix

| Test Suite | File | Verified Assertions | Scope |
|---|---|:---:|---|
| **Phase 1** | [`tests/test-db-phase1.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-db-phase1.mjs) | **27 / 27** | Integer credits, ledger immutability, RLS isolation, welcome grant. |
| **Phase 2** | [`tests/test-phase2.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase2.mjs) | **23 / 23** | Auth lifecycle, onboarding wizard persistence, password reset. |
| **Phase 3** | [`tests/test-phase3.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase3.mjs) | **39 / 39** | Booking escrow, 2h cancellation policy, bilateral confirmation, reviews. |
| **Phase 4** | [`tests/test-phase4.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase4.mjs) | **40 / 40** | Realtime messaging, notification delivery, unread counters, offline feeds. |
| **Phase 5A** | [`tests/test-phase5a.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-phase5a.mjs) | **27 / 27** | SEC-01..06 security hardening, trigger protection, worker revocations. |
| **Phase 5C** | [`tests/test-scheduled-maintenance.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-scheduled-maintenance.mjs) | **39 / 39** | Cron sweep simulation, idempotency, concurrent execution without deadlock. |
| **Phase 5D** | [`tests/test-pwa.mjs`](file:///home/manoj/Developer/timeswap_/tests/test-pwa.mjs) | **44 / 44** | W3C manifest, PNG magic bytes, service worker security, offline fallback. |
| **Total** | `npm test` | **239 / 239** | **100% passing across all 7 test suites.** |

### Running Tests

```bash
# Run the complete automated test suite (all 239 assertions)
npm test

# Run individual test suites
npm run test:db             # Phase 1 database & ledger tests
npm run test:phase2         # Phase 2 auth & onboarding tests
npm run test:phase3         # Phase 3 booking & credit escrow tests
npm run test:phase4         # Phase 4 realtime messaging tests
npm run test:phase5a        # Phase 5A security hardening tests
npm run test:maintenance   # Scheduled maintenance & cron sweep tests
npm run test:pwa           # PWA manifest, service worker & icon tests

# Run headless Chromium browser runtime audit (13 routes)
npm run test:browser

# Run TypeScript type check
npx tsc --noEmit

# Run Next.js production build
npm run build
```

---

## Progressive Web App (PWA)

TimeSwap is fully configured as an installable Progressive Web App adhering to W3C standards.

### Installation Support

- **Chromium / Android:** Install prompt triggered via native web app manifest with standalone display mode.
- **iOS / Safari:** Supports "Add to Home Screen" with pre-configured `apple-touch-icon.png` (180x180) and `appleWebApp: { capable: true }`.
- **Desktop (Chrome/Edge/macOS):** Installable directly from the browser address bar icon.

### Security & Caching Strategy

The production service worker ([`public/sw.js`](file:///home/manoj/Developer/timeswap_/public/sw.js)) guarantees financial ledger integrity:

1. **Non-GET Bypass:** All `POST`, `PUT`, `PATCH`, and `DELETE` requests bypass service worker caching.
2. **Supabase API Bypass:** All requests targeting `*.supabase.co` or Supabase REST/Auth endpoints are network-only. Stale balances, private conversations, and tokens are never written to unencrypted browser storage.
3. **Immutable Asset Caching:** Content-hashed Next.js chunks (`/_next/static/*`) are cached using a Cache-first strategy for fast subsequent loads.
4. **Navigation Fallback:** Page navigation requests execute network-first. If the network is unreachable, the service worker renders the pre-cached `/offline` shell.

### Safe Offline Fallback

The `/offline` fallback page clearly discloses that transactions, booking requests, and messaging are paused until connectivity is restored. No operations are falsely queued offline, avoiding duplicate escrow debits or out-of-sync booking calendars.

---

## Production Deployment (Vercel)

TimeSwap is optimized for deployment on the [Vercel](https://vercel.com/) platform.

### Vercel Project Setup

1. **Import Git Repository:**
   Connect your GitHub account to Vercel and import `https://github.com/manoj-9899/timeswap_.git`.
2. **Project Settings:**
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `next build` (or `npm run build`)
   - **Output Directory:** `.next`
3. **Configure Environment Variables in Vercel:**
   Under **Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Ensure this is marked as **Secret / Server-Only**)
   - `NEXT_PUBLIC_APP_URL` (Set to your Vercel deployment URL, e.g. `https://timeswap.vercel.app`)

### Supabase Authentication URL Configuration

Once your Vercel production domain is assigned, navigate to your **Supabase Dashboard > Authentication > URL Configuration**:

1. **Site URL:** Set to `https://<your-project>.vercel.app`.
2. **Redirect URLs (Allow list):** Add the following redirect patterns:
   ```text
   https://<your-project>.vercel.app/**
   https://<your-project>-*.vercel.app/**
   https://*.vercel.app/**
   http://localhost:3000/**
   ```

---

## Security Architecture

- **Row Level Security (RLS):** Every query executed by the public browser client runs under PostgreSQL RLS. A user can only view their own notifications, unread counters, and private conversations.
- **Trigger-Enforced Immutability:** Direct `UPDATE` or `DELETE` statements on `public.credit_ledger` trigger an immediate exception (`trg_credit_ledger_immutability`). Credit history is strictly append-only.
- **Reputation Anti-Tampering:** Profile hours and ratings cannot be modified via standard client updates (`trg_protect_profile_reputation`). Only trusted completion RPCs can modify reputation metrics.
- **Worker Execution Boundary:** Background sweep routines (`expire_pending_requests`, `flag_unresolved_sessions`) have had their execution permissions revoked from `PUBLIC`, `anon`, and `authenticated` roles (SEC-04).
- **Zero-Secret Client Bundles:** Audited Next.js webpack output verifies that `SUPABASE_SERVICE_ROLE_KEY` and other sensitive environment variables are strictly omitted from browser JavaScript bundles.

---

## Roadmap & Limitations

### Implemented Capabilities
- [x] Full Next.js 14 App Router responsive architecture.
- [x] Integer-only credit economy (1, 2, 3 whole credits).
- [x] 3 welcome credits on verified email.
- [x] Atomic session booking with credit escrow.
- [x] Authoritative 2-hour cancellation policy.
- [x] Bilateral completion confirmation and mutual reviews.
- [x] Persistent Supabase Realtime direct messaging and notifications.
- [x] Phase 5A security hardening (SEC-01 through SEC-06).
- [x] Installable PWA with offline fallback and responsive maskable icons.
- [x] 239 passing automated regression test assertions.

### Known Limitations & Planned Enhancements
- **Scheduled Maintenance Daemon:** Database functions [`expire_pending_requests`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql#L818) and [`flag_unresolved_sessions`](file:///home/manoj/Developer/timeswap_/supabase/migrations/20261020000005_session_booking_and_credit_escrow.sql#L769) are tested and ready. Activation on hosted Supabase via `pg_cron` (Migration 8) awaits administrative deployment.
- **Custom SMTP Provider:** Supabase default email limits apply. For high-volume production, configure custom SMTP in Supabase Auth settings.
- **Video Call Integration:** In-person or third-party meeting links (e.g., Jitsi / Zoom / Google Meet) are currently shared via session chat notes. Direct WebRTC room embedding is planned for a future release.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork or Branch:** Create a feature branch (`git checkout -b feature/my-feature`).
2. **Install Dependencies:** Run `npm install`.
3. **Make Focused Changes:** Adhere to existing TypeScript, Tailwind CSS, and SQL conventions.
4. **Run Verification:** Ensure all test suites and the production build pass before opening a PR:
   ```bash
   npm test
   npm run test:browser
   npm run build
   ```
5. **Submit a Pull Request:** Open a PR against `main` describing your changes and test verification results.

---

## License

This project is licensed under the **ISC License**. See [`package.json`](file:///home/manoj/Developer/timeswap_/package.json) for details.

---

## Author & Acknowledgments

- **Author:** Manoj ([mp2838946@gmail.com](mailto:mp2838946@gmail.com))
- **Repository:** [https://github.com/manoj-9899/timeswap_.git](https://github.com/manoj-9899/timeswap_.git)
- **Community:** Developed for the TimeSwap reciprocal skill learning and mentorship community.
