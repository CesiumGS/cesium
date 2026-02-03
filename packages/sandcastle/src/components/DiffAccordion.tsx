/**
 * DiffAccordion Component
 *
 * A collapsible accordion component for displaying diff content with edit counts.
 * Shows language badge, edit count, and expandable diff preview.
 *
 * Features:
 * - Language badge (e.g., "JAVASCRIPT", "HTML")
 * - Edit count badge (e.g., "3 edits" or "1 edit")
 * - Chevron icon that rotates based on expanded state
 * - Scrollable code block for diff content
 * - VSCode theme variable styling
 * - Keyboard accessible
 */

import { useMemo } from "react";
import { CodeBlock } from "./CodeBlock";

/**
 * Props for the DiffAccordion component
 */
export interface DiffAccordionProps {
  /** Programming language for the diff */
  language: "javascript" | "html";
  /** Diff content in unified diff format */
  diffContent: string;
  /** Whether the accordion is expanded */
  isExpanded: boolean;
  /** Callback when accordion is toggled */
  onToggle: () => void;
}

/**
 * DiffAccordion Component
 */
export function DiffAccordion({
  language,
  diffContent,
  isExpanded,
  onToggle,
}: DiffAccordionProps) {
  // Calculate number of edits from SEARCH blocks
  const editCount = useMemo(() => {
    const matches = diffContent.match(/[-]{3,} SEARCH/g);
    return matches ? matches.length : 0;
  }, [diffContent]);

  // Format language for display
  const languageLabel = language.toUpperCase();

  // Format edit count text
  const editCountText = editCount === 1 ? "1 edit" : `${editCount} edits`;

  return (
    <div
      className="diff-accordion"
      style={{
        border: `1px solid var(--vscode-editorGroup-border)`,
        borderRadius: "4px",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      {/* Header */}
      <div
        className="diff-accordion-header"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${languageLabel} diff with ${editCountText}, ${isExpanded ? "expanded" : "collapsed"}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground)",
          cursor: "pointer",
          userSelect: "none",
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--vscode-list-hoverBackground)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--vscode-editorGroupHeader-tabsBackground)";
        }}
      >
        {/* Chevron icon */}
        <span
          className="diff-accordion-chevron"
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "16px",
            height: "16px",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>

        {/* Language badge */}
        <span
          className="diff-accordion-language-badge"
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "3px",
            backgroundColor: "var(--vscode-badge-background)",
            color: "var(--vscode-badge-foreground)",
          }}
        >
          {languageLabel}
        </span>

        {/* Edit count badge */}
        <span
          className="diff-accordion-edit-count"
          style={{
            fontSize: "12px",
            color: "var(--vscode-descriptionForeground)",
          }}
        >
          {editCountText}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="diff-accordion-content"
          style={{
            backgroundColor: "var(--vscode-editor-background)",
            maxHeight: "400px",
            overflowY: "auto",
            overflowX: "auto",
          }}
        >
          <CodeBlock code={diffContent} language="diff" />
        </div>
      )}
    </div>
  );
}
