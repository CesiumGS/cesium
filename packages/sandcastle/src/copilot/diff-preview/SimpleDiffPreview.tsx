import { useState, useCallback, useMemo } from "react";
import "./SimpleDiffPreview.css";

// Read-only preview of a diff that has already been applied to the script.
interface SimpleDiffPreviewProps {
  /** Original source before changes */
  originalCode: string;
  /** Proposed source with changes applied */
  modifiedCode: string;
  /** Language used to pick the default file extension */
  language: "javascript" | "html";
  /** Filename shown in the header */
  fileName?: string;
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
  defaultCollapsed = false,
}: SimpleDiffPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const diff = useMemo(
    () => calculateSimpleDiff(originalCode, modifiedCode),
    [originalCode, modifiedCode],
  );

  const stats = useMemo(() => calculateStats(diff), [diff]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={`simple-diff-preview ${isCollapsed ? "collapsed" : ""}`}
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

      {!isCollapsed && (
        <>
          <div
            className="simple-diff-preview-applied-banner"
            role="status"
            aria-live="polite"
          >
            <span className="applied-banner-icon">&#10003;</span>
            <span className="applied-banner-text">
              Changes Applied to Script
            </span>
          </div>

          <div className="simple-diff-preview-content">
            <pre className="simple-diff-lines">
              {diff.map((line) => (
                <div
                  key={`${line.type}:${line.originalLineNum ?? ""}:${line.modifiedLineNum ?? ""}`}
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
        </>
      )}
    </div>
  );
}
