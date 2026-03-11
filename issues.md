# Issues — Settle

Living bug and issue tracker. Log bugs as they're found, update when fixed.

## Format
```
### [ISSUE-NNN] Brief title
- **Date:** YYYY-MM-DD
- **Area:** (auth | disputes | voting | timer | dashboard | ui | infra)
- **Description:** What's broken
- **Root Cause:** (code bug | test bug | config | design flaw)
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

### [ISSUE-015] DisputeCard shows "Tie" for disputes with zero votes
- **Date:** 2026-03-11
- **Area:** ui
- **Description:** On the dashboard, disputes that expired with no votes show "Tie" badge. Both zero-vote and actual-tie disputes have `status: "expired"` and `winner_side: null`, so the card can't distinguish them. "Tie" is misleading when nobody voted.
- **Root Cause:** code bug — `statusLabel` logic treated all non-winner closed disputes as ties.
- **Status:** Fixed
- **Fix:** Changed label from "Tie" to "No Winner" which is accurate for both tie and zero-vote cases.
- **Regression Test:** No
