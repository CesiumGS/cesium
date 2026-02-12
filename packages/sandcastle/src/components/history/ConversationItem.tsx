import { Text, IconButton } from "@stratakit/bricks";
import { deleteIcon } from "../../icons";
import type { Conversation } from "../../contexts/HistoryContext";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const date = new Date(conversation.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`conversation-item ${isActive ? "active" : ""}`}
      onClick={onClick}
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
        <Text variant="body-md" className="conversation-item-title">
          {conversation.title}
        </Text>
        <Text variant="caption-md" className="conversation-item-date">
          {date}
        </Text>
      </div>
      <IconButton
        label="Delete conversation"
        icon={deleteIcon}
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />
    </div>
  );
}
