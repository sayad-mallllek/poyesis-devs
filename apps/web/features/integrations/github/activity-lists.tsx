"use client";

import type {
  GithubActor,
  GithubDeployment,
  GithubPullRequest,
  GithubRelease,
  GithubWorkflowRun,
} from "@repo/contracts";
import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CircleX,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  Rocket,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { ToneBadge, type Tone } from "@/components/app/status-badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/format";

function Actor({ actor }: { actor: GithubActor | null }) {
  if (!actor) return null;
  return (
    <span className="flex items-center gap-1.5">
      <Avatar className="size-4">
        {actor.avatarUrl && <AvatarImage src={actor.avatarUrl} alt="" />}
        <AvatarFallback className="text-[8px]">{actor.login.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      {actor.login}
    </span>
  );
}

function Row({ icon, title, href, meta, trailing }: { icon: ReactNode; title: ReactNode; href: string; meta: ReactNode; trailing?: ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <a href={href} target="_blank" rel="noreferrer" className="group flex items-center gap-1.5 text-sm font-medium hover:text-primary">
          <span className="truncate">{title}</span>
          <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </li>
  );
}

function prState(pr: GithubPullRequest): { icon: ReactNode; label: string; tone: Tone } {
  if (pr.merged) return { icon: <GitMerge className="text-chart-7" />, label: "Merged", tone: "primary" };
  if (pr.state === "closed") return { icon: <GitPullRequestClosed className="text-destructive" />, label: "Closed", tone: "danger" };
  if (pr.draft) return { icon: <GitPullRequestDraft className="text-muted-foreground" />, label: "Draft", tone: "neutral" };
  return { icon: <GitPullRequest className="text-success" />, label: "Open", tone: "success" };
}

export function PullRequestList({ items }: { items: GithubPullRequest[] }) {
  return (
    <ul className="divide-y">
      {items.map((pr) => {
        const state = prState(pr);
        return (
          <Row
            key={`${pr.repository}#${pr.number}`}
            icon={state.icon}
            href={pr.url}
            title={pr.title}
            meta={
              <>
                <span className="font-mono">
                  {pr.repository}#{pr.number}
                </span>
                <Actor actor={pr.author} />
                <span>
                  {pr.headRef} → {pr.baseRef}
                </span>
                <span>updated {formatRelative(pr.updatedAt)}</span>
                {pr.reviewers.length > 0 && <span>review: {pr.reviewers.join(", ")}</span>}
                {pr.labels.map((label) => (
                  <span
                    key={label.name}
                    className="rounded-full border px-1.5 py-px text-[10px] font-medium"
                    style={{ borderColor: `#${label.color}`, color: `#${label.color}` }}
                  >
                    {label.name}
                  </span>
                ))}
              </>
            }
            trailing={<ToneBadge tone={state.tone}>{state.label}</ToneBadge>}
          />
        );
      })}
    </ul>
  );
}

function runIcon(run: GithubWorkflowRun) {
  if (run.status !== "completed") return <CircleDashed className="animate-spin text-warning [animation-duration:3s]" />;
  if (run.conclusion === "success") return <CheckCircle2 className="text-success" />;
  if (run.conclusion === "failure" || run.conclusion === "timed_out") return <CircleX className="text-destructive" />;
  return <CircleDot className="text-muted-foreground" />;
}

const formatDuration = (seconds: number | null) => {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  return m ? `${m}m ${seconds % 60}s` : `${seconds}s`;
};

export function WorkflowRunList({ items }: { items: GithubWorkflowRun[] }) {
  return (
    <ul className="divide-y">
      {items.map((run) => (
        <Row
          key={`${run.repository}-${run.id}`}
          icon={runIcon(run)}
          href={run.url}
          title={
            <>
              {run.displayTitle} <span className="font-normal text-muted-foreground">· {run.name}</span>
            </>
          }
          meta={
            <>
              <span className="font-mono">{run.repository}</span>
              <span>#{run.runNumber}</span>
              {run.branch && <span>{run.branch}</span>}
              <span>{run.event}</span>
              <Actor actor={run.actor} />
              {formatDuration(run.durationSeconds) && <span>{formatDuration(run.durationSeconds)}</span>}
              <span>{formatRelative(run.createdAt)}</span>
            </>
          }
          trailing={
            <span className="text-xs text-muted-foreground capitalize">
              {run.status === "completed" ? run.conclusion?.replaceAll("_", " ") : run.status?.replaceAll("_", " ")}
            </span>
          }
        />
      ))}
    </ul>
  );
}

const DEPLOYMENT_TONE: Record<string, Tone> = {
  success: "success",
  failure: "danger",
  error: "danger",
  in_progress: "warning",
  queued: "info",
  pending: "info",
  inactive: "neutral",
};

export function DeploymentList({ items }: { items: GithubDeployment[] }) {
  return (
    <ul className="divide-y">
      {items.map((d) => (
        <Row
          key={`${d.repository}-${d.id}`}
          icon={<Rocket className="text-muted-foreground" />}
          href={d.environmentUrl ?? `https://github.com/${d.repository}/deployments`}
          title={
            <>
              {d.environment} <span className="font-normal text-muted-foreground">· {d.ref}</span>
            </>
          }
          meta={
            <>
              <span className="font-mono">{d.repository}</span>
              <span className="font-mono">{d.sha.slice(0, 7)}</span>
              <Actor actor={d.creator} />
              {d.description && <span className="truncate">{d.description}</span>}
              <span>{formatRelative(d.createdAt)}</span>
            </>
          }
          trailing={
            d.state && <ToneBadge tone={DEPLOYMENT_TONE[d.state] ?? "neutral"}>{d.state.replaceAll("_", " ")}</ToneBadge>
          }
        />
      ))}
    </ul>
  );
}

export function ReleaseList({ items }: { items: GithubRelease[] }) {
  return (
    <ul className="divide-y">
      {items.map((r) => (
        <Row
          key={`${r.repository}-${r.id}`}
          icon={<Tag className="text-muted-foreground" />}
          href={r.url}
          title={
            <>
              {r.name || r.tagName} <span className="font-mono font-normal text-muted-foreground">{r.tagName}</span>
            </>
          }
          meta={
            <>
              <span className="font-mono">{r.repository}</span>
              <Actor actor={r.author} />
              {r.publishedAt && <span>published {formatRelative(r.publishedAt)}</span>}
            </>
          }
          trailing={
            r.draft ? <ToneBadge tone="neutral">Draft</ToneBadge> : r.prerelease ? <ToneBadge tone="warning">Pre-release</ToneBadge> : null
          }
        />
      ))}
    </ul>
  );
}
