import { useState } from "react";
import { Badge, Text, IconButton } from "@stratakit/bricks";
import { chevronDown, chevronUp } from "../icons";
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

  const statusTone =
    status === "success"
      ? "positive"
      : status === "error"
        ? "critical"
        : "neutral";
  const statusLabel =
    status === "success" ? "Success" : status === "error" ? "Error" : "Pending";

  const title =
    toolName === "apply_diff"
      ? `Applying code changes to ${input.file || input.filePath || "file"}`
      : `Calling ${toolName}`;

  return (
    <div className="tool-call-container">
      <div className="tool-call-header">
        <Text variant="body-sm" style={{ flex: 1 }}>
          {title}
        </Text>
        <Badge label={statusLabel} tone={statusTone} />
        <IconButton
          label={isExpanded ? "Collapse" : "Expand"}
          icon={isExpanded ? chevronUp : chevronDown}
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
        />
      </div>

      {isExpanded && (
        <div className="tool-call-expanded">
          {toolName === "apply_diff" && input.search && input.replace ? (
            <>
              <div className="expanded-section">
                <Text variant="caption-md">Search Pattern:</Text>
                <pre className="expanded-code">{input.search}</pre>
              </div>
              <div className="expanded-section">
                <Text variant="caption-md">Replacement:</Text>
                <pre className="expanded-code">{input.replace}</pre>
              </div>
              {result?.output && (
                <div className="expanded-section">
                  <Text variant="caption-md">Result:</Text>
                  <pre className="expanded-code">{result.output}</pre>
                </div>
              )}
              {result?.error && (
                <div className="expanded-section">
                  <Text variant="caption-md">Error:</Text>
                  <pre className="expanded-code">{result.error}</pre>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="expanded-section">
                <Text variant="caption-md">Input:</Text>
                <pre className="expanded-code">
                  {JSON.stringify(input, null, 2)}
                </pre>
              </div>
              {result && (
                <div className="expanded-section">
                  <Text variant="caption-md">Result:</Text>
                  <pre className="expanded-code">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
