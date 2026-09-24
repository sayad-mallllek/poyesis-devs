# Frontend conventions (read before writing code)

App: `apps/web` — Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (new-york, Radix) in `components/ui/*`
(owned code; extend only when necessary), TanStack Query v5, react-hook-form + ArkType resolver, Recharts,
lucide-react icons, date-fns, sonner toasts, zustand for small client stores.
Package manager: `nub` (`nub exec <bin>`). Supply-chain age gate: new deps must be >24h old; prefer what's installed.

Data flow: browser → `/api/*` (Elysia BFF in `lib/server/bff`, HttpOnly cookies) → NestJS API `/v1/*`.
Never call the API directly; use `api.get/post/patch/put/delete/upload` from `lib/api/client.ts`.
Shared types & ArkType schemas: `@repo/contracts` (packages/contracts/src). Always type responses with contract types.

Reference implementation to imitate (structure, naming, quality): Clients —
`lib/api/clients.ts` (query keys, `queryOptions`, mutation hooks with invalidation),
`features/clients/*` (list with URL-state filters, detail, form with ArkType resolver + server error mapping),
`app/(app)/clients/**` (thin route files).

Building blocks — reuse, don't re-invent:
- Layout: `PageContainer`, `PageHeader` (components/app/page-header.tsx).
- States: `EmptyState`, `ErrorState` (components/app/states.tsx); `Skeleton` while pending.
- Badges & tones: components/app/status-badges.tsx (`ToneBadge`, project status/health/priority, milestone, risk, note tones).
- `UserAvatar`, `fullName` (components/app/user-avatar.tsx); `ConfirmDialog`; `PaginationBar`.
- Forms: `FormField` (components/forms/form-field.tsx), `applyServerErrors`, `emptyToNull` (lib/forms.ts).
- Formatting: lib/format.ts (formatDate, formatRelative, formatMoney, formatHours, humanize, formatBytes, toIsoDate, parseDate).
- URL state: `useSearchParamsState` (hooks/use-search-param.ts); `useDebouncedValue`.
- ABAC in UI: `useCan()` / `<Can action subject resource field>` from components/providers/session-provider.tsx —
  hide actions the user can't perform; `useSession()` gives `{ user, principal }`. The API stays the authority.
- Charts: shadcn `ChartContainer`/`ChartTooltip` (components/ui/chart.tsx) with Recharts; colors from CSS vars
  `var(--chart-1..8)` (validated categorical palette — assign in fixed order, never cycle; >8 series → fold into "Other"), semantic `var(--success|--warning|--destructive|--info|--primary)`.

Rules:
- Route files in `app/(app)/...` stay thin; UI lives in `features/<domain>/*`; API hooks in `lib/api/<domain>.ts`.
- Pages that read `useSearchParams` must be wrapped in `<Suspense>` (see app/(app)/clients/page.tsx).
- Accessible: labels on inputs, `sr-only` text for icon-only buttons, keyboard-usable.
- Responsive down to ~375px wide. Dark mode must look right (use tokens, never hard-coded grays).
- No `any`, no dead code, comments only for *why*. Keep components focused (<~250 lines; split otherwise).
- Must pass: `cd apps/web && nub exec tsc --noEmit -p .` and `nub exec eslint .` (fix warnings in your files).
- Runtime: the web dev server runs on http://localhost:3000 (HMR — don't start another) and the API on :4000.
  Do not restart them. Login admin@poyesis.dev / ChangeMe123!.
- Visual check: `node /tmp/claude-1000/-home-bob-Others-Repos-poyesis-devs/b6d03d57-ee8a-405d-ac9b-f0f460f63cb4/scratchpad/shot.mjs /path1 /path2`
  (cwd = that scratchpad dir) saves PNGs in `shots/` (env: DARK=1, FULL=1, W/H, EMAIL/PASSWORD, WAIT=ms) and prints
  browser console errors. Look at the screenshots with the Read tool and iterate until it looks polished.
- Other agents work in parallel in the same tree — only touch files in your area. Do not commit.
