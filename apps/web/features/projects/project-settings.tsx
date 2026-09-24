"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { projectQuery, useUpdateProject } from "@/lib/api/projects";
import { ProjectForm } from "./form/project-form";
import { normalizeUpdate } from "./form/values";

export function ProjectSettings({ projectId }: { projectId: string }) {
  const router = useRouter();
  const can = useCan();
  const { data: project, error } = useQuery(projectQuery(projectId));
  const update = useUpdateProject(projectId);

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={project ? `Edit ${project.name}` : "Edit project"}
        back={{ href: `/projects/${projectId}`, label: "Back to project" }}
      />
      {error ? (
        <ErrorState error={error} />
      ) : !project ? (
        <Skeleton className="h-96 w-full" />
      ) : !can("update", "Project", { id: projectId }) ? (
        <EmptyState title="You can't edit this project" description="Only the project owner, leads and administrators can." />
      ) : (
        <ProjectForm
          project={project}
          owner={project.owner}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            const input = normalizeUpdate(values);
            await update.mutateAsync(input.ownerId === project.owner.id ? { ...input, ownerId: undefined } : input);
            toast.success("Project updated");
            router.push(`/projects/${projectId}`);
          }}
        />
      )}
    </PageContainer>
  );
}
