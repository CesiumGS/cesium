import { AIClientFactory, type AIClient } from "./AIClientFactory";
import { VertexAuth } from "./VertexAuth";
import { buildDiffBasedPrompt } from "../prompts/PromptBuilder";
import {
  VERTEX_MODEL_IDS,
  type AIModel,
  type CodeContext,
  type StreamChunk,
  type GeminiClientOptions,
  type AnthropicClientOptions,
  type GeminiResponse,
  type AnthropicStreamEvent,
  type AnthropicToolParam,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type ConversationHistory,
  type GeminiConversationMessage,
} from "../types";
import { isFunctionCallPart, unescapeGeminiContent } from "./geminiShared";

// Inactivity timeout (ms); Vertex global can be slow to deliver first bytes.
const STALL_TIMEOUT_MS = 180000;

// Anthropic API version required by Vertex Claude rawPredict.
const VERTEX_ANTHROPIC_VERSION = "vertex-2023-10-16";

const DEFAULT_GEMINI_THINKING_BUDGET = 16000;
const DEFAULT_GEMINI_TEMPERATURE = 0;
const GEMINI_MAX_OUTPUT_TOKENS = 65536;

const DEFAULT_ANTHROPIC_THINKING_BUDGET = 10000;
const DEFAULT_ANTHROPIC_TEMPERATURE = 1.0;
const DEFAULT_ANTHROPIC_MAX_TOKENS = 16000;
const REQUIRED_THINKING_TEMPERATURE = 1.0;

/** Mirrors GeminiClient.unescapeGeminiContent (same double-escape bug). */
type VertexPublisher = "google" | "anthropic";

/**
 * Routes to Vertex AI publisher endpoints (Gemini and Claude) using
 * service-account auth. Never logs credentials or tokens.
 */
export class VertexAIClient implements AIClient {
  private auth: VertexAuth;
  private region: string;
  private model: AIModel;
  private publisher: VertexPublisher;
  private vertexModelId: string;
  private geminiOptions: GeminiClientOptions;
  private anthropicOptions: AnthropicClientOptions;

  constructor(
    serviceAccountJson: string,
    region: string,
    model: AIModel,
    options?: {
      geminiOptions?: GeminiClientOptions;
      anthropicOptions?: AnthropicClientOptions;
    },
  ) {
    this.auth = new VertexAuth(serviceAccountJson);
    this.region = region.trim().toLowerCase();
    this.model = model;
    this.geminiOptions = {
      thinkingBudgetTokens:
        options?.geminiOptions?.thinkingBudgetTokens ??
        DEFAULT_GEMINI_THINKING_BUDGET,
      temperature:
        options?.geminiOptions?.temperature ?? DEFAULT_GEMINI_TEMPERATURE,
    };
    this.anthropicOptions = {
      thinkingBudgetTokens:
        options?.anthropicOptions?.thinkingBudgetTokens ??
        DEFAULT_ANTHROPIC_THINKING_BUDGET,
      temperature:
        options?.anthropicOptions?.temperature ?? DEFAULT_ANTHROPIC_TEMPERATURE,
      maxTokens:
        options?.anthropicOptions?.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS,
    };

    const provider = AIClientFactory.getProviderForModel(model);
    this.publisher = provider === "gemini" ? "google" : "anthropic";
    this.vertexModelId = VERTEX_MODEL_IDS[model];
  }

  async *generateWithContext(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: ConversationHistory,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    if (this.publisher === "google") {
      yield* this.geminiGenerateWithContext(
        userMessage,
        context,
        customAddendum,
        tools,
        conversationHistory as GeminiConversationMessage[] | undefined,
        attachments,
        abortSignal,
      );
    } else {
      yield* this.claudeGenerateWithContext(
        userMessage,
        context,
        customAddendum,
        tools,
        conversationHistory as
          | Array<{
              role: "user" | "assistant";
              content: string | Array<{ type: string; [key: string]: unknown }>;
            }>
          | undefined,
        attachments,
        abortSignal,
      );
    }
  }

  async *submitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: ConversationHistory,
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    if (this.publisher === "google") {
      yield* this.geminiSubmitToolResult(
        toolCall,
        result,
        systemPrompt,
        conversationHistory as GeminiConversationMessage[],
        tools,
        abortSignal,
      );
    } else {
      yield* this.claudeSubmitToolResult(
        toolCall,
        result,
        systemPrompt,
        conversationHistory as Array<{
          role: "user" | "assistant";
          content: string | Array<{ type: string; [key: string]: unknown }>;
        }>,
        tools,
        abortSignal,
      );
    }
  }

  private getGeminiEndpoint(): string {
    const projectId = this.auth.projectId;
    const endpointHost =
      this.region === "global"
        ? "https://aiplatform.googleapis.com"
        : `https://${this.region}-aiplatform.googleapis.com`;
    return `${endpointHost}/v1/projects/${projectId}/locations/${this.region}/publishers/google/models/${this.vertexModelId}:streamGenerateContent?alt=sse`;
  }

  private getClaudeEndpoint(): string {
    const projectId = this.auth.projectId;
    const endpointHost =
      this.region === "global"
        ? "https://aiplatform.googleapis.com"
        : `https://${this.region}-aiplatform.googleapis.com`;
    return `${endpointHost}/v1/projects/${projectId}/locations/${this.region}/publishers/anthropic/models/${this.vertexModelId}:streamRawPredict`;
  }

  private async authedFetch(
    url: string,
    body: string,
    signal: AbortSignal,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    const accessToken = await this.auth.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...extraHeaders,
    };
    return fetch(url, {
      method: "POST",
      headers,
      body,
      signal,
    });
  }

  /** Returns a StreamChunk error when the response is not ok, else null. */
  private async handleResponseError(
    response: Response,
  ): Promise<StreamChunk | null> {
    if (response.ok) {
      return null;
    }

    // Force a fresh token on the next call
    if (response.status === 401 || response.status === 403) {
      this.auth.clearCache();
    }

    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage =
        (errorData as { error?: { message?: string } }).error?.message ||
        errorMessage;
    } catch {
      // Response body was not valid JSON
    }

    if (errorMessage.toLowerCase().includes("not servable in region")) {
      const supportedRegions = AIClientFactory.getSupportedVertexRegions(
        this.model,
      );
      if (supportedRegions && supportedRegions.length > 0) {
        errorMessage = `${errorMessage} Supported regions for ${this.model}: ${supportedRegions.join(", ")}.`;
      } else {
        errorMessage = `${errorMessage} Try changing the Vertex region or selecting another model.`;
      }
    }

    return { type: "error", error: errorMessage };
  }

  private setupAbortAndTimeout(abortSignal?: AbortSignal): {
    controller: AbortController;
    resetStallTimeout: () => void;
    clearStallTimeout: () => void;
    wasUserAborted: () => boolean;
  } {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearStallTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // If the caller-provided signal is already aborted, skip arming the stall
    // timer so callers that short-circuit the request still leave no pending
    // timeout behind.
    if (abortSignal?.aborted) {
      controller.abort();
      const noop = () => {};
      return {
        controller,
        resetStallTimeout: noop,
        clearStallTimeout: noop,
        wasUserAborted: () => true,
      };
    }

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    const resetStallTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
    };

    const wasUserAborted = () => !!abortSignal?.aborted;

    resetStallTimeout();

    return { controller, resetStallTimeout, clearStallTimeout, wasUserAborted };
  }

  private convertToolsToFunctionDeclarations(tools: ToolDefinition[]): unknown {
    return {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      })),
    };
  }

  private unescapeToolInputs(
    args: Record<string, unknown>,
  ): Record<string, unknown> {
    const unescaped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string") {
        unescaped[key] = unescapeGeminiContent(value);
      } else {
        unescaped[key] = value;
      }
    }
    return unescaped;
  }

  private normalizeGeminiRole(role: unknown): "user" | "model" {
    if (role === "model") {
      return "model";
    }
    if (role === "assistant") {
      return "model";
    }
    return "user";
  }

  private normalizeGeminiHistory(
    history?: GeminiConversationMessage[],
  ): GeminiConversationMessage[] {
    if (!history || history.length === 0) {
      return [];
    }
    return history.map((entry) => ({
      ...entry,
      role: this.normalizeGeminiRole(entry.role),
    }));
  }

  private async *geminiGenerateWithContext(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: GeminiConversationMessage[],
    attachments?: Array<{ mimeType: string; base64Data: string }>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    if (!userMessage || userMessage.trim().length === 0) {
      yield { type: "error", error: "User message cannot be empty" };
      return;
    }

    const { systemPrompt, userPrompt } = buildDiffBasedPrompt(
      userMessage,
      context,
      customAddendum,
    );

    const hasTools = tools && tools.length > 0;
    const thinkingBudget = hasTools
      ? 0
      : (this.geminiOptions.thinkingBudgetTokens ??
        DEFAULT_GEMINI_THINKING_BUDGET);

    const requestConfig: Record<string, unknown> = {
      temperature: this.geminiOptions.temperature ?? DEFAULT_GEMINI_TEMPERATURE,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    };

    if (thinkingBudget > 0) {
      requestConfig.thinkingConfig = {
        thinkingBudget: thinkingBudget,
        includeThoughts: true,
      };
    }

    const currentUserParts: Array<{
      text?: string;
      inline_data?: { mime_type: string; data: string };
    }> = [{ text: userPrompt }];

    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        currentUserParts.push({
          inline_data: {
            mime_type: attachment.mimeType,
            data: attachment.base64Data,
          },
        });
      }
    }

    const normalizedHistory = this.normalizeGeminiHistory(conversationHistory);
    const contents =
      normalizedHistory.length > 0
        ? [...normalizedHistory, { role: "user", parts: currentUserParts }]
        : [{ role: "user", parts: currentUserParts }];

    const requestBody: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: requestConfig,
    };

    if (hasTools) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
    }

    yield* this.geminiStreamRequest(requestBody, abortSignal);
  }

  private async *geminiSubmitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: GeminiConversationMessage[],
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const functionResponsePart = {
      functionResponse: {
        name: toolCall.name,
        response: {
          tool_call_id: result.tool_call_id,
          status: result.status,
          output: result.output,
          error: result.error,
        },
      },
    };

    const normalizedHistory = this.normalizeGeminiHistory(conversationHistory);
    const updatedContents = [
      ...normalizedHistory,
      { role: "user", parts: [functionResponsePart] },
    ];

    const hasTools = tools && tools.length > 0;
    const thinkingBudget = hasTools
      ? 0
      : (this.geminiOptions.thinkingBudgetTokens ??
        DEFAULT_GEMINI_THINKING_BUDGET);

    const requestConfig: Record<string, unknown> = {
      temperature: this.geminiOptions.temperature ?? DEFAULT_GEMINI_TEMPERATURE,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    };

    if (thinkingBudget > 0) {
      requestConfig.thinkingConfig = {
        thinkingBudget,
        includeThoughts: true,
      };
    }

    const requestBody: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: updatedContents,
      generationConfig: requestConfig,
    };

    if (hasTools) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
    }

    yield* this.geminiStreamRequest(requestBody, abortSignal);
  }

  private async *geminiStreamRequest(
    requestBody: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const { controller, resetStallTimeout, clearStallTimeout, wasUserAborted } =
      this.setupAbortAndTimeout(abortSignal);

    if (abortSignal?.aborted) {
      clearStallTimeout();
      yield { type: "error", error: "Request stopped by user" };
      return;
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const url = this.getGeminiEndpoint();
      const response = await this.authedFetch(
        url,
        JSON.stringify(requestBody),
        controller.signal,
      );

      resetStallTimeout();

      const err = await this.handleResponseError(response);
      if (err) {
        yield err;
        return;
      }

      if (!response.body) {
        yield { type: "error", error: "No response body" };
        return;
      }

      let thoughtsTokenCount = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let stopAfterToolCall = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        resetStallTimeout();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (stopAfterToolCall) {
            break;
          }
          if (!line.trim() || !line.startsWith("data: ")) {
            continue;
          }

          const data = line.slice(6);
          if (data === "[DONE]") {
            continue;
          }

          try {
            const chunk = JSON.parse(data) as GeminiResponse;

            if (chunk.error) {
              yield { type: "error", error: chunk.error.message };
              return;
            }

            const parts = chunk?.candidates?.[0]?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.thought && part.text) {
                  yield {
                    type: "reasoning",
                    reasoning: unescapeGeminiContent(part.text),
                  };
                } else if (isFunctionCallPart(part)) {
                  const { functionCall } = part;
                  const thoughtSignature =
                    part.thoughtSignature ??
                    part.thought_signature ??
                    functionCall.thoughtSignature ??
                    (functionCall as { thought_signature?: string })
                      .thought_signature;

                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                      name: functionCall.name,
                      input: this.unescapeToolInputs(functionCall.args || {}),
                      thoughtSignature,
                    },
                  };
                  stopAfterToolCall = true;
                  break;
                } else if (part.text) {
                  yield {
                    type: "text",
                    text: unescapeGeminiContent(part.text),
                  };
                }
              }
            }

            if (chunk.usageMetadata) {
              thoughtsTokenCount =
                chunk.usageMetadata.thoughtsTokenCount ?? thoughtsTokenCount;
              inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
              outputTokens =
                chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
              cacheReadTokens =
                chunk.usageMetadata.cachedContentTokenCount ?? cacheReadTokens;
            }
          } catch (e) {
            yield {
              type: "error",
              error: `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`,
            };
          }
        }

        if (stopAfterToolCall) {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancel errors
          }
          break;
        }
      }

      yield {
        type: "usage",
        inputTokens,
        outputTokens,
        thoughtTokens: thoughtsTokenCount > 0 ? thoughtsTokenCount : undefined,
        cacheReadTokens: cacheReadTokens > 0 ? cacheReadTokens : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield {
          type: "error",
          error: wasUserAborted()
            ? "Request stopped by user"
            : "Request timed out",
        };
      } else {
        yield {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to connect to Vertex AI (Gemini)",
        };
      }
    } finally {
      reader?.releaseLock();
      clearStallTimeout();
    }
  }

  private convertToolsToAnthropicFormat(
    tools: ToolDefinition[],
  ): AnthropicToolParam[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  private async *claudeGenerateWithContext(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string | Array<{ type: string; [key: string]: unknown }>;
    }>,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    if (!userMessage || userMessage.trim().length === 0) {
      yield { type: "error", error: "User message cannot be empty" };
      return;
    }

    const { systemPrompt, userPrompt } = buildDiffBasedPrompt(
      userMessage,
      context,
      customAddendum,
    );

    const messages = this.buildAnthropicMessages(
      userPrompt,
      conversationHistory,
      attachments,
    );

    const requestBody = this.buildClaudeRequestBody(
      systemPrompt,
      messages,
      tools,
    );

    yield* this.claudeStreamRequest(requestBody, abortSignal);
  }

  private async *claudeSubmitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string | Array<{ type: string; [key: string]: unknown }>;
    }>,
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const toolResultContent =
      result.status === "success"
        ? (result.output ?? "Success")
        : (result.error ?? "Unknown error");

    const messages = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result",
            tool_use_id: toolCall.id,
            content: toolResultContent,
            is_error: result.status === "error",
          },
        ],
      },
    ];

    const requestBody = this.buildClaudeRequestBody(
      systemPrompt,
      messages,
      tools,
    );

    yield* this.claudeStreamRequest(requestBody, abortSignal);
  }

  private buildAnthropicMessages(
    userPrompt: string,
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string | Array<{ type: string; [key: string]: unknown }>;
    }>,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
  ): Array<{
    role: "user" | "assistant";
    content: string | Array<{ type: string; [key: string]: unknown }>;
  }> {
    const messages: Array<{
      role: "user" | "assistant";
      content: string | Array<{ type: string; [key: string]: unknown }>;
    }> = [];

    if (conversationHistory && conversationHistory.length > 0) {
      for (const entry of conversationHistory) {
        messages.push(entry);
      }
    }

    const content: Array<{ type: string; [key: string]: unknown }> = [];

    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: attachment.mimeType,
            data: attachment.base64Data,
          },
        });
      }
    }

    content.push({ type: "text", text: userPrompt });
    messages.push({ role: "user", content });

    return messages;
  }

  private buildClaudeRequestBody(
    systemPrompt: string,
    messages: Array<{
      role: string;
      content: string | Array<{ type: string; [key: string]: unknown }>;
    }>,
    tools?: ToolDefinition[],
  ): Record<string, unknown> {
    const maxTokens =
      this.anthropicOptions.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS;
    const thinkingBudget =
      this.anthropicOptions.thinkingBudgetTokens ??
      DEFAULT_ANTHROPIC_THINKING_BUDGET;

    const requestBody: Record<string, unknown> = {
      anthropic_version: VERTEX_ANTHROPIC_VERSION,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      stream: true,
    };

    if (thinkingBudget > 0) {
      // Opus 4.7+ requires adaptive thinking with output_config.effort;
      // earlier models use the fixed-budget "enabled" form.
      if (/^claude-opus-4-7/.test(this.model)) {
        requestBody.thinking = { type: "adaptive" };
        requestBody.output_config = { effort: "medium" };
      } else {
        requestBody.thinking = {
          type: "enabled",
          budget_tokens: thinkingBudget,
        };
      }
      requestBody.temperature = REQUIRED_THINKING_TEMPERATURE;
    } else {
      requestBody.temperature =
        this.anthropicOptions.temperature ?? DEFAULT_ANTHROPIC_TEMPERATURE;
    }

    if (tools && tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(tools);
    }

    return requestBody;
  }

  private async *claudeStreamRequest(
    requestBody: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const { controller, resetStallTimeout, clearStallTimeout, wasUserAborted } =
      this.setupAbortAndTimeout(abortSignal);

    if (abortSignal?.aborted) {
      clearStallTimeout();
      yield { type: "error", error: "Request stopped by user" };
      return;
    }

    try {
      const url = this.getClaudeEndpoint();
      const response = await this.authedFetch(
        url,
        JSON.stringify(requestBody),
        controller.signal,
      );

      resetStallTimeout();

      const err = await this.handleResponseError(response);
      if (err) {
        yield err;
        return;
      }

      if (!response.body) {
        yield { type: "error", error: "No response body" };
        return;
      }

      yield* this.processClaudeSSEStream(response.body, resetStallTimeout);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield {
          type: "error",
          error: wasUserAborted()
            ? "Request stopped by user"
            : "Request timed out",
        };
      } else {
        yield {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to connect to Vertex AI (Claude)",
        };
      }
    } finally {
      clearStallTimeout();
    }
  }

  /** Mirrors AnthropicClient.processSSEStream. */
  private async *processClaudeSSEStream(
    body: ReadableStream<Uint8Array>,
    resetStallTimeout: () => void,
  ): AsyncGenerator<StreamChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let currentToolCallId = "";
    let currentToolName = "";
    let partialToolInput = "";
    let currentBlockType = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        resetStallTimeout();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          if (line.startsWith("event:")) {
            continue;
          }

          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }

            try {
              const event: AnthropicStreamEvent = JSON.parse(data);

              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens;
              }

              if (event.type === "content_block_start" && event.content_block) {
                currentBlockType = event.content_block.type;
                if (event.content_block.type === "tool_use") {
                  currentToolCallId = event.content_block.id;
                  currentToolName = event.content_block.name;
                  partialToolInput = "";
                }
              }

              if (event.type === "content_block_delta" && event.delta) {
                if (
                  event.delta.type === "thinking_delta" &&
                  event.delta.thinking
                ) {
                  yield { type: "reasoning", reasoning: event.delta.thinking };
                } else if (
                  event.delta.type === "text_delta" &&
                  event.delta.text
                ) {
                  yield { type: "text", text: event.delta.text };
                } else if (
                  event.delta.type === "input_json_delta" &&
                  event.delta.partial_json
                ) {
                  partialToolInput += event.delta.partial_json;
                } else if (
                  event.delta.type !== "signature_delta" &&
                  event.delta.type !== "citations_delta"
                ) {
                  // Surface unknown delta types during development so newly
                  // introduced ones don't silently disappear.
                  console.warn(
                    "Unhandled Anthropic delta type:",
                    event.delta.type,
                  );
                }
              }

              if (event.type === "content_block_stop") {
                if (currentBlockType === "tool_use" && currentToolCallId) {
                  try {
                    const input = partialToolInput
                      ? JSON.parse(partialToolInput)
                      : null;
                    yield {
                      type: "tool_call",
                      toolCall: {
                        id: currentToolCallId,
                        name: currentToolName,
                        input: input ?? {},
                      },
                    };
                  } catch (e) {
                    yield {
                      type: "error",
                      error: `Failed to parse tool input: ${e instanceof Error ? e.message : "Unknown error"}`,
                    };
                  }
                  currentToolCallId = "";
                  currentToolName = "";
                  partialToolInput = "";
                }
                currentBlockType = "";
              }

              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens ?? outputTokens;
              }

              if (event.type === "error") {
                yield {
                  type: "error",
                  error: event.error?.message || "Unknown stream error",
                };
              }
            } catch (e) {
              yield {
                type: "error",
                error: `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`,
              };
            }
          }
        }
      }

      yield {
        type: "usage",
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      try {
        await reader.cancel();
      } catch {
        // Don't mask the original error
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
}
