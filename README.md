# Poyesis — company & project management

A single-company workspace for running client and internal projects: people and roles,
projects with rich metadata and analytics, a resource-guru–style schedule, clients,
GitHub and Sentry insight per project, and an AI assistant that can read and act on
everything through tools, while respecting each user's permissions.

## Architecture

```
Browser ──► apps/web (Next.js 16)
              ├─ React UI (App Router, TanStack Query, shadcn/ui, Recharts)
              └─ /api/*  Elysia BFF ── HttpOnly cookies, token refresh, SSE pass-through
                              │  Bearer JWT
                              ▼
            apps/api (NestJS 12 + Fastify)  ── /v1/*
              ├─ Auth: argon2id, JWT access tokens, rotating refresh tokens (reuse detection)
              ├─ ABAC: shared policy engine (packages/contracts/src/authz) + Prisma row scoping
              ├─ Domain modules: users, clients, projects, scheduling, people, dashboard, audit
              ├─ Integrations: GitHub (Octokit), Sentry (REST) with encrypted credentials
              └─ AI: LangChain + DeepSeek V4.1 Flash (Command Code provider API), tool-calling
                     agent streamed over SSE
                              │
                              ▼
                     PostgreSQL (Prisma 7, multi-file schema)

packages/contracts  ArkType schemas, response types, enums and the ABAC engine —
                    shared by the API (validation + authorization) and the web app
                    (forms + UI permission checks), so both sides agree by construction.
```

### Key decisions

| Area | Decision | Why |
|---|---|---|
| Validation | ArkType schemas in `@repo/contracts`, used by a Nest pipe (`ark(schema)`) and by react-hook-form | One definition per payload for client and server |
| Authorization | ABAC with predefined roles; named conditions (`self`, `projectMember`, `projectManager`, `author`) and field-level rules | Same answers for single-resource checks, list filtering and UI affordances |
| Sessions | The BFF keeps tokens in HttpOnly cookies. Refresh tokens rotate, reuse revokes the family, and the BFF refreshes with a single flight | Tokens never reach browser JS, and parallel requests can't trip reuse detection |
| AI actions | Tools call the *same* service methods as REST, with an `ai`-origin actor | Permissions, validation and audit apply identically; AI changes are attributed in the audit log |
| AI safety | Destructive tools (`archive_*`, `delete_*`, `remove_*`, `suspend_*`) never run without an explicit user confirmation in the UI; confirmations can't be replayed | Human-in-the-loop for irreversible actions |
| Generative UI | The model calls `render_chart`, `render_stats`, `render_table`, `render_timeline`, `render_entity_list` and `ask_user`; the web app renders one component per block kind | Visual answers and structured input instead of walls of text |
| Charts | Categorical palette validated for colour-vision deficiency (light and dark), with legends, tooltips and a table view | Accessible by construction |

## Features

- **Auth & roles** — email + password; roles `ADMIN`, `MANAGER`, `MEMBER`, `GUEST` (see the matrix below).
- **Projects** — code, status, health, priority, type, billing model, budget, rate, estimate, dates,
  progress, tags, tech stack, objectives, success criteria, scope/out-of-scope, assumptions,
  constraints, links, confidentiality, members with project roles, milestones, risks (5×5),
  status updates (health history), attachments with text extraction for the AI.
  Analytics: schedule vs progress, weekly burn-up of booked hours vs estimate, effort by member,
  budget burn/forecast, milestone timeline, risk matrix.
- **GitHub** — link several repositories per project; pull requests, Actions runs, deployments, releases.
- **Sentry** — link several Sentry projects per project; unresolved issues with event and user counts and sparklines.
- **Schedule** — bookings of *h/day* over date ranges, time off, capacity and utilization per person and day.
- **People** — directory, profiles, skills (self-assessed), **ratings (admins only)**, remarks/notes/warnings/kudos.
- **Clients** — company details and contacts; projects optionally belong to a client.
- **AI assistant** — persistent dock on every page, full-screen mode and `/assistant`; sessions;
  page-aware ("this project"); about 50 tools across the whole platform; streaming; charts and forms.
- **Audit log** — every mutation, with origin `web` or `ai`.

## Roles and permissions

Policies live in [packages/contracts/src/authz/policies.ts](packages/contracts/src/authz/policies.ts).

| Capability | Admin | Manager | Member | Guest |
|---|---|---|---|---|
| Users: create, change role, suspend | ✅ | — | — | — |
| Own profile (safe fields) | ✅ | ✅ | ✅ | ✅ |
| Compensation (`costRate`) | ✅ | — | — | — |
| Clients | manage | manage | read | — |
| Projects: create | ✅ | ✅ | — | — |
| Projects: read | all | all | member of | member of |
| Projects: update / archive | all | owned or led | led (update) | — |
| Milestones, risks, team, links | all | owned or led | led | read (member of) |
| Status updates, attachments | ✅ | member of | member of | read |
| Bookings & time off | manage | manage | read (own + project), own time off | — |
| Skills (self-assessment) | all | own | own | — |
| **Skill ratings** | ✅ | — | — | — |
| Notes about people | all | read/create; edit own | — | — |
| Integrations (tokens) | ✅ | — | — | — |
| Audit log | ✅ | — | — | — |

"Led" means the user owns the project or holds the `LEAD` project role.

## Getting started

Requirements: Node ≥ 24, [`nub`](https://www.npmjs.com/package/nub) (the repo's package manager),
PostgreSQL 16+ (Docker Compose provided).

```sh
nub install
docker compose up -d postgres                 # Postgres on localhost:5433

cp apps/api/.env.example apps/api/.env        # then set secrets (see below)
cp apps/web/.env.example apps/web/.env.local

cd apps/api
nub exec prisma migrate deploy                # or: nub run db:migrate (dev)
nub run db:seed -- --demo                     # admin + optional demo workspace
cd ../..

nub run dev                                   # contracts (watch) + API :4000 + web :3000
```

Sign in at http://localhost:3000 with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(default `admin@poyesis.dev` / `ChangeMe123!`). Demo users are `firstname.lastname@poyesis.dev`
with password `Password123!` (e.g. `claire.dubois@…` is a Manager, `ada.lovelace@…` a Member,
`sam.okafor@…` a Guest).

### Configuration (`apps/api/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ≥ 32 chars; `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | 32 bytes base64 (`openssl rand -base64 32`); encrypts GitHub/Sentry tokens (AES-256-GCM) |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS` | Session lifetimes |
| `STORAGE_DIR`, `MAX_UPLOAD_BYTES` | Attachment storage (local disk behind a `StorageService` abstraction) |
| `AI_API_KEY` | Command Code API key; the assistant is disabled when empty |
| `AI_BASE_URL` | `https://api.commandcode.ai/provider/v1` |
| `AI_MODEL` | `deepseek/deepseek-v4.1-flash` |
| `WEB_ORIGIN`, `PORT`, `LOG_LEVEL` | Server settings |

The environment is validated with ArkType at boot; the API refuses to start on invalid config.
The web app only needs `API_URL` (server-side).

GitHub and Sentry are configured by an administrator in **Settings → Integrations**
(a GitHub token with `repo` and `actions:read`; a Sentry org token with `project:read` and `event:read`).

## Scripts

| Command | What it does |
|---|---|
| `nub run dev` | All apps in watch mode (Turborepo) |
| `nub run build` | Build contracts, API and web |
| `nub run check-types` | Type-check everything (TypeScript 7) |
| `nub run lint` | ESLint (Babel parser; type rules are enforced by `tsc`) |
| `nub run test` | Vitest suites (contracts ABAC and schemas, API services and AI loop) |
| `apps/api: nub run db:migrate / db:deploy / db:seed / db:studio` | Prisma workflows |

## Repository layout

```
apps/
  api/
    prisma/schema/*.prisma     multi-file schema: identity, company, clients, projects,
                               scheduling, people, integrations, ai
    src/
      auth/ authz/ audit/      authentication, ABAC enforcement, audit trail
      users/ clients/ projects/ scheduling/ people/ dashboard/ company/
      integrations/            credentials, github/, sentry/
      ai/                      agent loop, tools, model port, sessions, SSE controller
      common/                  validation pipe, errors, serialization, calendar math
  web/
    app/(auth) app/(app)       routes (thin); app/api/[[...slugs]] mounts the Elysia BFF
    features/<domain>/         UI per domain (projects, people, schedule, clients, assistant, …)
    lib/api/                   typed query/mutation hooks per domain
    lib/server/bff/            BFF: cookies, upstream proxy, single-flight refresh
    components/ui/             shadcn/ui (owned)
packages/
  contracts/                   schemas, types, ABAC engine (+ tests)
  eslint-config/ typescript-config/
```

## AI assistant internals

- **Loop** ([apps/api/src/ai/agent/agent-runner.ts](apps/api/src/ai/agent/agent-runner.ts)):
  streams the model, executes requested tools (validated with ArkType), feeds results back, and
  stops when the model answers, a tool hands control to the user (`ask_user`, confirmations),
  or the step budget runs out.
- **Tools** are defined once with an ArkType schema (converted to JSON Schema for the model), a
  label for the UI, an optional ABAC gate (a user is only offered tools they can use) and a mode.
- **History**: each turn stores UI parts and the LangChain message trace. Old tool output is
  trimmed; interrupted tool calls are repaired before replay.
- **Model port** (`AssistantModel`): production uses `ChatOpenAI` pointed at Command Code;
  tests use a scripted fake. You can swap in any OpenAI-compatible provider through configuration.

## Conventions

See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) — patterns for services, ABAC, audit, forms, tabs, AI tools and generative-UI blocks.

## Testing

```sh
nub run test
```

- `packages/contracts`: ABAC engine semantics per role, field-level rules and schema behaviour.
- `apps/api`: calendar math, schedule and dashboard metrics, project analytics, code generation,
  storage path safety, GitHub/Sentry mappers and caching, the agent loop (streaming, tool
  execution, invalid-argument recovery, confirm and hand-off modes), history repair, and a
  check that every tool schema converts to valid JSON Schema.
