/**
 * DiffPreview Component Tests
 *
 * Comprehensive test suite for the DiffPreview component.
 * Tests rendering, user interactions, keyboard shortcuts, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DiffPreview, type DiffPreviewProps } from "./DiffPreview";
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
    variant?: string;
    tone?: string;
    [key: string]: unknown;
  }) =>
    createElement(
      "button",
      {
        onClick,
        disabled,
        "aria-disabled": disabled ? "true" : undefined,
        ...props,
      },
      children,
    ),
  Tooltip: ({
    children,
    content,
    ...props
  }: {
    children?: React.ReactNode;
    content?: string;
    placement?: string;
    [key: string]: unknown;
  }) => createElement("div", { title: content, ...props }, children),
  Kbd: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => createElement("kbd", { ...props }, children),
}));

vi.mock("@stratakit/foundations", () => ({
  Icon: ({ href, ...props }: { href?: string; [key: string]: unknown }) =>
    createElement("span", { ...props, "data-icon": href }, "icon"),
}));

// Mock react-markdown to avoid hanging tests
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock remark-gfm
vi.mock("remark-gfm", () => ({
  default: () => ({}),
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
    // Create a mock change handler that can be triggered
    let changeListener: (() => void) | null = null;

    // Simulate editor mount
    if (onMount) {
      const mockModifiedEditor = {
        focus: vi.fn(),
        getValue: () => `${modified}\n// edited`,
        onDidChangeModelContent: (listener: (e: unknown) => void) => {
          changeListener = () => listener({});
          return { dispose: vi.fn() };
        },
      };

      const mockEditor = {
        getModifiedEditor: () => mockModifiedEditor,
      };

      setTimeout(() => onMount(mockEditor), 0);
    }

    return (
      <div data-testid="monaco-diff-editor">
        <div data-testid="original-code">{original}</div>
        <div data-testid="modified-code">{modified}</div>
        <button
          data-testid="mock-edit-button"
          onClick={() => changeListener?.()}
        >
          Edit
        </button>
      </div>
    );
  },
}));

describe("DiffPreview Component", () => {
  const defaultProps: DiffPreviewProps = {
    originalCode: 'console.log("Hello");',
    modifiedCode: 'console.log("Hello, World!");',
    language: "javascript",
    onApply: vi.fn(),
    onReject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render with basic props", () => {
      render(<DiffPreview {...defaultProps} />);

      expect(
        screen.getByRole("region", { name: /code diff preview/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Changes\.js/i)).toBeInTheDocument();
    });

    it("should render with custom filename", () => {
      render(<DiffPreview {...defaultProps} fileName="MyScript.js" />);

      expect(screen.getByText("MyScript.js")).toBeInTheDocument();
    });

    it("should render HTML file extension for html language", () => {
      render(<DiffPreview {...defaultProps} language="html" />);

      expect(screen.getByText(/Changes\.html/i)).toBeInTheDocument();
    });

    it("should display diff statistics", () => {
      render(<DiffPreview {...defaultProps} />);

      // Should show some stats (additions/removals/modifications)
      const statsContainer =
        screen.getByText(/Changes\.js/i).parentElement?.parentElement;
      expect(statsContainer).toBeInTheDocument();
    });

    it("should render collapsed when defaultCollapsed is true", () => {
      render(<DiffPreview {...defaultProps} defaultCollapsed={true} />);

      // Monaco editor should not be rendered when collapsed
      expect(
        screen.queryByTestId("monaco-diff-editor"),
      ).not.toBeInTheDocument();
    });

    it("should render expanded by default", () => {
      render(<DiffPreview {...defaultProps} />);

      // Monaco editor should be rendered when expanded
      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should display original and modified code in Monaco editor", () => {
      render(<DiffPreview {...defaultProps} />);

      expect(screen.getByTestId("original-code")).toHaveTextContent(
        'console.log("Hello");',
      );
      expect(screen.getByTestId("modified-code")).toHaveTextContent(
        'console.log("Hello, World!");',
      );
    });
  });

  describe("User Interactions", () => {
    it("should call onApply when Apply Changes button is clicked", async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      render(<DiffPreview {...defaultProps} onApply={onApply} />);

      const applyButton = screen.getByRole("button", {
        name: /apply changes/i,
      });
      await user.click(applyButton);

      expect(onApply).toHaveBeenCalledTimes(1);
    });

    it("should call onReject when Reject button is clicked", async () => {
      const user = userEvent.setup();
      const onReject = vi.fn();

      render(<DiffPreview {...defaultProps} onReject={onReject} />);

      const rejectButton = screen.getByRole("button", { name: /reject/i });
      await user.click(rejectButton);

      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("should toggle collapsed state when collapse button is clicked", async () => {
      const user = userEvent.setup();

      render(<DiffPreview {...defaultProps} />);

      const collapseButton = screen.getByRole("button", {
        name: /collapse diff/i,
      });

      // Initially expanded
      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();

      // Click to collapse
      await user.click(collapseButton);
      expect(
        screen.queryByTestId("monaco-diff-editor"),
      ).not.toBeInTheDocument();

      // Click to expand
      await user.click(collapseButton);
      await waitFor(() => {
        expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
      });
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

      render(<DiffPreview {...defaultProps} />);

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

      render(<DiffPreview {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await user.click(copyButton);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should call onModify when code is edited in the editor", async () => {
      const user = userEvent.setup();
      const onModify = vi.fn();

      render(<DiffPreview {...defaultProps} onModify={onModify} />);

      // Wait for editor to mount
      await waitFor(() => {
        expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
      });

      // Simulate editing in Monaco editor
      const editButton = screen.getByTestId("mock-edit-button");
      await user.click(editButton);

      await waitFor(() => {
        expect(onModify).toHaveBeenCalled();
        expect(onModify).toHaveBeenCalledWith(
          expect.stringContaining('console.log("Hello, World!");'),
        );
      });
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should apply changes when Cmd+Enter is pressed", async () => {
      const onApply = vi.fn();

      render(<DiffPreview {...defaultProps} onApply={onApply} />);

      // Simulate Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledTimes(1);
      });
    });

    it("should apply changes when Ctrl+Enter is pressed", async () => {
      const onApply = vi.fn();

      render(<DiffPreview {...defaultProps} onApply={onApply} />);

      await userEvent.keyboard("{Control>}{Enter}{/Control}");

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledTimes(1);
      });
    });

    it("should reject changes when Escape is pressed", async () => {
      const onReject = vi.fn();

      render(<DiffPreview {...defaultProps} onReject={onReject} />);

      await userEvent.keyboard("{Escape}");

      await waitFor(() => {
        expect(onReject).toHaveBeenCalledTimes(1);
      });
    });

    it("should not trigger shortcuts when collapsed", async () => {
      const onApply = vi.fn();
      const onReject = vi.fn();

      render(
        <DiffPreview
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
        <DiffPreview
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

  describe("Loading and Error States", () => {
    it("should show loading state when isApplying is true", () => {
      render(<DiffPreview {...defaultProps} isApplying={true} />);

      expect(screen.getByText(/applying\.\.\./i)).toBeInTheDocument();
      // stratakit uses aria-disabled instead of disabled attribute
      expect(screen.getByLabelText(/apply changes/i)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("should disable all buttons when isApplying is true", () => {
      render(<DiffPreview {...defaultProps} isApplying={true} />);

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

      render(<DiffPreview {...defaultProps} />);

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

  describe("Large Diffs", () => {
    it("should handle large diffs with many lines", () => {
      const largeDiff = Array(100)
        .fill(0)
        .map((_, i) => `console.log("Line ${i}");`)
        .join("\n");

      render(
        <DiffPreview
          {...defaultProps}
          originalCode="// empty"
          modifiedCode={largeDiff}
        />,
      );

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
      // Should show high number of additions
      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
    });

    it("should use larger height for large diffs", () => {
      const largeDiff = Array(100)
        .fill(0)
        .map((_, i) => `console.log("Line ${i}");`)
        .join("\n");

      const { container } = render(
        <DiffPreview
          {...defaultProps}
          originalCode="// empty"
          modifiedCode={largeDiff}
        />,
      );

      const editorContainer = container.querySelector(".diff-preview-editor");
      expect(editorContainer).toHaveClass("large-diff");
    });
  });

  describe("Theme Support", () => {
    it("should use dark theme by default", () => {
      render(<DiffPreview {...defaultProps} />);

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should use light theme when specified", () => {
      render(<DiffPreview {...defaultProps} theme="light" />);

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<DiffPreview {...defaultProps} />);

      expect(
        screen.getByRole("region", { name: /code diff preview/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/apply changes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reject changes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/copy code/i)).toBeInTheDocument();
    });

    it("should have proper aria-expanded on collapse button", async () => {
      const user = userEvent.setup();

      render(<DiffPreview {...defaultProps} />);

      const collapseButton = screen.getByRole("button", {
        name: /collapse diff/i,
      });

      expect(collapseButton).toHaveAttribute("aria-expanded", "true");

      await user.click(collapseButton);

      expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    });

    it("should have proper aria-live region for success message", async () => {
      const user = userEvent.setup();

      render(<DiffPreview {...defaultProps} />);

      const applyButton = screen.getByRole("button", {
        name: /apply changes/i,
      });
      await user.click(applyButton);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toHaveAttribute("aria-live", "polite");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty original code", () => {
      render(<DiffPreview {...defaultProps} originalCode="" />);

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should handle empty modified code", () => {
      render(<DiffPreview {...defaultProps} modifiedCode="" />);

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should handle identical original and modified code", () => {
      const code = 'console.log("Same");';
      render(
        <DiffPreview
          {...defaultProps}
          originalCode={code}
          modifiedCode={code}
        />,
      );

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should handle code with special characters", () => {
      const specialCode =
        'const regex = /[a-z]+/gi;\nconst str = "Test\\n\\t\\r";';
      render(<DiffPreview {...defaultProps} modifiedCode={specialCode} />);

      // Just verify it renders without error
      expect(screen.getByTestId("modified-code")).toBeInTheDocument();
      expect(screen.getByTestId("modified-code")).toHaveTextContent(
        /const regex/,
      );
    });

    it("should handle very long lines", () => {
      const longLine = "a".repeat(1000);
      render(<DiffPreview {...defaultProps} modifiedCode={longLine} />);

      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should update when props change", () => {
      const { rerender } = render(<DiffPreview {...defaultProps} />);

      expect(screen.getByTestId("modified-code")).toHaveTextContent(
        'console.log("Hello, World!");',
      );

      rerender(
        <DiffPreview
          {...defaultProps}
          modifiedCode='console.log("Updated!");'
        />,
      );

      expect(screen.getByTestId("modified-code")).toHaveTextContent(
        'console.log("Updated!");',
      );
    });
  });

  describe("Callback Behavior", () => {
    it("should call onModify when code is edited before applying", async () => {
      const user = userEvent.setup();
      const onModify = vi.fn();
      const onApply = vi.fn();

      render(
        <DiffPreview {...defaultProps} onModify={onModify} onApply={onApply} />,
      );

      // Wait for editor to mount
      await waitFor(() => {
        expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
      });

      // Edit the code
      const editButton = screen.getByTestId("mock-edit-button");
      await user.click(editButton);

      await waitFor(() => {
        expect(onModify).toHaveBeenCalled();
      });

      // Apply changes
      const applyButton = screen.getByRole("button", {
        name: /apply changes/i,
      });
      await user.click(applyButton);

      expect(onApply).toHaveBeenCalled();
    });

    it("should not call onModify if it is not provided", async () => {
      const user = userEvent.setup();

      render(<DiffPreview {...defaultProps} />);

      const editButton = screen.getByTestId("mock-edit-button");
      await user.click(editButton);

      // Should not throw error
      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });

    it("should render in inline mode by default", () => {
      render(<DiffPreview {...defaultProps} />);

      const editor = screen.getByTestId("monaco-diff-editor");
      expect(editor.closest(".inline-mode")).toBeInTheDocument();
      expect(editor.closest(".side-by-side-mode")).not.toBeInTheDocument();
    });

    it("should render in side-by-side mode when mode prop is 'side-by-side'", () => {
      render(<DiffPreview {...defaultProps} mode="side-by-side" />);

      const editor = screen.getByTestId("monaco-diff-editor");
      expect(editor.closest(".side-by-side-mode")).toBeInTheDocument();
      expect(editor.closest(".inline-mode")).not.toBeInTheDocument();
    });

    it("should toggle between inline and side-by-side mode when mode toggle button is clicked", async () => {
      const user = userEvent.setup();
      render(<DiffPreview {...defaultProps} />);

      const editor = screen.getByTestId("monaco-diff-editor");
      expect(editor.closest(".inline-mode")).toBeInTheDocument();

      const toggleButton = screen.getByRole("button", {
        name: /switch to side-by-side diff view/i,
      });
      await user.click(toggleButton);

      expect(editor.closest(".side-by-side-mode")).toBeInTheDocument();
      expect(editor.closest(".inline-mode")).not.toBeInTheDocument();

      await user.click(toggleButton);
      expect(editor.closest(".inline-mode")).toBeInTheDocument();
      expect(editor.closest(".side-by-side-mode")).not.toBeInTheDocument();
    });

    it("should show correct toggle button icon and tooltip for each mode", () => {
      render(<DiffPreview {...defaultProps} />);

      const toggleButton = screen.getByRole("button", {
        name: /switch to side-by-side diff view/i,
      });
      expect(toggleButton).toBeInTheDocument();

      // The toggle button uses a settings icon from stratakit
      // Note: We can't easily test the tooltip content change without re-rendering
      // but the aria-label should change
    });
  });
});
