import { useState } from "react";
import { Wrench, ChevronDown, ChevronUp, FileCode } from "lucide-react";
import "./ToolCallDisplay.css";

export interface ToolCallDisplayProps {
  toolName: string;
  input: Record<string, unknown> & {
    file?: string;
    filePath?: string;
    search?: string;
    replace?: string;
  };
  status?: "pending" | "success" | "error";
  result?: {
    status: string;
    output?: string;
    error?: string;
  };
  currentCode?: {
    javascript: string;
    html: string;
  };
}

export function ToolCallDisplay({
  toolName,
  input,
  status = "pending",
  result,
}: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "var(--vscode-testing-iconPassed)";
      case "error":
        return "var(--vscode-testing-iconFailed)";
      default:
        return "var(--vscode-foreground)";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      default:
        return "⋯";
    }
  };

  const getToolIcon = () => {
    if (toolName === "apply_diff") {
      return <FileCode className="tool-call-icon" />;
    }
    return <Wrench className="tool-call-icon" />;
  };

  const getToolTitle = () => {
    if (toolName === "apply_diff") {
      const file = input.file || input.filePath || "file";
      return `Applying code changes to ${file}`;
    }
    return `Calling ${toolName}`;
  };

  const renderDiffPreview = () => {
    // Note: Full Monaco diff preview is rendered separately in ChatMessage.tsx
    // This just shows a simple status indicator
    return null;
  };

  const renderExpandedContent = () => {
    if (!isExpanded) {
      return null;
    }

    if (toolName === "apply_diff" && input.search && input.replace) {
      return (
        <div className="tool-call-expanded">
          <div className="expanded-section">
            <div className="expanded-label">Search Pattern:</div>
            <pre className="expanded-code">{input.search}</pre>
          </div>
          <div className="expanded-section">
            <div className="expanded-label">Replacement:</div>
            <pre className="expanded-code">{input.replace}</pre>
          </div>
          {result?.output && (
            <div className="expanded-section">
              <div className="expanded-label">Result:</div>
              <pre className="expanded-code">{result.output}</pre>
            </div>
          )}
          {result?.error && (
            <div className="expanded-section error-section">
              <div className="expanded-label">Error:</div>
              <pre className="expanded-code">{result.error}</pre>
            </div>
          )}
        </div>
      );
    }

    // Generic input display for other tools
    return (
      <div className="tool-call-expanded">
        <div className="expanded-section">
          <div className="expanded-label">Input:</div>
          <pre className="expanded-code">{JSON.stringify(input, null, 2)}</pre>
        </div>
        {result && (
          <div className="expanded-section">
            <div className="expanded-label">Result:</div>
            <pre className="expanded-code">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tool-call-container">
      <div className="tool-call-header">
        <div className="tool-call-title-row">
          <div className="tool-call-icon-title">
            {getToolIcon()}
            <span className="tool-call-title">{getToolTitle()}</span>
          </div>
          <div className="tool-call-status-controls">
            <span
              className="tool-call-status"
              style={{ color: getStatusColor() }}
            >
              {getStatusIcon()}
            </span>
            <button
              className="tool-call-expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {renderDiffPreview()}
      {renderExpandedContent()}
    </div>
  );
}
