import type { SentryAvailableProject, SentryIssue, SentryLink } from "@repo/contracts";
import { toUserRef } from "../../common/serialization/index.js";

// Structural views of Sentry Web API payloads (only the fields we read).

export interface SentryIssuePayload {
  id: string;
  shortId: string;
  title: string;
  culprit?: string | null;
  level: string;
  status: string;
  /** Sentry serializes the event count as a string. */
  count: string | number;
  userCount: number;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  /** `{ "24h": [[unixSeconds, count], …] }` keyed by the requested stats period. */
  stats?: Record<string, number[][]>;
}

export interface SentryProjectPayload {
  slug: string;
  name: string;
  platform?: string | null;
}

export interface SentryLinkRow {
  id: string;
  projectId: string;
  organizationSlug: string;
  projectSlug: string;
  environment: string | null;
  name: string | null;
  platform: string | null;
  createdAt: Date;
  createdBy: Parameters<typeof toUserRef>[0] | null;
}

export const toSentryIssue = (
  link: { id: string; projectSlug: string },
  issue: SentryIssuePayload,
  statsPeriod: string,
): SentryIssue => ({
  sentryLinkId: link.id,
  sentryProject: link.projectSlug,
  id: issue.id,
  shortId: issue.shortId,
  title: issue.title,
  culprit: issue.culprit || null,
  level: issue.level,
  status: issue.status,
  count: Number(issue.count) || 0,
  userCount: issue.userCount,
  permalink: issue.permalink,
  firstSeen: new Date(issue.firstSeen).toISOString(),
  lastSeen: new Date(issue.lastSeen).toISOString(),
  stats: (issue.stats?.[statsPeriod] ?? []).map(([, count]) => Number(count) || 0),
});

export const toAvailableProject = (project: SentryProjectPayload): SentryAvailableProject => ({
  slug: project.slug,
  name: project.name,
  platform: project.platform ?? null,
});

export const toSentryLink = (row: SentryLinkRow): SentryLink => ({
  id: row.id,
  projectId: row.projectId,
  organizationSlug: row.organizationSlug,
  projectSlug: row.projectSlug,
  environment: row.environment,
  name: row.name,
  platform: row.platform,
  createdAt: row.createdAt.toISOString(),
  createdBy: row.createdBy ? toUserRef(row.createdBy) : null,
});
