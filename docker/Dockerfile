FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p /app/uploads && chown app:app /app/uploads

USER app

EXPOSE 3000

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/server/server.js"]
