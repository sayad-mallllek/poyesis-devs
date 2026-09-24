"use client";

import type { IntegrationProvider, IntegrationStatus } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Bug, FolderGit2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { integrationStatusesQuery } from "@/lib/api/integrations";
import { formatRelative } from "@/lib/format";
import { IntegrationCard } from "./integration-card";
import { GithubForm, SentryForm } from "./integration-forms";

const statusOf = (list: IntegrationStatus[], provider: IntegrationProvider): IntegrationStatus =>
  list.find((s) => s.provider === provider) ?? {
    provider,
    configured: false,
    config: {},
    tokenHint: null,
    lastVerifiedAt: null,
    lastError: null,
    updatedAt: null,
  };

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value || "—"}</dd>
    </div>
  );
}

export function IntegrationsSettings() {
  const { data, error } = useQuery(integrationStatusesQuery);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Integrations"
        description="Workspace credentials for GitHub and Sentry. Tokens are encrypted at rest and never sent back to the browser."
      />
      {error ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="space-y-6">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : (
        <div className="space-y-6">
          <IntegrationCard
            provider="GITHUB"
            title="GitHub"
            description="Show pull requests, Actions runs, deployments and releases on projects."
            icon={<FolderGit2 className="size-5" />}
            status={statusOf(data, "GITHUB")}
            details={
              <>
                <Detail label="API" value={statusOf(data, "GITHUB").config.apiBaseUrl ?? "https://api.github.com"} />
                <Detail label="Updated" value={formatRelative(statusOf(data, "GITHUB").updatedAt)} />
              </>
            }
            form={(close) => <GithubForm status={statusOf(data, "GITHUB")} onDone={close} />}
          />
          <IntegrationCard
            provider="SENTRY"
            title="Sentry"
            description="Show unresolved errors from Sentry projects on each project."
            icon={<Bug className="size-5" />}
            status={statusOf(data, "SENTRY")}
            details={
              <>
                <Detail label="Organization" value={statusOf(data, "SENTRY").config.organizationSlug} />
                <Detail label="Host" value={statusOf(data, "SENTRY").config.baseUrl ?? "https://sentry.io"} />
              </>
            }
            form={(close) => <SentryForm status={statusOf(data, "SENTRY")} onDone={close} />}
          />
        </div>
      )}
    </PageContainer>
  );
}
