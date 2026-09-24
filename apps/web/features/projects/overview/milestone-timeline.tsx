"use client";

import type { Milestone, ProjectDetail } from "@repo/contracts";
import { addMonths, differenceInCalendarDays, format, startOfMonth } from "date-fns";
import { Diamond } from "lucide-react";
import Link from "next/link";
import { MILESTONE_TONE, TONE_DOT, type Tone } from "@/components/app/status-badges";
import { EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, humanize, parseDate, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BAR: Record<Tone, string> = {
  neutral: "bg-muted-foreground/20",
  info: "bg-info/25",
  success: "bg-success/25",
  warning: "bg-warning/30",
  danger: "bg-destructive/25",
  primary: "bg-primary/25",
};

export const isOverdue = (m: Milestone, today = toIsoDate(new Date())) => m.status !== "DONE" && m.dueDate < today;

/** A milestone's tone, escalated to danger once it is overdue. */
export const milestoneTone = (m: Milestone): Tone => (isOverdue(m) ? "danger" : MILESTONE_TONE[m.status]);

function monthTicks(from: Date, to: Date) {
  const ticks: Date[] = [];
  for (let m = startOfMonth(addMonths(from, 1)); m <= to; m = addMonths(m, 1)) ticks.push(m);
  return ticks;
}

/**
 * Mini-Gantt: each milestone spans from the previous one's due date (or the project start)
 * to its own, across the project window, with a marker for today.
 */
export function MilestoneTimeline({ project }: { project: ProjectDetail }) {
  const milestones = [...project.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const todayIso = toIsoDate(new Date());

  const header = (
    <CardHeader>
      <CardTitle>Milestones</CardTitle>
      <CardDescription>
        {milestones.filter((m) => m.status === "DONE").length} of {milestones.length} done
        {milestones.some((m) => isOverdue(m)) && (
          <span className="font-medium text-destructive"> · {milestones.filter((m) => isOverdue(m)).length} overdue</span>
        )}
      </CardDescription>
      <CardAction>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${project.id}/milestones`}>View all</Link>
        </Button>
      </CardAction>
    </CardHeader>
  );

  if (milestones.length === 0) {
    return (
      <Card>
        {header}
        <CardContent>
          <EmptyState icon={<Diamond />} title="No milestones yet" description="Milestones mark the key deliveries on the way to the target date." />
        </CardContent>
      </Card>
    );
  }

  const dates = [project.startDate, project.targetEndDate, ...milestones.map((m) => m.dueDate)].filter((d): d is string => !!d).sort();
  const from = parseDate(dates[0]!);
  const to = parseDate(dates.at(-1)!);
  const span = Math.max(differenceInCalendarDays(to, from), 1);
  const at = (iso: string) => (differenceInCalendarDays(parseDate(iso), from) / span) * 100;
  const todayPct = at(todayIso);
  const ticks = monthTicks(from, to);

  return (
    <Card>
      {header}
      <CardContent>
        <div className="grid grid-cols-[7rem_1fr] gap-x-3 sm:grid-cols-[12rem_1fr]">
          <div aria-hidden className="h-6" />
          <div aria-hidden className="relative h-6 text-[11px] text-muted-foreground">
            {ticks.map((t) => (
              <span key={t.toISOString()} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${at(toIsoDate(t))}%` }}>
                {format(t, ticks.length > 8 ? "MMM" : "MMM yyyy")}
              </span>
            ))}
          </div>

          <ol className="contents">
            {milestones.map((m, i) => {
              const start = i === 0 ? (project.startDate && project.startDate < m.dueDate ? project.startDate : m.dueDate) : milestones[i - 1]!.dueDate;
              const left = at(start);
              const right = at(m.dueDate);
              const tone = milestoneTone(m);
              const overdue = isOverdue(m, todayIso);
              return (
                <li key={m.id} className="contents">
                  <div className="flex h-9 min-w-0 items-center gap-2 text-sm">
                    <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[tone])} aria-hidden />
                    <span className={cn("truncate", m.status === "DONE" && "text-muted-foreground")}>{m.name}</span>
                  </div>
                  <div className="relative h-9">
                    {/* Gridlines per month and the today marker are drawn per row so they span the full height. */}
                    {ticks.map((t) => (
                      <span key={t.toISOString()} aria-hidden className="absolute inset-y-0 w-px bg-border/70" style={{ left: `${at(toIsoDate(t))}%` }} />
                    ))}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <span aria-hidden className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-foreground/40" style={{ left: `${todayPct}%` }} />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="absolute top-1/2 flex h-4 -translate-y-1/2 items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          style={{ left: `${left}%`, width: `max(${right - left}%, 0.75rem)` }}
                          aria-label={`${m.name}: ${humanize(m.status)}${overdue ? ", overdue" : ""}, due ${formatDate(m.dueDate)}`}
                        >
                          <span className={cn("h-2 w-full rounded-full", BAR[tone])} />
                          <span
                            className={cn("absolute right-0 size-3 translate-x-1/2 rotate-45 rounded-[2px] ring-2 ring-card", TONE_DOT[tone])}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="font-medium">{m.name}</div>
                        <div>
                          Due {formatDate(m.dueDate)} · {overdue ? "Overdue" : humanize(m.status)}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ol>

          <div aria-hidden />
          <div className="relative mt-1 h-5 text-[11px] text-muted-foreground">
            {todayPct >= 0 && todayPct <= 100 && (
              <span className="absolute -translate-x-1/2 font-medium text-foreground" style={{ left: `${todayPct}%` }}>
                Today
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
