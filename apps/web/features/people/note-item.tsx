"use client";

import type { NoteType, UserNote } from "@repo/contracts";
import { FolderKanban, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { NOTE_TONE, ToneBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteNote, useUpdateNote } from "@/lib/api/notes";
import { formatDateTime, formatRelative, humanize } from "@/lib/format";
import { NoteTypeSelect } from "./note-type-select";

export function NoteItem({ note }: { note: UserNote }) {
  const can = useCan();
  const resource = { userId: note.userId, authorId: note.author.id };
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<NoteType>(note.type);
  const [content, setContent] = useState(note.content);
  const update = useUpdateNote(note.userId);
  const remove = useDeleteNote(note.userId);

  const save = () =>
    update.mutate(
      { id: note.id, type, content: content.trim() },
      { onSuccess: () => setEditing(false) },
    );

  return (
    <li className="group/note relative flex gap-3 pb-6 last:pb-0">
      <span aria-hidden className="absolute top-10 bottom-0 left-4 w-px bg-border group-last/note:hidden" />
      <UserAvatar user={note.author} className="relative" />
      <div className="min-w-0 flex-1 rounded-lg border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{fullName(note.author)}</span>
          <ToneBadge tone={NOTE_TONE[note.type]}>{humanize(note.type)}</ToneBadge>
          {note.project && (
            <Link
              href={`/projects/${note.project.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <FolderKanban className="size-3.5" />
              {note.project.name}
            </Link>
          )}
          <time dateTime={note.createdAt} title={formatDateTime(note.createdAt)} className="text-xs text-muted-foreground">
            {formatRelative(note.createdAt)}
            {note.updatedAt !== note.createdAt && " · edited"}
          </time>
          {!editing && (
            <span className="ml-auto flex gap-0.5">
              {can("update", "UserNote", resource) && (
                <Button variant="ghost" size="icon-xs" onClick={() => setEditing(true)}>
                  <Pencil />
                  <span className="sr-only">Edit note</span>
                </Button>
              )}
              {can("delete", "UserNote", resource) && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-xs" className="hover:text-destructive">
                      <Trash2 />
                      <span className="sr-only">Delete note</span>
                    </Button>
                  }
                  title="Delete this note?"
                  description="This cannot be undone."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => remove.mutate(note.id, { onSuccess: () => toast.success("Note deleted") })}
                />
              )}
            </span>
          )}
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              rows={3}
              aria-label="Note"
              maxLength={5000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <NoteTypeSelect value={type} onChange={setType} />
              <Button
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  setEditing(false);
                  setType(note.type);
                  setContent(note.content);
                }}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={!content.trim() || update.isPending}>
                {update.isPending && <Spinner />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
        )}
      </div>
    </li>
  );
}
