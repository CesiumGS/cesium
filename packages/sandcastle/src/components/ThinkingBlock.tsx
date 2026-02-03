import React, { useState } from "react";
import { Brain } from "lucide-react";
import "./ThinkingBlock.css";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  isStreaming = false,
}) => {
  // Start collapsed by default, allow user to expand to audit
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Add U+200E (LEFT-TO-RIGHT MARK) for proper RTL display
  const displayContent = `\u200E${content}`;

  return (
    <div className="thinking-block">
      <div
        className={`thinking-block-header ${isExpanded ? "expanded" : ""} ${isStreaming ? "streaming" : ""}`}
        onClick={handleToggle}
      >
        <span className="thinking-icon">
          <Brain size={16} />
        </span>
        <span className="thinking-label">Thinking</span>
        {!isExpanded && (
          <span className="thinking-preview">{displayContent}</span>
        )}
        <div className="thinking-actions">
          {isStreaming && <span className="thinking-spinner">⋯</span>}
          <span className={`thinking-chevron ${isExpanded ? "expanded" : ""}`}>
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="thinking-block-content">
          {displayContent}
          {isStreaming && <span className="thinking-cursor">▋</span>}
        </div>
      )}
    </div>
  );
};
