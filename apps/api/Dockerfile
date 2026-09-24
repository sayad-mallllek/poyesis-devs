# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Poyesis API (NestJS + Fastify + Prisma)
#
# Build context is the repository root:
#   docker build -f apps/api/Dockerfile .
#
# The repo is managed with the `nub` package manager, which speaks the pnpm
# v9 lockfile format. We use pnpm in the image and feed it `nub.lock` as its
# lockfile so installs stay reproducible without `nub` being available.
# ---------------------------------------------------------------------------

FROM node:24-bookworm AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@10.30.2
WORKDIR /repo

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM base AS build

# Workspace manifests first (better layer caching).
COPY package.json nub.lock turbo.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# The API's `postinstall` runs `prisma generate`, so the schema and Prisma
# config must exist before dependencies are installed.
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma

# pnpm needs an explicit workspace file; reuse the nub lockfile as-is.
# pnpm 10 skips dependency build scripts unless allow-listed; Prisma's engines
# and argon2's native binding need theirs (nub approves these in the repo).
RUN printf 'packages:\n  - "apps/*"\n  - "packages/*"\nonlyBuiltDependencies:\n  - argon2\n  - prisma\n  - "@prisma/engines"\n' > pnpm-workspace.yaml \
    && cp nub.lock pnpm-lock.yaml

# A throwaway DSN lets prisma.config.ts load during install/build. The real
# value is injected at runtime via the environment.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/poyesis?schema=public"

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @repo/contracts build \
    && pnpm --filter api exec prisma generate \
    && pnpm --filter api build

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

# Keep the pnpm-isolated node_modules layout intact: workspace symlinks are
# relative, so the same paths must be preserved here.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml ./
COPY --from=build /repo/packages/contracts ./packages/contracts
COPY --from=build /repo/apps/api ./apps/api

# Run unprivileged; the uploads volume inherits this ownership on first mount.
RUN mkdir -p /data/storage && chown -R node:node /data/storage
USER node

EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Apply pending migrations on start (idempotent), then boot the API.
WORKDIR /repo/apps/api
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node --enable-source-maps dist/main.js"]
