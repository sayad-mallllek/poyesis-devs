"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { sentryAvailableProjectsQuery, useLinkSentryProject } from "@/lib/api/integrations";

export function LinkSentryDialog({ projectId, linkedSlugs }: { projectId: string; linkedSlugs: string[] }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [environment, setEnvironment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const available = useQuery({ ...sentryAvailableProjectsQuery, enabled: open });
  const link = useLinkSentryProject(projectId);
  const options = available.data?.filter((p) => !linkedSlugs.includes(p.slug)) ?? [];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug.trim()) return setError("Choose a Sentry project");
    try {
      const created = await link.mutateAsync({ projectSlug: slug.trim(), environment: environment.trim() || null });
      toast.success(`Linked ${created.name ?? created.projectSlug}`);
      setOpen(false);
      setSlug("");
      setEnvironment("");
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Link Sentry project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Link a Sentry project</DialogTitle>
            <DialogDescription>Unresolved issues from this Sentry project will appear on the Errors tab.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="sentry-project">Sentry project</FieldLabel>
              {available.data ? (
                <Select value={slug} onValueChange={setSlug}>
                  <SelectTrigger id="sentry-project" className="w-full">
                    <SelectValue placeholder={options.length ? "Select a project" : "All projects are linked"} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {p.name} <span className="text-muted-foreground">· {p.platform ?? p.slug}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="sentry-project"
                  placeholder={available.isPending ? "Loading projects…" : "project-slug"}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              )}
              {available.error && <FieldDescription>Couldn&apos;t list projects ({errorMessage(available.error)}); type the slug instead.</FieldDescription>}
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="sentry-environment">Environment</FieldLabel>
              <Input id="sentry-environment" placeholder="production (optional)" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
              <FieldDescription>Only show issues from this environment.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={link.isPending}>
              {link.isPending && <Spinner />} Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
