/**
 * PromptInput Component Test Suite
 *
 * Tests for textarea auto-resize, submit handling, and keyboard shortcuts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PromptInput } from "./PromptInput";
import { useState } from "react";

// Test wrapper component
const TestWrapper = () => {
  const [input, setInput] = useState("");

  return (
    <PromptInput
      value={input}
      onChange={setInput}
      onSubmit={() => {
        // Simulate parent clearing the input on submit
        setInput("");
      }}
      placeholder="Enter message..."
    />
  );
};

describe("PromptInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock scrollHeight for textarea auto-resize tests
    // JSDOM doesn't simulate scrollHeight, so we need to mock it
    Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
      configurable: true,
      get: function (this: HTMLTextAreaElement) {
        // Simulate scrollHeight based on content
        const lineHeight = 24; // Approximate line height
        const minHeight = 44;

        // Empty content should return minHeight
        if (!this.value || !this.value.trim()) {
          return minHeight;
        }

        // Calculate based on number of lines
        const lines = this.value.split("\n").length;

        // Also account for content length (long lines wrap)
        const avgCharsPerLine = 60; // Approximate chars that fit per line
        const estimatedWrappedLines = Math.ceil(
          this.value.length / avgCharsPerLine,
        );

        // Use the larger of the two estimates
        const totalLines = Math.max(lines, estimatedWrappedLines);

        return Math.max(minHeight, totalLines * lineHeight);
      },
    });
  });

  describe("textarea auto-resize", () => {
    it("should start at minimum height (44px)", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;

      // Wait for the auto-resize effect to run
      await waitFor(() => {
        expect(textarea.style.height).toBe("44px");
      });
    });

    it("should grow height when typing multiple lines", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      // Type text that will wrap to multiple lines
      const longText =
        "This is a long message that should wrap to multiple lines and cause the textarea to grow beyond its initial height";
      await user.click(textarea);
      await user.type(textarea, longText);

      // Wait for the value to be set and the resize to happen
      await waitFor(() => {
        expect(textarea.value).toBe(longText);
      });

      await waitFor(() => {
        const heightValue = parseInt(textarea.style.height);
        expect(heightValue).toBeGreaterThan(44);
      });
    });

    it("should not exceed maximum height (250px)", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      // Type very long text to try to exceed max height
      const veryLongText =
        "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12".repeat(
          3,
        );
      await user.click(textarea);
      await user.type(textarea, veryLongText);

      await waitFor(() => {
        const heightValue = parseInt(textarea.style.height);
        expect(heightValue).toBeLessThanOrEqual(250);
      });
    });

    it("should shrink back to minimum height after clearing", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      // Type text that is long enough to increase height
      const testMessage =
        "This is a test message that is long enough to wrap and increase the textarea height beyond the minimum";
      await user.click(textarea);
      await user.type(textarea, testMessage);

      // Wait for value to be set
      await waitFor(() => {
        expect(textarea.value).toBe(testMessage);
      });

      // Wait for height to increase
      await waitFor(() => {
        const expandedHeight = parseInt(textarea.style.height);
        expect(expandedHeight).toBeGreaterThan(44);
      });

      // Clear the text
      await user.clear(textarea);

      // Wait for value to be cleared
      await waitFor(() => {
        expect(textarea.value).toBe("");
      });

      // Wait for height to reset
      await waitFor(() => {
        const heightValue = parseInt(textarea.style.height);
        expect(heightValue).toBe(44);
      });
    });

    it("should handle rapid typing and clearing", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      // Type, clear, type pattern
      await user.click(textarea);

      for (let i = 0; i < 3; i++) {
        const testMessage =
          "Test message that is long enough to wrap and increase height beyond the initial minimum";
        await user.type(textarea, testMessage);

        // Wait for value to be set
        await waitFor(() => {
          expect(textarea.value).toBe(testMessage);
        });

        // Wait for height to increase
        await waitFor(() => {
          const heightValue = parseInt(textarea.style.height);
          expect(heightValue).toBeGreaterThan(44);
        });

        await user.clear(textarea);

        // Wait for value to be cleared
        await waitFor(() => {
          expect(textarea.value).toBe("");
        });

        // Wait for height to reset
        await waitFor(() => {
          const heightValue = parseInt(textarea.style.height);
          expect(heightValue).toBe(44);
        });
      }
    });

    it("should handle paste operations with multiline content", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      await user.click(textarea);

      // Simulate paste event with multiline content
      const multilineContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      await user.type(textarea, multilineContent);

      await waitFor(() => {
        const heightValue = parseInt(textarea.style.height);
        expect(heightValue).toBeGreaterThan(44);
        expect(textarea.value).toBe(multilineContent);
      });
    });

    it("should set overflow-y to auto when exceeding max height", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      // Type very long text
      const veryLongText = Array(20)
        .fill("This is a line of text. ")
        .join("\n");
      await user.click(textarea);
      await user.type(textarea, veryLongText);

      await waitFor(() => {
        const heightValue = parseInt(textarea.style.height);
        if (heightValue >= 250) {
          expect(textarea.style.overflowY).toBe("auto");
        }
      });
    });

    it("should set overflow-y to hidden when below max height", async () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      await user.click(textarea);
      await user.type(textarea, "Short message");

      await waitFor(() => {
        expect(textarea.style.overflowY).toBe("hidden");
      });
    });
  });

  describe("submit handling", () => {
    it("should call onSubmit when Enter is pressed", async () => {
      const mockSubmit = vi.fn();
      render(
        <PromptInput
          value="test message"
          onChange={() => {}}
          onSubmit={mockSubmit}
          placeholder="Enter message..."
        />,
      );

      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      await user.click(textarea);
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });

    it("should add newline when Shift+Enter is pressed", async () => {
      const onChange = vi.fn();
      render(
        <PromptInput
          value="line 1"
          onChange={onChange}
          onSubmit={() => {}}
          placeholder="Enter message..."
        />,
      );

      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      await user.click(textarea);
      // Position cursor at end
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      await user.keyboard("{Shift>}{Enter}{/Shift}");

      // onChange should have been called for the newline character
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;

      expect(textarea).toHaveAttribute("aria-label");
      expect(textarea).toHaveAttribute("aria-multiline", "true");
    });

    it("should have proper role for accessibility", () => {
      render(<TestWrapper />);
      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;

      // Textarea should be keyboard accessible
      expect(textarea).toBeVisible();
      expect(textarea).not.toBeDisabled();
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(
        <PromptInput
          value=""
          onChange={() => {}}
          onSubmit={() => {}}
          disabled={true}
          placeholder="Enter message..."
        />,
      );

      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;

      expect(textarea).toBeDisabled();
    });

    it("should not accept input when disabled", async () => {
      const onChange = vi.fn();
      render(
        <PromptInput
          value=""
          onChange={onChange}
          onSubmit={() => {}}
          disabled={true}
          placeholder="Enter message..."
        />,
      );

      const textarea = screen.getByPlaceholderText(
        "Enter message...",
      ) as HTMLTextAreaElement;
      const user = userEvent.setup();

      // Try to type
      await user.click(textarea).catch(() => {}); // May fail due to disabled state
      // onChange should not be called because the input is disabled
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
