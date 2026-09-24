"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createStatusUpdateSchema, PROJECT_HEALTHS, type CreateStatusUpdateInput, type ProjectDetail } from "@repo/contracts";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { HEALTH_TONE, TONE_DOT } from "@/components/app/status-badges";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateStatusUpdate } from "@/lib/api/projects";
import { applyServerErrors } from "@/lib/forms";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

function HealthChoice({ value, onChange, id }: { value: CreateStatusUpdateInput["health"]; onChange: (v: CreateStatusUpdateInput["health"]) => void; id: string }) {
  return (
    <div id={id} role="radiogroup" aria-label="Health" className="grid grid-cols-3 gap-2">
      {PROJECT_HEALTHS.map((health) => (
        <button
          key={health}
          type="button"
          role="radio"
          aria-checked={value === health}
          onClick={() => onChange(health)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === health ? "border-foreground/30 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span className={cn("size-2 rounded-full", TONE_DOT[HEALTH_TONE[health]])} aria-hidden />
          {humanize(health)}
        </button>
      ))}
    </div>
  );
}

export function StatusUpdateDialog({ project, trigger }: { project: ProjectDetail; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const create = useCreateStatusUpdate(project.id);
  const defaults = (): CreateStatusUpdateInput => ({ health: project.health, progress: project.progress, summary: "" });
  const form = useForm<CreateStatusUpdateInput>({ resolver: arktypeResolver(createStatusUpdateSchema), defaultValues: defaults() });
  const progress = useWatch({ control: form.control, name: "progress" });

  const submit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({ ...values, summary: values.summary.trim() });
      toast.success("Status update posted");
      setOpen(false);
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error("Could not post the update");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(defaults());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-6">
          <DialogHeader>
            <DialogTitle>Post a status update</DialogTitle>
            <DialogDescription>Sets the project&apos;s health and progress and notifies the feed.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-5">
            <FormField control={form.control} name="health" label="Health">
              {({ value, onChange, id }) => <HealthChoice id={id} value={value} onChange={onChange} />}
            </FormField>
            <FormField
              control={form.control}
              name="progress"
              label={
                <span className="flex w-full justify-between">
                  Progress <span className="font-normal tabular-nums text-muted-foreground">{progress}%</span>
                </span>
              }
            >
              {({ value, onChange, id }) => (
                <Slider id={id} value={[value ?? 0]} onValueChange={([v]) => onChange(v ?? 0)} max={100} step={5} aria-label="Progress" />
              )}
            </FormField>
            <FormField control={form.control} name="summary" label="Summary" description="What changed, what's blocked, what's next. Markdown supported.">
              {(field) => <Textarea {...field} rows={5} autoFocus placeholder="Design sign-off landed; CMS migration is 70% done…" />}
            </FormField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              Post update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
