"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { projectQuery } from "@/lib/api/projects";
import { ProjectProvider } from "./project-context";
import { ProjectHeader } from "./project-header";
import { ProjectTabNav } from "./project-tab-nav";

/** Header + tab bar shared by every `/projects/[projectId]/(tabs)/*` page. */
export function ProjectLayout({ projectId, children }: { projectId: string; children: ReactNode }) {
  const { data: project, error, isPending } = useQuery(projectQuery(projectId));

  if (error) {
    return (
      <PageContainer>
        <ErrorState error={error} />
      </PageContainer>
    );
  }
  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="mb-3 h-4 w-20" />
        <Skeleton className="mb-3 h-9 w-72" />
        <Skeleton className="mb-6 h-14 w-full" />
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ProjectHeader project={project} />
      <ProjectTabNav project={project} />
      <ProjectProvider project={project}>{children}</ProjectProvider>
    </PageContainer>
  );
}
