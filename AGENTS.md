# Agent Instructions

This file is the canonical guide for any AI agent (Claude Code, Cursor, Copilot, etc.) working in this repo. The human-facing version of this is [CONTRIBUTING.md](CONTRIBUTING.md); rules in that file apply to agents too.

## What this is

`invoice-software` is a self-hostable, single-tenant invoicing app. Create clients, create invoices, download PDFs. **Community Edition** under AGPL-3.0-or-later. Full project framing: [docs/plans/2026-04-30-001-feat-mvp-invoicing-app-plan.md](docs/plans/2026-04-30-001-feat-mvp-invoicing-app-plan.md) and [README.md](README.md).

**Out of scope for this repo:** hosted SaaS, billing, multi-tenant infrastructure. Those will live in a separate private overlay repo that consumes this one as a dependency. Do not embed hosted-only concerns (billing UI, multi-tenancy scaffolding, plan gating, telemetry to a private backend) in core.

**Out of scope right now but planned**, each as its own future plan inside this repo: authentication, email send, public invoice link + tracking, payment links, monthly income chart, per-line VAT.

## Stack

- **TanStack Start v1** + **TanStack Router** + **Vite** + **TypeScript** (strict mode)
- **Postgres 16** + **Drizzle ORM** (migrations in `drizzle/`, schema in `src/server/schema.ts`)
- **@react-pdf/renderer** for invoice PDFs (no Chromium)
- **Tailwind v4** + **Radix UI** (shadcn-style components copied into `src/components/ui/`)
- **Zod** for validation; **Decimal.js** for quantity math
- **Vitest** for unit + integration tests; **Playwright** for end-to-end
- **ESLint 9** + **Prettier 3**; Node 22 (see `.nvmrc`)

## Where code lives

| Path | What goes here |
|---|---|
| `src/routes/` | TanStack Router file-based routes. **Route components only call server functions**, they do not query the DB or run Zod themselves. |
| `src/server/*.fn.ts` | Server functions (`createServerFn`). Own all validation, persistence, and side effects. |
| `src/server/schema.ts` | The single Drizzle schema module. |
| `src/server/pdf/` | `@react-pdf/renderer` invoice template + render helper. |
| `src/components/` | Feature components. |
| `src/components/ui/` | shadcn-style primitives, copy-in. Modify in place rather than wrapping. |
| `src/lib/` | Pure helpers (money, currency, validators, time formatting). |
| `drizzle/` | Append-only SQL migrations. **Never edit a merged migration.** |
| `tests/unit/` | Vitest unit + integration tests (integration tests hit real Postgres). |
| `tests/e2e/` | Playwright end-to-end tests. |
| `docs/plans/` | One markdown plan per feature; status tracked at the top. |
| `design.pen` | Source of truth for UI design. Open with the **Pencil MCP**, never `Read`/`Grep`. |

## Hard rules

1. **Money is `bigint` minor units.** All amount columns end in `_cents`, are Postgres `BIGINT`, and use Drizzle `bigint` mode (returns native `BigInt`). Never use `mode: 'number'`. Never use floats for money. Rounding is half-away-from-zero (`Math.round` semantics), centralised in `src/lib/money.ts`.
2. **Quantity is `numeric(10,2)`.** It comes back from `node-postgres` as a **string** by default. Parse with `Decimal.js` before any arithmetic. Never multiply the raw string.
3. **Server functions own validation and persistence.** Route components call server functions; they do not query the DB or run Zod themselves.
4. **Migrations are append-only.** If a migration is merged, do not edit it. Add a new migration that fixes forward.
5. **TypeScript strict, no `as any`.** If a type assertion is genuinely needed, narrow with `as unknown as T` and add a single-line comment explaining why.
6. **Single tenant per database** (for now). UUID PKs everywhere so multi-tenancy can retrofit later. Do not add `user_id` or `account_id` columns on a one-off basis.
7. **`.pen` design files are encrypted.** Use the Pencil MCP tools (`open_document`, `batch_get`, `get_screenshot`, etc.). Never `Read` or `Grep` a `.pen` file.

## Tests

- Behaviour changes need tests. Bug fixes need a regression test.
- **Money math, invoice numbering, PDF rendering, and schema constraints have integration tests against real Postgres.** Do not mock the database for these. Follow the patterns in the existing tests under `tests/unit/`.
- Run `test:e2e` only when the change touches end-to-end behaviour (PDF render, invoice CRUD, navigation between routes).

## Quality gates

All four must be green before claiming a task is done:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e   # only when touching e2e-relevant behaviour
```

CI runs all of these on every push and PR, plus a `docker build` smoke test.

## Linting and formatting

- ESLint config: `eslint.config.js` (typescript-eslint recommended, react-hooks, eslint-config-prettier).
- Unused variables are an error unless prefixed with `_` (`argsIgnorePattern: '^_'`).
- Prettier: no semicolons, single quotes, trailing commas, 100-char width, 2-space indent. Don't fight it.
- Don't reformat unrelated files in your diff. Keep diffs minimal.

## Commits and PRs

- **DCO sign-off is required on every commit.** Use `git commit -s`. The `dco` GitHub Action blocks unsigned commits at the PR boundary.
- Do **not** add `Co-Authored-By: Claude` or any AI co-author trailer.
- Do **not** add a "Generated with Claude Code" footer to commit messages or PR descriptions.
- Match the existing commit style: lowercase, scoped where useful, e.g. `feat(unit-5): ...`, `fix(invoice-detail): ...`.
- Don't push to `origin` or open a PR without explicit user approval.

## Things to never do

- **Never bypass hooks** (`--no-verify`, `--no-gpg-sign`, etc.). Fix the underlying problem.
- **Never run destructive git operations** (`reset --hard`, `push --force`, `branch -D`, `clean -f`) without explicit user approval.
- **Never edit a merged migration.** Always add a new one.
- **Never add a runtime dependency** for something that fits in `src/lib/`. Small and auditable beats convenient.
- **Never embed hosted SaaS concerns** in this repo. They go in the future private overlay, not here.

## When you're stuck

- The MVP plan ([docs/plans/2026-04-30-001-feat-mvp-invoicing-app-plan.md](docs/plans/2026-04-30-001-feat-mvp-invoicing-app-plan.md)) is the canonical source for *why* a thing is shaped the way it is.
- For human-facing dev setup, see [CONTRIBUTING.md](CONTRIBUTING.md).
- For self-host concerns, see [README.md](README.md).
