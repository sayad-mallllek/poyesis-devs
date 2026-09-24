"use client";

import { useParams } from "next/navigation";
import { ProjectSettings } from "@/features/projects/project-settings";

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectSettings projectId={projectId} />;
}
