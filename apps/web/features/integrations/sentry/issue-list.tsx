"use client";

import type { SentryIssue } from "@repo/contracts";
import { ExternalLink } from "lucide-react";
import { ToneBadge, type Tone } from "@/components/app/status-badges";
import { formatRelative } from "@/lib/format";

const LEVEL_TONE: Record<string, Tone> = { fatal: "danger", error: "danger", warning: "warning", info: "info", debug: "neutral" };

/** Event volume per bucket; bars share one scale per issue. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const width = 96;
  const barWidth = width / Math.max(values.length, 1);
  return (
    <svg width={width} height={24} role="img" aria-label={label} className="text-destructive/70">
      {values.map((v, i) => {
        const h = Math.max(v ? 2 : 0, (v / max) * 22);
        return <rect key={i} x={i * barWidth + 0.5} y={24 - h} width={Math.max(barWidth - 1, 1)} height={h} rx={0.5} fill="currentColor" />;
      })}
    </svg>
  );
}

export function IssueList({ items, showProject }: { items: SentryIssue[]; showProject: boolean }) {
  return (
    <ul className="divide-y">
      {items.map((issue) => (
        <li key={`${issue.sentryLinkId}-${issue.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[1fr_96px_5rem_5rem]">
          <div className="min-w-0">
            <a href={issue.permalink} target="_blank" rel="noreferrer" className="group flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ToneBadge tone={LEVEL_TONE[issue.level] ?? "neutral"} className="shrink-0 capitalize">
                {issue.level}
              </ToneBadge>
              <span className="truncate">{issue.title}</span>
              <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
            <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span className="font-mono">{issue.shortId}</span>
              {showProject && <span>{issue.sentryProject}</span>}
              {issue.culprit && <span className="truncate">{issue.culprit}</span>}
              <span>first seen {formatRelative(issue.firstSeen)}</span>
              <span>last seen {formatRelative(issue.lastSeen)}</span>
            </p>
          </div>
          <div className="hidden md:block">
            <Sparkline values={issue.stats} label={`${issue.count} events over the period`} />
          </div>
          <div className="text-right text-sm tabular-nums">
            {issue.count.toLocaleString()}
            <div className="text-xs text-muted-foreground">events</div>
          </div>
          <div className="hidden text-right text-sm tabular-nums md:block">
            {issue.userCount.toLocaleString()}
            <div className="text-xs text-muted-foreground">users</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
