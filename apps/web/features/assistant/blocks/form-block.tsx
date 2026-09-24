"use client";

import type { FormBlock, FormField } from "@repo/contracts";
import { CheckCircle2 } from "lucide-react";
import { Controller, useForm, type RegisterOptions } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BlockCard } from "./block-card";
import type { BlockAnswer, RespondToBlock } from "./types";

type Values = Record<string, unknown>;

function initialValue(field: FormField): unknown {
  if (field.defaultValue !== undefined && field.defaultValue !== null) return field.defaultValue;
  if (field.type === "boolean") return false;
  if (field.type === "multiselect") return [];
  return "";
}

/** Converts raw inputs into typed answers and drops empty optionals. */
function toAnswers(fields: FormField[], raw: Values): Values {
  const out: Values = {};
  for (const field of fields) {
    const value = raw[field.name];
    if (value === "" || value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    out[field.name] = field.type === "number" ? Number(value) : value;
  }
  return out;
}

function rules(field: FormField): RegisterOptions {
  return {
    validate: (value: unknown) => {
      const empty = value === "" || value === undefined || (Array.isArray(value) && value.length === 0);
      if (field.required && field.type !== "boolean" && empty) return `${field.label} is required`;
      if (field.type === "number" && !empty) {
        const n = Number(value);
        if (Number.isNaN(n)) return "Enter a number";
        if (field.min !== undefined && n < field.min) return `Must be at least ${field.min}`;
        if (field.max !== undefined && n > field.max) return `Must be at most ${field.max}`;
      }
      return true;
    },
  };
}

function describeAnswer(field: FormField, value: unknown): string {
  if (value === undefined) return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  const label = (v: unknown) => field.options?.find((o) => o.value === v)?.label ?? String(v);
  return Array.isArray(value) ? value.map(label).join(", ") : label(value);
}

export function FormBlockView({
  block,
  answer,
  onRespond,
}: {
  block: FormBlock;
  answer: BlockAnswer;
  onRespond: RespondToBlock;
}) {
  const form = useForm<Values>({
    defaultValues: Object.fromEntries(block.fields.map((f) => [f.name, initialValue(f)])),
  });

  if (answer !== undefined) {
    return (
      <BlockCard title={block.title}>
        {answer === null ? (
          <p className="text-sm text-muted-foreground">Dismissed.</p>
        ) : (
          <dl className="space-y-1 text-sm">
            {block.fields.map((field) => (
              <div key={field.name} className="flex gap-2">
                <dt className="w-1/3 shrink-0 text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 break-words">{describeAnswer(field, answer[field.name])}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5" /> Sent
        </p>
      </BlockCard>
    );
  }

  const submit = form.handleSubmit((values) => onRespond?.(block.id, toAnswers(block.fields, values)));

  return (
    <BlockCard title={block.title} description={block.description} className="border-primary/30">
      <form onSubmit={submit} noValidate>
        <FieldGroup className="gap-4">
          {block.fields.map((field) => (
            <Controller
              key={field.name}
              control={form.control}
              name={field.name}
              rules={rules(field)}
              render={({ field: input, fieldState }) => {
                const id = `${block.id}-${field.name}`;
                const label = (
                  <FieldLabel htmlFor={id}>
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </FieldLabel>
                );
                return (
                  <Field data-invalid={fieldState.invalid} orientation={field.type === "boolean" ? "horizontal" : "vertical"}>
                    {field.type === "boolean" ? (
                      <>
                        <Switch id={id} checked={Boolean(input.value)} onCheckedChange={input.onChange} />
                        {label}
                      </>
                    ) : (
                      <>
                        {label}
                        <FieldInput field={field} id={id} value={input.value} onChange={input.onChange} invalid={fieldState.invalid} />
                      </>
                    )}
                    {field.description && <FieldDescription>{field.description}</FieldDescription>}
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                );
              }}
            />
          ))}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!onRespond}>
              {block.submitLabel ?? "Submit"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={!onRespond} onClick={() => onRespond?.(block.id, null)}>
              Skip
            </Button>
          </div>
        </FieldGroup>
      </form>
    </BlockCard>
  );
}

function FieldInput({
  field,
  id,
  value,
  onChange,
  invalid,
}: {
  field: FormField;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  invalid: boolean;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Textarea id={id} rows={3} aria-invalid={invalid} placeholder={field.placeholder} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      );
    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
            <SelectValue placeholder={field.placeholder ?? "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multiselect": {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <div id={id} role="group" className="grid gap-1.5 sm:grid-cols-2">
          {field.options?.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.has(o.value)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  if (checked) next.add(o.value);
                  else next.delete(o.value);
                  onChange([...next]);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    default:
      return (
        <Input
          id={id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          min={field.min}
          max={field.max}
          aria-invalid={invalid}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
