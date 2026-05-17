import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button, Tooltip, Kbd } from "@stratakit/bricks";
import "./SimpleDiffPreview.css";

// Mirrors DiffPreviewProps so the two components are interchangeable.
interface SimpleDiffPreviewProps {
  /** Original source before changes */
  originalCode: string;
  /** Proposed source with changes applied */
  modifiedCode: string;
  /** Language used to pick the default file extension */
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
  /** True once changes have been applied (read-only) */
  isApplied?: boolean;
  /** Start collapsed on first render */
  defaultCollapsed?: boolean;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged" | "modified";
  originalLineNum?: number;
  modifiedLineNum?: number;
  originalContent?: string;
  modifiedContent?: string;
  content: string;
}

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
      diff.push({
        type: "added",
        modifiedLineNum: modIdx + 1,
        modifiedContent: modLine,
        content: modLine,
      });
      modIdx++;
    } else if (modIdx >= modifiedLines.length) {
      diff.push({
        type: "removed",
        originalLineNum: origIdx + 1,
        originalContent: origLine,
        content: origLine,
      });
      origIdx++;
    } else if (origLine === modLine) {
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

export function SimpleDiffPreview({
  originalCode,
  modifiedCode,
  language,
  fileName,
  onApply,
  onReject,
  isApplying = false,
  isApplied = false,
  defaultCollapsed = false,
}: SimpleDiffPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(successTimeoutRef.current);
  }, []);

  const diff = useMemo(
    () => calculateSimpleDiff(originalCode, modifiedCode),
    [originalCode, modifiedCode],
  );

  const stats = useMemo(() => calculateStats(diff), [diff]);

  const handleApply = useCallback(() => {
    if (isApplying) {
      return;
    }

    onApply();

    setShowSuccess(true);
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 2000);
  }, [isApplying, onApply]);

  const handleReject = useCallback(() => {
    if (isApplying) {
      return;
    }
    onReject();
  }, [isApplying, onReject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCollapsed || isApplying || isApplied) {
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
  }, [isCollapsed, isApplying, isApplied, handleApply, handleReject]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(modifiedCode);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, [modifiedCode]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={`simple-diff-preview ${isCollapsed ? "collapsed" : ""} ${showSuccess ? "success" : ""}`}
      role="region"
      aria-label="Code diff preview"
    >
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

      {isApplied && !isCollapsed && (
        <div
          className="simple-diff-preview-applied-banner"
          role="status"
          aria-live="polite"
        >
          <span className="applied-banner-icon">&#10003;</span>
          <span className="applied-banner-text">Changes Applied to Script</span>
        </div>
      )}

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
                  <span className="line-number">
                    {line.modifiedLineNum ?? line.originalLineNum ?? " "}
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

            {!isApplied && (
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
                        Apply Changes <Kbd variant="solid">&#8984;&#8629;</Kbd>
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
