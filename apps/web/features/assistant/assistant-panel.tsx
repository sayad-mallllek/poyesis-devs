"use client";

import { useQuery } from "@tanstack/react-query";
import { History, Maximize2, Minimize2, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { assistantStatusQuery, chatSessionsQuery, useCreateChatSession } from "@/lib/api/assistant";
import { useAssistantStore } from "@/lib/stores/assistant-store";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { SessionList } from "./session-list";
import { Suggestions } from "./suggestions";
import { useChat, type ChatPayload } from "./use-chat";
import { usePageContext } from "./use-page-context";

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClick}>
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The conversation UI. `layout="dock"` is the side panel; `layout="wide"`
 * shows the session list next to the chat (expanded dock and /assistant).
 */
export function AssistantPanel({ layout, onClose }: { layout: "dock" | "wide"; onClose?: () => void }) {
  const { activeSessionId, setActiveSession, expanded, setExpanded } = useAssistantStore();
  const sessions = useQuery(chatSessionsQuery);
  const status = useQuery(assistantStatusQuery);
  const create = useCreateChatSession();
  const context = usePageContext();
  const [historyOpen, setHistoryOpen] = useState(false);

  // A stale id (deleted elsewhere) falls back to a fresh conversation.
  const sessionId =
    activeSessionId && (!sessions.data || sessions.data.some((s) => s.id === activeSessionId)) ? activeSessionId : null;
  const chat = useChat(sessionId);
  const title = sessions.data?.find((s) => s.id === sessionId)?.title ?? "New conversation";
  const disabled = status.data?.enabled === false;

  const send = async (payload: ChatPayload) => {
    const id = sessionId ?? (await create.mutateAsync()).id;
    setActiveSession(id);
    await chat.send(id, payload);
  };

  const conversation = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="@container/assistant min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto h-full", layout === "wide" && "max-w-3xl")}>
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            onRespond={(formId, values) => void send({ formResponse: { formId, values } })}
            empty={<Suggestions context={context} onPick={(content) => void send({ content })} />}
          />
        </div>
      </div>
      {disabled && (
        <Alert className="mx-3 mb-2 w-auto">
          <AlertDescription>The assistant is not configured on the server (missing AI_API_KEY).</AlertDescription>
        </Alert>
      )}
      <div className={cn("mx-auto w-full", layout === "wide" && "max-w-3xl")}>
        <Composer
          isStreaming={chat.isStreaming}
          disabled={disabled}
          onStop={chat.stop}
          onSend={(content, attachments) => void send({ content: content || undefined, attachments })}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        <Sparkles className="ml-1 size-4 shrink-0 text-primary" />
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-medium">{title}</h2>
        {layout === "dock" && (
          <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <History />
                    <span className="sr-only">Conversations</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Conversations</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="flex h-96 w-72 flex-col p-0">
              <SessionList
                className="h-full"
                activeId={sessionId}
                onNew={() => {
                  setActiveSession(null);
                  setHistoryOpen(false);
                }}
                onSelect={(id) => {
                  setActiveSession(id);
                  setHistoryOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        <IconButton label="New conversation" onClick={() => setActiveSession(null)}>
          <Plus />
        </IconButton>
        {onClose && (
          <>
            <IconButton label={expanded ? "Exit full screen" : "Full screen"} onClick={() => setExpanded(!expanded)}>
              {expanded ? <Minimize2 /> : <Maximize2 />}
            </IconButton>
            <IconButton label="Close" onClick={onClose}>
              <X />
            </IconButton>
          </>
        )}
      </header>
      {layout === "wide" ? (
        <div className="flex min-h-0 flex-1">
          <SessionList
            className="hidden w-64 shrink-0 border-r md:flex"
            activeId={sessionId}
            onNew={() => setActiveSession(null)}
            onSelect={setActiveSession}
          />
          {conversation}
        </div>
      ) : (
        conversation
      )}
    </div>
  );
}
