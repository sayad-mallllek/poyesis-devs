"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createRiskSchema, RISK_STATUSES, type CreateRiskInput, type Risk } from "@repo/contracts";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { UserPicker } from "@/components/app/user-picker";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/lib/api/client";
import { useRiskMutations } from "@/lib/api/projects";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { EnumSelect } from "../components/enum-select";
import { RISK_LEVEL_STYLE, riskLevel } from "../components/risk-level";
import { RiskScore } from "../components/risk-score";

type Values = CreateRiskInput;

const toValues = (r?: Risk): Values => ({
  title: r?.title ?? "",
  description: r?.description ?? "",
  probability: r?.probability ?? 3,
  impact: r?.impact ?? 3,
  status: r?.status ?? "OPEN",
  mitigation: r?.mitigation ?? "",
  ownerId: r?.owner?.id ?? null,
});

const normalize = (v: Values): Values => ({ ...emptyToNull(v), title: v.title.trim() });

const PROBABILITY = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const IMPACT = ["Negligible", "Minor", "Moderate", "Major", "Severe"];

function ScaleInput({ id, value, onChange, labels }: { id: string; value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="space-y-1.5">
      <ToggleGroup
        id={id}
        type="single"
        variant="outline"
        value={String(value)}
        onValueChange={(v) => v && onChange(Number(v))}
        className="w-full"
      >
        {labels.map((label, i) => (
          <ToggleGroupItem key={label} value={String(i + 1)} aria-label={`${i + 1} – ${label}`} className="flex-1 tabular-nums">
            {i + 1}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{labels[value - 1]}</p>
    </div>
  );
}

export function RiskDialog({ projectId, risk, trigger }: { projectId: string; risk?: Risk; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { create, update } = useRiskMutations(projectId);
  const form = useForm<Values>({
    resolver: (values, ctx, options) => arktypeResolver(createRiskSchema)(normalize(values), ctx, options),
    defaultValues: toValues(risk),
  });
  const [probability, impact] = useWatch({ control: form.control, name: ["probability", "impact"] });
  const score = probability * impact;

  const submit = form.handleSubmit(async (values) => {
    const input = normalize(values);
    try {
      if (risk) await update.mutateAsync({ id: risk.id, input });
      else await create.mutateAsync(input);
      toast.success(risk ? "Risk updated" : "Risk logged");
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
        if (next) form.reset(toValues(risk));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-6">
          <DialogHeader>
            <DialogTitle>{risk ? "Edit risk" : "Log a risk"}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-5">
            <FormField control={form.control} name="title" label="Title">
              {(field) => <Input {...field} autoFocus placeholder="e.g. Client copy delivered late" />}
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField control={form.control} name="probability" label="Probability">
                {({ value, onChange, id }) => <ScaleInput id={id} value={value} onChange={onChange} labels={PROBABILITY} />}
              </FormField>
              <FormField control={form.control} name="impact" label="Impact">
                {({ value, onChange, id }) => <ScaleInput id={id} value={value} onChange={onChange} labels={IMPACT} />}
              </FormField>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm" aria-live="polite">
              <RiskScore score={score} />
              <span className="text-muted-foreground">
                Score {probability} × {impact} = {score} · {RISK_LEVEL_STYLE[riskLevel(score)].label} severity
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField control={form.control} name="status" label="Status">
                {({ value, onChange, id }) => <EnumSelect id={id} value={value ?? "OPEN"} onChange={onChange} options={RISK_STATUSES} />}
              </FormField>
              <FormField control={form.control} name="ownerId" label="Owner">
                {({ value, onChange, id }) => (
                  <UserPicker id={id} value={value ?? null} onChange={(userId) => onChange(userId)} selected={risk?.owner} clearable placeholder="Unassigned" />
                )}
              </FormField>
            </div>
            <FormField control={form.control} name="description" label="Description">
              {(field) => <Textarea {...field} value={field.value ?? ""} rows={2} />}
            </FormField>
            <FormField control={form.control} name="mitigation" label="Mitigation">
              {(field) => <Textarea {...field} value={field.value ?? ""} rows={3} placeholder="How we reduce the probability or the impact" />}
            </FormField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              {risk ? "Save" : "Log risk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
