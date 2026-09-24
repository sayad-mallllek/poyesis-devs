import { type } from "arktype";
import type { IsoDate, IsoDateTime } from "./common.js";

/**
 * Generative UI. The assistant renders these blocks through dedicated tools
 * (`render_chart`, `ask_user`, …) instead of describing data in prose. The web
 * app owns one React component per `kind`.
 */

export type UiTone = "default" | "positive" | "warning" | "danger" | "info";

export interface ChartBlock {
  kind: "chart";
  chartType: "bar" | "line" | "area" | "pie";
  title: string;
  description?: string;
  /** Key of the category / x-axis value in each datum. */
  xKey: string;
  series: Array<{ key: string; label: string }>;
  data: Array<Record<string, string | number | null>>;
  unit?: string;
  stacked?: boolean;
}

export interface StatsBlock {
  kind: "stats";
  title?: string;
  items: Array<{
    label: string;
    value: string | number;
    hint?: string;
    tone?: UiTone;
  }>;
}

export interface TableBlock {
  kind: "table";
  title?: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
  rows: Array<Record<string, string | number | boolean | null>>;
}

export interface EntityListBlock {
  kind: "entityList";
  title?: string;
  entity: "project" | "user" | "client";
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    badge?: string;
    tone?: UiTone;
  }>;
}

export interface TimelineBlock {
  kind: "timeline";
  title?: string;
  items: Array<{
    date: IsoDate;
    label: string;
    description?: string;
    tone?: UiTone;
  }>;
}

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "boolean";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number | boolean | string[] | null;
  min?: number;
  max?: number;
}

/** Asks the user for structured input; the answer comes back as the next turn. */
export interface FormBlock {
  kind: "form";
  id: string;
  title: string;
  description?: string;
  submitLabel?: string;
  fields: FormField[];
}

/** Asks for an explicit go/no-go before a sensitive action. */
export interface ConfirmBlock {
  kind: "confirm";
  id: string;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}

export type UiBlock =
  | ChartBlock
  | StatsBlock
  | TableBlock
  | EntityListBlock
  | TimelineBlock
  | FormBlock
  | ConfirmBlock;

export type UiBlockKind = UiBlock["kind"];

// ── Messages ──────────────────────────────────────────────────────────────

export type ToolCallStatus = "running" | "success" | "error";

export type MessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool";
      toolCallId: string;
      name: string;
      /** Human readable label, e.g. "Creating user". */
      label: string;
      args: unknown;
      status: ToolCallStatus;
      error?: string;
    }
  | { type: "ui"; block: UiBlock }
  | {
      type: "formResponse";
      formId: string;
      /** `null` means the user dismissed / declined. */
      values: Record<string, unknown> | null;
    };

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  createdAt: IsoDateTime;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  lastMessagePreview: string | null;
}

export const createChatSessionSchema = type({ "title?": "0 < string <= 120" });
export type CreateChatSessionInput = typeof createChatSessionSchema.infer;

export const renameChatSessionSchema = type({ title: "0 < string <= 120" });
export type RenameChatSessionInput = typeof renameChatSessionSchema.infer;

/** Where the user currently is in the app, so "this project" resolves. */
export const chatPageContextSchema = type({
  pathname: "string <= 500",
  "projectId?": "string",
  "userId?": "string",
  "clientId?": "string",
});
export type ChatPageContext = typeof chatPageContextSchema.infer;

export const sendChatMessageSchema = type({
  "content?": "string <= 20000",
  "formResponse?": {
    formId: "string > 0",
    values: "Record<string, unknown> | null",
  },
  "context?": chatPageContextSchema,
}).narrow(
  (m, ctx) =>
    !!m.content?.trim() ||
    !!m.formResponse ||
    ctx.reject({ path: ["content"], expected: "a message or a form response" }),
);
export type SendChatMessageInput = typeof sendChatMessageSchema.infer;

/** Server-sent events emitted while the assistant is answering. */
export type ChatStreamEvent =
  | { type: "message.start"; userMessage: ChatMessage }
  | { type: "text.delta"; delta: string }
  | {
      type: "tool.start";
      toolCallId: string;
      name: string;
      label: string;
      args: unknown;
    }
  | {
      type: "tool.end";
      toolCallId: string;
      status: Exclude<ToolCallStatus, "running">;
      error?: string;
    }
  | { type: "ui"; block: UiBlock }
  | { type: "session.updated"; session: ChatSession }
  | { type: "message.end"; message: ChatMessage }
  | { type: "error"; message: string };
