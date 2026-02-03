import { useState } from "react";
import { Button, Text, Tooltip } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { close as closeIcon } from "../../icons";
import type { Conversation } from "../../contexts/HistoryContext";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
}

/**
 * Format a timestamp as a relative time string
 */
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  // For older items, show the date
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Generate a preview from the conversation messages
 */
function generatePreview(conversation: Conversation): string {
  // Find the first assistant response for preview
  const firstAssistant = conversation.messages.find(
    (msg) => msg.role === "assistant",
  );
  if (firstAssistant && firstAssistant.content) {
    const content = firstAssistant.content.trim();
    return content.length > 60 ? `${content.substring(0, 57)}...` : content;
  }

  // Fallback to first user message
  const firstUser = conversation.messages.find((msg) => msg.role === "user");
  if (firstUser && firstUser.content) {
    const content = firstUser.content.trim();
    return content.length > 60 ? `${content.substring(0, 57)}...` : content;
  }

  return "No messages yet";
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const preview = generatePreview(conversation);
  const timestamp = formatTimestamp(conversation.updatedAt);

  return (
    <div
      className={`conversation-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Conversation: ${conversation.title}`}
    >
      <div className="conversation-item-content">
        <div className="conversation-item-header">
          <Text variant="body-md" className="conversation-item-title">
            {conversation.title}
          </Text>
          <Text variant="body-sm" className="conversation-item-timestamp">
            {timestamp}
          </Text>
        </div>
        <Text variant="body-sm" className="conversation-item-preview">
          {preview}
        </Text>
      </div>

      {isHovered && (
        <div className="conversation-item-actions">
          <Tooltip content="Delete conversation" placement="left">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete conversation"
              className="conversation-item-delete"
            >
              <Icon href={closeIcon} />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
