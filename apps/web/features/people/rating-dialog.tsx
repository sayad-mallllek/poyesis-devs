"use client";

import type { UserSkill } from "@repo/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useRateUserSkill } from "@/lib/api/skills";
import { levelLabel, StarInput } from "./skill-meters";

export function RatingDialog({
  userId,
  skill,
  onOpenChange,
}: {
  userId: string;
  skill: UserSkill | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!skill} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {skill && <RatingForm key={skill.skill.id} userId={userId} skill={skill} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function RatingForm({ userId, skill, onDone }: { userId: string; skill: UserSkill; onDone: () => void }) {
  const [rating, setRating] = useState<number | null>(skill.rating ?? null);
  const [note, setNote] = useState(skill.ratingNote ?? "");
  const rate = useRateUserSkill(userId);

  const save = () =>
    rate.mutate(
      { skillId: skill.skill.id, rating, ratingNote: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(rating ? "Rating saved" : "Rating cleared");
          onDone();
        },
      },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rate {skill.skill.name}</DialogTitle>
        <DialogDescription>
          Self-assessed as {levelLabel(skill.level).toLowerCase()} ({skill.level}/5). Ratings are only visible to
          administrators.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel>Rating</FieldLabel>
          <StarInput value={rating} onChange={setRating} />
        </Field>
        <Field>
          <FieldLabel htmlFor="rating-note">Note</FieldLabel>
          <Textarea
            id="rating-note"
            rows={4}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you observe? Where should they grow?"
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={save} disabled={rate.isPending}>
          {rate.isPending && <Spinner />}
          Save rating
        </Button>
      </DialogFooter>
    </>
  );
}
