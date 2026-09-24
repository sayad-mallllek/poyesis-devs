"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { projectAnalyticsQuery } from "@/lib/api/projects";
import { useProject } from "../detail/project-context";
import { BurnupChart } from "./burnup-chart";
import { EffortByMemberChart } from "./effort-by-member-chart";
import { HealthHistory } from "./health-history";
import { KeyFacts } from "./key-facts";
import { MilestoneTimeline } from "./milestone-timeline";
import { ProjectAbout } from "./project-about";
import { RiskMatrix } from "./risk-matrix";
import { BudgetCard, EffortCard, ScheduleCard } from "./stat-cards";

export function ProjectOverview() {
  const project = useProject();
  const can = useCan();
  const { data: analytics, error, refetch } = useQuery(projectAnalyticsQuery(project.id));

  return (
    <div className="space-y-6">
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !analytics ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
          <Skeleton className="h-80 rounded-xl md:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ScheduleCard schedule={analytics.schedule} />
            <EffortCard effort={analytics.effort} />
            <BudgetCard budget={analytics.budget} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <BurnupChart analytics={analytics} />
            </div>
            <EffortByMemberChart effort={analytics.effort} />
          </div>
          <MilestoneTimeline project={project} />
          <div className="grid gap-4 lg:grid-cols-3">
            <RiskMatrix matrix={analytics.risks.matrix} open={analytics.risks.open} projectId={project.id} />
            <div className="min-w-0 lg:col-span-2">
              <HealthHistory history={analytics.healthHistory} projectId={project.id} />
            </div>
          </div>
        </>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ProjectAbout project={project} canEdit={can("update", "Project", { id: project.id })} />
        </div>
        <KeyFacts project={project} />
      </div>
    </div>
  );
}
