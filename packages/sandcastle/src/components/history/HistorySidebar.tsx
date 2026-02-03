import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button, Text } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { search as searchIcon, close as closeIcon } from "../../icons";
import type { Conversation } from "../../contexts/HistoryContext";
import { useHistory } from "../../contexts/useHistory";
import { ConversationItem } from "./ConversationItem";
import "./HistorySidebar.css";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  lastWeek: Conversation[];
  older: Conversation[];
}

/**
 * Group conversations by date
 */
function groupConversationsByDate(
  conversations: Conversation[],
): GroupedConversations {
  const now = Date.now();
  const oneDayMs = 86400000;
  const oneWeekMs = 7 * oneDayMs;

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const lastWeek: Conversation[] = [];
  const older: Conversation[] = [];

  // Sort conversations by updatedAt (most recent first)
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const conv of sorted) {
    const age = now - conv.updatedAt;

    if (age < oneDayMs) {
      today.push(conv);
    } else if (age < 2 * oneDayMs) {
      yesterday.push(conv);
    } else if (age < oneWeekMs) {
      lastWeek.push(conv);
    } else {
      older.push(conv);
    }
  }

  return { today, yesterday, lastWeek, older };
}

/**
 * Simple fuzzy search - checks if all query characters appear in order
 */
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

export function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const {
    conversations,
    currentConversationId,
    switchConversation,
    deleteConversation,
    createConversation,
  } = useHistory();

  const [searchQuery, setSearchQuery] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    // Use fuzzy matching for better UX
    return conversations.filter((conv) => {
      if (fuzzyMatch(conv.title, searchQuery)) {
        return true;
      }

      // Also search in message content
      return conv.messages.some((msg) => fuzzyMatch(msg.content, searchQuery));
    });
  }, [conversations, searchQuery]);

  // Group conversations by date
  const grouped = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations],
  );

  // Handle Escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus search input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle click outside to close
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

    // Small delay to prevent immediate closing
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
      {/* Backdrop */}
      <div className="history-sidebar-backdrop" onClick={onClose} />

      {/* Sidebar */}
      <div className="history-sidebar" ref={sidebarRef}>
        {/* Header */}
        <div className="history-sidebar-header">
          <Text variant="body-lg" style={{ fontWeight: 600 }}>
            Chat History
          </Text>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close history"
            className="history-close-button"
          >
            <Icon href={closeIcon} />
          </Button>
        </div>

        {/* Search */}
        <div className="history-search-container">
          <Icon href={searchIcon} className="history-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="history-search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search conversations"
          />
        </div>

        {/* New Chat Button */}
        <div className="history-new-chat-container">
          <Button
            variant="solid"
            onClick={handleNewChat}
            style={{ width: "100%" }}
          >
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="history-conversations-list">
          {filteredConversations.length === 0 ? (
            <div className="history-empty-state">
              <Text variant="body-md" style={{ opacity: 0.6 }}>
                {searchQuery
                  ? "No conversations found"
                  : "No conversations yet"}
              </Text>
            </div>
          ) : (
            <>
              {/* Today */}
              {grouped.today.length > 0 && (
                <div className="history-group">
                  <Text variant="body-sm" className="history-group-header">
                    Today
                  </Text>
                  {grouped.today.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentConversationId}
                      onClick={() => handleConversationClick(conv.id)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {grouped.yesterday.length > 0 && (
                <div className="history-group">
                  <Text variant="body-sm" className="history-group-header">
                    Yesterday
                  </Text>
                  {grouped.yesterday.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentConversationId}
                      onClick={() => handleConversationClick(conv.id)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </div>
              )}

              {/* Last 7 Days */}
              {grouped.lastWeek.length > 0 && (
                <div className="history-group">
                  <Text variant="body-sm" className="history-group-header">
                    Last 7 Days
                  </Text>
                  {grouped.lastWeek.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentConversationId}
                      onClick={() => handleConversationClick(conv.id)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </div>
              )}

              {/* Older */}
              {grouped.older.length > 0 && (
                <div className="history-group">
                  <Text variant="body-sm" className="history-group-header">
                    Older
                  </Text>
                  {grouped.older.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentConversationId}
                      onClick={() => handleConversationClick(conv.id)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
