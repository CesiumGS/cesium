import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnthropicClient } from "./AnthropicClient";
import type {
  CodeContext,
  StreamChunk,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;

const textEncoder = new TextEncoder();

interface AnthropicStreamEvent {
  type: string;
  message?: {
    usage?: {
      input_tokens: number;
    };
  };
  content_block?: {
    type: string;
    id?: string;
    name?: string;
  };
  delta?: {
    type: string;
    text?: string;
    thinking?: string;
    partial_json?: string;
  };
  usage?: {
    output_tokens?: number;
  };
  error?: {
    message: string;
  };
}

function createSseStream(events: AnthropicStreamEvent[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      for (const event of events) {
        const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(textEncoder.encode(payload));
      }
      controller.close();
    },
  });
}

function queueStreamingResponse(events: AnthropicStreamEvent[]): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    body: createSseStream(events),
  } as Response);
}

describe("AnthropicClient", () => {
  const mockApiKey = "test-anthropic-api-key-12345";
  let client: AnthropicClient;

  beforeEach(() => {
    client = new AnthropicClient(mockApiKey);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with API key and default model", () => {
      const client = new AnthropicClient(mockApiKey);
      expect(client.getModel()).toBe("claude-sonnet-4-5-20250929");
    });

    it("should initialize with custom model", () => {
      const client = new AnthropicClient(mockApiKey, "claude-opus-4-5-20251101");
      expect(client.getModel()).toBe("claude-opus-4-5-20251101");
    });

    it("should accept custom options", () => {
      const client = new AnthropicClient(mockApiKey, "claude-sonnet-4-5-20250929", {
        thinkingBudgetTokens: 5000,
        maxTokens: 8000,
      });
      // Options are internal but constructor should not throw
      expect(client.getModel()).toBe("claude-sonnet-4-5-20250929");
    });
  });

  describe("testApiKey", () => {
    it("should return valid:true for successful API test", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "valid" }],
        }),
      });

      const result = await client.testApiKey();
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid:false for API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            type: "authentication_error",
            message: "Invalid API key",
          },
        }),
      });

      const result = await client.testApiKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.testApiKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle timeout errors", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await client.testApiKey();
      expect(result.valid).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("should make request with correct headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await client.testApiKey();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[1]?.headers).toMatchObject({
        "Content-Type": "application/json",
        "x-api-key": mockApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      });
    });
  });

  describe("generateWithContext", () => {
    const mockContext: CodeContext = {
      javascript: 'const viewer = new Cesium.Viewer("cesiumContainer");',
      html: '<div id="cesiumContainer"></div>',
    };

    it("should yield error for empty user message", async () => {
      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext("", mockContext)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe("error");
      if (chunks[0].type === "error") {
        expect(chunks[0].error).toContain("cannot be empty");
      }
    });

    it("should yield error for whitespace-only message", async () => {
      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext("   ", mockContext)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe("error");
    });

    it("should yield text chunks from streaming response", async () => {
      queueStreamingResponse([
        {
          type: "message_start",
          message: { usage: { input_tokens: 100 } },
        },
        {
          type: "content_block_start",
          content_block: { type: "text" },
        },
        {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Hello " },
        },
        {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "world!" },
        },
        {
          type: "content_block_stop",
        },
        {
          type: "message_delta",
          usage: { output_tokens: 50 },
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test message",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter((c) => c.type === "text");
      expect(textChunks.length).toBe(2);
      expect(textChunks[0]).toEqual({ type: "text", text: "Hello " });
      expect(textChunks[1]).toEqual({ type: "text", text: "world!" });
    });

    it("should yield reasoning chunks for thinking responses", async () => {
      queueStreamingResponse([
        {
          type: "message_start",
          message: { usage: { input_tokens: 100 } },
        },
        {
          type: "content_block_start",
          content_block: { type: "thinking" },
        },
        {
          type: "content_block_delta",
          delta: { type: "thinking_delta", thinking: "Let me think..." },
        },
        {
          type: "content_block_stop",
        },
        {
          type: "content_block_start",
          content_block: { type: "text" },
        },
        {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Here's my answer" },
        },
        {
          type: "content_block_stop",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      const reasoningChunks = chunks.filter((c) => c.type === "reasoning");
      expect(reasoningChunks.length).toBe(1);
      if (reasoningChunks[0].type === "reasoning") {
        expect(reasoningChunks[0].reasoning).toBe("Let me think...");
      }
    });

    it("should yield tool_call chunks for tool use responses", async () => {
      queueStreamingResponse([
        {
          type: "message_start",
          message: { usage: { input_tokens: 100 } },
        },
        {
          type: "content_block_start",
          content_block: {
            type: "tool_use",
            id: "tool_123",
            name: "apply_diff",
          },
        },
        {
          type: "content_block_delta",
          delta: {
            type: "input_json_delta",
            partial_json: '{"file":"javascript"',
          },
        },
        {
          type: "content_block_delta",
          delta: {
            type: "input_json_delta",
            partial_json: ',"search":"old","replace":"new"}',
          },
        },
        {
          type: "content_block_stop",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      const toolCallChunks = chunks.filter((c) => c.type === "tool_call");
      expect(toolCallChunks.length).toBe(1);
      if (toolCallChunks[0].type === "tool_call") {
        expect(toolCallChunks[0].toolCall.id).toBe("tool_123");
        expect(toolCallChunks[0].toolCall.name).toBe("apply_diff");
        expect(toolCallChunks[0].toolCall.input).toEqual({
          file: "javascript",
          search: "old",
          replace: "new",
        });
      }
    });

    it("should yield error chunk on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            type: "authentication_error",
            message: "Invalid API key provided",
          },
        }),
      });

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe("error");
      if (chunks[0].type === "error") {
        expect(chunks[0].error).toContain("Invalid API key");
      }
    });

    it("should yield usage chunk at the end", async () => {
      queueStreamingResponse([
        {
          type: "message_start",
          message: { usage: { input_tokens: 150 } },
        },
        {
          type: "content_block_start",
          content_block: { type: "text" },
        },
        {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Response" },
        },
        {
          type: "content_block_stop",
        },
        {
          type: "message_delta",
          usage: { output_tokens: 75 },
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      const usageChunk = chunks[chunks.length - 1];
      expect(usageChunk.type).toBe("usage");
      if (usageChunk.type === "usage") {
        expect(usageChunk.inputTokens).toBe(150);
        expect(usageChunk.outputTokens).toBe(75);
      }
    });

    it("should include tools in request when provided", async () => {
      const tools: ToolDefinition[] = [
        {
          name: "apply_diff",
          description: "Apply a diff to code",
          input_schema: {
            type: "object" as const,
            properties: {
              file: { type: "string" },
              search: { type: "string" },
              replace: { type: "string" },
            },
            required: ["file", "search", "replace"],
          },
        },
      ];

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
        true,
        undefined,
        tools,
      )) {
        // consume
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.tools).toBeDefined();
      expect(body.tools[0].name).toBe("apply_diff");
    });

    it("should include conversation history when provided", async () => {
      const history = [
        { role: "user" as const, content: "First message" },
        { role: "assistant" as const, content: "First response" },
      ];

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
        true,
        undefined,
        undefined,
        history,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.messages.length).toBe(3); // 2 history + 1 current
    });

    it("should handle image attachments", async () => {
      const attachments = [
        { mimeType: "image/png", base64Data: "base64encodeddata" },
      ];

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
        true,
        undefined,
        undefined,
        undefined,
        attachments,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      const lastMessage = body.messages[body.messages.length - 1];
      expect(Array.isArray(lastMessage.content)).toBe(true);
      expect(lastMessage.content[0].type).toBe("image");
    });

    it("should yield error for malformed tool input JSON", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        {
          type: "content_block_start",
          content_block: { type: "tool_use", id: "tool_1", name: "test_tool" },
        },
        {
          type: "content_block_delta",
          delta: { type: "input_json_delta", partial_json: "{invalid json" },
        },
        { type: "content_block_stop" },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      const errorChunks = chunks.filter((c) => c.type === "error");
      expect(errorChunks.length).toBeGreaterThan(0);
    });
  });

  describe("submitToolResult", () => {
    const mockToolCall: ToolCall = {
      id: "tool_123",
      name: "apply_diff",
      input: { file: "javascript", search: "old", replace: "new" },
    };

    const mockSuccessResult: ToolResult = {
      tool_call_id: "tool_123",
      status: "success",
      output: "Diff applied successfully",
    };

    const mockErrorResult: ToolResult = {
      tool_call_id: "tool_123",
      status: "error",
      error: "Search string not found",
    };

    it("should submit tool result and yield response", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Great, the diff was applied!" },
        },
        { type: "content_block_stop" },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.submitToolResult(
        mockToolCall,
        mockSuccessResult,
        "System prompt",
        [
          { role: "user", content: "Apply the diff" },
          {
            role: "assistant",
            content: [
              { type: "tool_use", id: "tool_123", name: "apply_diff", input: {} },
            ],
          },
        ],
      )) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter((c) => c.type === "text");
      expect(textChunks.length).toBeGreaterThan(0);
    });

    it("should send tool_result message in correct format", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.submitToolResult(
        mockToolCall,
        mockSuccessResult,
        "System prompt",
        [],
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      const toolResultMessage = body.messages[body.messages.length - 1];

      expect(toolResultMessage.role).toBe("user");
      expect(toolResultMessage.content[0].type).toBe("tool_result");
      expect(toolResultMessage.content[0].tool_use_id).toBe("tool_123");
      expect(toolResultMessage.content[0].content).toBe("Diff applied successfully");
      expect(toolResultMessage.content[0].is_error).toBe(false);
    });

    it("should handle error results correctly", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.submitToolResult(
        mockToolCall,
        mockErrorResult,
        "System prompt",
        [],
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      const toolResultMessage = body.messages[body.messages.length - 1];

      expect(toolResultMessage.content[0].is_error).toBe(true);
      expect(toolResultMessage.content[0].content).toBe("Search string not found");
    });

    it("should include tools in follow-up request when provided", async () => {
      const tools: ToolDefinition[] = [
        {
          name: "apply_diff",
          description: "Apply diff",
          input_schema: { type: "object" as const, properties: {}, required: [] },
        },
      ];

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.submitToolResult(
        mockToolCall,
        mockSuccessResult,
        "System prompt",
        [],
        tools,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.tools).toBeDefined();
      expect(body.tools[0].name).toBe("apply_diff");
    });
  });

  describe("setModel and getModel", () => {
    it("should update model", () => {
      expect(client.getModel()).toBe("claude-sonnet-4-5-20250929");
      client.setModel("claude-opus-4-5-20251101");
      expect(client.getModel()).toBe("claude-opus-4-5-20251101");
    });
  });

  describe("error handling", () => {
    const mockContext: CodeContext = {
      javascript: "const x = 1;",
      html: "<div></div>",
    };

    it("should handle no response body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe("error");
      if (chunks[0].type === "error") {
        expect(chunks[0].error).toContain("No response body");
      }
    });

    it("should handle network failure during streaming", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection lost"));

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe("error");
      if (chunks[0].type === "error") {
        expect(chunks[0].error).toContain("Connection lost");
      }
    });

    it("should handle stream error events", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        {
          type: "error",
          error: { message: "Overloaded" },
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      const errorChunks = chunks.filter((c) => c.type === "error");
      expect(errorChunks.length).toBeGreaterThan(0);
    });
  });

  describe("prompt building", () => {
    const mockContext: CodeContext = {
      javascript: 'const viewer = new Cesium.Viewer("cesiumContainer");',
      html: '<div id="cesiumContainer"></div>',
    };

    it("should include diff-based instructions by default", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Add terrain",
        mockContext,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.system).toContain("apply_diff");
      expect(body.system).toContain("CRITICAL RULES");
    });

    it("should use traditional prompt when useDiffFormat is false", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Add terrain",
        mockContext,
        false,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.system).not.toContain("apply_diff");
      expect(body.system).toContain("When suggesting code changes:");
    });

    it("should include custom addendum when provided", async () => {
      const customAddendum = "Always use async/await syntax.";

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
        true,
        customAddendum,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.system).toContain("Always use async/await syntax.");
      expect(body.system).toContain("IMPORTANT USER INSTRUCTIONS");
    });

    it("should include console messages in context", async () => {
      const contextWithErrors: CodeContext = {
        javascript: "const x = 1;",
        html: "<div></div>",
        consoleMessages: [
          { type: "error", message: "ReferenceError: y is not defined" },
          { type: "warn", message: "Deprecation warning" },
          { type: "log", message: "Debug info" },
        ],
      };

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Fix the error",
        contextWithErrors,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      const userMessage = body.messages[0].content;

      // User message should contain the console output
      const textContent = Array.isArray(userMessage)
        ? userMessage.find((c: { type: string }) => c.type === "text")?.text
        : userMessage;
      expect(textContent).toContain("ReferenceError: y is not defined");
      expect(textContent).toContain("Deprecation warning");
    });
  });

  describe("extended thinking", () => {
    const mockContext: CodeContext = {
      javascript: "const x = 1;",
      html: "<div></div>",
    };

    it("should include thinking config by default", async () => {
      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.thinking).toBeDefined();
      expect(body.thinking.type).toBe("enabled");
      expect(body.thinking.budget_tokens).toBe(10000);
      // Temperature must be 1.0 for extended thinking
      expect(body.temperature).toBe(1.0);
    });

    it("should use custom thinking budget when specified", async () => {
      const clientWithCustomBudget = new AnthropicClient(
        mockApiKey,
        "claude-sonnet-4-5-20250929",
        { thinkingBudgetTokens: 5000 },
      );

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of clientWithCustomBudget.generateWithContext(
        "Test",
        mockContext,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.thinking.budget_tokens).toBe(5000);
    });

    it("should disable thinking when budget is 0", async () => {
      const clientWithoutThinking = new AnthropicClient(
        mockApiKey,
        "claude-sonnet-4-5-20250929",
        { thinkingBudgetTokens: 0, temperature: 0.5 },
      );

      queueStreamingResponse([
        { type: "message_start", message: { usage: { input_tokens: 100 } } },
        { type: "content_block_start", content_block: { type: "text" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } },
        { type: "content_block_stop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of clientWithoutThinking.generateWithContext(
        "Test",
        mockContext,
      )) {
        // consume
      }

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.thinking).toBeUndefined();
      expect(body.temperature).toBe(0.5);
    });
  });
});
