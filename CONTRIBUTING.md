# Contributing

Thanks for considering a contribution. This is a small, focused project — patches that match the project's scope and style are very welcome.

## Sign your commits (DCO)

Every commit must include a `Signed-off-by` trailer asserting the [Developer Certificate of Origin](https://developercertificate.org/). Use the `-s` flag on every commit:

```bash
git commit -s -m "your message"
```

This adds a line like `Signed-off-by: Your Name <your.email@example.com>` to the message. The `dco` GitHub Action enforces this on every PR — unsigned commits block merge.

We do **not** use a CLA. Contributors retain copyright over their work.

## Dev setup

Requires Node 22 (see `.nvmrc`) and either Docker (for Postgres) or a local Postgres on `127.0.0.1:5432`. The package manager is [pnpm](https://pnpm.io), activated automatically via Corepack from the `packageManager` field in `package.json`.

```bash
git clone https://github.com/<your-fork>/ledger.git
cd ledger
cp .env.example .env
# edit .env so DATABASE_URL points at a Postgres you can reach
docker compose -f docker/postgres-dev.yml up -d   # optional; skip if you already run Postgres locally
corepack enable                                   # one-time, activates pnpm
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Quality gates

Before opening a PR:

- `pnpm typecheck`, zero errors
- `pnpm lint`, zero errors
- `pnpm test`, all green
- `pnpm test:e2e`, only when the change touches end-to-end behaviour (PDF render, invoice CRUD)

CI runs all of the above on every push and PR, plus a Docker image build smoke test.

## Style

- TypeScript strict mode is on. Don't bypass with `as any`.
- Money is integer minor units (cents) stored as `bigint`. Never use floats for money.
- Server functions own all validation (Zod) and persistence. Route components only call server functions.
- Migrations are append-only. Never edit a migration file under `drizzle/` once it's merged.

## Tests

PRs that change behaviour need tests. Bug fixes need a regression test. Money math, invoice numbering, and PDF rendering have integration tests against real Postgres — additions to those areas should follow the same pattern.

## Reporting issues

Open a GitHub issue. Include reproduction steps, expected behaviour, and the version (commit SHA is fine). Security issues: see the contact line at the top of the README rather than filing publicly.
