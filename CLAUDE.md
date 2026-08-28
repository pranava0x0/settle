# Squabble

Squabble is a lightweight, web-first PWA for settling debates between friends. You create a question with two sides, text the link to your friend group, they vote within a time limit, and the majority settles it.

> **Base files:** `~/Projects/coding-best-practices/{CLAUDE.md,AGENTS.md,DESIGN.md}` hold the universal principles (the *what*, the *how for agents*, and the *look*). This file extends them and **wins on conflict** — it's the local source of truth. Rules below that were pulled from the base are the ones that have actually bitten this project or plausibly will; read the base for the full set.

## Agent Workflow: Explore → Plan → Code → Verify

Do not blindly write code. Follow this loop:
1. **Explore:** Search the codebase to find relevant files and understand existing patterns.
2. **Plan:** Draft a brief implementation plan. Ask for human approval if the change is architecturally significant.
3. **Code:** Implement following the rules below.
4. **Verify:** Run `pnpm test && pnpm build` and fix any failures before declaring the task complete.

**Narrowest meaningful test first, then broaden.** Run the test closest to the change for the fast loop; escalate to the full suite before declaring a substantial change done.

| Change kind | Verify with |
|---|---|
| Migration / RLS policy | Apply locally, then query as `anon` — confirm the grant actually changed |
| Server action | Vitest unit test + exercise the real flow in the browser |
| Component / styling | `pnpm test` + click through at 375×812; read the a11y tree, not just a screenshot |
| Auth or cookie flow | Fresh incognito context — a warm session hides every cookie bug |
| Anything substantial | `pnpm test && pnpm build` |

**Research budget.** Grep the repo → read the file → one targeted fetch if the code points at an external spec → ask. Don't run web sweeps for questions the codebase answers. If you're fetching more than 2–3 URLs for one coding task, stop.

**A spec's assumptions are guesses until you check them — including a spec you wrote.** Before implementing anything keyed off a count, threshold, or "most users have X", run the one query that confirms it, and record what the data said next to what the plan said.

## Communication Style

- **Concise output.** No filler, no apologies, no moralizing. Skip generic advice.
- **Show your work.** Use short internal monologues to break down complex problems.
- **Fail loud.** Never use catch-all exception handlers that silently swallow errors. Always throw or log explicitly.

---

## Stack
- **Framework:** Next.js 15 (App Router) with TypeScript
- **Backend/DB:** Supabase (Postgres, Auth, Realtime)
- **Auth:** Supabase Phone Auth (SMS OTP, no passwords)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Hosting:** Vercel
- **Package Manager:** pnpm

## Project Structure
```
src/
  app/                    # Next.js App Router pages
    (auth)/               # Auth pages (login, verify)
    (app)/                # Authenticated app pages (dashboard, create)
    s/[slug]/             # Public dispute view + vote page
  components/             # React components
    ui/                   # shadcn/ui primitives
  lib/                    # Utilities, Supabase client, types, constants
    supabase/             # server.ts + client.ts Supabase helpers
    actions/              # Server actions (createDispute, castVote, etc.)
  hooks/                  # Custom React hooks
supabase/
  migrations/             # SQL migration files
  seed.sql                # Dev seed data
```

## Commands
- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm lint` — run ESLint
- `pnpm format` — run Prettier
- `pnpm test` — run Vitest (unit + integration)
- `pnpm test:e2e` — run Playwright (end-to-end) — **note: the `e2e/` directory doesn't exist yet, so this errors**

There are **no `db:migrate` / `db:reset` / `db:types` scripts** (this file claimed them for months — doc drift). Use the `supabase` CLI directly, or add the scripts. Migrations are applied by hand against the hosted project; `supabase/migrations/` is the source of truth for what *should* be applied, not proof that it *is*.

---

## Code Conventions

- Use TypeScript strict mode. No `any` types.
- Use `const` arrow functions for components: `const MyComponent = () => {}`
- Use server components by default. Add `"use client"` only when needed (hooks, interactivity).
- Use server actions for mutations (createDispute, castVote).
- Colocate related files: page.tsx, loading.tsx, error.tsx in the same route folder.
- Name files in kebab-case. Name components in PascalCase.
- Use Supabase client from `lib/supabase/server.ts` (server) or `lib/supabase/client.ts` (client).
- All database queries go through Supabase client, not raw SQL in application code.
- Use Zod for runtime validation of user inputs.
- **Read before edit:** Always read a file before editing it. Understand existing code before modifying.

## Frontend Standards

- Functional components + hooks only. No class components.
- Colors, enums, and constants in `lib/constants.ts` — never hardcoded inline.
- Data transforms belong in hooks or utility functions, not in components.
- Proper loading, error, and empty states on every view.
- All interactive elements must have visible focus indicators for accessibility.
- **Mobile-first responsive design.** This is primarily a phone experience. Verify at 375×812 before declaring a UI change done.
- Null/optional values should show explicit placeholders — never blank UI.
- **Touch targets ≥ 44px**, gated on `@media (pointer: coarse)` so desktop inline controls don't bloat into CTAs.
- **An icon + label button exposes no accessible name, and a screenshot can't tell you.** A `<button>` whose visible text sits beside an `aria-hidden` icon needs an explicit `aria-label`. Screenshots verify layout, never a11y — read the accessibility tree.
- **Zero is a result; missing is not.** `n ? \`${n} votes\` : ""` renders a real 0 and a never-loaded value identically. Guard with `Number.isFinite(n)`.
- **Don't ship the "AI-generated dashboard" look**: eyebrow kickers, cutesy section names, accent-stripe stat cards, gradient/glass everything, hover-lift on every card. Flat, editorial, borders over shadows, hue reserved for data. Full system in the base `DESIGN.md`.

## Error Resilience

- **Fail loud.** Never silently swallow errors. Always throw or log explicitly.
- Log aggressively in development. Every Supabase call, auth event, and state transition should be traceable.
- Validate all user inputs with Zod before mutations.
- Handle Supabase errors gracefully — show user-friendly messages, log the real error.
- Track errors visibly. Use toast notifications for user-facing errors.
- **A write gated only on business-logic state can silently no-op.** An RLS policy blocking an `UPDATE`/`DELETE` returns **0 rows and no exception**, and the app proceeds as if it succeeded — this is exactly how ISSUE-021 (LIVE badge on expired squabbles) happened. Check rows-affected on any write whose correctness the app depends on, `closeSquabble()` above all.
- **Empty ≠ broken.** A squabble with no votes is a valid empty state; a failed voters query is a bug. Never return `[]` for both — log the failure path separately so a broken query can't read as "nobody voted."
- **Never dead-end a user on a failed auth call.** If `signInAnonymously()` fails, route to OTP login rather than rendering an error with no path forward.

---

## Auth Pattern
- SMS OTP via Supabase Auth — no passwords, no email
- Session managed via httpOnly cookies (Next.js middleware)
- Middleware at `middleware.ts` protects authenticated routes
- Public routes: `/`, `/s/[slug]` (view + vote after auth), `/login`
- Protected routes: `/dashboard`, `/create`
- Voting requires auth but the dispute page itself is publicly viewable

## Data Model
- **users** — id, phone, display_name, avatar_url
- **disputes** — id, slug, creator_id, question, side_a, side_b, status, winner_side, expires_at
- **votes** — id, dispute_id, user_id, side, created_at (unique per user per dispute)
- **Dispute statuses:** open → closed | expired
- See ARCHITECTURE.md for full schema

## Key Patterns
- Dispute slugs are nanoid (8 chars, URL-safe)
- Sharable link format: `{domain}/s/{slug}`
- Non-authenticated users can VIEW a dispute but must log in to vote
- Timer: `expires_at` in DB, client renders countdown, server validates before accepting votes
- Lazy evaluation: dispute closes on first read after `expires_at` passes (no cron needed)
- Winner = majority vote when timer expires. Tie = no winner.
- Votes are immutable — once cast, can't be changed or deleted

---

## Security & Credentials

- **Never commit secrets.** API keys, tokens, passwords must never appear in committed code.
- Read credentials from environment variables only. Halt with a clear error if missing.
- Never log or print credential values.
- Always `.gitignore`: `.env`, `.env.local`, `.env.*.local`
- Always use Row Level Security (RLS) policies — never bypass with service role key in client code.
- Before committing, scan for leaked secrets: `git diff --cached | grep -iE "apikey|password|token|secret"`
- **A token the browser holds is public, whatever the transport.** `SUPABASE_SERVICE_ROLE_KEY` is server-only, always: server actions, route handlers, and server components. If a client component needs privileged data, proxy it through the server and send only the derived value (this is why phone masking happens in `page.tsx`, not in `voter-breakdown.tsx`).
- **RLS grants are row-level AND column-level.** A table-level `GRANT SELECT` exposes *every* column through PostgREST regardless of what the app selects. Audit grants per column for anything sensitive — migration 00002 shipped full phone numbers to any anon-key holder for months because only the app's own `select()` was narrow.
- **Every security fix ships with a regression test.** These regressions are invisible until exploited.
- **Supply chain:** pin exact versions and install from the lockfile; `packageManager` is pinned to `pnpm@11.18.0` so Vercel, corepack, and local agree. Before any dependency add/upgrade, check the advisory index at `https://pranava0x0.github.io/vibe-coding-security/llms-ctx.txt` — not on routine edits. Verify an LLM-suggested package name actually resolves before installing it (slopsquatting).

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Testing & Validation

- **Vitest** for unit + integration tests (server actions, utils, validation).
- **Playwright** for e2e tests (full user flows, mobile viewports).
- **UAT skill** (`/uat`) for full end-to-end QA passes across all personas and flows — run before major releases or after significant feature changes. See `.claude/skills/uat/SKILL.md` for the full testing protocol (short=2min, medium=5min, long=10min modes).
- Write tests alongside code, not as an afterthought. Every feature task includes its tests.
- Write a regression test for every bug fix.
- Cover edge cases, not just happy paths:
  - Empty input: `[]`, `{}`, `""`
  - Null/undefined for every optional field
  - Boundary values (expired timer, tie votes, single vote)
  - Auth states (logged in, logged out, expired session)
  - Voting edge cases (double vote attempt, vote after expiry)
- Run `pnpm test && pnpm build` before committing.
- Run `pnpm test:e2e` before deploying.
- Test all flows on mobile Safari (PWA target).

### Rules that make a test an actual guard

- **A test you've never watched fail is a hypothesis, not a guard.** Before trusting a new regression test, break the fix on purpose, confirm the test goes red, then restore. And confirm the sabotage actually landed — a mutation that silently no-ops reads exactly like a vacuous test.
- **Test the seam where a check is wired in, not just the checking function.** A unit test of a pure helper stays green while the helper sits disconnected. Assert the observable outcome, not the helper's return value.
- **A test that re-implements the logic tests your model, not the machine.** If a transform's output is consumed by something stateful (React render lifecycle, cookies, the DOM), assert on the consumer's real output.
- **When a field's population varies, a test over one subset proves nothing about the rest.** Most Squabble voters have `display_name = null` and no phone — pick fixtures that *lack* the field the code happens to read, not the one convenient row that has it.
- **A race won't reproduce on a fast local harness — force the order.** The anonymous-vote cookie race (commit `17119be`) is the standing example.
- **Derive counts and lists from the source of truth**, never a literal typed beside it. A hardcoded expected-count sits green through the very change it should catch.

## Git Discipline

- **Commit often** at natural checkpoints — small, focused commits.
- Write descriptive commit messages explaining *what* and *why*.
- Never commit large binary files or downloaded data.
- Never commit API keys. Check `git diff --cached` before pushing.
- **No AI co-authors, no machine fingerprints.** Never add `Co-Authored-By:` for any AI tool, and no "🤖 Generated with…" footer in a commit message *or* a PR body. Commits are owned by the human who ships them; write in their plain voice. `claude.coauthor` is already `false` locally and globally — honor it. (This rule exists because the session that wrote it violated both halves on the first try; a harness default can contradict the repo standard, and the repo standard wins.)
- **Verify what you actually committed: `git log -1 --stat`.** `git add -A` obeys `.gitignore` silently — no warning, exit 0. Broad credential globs swallow innocent filenames.
- **Your own review of your own diff is the weakest review you'll get.** Push early and let a cold reader (PR bot, teammate, a fresh review pass) read it before merging on green. Self-review misses cluster in whatever you'd stopped questioning, and your tests inherit the same blind spot. Budget a round of review fixes into "done."
- **Reproduce every review finding before fixing it, and re-verify after.** A plausible comment isn't a fact yet, and this catches your own half-fixes.
- **Don't amend or force-push a pushed commit.** Fix forward.

---

## Architecture Principles

- **No over-engineering.** Only make changes that are directly requested or clearly necessary. Keep solutions simple.
- **Single source of truth.** Shared constants, config, and types derive from one place (`lib/`).
- **Modular design.** Separate concerns: data fetching (server actions), processing (lib/utils), and presentation (components).
- **Idempotent operations.** Re-running any operation should be safe and produce the same result.
- **Cost-optimized.** Stay on free tiers. No cron jobs, no external APIs, no file storage unless absolutely needed.

---

## Issue Tracking (`issues.md`)

Maintain an `issues.md` file in the project root as a living bug/issue tracker.
- Log bugs with: date, area, description, root cause, and status (Open / Fixed).
- Update entries when resolved: what the fix was, the commit that resolved it.
- After every bug fix, check whether a new regression test is needed.

## Backlog (`backlog.md`)

Maintain a `backlog.md` file in the project root for ideas, features, and enhancements.
- When ideas come up during development, add them immediately.
- Each item: brief description + priority (low / medium / high).
- Review and reprioritize periodically.

---

## Scar tissue (this stack's specific traps)

Each of these cost real debugging time here or in a sibling project. Read before assuming you've found a code bug.

- **Supabase free tier auto-pauses after ~1 week idle.** DNS/connection failures that look exactly like a code bug. The restore window is ~90 days. **Check the dashboard before debugging code** when a previously-working integration suddenly can't connect. This project is paused right now.
- **Next.js 16 forbids `revalidatePath()` / `revalidateTag()` during render.** The lazy-close pattern (check expiry → update on read) crashes if the write happens inside a server component's render path. Route it through a server action or insert directly. Cost: commit `13acfee`.
- **Wrap a shared session/membership lookup in React's `cache()`** when both a layout guard and its child page call it. They look independent but run in one request and each hits the DB. One-line fix at the definition site.
- **Disable the Bash sandbox for vitest / dev-server / `localhost` calls.** The default sandbox blocks loopback IPC; test runners hang and fail with cryptic fetch timeouts ("no tests"), and `curl localhost` returns HTTP 000. Set `dangerouslyDisableSandbox: true` for those specific calls.
- **pnpm 11 moved the build-script allowlist to `pnpm-workspace.yaml`** (`allowBuilds:`). A stale `pnpm.onlyBuiltDependencies` block in `package.json` is silently ignored, and `pnpm install`/`test` fails outright with `ERR_PNPM_IGNORED_BUILDS`.
- **Don't assume a port is free.** Several projects run in parallel here; binding an occupied port silently connects to the *wrong* service.
- **A cookie set by a client-side Supabase call isn't visible to the server on a soft navigation.** `router.push()` may not sync fresh auth cookies; use a hard `window.location.href` when the very next server render must see the new session. Cost: commits `17119be`, `13acfee`.

### 2026-08-28 — voter anonymity, migration drift, result texts

**Universal lessons (mirrored to `~/Projects/coding-best-practices/CLAUDE.md`):**

- **A committed migration is not an applied migration, and the gap is silent.** Migrations 00002 and 00005 sat in `supabase/migrations/` for months without ever running against the hosted project. 00002's absence *was* the "who voted shows Anonymous for everyone" bug; 00005's absence left the phone-column hole that `issues.md` already recorded as fixed. Check the catalog, never the directory: `select policyname, qual from pg_policies where tablename='users'` and `select grantee, privilege_type, column_name from information_schema.column_privileges where table_name='users'`. Do this **first** for any permissions-shaped bug here.
- **An outbox needs a status transition, not just a row lock.** `FOR UPDATE SKIP LOCKED` only protects simultaneous transactions. The claim RPC commits when it returns, so a row that was only stamped `attempts + 1` stayed `pending` while the sender was still calling Twilio, and the next tick sent it again. Claim must move the row out of `pending`; assert two consecutive claims overlap by zero (5-of-5 before the fix, 0 after).
- **A missing joined row is not an empty field.** `users?.display_name ?? null` made "RLS refused this read" indistinguishable from "this voter has no name". Carry `profile_readable` and log the degraded case — see `countUnreadableProfiles()` in `lib/voter-identity.ts`.

**This stack's specifics:**

- **Tailwind v4 silently drops an arbitrary value containing a nested `var()` with a comma.** `bg-[var(--status-live-bg,var(--primary))]` produced no rule at all: the class landed on the element and styled nothing, which reads exactly like a cascade problem and sent this session chasing `@layer` ordering for a while. Prefer plain utilities.
- **Don't fight a shadcn component's own `bg-*` variant from a stylesheet — pass a className.** `cn()` runs twMerge, which drops the conflicting utility outright. Overriding `[data-slot="badge"]` from `globals.css` depended on cascade-layer ordering that did not hold, and every status badge rendered identically in all three themes.
- **Theme CSS variables reach `body` but did not resolve for `bg-foreground` on a nested badge.** Status colours are fixed palette values (`bg-emerald-600`, `bg-blue-600`, …) for that reason; they must stay legible on Ring's tan *and* Molten/Impact's near-black.
- **Next.js request memoization serves the pre-write payload.** Re-`select()`ing a row you just updated inside the same render returns the old row. `closeSquabble()` now returns its outcome so callers apply it in place — this is what put a closed squabble under "Live now" with a "Closed" badge.
- **Postgres: `ALTER TYPE ... ADD VALUE` needs its own migration** ("unsafe use of new value" if used in the same transaction), and `CREATE OR REPLACE FUNCTION` cannot change a return type — `DROP FUNCTION` first.
- **`pnpm lint` takes over two minutes here.** Budget for it; a 120s Bash timeout kills it mid-run.
- **The MCP SQL runner honours `BEGIN; … ROLLBACK;`** — verified before use. That makes it safe to run the invariant suite (`supabase/tests/result_sms_test.sql`) against the hosted DB, but *verify the rollback works* before trusting it with fixtures.
- **The vote-window trigger (00007) blocks inserts on expired squabbles, including your own test fixtures.** Create the squabble open, insert votes, *then* move `expires_at` into the past.

### When something unexpected happens

Append a note here or to `issues.md` in this shape: what I expected / what happened / why (root cause, not symptom) / what to do next time. Append, don't rewrite — the accumulation is the asset.
