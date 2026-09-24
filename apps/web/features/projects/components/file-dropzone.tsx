"use client";

import {
  File as FileIcon,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { MAX_FILE_BYTES } from "@/lib/api/projects";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type FileKind = "image" | "video" | "sheet" | "archive" | "code" | "text" | "other";

function fileKind(mimeType: string, fileName: string): FileKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (/sheet|excel|csv/.test(mimeType) || ["csv", "xlsx", "xls"].includes(ext)) return "sheet";
  if (/zip|compressed|tar|gzip/.test(mimeType)) return "archive";
  if (/json|javascript|typescript|xml|html/.test(mimeType) || ["ts", "tsx", "js", "json", "yml", "yaml"].includes(ext)) return "code";
  if (mimeType.startsWith("text/") || /pdf|word|document|presentation/.test(mimeType)) return "text";
  return "other";
}

const FILE_ICONS: Record<FileKind, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  sheet: FileSpreadsheet,
  archive: FileArchive,
  code: FileCode,
  text: FileText,
  other: FileIcon,
};

export function FileTypeIcon({ mimeType, fileName, className }: { mimeType: string; fileName: string; className?: string }) {
  const Icon = FILE_ICONS[fileKind(mimeType, fileName)];
  return <Icon className={className} aria-hidden />;
}

/** Drag-and-drop (or click) file picker. Oversized files are rejected up front with a toast. */
export function FileDropzone({
  onFiles,
  disabled,
  compact,
  className,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length) {
      toast.error(`${tooBig.map((f) => f.name).join(", ")} exceed${tooBig.length === 1 ? "s" : ""} the ${formatBytes(MAX_FILE_BYTES)} limit`);
    }
    const ok = files.filter((f) => f.size <= MAX_FILE_BYTES);
    if (ok.length) onFiles(ok);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files);
  };

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors",
        compact ? "px-4 py-5" : "px-6 py-10",
        dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
        "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UploadCloud className="size-5" />
      </span>
      <span className="text-sm">
        <span className="font-medium text-primary">Click to upload</span> or drag and drop
      </span>
      <span className="text-xs text-muted-foreground">
        Briefs, specs, contracts… up to {formatBytes(MAX_FILE_BYTES)} each. Text is extracted so the AI assistant can read them.
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </label>
  );
}
