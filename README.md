# Ledger.

> A minimal, self-hostable invoicing app. Create clients, create invoices, download PDFs. No auth, no SaaS chrome — just the boring useful parts.

<!-- TODO: replace with a real screenshot once Unit 9 (visual fidelity) lands -->

## ⚠️ Read this before exposing it to the internet

This MVP has **no authentication**. The default Docker Compose binds the app to `127.0.0.1`. Do not change that to a public address without putting a reverse proxy with access control in front. Anyone who can reach the bound port can read and write every invoice and client record.

## Self-host in 60 seconds

Requires Docker.

```bash
git clone https://github.com/thedavedavies/ledger.git
cd ledger
cp .env.example .env
docker compose up -d
```

Open `http://127.0.0.1:3000`. Three services come up:

- `db` — Postgres 16, internal network only
- `migrate` — runs schema migrations once and exits
- `app` — the web app, bound to `127.0.0.1:3000` by default

Stop with `docker compose down`. Data persists in named volumes (`pgdata`, `uploads`).

## Local development

If you'd rather run the app on your host (faster HMR), bring up only Postgres in Docker:

This project uses [pnpm](https://pnpm.io) (via [Corepack](https://nodejs.org/api/corepack.html)). The pinned version in `package.json` will be activated automatically, so you do not need to install pnpm globally.

```bash
cp .env.example .env
docker compose -f docker/postgres-dev.yml up -d
corepack enable                # one-time, activates pnpm from packageManager field
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Features

### In this MVP (Community Edition)

- ✅ Client CRUD
- ✅ Invoice CRUD with line items and a single invoice-level tax rate
- ✅ Invoice PDF download (multi-page, A4)
- ✅ Singleton company profile (your business details on every invoice)
- ✅ Year-scoped invoice numbering (`INV-YYYY-NNNN`)
- ✅ Self-host via `docker compose up`

### Planned, not yet shipped

- ⏳ Authentication and multi-user accounts
- ⏳ Email send (SMTP / Resend)
- ⏳ Public invoice view link + view tracking
- ⏳ Stripe / payment links + mark-paid webhooks
- ⏳ Monthly income chart
- ⏳ Per-line VAT and multi-jurisdiction tax handling

Each of the above is a separate plan inside `docs/plans/`. The Community Edition stays AGPL-licensed and self-hostable as those land.

## Hosted version

A hosted SaaS is on the roadmap and will be a separate, private product that consumes this repo as a dependency. There is **no** SaaS today — self-host is the only path.

## Backup and restore (self-host)

```bash
# Backup
docker compose exec db pg_dump -U postgres invoice > invoice.sql
docker run --rm -v ledger_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads.tar.gz -C /data .

# Restore
cat invoice.sql | docker compose exec -T db psql -U postgres -d invoice
docker run --rm -v ledger_uploads:/data -v "$PWD":/backup alpine tar xzf /backup/uploads.tar.gz -C /data
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All commits must include a `Signed-off-by` trailer (DCO). We do not use a CLA.

## License

This project is licensed under **AGPL-3.0-or-later** — see the full text in [LICENSE](LICENSE). In plain English:

- You can self-host it, modify it, and use it as part of your business — including modifying it to suit your needs.
- If you offer it as a network service to other people (i.e. you run a hosted version that other users access over a network), the AGPL requires you to make your modifications available under the same license.

A commercially-hosted version run by the maintainers is on the roadmap as a separate product. The Community Edition (this repo) remains AGPL-licensed and self-hostable indefinitely.

## Code of Conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
