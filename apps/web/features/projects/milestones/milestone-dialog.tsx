"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createMilestoneSchema, MILESTONE_STATUSES, type CreateMilestoneInput, type Milestone } from "@repo/contracts";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/client";
import { useMilestoneMutations } from "@/lib/api/projects";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { DatePicker } from "../components/date-picker";
import { EnumSelect } from "../components/enum-select";

type Values = CreateMilestoneInput;

const toValues = (m?: Milestone): Values => ({
  name: m?.name ?? "",
  description: m?.description ?? "",
  dueDate: m?.dueDate ?? "",
  status: m?.status ?? "PENDING",
});

const normalize = (v: Values): Values => ({ ...emptyToNull(v), name: v.name.trim(), dueDate: v.dueDate });

export function MilestoneDialog({ projectId, milestone, trigger }: { projectId: string; milestone?: Milestone; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { create, update } = useMilestoneMutations(projectId);
  const form = useForm<Values>({
    resolver: (values, ctx, options) => arktypeResolver(createMilestoneSchema)(normalize(values), ctx, options),
    defaultValues: toValues(milestone),
  });

  const submit = form.handleSubmit(async (values) => {
    const input = normalize(values);
    try {
      if (milestone) await update.mutateAsync({ id: milestone.id, input });
      else await create.mutateAsync(input);
      toast.success(milestone ? "Milestone updated" : "Milestone added");
      setOpen(false);
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(toValues(milestone));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-6">
          <DialogHeader>
            <DialogTitle>{milestone ? "Edit milestone" : "New milestone"}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-5">
            <FormField control={form.control} name="name" label="Name">
              {(field) => <Input {...field} autoFocus placeholder="e.g. UAT sign-off" />}
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField control={form.control} name="dueDate" label="Due date">
                {({ value, onChange, id, ...field }) => (
                  <DatePicker id={id} value={value || null} onChange={(d) => onChange(d ?? "")} clearable={false} aria-invalid={field["aria-invalid"]} />
                )}
              </FormField>
              <FormField control={form.control} name="status" label="Status">
                {({ value, onChange, id }) => <EnumSelect id={id} value={value ?? "PENDING"} onChange={onChange} options={MILESTONE_STATUSES} />}
              </FormField>
            </div>
            <FormField control={form.control} name="description" label="Description">
              {(field) => <Textarea {...field} value={field.value ?? ""} rows={3} placeholder="What does done look like?" />}
            </FormField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              {milestone ? "Save" : "Add milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
