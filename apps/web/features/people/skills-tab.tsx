"use client";

import { SKILL_CATEGORIES, type UserSkill } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/app/states";
import { fullName } from "@/components/app/user-avatar";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { userSkillsQuery, useRemoveUserSkill } from "@/lib/api/skills";
import { formatRelative, humanize } from "@/lib/format";
import { RatingDialog } from "./rating-dialog";
import { SkillDialog } from "./skill-dialog";
import { LevelMeter, StarRating } from "./skill-meters";

export function SkillsTab({ userId }: { userId: string }) {
  const can = useCan();
  const { data, isPending, error, refetch } = useQuery(userSkillsQuery(userId));
  const [editing, setEditing] = useState<UserSkill | null>(null);
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState<UserSkill | null>(null);

  const canAdd = can("create", "UserSkill", { userId });
  const canEdit = can("update", "UserSkill", { userId });
  const canRemove = can("delete", "UserSkill", { userId });
  const showRatings = can("read", "UserSkill", { userId }, "rating");
  const canRate = can("update", "UserSkill", { userId }, "rating");

  const groups = useMemo(
    () =>
      SKILL_CATEGORIES.map((category) => ({
        category,
        skills: data?.filter((s) => s.skill.category === category) ?? [],
      })).filter((g) => g.skills.length > 0),
    [data],
  );

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton className="h-64 w-full" />;

  const rated = data.filter((s) => s.rating).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.length} {data.length === 1 ? "skill" : "skills"}
          {showRatings && ` · ${rated} rated by an administrator`}
        </p>
        {canAdd && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add skill
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={<Sparkles />}
          title="No skills yet"
          description={canAdd ? "Add skills with a self-assessed level to show up in staffing searches." : undefined}
        />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          {groups.map(({ category, skills }) => (
            <section key={category} aria-labelledby={`skills-${category}`}>
              <h3
                id={`skills-${category}`}
                className="border-b bg-muted/50 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-6"
              >
                {humanize(category)}
              </h3>
              <ul className="divide-y border-b last:border-b-0">
                {skills.map((s) => (
                  <li key={s.skill.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
                    <div className="min-w-36 flex-1">
                      <span className="font-medium">{s.skill.name}</span>
                      {s.yearsOfExperience != null && (
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {s.yearsOfExperience} {s.yearsOfExperience === 1 ? "yr" : "yrs"}
                        </span>
                      )}
                    </div>
                    <LevelMeter level={s.level} className="w-44" />
                    {showRatings && (
                      <div className="order-last w-full min-w-0 md:order-none md:w-64">
                        <StarRating value={s.rating} />
                        {s.ratingNote && <p className="line-clamp-2 text-xs text-muted-foreground">{s.ratingNote}</p>}
                        {s.ratedBy && s.ratedAt && (
                          <p className="text-[11px] text-muted-foreground/80">
                            {fullName(s.ratedBy)} · {formatRelative(s.ratedAt)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="ml-auto flex gap-1">
                      {canRate && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setRating(s)}>
                          <Star />
                          <span className="sr-only">Rate {s.skill.name}</span>
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)}>
                          <Pencil />
                          <span className="sr-only">Edit {s.skill.name}</span>
                        </Button>
                      )}
                      {canRemove && <RemoveSkillButton userId={userId} skill={s} />}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </Card>
      )}

      <SkillDialog
        userId={userId}
        open={adding || !!editing}
        editing={editing}
        existingIds={data.map((s) => s.skill.id)}
        onOpenChange={(open) => {
          if (!open) {
            setAdding(false);
            setEditing(null);
          }
        }}
      />
      {canRate && <RatingDialog userId={userId} skill={rating} onOpenChange={(open) => !open && setRating(null)} />}
    </div>
  );
}

function RemoveSkillButton({ userId, skill }: { userId: string; skill: UserSkill }) {
  const remove = useRemoveUserSkill(userId);
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
          <Trash2 />
          <span className="sr-only">Remove {skill.skill.name}</span>
        </Button>
      }
      title={`Remove ${skill.skill.name}?`}
      description="The self-assessment and any administrator rating for this skill are deleted."
      confirmLabel="Remove"
      destructive
      onConfirm={() =>
        remove.mutate(skill.skill.id, {
          onSuccess: () => toast.success(`${skill.skill.name} removed`),
        })
      }
    />
  );
}
