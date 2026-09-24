"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { updateUserSchema, type UpdateUserInput, type UserDetail } from "@repo/contracts";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { DateInput, NumberInput } from "@/components/forms/number-input";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/client";
import { useUpdateUser } from "@/lib/api/users";
import { applyServerErrors, emptyToNull } from "@/lib/forms";

const EDITABLE = [
  "firstName",
  "lastName",
  "jobTitle",
  "department",
  "phone",
  "timezone",
  "avatarUrl",
  "weeklyCapacityHours",
  "hiredAt",
  "costRate",
  "bio",
] as const;
type EditableField = (typeof EDITABLE)[number];
type FormValues = Pick<UpdateUserInput, EditableField>;

const toDefaults = (user: UserDetail): FormValues => ({
  firstName: user.firstName,
  lastName: user.lastName,
  jobTitle: user.jobTitle ?? "",
  department: user.department ?? "",
  phone: user.phone ?? "",
  timezone: user.timezone,
  avatarUrl: user.avatarUrl ?? "",
  weeklyCapacityHours: user.weeklyCapacityHours,
  hiredAt: user.hiredAt,
  costRate: user.costRate ?? null,
  bio: user.bio ?? "",
});

/** Sends only the fields the principal may change, so partial rights never trip a 403. */
function normalize(values: FormValues, allowed: readonly EditableField[]): UpdateUserInput {
  const clean = emptyToNull(values);
  const payload = Object.fromEntries(allowed.map((f) => [f, clean[f]])) as UpdateUserInput;
  if (payload.timezone === null) delete payload.timezone;
  if (payload.weeklyCapacityHours === null) delete payload.weeklyCapacityHours;
  return payload;
}

export function EditProfileDialog({ user }: { user: UserDetail }) {
  const can = useCan();
  const allowed = EDITABLE.filter((f) => can("update", "User", { id: user.id }, f));
  const [open, setOpen] = useState(false);
  const update = useUpdateUser(user.id, { silent: true });
  const form = useForm<FormValues>({
    resolver: (values, ctx, options) =>
      arktypeResolver(updateUserSchema)(normalize(values, allowed), ctx, options),
    defaultValues: toDefaults(user),
  });

  if (allowed.length === 0) return null;
  const has = (field: EditableField) => allowed.includes(field);

  const submit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(normalize(values, allowed));
      toast.success("Profile updated");
      setOpen(false);
    } catch (error) {
      if (!applyServerErrors(form, error)) form.setError("root", { message: errorMessage(error) });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset(toDefaults(user));
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Pencil /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            {has("department") ? "Profile and staffing details." : "You can update your personal details."}
          </DialogDescription>
        </DialogHeader>
        <form id="edit-profile" onSubmit={submit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="firstName" label="First name">
              {(field) => <Input {...field} value={field.value ?? ""} />}
            </FormField>
            <FormField control={form.control} name="lastName" label="Last name">
              {(field) => <Input {...field} value={field.value ?? ""} />}
            </FormField>
            <FormField control={form.control} name="jobTitle" label="Job title">
              {(field) => <Input {...field} value={field.value ?? ""} />}
            </FormField>
            {has("department") && (
              <FormField control={form.control} name="department" label="Department">
                {(field) => <Input {...field} value={field.value ?? ""} />}
              </FormField>
            )}
            <FormField control={form.control} name="phone" label="Phone">
              {(field) => <Input {...field} value={field.value ?? ""} />}
            </FormField>
            <FormField control={form.control} name="timezone" label="Timezone">
              {(field) => <Input {...field} value={field.value ?? ""} placeholder="Europe/Paris" />}
            </FormField>
            <FormField control={form.control} name="avatarUrl" label="Avatar URL" className="sm:col-span-2">
              {(field) => <Input {...field} value={field.value ?? ""} placeholder="https://" />}
            </FormField>
            {has("weeklyCapacityHours") && (
              <FormField control={form.control} name="weeklyCapacityHours" label="Weekly capacity (hours)">
                {({ value, onChange, ...field }) => (
                  <NumberInput {...field} value={value} onChange={(v) => onChange(v ?? undefined)} min={0} max={80} />
                )}
              </FormField>
            )}
            {has("hiredAt") && (
              <FormField control={form.control} name="hiredAt" label="Hired on">
                {({ value, onChange, ...field }) => <DateInput {...field} value={value} onChange={onChange} />}
              </FormField>
            )}
            {has("costRate") && (
              <FormField control={form.control} name="costRate" label="Cost rate (per hour)" description="Admins only.">
                {({ value, onChange, ...field }) => (
                  <NumberInput {...field} value={value} onChange={onChange} min={0} step="0.01" />
                )}
              </FormField>
            )}
            <FormField control={form.control} name="bio" label="Bio" className="sm:col-span-2">
              {(field) => <Textarea rows={4} {...field} value={field.value ?? ""} />}
            </FormField>
          </FieldGroup>
          {form.formState.errors.root && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
