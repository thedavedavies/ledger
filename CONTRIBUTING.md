# Contributing

Thanks for considering a contribution. This project is small and opinionated. The bar for a PR is whether the change fits the project's scope and style, not whether it's well-written code in the abstract.

## Discuss before building

For anything beyond a small bug fix, open a [discussion](https://github.com/thedavedavies/ledger/discussions) or issue before writing code. PRs without prior discussion may still be merged, but changes that have been talked through get attention first.

Bug fixes don't need discussion. If something is broken, send a PR with a regression test.

## Sign your commits (DCO)

Every commit must carry a `Signed-off-by` trailer asserting the [Developer Certificate of Origin](https://developercertificate.org/). Use `-s`:

```bash
git commit -s -m "your message"
```

This adds `Signed-off-by: Your Name <your.email@example.com>` to the commit message. The `dco` GitHub Action blocks unsigned commits at the PR boundary.

No CLA. Contributors keep copyright over their work.

## Dev setup

Requires Node 22 (see `.nvmrc`) and either Docker (for Postgres) or a local Postgres on `127.0.0.1:5432`. The package manager is [pnpm](https://pnpm.io), activated via Corepack from the `packageManager` field in `package.json`.

```bash
git clone https://github.com/<your-fork>/ledger.git
cd ledger
cp .env.example .env
# Point DATABASE_URL at a Postgres you can reach
docker compose -f docker/postgres-dev.yml up -d   # optional, skip if you run Postgres locally
corepack enable
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Quality gates

All three must pass before opening a PR:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

Add `pnpm test:e2e` when the change touches end-to-end behaviour (PDF render, invoice CRUD, navigation).

CI runs all of these on every push and PR, plus a Docker image build smoke test.

## Style

- TypeScript strict mode is on. Don't bypass with `as any`. If a type assertion is genuinely needed, narrow with `as unknown as T` and add a one-line comment explaining why.
- Money is integer minor units (`bigint`). Never floats. Rounding lives in `src/lib/money.ts`.
- Server functions (`src/server/*.fn.ts`) own all validation (Zod) and persistence. Route components call server functions; they do not query the DB or run Zod themselves.
- Migrations under `drizzle/` are append-only. Once a migration is merged, don't edit it. Add a new migration that fixes forward.
- Prettier: no semicolons, single quotes, trailing commas, 100-char width, 2-space indent. Don't fight it.

## Tests

Behaviour changes need tests. Bug fixes need a regression test.

Money math, invoice numbering, PDF rendering, and schema constraints have integration tests that hit a real Postgres. Don't mock the database for those. Follow the patterns in `tests/unit/`.

## Reporting issues

Open a GitHub issue. Include reproduction steps, expected behaviour, and the version (commit SHA is fine).

For security vulnerabilities, see [SECURITY.md](SECURITY.md). Please don't file security issues publicly.
