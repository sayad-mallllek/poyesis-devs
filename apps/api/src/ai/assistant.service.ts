import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { ConflictException, Injectable, Logger } from "@nestjs/common";
import type {
  ChatPageContext,
  ChatStreamEvent,
  Company,
  MessagePart,
  SendChatMessageInput,
  UiBlock,
  UserDetail,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CompanyService } from "../company/company.service.js";
import { UsersService } from "../users/users.service.js";
import { ProjectsService } from "../projects/projects.service.js";
import { errorText, executeTool, runAgentTurn, TurnRecorder, type AgentEvent } from "./agent/agent-runner.js";
import { describeAttachments } from "./agent/attachment-context.js";
import { buildHistory } from "./agent/history.js";
import { buildSystemPrompt, todayIn } from "./agent/system-prompt.js";
import { ChatAttachmentsService, type ChatAttachmentText } from "./chat-attachments.service.js";
import { ChatSessionsService, type StoredTurn } from "./chat-sessions.service.js";
import { AssistantModel } from "./model/assistant-model.js";
import { parseToolInput } from "./tools/tool-kit.js";
import { ToolRegistry } from "./tools/tool-registry.service.js";

export type Emit = (event: ChatStreamEvent) => void;

/** A form or confirmation the assistant is waiting on, found in the last turn. */
interface PendingInteraction {
  kind: "form" | "confirm";
  toolName: string;
  args: unknown;
  block: UiBlock | undefined;
}

interface TurnInput {
  actor: Actor;
  sessionId: string;
  input: SendChatMessageInput;
  turns: StoredTurn[];
  pending: PendingInteraction | null;
  attachments: ChatAttachmentText[];
  company: Company;
  user: UserDetail;
  emit: Emit;
  signal: AbortSignal;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly model: AssistantModel,
    private readonly sessions: ChatSessionsService,
    private readonly attachments: ChatAttachmentsService,
    private readonly registry: ToolRegistry,
    private readonly company: CompanyService,
    private readonly users: UsersService,
    private readonly projects: ProjectsService,
  ) {}

  get enabled() {
    return this.model.enabled;
  }

  /**
   * Prepares one user turn. Everything that can fail with a client error
   * (unknown session, stale form, foreign attachment) happens here, before any streaming starts;
   * the returned function then runs the turn while emitting events.
   */
  async begin(actor: Actor, sessionId: string, input: SendChatMessageInput) {
    const turns = await this.sessions.recentTurns(actor, sessionId);
    const pending = input.formResponse ? this.findPending(turns, input.formResponse.formId) : null;
    if (input.formResponse && !pending) {
      throw new ConflictException("This form was already answered or is no longer active");
    }
    const [company, user, attachments] = await Promise.all([
      this.company.get(actor),
      this.users.get(actor, actor.principal.id),
      this.attachments.claimable(actor, input.attachmentIds ?? []),
    ]);

    return (emit: Emit, signal: AbortSignal) =>
      this.run({ actor, sessionId, input, turns, pending, attachments, company, user, emit, signal });
  }

  /**
   * Persists the user message, answers a pending form/confirmation if any,
   * runs the agent loop while streaming, and persists the assistant message —
   * also when the turn fails or the client disconnects.
   */
  private async run({
    actor: requester,
    sessionId,
    input,
    turns,
    pending,
    attachments,
    company,
    user,
    emit,
    signal,
  }: TurnInput) {
    // Changes made by tools are attributed to the user *through* the assistant.
    const actor: Actor = { ...requester, origin: "ai" };
    const today = todayIn(company.timezone);
    const tools = this.registry.forPrincipal(actor.principal);

    // A confirmed action runs before the user message exists; hold its events
    // until `message.start` so the client can place them in the new turn.
    const held: AgentEvent[] = [];
    let started = false;
    const recorder = new TurnRecorder((event) => (started ? emit(event) : held.push(event)));

    const userParts: MessagePart[] = [];
    if (input.content?.trim()) userParts.push({ type: "text", text: input.content.trim() });
    if (input.formResponse) userParts.push({ type: "formResponse", ...input.formResponse });
    for (const { id, fileName, mimeType, sizeBytes, hasText } of attachments) {
      userParts.push({ type: "attachment", attachment: { id, fileName, mimeType, sizeBytes, hasText } });
    }

    const described = await this.describeUserTurn(actor, input, pending, today, recorder);
    const human = new HumanMessage(
      attachments.length ? `${described}\n\n${describeAttachments(attachments)}`.trimStart() : described,
    );
    const userMessage = await this.sessions.appendMessage(sessionId, "user", userParts, [human], {
      actor: requester,
      attachmentIds: attachments.map((a) => a.id),
    });
    emit({ type: "message.start", userMessage });
    started = true;
    held.forEach(emit);

    const system = new SystemMessage(buildSystemPrompt({ company, user, today }));
    const messages: BaseMessage[] = [system, ...buildHistory(turns.map((t) => t.trace)), human];

    let trace: BaseMessage[] = [];
    try {
      ({ trace } = await runAgentTurn(
        { model: this.model, messages, tools, context: { actor, today }, signal, onEvent: emit },
        recorder,
      ));
    } catch (error) {
      if (!signal.aborted) {
        this.logger.error({ err: error, sessionId }, "Assistant turn failed");
        const message = "I ran into a problem while answering. Please try again.";
        recorder.text(recorder.parts.length ? `\n\n_${message}_` : message);
        emit({ type: "error", message: errorText(error) });
      }
    }

    const fallbackTrace = [new AIMessage(recorder.parts.map((p) => (p.type === "text" ? p.text : "")).join(""))];
    const assistantMessage = await this.sessions.appendMessage(
      sessionId,
      "assistant",
      recorder.parts,
      trace.length ? trace : fallbackTrace,
    );
    const firstUserText = turns.length === 0 ? input.content?.trim() || attachments[0]?.fileName : undefined;
    emit({ type: "session.updated", session: await this.sessions.touch(actor, sessionId, firstUserText) });
    emit({ type: "message.end", message: assistantMessage });
  }

  /**
   * A form response is only valid for the *latest* assistant turn, and only
   * for a form/confirmation that turn actually produced — this prevents
   * replaying an old approval.
   */
  private findPending(turns: StoredTurn[], formId: string): PendingInteraction | null {
    const last = turns.at(-1);
    if (!last || last.message.role !== "assistant") return null;

    for (const message of last.trace) {
      if (!(message instanceof AIMessage)) continue;
      const call = message.tool_calls?.find((c) => c.id === formId);
      if (!call) continue;
      const tool = this.registry.get(call.name);
      const kind = tool?.mode === "confirm" ? "confirm" : tool?.mode === "awaitUser" ? "form" : null;
      if (!kind) return null;
      const block = last.message.parts.find((p) => p.type === "ui" && "id" in p.block && p.block.id === formId);
      return { kind, toolName: call.name, args: call.args, block: block?.type === "ui" ? block.block : undefined };
    }
    return null;
  }

  /** The text the model sees for this user turn. Executes approved actions. */
  private async describeUserTurn(
    actor: Actor,
    input: SendChatMessageInput,
    pending: PendingInteraction | null,
    today: string,
    recorder: TurnRecorder,
  ): Promise<string> {
    const sections: string[] = [];
    const page = await this.describePage(actor, input.context);
    if (page) sections.push(`<page_context>${page}</page_context>`);

    if (pending && input.formResponse) {
      const title = (pending.block && "title" in pending.block && pending.block.title) || pending.toolName;
      const values = input.formResponse.values;

      if (pending.kind === "form") {
        sections.push(
          values
            ? `I filled in the form "${title}":\n${JSON.stringify(values, null, 2)}`
            : `I dismissed the form "${title}" without answering.`,
        );
      } else if (values?.confirmed === true) {
        sections.push(await this.executeConfirmed(actor, pending, input.formResponse.formId, title, today, recorder));
      } else {
        sections.push(`I declined: "${title}". Do not perform it.`);
      }
    }

    if (input.content?.trim()) sections.push(input.content.trim());
    return sections.join("\n\n");
  }

  private async executeConfirmed(
    actor: Actor,
    pending: PendingInteraction,
    callId: string,
    title: string,
    today: string,
    recorder: TurnRecorder,
  ): Promise<string> {
    const tool = this.registry.get(pending.toolName);
    const parsed = tool ? parseToolInput(tool, pending.args) : null;
    if (!tool || !parsed?.ok) return `I confirmed "${title}", but the action could not be prepared.`;

    const result = await executeTool(
      tool,
      callId,
      parsed.value,
      { actor, today, emit: (block) => recorder.ui(block) },
      recorder,
    );
    return `I confirmed "${title}". It was executed with this result:\n${String(result.content)}`;
  }

  private async describePage(actor: Actor, context: ChatPageContext | undefined): Promise<string | null> {
    if (!context) return null;
    const details: string[] = [`The user is on ${context.pathname}.`];
    if (context.projectId) {
      const project = await this.projects.get(actor, context.projectId).catch(() => null);
      if (project) details.push(`"This project" means ${project.name} (code ${project.code}, id ${project.id}).`);
    }
    if (context.userId) {
      const person = await this.users.get(actor, context.userId).catch(() => null);
      if (person) details.push(`"This person" means ${person.firstName} ${person.lastName} (id ${person.id}).`);
    }
    if (context.clientId) details.push(`The open client has id ${context.clientId}.`);
    return details.join(" ");
  }
}
