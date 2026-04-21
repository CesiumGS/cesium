import type {
  ClaudeModel,
  CodeContext,
  StreamChunk,
  AnthropicClientOptions,
  AnthropicConversationMessage,
  AnthropicStreamEvent,
  AnthropicToolParam,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "../types";
import { buildDiffBasedPrompt } from "../prompts/PromptBuilder";

const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com/v1";

// New features ship via beta headers, not new API versions.
// See: https://platform.claude.com/docs/en/api/versioning
const ANTHROPIC_VERSION = "2023-06-01";

// Enables streaming thinking deltas alongside text responses.
const ANTHROPIC_BETA_HEADER = "interleaved-thinking-2025-05-14";

const DEFAULT_THINKING_BUDGET_TOKENS = 10000;
const DEFAULT_TEMPERATURE = 1.0;
const DEFAULT_MAX_TOKENS = 16000;
const REQUIRED_THINKING_TEMPERATURE = 1.0;

// Inactivity timeout; resets on every stream chunk so long responses don't trip it.
const STALL_TIMEOUT_MS = 60000;

export class AnthropicClient {
  private apiKey: string;
  private model: ClaudeModel;
  private options: AnthropicClientOptions;

  constructor(
    apiKey: string,
    model: ClaudeModel = "claude-sonnet-4-6",
    options: AnthropicClientOptions = {},
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.options = {
      thinkingBudgetTokens:
        options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    };
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

  async *generateWithContext(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: AnthropicConversationMessage[],
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

    const messages = this.buildMessages(
      userPrompt,
      conversationHistory,
      attachments,
    );

    const requestBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.options.maxTokens,
      system: systemPrompt,
      messages,
      stream: true,
    };

    // Opus 4.7+ requires adaptive thinking with output_config.effort;
    // earlier models use the fixed-budget "enabled" form. Temperature must
    // be 1.0 when extended thinking is active.
    const thinkingBudget =
      this.options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS;
    if (thinkingBudget > 0) {
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
      requestBody.temperature = this.options.temperature ?? DEFAULT_TEMPERATURE;
    }

    if (tools && tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(tools);
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (abortSignal) {
      if (abortSignal.aborted) {
        yield { type: "error", error: "Request stopped by user" };
        return;
      }
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

    resetStallTimeout();

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-beta": ANTHROPIC_BETA_HEADER,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      resetStallTimeout();

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // Response body was not valid JSON
        }
        yield { type: "error", error: errorMessage };
        return;
      }

      if (!response.body) {
        yield { type: "error", error: "No response body" };
        return;
      }

      yield* this.processSSEStream(response.body, resetStallTimeout);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield {
          type: "error",
          error: abortSignal?.aborted
            ? "Request stopped by user"
            : "Request timed out",
        };
      } else {
        yield {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to connect to Anthropic API",
        };
      }
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async *processSSEStream(
    body: ReadableStream<Uint8Array>,
    resetStallTimeout?: () => void,
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

        resetStallTimeout?.();

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
                    // null input is valid; tool may not require any input
                    const input = partialToolInput
                      ? JSON.parse(partialToolInput)
                      : null;
                    const toolCall: ToolCall = {
                      id: currentToolCallId,
                      name: currentToolName,
                      input: input ?? {},
                    };
                    yield { type: "tool_call", toolCall };
                  } catch (e) {
                    const errorMsg = `Failed to parse tool input: ${e instanceof Error ? e.message : "Unknown error"}`;
                    console.error("[AnthropicClient]", errorMsg);
                    yield { type: "error", error: errorMsg };
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
              const errorMsg = `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`;
              console.error("[AnthropicClient]", errorMsg);
              yield { type: "error", error: errorMsg };
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

  private buildMessages(
    userPrompt: string,
    conversationHistory?: AnthropicConversationMessage[],
    attachments?: Array<{ mimeType: string; base64Data: string }>,
  ): AnthropicConversationMessage[] {
    const messages: AnthropicConversationMessage[] = [];

    if (conversationHistory && conversationHistory.length > 0) {
      for (const entry of conversationHistory) {
        messages.push(entry);
      }
    }

    const content: Array<{ type: string; [key: string]: unknown }> = [];

    // Anthropic prefers images before text
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

  async *submitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: AnthropicConversationMessage[],
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    // Fall back to a stub so the tool_result block always has content
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

    const thinkingBudget =
      this.options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS;
    const requestBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.options.maxTokens,
      system: systemPrompt,
      messages,
      stream: true,
    };

    // Re-send tools so the model can chain further tool calls.
    if (tools && tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(tools);
    }

    if (thinkingBudget > 0) {
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
      requestBody.temperature = this.options.temperature ?? DEFAULT_TEMPERATURE;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (abortSignal) {
      if (abortSignal.aborted) {
        yield { type: "error", error: "Request stopped by user" };
        return;
      }
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

    resetStallTimeout();

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-beta": ANTHROPIC_BETA_HEADER,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      resetStallTimeout();

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // Response body was not valid JSON
        }
        yield { type: "error", error: errorMessage };
        return;
      }

      if (!response.body) {
        yield { type: "error", error: "No response body" };
        return;
      }

      yield* this.processSSEStream(response.body, resetStallTimeout);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield {
          type: "error",
          error: abortSignal?.aborted
            ? "Request stopped by user"
            : "Request timed out",
        };
      } else {
        yield {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during tool result submission",
        };
      }
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }
}
