# Settle

Settle is a lightweight, web-first PWA for settling debates between friends. You create a question with two sides, text the link to your friend group, they vote within a time limit, and the majority settles it.

## Agent Workflow: Explore → Plan → Code → Verify

Do not blindly write code. Follow this loop:
1. **Explore:** Search the codebase to find relevant files and understand existing patterns.
2. **Plan:** Draft a brief implementation plan. Ask for human approval if the change is architecturally significant.
3. **Code:** Implement following the rules below.
4. **Verify:** Run `pnpm test && pnpm build` and fix any failures before declaring the task complete.

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
- `pnpm test:e2e` — run Playwright (end-to-end)
- `pnpm db:migrate` — run Supabase migrations
- `pnpm db:reset` — reset local Supabase DB
- `pnpm db:types` — generate TypeScript types from Supabase schema

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
- **Mobile-first responsive design.** This is primarily a phone experience.
- Null/optional values should show explicit placeholders — never blank UI.

## Error Resilience

- **Fail loud.** Never silently swallow errors. Always throw or log explicitly.
- Log aggressively in development. Every Supabase call, auth event, and state transition should be traceable.
- Validate all user inputs with Zod before mutations.
- Handle Supabase errors gracefully — show user-friendly messages, log the real error.
- Track errors visibly. Use toast notifications for user-facing errors.

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

## Git Discipline

- **Commit often** at natural checkpoints — small, focused commits.
- Write descriptive commit messages explaining *what* and *why*.
- Never commit large binary files or downloaded data.
- Never commit API keys. Check `git diff --cached` before pushing.

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
