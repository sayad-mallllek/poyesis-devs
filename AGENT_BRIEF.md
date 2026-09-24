# Backend conventions (read before writing code)

Monorepo: `nub` package manager (use `nub exec <bin>` / `nub run <script>`, never npx/npm).
Shared contracts: `packages/contracts/src` (ArkType schemas + response types + ABAC engine). After changing
contracts: `cd packages/contracts && nub exec tsc -p tsconfig.build.json` (consumers import the built `dist`).

API: `apps/api` — NestJS 12 (ESM) + Fastify + Prisma 7 (generated client at `src/generated/prisma/client.js`).
- ESM: relative imports end with `.js`. Types used only in decorated signatures (e.g. `Actor`) MUST be `import type`.
- Reference implementations to imitate: `src/clients/*`, `src/users/*`, `src/company/*`.
- Every service method takes `actor: Actor` (src/authz/actor.ts) first and returns contract types. Services have
  no HTTP concerns — the AI assistant calls the same methods with `origin: "ai"`.
- Authorization (ABAC, policies in packages/contracts/src/authz/policies.ts):
  - `this.authz.assert(actor.principal, action, subject, resourceAttrs?)` — resourceAttrs are `{ id?, userId?, projectId?, authorId? }`.
  - list scoping: `AND: [this.authz.where<Prisma.XWhereInput>(actor.principal, "read", "Subject"), ...filters]`.
  - field-level: `this.authz.assertFields(...)` for writes, `this.authz.redact(...)` for reads.
  - `@RequirePermission(action, subject)` on controller routes for coarse checks.
- Audit every mutation: `this.audit.record(actor, { action, entityType, entityId, summary }, tx)` inside the `$transaction`.
- Validation: `@Body(ark(schema))`, `@Query(ark(schema))` from `src/common/validation/ark.pipe.ts`.
- Errors: `notFound()`, `conflict()`, `isUniqueViolation()` from `src/common/http/errors.ts`; Nest HTTP exceptions otherwise.
- Serialization helpers: `src/common/serialization/index.ts` (toIsoDate, fromIsoDate, userRefSelect, toUserRef,
  decimalToNumber, pageArgs, paginated, definedOnly). Date-only columns are `@db.Date` <-> `YYYY-MM-DD` strings.
- Calendar math (booked hours, working days): `src/common/calendar.ts`. Company working days: `CompanyService.settings()` (global module).
- Config: inject `AppConfig` (src/config/app-config.ts). Global modules: Prisma, Authz, Audit, Security, Company, Config.
- Modules are already registered in `src/app.module.ts` as stubs — fill in your module file; do NOT edit app.module.ts.
- Do NOT change the Prisma schema or run migrations. If a schema change is truly required, stop and report it.
- Quality bar: senior engineer. Small focused files, no dead code, comments only where they explain *why*.
- Checks that must pass: `cd apps/api && nub exec tsc --noEmit -p .` and `nub exec vitest run`.
- Runtime smoke test: build into YOUR OWN folder so parallel builds don't clash:
  `nub exec tsc -p tsconfig.build.json --outDir .dist-<area>` then `PORT=<your port> node --env-file=.env .dist-<area>/main.js` (Postgres is on
  localhost:5433 and already migrated/seeded). Login: POST /v1/auth/login {"email":"admin@poyesis.dev","password":"ChangeMe123!"}
  -> use `tokens.accessToken` as Bearer. Kill your server by PID when done (do not use `pkill -f` patterns that
  could match other agents' servers). Other agents work in parallel in the same tree: only touch files in your area.
  Because others build concurrently, a transient compile error in someone else's folder is not yours to fix — re-run.
- Do not commit.
