"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { useCan, useSession } from "@/components/providers/session-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParamsState } from "@/hooks/use-search-param";
import { userQuery } from "@/lib/api/users";
import { AdminActions } from "./admin-actions";
import { ChangePasswordDialog } from "./change-password-dialog";
import { EditProfileDialog } from "./edit-profile-dialog";
import { NotesTab } from "./notes-tab";
import { RoleBadge, UserStatusBadge } from "./people-badges";
import { PersonScheduleTab } from "./person-schedule-tab";
import { ProfileOverview } from "./profile-overview";
import { SkillsTab } from "./skills-tab";

const TABS = ["overview", "schedule", "skills", "notes"] as const;
type Tab = (typeof TABS)[number];

export function PersonProfile({ userId }: { userId: string }) {
  const { user: me } = useSession();
  const can = useCan();
  const { get, set } = useSearchParamsState();
  const { data: user, error, isPending } = useQuery(userQuery(userId));

  const visible: Record<Tab, boolean> = {
    overview: true,
    schedule: can("read", "Allocation"),
    skills: can("read", "UserSkill", { userId }),
    notes: can("read", "UserNote", { userId }),
  };
  const requested = get("tab") as Tab | undefined;
  const tab: Tab = requested && TABS.includes(requested) && visible[requested] ? requested : "overview";

  if (error) {
    return (
      <PageContainer>
        <ErrorState error={error} />
      </PageContainer>
    );
  }
  if (isPending) {
    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-80 w-full" />
      </PageContainer>
    );
  }

  const isSelf = user.id === me.id;
  return (
    <PageContainer>
      <PageHeader
        back={{ href: "/people", label: "People" }}
        title={
          <span className="flex items-center gap-4">
            <UserAvatar user={user} className="size-14 text-lg sm:size-16" />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate">{fullName(user)}</span>
                <RoleBadge role={user.role} />
                {user.status === "SUSPENDED" && <UserStatusBadge status={user.status} />}
              </span>
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                {[user.jobTitle, user.department].filter(Boolean).join(" · ") || "No title yet"}
              </span>
            </span>
          </span>
        }
        description={
          <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Mail className="size-3.5" /> {user.email}
          </a>
        }
        actions={
          <>
            {isSelf && <ChangePasswordDialog />}
            {!isSelf && <AdminActions user={user} />}
            <EditProfileDialog user={user} />
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "overview" ? null : v })}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList variant="line" className="mb-4 border-b pb-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {visible.schedule && <TabsTrigger value="schedule">Schedule</TabsTrigger>}
            {visible.skills && <TabsTrigger value="skills">Skills & ratings</TabsTrigger>}
            {visible.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
          </TabsList>
        </div>
        <TabsContent value="overview">
          <ProfileOverview user={user} showSchedule={visible.schedule} />
        </TabsContent>
        {visible.schedule && (
          <TabsContent value="schedule">
            <PersonScheduleTab user={user} />
          </TabsContent>
        )}
        {visible.skills && (
          <TabsContent value="skills">
            <SkillsTab userId={user.id} />
          </TabsContent>
        )}
        {visible.notes && (
          <TabsContent value="notes">
            <NotesTab userId={user.id} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
