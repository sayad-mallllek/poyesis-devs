"use client";

import type { ProjectSummary } from "@repo/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HealthBadge, PriorityBadge, ProjectStatusBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColorDot, DeadlineText, ProjectCode, ProjectProgress } from "../components/project-meta";

const COLUMNS = 8;

export function ProjectsTable({ projects }: { projects: ProjectSummary[] | undefined }) {
  const router = useRouter();
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Project</TableHead>
            <TableHead className="hidden md:table-cell">Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Health</TableHead>
            <TableHead className="hidden xl:table-cell">Priority</TableHead>
            <TableHead className="hidden w-36 lg:table-cell">Progress</TableHead>
            <TableHead className="hidden md:table-cell">Deadline</TableHead>
            <TableHead className="hidden pr-4 lg:table-cell">Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!projects
            ? Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLUMNS} className="px-4">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : projects.map((project) => (
                <TableRow key={project.id} className="cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                  <TableCell className="max-w-64 pl-4">
                    <div className="flex items-center gap-2.5">
                      <ColorDot color={project.color} />
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate font-medium hover:text-primary"
                        >
                          {project.name}
                        </Link>
                        <ProjectCode code={project.code} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{project.client?.name ?? "Internal"}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <HealthBadge health={project.health} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <PriorityBadge priority={project.priority} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <ProjectProgress value={project.progress} />
                  </TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    <DeadlineText targetEndDate={project.targetEndDate} status={project.status} />
                  </TableCell>
                  <TableCell className="hidden pr-4 lg:table-cell">
                    <span className="flex items-center gap-2 text-sm">
                      <UserAvatar user={project.owner} className="size-6 text-[10px]" />
                      <span className="truncate">{fullName(project.owner)}</span>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </Card>
  );
}
