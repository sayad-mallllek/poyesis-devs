"use client";

import { SKILL_CATEGORIES, type Skill, type SkillCategory, type UserSkill } from "@repo/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { NumberInput } from "@/components/forms/number-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateSkill, useUpsertUserSkill } from "@/lib/api/skills";
import { humanize } from "@/lib/format";
import { LevelPicker } from "./skill-meters";
import { SkillPicker } from "./skill-picker";

interface SkillDialogProps {
  userId: string;
  /** The assessment being edited; omit to add a new skill. */
  editing?: UserSkill | null;
  existingIds: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillDialog(props: SkillDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remount per opening so the form starts from the edited skill. */}
        {props.open && <SkillDialogBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function SkillDialogBody({ userId, editing, existingIds, onOpenChange }: SkillDialogProps) {
  const [skill, setSkill] = useState<Skill | null>(editing ? { ...editing.skill, userCount: 0 } : null);
  const [draft, setDraft] = useState<{ name: string; category: SkillCategory } | null>(null);
  const [level, setLevel] = useState(editing?.level ?? 3);
  const [years, setYears] = useState<number | null>(editing?.yearsOfExperience ?? null);
  const createSkill = useCreateSkill();
  const upsert = useUpsertUserSkill(userId);
  const pending = createSkill.isPending || upsert.isPending;

  const save = async () => {
    // Failures are toasted by the global mutation handler.
    const target = draft ? await createSkill.mutateAsync(draft).catch(() => null) : skill;
    if (!target) return;
    await upsert.mutateAsync({ skillId: target.id, level, yearsOfExperience: years }).then(
      () => {
        toast.success(editing ? "Skill updated" : `${target.name} added`);
        onOpenChange(false);
      },
      () => undefined,
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${editing.skill.name}` : "Add a skill"}</DialogTitle>
        <DialogDescription>Self-assessed level and experience help staff the right people.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        {!editing && (
          <Field>
            <FieldLabel htmlFor="skill-picker">Skill</FieldLabel>
            {draft ? (
              <div className="grid gap-2 rounded-md border border-dashed p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    New skill <span className="font-medium">{draft.name}</span>
                  </span>
                  <Button variant="ghost" size="xs" onClick={() => setDraft(null)}>
                    Change
                  </Button>
                </div>
                <Select
                  value={draft.category}
                  onValueChange={(category) => setDraft({ ...draft, category: category as SkillCategory })}
                >
                  <SelectTrigger className="w-full" aria-label="Category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {humanize(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <SkillPicker
                id="skill-picker"
                value={skill}
                onSelect={setSkill}
                onCreate={(name) => setDraft({ name, category: "OTHER" })}
                excludeIds={existingIds}
              />
            )}
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="skill-level">Level</FieldLabel>
          <LevelPicker id="skill-level" value={level} onChange={setLevel} />
        </Field>
        <Field>
          <FieldLabel htmlFor="skill-years">Years of experience</FieldLabel>
          <NumberInput id="skill-years" value={years} onChange={setYears} min={0} max={60} step="0.5" className="w-32" />
          <FieldDescription>Optional.</FieldDescription>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={save} disabled={pending || (!skill && !draft)}>
          {pending && <Spinner />}
          {editing ? "Save" : "Add skill"}
        </Button>
      </DialogFooter>
    </>
  );
}
