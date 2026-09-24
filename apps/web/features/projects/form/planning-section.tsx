"use client";

import { PROJECT_HEALTHS, PROJECT_STATUSES } from "@repo/contracts";
import { differenceInCalendarDays } from "date-fns";
import { CalendarRange } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { HealthBadge, ProjectStatusBadge } from "@/components/app/status-badges";
import { FormField } from "@/components/forms/form-field";
import { FieldGroup } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { parseDate } from "@/lib/format";
import { DatePicker } from "../components/date-picker";
import { EnumSelect } from "../components/enum-select";
import { FormSection, type SectionMeta } from "./form-section";
import type { ProjectFormValues } from "./values";

export const PLANNING: SectionMeta = {
  id: "planning",
  title: "Planning",
  description: "The project window and where it stands today.",
  icon: CalendarRange,
};

function durationLabel(start: string | null, end: string | null) {
  if (!start || !end || end < start) return null;
  const days = differenceInCalendarDays(parseDate(end), parseDate(start)) + 1;
  const weeks = Math.round(days / 7);
  return `${days} days${weeks >= 2 ? ` · about ${weeks} weeks` : ""}`;
}

export function PlanningSection({ form }: { form: UseFormReturn<ProjectFormValues> }) {
  const { control } = form;
  const [start, end] = useWatch({ control, name: ["startDate", "targetEndDate"] });
  const progress = useWatch({ control, name: "progress" });
  const duration = durationLabel(start, end);

  return (
    <FormSection section={PLANNING}>
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        <FormField control={control} name="startDate" label="Start date">
          {({ value, onChange, id, ...field }) => (
            <DatePicker id={id} value={value} onChange={onChange} aria-invalid={field["aria-invalid"]} />
          )}
        </FormField>
        <FormField control={control} name="targetEndDate" label="Target end date" description={duration ?? undefined}>
          {({ value, onChange, id, ...field }) => (
            <DatePicker id={id} value={value} onChange={onChange} aria-invalid={field["aria-invalid"]} />
          )}
        </FormField>
        <FormField control={control} name="status" label="Status">
          {({ value, onChange, id }) => (
            <EnumSelect
              id={id}
              value={value}
              onChange={onChange}
              options={PROJECT_STATUSES}
              renderOption={(s) => <ProjectStatusBadge status={s} />}
            />
          )}
        </FormField>
        <FormField control={control} name="health" label="Health">
          {({ value, onChange, id }) => (
            <EnumSelect
              id={id}
              value={value}
              onChange={onChange}
              options={PROJECT_HEALTHS}
              renderOption={(h) => <HealthBadge health={h} />}
            />
          )}
        </FormField>
        <FormField
          control={control}
          name="progress"
          label={
            <span className="flex w-full justify-between">
              Progress <span className="font-normal tabular-nums text-muted-foreground">{progress}%</span>
            </span>
          }
          className="sm:col-span-2"
          description="Usually reported through status updates once the project is running."
        >
          {({ value, onChange, id }) => (
            <Slider id={id} value={[value]} onValueChange={([v]) => onChange(v ?? 0)} max={100} step={5} aria-label="Progress" />
          )}
        </FormField>
      </FieldGroup>
    </FormSection>
  );
}
