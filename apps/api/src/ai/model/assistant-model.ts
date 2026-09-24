import type { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import type { OpenAiToolDefinition } from "../tools/tool-kit.js";

/**
 * The port the agent loop depends on. Production uses LangChain's ChatOpenAI
 * against the Command Code provider API; tests use a scripted fake.
 */
export abstract class AssistantModel {
  abstract readonly enabled: boolean;
  abstract stream(
    messages: BaseMessage[],
    tools: OpenAiToolDefinition[],
    signal: AbortSignal,
  ): Promise<AsyncIterable<AIMessageChunk>>;
}

export class AssistantUnavailableError extends Error {
  constructor() {
    super("The AI assistant is not configured. Set AI_API_KEY on the API server.");
  }
}
