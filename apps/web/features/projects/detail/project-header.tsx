"use client";

import type { ProjectDetail } from "@repo/contracts";
import { Archive, ArrowLeft, Building2, CalendarDays, Megaphone, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { HealthBadge, PriorityBadge, ProjectStatusBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { useCan, useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { useArchiveProject } from "@/lib/api/projects";
import { formatDate } from "@/lib/format";
import { ConfidentialBadge, DeadlineBadge, ProjectCode, ProjectProgress } from "../components/project-meta";
import { StatusUpdateDialog } from "./status-update-dialog";

function Meta({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
      {icon}
      <span className="sr-only">{label}: </span>
      {children}
    </div>
  );
}

export function ProjectHeader({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const can = useCan();
  const { user } = useSession();
  const archive = useArchiveProject();
  const canEdit = can("update", "Project", { id: project.id });
  const canArchive = can("delete", "Project", { id: project.id });
  const canReport = can("create", "StatusUpdate", { projectId: project.id, authorId: user.id });

  return (
    <header className="space-y-4 pb-4">
      <Link
        href="/projects"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Projects
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden
            className="mt-1 w-1.5 shrink-0 self-stretch rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0 space-y-2">
            <div className="space-y-0.5">
              <ProjectCode code={project.code} />
              <h1 className="text-2xl font-semibold tracking-tight text-balance">{project.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ProjectStatusBadge status={project.status} />
              <HealthBadge health={project.health} />
              <PriorityBadge priority={project.priority} />
              {project.isConfidential && <ConfidentialBadge />}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canReport && (
            <StatusUpdateDialog
              project={project}
              trigger={
                <Button>
                  <Megaphone /> Post update
                </Button>
              }
            />
          )}
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/settings`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )}
          {canArchive && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-muted-foreground">
                  <Archive /> Archive
                </Button>
              }
              title={`Archive ${project.name}?`}
              description="It disappears from lists and the schedule. Bookings, files and history are kept."
              confirmLabel="Archive project"
              destructive
              onConfirm={() =>
                archive.mutate(project.id, {
                  onSuccess: () => {
                    toast.success(`${project.name} archived`);
                    router.push("/projects");
                  },
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-3">
        <Meta icon={<Building2 />} label="Client">
          {project.client ? (
            <Link href={`/clients/${project.client.id}`} className="truncate font-medium hover:text-primary">
              {project.client.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">Internal</span>
          )}
        </Meta>
        <Meta icon={<UserAvatar user={project.owner} className="size-5" />} label="Owner">
          <span className="truncate">{fullName(project.owner)}</span>
        </Meta>
        <Meta icon={<CalendarDays />} label="Schedule">
          <span className="text-muted-foreground">
            {project.startDate || project.targetEndDate
              ? `${project.startDate ? formatDate(project.startDate, "d MMM") : "No start"} → ${project.targetEndDate ? formatDate(project.targetEndDate) : "no deadline"}`
              : "No dates set"}
          </span>
          <DeadlineBadge targetEndDate={project.targetEndDate} status={project.status} />
        </Meta>
        <div className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-64 lg:ml-auto">
          <span className="text-sm text-muted-foreground">Progress</span>
          <ProjectProgress value={project.progress} className="flex-1" />
        </div>
      </div>
    </header>
  );
}
