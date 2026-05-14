# Ledger.

A self-hostable invoicing app. Create clients, generate invoices, download PDFs. Nothing else.

Single-tenant, AGPL-licensed, written for people who want to send invoices from their own server without renting a SaaS to do it.

## Heads-up: there's no authentication yet

This MVP ships without auth. The default Docker Compose binds the app to `127.0.0.1` so only your own machine can reach it. **Do not** put a public address in front of it without a reverse proxy with access control. Anyone who can hit the bound port can read and write every invoice and client.

Auth is a planned feature. Until then, treat the running app like a local-only desktop tool.

## Self-host in 60 seconds

Requires Docker.

```bash
git clone https://github.com/thedavedavies/ledger.git
cd ledger
cp .env.example .env
docker compose up -d
```

Open `http://127.0.0.1:3000`. Three services come up:

- `db`: Postgres 18, internal network only
- `migrate`: runs schema migrations once and exits
- `app`: the web app, bound to `127.0.0.1:3000`

Stop with `docker compose down`. Data persists in named volumes (`pgdata`, `uploads`).

## What's in it

Shipped in the Community Edition:

- Client Create, Read, Update, Delete (CRUD)
- Invoice CRUD with line items and a single invoice-level tax rate
- Invoice PDF download (multi-page, A4, rendered without a headless browser)
- Singleton company profile (your business details appear on every invoice)
- Year-scoped invoice with a configurable prefix (`INV-YYYY-NNNN`)
- Self-host via `docker compose up`

Planned, not shipped yet:

- Authentication and multi-user accounts
- Email send (SMTP / Resend)
- Public invoice view link, with view tracking
- Stripe / payment links and a mark-paid webhook
- Monthly income chart
- Per-line VAT and multi-jurisdiction tax handling

Each is released as a separate change. The Community Edition stays AGPL and self-hostable as those features arrive.

## Tech

- **Runtime:** Node 24, TanStack Start v1 on Vite
- **Database:** Postgres 18 via Drizzle ORM. Migrations are append-only SQL.
- **PDF:** `@react-pdf/renderer`. No Chromium or headless browser.
- **UI:** Tailwind v4 with Radix UI primitives, shadcn-style copy-in components
- **Money:** stored as `bigint` minor units. No floats.

## Local development

If you'd rather run the app on your host (faster HMR), bring up only Postgres in Docker.

This project uses [pnpm](https://pnpm.io) via [Corepack](https://nodejs.org/api/corepack.html). The pinned version in `package.json` activates automatically; you don't need pnpm installed globally.

```bash
cp .env.example .env
docker compose -f docker/postgres-dev.yml up -d
corepack enable
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Backup and restore

```bash
# Backup
docker compose exec db pg_dump -U postgres invoice > invoice.sql
docker run --rm -v ledger_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads.tar.gz -C /data .

# Restore
cat invoice.sql | docker compose exec -T db psql -U postgres -d invoice
docker run --rm -v ledger_uploads:/data -v "$PWD":/backup alpine tar xzf /backup/uploads.tar.gz -C /data
```

## Security

If you've found a vulnerability, please don't open a public issue. See [SECURITY.md](SECURITY.md) for how to report it privately.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All commits must include a `Signed-off-by` trailer (DCO). No CLA.

## License

AGPL-3.0-or-later. Full text in [LICENSE](LICENSE). In plain English:

- You can self-host it, modify it, and use it inside your business.
- If you offer it as a network service to other people (a hosted version they access over a network), the AGPL requires you to publish your modifications under the same license.

A commercially-hosted version run by the maintainers is planned as a separate product. The Community Edition (this repo) stays AGPL and self-hostable.

## Code of Conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
