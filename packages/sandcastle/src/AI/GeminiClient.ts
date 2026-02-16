import type {
  GeminiModel,
  GeminiResponse,
  GeminiConversationMessage,
  CodeContext,
  GeminiClientOptions,
  StreamChunk,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "./types";
import { buildDiffBasedPrompt, buildContextPrompt } from "./PromptBuilder";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Stall timeout - resets whenever data is received from the stream.
// Mirrors AnthropicClient's timeout behavior.
const STALL_TIMEOUT_MS = 60000; // 60 seconds of inactivity before timeout

// Debug flag for development logging
const DEBUG = import.meta.env?.DEV ?? false;

const DEFAULT_THINKING_BUDGET_TOKENS = 16000;
const MAX_OUTPUT_TOKENS = 65536;

/**
 * Unescape Gemini's double-escaped content
 * See: https://discuss.ai.google.dev/t/function-call-string-property-is-double-escaped/37867
 */
function unescapeGeminiContent(content: string): string {
  return content
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

/** Runtime type guard for Gemini function call parts */
interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args?: Record<string, unknown>;
    thoughtSignature?: string;
    thought_signature?: string;
  };
  thoughtSignature?: string;
  thought_signature?: string;
}

function isFunctionCallPart(part: unknown): part is GeminiFunctionCallPart {
  if (typeof part !== "object" || part === null) {
    return false;
  }
  const fc = (part as Record<string, unknown>).functionCall;
  return (
    typeof fc === "object" &&
    fc !== null &&
    typeof (fc as Record<string, unknown>).name === "string"
  );
}

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

  /**
   * Convert our ToolDefinition format to Gemini's function declaration format
   */
  private convertToolsToFunctionDeclarations(tools: ToolDefinition[]): unknown {
    return {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      })),
    };
  }

  /**
   * Unescape all string values in tool inputs to handle Gemini's double-escaping bug.
   * See: https://discuss.ai.google.dev/t/function-call-string-property-is-double-escaped/37867
   *
   * @param args - The raw tool arguments from Gemini
   * @returns The unescaped arguments
   */
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
   * Test the API key by making a simple request
   */
  async testApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await this.generateContent("Say 'API key is valid'");
      if (response.error) {
        return { valid: false, error: response.error.message };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate content from Gemini API
   */
  async generateContent(prompt: string): Promise<GeminiResponse> {
    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:generateContent`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      let data: GeminiResponse;
      try {
        data = await response.json();
      } catch {
        return {
          error: {
            message: `HTTP error! status: ${response.status}`,
            code: response.status,
          },
        };
      }

      if (!response.ok) {
        return {
          error: {
            message:
              data.error?.message || `HTTP error! status: ${response.status}`,
            code: response.status,
          },
        };
      }

      // Log raw response for debugging artifacts
      if (DEBUG && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text;
        console.log(
          "[GeminiClient] Raw response text:",
          `${rawText.substring(0, 500)}...`,
        );

        // Check for common artifacts
        const hasHtmlEntities = /&(gt|lt|quot|amp);/.test(rawText);
        const hasMarkdownBlocks = rawText.includes("```");
        const hasSearchReplace = rawText.includes("<<<SEARCH>>>");

        console.log("[GeminiClient] Artifact detection:", {
          hasHtmlEntities,
          hasMarkdownBlocks,
          hasSearchReplace,
          length: rawText.length,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { error: { message: "Request timed out" } };
      }
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to connect to Gemini API",
        },
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
   * @param conversationHistory - Optional array of previous content objects for context
   * @param attachments - Optional array of image attachments for the current message
   * @returns AsyncGenerator that yields StreamChunk types
   */
  async *generateWithContext(
    userMessage: string,
    context: CodeContext,
    useDiffFormat: boolean = true,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: Array<{ parts: Array<{ text: string }> }>,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
  ): AsyncGenerator<StreamChunk> {
    const { systemPrompt, userPrompt } = useDiffFormat
      ? buildDiffBasedPrompt(userMessage, context, customAddendum)
      : buildContextPrompt(userMessage, context, customAddendum);

    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:streamGenerateContent?alt=sse`;

    // Build request configuration with thinking budget and output tokens
    // IMPORTANT: Disable thinking mode when tools are provided to avoid
    // Gemini API bug where thoughtSignature is sometimes not returned,
    // causing subsequent API calls to fail with 400 errors.
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

    if (hasTools && DEBUG) {
      console.log(
        "[GeminiClient] Thinking mode disabled due to tools being provided (workaround for thoughtSignature bug)",
      );
    }

    // Build request body
    // Use conversation history if provided, otherwise send single user message
    // Build current user message parts (text + images)
    const currentUserParts: Array<{
      text?: string;
      inline_data?: { mime_type: string; data: string };
    }> = [{ text: userPrompt }];

    // Add image attachments if present (Gemini format)
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        currentUserParts.push({
          inline_data: {
            mime_type: attachment.mimeType,
            data: attachment.base64Data, // Already without data URL prefix
          },
        });
      }
    }

    const contents =
      conversationHistory && conversationHistory.length > 0
        ? [...conversationHistory, { parts: currentUserParts }]
        : [{ parts: currentUserParts }];

    const requestBody: Record<string, unknown> = {
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
      contents: contents,
      generationConfig: requestConfig,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
      if (DEBUG) {
        console.log(
          `[GeminiClient] Tools provided to API: ${tools.length} tool(s)`,
          tools.map((t) => t.name),
        );
      }
    } else if (DEBUG) {
      console.log("[GeminiClient] NO TOOLS provided to API");
    }

    // Log request configuration (without full code context for brevity)
    if (DEBUG) {
      console.log("[GeminiClient] Request configuration:", {
        model: this.model,
        temperature: requestConfig.temperature,
        thinkingBudget: (
          requestConfig.thinkingConfig as { thinkingBudget?: number }
        )?.thinkingBudget,
        hasSystemPrompt: !!systemPrompt,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        toolsCount: tools?.length || 0,
      });

      // Log the first 500 chars of system prompt to verify tool instructions
      console.log(
        "[GeminiClient] System prompt preview:",
        `${systemPrompt.substring(0, 500)}...`,
      );

      // Log tool definitions if provided
      if (tools && tools.length > 0) {
        console.log(
          "[GeminiClient] Tool definitions:",
          tools.map((t) => ({
            name: t.name,
            descriptionPreview: `${t.description.substring(0, 100)}...`,
            inputSchemaKeys: Object.keys(t.input_schema.properties || {}),
          })),
        );
      }
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resetStallTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
    };

    resetStallTimeout();

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
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
        yield {
          type: "error",
          error: "No response body",
        };
        return;
      }

      // Track usage metadata
      let thoughtsTokenCount = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      // Process SSE stream
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chunkNumber = 0;
      let stopAfterToolCall = false;

      if (DEBUG) {
        console.log("[GeminiClient] Starting SSE stream processing...");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (DEBUG) {
            console.log("[GeminiClient] Stream done");
          }
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
            if (DEBUG) {
              console.log("[GeminiClient] Received [DONE] marker");
            }
            continue;
          }

          try {
            chunkNumber++;
            const chunk = JSON.parse(data) as GeminiResponse;
            if (DEBUG) {
              console.log(`[GeminiClient] Parsing chunk #${chunkNumber}:`, {
                hasCandidates: !!chunk.candidates,
                candidateCount: chunk.candidates?.length,
                hasError: !!chunk.error,
                hasUsageMetadata: !!chunk.usageMetadata,
              });
            }

            // Handle error responses
            if (chunk.error) {
              yield {
                type: "error",
                error: chunk.error.message,
              };
              return;
            }

            // Extract thought/reasoning parts and function calls
            const parts = chunk?.candidates?.[0]?.content?.parts;
            if (parts) {
              if (DEBUG) {
                console.log(
                  `[GeminiClient] Processing ${parts.length} part(s) in chunk #${chunkNumber}`,
                );
              }
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

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

                  if (DEBUG) {
                    console.log(`[GeminiClient] Function call detected:`, {
                      name: functionCall.name,
                      hasThoughtSignature: !!thoughtSignature,
                    });
                  }
                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                      name: functionCall.name,
                      input: this.unescapeToolInputs(functionCall.args || {}),
                      thoughtSignature,
                    },
                  };
                  // IMPORTANT: Stop after the first tool call to avoid Gemini sending
                  // multiple functionCall parts in a single response, where later ones
                  // may omit thoughtSignature and cause 400s on follow-up requests.
                  stopAfterToolCall = true;
                  break;
                } else if (part.text) {
                  yield {
                    type: "text",
                    text: unescapeGeminiContent(part.text),
                  };
                }
              }
            } else if (DEBUG) {
              console.log(`[GeminiClient] Chunk #${chunkNumber} has no parts`);
            }

            // Track usage metadata
            if (chunk.usageMetadata) {
              thoughtsTokenCount =
                chunk.usageMetadata.thoughtsTokenCount ?? thoughtsTokenCount;
              inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
              outputTokens =
                chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
            }
          } catch (e) {
            const errorMsg = `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`;
            if (DEBUG) {
              console.error("[GeminiClient]", errorMsg);
            }
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

      // Yield final usage information
      yield {
        type: "usage",
        inputTokens,
        outputTokens,
        thoughtTokens: thoughtsTokenCount > 0 ? thoughtsTokenCount : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield { type: "error", error: "Request timed out" };
      } else {
        yield {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to connect to Gemini API",
        };
      }
    } finally {
      reader?.releaseLock();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Generate diff-based edits using the SEARCH/REPLACE format
   * This method explicitly requests targeted edits instead of full file replacements
   *
   * @param userMessage - The user's request
   * @param context - Current code context
   * @returns Promise resolving to Gemini API response with diff format
   */
  async generateDiffBasedEdit(
    userMessage: string,
    context: CodeContext,
  ): Promise<GeminiResponse> {
    const { systemPrompt, userPrompt } = buildDiffBasedPrompt(
      userMessage,
      context,
    );
    // For non-streaming API, concatenate system and user prompts
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    return this.generateContent(combinedPrompt);
  }

  /**
   * Extract text response from Gemini response
   */
  static extractText(response: GeminiResponse): string {
    if (response.error) {
      throw new Error(response.error.message);
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("No response generated");
    }

    const text = candidate.content.parts[0]?.text;
    if (!text) {
      throw new Error("Empty response");
    }

    return text;
  }

  /**
   * Build a function response part for Gemini API
   * @private
   */
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

  /**
   * Submit a tool result and continue the conversation
   *
   * @param toolCall - The original tool call from the model
   * @param result - The execution result to send back
   * @param systemPrompt - The system instruction
   * @param conversationHistory - Array of previous message contents
   * @param tools - Optional tools array (re-sent so Gemini can chain tool calls)
   * @returns AsyncGenerator yielding StreamChunks
   */
  async *submitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: GeminiConversationMessage[],
    tools?: ToolDefinition[],
  ): AsyncGenerator<StreamChunk> {
    // Build the function response
    const functionResponsePart = this.buildFunctionResponsePart(
      toolCall,
      result,
    );

    // Append to conversation history
    const updatedContents = [
      ...conversationHistory,
      {
        role: "user",
        parts: [functionResponsePart],
      },
    ];

    // Make streaming API request with updated conversation
    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:streamGenerateContent?alt=sse`;

    const requestConfig: Record<string, unknown> = {
      temperature: this.options.temperature ?? 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    };

    // IMPORTANT: Disable thinking mode when tools are provided to avoid
    // Gemini API bug where thoughtSignature is sometimes not returned,
    // causing subsequent API calls to fail with 400 errors.
    const hasTools = tools && tools.length > 0;
    const thinkingBudget = hasTools
      ? 0
      : (this.options.thinkingBudgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS);
    if (thinkingBudget > 0) {
      requestConfig.thinkingConfig = {
        thinkingBudget: thinkingBudget,
        includeThoughts: true,
      };
    }

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: updatedContents,
      generationConfig: requestConfig,
    } as Record<string, unknown>;

    // Re-send tools so Gemini can continue calling them after a tool response.
    if (hasTools) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resetStallTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
    };

    resetStallTimeout();

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

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
        yield {
          type: "error",
          error: "No response body",
        };
        return;
      }

      resetStallTimeout();

      // Process SSE stream (same logic as generateWithContext)
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

            // Handle error responses
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
                  continue;
                }

                if (isFunctionCallPart(part)) {
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
                  // IMPORTANT: Stop after the first tool call to avoid Gemini sending
                  // multiple functionCall parts in a single response, where later ones
                  // may omit thoughtSignature and cause 400s on follow-up requests.
                  stopAfterToolCall = true;
                  break;
                }

                if (part.text) {
                  yield {
                    type: "text",
                    text: unescapeGeminiContent(part.text),
                  };
                }
              }
            }

            // Handle usage metadata
            const usageMetadata = chunk?.usageMetadata;
            if (usageMetadata) {
              yield {
                type: "usage",
                inputTokens: usageMetadata.promptTokenCount || 0,
                outputTokens: usageMetadata.candidatesTokenCount || 0,
                thoughtTokens: usageMetadata.thoughtsTokenCount || 0,
              };
            }
          } catch (e) {
            const errorMsg = `Stream parsing error: ${e instanceof Error ? e.message : "Unknown error"}`;
            if (DEBUG) {
              console.error("[GeminiClient]", errorMsg);
            }
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
      reader?.releaseLock();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Change the model being used
   */
  setModel(model: GeminiModel): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): GeminiModel {
    return this.model;
  }
}
