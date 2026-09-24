import type { StatusUpdate } from "@repo/contracts";
import { HealthBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Markdown } from "../components/markdown";

export function StatusUpdateItem({ update, compact }: { update: StatusUpdate; compact?: boolean }) {
  return (
    <article className="flex gap-3">
      <UserAvatar user={update.author} className={cn("mt-0.5 shrink-0", compact && "size-6 text-[10px]")} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{fullName(update.author)}</span>
          <time dateTime={update.createdAt} title={formatDateTime(update.createdAt)} className="text-xs text-muted-foreground">
            {formatRelative(update.createdAt)}
          </time>
          <span className="flex items-center gap-1.5">
            <HealthBadge health={update.health} />
            {update.progress !== null && (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{update.progress}% done</span>
            )}
          </span>
        </div>
        <Markdown className={cn("text-muted-foreground", compact && "line-clamp-3")}>{update.summary}</Markdown>
      </div>
    </article>
  );
}
