import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { DiffEditor } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Button, Tooltip, Kbd } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { settings } from "../../icons";
import "./DiffPreview.css";

export interface DiffPreviewProps {
  /** Original source before changes */
  originalCode: string;
  /** Proposed source with changes applied */
  modifiedCode: string;
  /** Language for syntax highlighting */
  language: "javascript" | "html";
  /** Filename shown in the header */
  fileName?: string;
  /** Called when the user accepts the changes */
  onApply: () => void;
  /** Called when the user discards the changes */
  onReject: () => void;
  /** Called when the user edits the modified side */
  onModify?: (code: string) => void;
  /** True while an apply is in flight */
  isApplying?: boolean;
  /** True once changes have been applied */
  isApplied?: boolean;
  /** Start collapsed on first render */
  defaultCollapsed?: boolean;
  /** Monaco theme */
  theme?: "light" | "dark";
  /** Initial diff layout */
  mode?: "side-by-side" | "inline";
}

interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
}

function calculateDiffStats(original: string, modified: string): DiffStats {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  let linesAdded = 0;
  let linesRemoved = 0;
  let linesModified = 0;

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

  return { linesAdded, linesRemoved, linesModified };
}

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
  const [userCollapsed, setUserCollapsed] = useState(defaultCollapsed);
  const isCollapsed = isApplied ? false : userCollapsed;
  const [currentModifiedCode, setCurrentModifiedCode] = useState(modifiedCode);
  const [lastModifiedCodeProp, setLastModifiedCodeProp] =
    useState(modifiedCode);
  // Reset local edits when the incoming prop changes.
  if (lastModifiedCodeProp !== modifiedCode) {
    setLastModifiedCodeProp(modifiedCode);
    setCurrentModifiedCode(modifiedCode);
  }
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentMode, setCurrentMode] = useState<"side-by-side" | "inline">(
    mode,
  );
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const disposableRef = useRef<{ dispose: () => void } | null>(null);

  const stats = useMemo(
    () => calculateDiffStats(originalCode, currentModifiedCode),
    [originalCode, currentModifiedCode],
  );

  const handleApply = useCallback(() => {
    if (isApplying) {
      return;
    }

    if (currentModifiedCode !== modifiedCode && onModify) {
      onModify(currentModifiedCode);
    }

    onApply();

    setShowSuccess(true);
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 2000);
  }, [isApplying, currentModifiedCode, modifiedCode, onModify, onApply]);

  const handleReject = useCallback(() => {
    if (isApplying) {
      return;
    }
    onReject();
  }, [isApplying, onReject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCollapsed || isApplying) {
        return;
      }

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleApply();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleReject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed, isApplying, handleApply, handleReject]);

  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneDiffEditor) => {
      editorRef.current = editor;

      editor.getModifiedEditor().focus();

      if (onModify) {
        const modifiedEditor = editor.getModifiedEditor();
        disposableRef.current?.dispose();
        disposableRef.current = modifiedEditor.onDidChangeModelContent(() => {
          const newValue = modifiedEditor.getValue();
          setCurrentModifiedCode(newValue);
          onModify(newValue);
        });
      }
    },
    [onModify],
  );

  // Detach Monaco models before dispose to avoid "TextModel got disposed" errors.
  useEffect(() => {
    return () => {
      clearTimeout(successTimeoutRef.current);
      disposableRef.current?.dispose();
      try {
        if (editorRef.current) {
          try {
            // @ts-expect-error: setModel accepts nulls for both editors
            editorRef.current.setModel({ original: null, modified: null });
          } catch {
            // setModel can throw if the editor is already torn down
          }
          editorRef.current.dispose();
          editorRef.current = null;
        }
      } catch {
        // Swallow so Monaco teardown errors don't crash React unmount
      }
    };
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentModifiedCode);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, [currentModifiedCode]);

  const toggleCollapsed = useCallback(() => {
    setUserCollapsed((prev) => !prev);
  }, []);

  const toggleMode = useCallback(() => {
    setCurrentMode((prev) =>
      prev === "side-by-side" ? "inline" : "side-by-side",
    );
  }, []);

  const isLargeDiff =
    stats.linesAdded + stats.linesRemoved + stats.linesModified > 50;

  return (
    <div
      ref={containerRef}
      className={`diff-preview ${isCollapsed ? "collapsed" : ""} ${showSuccess ? "success" : ""}`}
      role="region"
      aria-label="Code diff preview"
    >
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
                // Read-only once applied so the block stays as a historical record
                readOnly: isApplied,
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

      {showSuccess && (
        <div className="diff-preview-success" role="alert" aria-live="polite">
          ✓ Changes applied successfully
        </div>
      )}
    </div>
  );
}
