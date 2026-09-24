import type { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { Injectable } from "@nestjs/common";
import { ChatOpenAI } from "@langchain/openai";
import { AppConfig } from "../../config/app-config.js";
import type { OpenAiToolDefinition } from "../tools/tool-kit.js";
import { AssistantModel, AssistantUnavailableError } from "./assistant-model.js";

/**
 * DeepSeek V4.1 Flash served by Command Code's OpenAI-compatible provider API
 * (`/provider/v1/chat/completions`), driven through LangChain.
 */
@Injectable()
export class CommandCodeModel extends AssistantModel {
  private readonly model: ChatOpenAI | null;

  constructor(config: AppConfig) {
    super();
    const { apiKey, baseUrl, model, enabled } = config.ai;
    this.model = enabled
      ? new ChatOpenAI({
          model,
          apiKey,
          configuration: { baseURL: baseUrl },
          temperature: 0.2,
          maxRetries: 2,
          streamUsage: true,
        })
      : null;
  }

  get enabled() {
    return this.model !== null;
  }

  async stream(messages: BaseMessage[], tools: OpenAiToolDefinition[], signal: AbortSignal) {
    if (!this.model) throw new AssistantUnavailableError();
    const bound = tools.length ? this.model.bindTools(tools, { parallel_tool_calls: true }) : this.model;
    return bound.stream(messages, { signal }) as Promise<AsyncIterable<AIMessageChunk>>;
  }
}
