import { useState, useRef, useCallback, useEffect } from "react";
import type { ChatMessage as ChatMessageType, ToolResult } from "../ai/types";

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] = useState(false);

  // Track every in-flight rAF across all batched updaters so unmount and explicit
  // cancel clean up ALL of them. Using a shared scalar ref collides when two
  // streaming messages (e.g. user response + auto-fix retry) overlap — one
  // updater's scheduled frame blocks the other from ever being scheduled.
  const rafIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const rafIds = rafIdsRef.current;
    return () => {
      for (const id of rafIds) {
        cancelAnimationFrame(id);
      }
      rafIds.clear();
    };
  }, []);

  const addMessage = useCallback((message: ChatMessageType) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback(
    (messageId: string, data: Partial<ChatMessageType>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, ...data } : msg)),
      );
    },
    [],
  );

  const appendToolCallToMessage = useCallback(
    (
      messageId: string,
      toolCallEntry: NonNullable<ChatMessageType["toolCalls"]>[number],
    ) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                toolCalls: [...(msg.toolCalls || []), toolCallEntry],
              }
            : msg,
        ),
      );
    },
    [],
  );

  const updateToolCallResult = useCallback(
    (messageId: string, callId: string, result: ToolResult) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                toolCalls: msg.toolCalls?.map((tc) =>
                  tc.toolCall.id === callId
                    ? { ...tc, result, originalCode: tc.originalCode }
                    : tc,
                ),
              }
            : msg,
        ),
      );
    },
    [],
  );

  /** Batches updates via requestAnimationFrame to reduce render pressure during streaming. */
  const createBatchedUpdater = useCallback((messageId: string) => {
    let updateBuffer: Partial<ChatMessageType> | null = null;
    let pendingRafId: number | null = null;

    return (data: Partial<ChatMessageType>) => {
      updateBuffer = { ...updateBuffer, ...data };

      if (pendingRafId !== null) {
        return;
      }

      const rafId = requestAnimationFrame(() => {
        if (updateBuffer) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, ...updateBuffer } : msg,
            ),
          );
          updateBuffer = null;
        }
        rafIdsRef.current.delete(rafId);
        pendingRafId = null;
      });
      pendingRafId = rafId;
      rafIdsRef.current.add(rafId);
    };
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  const cancelPendingRaf = useCallback(() => {
    for (const id of rafIdsRef.current) {
      cancelAnimationFrame(id);
    }
    rafIdsRef.current.clear();
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    isCurrentlyStreaming,
    setIsCurrentlyStreaming,
    addMessage,
    updateMessage,
    appendToolCallToMessage,
    updateToolCallResult,
    createBatchedUpdater,
    resetChat,
    cancelPendingRaf,
  };
}
