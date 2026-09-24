"use client";

import { PROJECT_MEMBER_ROLES, type ProjectMember, type ProjectMemberRole } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Crown, UserMinus, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/app/states";
import { ToneBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { projectMembersQuery, useMemberMutations } from "@/lib/api/projects";
import { formatDate, humanize } from "@/lib/format";
import { EnumSelect } from "../components/enum-select";
import { useProject } from "../detail/project-context";
import { AddMemberDialog } from "./add-member-dialog";

const ROLE_HINT: Record<ProjectMemberRole, string> = {
  LEAD: "Manages the project",
  CONTRIBUTOR: "Does the work",
  REVIEWER: "Reviews deliverables",
  STAKEHOLDER: "Kept informed",
};

function MemberRow({ member, isOwner, canEdit, canRemove }: { member: ProjectMember; isOwner: boolean; canEdit: boolean; canRemove: boolean }) {
  const project = useProject();
  const { updateRole, remove } = useMemberMutations(project.id);
  const name = fullName(member.user);

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <UserAvatar user={member.user} className="size-9" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/people/${member.user.id}`} className="font-medium hover:text-primary">
            {name}
          </Link>
          {isOwner && (
            <ToneBadge tone="primary">
              <Crown aria-hidden /> Owner
            </ToneBadge>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {member.user.jobTitle ?? member.user.email} · joined {formatDate(member.joinedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {canEdit && !isOwner ? (
          <EnumSelect
            aria-label={`Project role of ${name}`}
            size="sm"
            className="w-40"
            value={member.projectRole}
            options={PROJECT_MEMBER_ROLES}
            onChange={(projectRole) =>
              updateRole.mutate(
                { userId: member.user.id, projectRole },
                { onSuccess: () => toast.success(`${name} is now ${humanize(projectRole).toLowerCase()}`), onError: (e) => toast.error(errorMessage(e)) },
              )
            }
          />
        ) : (
          <span className="px-2 text-sm" title={isOwner ? "The owner always leads the project" : ROLE_HINT[member.projectRole]}>
            {humanize(member.projectRole)}
          </span>
        )}
        {canRemove && !isOwner && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                <UserMinus />
                <span className="sr-only">Remove {name}</span>
              </Button>
            }
            title={`Remove ${name} from ${project.name}?`}
            description="They lose access to the project unless their role grants it. Their bookings are kept."
            confirmLabel="Remove"
            destructive
            onConfirm={() =>
              remove.mutate(member.user.id, {
                onSuccess: () => toast.success(`${name} removed`),
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          />
        )}
      </div>
    </li>
  );
}

export function TeamView() {
  const project = useProject();
  const can = useCan();
  const { data, error, isPending, refetch } = useQuery(projectMembersQuery(project.id));
  const resource = { projectId: project.id };
  const canAdd = can("create", "ProjectMember", resource);
  // The owner sorts first, then leads, then everyone else by name.
  const members = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.user.id === project.owner.id) - Number(a.user.id === project.owner.id) ||
      PROJECT_MEMBER_ROLES.indexOf(a.projectRole) - PROJECT_MEMBER_ROLES.indexOf(b.projectRole) ||
      fullName(a.user).localeCompare(fullName(b.user)),
  );

  const addButton = canAdd && (
    <AddMemberDialog
      projectId={project.id}
      existing={members.map((m) => m.user.id)}
      trigger={
        <Button>
          <UserPlus /> Add member
        </Button>
      }
    />
  );

  return (
    <section className="space-y-4" aria-labelledby="team-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="team-title" className="text-lg font-semibold">
            Team
          </h2>
          <p className="text-sm text-muted-foreground">Leads manage the project; everyone on it can post status updates and files.</p>
        </div>
        {addButton}
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : members.length === 0 ? (
        <EmptyState icon={<Users />} title="No members" action={addButton || undefined} />
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {members.map((m) => (
              <MemberRow
                key={m.user.id}
                member={m}
                isOwner={m.user.id === project.owner.id}
                canEdit={can("update", "ProjectMember", { projectId: project.id, userId: m.user.id })}
                canRemove={can("delete", "ProjectMember", { projectId: project.id, userId: m.user.id })}
              />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
