import type { ProjectStatus, UserDetail } from "@repo/contracts";
import { CalendarDays, Clock, Coins, FolderKanban, Globe, LogIn, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/app/states";
import { ProjectStatusBadge, ToneBadge } from "@/components/app/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHours, formatMoney, formatRelative, humanize } from "@/lib/format";
import { WeekSnapshot } from "./week-snapshot";

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="break-words">{children}</div>
      </div>
    </div>
  );
}

export function ProfileOverview({ user, showSchedule }: { user: UserDetail; showSchedule: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-6">
        {showSchedule && <WeekSnapshot userId={user.id} />}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {user.projects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban />}
                title="No projects"
                description="Book this person on a project or add them to a team."
              />
            ) : (
              <ul className="-my-3 divide-y">
                {user.projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 transition-colors hover:text-primary"
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="min-w-0 truncate font-medium">{project.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{project.code}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <ToneBadge tone="neutral">{humanize(project.projectRole)}</ToneBadge>
                        <ProjectStatusBadge status={project.status as ProjectStatus} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        {user.bio && (
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">{user.bio}</CardContent>
          </Card>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow icon={<Clock />} label="Weekly capacity">
            {formatHours(user.weeklyCapacityHours)} per week
          </InfoRow>
          {user.costRate !== undefined && (
            <InfoRow icon={<Coins />} label="Cost rate (admins only)">
              {user.costRate == null ? "—" : `${formatMoney(user.costRate)} / hour`}
            </InfoRow>
          )}
          <InfoRow icon={<Phone />} label="Phone">
            {user.phone ? (
              <a href={`tel:${user.phone}`} className="hover:text-primary">
                {user.phone}
              </a>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow icon={<Globe />} label="Timezone">
            {user.timezone.replaceAll("_", " ")}
          </InfoRow>
          <InfoRow icon={<CalendarDays />} label="Hired">
            {formatDate(user.hiredAt)}
          </InfoRow>
          <InfoRow icon={<LogIn />} label="Last sign-in">
            {user.lastLoginAt ? formatRelative(user.lastLoginAt) : "Never"}
          </InfoRow>
        </CardContent>
      </Card>
    </div>
  );
}
