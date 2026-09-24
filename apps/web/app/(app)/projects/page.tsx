import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsList } from "@/features/projects/list/projects-list";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsList />
    </Suspense>
  );
}
