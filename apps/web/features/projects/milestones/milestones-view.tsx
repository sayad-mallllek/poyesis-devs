"use client";

import { MILESTONE_STATUSES, type Milestone, type MilestoneStatus } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Diamond, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/app/states";
import { MILESTONE_TONE, ToneBadge } from "@/components/app/status-badges";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { milestonesQuery, useMilestoneMutations } from "@/lib/api/projects";
import { daysUntil, formatDate, formatRelative, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EnumSelect } from "../components/enum-select";
import { useProject } from "../detail/project-context";
import { isOverdue, milestoneTone } from "../overview/milestone-timeline";
import { MilestoneDialog } from "./milestone-dialog";

function DueLabel({ milestone }: { milestone: Milestone }) {
  if (milestone.status === "DONE") {
    return (
      <span className="text-muted-foreground">
        Done {milestone.completedAt ? formatRelative(milestone.completedAt) : ""}
      </span>
    );
  }
  const days = daysUntil(milestone.dueDate);
  if (days < 0) return <span className="font-medium text-destructive">{-days} days overdue</span>;
  if (days === 0) return <span className="font-medium text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning">Due today</span>;
  return <span className="text-muted-foreground">in {days} days</span>;
}

function MilestoneRow({ milestone, canEdit, canDelete }: { milestone: Milestone; canEdit: boolean; canDelete: boolean }) {
  const { update, remove } = useMilestoneMutations(milestone.projectId);
  const overdue = isOverdue(milestone);
  const setStatus = (status: MilestoneStatus) =>
    update.mutate(
      { id: milestone.id, input: { status } },
      { onSuccess: () => toast.success(`Marked ${humanize(status).toLowerCase()}`), onError: (e) => toast.error(errorMessage(e)) },
    );

  return (
    <li className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", overdue && "bg-destructive/5")}>
      <div className="flex min-w-0 flex-1 gap-3">
        <Diamond
          className={cn(
            "mt-0.5 size-4 shrink-0",
            milestone.status === "DONE" ? "fill-success text-success" : overdue ? "text-destructive" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", milestone.status === "DONE" && "text-muted-foreground line-through decoration-muted-foreground/40")}>
              {milestone.name}
            </span>
            {overdue && <ToneBadge tone="danger">Overdue</ToneBadge>}
          </div>
          {milestone.description && <p className="text-sm text-muted-foreground">{milestone.description}</p>}
          <p className="text-xs">
            <span className="text-foreground">{formatDate(milestone.dueDate)}</span> · <DueLabel milestone={milestone} />
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 pl-7 sm:pl-0">
        {canEdit ? (
          <EnumSelect
            aria-label={`Status of ${milestone.name}`}
            size="sm"
            className="w-36"
            value={milestone.status}
            onChange={setStatus}
            options={MILESTONE_STATUSES}
            renderOption={(s) => (
              <ToneBadge tone={MILESTONE_TONE[s]} dot>
                {humanize(s)}
              </ToneBadge>
            )}
          />
        ) : (
          <ToneBadge tone={milestoneTone(milestone)} dot>
            {humanize(milestone.status)}
          </ToneBadge>
        )}
        {canEdit && milestone.status !== "DONE" && (
          <Button variant="ghost" size="icon-sm" onClick={() => setStatus("DONE")} title="Mark done">
            <CheckCircle2 />
            <span className="sr-only">Mark {milestone.name} done</span>
          </Button>
        )}
        {canEdit && (
          <MilestoneDialog
            projectId={milestone.projectId}
            milestone={milestone}
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Pencil />
                <span className="sr-only">Edit {milestone.name}</span>
              </Button>
            }
          />
        )}
        {canDelete && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                <Trash2 />
                <span className="sr-only">Delete {milestone.name}</span>
              </Button>
            }
            title={`Delete “${milestone.name}”?`}
            description="This removes the milestone from the plan and timeline."
            confirmLabel="Delete"
            destructive
            onConfirm={() =>
              remove.mutate(milestone.id, {
                onSuccess: () => toast.success("Milestone deleted"),
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          />
        )}
      </div>
    </li>
  );
}

export function MilestonesView() {
  const project = useProject();
  const can = useCan();
  const resource = { projectId: project.id };
  const { data, error, isPending, refetch } = useQuery(milestonesQuery(project.id));
  const canCreate = can("create", "Milestone", resource);
  const milestones = [...(data ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const addButton = canCreate && (
    <MilestoneDialog
      projectId={project.id}
      trigger={
        <Button>
          <Plus /> Add milestone
        </Button>
      }
    />
  );

  return (
    <section className="space-y-4" aria-labelledby="milestones-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="milestones-title" className="text-lg font-semibold">
            Milestones
          </h2>
          <p className="text-sm text-muted-foreground">Key deliveries on the way to {formatDate(project.targetEndDate)}.</p>
        </div>
        {addButton}
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : milestones.length === 0 ? (
        <EmptyState icon={<Diamond />} title="No milestones yet" description="Break the project into dated deliveries." action={addButton || undefined} />
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} canEdit={can("update", "Milestone", resource)} canDelete={can("delete", "Milestone", resource)} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
