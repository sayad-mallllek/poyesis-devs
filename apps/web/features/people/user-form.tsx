"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createUserSchema, PASSWORD_MIN_LENGTH, type CreateUserInput } from "@repo/contracts";
import { Dices } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { DateInput, NumberInput } from "@/components/forms/number-input";
import { Can } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, errorMessage } from "@/lib/api/client";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { RoleSelect } from "./role-select";

type FormValues = CreateUserInput;

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Readable temporary password that always satisfies the letter + digit rule. */
function generatePassword(length = PASSWORD_MIN_LENGTH + 4) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  const chars = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]);
  chars[0] = "k";
  chars[1] = String(2 + (bytes[1]! % 8));
  return chars.join("");
}

const defaults = (): FormValues => ({
  email: "",
  firstName: "",
  lastName: "",
  role: "MEMBER",
  password: "",
  jobTitle: "",
  department: "",
  phone: "",
  weeklyCapacityHours: 40,
  costRate: null,
  hiredAt: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

function normalize(values: FormValues): CreateUserInput {
  const { weeklyCapacityHours, ...rest } = emptyToNull(values);
  return {
    ...rest,
    email: values.email.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    timezone: values.timezone?.trim() || undefined,
    ...(weeklyCapacityHours != null && { weeklyCapacityHours }),
  };
}

export function UserForm({ onSubmit }: { onSubmit: (input: CreateUserInput) => Promise<unknown> }) {
  const form = useForm<FormValues>({
    resolver: (values, ctx, options) => arktypeResolver(createUserSchema)(normalize(values), ctx, options),
    defaultValues: defaults(),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(normalize(values));
    } catch (error) {
      if (applyServerErrors(form, error)) return;
      // A 409 means the email is taken; anything else is shown above the submit button.
      const field = error instanceof ApiError && error.status === 409 ? "email" : "root";
      form.setError(field, { message: errorMessage(error) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>How this person signs in and appears across projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="firstName" label="First name">
                {(field) => <Input {...field} autoFocus autoComplete="off" />}
              </FormField>
              <FormField control={form.control} name="lastName" label="Last name">
                {(field) => <Input {...field} autoComplete="off" />}
              </FormField>
              <FormField control={form.control} name="email" label="Work email" className="sm:col-span-2">
                {(field) => <Input type="email" {...field} autoComplete="off" placeholder="name@company.com" />}
              </FormField>
              <FormField
                control={form.control}
                name="password"
                label="Temporary password"
                description={`At least ${PASSWORD_MIN_LENGTH} characters with a letter and a digit. Share it securely; they can change it from their profile.`}
                className="sm:col-span-2"
              >
                {(field) => (
                  <InputGroup>
                    <InputGroupInput {...field} autoComplete="new-password" spellCheck={false} className="font-mono" />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="xs"
                        onClick={() => form.setValue("password", generatePassword(), { shouldValidate: true })}
                      >
                        <Dices /> Generate
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                )}
              </FormField>
              <FormField control={form.control} name="jobTitle" label="Job title">
                {(field) => <Input {...field} value={field.value ?? ""} placeholder="e.g. Senior engineer" />}
              </FormField>
              <FormField control={form.control} name="department" label="Department">
                {(field) => <Input {...field} value={field.value ?? ""} placeholder="e.g. Engineering" />}
              </FormField>
              <FormField control={form.control} name="phone" label="Phone">
                {(field) => <Input {...field} value={field.value ?? ""} />}
              </FormField>
              <FormField control={form.control} name="timezone" label="Timezone">
                {(field) => <Input {...field} value={field.value ?? ""} placeholder="Europe/Paris" />}
              </FormField>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Access & availability</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FormField control={form.control} name="role" label="Role">
                {({ value, onChange, id, ...field }) => (
                  <RoleSelect id={id} value={value} onChange={onChange} aria-invalid={field["aria-invalid"]} />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="weeklyCapacityHours"
                label="Weekly capacity (hours)"
                description="Used to compute availability in the schedule."
              >
                {({ value, onChange, ...field }) => (
                  <NumberInput {...field} value={value} onChange={(v) => onChange(v ?? undefined)} min={0} max={80} />
                )}
              </FormField>
              <FormField control={form.control} name="hiredAt" label="Hired on">
                {({ value, onChange, ...field }) => <DateInput {...field} value={value} onChange={onChange} />}
              </FormField>
              <Can action="update" subject="User" field="costRate">
                <FormField
                  control={form.control}
                  name="costRate"
                  label="Cost rate (per hour)"
                  description="Only visible to administrators."
                >
                  {({ value, onChange, ...field }) => (
                    <NumberInput {...field} value={value} onChange={onChange} min={0} step="0.01" />
                  )}
                </FormField>
              </Can>
            </FieldGroup>
          </CardContent>
        </Card>
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Create person
        </Button>
      </div>
    </form>
  );
}
