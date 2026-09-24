"use client";

import { toNestErrors } from "@hookform/resolvers";
import { createProjectSchema, updateProjectSchema, type ProjectDetail } from "@repo/contracts";
import { type } from "arktype";
import type { ReactNode } from "react";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import type { UserOption } from "@/components/app/user-picker";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { applyServerErrors } from "@/lib/forms";
import { BASICS, BasicsSection } from "./basics-section";
import { BILLING, BillingSection } from "./billing-section";
import type { SectionMeta } from "./form-section";
import { LINKS, LinksSection } from "./links-section";
import { PLANNING, PlanningSection } from "./planning-section";
import { SCOPE, ScopeSection } from "./scope-section";
import { TEAM, TeamSection } from "./team-section";
import { normalizeCreate, normalizeUpdate, toFormValues, type ProjectFormValues } from "./values";

const SECTIONS = [BASICS, BILLING, PLANNING, TEAM, SCOPE, LINKS];

/**
 * Validates the normalized payload (so blank optional fields don't fail `string.url` etc.)
 * but hands the raw form values to the submit handler, keeping one value shape for both modes.
 */
const projectResolver =
  (isEdit: boolean): Resolver<ProjectFormValues> =>
  (values, _context, options) => {
    const result = isEdit ? updateProjectSchema(normalizeUpdate(values)) : createProjectSchema(normalizeCreate(values));
    if (!(result instanceof type.errors)) return { values, errors: {} };
    const flat: FieldErrors = {};
    for (const issue of result) {
      const path = issue.path.join(".");
      // The field label already names the path, so show only the problem ("Must be a URL…").
      const problem = issue.path.length ? issue.problem : issue.message;
      flat[path] ??= { type: issue.code, message: problem.charAt(0).toUpperCase() + problem.slice(1) };
    }
    return { values: {}, errors: toNestErrors(flat, options) };
  };

function SectionNav({ sections }: { sections: SectionMeta[] }) {
  return (
    <nav aria-label="Form sections" className="sticky top-20 hidden space-y-0.5 self-start lg:block">
      {sections.map(({ id, title, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="size-4" aria-hidden /> {title}
        </a>
      ))}
    </nav>
  );
}

/**
 * Shared by create and edit. In edit mode membership is managed on the Team tab, so the
 * form validates against `updateProjectSchema` and never sends `members`.
 */
export function ProjectForm({
  project,
  owner,
  submitLabel,
  onSubmit,
  extraSection,
  busy,
}: {
  project?: ProjectDetail;
  /** Label for the preselected owner (the project's owner, or the signed-in user). */
  owner: UserOption;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<unknown>;
  /** Rendered after the built-in sections (e.g. attachments on create). */
  extraSection?: { meta: SectionMeta; node: ReactNode };
  /** Keeps the submit button disabled while follow-up work (uploads) runs. */
  busy?: boolean;
}) {
  const isEdit = !!project;
  const form = useForm<ProjectFormValues>({
    resolver: projectResolver(isEdit),
    defaultValues: toFormValues(owner.id, project),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(errorMessage(error));
    }
  });

  const sections = extraSection ? [...SECTIONS, extraSection.meta] : SECTIONS;
  const pending = form.formState.isSubmitting || busy;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[11rem_1fr]">
      <SectionNav sections={sections} />
      <div className="min-w-0 space-y-6">
        <BasicsSection form={form} isEdit={isEdit} />
        <BillingSection form={form} project={project} />
        <PlanningSection form={form} />
        <TeamSection form={form} owner={owner} isEdit={isEdit} />
        <ScopeSection form={form} />
        <LinksSection form={form} />
        {extraSection?.node}
        <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          {Object.keys(form.formState.errors).length > 0 && (
            <p className="mr-auto text-sm text-destructive">Some fields need attention.</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
