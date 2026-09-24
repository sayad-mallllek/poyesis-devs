"use client";

import type { ProjectDetail } from "@repo/contracts";
import { createContext, useContext, type ReactNode } from "react";

const ProjectContext = createContext<ProjectDetail | null>(null);

/** Supplied by the project layout once the detail has loaded, so tab pages never handle a missing project. */
export function ProjectProvider({ project, children }: { project: ProjectDetail; children: ReactNode }) {
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectDetail {
  const project = useContext(ProjectContext);
  if (!project) throw new Error("useProject must be used inside the project layout");
  return project;
}
