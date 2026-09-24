# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Poyesis web (Next.js App Router, standalone output)
#
# Build context is the repository root:
#   docker build -f apps/web/Dockerfile .
#
# See apps/api/Dockerfile for why pnpm is used against the `nub.lock` file.
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

COPY package.json nub.lock turbo.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Required because the API's postinstall runs during the shared install.
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma

# pnpm 10 skips dependency build scripts unless allow-listed; Prisma's engines
# and argon2's native binding need theirs (nub approves these in the repo).
RUN printf 'packages:\n  - "apps/*"\n  - "packages/*"\nonlyBuiltDependencies:\n  - argon2\n  - prisma\n  - "@prisma/engines"\n' > pnpm-workspace.yaml \
    && cp nub.lock pnpm-lock.yaml

ENV DATABASE_URL="postgresql://user:password@localhost:5432/poyesis?schema=public"

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @repo/contracts build \
    && pnpm --filter web build

# ---------------------------------------------------------------------------
# Runtime stage (Next.js standalone — no node_modules install required)
# ---------------------------------------------------------------------------
FROM node:24-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
