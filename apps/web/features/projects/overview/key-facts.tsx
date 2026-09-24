import type { ProjectDetail } from "@repo/contracts";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHours, formatMoney, humanize } from "@/lib/format";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

export function KeyFacts({ project }: { project: ProjectDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key facts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="divide-y">
          <Fact label="Type">{humanize(project.type)}</Fact>
          <Fact label="Billing">{humanize(project.billingModel)}</Fact>
          <Fact label="Budget">{formatMoney(project.budgetAmount, project.currency)}</Fact>
          <Fact label="Hourly rate">
            {project.hourlyRate !== null ? `${formatMoney(project.hourlyRate, project.currency)}/h` : "—"}
          </Fact>
          <Fact label="Estimate">{formatHours(project.estimatedHours)}</Fact>
          <Fact label="Start">{formatDate(project.startDate)}</Fact>
          <Fact label="Target end">{formatDate(project.targetEndDate)}</Fact>
          {project.actualEndDate && <Fact label="Ended">{formatDate(project.actualEndDate)}</Fact>}
        </dl>
        {project.techStack.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tech stack</h3>
            <Chips items={project.techStack} />
          </div>
        )}
        {project.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tags</h3>
            <Chips items={project.tags.map((t) => `#${t}`)} />
          </div>
        )}
        {project.links.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Links</h3>
            <ul className="space-y-1">
              {project.links.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{link.label}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{link.url.replace(/^https?:\/\//, "")}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
