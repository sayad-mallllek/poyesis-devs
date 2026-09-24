import type { ProjectSummary } from "@repo/contracts";
import { Lock } from "lucide-react";
import Link from "next/link";
import { HealthBadge, PriorityBadge, ProjectStatusBadge } from "@/components/app/status-badges";
import { Card } from "@/components/ui/card";
import { MemberStack } from "../components/member-stack";
import { DeadlineText, ProjectCode, ProjectProgress } from "../components/project-meta";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const urgent = project.priority === "HIGH" || project.priority === "CRITICAL";
  return (
    <Card className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50">
      <div aria-hidden className="h-1" style={{ backgroundColor: project.color }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <ProjectCode code={project.code} />
              {project.isConfidential && <Lock className="size-3 text-muted-foreground" aria-label="Confidential" />}
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="line-clamp-1 font-semibold outline-none after:absolute after:inset-0 group-hover:text-primary"
            >
              {project.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{project.client?.name ?? "Internal"}</p>
          </div>
          {urgent && <PriorityBadge priority={project.priority} />}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <ProjectStatusBadge status={project.status} />
          <HealthBadge health={project.health} />
        </div>

        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.summary ?? "No summary yet."}</p>

        <ProjectProgress value={project.progress} />

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs">
          <DeadlineText targetEndDate={project.targetEndDate} status={project.status} />
          <MemberStack users={[project.owner]} total={project.memberCount} />
        </div>
      </div>
    </Card>
  );
}
