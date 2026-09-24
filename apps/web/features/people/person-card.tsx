import type { UserSummary } from "@repo/contracts";
import { Clock, FolderKanban } from "lucide-react";
import Link from "next/link";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { Card } from "@/components/ui/card";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RoleBadge, UserStatusBadge } from "./people-badges";

export function PersonCard({ person }: { person: UserSummary }) {
  const suspended = person.status === "SUSPENDED";
  return (
    <Card className="group relative gap-0 p-0 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring/50">
      <div className={cn("flex flex-1 items-start gap-3 p-4", suspended && "opacity-60")}>
        <UserAvatar user={person} className="size-11 text-sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/people/${person.id}`}
            className="block truncate font-medium outline-none after:absolute after:inset-0 group-hover:text-primary"
          >
            {fullName(person)}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{person.jobTitle ?? "No title"}</p>
          {person.department && <p className="truncate text-xs text-muted-foreground">{person.department}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground">
        <RoleBadge role={person.role} />
        {suspended && <UserStatusBadge status={person.status} />}
        <span className="ml-auto inline-flex items-center gap-1" title="Active projects">
          <FolderKanban className="size-3.5" />
          <span className="tabular-nums">{person.activeProjectCount}</span>
          <span className="sr-only">active projects</span>
        </span>
        <span className="inline-flex items-center gap-1" title="Weekly capacity">
          <Clock className="size-3.5" />
          <span className="tabular-nums">{formatHours(person.weeklyCapacityHours)}/wk</span>
        </span>
      </div>
    </Card>
  );
}
