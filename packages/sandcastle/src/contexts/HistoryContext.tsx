import { createContext, useState, useCallback, ReactNode } from "react";
import { useLocalStorage } from "react-use";
import type { ChatMessage } from "../AI/types";

/**
 * Represents a single conversation in the chat history
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string;
  /** Title of the conversation (auto-generated from first message) */
  title: string;
  /** All messages in this conversation */
  messages: ChatMessage[];
  /** Timestamp when conversation was created */
  createdAt: number;
  /** Timestamp when conversation was last updated */
  updatedAt: number;
}

/**
 * Context type for managing conversation history
 */
export interface HistoryContextType {
  /** All saved conversations */
  conversations: Conversation[];
  /** ID of the currently active conversation */
  currentConversationId: string | null;
  /** Create a new conversation and return its ID */
  createConversation: () => string;
  /** Delete a conversation by ID */
  deleteConversation: (id: string) => void;
  /** Switch to a different conversation */
  switchConversation: (id: string) => void;
  /** Rename a conversation */
  renameConversation: (id: string, newTitle: string) => void;
  /** Save the current conversation state */
  saveCurrentConversation: (messages: ChatMessage[]) => void;
  /** Get messages for the current conversation */
  getCurrentMessages: () => ChatMessage[];
  /** Search conversations by query */
  searchConversations: (query: string) => Conversation[];
  /** Clear all conversations */
  clearAllConversations: () => void;
}

export const HistoryContext = createContext<HistoryContextType | undefined>(
  undefined,
);

/**
 * Generate a conversation title from the first user message
 * Truncates to first 60 characters and adds ellipsis if needed
 */
function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (!firstUserMessage) {
    return "New Conversation";
  }

  const content = firstUserMessage.content.trim();
  if (content.length <= 60) {
    return content;
  }

  return `${content.substring(0, 57)}...`;
}

/**
 * Provider component for conversation history management
 */
export function HistoryProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useLocalStorage<Conversation[]>(
    "cesium-copilot-conversations",
    [],
  );

  // Initialize with a NEW empty conversation on page load
  // Use lazy initialization to create initial conversation without effect
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(() => {
    // Create initial conversation
    const initialConversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Initialize conversations with the first one
    // This will be handled by the lazy initializer of useLocalStorage if needed
    setTimeout(() => {
      setConversations((prev) => {
        // Only add if conversations array is empty or undefined
        if (!prev || prev.length === 0) {
          return [initialConversation];
        }
        return prev;
      });
    }, 0);

    return initialConversation.id;
  });

  const createConversation = useCallback((): string => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setConversations((prev) => [...(prev || []), newConversation]);
    setCurrentConversationId(newConversation.id);

    return newConversation.id;
  }, [setConversations]);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = (prev || []).filter((conv) => conv.id !== id);

        // If we deleted the current conversation, switch to the most recent one
        if (id === currentConversationId) {
          if (filtered.length > 0) {
            const sorted = [...filtered].sort(
              (a, b) => b.updatedAt - a.updatedAt,
            );
            setCurrentConversationId(sorted[0].id);
          } else {
            // No conversations left, create a new one after this update completes
            // We need to do this outside the setter to avoid race conditions
            setTimeout(() => {
              createConversation();
            }, 0);
          }
        }

        return filtered;
      });
    },
    [currentConversationId, setConversations, createConversation],
  );

  const switchConversation = useCallback(
    (id: string) => {
      const conversation = conversations?.find((conv) => conv.id === id);
      if (conversation) {
        setCurrentConversationId(id);
      }
    },
    [conversations],
  );

  const renameConversation = useCallback(
    (id: string, newTitle: string) => {
      setConversations((prev) =>
        (prev || []).map((conv) =>
          conv.id === id
            ? { ...conv, title: newTitle, updatedAt: Date.now() }
            : conv,
        ),
      );
    },
    [setConversations],
  );

  const saveCurrentConversation = useCallback(
    (messages: ChatMessage[]) => {
      if (!currentConversationId) {
        return;
      }

      setConversations((prev) => {
        const updated = (prev || []).map((conv) => {
          if (conv.id === currentConversationId) {
            // Auto-generate title from first message if still using default
            const title =
              conv.title === "New Conversation" && messages.length > 0
                ? generateTitle(messages)
                : conv.title;

            return {
              ...conv,
              title,
              messages,
              updatedAt: Date.now(),
            };
          }
          return conv;
        });

        return updated;
      });
    },
    [currentConversationId, setConversations],
  );

  const getCurrentMessages = useCallback((): ChatMessage[] => {
    if (!currentConversationId) {
      return [];
    }

    const conversation = conversations?.find(
      (conv) => conv.id === currentConversationId,
    );
    return conversation?.messages || [];
  }, [currentConversationId, conversations]);

  const searchConversations = useCallback(
    (query: string): Conversation[] => {
      if (!query.trim()) {
        return conversations || [];
      }

      const lowercaseQuery = query.toLowerCase();

      return (conversations || []).filter((conv) => {
        // Search in title
        if (conv.title.toLowerCase().includes(lowercaseQuery)) {
          return true;
        }

        // Search in message content
        return conv.messages.some((msg) =>
          msg.content.toLowerCase().includes(lowercaseQuery),
        );
      });
    },
    [conversations],
  );

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    const newId = createConversation();
    setCurrentConversationId(newId);
  }, [setConversations, createConversation]);

  const value: HistoryContextType = {
    conversations: conversations || [],
    currentConversationId,
    createConversation,
    deleteConversation,
    switchConversation,
    renameConversation,
    saveCurrentConversation,
    getCurrentMessages,
    searchConversations,
    clearAllConversations,
  };

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}
