"use client";

import { PROJECT_MEMBER_ROLES } from "@repo/contracts";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { UserPicker, type UserOption } from "@/components/app/user-picker";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { EnumSelect } from "../components/enum-select";
import { FormSection, type SectionMeta } from "./form-section";
import type { ProjectFormValues } from "./values";

export const TEAM: SectionMeta = {
  id: "team",
  title: "Team",
  description: "The owner leads the project and can manage it. Members see it and can report status.",
  icon: Users,
};

export function TeamSection({
  form,
  owner,
  isEdit,
}: {
  form: UseFormReturn<ProjectFormValues>;
  /** Label for the preselected owner. */
  owner: UserOption;
  isEdit: boolean;
}) {
  const { control } = form;
  const members = useFieldArray({ control, name: "members", keyName: "key" });
  // Pickers only know the users they have loaded; remember picked ones so labels survive re-renders.
  const [known, setKnown] = useState<Record<string, UserOption>>({});
  const remember = (user: UserOption | null) => user && setKnown((k) => ({ ...k, [user.id]: user }));

  return (
    <FormSection
      section={TEAM}
      action={
        !isEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => members.append({ userId: "", projectRole: "CONTRIBUTOR" })}>
            <Plus /> Add member
          </Button>
        )
      }
    >
      <FieldGroup className="gap-5">
        <FormField
          control={control}
          name="ownerId"
          label="Owner"
          description={isEdit ? "Transferring ownership makes the new owner a lead." : undefined}
        >
          {({ value, onChange, id, ...field }) => (
            <UserPicker
              id={id}
              value={value}
              onChange={(userId, user) => {
                remember(user);
                if (userId) onChange(userId);
              }}
              selected={known[value] ?? owner}
              aria-invalid={field["aria-invalid"]}
            />
          )}
        </FormField>

        {isEdit ? (
          <p className="text-sm text-muted-foreground">Add or remove members and change their roles on the Team tab.</p>
        ) : (
          <div className="space-y-3">
            {members.fields.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No members yet. The owner is added as lead automatically.
              </p>
            )}
            {members.fields.map((member, index) => (
              <div key={member.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_11rem_auto]">
                <FormField control={control} name={`members.${index}.userId`} label={<span className="sr-only">Member {index + 1}</span>}>
                  {({ value, onChange, id, ...field }) => (
                    <UserPicker
                      id={id}
                      value={value || null}
                      onChange={(userId, user) => {
                        remember(user);
                        onChange(userId ?? "");
                      }}
                      selected={known[value]}
                      aria-invalid={field["aria-invalid"]}
                    />
                  )}
                </FormField>
                <FormField
                  control={control}
                  name={`members.${index}.projectRole`}
                  label={<span className="sr-only">Role of member {index + 1}</span>}
                  className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto"
                >
                  {({ value, onChange, id }) => (
                    <EnumSelect id={id} value={value ?? "CONTRIBUTOR"} onChange={onChange} options={PROJECT_MEMBER_ROLES} />
                  )}
                </FormField>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={() => members.remove(index)}>
                  <Trash2 />
                  <span className="sr-only">Remove member {index + 1}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </FieldGroup>
    </FormSection>
  );
}
