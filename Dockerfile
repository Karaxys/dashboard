# syntax=docker/dockerfile:1.7
# ── deps ──────────────────────────────────────────────────────────────────────
# Hardened Wolfi-based Node toolchain (low-CVE). bun is used to install + build
# from the project's bun.lock; none of this stage ships in the final image.
FROM cgr.dev/chainguard/node:latest-dev AS deps

USER root
WORKDIR /app

# npm >= 12 blocks install scripts by default, which leaves bun's launcher
# broken ("Bun's postinstall script was not run"). Opt this one package in.
RUN npm install -g --allow-scripts=bun bun

# Only package manifests here, so this layer (the slow install) is cached and
# reused across builds until dependencies actually change.
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS build

# NOTE: the API URL is resolved at RUNTIME (see app/config.js + lib/config.ts),
# so this build arg is only a fallback for local `next build` / dev. Operators
# set KARAXYS_API_BASE_URL on the container instead — no rebuild required.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache \
    --mount=type=cache,target=/app/.next/cache \
    bun run build

# ── runtime ───────────────────────────────────────────────────────────────────
# Hardened, zero-CVE Node runtime (Wolfi-based, nonroot, no shell/package manager).
# Next.js "standalone" output ships its own minimal node_modules + server.js.
FROM cgr.dev/chainguard/node:latest AS runtime

LABEL org.opencontainers.image.title="karaxys-dashboard" \
      org.opencontainers.image.description="Karaxys Next.js dashboard" \
      org.opencontainers.image.source="https://github.com/karaxys/karaxys"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=7000

# Chainguard node runs as the nonroot user (uid 65532) by default.
COPY --from=build --chown=65532:65532 /app/.next/standalone ./
COPY --from=build --chown=65532:65532 /app/.next/static  ./.next/static
COPY --from=build --chown=65532:65532 /app/public         ./public

EXPOSE 7000

# No curl/shell in the image — probe with Node's built-in fetch (exec form).
HEALTHCHECK --interval=15s --timeout=5s --retries=8 --start-period=30s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:7000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Chainguard node's default entrypoint is ["node"]; run the standalone server.
CMD ["server.js"]
