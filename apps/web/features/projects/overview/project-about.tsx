import type { ProjectDetail } from "@repo/contracts";
import { FileText } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "../components/markdown";

const SCOPE_FIELDS = [
  ["objectives", "Objectives"],
  ["successCriteria", "Success criteria"],
  ["scope", "In scope"],
  ["outOfScope", "Out of scope"],
  ["assumptions", "Assumptions"],
  ["constraints", "Constraints"],
] as const satisfies ReadonlyArray<readonly [keyof ProjectDetail, string]>;

export function ProjectAbout({ project, canEdit }: { project: ProjectDetail; canEdit: boolean }) {
  const scope = SCOPE_FIELDS.filter(([key]) => project[key]);
  if (!project.description && scope.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<FileText />}
            title="No description yet"
            description="A description, objectives and scope give the team and the AI assistant the context they need."
            action={
              canEdit ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}/settings`}>Add details</Link>
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
        {project.summary && <p className="text-sm text-muted-foreground">{project.summary}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {project.description && <Markdown>{project.description}</Markdown>}
        {scope.length > 0 && (
          <dl className="grid gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-2">
            {scope.map(([key, label]) => (
              <div key={key} className="min-w-0 space-y-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd>
                  <Markdown>{project[key] ?? ""}</Markdown>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
