export type GeminiModel = "gemini-3-flash-preview" | "gemini-3.1-pro-preview";

export interface AnthropicConversationMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

export interface GeminiConversationMessage {
  parts: Array<{ text?: string; [key: string]: unknown }>;
  role?: string;
}

export type ConversationHistory =
  | AnthropicConversationMessage[]
  | GeminiConversationMessage[];

export type ClaudeModel =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

export type AIProvider = "gemini" | "anthropic";

export type AIModel = GeminiModel | ClaudeModel;

export type AIRoute = "direct" | "vertex";

export interface ModelEntry {
  id: AIModel;
  route: AIRoute;
  displayName: string;
  displaySuffix?: string;
  provider: AIProvider;
}

export interface ModelSelection {
  model: AIModel;
  route: AIRoute;
}

/** Maps AIModel identifiers to the IDs expected by Vertex AI endpoints. */
export const VERTEX_MODEL_IDS: Record<AIModel, string> = {
  "claude-opus-4-7": "claude-opus-4-7",
  "claude-sonnet-4-6": "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5@20251001",
  "gemini-3-flash-preview": "gemini-3-flash-preview",
  "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
};

export interface ImageAttachment {
  id: string;
  /** Original filename */
  name: string;
  /** e.g., image/jpeg, image/png */
  mimeType: string;
  /** File size in bytes */
  size: number;
  base64Data: string;
  /** In pixels */
  width?: number;
  /** In pixels */
  height?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: boolean;
  /** Thinking content from models that expose it (e.g., Gemini 2.5 Flash Thinking) */
  reasoning?: string;
  /** Tokens spent on reasoning */
  thoughtTokens?: number;
  isStreaming?: boolean;
  toolCalls?: Array<{
    toolCall: ToolCall;
    result?: ToolResult;
    /** Snapshot before tool execution, used for the diff preview */
    originalCode?: { javascript: string; html: string };
  }>;
  attachments?: ImageAttachment[];
  /** Present only when this message is part of an auto-fix loop */
  autoFix?: {
    attempt: number;
    maxAttempts: number;
    status: "running" | "success" | "stalled" | "capped";
  };
}

export interface ToolInputSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      items?: { type: string };
      [key: string]: unknown;
    }
  >;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema describing the expected input parameters */
  input_schema: ToolInputSchema;
}

/** Tool entry in the shape Anthropic's `/v1/messages` API expects in its `tools` array. */
export interface AnthropicToolParam {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  /**
   * Gemini "thought signature" returned alongside some functionCall parts
   * when thinking is enabled. For the Gemini direct API
   * (generativelanguage.googleapis.com), echo this back as `thoughtSignature`
   * on the functionCall part in the next request.
   */
  thoughtSignature?: string;
}

export interface ToolResult {
  /** Matches the originating ToolCall.id */
  tool_call_id: string;
  status: "success" | "error";
  /** Serialized tool output */
  output?: string;
  /** Only set when status is "error" */
  error?: string;
}

export type StreamChunk =
  | { type: "reasoning"; reasoning: string }
  | { type: "text"; text: string }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "tool_result"; tool_call_id: string; result: ToolResult }
  | {
      type: "usage";
      inputTokens: number;
      outputTokens: number;
      thoughtTokens?: number;
      cacheReadTokens?: number;
      totalCost?: number;
    }
  | { type: "error"; error: string };

export interface GeminiClientOptions {
  /** Default: 16000 */
  thinkingBudgetTokens?: number;
  /** Default: 0 */
  temperature?: number;
}

export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        thought?: boolean;
        functionCall?: { name: string; args?: Record<string, unknown> };
        thoughtSignature?: string;
        thought_signature?: string;
      }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thoughtsTokenCount?: number;
    promptTokensDetails?: Array<{
      modality: string;
      tokenCount: number;
    }>;
    cachedContentTokenCount?: number;
  };
  modelVersion?: string;
  responseId?: string;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  error?: {
    message: string;
    code?: number;
    status?: string;
    details?: Array<{
      "@type": string;
      reason?: string;
      domain?: string;
      metadata?: Record<string, string>;
      locale?: string;
      message?: string;
    }>;
  };
}

export interface AnthropicClientOptions {
  /** Default: 10000 */
  thinkingBudgetTokens?: number;
  /** Default: 1.0 (required when extended thinking is enabled) */
  temperature?: number;
  /** Default: 16000 */
  maxTokens?: number;
}

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "redacted_thinking"; data: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

interface AnthropicMessage {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface AnthropicStreamEvent {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop"
    | "ping"
    | "error";
  message?: AnthropicMessage;
  index?: number;
  content_block?: AnthropicContentBlock;
  delta?: {
    // Known Anthropic SSE delta types. The `(string & {})` branch preserves
    // forward-compatibility with new delta types the server may add, while
    // still giving editors exhaustiveness hints on the known set.
    type:
      | "text_delta"
      | "input_json_delta"
      | "thinking_delta"
      | "signature_delta"
      | "citations_delta"
      | (string & {});
    text?: string;
    thinking?: string;
    partial_json?: string;
    stop_reason?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface CodeContext {
  javascript: string;
  html: string;
  consoleMessages?: Array<{
    type: "log" | "warn" | "error";
    message: string;
  }>;
}

export enum MatchStrategy {
  /** Character-by-character exact match */
  EXACT = "exact",
  /** Whitespace-normalized match */
  WHITESPACE_NORMALIZED = "whitespace_normalized",
  /** Trims each line individually while preserving structure */
  LINE_TRIMMED = "line_trimmed",
  /** Levenshtein-distance fuzzy match */
  FUZZY = "fuzzy",
  /** Context-based pattern match */
  CONTEXT_BASED = "context_based",
}

export interface MatchResult {
  startPos: number;
  endPos: number;
  /** 1-indexed */
  startLine: number;
  /** 1-indexed */
  endLine: number;
  /** Strategy that produced the match */
  strategy: MatchStrategy;
  /** 0-1, where 1 is a perfect match */
  confidence: number;
  /** Matched text from source code */
  matchedText: string;
}

export interface MatchOptions {
  /** Default: all strategies, in declaration order */
  strategies?: MatchStrategy[];
  /** 0-1, default: 0.9 */
  minConfidence?: number;
  /** Default: 2 */
  contextLines?: number;
  /** Default: true */
  caseSensitive?: boolean;
}

export enum DiffFormat {
  /** SEARCH/REPLACE blocks in either Cline-style (------- SEARCH / ======= / +++++++ REPLACE) or legacy (<<<SEARCH>>> / <<<REPLACE>>>) markers */
  SEARCH_REPLACE = "SEARCH_REPLACE",
  /** Standard unified diff with ---/+++ markers */
  UNIFIED = "UNIFIED",
}

export interface DiffBlock {
  search: string;
  replace: string;
  /** Optional line hint for the replacement */
  startLine?: number;
  /** Optional line hint for the replacement */
  endLine?: number;
  format: DiffFormat;
}

/** Aggregates diff-apply and runtime execution results. */
export interface ExecutionResult {
  success: boolean;
  /** Errors during diff application */
  diffErrors: string[];
  /** Runtime console errors observed after execution */
  consoleErrors: Array<{ message: string; type: string }>;
  appliedCount: number;
  timestamp: number;
  executionTimeMs?: number;
}
