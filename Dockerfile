# syntax=docker/dockerfile:1.7
# ── deps ──────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS build

# Baked at image build time; override with NEXT_PUBLIC_API_BASE_URL env var
# at runtime only if using client-side fetch (server components use env directly).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun run build

# ── runtime ───────────────────────────────────────────────────────────────────
# Next.js standalone output produces a minimal server.js with its own
# bundled node_modules — no need to copy the full node_modules tree.
# Switch to node:22-alpine (no bun needed at runtime; Next.js uses Node).
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="karaxys-dashboard" \
      org.opencontainers.image.description="Karaxys Next.js dashboard" \
      org.opencontainers.image.source="https://github.com/karaxys/karaxys"

RUN apk add --no-cache curl \
    && addgroup --system --gid 10001 nextjs \
    && adduser  --system --uid 10001 --ingroup nextjs nextjs

WORKDIR /app

# standalone contains its own minimal node_modules
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
# static assets served by the standalone server
COPY --from=build --chown=nextjs:nextjs /app/.next/static  ./.next/static
# public directory (fonts, icons, images)
COPY --from=build --chown=nextjs:nextjs /app/public        ./public

USER nextjs

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=7000

EXPOSE 7000

HEALTHCHECK --interval=15s --timeout=5s --retries=8 --start-period=30s \
  CMD curl -fsS http://127.0.0.1:7000/ >/dev/null || exit 1

# server.js is the standalone Next.js entry point
CMD ["node", "server.js"]
