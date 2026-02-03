import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeminiClient } from "./GeminiClient";
import type { GeminiResponse, CodeContext, StreamChunk } from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;

const textEncoder = new TextEncoder();

function createSseStream(chunks: GeminiResponse[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      for (const chunk of chunks) {
        const payload = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(textEncoder.encode(payload));
      }

      controller.enqueue(textEncoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function queueStreamingResponse(
  chunks: GeminiResponse[] = [
    {
      candidates: [
        {
          content: {
            parts: [{ text: "Mock streamed response" }],
            role: "model",
          },
          finishReason: "STOP",
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 4,
        totalTokenCount: 9,
      },
      modelVersion: "gemini-3-flash-preview",
      responseId: "mock-response-id",
    },
  ],
): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    body: createSseStream(chunks),
  } as Response);
}

describe("GeminiClient", () => {
  const mockApiKey = "test-api-key-12345";
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient(mockApiKey);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with API key and default model", () => {
      const client = new GeminiClient(mockApiKey);
      expect(client.getModel()).toBe("gemini-3-flash-preview");
    });

    it("should initialize with custom model", () => {
      const client = new GeminiClient(mockApiKey, "gemini-3-pro-preview");
      expect(client.getModel()).toBe("gemini-3-pro-preview");
    });
  });

  describe("testApiKey", () => {
    it("should return valid:true for successful API test", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "API key is valid" }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 7,
            candidatesTokenCount: 4,
            totalTokenCount: 11,
          },
          modelVersion: "gemini-3-flash-preview",
          responseId: "test-response-123",
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
            code: 401,
            message: "Invalid API key",
            status: "UNAUTHENTICATED",
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
  });

  describe("generateContent", () => {
    it("should make API call with correct parameters", async () => {
      const prompt = "Test prompt";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Test response" }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 3,
            candidatesTokenCount: 3,
            totalTokenCount: 6,
          },
          modelVersion: "gemini-3-flash-preview",
          responseId: "test-123",
        }),
      });

      await client.generateContent(prompt);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("gemini-3-flash-preview");
      expect(call[1]?.method).toBe("POST");
      expect(call[1]?.headers).toMatchObject({
        "Content-Type": "application/json",
        "x-goog-api-key": mockApiKey,
      });

      const body = JSON.parse(call[1]?.body as string);
      expect(body.contents[0].parts[0].text).toBe(prompt);
    });

    it("should return successful response", async () => {
      const mockResponse: GeminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Generated content" }],
              role: "model",
            },
            finishReason: "STOP",
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 2,
          candidatesTokenCount: 3,
          totalTokenCount: 5,
        },
        modelVersion: "gemini-3-flash-preview",
        responseId: "test-response-456",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await client.generateContent("Test");
      expect(response).toEqual(mockResponse);
      expect(response.error).toBeUndefined();
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 400,
            message: "Bad request",
            status: "INVALID_ARGUMENT",
          },
        }),
      });

      const response = await client.generateContent("Test");
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain("Bad request");
      expect(response.error?.code).toBe(400);
    });

    it("should handle network failures", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const response = await client.generateContent("Test");
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain("Network failure");
    });

    it("should handle fetch timeout", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

      const response = await client.generateContent("Test");
      expect(response.error).toBeDefined();
      expect(response.error?.message).toBeDefined();
    });
  });

  describe("generateWithContext (Streaming)", () => {
    const mockContext: CodeContext = {
      javascript: 'const viewer = new Cesium.Viewer("cesiumContainer");',
      html: '<div id="cesiumContainer"></div>',
    };

    it("should yield text chunks from streaming response", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "First " }],
                role: "model",
              },
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "stream-test-1",
        },
        {
          candidates: [
            {
              content: {
                parts: [{ text: "chunk" }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 3,
            totalTokenCount: 8,
          },
          modelVersion: "gemini-3-flash-preview",
          responseId: "stream-test-1",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0]).toEqual({ type: "text", text: "First " });
      expect(chunks[1]).toEqual({ type: "text", text: "chunk" });
    });

    it("should yield reasoning chunks when thought=true", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "thinking...", thought: true }],
                role: "model",
              },
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "thought-test-1",
        },
        {
          candidates: [
            {
              content: {
                parts: [{ text: "answer" }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 3,
            candidatesTokenCount: 2,
            totalTokenCount: 10,
            thoughtsTokenCount: 5,
          },
          modelVersion: "gemini-3-flash-preview",
          responseId: "thought-test-1",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks[0].type).toBe("reasoning");
      if (chunks[0].type === "reasoning") {
        expect(chunks[0].reasoning).toBe("thinking...");
      }
      expect(chunks[1].type).toBe("text");
    });

    it("should yield error chunk on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 401,
            message: "Invalid API key",
            status: "UNAUTHENTICATED",
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

    it("should yield usage chunk with token counts at the end", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      // Usage chunk should be the last chunk
      const usageChunk = chunks[chunks.length - 1];
      expect(usageChunk.type).toBe("usage");
      if (usageChunk.type === "usage") {
        expect(usageChunk.inputTokens).toBe(10);
        expect(usageChunk.outputTokens).toBe(5);
      }
    });

    it("should include diff-based prompt by default", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
              },
            },
          ],
        },
      ]);

      // Consume the generator
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of client.generateWithContext(
        "Add terrain",
        mockContext,
      )) {
        // Just consume
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      const systemPrompt = body.systemInstruction.parts[0].text;

      expect(systemPrompt).toContain("apply_diff");
    });

    it("should use traditional prompt when useDiffFormat is false", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
              },
            },
          ],
        },
      ]);

      // Consume the generator
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of client.generateWithContext(
        "Add terrain",
        mockContext,
        false,
      )) {
        // Just consume
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const prompt = body.contents[0].parts[0].text;

      // Should NOT contain diff format instructions
      expect(prompt).not.toContain("<<<SEARCH>>>");
      expect(prompt).toContain("Add terrain"); // Should contain user message
    });

    it("should include thinking config in request", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
              },
            },
          ],
        },
      ]);

      // Consume the generator
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        // Just consume
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);

      expect(body.generationConfig.thinkingConfig).toBeDefined();
      expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(16000);
      expect(body.generationConfig.thinkingConfig.includeThoughts).toBe(true);
    });

    it("should yield error chunk on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      // Should yield an error chunk
      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe("error");
      if (chunks[0].type === "error") {
        expect(chunks[0].error).toContain("Network error");
      }
    });

    it.skip("should unescape Gemini's double-escaped content", async () => {
      // TODO: Test unescaping functionality
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "Line 1\\nLine 2\\tTabbed" }],
              },
            },
          ],
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
      )) {
        chunks.push(chunk);
      }

      // The unescaping happens inside the client
      if (chunks[0].type === "text") {
        expect(chunks[0].text).toContain("\n");
        expect(chunks[0].text).toContain("\t");
      }
    });
  });

  describe("generateDiffBasedEdit", () => {
    const mockContext: CodeContext = {
      javascript: 'const viewer = new Cesium.Viewer("cesiumContainer");',
      html: '<div id="cesiumContainer"></div>',
    };

    it("should always use diff-based prompt format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
            },
          ],
        }),
      });

      await client.generateDiffBasedEdit("Add terrain", mockContext);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const prompt = body.contents[0].parts[0].text;

      expect(prompt).toContain("apply_diff");
      expect(prompt).toContain("EXACT code to find");
    });

    it("should include guidelines for diff format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
            },
          ],
        }),
      });

      await client.generateDiffBasedEdit("Test", mockContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const prompt = body.contents[0].parts[0].text;

      expect(prompt).toContain("CRITICAL RULES");
      expect(prompt).toContain("must match the file EXACTLY");
      expect(prompt).toContain("Include ALL lines in the section being edited");
    });

    it("should include tool instructions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
            },
          ],
        }),
      });

      await client.generateDiffBasedEdit("Test", mockContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const prompt = body.contents[0].parts[0].text;

      expect(prompt).toContain("How to Use apply_diff");
      expect(prompt).toContain("file");
      expect(prompt).toContain("search");
      expect(prompt).toContain("replace");
    });

    it("should include response format guidance", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
            },
          ],
        }),
      });

      await client.generateDiffBasedEdit("Test", mockContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const prompt = body.contents[0].parts[0].text;

      expect(prompt).toContain("RESPONSE FORMAT");
      expect(prompt).toContain("concise");
    });

    it("should include special operations guidance", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
            },
          ],
        }),
      });

      await client.generateDiffBasedEdit("Test", mockContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const prompt = body.contents[0].parts[0].text;

      expect(prompt).toContain("Special Operations");
      expect(prompt).toContain("Delete code");
      expect(prompt).toContain("Add code");
    });
  });

  describe("extractText", () => {
    it("should extract text from valid response", () => {
      const response: GeminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Extracted text content" }],
            },
          },
        ],
      };

      const text = GeminiClient.extractText(response);
      expect(text).toBe("Extracted text content");
    });

    it("should throw error for response with error", () => {
      const response: GeminiResponse = {
        error: {
          message: "API error occurred",
          code: 500,
        },
      };

      expect(() => GeminiClient.extractText(response)).toThrow(
        "API error occurred",
      );
    });

    it("should throw error for response without candidates", () => {
      const response: GeminiResponse = {
        candidates: [],
      };

      expect(() => GeminiClient.extractText(response)).toThrow(
        "No response generated",
      );
    });

    it("should throw error for response without text", () => {
      const response: GeminiResponse = {
        candidates: [
          {
            content: {
              parts: [],
            },
          },
        ],
      };

      expect(() => GeminiClient.extractText(response)).toThrow(
        "Empty response",
      );
    });
  });

  describe("setModel and getModel", () => {
    it("should update model", () => {
      expect(client.getModel()).toBe("gemini-3-flash-preview");
      client.setModel("gemini-3-pro-preview");
      expect(client.getModel()).toBe("gemini-3-pro-preview");
    });

    it("should use updated model in API calls", async () => {
      client.setModel("gemini-3-pro-preview");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
            },
          ],
        }),
      });

      await client.generateContent("Test");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("gemini-3-pro-preview");
    });
  });

  describe("backward compatibility", () => {
    it("should maintain existing behavior when useDiffFormat is false", async () => {
      const context: CodeContext = {
        javascript: 'const viewer = new Cesium.Viewer("cesiumContainer");',
        html: '<div id="cesiumContainer"></div>',
      };

      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
              },
            },
          ],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of client.generateWithContext(
        "Test",
        context,
        false,
      )) {
        break;
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      const systemPrompt = body.systemInstruction.parts[0].text;

      expect(systemPrompt).toContain("When suggesting code changes:");
      expect(systemPrompt).toContain(
        "use code blocks with the full modified sections",
      );
      expect(systemPrompt).not.toContain("<<<SEARCH>>>");
    });
  });

  describe("error handling", () => {
    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const response = await client.generateContent("Test");
      expect(response.error).toBeDefined();
    });

    it("should handle missing error message in error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const response = await client.generateContent("Test");
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain("HTTP error! status: 500");
    });
  });

  describe("integration scenarios", () => {
    it("should handle real-world diff-based edit request", async () => {
      const context: CodeContext = {
        javascript: `import Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.camera.flyHome();`,
        html: '<div id="cesiumContainer"></div>',
      };

      const mockResponse: GeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: `I'll add terrain provider to your viewer:

<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});

This enables high-resolution terrain.`,
                },
              ],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await client.generateDiffBasedEdit(
        "Add terrain provider",
        context,
      );

      expect(response.error).toBeUndefined();
      const text = GeminiClient.extractText(response);
      expect(text).toContain("<<<SEARCH>>>");
      expect(text).toContain("<<<REPLACE>>>");
      expect(text).toContain("terrainProvider");
    });

    it("should handle request for multiple changes", async () => {
      const context: CodeContext = {
        javascript: `const viewer = new Cesium.Viewer("cesiumContainer");
viewer.camera.flyHome();`,
        html: '<div id="cesiumContainer"></div>',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `I'll make multiple improvements:

<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  timeline: false
});

<<<SEARCH>>>
viewer.camera.flyHome();
<<<REPLACE>>>
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-75.5, 40.0, 1000000.0)
});`,
                  },
                ],
              },
            },
          ],
        }),
      });

      const response = await client.generateDiffBasedEdit(
        "Disable timeline and animation, set custom camera position",
        context,
      );

      expect(response.error).toBeUndefined();
      const text = GeminiClient.extractText(response);

      // Should contain multiple SEARCH/REPLACE blocks
      const searchCount = (text.match(/<<<SEARCH>>>/g) || []).length;
      expect(searchCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("tool calling and thoughtSignature handling", () => {
    const mockContext: CodeContext = {
      javascript: 'const viewer = new Cesium.Viewer("cesiumContainer");',
      html: '<div id="cesiumContainer"></div>',
    };

    const mockTools = [
      {
        name: "apply_diff",
        description: "Apply a diff to code",
        input_schema: {
          type: "object" as const,
          properties: {
            file: { type: "string", description: "File to modify" },
            search: { type: "string", description: "Code to find" },
            replace: { type: "string", description: "Code to replace with" },
          },
          required: ["file", "search", "replace"],
        },
      },
    ];

    it("should disable thinkingConfig when tools are provided", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "tools-test-1",
        },
      ]);

      // Consume the generator with tools
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
        true, // useDiffFormat
        undefined, // customAddendum
        mockTools, // tools provided
      )) {
        // Just consume
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);

      // When tools are provided, thinkingConfig should NOT be present
      // (thinkingBudget = 0 means no thinkingConfig in request)
      expect(body.generationConfig.thinkingConfig).toBeUndefined();
    });

    it("should include thinkingConfig when NO tools are provided", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [{ text: "response" }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "no-tools-test-1",
        },
      ]);

      // Consume the generator WITHOUT tools
      for await (const _ of client.generateWithContext(
        "Test",
        mockContext,
        true, // useDiffFormat
        undefined, // customAddendum
        undefined, // NO tools
      )) {
        // Just consume
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);

      // When no tools are provided, thinkingConfig should be present
      expect(body.generationConfig.thinkingConfig).toBeDefined();
      expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(16000);
    });

    it("should yield tool_call chunk when API returns functionCall", async () => {
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "apply_diff",
                      args: {
                        file: "javascript",
                        search: "old code",
                        replace: "new code",
                      },
                    },
                  },
                ],
                role: "model",
              },
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "func-call-test-1",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
        true,
        undefined,
        mockTools,
      )) {
        chunks.push(chunk);
      }

      // Should have tool_call and usage chunks
      const toolCallChunk = chunks.find((c) => c.type === "tool_call");
      expect(toolCallChunk).toBeDefined();
      if (toolCallChunk?.type === "tool_call") {
        expect(toolCallChunk.toolCall.name).toBe("apply_diff");
        expect(toolCallChunk.toolCall.input).toEqual({
          file: "javascript",
          search: "old code",
          replace: "new code",
        });
      }
    });

    it("should capture thoughtSignature on tool_call when API returns it", async () => {
      const mockSignature = "test-thought-signature-abc123";
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "apply_diff",
                      args: { file: "javascript", search: "x", replace: "y" },
                    },
                    thoughtSignature: mockSignature,
                  },
                ],
                role: "model",
              },
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "thought-sig-test-1",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
        true,
        undefined,
        mockTools,
      )) {
        chunks.push(chunk);
      }

      const toolCallChunk = chunks.find((c) => c.type === "tool_call");
      expect(toolCallChunk).toBeDefined();
      if (toolCallChunk?.type === "tool_call") {
        // thoughtSignature should be captured on the ToolCall object
        expect(toolCallChunk.toolCall.thoughtSignature).toBe(mockSignature);
      }
    });

    it("should work when API returns functionCall WITHOUT thoughtSignature", async () => {
      // This simulates the bug: API sometimes returns functionCall without thoughtSignature
      queueStreamingResponse([
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "apply_diff",
                      args: { file: "javascript", search: "x", replace: "y" },
                    },
                    // NOTE: No thoughtSignature here - this is the bug scenario
                  },
                ],
                role: "model",
              },
              index: 0,
            },
          ],
          modelVersion: "gemini-3-flash-preview",
          responseId: "no-thought-sig-test-1",
        },
      ]);

      const chunks: StreamChunk[] = [];
      for await (const chunk of client.generateWithContext(
        "Test",
        mockContext,
        true,
        undefined,
        mockTools,
      )) {
        chunks.push(chunk);
      }

      // Should still yield the tool_call chunk successfully
      const toolCallChunk = chunks.find((c) => c.type === "tool_call");
      expect(toolCallChunk).toBeDefined();
      if (toolCallChunk?.type === "tool_call") {
        expect(toolCallChunk.toolCall.name).toBe("apply_diff");
        // thoughtSignature should be undefined when not provided
        expect(toolCallChunk.toolCall.thoughtSignature).toBeUndefined();
      }
    });

    describe("submitToolResult", () => {
      it("should disable thinkingConfig when tools are provided in submitToolResult", async () => {
        queueStreamingResponse([
          {
            candidates: [
              {
                content: {
                  parts: [{ text: "Tool result received" }],
                  role: "model",
                },
                finishReason: "STOP",
                index: 0,
              },
            ],
            modelVersion: "gemini-3-flash-preview",
            responseId: "submit-tool-test-1",
          },
        ]);

        const toolCall = {
          id: "call_123",
          name: "apply_diff",
          input: { file: "javascript", search: "x", replace: "y" },
        };

        const toolResult = {
          tool_call_id: "call_123",
          status: "success" as const,
          output: JSON.stringify({ file: "javascript", modifiedCode: "y" }),
        };

        const conversationHistory = [
          { role: "user", parts: [{ text: "Make a change" }] },
          {
            role: "model",
            parts: [
              {
                functionCall: {
                  name: "apply_diff",
                  args: { file: "javascript", search: "x", replace: "y" },
                },
                // NOTE: No thoughtSignature in history - this is correct behavior
              },
            ],
          },
        ];

        // Consume the generator
        for await (const _ of client.submitToolResult(
          toolCall,
          toolResult,
          "System prompt",
          conversationHistory,
          mockTools, // tools provided
        )) {
          // Just consume
        }

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);

        // When tools are provided, thinkingConfig should NOT be present
        expect(body.generationConfig.thinkingConfig).toBeUndefined();
      });

      it("should successfully process submitToolResult without thoughtSignature in history", async () => {
        queueStreamingResponse([
          {
            candidates: [
              {
                content: {
                  parts: [{ text: "Change applied successfully" }],
                  role: "model",
                },
                finishReason: "STOP",
                index: 0,
              },
            ],
            usageMetadata: {
              promptTokenCount: 50,
              candidatesTokenCount: 10,
              totalTokenCount: 60,
            },
            modelVersion: "gemini-3-flash-preview",
            responseId: "submit-tool-success-1",
          },
        ]);

        const toolCall = {
          id: "call_456",
          name: "apply_diff",
          input: { file: "javascript", search: "old", replace: "new" },
          // Even if the original tool call had thoughtSignature, we don't include it in history
        };

        const toolResult = {
          tool_call_id: "call_456",
          status: "success" as const,
          output: JSON.stringify({ file: "javascript", modifiedCode: "new" }),
        };

        // History without thoughtSignature (the fix)
        const conversationHistory = [
          { role: "user", parts: [{ text: "Replace old with new" }] },
          {
            role: "model",
            parts: [
              {
                functionCall: {
                  name: "apply_diff",
                  args: { file: "javascript", search: "old", replace: "new" },
                },
                // NO thoughtSignature - this is the fix
              },
            ],
          },
        ];

        const chunks: StreamChunk[] = [];
        for await (const chunk of client.submitToolResult(
          toolCall,
          toolResult,
          "System prompt",
          conversationHistory,
          mockTools,
        )) {
          chunks.push(chunk);
        }

        // Should complete successfully without errors
        const errorChunk = chunks.find((c) => c.type === "error");
        expect(errorChunk).toBeUndefined();

        // Should have text and usage chunks
        const textChunk = chunks.find((c) => c.type === "text");
        expect(textChunk).toBeDefined();
      });

      it("should handle chained tool calls in submitToolResult", async () => {
        // Simulate API returning another tool call after first tool result
        queueStreamingResponse([
          {
            candidates: [
              {
                content: {
                  parts: [
                    { text: "Now making another change" },
                    {
                      functionCall: {
                        name: "apply_diff",
                        args: {
                          file: "html",
                          search: "<div>",
                          replace: "<section>",
                        },
                      },
                      // API might or might not return thoughtSignature here
                    },
                  ],
                  role: "model",
                },
                index: 0,
              },
            ],
            modelVersion: "gemini-3-flash-preview",
            responseId: "chained-tool-test-1",
          },
        ]);

        const toolCall = {
          id: "call_789",
          name: "apply_diff",
          input: { file: "javascript", search: "a", replace: "b" },
        };

        const toolResult = {
          tool_call_id: "call_789",
          status: "success" as const,
          output: JSON.stringify({ file: "javascript", modifiedCode: "b" }),
        };

        const conversationHistory = [
          { role: "user", parts: [{ text: "Make changes" }] },
          {
            role: "model",
            parts: [
              {
                functionCall: {
                  name: "apply_diff",
                  args: { file: "javascript", search: "a", replace: "b" },
                },
              },
            ],
          },
        ];

        const chunks: StreamChunk[] = [];
        for await (const chunk of client.submitToolResult(
          toolCall,
          toolResult,
          "System prompt",
          conversationHistory,
          mockTools,
        )) {
          chunks.push(chunk);
        }

        // Should yield both text and tool_call chunks
        const textChunk = chunks.find((c) => c.type === "text");
        const toolCallChunk = chunks.find((c) => c.type === "tool_call");

        expect(textChunk).toBeDefined();
        expect(toolCallChunk).toBeDefined();

        if (toolCallChunk?.type === "tool_call") {
          expect(toolCallChunk.toolCall.name).toBe("apply_diff");
          expect(toolCallChunk.toolCall.input).toEqual({
            file: "html",
            search: "<div>",
            replace: "<section>",
          });
        }
      });
    });
  });
});
