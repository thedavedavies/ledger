FROM node:26-alpine AS builder

WORKDIR /app

# Activate the pnpm version pinned in package.json's packageManager field.
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:26-alpine AS runtime

WORKDIR /app

RUN corepack enable
RUN addgroup -S app && adduser -S app -G app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p /app/uploads && chown app:app /app/uploads

USER app

EXPOSE 3000

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "scripts/server.mjs"]
