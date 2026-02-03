/**
 * Integration Tests for ThinkingBlock and DiffAccordion Components
 *
 * This test suite verifies:
 * 1. ThinkingBlock renders correctly with content
 * 2. ThinkingBlock toggles between collapsed/expanded states
 * 3. DiffAccordion renders correctly with diff content
 * 4. DiffAccordion calculates edit count correctly
 * 5. Both components work together in a message context
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ThinkingBlock } from "./ThinkingBlock";
import { DiffAccordion } from "./DiffAccordion";

// Mock CodeBlock component
vi.mock("./CodeBlock", () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      <code>{code}</code>
    </pre>
  ),
}));

describe("ThinkingBlock Component", () => {
  describe("Basic Rendering", () => {
    it("should render with content in collapsed state", () => {
      render(<ThinkingBlock content="Analyzing the code structure..." />);

      expect(screen.getByText("Thinking")).toBeInTheDocument();
      expect(
        screen.getByText(/Analyzing the code structure\.\.\./),
      ).toBeInTheDocument();
    });

    it("should render with LEFT-TO-RIGHT MARK for RTL display", () => {
      const { container } = render(<ThinkingBlock content="Test content" />);

      // The content should contain U+200E (LEFT-TO-RIGHT MARK)
      const previewElement = container.querySelector(".thinking-preview");
      expect(previewElement).toBeInTheDocument();
      expect(previewElement?.textContent).toMatch(/\u200E/);
    });

    it("should show collapsed chevron when collapsed", () => {
      const { container } = render(<ThinkingBlock content="Test" />);

      const chevron = container.querySelector(".thinking-chevron");
      expect(chevron).toBeInTheDocument();
      expect(chevron?.textContent).toBe("▶");
    });

    it("should show streaming spinner when isStreaming is true", () => {
      const { container } = render(
        <ThinkingBlock content="Processing..." isStreaming={true} />,
      );

      const spinner = container.querySelector(".thinking-spinner");
      expect(spinner).toBeInTheDocument();
    });

    it("should not show streaming spinner when isStreaming is false", () => {
      const { container } = render(
        <ThinkingBlock content="Processed" isStreaming={false} />,
      );

      const spinner = container.querySelector(".thinking-spinner");
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe("Toggle Functionality", () => {
    it("should toggle to expanded state when clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ThinkingBlock content="Test thinking content" />,
      );

      // Initially collapsed
      expect(screen.getByText("Thinking")).toBeInTheDocument();

      // Click to expand
      const header = container.querySelector(".thinking-block-header");
      if (header) {
        await user.click(header);
      }

      // Should now show expanded chevron
      const chevron = container.querySelector(".thinking-chevron.expanded");
      expect(chevron).toBeInTheDocument();
      expect(chevron?.textContent).toBe("▼");
    });

    it("should toggle back to collapsed state when clicked again", async () => {
      const user = userEvent.setup();
      const { container } = render(<ThinkingBlock content="Toggle test" />);

      const header = container.querySelector(".thinking-block-header");
      if (!header) {
        throw new Error("ThinkingBlock header not found");
      }

      // Expand
      await user.click(header);
      expect(
        container.querySelector(".thinking-chevron.expanded"),
      ).toBeInTheDocument();

      // Collapse
      await user.click(header);
      const chevron = container.querySelector(
        ".thinking-chevron:not(.expanded)",
      );
      expect(chevron).toBeInTheDocument();
      expect(chevron?.textContent).toBe("▶");
    });

    it("should allow toggle even when streaming", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ThinkingBlock content="Streaming..." isStreaming={true} />,
      );

      const header = container.querySelector(".thinking-block-header");
      if (!header) {
        throw new Error("ThinkingBlock header not found");
      }

      // Click while streaming - should still toggle
      await user.click(header);

      // Should expand
      expect(
        container.querySelector(".thinking-chevron.expanded"),
      ).toBeInTheDocument();
    });

    it("should show full content when expanded", async () => {
      const user = userEvent.setup();
      const longContent =
        "First line\nSecond line\nThird line with more details";
      const { container } = render(<ThinkingBlock content={longContent} />);

      const header = container.querySelector(".thinking-block-header");
      if (!header) {
        throw new Error("ThinkingBlock header not found");
      }

      // Expand
      await user.click(header);

      // Should show full content
      const expandedContent = container.querySelector(
        ".thinking-block-content",
      );
      expect(expandedContent).toBeInTheDocument();
      expect(expandedContent?.textContent).toContain("First line");
      expect(expandedContent?.textContent).toContain("Second line");
      expect(expandedContent?.textContent).toContain("Third line");
    });
  });

  describe("Styling and Structure", () => {
    it("should have thinking-block class", () => {
      const { container } = render(<ThinkingBlock content="Test" />);

      const thinkingBlock = container.querySelector(".thinking-block");
      expect(thinkingBlock).toBeInTheDocument();
    });

    it("should have streaming class when streaming", () => {
      const { container } = render(
        <ThinkingBlock content="Test" isStreaming={true} />,
      );

      const header = container.querySelector(
        ".thinking-block-header.streaming",
      );
      expect(header).toBeInTheDocument();
    });
  });
});

describe("DiffAccordion Component", () => {
  const mockDiffContent = `
----- SEARCH
const x = 1;
console.log("old");
----- REPLACE
const x = 2;
console.log("new");
`.trim();

  const multipleDiffContent = `
----- SEARCH
const x = 1;
----- REPLACE
const x = 2;

----- SEARCH
const y = 1;
----- REPLACE
const y = 2;

----- SEARCH
const z = 1;
----- REPLACE
const z = 2;
`.trim();

  describe("Basic Rendering", () => {
    it("should render with language badge and edit count", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      expect(screen.getByText("JAVASCRIPT")).toBeInTheDocument();
      expect(screen.getByText("1 edit")).toBeInTheDocument();
    });

    it("should render HTML language badge", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="html"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      expect(screen.getByText("HTML")).toBeInTheDocument();
    });

    it("should show chevron pointing down when collapsed", () => {
      const onToggle = vi.fn();
      const { container } = render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const chevron = container.querySelector(".diff-accordion-chevron");
      expect(chevron).toBeInTheDocument();
      expect(chevron?.textContent).toBe("▼");
    });

    it("should not show diff content when collapsed", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      expect(screen.queryByTestId("code-block")).not.toBeInTheDocument();
    });

    it("should show diff content when expanded", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={true}
          onToggle={onToggle}
        />,
      );

      const codeBlock = screen.getByTestId("code-block");
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock).toHaveAttribute("data-language", "diff");
    });
  });

  describe("Edit Count Calculation", () => {
    it("should calculate single edit correctly", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      expect(screen.getByText("1 edit")).toBeInTheDocument();
    });

    it("should calculate multiple edits correctly", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={multipleDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      expect(screen.getByText("3 edits")).toBeInTheDocument();
    });

    it("should handle zero edits", () => {
      const onToggle = vi.fn();
      const noEditContent = "Some content without SEARCH blocks";
      render(
        <DiffAccordion
          language="javascript"
          diffContent={noEditContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      expect(screen.getByText("0 edits")).toBeInTheDocument();
    });

    it("should use singular 'edit' for exactly one edit", () => {
      const onToggle = vi.fn();
      const singleEdit = "----- SEARCH\nold\n----- REPLACE\nnew";
      render(
        <DiffAccordion
          language="javascript"
          diffContent={singleEdit}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const editCount = screen.getByText("1 edit");
      expect(editCount).toBeInTheDocument();
      expect(screen.queryByText("1 edits")).not.toBeInTheDocument();
    });
  });

  describe("Toggle Functionality", () => {
    it("should call onToggle when header is clicked", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("should call onToggle when Enter key is pressed", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const header = screen.getByRole("button");
      header.focus();
      await user.keyboard("{Enter}");

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("should call onToggle when Space key is pressed", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const header = screen.getByRole("button");
      header.focus();
      await user.keyboard(" ");

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("should rotate chevron when expanded", () => {
      const onToggle = vi.fn();
      const { container, rerender } = render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const chevronCollapsed = container.querySelector(
        ".diff-accordion-chevron",
      );
      expect(chevronCollapsed).toHaveStyle({ transform: "rotate(0deg)" });

      rerender(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={true}
          onToggle={onToggle}
        />,
      );

      const chevronExpanded = container.querySelector(
        ".diff-accordion-chevron",
      );
      expect(chevronExpanded).toHaveStyle({ transform: "rotate(180deg)" });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const header = screen.getByRole("button");
      expect(header).toHaveAttribute("aria-expanded", "false");
      expect(header).toHaveAttribute("tabIndex", "0");
      expect(header).toHaveAttribute(
        "aria-label",
        "JAVASCRIPT diff with 1 edit, collapsed",
      );
    });

    it("should update aria-expanded when expanded", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={true}
          onToggle={onToggle}
        />,
      );

      const header = screen.getByRole("button");
      expect(header).toHaveAttribute("aria-expanded", "true");
      expect(header).toHaveAttribute(
        "aria-label",
        "JAVASCRIPT diff with 1 edit, expanded",
      );
    });

    it("should be keyboard navigable", () => {
      const onToggle = vi.fn();
      render(
        <DiffAccordion
          language="javascript"
          diffContent={mockDiffContent}
          isExpanded={false}
          onToggle={onToggle}
        />,
      );

      const header = screen.getByRole("button");
      expect(header).toHaveAttribute("tabIndex", "0");
    });
  });
});

describe("Integration: ThinkingBlock and DiffAccordion Together", () => {
  /**
   * Simulates a message component that might use both ThinkingBlock and DiffAccordion
   */
  function MessageWithComponents({
    showThinking,
    showDiff,
  }: {
    showThinking: boolean;
    showDiff: boolean;
  }) {
    const [isDiffExpanded, setIsDiffExpanded] = React.useState(false);

    const diffContent = `
----- SEARCH
console.log("old");
----- REPLACE
console.log("new");
    `.trim();

    return (
      <div data-testid="message-container">
        {showThinking && (
          <ThinkingBlock
            content="Analyzing your code and preparing changes..."
            isStreaming={false}
          />
        )}
        <div data-testid="message-content">
          <p>I've analyzed your code and prepared the following changes:</p>
        </div>
        {showDiff && (
          <DiffAccordion
            language="javascript"
            diffContent={diffContent}
            isExpanded={isDiffExpanded}
            onToggle={() => setIsDiffExpanded(!isDiffExpanded)}
          />
        )}
      </div>
    );
  }

  it("should render ThinkingBlock and DiffAccordion in the same message", () => {
    render(<MessageWithComponents showThinking={true} showDiff={true} />);

    // ThinkingBlock should be present
    expect(screen.getByText("Thinking")).toBeInTheDocument();

    // Message content should be present
    expect(
      screen.getByText(
        /I've analyzed your code and prepared the following changes/,
      ),
    ).toBeInTheDocument();

    // DiffAccordion should be present
    expect(screen.getByText("JAVASCRIPT")).toBeInTheDocument();
    expect(screen.getByText("1 edit")).toBeInTheDocument();
  });

  it("should allow independent interaction with both components", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MessageWithComponents showThinking={true} showDiff={true} />,
    );

    // Expand ThinkingBlock
    const thinkingHeader = container.querySelector(".thinking-block-header");
    if (thinkingHeader) {
      await user.click(thinkingHeader);
    }
    expect(
      container.querySelector(".thinking-chevron.expanded"),
    ).toBeInTheDocument();

    // Expand DiffAccordion
    const diffHeader = screen.getByRole("button");
    await user.click(diffHeader);

    // Both should be expanded
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
    expect(
      screen.getByText(/Analyzing your code and preparing changes/),
    ).toBeInTheDocument();
  });

  it("should work with only ThinkingBlock", () => {
    render(<MessageWithComponents showThinking={true} showDiff={false} />);

    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.queryByText("JAVASCRIPT")).not.toBeInTheDocument();
  });

  it("should work with only DiffAccordion", () => {
    render(<MessageWithComponents showThinking={false} showDiff={true} />);

    expect(screen.queryByText("Thinking")).not.toBeInTheDocument();
    expect(screen.getByText("JAVASCRIPT")).toBeInTheDocument();
  });

  it("should maintain separate state for each component", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MessageWithComponents showThinking={true} showDiff={true} />,
    );

    // Expand only ThinkingBlock
    const thinkingHeader = container.querySelector(".thinking-block-header");
    if (thinkingHeader) {
      await user.click(thinkingHeader);
    }

    // ThinkingBlock should be expanded
    expect(
      container.querySelector(".thinking-chevron.expanded"),
    ).toBeInTheDocument();

    // DiffAccordion should still be collapsed
    expect(screen.queryByTestId("code-block")).not.toBeInTheDocument();

    // Now expand DiffAccordion
    const diffHeader = screen.getByRole("button");
    await user.click(diffHeader);

    // Both should now be expanded
    expect(
      container.querySelector(".thinking-chevron.expanded"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("code-block")).toBeInTheDocument();

    // Collapse ThinkingBlock
    if (thinkingHeader) {
      await user.click(thinkingHeader);
    }

    // ThinkingBlock should be collapsed
    const collapsedChevron = container.querySelector(
      ".thinking-chevron:not(.expanded)",
    );
    expect(collapsedChevron).toBeInTheDocument();

    // DiffAccordion should still be expanded
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
  });

  it("should handle streaming ThinkingBlock with static DiffAccordion", async () => {
    const user = userEvent.setup();

    function StreamingMessage() {
      const [isDiffExpanded, setIsDiffExpanded] = React.useState(false);

      return (
        <div>
          <ThinkingBlock
            content="Processing your request..."
            isStreaming={true}
          />
          <DiffAccordion
            language="javascript"
            diffContent="----- SEARCH\nold\n----- REPLACE\nnew"
            isExpanded={isDiffExpanded}
            onToggle={() => setIsDiffExpanded(!isDiffExpanded)}
          />
        </div>
      );
    }

    const { container } = render(<StreamingMessage />);

    // ThinkingBlock should show streaming indicator
    expect(container.querySelector(".thinking-spinner")).toBeInTheDocument();

    // DiffAccordion should be interactive
    const diffHeader = screen.getByRole("button");
    await user.click(diffHeader);
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
  });
});
