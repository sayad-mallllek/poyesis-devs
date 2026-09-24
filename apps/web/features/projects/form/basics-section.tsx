"use client";

import { PRIORITIES, PROJECT_TYPES } from "@repo/contracts";
import { Sparkle } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput } from "../components/chip-input";
import { ColorSwatches } from "../components/color-swatches";
import { EnumSelect } from "../components/enum-select";
import { MarkdownEditor } from "../components/markdown-editor";
import { FormSection, type SectionMeta } from "./form-section";
import type { ProjectFormValues } from "./values";

export const BASICS: SectionMeta = {
  id: "basics",
  title: "Basics",
  description: "What the project is. The description is the main context the AI assistant reads.",
  icon: Sparkle,
};

const TECH_SUGGESTIONS = ["TypeScript", "React", "Next.js", "Node.js", "NestJS", "PostgreSQL", "Python", "AWS", "Docker"];

export function BasicsSection({ form, isEdit }: { form: UseFormReturn<ProjectFormValues>; isEdit: boolean }) {
  const { control } = form;
  return (
    <FormSection section={BASICS}>
      <FieldGroup className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <FormField control={control} name="name" label="Name">
          {(field) => <Input {...field} autoFocus={!isEdit} placeholder="e.g. Acme website redesign" />}
        </FormField>
        <FormField
          control={control}
          name="code"
          label="Code"
          description={isEdit ? undefined : "Leave blank to generate one."}
        >
          {(field) => (
            <Input
              {...field}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              placeholder="ACME-WEB"
              className="font-mono uppercase"
              maxLength={20}
            />
          )}
        </FormField>
        <FormField control={control} name="summary" label="Summary" className="sm:col-span-2" description="One or two sentences, shown on cards.">
          {(field) => <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={300} />}
        </FormField>
        <FormField control={control} name="description" label="Description" className="sm:col-span-2">
          {(field) => (
            <MarkdownEditor
              id={field.id}
              aria-invalid={field["aria-invalid"]}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={"## Context\nWhy this project exists…\n\n## Approach\n1. …"}
            />
          )}
        </FormField>
        <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
          <FormField control={control} name="type" label="Type">
            {({ value, onChange, id }) => <EnumSelect id={id} value={value} onChange={onChange} options={PROJECT_TYPES} />}
          </FormField>
          <FormField control={control} name="priority" label="Priority">
            {({ value, onChange, id }) => <EnumSelect id={id} value={value} onChange={onChange} options={PRIORITIES} />}
          </FormField>
        </div>
        <FormField control={control} name="color" label="Color" className="sm:col-span-2">
          {({ value, onChange, id }) => <ColorSwatches id={id} value={value} onChange={onChange} />}
        </FormField>
        <FormField control={control} name="tags" label="Tags" className="sm:col-span-2" description="Press Enter or comma to add.">
          {({ value, onChange, id, ...field }) => (
            <ChipInput id={id} value={value} onChange={onChange} max={20} placeholder="website, seo…" aria-invalid={field["aria-invalid"]} />
          )}
        </FormField>
        <FormField control={control} name="techStack" label="Tech stack" className="sm:col-span-2">
          {({ value, onChange, id, ...field }) => (
            <ChipInput
              id={id}
              value={value}
              onChange={onChange}
              max={40}
              suggestions={TECH_SUGGESTIONS}
              placeholder="Add a technology"
              aria-invalid={field["aria-invalid"]}
            />
          )}
        </FormField>
        <Controller
          control={control}
          name="isConfidential"
          render={({ field }) => (
            <Field orientation="horizontal" className="rounded-lg border p-3 sm:col-span-2">
              <FieldContent>
                <FieldLabel htmlFor="field-isConfidential">Confidential</FieldLabel>
                <FieldDescription>Flags the project as sensitive so the team keeps client details out of shared reports.</FieldDescription>
              </FieldContent>
              <Switch id="field-isConfidential" checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />
      </FieldGroup>
    </FormSection>
  );
}
