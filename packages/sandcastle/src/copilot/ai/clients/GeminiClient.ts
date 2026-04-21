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
} from "../types";
import {
  buildDiffBasedPrompt,
  buildContextPrompt,
} from "../prompts/PromptBuilder";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Inactivity timeout; resets on every stream chunk.
const STALL_TIMEOUT_MS = 60000;

const DEFAULT_THINKING_BUDGET_TOKENS = 16000;
const MAX_OUTPUT_TOKENS = 65536;

/**
 * Gemini double-escapes string content in responses.
 * https://discuss.ai.google.dev/t/function-call-string-property-is-double-escaped/37867
 */
function unescapeGeminiContent(content: string): string {
  return content
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

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

  /** Defaults to requesting diff-based edits for targeted changes. */
  async *generateWithContext(
    userMessage: string,
    context: CodeContext,
    useDiffFormat: boolean = true,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: Array<{ parts: Array<{ text: string }> }>,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    if (!userMessage || userMessage.trim().length === 0) {
      yield { type: "error", error: "User message cannot be empty" };
      return;
    }

    const { systemPrompt, userPrompt } = useDiffFormat
      ? buildDiffBasedPrompt(userMessage, context, customAddendum)
      : buildContextPrompt(userMessage, context, customAddendum);

    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:streamGenerateContent?alt=sse`;

    // IMPORTANT: Disable thinking when tools are in play. Gemini sometimes omits
    // thoughtSignature on tool-call parts, which causes follow-up requests to
    // 400. Turning off thinking avoids the missing-signature case entirely.
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

    if (tools && tools.length > 0) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
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
              yield {
                type: "error",
                error: chunk.error.message,
              };
              return;
            }

            const parts = chunk?.candidates?.[0]?.content?.parts;
            if (parts) {
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

                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                      name: functionCall.name,
                      input: this.unescapeToolInputs(functionCall.args || {}),
                      thoughtSignature,
                    },
                  };
                  // Stop after the first tool call: Gemini sometimes emits
                  // additional functionCall parts that omit thoughtSignature,
                  // which breaks follow-up requests with a 400.
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

  /** Non-streaming variant that requests SEARCH/REPLACE format. */
  async generateDiffBasedEdit(
    userMessage: string,
    context: CodeContext,
  ): Promise<GeminiResponse> {
    const { systemPrompt, userPrompt } = buildDiffBasedPrompt(
      userMessage,
      context,
    );
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    return this.generateContent(combinedPrompt);
  }

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
      {
        role: "user",
        parts: [functionResponsePart],
      },
    ];

    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:streamGenerateContent?alt=sse`;

    const requestConfig: Record<string, unknown> = {
      temperature: this.options.temperature ?? 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    };

    // See thoughtSignature workaround note in generateWithContext.
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

    // Re-send tools so Gemini can chain further calls after a tool response.
    if (hasTools) {
      requestBody.tools = [this.convertToolsToFunctionDeclarations(tools)];
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
                  // See thoughtSignature note in generateWithContext.
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
      reader?.releaseLock();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  setModel(model: GeminiModel): void {
    this.model = model;
  }

  getModel(): GeminiModel {
    return this.model;
  }
}
