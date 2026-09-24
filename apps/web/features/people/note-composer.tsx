"use client";

import type { NoteType } from "@repo/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectPicker } from "@/components/app/project-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNote } from "@/lib/api/notes";
import { NoteTypeSelect } from "./note-type-select";

export function NoteComposer({ userId }: { userId: string }) {
  const [type, setType] = useState<NoteType>("NOTE");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const create = useCreateNote(userId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    create.mutate(
      { type, content: content.trim(), projectId },
      {
        onSuccess: () => {
          setContent("");
          setProjectId(null);
          setType("NOTE");
          toast.success("Note added");
        },
      },
    );
  };

  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="note-content" className="sr-only">
            Note
          </label>
          <Textarea
            id="note-content"
            rows={3}
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a remark, kudos or a warning about this person…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <NoteTypeSelect value={type} onChange={setType} />
            <ProjectPicker
              value={projectId}
              onChange={(id) => setProjectId(id)}
              placeholder="Related project (optional)"
              clearable
              className="w-full sm:w-64"
            />
            <Button type="submit" className="ml-auto" disabled={!content.trim() || create.isPending}>
              {create.isPending && <Spinner />}
              Add note
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
