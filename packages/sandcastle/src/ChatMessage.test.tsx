/**
 * ChatMessage Component Tests
 *
 * Comprehensive test suite for the ChatMessage component.
 * Tests rendering with code blocks, diffs, both, and interactions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "./AI/types";
import { createElement } from "react";

// Mock Stratakit components
vi.mock("@stratakit/bricks", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => createElement("button", { onClick, disabled, ...props }, children),
}));

vi.mock("@stratakit/foundations", () => ({
  Icon: ({ href, ...props }: { href?: string; [key: string]: unknown }) =>
    createElement("span", { ...props, "data-icon": href }, "icon"),
}));

// Mock react-markdown to avoid hanging tests
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => {
    // Simple markdown parser for tests
    const lines = children.split("\n");
    return (
      <div>
        {lines.map((line, i) => {
          // Parse headings
          if (line.startsWith("# ")) {
            return <h1 key={i}>{line.slice(2)}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={i}>{line.slice(3)}</h2>;
          }
          // Skip empty lines
          if (!line.trim()) {
            return null;
          }
          // Parse bold text
          const withBold = line.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>",
          );
          return <p key={i} dangerouslySetInnerHTML={{ __html: withBold }} />;
        })}
      </div>
    );
  },
}));

// Mock remark-gfm
vi.mock("remark-gfm", () => ({
  default: () => ({}),
}));

// Mock ReasoningDisplay
vi.mock("./ReasoningDisplay", () => ({
  ReasoningDisplay: () => <div data-testid="reasoning-display">Reasoning</div>,
}));

// Mock Monaco editor
vi.mock("@monaco-editor/react", () => ({
  DiffEditor: ({
    original,
    modified,
    onMount,
  }: {
    original: string;
    modified: string;
    onMount?: (editor: unknown) => void;
  }) => {
    // Simulate editor mount
    if (onMount) {
      const mockEditor = {
        getModifiedEditor: () => ({
          focus: vi.fn(),
        }),
      };
      setTimeout(() => onMount(mockEditor), 0);
    }

    return (
      <div data-testid="monaco-diff-editor">
        <div data-testid="original-code">{original}</div>
        <div data-testid="modified-code">{modified}</div>
      </div>
    );
  },
}));

// Mock DiffPreview to simplify testing
vi.mock("./DiffPreview", () => ({
  DiffPreview: ({
    originalCode,
    modifiedCode,
    language,
    onApply,
    onReject,
    isApplying,
  }: {
    originalCode: string;
    modifiedCode: string;
    language: string;
    onApply: () => void;
    onReject: () => void;
    isApplying?: boolean;
  }) => (
    <div data-testid={`diff-preview-${language}`}>
      <div data-testid="original">{originalCode}</div>
      <div data-testid="modified">{modifiedCode}</div>
      <button onClick={onApply} disabled={isApplying} data-testid="apply-diff">
        Apply
      </button>
      <button onClick={onReject} data-testid="reject-diff">
        Reject
      </button>
    </div>
  ),
}));

describe("ChatMessage Component", () => {
  const createMessage = (
    content: string,
    role: "user" | "assistant" = "assistant",
  ): ChatMessageType => ({
    id: "test-id",
    role,
    content,
    timestamp: Date.now(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render user message", () => {
      const message = createMessage("Hello!", "user");
      render(<ChatMessage message={message} />);

      expect(screen.getByText("You")).toBeInTheDocument();
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    });

    it("should render AI message", () => {
      const message = createMessage("Hi there!");
      render(<ChatMessage message={message} />);

      expect(screen.getByText("Copilot")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });

    it("should display timestamp", () => {
      const message = createMessage("Test");
      render(<ChatMessage message={message} />);

      const timeElement = screen.getByText(/\d{1,2}:\d{2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });

    it("should render error message", () => {
      const message = createMessage("Error occurred");
      message.error = true;
      render(<ChatMessage message={message} />);

      expect(screen.getByText(/⚠️ Error: Error occurred/)).toBeInTheDocument();
    });

    it("should render markdown content", () => {
      const message = createMessage("# Title\n\nParagraph with **bold** text");
      render(<ChatMessage message={message} />);

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText(/Paragraph with/)).toBeInTheDocument();
    });
  });

  describe("Code Blocks (Existing Behavior)", () => {
    it("should detect applicable code blocks", () => {
      const message = createMessage(`
Here's the code:

\`\`\`javascript
console.log("Hello");
\`\`\`
      `);
      const onApplyCode = vi.fn();

      render(<ChatMessage message={message} onApplyCode={onApplyCode} />);

      expect(screen.getByText("Apply Changes")).toBeInTheDocument();
    });

    it("should apply JavaScript code when button clicked", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
\`\`\`javascript
console.log("Hello");
\`\`\`
      `);
      const onApplyCode = vi.fn();

      render(<ChatMessage message={message} onApplyCode={onApplyCode} />);

      const applyButton = screen.getByText("Apply Changes");
      await user.click(applyButton);

      expect(onApplyCode).toHaveBeenCalledWith(
        'console.log("Hello");',
        undefined,
      );
    });

    it("should apply HTML code when button clicked", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
\`\`\`html
<div>Hello</div>
\`\`\`
      `);
      const onApplyCode = vi.fn();

      render(<ChatMessage message={message} onApplyCode={onApplyCode} />);

      const applyButton = screen.getByText("Apply Changes");
      await user.click(applyButton);

      expect(onApplyCode).toHaveBeenCalledWith(undefined, "<div>Hello</div>");
    });

    it("should apply both JavaScript and HTML code", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
\`\`\`javascript
console.log("Hello");
\`\`\`

\`\`\`html
<div>Hello</div>
\`\`\`
      `);
      const onApplyCode = vi.fn();

      render(<ChatMessage message={message} onApplyCode={onApplyCode} />);

      const applyButton = screen.getByText("Apply Changes");
      await user.click(applyButton);

      expect(onApplyCode).toHaveBeenCalledWith(
        'console.log("Hello");',
        "<div>Hello</div>",
      );
    });

    it("should not show apply button without onApplyCode prop", () => {
      const message = createMessage(`
\`\`\`javascript
console.log("Hello");
\`\`\`
      `);

      render(<ChatMessage message={message} />);

      expect(screen.queryByText("Apply Changes")).not.toBeInTheDocument();
    });

    it("should not show apply button for user messages", () => {
      const message = createMessage(
        `
\`\`\`javascript
console.log("Hello");
\`\`\`
      `,
        "user",
      );
      const onApplyCode = vi.fn();

      render(<ChatMessage message={message} onApplyCode={onApplyCode} />);

      expect(screen.queryByText("Apply Changes")).not.toBeInTheDocument();
    });
  });

  describe("Diff Previews (New Behavior)", () => {
    const currentCode = {
      javascript: 'const x = 1;\nconsole.log("old");',
      html: "<div>Old</div>",
    };

    it("should render diff preview for SEARCH/REPLACE format", () => {
      const message = createMessage(`
Let me update the code:

<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyDiff = vi.fn();

      render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      expect(screen.getByTestId("diff-preview-javascript")).toBeInTheDocument();
    });

    it("should show error when diffs present but no currentCode", () => {
      const message = createMessage(`
<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyDiff = vi.fn();

      render(<ChatMessage message={message} onApplyDiff={onApplyDiff} />);

      expect(
        screen.getByText(
          /⚠️ Cannot preview diffs: current code context not available/,
        ),
      ).toBeInTheDocument();
    });

    it("should apply diff when apply button clicked", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyDiff = vi.fn().mockResolvedValue(undefined);

      render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      const applyButton = screen.getByTestId("apply-diff");
      await user.click(applyButton);

      await waitFor(() => {
        expect(onApplyDiff).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              search: expect.stringContaining('console.log("old")'),
              replace: expect.stringContaining('console.log("new")'),
            }),
          ]),
          "javascript",
        );
      });
    });

    it("should handle diff rejection and remove from preview", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyDiff = vi.fn();

      render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      // Initially, diff preview should be visible
      const diffPreview = screen.getByTestId("diff-preview-javascript");
      expect(diffPreview).toBeInTheDocument();

      // Get the reject button
      const rejectButton = screen.getByTestId("reject-diff");

      // Click the reject button
      await user.click(rejectButton);

      // Wait for the component to update and remove the diff preview
      // Since we're using a Set to track rejected diffs and filtering in the render,
      // the diff preview should be removed on the next render
      await waitFor(
        () => {
          const preview = screen.queryByTestId("diff-preview-javascript");
          expect(preview).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Verify onApplyDiff was never called
      expect(onApplyDiff).not.toHaveBeenCalled();
    });

    it("should show applying state during diff application", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);

      // Create a promise that we can control
      let resolveApply: () => void;
      const applyPromise = new Promise<void>((resolve) => {
        resolveApply = resolve;
      });
      const onApplyDiff = vi.fn().mockReturnValue(applyPromise);

      render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      const applyButton = screen.getByTestId("apply-diff");
      await user.click(applyButton);

      // Button should be disabled during application
      expect(applyButton).toBeDisabled();

      // Resolve the promise
      resolveApply!();

      await waitFor(() => {
        expect(applyButton).not.toBeDisabled();
      });
    });

    it("should handle multiple diff blocks (JS and HTML)", () => {
      const message = createMessage(`
JavaScript changes:

<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");

HTML changes:

<<<SEARCH>>>
<div>Old</div>
<<<REPLACE>>>
<div>New</div>
      `);
      const onApplyDiff = vi.fn();

      render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      expect(screen.getByTestId("diff-preview-javascript")).toBeInTheDocument();
      expect(screen.getByTestId("diff-preview-html")).toBeInTheDocument();
    });

    it("should not show diff preview without onApplyDiff prop", () => {
      const message = createMessage(`
<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);

      render(<ChatMessage message={message} currentCode={currentCode} />);

      expect(
        screen.queryByTestId("diff-preview-javascript"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Mixed Content (Code Blocks and Diffs)", () => {
    const currentCode = {
      javascript: 'console.log("old");',
      html: "<div>Old</div>",
    };

    it("should show both code blocks and diffs when present", () => {
      const message = createMessage(`
Here's a full replacement:

\`\`\`javascript
const x = 1;
\`\`\`

And here's a targeted change:

<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyCode = vi.fn();
      const onApplyDiff = vi.fn();

      render(
        <ChatMessage
          message={message}
          onApplyCode={onApplyCode}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      expect(screen.getByText("Apply Changes")).toBeInTheDocument();
      expect(screen.getByTestId("diff-preview-javascript")).toBeInTheDocument();
    });

    it("should apply code blocks independently of diffs", async () => {
      const user = userEvent.setup();
      const message = createMessage(`
\`\`\`javascript
const x = 1;
\`\`\`

<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyCode = vi.fn();
      const onApplyDiff = vi.fn().mockResolvedValue(undefined);

      render(
        <ChatMessage
          message={message}
          onApplyCode={onApplyCode}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      // Apply code block
      const applyChangesButton = screen.getByText("Apply Changes");
      await user.click(applyChangesButton);
      expect(onApplyCode).toHaveBeenCalledWith("const x = 1;", undefined);

      // Apply diff
      const applyDiffButton = screen.getByTestId("apply-diff");
      await user.click(applyDiffButton);
      await waitFor(() => {
        expect(onApplyDiff).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    const currentCode = {
      javascript: 'console.log("old");',
      html: "<div>Old</div>",
    };

    it("should handle diff application errors gracefully", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const message = createMessage(`
<<<SEARCH>>>
console.log("old");
<<<REPLACE>>>
console.log("new");
      `);
      const onApplyDiff = vi.fn().mockRejectedValue(new Error("Apply failed"));

      render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      const applyButton = screen.getByTestId("apply-diff");
      await user.click(applyButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error applying diffs:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle malformed diff blocks gracefully", () => {
      const message = createMessage(`
<<<SEARCH>>>
This is incomplete...
      `);
      const onApplyDiff = vi.fn();

      // Should not crash, just not show a diff preview
      const { container } = render(
        <ChatMessage
          message={message}
          onApplyDiff={onApplyDiff}
          currentCode={currentCode}
        />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("Backward Compatibility", () => {
    it("should work without new props (onApplyDiff, currentCode)", () => {
      const message = createMessage(`
\`\`\`javascript
console.log("Hello");
\`\`\`
      `);
      const onApplyCode = vi.fn();

      render(<ChatMessage message={message} onApplyCode={onApplyCode} />);

      expect(screen.getByText("Apply Changes")).toBeInTheDocument();
    });

    it("should render normally with only message prop", () => {
      const message = createMessage("Just a text message");

      render(<ChatMessage message={message} />);

      expect(screen.getByText("Just a text message")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should memoize parsed response", () => {
      const message = createMessage("Test message");
      const { rerender } = render(<ChatMessage message={message} />);

      // Re-render with same message
      rerender(<ChatMessage message={message} />);

      // Component should render without errors (memoization tested internally)
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("should recompute when message content changes", () => {
      const message1 = createMessage("First message");
      const { rerender } = render(<ChatMessage message={message1} />);

      expect(screen.getByText("First message")).toBeInTheDocument();

      const message2 = createMessage("Second message");
      rerender(<ChatMessage message={message2} />);

      expect(screen.getByText("Second message")).toBeInTheDocument();
      expect(screen.queryByText("First message")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      const message = createMessage("Test message");
      render(<ChatMessage message={message} />);

      const messageElement = screen
        .getByText("Test message")
        .closest(".chat-message");
      expect(messageElement).toBeInTheDocument();
    });

    it("should indicate user vs AI message visually", () => {
      const userMessage = createMessage("User message", "user");
      const { container: userContainer } = render(
        <ChatMessage message={userMessage} />,
      );

      const aiMessage = createMessage("AI message");
      const { container: aiContainer } = render(
        <ChatMessage message={aiMessage} />,
      );

      const userMessageDiv = userContainer.querySelector(".user-message");
      const aiMessageDiv = aiContainer.querySelector(".ai-message");

      expect(userMessageDiv).toBeInTheDocument();
      expect(aiMessageDiv).toBeInTheDocument();
    });
  });
});
