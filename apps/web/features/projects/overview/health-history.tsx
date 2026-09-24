"use client";

import { PROJECT_HEALTHS, type ProjectAnalytics } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { HEALTH_TONE, TONE_DOT } from "@/components/app/status-badges";
import { EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { statusUpdatesQuery } from "@/lib/api/projects";
import { formatDateTime, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusUpdateItem } from "../updates/status-update-item";

const RECENT = 3;

/** Health over time as a strip of reported states (oldest → newest), then the latest updates. */
export function HealthHistory({ history, projectId }: { history: ProjectAnalytics["healthHistory"]; projectId: string }) {
  const { data: updates, isPending } = useQuery(statusUpdatesQuery(projectId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health history</CardTitle>
        <CardDescription>
          {history.length} status update{history.length === 1 ? "" : "s"}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${projectId}/updates`}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        {history.length === 0 ? (
          <EmptyState icon={<Megaphone />} title="No status updates yet" description="Post an update to record health and progress over time." />
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex h-3 gap-0.5" role="list" aria-label="Health over time, oldest first">
                {history.map((entry, i) => (
                  <Tooltip key={`${entry.date}-${i}`}>
                    <TooltipTrigger asChild>
                      <span
                        role="listitem"
                        tabIndex={0}
                        aria-label={`${formatDateTime(entry.date)}: ${humanize(entry.health)}${entry.progress !== null ? `, ${entry.progress}%` : ""}`}
                        className={cn(
                          "min-w-1.5 flex-1 rounded-[3px] outline-none first:rounded-l-full last:rounded-r-full hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          TONE_DOT[HEALTH_TONE[entry.health]],
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="font-medium">{humanize(entry.health)}</div>
                      <div>
                        {formatDateTime(entry.date)}
                        {entry.progress !== null && ` · ${entry.progress}%`}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
                {PROJECT_HEALTHS.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", TONE_DOT[HEALTH_TONE[h]])} aria-hidden /> {humanize(h)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {isPending
                ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)
                : updates?.slice(0, RECENT).map((u) => <StatusUpdateItem key={u.id} update={u} compact />)}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
