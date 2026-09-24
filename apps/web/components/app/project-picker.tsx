"use client";

import type { Paginated, ProjectStatus, ProjectSummary } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api/client";
import { EntityCombobox } from "./entity-combobox";

/** The subset of a project a picker needs; `Allocation.project` and `ProjectSummary` both fit. */
export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  color: string;
}

export function ProjectLabel({ project }: { project: ProjectOption }) {
  return (
    <>
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
      <span className="truncate">{project.name}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{project.code}</span>
    </>
  );
}

export interface ProjectPickerProps {
  id?: string;
  value: string | null;
  onChange: (projectId: string | null, project: ProjectOption | null) => void;
  /** Label source for a preselected value that may not be in the first page of results. */
  selected?: ProjectOption | null;
  /** Only offer projects in these statuses (defaults to all readable projects). */
  statuses?: readonly ProjectStatus[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  "aria-invalid"?: boolean;
}

export function ProjectPicker({
  value,
  onChange,
  selected,
  statuses,
  placeholder = "Select a project",
  ...props
}: ProjectPickerProps) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<ProjectOption | null>(null);
  const term = useDebouncedValue(search.trim());
  const { data, isPending } = useQuery({
    // Under the `projects` root so project mutations refresh open pickers.
    queryKey: ["projects", "picker", term],
    queryFn: ({ signal }) =>
      api.get<Paginated<ProjectSummary>>("projects", { search: term || undefined, pageSize: 20 }, signal),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
  const items = statuses ? data?.items.filter((p) => statuses.includes(p.status)) : data?.items;
  const current =
    [picked, selected, ...(data?.items ?? [])].find((p): p is ProjectOption => !!p && p.id === value) ?? null;

  return (
    <EntityCombobox
      {...props}
      value={value}
      selectedLabel={current ? <ProjectLabel project={current} /> : null}
      items={items}
      getId={(p) => p.id}
      renderItem={(p) => <ProjectLabel project={p} />}
      onSelect={(p) => {
        setPicked(p);
        onChange(p?.id ?? null, p);
      }}
      search={search}
      onSearchChange={setSearch}
      isLoading={isPending}
      placeholder={placeholder}
      searchPlaceholder="Search projects…"
      emptyText="No projects found."
    />
  );
}
