"use client";

import { MAX_CHAT_ATTACHMENT_BYTES, MAX_CHAT_ATTACHMENTS, type ChatAttachment } from "@repo/contracts";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/client";
import { deleteChatAttachment, uploadChatAttachment } from "@/lib/api/assistant";
import { formatBytes } from "@/lib/format";

/** Large files are held in memory server-side while uploading; don't stack too many. */
const PARALLEL_UPLOADS = 2;

export interface DraftAttachment {
  key: string;
  file: File;
  status: "queued" | "uploading" | "ready" | "error";
  progress: number;
  attachment?: ChatAttachment;
  error?: string;
}

let nextKey = 0;

/**
 * Files picked in the composer. Each uploads on its own as soon as it is
 * added, so sending only has to reference the uploaded ids.
 */
export function useAttachments() {
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const latest = useRef(drafts);
  useLayoutEffect(() => {
    latest.current = drafts;
  }, [drafts]);

  const update = useCallback((key: string, patch: Partial<DraftAttachment>) => {
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }, []);

  useEffect(() => {
    const active = drafts.filter((d) => d.status === "uploading").length;
    const next = drafts.filter((d) => d.status === "queued" && !controllers.current.has(d.key));
    for (const draft of next.slice(0, Math.max(0, PARALLEL_UPLOADS - active))) {
      const controller = new AbortController();
      controllers.current.set(draft.key, controller);
      update(draft.key, { status: "uploading" });
      uploadChatAttachment(draft.file, (progress) => update(draft.key, { progress }), controller.signal)
        .then((attachment) => update(draft.key, { status: "ready", progress: 1, attachment }))
        .catch((error: unknown) => {
          if (!controller.signal.aborted) update(draft.key, { status: "error", error: errorMessage(error) });
        })
        .finally(() => controllers.current.delete(draft.key));
    }
  }, [drafts, update]);

  // Unsent uploads are useless once the composer is gone.
  useEffect(
    () => () => {
      controllers.current.forEach((c) => c.abort());
      latest.current.forEach((d) => d.attachment && void deleteChatAttachment(d.attachment.id).catch(() => undefined));
    },
    [],
  );

  const add = useCallback((files: File[]) => {
    if (!files.length) return;
    const tooBig = files.filter((f) => f.size > MAX_CHAT_ATTACHMENT_BYTES);
    if (tooBig.length) {
      toast.error(
        `${tooBig.map((f) => f.name).join(", ")} exceed${tooBig.length === 1 ? "s" : ""} the ${formatBytes(MAX_CHAT_ATTACHMENT_BYTES)} limit`,
      );
    }
    const accepted = files.filter((f) => f.size <= MAX_CHAT_ATTACHMENT_BYTES);
    const room = MAX_CHAT_ATTACHMENTS - latest.current.length;
    if (accepted.length > room) toast.error(`You can attach up to ${MAX_CHAT_ATTACHMENTS} files per message`);
    const added = accepted
      .slice(0, Math.max(0, room))
      .map((file): DraftAttachment => ({ key: `draft-${nextKey++}`, file, status: "queued", progress: 0 }));
    if (added.length) setDrafts((list) => [...list, ...added]);
  }, []);

  const remove = useCallback((key: string) => {
    const draft = latest.current.find((d) => d.key === key);
    controllers.current.get(key)?.abort();
    if (draft?.attachment) void deleteChatAttachment(draft.attachment.id).catch(() => undefined);
    setDrafts((list) => list.filter((d) => d.key !== key));
  }, []);

  /** Forgets the drafts after they were sent (the server now owns them). */
  const clear = useCallback(() => setDrafts([]), []);

  return {
    drafts,
    ready: drafts.flatMap((d) => (d.attachment ? [d.attachment] : [])),
    isUploading: drafts.some((d) => d.status === "queued" || d.status === "uploading"),
    add,
    remove,
    clear,
  };
}
