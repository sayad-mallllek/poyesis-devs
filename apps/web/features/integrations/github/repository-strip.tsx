"use client";

import type { GithubOverview, RepositoryLink } from "@repo/contracts";
import { AlertTriangle, ExternalLink, GitBranch, Lock, Star, X } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useUnlinkRepository } from "@/lib/api/integrations";
import { formatRelative } from "@/lib/format";

type RepoWithMeta = RepositoryLink & Partial<GithubOverview["repositories"][number]>;

export function RepositoryStrip({
  projectId,
  repositories,
  canManage,
}: {
  projectId: string;
  repositories: RepoWithMeta[];
  canManage: boolean;
}) {
  const unlink = useUnlinkRepository(projectId);
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {repositories.map((repo) => (
        <li key={repo.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
          <div className="min-w-0 flex-1 space-y-1">
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 truncate text-sm font-medium hover:text-primary"
            >
              {repo.isPrivate && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Private" />}
              <span className="truncate">{repo.fullName}</span>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
            </a>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {repo.defaultBranch && (
                <span className="flex items-center gap-1">
                  <GitBranch className="size-3" /> {repo.defaultBranch}
                </span>
              )}
              {repo.language && <span>{repo.language}</span>}
              {repo.stars != null && (
                <span className="flex items-center gap-1">
                  <Star className="size-3" /> {repo.stars}
                </span>
              )}
              {repo.pushedAt && <span>pushed {formatRelative(repo.pushedAt)}</span>}
            </p>
            {repo.error && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="size-3" /> {repo.error}
              </p>
            )}
          </div>
          {canManage && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="size-7 shrink-0">
                  <X />
                  <span className="sr-only">Unlink {repo.fullName}</span>
                </Button>
              }
              title={`Unlink ${repo.fullName}?`}
              description="The repository itself is not affected; its activity just stops showing on this project."
              confirmLabel="Unlink"
              destructive
              onConfirm={() => unlink.mutate(repo.id)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
