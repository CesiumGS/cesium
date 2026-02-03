/**
 * ReasoningDisplay Component
 *
 * A collapsible reasoning display component for extended thinking/reasoning content.
 * Shows the AI thinking process with streaming support and token counting.
 *
 * Features:
 * - Collapsible section with expand/collapse animation
 * - "Thinking..." badge when streaming
 * - "Reasoning" with token count when complete
 * - Auto-expands while streaming, auto-collapses when done
 * - Smooth CSS transitions
 * - Glassmorphism styling
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Check } from "lucide-react";
import "./ReasoningDisplay.css";

/**
 * Props interface for the ReasoningDisplay component
 */
export interface ReasoningDisplayProps {
  /** The reasoning/thinking content to display */
  reasoning: string;
  /** Whether the reasoning is currently streaming */
  isStreaming: boolean;
  /** Optional count of thought tokens used */
  thoughtTokens?: number;
  /** Whether to start expanded (overridden by auto-expand logic) */
  defaultExpanded?: boolean;
  /** Callback when toggle state changes */
  onToggle?: (expanded: boolean) => void;
}

/**
 * ReasoningDisplay Component
 */
export function ReasoningDisplay({
  reasoning,
  isStreaming,
  thoughtTokens,
  onToggle,
}: ReasoningDisplayProps) {
  const [manuallySetExpanded, setManuallySetExpanded] = useState<
    boolean | null
  >(null);

  // Derive expanded state: user preference takes precedence, otherwise follow streaming state
  const isExpanded =
    manuallySetExpanded !== null ? manuallySetExpanded : isStreaming;

  // Handle toggle click
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setManuallySetExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  // Don't render if no reasoning content
  if (!reasoning && !isStreaming) {
    return null;
  }

  return (
    <div
      className={`reasoning-container ${isExpanded ? "expanded" : "collapsed"}`}
    >
      {/* Header - clickable to toggle */}
      <button
        className="reasoning-header"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse reasoning" : "Expand reasoning"}
        type="button"
      >
        <div className="reasoning-header-left">
          {/* Icon - thinking icon while streaming, checkmark when done */}
          <div
            className={`reasoning-icon ${isStreaming ? "streaming" : "complete"}`}
          >
            {isStreaming ? <Sparkles size={16} /> : <Check size={16} />}
          </div>

          {/* Badge label */}
          <span className="reasoning-badge">
            {isStreaming ? "Thinking..." : "Reasoning"}
          </span>

          {/* Token count when complete */}
          {!isStreaming && thoughtTokens !== undefined && (
            <span className="reasoning-tokens">
              {thoughtTokens.toLocaleString()} tokens
            </span>
          )}
        </div>

        {/* Chevron toggle indicator */}
        <div
          className={`reasoning-toggle ${isExpanded ? "expanded" : "collapsed"}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M2 4L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Content - collapsible reasoning text */}
      <div
        className={`reasoning-content ${isExpanded ? "expanded" : "collapsed"}`}
      >
        <div className="reasoning-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Prevent task list checkboxes from rendering (fixes CES-9)
              // During streaming, partial markdown like "[ ]" can be
              // misinterpreted as task list syntax by remark-gfm
              input(props) {
                // Don't render checkboxes from task lists
                if (props.type === "checkbox") {
                  return null;
                }
                return <input {...props} />;
              },
            }}
          >
            {reasoning || ""}
          </ReactMarkdown>
          {/* Streaming cursor */}
          {isStreaming && <span className="reasoning-cursor">▊</span>}
        </div>
      </div>
    </div>
  );
}
