"use client";

import type { IntegrationProvider, IntegrationStatus } from "@repo/contracts";
import { CheckCircle2, CircleAlert, CircleDashed, RefreshCw, Unplug } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRemoveIntegration, useTestIntegration } from "@/lib/api/integrations";
import { formatRelative } from "@/lib/format";

function StatusLine({ status }: { status: IntegrationStatus }) {
  if (!status.configured) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CircleDashed className="size-4" /> Not connected
      </span>
    );
  }
  if (status.lastError) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-destructive">
        <CircleAlert className="size-4" /> Connection problem
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-success">
      <CheckCircle2 className="size-4" /> Connected
      {status.lastVerifiedAt && (
        <span className="text-muted-foreground">· verified {formatRelative(status.lastVerifiedAt)}</span>
      )}
    </span>
  );
}

/** Shared chrome for a provider: status, details, and connect/test/disconnect actions. */
export function IntegrationCard({
  provider,
  title,
  description,
  icon,
  status,
  details,
  form,
}: {
  provider: IntegrationProvider;
  title: string;
  description: string;
  icon: ReactNode;
  status: IntegrationStatus;
  details?: ReactNode;
  form: (close: () => void) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const test = useTestIntegration();
  const remove = useRemoveIntegration();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50">{icon}</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <StatusLine status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.lastError && (
          <Alert variant="destructive">
            <AlertDescription>{status.lastError}</AlertDescription>
          </Alert>
        )}
        {status.configured && !editing && (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Token</dt>
              <dd className="font-mono">•••• {status.tokenHint}</dd>
            </div>
            {details}
          </dl>
        )}
        {(editing || !status.configured) && form(() => setEditing(false))}
      </CardContent>
      {status.configured && !editing && (
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t">
          <ConfirmDialog
            trigger={
              <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive">
                <Unplug /> Disconnect
              </Button>
            }
            title={`Disconnect ${title}?`}
            description="Linked repositories and projects are kept, but their data can't be loaded until you reconnect."
            confirmLabel="Disconnect"
            destructive
            onConfirm={() => remove.mutate(provider, { onSuccess: () => toast.success(`${title} disconnected`) })}
          />
          <Button
            variant="outline"
            disabled={test.isPending}
            onClick={() =>
              test.mutate(provider, {
                onSuccess: (result) =>
                  result.lastError ? toast.error(result.lastError) : toast.success(`${title} connection works`),
              })
            }
          >
            {test.isPending ? <Spinner /> : <RefreshCw />} Test connection
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            Replace token
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
