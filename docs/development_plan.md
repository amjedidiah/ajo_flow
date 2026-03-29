# Development Plan

This plan is designed for an **AI-Assisted Workflow** (Claude Code).
The goal is to let the AI handle boilerplate and scaffolding while I act as the **Architect and Reviewer**.

The build window is **5 days: March 23–27, 2026**. Judges evaluate primarily on (1) Interswitch API depth and (2) AI integration quality — not auth, not polish. Time is structured accordingly.

> **Tooling note:** This project uses **[Bun](https://bun.sh)** as the runtime and package manager across the entire repo (server and client). Use `bun install`, `bun run dev`, etc. everywhere — do not use `npm`, `yarn`, or `npx`. Bun runs TypeScript natively so there is no need for `ts-node`, `ts-node-dev`, or a separate build step during development.

---

## Phase 1 — Foundation & Data Layer (Day 1, March 9)

> Goal: Get the server running, schemas defined, the frontend shell visible, and the AI Trust Agent returning mock scores. Everything built today is the "plumbing" that Days 2–4 plug into.

### 1.1. Cursor Rules + CLAUDE.md (Done)

- [x] Create `CLAUDE.md` and Cursor rules so both tools understand the project conventions from prompt one.

### 1.2. Repo & Project Structure

- [x] Create two directories at the root: `client/` (Next.js) and `server/` (Node/Express).
- [x] Initialize each with its own `package.json`. Use a root `package.json` with `workspaces` or just `cd` scripts — keep it simple.

**Recommended server folder layout:**

```bash
server/
  src/
    models/         ← Mongoose schemas
    routes/         ← Express routers
    services/       ← Interswitch, AI, cron logic
    middleware/     ← auth JWT verification
    index.ts        ← entry point
  .env
```

**Recommended client folder layout:**

```bash
client/
  app/
    layout.tsx          ← html/body/fonts only — no Navbar
    (auth)/             ← login, register — minimal layout, no Navbar
    (public)/           ← Navbar, no auth gate — marketing page, pod detail
    (protected)/        ← Navbar + auth guard — dashboard, manage, payment/return
  components/
    ui/                 ← reusable atoms (Button, Card, Badge)
    pods/               ← PodCard, PayoutQueue, TrustBadge
    shared/             ← Navbar, Motion wrapper
  lib/
    api.ts              ← typed fetch helpers (calls Node backend)
    utils.ts
```

> **Note:** The above reflects the final route architecture settled on during Phase 5 refinement. See Phase 5.1 for the full route map and rationale.

### 1.3. Backend: Node/Express + MongoDB

- [x] Initialize TypeScript Node/Express app. Install: `express`, `mongoose`, `dotenv`, `cors`, `jsonwebtoken`, `bcryptjs`, `node-cron`, `axios`.
- [x] Connect to MongoDB Atlas. Store the connection string in `.env` as `MONGODB_URI`.
- [x] Define Mongoose schemas. Use the prompt below and review the output carefully before accepting it.

  > **Prompt (original — schema evolved):** *"Create four Mongoose schemas in TypeScript: `User` (name, email, phone, passwordHash, bankAccountNumber, bankCode), `Pod` (name, contributionAmount, frequency enum['daily','weekly','monthly'], maxMembers, members array of User refs, payoutQueue array of User refs ordered by turn, paidOutMembers, walletId, walletPin, virtualAccount, status enum['active','completed'], currentCycle, contributionTotal, resetCount, createdBy), `Transaction` (pod ref, user ref, amount, status enum['pending','success','failed','manual'], type enum['contribution','disbursement'], interswitchRef, cycleNumber, timestamp), `TrustScore` (user ref, pod ref, score 0-100, reasoning string, riskFlag boolean, evaluatedAt date). Export each model."*

- [x] Add `POST /auth/register` and `POST /auth/login` endpoints that return a signed JWT. Auth hardened with refresh tokens (HttpOnly cookie, 7-day expiry, silent rotation) — see Post-Hackathon section for implementation details.
- [x] Add JWT middleware (`middleware/auth.ts`) that verifies the token and attaches `req.user` to the request.
- [x] Add `POST /api/seed` endpoint that drops all collections and regenerates deterministic demo data.

  > **Prompt:** *"Create a Mongoose seed script in TypeScript exposed as an Express route `POST /api/seed`. It should: (1) drop and recreate the Users, Pods, Transactions, and TrustScores collections; (2) create 4 users in a pod called 'Lagos Gig Workers Pod — ₦5,000/week'; (3) give User A a perfect payment history (10 on-time, 0 missed); (4) give User B two missed payments; (5) give User C a failed card charge and one late payment; (6) give User D a clean but short history (3 on-time). Generate 50 Transaction documents total across these users. Return a summary of what was created. Guard the route with `x-seed-secret` header matching `SEED_SECRET` from env."*

  This endpoint is the foundation for testing every other phase. Run it before testing the AI agent, the payout queue, or the admin UI.

### 1.4. Frontend: Next.js Scaffold

- [x] Initialize Next.js app with TypeScript, Tailwind CSS, and ESLint inside `client/`. Install: `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`, `axios`.
- [x] Define design tokens in `globals.css`. Use a color palette that conveys **trust and security** — deep navy/blue primary, warm gold accent, clean white background.

  > **Prompt:** *"Define a Tailwind CSS theme extension with semantic color tokens: `brand-primary` (deep navy #1B2A4A), `brand-accent` (warm gold #C9922A), `brand-surface` (off-white #F7F5F2), `brand-text` (near-black #1A1A1A), `brand-muted` (gray #6B7280), `brand-success` (green #16A34A), `brand-danger` (red #DC2626). Export the config."*

- [x] Build the `Navbar` component: transparent on top, solid with shadow on scroll (Framer Motion transition). Include a mobile hamburger drawer.
- [x] Build the `Dashboard` page (`app/dashboard/page.tsx`) with mock data: a grid of `PodCard` components showing pod name, contribution amount, frequency, member count, and "Join" CTA.
  > **Note:** `MOCK_PODS` in `app/dashboard/page.tsx` is a temporary placeholder. Replace it with a real `GET /api/pods` call in Phase 3.3 and delete the constant.
- [x] Build stub `Login` and `Register` pages. Wire them to the Node auth endpoints. Access token stored in-memory (`lib/auth.ts` module variable) and attached as `Authorization: Bearer <token>` on all API calls via an Axios instance in `lib/api.ts`. Refresh token handled via HttpOnly cookie.

### 1.5. AI Foundation: Trust Scoring Agent

- [x] On the server, install: `langchain`, `@langchain/deepseek`, `zod`. Sign up at [platform.deepseek.com](https://platform.deepseek.com) for free credits and store the key as `DEEPSEEK_API_KEY` in `.env`.
- [x] Create `server/src/services/trustAgent.ts`.

  > **Prompt:** *"Using LangChain and the DeepSeek V3 model (`@langchain/deepseek`, model: `deepseek-chat`), create a `scoreTrust(userData)` function. It should accept an object with: `userId`, `onTimePayments` (number), `latePayments` (number), `missedPayments` (number), `completedPods` (number), `failedCardCharges` (number). Use a structured output parser (Zod schema) to return `{ score: number (0-100), reasoning: string, riskFlag: boolean }`. The reasoning should explain in one sentence why the score was given. Export the function."*

- [x] Create `POST /api/trust/score` endpoint that accepts mock user data and returns the AI score. Test it manually with Postman/curl before wiring it to the database.

---

## Phase 2 — The Pay-In Engine (Day 2, March 10)

> Goal: A user can join a pod, enter card details via Interswitch WebPAY, and the server records a successful contribution in MongoDB when the Interswitch webhook fires.

### 2.1. Interswitch WebPAY Integration

- [x] Read the Interswitch WebPAY tokenization docs fully before writing any code. Identify the correct endpoints for the test environment.
- [x] Store Interswitch credentials in `.env`: `INTERSWITCH_CLIENT_ID`, `INTERSWITCH_SECRET`, `INTERSWITCH_BASE_URL` (sandbox URL).
- [x] Create `server/src/services/interswitch.ts` — a thin wrapper around the Interswitch API.

  > **Prompt (original — API surface evolved):** Actual `interswitch.ts` exports: `getAccessToken()` (OAuth2 client credentials, cached), `createWallet()` (Merchant Wallet for pods), `getWalletBalance()`, `disburseFunds()` (wallet debit for payouts), `creditWalletViaCallback()` (sandbox virtual account funding simulation), `requeryTransaction()` (transaction status re-query for timeout recovery), `generateReference()` (collision-safe unique refs). All calls have 15s axios timeouts.

- [x] Create `POST /api/payments/join` and `POST /api/payments/contribute` routes:
  1. Validate the user is authenticated (JWT middleware).
  2. Validate the pod exists, has capacity (join), or user is a member (contribute).
  3. Delegate to `recordContribution()` — handles cycle cap, duplicate guard, smart cycle assignment.
  4. Credit wallet via `creditWalletViaCallback()` (sandbox virtual account funding).

### 2.2. Webhook Receiver

This is critical — the webhook is how Interswitch tells your server a payment succeeded. It must be on a public URL on Day 2 (use ngrok locally, deploy to Render by Day 5).

- [x] Create `POST /api/webhooks/interswitch` endpoint.
  - Verify the webhook signature/secret from Interswitch headers.
  - On success: find the matching `Transaction`, set status to `'success'`, update the pod's `contributionTotal`.
  - On failure: set Transaction status to `'failed'`, trigger a re-attempt notification (log it for now).

  > **Prompt:** *"Create an Express webhook handler for Interswitch payment notifications. It should: (1) verify the `x-interswitch-signature` header matches an HMAC-SHA512 of the raw request body using `INTERSWITCH_WEBHOOK_SECRET` from env; (2) if valid, find the Transaction by `transactionRef`, update its status to 'success' or 'failed'; (3) if success, call a `creditWallet(podId, amount)` stub function (we'll implement this in Phase 3); (4) return 200 immediately regardless of processing outcome to acknowledge receipt."*

### 2.3. "Join Pod" UI Flow

- [x] Build the `JoinPodModal` component. It should:
  1. Show the pod details (amount, frequency, next debit date).
  2. Include a clearly visible **"Sandbox Test Card"** collapsible section (open by default) displaying the Interswitch sandbox test card details: Card Number, PIN, CVV, and OTP. Judges will be on this screen trying to make a payment — they must not have to look anywhere else.
  3. On confirm, call `POST /api/payments/join` (with optional `cycles` for pre-payment).
  4. Shows virtual account transfer details on success — no WebPAY redirect in current flow (sandbox uses virtual account callback for funding).

### 2.4. Manual Payment Option

Not all users will want to automate card debits. Support a manual contribution path alongside WebPAY.

- [x] Add `POST /api/payments/manual` endpoint (pod-admin only). It records a contribution for a specified member without calling Interswitch — useful for cash or bank-transfer payers. It creates a `Transaction` record with `status: 'manual'` and calls `creditWallet()` directly.
- [x] Add a simple "Record Manual Payment" form in the Admin View: select member, enter amount, confirm. This also lets judges simulate contributions instantly during the demo without needing test cards.

### 2.5. Cron Job: Scheduled Deductions

- [x] Create `server/src/services/cronJobs.ts`. Use `node-cron` to schedule a daily job at 08:00 WAT.
  - The job queries all active pods for members whose deduction is due today.
  - For each due member, it would call a server-initiated charge using a saved card token (requires card-on-file tokenization — see Post-Hackathon: Automated Recurring Deductions).
  - **Note:** Automated card debits are deferred. The current contribution flow is user-initiated (`POST /api/payments/join` and `POST /api/payments/contribute`) or admin-recorded (`POST /api/payments/manual`). The cron infrastructure (`node-cron`) is installed but the deduction endpoint is not implemented.

---

## Phase 3 — Wallet & The Pay-Out Engine (Day 3, March 11)

> Goal: Pooled funds live in an Interswitch Wallet (not anyone's bank account), and the payout logic routes the lump sum to the correct recipient.

### 3.1. Interswitch Wallet Integration

- [x] Read the Interswitch Wallet API docs. Identify the endpoint for creating a wallet and crediting it.
- [x] Add to `interswitch.ts`:
  - `createWallet(options)` — called when a new pod is created. Accepts pod name, creator details, and PIN. Stores the returned wallet ID and virtual account on the `Pod` document.
  - `creditWallet(podId, amount, transactionRef?)` — in `wallet.ts`, increments the DB ledger (`contributionTotal`) and best-effort credits the Interswitch wallet via `creditWalletViaCallback()`. Returns the Interswitch payment reference for reconciliation.
  - `getWalletBalance(walletId)` — used to display the live pooled amount on the Pod Admin View.

### 3.2. Interswitch Disbursement Integration

- [x] Add to `interswitch.ts`:
  - `disburseFunds(walletId, amount, reference, pin, narration?)` — debits the pod's merchant wallet via the Merchant Wallet transact endpoint. The recipient's bank details are resolved from the User document in `payoutService`.

- [x] Create the core payout function `server/src/services/payoutService.ts`.

  > **Design decision — shortfall policy:** `payoutService` blocks disbursement if `wallet balance < net payout amount`. **Debt carry-forward is implemented:** if the recipient missed prior cycles, their payout is reduced by `missedCycles × contributionAmount`. Net payout = `max(0, gross - debt)`. If net is ₦0, disbursement is skipped but the queue still advances. The grace period path (3-day retry window before a charge is treated as missed) is deferred to post-hackathon.

- [x] Create `POST /api/pods/:id/payout` endpoint (admin-only). For the demo, this endpoint manually triggers a payout — judges can click a button in the admin UI to see it fire live.

### 3.3. Admin / Pod View UI

This view is a key demo screen. The judges need to *see* the pool working.

- [x] Build `app/pods/[id]/page.tsx` — the **Pod Detail View** visible to all members:
  - Pod name, frequency, contribution amount.
  - A progress bar: "₦X pooled of ₦Y total cycle goal."
  - **Member wallet visibility** — `GET /api/pods/:id/wallet-balance` opened to all members (membership check). Rendered via `WalletBalanceWidget` client component — silently hidden for non-members and when no wallet is provisioned.
  - **Transparent payout queue** — rendered via `PodPayoutQueue` client component using `TrustScoreCard`. AI reasoning shown inline per member; "Moved by AI" amber banner when applicable.
  - Each member row shows their animated Trust Score ring (color-coded: green ≥ 75, yellow 50–74, red < 50).
  - **Contribution ledger per member** — `GET /api/pods/:id/my-contributions` + `MyContributions` client component. Silently hidden for non-members and users with no history.
  - A **"Tax Shield Active"** banner.

- [x] Wire `app/dashboard/page.tsx` to the real API.

- [x] Build the **Admin View** at `app/(protected)/my-pods/[id]/manage/page.tsx` — renders `AdminPodClient` component (visible only to the pod creator):
  - Everything in the Pod Detail View, plus:
  - A "Trigger Payout" button that calls `POST /api/pods/:id/payout`.
  - A "Run AI Evaluation" button that calls `POST /api/pods/:id/evaluate` (with 60s cooldown).
  - A "Record Manual Payment" form (select member, select cycle).
  - A "Start New Rotation" button (only when pod is completed — calls `POST /api/pods/:id/reset`).
  - Live wallet balance with provision button via `WalletBalanceWidget`.
  - Contribution matrix via `ContributionMatrix` component.

---

## Phase 4 — AI Orchestration (Day 4, March 12)

> Goal: The AI Trust Agent connects to real data and dynamically reorders the payout queue. This is the "Wow Factor" — the UI must visually show the AI's decision and its reasoning.

### 4.1. `evaluateAndReorderQueue(podId)`

This is the most important function in the entire application.

- [x] Create `server/src/services/queueService.ts` with `evaluateAndReorderQueue(podId)`. Scores all members via the AI Trust Agent, upserts `TrustScore` documents, reorders the payout queue (score < 50 → moved to end), returns `{ pod, trustScores[] }` with a `movedByAI` flag per member.

- [x] Create `POST /api/pods/:id/evaluate` endpoint (admin-only) that calls `evaluateAndReorderQueue()` and returns the updated pod with trust score details.

### 4.2. UI: The AI Decision Explainer

This is what the judges will remember. Don't skip it.

- [x] Built `TrustScoreCard` component — animated SVG score ring (Framer Motion, colour-coded), inline "AI Note:" reasoning callout, amber "Moved to end of queue by AI Trust Agent" banner when `movedByAI`. Uses `Motion` wrapper component (`as="circle"` — SVG support added to `Motion.tsx`).

- [x] Admin View payout queue replaced with `AnimatePresence` + `motion.li layout` — members animate to new positions when "Run AI Evaluation" fires. Trust scores stored in state and passed to each `TrustScoreCard`.

- [x] **Pod activity feed** — `GET /api/pods/:id/activity` merges `Transaction` + `TrustScore` events into a chronological feed. `ActivityFeed` client component renders each event with a colour-coded icon and relative timestamp. Wired into the Pod Detail View.

### 4.3. Real-Time Queue Updates (Stretch Goal)

- [x] 15-second polling interval on Admin View — `useEffect` + `setInterval` refetches `GET /api/pods/:id` and calls `setPod`. Payout queue header shows a green pulsing "Live" indicator.

---

## Phase 5 — Polish, Test & Deploy (Day 5, March 13)

> Goal: A working, publicly accessible MVP that judges can click through. Ensure the demo scenario works reliably end-to-end.

### 5.0. Dashboard QuickStats

Two stat panels above the pod grid — the first thing judges see when they land on the dashboard.

- [x] **Platform QuickStats** (server-rendered, public) — 4-stat row: Active Pods, Total Members, Total ₦ Pooled, Payouts Made. Backend: `GET /api/stats` — aggregates across all pods and transactions. Fetched server-side in `(public)/pods/page.tsx` and rendered above the pod browser. No auth required.

- [x] **User QuickStats** (client component, logged-in only) — 3-stat row: My Pods, Trust Score (AI-powered, colour-coded), Next Payout (pod name + queue position). Backend: `GET /api/stats/me` — authenticated. Rendered via `UserQuickStats` component on `/dashboard`. Silently hides when not logged in. The trust score on the dashboard is a key AI visibility moment — judges see AI output before they even click into a pod.

### 5.1. Route Architecture & Dashboard Refinement

> This phase was not in the original hackathon plan but emerged as the codebase matured. Goal: harden the server's access control, establish a clean public/protected route split on the client, and build the real authenticated dashboard experience.

#### Server — Access Control Hardening (done)

- [x] `GET /api/pods/:id/activity` — locked to authenticated pod members only (`401` without JWT, `403` if not a member). Financial behaviour data is not public.
- [x] `GET /api/pods/:id/trust-scores` — same as above. AI reasoning and risk flags are member-only.

#### Server — Additional endpoints implemented beyond original plan (done)

- [x] `POST /api/pods/:id/reset` — admin-only. Resets a completed pod for a new rotation cycle: clears payout queue, re-adds all members, resets `currentCycle` and `status` to `active`.
- [x] `POST /api/pods/:id/provision-wallet` — admin-only. Retries Interswitch wallet creation for pods where initial provisioning failed (e.g. sandbox rate limits). Stores returned wallet ID on the Pod document.
- [x] `GET /api/pods/:id/payout-history` — public. Returns all disbursement transactions for a pod in reverse-chronological order.
- [x] `GET /api/pods/:id/contribution-matrix` — admin-only. Returns a member × cycle payment matrix showing each member's payment status per contribution cycle.

#### Server — `GET /api/pods?member=true` (done)

- [x] Update `GET /api/pods` to accept an optional `?member=true` query param.
  - Without param: existing behaviour — returns all active pods (public, no auth).
  - With `?member=true`: requires JWT, filters to pods where `members` array includes the caller's user ID. This covers both pods the user created (creator is always added to `members`) and pods they joined. Returns `401` if JWT is missing when param is present.
  - Chosen over a `/api/pods/mine` sub-resource: query params are the correct REST pattern for filtering a collection; a named path segment like `mine` isn't a resource identifier and causes router ordering issues with `/:id`.

#### Client — Route Groups (done)

Three route groups with distinct layouts. `<Navbar />` is mounted in root `layout.tsx` (applies everywhere); `(auth)/layout.tsx` overrides with a bare shell (no Navbar) for login/register.

```bash
app/
├── layout.tsx                              ← html/body/fonts + Navbar (global)
├── (auth)/
│   ├── layout.tsx                          ← bare shell, hides Navbar for auth pages
│   ├── login/page.tsx                      ← /login
│   └── register/page.tsx                   ← /register
├── (public)/                               ← no layout.tsx; Navbar from root
│   ├── page.tsx                            ← / (marketing + featured pods)
│   └── pods/
│       ├── page.tsx                        ← /pods  (public pod browser + platform stats)
│       └── [id]/
│           ├── page.tsx                    ← /pods/[id]  (public pod detail)
│           ├── loading.tsx
│           └── error.tsx
└── (protected)/
    ├── layout.tsx                          ← auth gate (redirects to /login if no token)
    ├── dashboard/
    │   └── page.tsx                        ← /dashboard  (hub: links to /pods and /my-pods)
    ├── my-pods/
    │   ├── page.tsx                        ← /my-pods  (user's pods list)
    │   └── [id]/
    │       ├── page.tsx                    ← /my-pods/[id]  (member pod detail)
    │       ├── loading.tsx / error.tsx
    │       └── manage/
    │           ├── page.tsx                ← /my-pods/[id]/manage  (admin view)
    │           ├── loading.tsx / error.tsx
    └── payment/
        └── return/page.tsx                 ← /payment/return
```

- [x] `(auth)/layout.tsx` — bare shell (no Navbar).
- [x] `(protected)/layout.tsx` — now a plain server component (no `"use client"`, no `useAuth`). Auth gate handled by Next.js Edge middleware (`client/middleware.ts`) which checks for the `refresh_token` cookie and redirects to `/login?next=<path>` if absent.
- [x] Marketing page at `(public)/page.tsx`. Pod detail at `(public)/pods/[id]/`.
- [x] Dashboard, my-pods, and payment/return in `(protected)/`.
- [x] Removed intermediate `(dashboard)/` group.

#### Client — Marketing Page `/` (done)

- [x] Hero section with value proposition.
- [x] Curated selection of active pods fetched server-side and rendered via `PodCard`.
- [x] Join CTA redirect for unauthenticated visitors — `PodCard` links to `/pods/[id]` (the public detail page); `JoinButton` on that page passes `?next=/pods/:id` to `/login`. `LoginForm` and `RegisterForm` both read the `next` param and redirect after auth. `next` is used consistently (not `redirect`) across all touch points. The marketing page pod cards take one extra hop via the detail page, which is the correct UX.

#### Client — Dashboard & Pod Pages (protected/public)

The dashboard evolved into a **hub page** that links out to two dedicated pages rather than embedding both pod lists inline.

- [x] `/dashboard` — hub with `UserQuickStats` at top, two link cards: "Browse Pods" (`/pods`) and "My Pods" (`/my-pods`).
- [x] `/my-pods` — protected page rendering `MyPods` component; calls `GET /api/pods?member=true`. Shows "Manage →" link (`/my-pods/[id]/manage`) for pods where `pod.createdBy === user.id`.
- [x] `/pods` — public pod browser page rendering `PodBrowser` component; calls `GET /api/pods`. Includes:
  - [x] Text search by pod name (client-side filter)
  - [x] Filter by frequency: All / Daily / Weekly / Monthly
  - [x] Filter by availability: "Open spots only" toggle (`members.length < maxMembers`)
  - [x] Filter by contribution amount: range presets (≤ ₦5k / ₦5k–₦20k / ₦20k+) — rendered as pill buttons alongside the frequency filter, using `brand-accent` active state to distinguish from frequency pills
- [x] **Create Pod dialog** — `CreatePodModal` component opened from `PodBrowser`. Form fields: pod name, contribution amount, frequency, max members. Calls `POST /api/pods`; on success redirects to `/my-pods/[id]/manage`. Unauthenticated visitors clicking "Create Pod" are redirected to `/login?next=/pods`.
  - Server: `POST /api/pods` — authenticated. Creates Pod document with creator pre-added to `members` and `payoutQueue`, calls `createWallet(podId)`, stores returned wallet ID on pod. Creator has full member + admin access immediately without needing to pay first.
- [x] **`PodCard` join button disabled when full** — CTA is now a `<button disabled>` when `isFull`, proper semantic HTML.
- [x] **`JoinButton` post-login redirect** — passes `?next=/pods/:id` to `/login` when unauthenticated. `LoginForm` and `RegisterForm` both read `next` param (standardised from `redirect`).
- [x] **PodPayoutQueue + ActivityFeed gated on `/pods/[id]`** — replaced with `MemberActivitySection` client component. Unauthenticated visitors see a "Member-only content" prompt with a login link; authenticated members see the queue and activity feed.
- [x] **Empty and error states** — `MyPods` shows empty state with "Browse Pods" CTA and an error fallback. `MyContributions` shows "No contributions recorded yet" for authenticated members with no history (distinguished from 403 by checking response status vs empty array).
- [x] **Toast notifications** — `sonner` installed. `AdminPodClient` flash state removed; `LoginForm` and `RegisterForm` inline error `<p>` removed. All three use `toast.success()` / `toast.error()`. `<Toaster>` added to root `layout.tsx`.
- [x] **Pending payment visibility** — `ActivityFeed` includes pending transactions from the server with a Clock icon; `MyContributions` shows pending transactions. User is added to `members` and `payoutQueue` on `POST /api/payments/join` (immediate admission), with contribution recorded via `recordContribution()` in the same request.

### 5.1.6. Pre-Deploy: Business Logic Audit & Quick Fixes

> Complete these before the first deploy commit. Bugs here are visible to judges the moment the app goes live.

- [x] **Business logic end-to-end audit** — traced each core flow (route → service → model → response). All 6 checks pass:
  - ✓ `contributionTotal` on `Pod`: incremented exactly once per `creditWallet()` call. All three payment paths (`/join`, `/contribute`, `/manual`) have duplicate guards (cycle-level check in `contributionService.ts:52-65`, manual duplicate guard in `payments.ts:214-225`). Minor race window on concurrent requests but low practical impact (user-initiated, sequential).
  - ✓ `paidOutMembers` array: `payoutService.ts:162-163` does `payoutQueue.shift()` + `paidOutMembers.push()` on the in-memory doc before a single `save()` — atomic at the document level.
  - ✓ `GET /api/pods?member=true` auth gate: `pods.ts:16-36` manually parses JWT only when `?member=true` is present. Public listing at line 39 returns all active pods with no auth. Note: JWT parsing logic is duplicated from `authenticate` middleware — consider extracting a shared `validateJWT()` utility post-hackathon.
  - ✓ `POST /api/cron/run-deductions`: endpoint does not exist in the codebase — no auth bypass risk. If added in future, use `x-cron-secret` header pattern (see `seed.ts:60-64`).
  - ✓ Zero-score edge case in `queueService.evaluateAndReorderQueue`: AI always returns a valid score (0-100) even with all-zero stats. Members not in the scored array are implicitly classified as safe (`!riskMap.get()` returns `!undefined === true`), which is the correct default. Sorting never produces NaN.
  - ✓ `POST /api/payments/manual` vs webhook: no webhook handler exists — the only credit path is the internal `creditWalletViaCallback()` service call, not an HTTP endpoint. No race condition possible. Manual payment duplicate guard prevents same-cycle double-entry.

- [x] **404 page** — `client/app/not-found.tsx` created. Branded layout with navy/gold design, "Page not found" heading, links to `/pods` (Browse Pods) and `/dashboard`.

- [x] **Wallet provisioning from member view** — extracted `MemberWalletSection` client component (`client/components/pods/MemberWalletSection.tsx`). Both `/my-pods/[id]/page.tsx` and `/pods/[id]/page.tsx` now pass `isAdmin={pod.createdBy === serverUser?.id}` so the pod admin sees the "Provision Wallet" button wherever the widget appears. `AdminPodClient` (manage page) was already correct.

### 5.2. Deploy Backend to Render

- [x] Push `server/` to GitHub. Connect to Render as a new Web Service.
- [x] Set all environment variables in Render's dashboard:
  - `MONGODB_URI`, `JWT_SECRET`, `SEED_SECRET`
  - `DEEPSEEK_API_KEY`
  - `INTERSWITCH_CLIENT_ID`, `INTERSWITCH_SECRET`, `INTERSWITCH_MERCHANT_CODE`, `INTERSWITCH_CALLBACK_TOKEN`
  - `INTERSWITCH_BASE_URL`, `INTERSWITCH_PASSPORT_BASE_URL`, `INTERSWITCH_WALLET_BASE_URL`
  - `CLIENT_URL` (Vercel frontend URL for CORS)

### 5.3. Deploy Frontend to Vercel

- [x] Push `client/` to GitHub. Connect to Vercel.
- [x] Set `NEXT_PUBLIC_API_URL=https://<your-render-url>` in Vercel environment variables.
- [x] Verify that API calls from the production frontend reach the production backend without CORS errors. Update `cors()` origin in `server/src/index.ts` to allow the Vercel domain.

### 5.4. End-to-End Demo Test

Run through the full demo scenario using Interswitch's sandbox test cards before the judges do.

- [x] Register two test users (or use seeded demo users).
- [x] Create a pod.
- [ ] Verify wallet is auto-provisioned and the wallet ID + virtual account are stored on the Pod document. *(Testable: unit test `POST /api/pods` with mocked Interswitch — assert pod doc has `walletId` and `virtualAccount`)*
- [x] Both users join the pod via `POST /api/payments/join`. Verify Transaction records are created with status `'success'`, `contributionTotal` increases
- [ ] Interswitch wallet is credited via virtual account callback by above action *(Not automatable — requires live sandbox callback simulation)*
- [ ] Admin records a manual payment for a member via the Manage page. Verify wallet balance increases. *(Testable: unit test `POST /api/payments/manual` — assert `contributionTotal` increments and `creditWalletViaCallback` is called)*
- [x] Trigger `POST /api/pods/:id/evaluate`. Verify AI scores are generated (with cross-pod platform history), queue is reordered if any user has a low score, and frontend shows reasoning + animated reorder.
- [ ] Trigger `POST /api/pods/:id/payout`. Verify the disbursement API is called, a Transaction record is created, recipient is moved to `paidOutMembers`, and `currentCycle` advances. *(Partially tested in `payoutService.test.ts` — missing: disbursement API call assertion and debt deduction math)*
- [ ] Walk through the Admin View UI and confirm: wallet balance, contribution matrix, payout queue, AI scores, manual payment form, and reset button (on completed pods) all render correctly. *(Testable via Playwright E2E — see Phase 6.6)*

### 5.5. Demo Environment Prep

- [x] Seed the database with a realistic demo pod (e.g., "Lagos Gig Workers Pod — ₦5,000/week, 4 members") with pre-populated transaction history so the AI has real data to evaluate.
- [x] Confirm seed data has one member with intentionally poor history (2 missed payments) so the AI visibly flags and moves them during the demo. *(Testable: seed DB in test, run `POST /api/pods/:id/evaluate` with mocked DeepSeek, assert at least one member has `riskFlag: true`)*
- [x] Prepare a short demo script: Register → Join Pod → Contribute → Admin records manual payment → Admin runs AI Eval → Queue reorders → Admin triggers Payout.

### 5.6. Submission Checklist

The hackathon requires all three of the following to be submitted:

- [x] **GitHub Repository** — must be **public** (or explicitly shared with judges). Every team member must have at least one meaningful commit. Non-technical members (PM, designer) should commit their documentation, design files, or research notes — judges check contribution breadth.
- [x] **Live MVP URL** — hosted on Vercel (frontend) + Render (backend). Must be accessible and testable by judges without setup.
- [x] **README.md** — include: live URL, test credentials for judges, demo walkthrough script, and the sectors addressed: **Payments (P), Social Services (S), Emerging Tech (AI)**. Judges assess sector fit from the README.
  - In the product vision / differentiators section, include the governance model pitch: *"AjoFlow's AI Trust Agent doesn't just score members — it nominates the most trustworthy admin. The pod then ratifies the nomination via a time-boxed majority vote. AI proposes, community decides."* This hits the Emerging Tech (AI) criterion and differentiates from a standard payments app.

**Important rules (from hackathon docs):**

- All code must be built during the hackathon window (March 23–27). Judges will verify via GitHub commit history — no pre-existing codebases.
- Judges review: March 30– April 2. Top 10 teams are invited to Demo Day on April 11 at Interswitch HQ (physical attendance mandatory).

---

## Tech Stack Summary

| Feature | Tool / Library | Why |
| --- | --- | --- |
| **Frontend Framework** | Next.js (App Router) | SEO, server components, easy Vercel deployment |
| **Styling** | Tailwind CSS | Speed and consistency |
| **Animation** | Framer Motion | Queue reorder animation is a judging moment |
| **Icons** | Lucide React | Clean SVG icons |
| **Runtime / Package Manager** | Bun | Runs TypeScript natively, fast installs, replaces ts-node-dev |
| **Backend** | Bun + Express.js | Fast to scaffold, team familiarity |
| **Database** | MongoDB Atlas + Mongoose | Flexible schema for evolving pod/transaction data |
| **Auth** | JWT (`jsonwebtoken`) + HttpOnly refresh cookies | Short-lived access token (15m) in memory + 7-day refresh cookie with silent rotation |
| **Payments** | Interswitch WebPAY, Wallet, Disbursement APIs | Core judging criterion |
| **AI** | LangChain + DeepSeek V3 (`deepseek-chat`) | Trust Scoring Agent, structured output via Zod. |
| **Scheduling** | node-cron | Automated recurring deductions |
| **Deployment** | Vercel (frontend) + Render (backend) | Free tier, fast deploys |

---

## Phase 6 — Demo Day Polish (April 3–10)

> Goal: Tighten the product for Demo Day (April 11, Interswitch HQ). Focus on perceived quality and professionalism — no new core features.

### 6.1. Mobile / Tablet / Laptop Screen Optimization *(highest priority)*

Audit and fix responsive layouts across all pages. Target users are mobile-first; judges may demo on phones.

**Focus areas (in order):**

1. Pod detail page — payout queue, activity feed, contribution data
2. Admin manage page — contribution matrix, action buttons, manual payment form
3. Modals — `JoinPodModal`, `CreatePodModal` (ensure they don't overflow on small viewports)
4. Pod browser grid + dashboard — card layout, filter pills, stat rows

**What to check:**

- Touch targets ≥ 44px on interactive elements
- Tables/matrices scroll horizontally on narrow screens (no layout break)
- Framer Motion animations: reduce or disable heavy layout animations on `prefers-reduced-motion` or viewport < 768px if jank is visible
- Typography scales: headings don't overflow, long pod names truncate

**No new components.** Fix existing Tailwind responsive classes (`sm:`, `md:`, `lg:`) and add `overflow-x-auto` wrappers where needed.

### 6.2. OG Image

Add a static branded Open Graph image so the live URL previews well when shared.

**Implementation:**

- Create `client/app/opengraph-image.tsx` using Next.js `ImageResponse` (from `next/og`)
- Design: navy (`#1B2A4A`) background, gold (`#C9922A`) accent, "AjoFlow" wordmark, tagline "AI-Powered Savings Circles"
- Size: 1200×630px (standard OG)
- Also add `twitter-image.tsx` (can re-export the same image) for Twitter card support

**No per-pod dynamic images.** One static image at the app root is sufficient.

### 6.3. PWA (Thin — App Shell Only)

Make the app installable to homescreen. No offline data sync, no push notifications.

**Implementation:**

- Create `client/public/manifest.json`: app name, short name, `display: "standalone"`, `theme_color: "#1B2A4A"`, `background_color: "#F7F5F2"`, icon set (192px + 512px PNG)
- Add `<link rel="manifest">` and Apple meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) in `client/app/layout.tsx`
- Use `@ducanh2912/next-pwa` (or `next-pwa`) in `next.config.ts` for service worker generation — **cache app shell and static assets only**, not API responses
- Add `sw.js` and `workbox-*` to `.gitignore` (generated at build time)

**Critical:** Do **not** cache API responses (`/api/*`, `/auth/*`). Financial data must always be fresh. Configure the service worker with a network-first strategy for all non-static requests.

### 6.4. AI Chat Assistant *(stretch — only if 6.1–6.3 are done)*

A simple AI help button (bottom-right corner) that answers questions about the platform. **Not** idle-triggered — always available via a chat icon.

**Implementation (if pursued):**

- Client: floating action button → expandable chat panel (input + message list). Minimal — no streaming needed, request/response is fine
- Server: `POST /api/chat` endpoint. System prompt contains a concise summary of AjoFlow features, navigation, and FAQ. Uses DeepSeek (already integrated via `@langchain/deepseek`)
- No auth required for the chat endpoint (questions are about the product, not user data)
- Keep the system prompt under 500 tokens — just enough to answer "how do I join a pod?" and "what does the trust score mean?"

**If time is short, skip this entirely.** The trust scoring AI is already the primary AI surface for judges. A second AI touchpoint is nice-to-have, not essential.

### 6.5. First-Visit Onboarding — "What Do I Do?" Problem

**Origin:** Real QA feedback (March 31) from a non-technical tester. She landed on the app, understood the concept from the marketing copy, but immediately asked "give me a break down — how does it work?" before taking any action. She browsed, read, liked it, but never registered, joined a pod, or contributed. The value prop resonated (she connected it to saving for her business) but the path from "I get it" to "I've done something" was missing.

**Why this matters for Demo Day:** Judges will have the same 30-second orientation gap. Unlike a friendly tester, they won't message you for help — they'll move on.

**What to fix (pick one or combine, in order of effort):**

1. **"How It Works" section on landing page** *(lowest effort, highest impact)* — 3-step visual below the hero: "1. Sign Up → 2. Join a Pod → 3. Save Together, Get Paid." Each step links to its action (`/register`, `/pods`, pod detail). This is the minimum viable fix. The landing page currently explains *what* AjoFlow is but not *what to do right now*.

2. **Stronger first-action CTA on the pod browser** — when a visitor lands on `/pods` without being logged in, show a banner or callout: "New here? Pick a pod below and join your first savings circle." Contextual nudge, not a modal or popup.

3. **Guided tooltip tour** *(medium effort)* — on first visit (track via `localStorage` flag), highlight 3–4 key UI elements in sequence: hero CTA → pod card → join button → dashboard link. Use a lightweight library (e.g. `driver.js`, ~5KB) or hand-roll with absolute-positioned popovers. Dismissible, runs once.

4. **AI chat assistant** *(already described in 6.4)* — the QA feedback validates the use case but this is the heaviest solution. The "How It Works" section solves 80% of the problem at 10% of the effort.

**Recommendation:** Implement option 1 (landing page "How It Works") before Demo Day. It's a single component addition to `(public)/page.tsx` with no backend changes. Consider option 3 if time allows after 6.1–6.3 are done.

### 6.6. Test Coverage Gaps

Existing tests: 7 server (`bun:test` + `mongodb-memory-server`), 5 client (`bun:test` + React Testing Library). No Playwright E2E tests yet.

**Server unit/integration tests to add** (in `server/src/tests/`):

1. **`pods.test.ts` — pod creation + wallet provisioning**
   - `POST /api/pods` with mocked `createWallet` succeeding → assert `walletId` and `virtualAccount` set on pod
   - `POST /api/pods` with mocked `createWallet` failing → assert pod created with `walletId: null`
   - `POST /api/pods/:id/provision-wallet` → assert `walletId` set after retry

2. **`payments.test.ts` — manual payment flow**
   - `POST /api/payments/manual` → assert Transaction created with `status: 'manual'`, `contributionTotal` incremented, `creditWalletViaCallback` called
   - Duplicate guard: same member + same cycle → 400
   - Non-admin caller → 403

3. **`payoutService.test.ts` — extend existing**
   - Assert `disburseFunds` is called with correct wallet ID, amount, and recipient bank details
   - Debt carry-forward: member missed 2 of 3 cycles → net payout = `gross - (2 × contributionAmount)`
   - Zero net payout: all cycles missed → disbursement skipped, queue still advances

4. **`seed.test.ts` — seed endpoint reliability**
   - `POST /api/seed` → assert 4 users, 1 pod, 50+ transactions created
   - Assert at least one user has missed payments (demo scenario depends on this)

   > **Client component tests to add** (in `client/tests/`):

5. **`AdminPodClient.test.tsx`**
   - Renders payout, AI eval, manual payment, and reset buttons
   - Payout + eval buttons disabled when pod status is not `active` (once lifecycle is implemented)
   - Reset button only visible when `status === 'completed'`

6. **`JoinPodModal.test.tsx`**
   - Form renders with pod details (amount, frequency)
   - Submit calls `POST /api/payments/join`
   - Success state shows virtual account transfer details

**Playwright E2E tests** (add `client/e2e/` with `playwright.config.ts`):

1. **`demo-flow.spec.ts`** — the golden path judges will walk:
   - Register → login → browse pods → join pod → view pod detail (queue + activity visible) → navigate to manage → trigger AI eval → verify scores render → trigger payout → verify recipient moved
   - This is the single most valuable E2E test — it catches the "works on my machine" class of bugs before Demo Day

2. **`routing.spec.ts`** — auth gating (already specified in 5.1 client-side E2E section):
   - Unauthenticated: `/pods` renders, `/my-pods` redirects to `/login`
   - Authenticated non-member: join button visible on `/pods/:id`
   - Authenticated member: "View My Pod" on `/pods/:id`
   - Pod admin: "Manage Pod" link on `/my-pods/:id`

**What NOT to test:**

- Interswitch live API calls (mock all external services)
- Framer Motion animations (visual, not functional)
- Exact AI reasoning text (non-deterministic DeepSeek output — only assert score range and `riskFlag` boolean)

---

## Post-Hackathon / If Time Allows

Items marked ✅ were originally deferred but completed during the build window. They remain here for context and implementation notes. Unchecked items are still deferred.

- ✅ **JWT storage hardening (production security)** — Access token is in JS memory only (`client/lib/auth.ts` module variable, 15 min expiry). Refresh token is in an `HttpOnly` cookie (`SameSite=lax` in dev, `SameSite=none; Secure` in prod, 7-day expiry). `POST /auth/login` and `POST /auth/register` set the refresh cookie and return the short-lived access token in the body. `POST /auth/refresh` rotates both tokens. `POST /auth/logout` clears the cookie. CORS updated to `credentials: true`. Axios instance sets `withCredentials: true`. 401 interceptor in `api.ts` silently refreshes and retries with a pending-queue pattern for concurrent requests. `AuthProvider` (`client/contexts/AuthContext.tsx`) hydrates the in-memory token on every page load via a silent refresh call.

- ✅ **Auth verification in Next.js middleware** — `client/middleware.ts` checks for the `refresh_token` cookie presence on every navigation. Unauthenticated requests to protected routes (`/dashboard`, `/my-pods`, `/payment`) are redirected to `/login?next=<path>` at the Edge before the page renders. Authenticated users hitting `/login` or `/register` are redirected to `/dashboard`.

- ✅ **Protected layout `useEffect` cleanup** — `(protected)/layout.tsx` and `(auth)/layout.tsx` are now plain server components with no `useAuth`, no `"use client"`, and no loading spinner. `useAuth` hook simplified to read from `AuthContext` only; `handle` prop is now a documented no-op (middleware handles redirects).

- [ ] **Same-origin API routing (production auth fix)** — the current cross-origin deployment (Vercel frontend + Render backend) means the `refresh_token` HttpOnly cookie is set on Render's domain and invisible to `proxy.ts` on Vercel. The workaround is a client-writeable `has_session` cookie that lets the proxy gate navigation, but it's forgeable — the proxy becomes a UX gate, not a security gate (the real auth boundary is backend JWT verification, which is unchanged). **Proper fix:** serve the API behind the same domain using Vercel rewrites (e.g. `{ source: "/api/:path*", destination: "https://api.ajoflow.com/:path*" }`) or migrate the backend to Vercel Functions. This restores same-origin cookie flow, allowing `proxy.ts` to verify the refresh token server-side and forward user identity headers to Server Components. Also unblocks the Server Component migration (see below) since server-side fetch calls could attach the cookie directly. **Alternatively**, deploy both frontend and backend on the same Railway/Render domain with path-based routing.
- [ ] **`packages/shared` monorepo workspace** — create a third TypeScript package at the root (`packages/shared/`) to house constants shared across the server/client boundary: primarily `REFRESH_COOKIE_NAME` (currently duplicated as a string literal in `server/src/routes/auth.ts` and `client/proxy.ts`). Both `server/` and `client/` would reference it via `workspace:*` in their `package.json` and a `paths` alias in `tsconfig.json`. Deferred because (a) it's a single stable string — not worth the plumbing, and (b) client-internal constants (`has_session`, `x-user-id`, `x-user-email`) already live in `client/lib/auth-constants.ts` and don't cross the server boundary. Revisit when a second genuinely cross-project constant appears.
- [ ] **Deduplicate `/pods/[id]` and `/my-pods/[id]` page layouts** — the two server component pages are nearly identical; only the bottom action differs (`JoinButton` vs `PodAdminLink`). Extract a shared `PodDetailLayout` server component accepting an `action` slot. Deferred because the pages are stable, it's a pure refactor with zero judging value, and the risk of a bad abstraction during crunch outweighs the DRY benefit. Do after Phase 5 ships.
- [ ] **Server Component migration for data-fetching components** — move `ActivityFeed`, `MyContributions`, `ContributionMatrix`, and `PayoutCycles` from `"use client"` fetch-on-mount to Next.js Server Components for faster initial paint and eliminated loading skeletons. Currently blocked by the in-memory access token architecture (`client/lib/auth.ts` module-level `_accessToken`): server components have no access to this variable. Resolution path: extend `getServerUser()` (`client/lib/server-auth.ts`) to also return a short-lived access token by reading the `session_hint` cookie and calling `POST /auth/refresh` server-side, then thread that token into server-side fetch calls per page. Start with `ActivityFeed` on the public pod page — its 403-gate maps cleanly to server-side render-nothing. **Do not migrate `UserQuickStats`** — its progressive reveal after login (skeleton → AI score) is a deliberate UX moment that benefits from client-side loading. `PaymentReturnContent` does not exist in the codebase — no migration needed. `PayoutCycles` has client-side expand/collapse state — split into server data fetch + client interactive wrapper if migrated. All 4 remaining candidates (`ActivityFeed`, `MyContributions`, `ContributionMatrix`, `PayoutCycles`) follow the same pattern: `useState` + `useEffect` fetch with error/loading/empty states, zero client interactivity (except `PayoutCycles` expand toggle). Migration is straightforward once the server-side token plumbing is resolved, but has zero judging value — defer to post-hackathon.
- [ ] **Sidebar navigation for protected layout** — replace or supplement the Navbar with a persistent sidebar on `/dashboard`, `/my-pods`, and manage pages. Low priority relative to judging criteria.
- [ ] **Retry failed transactions from the client** — add a "Retry Payment" button on failed `Transaction` entries in `ActivityFeed` / `MyContributions`. Calls `POST /api/payments/contribute` for the same pod to re-attempt the contribution.
- ✅ **Automatic AI eval before payout** — `triggerPayout` now calls `evaluateAndReorderQueue` as its first step, before identifying the recipient. Queue is always fresh when money moves. Evaluation failure is non-fatal — logged and payout proceeds with the existing order.
- [ ] **Automatic AI eval on failed charge** — deferred. No webhook handler exists in the current codebase. When a disbursement webhook handler is implemented (see "Disbursement webhook handlers" below), wire it to trigger `evaluateAndReorderQueue` on `newStatus === "failed"` so the defaulting member's trust score drops and queue position is corrected without admin action.
- [ ] **Automatic payout scheduling** — add `payoutDate` to Pod schema. Cron job checks daily; triggers payout automatically when `payoutDate` arrives and wallet balance is sufficient. Admin can still trigger manually ahead of schedule.
- [ ] **Pod lifecycle states** — extend `status` enum from `active | completed` to four stages:

  ```mermaid
  pending → open → active → completed
                     ↑          │
                     └──(reset)─┘
  ```

  **Why the current 2-status model is insufficient:**
  - `active` conflates "accepting members" and "running payouts" — these are fundamentally different phases
  - Nothing currently prevents an admin from triggering payout on a half-filled pod, which breaks the ajo model (the pot is `contributionAmount × members.length`, so a 2-of-4 payout is a fraction of the expected amount)
  - AI trust scoring on an incomplete membership pool produces meaningless queue reordering
  - In traditional ajo, the coordinator doesn't start the rotation until the circle is full — the digital version should enforce the same

  **Status definitions and allowed actions:**

  | Status | Meaning | Enters when | Allowed | Prohibited |
  | -------- | --------- | ------------- | --------- | ------------ |
  | `pending` | Created, wallet not yet provisioned | `POST /api/pods` and wallet creation fails | View pod, admin retries wallet provisioning (`POST /api/pods/:id/provision-wallet`) | Join, contribute, payout, AI eval |
  | `open` | Wallet ready, accepting members | Wallet provisioned successfully (auto-transition) | Join, contribute (pre-pay cycles), manual payment | Payout, AI eval (incomplete membership — scores are meaningless) |
  | `active` | Full, cycle running | Last member joins (`members.length === maxMembers`, auto-transition) | Contribute, payout, AI eval, manual payment | Join (pod is full), reset |
  | `completed` | All payouts done, queue empty | Last payout drains `payoutQueue` (auto-transition, already exists) | View history, admin reset | Join, contribute, payout, AI eval |

  **Automatic transitions (no admin action needed):**
  - `pending → open`: triggered inside `POST /api/pods/:id/provision-wallet` on success, or inside `POST /api/pods` if initial wallet creation succeeds
  - `open → active`: triggered inside `POST /api/payments/join` when the joining member fills the pod (`members.length === maxMembers` after `$addToSet`)
  - `active → completed`: already exists in `payoutService.ts:186` when `payoutQueue` is empty after last payout
  - `completed → active`: already exists in `pods.ts:684` via `POST /api/pods/:id/reset` (manual, admin-only)

  **What about pods that intentionally start with fewer members?** Defer to a future `minMembers` field. For now, `maxMembers` is the target and ajo structurally requires a full circle.

  **Implementation scope:**

  *Server:*
  - Update `Pod.ts` schema enum: `['pending', 'open', 'active', 'completed']`, default `'pending'`
  - `POST /api/pods` (pods.ts): set initial status to `'open'` if wallet creation succeeds, `'pending'` if it fails
  - `POST /api/pods/:id/provision-wallet` (pods.ts): transition `pending → open` on success
  - `POST /api/payments/join` (payments.ts): after `$addToSet`, check if `members.length === maxMembers` → set `status = 'active'`
  - `POST /api/payments/join` and `POST /api/payments/contribute` (payments.ts): reject if status is `'pending'` (no wallet) or `'completed'`; allow if `'open'` or `'active'`
  - `POST /api/pods/:id/payout` (payoutService.ts): reject if status is not `'active'`
  - `POST /api/pods/:id/evaluate` (queueService.ts / pods.ts): reject if status is not `'active'`
  - `GET /api/pods` (pods.ts): public listing should filter to `{ status: { $in: ['open', 'active'] } }` (hide pending pods from browser)
  - `GET /api/stats` (stats.ts): count `open` + `active` pods as "Active Pods" in platform stats
  - Cron job (cronJobs.ts): only evaluate pods with `status: 'active'`
  - `POST /api/pods/:id/reset` (pods.ts): transition `completed → active` (already exists, no change)

  *Client:*
  - `PodHeroHeader.tsx`: display 4 status badges (pending = gray, open = blue, active = green, completed = muted)
  - `PodCard.tsx`: update status badge + CTA text ("Join" for open, "View" for active/completed, hidden for pending)
  - `PodBrowser.tsx`: add status filter pill (Open / Active / All)
  - `AdminPodClient.tsx`: disable payout and AI eval buttons when status is not `active`; show "Waiting for members" message when `open`; show "Provision Wallet" prompt when `pending`
  - `JoinButton.tsx`: disable when status is `active` (full), `completed`, or `pending`
- [ ] **React Hook Form + Zod on the client** — replace the `useState` form handling in Login/Register pages with `react-hook-form` + `zod` for type-safe validation and better field-level error UX. Note: do **not** use `useActionState` — that hook is designed for Next.js Server Actions talking to the Next.js server, not a decoupled Express API. The current `useState` + axios pattern is correct for this architecture.
- [ ] **Email verification gate on registration** — require users to verify their email address before their first contribution attempt. On `POST /auth/register`, generate a signed verification token (random bytes stored against a `emailVerified: false` field on `User`), send a verification email via Resend, and block `POST /api/payments/join` and `POST /api/payments/contribute` with a `403` if `emailVerified` is false. Add a `POST /auth/resend-verification` endpoint. Do **not** block login — users should still be able to browse and explore. Distinct from the welcome email below (which is fire-and-forget with no gate). Ensure judges receive pre-verified demo credentials.
- [ ] **Phone number verification** — `phone` already exists as a required field on the User model (collected at registration, validated as 7-15 digit format). Add a post-registration OTP verification flow via SMS (Termii for Nigerian numbers, or Twilio) to confirm the number is reachable. Store `phoneVerified: boolean` on User. Primarily useful as a backup contact channel for missed-payment alerts and as a trust signal. Do **not** make it a signup gate — it adds friction and most Interswitch payment flows already capture phone at the card level. Implement after the email verification gate is stable.
- [ ] **Email notification on registration** — Send a welcome/confirmation email to new users immediately after a successful `POST /auth/register`. Confirms the address is reachable before the user's first contribution attempt. Use Resend (preferred) or Nodemailer; store `RESEND_API_KEY` in `.env`. No email verification gate needed for the hackathon — just a welcome message.
- [ ] **Email notification on login** — Send a security-alert email when a user logs in (`POST /auth/login` success). Helps users spot unauthorized access early. Same Resend/Nodemailer setup as above; can share the notification service instance. Keep it simple: "Someone just signed in to your AjoFlow account. If this wasn't you, contact support."
- [ ] Email/SMS notifications when a payout is incoming or a charge fails (Nodemailer or Twilio).
- [ ] **Due-payment reminders (5d / 2d / D-day)** — extend the daily cron job to send reminder emails/SMS before each contribution is due: 5 days out ("your ₦5,000 contribution is due in 5 days"), 2 days out, and on the day itself. The `isDueToday()` helper already encodes due-date logic; add a parallel `daysUntilDue(frequency, createdAt, today)` helper that returns the number of days until the next charge. Run it for every active pod each morning and dispatch notifications at 0, 2, 5 days. Requires Resend (email) or Twilio (SMS) — implement in the same pass as missed-payment notifications. Reminders are most useful for the manual-pay path; for auto-debit they give members time to ensure their card has sufficient funds.
- [ ] **Missed-payment notifications** — push or email alert sent to a member (and optionally to the pod admin) the moment a card charge fails. Currently the webhook handler logs failures; wire it to a notification service (Resend for email, Twilio for SMS). Include the failed amount and a link to retry payment manually.

- [ ] **Missed-payment handling cluster** — items 2–5 are implemented; items 1 and 6 are deferred.

  1. **3-day grace period** *(deferred)* — instead of immediately treating a failed charge as a missed payment, give members a 3-day window. Day 1: charge attempted, status → `"overdue"`. Days 2–3: cron retries. After grace window: status → `"failed"`, trust score penalized. Requires a new transaction status (`overdue`), retry logic in the cron, and distinguishing `latePayments` (within grace) from `missedPayments` (past grace) in the trust agent. Note: grace periods delay the payout recipient by up to 3 days per cycle — surface this clearly in the UI.

  2. ✅ **Immediate pod membership on join** — a user is added to `members` and `payoutQueue` atomically via `$addToSet` in the `POST /api/payments/join` handler, with contribution recorded via `recordContribution()` in the same request. No separate webhook confirmation step — the virtual account callback credit is best-effort (Interswitch sandbox). `$addToSet` is idempotent — safe for existing members pre-paying additional cycles via `POST /api/payments/contribute`.

  3. ✅ **Recipient exempt from their own payout cycle** — a member does not contribute in the cycle they receive. `recordContribution()` cap is `(maxMembers - 1)` total paid cycles (not `maxMembers`). Payment for your own payout cycle is structurally impossible once the cap is hit. `payoutService` does not require the recipient to have paid the current cycle — that absence is by design, not a default.

  4. ✅ **Debt carry-forward deduction** — `payoutService` calculates any prior cycles (1 → `currentCycle - 1`) where the recipient has no confirmed payment and deducts `missedCycles × contributionAmount` from the gross payout. Net payout = `max(0, gross - debt)`. If net is ₦0, the Interswitch disbursement is skipped but the queue still advances. Debt is resolved dynamically from the Transaction collection — no separate schema needed. The disbursement Transaction records the net amount actually sent.

  5. ✅ **Deterministic secondary queue sort** — `queueService.evaluateAndReorderQueue` applies a two-step sort: (1) AI sort — risky members (score < 50) behind safe members; (2) deterministic sort — the next recipient (position 0) is pinned and exempt; remaining members are re-partitioned within their AI buckets by current-cycle payment status. Final order: `next recipient → safe+paid → safe+unpaid → risky+paid → risky+unpaid`.

  6. **Admin debt visibility** *(deferred)* — surface each member's outstanding debt (calculated from Transaction records) in the Manage view so the admin can see who owes what before triggering a payout.
- [ ] **BVN verification for KYC identity** — use Interswitch's (or Mono/Okra's) BVN verification API as onboarding requirement(after registration, to keep registration process, simple) to confirm "this person is who they claim to be." Distinct from and unrelated to cross-bank debiting (which is not legal without a NIBSS eMandate per account). BVN verification is the correct, legal use of BVN data.
- [ ] **NIBSS eMandates for authorized recurring debits** — the legal mechanism for debiting a member's account on a schedule. Banks use this for loan repayments. Replaces the current card-tokenization approach at scale. Requires CBN-licensed PSP status or a banking partner. Do not attempt BVN-based cross-bank debiting without this — unauthorized debiting of accounts is illegal regardless of what a member signed up for.
- [ ] **Account-change governance** — require pod admin approval (or a member majority vote) before any member can update their registered bank account number mid-cycle. Prevents the fraud scenario where a payout recipient redirects the disbursement to a different account. The wallet model already mitigates this (payout goes to the registered account, not wherever the member chooses at payout time), but a governance guard makes it explicit.
- [ ] **Interswitch Credit API for trust scoring (v2 trust agent — Phase A)** — pull external credit bureau data from Interswitch's Credit API at evaluation time to seed the trust score for new members. Adds a 4th Interswitch API surface (WebPAY + Wallet + Disbursement + Credit) and makes DeepSeek's reasoning more compelling (*"Member has 4 active loans with 98% on-time repayment rate"* vs *"onTimePayments: 3"*). **Status: the platform-side cold-start is now solved** — `queueService.ts` aggregates cross-pod transaction history (on-time, late, missed payments across all pods) and average trust scores, then feeds them as `platformHistory` context to `scoreTrust()`. The AI uses this to establish a baseline for members who are new to a pod but have platform history. The Credit API would add the external cold-start dimension (users new to the entire platform). **Prerequisite:** run a 30-minute sandbox feasibility spike before committing — confirm the sandbox endpoint returns varied, non-static data for test accounts and that BVN collection doesn't block the demo flow. If sandbox data is static, defer entirely. **Composite score formula:** platform behaviour (cross-pod history, already implemented) + credit API fields (`creditScore`, `activeLoanCount`, `delinquencies`) both passed to the same DeepSeek prompt. **Implementation note:** add optional credit fields to `UserPaymentData` in `trustAgent.ts`, fetch via a new `getCreditReport(bvn)` function in `interswitch.ts`, wire into the existing `evaluateAndReorderQueue` loop alongside the `platformHistory` query. Do **not** block signup on BVN — collect post-registration. Requires explicit user consent disclosure (CBN/NDPC).
- [ ] **Bank statement analysis for trust scoring (v2 trust agent — Phase B)** — integrate Open Banking data (Mono, Okra, or Interswitch Open Banking API, CBN framework 2022) to include a member's broader banking behaviour in the trust score: salary regularity, bill payment history, savings patterns. Requires OAuth-style account linking and user consent. Combines with the Credit API phase above — together they move the trust agent from "pod payment tracker" to genuine micro-credit scorer, comparable to Carbon/FairMoney's approach.
- [ ] **Member vouching as digital guarantor** — the plan's invite-only pod vouching feature (where an existing member's trust score is partially staked on their invitee's behaviour) is the correct digital analog to the traditional physical guarantor. It provides both social accountability (the vouching member faces real consequences if their invitee defaults) and identity binding (the guarantor chain is traceable). Combined with BVN KYC, this achieves the same two things a physical guarantor provides — without legal complexity, surety bond structures, or extra onboarding friction for the target demographic. Do not implement physical/legal guarantors; implement member vouching instead.
- [ ] Member invitation flow (invite by phone number, not just email).
- [ ] Full Slack/email notification channel for API support issues during judging.
- [ ] **PIN retry limits** — add server-side PIN attempt tracking for wallet operations (`disburseFunds`, `createWallet`). Store a `pinAttempts` counter and `pinLockedUntil` timestamp on the Pod document. After 3 consecutive failures, lock the wallet for 30 minutes. Interswitch enforces its own PIN lockout server-side, so this is a defence-in-depth measure — the primary benefit is surfacing lockout state in the admin UI ("Wallet locked — 3 failed PIN attempts, retry after 14:30") rather than letting the admin hit opaque Interswitch errors. Low priority because the attack surface is already small: only the pod creator (JWT-authenticated) can trigger disbursement, and the PIN is set once at wallet creation, not entered per-transaction.
- [ ] **Disbursement webhook handlers** — implement a dedicated webhook receiver for Interswitch disbursement notifications (`POST /api/webhooks/interswitch/disbursement`). Currently, `payoutService` treats a successful `disburseFunds` API response as final. In production, Interswitch may process disbursements asynchronously — the API returns `202 Accepted` and the final settlement status arrives via webhook minutes later. The webhook handler should: (1) verify the callback signature, (2) find the matching Transaction by `interswitchRef`, (3) update status to `success` or `failed` based on the notification, (4) if failed, restore the recipient to the front of the payout queue and revert the `contributionTotal` debit. Deferred because the sandbox `disburseFunds` endpoint returns synchronously and the re-query endpoint (`requeryTransaction`) provides a pull-based fallback for verifying final status. Implement when moving to production or if sandbox behaviour changes to async settlement.
- [ ] Full webhook retry logic for failed card charges (currently just logged).
- [ ] Dark mode (semantic color tokens are in Tailwind config, so this is wiring only).

---

## Product Roadmap (Post-Hackathon Vision)

Ideas captured during the build sprint. Do not implement before Phase 5.

### Governance & Democracy

The current model is creator = admin. Three alternatives worth exploring:

- **Full pod vote** — any consequential action (payout trigger, member removal, disbursement account change) requires majority approval from members. Maximally democratic but slow.
- **Appointed admin** — creator appoints one or more trusted members as admins. Faster decisions, still accountable to the group.
- **AI-elected admin** — admin role is automatically granted to the member with the best contribution record (on-time payments, engagement with notifications). Admin status is revoked if their score drops below a threshold. The Trust Agent already produces this data — wiring it to permissions is a small step. Most compelling for judges; worth building post-hackathon.

Other governance features:

- [ ] **Member voting on queue disputes** — when the AI Trust Agent demotes a member, that member (or any pod member) can raise a dispute. Other members vote to uphold or override the demotion within a time-boxed window (e.g. 24 hours). A simple majority overrides the AI decision and restores the member's original position. Schema addition needed: `queueDisputes: [{ targetUserId, raisedBy, votes: [userId], outcome, expiresAt }]` on Pod. This is the most compelling post-hackathon governance feature — AI proposes, community decides.
- [ ] Member veto on disbursement account changes (e.g. require 2-of-N approval before a member can update their bank account mid-cycle).
- [ ] Member vote to approve or defer a payout request.
- [ ] **Admin transfer via pod poll** — any member can nominate a new admin; a simple majority vote (time-boxed, e.g. 48 hours) confirms the transfer. Complements the AI-elected model: AI surfaces the best candidate, pod vote ratifies it. Schema addition needed: `adminTransferProposals: [{ nomineeId, proposedBy, votes: [userId], expiresAt, status }]` on Pod.

### Payout Scheduling

- [ ] **`payoutDate` on Pod schema** — admin sets an explicit payout date per cycle. The UI shows a countdown. The payout button is always visible but returns a clear error (`"Next payout window is [date] — funds are locked until then"`) if triggered early. This mirrors how real ajo works and is better for demos than hiding the button.
- [ ] **Early payout requests** — member can submit a request; admin (or majority vote) approves. Store as `earlyPayoutRequests: [{ userId, reason, requestedAt, status }]` on Pod.
- [ ] **Flexible payout dates** — admin can reschedule a payout window. All members notified.

### Automated Recurring Deductions (Cron)

- [ ] `POST /api/cron/run-deductions` — **not implemented**. Automated card debits require card-on-file tokenization (see below). If added, must use `x-cron-secret` header (not user JWT) — see `seed.ts` for the header-based secret pattern.

Automated card debits require three capabilities that are not yet built:

1. **Card-on-file tokenization** — on a user's first payment (via `/join` or `/contribute`), redirect to Interswitch WebPAY. On successful charge, WebPAY returns a reusable card token. Store as `interswitchCardToken` on the User document. All subsequent charges use this token without user interaction.

2. **Server-initiated charge** — use the saved token to charge the card via Interswitch's recurring payment API. This replaces the current self-serve `/contribute` flow for automated pods.

3. **Payment verification via webhook** — `POST /api/webhooks/interswitch` receives the charge result. On success → create `Transaction(status: 'success')` + `creditWallet()`. On failure → create `Transaction(status: 'failed')` + notify member.

**Cron flow:**

1. `node-cron` job runs daily at 08:00 WAT (or configurable per-pod frequency).
2. For each active pod where today matches the contribution due date:
   a. Find members who have not paid the current cycle.
   b. For each unpaid member with a saved card token: initiate a server-side charge.
   c. Webhook callback processes the result (success → credit wallet, failure → flag + notify).
3. Manual `POST /api/cron/run-deductions` endpoint (guarded by `CRON_SECRET`) for demo/testing — iterates the same logic on demand without waiting for the scheduler.

**Card-on-hold / pre-authorization note:** Interswitch supports pre-auth (hold funds without completing the charge). This is **not needed** for recurring deductions — a direct charge against the saved token is simpler and sufficient. Pre-auth is designed for hold-then-capture scenarios (e.g., ride-sharing, hotel deposits), not fixed-amount savings circles where the amount and schedule are known in advance.

**Why deferred:** Production recurring debits in Nigeria require either NIBSS eMandates (CBN-licensed PSP) or explicit cardholder authorization for each recurring charge. The sandbox supports token-based test charges but is not representative of production authorization requirements. The current self-serve `/contribute` flow (user initiates) is compliant and sufficient for the demo.

### Queue Lifecycle

- [ ] **Spot transfers** — a member can transfer their queue position to another user, permanently or for a defined number of cycles. Useful when a member needs to defer their payout.
- [ ] **Re-entry after payout** — once a member is paid out, decide policy: (a) they leave the pod, (b) they re-join the back of the queue for the next cycle, or (c) the pod closes when the last member is paid. Currently the pod marks `completed` when the queue empties — revisit this when building multi-cycle pods.

### Infrastructure

- [ ] **Redis queue for payouts — exactly-once delivery** — the current payout flow does a read-then-write (`findById` → Interswitch `disburseFunds` → `pod.save()`). Two concurrent requests (e.g. admin double-click) could both reach `disburseFunds` before either `save()` completes, causing a double disbursement. Mongoose `optimisticConcurrency` (currently enabled on the Pod schema) catches the second `save()` as a `VersionError` and returns 409 — preventing double state corruption — but it does not prevent the narrow double-disbursement window before either save fires. Full exactly-once protection requires atomically pre-claiming the payout slot before calling Interswitch: pop the queue head in a single `findOneAndUpdate`, then disburse. At scale this becomes a Redis/BullMQ job queue problem. node-cron + MongoDB optimistic concurrency is acceptable for the hackathon.
- [ ] **Why two data stores (MongoDB + Interswitch)?** — Interswitch is the payment source of truth (authoritative for settlement state). MongoDB is the application layer (fast queries for trust scoring, pod membership, queue state — no API rate limits on reads). They serve different concerns and do not duplicate each other.
- [ ] **`cycleNumber` as an array on Transaction** — currently, a multi-cycle pre-payment creates one Transaction document per cycle (each with a single `cycleNumber`), all sharing the same `interswitchRef`. The alternative — one Transaction with `cycleNumber: [3, 4]` — would make the write path simpler (one document per Interswitch charge, clean 1:1 ref mapping) but complicates every read path: the trust agent's `onTimePayments` count breaks (2 cycles = 1 document), the `amount` field becomes ambiguous (per-cycle vs total), and `MyContributions` UI needs to display one row covering multiple weeks. **Keep one document per cycle.** If multi-cycle payments become common and consolidated accounting records are needed, add a `parentRef` field pointing to the Interswitch charge reference — grouping without schema complexity.

### Auth & Onboarding

- [ ] **Phone-first auth with OTP** — replace email login with phone number + OTP verification. Target users (market traders) may not have or regularly check email, but phone numbers are universal in Nigeria. Short-term stepping stone: make email optional and auto-generate a placeholder from the phone number (e.g. `+2348101234567@ajoflow.ng`) for any API that requires one. Long-term: full phone-based auth flow with SMS OTP (via Twilio or Termii).
- [ ] **Payout reminders for pod admins** — instead of automated cron-based payouts (which remove the human-in-the-loop check that demonstrates AI governance), notify the admin on their dashboard when a pod is ready for payout this cycle. The admin still clicks the payout button, but is prompted on schedule. This preserves the traditional Ajo coordinator role while reducing the chance of forgotten payouts.

### Platform Features

- [ ] Pod activity notifications (contribution confirmed, payout incoming, missed payment warning).
- [ ] **Pod full waitlist / join-next-cycle request** — When a pod is full and the visitor is not a member, show a "Notify me when a spot opens" CTA instead of the disabled "Pod is Full" button. Tapping it creates a `waitlist` entry (`{ userId, requestedAt, status: 'pending' }`) stored on the Pod document. The pod admin sees pending requests in the Manage view and can approve or decline. On approval, the user is added to `members` and `payoutQueue` for the next cycle (if one is planned). On pod reset, approved waitlist members are moved in automatically. Requires email notification infrastructure (Resend) to deliver the "a spot opened" alert — implement after email notifications are in place.
- [ ] **Full client + server permission audit** — Systematically verify auth and authorization for every route: (1) server: confirm each endpoint enforces the correct level (public / JWT-member / JWT-creator / secret-gated), add integration tests that assert 401/403 on unauthorized calls; (2) client: confirm every protected page and action checks token presence before rendering or firing API calls, and that the `(protected)/layout.tsx` gate covers all sub-routes without gaps. Currently the critical paths (payout, evaluate, cron, seed) are hardened; this audit sweeps the remaining surface. Do before a production launch or public beta — not needed for the hackathon demo.

  **Server-side access control** — ✅ Done (`server/src/tests/accessControl.test.ts`, 29 tests, 0 failures). Covers: public routes (pods list, pod detail), member-only routes (activity, trust-scores, wallet-balance, my-contributions), admin-only routes (contribution-matrix, evaluate, payout, reset, manual payment). Each endpoint asserts 401 with no token and 403 for insufficient privilege.

  **Client-side E2E routing** — pending (Playwright). Scenarios to cover:
  - Unauthenticated: `/pods` renders pod list; `/pods/:id` renders pod detail with "Log in to Join" CTA linking to `/login?next=/pods/:id`; `/my-pods` redirects to `/login`.
  - Authenticated non-member: `/pods/:id` JoinButton opens payment modal.
  - Authenticated member: `/pods/:id` JoinButton says "View My Pod" linking to `/my-pods/:id`; `/my-pods` lists their pods; `/my-pods/:id` renders member view with wallet, contributions, and activity.
  - Pod admin: `/my-pods/:id` shows "Manage Pod" link; `/my-pods/:id/manage` renders AdminPodClient with AI evaluation and payout trigger.
  - Content gating: non-members do not see payout queue or activity feed on `/pods/:id` (sees "Member-only content" prompt instead).
- [ ] **Pod chat / hangout space** — in-app messaging channel scoped to each pod, plus lightweight social features: scheduling a virtual "meeting day" (a pinned date on the pod page where members check in), shared notes/announcements, and emoji reactions on contribution events. Implementation options: WebSocket (Socket.io) for real-time chat, or a third-party channel service (Stream Chat, Pusher). Start with async threaded comments before adding real-time.
- [ ] **Invite-only pods with member vouching** — a pod creator can mark a pod as invite-only. Existing members can invite new joiners, and crucially can *vouch* for them: a vouch stakes a small fraction of the vouching member's trust score on the new member's behaviour. If the new member misses payments, the vouching member's score also drops. Reinforces the social contract of traditional ajo and ties social trust to AI scoring. Schema addition needed: `invites: [{ invitedEmail, invitedBy, vouchWeight }]` on Pod.
- [ ] **Pod reputation score** — an aggregate public score for the pod as a whole, derived from the average trust score of its members and the pod's completion history (how many full cycles completed without defaults). Displayed on the pod discovery / dashboard page so prospective members can evaluate a pod before joining. Requires historical data across completed pods to be meaningful.
- [ ] Pod delegations — member can delegate contribution responsibility to another trusted member for a cycle.
- [ ] Multi-pod support — one user can be a member of multiple pods simultaneously (schema already supports this).
- [ ] **Invite friends to an existing pod** — any member (not just the creator) can invite someone to a pod they belong to. Invited user receives a link; on sign-up/login they are added to `members` and `payoutQueue`. Optional vouching: inviter stakes a fraction of their trust score on the invitee's behaviour (missed payments hurt both scores).
- [ ] **Pod re-run / subscribe for next cycle** — when a pod completes, members can opt into the next cycle. Creator is notified when enough returning members are ready to start again. Send re-run notification to all previous members.

### Trust, Safety & Governance

The wallet (not anyone's personal account) is the primary protection against fund misappropriation. Additional layers post-hackathon:

- [ ] **Distributed admin** — instead of a single creator-admin, allow 2–5 members to hold admin rights jointly. Consequential actions (payout trigger, member removal, bank account change) require majority approval from the admin group. Combine with AI-elected admin: Trust Agent nominates the top-scoring member(s) for admin elevation; pod ratifies via time-boxed vote.
- [ ] **Trust score as entry requirement** — pod creator sets a minimum trust score threshold (e.g. ≥ 60). New joiners below the threshold are rejected or placed on a waitlist. New users start with a baseline score (like Uber driver ratings); score is built up through completed pod cycles.
- [ ] **Penalties for missed payments** — when a member misses a payment: (1) trust score drops, (2) they are moved to the back of the payout queue by the AI agent, (3) admin is notified. Persistent defaulters can be voted out by members or punished by pod rules set out by the admin group. See also the missed-payment handling cluster in Future Work (grace period + debt carry-forward) for how the shortfall is recovered without freezing the cycle.
- [ ] **KYC / identity verification** — for high-value pods, require phone number, government ID scan, or BVN verification before a member can join. Store verification status on the User document. Interswitch's identity APIs may support this.
- [ ] **Member ratings** — after each completed pod cycle, members rate each other (1–5 stars). Ratings feed into the trust score alongside payment history. New users start at a neutral baseline, not zero, to encourage participation.
- [ ] **Spot transfer** — a member can transfer their queue position to a vetted replacement, subject to admin (or majority) approval. Prevents ghosting while preserving pod continuity.
