"use client";

import { CheckCircle2, CircleAlert, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatBytes } from "@/lib/format";
import { FileDropzone, FileTypeIcon } from "../components/file-dropzone";
import { FormSection, type SectionMeta } from "./form-section";

export const ATTACHMENTS: SectionMeta = {
  id: "attachments",
  title: "Attachments",
  description: "Briefs, proposals and specs. They're uploaded right after the project is created.",
  icon: Paperclip,
};

export type UploadState = "pending" | "uploading" | "done" | "error";

export interface PendingFile {
  key: string;
  file: File;
  state: UploadState;
  error?: string;
}

export const toPendingFiles = (files: File[]): PendingFile[] =>
  files.map((file) => ({ key: crypto.randomUUID(), file, state: "pending" }));

function StateIcon({ state, error }: { state: UploadState; error?: string }) {
  if (state === "uploading") return <Spinner className="text-muted-foreground" />;
  if (state === "done") return <CheckCircle2 className="size-4 text-success" aria-label="Uploaded" />;
  if (state === "error") return <CircleAlert className="size-4 text-destructive" aria-label={error ?? "Failed"} />;
  return null;
}

export function AttachmentsSection({
  files,
  onChange,
  locked,
}: {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  /** True once uploading has started: the list becomes a progress report. */
  locked: boolean;
}) {
  return (
    <FormSection section={ATTACHMENTS}>
      <div className="space-y-3">
        {!locked && <FileDropzone compact onFiles={(added) => onChange([...files, ...toPendingFiles(added)])} />}
        {files.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {files.map(({ key, file, state, error }) => {
              return (
                <li key={key} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <FileTypeIcon mimeType={file.type} fileName={file.name} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{file.name}</span>
                    {state === "error" && error ? (
                      <span className="block text-xs text-destructive">{error}</span>
                    ) : (
                      <span className="block text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    )}
                  </span>
                  <StateIcon state={state} error={error} />
                  {!locked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() => onChange(files.filter((f) => f.key !== key))}
                    >
                      <X />
                      <span className="sr-only">Remove {file.name}</span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FormSection>
  );
}
