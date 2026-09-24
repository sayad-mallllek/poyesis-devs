"use client";

import { Plug } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/app/states";
import { Can } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";

/** The API answers 412 when a provider has no workspace credentials yet. */
export const isNotConfigured = (error: unknown) => error instanceof ApiError && error.status === 412;

export function NotConfigured({ provider }: { provider: "GitHub" | "Sentry" }) {
  return (
    <EmptyState
      icon={<Plug />}
      title={`${provider} isn't connected`}
      description={`An administrator needs to connect ${provider} in Settings → Integrations before data can be shown here.`}
      action={
        <Can action="manage" subject="Integration">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/integrations">Open integrations</Link>
          </Button>
        </Can>
      }
    />
  );
}
