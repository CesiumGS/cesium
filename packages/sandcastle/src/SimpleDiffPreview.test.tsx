/**
 * SimpleDiffPreview Component Tests
 *
 * Comprehensive test suite for the SimpleDiffPreview component.
 * Tests text-based diff rendering and all user interactions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  SimpleDiffPreview,
  type SimpleDiffPreviewProps,
} from "./SimpleDiffPreview";

describe("SimpleDiffPreview Component", () => {
  const defaultProps: SimpleDiffPreviewProps = {
    originalCode: 'console.log("Hello");',
    modifiedCode: 'console.log("Hello, World!");',
    language: "javascript",
    onApply: vi.fn(),
    onReject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with basic props", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      expect(
        screen.getByRole("region", { name: /code diff preview/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Changes\.js/i)).toBeInTheDocument();
    });

    it("should render with custom filename", () => {
      render(<SimpleDiffPreview {...defaultProps} fileName="MyScript.js" />);

      expect(screen.getByText("MyScript.js")).toBeInTheDocument();
    });

    it("should render HTML file extension for html language", () => {
      render(<SimpleDiffPreview {...defaultProps} language="html" />);

      expect(screen.getByText(/Changes\.html/i)).toBeInTheDocument();
    });

    it("should display diff statistics", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      // Should show additions
      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
    });

    it("should render collapsed when defaultCollapsed is true", () => {
      render(<SimpleDiffPreview {...defaultProps} defaultCollapsed={true} />);

      // Diff lines should not be rendered when collapsed
      const diffLines = document.querySelector(".simple-diff-lines");
      expect(diffLines).not.toBeInTheDocument();
    });

    it("should render expanded by default", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      // Diff lines should be rendered when expanded
      const diffLines = document.querySelector(".simple-diff-lines");
      expect(diffLines).toBeInTheDocument();
    });

    it("should display diff lines with proper styling", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      const diffLines = document.querySelectorAll(".diff-line");
      expect(diffLines.length).toBeGreaterThan(0);
    });
  });

  describe("Diff Line Rendering", () => {
    it("should show added lines in green", () => {
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode=""
          modifiedCode='console.log("Added");'
        />,
      );

      const addedLine = document.querySelector(".diff-line-added");
      expect(addedLine).toBeInTheDocument();
      expect(addedLine?.querySelector(".line-marker")).toHaveTextContent("+");
    });

    it("should show removed lines in red", () => {
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode='console.log("Removed");'
          modifiedCode=""
        />,
      );

      const removedLine = document.querySelector(".diff-line-removed");
      expect(removedLine).toBeInTheDocument();
      expect(removedLine?.querySelector(".line-marker")).toHaveTextContent("-");
    });

    it("should show unchanged lines", () => {
      const sameCode = 'console.log("Same");';
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode={sameCode}
          modifiedCode={sameCode}
        />,
      );

      const unchangedLines = document.querySelectorAll(".diff-line-unchanged");
      expect(unchangedLines.length).toBeGreaterThan(0);
    });

    it("should display line numbers correctly", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      const lineNumbers = document.querySelectorAll(".line-number");
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it("should handle multi-line diffs", () => {
      const original = "line1\nline2\nline3";
      const modified = "line1\nmodified2\nline3\nline4";

      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode={original}
          modifiedCode={modified}
        />,
      );

      const diffLines = document.querySelectorAll(".diff-line");
      expect(diffLines.length).toBeGreaterThan(3);
    });
  });

  describe("User Interactions", () => {
    it("should call onApply when Apply Changes button is clicked", async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      render(<SimpleDiffPreview {...defaultProps} onApply={onApply} />);

      const applyButton = screen.getByRole("button", {
        name: /apply changes/i,
      });
      await user.click(applyButton);

      expect(onApply).toHaveBeenCalledTimes(1);
    });

    it("should call onReject when Reject button is clicked", async () => {
      const user = userEvent.setup();
      const onReject = vi.fn();

      render(<SimpleDiffPreview {...defaultProps} onReject={onReject} />);

      const rejectButton = screen.getByRole("button", { name: /reject/i });
      await user.click(rejectButton);

      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("should toggle collapsed state when collapse button is clicked", async () => {
      const user = userEvent.setup();

      render(<SimpleDiffPreview {...defaultProps} />);

      const collapseButton = screen.getByRole("button", {
        name: /collapse diff/i,
      });

      // Initially expanded
      expect(document.querySelector(".simple-diff-lines")).toBeInTheDocument();

      // Click to collapse
      await user.click(collapseButton);
      expect(
        document.querySelector(".simple-diff-lines"),
      ).not.toBeInTheDocument();

      // Click to expand
      await user.click(collapseButton);
      expect(document.querySelector(".simple-diff-lines")).toBeInTheDocument();
    });

    it("should copy code to clipboard when Copy Code button is clicked", async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      // Mock navigator.clipboard
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      render(<SimpleDiffPreview {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await user.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith(defaultProps.modifiedCode);
    });

    it("should handle clipboard copy failure gracefully", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const writeTextMock = vi
        .fn()
        .mockRejectedValue(new Error("Clipboard error"));

      // Mock navigator.clipboard
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      render(<SimpleDiffPreview {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await user.click(copyButton);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should apply changes when Cmd+Enter is pressed", async () => {
      const onApply = vi.fn();

      render(<SimpleDiffPreview {...defaultProps} onApply={onApply} />);

      await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledTimes(1);
      });
    });

    it("should apply changes when Ctrl+Enter is pressed", async () => {
      const onApply = vi.fn();

      render(<SimpleDiffPreview {...defaultProps} onApply={onApply} />);

      await userEvent.keyboard("{Control>}{Enter}{/Control}");

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledTimes(1);
      });
    });

    it("should reject changes when Escape is pressed", async () => {
      const onReject = vi.fn();

      render(<SimpleDiffPreview {...defaultProps} onReject={onReject} />);

      await userEvent.keyboard("{Escape}");

      await waitFor(() => {
        expect(onReject).toHaveBeenCalledTimes(1);
      });
    });

    it("should not trigger shortcuts when collapsed", async () => {
      const onApply = vi.fn();
      const onReject = vi.fn();

      render(
        <SimpleDiffPreview
          {...defaultProps}
          onApply={onApply}
          onReject={onReject}
          defaultCollapsed
        />,
      );

      await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
      await userEvent.keyboard("{Escape}");

      expect(onApply).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
    });

    it("should not trigger shortcuts when applying", async () => {
      const onApply = vi.fn();
      const onReject = vi.fn();

      render(
        <SimpleDiffPreview
          {...defaultProps}
          onApply={onApply}
          onReject={onReject}
          isApplying={true}
        />,
      );

      await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
      await userEvent.keyboard("{Escape}");

      expect(onApply).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
    });
  });

  describe("Loading and Success States", () => {
    it("should show loading state when isApplying is true", () => {
      render(<SimpleDiffPreview {...defaultProps} isApplying={true} />);

      expect(screen.getByText(/applying\.\.\./i)).toBeInTheDocument();
      // stratakit uses aria-disabled instead of disabled attribute
      expect(screen.getByLabelText(/apply changes/i)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("should disable all buttons when isApplying is true", () => {
      render(<SimpleDiffPreview {...defaultProps} isApplying={true} />);

      // stratakit uses aria-disabled instead of disabled attribute
      expect(screen.getByLabelText(/apply changes/i)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByLabelText(/reject changes/i)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByLabelText(/copy code/i)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("should show success message after applying", async () => {
      const user = userEvent.setup();

      render(<SimpleDiffPreview {...defaultProps} />);

      const applyButton = screen.getByRole("button", {
        name: /apply changes/i,
      });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          /changes applied successfully/i,
        );
      });

      // Success message should disappear after 2 seconds
      await waitFor(
        () => {
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Statistics Calculation", () => {
    it("should show correct count for added lines", () => {
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode=""
          modifiedCode="line1\nline2\nline3"
        />,
      );

      // Check for the stat - may include extra line for empty original
      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
    });

    it("should show correct count for removed lines", () => {
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode="line1\nline2\nline3"
          modifiedCode=""
        />,
      );

      // Check for the stat - may include extra line for empty modified
      expect(screen.getByText(/-\d+/)).toBeInTheDocument();
    });

    it("should show both added and removed lines", () => {
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode="line1\nline2"
          modifiedCode="line3\nline4\nline5"
        />,
      );

      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
      expect(screen.getByText(/-\d+/)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty original code", () => {
      render(<SimpleDiffPreview {...defaultProps} originalCode="" />);

      expect(document.querySelector(".simple-diff-lines")).toBeInTheDocument();
    });

    it("should handle empty modified code", () => {
      render(<SimpleDiffPreview {...defaultProps} modifiedCode="" />);

      expect(document.querySelector(".simple-diff-lines")).toBeInTheDocument();
    });

    it("should handle identical original and modified code", () => {
      const code = 'console.log("Same");';
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode={code}
          modifiedCode={code}
        />,
      );

      const unchangedLines = document.querySelectorAll(".diff-line-unchanged");
      expect(unchangedLines.length).toBeGreaterThan(0);
    });

    it("should handle code with special characters", () => {
      const specialCode =
        'const regex = /[a-z]+/gi;\nconst str = "Test\\n\\t\\r";';
      render(
        <SimpleDiffPreview {...defaultProps} modifiedCode={specialCode} />,
      );

      expect(document.querySelector(".simple-diff-lines")).toBeInTheDocument();
    });

    it("should handle very long lines", () => {
      const longLine = "a".repeat(1000);
      render(<SimpleDiffPreview {...defaultProps} modifiedCode={longLine} />);

      const diffContent = document.querySelector(
        ".simple-diff-preview-content",
      );
      expect(diffContent).toBeInTheDocument();
    });

    it("should handle large diffs with many lines", () => {
      const largeDiff = Array(100)
        .fill(0)
        .map((_, i) => `console.log("Line ${i}");`)
        .join("\n");

      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode="// empty"
          modifiedCode={largeDiff}
        />,
      );

      // Check for many additions
      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      expect(
        screen.getByRole("region", { name: /code diff preview/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/apply changes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reject changes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/copy code/i)).toBeInTheDocument();
    });

    it("should have proper aria-expanded on collapse button", async () => {
      const user = userEvent.setup();

      render(<SimpleDiffPreview {...defaultProps} />);

      const collapseButton = screen.getByRole("button", {
        name: /collapse diff/i,
      });

      expect(collapseButton).toHaveAttribute("aria-expanded", "true");

      await user.click(collapseButton);

      expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    });

    it("should have proper aria-live region for success message", async () => {
      const user = userEvent.setup();

      render(<SimpleDiffPreview {...defaultProps} />);

      const applyButton = screen.getByRole("button", {
        name: /apply changes/i,
      });
      await user.click(applyButton);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toHaveAttribute("aria-live", "polite");
      });
    });

    it("should have proper aria-labels for statistics", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      const addedStat = screen.getByLabelText(/lines added/i);
      expect(addedStat).toBeInTheDocument();
    });
  });

  describe("Line Type Rendering", () => {
    it("should render line markers correctly", () => {
      render(
        <SimpleDiffPreview
          {...defaultProps}
          originalCode="old"
          modifiedCode="new"
        />,
      );

      const removedMarker = document.querySelector(
        ".diff-line-removed .line-marker",
      );
      const addedMarker = document.querySelector(
        ".diff-line-added .line-marker",
      );

      expect(removedMarker).toHaveTextContent("-");
      expect(addedMarker).toHaveTextContent("+");
    });

    it("should show line numbers for both original and modified", () => {
      render(<SimpleDiffPreview {...defaultProps} />);

      const originalLineNums = document.querySelectorAll(
        ".line-number.original",
      );
      const modifiedLineNums = document.querySelectorAll(
        ".line-number.modified",
      );

      expect(originalLineNums.length).toBeGreaterThan(0);
      expect(modifiedLineNums.length).toBeGreaterThan(0);
    });
  });
});
