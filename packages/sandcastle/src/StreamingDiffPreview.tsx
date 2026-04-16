/**
 * StreamingDiffPreview Component
 *
 * Displays code diffs incrementally as they stream in from the AI.
 * Shows search and replace sections side by side with live streaming indicators.
 *
 * Features:
 * - Side-by-side search/replace layout
 * - Streaming state indicators (animated dots, blinking cursor)
 * - Monaco-like syntax highlighting
 * - Smooth height transitions
 * - Completion states (pending, streaming, complete)
 * - Mobile responsive (stacks vertically)
 * - Keyboard accessible
 */

import { useEffect, useRef, useMemo } from "react";
import "./StreamingDiffPreview.css";

/**
 * Props for the StreamingDiffPreview component
 */
export interface StreamingDiffPreviewProps {
  /** Index of this diff in a sequence */
  diffIndex: number;
  /** Programming language for syntax highlighting */
  language: "javascript" | "html";
  /** Code to search for (original) */
  searchContent: string;
  /** Code to replace with (modified) */
  replaceContent: string;
  /** Whether the diff generation is complete */
  isComplete: boolean;
  /** Whether the diff is currently streaming */
  isStreaming: boolean;
}

/**
 * StreamingDiffPreview Component
 */
export function StreamingDiffPreview({
  diffIndex,
  language,
  searchContent,
  replaceContent,
  isComplete,
  isStreaming,
}: StreamingDiffPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Compute announcement for screen readers
  const announcedState = useMemo(() => {
    if (isStreaming && !isComplete) {
      return `Diff ${diffIndex + 1} is streaming`;
    } else if (isComplete) {
      return `Diff ${diffIndex + 1} is complete`;
    } else if (!isStreaming && !isComplete) {
      return `Diff ${diffIndex + 1} is pending`;
    }
    return "";
  }, [isStreaming, isComplete, diffIndex]);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      const replaceSection = containerRef.current.querySelector(
        ".streaming-diff-replace",
      );
      if (replaceSection) {
        replaceSection.scrollTop = replaceSection.scrollHeight;
      }
    }
  }, [replaceContent, isStreaming]);

  // Determine current state class
  const getStateClass = () => {
    if (isStreaming && !isComplete) {
      return "streaming";
    }
    if (isComplete) {
      return "complete";
    }
    return "pending";
  };

  // Determine status icon
  const getStatusIcon = () => {
    if (isComplete) {
      return "✓";
    }
    if (isStreaming) {
      return "◉";
    }
    return "○";
  };

  // Language class for syntax highlighting
  const languageClass =
    language === "javascript" ? "language-javascript" : "language-html";

  return (
    <div
      ref={containerRef}
      className={`streaming-diff-preview ${getStateClass()}`}
      role="region"
      aria-label={`Streaming diff preview ${diffIndex + 1}`}
    >
      {/* Screen reader announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcedState}
      </div>

      {/* Header with status indicator */}
      <div className="streaming-diff-header">
        <div className="streaming-diff-status">
          <span
            className={`streaming-diff-icon ${getStateClass()}`}
            aria-label={
              isStreaming
                ? "Streaming in progress"
                : isComplete
                  ? "Complete"
                  : "Pending"
            }
          >
            {getStatusIcon()}
          </span>
          <span className="streaming-diff-title">
            Diff #{diffIndex + 1}
            {isStreaming && (
              <span className="streaming-dots">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            )}
          </span>
        </div>
        {isComplete && (
          <span
            className="streaming-diff-badge complete"
            aria-label="Diff complete"
          >
            Complete
          </span>
        )}
        {isStreaming && (
          <span
            className="streaming-diff-badge streaming"
            aria-label="Streaming"
          >
            Streaming
          </span>
        )}
      </div>

      {/* Diff content grid */}
      <div className="streaming-diff-grid">
        {/* Search section */}
        <div className="streaming-diff-section streaming-diff-search">
          <div className="streaming-diff-section-header">
            <span className="streaming-diff-label">Search</span>
            <span
              className="streaming-diff-lines"
              aria-label={`${searchContent.split("\n").length} lines`}
            >
              {searchContent.split("\n").length} lines
            </span>
          </div>
          <div className="streaming-diff-code-container">
            <pre className="streaming-diff-code">
              <code className={languageClass}>
                {searchContent || (
                  <span className="streaming-diff-empty">No content</span>
                )}
              </code>
            </pre>
          </div>
        </div>

        {/* Replace section */}
        <div className="streaming-diff-section streaming-diff-replace">
          <div className="streaming-diff-section-header">
            <span className="streaming-diff-label">Replace</span>
            <span
              className="streaming-diff-lines"
              aria-label={`${replaceContent.split("\n").length} lines`}
            >
              {replaceContent.split("\n").length} lines
            </span>
          </div>
          <div className="streaming-diff-code-container">
            <pre className="streaming-diff-code">
              <code className={languageClass}>
                {replaceContent || (
                  <span className="streaming-diff-empty">No content</span>
                )}
                {isStreaming && !isComplete && (
                  <span className="streaming-cursor" aria-hidden="true">
                    ▋
                  </span>
                )}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Footer with metadata */}
      {isComplete && (
        <div className="streaming-diff-footer">
          <span className="streaming-diff-meta">
            Language:{" "}
            <span className="streaming-diff-meta-value">{language}</span>
          </span>
        </div>
      )}
    </div>
  );
}
