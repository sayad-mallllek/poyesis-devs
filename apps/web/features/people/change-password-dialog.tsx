"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from "@repo/contracts";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
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
import { errorMessage } from "@/lib/api/client";
import { useChangePassword } from "@/lib/api/users";
import { applyServerErrors } from "@/lib/forms";

const changePasswordWithConfirmation = changePasswordSchema
  .and({ confirmPassword: "string" })
  .narrow(
    (values, ctx) =>
      values.confirmPassword === values.newPassword ||
      ctx.reject({ path: ["confirmPassword"], message: "Passwords don't match" }),
  );
type FormValues = typeof changePasswordWithConfirmation.infer;

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const change = useChangePassword({ silent: true });
  const form = useForm<FormValues>({
    resolver: arktypeResolver(changePasswordWithConfirmation),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const submit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      toast.success("Password changed");
      setOpen(false);
    } catch (error) {
      // The API answers 400 without field issues when the current password is wrong.
      if (!applyServerErrors(form, error)) form.setError("currentPassword", { message: errorMessage(error) });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRound /> Change password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Use at least {PASSWORD_MIN_LENGTH} characters, including a letter and a digit.
          </DialogDescription>
        </DialogHeader>
        <form id="change-password" onSubmit={submit} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="currentPassword" label="Current password">
              {(field) => <Input type="password" autoComplete="current-password" {...field} />}
            </FormField>
            <FormField control={form.control} name="newPassword" label="New password">
              {(field) => <Input type="password" autoComplete="new-password" {...field} />}
            </FormField>
            <FormField control={form.control} name="confirmPassword" label="Confirm new password">
              {(field) => <Input type="password" autoComplete="new-password" {...field} />}
            </FormField>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="change-password" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Update password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
