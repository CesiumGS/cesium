/**
 * StreamingDiffPreview Component Tests
 *
 * Comprehensive test suite for the StreamingDiffPreview component.
 * Tests rendering, streaming states, accessibility, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  StreamingDiffPreview,
  type StreamingDiffPreviewProps,
} from "./StreamingDiffPreview";

// Mock react-markdown to avoid hanging tests
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock remark-gfm
vi.mock("remark-gfm", () => ({
  default: () => ({}),
}));

describe("StreamingDiffPreview Component", () => {
  const defaultProps: StreamingDiffPreviewProps = {
    diffIndex: 0,
    language: "javascript",
    searchContent: 'const oldCode = "test";',
    replaceContent: 'const newCode = "updated";',
    isComplete: false,
    isStreaming: true,
  };

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe("Rendering", () => {
    it("should render with basic props", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      expect(
        screen.getByRole("region", { name: /streaming diff preview 1/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Diff #1/i)).toBeInTheDocument();
    });

    it("should display correct diff index", () => {
      render(<StreamingDiffPreview {...defaultProps} diffIndex={5} />);

      expect(screen.getByText(/Diff #6/i)).toBeInTheDocument();
    });

    it("should render search and replace sections", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      expect(screen.getByText("Search")).toBeInTheDocument();
      expect(screen.getByText("Replace")).toBeInTheDocument();
    });

    it("should display search content", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      expect(screen.getByText(/const oldCode = "test"/)).toBeInTheDocument();
    });

    it("should display replace content", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      expect(screen.getByText(/const newCode = "updated"/)).toBeInTheDocument();
    });

    it("should display line counts", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      // Both sections should show "1 lines"
      const lineCountElements = screen.getAllByText(/1 lines/i);
      expect(lineCountElements.length).toBeGreaterThan(0);
    });

    it("should handle multiline content", () => {
      const multilineProps = {
        ...defaultProps,
        searchContent: "const a = 1;\nconst b = 2;\nconst c = 3;",
        replaceContent: "const x = 1;\nconst y = 2;\nconst z = 3;",
      };

      render(<StreamingDiffPreview {...multilineProps} />);

      // Both search and replace sections show "3 lines"
      const lineCountElements = screen.getAllByText(/3 lines/i);
      expect(lineCountElements.length).toBe(2);
    });

    it("should handle empty content", () => {
      const emptyProps = {
        ...defaultProps,
        searchContent: "",
        replaceContent: "",
      };

      render(<StreamingDiffPreview {...emptyProps} />);

      const emptyElements = screen.getAllByText("No content");
      expect(emptyElements.length).toBe(2); // One for search, one for replace
    });
  });

  describe("Streaming States", () => {
    it("should show streaming badge when streaming", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      expect(screen.getByText("Streaming")).toBeInTheDocument();
    });

    it("should show complete badge when complete", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should not show badges when pending", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={false}
        />,
      );

      expect(screen.queryByText("Streaming")).not.toBeInTheDocument();
      expect(screen.queryByText("Complete")).not.toBeInTheDocument();
    });

    it("should show streaming cursor when streaming", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      const cursor = container.querySelector(".streaming-cursor");
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveTextContent("▋");
    });

    it("should not show cursor when complete", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      const cursor = container.querySelector(".streaming-cursor");
      expect(cursor).not.toBeInTheDocument();
    });

    it("should show streaming dots when streaming", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      const dots = container.querySelector(".streaming-dots");
      expect(dots).toBeInTheDocument();
    });

    it("should not show streaming dots when complete", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      const dots = container.querySelector(".streaming-dots");
      expect(dots).not.toBeInTheDocument();
    });

    it("should apply streaming state class to container", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      const preview = container.querySelector(".streaming-diff-preview");
      expect(preview).toHaveClass("streaming");
    });

    it("should apply complete state class to container", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      const preview = container.querySelector(".streaming-diff-preview");
      expect(preview).toHaveClass("complete");
    });

    it("should apply pending state class to container", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={false}
        />,
      );

      const preview = container.querySelector(".streaming-diff-preview");
      expect(preview).toHaveClass("pending");
    });

    it("should show footer with metadata when complete", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      expect(screen.getByText("Language:")).toBeInTheDocument();
      expect(screen.getByText("javascript")).toBeInTheDocument();
    });

    it("should not show footer when streaming", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      expect(screen.queryByText("Language:")).not.toBeInTheDocument();
    });
  });

  describe("Language Support", () => {
    it("should handle javascript language", () => {
      const { container } = render(
        <StreamingDiffPreview {...defaultProps} language="javascript" />,
      );

      const codeElements = container.querySelectorAll(".language-javascript");
      expect(codeElements.length).toBeGreaterThan(0);
    });

    it("should handle html language", () => {
      const { container } = render(
        <StreamingDiffPreview {...defaultProps} language="html" />,
      );

      const codeElements = container.querySelectorAll(".language-html");
      expect(codeElements.length).toBeGreaterThan(0);
    });

    it("should display language in footer when complete", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          language="html"
          isStreaming={false}
          isComplete={true}
        />,
      );

      expect(screen.getByText("html")).toBeInTheDocument();
    });
  });

  describe("Status Icons", () => {
    it("should show streaming icon when streaming", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      expect(screen.getByLabelText("Streaming in progress")).toHaveTextContent(
        "◉",
      );
    });

    it("should show complete icon when complete", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      expect(screen.getByLabelText("Complete")).toHaveTextContent("✓");
    });

    it("should show pending icon when pending", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={false}
        />,
      );

      expect(screen.getByLabelText("Pending")).toHaveTextContent("○");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      expect(
        screen.getByRole("region", { name: /streaming diff preview 1/i }),
      ).toBeInTheDocument();
    });

    it("should announce state changes to screen readers", async () => {
      const { rerender } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        "Diff 1 is streaming",
      );

      rerender(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={false}
          isComplete={true}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "Diff 1 is complete",
        );
      });
    });

    it("should have aria-labels for line counts", () => {
      render(<StreamingDiffPreview {...defaultProps} />);

      // Both search and replace sections have "1 lines" aria-label
      expect(screen.getAllByLabelText("1 lines")).toHaveLength(2);
    });

    it("should have aria-labels for badges", () => {
      render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      expect(screen.getByLabelText("Streaming")).toBeInTheDocument();
    });

    it("should hide cursor from screen readers", () => {
      const { container } = render(
        <StreamingDiffPreview
          {...defaultProps}
          isStreaming={true}
          isComplete={false}
        />,
      );

      const cursor = container.querySelector(".streaming-cursor");
      expect(cursor).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long single lines", () => {
      const longLine = "a".repeat(1000);
      const props = {
        ...defaultProps,
        searchContent: longLine,
        replaceContent: longLine,
      };

      const { container } = render(<StreamingDiffPreview {...props} />);

      // Just verify it renders without error
      const codeElements = container.querySelectorAll(".streaming-diff-code");
      expect(codeElements.length).toBeGreaterThan(0);
    });

    it("should handle special characters", () => {
      const specialProps = {
        ...defaultProps,
        searchContent:
          'const regex = /[a-z]+/gi;\nconst str = "Test\\n\\t\\r";',
        replaceContent:
          'const regex = /[A-Z]+/gi;\nconst str = "Updated\\n\\t\\r";',
      };

      const { container } = render(<StreamingDiffPreview {...specialProps} />);

      // Just verify it renders without error and contains expected content
      const codeElements = container.querySelectorAll(".streaming-diff-code");
      expect(codeElements.length).toBe(2);
      expect(container.textContent).toContain("regex");
    });

    it("should handle unicode characters", () => {
      const unicodeProps = {
        ...defaultProps,
        searchContent: "const emoji = '😀🎉';",
        replaceContent: "const emoji = '🚀✨';",
      };

      const { container } = render(<StreamingDiffPreview {...unicodeProps} />);

      // Verify it renders and contains emoji content
      expect(container.textContent).toContain("emoji");
      expect(container.textContent).toContain("😀🎉");
      expect(container.textContent).toContain("🚀✨");
    });

    it("should handle mixed content with empty sections", () => {
      const mixedProps = {
        ...defaultProps,
        searchContent: "",
        replaceContent: 'const newCode = "test";',
      };

      render(<StreamingDiffPreview {...mixedProps} />);

      expect(screen.getByText("No content")).toBeInTheDocument();
      expect(screen.getByText(/const newCode/)).toBeInTheDocument();
    });

    it("should update when content changes", () => {
      const { rerender } = render(<StreamingDiffPreview {...defaultProps} />);

      expect(screen.getByText(/const newCode = "updated"/)).toBeInTheDocument();

      rerender(
        <StreamingDiffPreview
          {...defaultProps}
          replaceContent='const newCode = "changed";'
        />,
      );

      expect(screen.getByText(/const newCode = "changed"/)).toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should have glassmorphism styling classes", () => {
      const { container } = render(<StreamingDiffPreview {...defaultProps} />);

      const preview = container.querySelector(".streaming-diff-preview");
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveClass("streaming-diff-preview");
    });

    it("should have grid layout for side-by-side display", () => {
      const { container } = render(<StreamingDiffPreview {...defaultProps} />);

      const grid = container.querySelector(".streaming-diff-grid");
      expect(grid).toBeInTheDocument();
    });

    it("should have separate sections for search and replace", () => {
      const { container } = render(<StreamingDiffPreview {...defaultProps} />);

      const searchSection = container.querySelector(".streaming-diff-search");
      const replaceSection = container.querySelector(".streaming-diff-replace");

      expect(searchSection).toBeInTheDocument();
      expect(replaceSection).toBeInTheDocument();
    });
  });

  describe("Multiple Diffs", () => {
    it("should render multiple diffs with different indices", () => {
      const { container: container1 } = render(
        <StreamingDiffPreview {...defaultProps} diffIndex={0} />,
      );
      const { container: container2 } = render(
        <StreamingDiffPreview {...defaultProps} diffIndex={1} />,
      );

      const title1 = container1.querySelector(".streaming-diff-title");
      const title2 = container2.querySelector(".streaming-diff-title");

      expect(title1).toHaveTextContent("Diff #1");
      expect(title2).toHaveTextContent("Diff #2");
    });

    it("should handle diff index starting from zero", () => {
      render(<StreamingDiffPreview {...defaultProps} diffIndex={0} />);

      expect(screen.getByText(/Diff #1/i)).toBeInTheDocument();
    });

    it("should handle large diff indices", () => {
      render(<StreamingDiffPreview {...defaultProps} diffIndex={999} />);

      expect(screen.getByText(/Diff #1000/i)).toBeInTheDocument();
    });
  });
});
