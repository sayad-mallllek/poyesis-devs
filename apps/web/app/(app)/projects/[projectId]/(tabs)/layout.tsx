"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectLayout } from "@/features/projects/detail/project-layout";

export default function ProjectTabsLayout({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectLayout projectId={projectId}>{children}</ProjectLayout>;
}
