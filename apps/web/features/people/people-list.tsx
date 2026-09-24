"use client";

import { ROLE_DESCRIPTIONS, ROLES, USER_STATUSES, type Role, type UserStatus } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { PaginationBar } from "@/components/app/pagination-bar";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Can } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchParamsState } from "@/hooks/use-search-param";
import { skillsQuery } from "@/lib/api/skills";
import { usersQuery } from "@/lib/api/users";
import { humanize } from "@/lib/format";
import { PeopleTable } from "./people-table";
import { PersonCard } from "./person-card";

const ALL = "all";
const PAGE_SIZE = 24;

export function PeopleList() {
  const { get, set } = useSearchParamsState();
  const page = Number(get("page") ?? 1);
  const role = get("role") as Role | undefined;
  const status = get("status") as UserStatus | undefined;
  const skillId = get("skill");
  const view = get("view") === "table" ? "table" : "grid";
  const [search, setSearch] = useState(get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim());

  useEffect(() => {
    if (debouncedSearch !== (get("q") ?? "")) set({ q: debouncedSearch, page: null });
  }, [debouncedSearch, get, set]);

  const skills = useQuery(skillsQuery());
  const { data, isPending, error, refetch } = useQuery(
    usersQuery({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, role, status, skillId }),
  );
  const filtered = !!(debouncedSearch || role || status || skillId);

  return (
    <PageContainer>
      <PageHeader
        title="People"
        description="Everyone in the workspace, their roles, skills and availability."
        actions={
          <Can action="create" subject="User">
            <Button asChild>
              <Link href="/people/new">
                <Plus /> Add person
              </Link>
            </Button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search name, email, title…"
            aria-label="Search people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Select value={role ?? ALL} onValueChange={(v) => set({ role: v === ALL ? null : v, page: null })}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_DESCRIPTIONS[r].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? null : v, page: null })}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {USER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={skillId ?? ALL} onValueChange={(v) => set({ skill: v === ALL ? null : v, page: null })}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by skill">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any skill</SelectItem>
            {skills.data?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="ml-auto hidden sm:flex"
          value={view}
          onValueChange={(v) => v && set({ view: v === "grid" ? null : v })}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={filtered ? "No matching people" : "No people yet"}
          description={filtered ? "Try a different search or clear the filters." : "Invite your team to start planning."}
          action={
            filtered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  set({ q: null, role: null, status: null, skill: null, page: null });
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : view === "table" ? (
        <PeopleTable people={data.items} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
      {data && (
        <PaginationBar page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(p) => set({ page: p })} />
      )}
    </PageContainer>
  );
}
