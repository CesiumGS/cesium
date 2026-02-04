/**
 * Critical Path Tests for ChatPanel
 *
 * Tests the most complex and error-prone functionality:
 * - Tool call chaining logic
 * - Lazy message creation (ensureAssistantMessage)
 * - Conversation history formatting
 * - Auto-iteration logic
 * - Error handling in streaming
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "./AI/types";

// Mock dependencies
vi.mock("./SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      customSystemPromptAddendum: "",
      autoIterationEnabled: false,
      useDiffFormat: true,
      useToolMode: true,
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("./contexts/ModelContext", () => ({
  useModel: () => ({
    currentModel: {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
      provider: "anthropic",
    },
  }),
}));

vi.mock("./AI/AIClientFactory", () => ({
  AIClientFactory: {
    createClient: () => ({
      generateWithContext: vi.fn(),
      continueWithToolResults: vi.fn(),
      getModel: () => "claude-sonnet-4-5-20250929",
    }),
  },
}));

vi.mock("./AI/tools/toolRegistry", () => ({
  toolRegistry: {
    getToolDefinitions: () => [
      {
        name: "get_current_code",
        description: "Get the current code",
        input_schema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "apply_diff",
        description: "Apply a diff",
        input_schema: {
          type: "object",
          properties: {
            file: { type: "string" },
            search: { type: "string" },
            replace: { type: "string" },
          },
        },
      },
    ],
    executeTool: vi.fn(),
  },
}));

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  Editor: () => <div data-testid="monaco-editor">Editor</div>,
}));

// Mock react-virtuoso
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
  }) => (
    <div data-testid="virtuoso-list">
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}));

// Mock ChatMessage component
vi.mock("./ChatMessage", () => ({
  ChatMessage: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`chat-message-${message.id}`}>
      <div data-testid="message-role">{message.role}</div>
      <div data-testid="message-content">{message.content}</div>
      {message.error && (
        <div data-testid="message-error">Error: {message.content}</div>
      )}
      {message.reasoning && (
        <div data-testid="message-reasoning">{message.reasoning}</div>
      )}
      {message.toolCalls && (
        <div data-testid="message-tool-calls">
          {message.toolCalls.map((tc) => (
            <div key={tc.id} data-testid={`tool-call-${tc.name}`}>
              {tc.name}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}));

// Mock AttachmentPreview
vi.mock("./AttachmentPreview", () => ({
  AttachmentPreview: () => (
    <div data-testid="attachment-preview">Attachment</div>
  ),
}));

// Mock PromptInput
vi.mock("./components/common/PromptInput", () => ({
  PromptInput: ({ onSubmit }: { onSubmit: (text: string) => void }) => (
    <div>
      <input
        data-testid="prompt-input"
        onChange={(e) => {
          // Store value for submission
          (e.target as HTMLInputElement).dataset.value = e.target.value;
        }}
      />
      <button
        data-testid="submit-button"
        onClick={(e) => {
          const input = (e.target as HTMLElement).parentElement?.querySelector(
            "input",
          );
          if (input?.dataset.value) {
            onSubmit(input.dataset.value);
          }
        }}
      >
        Submit
      </button>
    </div>
  ),
}));

describe("ChatPanel - Critical Path Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Lazy Message Creation (ensureAssistantMessage)", () => {
    it("should not create empty assistant messages", async () => {
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          // Simulate a stream that yields nothing
          yield { type: "usage", inputTokens: 10, outputTokens: 0 };
        }),
        continueWithToolResults: vi.fn(),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      const { container } = render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      // Initially, no messages should be present
      expect(
        container.querySelectorAll('[data-testid^="chat-message-"]'),
      ).toHaveLength(0);

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Hello");
      (input as HTMLInputElement).dataset.value = "Hello";
      await user.click(submitButton);

      await waitFor(() => {
        // Should have user message but NO empty assistant message
        const messages = container.querySelectorAll(
          '[data-testid^="chat-message-"]',
        );
        expect(messages.length).toBe(1); // Only user message
        expect(screen.getByText("user")).toBeInTheDocument();
      });
    });

    it("should create assistant message only when content is available", async () => {
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield { type: "text", text: "Hello" };
          yield { type: "text", text: " world" };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        continueWithToolResults: vi.fn(),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      const { container } = render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Hello");
      (input as HTMLInputElement).dataset.value = "Hello";
      await user.click(submitButton);

      await waitFor(
        () => {
          const messages = container.querySelectorAll(
            '[data-testid^="chat-message-"]',
          );
          expect(messages.length).toBe(2); // User + assistant
          expect(screen.getByText("Hello world")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should handle reasoning without creating empty text content", async () => {
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield { type: "reasoning", reasoning: "Let me think..." };
          yield { type: "reasoning", reasoning: " about this." };
          yield { type: "text", text: "Answer" };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        continueWithToolResults: vi.fn(),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Question");
      (input as HTMLInputElement).dataset.value = "Question";
      await user.click(submitButton);

      await waitFor(
        () => {
          // Should have reasoning and text content
          expect(screen.getByTestId("message-reasoning")).toBeInTheDocument();
          expect(
            screen.getByText(/Let me think... about this/),
          ).toBeInTheDocument();
          expect(screen.getByText("Answer")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Tool Call Chaining", () => {
    it("should execute chained tool calls up to MAX limit", async () => {
      const { toolRegistry } = await import("./AI/tools/toolRegistry");
      const executeTool = vi.mocked(toolRegistry.executeTool);

      // Mock tool execution to return another tool call
      executeTool.mockResolvedValue({
        success: true,
        result: "Tool executed",
      });

      let callCount = 0;
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield { type: "text", text: "Initial response" };
          yield {
            type: "tool_call",
            toolCall: {
              id: "tool_1",
              name: "get_current_code",
              input: {},
            },
          };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        continueWithToolResults: vi.fn().mockImplementation(async function* () {
          callCount++;
          if (callCount < 12) {
            // Try to exceed MAX_CHAINED_TOOL_CALLS (10)
            yield {
              type: "tool_call",
              toolCall: {
                id: `tool_${callCount + 1}`,
                name: "get_current_code",
                input: {},
              },
            };
          } else {
            yield { type: "text", text: "Final response" };
          }
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Test tool chaining");
      (input as HTMLInputElement).dataset.value = "Test tool chaining";
      await user.click(submitButton);

      await waitFor(
        () => {
          // Should stop at MAX_CHAINED_TOOL_CALLS (10)
          expect(executeTool).toHaveBeenCalledTimes(10);
        },
        { timeout: 5000 },
      );

      // Verify it doesn't exceed the limit
      expect(executeTool.mock.calls.length).toBeLessThanOrEqual(10);
    });

    it("should handle tool execution errors gracefully", async () => {
      const { toolRegistry } = await import("./AI/tools/toolRegistry");
      const executeTool = vi.mocked(toolRegistry.executeTool);

      // Mock tool execution to fail
      executeTool.mockRejectedValue(new Error("Tool execution failed"));

      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield {
            type: "tool_call",
            toolCall: {
              id: "tool_1",
              name: "get_current_code",
              input: {},
            },
          };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        continueWithToolResults: vi.fn().mockImplementation(async function* () {
          yield { type: "text", text: "Handled error" };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Test error handling");
      (input as HTMLInputElement).dataset.value = "Test error handling";
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(executeTool).toHaveBeenCalled();
          // Should log error but continue
          expect(consoleErrorSpy).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      consoleErrorSpy.mockRestore();
    });

    it("should stop chaining when no more tool calls are returned", async () => {
      const { toolRegistry } = await import("./AI/tools/toolRegistry");
      const executeTool = vi.mocked(toolRegistry.executeTool);

      executeTool.mockResolvedValue({
        success: true,
        result: "Tool executed",
      });

      let continueCallCount = 0;
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield {
            type: "tool_call",
            toolCall: {
              id: "tool_1",
              name: "get_current_code",
              input: {},
            },
          };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        continueWithToolResults: vi.fn().mockImplementation(async function* () {
          continueCallCount++;
          if (continueCallCount === 1) {
            // First continuation returns another tool call
            yield {
              type: "tool_call",
              toolCall: {
                id: "tool_2",
                name: "get_current_code",
                input: {},
              },
            };
          } else {
            // Second continuation returns final text (no more tool calls)
            yield { type: "text", text: "Final response" };
          }
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Test normal termination");
      (input as HTMLInputElement).dataset.value = "Test normal termination";
      await user.click(submitButton);

      await waitFor(
        () => {
          // Should execute exactly 2 tools, then stop
          expect(executeTool).toHaveBeenCalledTimes(2);
          expect(screen.getByText("Final response")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Stream Error Handling", () => {
    it("should display error messages from stream", async () => {
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield { type: "text", text: "Starting..." };
          yield { type: "error", error: "API connection lost" };
        }),
        continueWithToolResults: vi.fn(),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Test error display");
      (input as HTMLInputElement).dataset.value = "Test error display";
      await user.click(submitButton);

      await waitFor(
        () => {
          const errorElement = screen.getByTestId("message-error");
          expect(errorElement).toBeInTheDocument();
          expect(errorElement).toHaveTextContent(/API connection lost/);
        },
        { timeout: 3000 },
      );
    });

    it("should prevent empty message bubbles on stream error", async () => {
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          // Yield error immediately without any content
          yield { type: "error", error: "Immediate failure" };
        }),
        continueWithToolResults: vi.fn(),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      const { container } = render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      await user.type(input, "Test empty prevention");
      (input as HTMLInputElement).dataset.value = "Test empty prevention";
      await user.click(submitButton);

      await waitFor(
        () => {
          const messages = container.querySelectorAll(
            '[data-testid^="chat-message-"]',
          );
          // Should have user message and error message (not empty)
          expect(messages.length).toBe(2);
          expect(screen.getByTestId("message-error")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Conversation History Formatting", () => {
    it("should include previous messages in conversation history", async () => {
      const mockClient = {
        generateWithContext: vi.fn().mockImplementation(async function* () {
          yield { type: "text", text: "First response" };
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
        }),
        continueWithToolResults: vi.fn(),
        getModel: () => "claude-sonnet-4-5-20250929",
      };

      const { AIClientFactory } = await import("./AI/AIClientFactory");
      vi.mocked(AIClientFactory.createClient).mockReturnValue(
        mockClient as never,
      );

      render(
        <ChatPanel
          currentJavaScript=""
          currentHTML=""
          onApplyCode={vi.fn()}
          onApplyDiff={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      const input = screen.getByTestId("prompt-input");
      const submitButton = screen.getByTestId("submit-button");

      // Send first message
      await user.type(input, "First message");
      (input as HTMLInputElement).dataset.value = "First message";
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("First response")).toBeInTheDocument();
      });

      // Clear input for second message
      (input as HTMLInputElement).value = "";
      (input as HTMLInputElement).dataset.value = "";

      // Send second message
      await user.type(input, "Second message");
      (input as HTMLInputElement).dataset.value = "Second message";
      await user.click(submitButton);

      await waitFor(() => {
        // Verify generateWithContext was called with conversation history
        const calls = mockClient.generateWithContext.mock.calls;
        expect(calls.length).toBe(2);

        // Second call should have conversation history
        const secondCall = calls[1];
        const conversationHistory = secondCall[5]; // 6th parameter
        expect(conversationHistory).toBeDefined();
        expect(Array.isArray(conversationHistory)).toBe(true);
      });
    });
  });
});
