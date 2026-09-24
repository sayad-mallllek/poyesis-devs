"use client";

import type { Risk } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/app/states";
import { RISK_STATUS_TONE, ToneBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "@/lib/api/client";
import { risksQuery, useRiskMutations } from "@/lib/api/projects";
import { humanize } from "@/lib/format";
import { RiskScore } from "../components/risk-score";
import { useProject } from "../detail/project-context";
import { RiskDialog } from "./risk-dialog";

type SortKey = "score" | "title" | "status" | "owner";
const STATUS_ORDER = { OPEN: 0, MITIGATING: 1, CLOSED: 2 } as const;

const compare: Record<SortKey, (a: Risk, b: Risk) => number> = {
  score: (a, b) => a.score - b.score,
  title: (a, b) => a.title.localeCompare(b.title),
  status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  owner: (a, b) => (a.owner ? fullName(a.owner) : "~").localeCompare(b.owner ? fullName(b.owner) : "~"),
};

function SortHeader({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <Icon className={active ? "size-3.5" : "size-3.5 opacity-40"} aria-hidden />
      </button>
    </TableHead>
  );
}

export function RisksView() {
  const project = useProject();
  const can = useCan();
  const resource = { projectId: project.id };
  const { data, error, isPending, refetch } = useQuery(risksQuery(project.id));
  const { remove } = useRiskMutations(project.id);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "score", dir: -1 });
  const [showClosed, setShowClosed] = useState(false);
  const canCreate = can("create", "Risk", resource);
  const canEdit = can("update", "Risk", resource);
  const canDelete = can("delete", "Risk", resource);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "score" ? -1 : 1 }));
  const closedCount = data?.filter((r) => r.status === "CLOSED").length ?? 0;
  const risks = (data ?? [])
    .filter((r) => showClosed || r.status !== "CLOSED")
    .sort((a, b) => compare[sort.key](a, b) * sort.dir || b.score - a.score);

  const addButton = canCreate && (
    <RiskDialog
      projectId={project.id}
      trigger={
        <Button>
          <Plus /> Log risk
        </Button>
      }
    />
  );

  return (
    <section className="space-y-4" aria-labelledby="risks-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="risks-title" className="text-lg font-semibold">
            Risks
          </h2>
          <p className="text-sm text-muted-foreground">Scored probability × impact, highest first.</p>
        </div>
        <div className="flex items-center gap-4">
          {closedCount > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={showClosed} onCheckedChange={setShowClosed} /> Show closed ({closedCount})
            </label>
          )}
          {addButton}
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : risks.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert />}
          title={data.length ? "No open risks" : "No risks logged"}
          description="Log what could derail the project, and how you'll handle it."
          action={addButton || undefined}
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Score" column="score" sort={sort} onSort={onSort} className="w-20 pl-4" />
                <SortHeader label="Risk" column="title" sort={sort} onSort={onSort} />
                <TableHead className="hidden w-20 text-center sm:table-cell">P × I</TableHead>
                <SortHeader label="Status" column="status" sort={sort} onSort={onSort} className="hidden sm:table-cell" />
                <SortHeader label="Owner" column="owner" sort={sort} onSort={onSort} className="hidden md:table-cell" />
                <TableHead className="hidden lg:table-cell">Mitigation</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-20 pr-4"><span className="sr-only">Actions</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id} className={risk.status === "CLOSED" ? "opacity-60" : undefined}>
                  <TableCell className="pl-4 align-top">
                    <RiskScore score={risk.score} />
                  </TableCell>
                  <TableCell className="max-w-72 align-top whitespace-normal">
                    <div className="font-medium">{risk.title}</div>
                    {risk.description && <div className="line-clamp-2 text-xs text-muted-foreground">{risk.description}</div>}
                    <div className="mt-1 sm:hidden">
                      <ToneBadge tone={RISK_STATUS_TONE[risk.status]}>{humanize(risk.status)}</ToneBadge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-center align-top text-xs tabular-nums text-muted-foreground sm:table-cell">
                    {risk.probability} × {risk.impact}
                  </TableCell>
                  <TableCell className="hidden align-top sm:table-cell">
                    <ToneBadge tone={RISK_STATUS_TONE[risk.status]}>{humanize(risk.status)}</ToneBadge>
                  </TableCell>
                  <TableCell className="hidden align-top md:table-cell">
                    {risk.owner ? (
                      <span className="flex items-center gap-2 text-sm">
                        <UserAvatar user={risk.owner} className="size-6" />
                        <span className="truncate">{fullName(risk.owner)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-80 align-top text-sm whitespace-normal text-muted-foreground lg:table-cell">
                    {risk.mitigation ?? <span className="italic">No mitigation yet</span>}
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="pr-4 align-top">
                      <div className="flex justify-end">
                        {canEdit && (
                          <RiskDialog
                            projectId={project.id}
                            risk={risk}
                            trigger={
                              <Button variant="ghost" size="icon-sm">
                                <Pencil />
                                <span className="sr-only">Edit {risk.title}</span>
                              </Button>
                            }
                          />
                        )}
                        {canDelete && (
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                                <Trash2 />
                                <span className="sr-only">Delete {risk.title}</span>
                              </Button>
                            }
                            title={`Delete “${risk.title}”?`}
                            description="Closing a risk keeps its history; deleting removes it entirely."
                            confirmLabel="Delete"
                            destructive
                            onConfirm={() =>
                              remove.mutate(risk.id, {
                                onSuccess: () => toast.success("Risk deleted"),
                                onError: (e) => toast.error(errorMessage(e)),
                              })
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
