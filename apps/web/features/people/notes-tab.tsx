"use client";

import { NOTE_TYPES, type NoteType } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { userNotesQuery } from "@/lib/api/notes";
import { humanize } from "@/lib/format";
import { NoteComposer } from "./note-composer";
import { NoteItem } from "./note-item";

export function NotesTab({ userId }: { userId: string }) {
  const can = useCan();
  const { data, isPending, error, refetch } = useQuery(userNotesQuery(userId));
  const [filter, setFilter] = useState<NoteType | "">("");
  const notes = filter ? data?.filter((n) => n.type === filter) : data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {can("create", "UserNote", { userId }) && <NoteComposer userId={userId} />}
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title="No notes yet"
          description="Remarks, kudos and warnings are visible to managers and administrators only."
        />
      ) : (
        <>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={filter}
            onValueChange={(v) => setFilter(v as NoteType | "")}
            aria-label="Filter notes by type"
            className="flex-wrap"
          >
            {NOTE_TYPES.map((type) => (
              <ToggleGroupItem key={type} value={type}>
                {humanize(type)}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {data.filter((n) => n.type === type).length}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {notes?.length ? (
            <ol>
              {notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No {humanize(filter).toLowerCase()} notes.</p>
          )}
        </>
      )}
    </div>
  );
}
