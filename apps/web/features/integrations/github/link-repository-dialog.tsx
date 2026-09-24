"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { linkRepositorySchema, type LinkRepositoryInput } from "@repo/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { useLinkRepository } from "@/lib/api/integrations";
import { applyServerErrors } from "@/lib/forms";

export function LinkRepositoryDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const link = useLinkRepository(projectId);
  const form = useForm<LinkRepositoryInput>({
    resolver: arktypeResolver(linkRepositorySchema),
    defaultValues: { repository: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const repo = await link.mutateAsync(values);
      toast.success(`Linked ${repo.fullName}`);
      form.reset();
      setOpen(false);
    } catch (error) {
      if (!applyServerErrors(form, error)) form.setError("repository", { message: errorMessage(error) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Link repository
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Link a GitHub repository</DialogTitle>
            <DialogDescription>Pull requests, Actions runs, deployments and releases will show up on this project.</DialogDescription>
          </DialogHeader>
          <FormField control={form.control} name="repository" label="Repository" description="owner/name or a GitHub URL">
            {(field) => <Input autoFocus placeholder="acme/storefront" {...field} />}
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />} Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
