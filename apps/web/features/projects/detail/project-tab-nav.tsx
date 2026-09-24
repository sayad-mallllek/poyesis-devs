"use client";

import type { ProjectDetail } from "@repo/contracts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCan } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";
import { PROJECT_TABS, projectTabHref } from "../project-tabs";

export function ProjectTabNav({ project }: { project: ProjectDetail }) {
  const pathname = usePathname();
  const can = useCan();
  const base = `/projects/${project.id}`;
  const tabs = PROJECT_TABS.filter((t) => !t.requires || can(t.requires.action, t.requires.subject, { projectId: project.id }));

  return (
    <nav aria-label="Project sections" className="-mx-4 mb-6 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const href = projectTabHref(project.id, tab);
          const active = tab.segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
          const count = tab.count?.(project);
          const Icon = tab.icon;
          return (
            <li key={tab.segment || "overview"}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-t-md px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full",
                  active ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {tab.label}
                {!!count && (
                  <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
