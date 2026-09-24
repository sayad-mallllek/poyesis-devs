"use client";

import { Link2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection, type SectionMeta } from "./form-section";
import type { ProjectFormValues } from "./values";

export const LINKS: SectionMeta = {
  id: "links",
  title: "Links",
  description: "Design files, staging, documents: anywhere the work lives.",
  icon: Link2,
};

const MAX_LINKS = 20;

export function LinksSection({ form }: { form: UseFormReturn<ProjectFormValues> }) {
  const links = useFieldArray({ control: form.control, name: "links", keyName: "key" });
  return (
    <FormSection
      section={LINKS}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={links.fields.length >= MAX_LINKS}
          onClick={() => links.append({ label: "", url: "" })}
        >
          <Plus /> Add link
        </Button>
      }
    >
      {links.fields.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <div className="space-y-3">
          {links.fields.map((link, index) => (
            <div key={link.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[12rem_1fr_auto]">
              <FormField control={form.control} name={`links.${index}.label`} label={<span className="sr-only">Label</span>}>
                {(field) => <Input {...field} placeholder="Label, e.g. Figma" maxLength={60} />}
              </FormField>
              <FormField
                control={form.control}
                name={`links.${index}.url`}
                label={<span className="sr-only">URL</span>}
                className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto"
              >
                {(field) => <Input {...field} type="url" placeholder="https://" />}
              </FormField>
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={() => links.remove(index)}>
                <Trash2 />
                <span className="sr-only">Remove link</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
