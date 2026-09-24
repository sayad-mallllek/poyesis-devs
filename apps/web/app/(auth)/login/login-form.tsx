"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { loginSchema, type LoginInput } from "@repo/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { login, sessionQuery } from "@/lib/api/session";

/** Only allow same-origin relative redirects. */
const safeNext = (next: string | null) => (next?.startsWith("/") && !next.startsWith("//") ? next : "/");

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const form = useForm<LoginInput>({
    resolver: arktypeResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    meta: { silent: true },
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQuery.queryKey, session);
      router.replace(safeNext(params.get("next")));
    },
  });

  return (
    <form className="mt-8" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <FieldGroup>
        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}
        <FormField control={form.control} name="email" label="Email">
          {(field) => <Input type="email" autoComplete="email" autoFocus {...field} />}
        </FormField>
        <FormField control={form.control} name="password" label="Password">
          {(field) => <Input type="password" autoComplete="current-password" {...field} />}
        </FormField>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
