"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createTimeOffSchema, TIME_OFF_TYPES, type CreateTimeOffInput, type TimeOff } from "@repo/contracts";
import { Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { UserPicker, type UserOption } from "@/components/app/user-picker";
import { FormField } from "@/components/forms/form-field";
import { DateInput } from "@/components/forms/number-input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useCreateTimeOff, useDeleteTimeOff, useUpdateTimeOff } from "@/lib/api/scheduling";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { withMessages } from "./form-messages";
import { countBookedDays } from "./timeline";
import { TIME_OFF_LABEL } from "./utilization";

type FormValues = CreateTimeOffInput;
/** Forms that render errors inline opt out of the global error toast. */
const INLINE_ERRORS = { silent: true } as const;

export interface TimeOffFormProps {
  timeOff?: TimeOff;
  defaults?: Partial<FormValues>;
  user?: UserOption;
  /** False when the principal may only record their own absences. */
  canPickPerson: boolean;
  workingDays: readonly number[];
  onDone: () => void;
}

const normalize = (values: FormValues): FormValues => ({ ...values, note: emptyToNull({ note: values.note }).note });

export function TimeOffForm({ timeOff, defaults, user, canPickPerson, workingDays, onDone }: TimeOffFormProps) {
  const create = useCreateTimeOff(INLINE_ERRORS);
  const update = useUpdateTimeOff(INLINE_ERRORS);
  const remove = useDeleteTimeOff();
  const form = useForm<FormValues>({
    resolver: withMessages<FormValues>(
      (values, ctx, options) => arktypeResolver(createTimeOffSchema)(normalize(values), ctx, options),
      { userId: "Choose a person", startDate: "Pick a start date", endDate: "Pick an end date" },
    ),
    defaultValues: {
      userId: timeOff?.userId ?? defaults?.userId ?? "",
      type: timeOff?.type ?? "VACATION",
      startDate: timeOff?.startDate ?? defaults?.startDate ?? "",
      endDate: timeOff?.endDate ?? defaults?.endDate ?? "",
      note: timeOff?.note ?? "",
    },
  });
  const [startDate, endDate] = useWatch({ control: form.control, name: ["startDate", "endDate"] });
  const workDays = startDate && endDate ? countBookedDays(startDate, endDate, false, workingDays) : 0;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (timeOff) {
        const { type, startDate, endDate, note } = normalize(values);
        await update.mutateAsync({ id: timeOff.id, type, startDate, endDate, note });
      } else await create.mutateAsync(normalize(values));
      toast.success(timeOff ? "Time off updated" : "Time off added");
      onDone();
    } catch (error) {
      if (applyServerErrors(form, error)) return;
      // Overlaps come back as 409 without field issues; they are about the dates.
      const field = error instanceof ApiError && error.status === 409 ? "startDate" : "root";
      form.setError(field, { message: errorMessage(error) });
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
              disabled={!canPickPerson || !!timeOff}
              onChange={(userId) => onChange(userId ?? "")}
              aria-invalid={field["aria-invalid"]}
            />
          )}
        </FormField>
        <FormField control={form.control} name="type" label="Type">
          {({ value, onChange, id }) => (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger id={id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OFF_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIME_OFF_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          control={form.control}
          name="startDate"
          label="From"
          description={workDays > 0 && `${workDays} working ${workDays === 1 ? "day" : "days"}`}
        >
          {({ value, onChange, ...field }) => <DateInput {...field} value={value} onChange={(v) => onChange(v ?? "")} />}
        </FormField>
        <FormField control={form.control} name="endDate" label="To">
          {({ value, onChange, ...field }) => (
            <DateInput {...field} value={value} min={startDate || undefined} onChange={(v) => onChange(v ?? "")} />
          )}
        </FormField>
        <FormField control={form.control} name="note" label="Note" className="sm:col-span-2">
          {(field) => <Textarea rows={2} maxLength={500} {...field} value={field.value ?? ""} placeholder="Optional" />}
        </FormField>
      </FieldGroup>
      <p className="text-xs text-muted-foreground">Bookings don&apos;t count against capacity on days off.</p>
      {form.formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <DialogFooter className="gap-2 sm:justify-between">
        {timeOff ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 /> Delete
              </Button>
            }
            title="Delete this time off?"
            description="The days become available for bookings again."
            confirmLabel="Delete"
            destructive
            onConfirm={() =>
              remove.mutate(timeOff.id, {
                onSuccess: () => {
                  toast.success("Time off deleted");
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
            {timeOff ? "Save" : "Add time off"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
