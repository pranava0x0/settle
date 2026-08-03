# Squabble — Improvement Plan

_Date: 2026-07-30. Written after a full codebase + infra audit. Code is healthy (267/267 Vitest tests pass, `pnpm build` green). The infrastructure is what's dead._

## Current state snapshot

| Layer | State |
|---|---|
| Code | All core flows implemented: create → share → vote → lazy close → results, anonymous voting, OTP upgrade/merge, realtime, OG images, 3 themes |
| Tests | 267 passing (8 files). **No e2e suite** — `playwright.config.ts` points at `e2e/` which doesn't exist |
| Supabase | Project `settle` (ref `dvlwssspyizcbdwumzgd`, us-east-1) is **INACTIVE** (paused). Free-tier projects pause after ~1 week idle; restore window is ~90 days — it may be past that (created 2026-03-11), so be prepared to recreate from `supabase/migrations/` and lose test data |
| Vercel | `settle.vercel.app` returns nothing useful; even if the deploy exists, the app is dead while Supabase is paused |
| Twilio | Trial account — OTP only delivers to your verified number (ISSUE-013, open) |
| Tooling | pnpm 11 broke install (build-script allowlist moved to `pnpm-workspace.yaml`) — **fixed on this branch**; CLAUDE.md documents `db:migrate`/`db:reset`/`db:types` scripts that don't exist in package.json |

---

## Phase 0 — Revive the deployment (config only, ~1 hour)

Nothing else matters until this is done. In order:

1. **Restore the Supabase project** (Dashboard → project → Restore). If past the 90-day restore window: create a new project, run `supabase/migrations/00001–00004` in order, update env vars everywhere. Losing the old votes is fine — it's test data.
2. **Enable anonymous sign-ins** — Dashboard → Authentication → Settings → "Enable Anonymous Sign-Ins". The entire 1-tap vote flow is coded and merged but dead without this toggle (backlog item "Setup: Enable anonymous voting prerequisites").
3. **Verify migrations 00003/00004 actually applied.** ISSUE-027's fix was partly applied manually via SQL editor, so migration history may not match the files. Check `users.phone` is nullable and `handle_new_user` uses `NULLIF(NEW.phone, '')`.
4. **Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel and `.env.local`.** ARCHITECTURE.md still says "not needed in Vercel" — that's stale and now wrong: `closeSquabble()` and `upgradeAnonymousUser()` (vote merging) both need the admin client. Without it, lazy close silently falls back to the RLS-blocked anon client and the "LIVE badge on expired squabbles" bug (ISSUE-021) comes back in production.
5. **Add the production URL to Supabase Auth → URL Configuration** (Site URL + Redirect URLs) — ISSUE-012, still open.
6. **Twilio decision:** either upgrade to paid (~$20 minimum, removes verified-number restriction — ISSUE-013) or consciously stay on trial while anonymous voting carries the funnel. With anon voting live, OTP is only needed for creators and "lock in your vote" upgrades, so trial may be acceptable for a friends-only beta.
7. **Redeploy on Vercel** and smoke-test: OTP login, create, anon vote from incognito, expiry → results.
8. Update ARCHITECTURE.md's deploy checklist to match (service key, anon sign-ins toggle).

---

## Phase 1 — Fix "who voted" identity (the known complaint)

**Symptom:** the voter breakdown ("See who voted") shows **"Anonymous"** for most voters instead of a name or phone number.

**Root-cause chain** (all four are real, they compound):

1. **Most voters have `display_name = null`.** Name capture is optional and easy to skip in every flow (login name step, post-vote prompt, dashboard prompt), and anonymous voters skip auth entirely.
2. **The UI has no fallback other than the string "Anonymous"** ([voter-breakdown.tsx:57](src/components/voter-breakdown.tsx)). Phone numbers were never shown — there's no code path that ever displayed them.
3. **RLS:** profile reads require `auth.uid() IS NOT NULL` (migration 00002), so any not-logged-in render of the breakdown resolves every join to `null`.
4. **Privacy bug in the other direction (log as critical before relaunch):** migration 00002 grants row-level SELECT on **all columns** of `public.users` to any authenticated user — including anonymous sessions. Anyone with the anon key can enumerate **full phone numbers** via PostgREST. The app only selects `display_name`, but the API allows more.

**Fix plan (in order):**

1. **Identity fallback chain in the breakdown** — never render bare "Anonymous":
   `display_name` → masked phone `"••• 1694"` (last 4, phone-verified voters) → `"Anonymous #2"` (stable per-squabble index).
   Do the phone masking **server-side** in [page.tsx](src/app/s/[slug]/page.tsx) using the admin client for the voters query (it's already gated by `shouldShowVoters`); only the last 4 digits ever leave the server.
2. **Lock down the phone column:** `REVOKE SELECT (phone) ON public.users FROM anon, authenticated;` (column-level grant), keep full access via service role only. Audit app queries so nothing does `users.select("*")` afterward (today only `display_name` is selected — safe).
3. **Capture more names, zero new screens:**
   - Persist `display_name` to `localStorage` and prefill the post-vote prompt / login name step from it.
   - Make the post-vote prompt name-first: name field + Save as the hero, "Verify with phone" stays the quiet secondary link. (Already close — tighten copy and autofocus.)
   - Require a display name before **creating** a squabble (inline field on `/create` when missing) — creators anchor the social graph, and it's one field for the most invested user.
4. **Regression tests:** breakdown fallback rendering (name / masked phone / indexed anonymous), and a test asserting the voters query never selects raw `phone` into client-visible props.

---

## Phase 2 — Flow & click-count tuning

Interaction counts audited from the code (taps in-app after opening the link/app):

| Flow | Today (restored, anon ON) | Target | How |
|---|---|---|---|
| New voter | **1 tap** (vote) + optional name | 1 tap | Already built — Phase 0.2 unlocks it |
| New voter, anon sign-in fails | **Dead end** — error text, no path forward | 5 interactions | **Bug:** [vote-buttons.tsx:51-64](src/components/vote-buttons.tsx) shows the error and stops. Restore the ISSUE-024 fallback: on `signInAnonymously()` error, `router.push('/login?redirect=' + encodeURIComponent('/s/{slug}?vote={side}'))` so OTP + auto-cast still works |
| Returning voter | 1 tap | 1 tap | — |
| Creator: create | 2 taps + 3 fields + 1 tap submit | 1 tap + 3 fields + submit | Logged-in `/` should go straight to create (redirect or render the form inline) — the marketing landing is for logged-out users |
| Creator: vote on own squabble | 1 tap later, easy to forget | 0 | **"Pick your side" (optional) on the create form → auto-cast on create.** Seeds every shared link at 1–0 instead of 0–0 (a live scoreboard is better bait) and removes a whole step |
| Creator: share | 1 tap ("Text it to the group") | 1 tap, but primary | Post-create, share is the creator's only job: make it the dominant CTA, auto-copy the link on page load right after creation |
| Results: share | 1 tap | 1 tap | Elevate "Share the result" to `variant="default"` (backlog, open) |

Also in this phase (all from the open backlog, all small):

- **Vote button hierarchy (backlog HIGH):** vote buttons are `variant="outline"` — identical to Copy link/Rematch. Give them solid side-color fills (see Phase 3 tokens) so the primary action is unmistakable.
- Post-vote identity prompt: one decision per screen (name first, phone behind a link — see Phase 1.3).

---

## Phase 3 — Design system & themes

The default look is stock shadcn gray with zero brand; the three themes are fun but fragile and gimmick-scoped. Direction: **make "versus" the brand** — two side colors used everywhere — and rebuild themes as token swaps on top.

1. **Side-color tokens as the design core.** Add `--side-a` / `--side-b` CSS variables (default recommendation: blue `#2563eb` vs orange `#ea580c` — max contrast pair, colorblind-safe; the red/blue "corners" palette stays as The Ring's flavor). Use them consistently in: vote buttons (solid fills), post-vote bars, results bars, decider banner, dashboard cards, and both OG images. Today's results bars use green=winner/blue=loser while post-vote bars are blue/blue — sides should keep their color identity everywhere; mark the winner with weight/badge, not a color swap.
2. **Fix typography (1 line):** `@theme inline` maps `--font-sans: var(--font-sans)` — circular, so **Geist Sans is loaded but never applied** ([globals.css:10](src/app/globals.css), [layout.tsx:8-11](src/app/layout.tsx)). Point it at `var(--font-geist-sans)`. While there: give the question headline real display treatment (size/weight/tracking) — it's the product's hero text on every surface.
3. **Harden the theme system.** Theme CSS targets structural utility classes (`.grid-cols-2 > button:first-child`, `.space-y-3 > div:first-child .rounded-full .rounded-full`) with `!important` — any layout refactor silently breaks all three themes. Add semantic hooks (`data-vote-side="a"`, `data-bar-side="a"`, existing `data-slot`) and rewrite themes to override **tokens** (`--side-a`, `--background`, …) instead of components.
4. **Make theme a per-squabble property, not a viewer preference.** Add `disputes.theme` column, picked at create time (the 🥊/🌋/☄️ pills move from header to create form); every visitor sees the same skin and the OG image can match it. The current localStorage toggle means your recipients never see the vibe you picked — themes as **shareable content** is the whole point. Keep localStorage only as the creator's default for new squabbles.
5. **Fix Impact theme contrast (ISSUE-026)** and extend [theme-contrast.test.ts](src/lib/__tests__/theme-contrast.test.ts) to cover primary/badge-on-background pairs so this can't regress.
6. **Kill the theme FOUC:** theme class is applied in a `useEffect` after hydration — every load flashes unthemed. Inline a tiny `<script>` in `<head>` that reads localStorage (or the squabble's theme) pre-paint, same pattern as dark-mode scripts.
7. **Dark mode for the default theme:** the shadcn `.dark` token block already exists in globals.css — wire it to `prefers-color-scheme` (backlog item, genuinely low effort).
8. **PWA repair:** `manifest.json` references `/icon-192.png` + `/icon-512.png` that **don't exist** (public/ has only Next template SVGs) → broken install/home-screen icon. Generate real icons (+ maskable + `apple-touch-icon`), align `theme_color` with the actual default theme, delete the template SVGs.
9. **A11y quick wins:** remove `maximumScale: 1` from viewport (blocks pinch-zoom, WCAG 1.4.4); `aria-label` on the download button (ISSUE-025); focus-visible rings on the theme toggle pills.

---

## Phase 4 — Data model & backend hardening

1. **Close squabbles without the service key.** Replace the admin-client dependency in `closeSquabble()` with a `SECURITY DEFINER` Postgres function `close_expired_dispute(dispute_id)` that re-checks `expires_at < now()`, tallies, and writes `status`/`winner_side` itself — callable by anon. Removes the silent-fallback footgun entirely (the current fallback quietly reintroduces ISSUE-021 when the env var is missing) and keeps tally logic in one trusted place.
2. **Phone column privacy** (Phase 1.2) — ship in the same migration.
3. **`disputes.theme` column** (Phase 3.4) — same migration.
4. **Generated DB types:** add the documented-but-missing `db:types` script (`supabase gen types typescript`), replace the hand-rolled casts (`as unknown as Record<string, unknown>` in dashboard, `as unknown as { display_name }` in page.tsx).
5. **Defer the `disputes` → `squabbles` rename** (backlog, medium). It's cosmetic-internal, touches every query string + RLS policy + types, and has zero user-visible value. Do it opportunistically after types generation lands, or not at all.

---

## Phase 5 — Test & tooling debt

1. **Create the missing e2e suite** — config, mobile-Safari/Chrome projects, and webServer are already set up; the `e2e/` directory just doesn't exist, so `pnpm test:e2e` (which CLAUDE.md says to run before deploys) errors. Minimum smoke pack against local dev + local Supabase: create → anon vote in second context → expiry → results → voter names.
2. **Extract pure logic for unit tests:** `closeSquabble`'s tally decision → `computeOutcome(votesA, votesB)` in lib/utils (majority/tie/zero-votes are the product's core rules and currently only testable through Supabase mocks).
3. **CI:** a single GitHub Action running `pnpm install && pnpm test && pnpm build` on PRs — free, catches the "worked locally" class.
4. **Tooling pins (done on this branch):** `pnpm-workspace.yaml` rewritten for pnpm 11's `allowBuilds`; recommend also pinning `"packageManager": "pnpm@11.18.0"` in package.json so Vercel/corepack/local all agree.
5. Dead code sweep: `showIdentityPrompt` state in vote-buttons.tsx is never set true; `verifyOtp` import unused in post-vote-prompt.tsx.
6. Run the `/uat` skill (medium mode) after Phase 0 + 1 land, before inviting anyone.

---

## Sequencing & effort

| Order | What | Size | Why first |
|---|---|---|---|
| P0 | Phase 0 revive checklist | ~1h, config | Everything is dead without it |
| P0 | Anon-fail dead-end fix (Phase 2 bug) | ~15 min | New users literally cannot vote if the toggle is off/errors |
| P1 | Voter identity chain + phone privacy (Phase 1) | ~½ day | The known complaint + a real privacy hole |
| P1 | Vote-button hierarchy, share-CTA elevation, quick a11y wins | ~1h total | Highest visible-polish per minute |
| P2 | Side-color token system + typography fix + results-bar consistency | ~½ day | Foundation the themes and OG images sit on |
| P2 | Creator flow: side-pick on create, logged-in home → create, share-first post-create | ~½ day | Biggest click savings for the most invested user |
| P3 | Per-squabble themes + FOUC fix + Impact contrast + dark mode | ~1 day | Turns themes into shareable content |
| P3 | PWA icons/manifest, e2e smoke pack, CI, close-via-RPC migration | ~1 day | Durability |
| Defer | disputes→squabbles rename, native wrapper, multi-option polls | — | Low value or premature |

Backlog items this plan deliberately leaves untouched for later: "Side B is gaining" toast, blurred avatar wall, creator push notification, tie-breaker round, weekly digest, stats/streaks — all good P4 growth candidates once the app is live again and the funnel above is clean.
