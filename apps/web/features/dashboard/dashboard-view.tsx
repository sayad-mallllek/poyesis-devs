"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, FolderKanban, Gauge, Sparkles, Users } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardQuery } from "@/lib/api/dashboard";
import { plural } from "@/lib/format";
import { useAssistantStore } from "@/lib/stores/assistant-store";
import { DeadlinesCard } from "./deadlines-card";
import { PortfolioCard } from "./portfolio-card";
import { StatTile } from "./stat-tile";
import { UtilizationCard } from "./utilization-card";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

export function DashboardView() {
  const { user } = useSession();
  const { data, error, refetch } = useQuery(dashboardQuery);
  const openAssistant = useAssistantStore((s) => s.setOpen);

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting()}, ${user.firstName}`}
        description="Here is how delivery looks today."
        actions={
          <Button variant="outline" onClick={() => openAssistant(true)}>
            <Sparkles className="text-primary" /> Ask for a briefing
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
          <Skeleton className="h-80 sm:col-span-2" />
          <Skeleton className="h-80 sm:col-span-2" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={FolderKanban}
              label="Active projects"
              value={data.projects.byStatus.ACTIVE}
              hint={`${data.projects.byStatus.PLANNING} in planning`}
            />
            <StatTile
              icon={Activity}
              label="Need attention"
              value={data.projects.byHealth.AT_RISK + data.projects.byHealth.OFF_TRACK}
              hint={`${data.projects.byHealth.OFF_TRACK} off track`}
            />
            <StatTile
              icon={Gauge}
              label="Utilization"
              value={`${Math.round(data.utilization.percent)}%`}
              hint={`${data.utilization.overbooked.length} over-booked this week`}
            />
            <StatTile
              icon={Users}
              label="People"
              value={data.headcount}
              hint={
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3" /> {plural(data.clients, "client")}
                </span>
              }
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <DeadlinesCard deadlines={data.upcomingDeadlines} overdueMilestones={data.overdueMilestones} />
            <div className="space-y-6">
              <PortfolioCard projects={data.projects} />
              <UtilizationCard utilization={data.utilization} />
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
