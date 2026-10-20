# DESIGN.md — TimeSwap Design System & Art Direction

## Phase 0: Brief
- **Subject:** TimeSwap — Peer-to-peer skill-learning and time-credit exchange platform.
- **Core Mechanism:** 1 hour taught = 1 time credit earned; 1 hour learned = 1 time credit spent. Non-cash, peer-to-peer barter not required (credit earned with member A can be spent with member B). Two-participant completion confirmation releases the credit.
- **Audience:** Lifelong learners, designers, programmers, craftspeople, linguists, writers, musicians, and thinkers seeking high-trust knowledge exchange without financial friction.
- **Job:** Enable members to discover skills, book sessions, request exchanges, manage 2-way completion workflows, track time credits, communicate, and build reputation.
- **Visual Direction:** Strictly light theme. Grounded, warm, editorial, tactile, human, and design-conscious. No dark theme anywhere.

---

## Phase 1: Concept — "Equilibrium: The Reciprocal Balance"

### Concept Card
- **Idea:** Human time and curiosity are reciprocal: 1 hour given is 1 hour received, balanced through a community ledger of living hours.
- **Metaphor:** The Reciprocal Balance / Precision Daylight Scale: knowledge exchanged weight-for-weight in living hours.
- **Signature:** The Interactive Equilibrium Exchange Dial: a tactile kinetic widget in the hero and wallet demonstrating live reciprocal credits (30m / 60m / 90m) and the two-way completion lock.
- **Emotion:** Warm, grounded, intellectually generous, delightfully tactile, and trustworthy.
- **Motion verb:** "Settle and balance" — weighted, crisp, finding exact level with gentle harmonic dampening (power3.out / elastic ease).
- **Screenshot:** The split-hero displaying the interactive Reciprocal Exchange Dial alongside authentic member exchange cards, floating time badges, and editorial display typography.

### Genericness Test
- *Would a generic SaaS template land here?* No. Generic SaaS platforms use purple gradients, dark hero sections, 3 identical pricing cards, and generic dashboard widgets. TimeSwap uses a bespoke alabaster-and-forest palette, an editorial type scale, physical time-credit mechanics, custom session-completion stages with 2-way verification, and an interactive exchange dial.

---

## Phase 2: Art Direction System

### Palette Roles
| Role | Hex | Usage |
|---|---|---|
| Ground | `#FAF9F6` | Primary page canvas |
| Surface | `#FFFFFF` | Cards, active panels, elevated sheets |
| Surface Subtle | `#F1F3EC` | Secondary containers, filters, active states |
| Ink | `#242922` | Primary headlines, dark text, high contrast |
| Ink Muted | `#6E746B` | Secondary copy, metadata, timestamps |
| Line | `#E6E7DF` | Hairline borders, dividers, subtle grids |
| Brand Green | `#347A5C` | Primary actions, credits earned, active badges |
| Deep Green | `#255640` | Focused text, brand emphasis, hero anchors |
| Soft Green | `#E4F0E6` | Badges, success backdrops, credit pill grounds |
| Warm Peach | `#F5E2D4` | Accent highlight, learning tags, warm human touches |
| Muted Yellow | `#F2E7BE` | Attention callouts, pending status, warm glow |
| Error | `#B84242` | Validation alerts, cancellation states |

### Typography Scale
- **Display Serif / Editorial Accent:** Newsreader / Instrument Serif styling for emotional hooks and hero headlines.
- **Interface Sans:** Plus Jakarta Sans / Inter for readable, precise UI elements, tables, forms, and data.
- **Type Scale:**
  - Hero: `clamp(2.75rem, 5.5vw, 4.5rem)` / leading 1.05 / tracking -0.035em
  - Title 1 (H1/H2): `2.25rem` (36px) / leading 1.15 / tracking -0.025em
  - Title 2 (H3): `1.5rem` (24px) / leading 1.25 / tracking -0.02em
  - Title 3 (H4): `1.125rem` (18px) / leading 1.35 / font-semibold
  - Body: `1rem` (16px) / leading 1.55 / font-normal
  - Small / UI: `0.875rem` (14px) / leading 1.45 / font-medium
  - Micro / Meta: `0.75rem` (12px) / leading 1.3 / tracking +0.02em / uppercase or bold

### Grid, Rhythm & Radii
- **Base Grid:** 8pt grid with 12-column responsive layout (16px gutter mobile, 24px tablet, 32px desktop).
- **Radius System:** Single coherent scale:
  - Tags / chips: `9999px` (pill)
  - Interactive buttons / inputs: `12px`
  - Cards & containers: `16px`
  - Large modal dialogs / hero stages: `24px`
- **Elevation:** Restrained, warm shadows:
  - Card: `0 1px 3px rgba(36,41,34, 0.04), 0 4px 12px rgba(36,41,34, 0.03)`
  - Floating / Dropdown: `0 4px 20px rgba(36,41,34, 0.08), 0 1px 4px rgba(36,41,34, 0.04)`

### Motion Language
- **Verb:** "Settle and balance"
- **Eases:**
  - Standard: `cubic-bezier(0.16, 1, 0.3, 1)` (expo out)
  - Settle / Elastic: `cubic-bezier(0.34, 1.3, 0.64, 1)`
- **Durations:**
  - Micro (press, hover, pill toggle): 150ms – 220ms
  - Transitions (modal open, tab switch, filter reveal): 280ms – 360ms
  - Credit Counter & Balance Settle: 500ms – 800ms with smooth numeric tick
- **prefers-reduced-motion:** All transitions instantly resolve to opacity / crisp state swap without spatial displacement.

---

## Phase 3: Route Inventory & Composition
1. `/` — Public Landing Page (Hero with Interactive Exchange Dial, 3-Step Process, Skill Showcase, Community Carousel, Credit Anatomy, FAQs, Conversion CTA, Footer)
2. `/auth/signin` — Sign In with demo credentials & instant one-click sample accounts
3. `/auth/signup` — Sign Up with role and initial skill selection
4. `/auth/forgot-password` — Password recovery flow with simulated email confirmation
5. `/onboarding` — 6-Step guided onboarding with avatar upload, teaching skills, learning interests, weekly availability, timezone, and live preview
6. `/dashboard` — Member hub with balance ticker, upcoming sessions, pending confirmations, recent activity, quick swap CTA, and new-user welcome banner
7. `/discover` — Member & Skill marketplace with full-text search, category pills, availability filter, proficiency filter, sorting, and responsive member cards
8. `/members/[id]` — Deep member profile with bio, skills offered/wanted, verified hours exchanged, teaching reviews, availability matrix, and session request launcher
9. `/sessions` — Session management hub (Upcoming, Pending, Completed, Cancelled) with action drawer, reschedule, and cancel dialogs
10. `/sessions/[id]/complete` — Dedicated 2-participant completion room: teacher and learner checklist, satisfaction notes, time credit release lock
11. `/wallet` — Time-credit ledger with available balance, total hours taught/learned, transaction audit log, and filterable credit movements
12. `/messages` — Real-time simulated messaging with conversation list, search, active chat bubbles, session proposal attachments, and instant replies
13. `/notifications` — Notification center for session requests, credit transfers, reminders, and updates with mark-as-read
14. `/profile` — Self-profile editor with live preview, avatar selection, skills taught/wanted editor, and availability planner
15. `/settings` — Account preferences, privacy controls, notification toggles, calendar sync simulation, light-theme compliance
16. `/saved` — Saved mentors and skills bookmarking list
17. `/help` — Knowledge base, community guidelines, FAQ search, and support contact
18. `/404` — Designed 404 page with "Hour Not Found" reciprocal clock and return link
