"use client";

import { PRIORITIES, PROJECT_HEALTHS, PROJECT_STATUSES, type ListProjectsQuery } from "@repo/contracts";
import { LayoutGrid, List, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UserPicker } from "@/components/app/user-picker";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchParamsState } from "@/hooks/use-search-param";
import { humanize } from "@/lib/format";
import { ClientPicker } from "../components/client-picker";

const ALL = "all";

export const SORTS = {
  newest: { label: "Newest first", sort: "createdAt", order: "desc" },
  deadline: { label: "Deadline (soonest)", sort: "targetEndDate", order: "asc" },
  priority: { label: "Priority (highest)", sort: "priority", order: "desc" },
  progress: { label: "Progress (lowest)", sort: "progress", order: "asc" },
  name: { label: "Name (A–Z)", sort: "name", order: "asc" },
} as const satisfies Record<string, { label: string; sort: ListProjectsQuery["sort"]; order: ListProjectsQuery["order"] }>;
export type SortKey = keyof typeof SORTS;

export type ProjectView = "grid" | "table";

/** Filter state lives in the URL so views are shareable and survive reloads. */
export function useProjectFilters() {
  const { get, set } = useSearchParamsState();
  const sortKey = (get("sort") ?? "newest") as SortKey;
  const filters = {
    q: get("q") ?? "",
    status: get("status") as ListProjectsQuery["status"],
    health: get("health") as ListProjectsQuery["health"],
    priority: get("priority") as ListProjectsQuery["priority"],
    clientId: get("client"),
    ownerId: get("owner"),
    mine: get("mine") === "1",
  };
  return {
    filters,
    sortKey: sortKey in SORTS ? sortKey : "newest",
    view: (get("view") === "table" ? "table" : "grid") as ProjectView,
    page: Number(get("page") ?? 1),
    active: !!(filters.q || filters.status || filters.health || filters.priority || filters.clientId || filters.ownerId || filters.mine),
    set,
  };
}

function EnumFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  onChange: (value: T | null) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : (v as T))}>
      <SelectTrigger className="w-full sm:w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Any {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {humanize(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProjectFilters({ state }: { state: ReturnType<typeof useProjectFilters> }) {
  const { filters, sortKey, view, active, set } = state;
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebouncedValue(search.trim());

  useEffect(() => {
    if (debounced !== filters.q) set({ q: debounced, page: null });
  }, [debounced, filters.q, set]);

  const update = (patch: Record<string, string | null>) => set({ ...patch, page: null });

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search projects"
            placeholder="Search name, code, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Toggle
          variant="outline"
          pressed={filters.mine}
          onPressedChange={(on) => update({ mine: on ? "1" : null })}
          className="data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
        >
          <UserRound /> My projects
        </Toggle>
        <div className="ml-auto flex items-center gap-2">
          <Select value={sortKey} onValueChange={(v) => update({ sort: v === "newest" ? null : v })}>
            <SelectTrigger className="w-44" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {Object.entries(SORTS).map(([key, s]) => (
                <SelectItem key={key} value={key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            variant="outline"
            value={view}
            onValueChange={(v) => v && set({ view: v === "grid" ? null : v })}
            aria-label="Layout"
          >
            <ToggleGroupItem value="grid" aria-label="Card grid">
              <LayoutGrid />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table">
              <List />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <EnumFilter label="Status" value={filters.status} options={PROJECT_STATUSES} onChange={(v) => update({ status: v })} />
        <EnumFilter label="Health" value={filters.health} options={PROJECT_HEALTHS} onChange={(v) => update({ health: v })} />
        <EnumFilter label="Priority" value={filters.priority} options={PRIORITIES} onChange={(v) => update({ priority: v })} />
        <ClientPicker
          value={filters.clientId ?? null}
          onChange={(id) => update({ client: id })}
          placeholder="Any client"
          className="w-full sm:w-44"
        />
        <UserPicker
          value={filters.ownerId ?? null}
          onChange={(id) => update({ owner: id })}
          placeholder="Any owner"
          status={null}
          clearable
          className="col-span-2 w-full sm:w-44"
        />
        {active && (
          <Button
            variant="ghost"
            className="col-span-2 text-muted-foreground sm:col-span-1"
            onClick={() => {
              setSearch("");
              set({ q: null, status: null, health: null, priority: null, client: null, owner: null, mine: null, page: null });
            }}
          >
            <X /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
