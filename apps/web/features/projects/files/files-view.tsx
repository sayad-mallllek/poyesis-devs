"use client";

import type { Attachment } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Download, Paperclip, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/app/states";
import { ToneBadge } from "@/components/app/status-badges";
import { fullName } from "@/components/app/user-avatar";
import { useCan, useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { attachmentDownloadUrl, attachmentsQuery, MAX_FILES_PER_UPLOAD, useAttachmentMutations } from "@/lib/api/projects";
import { formatBytes, formatDateTime, formatRelative } from "@/lib/format";
import { FileDropzone, FileTypeIcon } from "../components/file-dropzone";
import { useProject } from "../detail/project-context";

function FileRow({ file, canDelete, onDelete }: { file: Attachment; canDelete: boolean; onDelete: () => void }) {
  const href = attachmentDownloadUrl(file.projectId, file.id);
  return (
    <li className="flex items-center gap-3 p-3 sm:px-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileTypeIcon mimeType={file.mimeType} fileName={file.fileName} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a href={href} className="truncate font-medium hover:text-primary" download>
            {file.fileName}
          </a>
          {file.hasExtractedText && (
            <ToneBadge tone="primary" className="py-0">
              <Sparkles aria-hidden /> AI-readable
            </ToneBadge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {formatBytes(file.sizeBytes)} · {fullName(file.uploadedBy)} ·{" "}
          <time dateTime={file.createdAt} title={formatDateTime(file.createdAt)}>
            {formatRelative(file.createdAt)}
          </time>
        </p>
      </div>
      <Button variant="ghost" size="icon-sm" asChild>
        <a href={href} download>
          <Download />
          <span className="sr-only">Download {file.fileName}</span>
        </a>
      </Button>
      {canDelete && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
              <Trash2 />
              <span className="sr-only">Delete {file.fileName}</span>
            </Button>
          }
          title={`Delete ${file.fileName}?`}
          description="The file and its extracted text are removed for everyone, including the AI assistant."
          confirmLabel="Delete"
          destructive
          onConfirm={onDelete}
        />
      )}
    </li>
  );
}

export function FilesView() {
  const project = useProject();
  const can = useCan();
  const { user } = useSession();
  const { data, error, isPending, refetch } = useQuery(attachmentsQuery(project.id));
  const { upload, remove } = useAttachmentMutations(project.id);
  const canUpload = can("create", "Attachment", { projectId: project.id, authorId: user.id });

  const onFiles = async (files: File[]) => {
    for (let i = 0; i < files.length; i += MAX_FILES_PER_UPLOAD) {
      const batch = files.slice(i, i + MAX_FILES_PER_UPLOAD);
      try {
        const uploaded = await upload.mutateAsync(batch);
        const readable = uploaded.filter((a) => a.hasExtractedText).length;
        toast.success(
          `${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded${readable ? ` · ${readable} readable by the AI` : ""}`,
        );
      } catch (e) {
        toast.error(`Upload failed: ${errorMessage(e)}`);
      }
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="files-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="files-title" className="text-lg font-semibold">
            Files
          </h2>
          <p className="text-sm text-muted-foreground">Text from PDFs, documents and notes is extracted for the AI assistant.</p>
        </div>
        {upload.isPending && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Uploading…
          </span>
        )}
      </div>
      {canUpload && <FileDropzone compact onFiles={onFiles} disabled={upload.isPending} />}
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : data.length === 0 ? (
        <EmptyState icon={<Paperclip />} title="No files yet" description="Briefs, contracts and specs you upload appear here." />
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {data.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                canDelete={can("delete", "Attachment", { projectId: project.id, authorId: file.uploadedBy.id })}
                onDelete={() =>
                  remove.mutate(file.id, {
                    onSuccess: () => toast.success(`${file.fileName} deleted`),
                    onError: (e) => toast.error(errorMessage(e)),
                  })
                }
              />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
