"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createAllocationSchema, type Allocation, type CreateAllocationInput } from "@repo/contracts";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ProjectPicker, type ProjectOption } from "@/components/app/project-picker";
import { UserPicker, type UserOption } from "@/components/app/user-picker";
import { FormField } from "@/components/forms/form-field";
import { DateInput, NumberInput } from "@/components/forms/number-input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/client";
import { useCreateAllocation, useDeleteAllocation, useUpdateAllocation } from "@/lib/api/scheduling";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { withMessages } from "./form-messages";
import { countBookedDays } from "./timeline";

type FormValues = CreateAllocationInput;
const QUICK_HOURS = [2, 4, 6, 8] as const;
/** Forms that render errors inline opt out of the global error toast. */
const INLINE_ERRORS = { silent: true } as const;

export interface BookingFormProps {
  allocation?: Allocation;
  defaults?: Partial<FormValues>;
  user?: UserOption;
  project?: ProjectOption;
  workingDays: readonly number[];
  onDone: () => void;
}

const normalize = (values: FormValues): FormValues => ({ ...values, note: emptyToNull({ note: values.note }).note });

export function BookingForm({ allocation, defaults, user, project, workingDays, onDone }: BookingFormProps) {
  const [capacity, setCapacity] = useState(user?.weeklyCapacityHours);
  const create = useCreateAllocation(INLINE_ERRORS);
  const update = useUpdateAllocation(INLINE_ERRORS);
  const remove = useDeleteAllocation();
  const form = useForm<FormValues>({
    resolver: withMessages<FormValues>(
      (values, ctx, options) => arktypeResolver(createAllocationSchema)(normalize(values), ctx, options),
      { userId: "Choose a person", projectId: "Choose a project", startDate: "Pick a start date", endDate: "Pick an end date" },
    ),
    defaultValues: {
      userId: allocation?.userId ?? defaults?.userId ?? "",
      projectId: allocation?.projectId ?? defaults?.projectId ?? "",
      startDate: allocation?.startDate ?? defaults?.startDate ?? "",
      endDate: allocation?.endDate ?? defaults?.endDate ?? "",
      hoursPerDay: allocation?.hoursPerDay ?? defaults?.hoursPerDay ?? 8,
      includeWeekends: allocation?.includeWeekends ?? false,
      tentative: allocation?.tentative ?? false,
      note: allocation?.note ?? "",
    },
  });
  const [startDate, endDate, hoursPerDay, includeWeekends] = useWatch({
    control: form.control,
    name: ["startDate", "endDate", "hoursPerDay", "includeWeekends"],
  });
  const fullDay = capacity && workingDays.length ? capacity / workingDays.length : undefined;
  const bookedDays = startDate && endDate ? countBookedDays(startDate, endDate, !!includeWeekends, workingDays) : 0;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (allocation) await update.mutateAsync({ id: allocation.id, ...normalize(values) });
      else await create.mutateAsync(normalize(values));
      toast.success(allocation ? "Booking updated" : "Booking created");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form, error)) form.setError("root", { message: errorMessage(error) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="userId" label="Person">
          {({ value, onChange, id, ...field }) => (
            <UserPicker
              id={id}
              value={value || null}
              selected={user}
              onChange={(userId, picked) => {
                onChange(userId ?? "");
                setCapacity(picked?.weeklyCapacityHours);
              }}
              aria-invalid={field["aria-invalid"]}
            />
          )}
        </FormField>
        <FormField control={form.control} name="projectId" label="Project">
          {({ value, onChange, id, ...field }) => (
            <ProjectPicker
              id={id}
              value={value || null}
              selected={allocation?.project ?? project}
              statuses={["PLANNING", "ACTIVE", "ON_HOLD"]}
              onChange={(projectId) => onChange(projectId ?? "")}
              aria-invalid={field["aria-invalid"]}
            />
          )}
        </FormField>
        <FormField control={form.control} name="startDate" label="From">
          {({ value, onChange, ...field }) => <DateInput {...field} value={value} onChange={(v) => onChange(v ?? "")} />}
        </FormField>
        <FormField control={form.control} name="endDate" label="To">
          {({ value, onChange, ...field }) => (
            <DateInput {...field} value={value} min={startDate || undefined} onChange={(v) => onChange(v ?? "")} />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="hoursPerDay"
          label="Hours per day"
          className="sm:col-span-2"
          description={
            bookedDays > 0 &&
            hoursPerDay > 0 &&
            `${bookedDays} ${bookedDays === 1 ? "day" : "days"} · ${formatHours(bookedDays * hoursPerDay)} in total`
          }
        >
          {({ value, onChange, ...field }) => (
            <div className="flex flex-wrap items-center gap-2">
              <NumberInput
                {...field}
                value={value}
                onChange={(v) => onChange(v ?? 0)}
                min={0.25}
                max={24}
                step="0.25"
                className="w-24"
              />
              <div className="flex flex-wrap gap-1" role="group" aria-label="Quick picks">
                {QUICK_HOURS.map((h) => (
                  <Button
                    key={h}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={value === h}
                    className={cn(value === h && "border-primary bg-primary/10 text-primary")}
                    onClick={() => onChange(h)}
                  >
                    {h}h
                  </Button>
                ))}
                {fullDay && !QUICK_HOURS.includes(fullDay as (typeof QUICK_HOURS)[number]) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={value === fullDay}
                    className={cn(value === fullDay && "border-primary bg-primary/10 text-primary")}
                    onClick={() => onChange(Math.round(fullDay * 100) / 100)}
                  >
                    Full ({formatHours(fullDay)})
                  </Button>
                )}
              </div>
            </div>
          )}
        </FormField>
        <FormField control={form.control} name="includeWeekends" orientation="horizontal">
          {({ value, onChange, id }) => (
            <>
              <Switch id={id} checked={!!value} onCheckedChange={onChange} />
              <FieldContent>
                <FieldLabel htmlFor={id}>Include weekends</FieldLabel>
                <FieldDescription>Book non-working days too.</FieldDescription>
              </FieldContent>
            </>
          )}
        </FormField>
        <FormField control={form.control} name="tentative" orientation="horizontal">
          {({ value, onChange, id }) => (
            <>
              <Switch id={id} checked={!!value} onCheckedChange={onChange} />
              <FieldContent>
                <FieldLabel htmlFor={id}>Tentative</FieldLabel>
                <FieldDescription>Pencilled in, not confirmed.</FieldDescription>
              </FieldContent>
            </>
          )}
        </FormField>
        <FormField control={form.control} name="note" label="Note" className="sm:col-span-2">
          {(field) => <Textarea rows={2} maxLength={1000} {...field} value={field.value ?? ""} placeholder="Optional" />}
        </FormField>
      </FieldGroup>
      {form.formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <DialogFooter className="gap-2 sm:justify-between">
        {allocation ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 /> Delete
              </Button>
            }
            title="Delete this booking?"
            description={`${allocation.project.name} will no longer be scheduled for these dates.`}
            confirmLabel="Delete booking"
            destructive
            onConfirm={() =>
              remove.mutate(allocation.id, {
                onSuccess: () => {
                  toast.success("Booking deleted");
                  onDone();
                },
              })
            }
          />
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            {allocation ? "Save booking" : "Create booking"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
