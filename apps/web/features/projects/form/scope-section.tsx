"use client";

import { Target } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { FormSection, type SectionMeta } from "./form-section";
import type { ProjectFormValues } from "./values";

export const SCOPE: SectionMeta = {
  id: "scope",
  title: "Scope",
  description: "Explicit goals and boundaries. The AI uses these to judge risk and scope creep.",
  icon: Target,
};

type ScopeField = "objectives" | "successCriteria" | "scope" | "outOfScope" | "assumptions" | "constraints";

const FIELDS: Array<{ name: ScopeField; label: string; placeholder: string }> = [
  { name: "objectives", label: "Objectives", placeholder: "- Lift mobile performance score to 90+" },
  { name: "successCriteria", label: "Success criteria", placeholder: "- Core Web Vitals green on 95% of URLs" },
  { name: "scope", label: "In scope", placeholder: "Marketing site, blog, CMS setup…" },
  { name: "outOfScope", label: "Out of scope", placeholder: "Customer portal, e-commerce…" },
  { name: "assumptions", label: "Assumptions", placeholder: "Client provides final copy by week 6…" },
  { name: "constraints", label: "Constraints", placeholder: "Launch before the January trade show…" },
];

export function ScopeSection({ form }: { form: UseFormReturn<ProjectFormValues> }) {
  return (
    <FormSection section={SCOPE}>
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map(({ name, label, placeholder }) => (
          <FormField key={name} control={form.control} name={name} label={label}>
            {(field) => <Textarea {...field} value={field.value ?? ""} rows={4} placeholder={placeholder} />}
          </FormField>
        ))}
      </FieldGroup>
      <p className="mt-4 text-xs text-muted-foreground">All fields accept Markdown lists.</p>
    </FormSection>
  );
}
