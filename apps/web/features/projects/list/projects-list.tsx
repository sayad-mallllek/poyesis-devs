"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { PaginationBar } from "@/components/app/pagination-bar";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Can, useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { projectsQuery } from "@/lib/api/projects";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";
import { ProjectFilters, SORTS, useProjectFilters } from "./project-filters";
import { ProjectsTable } from "./projects-table";

const PAGE_SIZE = 24;

export function ProjectsList() {
  const { user } = useSession();
  const state = useProjectFilters();
  const { filters, sortKey, view, page, active, set } = state;
  const { sort, order } = SORTS[sortKey];

  const { data, isPending, isPlaceholderData, error, refetch } = useQuery(
    projectsQuery({
      page,
      pageSize: PAGE_SIZE,
      search: filters.q || undefined,
      status: filters.status,
      health: filters.health,
      priority: filters.priority,
      clientId: filters.clientId,
      ownerId: filters.ownerId,
      memberId: filters.mine ? user.id : undefined,
      sort,
      order,
    }),
  );

  const newProject = (
    <Can action="create" subject="Project">
      <Button asChild>
        <Link href="/projects/new">
          <Plus /> New project
        </Link>
      </Button>
    </Can>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description={data ? `${data.total} project${data.total === 1 ? "" : "s"}` : "Everything the team is delivering."}
        actions={newProject}
      />
      <ProjectFilters state={state} />

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={active ? "No matching projects" : "No projects yet"}
          description={active ? "Try removing a filter." : "Projects hold milestones, risks, files and the team's bookings."}
          action={active ? undefined : newProject}
        />
      ) : view === "table" ? (
        <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
          <ProjectsTable projects={isPending ? undefined : data?.items} />
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
            isPlaceholderData && "opacity-60",
          )}
        >
          {isPending
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-60 rounded-xl" />)
            : data?.items.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}
      {data && <PaginationBar page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(p) => set({ page: p })} />}
    </PageContainer>
  );
}
