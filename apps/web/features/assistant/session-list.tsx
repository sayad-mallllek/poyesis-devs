"use client";

import type { ChatSession } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { chatSessionsQuery, useDeleteChatSession, useRenameChatSession } from "@/lib/api/assistant";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

function SessionRow({
  session,
  active,
  onSelect,
  onDeleted,
}: {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const rename = useRenameChatSession();
  const remove = useDeleteChatSession();

  const commit = () => {
    setEditing(false);
    const value = title.trim();
    if (value && value !== session.title) rename.mutate({ id: session.id, title: value });
    else setTitle(session.title);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={title}
        className="h-8"
        aria-label="Conversation title"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setTitle(session.title);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-2 py-1.5 text-left">
        <span className="block truncate text-sm">{session.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{formatRelative(session.updatedAt)}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100">
            <MoreHorizontal />
            <span className="sr-only">Conversation actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => remove.mutate(session.id, { onSuccess: onDeleted })}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SessionList({
  activeId,
  onSelect,
  onNew,
  className,
}: {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  className?: string;
}) {
  const { data, isPending } = useQuery(chatSessionsQuery);
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="p-2">
        <Button variant="outline" size="sm" className="w-full justify-start" onClick={onNew}>
          <Plus /> New conversation
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)
        ) : data?.length ? (
          data.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              active={session.id === activeId}
              onSelect={() => onSelect(session.id)}
              onDeleted={() => session.id === activeId && onSelect(null)}
            />
          ))
        ) : (
          <p className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" /> No conversations yet
          </p>
        )}
      </div>
    </div>
  );
}
