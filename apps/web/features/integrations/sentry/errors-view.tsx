"use client";

import { useQuery } from "@tanstack/react-query";
import { Bug, Search, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProject } from "@/features/projects/detail/project-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sentryIssuesQuery, sentryLinksQuery, useUnlinkSentryProject, type SentryIssueParams } from "@/lib/api/integrations";
import { ActivityPanel } from "../activity-panel";
import { isNotConfigured, NotConfigured } from "../not-configured";
import { IssueList } from "./issue-list";
import { LinkSentryDialog } from "./link-sentry-dialog";

const ALL = "all";

export function ErrorsView() {
  const project = useProject();
  const can = useCan();
  const canManage = can("create", "SentryLink", { projectId: project.id });
  const [linkId, setLinkId] = useState(ALL);
  const [statsPeriod, setStatsPeriod] = useState<NonNullable<SentryIssueParams["statsPeriod"]>>("14d");
  const [sort, setSort] = useState<NonNullable<SentryIssueParams["sort"]>>("date");
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), 400);

  const links = useQuery(sentryLinksQuery(project.id));
  const unlink = useUnlinkSentryProject(project.id);
  const hasLinks = (links.data?.length ?? 0) > 0;
  const issues = useQuery({
    ...sentryIssuesQuery(project.id, {
      sentryLinkId: linkId === ALL ? undefined : linkId,
      statsPeriod,
      sort,
      query: query ? `is:unresolved ${query}` : undefined,
    }),
    enabled: hasLinks,
  });

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Errors</h2>
        <p className="text-sm text-muted-foreground">Unresolved Sentry issues across the linked Sentry projects.</p>
      </div>
      {canManage && <LinkSentryDialog projectId={project.id} linkedSlugs={links.data?.map((l) => l.projectSlug) ?? []} />}
    </div>
  );

  if (links.error) return <ErrorState error={links.error} />;
  if (!links.data) return <Skeleton className="h-64" />;
  if (!hasLinks) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={<Bug />}
          title="No Sentry projects linked"
          description={canManage ? "Link the Sentry projects of this product's apps and services." : "A project lead can link Sentry projects."}
        />
      </div>
    );
  }

  const totals = issues.data?.reduce((acc, i) => ({ events: acc.events + i.count, users: acc.users + i.userCount }), { events: 0, users: 0 });

  return (
    <div className="space-y-5">
      {header}
      <ul className="flex flex-wrap gap-2">
        {links.data.map((link) => (
          <li key={link.id}>
            <Badge variant="outline" className="h-7 gap-1.5 pr-1 text-sm font-normal">
              <Bug className="size-3.5 text-muted-foreground" />
              {link.name ?? link.projectSlug}
              {link.environment && <span className="text-muted-foreground">· {link.environment}</span>}
              {canManage && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" className="size-5">
                      <X className="size-3" />
                      <span className="sr-only">Unlink {link.projectSlug}</span>
                    </Button>
                  }
                  title={`Unlink ${link.name ?? link.projectSlug}?`}
                  description="Its issues will no longer show on this project."
                  confirmLabel="Unlink"
                  destructive
                  onConfirm={() => unlink.mutate(link.id)}
                />
              )}
            </Badge>
          </li>
        ))}
      </ul>

      {isNotConfigured(issues.error) ? (
        <NotConfigured provider="Sentry" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="max-w-xs">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
            {links.data.length > 1 && (
              <Select value={linkId} onValueChange={setLinkId}>
                <SelectTrigger className="w-48" aria-label="Sentry project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Sentry projects</SelectItem>
                  {links.data.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name ?? l.projectSlug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="w-40" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Last seen</SelectItem>
                <SelectItem value="new">First seen</SelectItem>
                <SelectItem value="freq">Most events</SelectItem>
                <SelectItem value="user">Most users</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup type="single" variant="outline" value={statsPeriod} onValueChange={(v) => v && setStatsPeriod(v as typeof statsPeriod)}>
              <ToggleGroupItem value="24h">24h</ToggleGroupItem>
              <ToggleGroupItem value="14d">14 days</ToggleGroupItem>
            </ToggleGroup>
            {totals && (
              <p className="ml-auto text-sm text-muted-foreground tabular-nums">
                {issues.data?.length} issues · {totals.events.toLocaleString()} events · {totals.users.toLocaleString()} users
              </p>
            )}
          </div>
          <ActivityPanel query={issues} empty="No unresolved issues — nice.">
            {(items) => <IssueList items={items} showProject={links.data.length > 1} />}
          </ActivityPanel>
        </>
      )}
    </div>
  );
}
