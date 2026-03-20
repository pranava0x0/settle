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
