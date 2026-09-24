"use client";

import type { ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>;
  name: N;
  label?: ReactNode;
  description?: ReactNode;
  orientation?: "vertical" | "horizontal";
  className?: string;
  children: (field: ControllerRenderProps<T, N> & { id: string; "aria-invalid": boolean }) => ReactNode;
}

/** Binds a react-hook-form field to shadcn's Field layout with label and error. */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  orientation = "vertical",
  className,
  children,
}: FormFieldProps<T, N>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const id = `field-${name.replaceAll(".", "-")}`;
        return (
          <Field data-invalid={fieldState.invalid} orientation={orientation} className={className}>
            {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
            {children({ ...field, id, "aria-invalid": fieldState.invalid })}
            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
