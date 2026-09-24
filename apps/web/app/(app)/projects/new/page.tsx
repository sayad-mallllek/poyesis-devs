import type { Metadata } from "next";
import { ProjectCreate } from "@/features/projects/project-create";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return <ProjectCreate />;
}
