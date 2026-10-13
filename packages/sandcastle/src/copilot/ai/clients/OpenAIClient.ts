import type {
  OpenAIModel,
  OpenAIReasoningEffort,
  OpenAIClientOptions,
  OpenAIConversationItem,
  ChatMessage,
  CodeContext,
  StreamChunk,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "../types";
import { buildDiffBasedPrompt } from "../prompts/PromptBuilder";
import {
  createStallTimeout,
  formatStreamError,
  postStreamRequest,
} from "./streamUtils";

// Supported efforts: https://developers.openai.com/api/docs/guides/latest-model
const REASONING_EFFORTS: readonly OpenAIReasoningEffort[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export function getOpenAIReasoningEfforts(
  model: OpenAIModel,
): readonly OpenAIReasoningEffort[] {
  return model === "gpt-6-luna"
    ? ["none", ...REASONING_EFFORTS]
    : REASONING_EFFORTS;
}

/** Normalize stale preferences, including None when switching away from Luna. */
export function resolveOpenAIReasoningEffort(
  model: OpenAIModel,
  effort: unknown,
): OpenAIReasoningEffort {
  return getOpenAIReasoningEfforts(model).includes(
    effort as OpenAIReasoningEffort,
  )
    ? (effort as OpenAIReasoningEffort)
    : "medium";
}

function userContent(
  text: string,
  attachments?: Array<{ mimeType: string; base64Data: string }>,
): OpenAIConversationItem[] {
  return [
    { type: "input_text", text },
    ...(attachments ?? []).map((image) => ({
      type: "input_image",
      image_url: `data:${image.mimeType};base64,${image.base64Data}`,
      detail: "auto",
    })),
  ];
}

export function openAIToolResult(
  call: ToolCall,
  result: ToolResult,
): OpenAIConversationItem {
  return {
    type: "function_call_output",
    call_id: call.id,
    output:
      result.status === "success"
        ? (result.output ?? "Success")
        : (result.error ?? "Unknown error"),
  };
}

/** Replay native items to preserve encrypted reasoning and assistant phase. */
export function buildOpenAIHistory(
  messages: ChatMessage[],
): OpenAIConversationItem[] {
  return messages.flatMap((message): OpenAIConversationItem[] => {
    if (message.error) {
      return [];
    }
    if (message.role === "assistant" && message.openAIOutput) {
      const results = (message.toolCalls ?? []).filter((entry) => entry.result);
      // Reasoning items and their following calls are a unit. Dropping only
      // an unanswered call leaves invalid native history for the next turn.
      const resultIds = new Set(results.map((entry) => entry.toolCall.id));
      if (
        message.openAIOutput.some(
          (item) =>
            item.type === "function_call" &&
            !resultIds.has(item.call_id as string),
        )
      ) {
        return message.content.trim()
          ? [{ role: "assistant", content: message.content }]
          : [];
      }
      return [
        ...message.openAIOutput,
        ...results.map((entry) =>
          openAIToolResult(entry.toolCall, entry.result!),
        ),
      ];
    }
    if (!message.content.trim() && !message.attachments?.length) {
      return [];
    }
    return [
      {
        role: message.role,
        content:
          message.role === "user"
            ? userContent(message.content, message.attachments)
            : message.content,
      },
    ];
  });
}

interface OpenAIResponse {
  status: string;
  output: OpenAIConversationItem[];
  error?: { message?: string };
  incomplete_details?: { reason?: string };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
}

interface OpenAIStreamEvent {
  type: string;
  error?: { message?: string };
  delta?: string;
  message?: string;
  response?: OpenAIResponse;
}

/** Direct, stateless Responses API client; credentials and history stay in the tab. */
export class OpenAIClient {
  private history: OpenAIConversationItem[] = [];
  private reasoningEffort: OpenAIReasoningEffort;
  private maxOutputTokens: number;

  constructor(
    private apiKey: string,
    private model: OpenAIModel = "gpt-6.1-sol",
    options: OpenAIClientOptions = {},
  ) {
    this.reasoningEffort = resolveOpenAIReasoningEffort(
      model,
      options.reasoningEffort,
    );
    // Reasoning consumes the output budget too, particularly at Max.
    this.maxOutputTokens = options.maxOutputTokens ?? 32768;
  }

  async *generateWithContext(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: OpenAIConversationItem[],
    attachments?: Array<{ mimeType: string; base64Data: string }>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    if (!userMessage.trim()) {
      yield { type: "error", error: "User message cannot be empty" };
      return;
    }
    const { systemPrompt, userPrompt } = buildDiffBasedPrompt(
      userMessage,
      context,
      customAddendum,
    );
    this.history = [
      ...(conversationHistory ?? []),
      { role: "user", content: userContent(userPrompt, attachments) },
    ];
    yield* this.send(systemPrompt, tools, abortSignal);
  }

  async *submitToolResult(
    call: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    _conversationHistory: OpenAIConversationItem[],
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    // Continuations belong to the instance that received the native response.
    // Reject a fresh client rather than replaying another provider's history.
    if (
      !this.history.some(
        (item) => item.type === "function_call" && item.call_id === call.id,
      )
    ) {
      yield {
        type: "error",
        error:
          "No matching OpenAI tool call is available. Please resend your message.",
      };
      return;
    }
    this.history = [...this.history, openAIToolResult(call, result)];
    yield* this.send(systemPrompt, tools, abortSignal);
  }

  private async *send(
    systemPrompt: string,
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    const stop = () => controller.abort();
    if (abortSignal?.aborted) {
      yield { type: "error", error: "Request stopped by user" };
      return;
    }
    abortSignal?.addEventListener("abort", stop, { once: true });
    // High-effort reasoning can be silent for longer than the text clients.
    const timeout = createStallTimeout(controller, 180000);
    timeout.reset();
    let completed: OpenAIResponse | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await postStreamRequest(
        "https://api.openai.com/v1/responses",
        { Authorization: `Bearer ${this.apiKey}` },
        {
          model: this.model,
          instructions: systemPrompt,
          input: this.history,
          store: false,
          stream: true,
          reasoning: { effort: this.reasoningEffort, summary: "auto" },
          include: ["reasoning.encrypted_content"],
          max_output_tokens: this.maxOutputTokens,
          parallel_tool_calls: false,
          ...(tools?.length
            ? {
                tools: tools.map((tool) => ({
                  type: "function",
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.input_schema,
                  strict: false,
                })),
              }
            : {}),
        },
        controller,
        timeout,
      );
      if ("error" in response) {
        yield { type: "error", error: response.error };
        return;
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasSummaryText = false;
      while (!completed) {
        const { done, value } = await reader.read();
        timeout.reset();
        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        // SSE frames may span arbitrary network chunks or use CRLF.
        buffer = buffer.replace(/\r\n/g, "\n");
        let separator: number;
        while ((separator = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          const data = frame
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data || data === "[DONE]") {
            continue;
          }
          const event = JSON.parse(data) as OpenAIStreamEvent;
          if (
            event.type === "response.reasoning_summary_part.added" &&
            hasSummaryText
          ) {
            yield { type: "reasoning", reasoning: "\n\n" };
            hasSummaryText = false;
          } else if (
            event.type === "response.output_text.delta" &&
            event.delta
          ) {
            yield { type: "text", text: event.delta };
          } else if (
            event.type === "response.reasoning_summary_text.delta" &&
            event.delta
          ) {
            hasSummaryText = true;
            yield { type: "reasoning", reasoning: event.delta };
          } else if (event.type === "response.refusal.delta" && event.delta) {
            yield { type: "text", text: event.delta };
          } else if (event.type === "response.completed") {
            completed = event.response;
            if (
              !completed ||
              completed.status !== "completed" ||
              !Array.isArray(completed.output)
            ) {
              throw new Error("OpenAI returned an invalid completion.");
            }
          } else if (
            event.type === "response.failed" ||
            event.type === "response.incomplete" ||
            event.type === "error"
          ) {
            throw new Error(
              event.response?.error?.message ??
                event.error?.message ??
                event.message ??
                `OpenAI response ${event.response?.status ?? "failed"}: ${event.response?.incomplete_details?.reason ?? "unknown error"}`,
            );
          }
        }
        if (done) {
          break;
        }
      }
      if (!completed) {
        throw new Error(
          "OpenAI stream ended before the response completed. Please retry.",
        );
      }
    } catch (error) {
      yield formatStreamError(
        error,
        abortSignal,
        "Failed to connect to OpenAI API",
      );
      return;
    } finally {
      // Release transport before yielding tool calls: the consumer may start
      // another streaming request while handling a call.
      if (reader) {
        try {
          await reader.cancel();
        } catch {
          /* Already closed. */
        }
        reader.releaseLock();
      }
      timeout.clear();
      abortSignal?.removeEventListener("abort", stop);
    }

    const output = completed.output;
    const calls = output.filter((item) => item.type === "function_call");
    // Parse every call before yielding any, so truncated/invalid output never
    // applies a partial edit. The UI currently executes one call at a time.
    const parsed: ToolCall[] = [];
    try {
      if (calls.length > 1) {
        throw new Error(
          "OpenAI returned multiple tool calls despite sequential mode. Please retry.",
        );
      }
      for (const call of calls) {
        const input: unknown = JSON.parse(call.arguments as string);
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          typeof call.call_id !== "string" ||
          typeof call.name !== "string"
        ) {
          throw new Error(
            "OpenAI returned invalid tool arguments. Please retry.",
          );
        }
        parsed.push({
          id: call.call_id,
          name: call.name,
          input: input as Record<string, unknown>,
        });
      }
    } catch (error) {
      yield {
        type: "error",
        error:
          error instanceof Error ? error.message : "Invalid OpenAI tool call",
      };
      return;
    }
    this.history = [...this.history, ...output];
    yield { type: "openai_output", output };
    if (completed.usage) {
      yield {
        type: "usage",
        inputTokens: completed.usage.input_tokens,
        outputTokens: completed.usage.output_tokens,
        thoughtTokens: completed.usage.output_tokens_details?.reasoning_tokens,
        cacheReadTokens: completed.usage.input_tokens_details?.cached_tokens,
      };
    }
    for (const toolCall of parsed) {
      yield { type: "tool_call", toolCall };
    }
  }
}
