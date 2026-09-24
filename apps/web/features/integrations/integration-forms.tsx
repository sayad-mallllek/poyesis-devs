"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import {
  configureGithubSchema,
  configureSentrySchema,
  type ConfigureGithubInput,
  type ConfigureSentryInput,
  type IntegrationStatus,
} from "@repo/contracts";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useConfigureIntegration } from "@/lib/api/integrations";
import { applyServerErrors } from "@/lib/forms";

/** Empty optional URLs are omitted so the API applies its defaults. */
const withoutBlank = <T extends Record<string, unknown>>(values: T): T =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "")) as T;

function Actions({ submitting, onCancel }: { submitting: boolean; onCancel?: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting && <Spinner />} Verify & save
      </Button>
    </div>
  );
}

export function GithubForm({ status, onDone }: { status: IntegrationStatus; onDone: () => void }) {
  const configure = useConfigureIntegration();
  const form = useForm<ConfigureGithubInput>({
    resolver: (values, ctx, options) => arktypeResolver(configureGithubSchema)(withoutBlank(values), ctx, options),
    defaultValues: { token: "", apiBaseUrl: status.config.apiBaseUrl ?? "" },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await configure.mutateAsync({ provider: "GITHUB", values: withoutBlank(values) });
      toast.success("GitHub connected");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form, error)) form.setError("token", { message: (error as Error).message });
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <FormField
          control={form.control}
          name="token"
          label="Personal access token"
          description="Fine-grained token with read access to contents, pull requests, actions and deployments."
        >
          {(field) => <Input type="password" autoComplete="off" placeholder="github_pat_…" {...field} />}
        </FormField>
        <FormField
          control={form.control}
          name="apiBaseUrl"
          label="API URL"
          description="Only for GitHub Enterprise Server, e.g. https://github.example.com/api/v3"
        >
          {(field) => <Input placeholder="https://api.github.com" {...field} value={field.value ?? ""} />}
        </FormField>
        <Actions submitting={form.formState.isSubmitting} onCancel={status.configured ? onDone : undefined} />
      </FieldGroup>
    </form>
  );
}

export function SentryForm({ status, onDone }: { status: IntegrationStatus; onDone: () => void }) {
  const configure = useConfigureIntegration();
  const form = useForm<ConfigureSentryInput>({
    resolver: (values, ctx, options) => arktypeResolver(configureSentrySchema)(withoutBlank(values), ctx, options),
    defaultValues: {
      token: "",
      organizationSlug: status.config.organizationSlug ?? "",
      baseUrl: status.config.baseUrl ?? "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await configure.mutateAsync({ provider: "SENTRY", values: withoutBlank(values) });
      toast.success("Sentry connected");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form, error)) form.setError("token", { message: (error as Error).message });
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <FormField
          control={form.control}
          name="token"
          label="Auth token"
          description="Organization token with project:read and event:read scopes."
        >
          {(field) => <Input type="password" autoComplete="off" placeholder="sntrys_…" {...field} />}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="organizationSlug" label="Organization slug">
            {(field) => <Input placeholder="my-company" {...field} />}
          </FormField>
          <FormField control={form.control} name="baseUrl" label="Sentry URL" description="Regional or self-hosted host">
            {(field) => <Input placeholder="https://sentry.io" {...field} value={field.value ?? ""} />}
          </FormField>
        </div>
        <Actions submitting={form.formState.isSubmitting} onCancel={status.configured ? onDone : undefined} />
      </FieldGroup>
    </form>
  );
}
