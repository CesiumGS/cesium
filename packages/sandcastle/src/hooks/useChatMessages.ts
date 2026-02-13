import { useState, useRef, useCallback } from "react";
import type { ChatMessage as ChatMessageType, ToolResult } from "../AI/types";

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] = useState(false);

  // RAF batching for streaming updates
  const rafIdRef = useRef<number | null>(null);

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

  /**
   * Batched message update using requestAnimationFrame.
   * Syncs updates with browser paint cycles to reduce render pressure.
   */
  const createBatchedUpdater = useCallback((messageId: string) => {
    let updateBuffer: Partial<ChatMessageType> | null = null;

    return (data: Partial<ChatMessageType>) => {
      updateBuffer = { ...updateBuffer, ...data };

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (updateBuffer) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, ...updateBuffer } : msg,
              ),
            );
            updateBuffer = null;
          }
          rafIdRef.current = null;
        });
      }
    };
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  const cancelPendingRaf = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
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
