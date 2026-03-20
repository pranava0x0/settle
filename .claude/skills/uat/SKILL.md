---
name: uat
description: Run a UAT (User Acceptance Testing) pass on the Squabble app. Use when the user asks to "run UAT", "test the app", "do a QA pass", "find bugs", "check for issues", "test all pathways", or "run through the app". Also invoke when the user says "run uat.md" or references UAT testing. Tests all personas and flows end-to-end using browser automation, logs bugs to issues.md, logs major items to backlog.md.
version: 1.0.0
tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Squabble UAT Skill

End-to-end UAT runner for the Squabble app. Tests all user personas and interaction pathways, logs bugs found to `issues.md` (timestamped, with severity), and major UX/feature gaps to `backlog.md`.

---

## Run Modes

Always ask the user (or infer from their message) which mode to run:

| Mode   | Duration | Personas Covered | Depth |
|--------|----------|-----------------|-------|
| Short  | ~2 min   | 2 personas, happy paths only | Quick smoke test |
| Medium | ~5 min   | 4 personas, includes edge cases | Standard QA pass |
| Long   | ~10 min  | All personas + edge cases + theme/viewport cycling | Full regression |

If no mode is specified, default to **medium**.

---

## Pre-Flight Checklist

Before starting any test run:

1. **Ensure the dev server is running.** Use `preview_start` with command `pnpm dev` if not already running.
2. **Read `issues.md`** to know the current highest issue number (to continue the sequence).
3. **Note the current date** for issue timestamps.
4. **Announce the run mode** and which personas will be tested.

---

## Personas & Flows

### PERSONA 1 — The Creator (Logged In)
*"I want to start a squabble and send it to my friends."*

**Entry point:** `/` (homepage)
**Prerequisites:** User is logged in (or simulate being redirected to login first)

**Test steps:**
1. Navigate to `/` — verify "Start a new one" button is visible (not "Get Started")
2. Click the button → land on `/create`
3. Verify the create form loads: question field, side A, side B, timer presets
4. **Happy path:** Fill in a realistic squabble (e.g., "Is a hot dog a sandwich?" / "Yes, obviously" / "No, it's a hot dog") and select a timer preset (try each one across runs)
5. Click "Let's squabble" → verify redirect to `/s/{slug}`
6. On the squabble page: verify the question renders, both sides render, countdown timer is visible and ticking
7. Click the **Share button** → verify SMS option and "Copy link" option appear
8. Click "Copy link" → verify toast/confirmation
9. Verify the share URL format matches `{domain}/s/{slug}`

**Edge cases to check:**
- Submit with empty question → verify Zod validation error message appears
- Submit with question > 280 chars → verify character limit enforced or error shown
- Submit with side A > 140 chars → verify character limit enforced
- Select the "Other" (custom) timer pill → verify a custom input appears, enter "45" and submit
- Try submitting without filling side B → verify error shown

---

### PERSONA 2 — The Anonymous Viewer (No Account, Just Looking)
*"My friend texted me a Squabble link. I want to see what it is before deciding to vote."*

**Entry point:** `/s/{slug}` (open squabble link)
**Prerequisites:** An open squabble exists (use one created in Persona 1, or navigate to a known seed slug)

**Test steps:**
1. Navigate directly to `/s/{slug}` without being logged in
2. Verify the page loads fully — question visible, both sides visible, vote counts visible
3. Verify NO vote has been cast (no "you voted" indicator)
4. Verify the countdown timer is visible
5. Scroll down — verify no blank/null UI elements (no empty boxes, no "undefined" text)
6. Verify both vote buttons are present and labeled with the side text
7. **Do NOT click vote** — just verify the view-only state works

**Edge cases to check:**
- Navigate to `/s/nonexistentslug` → verify graceful 404 or error state (not a crash)
- Navigate to a **closed** squabble as anonymous → verify results are visible without login required

---

### PERSONA 3 — The Anonymous Voter (Vote Without Logging In)
*"I got a link and want to vote immediately without creating an account."*

**Entry point:** `/s/{slug}` (open squabble link), not logged in
**Prerequisites:** Anonymous sign-ins must be enabled in Supabase Dashboard → Authentication → Sign In / Up

**Test steps:**
1. Navigate to `/s/{slug}` (open squabble) while logged out (use incognito/private window)
2. Verify vote buttons appear with side labels
3. Click **Vote button for Side A** (or B — randomize across runs)
4. Verify anonymous sign-in fires — should NOT redirect to `/login`
5. Verify hard redirect to `/s/{slug}?vote={side}` (full page reload, not soft navigation)
6. Verify auto-cast fires: page loads with "Your vote: [side]" confirmation
7. Verify vote bars appear with correct percentages
8. Verify **post-vote identity prompt** appears with:
   - "Add your name (optional)" — text input + Save button
   - "Verify with phone (optional)" — expandable section
   - "Done" button to dismiss
9. **Test name save:** Enter a name → click Save → verify "Voting as [name]" appears
10. **Test phone verify expand:** Click "Verify with phone" → verify phone input + Send code + Skip buttons appear
11. **Test Skip:** Click Skip → verify the prompt disappears and does NOT reappear
12. **Test Done:** Click Done → verify the prompt disappears and does NOT reappear
13. Verify nav shows "My debates" / "Log out" (anonymous session active)

**Edge cases to check:**
- **Anonymous sign-in failure:** If anonymous sign-ins are disabled in Supabase, verify error message is shown on-screen (not a silent redirect to login). Should display: "Anonymous sign-in failed: [error message]"
- **Double vote prevention:** After voting anonymously, reload the page → verify vote persists and no second vote is possible
- **Prompt dismissal persists:** Click Done/Skip on identity prompt, then interact with the page → verify prompt stays hidden (doesn't reappear after router.refresh)
- **Cookie sync:** Verify the anonymous session cookies are properly set — the vote should persist across page reloads
- **Console errors:** Check `preview_console_logs` for any "Anonymous sign-in error" messages — these indicate the DB trigger or Supabase config is broken

**Known failure modes (regression checks):**
- `phone NOT NULL` constraint on `public.users` blocks anonymous user creation → error: "Database error creating anonymous user"
- `handle_new_user` trigger must use `NULLIF(NEW.phone, '')` — empty string phone violates UNIQUE constraint
- `router.push` after `signInAnonymously()` doesn't sync cookies → must use `window.location.href`
- Auto-cast must NOT call `castVote()` server action (uses `revalidatePath` which crashes during render in Next.js 16)

---

### PERSONA 3b — The New Voter via OTP (Receive Link → Phone Auth → Vote)
*"I got a link, I want to vote with my phone number."*

**Entry point:** `/s/{slug}` (open squabble link), not logged in

**Test steps:**
1. Navigate to `/s/{slug}` (open squabble) while logged out
2. Click "Log in" in the nav header
3. Verify redirect to `/login` with redirect param preserved
4. On login page: verify phone input is present
5. Verify the page hints it will bring you back to vote (contextual copy check)
6. Enter a phone number (US format: `555-867-5309` format) → verify it accepts formatting and normalizes
7. Verify OTP step renders (you don't need to complete OTP in CI — just verify the step transitions)
8. **If OTP can be completed:** Enter OTP → verify optional name step appears
9. Name step: verify user can skip it
10. Name step: verify user can enter a name and proceed
11. After auth: verify redirect lands on `/s/{slug}` with vote auto-cast (check vote bars appear, side is highlighted)

**Edge cases to check:**
- Enter invalid phone (e.g., `123`) → verify error message shown, not a crash
- Enter phone with spaces/dashes → verify it normalizes correctly (strips formatting)
- Enter OTP wrong → verify error shown, not a crash
- Enter OTP with non-numeric chars → verify validation rejects it

---

### PERSONA 4 — The Returning Voter (Already Has Account, Taps Link)
*"I've voted on squabbles before. I click a new link, already logged in."*

**Entry point:** `/s/{slug}` (open squabble link), already logged in

**Test steps:**
1. Navigate to `/s/{slug}` while logged in
2. Verify vote buttons appear immediately (no redirect to login)
3. Click a vote button → verify:
   - Haptic/click animation fires (check for `animate-vote-pop` class or visual change)
   - Vote bars appear below the question
   - "You're with [Side X]" or similar confirmation text appears
   - Vote count increments
4. Verify the voted side button is visually distinguished (highlighted/checked state)
5. Try clicking the **other** side's vote button → verify nothing changes (votes are immutable)
6. Verify the Share button is visible and functional
7. Verify the countdown timer continues ticking

**Edge cases to check:**
- Reload the page after voting → verify vote persists (the correct side is still highlighted)
- Verify no double-vote is possible (attempt to vote again on any side, verify it's blocked)

---

### PERSONA 5 — The Results Viewer (Squabble Already Decided)
*"The squabble closed. I want to see who won."*

**Entry point:** `/s/{slug}` (closed/expired squabble)

**Test steps:**
1. Navigate to `/s/{slug}` for a squabble with status `closed` or `expired`
2. Verify the results view loads: vote bars visible, winner announced
3. If user voted on the winning side → verify "You were right" confetti + celebration message
4. If user voted on the losing side → verify "You were outvoted" message (no confetti)
5. Verify voter breakdown is visible (who voted for what)
6. Verify **Rematch button** is visible for the creator → click it → verify:
   - New squabble created with sides swapped
   - Redirect to new squabble page
   - New squabble shows side A and side B in reversed order
7. Verify **Share result button** → click it → verify:
   - Native share sheet appears (or copy/download fallback on desktop)
   - OG image generates without crashing
8. Verify the timer is NOT visible (squabble is closed)
9. Verify no vote buttons are shown

**Edge cases to check:**
- Navigate to a squabble with 0 votes (expired with no votes) → verify graceful "No winner" state
- Navigate to a tied squabble → verify "No winner / tie" state shown correctly

---

### PERSONA 6 — The Dashboard User (Managing Squabbles)
*"I want to see all my squabbles and ones I've voted on."*

**Entry point:** `/dashboard`
**Prerequisites:** Must be logged in

**Test steps:**
1. Navigate to `/dashboard`
2. Verify three sections render: "Live now", "Decided", "You voted on"
3. Verify each section shows appropriate cards (or empty state — verify it's not blank)
4. Click a **Live** squabble card → verify navigation to `/s/{slug}`
5. Click a **Decided** squabble card → verify navigation to closed squabble
6. Verify the "Squabble" / "Create new" button is visible → click it → verify redirect to `/create`
7. If display name is NOT set: verify the `DisplayNamePrompt` appears
8. If display name IS set: verify the prompt is NOT shown

**Edge cases to check:**
- Dashboard with no squabbles (new user) → verify empty states are shown with copy, not blank divs
- Verify squabble cards show vote counts (not null/undefined)
- Verify status badges render (Open / Closed / Expired)

---

### PERSONA 7 — The Theme Switcher (Visual QA)
*"I want to make sure all themes look good."*

**Entry point:** Any page (test on `/` and `/s/{slug}`)

**Test steps:**
1. Find the **Theme Toggle** in the header
2. Click through all three themes: Ring 🥊, Molten 🌋, Impact ☄️
3. After each theme switch, take a screenshot and verify:
   - Background color changes visibly
   - Text remains readable (sufficient contrast)
   - Vote buttons are visible
   - No elements disappear or overlap
4. Verify the theme persists on page reload (localStorage)
5. Verify the theme applies to `/login` page as well

---

### PERSONA 8 — The Mobile User (Viewport QA)
*"Most users are on phones. Make sure nothing is broken on mobile."*

**Entry point:** `/`, `/s/{slug}`, `/create`, `/dashboard`

**Test steps:**
1. Resize viewport to 390×844 (iPhone 14 size)
2. Navigate to each key route and verify:
   - No horizontal scroll
   - Buttons are tap-friendly (visually large enough)
   - Vote buttons span appropriately on small screens
   - Header nav doesn't overflow
   - Create form fields are usable
3. Resize to 768×1024 (tablet) → verify layout adjusts cleanly
4. Return to desktop (1280×800) → verify back to normal

---

## Randomization Instructions

**Randomize across runs to improve coverage:**
- Vary which timer preset is used on create (15m, 1h, 6h, 24h, custom)
- Alternate which side (A or B) you vote on across personas
- Rotate which theme is active when testing vote flows
- Vary the order of persona testing — e.g., start with Persona 5 (results) before Persona 1 (create)
- Switch between mobile and desktop viewport mid-run (not just at the end)

**Suggested randomized orders by mode:**

**Short (2 personas):** Pick any 2 from: [P1, P3, P4, P5, P7]
**Medium (4 personas):** Run in order: [P5, P1, P3, P7] or [P2, P3b, P6, P8]
**Long (all personas):** Randomize: shuffle [P1-P8 + P3b], but always end with P7 (theme) and P8 (mobile). Always include P3 (anonymous voting).

---

## Issue Logging Format

When a bug or UX issue is found, immediately append it to `issues.md` using this format:

```markdown
### [ISSUE-NNN] Brief title
- **Date:** YYYY-MM-DD HH:MM
- **Area:** (auth | squabbles | voting | timer | dashboard | ui | infra | theme | mobile)
- **Persona:** (Creator | Anonymous Viewer | New Voter | Returning Voter | Results Viewer | Dashboard User | Theme Switcher | Mobile User)
- **Description:** What's broken or wrong
- **Steps to Reproduce:** 1. Go to... 2. Click... 3. See...
- **Complexity:** (low | medium | high) — effort to fix
- **Priority:** (low | medium | high | critical) — impact on user
- **Root Cause:** (code bug | test bug | config | design flaw | unknown)
- **Status:** Open
```

**Priority guidelines:**
- `critical` — blocks core flow (can't vote, can't create, can't log in, crash)
- `high` — major UX problem visible to most users (broken layout, wrong data shown)
- `medium` — notable issue but workaround exists (minor visual glitch, confusing copy)
- `low` — polish / nice-to-have (minor spacing, animation jank)

**Complexity guidelines:**
- `high` — requires schema change, major refactor, or new subsystem
- `medium` — requires logic changes across 2-3 files
- `low` — single-file fix (copy, style, minor logic)

---

## Backlog Logging

If you find an issue that is:
- A **missing feature** (not a bug), OR
- A bug that requires a **schema change or major architectural work** (complexity: high), OR
- An **enhancement** that would significantly improve UX

→ Add it to `backlog.md` instead of (or in addition to) `issues.md`:

```markdown
- [ ] [BACKLOG] Brief description — *why it matters* — Priority: high/medium/low
```

---

## End-of-Run Summary

After completing all test steps, output a summary:

```
## UAT Run Summary — [Mode] — [Date]

- Personas tested: X/8
- Issues found: X
  - Critical: X
  - High: X
  - Medium: X
  - Low: X
- Backlog items added: X
- Themes tested: [list]
- Viewports tested: [list]

### New Issues
[List each ISSUE-NNN with one-line description and priority]

### Highlights
[Top 2-3 most important findings]
```

---

## Notes for the Tester

- **Do not skip edge cases** — the happy path usually works. Bugs live in edge cases.
- **Check empty states** — every list/section should handle zero items gracefully.
- **Check null/undefined rendering** — look for "undefined", "null", or blank areas in the UI.
- **Check console errors** — use `preview_console_logs` after each major interaction to catch JS errors.
- **Check network errors** — use `preview_network` to verify Supabase calls succeed (look for 4xx/5xx).
- **Votes are immutable** — after casting a vote, never expect it to change.
- **Lazy close** — if a squabble's timer expires, refresh the page to trigger the lazy close.
- **Theme is localStorage-persisted** — test theme changes across page navigations.
- **Anonymous voting** — test in incognito/private windows. Anonymous sign-in creates a Supabase anonymous session (no phone, no name). The post-vote identity prompt is optional and dismissible.
- **Anonymous vote auto-cast** — after anonymous sign-in, the redirect URL includes `?vote={side}`. The server component inserts the vote directly (not via `castVote` server action) to avoid `revalidatePath` during render. If you see a 500 error on `/s/{slug}?vote=a`, the auto-cast path is broken.
- **DB prerequisites for anonymous voting** — `public.users.phone` must be nullable, `handle_new_user` trigger must use `NULLIF(NEW.phone, '')`, and anonymous sign-ins must be enabled in Supabase Dashboard.
