"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleX, FolderGit2, GitPullRequest, Rocket } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/features/projects/detail/project-context";
import {
  deploymentsQuery,
  githubOverviewQuery,
  pullRequestsQuery,
  releasesQuery,
  repositoriesQuery,
  workflowRunsQuery,
  type GithubListParams,
} from "@/lib/api/integrations";
import { ActivityPanel } from "../activity-panel";
import { isNotConfigured, NotConfigured } from "../not-configured";
import { DeploymentList, PullRequestList, ReleaseList, WorkflowRunList } from "./activity-lists";
import { LinkRepositoryDialog } from "./link-repository-dialog";
import { RepositoryStrip } from "./repository-strip";

const ALL = "all";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex-row items-center gap-3 p-4 [&_svg]:size-4">
      {icon}
      <div>
        <div className="text-xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

export function GithubView() {
  const project = useProject();
  const can = useCan();
  const canManage = can("create", "RepositoryLink", { projectId: project.id });
  const [repositoryId, setRepositoryId] = useState<string>(ALL);
  const [prState, setPrState] = useState<NonNullable<GithubListParams["state"]>>("open");

  const links = useQuery(repositoriesQuery(project.id));
  const hasLinks = (links.data?.length ?? 0) > 0;
  const overview = useQuery({ ...githubOverviewQuery(project.id), enabled: hasLinks });
  const params: GithubListParams = { repositoryId: repositoryId === ALL ? undefined : repositoryId, limit: 30 };
  const pulls = useQuery({ ...pullRequestsQuery(project.id, { ...params, state: prState }), enabled: hasLinks });
  const runs = useQuery({ ...workflowRunsQuery(project.id, params), enabled: hasLinks });
  const deployments = useQuery({ ...deploymentsQuery(project.id, params), enabled: hasLinks });
  const releases = useQuery({ ...releasesQuery(project.id, params), enabled: hasLinks });

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">GitHub</h2>
        <p className="text-sm text-muted-foreground">Pull requests, CI runs, deployments and releases of linked repositories.</p>
      </div>
      {canManage && <LinkRepositoryDialog projectId={project.id} />}
    </div>
  );

  if (links.error) return <ErrorState error={links.error} />;
  if (!links.data) return <Skeleton className="h-64" />;
  if (!hasLinks) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={<FolderGit2 />}
          title="No repositories linked"
          description={canManage ? "Link one or more repositories to follow delivery from here." : "A project lead can link repositories."}
        />
      </div>
    );
  }
  if (isNotConfigured(overview.error)) {
    return (
      <div className="space-y-4">
        {header}
        <NotConfigured provider="GitHub" />
      </div>
    );
  }

  const repos = links.data.map((link) => ({ ...link, ...overview.data?.repositories.find((r) => r.id === link.id) }));

  return (
    <div className="space-y-5">
      {header}
      <RepositoryStrip projectId={project.id} repositories={repos} canManage={canManage} />
      {overview.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={<GitPullRequest className="text-success" />} label="Open pull requests" value={overview.data.openPullRequests} />
          <Stat icon={<CheckCircle2 className="text-success" />} label="Successful runs · 7 days" value={overview.data.successfulRunsLast7Days} />
          <Stat icon={<CircleX className="text-destructive" />} label="Failed runs · 7 days" value={overview.data.failedRunsLast7Days} />
          <Stat icon={<Rocket className="text-muted-foreground" />} label="Deployments · 30 days" value={overview.data.deploymentsLast30Days} />
        </div>
      )}

      <Tabs defaultValue="pulls">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="pulls">Pull requests</TabsTrigger>
            <TabsTrigger value="runs">Actions</TabsTrigger>
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
          </TabsList>
          {links.data.length > 1 && (
            <Select value={repositoryId} onValueChange={setRepositoryId}>
              <SelectTrigger className="w-56" aria-label="Repository">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All repositories</SelectItem>
                {links.data.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <TabsContent value="pulls" className="space-y-3">
          <Select value={prState} onValueChange={(v) => setPrState(v as typeof prState)}>
            <SelectTrigger className="w-32" aria-label="Pull request state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <ActivityPanel query={pulls} empty="No pull requests">
            {(items) => <PullRequestList items={items} />}
          </ActivityPanel>
        </TabsContent>
        <TabsContent value="runs">
          <ActivityPanel query={runs} empty="No workflow runs">
            {(items) => <WorkflowRunList items={items} />}
          </ActivityPanel>
        </TabsContent>
        <TabsContent value="deployments">
          <ActivityPanel query={deployments} empty="No deployments">
            {(items) => <DeploymentList items={items} />}
          </ActivityPanel>
        </TabsContent>
        <TabsContent value="releases">
          <ActivityPanel query={releases} empty="No releases">
            {(items) => <ReleaseList items={items} />}
          </ActivityPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
