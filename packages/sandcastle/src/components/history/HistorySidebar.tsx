import { useEffect, useCallback, useRef } from "react";
import { Button, Text, IconButton } from "@stratakit/bricks";
import { close as closeIcon } from "../../icons";
import { useHistory } from "../../contexts/useHistory";
import { ConversationItem } from "./ConversationItem";
import "./HistorySidebar.css";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const {
    conversations,
    currentConversationId,
    switchConversation,
    deleteConversation,
    createConversation,
  } = useHistory();

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Sort by most recent first
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleConversationClick = useCallback(
    (id: string) => {
      switchConversation(id);
      onClose();
    },
    [switchConversation, onClose],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      // eslint-disable-next-line no-alert
      if (confirm("Are you sure you want to delete this conversation?")) {
        deleteConversation(id);
      }
    },
    [deleteConversation],
  );

  const handleNewChat = useCallback(() => {
    createConversation();
    onClose();
  }, [createConversation, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="history-sidebar-backdrop" onClick={onClose} />
      <div className="history-sidebar" ref={sidebarRef}>
        <div className="history-sidebar-header">
          <Text variant="body-lg" style={{ fontWeight: 600 }}>
            Chat History
          </Text>
          <IconButton
            label="Close history"
            icon={closeIcon}
            variant="ghost"
            onClick={onClose}
          />
        </div>

        <div className="history-new-chat-container">
          <Button
            variant="solid"
            tone="accent"
            onClick={handleNewChat}
            style={{ width: "100%" }}
          >
            New Chat
          </Button>
        </div>

        <div className="history-conversations-list">
          {sorted.length === 0 ? (
            <div className="history-empty-state">
              <Text variant="body-md" style={{ opacity: 0.6 }}>
                No conversations yet
              </Text>
            </div>
          ) : (
            sorted.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onClick={() => handleConversationClick(conv.id)}
                onDelete={() => handleDeleteConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
