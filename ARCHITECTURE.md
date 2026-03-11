# Settle - Architecture Plan

## Overview
Settle is a lightweight, web-first PWA for settling debates between friends. You create a question with two sides, text the link to your friend group, they vote within a time limit, and the majority settles the debate.

## Core Concept
Two friends disagree about something lowkey. Instead of arguing, they open Settle, create the question, and text it to mutual friends. Friends vote. Timer runs out. Majority wins. Debate settled.

## Stack (Cost-Optimized)
| Layer | Choice | Cost |
|-------|--------|------|
| Frontend | Next.js 16 (App Router, Turbopack) | Free (Vercel) |
| Backend/DB | Supabase (Postgres + Auth + Realtime) | Free tier (50K MAU, 500MB DB) |
| Auth | Supabase Phone Auth via Twilio Verify | ~$0.05/verification |
| Hosting | Vercel | Free (hobby plan) |
| Styling | Tailwind CSS + shadcn/ui | Free |
| Timer | Supabase pg_cron or client-side countdown | Free |

**Total cost at launch: $0/month.** Scale only when needed.

## Data Model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Supabase auth.users reference |
| phone | text UNIQUE | |
| display_name | text | |
| avatar_url | text | nullable |
| created_at | timestamptz | |

### disputes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| slug | text UNIQUE | URL-friendly, e.g. "abc123" for settle.app/s/abc123 |
| creator_id | uuid FK -> users | Person who created the dispute |
| question | text | "Is a hot dog a sandwich?" |
| side_a | text | "Yes, it's a sandwich" |
| side_b | text | "No, absolutely not" |
| status | enum | open, closed, expired |
| winner_side | text | nullable, "a" or "b" after voting ends |
| expires_at | timestamptz | When voting closes |
| created_at | timestamptz | |
| closed_at | timestamptz | nullable |

### votes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| dispute_id | uuid FK -> disputes | |
| user_id | uuid FK -> users | |
| side | text | "a" or "b" |
| created_at | timestamptz | |
| UNIQUE(dispute_id, user_id) | | One vote per person per dispute |

### Dispute Status Flow
```
open (timer running, accepting votes)
  → closed (timer expired, majority wins)
  → expired (timer expired, no votes / tie — no winner)
```

## Auth Flow
```
User enters phone number (10-digit US auto-prepends +1)
  → Supabase calls Twilio Verify API to send OTP
  → User enters 6-digit code
  → Supabase verifies via Twilio Verify → returns JWT
  → Session stored in httpOnly cookie
  → Next.js middleware validates on each request
```

No passwords. No email. Phone-only, Partiful-style.

### Why Twilio Verify (not Programmable SMS)
- US carriers enforce A2P 10DLC registration for all local number SMS. Programmable SMS
  with a local 10DLC number fails with error 30034 unless you register ($$$, ~1 week).
- Twilio Verify handles carrier compliance automatically — no A2P registration needed.
- Works on Twilio trial accounts (limited to verified numbers).
- Supabase has native "Twilio Verify" provider — just set Account SID, Auth Token, and
  Verify Service SID in the Supabase Auth dashboard.
- Cost: ~$0.05/successful verification (vs ~$0.0079/SMS for Programmable SMS, but
  Programmable SMS requires paid account + A2P registration to actually deliver).

## Core User Flows

### Create a Dispute
1. User logs in (or is already authenticated)
2. Types the question, side A, and side B
3. Sets a timer (e.g., 1 hour, 6 hours, 24 hours — preset options)
4. System generates unique slug
5. User gets sharable link: settle.app/s/{slug}
6. User texts link to friend group

### Vote on a Dispute
1. Friend opens link in browser
2. Sees the question + both sides + countdown timer + current vote count
3. Taps a side → prompted to log in via SMS (if not already)
4. Vote recorded. See live vote tally update.
5. Can't change vote once cast.

### Dispute Settles
1. Timer expires
2. System tallies votes → majority side wins
3. Status = closed, winner_side recorded
4. Both the creator and all voters can see the result
5. Tie = no winner (or creator breaks tie — v2)

## Timer Strategy
- `expires_at` stored as timestamptz in the DB
- Client renders countdown from `expires_at - now()`
- Voting endpoint checks `expires_at` server-side before accepting votes
- No cron needed for v1 — status is derived: if `now() > expires_at` and `status = open`, treat as closed
- Lazy evaluation: close and set winner on first read after expiry (or periodic Supabase edge function in v2)

## Sharing Flow
```
Create dispute → get link → text to group chat
Friends tap link → see question → log in → vote
Timer expires → result shown → debate settled
```

## PWA Strategy
- manifest.json with app metadata
- Service worker for offline shell caching
- "Add to Home Screen" banner
- App-like feel without App Store

## Path to App Store (v2+)
1. Build web app as PWA first
2. Wrap in WKWebView (Swift) or Expo WebView
3. Add push notifications via APNs
4. Submit to App Store

## Row Level Security (Supabase)
- Anyone can read dispute details (for link sharing)
- Only authenticated users can vote
- One vote per user per dispute (enforced DB-side with unique constraint + RLS)
- Only creator can create disputes
- Votes are insert-only (no updates, no deletes)
- Users can read their own votes

## API Routes (Next.js Server Actions preferred over API routes for simplicity)
- **Server Actions:**
  - `createDispute(question, sideA, sideB, duration)` — create + return slug
  - `castVote(slug, side)` — vote on a dispute
  - `closeDispute(slug)` — tally + close (called lazily on read)
- **Pages:**
  - `/` — landing / create form (if logged in)
  - `/s/[slug]` — dispute view (public: question + vote UI + results)
  - `/dashboard` — my disputes + my votes
  - `/login` — phone auth

## Deployment

### Production
- **Hosting:** Vercel (Hobby plan, free)
- **URL:** settle.vercel.app (auto-assigned by Vercel)
- **Repo:** github.com/praparla/settle (auto-deploys on push to main)
- **Environment Variables (Vercel):**
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public, RLS-protected)
  - Note: `SUPABASE_SERVICE_ROLE_KEY` is NOT set in Vercel — not needed for client-side app

### Deploy Checklist
1. `pnpm test && pnpm build` — verify locally
2. `git push origin main` — Vercel auto-deploys
3. Verify Supabase Auth redirect URLs include production domain
4. Test OTP login flow on deployed URL
5. Test dispute creation + sharing + voting end-to-end

### Supabase Auth Configuration
- Supabase Dashboard → Authentication → URL Configuration
- **Site URL:** production Vercel URL
- **Redirect URLs:** must include both localhost (dev) and Vercel URL (prod)

## Cost Optimization Notes
- Supabase free tier: 50K monthly active users, 500MB database, 5GB bandwidth
- Vercel free tier: 100GB bandwidth, serverless functions
- Twilio Verify: ~$0.05/successful verification (only real cost)
- No external APIs needed for core functionality
- No cron jobs in v1 — lazy evaluation for timer expiry
- No file storage needed in v1 (no avatars, no images)
- Realtime is optional in v1 — can use simple page refresh / revalidation instead

## Future Considerations (v2+)
- Push notifications when timer expires
- Tie-breaking rules (creator decides, overtime round)
- Dispute categories (sports, food, movies, etc.)
- Rematch / follow-up disputes
- Comment thread on disputes
- Public/trending disputes feed
- Stats: win rate, most active settler, streaks
- Native app wrapper for App Store
