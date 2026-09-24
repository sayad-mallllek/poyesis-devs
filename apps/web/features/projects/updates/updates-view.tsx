"use client";

import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/app/states";
import { HEALTH_TONE, TONE_DOT } from "@/components/app/status-badges";
import { useCan, useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { statusUpdatesQuery } from "@/lib/api/projects";
import { cn } from "@/lib/utils";
import { useProject } from "../detail/project-context";
import { StatusUpdateDialog } from "../detail/status-update-dialog";
import { StatusUpdateItem } from "./status-update-item";

export function UpdatesView() {
  const project = useProject();
  const can = useCan();
  const { user } = useSession();
  const { data, error, isPending, refetch } = useQuery(statusUpdatesQuery(project.id));
  const canPost = can("create", "StatusUpdate", { projectId: project.id, authorId: user.id });

  const postButton = canPost && (
    <StatusUpdateDialog
      project={project}
      trigger={
        <Button>
          <Megaphone /> Post update
        </Button>
      }
    />
  );

  return (
    <section className="space-y-4" aria-labelledby="updates-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="updates-title" className="text-lg font-semibold">
            Status updates
          </h2>
          <p className="text-sm text-muted-foreground">Each update records the project&apos;s health and progress at that point.</p>
        </div>
        {postButton}
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : data.length === 0 ? (
        <EmptyState icon={<Megaphone />} title="No updates yet" description="Share health, progress and blockers with the team." action={postButton || undefined} />
      ) : (
        <Card>
          <CardContent>
            <ol className="relative space-y-6">
              {data.map((update, i) => (
                <li key={update.id} className="relative pl-6">
                  {/* Timeline rail, colored at each node by the reported health. */}
                  {i < data.length - 1 && <span aria-hidden className="absolute top-4 bottom-[-1.5rem] left-[5px] w-px bg-border" />}
                  <span
                    aria-hidden
                    className={cn("absolute top-2.5 left-0 size-[11px] rounded-full ring-4 ring-card", TONE_DOT[HEALTH_TONE[update.health]])}
                  />
                  <StatusUpdateItem update={update} />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
