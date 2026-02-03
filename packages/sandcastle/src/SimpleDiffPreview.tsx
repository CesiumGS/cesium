/**
 * SimpleDiffPreview Component
 *
 * A lightweight text-based diff preview component that doesn't require Monaco editor.
 * Useful for cases where the full Monaco DiffEditor is too heavy or unavailable.
 *
 * Features:
 * - Text-based diff display with line numbers
 * - Color-coded additions/removals
 * - Same action interface as DiffPreview
 * - Minimal dependencies
 * - Lightweight and fast
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button, Tooltip, Kbd } from "@stratakit/bricks";
import "./SimpleDiffPreview.css";

/**
 * Props for the SimpleDiffPreview component
 * Matches DiffPreview interface for easy swapping
 */
export interface SimpleDiffPreviewProps {
  /** Original code before changes */
  originalCode: string;
  /** Modified code with changes */
  modifiedCode: string;
  /** Programming language for display (used for file extension) */
  language: "javascript" | "html";
  /** Optional filename to display */
  fileName?: string;
  /** Callback when user applies changes */
  onApply: () => void;
  /** Callback when user rejects changes */
  onReject: () => void;
  /** Optional callback when user modifies the diff */
  onModify?: (code: string) => void;
  /** Whether the apply operation is in progress */
  isApplying?: boolean;
  /** Whether the diff view is collapsed initially */
  defaultCollapsed?: boolean;
}

/**
 * Represents a line in the diff
 */
interface DiffLine {
  type: "added" | "removed" | "unchanged" | "modified";
  originalLineNum?: number;
  modifiedLineNum?: number;
  originalContent?: string;
  modifiedContent?: string;
  content: string;
}

/**
 * Calculate a simple line-by-line diff
 */
function calculateSimpleDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  const diff: DiffLine[] = [];

  let origIdx = 0;
  let modIdx = 0;

  while (origIdx < originalLines.length || modIdx < modifiedLines.length) {
    const origLine = originalLines[origIdx];
    const modLine = modifiedLines[modIdx];

    if (origIdx >= originalLines.length) {
      // Only modified lines remain
      diff.push({
        type: "added",
        modifiedLineNum: modIdx + 1,
        modifiedContent: modLine,
        content: modLine,
      });
      modIdx++;
    } else if (modIdx >= modifiedLines.length) {
      // Only original lines remain
      diff.push({
        type: "removed",
        originalLineNum: origIdx + 1,
        originalContent: origLine,
        content: origLine,
      });
      origIdx++;
    } else if (origLine === modLine) {
      // Lines are identical
      diff.push({
        type: "unchanged",
        originalLineNum: origIdx + 1,
        modifiedLineNum: modIdx + 1,
        originalContent: origLine,
        modifiedContent: modLine,
        content: origLine,
      });
      origIdx++;
      modIdx++;
    } else {
      // Lines differ - show as modified
      diff.push({
        type: "removed",
        originalLineNum: origIdx + 1,
        originalContent: origLine,
        content: origLine,
      });
      diff.push({
        type: "added",
        modifiedLineNum: modIdx + 1,
        modifiedContent: modLine,
        content: modLine,
      });
      origIdx++;
      modIdx++;
    }
  }

  return diff;
}

/**
 * Calculate diff statistics
 */
function calculateStats(diff: DiffLine[]) {
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of diff) {
    if (line.type === "added") {
      linesAdded++;
    }
    if (line.type === "removed") {
      linesRemoved++;
    }
  }

  return { linesAdded, linesRemoved };
}

/**
 * SimpleDiffPreview Component
 */
export function SimpleDiffPreview({
  originalCode,
  modifiedCode,
  language,
  fileName,
  onApply,
  onReject,
  isApplying = false,
  defaultCollapsed = false,
}: SimpleDiffPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate diff
  const diff = useMemo(
    () => calculateSimpleDiff(originalCode, modifiedCode),
    [originalCode, modifiedCode],
  );

  // Calculate stats
  const stats = useMemo(() => calculateStats(diff), [diff]);

  // Handle apply button click
  const handleApply = useCallback(() => {
    if (isApplying) {
      return;
    }

    onApply();

    // Show success animation briefly
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }, [isApplying, onApply]);

  // Handle reject button click
  const handleReject = useCallback(() => {
    if (isApplying) {
      return;
    }
    onReject();
  }, [isApplying, onReject]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCollapsed || isApplying) {
        return;
      }

      // Enter to apply
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleApply();
      }

      // Escape to reject
      if (e.key === "Escape") {
        e.preventDefault();
        handleReject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed, isApplying, handleApply, handleReject]);

  // Handle copy code button click
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(modifiedCode);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, [modifiedCode]);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={`simple-diff-preview ${isCollapsed ? "collapsed" : ""} ${showSuccess ? "success" : ""}`}
      role="region"
      aria-label="Code diff preview"
    >
      {/* Header with stats and collapse toggle */}
      <div className="simple-diff-preview-header">
        <div className="simple-diff-preview-title">
          <button
            className="simple-diff-preview-collapse-btn"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand diff" : "Collapse diff"}
            type="button"
          >
            <span className={`collapse-icon ${isCollapsed ? "collapsed" : ""}`}>
              ▼
            </span>
          </button>
          <span className="simple-diff-preview-filename">
            {fileName || `Changes.${language === "javascript" ? "js" : "html"}`}
          </span>
        </div>

        <div className="simple-diff-preview-stats">
          {stats.linesAdded > 0 && (
            <span
              className="stat-added"
              aria-label={`${stats.linesAdded} lines added`}
            >
              +{stats.linesAdded}
            </span>
          )}
          {stats.linesRemoved > 0 && (
            <span
              className="stat-removed"
              aria-label={`${stats.linesRemoved} lines removed`}
            >
              -{stats.linesRemoved}
            </span>
          )}
        </div>
      </div>

      {/* Diff display */}
      {!isCollapsed && (
        <>
          <div className="simple-diff-preview-content">
            <pre className="simple-diff-lines">
              {diff.map((line, idx) => (
                <div
                  key={idx}
                  className={`diff-line diff-line-${line.type}`}
                  data-line-type={line.type}
                >
                  <span className="line-number original">
                    {line.originalLineNum || " "}
                  </span>
                  <span className="line-number modified">
                    {line.modifiedLineNum || " "}
                  </span>
                  <span className="line-marker">
                    {line.type === "added"
                      ? "+"
                      : line.type === "removed"
                        ? "-"
                        : " "}
                  </span>
                  <code className="line-content">{line.content}</code>
                </div>
              ))}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="simple-diff-preview-actions">
            <div className="simple-diff-preview-actions-left">
              <Tooltip
                content="Copy modified code to clipboard"
                placement="top"
              >
                <Button
                  onClick={handleCopyCode}
                  variant="ghost"
                  disabled={isApplying}
                  aria-label="Copy code"
                >
                  Copy Code
                </Button>
              </Tooltip>
            </div>

            <div className="simple-diff-preview-actions-right">
              <Button
                onClick={handleReject}
                variant="ghost"
                disabled={isApplying}
                aria-label="Reject changes"
              >
                Reject <Kbd variant="solid">Esc</Kbd>
              </Button>

              <Tooltip
                content="Apply these changes to the editor"
                placement="top"
              >
                <Button
                  onClick={handleApply}
                  tone="accent"
                  disabled={isApplying}
                  aria-label="Apply changes"
                  className="apply-button"
                >
                  {isApplying ? (
                    <>
                      <span className="spinner" aria-hidden="true"></span>
                      Applying...
                    </>
                  ) : (
                    <>
                      Apply Changes <Kbd variant="solid">⌘↵</Kbd>
                    </>
                  )}
                </Button>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      {/* Success indicator */}
      {showSuccess && (
        <div
          className="simple-diff-preview-success"
          role="alert"
          aria-live="polite"
        >
          ✓ Changes applied successfully
        </div>
      )}
    </div>
  );
}
