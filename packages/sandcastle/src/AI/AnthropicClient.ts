import type {
  ClaudeModel,
  CodeContext,
  StreamChunk,
  AnthropicClientOptions,
  AnthropicStreamEvent,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "./types";
import { buildDiffBasedPrompt, buildContextPrompt } from "./PromptBuilder";

// API Configuration
const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com/v1";

// Anthropic API version - 2023-06-01 is the latest stable version as of January 2026.
// New features are released via beta headers rather than new API versions.
// See: https://platform.claude.com/docs/en/api/versioning
const ANTHROPIC_VERSION = "2023-06-01";

// Beta header for extended thinking support with interleaved thinking/text blocks.
// This enables streaming thinking deltas alongside text responses.
const ANTHROPIC_BETA_HEADER = "interleaved-thinking-2025-05-14";

// Default values - extracted as named constants per PR review feedback
const DEFAULT_THINKING_BUDGET_TOKENS = 10000;
const DEFAULT_TEMPERATURE = 1.0;
const DEFAULT_MAX_TOKENS = 16000;
const REQUIRED_THINKING_TEMPERATURE = 1.0;

// Stall timeout - resets whenever data is received from the stream.
// This prevents timeouts during long-running responses while still catching stalled connections.
const STALL_TIMEOUT_MS = 60000; // 60 seconds of inactivity before timeout

// Debug flag for development logging
const DEBUG = import.meta.env?.DEV ?? false;

/**
 * Type-safe message structure for Anthropic API
 */
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

export class AnthropicClient {
  private apiKey: string;
  private model: ClaudeModel;
  private options: AnthropicClientOptions;

  constructor(
    apiKey: string,
    model: ClaudeModel = "claude-sonnet-4-5-20250929",
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

  /**
   * Convert our ToolDefinition format to Anthropic's tool format
   */
  private convertToolsToAnthropicFormat(tools: ToolDefinition[]): unknown[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * Test the API key by making a simple request
   */
  async testApiKey(): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Say 'valid'" }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const error = await response.json();
          errorMessage = error.error?.message || errorMessage;
        } catch {
          // Response body was not valid JSON
        }
        return { valid: false, error: errorMessage };
      }

      return { valid: true };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { valid: false, error: "Request timed out" };
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate content with code context for editing with streaming support
   * Defaults to requesting diff-based edits for targeted changes
   *
   * @param userMessage - The user's request
   * @param context - Current code context
   * @param useDiffFormat - Whether to request SEARCH/REPLACE format (default: true)
   * @param customAddendum - Optional custom system prompt addendum from user settings
   * @param tools - Optional array of tools available for the model to call
   * @param conversationHistory - Optional array of previous messages for context
   * @param attachments - Optional array of image attachments for the current message
   * @returns AsyncGenerator that yields StreamChunk types
   */
  async *generateWithContext(
    userMessage: string,
    context: CodeContext,
    useDiffFormat: boolean = true,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: AnthropicMessage[],
    attachments?: Array<{ mimeType: string; base64Data: string }>,
  ): AsyncGenerator<StreamChunk> {
    // Input validation
    if (!userMessage || userMessage.trim().length === 0) {
      yield { type: "error", error: "User message cannot be empty" };
      return;
    }

    const { systemPrompt, userPrompt } = useDiffFormat
      ? buildDiffBasedPrompt(userMessage, context, customAddendum)
      : buildContextPrompt(userMessage, context, customAddendum);

    // Build messages array for Anthropic API
    const messages = this.buildMessages(
      userPrompt,
      conversationHistory,
      attachments,
    );

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.options.maxTokens,
      system: systemPrompt,
      messages,
      stream: true,
    };

    // Add extended thinking configuration
    const thinkingBudget =
      this.options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS;
    if (thinkingBudget > 0) {
      requestBody.thinking = {
        type: "enabled",
        budget_tokens: thinkingBudget,
      };
      // Temperature must be 1.0 for extended thinking
      requestBody.temperature = REQUIRED_THINKING_TEMPERATURE;
    } else {
      requestBody.temperature = this.options.temperature ?? DEFAULT_TEMPERATURE;
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(tools);
      if (DEBUG) {
        console.log(
          `[AnthropicClient] Tools provided to API: ${tools.length} tool(s)`,
          tools.map((t) => t.name),
        );
      }
    }

    // Log request configuration (debug only)
    if (DEBUG) {
      console.log("[AnthropicClient] Request configuration:", {
        model: this.model,
        maxTokens: this.options.maxTokens,
        thinkingBudget,
        hasSystemPrompt: !!systemPrompt,
        systemPromptLength: systemPrompt.length,
        messageCount: messages.length,
        toolsCount: tools?.length || 0,
      });
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Stall timeout resets whenever data is received
    const resetStallTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
    };

    // Start the initial timeout
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

      // Reset timeout after receiving response headers
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

      // Process SSE stream with stall timeout reset callback
      yield* this.processSSEStream(response.body, resetStallTimeout);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield { type: "error", error: "Request timed out" };
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

  /**
   * Process SSE stream from Anthropic API
   *
   * @param body - The response body stream
   * @param resetStallTimeout - Optional callback to reset the stall timeout when data is received
   */
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

    if (DEBUG) {
      console.log("[AnthropicClient] Starting SSE stream processing...");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (DEBUG) {
            console.log("[AnthropicClient] Stream done");
          }
          break;
        }

        // Reset stall timeout on each chunk received
        resetStallTimeout?.();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          // Skip event type lines (we parse data lines)
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

              // Track usage from message_start
              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens;
                if (DEBUG) {
                  console.log("[AnthropicClient] Input tokens:", inputTokens);
                }
              }

              // Handle content_block_start
              if (event.type === "content_block_start" && event.content_block) {
                currentBlockType = event.content_block.type;
                if (DEBUG) {
                  console.log(
                    "[AnthropicClient] Content block started:",
                    currentBlockType,
                  );
                }

                if (event.content_block.type === "tool_use") {
                  currentToolCallId = event.content_block.id;
                  currentToolName = event.content_block.name;
                  partialToolInput = "";
                  if (DEBUG) {
                    console.log(
                      "[AnthropicClient] Tool use block:",
                      currentToolName,
                    );
                  }
                }
              }

              // Handle content_block_delta
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
                }
              }

              // Handle content_block_stop - emit tool_call when tool_use block ends
              if (event.type === "content_block_stop") {
                if (currentBlockType === "tool_use" && currentToolCallId) {
                  try {
                    // Validate tool input - null if empty (tool may not require input)
                    const input = partialToolInput
                      ? JSON.parse(partialToolInput)
                      : null;
                    const toolCall: ToolCall = {
                      id: currentToolCallId,
                      name: currentToolName,
                      input: input ?? {},
                    };
                    if (DEBUG) {
                      console.log(
                        "[AnthropicClient] Yielding tool_call:",
                        toolCall.name,
                      );
                    }
                    yield { type: "tool_call", toolCall };
                  } catch (e) {
                    // Surface tool input parsing errors to caller
                    const errorMsg = `Failed to parse tool input: ${e instanceof Error ? e.message : "Unknown error"}`;
                    console.error("[AnthropicClient]", errorMsg);
                    yield { type: "error", error: errorMsg };
                  }
                  // Reset tool state
                  currentToolCallId = "";
                  currentToolName = "";
                  partialToolInput = "";
                }
                currentBlockType = "";
              }

              // Handle message_delta for final usage
              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens ?? outputTokens;
              }

              // Handle errors
              if (event.type === "error") {
                yield {
                  type: "error",
                  error: event.error?.message || "Unknown stream error",
                };
              }
            } catch (e) {
              // Surface SSE parsing errors to caller
              const errorMsg = `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`;
              console.error("[AnthropicClient]", errorMsg);
              yield { type: "error", error: errorMsg };
            }
          }
        }
      }

      // Yield final usage information
      yield {
        type: "usage",
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      // Cancel the reader to stop the stream on unexpected errors
      try {
        await reader.cancel();
      } catch {
        // Don't mask the original error
      }
      throw error;
    } finally {
      // Ensure the reader is released to prevent memory leaks
      reader.releaseLock();
    }
  }

  /**
   * Build messages array for Anthropic API
   */
  private buildMessages(
    userPrompt: string,
    conversationHistory?: AnthropicMessage[],
    attachments?: Array<{ mimeType: string; base64Data: string }>,
  ): AnthropicMessage[] {
    const messages: AnthropicMessage[] = [];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const entry of conversationHistory) {
        messages.push(entry);
      }
    }

    // Build current user message content
    const content: Array<{ type: string; [key: string]: unknown }> = [];

    // Add images first (Anthropic prefers images before text)
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

    // Add text content
    content.push({ type: "text", text: userPrompt });

    messages.push({ role: "user", content });

    return messages;
  }

  /**
   * Submit a tool result and continue the conversation
   *
   * @param toolCall - The original tool call from the model
   * @param result - The execution result to send back
   * @param systemPrompt - The system instruction
   * @param conversationHistory - Array of previous messages
   * @param tools - Optional array of tools to include in follow-up request
   * @returns AsyncGenerator yielding StreamChunks
   */
  async *submitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: AnthropicMessage[],
    tools?: ToolDefinition[],
  ): AsyncGenerator<StreamChunk> {
    // Build updated messages including tool result
    // Handle undefined values explicitly to ensure proper content is always sent
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

    // Add tools if provided (needed for follow-up tool calls)
    if (tools && tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(tools);
    }

    // Add extended thinking if budget > 0
    if (thinkingBudget > 0) {
      requestBody.thinking = {
        type: "enabled",
        budget_tokens: thinkingBudget,
      };
      requestBody.temperature = REQUIRED_THINKING_TEMPERATURE;
    } else {
      requestBody.temperature = this.options.temperature ?? DEFAULT_TEMPERATURE;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Stall timeout resets whenever data is received
    const resetStallTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
    };

    // Start the initial timeout
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

      // Reset timeout after receiving response headers
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

      // Process SSE stream with stall timeout reset callback
      yield* this.processSSEStream(response.body, resetStallTimeout);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield { type: "error", error: "Request timed out" };
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

  /**
   * Change the model being used
   */
  setModel(model: ClaudeModel): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): ClaudeModel {
    return this.model;
  }
}
