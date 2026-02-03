export type GeminiModel = "gemini-3-flash-preview" | "gemini-3-pro-preview";

// ============================================================================
// Conversation History Types
// ============================================================================

/**
 * Message format for Anthropic conversation history (client-side format)
 */
export interface AnthropicConversationMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Message format for Gemini conversation history
 */
export interface GeminiConversationMessage {
  parts: Array<{ text?: string; [key: string]: unknown }>;
  role?: string;
}

/**
 * Union type for conversation history across providers
 */
export type ConversationHistory =
  | AnthropicConversationMessage[]
  | GeminiConversationMessage[];

/**
 * Claude model types (Anthropic direct API)
 */
export type ClaudeModel =
  | "claude-opus-4-5-20251101"
  | "claude-sonnet-4-5-20250929"
  | "claude-haiku-4-5-20251001";

/**
 * AI provider type
 */
export type AIProvider = "gemini" | "anthropic";

/**
 * Union type of all available AI models
 */
export type AIModel = GeminiModel | ClaudeModel;

/**
 * Model information for UI display
 */
export interface ModelInfo {
  id: AIModel;
  displayName: string;
  description: string;
  provider: AIProvider;
  badge: string;
}

/**
 * Represents an image attachment in a chat message
 */
export interface ImageAttachment {
  /** Unique identifier for this attachment */
  id: string;
  /** Original filename */
  name: string;
  /** MIME type (e.g., image/jpeg, image/png) */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Base64-encoded image data */
  base64Data: string;
  /** Image width in pixels (optional) */
  width?: number;
  /** Image height in pixels (optional) */
  height?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: boolean;
  /** AI reasoning/thinking content (from Gemini 2.5 Flash Thinking or for displaying thinking content) */
  reasoning?: string;
  /** Number of tokens used for reasoning */
  thoughtTokens?: number;
  /** Whether the message is currently streaming */
  isStreaming?: boolean;
  /** Thinking signature for API resubmission */
  thinkingSignature?: string;
  /** Redacted thinking data */
  thinkingData?: string;
  /** Tool calls made by the AI in this message */
  toolCalls?: Array<{
    toolCall: ToolCall;
    result?: ToolResult;
    /** Original code before tool execution (for diff preview) */
    originalCode?: { javascript: string; html: string };
  }>;
  /** Image attachments for multimodal chat */
  attachments?: ImageAttachment[];
}

// ============================================================================
// Tool Calling Types (Roo Code Style)
// ============================================================================

/**
 * JSON Schema definition for tool input parameters
 */
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

/**
 * Definition of a tool that can be called by the LLM
 */
export interface ToolDefinition {
  /** Unique identifier for the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema describing the expected input parameters */
  input_schema: ToolInputSchema;
}

/**
 * A tool call requested by the LLM
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool to call */
  name: string;
  /** Input parameters for the tool (JSON object) */
  input: Record<string, unknown>;
  /**
   * Gemini "thought signature" returned alongside some functionCall parts when
   * thinking is enabled. For the Gemini API (generativelanguage.googleapis.com),
   * echo this back as `thoughtSignature` on the functionCall part in the next request.
   */
  thoughtSignature?: string;
}

/**
 * Result of executing a tool
 */
export interface ToolResult {
  /** ID matching the original tool call */
  tool_call_id: string;
  /** Success/error status */
  status: "success" | "error";
  /** Output from the tool (serialized as string) */
  output?: string;
  /** Error message if status is "error" */
  error?: string;
}

/**
 * Union type representing different chunk types during streaming
 */
export type StreamChunk =
  | { type: "reasoning"; reasoning: string }
  | { type: "text"; text: string }
  | { type: "diff_start"; language: "javascript" | "html"; diffIndex: number }
  | { type: "diff_search"; content: string; diffIndex: number }
  | { type: "diff_replace"; content: string; diffIndex: number }
  | { type: "diff_complete"; diff: DiffBlock; diffIndex: number }
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
  | { type: "error"; error: string }
  | { type: "ant_thinking"; thinking: string; signature: string }
  | { type: "ant_redacted_thinking"; data: string };

/**
 * Token usage statistics for AI requests
 */
export interface TokenUsage {
  /** Number of input tokens consumed */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Number of tokens used for reasoning/thinking (optional) */
  thoughtTokens?: number;
  /** Number of tokens read from cache (optional) */
  cacheReadTokens?: number;
  /** Number of tokens written to cache (optional) */
  cacheWriteTokens?: number;
  /** Total cost in dollars for this request (optional) */
  totalCost?: number;
}

/**
 * Options for configuring streaming behavior
 */
export interface StreamingOptions {
  /** Budget for extended thinking in tokens (optional) */
  thinkingBudgetTokens?: number;
  /** Temperature parameter for response randomness (0.0-2.0, optional) */
  temperature?: number;
  /** Whether to include thinking/reasoning in the response (optional) */
  includeThoughts?: boolean;
}

/**
 * Options for configuring the Gemini client
 */
export interface GeminiClientOptions {
  /** Thinking budget in tokens (default: 16000) */
  thinkingBudgetTokens?: number;
  /** Temperature for generation (default: 0) */
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

// ============================================================================
// Anthropic API Types (Direct API)
// ============================================================================

/**
 * Options for configuring the Anthropic client
 */
export interface AnthropicClientOptions {
  /** Extended thinking budget in tokens (default: 10000) */
  thinkingBudgetTokens?: number;
  /** Temperature for generation (default: 1.0 - required for extended thinking) */
  temperature?: number;
  /** Maximum output tokens (default: 16000) */
  maxTokens?: number;
}

/**
 * Content block types in Anthropic API responses
 */
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

/**
 * Anthropic message response structure
 */
export interface AnthropicMessage {
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

/**
 * SSE stream event types from Anthropic API
 */
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
    type: string;
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

export interface EditOperation {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
}

export interface CodeContext {
  javascript: string;
  html: string;
  consoleMessages?: Array<{
    type: "log" | "warn" | "error";
    message: string;
  }>;
}

/**
 * Strategy used for matching code sections
 */
export enum MatchStrategy {
  /** Character-by-character exact match */
  EXACT = "exact",
  /** Whitespace-normalized match */
  WHITESPACE_NORMALIZED = "whitespace_normalized",
  /** Line-trimmed match - trims each line individually while preserving structure */
  LINE_TRIMMED = "line_trimmed",
  /** Fuzzy match using Levenshtein distance */
  FUZZY = "fuzzy",
  /** Context-based pattern match */
  CONTEXT_BASED = "context_based",
}

/**
 * Result of a match operation
 */
export interface MatchResult {
  /** Starting character position in the source code */
  startPos: number;
  /** Ending character position in the source code */
  endPos: number;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Strategy that successfully matched */
  strategy: MatchStrategy;
  /** Confidence score (0-1, where 1 is perfect match) */
  confidence: number;
  /** Matched text from source code */
  matchedText: string;
}

/**
 * Options for configuring match behavior
 */
export interface MatchOptions {
  /** Strategies to attempt, in order (default: all strategies) */
  strategies?: MatchStrategy[];
  /** Minimum confidence threshold (0-1, default: 0.9) */
  minConfidence?: number;
  /** Number of context lines to use for context-based matching (default: 2) */
  contextLines?: number;
  /** Case-sensitive matching (default: true) */
  caseSensitive?: boolean;
}

/**
 * Supported diff formats for AI-generated code changes
 */
export enum DiffFormat {
  /** SEARCH/REPLACE format with <<<SEARCH>>>/<<<REPLACE>>> markers (legacy) */
  SEARCH_REPLACE = "SEARCH_REPLACE",
  /** Cline-style format with ------- SEARCH / ======= / +++++++ REPLACE markers (new default) */
  CLINE_FORMAT = "CLINE_FORMAT",
  /** Standard unified diff format with ---/+++ markers */
  UNIFIED = "UNIFIED",
}

/**
 * Represents a single diff block containing search and replace content
 */
export interface DiffBlock {
  /** The content to search for in the source code */
  search: string;
  /** The content to replace the search string with */
  replace: string;
  /** Optional start line number hint for the replacement */
  startLine?: number;
  /** Optional end line number hint for the replacement */
  endLine?: number;
  /** The format of this diff block */
  format: DiffFormat;
}

/**
 * Represents a parsed diff with metadata
 */
export interface ParsedDiff {
  /** The diff block containing search and replace content */
  block: DiffBlock;
  /** Original raw text of the diff block */
  raw: string;
  /** Zero-based index of this diff in the source content */
  index: number;
}

/**
 * Custom error class for diff parsing errors
 */
export class DiffParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: string,
  ) {
    super(message);
    this.name = "DiffParseError";
    Object.setPrototypeOf(this, DiffParseError.prototype);
  }
}

/**
 * Options for applying diffs
 */
export interface ApplyOptions {
  /** If true, don't modify the source code, just validate */
  dryRun?: boolean;
  /** If true, fail on first error. If false, continue and report all errors */
  strict?: boolean;
  /** If true, allow diffs that overlap (merge them). If false, fail on overlaps */
  allowOverlaps?: boolean;
  /** Matching options to pass to DiffMatcher */
  matchOptions?: MatchOptions;
}

/**
 * Result of applying diffs
 */
export interface ApplyResult {
  /** Whether all diffs were successfully applied */
  success: boolean;
  /** The modified source code (only if success=true or strict=false) */
  modifiedCode?: string;
  /** List of diffs that were successfully applied */
  appliedDiffs: AppliedDiff[];
  /** List of errors encountered */
  errors: DiffError[];
  /** Validation result (if dryRun was true) */
  validation?: ValidationResult;
}

/**
 * Information about a successfully applied diff
 */
export interface AppliedDiff {
  /** The original diff block */
  originalDiff: DiffBlock;
  /** The match result showing where it was found */
  matchResult: MatchResult;
  /** Character offset adjustment applied after this diff */
  offsetAdjustment: number;
  /** The index of this diff in the input array */
  inputIndex: number;
}

/**
 * Result of validating diffs before application
 */
export interface ValidationResult {
  /** Whether all diffs can be applied */
  valid: boolean;
  /** List of conflicts detected */
  conflicts: Conflict[];
  /** List of diffs that could not be matched */
  unmatchedDiffs: UnmatchedDiff[];
  /** Total number of diffs that were validated */
  totalDiffs: number;
  /** Number of diffs that matched successfully */
  matchedDiffs: number;
}

/**
 * Represents a conflict between two or more diffs
 */
export interface Conflict {
  /** Type of conflict */
  type: ConflictType;
  /** Diffs involved in the conflict */
  diffs: Array<{
    diff: DiffBlock;
    inputIndex: number;
    matchResult: MatchResult;
  }>;
  /** Human-readable description of the conflict */
  description: string;
}

/**
 * Types of conflicts that can occur
 */
export enum ConflictType {
  /** Two diffs have overlapping regions */
  OVERLAPPING_REGIONS = "overlapping_regions",
  /** Two diffs modify the same text */
  DUPLICATE_MATCH = "duplicate_match",
  /** Diffs are ordered incorrectly and would interfere */
  ORDER_DEPENDENCY = "order_dependency",
}

/**
 * Information about a diff that could not be matched
 */
export interface UnmatchedDiff {
  /** The diff that failed to match */
  diff: DiffBlock;
  /** The index of this diff in the input array */
  inputIndex: number;
  /** Reason why it couldn't be matched */
  reason: string;
}

/**
 * Error that occurred during diff application
 */
export interface DiffError {
  /** Type of error */
  type: DiffErrorType;
  /** Human-readable error message */
  message: string;
  /** The diff that caused the error */
  diff?: DiffBlock;
  /** The index of the diff in the input array */
  inputIndex?: number;
  /** Additional context about the error */
  context?: string;
}

/**
 * Types of errors that can occur during diff application
 */
export enum DiffErrorType {
  /** Diff could not be matched in source code */
  NO_MATCH = "no_match",
  /** Multiple possible matches found */
  AMBIGUOUS_MATCH = "ambiguous_match",
  /** Diffs overlap in conflicting ways */
  CONFLICT = "conflict",
  /** Diff was already applied */
  ALREADY_APPLIED = "already_applied",
  /** Internal error during application */
  INTERNAL_ERROR = "internal_error",
}

/**
 * Represents a pending inline change in the editor
 */
export interface InlineChange {
  /** Unique identifier for this change */
  id: string;
  /** The diff block containing the change */
  diff: DiffBlock;
  /** Which file this change applies to */
  language: "javascript" | "html";
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Timestamp when the change was suggested */
  timestamp: number;
  /** Source of the change (e.g., "Copilot") */
  source?: string;
}

// ============================================================================
// Auto-Iteration Types
// ============================================================================

/**
 * Detailed information about a console error
 */
export interface ConsoleError {
  /** Error message text */
  message: string;
  /** Type of console message */
  type: "error" | "warn";
  /** Stack trace if available */
  stack?: string;
  /** Timestamp when error occurred */
  timestamp?: number;
}

/**
 * Complete execution result including both diff application and runtime errors
 */
export interface ExecutionResult {
  /** Whether the execution was successful overall */
  success: boolean;
  /** Errors that occurred during diff application */
  diffErrors: string[];
  /** Runtime console errors that occurred after execution */
  consoleErrors: ConsoleError[];
  /** Number of diffs that were successfully applied */
  appliedCount: number;
  /** Timestamp when execution completed */
  timestamp: number;
  /** Time taken to execute in milliseconds */
  executionTimeMs?: number;
}

/**
 * Configuration options for auto-iteration behavior
 */
export interface AutoIterationConfig {
  /** Whether auto-iteration is enabled */
  enabled: boolean;
  /** Maximum number of iterations per error (default: 3) */
  maxIterations: number;
  /** Maximum total requests across entire conversation (default: 20) */
  maxTotalRequests: number;
  /** Number of consecutive mistakes before escalating to user (default: 3) */
  escalationThreshold: number;
  /** Time to wait after code execution before checking errors in ms (default: 3500) */
  waitTimeMs: number;
  /** Whether to detect error oscillation patterns (A→B→A) (default: true) */
  detectOscillation: boolean;
  /** Whether to include stack traces in error context (default: true) */
  includeStackTraces: boolean;
}

/**
 * Runtime state tracking for auto-iteration
 */
export interface IterationState {
  /** Number of error-triggered iterations in current sequence */
  errorIterationCount: number;
  /** Number of consecutive mistakes/failures */
  consecutiveMistakes: number;
  /** Total number of AI requests in current conversation */
  totalRequests: number;
  /** Signature of the last error encountered */
  lastErrorSignature: string;
  /** Recent error signatures for oscillation detection */
  recentErrorSignatures: string[];
  /** Whether escalation UI is currently active */
  escalationActive: boolean;
}
