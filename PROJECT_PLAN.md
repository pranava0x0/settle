# Squabble - Project Plan

## Premise
Two friends are debating something lowkey and can't agree. They open Squabble, create the question with two sides, and text the link to mutual friends. Friends vote within a time limit. Timer expires, majority wins, debate settled.

## Platform Strategy
- **v1:** Mobile-friendly web app (PWA) — works in any browser, no app store needed
- **v2+:** Native iOS/Android apps wrapping the web app (WKWebView / Expo)

---

## Phase 1: Foundation
Get the core loop working end-to-end: create → share → vote → settle.

### 1.1 Project Setup
- [ ] Initialize Next.js 15 with TypeScript, Tailwind v4, pnpm
- [ ] Set up shadcn/ui with mobile-first defaults
- [ ] Configure ESLint + Prettier
- [ ] Set up testing: Vitest (unit/integration) + Playwright (e2e)
- [ ] Set up hosted Supabase project (see Supabase Setup below)
- [ ] Copy project URL + anon key + service role key into `.env.local`
- [ ] Add `.gitignore` (env files, node_modules, .next)
- [ ] Set up Vercel project + connect repo
- [ ] Configure PWA manifest + basic service worker

### 1.2 Database + Auth
- [ ] Write SQL migration: users, disputes, votes tables + enums
- [ ] Set up Row Level Security policies
- [ ] Write tests: RLS policies (verify access control for each role)
- [ ] Configure Supabase Phone Auth (SMS OTP)
- [ ] Create Supabase client helpers (`lib/supabase/server.ts` + `client.ts`)
- [ ] Build login page (phone input → OTP code entry)
- [ ] Set up Next.js middleware for session management
- [ ] Write tests: auth flow (login, session, protected routes)
- [ ] Generate TypeScript types from Supabase schema

### 1.3 Core Dispute Flow
- [ ] Create dispute form (question, side A, side B, timer duration)
- [ ] Server action: create dispute → generate slug → store in DB
- [ ] Write tests: createDispute action (valid input, missing fields, auth required)
- [ ] Dispute page at `/s/[slug]` — show question, sides, countdown timer
- [ ] Vote flow: tap a side → auth if needed → record vote
- [ ] Enforce one vote per user per dispute (DB constraint + server validation)
- [ ] Block votes after timer expires (server-side check)
- [ ] Write tests: castVote action (valid vote, duplicate vote, expired timer, unauth user)
- [ ] Lazy close: on page load, if expired → tally votes → set winner
- [ ] Write tests: dispute closing (majority wins, tie = no winner, single vote)
- [ ] Results view: show vote counts, winner side, who voted for what
- [ ] Dashboard: list my disputes + disputes I voted on

### Phase 1 Milestone
> Create a dispute, text the link to friends, they open it, log in, vote, timer runs out, majority wins. Deployed on Vercel.

---

## Phase 2: Polish
Make it feel great on mobile. Add the details that make it sticky.

### 2.1 UX Polish
- [ ] Loading skeletons for all pages
- [ ] Error boundaries with friendly messages
- [ ] Empty states (no disputes yet, no votes yet)
- [ ] Toast notifications for actions (vote cast, dispute created)
- [ ] Mobile-optimized touch targets, spacing, typography
- [ ] Smooth countdown timer animation
- [ ] Share sheet integration (Web Share API) for dispute links
- [ ] OG meta tags for rich link previews when texted

### 2.2 Timer Presets + UX
- [ ] Preset timer options: 15 min, 1 hour, 6 hours, 24 hours
- [ ] Custom timer option
- [ ] Visual urgency as timer runs low (color change, pulse)
- [ ] "Voting closed" state with final results

### 2.3 User Profile
- [ ] Set display name on first login
- [ ] Simple profile page
- [ ] Vote history

### 2.4 Live Updates (Optional)
- [ ] Supabase Realtime subscription for live vote count on dispute page
- [ ] Only add if it doesn't blow past free tier limits

### 2.5 End-to-End Tests
- [ ] Playwright e2e: full create → share → vote → settle flow
- [ ] Playwright e2e: vote after timer expires (should be blocked)
- [ ] Playwright e2e: multiple voters on same dispute
- [ ] Playwright e2e: unauthenticated user views dispute, prompted to login to vote
- [ ] Test on mobile viewport sizes (Playwright mobile emulation)

### Phase 2 Milestone
> App feels polished and native-like on mobile. Link previews work. Timer UX is satisfying. Users want to come back.

---

## Phase 3: Growth + Native
Expand features and ship to app stores.

### 3.1 Engagement Features
- [ ] Dispute categories (sports, food, pop culture, etc.)
- [ ] Reminders for open disputes you haven't voted on
- [ ] "Rematch" — create a follow-up dispute
- [ ] Activity feed on dashboard

### 3.2 Social
- [ ] Win/loss record per user
- [ ] "Settling score" between two friends
- [ ] Leaderboard among your friend group
- [ ] Comments/reactions on disputes (lightweight)

### 3.3 Tie-Breaking (v2)
- [ ] Tie = creator breaks the tie
- [ ] Or: overtime round (extend timer, re-vote)

### 3.4 Native App
- [ ] WKWebView wrapper (Swift) for iOS App Store
- [ ] Expo WebView for Android Play Store
- [ ] Push notifications when: someone votes, timer expiring soon, results in
- [ ] App Store submission

### Phase 3 Milestone
> App is in both app stores. Users get push notifications. Social features drive retention.

---

## Future (v2+)
- Public/trending disputes
- Anonymous voting mode
- Polls with 3+ options (not just two sides)
- AI-generated debate summaries
- Integration with group chats (iMessage app, WhatsApp bot)
- Monetization: premium features, custom themes

---

## Testing Strategy
- **Unit/Integration:** Vitest — server actions, utility functions, validation logic
- **E2E:** Playwright — full user flows on mobile + desktop viewports
- **When to write tests:** alongside every feature, not after. Each task should include its tests.
- **When to run tests:** `pnpm test` before every commit. `pnpm test:e2e` before every deploy.
- **Regression tests:** every bug fix gets a test that would have caught it.

## Development Workflow
1. Work on one task at a time
2. Write tests alongside the feature
3. Run `pnpm test` — all green before committing
4. Test on mobile Safari + Chrome
5. Commit with clear message
6. Deploy to Vercel (auto on push)
7. Run `pnpm test:e2e` against deployed URL
8. Move to next task

## Supabase Setup (Hosted — Free Tier)

Supabase hosts a full Postgres database online for free. Friends access it through the app — they never touch the DB directly.

### Steps
1. Go to [supabase.com](https://supabase.com) → sign up (GitHub login works)
2. Click "New Project" → pick a name (`settle`) and set a DB password
3. Choose the region closest to you (e.g., `us-east-1`)
4. Once created, go to **Settings → API** and copy these three values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. Paste them into `.env.local` in your project root
6. Go to **Authentication → Providers** → enable **Phone** (uses Supabase's built-in SMS)
7. Run your SQL migrations via the **SQL Editor** tab or via Supabase CLI (`pnpm db:migrate`)

### Free Tier Limits (more than enough for v1)
| Resource | Limit |
|----------|-------|
| Monthly active users | 50,000 |
| Database size | 500 MB |
| File storage | 1 GB |
| Bandwidth | 5 GB |
| Edge functions | 500K invocations |
| Realtime connections | 200 concurrent |

### Cost: $0/month
No credit card required. You only pay if you exceed these limits or upgrade to Pro ($25/mo).

---

## Cost Constraints
- Stay on Supabase free tier (50K MAU, 500MB DB)
- Stay on Vercel free tier (100GB bandwidth)
- No paid external services in v1
- Monitor usage as user count grows — upgrade only when necessary
