/**
 * DiffPreview Component
 *
 * A visual diff preview component that shows users code changes before they apply them.
 * Uses Monaco's DiffEditor for side-by-side comparison with syntax highlighting.
 *
 * Features:
 * - Side-by-side diff view with syntax highlighting
 * - Diff statistics (lines added/removed)
 * - User controls (Apply, Reject, Copy)
 * - Collapsible for large diffs
 * - Loading and error states
 * - Keyboard shortcuts (Enter to apply, Esc to reject)
 * - Editable diff before applying
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { DiffEditor } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Button, Tooltip, Kbd } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { settings } from "./icons";
import "./DiffPreview.css";

/**
 * Props for the DiffPreview component
 */
export interface DiffPreviewProps {
  /** Original code before changes */
  originalCode: string;
  /** Modified code with changes */
  modifiedCode: string;
  /** Programming language for syntax highlighting */
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
  /** Whether the changes have been applied */
  isApplied?: boolean;
  /** Whether the diff view is collapsed initially */
  defaultCollapsed?: boolean;
  /** Theme to use (light or dark) */
  theme?: "light" | "dark";
  /** Diff display mode */
  mode?: "side-by-side" | "inline";
}

/**
 * Diff statistics interface
 */
interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
}

/**
 * Calculate diff statistics between original and modified code
 */
function calculateDiffStats(original: string, modified: string): DiffStats {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  let linesAdded = 0;
  let linesRemoved = 0;
  let linesModified = 0;

  // Simple line-by-line comparison
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] ?? "";
    const modLine = modifiedLines[i] ?? "";

    if (i >= originalLines.length) {
      linesAdded++;
    } else if (i >= modifiedLines.length) {
      linesRemoved++;
    } else if (origLine !== modLine) {
      linesModified++;
    }
  }

  // Adjust stats: if line count differs, some are pure adds/removes
  if (modifiedLines.length > originalLines.length) {
    linesAdded += modifiedLines.length - originalLines.length;
  } else if (originalLines.length > modifiedLines.length) {
    linesRemoved += originalLines.length - modifiedLines.length;
  }

  return { linesAdded, linesRemoved, linesModified };
}

/**
 * DiffPreview Component
 */
export function DiffPreview({
  originalCode,
  modifiedCode,
  language,
  fileName,
  onApply,
  onReject,
  onModify,
  isApplying = false,
  isApplied = false,
  defaultCollapsed = false,
  theme = "dark",
  mode = "inline",
}: DiffPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [currentModifiedCode, setCurrentModifiedCode] = useState(modifiedCode);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentMode, setCurrentMode] = useState<"side-by-side" | "inline">(
    mode,
  );
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep diff expanded when applied (for audit trail)
  useEffect(() => {
    if (isApplied && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isApplied, isCollapsed]);

  // Calculate diff statistics
  const stats = useMemo(
    () => calculateDiffStats(originalCode, currentModifiedCode),
    [originalCode, currentModifiedCode],
  );

  // Update modified code when prop changes
  useEffect(() => {
    setCurrentModifiedCode(modifiedCode);
  }, [modifiedCode]);

  // Handle apply button click
  const handleApply = useCallback(() => {
    if (isApplying) {
      return;
    }

    // Update parent with potentially modified code
    if (currentModifiedCode !== modifiedCode && onModify) {
      onModify(currentModifiedCode);
    }

    onApply();

    // Show success animation briefly
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }, [isApplying, currentModifiedCode, modifiedCode, onModify, onApply]);

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
      // Only handle shortcuts if the diff preview is visible and not applying
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

  // Handle editor mount
  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneDiffEditor) => {
      editorRef.current = editor;

      // Focus the modified editor
      editor.getModifiedEditor().focus();

      // Listen for content changes in the modified editor
      if (onModify) {
        const modifiedEditor = editor.getModifiedEditor();
        const disposable = modifiedEditor.onDidChangeModelContent(() => {
          const newValue = modifiedEditor.getValue();
          setCurrentModifiedCode(newValue);
          onModify(newValue);
        });

        // Store disposable for cleanup
        return () => disposable.dispose();
      }
    },
    [onModify],
  );

  // Cleanup: Reset editor models before disposal to prevent Monaco "TextModel disposed..." error
  useEffect(() => {
    return () => {
      try {
        if (editorRef.current) {
          // Detach models first to avoid "TextModel got disposed..." errors
          try {
            // @ts-expect-error: setModel accepts nulls for both editors
            editorRef.current.setModel({ original: null, modified: null });
          } catch {
            // Ignore if setModel fails
          }
          // Now dispose of the editor instance
          editorRef.current.dispose();
          editorRef.current = null;
        }
      } catch {
        // Silently handle cleanup errors
      }
    };
  }, []);

  // Handle copy code button click
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentModifiedCode);
      // Could add a toast notification here
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, [currentModifiedCode]);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Toggle diff mode
  const toggleMode = useCallback(() => {
    setCurrentMode((prev) =>
      prev === "side-by-side" ? "inline" : "side-by-side",
    );
  }, []);

  // Calculate if this is a large diff (many changes)
  const isLargeDiff =
    stats.linesAdded + stats.linesRemoved + stats.linesModified > 50;

  return (
    <div
      ref={containerRef}
      className={`diff-preview ${isCollapsed ? "collapsed" : ""} ${showSuccess ? "success" : ""}`}
      role="region"
      aria-label="Code diff preview"
    >
      {/* Header with stats and collapse toggle */}
      <div className="diff-preview-header">
        <div className="diff-preview-title">
          <button
            className="diff-preview-collapse-btn"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand diff" : "Collapse diff"}
            type="button"
          >
            <span className={`collapse-icon ${isCollapsed ? "collapsed" : ""}`}>
              ▼
            </span>
          </button>
          <span className="diff-preview-filename">
            {fileName || `Changes.${language === "javascript" ? "js" : "html"}`}
          </span>
        </div>

        <div className="diff-preview-controls">
          <div className="diff-preview-stats">
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
            {stats.linesModified > 0 && (
              <span
                className="stat-modified"
                aria-label={`${stats.linesModified} lines modified`}
              >
                ~{stats.linesModified}
              </span>
            )}
          </div>

          <div className="diff-preview-mode-toggle">
            <Tooltip
              content={`Diff view: ${currentMode === "inline" ? "Unified (vertical)" : "Side-by-side"}. Click to toggle.`}
              placement="top"
            >
              <Button
                onClick={toggleMode}
                variant="ghost"
                disabled={isApplying}
                aria-label={`Switch to ${currentMode === "inline" ? "side-by-side" : "unified"} diff view`}
                className="mode-toggle-button"
                title={`Current: ${currentMode === "inline" ? "Unified" : "Side-by-side"}`}
              >
                <Icon href={settings} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Applied indicator banner */}
      {isApplied && !isCollapsed && (
        <div
          className="diff-preview-applied-banner"
          role="status"
          aria-live="polite"
        >
          <span className="applied-banner-icon">✓</span>
          <span className="applied-banner-text">Changes Applied to Script</span>
        </div>
      )}

      {/* Diff editor */}
      {!isCollapsed && (
        <>
          <div
            className={`diff-preview-editor ${isLargeDiff ? "large-diff" : ""} ${currentMode === "inline" ? "inline-mode" : "side-by-side-mode"} ${isApplied ? "applied-read-only" : ""}`}
          >
            <DiffEditor
              original={originalCode}
              modified={currentModifiedCode}
              language={language}
              theme={theme === "dark" ? "vs-dark" : "light"}
              onMount={handleEditorDidMount}
              options={{
                readOnly: isApplied, // Make read-only when applied (historical audit trail)
                renderSideBySide: currentMode === "side-by-side",
                ignoreTrimWhitespace: false,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: "on",
                renderOverviewRuler: true,
                diffWordWrap: "off",
                enableSplitViewResizing: currentMode === "side-by-side",
                renderIndicators: true,
                originalEditable: false,
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
              }}
              height={
                currentMode === "inline"
                  ? isLargeDiff
                    ? "600px"
                    : "400px"
                  : isLargeDiff
                    ? "500px"
                    : "300px"
              }
            />
          </div>

          {/* Action buttons - only show Apply/Reject when not already applied */}
          <div className="diff-preview-actions">
            <div className="diff-preview-actions-left">
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

            {!isApplied && (
              <div className="diff-preview-actions-right">
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
            )}
          </div>
        </>
      )}

      {/* Success indicator */}
      {showSuccess && (
        <div className="diff-preview-success" role="alert" aria-live="polite">
          ✓ Changes applied successfully
        </div>
      )}
    </div>
  );
}
