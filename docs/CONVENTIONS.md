# Engineering conventions

Read this before contributing. The reference implementations to imitate are the
**Clients** feature on both sides: `apps/api/src/clients/*` and `apps/web/features/clients/*`
+ `apps/web/lib/api/clients.ts`.

## Monorepo

- Package manager is `nub` (`nub install`, `nub run <script>`, `nub exec <bin>`). A
  supply-chain age gate rejects releases younger than 24h — pin a slightly older version.
- `packages/contracts` is the single source of truth for payloads (ArkType schemas),
  response types, enums and the ABAC engine. It is consumed from its built `dist`; run
  `nub run build` in that package (or `nub run dev` at the root) after changing it.
- TypeScript 7 (`tsc`) is the type checker and the API compiler. Unused locals/parameters
  are compiler errors. ESLint uses the Babel parser (typescript-eslint needs TS's JS API,
  which TS 7 doesn't ship), so type-aware lint rules are delegated to `tsc`.

## API (`apps/api`)

- NestJS 12, ESM: relative imports end in `.js`. Interfaces used in decorated signatures
  (e.g. `Actor`) must be `import type` (isolatedModules + decorator metadata).
- **Every service method takes `actor: Actor` first** and returns contract types. Services
  have no HTTP concerns: the AI assistant calls the same methods with `origin: "ai"`.
- **Authorization** (policies in `packages/contracts/src/authz/policies.ts`):
  - single resource: `authz.assert(principal, action, subject, { id | userId | projectId | authorId })`
  - lists: `AND: [authz.where<Prisma.XWhereInput>(principal, "read", "X"), …filters]`
  - fields: `authz.assertFields(…)` on writes, `authz.redact(…)` on reads (keys are removed, not nulled)
  - coarse route gate: `@RequirePermission(action, subject)`
  - new named conditions need an evaluator in `engine.ts` **and** a Prisma translation in
    `authz.service.ts`; missing translations fail closed.
- **Audit** every mutation inside its transaction: `audit.record(actor, { action, entityType, entityId, summary }, tx)`.
- Validation: `@Body(ark(schema))` / `@Query(ark(schema))`. Errors: `notFound()`, `conflict()`,
  Nest HTTP exceptions; the global filter renders `ApiErrorBody`.
- Dates: `@db.Date` columns ↔ `YYYY-MM-DD` strings via `toIsoDate`/`fromIsoDate`. Booked
  hours and capacity math live only in `src/common/calendar.ts`.
- Prisma schema is split by bounded context in `prisma/schema/*.prisma`.
- Tests: Vitest, colocated `*.test.ts`, focused on pure logic (extract it from services).

## Web (`apps/web`)

- Next.js App Router. Route files under `app/(app)` stay thin; UI lives in
  `features/<domain>/*`; typed query/mutation hooks in `lib/api/<domain>.ts` with a key
  factory and precise invalidation.
- The browser only calls the BFF (`/api/*`, Elysia in `lib/server/bff`) via `lib/api/client.ts`.
  Tokens stay in HttpOnly cookies.
- Forms: react-hook-form + the ArkType schema from contracts (`arktypeResolver`), with
  `applyServerErrors` to map API issues onto fields and `emptyToNull` for optional inputs.
- UI permissions: `useCan()` / `<Can>` evaluate the same ABAC policies as the API. Hide
  what the user can't do; the API remains the authority.
- Reuse the building blocks: `PageContainer`, `PageHeader`, `EmptyState`, `ErrorState`,
  `ToneBadge` + tone maps, `UserAvatar`, `ConfirmDialog`, `PaginationBar`,
  `useSearchParamsState` (filters in the URL), `lib/format.ts`.
- Charts: shadcn `ChartContainer` + Recharts; colors `var(--chart-1..8)` — a CVD-validated
  categorical palette assigned in fixed order, never cycled; legends for ≥2 series,
  tooltips, and a table view where values matter.
- Accessible (labels, `sr-only` text on icon buttons, keyboard), responsive to ~375px,
  dark mode via tokens only.

## Adding things

- **A project tab**: add `app/(app)/projects/[projectId]/(tabs)/<segment>/page.tsx` and an
  entry in `features/projects/project-tabs.ts`; read the project with `useProject()`.
- **An AI tool**: add a `defineTool({ name, label, description, schema, requires?, mode?, run })`
  to the relevant file in `apps/api/src/ai/tools/`. Call an existing service method; use
  `mode: "confirm"` + `describe` for anything destructive. The tool-schema test checks that
  it converts to JSON Schema and that destructive names require confirmation.
- **A generative-UI block**: extend the `UiBlock` union in `packages/contracts/src/ai.ts`, add
  a `render_*` tool in `ui.tools.ts`, and a renderer in `apps/web/features/assistant/blocks/`
  (the `UiBlockView` switch is exhaustive, so the compiler points to it).
