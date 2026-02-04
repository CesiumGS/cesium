import type {
  GeminiModel,
  GeminiResponse,
  CodeContext,
  GeminiClientOptions,
  StreamChunk,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "./types";
import { CESIUMJS_API_DEPRECATIONS } from "./prompts";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Debug flag for development logging
const DEBUG = import.meta.env?.DEV ?? false;

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
      thinkingBudgetTokens: options.thinkingBudgetTokens ?? 16000,
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
      });

      const data = await response.json();

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
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to connect to Gemini API",
        },
      };
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
      ? this.buildDiffBasedPrompt(userMessage, context, customAddendum)
      : this.buildContextPrompt(userMessage, context, customAddendum);

    const url = `${GEMINI_API_BASE_URL}/models/${this.model}:streamGenerateContent?alt=sse`;

    // Build request configuration with thinking budget and output tokens
    // IMPORTANT: Disable thinking mode when tools are provided to avoid
    // Gemini API bug where thoughtSignature is sometimes not returned,
    // causing subsequent API calls to fail with 400 errors.
    const hasTools = tools && tools.length > 0;
    const thinkingBudget = hasTools
      ? 0
      : (this.options.thinkingBudgetTokens ?? 16000);
    const requestConfig: Record<string, unknown> = {
      temperature: this.options.temperature ?? 0,
      maxOutputTokens: 65536, // Maximum output to prevent premature truncation
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

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        yield {
          type: "error",
          error:
            errorData.error?.message ||
            `HTTP error! status: ${response.status}`,
        };
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
      const reader = response.body.getReader();
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
                if (DEBUG) {
                  console.log(`[GeminiClient] Part #${i + 1}:`, {
                    hasThought: !!part.thought,
                    hasText: !!part.text,
                    hasFunctionCall: !!(part as { functionCall?: unknown })
                      .functionCall,
                    textLength: part.text?.length || 0,
                  });
                }

                if (part.thought && part.text) {
                  const unescapedReasoning = unescapeGeminiContent(part.text);
                  if (DEBUG) {
                    console.log(
                      `[GeminiClient] Yielding reasoning: ${unescapedReasoning.substring(0, 100)}...`,
                    );
                  }
                  yield {
                    type: "reasoning",
                    reasoning: unescapedReasoning,
                  };
                } else if (
                  (
                    part as {
                      functionCall?: {
                        name: string;
                        args: Record<string, unknown>;
                      };
                    }
                  ).functionCall
                ) {
                  // Gemini function call format: { name: string, args: object }
                  const functionCall = (
                    part as {
                      functionCall: {
                        name: string;
                        args: Record<string, unknown>;
                      };
                    }
                  ).functionCall;

                  const thoughtSignature =
                    (part as { thoughtSignature?: string }).thoughtSignature ??
                    (part as { thought_signature?: string })
                      .thought_signature ??
                    (functionCall as { thoughtSignature?: string })
                      .thoughtSignature ??
                    (functionCall as { thought_signature?: string })
                      .thought_signature;

                  if (DEBUG) {
                    console.log(`[GeminiClient] Function call detected:`, {
                      name: functionCall.name,
                      argsKeys: Object.keys(functionCall.args || {}),
                      hasThoughtSignature: !!thoughtSignature,
                      searchLength:
                        typeof functionCall.args?.search === "string"
                          ? functionCall.args.search.length
                          : undefined,
                      replaceLength:
                        typeof functionCall.args?.replace === "string"
                          ? functionCall.args.replace.length
                          : undefined,
                    });
                  }
                  const toolCall: ToolCall = {
                    id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    name: functionCall.name,
                    input: this.unescapeToolInputs(functionCall.args || {}),
                    thoughtSignature,
                  };
                  if (DEBUG) {
                    console.log(
                      `[GeminiClient] Yielding tool_call:`,
                      toolCall.name,
                    );
                  }
                  yield {
                    type: "tool_call",
                    toolCall,
                  };
                  // IMPORTANT: Stop after the first tool call to avoid Gemini sending
                  // multiple functionCall parts in a single response, where later ones
                  // may omit thoughtSignature and cause 400s on follow-up requests.
                  stopAfterToolCall = true;
                  break;
                } else if (part.text) {
                  const unescapedText = unescapeGeminiContent(part.text);
                  if (DEBUG) {
                    console.log(
                      `[GeminiClient] Yielding text: "${unescapedText.substring(0, 100)}..."`,
                    );
                  }
                  yield {
                    type: "text",
                    text: unescapedText,
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
            console.error("Error parsing SSE chunk:", e);
            // Continue processing other chunks
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
      yield {
        type: "error",
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to Gemini API",
      };
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
    const { systemPrompt, userPrompt } = this.buildDiffBasedPrompt(
      userMessage,
      context,
    );
    // For non-streaming API, concatenate system and user prompts
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    return this.generateContent(combinedPrompt);
  }

  /**
   * Build system and user prompts that encourage diff-based edits using the apply_diff tool
   *
   * @param userMessage - The user's request
   * @param context - Current code context
   * @param customAddendum - Optional custom system prompt addendum from user settings
   * @returns Object with systemPrompt and userPrompt strings
   */
  private buildDiffBasedPrompt(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
  ): { systemPrompt: string; userPrompt: string } {
    const consoleSection = this.formatConsoleMessages(context.consoleMessages);

    let systemPrompt = `You are an AI assistant helping with CesiumJS code in Sandcastle.

# CODE EDITING INSTRUCTIONS

## IMPORTANT: Use the apply_diff Tool

You MUST use the \`apply_diff\` tool for ALL code changes. DO NOT output code directly as text.

### How to Use apply_diff:

Call the \`apply_diff\` function with:
- **file**: Either "javascript" or "html"
- **search**: The EXACT code to find (must match character-for-character)
- **replace**: The new code to replace with

### CRITICAL RULES:

1. **Exact Matching Required:**
   - \`search\` content must match the file EXACTLY
   - Character-for-character including whitespace, tabs, spaces
   - Include all comments, blank lines, formatting
   - Never truncate lines mid-way through
   - Each line must be complete

2. **First Match Only:**
   - Each tool call replaces only the FIRST occurrence
   - Use multiple tool calls for multiple changes
   - Make calls in the order they appear in the file

3. **Include All Lines:**
   - Include ALL lines in the section being edited, both changed AND unchanged
   - Do NOT omit unchanged lines between changes
   - Include the complete code section from start to end

4. **Special Operations:**
   - **Delete code:** Use empty string in \`replace\`
   - **Add code:** Include anchor line in \`search\`
5. **One Tool Call per Response:**
   - Make at most ONE \`apply_diff\` call
   - After calling the tool, STOP and wait for the tool result

### AUTO-FORMATTING AWARENESS:

- After changes are applied, the editor may auto-format the code
- This can modify indentation, quotes, line breaks, imports, etc.
- For SUBSEQUENT edits, use the FORMATTED version as reference
- CRITICAL: \`search\` must match the actual formatted code in the file

## RESPONSE FORMAT:

- Be concise and direct
- Skip "I will..." preambles - just use the tool
- Brief explanation (1-2 sentences) ONLY if the change needs context
- Then immediately call apply_diff
- No verbose descriptions of what you're about to do
${CESIUMJS_API_DEPRECATIONS}`;

    // Append custom addendum to system prompt if provided
    if (customAddendum && customAddendum.trim()) {
      systemPrompt += `

# IMPORTANT USER INSTRUCTIONS

${customAddendum.trim()}`;
    }

    const userPrompt = `Current JavaScript Code:
\`\`\`javascript
${context.javascript}
\`\`\`

Current HTML:
\`\`\`html
${context.html}
\`\`\`
${consoleSection}

User Request: ${userMessage}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Build system and user prompts with code context (original format, backward compatible)
   * This format requests full code blocks instead of diffs
   *
   * @param userMessage - The user's request
   * @param context - Current code context
   * @param customAddendum - Optional custom system prompt addendum from user settings
   * @returns Object with systemPrompt and userPrompt strings
   */
  private buildContextPrompt(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
  ): { systemPrompt: string; userPrompt: string } {
    const consoleSection = this.formatConsoleMessages(context.consoleMessages);

    let systemPrompt = `You are an AI assistant helping with CesiumJS code in Sandcastle.

When suggesting code changes:
1. Provide clear explanations
2. If modifying existing code, use code blocks with the full modified sections
3. If creating new code, provide complete, runnable examples
4. Use CesiumJS best practices and the Cesium API correctly
${CESIUMJS_API_DEPRECATIONS}`;

    // Append custom addendum to system prompt if provided
    if (customAddendum && customAddendum.trim()) {
      systemPrompt += `

# IMPORTANT USER INSTRUCTIONS

${customAddendum.trim()}`;
    }

    const userPrompt = `Current JavaScript Code:
\`\`\`javascript
${context.javascript}
\`\`\`

Current HTML:
\`\`\`html
${context.html}
\`\`\`
${consoleSection}

User Request: ${userMessage}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Format console messages for inclusion in the prompt
   *
   * @param consoleMessages - Array of console messages from the sandbox
   * @returns Formatted console section or empty string if no messages
   */
  private formatConsoleMessages(
    consoleMessages?: Array<{
      type: "log" | "warn" | "error";
      message: string;
    }>,
  ): string {
    if (!consoleMessages || consoleMessages.length === 0) {
      return "";
    }

    const logs = consoleMessages.filter((msg) => msg.type === "log");
    const warnings = consoleMessages.filter((msg) => msg.type === "warn");
    const errors = consoleMessages.filter((msg) => msg.type === "error");

    let section = "\nConsole Output:\n";

    if (errors.length > 0) {
      section += "\nErrors:\n";
      errors.forEach((error, index) => {
        section += `  ${index + 1}. ${error.message}\n`;
      });
    }

    if (warnings.length > 0) {
      section += "\nWarnings:\n";
      warnings.forEach((warning, index) => {
        section += `  ${index + 1}. ${warning.message}\n`;
      });
    }

    if (logs.length > 0) {
      section += "\nLogs:\n";
      logs.forEach((log, index) => {
        section += `  ${index + 1}. ${log.message}\n`;
      });
    }

    section += "\n";
    return section;
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
    conversationHistory: Array<{ parts: unknown[]; role?: string }>,
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
      maxOutputTokens: 65536, // Maximum output to prevent premature truncation
    };

    // IMPORTANT: Disable thinking mode when tools are provided to avoid
    // Gemini API bug where thoughtSignature is sometimes not returned,
    // causing subsequent API calls to fail with 400 errors.
    const hasTools = tools && tools.length > 0;
    const thinkingBudget = hasTools
      ? 0
      : (this.options.thinkingBudgetTokens ?? 16000);
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

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        yield {
          type: "error",
          error:
            errorData.error?.message ||
            `HTTP error! status: ${response.status}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          type: "error",
          error: "No response body",
        };
        return;
      }

      // Process SSE stream (same logic as generateWithContext)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let stopAfterToolCall = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

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

                const functionCall = (part as { functionCall?: unknown })
                  .functionCall as
                  | { name: string; args?: Record<string, unknown> }
                  | undefined;
                if (functionCall) {
                  const thoughtSignature =
                    (part as { thoughtSignature?: string }).thoughtSignature ??
                    (part as { thought_signature?: string })
                      .thought_signature ??
                    (functionCall as { thoughtSignature?: string })
                      .thoughtSignature ??
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
          } catch (error) {
            console.error("Failed to parse streaming chunk:", error);
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
      yield {
        type: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during tool result submission",
      };
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
