"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading / error / empty / list states for upstream (GitHub, Sentry) lists. */
export function ActivityPanel<T>({
  query,
  empty,
  children,
}: {
  query: UseQueryResult<T[]>;
  empty: string;
  children: (items: T[]) => ReactNode;
}) {
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data) {
    return (
      <Card className="gap-3 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </Card>
    );
  }
  if (query.data.length === 0) return <EmptyState icon={<Inbox />} title={empty} />;
  return <Card className="py-0">{children(query.data)}</Card>;
}
