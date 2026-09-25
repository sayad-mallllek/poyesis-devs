"use client";

import type { ChatAttachment } from "@repo/contracts";
import { CircleAlert, X } from "lucide-react";
import { FileTypeIcon } from "@/features/projects/components/file-dropzone";
import { chatAttachmentDownloadUrl } from "@/lib/api/assistant";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DraftAttachment } from "./use-attachments";

const chip = "flex h-10 max-w-56 min-w-0 items-center gap-2 rounded-lg border bg-background px-2 text-left";

/** A file in the composer, with upload progress and a remove button. */
export function DraftAttachmentChip({ draft, onRemove }: { draft: DraftAttachment; onRemove: () => void }) {
  const { file, status } = draft;
  const failed = status === "error";
  return (
    <div className={cn(chip, "relative overflow-hidden pr-1", failed && "border-destructive/40")} title={draft.error ?? file.name}>
      {status === "uploading" && (
        <span
          className="absolute inset-y-0 left-0 bg-primary/10 transition-[width]"
          style={{ width: `${Math.round(draft.progress * 100)}%` }}
          aria-hidden
        />
      )}
      {failed ? (
        <CircleAlert className="relative size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <FileTypeIcon mimeType={file.type} fileName={file.name} className="relative size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="relative min-w-0 flex-1 leading-tight">
        <span className="block truncate text-xs font-medium">{file.name}</span>
        <span className={cn("block truncate text-[11px] text-muted-foreground", failed && "text-destructive")}>
          {failed
            ? "Upload failed"
            : status === "queued"
              ? "Waiting…"
              : status === "uploading"
                ? `${Math.round(draft.progress * 100)}% of ${formatBytes(file.size)}`
                : formatBytes(file.size)}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="relative flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-3.5" />
        <span className="sr-only">Remove {file.name}</span>
      </button>
    </div>
  );
}

/** A sent file; opens (downloads) the original. */
export function SentAttachmentChip({ attachment }: { attachment: ChatAttachment }) {
  return (
    <a
      href={chatAttachmentDownloadUrl(attachment.id)}
      className={cn(chip, "transition-colors hover:bg-muted/60")}
      title={attachment.hasText ? attachment.fileName : `${attachment.fileName} — no readable text for the assistant`}
    >
      <FileTypeIcon mimeType={attachment.mimeType} fileName={attachment.fileName} className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-xs font-medium">{attachment.fileName}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{formatBytes(attachment.sizeBytes)}</span>
      </span>
    </a>
  );
}
