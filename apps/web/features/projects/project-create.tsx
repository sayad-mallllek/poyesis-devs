"use client";

import type { Attachment, ProjectDetail } from "@repo/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/providers/session-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { MAX_FILES_PER_UPLOAD, projectKeys, useCreateProject } from "@/lib/api/projects";
import { ATTACHMENTS, AttachmentsSection, type PendingFile } from "./form/attachments-section";
import { ProjectForm } from "./form/project-form";
import { normalizeCreate } from "./form/values";

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

export function ProjectCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const create = useCreateProject();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [created, setCreated] = useState<ProjectDetail | null>(null);
  const [uploading, setUploading] = useState(false);

  const mark = (keys: string[], patch: Partial<PendingFile>) =>
    setFiles((current) => current.map((f) => (keys.includes(f.key) ? { ...f, ...patch } : f)));

  /** Uploads in API-sized batches so one failing batch doesn't sink the rest. */
  async function uploadAll(projectId: string, queue: PendingFile[]) {
    setUploading(true);
    let failed = 0;
    for (const batch of chunk(queue, MAX_FILES_PER_UPLOAD)) {
      const keys = batch.map((f) => f.key);
      mark(keys, { state: "uploading", error: undefined });
      try {
        await api.upload<Attachment[]>(`projects/${projectId}/attachments`, batch.map((f) => f.file));
        mark(keys, { state: "done" });
      } catch (error) {
        failed += batch.length;
        mark(keys, { state: "error", error: errorMessage(error) });
      }
    }
    setUploading(false);
    await Promise.all(
      [projectKeys.attachments(projectId), projectKeys.detail(projectId)].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
    return failed;
  }

  async function finish(project: ProjectDetail, failed: number) {
    if (failed === 0) {
      toast.success(`${project.name} created`);
      router.push(`/projects/${project.id}`);
    } else {
      toast.error(`${failed} file${failed === 1 ? "" : "s"} could not be uploaded`);
    }
  }

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title="New project"
        description="Capture as much context as you can: the AI assistant uses all of it for analysis and planning."
        back={{ href: "/projects", label: "Projects" }}
      />
      {created && !uploading && files.some((f) => f.state === "error") && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertTitle>{created.name} was created, but some files failed to upload</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => finish(created, await uploadAll(created.id, files.filter((f) => f.state === "error")))}
              >
                Retry failed uploads
              </Button>
              <Button size="sm" onClick={() => router.push(`/projects/${created.id}/files`)}>
                Continue to project
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <ProjectForm
        owner={user}
        submitLabel={created ? "Project created" : files.length ? "Create project & upload files" : "Create project"}
        busy={uploading || !!created}
        onSubmit={async (values) => {
          const project = await create.mutateAsync(normalizeCreate(values));
          setCreated(project);
          const failed = files.length ? await uploadAll(project.id, files) : 0;
          await finish(project, failed);
        }}
        extraSection={{
          meta: ATTACHMENTS,
          node: <AttachmentsSection files={files} onChange={setFiles} locked={!!created || uploading} />,
        }}
      />
    </PageContainer>
  );
}
