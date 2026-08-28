# Issues — Squabble

Living bug and issue tracker. Log bugs as they're found, update when fixed.

> **Running a bug-finding pass?** Use the `/uat` skill (see `.claude/skills/uat/SKILL.md`).
> It tests all personas and flows end-to-end and logs findings here automatically.
> Run modes: short (~2 min), medium (~5 min), long (~10 min).

## Format
```
### [ISSUE-NNN] Brief title
- **Date:** YYYY-MM-DD HH:MM
- **Area:** (auth | squabbles | voting | timer | dashboard | ui | infra | theme | mobile)
- **Persona:** (Creator | Anonymous Viewer | New Voter | Returning Voter | Results Viewer | Dashboard User | Theme Switcher | Mobile User)
- **Description:** What's broken
- **Steps to Reproduce:** 1. Go to... 2. Click... 3. See...
- **Complexity:** (low | medium | high)
- **Priority:** (low | medium | high | critical)
- **Root Cause:** (code bug | test bug | config | design flaw | unknown)
- **Status:** Open | Fixed
- **Fix:** What was changed (include commit hash)
- **Regression Test:** Yes/No — link to test if added
```

---

### [ISSUE-001] Vitest fails to load config — ESM/CJS mismatch
- **Date:** 2026-03-10
- **Area:** infra
- **Description:** `pnpm test` fails with `ERR_REQUIRE_ESM` — vitest 4.x + vite 7 requires ESM but `vitest.config.ts` was loaded as CJS.
- **Root Cause:** config — `package.json` has no `"type": "module"` and vitest resolved to CJS entrypoint.
- **Status:** Fixed
- **Fix:** Renamed `vitest.config.ts` → `vitest.config.mts` and replaced `__dirname` with `fileURLToPath(import.meta.url)`. (commit a0339a9)
- **Regression Test:** No — build + test pass confirms fix.

### [ISSUE-002] shadcn v4 Button does not support `asChild` prop
- **Date:** 2026-03-10
- **Area:** ui
- **Description:** TypeScript build error — `Property 'asChild' does not exist` on Button. shadcn v4 uses `@base-ui/react` instead of Radix, which has no `asChild`.
- **Root Cause:** design flaw — code used Radix-era `asChild` pattern with shadcn v4 components.
- **Status:** Fixed
- **Fix:** Replaced `<Button asChild><Link>` with `<Link className={buttonVariants(...)}>` in header, landing page, and dashboard. (commit a0339a9)
- **Regression Test:** No — build pass confirms fix.

### [ISSUE-003] `useSearchParams()` missing Suspense boundary on login page
- **Date:** 2026-03-10
- **Area:** auth
- **Description:** `pnpm build` fails during static generation — `useSearchParams() should be wrapped in a suspense boundary at page "/login"`.
- **Root Cause:** code bug — login page was a client component using `useSearchParams` without a Suspense wrapper.
- **Status:** Fixed
- **Fix:** Extracted login form into `src/components/login-form.tsx` client component, wrapped in `<Suspense>` in the page file. (commit a0339a9)
- **Regression Test:** No — build pass confirms fix.

### [ISSUE-004] TypeScript literal type narrowing on TIMER_PRESETS
- **Date:** 2026-03-10
- **Area:** disputes
- **Description:** Build error — `Type '15' is not assignable to type 'SetStateAction<60>'` in create page. `useState(TIMER_PRESETS[1].value)` inferred type as literal `60` instead of `number`.
- **Root Cause:** code bug — `TIMER_PRESETS` is `as const`, so `.value` is a literal type.
- **Status:** Fixed
- **Fix:** Added explicit generic `useState<number>(TIMER_PRESETS[1].value)` in create page. (commit a0339a9)
- **Regression Test:** No — build pass confirms fix.

### [ISSUE-005] Supabase join type mismatch in dashboard
- **Date:** 2026-03-10
- **Area:** dashboard
- **Description:** Build error — `Conversion of type 'any[]' to type 'Record<string, unknown>' may be a mistake`. Supabase `.select("..., disputes(*)")` returns array type.
- **Root Cause:** code bug — direct cast `as Record<string, unknown>` failed because Supabase infers joined relation as array.
- **Status:** Fixed
- **Fix:** Used double cast `as unknown as Record<string, unknown>` in dashboard page. (commit a0339a9)
- **Regression Test:** No — build pass confirms fix.

### [ISSUE-007] Phone input requires country code — no auto-formatting
- **Date:** 2026-03-10
- **Area:** auth
- **Description:** Users have to manually type "+1" before their phone number. Should auto-detect US numbers and prepend +1. No input formatting (parentheses, dashes).
- **Root Cause:** design flaw — phoneSchema only validated E.164 format without normalizing input.
- **Status:** Fixed
- **Fix:** Added `.transform()` to phoneSchema that auto-prepends +1 for 10-digit US numbers, strips formatting chars. Updated placeholder to "(555) 123-4567".
- **Regression Test:** No

### [ISSUE-008] buttonVariants() called from server components causes 500
- **Date:** 2026-03-10
- **Area:** ui
- **Description:** Landing page, header, and dashboard crash with "Attempted to call buttonVariants() from the server but buttonVariants is on the client". shadcn v4 button.tsx has `"use client"` which makes all exports client-only.
- **Root Cause:** code bug — `buttonVariants` (pure CVA data) was exported from `"use client"` file.
- **Status:** Fixed
- **Fix:** Extracted `buttonVariants` into `src/components/ui/button-variants.ts` (no `"use client"`). Updated imports in header.tsx, page.tsx, dashboard/page.tsx.
- **Regression Test:** No — dev server renders all pages.

### [ISSUE-006] Next.js middleware deprecation warning
- **Date:** 2026-03-10
- **Area:** infra
- **Description:** Build warns `The "middleware" file convention is deprecated. Please use "proxy" instead.` Next.js 16 is deprecating middleware in favor of proxy.
- **Root Cause:** config — Next.js 16.1.6 deprecates `middleware.ts`.
- **Status:** Open
- **Fix:** Migrate to proxy convention when Next.js proxy API stabilizes. Low priority — works fine for now.
- **Regression Test:** N/A

### [ISSUE-009] SMS OTP not delivered — A2P 10DLC error 30034
- **Date:** 2026-03-10
- **Area:** auth
- **Description:** Twilio SMS messages show as "Undelivered" with error 30034 (US A2P 10DLC — Message from an Unregistered Number). Local 10DLC numbers can't send SMS without A2P registration, which requires a paid Twilio account.
- **Root Cause:** config — Supabase was using Twilio Programmable SMS with a local Kansas number (+17855041694). US carriers block all unregistered 10DLC traffic.
- **Status:** Fixed
- **Fix:** Switched from Twilio Programmable SMS to Twilio Verify in Supabase. Created a Verify Service (SID: VAbfa7ab23161e655846270a2b9461f2da) in Twilio Console. Changed Supabase Phone provider from "Twilio" to "Twilio Verify" with the Verify Service SID. Twilio Verify handles A2P compliance automatically.
- **Regression Test:** No — manual test confirms OTP delivered and login works.

### [ISSUE-010] revalidatePath during render crashes lazy close
- **Date:** 2026-03-10
- **Area:** disputes
- **Description:** When a dispute expires and the page triggers lazy close (calling `closeDispute` during server component render), Next.js 16 throws: "Route /s/[slug] used 'revalidatePath /s/wep15NPM' during render which is unsupported."
- **Root Cause:** code bug — `closeDispute()` called `revalidatePath()` at the end. When invoked during page render (lazy close path in `DisputePage`), Next.js 16 rejects revalidation during render.
- **Status:** Fixed
- **Fix:** Removed `revalidatePath` call from `closeDispute()` in `src/lib/actions/disputes.ts`. The lazy close path already re-fetches the dispute after calling `closeDispute`, so revalidation is unnecessary.
- **Regression Test:** No — manual test confirms dispute settles correctly on page load.

### [ISSUE-011] Vercel "name already used" error on initial deploy
- **Date:** 2026-03-11
- **Area:** infra
- **Description:** Vercel's "New Project" clone flow showed "The specified name is already used for a different Git repository" when trying to deploy. The clone URL was pre-filled, conflicting with the existing `praparla/settle` repo.
- **Root Cause:** config — navigated to Vercel's clone flow instead of the import flow. The clone flow tries to create a new repo, conflicting with the existing one.
- **Status:** Fixed
- **Fix:** Used `vercel.com/new` → "Import Git Repository" flow instead of the clone flow. Selected existing `praparla/settle` repo, added env vars, deployed successfully.
- **Regression Test:** N/A

### [ISSUE-012] Supabase auth redirect URL not configured for production
- **Date:** 2026-03-11
- **Area:** auth
- **Description:** After deploying to Vercel, OTP login may fail to redirect correctly because Supabase auth is only configured for `localhost:3000`. The production Vercel URL needs to be added to Supabase's allowed redirect URLs.
- **Root Cause:** config — Supabase Auth URL Configuration only has localhost, not the production domain.
- **Status:** Open
- **Fix:** Add Vercel production URL to Supabase Dashboard → Authentication → URL Configuration → Site URL and Redirect URLs.

### [ISSUE-013] OTP fails for non-verified phone numbers (Twilio trial)
- **Date:** 2026-03-11
- **Area:** auth
- **Description:** Friends cannot receive OTP codes. `sendOtp` returns a generic "Failed to send verification code" error. Works only for the developer's own number.
- **Root Cause:** config — Twilio account is on free trial. Trial accounts can only send SMS/Verify to phone numbers manually verified in the Twilio Console. All other numbers are rejected.
- **Status:** Open
- **Fix:** Upgrade Twilio account from trial to paid (add payment method in Twilio Console → $20 minimum). This removes the verified-caller-ID restriction and allows Twilio Verify to send to any phone number. Improved error message in `sendOtp` to be more descriptive.
- **Regression Test:** No — requires Twilio account upgrade to verify.

### [ISSUE-014] CountdownTimer calls onExpire during render
- **Date:** 2026-03-11
- **Area:** ui
- **Description:** `CountdownTimer` component calls `onExpire()` callback directly inside the render body when `isExpired` is true. This is a side effect during render — violates React rules and could cause bugs if the callback triggers state updates or navigation.
- **Root Cause:** code bug — callback invoked during render instead of in a `useEffect`.
- **Status:** Fixed
- **Fix:** Moved `onExpire` call into a `useEffect` with a `useRef` guard to ensure it fires exactly once when the timer expires.
- **Regression Test:** No — prop is currently unused but now safe to use.

### [ISSUE-016] Vote count doesn't update in real-time for other viewers
- **Date:** 2026-03-11
- **Area:** voting
- **Description:** When someone votes on a dispute, other users viewing the same page don't see the count go up. The voter themselves also sees stale counts after voting. Two root causes: (1) `VoteButtons` didn't call `router.refresh()` after a successful vote, so the voter saw stale server-rendered data. (2) No Supabase Realtime subscription — other viewers had no mechanism to learn about new votes.
- **Root Cause:** code bug — missing `router.refresh()` after vote + no realtime listener.
- **Status:** Fixed
- **Fix:** Added `router.refresh()` in `VoteButtons` on success. Created `RealtimeVoteListener` component that subscribes to Supabase Realtime INSERT events on the `votes` table (filtered by dispute_id) and triggers `router.refresh()`. Component is mounted only while voting is open.
- **Regression Test:** No — requires Supabase Realtime enabled on `votes` table.

### [ISSUE-015] DisputeCard shows "Tie" for disputes with zero votes
- **Date:** 2026-03-11
- **Area:** ui
- **Description:** On the dashboard, disputes that expired with no votes show "Tie" badge. Both zero-vote and actual-tie disputes have `status: "expired"` and `winner_side: null`, so the card can't distinguish them. "Tie" is misleading when nobody voted.
- **Root Cause:** code bug — `statusLabel` logic treated all non-winner closed disputes as ties.
- **Status:** Fixed
- **Fix:** Changed label from "Tie" to "No Winner" which is accurate for both tie and zero-vote cases.
- **Regression Test:** No

### [ISSUE-017] Timer expiry doesn't auto-refresh to show results
- **Date:** 2026-03-11
- **Area:** timer
- **Description:** When the countdown timer hits 0 on the dispute page, the page doesn't transition to the results view. Users have to manually refresh. The `CountdownTimer` had an unused `onExpire` prop that couldn't be wired from a server component.
- **Root Cause:** code bug — server components can't pass callbacks to client components. The `onExpire` callback was never connected.
- **Status:** Fixed
- **Fix:** Removed `onExpire` prop. `CountdownTimer` now calls `router.refresh()` internally via `useEffect` when the timer expires, triggering lazy close on the server.
- **Regression Test:** No

### [ISSUE-018] Create form Side A/B inputs don't stack on mobile
- **Date:** 2026-03-11
- **Area:** ui
- **Description:** On mobile viewports, the Side A and Side B input fields are crammed side-by-side in a 2-column grid. The inputs are too narrow to type in comfortably on phones.
- **Root Cause:** design flaw — `grid-cols-2` was unconditional with no responsive breakpoint.
- **Status:** Fixed
- **Fix:** Changed to `grid-cols-1 sm:grid-cols-2` so inputs stack vertically on mobile and go side-by-side on larger screens.
- **Regression Test:** No

### [ISSUE-019] Copy is generic and lacks personality
- **Date:** 2026-03-11
- **Area:** ui
- **Description:** All UI text used bland, formal language ("Create a Dispute", "Side A", "Voting Timer", "Active Disputes", etc.). The app is meant to feel fun and social — like texting friends — not like a business app.
- **Root Cause:** design flaw — copy was written functionally without personality.
- **Status:** Fixed
- **Fix:** Rewrote all user-facing copy across 11 files: landing page, create page, dashboard, dispute page, vote buttons, dispute card, dispute results, share button, countdown timer, login form, header, voter breakdown. Examples: "Create a Dispute" → "What do you want to settle?", "Side A" → "This side says...", "Winner: Pizza" → "Pizza wins — 7 to 3", "Share with friends" → "Text it to the group".
- **Regression Test:** No

### [ISSUE-020] All voters show as "Anonymous" in voter breakdown
- **Date:** 2026-03-15
- **Area:** voting
- **Description:** The voter breakdown (creator-only view) shows "Anonymous" for all voters. The `display_name` field is null for every user who voted because the name prompt only appeared on the dashboard — a page voters never visit. Users go: shared link → login → vote → done. No name collection in the vote flow.
- **Root Cause:** design flaw — `DisplayNamePrompt` component was only rendered on the dashboard page. The vote login flow (phone → OTP → redirect to squabble) never prompted for a display name.
- **Status:** Fixed
- **Fix:** Added an optional "What should we call you?" step to the login form that appears after OTP verification when the user is being redirected to a vote page (`isVoteRedirect`). Users can save a name or skip. Non-vote logins (to dashboard) skip this step entirely — the existing `DisplayNamePrompt` on the dashboard handles that case. Also added auto-cast vote after login redirect to reduce friction.
- **Regression Test:** Yes — `copy-and-features.test.ts`: "Login form name step" describe block tests step transitions, skip behavior, and description copy. "Auto-cast vote after login redirect" describe block tests URL param storage, cast conditions, and edge cases.

### [ISSUE-021] "LIVE" badge shown on expired squabbles — lazy close silently blocked by RLS
- **Date:** 2026-03-19 14:00
- **Area:** squabbles
- **Persona:** Anonymous Viewer
- **Description:** All expired squabbles with `status: "open"` in the DB show a "LIVE" badge alongside the results view (vote bars, "Share the result" button, no vote buttons). The lazy close mechanism in `SquabblePage` calls `closeSquabble()` which tries to UPDATE the dispute row, but the RLS policy `"Creator can update own disputes"` (`auth.uid() = creator_id`) blocks non-creator/anonymous sessions. The UPDATE silently returns 0 rows (no error thrown), the DB status stays "open", but `isExpired()` returns true → `showResults = true`. The page is stuck in a mixed state: badge says "LIVE", content shows results. Affects 100% of expired squabbles visited by non-creators.
- **Steps to Reproduce:** 1. Let a squabble's timer expire. 2. Visit `/s/{slug}` while not logged in or not the creator. 3. See "LIVE" badge with results view below it.
- **Complexity:** medium — requires using service role key in `closeSquabble()` for the UPDATE, or adding an RLS policy for timed-out disputes.
- **Priority:** critical — "LIVE" badge on closed squabbles is factually wrong; every expired squabble shows this for non-creator visitors.
- **Root Cause:** code bug — `closeSquabble()` uses the regular anon Supabase client; RLS blocks the UPDATE for non-creator sessions; no error surfaced.
- **Status:** Fixed
- **Fix:** Switched `closeSquabble()` to use the admin client (`createAdminClient()`) which bypasses RLS. Safe because: (1) only runs server-side, (2) only updates when `status === "open" && isExpired()`, (3) only writes computed fields (`status`, `winner_side`, `closed_at`).
- **Regression Test:** No — requires expired squabble visited by non-creator to verify.

### [ISSUE-022] Invalid squabble slug shows stock Next.js 404 — no custom error page
- **Date:** 2026-03-19 14:00
- **Area:** ui
- **Persona:** Anonymous Viewer
- **Description:** Navigating to `/s/nonexistentslug` (or any invalid slug) shows the default Next.js 404 page with a plain black background that ignores the active theme. No friendly copy, no "Go home" button, and the theme doesn't apply (body class not set until JS hydrates, but the 404 page has no `ThemeToggle`). Users who receive a broken link have no recovery path.
- **Steps to Reproduce:** 1. Navigate to `/s/doesnotexist`. 2. See black background + stock "404 / This page could not be found." with no theming or navigation.
- **Complexity:** low — add a `not-found.tsx` in `src/app/s/[slug]/` with friendly copy and a link back to `/`.
- **Priority:** medium — broken links are common (typos, expired shares); users deserve a friendly fallback.
- **Root Cause:** code bug — no custom `not-found.tsx` file in the `[slug]` route; `notFound()` falls through to Next.js default.
- **Status:** Fixed
- **Fix:** Added `src/app/s/[slug]/not-found.tsx` with themed card, friendly copy ("Squabble not found"), and a "Back to Squabble" link.
- **Regression Test:** No

### [ISSUE-023] Rematch button visible to all logged-in users, not just creator
- **Date:** 2026-03-19 14:00
- **Area:** squabbles
- **Persona:** Results Viewer
- **Description:** The Rematch button on closed squabble pages is shown to any logged-in user (`showResults && !!user`), not just the squabble creator. `createRematch()` also doesn't check creator ownership — any user can create a rematch of any squabble. This may or may not be intentional, but it means participants (not just the creator) can spawn new squabbles on behalf of others.
- **Steps to Reproduce:** 1. Log in as a non-creator user. 2. Navigate to a closed squabble. 3. See the Rematch button.
- **Complexity:** low — add `isCreator` check to the Rematch button render condition and in `createRematch()` action.
- **Priority:** low — functional side-effect, not a crash; rematches are harmless but may surprise creators.
- **Root Cause:** design flaw — creator check missing from both UI condition and server action.
- **Status:** Fixed
- **Fix:** Changed UI condition from `showResults && !!user` to `showResults && isCreator`. Added `creator_id` to the `createRematch` SELECT query and a server-side ownership check that returns an error for non-creators.
- **Regression Test:** No

### [ISSUE-024] Vote intent lost after OTP login when anonymous sign-in fails
- **Date:** 2026-03-20 04:00
- **Area:** voting | auth
- **Persona:** New Voter
- **Description:** When an anonymous sign-in fails during a vote attempt, `vote-buttons.tsx` redirects to `/login?redirect=/s/{slug}&vote={side}`. However, the login form reads only `searchParams.get("redirect")` which gives `/s/{slug}` — stripping the `vote` param. After OTP login completes, `router.push(redirectTo)` navigates to `/s/{slug}` without `?vote={side}`, so the server-side auto-cast never fires and the user's vote is silently dropped.
- **Steps to Reproduce:** 1. Visit a squabble page while logged out. 2. Click a vote button. 3. Anonymous sign-in fails (e.g. anon auth disabled), redirecting to `/login?redirect=/s/k9_9n8gz&vote=b`. 4. Complete OTP login. 5. Land on squabble page — vote bars empty, vote was NOT auto-cast.
- **Complexity:** low — encode the vote param into the redirect path itself: `/login?redirect=/s/{slug}?vote={side}` (URL-encoded), or read `vote` from searchParams in the login form and append it to the redirectTo.
- **Priority:** high — vote intent is silently dropped; users who just went through the login flow expect their vote to be recorded.
- **Root Cause:** code bug — `vote` param is passed as a sibling URL param to `redirect`, not embedded within the redirect URL. `LoginForm` only reads `redirect`, discarding `vote`.
- **Status:** Fixed

- **Fix:** Encoded vote into redirect URL path: `router.push(\`/login?redirect=\${encodeURIComponent(\`/s/\${slug}?vote=\${side}\`)}\`)`. LoginForm reads `searchParams.get("redirect")` which now returns `/s/{slug}?vote={side}`, preserving vote intent through the full auth flow.
- **Regression Test:** No
### [ISSUE-027] Anonymous voting fails — "Database error creating anonymous user"
- **Date:** 2026-03-20 04:00
- **Area:** voting | auth
- **Persona:** New Voter
- **Description:** Clicking a vote button as an unauthenticated user triggers `signInAnonymously()` which fails with "Database error creating anonymous user". Three root causes: (1) Migration `00003` (making `public.users.phone` nullable) was never applied to production — column was still `NOT NULL`, so the `handle_new_user` trigger failed inserting anonymous users with `phone = NULL`. (2) The trigger itself used `NEW.phone` directly, but Supabase sets `phone = ''` (empty string) for anonymous users — causing unique constraint violations if multiple anonymous users signed up. (3) The error was silently redirected to the OTP login page instead of being shown to the user.
- **Steps to Reproduce:** 1. Visit `/s/{slug}` while logged out. 2. Click a vote button. 3. See redirect to login page (before fix) or "Anonymous sign-in failed" error (after partial fix).
- **Complexity:** medium — required DB migration, trigger fix, and code changes.
- **Priority:** critical — anonymous voting was completely broken for all users.
- **Root Cause:** config + code bug — missing DB migration + trigger not handling empty phone strings + silent error redirect.
- **Status:** Fixed
- **Fix:** (1) Applied `ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL` in production. (2) Updated `handle_new_user` trigger to use `NULLIF(NEW.phone, '')` (migration `00004`). (3) Changed `vote-buttons.tsx` to show error on-screen instead of silently redirecting to login. (4) Changed `vote-buttons.tsx` to use `window.location.href` instead of `router.push` for hard navigation after anonymous sign-in (ensures cookie sync).
- **Regression Test:** No — manual test confirms anonymous vote flow works end-to-end.

### [ISSUE-028] revalidatePath during render crashes auto-cast vote on anonymous redirect
- **Date:** 2026-03-20 04:00
- **Area:** voting
- **Persona:** New Voter
- **Description:** After anonymous sign-in succeeds and redirects to `/s/{slug}?vote=a`, the server component calls `castVote()` during render to auto-cast. `castVote()` calls `revalidatePath()` which is not allowed during render in Next.js 16, causing a 500 error: "Route /s/[slug] used 'revalidatePath' during render which is unsupported." Same class of bug as ISSUE-010.
- **Steps to Reproduce:** 1. Click vote as anonymous user. 2. Anonymous sign-in succeeds, redirects to `/s/{slug}?vote=a`. 3. Server-side auto-cast calls `castVote()` → crashes on `revalidatePath`.
- **Complexity:** low — replace `castVote()` with direct DB insert in the auto-cast path.
- **Priority:** critical — blocks the entire anonymous voting flow after sign-in succeeds.
- **Root Cause:** code bug — `castVote()` server action called during render, which includes `revalidatePath()`.
- **Status:** Fixed
- **Fix:** Replaced `castVote()` call in `page.tsx` auto-cast path with a direct `supabase.from("votes").insert()` — avoids the `revalidatePath` call during render. The `redirect()` on the next line already triggers a fresh page load.
- **Regression Test:** No — manual test confirms anonymous vote auto-cast works.

### [ISSUE-025] Download button on results page has no accessible label
- **Date:** 2026-03-20 04:00
- **Area:** ui
- **Persona:** Results Viewer
- **Description:** The Download image button in `ShareResultButton` renders as an icon-only button with no `aria-label`, `title`, or visible text. Screen readers will announce it as an unlabeled button. Assistive technology users cannot identify its purpose.
- **Steps to Reproduce:** 1. Navigate to a closed squabble (e.g. `/s/wep15NPM`). 2. Inspect the Download button next to "Share the result" — no accessible name.
- **Complexity:** low — add `aria-label="Download result image"` to the Button element in `share-result-button.tsx`.
- **Priority:** low — accessibility issue; visual users understand from context and icon shape.
- **Root Cause:** code bug — icon-only button missing accessible label.
- **Status:** Open

### [ISSUE-026] Impact theme: low-contrast badges, buttons, and winner banner
- **Date:** 2026-03-20 04:00
- **Area:** theme
- **Persona:** Theme Switcher
- **Description:** In the Impact ☄️ theme, the "Decided" badge, winner announcement banner, and "Log in" / CTA buttons render in a muted olive/sage color against a dark navy background. The contrast ratio is insufficient — elements appear nearly invisible. Affects all accent-colored UI across the theme.
- **Steps to Reproduce:** 1. Switch to Impact ☄️ theme via header. 2. Navigate to a closed squabble (e.g. `/s/wep15NPM`). 3. Observe the "Decided" badge, winner pill, and "Log in" button are barely visible.
- **Complexity:** low — adjust Impact theme's accent/primary color variables in `globals.css` to meet WCAG AA contrast requirements against the dark background.
- **Priority:** medium — all users who pick this theme will see broken UI; branding impression is negative.
- **Root Cause:** design flaw — Impact theme accent color insufficient contrast against its dark background.
- **Status:** Open

### [ISSUE-029] Vote button dead-ends when anonymous sign-in fails — no OTP fallback
- **Date:** 2026-07-30
- **Area:** voting | auth
- **Persona:** New Voter
- **Description:** In `vote-buttons.tsx`, when `signInAnonymously()` fails (anon sign-ins disabled in Supabase, network error, etc.), the handler shows the raw error and returns. The ISSUE-024 fallback (redirect to `/login?redirect=/s/{slug}?vote={side}` for OTP + auto-cast) was removed by the ISSUE-027 fix. A logged-out user tapping a vote button has NO path to vote — the flow is a hard dead end unless they discover the header "Log in".
- **Steps to Reproduce:** 1. Disable anonymous sign-ins in Supabase. 2. Open `/s/{slug}` logged out. 3. Tap a vote side. 4. See "Anonymous sign-in failed: ..." and nothing else.
- **Complexity:** low — on anon error, `router.push(\`/login?redirect=\${encodeURIComponent(\`/s/\${slug}?vote=\${side}\`)}\`)` (optionally after a brief toast).
- **Priority:** critical — blocks all new-voter conversion whenever anon auth is unavailable (which is the current prod state).
- **Root Cause:** code bug — error path replaced the login-redirect fallback instead of complementing it.
- **Status:** Open

### [ISSUE-030] Any authenticated user can read every user's full phone number via API
- **Date:** 2026-07-30
- **Area:** auth | infra
- **Persona:** — (security)
- **Description:** Migration `00002` policy `"Authenticated users can read profiles"` grants row-level SELECT on ALL columns of `public.users` (`auth.uid() IS NOT NULL`). Anonymous sessions count as authenticated, so anyone with the public anon key can `select phone from users` via PostgREST and enumerate all phone numbers. The app only queries `display_name`, but the API surface allows the leak.
- **Steps to Reproduce:** 1. `signInAnonymously()` with the anon key. 2. `GET /rest/v1/users?select=phone`. 3. Full phone list returned.
- **Complexity:** low — `REVOKE SELECT (phone) ON public.users FROM anon, authenticated;` (column-level grant); keep service-role access for server-side masking. Ensure no client query does `users.select("*")`.
- **Priority:** critical (before relaunch) — PII exposure.
- **Root Cause:** design flaw — row-level policy used where column-level restriction was needed.
- **Status:** Open

### [ISSUE-031] closeSquabble silently falls back to RLS-blocked client when service key missing
- **Date:** 2026-07-30
- **Area:** squabbles | infra
- **Persona:** Anonymous Viewer
- **Description:** `closeSquabble()` falls back to the regular anon client when `SUPABASE_SERVICE_ROLE_KEY` isn't configured. In that state the UPDATE is silently blocked by RLS for non-creators — exactly the ISSUE-021 "LIVE badge on expired squabble" bug. ARCHITECTURE.md still instructs NOT to set the service key in Vercel, so a fresh prod deploy following the docs reintroduces ISSUE-021.
- **Steps to Reproduce:** 1. Deploy without `SUPABASE_SERVICE_ROLE_KEY`. 2. Let a squabble expire. 3. Visit as non-creator — status stays "open", mixed LIVE/results state.
- **Complexity:** medium — best fix: `SECURITY DEFINER` function `close_expired_dispute(id)` that validates expiry + tallies server-side, callable by anon (no service key needed). Also update ARCHITECTURE.md env docs.
- **Priority:** high — silent failure mode on the core settle mechanic.
- **Root Cause:** design flaw — silent fallback + stale deployment docs.
- **Status:** Open

### [ISSUE-032] Geist Sans loaded but never applied — circular --font-sans variable
- **Date:** 2026-07-30
- **Area:** ui
- **Persona:** — (all)
- **Description:** `globals.css` `@theme inline` maps `--font-sans: var(--font-sans)` (self-referencing). The layout loads Geist with variable `--font-geist-sans`, which nothing consumes (only `--font-geist-mono` is wired). The whole app renders in the fallback system font; the Geist font download is wasted bytes.
- **Steps to Reproduce:** 1. Inspect computed `font-family` on body — not Geist. 2. See `globals.css:10` circular var.
- **Complexity:** low — change to `--font-sans: var(--font-geist-sans);`.
- **Priority:** medium — typography is silently not the intended design.
- **Root Cause:** code bug — wrong variable name in `@theme inline`.
- **Status:** Open

### [ISSUE-033] PWA manifest references icons that don't exist — broken install
- **Date:** 2026-07-30
- **Area:** mobile | infra
- **Persona:** Mobile User
- **Description:** `public/manifest.json` lists `/icon-192.png` and `/icon-512.png`; neither file exists (public/ contains only Next.js template SVGs). "Add to Home Screen" gets a broken/blank icon; no `apple-touch-icon` either. `theme_color` is `#ffffff` while the app defaults to the tan Ring theme.
- **Steps to Reproduce:** 1. `curl /icon-192.png` → 404. 2. Add to home screen on iOS → default letter tile.
- **Complexity:** low — generate 192/512 + maskable + apple-touch-icon, align theme_color, delete unused template SVGs.
- **Priority:** medium — PWA is the stated platform strategy; install experience is broken.
- **Root Cause:** config — manifest written, assets never generated.
- **Fix (2026-08-28):** `tools/generate-icons.py` renders the set from the `.theme-ring` palette — a
  dark rope frame holding the red and blue corners on the tan canvas, i.e. the two vote buttons a voter
  actually taps. Committed as a script, not just as PNGs, so the marks can be re-derived when the palette
  moves. Ships `icon-192`, `icon-512`, a `purpose: "maskable"` 512 scaled to 78% so Android's mask cannot
  crop the frame, and `src/app/apple-icon.png` (Next's app-directory convention, which is what actually
  emits `<link rel="apple-touch-icon">` — the old `/apple-touch-icon.png` path was never going to be
  requested). `theme_color`/`background_color` moved from `#ffffff` to the Ring canvas `#f5e6d3`, matching
  `DEFAULT_THEME`, and the `viewport.themeColor` in `layout.tsx` with it. Deleted the five unreferenced
  Next.js template SVGs. Verified against the running server: all three manifest icons and the
  apple-touch-icon return 200 `image/png`, and the emitted `<meta name="theme-color">` is the tan.
- **Regression Test:** yes — `src/lib/__tests__/pwa-manifest.test.ts`. It walks the manifest's *own* icon
  array rather than a hardcoded filename list (a literal beside the manifest would stay green through the
  exact change it should catch), asserting each file exists, has PNG magic bytes, and that its real IHDR
  width/height match the declared `sizes`. Watched fail three ways — icon deleted, `theme_color` reverted
  to white, declared size falsified — then restored.
- **Status:** Fixed

### [ISSUE-034] e2e directory missing — `pnpm test:e2e` cannot run
- **Date:** 2026-07-30
- **Area:** infra
- **Persona:** — (dev)
- **Description:** `playwright.config.ts` sets `testDir: "./e2e"` with mobile Safari/Chrome + desktop projects and a webServer, but no `e2e/` directory exists anywhere in the repo. CLAUDE.md instructs running `pnpm test:e2e` before deploys — the command errors with "no tests found".
- **Complexity:** medium — write the smoke pack: create → anon vote (second context) → expiry → results → voter breakdown.
- **Priority:** medium — deploy gate documented but nonexistent.
- **Root Cause:** design flaw — config committed without tests.
- **Status:** Open

### [ISSUE-035] Pinch-zoom disabled (maximumScale: 1) — accessibility violation
- **Date:** 2026-07-30
- **Area:** ui | mobile
- **Persona:** Mobile User
- **Description:** `layout.tsx` viewport export sets `maximumScale: 1`, preventing pinch-zoom on the primary (mobile) platform. Violates WCAG 1.4.4 Resize Text.
- **Complexity:** low — remove `maximumScale`.
- **Priority:** low
- **Root Cause:** code bug — template viewport settings kept.
- **Status:** Open

### [ISSUE-036] pnpm 11 install fails — build-script allowlist config migrated
- **Date:** 2026-07-30
- **Area:** infra
- **Persona:** — (dev)
- **Description:** pnpm 11 no longer reads `package.json#pnpm.onlyBuiltDependencies` and errors on unapproved build scripts (esbuild, msw, sharp, unrs-resolver). `pnpm-workspace.yaml` also contained a half-written `allowBuilds` scaffold with literal placeholder strings. Fresh installs failed on any machine with pnpm ≥ 11.
- **Complexity:** low
- **Priority:** high (dev-blocking)
- **Root Cause:** config — pnpm major-version behavior change.
- **Status:** Fixed
- **Fix:** Rewrote `pnpm-workspace.yaml` with `allowBuilds: {esbuild: true, msw: true, sharp: false, unrs-resolver: false}`. Recommend also pinning `"packageManager": "pnpm@11.18.0"` in package.json (this branch).
- **Regression Test:** No — `pnpm install && pnpm test && pnpm build` green confirms.

### [ISSUE-037] CLAUDE.md documents db scripts that don't exist in package.json
- **Date:** 2026-07-30
- **Area:** infra
- **Persona:** — (dev)
- **Description:** CLAUDE.md Commands section lists `pnpm db:migrate`, `pnpm db:reset`, `pnpm db:types`; package.json defines none of them. Type generation (`db:types`) matters because dashboard/page code uses hand-rolled double casts instead of generated types.
- **Complexity:** low — add supabase CLI scripts or fix the docs.
- **Priority:** low
- **Root Cause:** config — doc drift.
- **Status:** Open

### [ISSUE-038] Dead code: unused identity-prompt state and unused import
- **Date:** 2026-07-30
- **Area:** ui
- **Persona:** — (dev)
- **Description:** `vote-buttons.tsx` declares `showIdentityPrompt` state and a full render branch for it, but nothing ever sets it `true` (the post-vote prompt actually renders via the `userVote && isAnonymous` branch). `post-vote-prompt.tsx` imports `verifyOtp` but never uses it (calls `upgradeAnonymousUser`).
- **Complexity:** low — delete the dead branch/state and the unused import.
- **Priority:** low
- **Root Cause:** code bug — leftover from ISSUE-027 rework.
- **Status:** Open

---

## 2026-08-03 — Fixes applied (Phase 0/1 of IMPROVEMENT_PLAN.md)

- **ISSUE-029 (vote dead-end when anon sign-in fails) — Fixed.** `vote-buttons.tsx` now falls back to `/login?redirect=/s/{slug}?vote={side}` instead of showing an error and stopping.
- **ISSUE-030 (phone numbers readable via PostgREST) — Fixed.** Migration `00005_phone_column_privacy.sql` revokes column-level SELECT on `users.phone` from `anon`/`authenticated`. **Must be applied to the Supabase project once it is restored.**
- **ISSUE-032 (circular `--font-sans`) — Fixed.** Now points at `var(--font-geist-sans)`, so Geist Sans actually applies.
- **ISSUE-035 (pinch-zoom disabled) — Fixed.** Removed `maximumScale: 1` from viewport (WCAG 1.4.4).
- **Voter identity ("Anonymous" for everyone) — Fixed.** Labels resolve server-side: `display_name` → masked phone (`••• 1694`) → `Anonymous #N`. Raw phone numbers never reach the client.
- **ISSUE-038 (dead code) — Partially fixed.** Removed the never-true `showIdentityPrompt` state from `vote-buttons.tsx`.

## 2026-08-03 — PR #1 review round

- **ISSUE-039 — Migration 00005's phone REVOKE was a no-op. Fixed (22b6206).** A column-level `REVOKE SELECT (phone)` cannot subtract from an existing table-level `GRANT SELECT`, which Supabase's default API grants provide. The first version of the fix therefore closed nothing. Now revokes table-level SELECT from `anon`/`authenticated`, then grants back `id, display_name, avatar_url, created_at`. Found by the Codex PR bot, not by the session that wrote it. **Regression test still missing** — proving `anon` cannot read `phone` needs an integration test against a live DB, blocked on the Supabase restore.
- **ISSUE-040 — Anonymous voter labels renumbered when someone added a name. Fixed (22b6206).** Numbering ran off a count of unnamed voters, so one person setting `display_name` shifted every later anonymous voter's label. Now numbered by immutable vote position. Regression test added and mutation-checked.
- **ISSUE-041 — Two tests asserted removed behavior. Fixed (22b6206).** `anonymous-voting.test.ts` claimed a failed anonymous sign-in must show an inline error and must NOT redirect to `/login`. They passed through the opposite change because they built a local string and never touched the component. Replaced with tests calling the shipped `buildVoteLoginRedirect()`.
- **ISSUE-042 — `loading` never reset before the login redirect. Fixed (22b6206).** `router.push` is a soft navigation, so the component can outlive the call; the voter was left on permanently disabled buttons.

**Root-cause note for all four:** three of the four were found by an outside reviewer or by re-reading with a checklist, not by the passing suite. The self-review found the label instability and the `loading` miss; the bot found the P1 that made the headline security fix inert. Self-review is a floor, not a gate.

## 2026-08-28 — Migration drift, voter anonymity, result texts

- **ISSUE-043 — "Who voted" showed `Anonymous #N` for people who have names. Fixed.** *Root cause: not code — database state.* Migration `00002_auth_users_read_profiles.sql` had never been applied to the hosted project, so the only SELECT policy on `public.users` was still 00001's `auth.uid() = id`. Every voter row except the viewer's own came back `null` from the `users(display_name)` embed. The label chain then did its job perfectly and produced `Anonymous #N` for all of them. Verified before/after against the live DB: `pranava` and `Jack` rendered as `Anonymous #1/#2`, and as their real names once 00002 was applied. The masked-phone rung additionally requires `SUPABASE_SERVICE_ROLE_KEY`, which is absent from `.env.local`.
- **ISSUE-044 — A missing joined row was indistinguishable from a nameless voter. Fixed.** `userRecord?.display_name ?? null` collapsed "RLS refused this read" into "this person is anonymous", which is why ISSUE-043 looked like normal behaviour for months. `RawVoter` now carries `profile_readable`, and `countUnreadableProfiles()` drives a loud server-side error naming the likely cause. Regression tests added and mutation-checked.
- **ISSUE-045 — Closed squabble rendered under "Live now" with a "Closed" badge. Fixed.** The dashboard bucketed on `status === "open"` while `squabble-card.tsx` derived its badge from `isExpired(expires_at)`; the two disagree for exactly the row shape lazy closing guarantees (expired but not yet written). Compounded by Next.js request memoization serving the *pre-close* payload to the re-`select()` that was supposed to refresh it. Both fixed: one `resolveSquabbleStatus()` now feeds the bucket and the badge, and `closeSquabble()` returns its outcome so callers apply it in place instead of re-reading. Also removed a third copy of the same logic from `/s/[slug]/page.tsx`, which said "Closed" where the card said "No winner".
- **ISSUE-046 — `closeSquabble()` could no-op silently. Fixed.** The UPDATE had no rows-affected check, so an RLS refusal (0 rows, no error) left the app believing a squabble was closed. Now `select()`s and logs loudly when 0 rows come back.
- **ISSUE-047 — Migration 00005 was never applied; phone was readable *and writable* by any client. Fixed.** ISSUE-039 recorded this as fixed, but only in the repo — the hosted DB still had Supabase's default table-wide grants. Confirmed live: `select=id,phone` as an anonymous session returned 200. Beyond the read hole that 00005 addressed, `anon`/`authenticated` also held INSERT and UPDATE on every column, so a client could write an arbitrary `phone` to its own row and wear a masked `••• 1694` label belonging to someone else. New migration `00006_phone_write_privacy.sql` revokes writes and grants back only `display_name`/`avatar_url`. Verified: phone SELECT and PATCH now both return 403; `display_name` PATCH still returns 204.
- **ISSUE-048 — Realtime never worked. Fixed.** `supabase_realtime` had zero tables published, so `RealtimeVoteListener` had never received an event in production. 00002's `ALTER PUBLICATION` half had also never run; applied idempotently.
- **ISSUE-049 — `castVote()` had a check-then-insert race. Fixed.** It read `status`/`expires_at` and then inserted, so a vote could land just after expiry; the auto-cast path in `/s/[slug]/page.tsx` inserted directly and skipped the check entirely. Now enforced by a `BEFORE INSERT` trigger (`00007_enforce_vote_window.sql`) that covers every writer. Verified: open squabble 201, expired 400, closed 400, double-vote still 409.
- **ISSUE-050 — The result-SMS outbox could send the same message twice. Fixed before shipping.** `claim_result_notifications()` incremented `attempts` but left `status = 'pending'`. `FOR UPDATE SKIP LOCKED` only protects concurrent transactions, and the claim RPC commits on return — so the row sat pending and unlocked while the sender was calling Twilio, and the next tick re-claimed it. Two consecutive claims overlapped on **5 of 5 rows**. The claim now transitions `pending → sending`, with `requeue_stalled_notifications()` recovering rows stranded by a crashed sender. Re-tested: overlap 0.
- **ISSUE-051 — SMS bodies were 3 billed segments, not 1. Fixed before shipping.** Real squabble text contains curly apostrophes and em dashes (phone keyboards produce them). A single non-GSM-7 character re-encodes the whole message as UCS-2, where a segment is 70 characters instead of 160. `sms_normalize()` transliterates first, and `build_result_sms()` sizes the message with the link reserved. Verified across all live rows: max length 160, zero non-ASCII, no body missing its link.
- **ISSUE-052 — SMS copy read "…doesn't wins". Fixed before shipping.** `"%s wins"` assumed sides are short nouns; they are free text up to 140 chars. Now `"winner: X"`. Only visible once bodies were generated from real rows rather than invented fixtures.
- **ISSUE-053 — Status badges carried no information in two of three themes. Fixed.** `.theme-molten [data-slot="badge"]` and the Impact equivalent repainted *every* badge one accent colour with `!important`, so "Live", "Decided" and "No winner" were the same orange pill. Status colour now comes from `STATUS_BADGE_CLASSES` passed as a className (twMerge drops the conflicting variant utility), using fixed palette values legible on every theme background.
- **ISSUE-054 — `theme-toggle.tsx` failed `pnpm lint` on main. Fixed.** `setState` directly in an effect body (`react-hooks/set-state-in-effect`). Rewritten with `useSyncExternalStore`, which also fixed cross-tab theme sync as a side effect. The first rewrite mutated `document.body` during render and introduced a hydration mismatch; DOM sync moved into an effect.
- **ISSUE-055 — Theme toggle buttons had no accessible name. Fixed.** Three icon-only buttons carrying only `title`; now `aria-label` + `aria-pressed`, verified in the accessibility tree (`"Molten theme, active. Turn off"`). Also given 44px hit areas for coarse pointers.
- **ISSUE-056 — Infinite theme animations with no reduced-motion escape. Fixed.** Heat shimmer on every card, breathing vote buttons, a drifting starfield. The shimmer also animated `filter: blur()` across the card, leaving text permanently slightly out of focus. Blur removed; a `prefers-reduced-motion` block added.
- **ISSUE-057 — Fragile structural theme selectors. Fixed.** `.grid-cols-2 > button:first-child` and `.space-y-3 > div:first-child .rounded-full .rounded-full` broke on any markup change and could hit unintended elements. Replaced with `[data-vote-side]` / `[data-bar-side]` hooks.
- **ISSUE-058 — 92 tests re-implemented the logic they claimed to test. Fixed.** `copy-and-features.test.ts` declared local copies (`const getStatusLabel = ...`) and asserted on those, plus tautologies like `const sideA = "Pizza"; expect(sideA).toBe("Pizza")`. Its `getStatusLabel` didn't know about the new "Counting votes" state and would have stayed green regardless. Real helpers extracted to `lib/formatters.ts` and imported by both the components and the tests; 8 pre-existing TS errors cleared. Mutation-checked: 4 tests now go red under a sabotaged formatter where the old ones stayed green.

**Root-cause note:** the two highest-impact findings (ISSUE-043, ISSUE-047) were neither code bugs nor test bugs — they were *database state* diverging from a repo that looked correct and a tracker that already said "fixed". `supabase/migrations/` records intent; only `pg_policies` and `information_schema.column_privileges` record reality.

## 2026-08-28 — PR #2 review round (Codex)

- **ISSUE-059 — Every privileged notification RPC was callable with the public anon key. Fixed.** Postgres grants `EXECUTE` on a new function to `PUBLIC` by default, and `REVOKE ALL ... FROM anon, authenticated` does not subtract from that. `claim_result_notifications`, `enqueue_result_notifications`, `tick_squabble_results` and `close_expired_squabbles` all answered an unauthenticated caller with 200 — claiming would have returned recipients' full phone numbers and message bodies and moved their rows to `sending`. Now `REVOKE EXECUTE ... FROM PUBLIC` plus an explicit `GRANT ... TO service_role`; unauthenticated 401, authenticated 403, and the pg_cron job (which runs as the job owner) still succeeds every minute. **This is the third instance of the same pattern in this repo** — ISSUE-039 (column revoke under a table grant), ISSUE-047 (never applied at all), and now a function revoke under a PUBLIC grant. A revoke aimed at the wrong principal reads exactly like a revoke that worked.
- **ISSUE-060 — The stall reaper measured from the wrong timestamp, reopening the double-send it was part of fixing. Fixed.** `requeue_stalled_notifications()` used `created_at`, which is set at enqueue and never changes, so a row that sat pending through a backtail for over ten minutes satisfied the predicate the instant it became `sending` — the next tick would return it to `pending` while the sender was still calling Twilio. Added `claimed_at`. Verified both directions: claimed-one-second-ago stays `sending`, claimed-15-minutes-ago is recovered.
- **ISSUE-061 — The one-segment SMS guarantee did not survive emoji, accents, or GSM extension characters. Fixed.** `sms_normalize()` mapped only a short lookalike list, so `Is 🍕 a sandwich, café edition?` kept both the emoji and the é and would have billed as two UCS-2 segments. Everything outside printable ASCII is now stripped and the budget counts extension characters (`[ ] { } \ ^ ~ |`) as two septets. **Fixing this exposed a second bug in the fix**: the fallback path still used `left()`, which counts characters, so a winner label of `[y][y][y]…` produced 216 septets. Truncation is by septet everywhere now and the winner label has its own 60-septet cap; six adversarial inputs all land ≤160 with the link intact.
- **ISSUE-062 — `parseInt` on the custom duration. Fixed.** `<input type="number">` accepts scientific notation and `parseInt("1e2")` is 1, so typing 100 minutes would have created a one-minute squabble. Now `Number()` with `Number.isInteger` and an explicit empty check (`Number("")` is 0). Five tests added, watched failing against the old version first.

**Root-cause note:** the review found four things a green suite and a careful self-read did not, and three of them were in the code written *this session* to fix earlier bugs. Two were in the SMS pipeline's safety machinery specifically — the part most carefully reasoned about. Worth remembering that the code you were most deliberate about is not the code least likely to be wrong.

## 2026-08-28 — Runtime UAT pass (localhost + Vercel), OG images

Testing pass rather than a feature session: 293 tests green and a clean build to start with, so
every finding below came from actually driving the running app and reading live Supabase/Vercel
state. All three new bugs reproduced **in production** as well as locally.

- **ISSUE-063 — Both Open Graph image routes returned 500, in production. Fixed.** `/s/[slug]/opengraph-image`
  (the preview card for every link texted to a group chat — i.e. the product's entire distribution
  mechanism) and `/api/og/result/[slug]` (behind "Share the result" and the download button) each
  died with satori's `Expected <div> to have explicit "display: flex" or "display: none" if it has
  more than one child node`. *The message names the wrong cause.* Two of the offending divs really
  did have several children (`{winnerName} wins — {Math.max(a,b)} to {Math.min(a,b)}`), but after
  fixing those the route still 500'd, and bisecting the JSX down to a single element showed the real
  trigger: **a raw number as a JSX child**. `<div>{voteCountA ?? 0}</div>` throws; `<div>{String(voteCountA ?? 0)}</div>`
  renders. Every numeric and multi-part text child in both routes is now precomputed into one string.
  Verified live: all 8 route/format/slug combinations return `image/png`, and the rendered images were
  read back and eyeballed. **Regression Test:** yes — `src/app/__tests__/og-images.test.tsx`, 10 tests
  that render the *shipped* handlers with Supabase mocked and assert real PNG magic bytes. Both fixes
  were sabotaged in turn and the suite watched go red (2 red for the numeric child, 3 for the inline
  winner line), then restored.
- **ISSUE-064 — The download-result button had no accessible name, and share failures were swallowed. Fixed.**
  `share-result-button.tsx` rendered an icon-only `<Button>` containing just `<Download />`; the
  accessibility tree read `button` with no name. Now `aria-label` (state-aware) with the icon marked
  `aria-hidden`, confirmed in the a11y tree as `"Download result image"`. Separately its sibling's
  `catch {}` discarded *every* native-share error, so while ISSUE-063 was live the button silently
  degraded to copying a link — that empty catch is a large part of why a 500 on the share path went
  unnoticed. It now re-throws nothing but logs anything that isn't a user-cancelled `AbortError`.
  A codebase-wide scan found no other icon-only control missing a name.
- **ISSUE-065 — `metadataBase` was never set, so OG image URLs resolved against the request origin. Fixed.**
  Next.js warned on every render (`metadataBase property in metadata export is not set ... using
  "http://localhost:3210"`) and the page's `og:image` really did serialise as a localhost URL. Root
  layout now derives an absolute base from `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL`
  → `VERCEL_URL` → localhost.
- **ISSUE-066 — `ARCHITECTURE.md` documented a production URL that belongs to someone else. Fixed.**
  `ARCHITECTURE.md:159` says the app lives at `settle.vercel.app`. That host answers **200**, which is
  exactly why it was never questioned — but the HTML it serves is an unrelated Material-UI *pages*-router
  app with a Google sign-in client ID. It is not this project and never was. The real deployment
  (`settle-ochre-eight.vercel.app`, live and healthy) is recorded in exactly one place: the
  `app_settings.site_url` column in the database. `IMPROVEMENT_PLAN.md:12`'s "returns nothing useful"
  was closer but still read as "our dead deploy" rather than "not ours." **Fix:** correct
  `ARCHITECTURE.md`, and treat `app_settings.site_url` as the source of truth until it isn't. **Fixed:** the Deployment section now
  carries the verified URL, the reason the wrong one survived, and a correction to its second error —
  it also claimed `SUPABASE_SERVICE_ROLE_KEY` was "not needed for client-side app", which was true of
  the client and irrelevant to the two server-side paths that use it.
- **ISSUE-067 — `closeSquabble()`'s admin-client fallback logged nothing. Fixed (hardening).** The
  `catch { db = await createClient(); }` was silent, so the only signal that lazy close was about to
  run as an unprivileged visitor was the downstream 0-rows message, which can only *guess* at the
  cause. It now logs the fallback explicitly. Not a new defect — ISSUE-046's rows-affected guard fired
  correctly and said the right thing — but the two messages together now name cause and effect.

### Verified, not re-opened

- **ISSUE-048 (realtime) confirmed fixed in live state.** `supabase_realtime` publishes `votes`.
- **ISSUE-033 (PWA icons) reproduced, then fixed.** `/icon-192.png`, `/icon-512.png` and
  `/apple-touch-icon.png` all 404'd against the running server while `manifest.json` referenced the
  first two. Fixed in the same branch — see the ISSUE-033 entry above for the icon set, the
  `apple-touch-icon` path correction, and the regression test.
- **Lazy close is backstopped by pg_cron, which changes ISSUE-046's severity.** Locally (no
  `SUPABASE_SERVICE_ROLE_KEY`) `closeSquabble()` correctly reported `UPDATE affected 0 rows` — the RLS
  policy is `auth.uid() = creator_id`, so any non-creator visitor is refused. The squabble still closed
  **~90 seconds later**, correctly (`status='closed'`, `winner_side='a'`), because the
  `squabble-results-tick` cron job runs every minute and has succeeded 794 times. So a missing service
  role key delays a close by up to a minute; it does not lose it. The key *does* still matter for voter
  labels — see the note below.

**Root-cause note:** ISSUE-063 is the third "the error message named a symptom, not the cause" entry in
this tracker, and the first where reading the message carefully actively sent the fix in the wrong
direction — the fix that the text prescribed (add `display: flex`) would also have been *wrong*, since
flexing a text container makes each text node its own flex item and drops the spaces between them. The
thing that actually resolved it was mechanical bisection down to one element. When a fix derived from an
error's own wording doesn't clear the error, stop re-reading the wording.
