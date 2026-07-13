import type {
  GeminiModel,
  GeminiResponse,
  GeminiResponsePart,
  GeminiConversationMessage,
  CodeContext,
  GeminiClientOptions,
  StreamChunk,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "../types";
import { buildDiffBasedPrompt } from "../prompts/PromptBuilder";
import {
  extractThoughtSignature,
  isFunctionCallPart,
  unescapeGeminiContent,
} from "./geminiShared";
import {
  createStallTimeout,
  wireAbortSignal,
  formatStreamError,
  postStreamRequest,
} from "./streamUtils";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Inactivity timeout; resets on every stream chunk.
const STALL_TIMEOUT_MS = 60000;

const DEFAULT_THINKING_BUDGET_TOKENS = 16000;
const MAX_OUTPUT_TOKENS = 65536;

/**
 * Gemini double-escapes string content in responses.
 * https://discuss.ai.google.dev/t/function-call-string-property-is-double-escaped/37867
 */
export class GeminiClient {
  private apiKey: string;
  private model: GeminiModel;
  private options: GeminiClientOptions;

  constructor(
    apiKey: string,
    model: GeminiModel = "gemini-3-flash-preview",
    options: GeminiClientOptions = {},
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.options = {
      thinkingBudgetTokens:
        options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS,
      temperature: options.temperature ?? 0,
    };
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

  /** Workaround for Gemini's tool-input double-escaping bug (see unescapeGeminiContent). */
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

  /**
   * Yields {@link StreamChunk} items for the response parts in a single
   * Gemini SSE frame. Handles reasoning, tool-call, and text parts.
   *
   * Returns immediately after the first tool call because Gemini sometimes
   * emits additional functionCall parts that omit `thoughtSignature`,
   * which causes follow-up requests to fail with HTTP 400.
   */
  private *processResponseParts(
    parts: GeminiResponsePart[],
  ): Generator<StreamChunk> {
    for (const part of parts) {
      if (part.thought && part.text) {
        yield {
          type: "reasoning",
          reasoning: unescapeGeminiContent(part.text),
        };
        continue;
      }

      if (isFunctionCallPart(part)) {
        yield {
          type: "tool_call",
          toolCall: {
            id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: part.functionCall.name,
            input: this.unescapeToolInputs(part.functionCall.args || {}),
            thoughtSignature: extractThoughtSignature(part),
          },
        };
        return;
      }

      if (part.text) {
        yield {
          type: "text",
          text: unescapeGeminiContent(part.text),
        };
      }
    }
  }

  /**
   * Builds the Gemini request body with generation config, thinking budget,
   * and optional tool declarations. Disables thinking when tools are present
   * to avoid the missing-thoughtSignature 400 bug.
   */
  private buildGeminiRequestBody(
    systemPrompt: string,
    contents: unknown[],
    tools?: ToolDefinition[],
  ): Record<string, unknown> {
    const hasTools = tools && tools.length > 0;
    const thinkingBudget = hasTools
      ? 0
      : (this.options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS);

    const requestConfig: Record<string, unknown> = {
      temperature: this.options.temperature ?? 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    };

    if (thinkingBudget > 0) {
      requestConfig.thinkingConfig = {
        thinkingBudget: thinkingBudget,
        includeThoughts: true,
      };
    }

    const requestBody: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: requestConfig,
    };

    if (hasTools) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
    }

    return requestBody;
  }

  /**
   * Sends a streaming request to Gemini and yields parsed StreamChunks.
   * Shared by both {@link generateWithContext} and {@link submitToolResult}.
   */
  private async *streamRequest(
    requestBody: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:streamGenerateContent?alt=sse`;

    const controller = new AbortController();
    if (wireAbortSignal(controller, abortSignal)) {
      yield { type: "error", error: "Request stopped by user" };
      return;
    }
    const stallTimeout = createStallTimeout(controller, STALL_TIMEOUT_MS);
    stallTimeout.reset();

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const bodyResult = await postStreamRequest(
        url,
        { "x-goog-api-key": this.apiKey },
        requestBody,
        controller,
        stallTimeout,
      );
      if ("error" in bodyResult) {
        yield { type: "error", error: bodyResult.error };
        return;
      }

      let inputTokens = 0;
      let outputTokens = 0;
      let thoughtsTokenCount = 0;
      let cacheReadTokens = 0;

      reader = bodyResult.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let stopAfterToolCall = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        stallTimeout.reset();

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
              for (const streamChunk of this.processResponseParts(parts)) {
                yield streamChunk;
                if (streamChunk.type === "tool_call") {
                  stopAfterToolCall = true;
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
            const errorMsg = `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`;
            yield { type: "error", error: errorMsg };
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
      yield formatStreamError(
        error,
        abortSignal,
        "Failed to connect to Gemini API",
      );
    } finally {
      reader?.releaseLock();
      stallTimeout.clear();
    }
  }

  async *generateWithContext(
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

    const contents =
      conversationHistory && conversationHistory.length > 0
        ? [...conversationHistory, { parts: currentUserParts }]
        : [{ parts: currentUserParts }];

    const requestBody = this.buildGeminiRequestBody(
      systemPrompt,
      contents,
      tools,
    );

    yield* this.streamRequest(requestBody, abortSignal);
  }

  private buildFunctionResponsePart(call: ToolCall, result: ToolResult) {
    return {
      functionResponse: {
        name: call.name,
        response: {
          tool_call_id: result.tool_call_id,
          status: result.status,
          output: result.output,
          error: result.error,
        },
      },
    };
  }

  async *submitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: GeminiConversationMessage[],
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const functionResponsePart = this.buildFunctionResponsePart(
      toolCall,
      result,
    );

    const updatedContents = [
      ...conversationHistory,
      { role: "user", parts: [functionResponsePart] },
    ];

    const requestBody = this.buildGeminiRequestBody(
      systemPrompt,
      updatedContents,
      tools,
    );

    yield* this.streamRequest(requestBody, abortSignal);
  }
}
