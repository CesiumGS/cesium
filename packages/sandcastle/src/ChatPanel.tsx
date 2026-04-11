import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { Button, Text, Tooltip, Switch } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { PromptInput } from "./components/common/PromptInput";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { ModelPicker } from "./components/controls/ModelPicker";
import { ApiKeyManager } from "./AI/ApiKeyManager";
import { AIClientFactory } from "./AI/AIClientFactory";
import { buildDiffBasedPrompt } from "./AI/PromptBuilder";
import type {
  ChatMessage as ChatMessageType,
  CodeContext,
  ConversationHistory,
  DiffBlock,
  ExecutionResult,
  ToolCall,
  ImageAttachment,
  ModelSelection,
} from "./AI/types";
import { SettingsContext } from "./SettingsContext";
import {
  settings as settingsIcon,
  cesiumLogo,
  add as addIcon,
  close as closeIcon,
  key as keyIcon,
} from "./icons";
import cesiumChatLogo from "./assets/cesium-chat-logo.png";
import "./ChatPanel.css";
import { useModel } from "./contexts/useModel";
import { useChatMessages } from "./hooks/useChatMessages";
import { useToolChainExecution } from "./hooks/useToolChainExecution";

// Type for message content blocks that can include images
type MessageContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };

interface ChatPanelProps {
  onClose: () => void;
  codeContext: CodeContext;
  onApplyCode: (javascript?: string, html?: string, autoRun?: boolean) => void;
  onApplyDiff?: (
    diffs: DiffBlock[],
    language: "javascript" | "html",
  ) => ExecutionResult | Promise<ExecutionResult>;
  currentCode?: CodeContext;
  onClearConsole?: () => void;
  pendingDraft?: {
    id: string;
    text: string;
  } | null;
  onPendingDraftConsumed?: (draftId: string) => void;
}

const BRAND_TEXT_STYLE: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--stratakit-color-text-accent-strong)",
};

const TOGGLE_LABEL_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--stratakit-space-x1)",
  cursor: "pointer",
};

function getPastedImageName(file: File) {
  if (file.name && file.name.trim().length > 0) {
    return file.name;
  }

  const extension = file.type.startsWith("image/")
    ? file.type.slice("image/".length).split("+")[0].replace("jpeg", "jpg")
    : "png";

  return `pasted-image.${extension || "png"}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image data"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{
  width?: number;
  height?: number;
}> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || undefined,
        height: image.naturalHeight || undefined,
      });
    };
    image.onerror = () => resolve({});
    image.src = dataUrl;
  });
}

async function createImageAttachment(file: File): Promise<ImageAttachment> {
  const dataUrl = await readFileAsDataUrl(file);
  const base64Data = dataUrl.split(",")[1] ?? "";
  const dimensions = await getImageDimensions(dataUrl);

  return {
    id: crypto.randomUUID(),
    name: getPastedImageName(file),
    mimeType: file.type || "image/png",
    size: file.size,
    base64Data,
    ...dimensions,
  };
}

function appendDraftToInput(currentInput: string, draftText: string) {
  const normalizedDraft = draftText.trim();
  if (!normalizedDraft) {
    return currentInput;
  }

  if (!currentInput.trim()) {
    return normalizedDraft;
  }

  const separator = currentInput.endsWith("\n") ? "\n" : "\n\n";
  return `${currentInput}${separator}${normalizedDraft}`;
}

export function ChatPanel({
  onClose,
  codeContext,
  onApplyCode,
  onApplyDiff,
  currentCode,
  onClearConsole,
  pendingDraft,
  onPendingDraftConsumed,
}: ChatPanelProps) {
  const { settings, updateSettings } = useContext(SettingsContext);

  const { models, currentModel, setCurrentModel, refreshModels } = useModel();

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(ApiKeyManager.hasAnyCredentials());
  const [inputFocusSignal, setInputFocusSignal] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    ImageAttachment[]
  >([]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);
  const lastMeasuredMessageCountRef = useRef(0);
  const lastMeasuredListHeightRef = useRef<number | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wasUserStoppedRef = useRef(false);

  // === Custom Hooks ===
  const {
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
  } = useChatMessages();

  // Keep messagesRef in sync so sendMessageWithContent doesn't need messages as a dep
  messagesRef.current = messages;

  const {
    workingCodeRef,
    getTools,
    getWorkingCode,
    executeToolCall,
    continueToolChain,
    lockToolChain,
    unlockToolChain,
  } = useToolChainExecution({
    currentCode,
    codeContext,
    onApplyCode,
    onClearConsole,
    addMessage,
    updateMessage,
    appendToolCallToMessage,
    updateToolCallResult,
  });

  const isChatBusy = isLoading || isCurrentlyStreaming;

  // Monitor for API key changes from other tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setHasApiKey(ApiKeyManager.hasAnyCredentials());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!pendingDraft) {
      return;
    }

    setInput((currentInput) =>
      appendDraftToInput(currentInput, pendingDraft.text),
    );
    setInputFocusSignal(pendingDraft.id);
    onPendingDraftConsumed?.(pendingDraft.id);
  }, [pendingDraft, onPendingDraftConsumed, setInput]);

  // === Core: sendMessageWithContent ===
  const sendMessageWithContent = useCallback(
    async (
      messageContent: string,
      attachments?: ImageAttachment[],
      onStart?: () => void,
    ) => {
      if (
        (!messageContent && (!attachments || attachments.length === 0)) ||
        isLoading ||
        isCurrentlyStreaming
      ) {
        return;
      }

      const currentHasApiKey = ApiKeyManager.hasAnyCredentials();
      if (!currentHasApiKey) {
        setShowApiKeyDialog(true);
        setHasApiKey(false);
        return;
      }
      if (currentHasApiKey !== hasApiKey) {
        setHasApiKey(currentHasApiKey);
      }
      const selectedModel: ModelSelection = currentModel ||
        AIClientFactory.getDefaultModelSelection() || {
          model: "gemini-3-flash-preview",
          route: "direct",
        };

      if (
        !AIClientFactory.canUseModelRoute(
          selectedModel.model,
          selectedModel.route,
        )
      ) {
        setShowApiKeyDialog(true);
        return;
      }

      const userMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content: messageContent || "(Image message)",
        timestamp: Date.now(),
        attachments:
          attachments && attachments.length > 0 ? attachments : undefined,
      };

      onStart?.();
      addMessage(userMessage);
      setIsLoading(true);
      setIsCurrentlyStreaming(true);
      shouldStickToBottomRef.current = true;

      const pendingAssistantMessageId = crypto.randomUUID();
      addMessage({
        id: pendingAssistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      wasUserStoppedRef.current = false;

      let accumulatedText = "";
      let reasoning = "";
      let thoughtTokens = 0;
      let thinkingSignature = "";
      let thinkingData = "";
      let streamError = "";
      let assistantMessageId: string | null = pendingAssistantMessageId;

      const ensureAssistantMessage = (initial: Partial<ChatMessageType>) => {
        if (assistantMessageId) {
          return;
        }
        const msg: ChatMessageType = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          isStreaming: true,
          ...initial,
        };
        assistantMessageId = msg.id;
        addMessage(msg);
      };

      const appendToolCall = (
        toolCall: ToolCall,
        originalCodeSnapshot?: { javascript: string; html: string },
      ) => {
        const toolCallEntry = { toolCall, originalCode: originalCodeSnapshot };

        if (!assistantMessageId) {
          const msg: ChatMessageType = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: accumulatedText,
            timestamp: Date.now(),
            isStreaming: true,
            reasoning,
            thoughtTokens,
            thinkingSignature: thinkingSignature || undefined,
            thinkingData: thinkingData || undefined,
            toolCalls: [toolCallEntry],
          };
          assistantMessageId = msg.id;
          addMessage(msg);
          return;
        }

        appendToolCallToMessage(assistantMessageId, toolCallEntry);
      };

      let batchedMessageUpdate:
        | ((data: Partial<ChatMessageType>) => void)
        | null = null;

      try {
        const thinkingBudget = settings.extendedThinking.enabled
          ? settings.extendedThinking.budget
          : 0;
        const client = AIClientFactory.createClientForRoute(selectedModel, {
          geminiOptions: {
            temperature: 0,
            thinkingBudgetTokens: thinkingBudget,
          },
          anthropicOptions: { thinkingBudgetTokens: thinkingBudget },
        });

        const toolsToPass = getTools();
        const contextForThisRequest = getWorkingCode();

        // Build conversation history (use ref to avoid dep on messages)
        const previousMessages = messagesRef.current.filter(
          (msg) => msg.id !== userMessage.id,
        );

        const buildMessageContent = (msg: ChatMessageType) => {
          const blocks: MessageContentBlock[] = [];
          if (msg.content && msg.content.trim() !== "") {
            blocks.push({ type: "text", text: msg.content });
          }
          if (msg.attachments && msg.attachments.length > 0) {
            for (const attachment of msg.attachments) {
              blocks.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: attachment.mimeType,
                  data: attachment.base64Data,
                },
              });
            }
          }
          return blocks;
        };

        const buildAnthropicPromptContent = (
          promptText: string,
          promptAttachments?: ImageAttachment[],
        ): MessageContentBlock[] => {
          const blocks: MessageContentBlock[] = [];
          if (promptText.trim() !== "") {
            blocks.push({ type: "text", text: promptText });
          }
          if (promptAttachments && promptAttachments.length > 0) {
            for (const attachment of promptAttachments) {
              blocks.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: attachment.mimeType,
                  data: attachment.base64Data,
                },
              });
            }
          }
          return blocks;
        };

        const buildGeminiPromptParts = (
          promptText: string,
          promptAttachments?: ImageAttachment[],
        ): Array<{
          text?: string;
          inline_data?: { mime_type: string; data: string };
        }> => {
          const parts: Array<{
            text?: string;
            inline_data?: { mime_type: string; data: string };
          }> = [];
          if (promptText.trim() !== "") {
            parts.push({ text: promptText });
          }
          if (promptAttachments && promptAttachments.length > 0) {
            for (const attachment of promptAttachments) {
              parts.push({
                inline_data: {
                  mime_type: attachment.mimeType,
                  data: attachment.base64Data,
                },
              });
            }
          }
          return parts;
        };

        const isGemini = selectedModel.model.startsWith("gemini");
        const conversationHistory = isGemini
          ? previousMessages.map((msg) => ({
              role: msg.role === "assistant" ? "model" : "user",
              parts: [{ text: msg.content }],
            }))
          : previousMessages
              .filter(
                (msg) =>
                  (msg.content && msg.content.trim() !== "") ||
                  (msg.attachments && msg.attachments.length > 0),
              )
              .map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: buildMessageContent(msg),
              }));

        for await (const chunk of client.generateWithContext(
          messageContent,
          contextForThisRequest,
          true,
          settings.customPromptAddendum,
          toolsToPass,
          conversationHistory,
          attachments,
          abortController.signal,
        )) {
          switch (chunk.type) {
            case "reasoning":
              reasoning += chunk.reasoning;
              ensureAssistantMessage({ reasoning });
              break;

            case "ant_thinking":
              reasoning += chunk.thinking;
              thinkingSignature = chunk.signature;
              ensureAssistantMessage({
                reasoning,
                thinkingSignature: thinkingSignature || undefined,
              });
              break;

            case "ant_redacted_thinking":
              thinkingData = chunk.data;
              break;

            case "text":
              accumulatedText += chunk.text;
              if (accumulatedText.trim().length > 0) {
                ensureAssistantMessage({
                  content: accumulatedText,
                  reasoning,
                });
              }
              break;

            case "tool_call": {
              lockToolChain();

              const originalCodeSnapshot = {
                javascript: workingCodeRef.current.javascript,
                html: workingCodeRef.current.html,
              };

              appendToolCall(chunk.toolCall, originalCodeSnapshot);

              if (chunk.toolCall.name === "apply_diff") {
                try {
                  const result = await executeToolCall(chunk.toolCall);

                  // Update the tool call in the message with the result
                  setMessages((prev) =>
                    prev.map((msg) => ({
                      ...msg,
                      toolCalls: msg.toolCalls?.map((tc) =>
                        tc.toolCall.id === chunk.toolCall.id
                          ? { ...tc, result, originalCode: tc.originalCode }
                          : tc,
                      ),
                    })),
                  );

                  // Build initial history for tool chain continuation
                  const buildGeminiFunctionCallPart = (call: ToolCall) => {
                    const signature =
                      call.thoughtSignature ??
                      "skip_thought_signature_validator";
                    return {
                      functionCall: { name: call.name, args: call.input },
                      thoughtSignature: signature,
                      thought_signature: signature,
                    };
                  };

                  // Use pre-edit code so the LLM knows what changed
                  // (getWorkingCode() already reflects the applied diff)
                  const continuationContext: CodeContext = {
                    javascript: originalCodeSnapshot.javascript,
                    html: originalCodeSnapshot.html,
                    consoleMessages: getWorkingCode().consoleMessages,
                  };
                  const { systemPrompt, userPrompt } = buildDiffBasedPrompt(
                    messageContent,
                    continuationContext,
                    settings.customPromptAddendum,
                  );

                  const userPromptContent = buildAnthropicPromptContent(
                    userPrompt,
                    attachments,
                  );
                  const userPromptParts = buildGeminiPromptParts(
                    userPrompt,
                    attachments,
                  );

                  const initialHistory: ConversationHistory = isGemini
                    ? [
                        {
                          role: "user" as const,
                          parts: userPromptParts,
                        },
                        {
                          role: "model" as const,
                          parts: [
                            ...(accumulatedText
                              ? [{ text: accumulatedText }]
                              : []),
                            buildGeminiFunctionCallPart(chunk.toolCall),
                          ],
                        },
                      ]
                    : [
                        {
                          role: "user" as const,
                          content: userPromptContent,
                        },
                        {
                          role: "assistant" as const,
                          content: [
                            ...(accumulatedText
                              ? [
                                  {
                                    type: "text" as const,
                                    text: accumulatedText,
                                  },
                                ]
                              : []),
                            {
                              type: "tool_use" as const,
                              id: chunk.toolCall.id,
                              name: chunk.toolCall.name,
                              input: chunk.toolCall.input,
                            },
                          ],
                        },
                      ];

                  await continueToolChain(
                    chunk.toolCall,
                    result,
                    client,
                    systemPrompt,
                    initialHistory,
                    selectedModel.model,
                    toolsToPass,
                    abortController.signal,
                  );
                } catch (error) {
                  const errorContent =
                    error instanceof Error
                      ? error.message
                      : "Tool execution failed";
                  if (assistantMessageId) {
                    updateMessage(assistantMessageId, {
                      content: `Error during tool execution: ${errorContent}`,
                      error: true,
                      isStreaming: false,
                    });
                  }
                } finally {
                  unlockToolChain();
                  // All tool calls in this turn are done — trigger a single
                  // auto-run now so the user sees the final result, not
                  // broken intermediate states from each individual edit.
                  onApplyCode(undefined, undefined, true);
                }
              }
              break;
            }

            case "usage":
              thoughtTokens = chunk.thoughtTokens ?? 0;
              break;

            case "error":
              if (chunk.error === "Request stopped by user") {
                wasUserStoppedRef.current = true;
                break;
              }
              streamError = chunk.error;
              ensureAssistantMessage({
                content: `Error: ${chunk.error}`,
                error: true,
              });
              break;
          }

          // Batched streaming update
          if (assistantMessageId) {
            if (!batchedMessageUpdate) {
              batchedMessageUpdate = createBatchedUpdater(assistantMessageId);
            }
            const updatePayload: Partial<ChatMessageType> = {
              content: accumulatedText,
              reasoning,
              thoughtTokens,
            };
            if (thinkingSignature) {
              updatePayload.thinkingSignature = thinkingSignature;
            }
            if (thinkingData) {
              updatePayload.thinkingData = thinkingData;
            }
            batchedMessageUpdate(updatePayload);
          }
        }

        // Flush final update
        cancelPendingRaf();

        const finalContent =
          accumulatedText || (streamError ? `Error: ${streamError}` : "");
        if (!assistantMessageId) {
          if (
            wasUserStoppedRef.current &&
            !finalContent &&
            !reasoning &&
            !streamError
          ) {
            const msg: ChatMessageType = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "(Response stopped by user)",
              timestamp: Date.now(),
              isStreaming: false,
            };
            assistantMessageId = msg.id;
            addMessage(msg);
          } else if (finalContent || reasoning || streamError) {
            const msg: ChatMessageType = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: finalContent,
              timestamp: Date.now(),
              reasoning,
              thoughtTokens,
              thinkingSignature: thinkingSignature || undefined,
              thinkingData: thinkingData || undefined,
              isStreaming: false,
              error: !!streamError && !accumulatedText,
            };
            assistantMessageId = msg.id;
            addMessage(msg);
          }
        } else {
          const stoppedWithoutVisibleContent =
            wasUserStoppedRef.current &&
            !finalContent &&
            !reasoning &&
            !streamError;
          updateMessage(assistantMessageId, {
            content: stoppedWithoutVisibleContent
              ? "(Response stopped by user)"
              : finalContent,
            reasoning,
            thoughtTokens,
            thinkingSignature: thinkingSignature || undefined,
            thinkingData: thinkingData || undefined,
            isStreaming: false,
            error: !!streamError && !accumulatedText,
          });
        }
      } catch (error) {
        if (wasUserStoppedRef.current) {
          const stoppedWithoutVisibleContent =
            !accumulatedText && !reasoning && !streamError;
          const stoppedMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: stoppedWithoutVisibleContent
              ? "(Response stopped by user)"
              : accumulatedText,
            timestamp: Date.now(),
            reasoning,
            thoughtTokens,
            thinkingSignature: thinkingSignature || undefined,
            thinkingData: thinkingData || undefined,
            isStreaming: false,
          };

          if (!assistantMessageId) {
            addMessage(stoppedMessage);
          } else {
            updateMessage(assistantMessageId, {
              content: stoppedMessage.content,
              reasoning: stoppedMessage.reasoning,
              thoughtTokens: stoppedMessage.thoughtTokens,
              thinkingSignature: stoppedMessage.thinkingSignature,
              thinkingData: stoppedMessage.thinkingData,
              isStreaming: false,
              error: false,
            });
          }
          return;
        }

        const errorContent =
          error instanceof Error
            ? error.message
            : "Failed to get response from AI";
        if (!assistantMessageId) {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: errorContent,
            timestamp: Date.now(),
            isStreaming: false,
            error: true,
          });
        } else {
          updateMessage(assistantMessageId, {
            content: errorContent,
            error: true,
            isStreaming: false,
          });
        }
      } finally {
        abortControllerRef.current = null;
        wasUserStoppedRef.current = false;
        cancelPendingRaf();
        setIsLoading(false);
        setIsCurrentlyStreaming(false);
      }
    },
    [
      isLoading,
      isCurrentlyStreaming,
      hasApiKey,
      currentModel,
      settings.customPromptAddendum,
      settings.extendedThinking.enabled,
      settings.extendedThinking.budget,
      addMessage,
      updateMessage,
      appendToolCallToMessage,
      setMessages,
      setIsLoading,
      setIsCurrentlyStreaming,
      getTools,
      getWorkingCode,
      executeToolCall,
      continueToolChain,
      lockToolChain,
      unlockToolChain,
      workingCodeRef,
      createBatchedUpdater,
      cancelPendingRaf,
    ],
  );

  // === Handlers ===
  const handleSendMessage = useCallback(() => {
    const trimmedInput = input.trim();
    const attachmentsToSend = pendingAttachments;
    if (!trimmedInput && attachmentsToSend.length === 0) {
      return;
    }

    void sendMessageWithContent(trimmedInput, attachmentsToSend, () => {
      setInput("");
      setPendingAttachments([]);
    });
  }, [input, pendingAttachments, setInput, sendMessageWithContent]);

  const handlePasteImages = useCallback(async (files: File[]) => {
    try {
      const newAttachments = await Promise.all(
        files.map((file) => createImageAttachment(file)),
      );
      setPendingAttachments((currentAttachments) => [
        ...currentAttachments,
        ...newAttachments,
      ]);
    } catch (error) {
      console.error("Failed to process pasted image:", error);
    }
  }, []);

  const handleRemovePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentId),
    );
  }, []);

  const handleStop = useCallback(() => {
    wasUserStoppedRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const handleApiKeySuccess = useCallback(() => {
    setHasApiKey(ApiKeyManager.hasAnyCredentials());
    refreshModels();
  }, [refreshModels]);

  const handleApiKeyDialogClose = useCallback(() => {
    setShowApiKeyDialog(false);
    setHasApiKey(ApiKeyManager.hasAnyCredentials());
  }, []);

  const handleNewChat = useCallback(() => {
    if (isChatBusy) {
      return;
    }
    resetChat();
    setPendingAttachments([]);
  }, [isChatBusy, resetChat]);

  const stableOnApplyDiff = useCallback(
    async (diffs: DiffBlock[], language: "javascript" | "html") => {
      if (onApplyDiff) {
        const result = await onApplyDiff(diffs, language);
        onClearConsole?.();
        return result;
      }
      return {
        success: false,
        diffErrors: [],
        consoleErrors: [],
        appliedCount: 0,
        timestamp: Date.now(),
        executionTimeMs: 0,
      };
    },
    [onApplyDiff, onClearConsole],
  );

  const scrollToLatest = useCallback(
    (behavior: "auto" | "smooth" = "auto") => {
      if (!virtuosoRef.current || messages.length === 0) {
        return;
      }
      virtuosoRef.current.scrollToIndex({
        index: "LAST",
        align: "end",
        behavior,
      });
    },
    [messages.length],
  );

  // If the user tried to scroll away while a response was still active,
  // treat their final position as authoritative once the stream settles.
  useEffect(() => {
    if (!isCurrentlyStreaming && !isLoading) {
      shouldStickToBottomRef.current = isAtBottomRef.current;
    }
  }, [isCurrentlyStreaming, isLoading]);

  const followOutputConfig = useCallback(
    (isAtBottom: boolean) => {
      const shouldFollow =
        isCurrentlyStreaming ||
        isLoading ||
        shouldStickToBottomRef.current ||
        isAtBottom;
      if (!shouldFollow) {
        return false;
      }
      return isCurrentlyStreaming || isLoading ? "auto" : "smooth";
    },
    [isCurrentlyStreaming, isLoading],
  );

  const handleAtBottomStateChange = useCallback(
    (atBottom: boolean) => {
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        shouldStickToBottomRef.current = true;
        return;
      }
      // Let users opt out by scrolling up only when assistant is not actively responding.
      if (!isCurrentlyStreaming && !isLoading) {
        shouldStickToBottomRef.current = false;
      }
    },
    [isCurrentlyStreaming, isLoading],
  );

  const handleTotalListHeightChanged = useCallback(
    (height: number) => {
      if (messages.length === 0) {
        lastMeasuredMessageCountRef.current = 0;
        lastMeasuredListHeightRef.current = null;
        return;
      }

      const messageCountChanged =
        messages.length !== lastMeasuredMessageCountRef.current;
      const heightChanged = lastMeasuredListHeightRef.current !== height;

      lastMeasuredMessageCountRef.current = messages.length;
      lastMeasuredListHeightRef.current = height;

      // New items are handled by followOutput; this path is only for growth within
      // existing items (streaming text, images loading, markdown/layout reflow).
      if (!heightChanged || messageCountChanged) {
        return;
      }

      if (
        isCurrentlyStreaming ||
        isLoading ||
        isAtBottomRef.current ||
        shouldStickToBottomRef.current
      ) {
        scrollToLatest("auto");
      }
    },
    [messages.length, isCurrentlyStreaming, isLoading, scrollToLatest],
  );

  return (
    <>
      <div className="chat-panel">
        <div className="chat-panel-header">
          <div className="chat-header-brand">
            <Icon href={cesiumLogo} className="brand-logo" />
            <Text variant="body-lg" style={BRAND_TEXT_STYLE}>
              Cesium Copilot
            </Text>
          </div>

          <div className="chat-header-actions">
            <Tooltip content="Start a new chat" placement="bottom">
              <Button
                variant="ghost"
                onClick={handleNewChat}
                disabled={messages.length === 0 || isChatBusy}
                aria-label="Start a new chat"
              >
                <Icon href={addIcon} />
              </Button>
            </Tooltip>

            <Tooltip content="API Key Settings" placement="bottom">
              <Button
                variant="ghost"
                onClick={() => setShowApiKeyDialog(true)}
                aria-label="Open API key settings"
              >
                <Icon href={keyIcon} />
              </Button>
            </Tooltip>

            <Tooltip content="Settings" placement="bottom">
              <Button
                variant="ghost"
                onClick={() => setShowSettingsPanel(true)}
                aria-label="Open settings"
              >
                <Icon href={settingsIcon} />
              </Button>
            </Tooltip>

            <Tooltip content="Close" placement="bottom">
              <Button
                variant="ghost"
                onClick={onClose}
                aria-label="Close chat panel"
              >
                <Icon href={closeIcon} />
              </Button>
            </Tooltip>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <img
                src={cesiumChatLogo}
                alt="Cesium Copilot Logo"
                className="welcome-logo"
              />
              <div className="welcome-examples">
                <button
                  className="example-button"
                  onClick={() => {
                    sendMessageWithContent(
                      "Take me on a virtual tour around Old City Philadelphia using CesiumJS. I want to see all the major attractions marked on the map with pins. Create a beautiful, modern UI with elegant styling and smooth animations where I can easily cycle between different attractions using intuitive navigation controls (next/previous buttons, or numbered buttons for each attraction). Include information about each attraction that's displayed in a clean, readable format. The camera should fly smoothly from one location to another, showing each site from a nice bird's-eye perspective with all markers resting naturally on the ground.",
                    );
                  }}
                  disabled={!hasApiKey}
                >
                  Philadelphia Old City Tour
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    sendMessageWithContent(
                      "Create an animated jogging path around the Grand Canyon with smooth camera following. Use the Cesium Man glTF asset (available at ../../SampleData/models/CesiumMan/Cesium_Man.glb) as the runner. Show the runner's route along the rim with distance markers, elevation profile, and a moving camera that follows the path smoothly. Make it visually stunning with a nice UI showing stats like distance, elevation gain, and current location.",
                    );
                  }}
                  disabled={!hasApiKey}
                >
                  Grand Canyon Jog
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    sendMessageWithContent(
                      "Take me on a virtual tour of Ancient Rome's most famous ruins. Show the Colosseum, Roman Forum, Pantheon, and Trevi Fountain with historical markers. Include a timeline slider showing the approximate year each structure was built, and camera animations that orbit each landmark dramatically.",
                    );
                  }}
                  disabled={!hasApiKey}
                >
                  Rome Ancient Ruins Tour
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    sendMessageWithContent(
                      "Create an island-hopping tour of Hawaii showing Oahu, Maui, Big Island, and Kauai. Mark volcanoes, beaches, and sacred sites. Include distance/flight time between islands and smooth ocean-crossing camera transitions.",
                    );
                  }}
                  disabled={!hasApiKey}
                >
                  Hawaiian Island Hopping
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    sendMessageWithContent(
                      "Tour the world's major space launch facilities - Cape Canaveral, Baikonur, Kourou, Tanegashima, and Vandenberg. Show launch pad locations, recent launches, and orbital trajectories.",
                    );
                  }}
                  disabled={!hasApiKey}
                >
                  Space Launch Sites Worldwide
                </button>
              </div>
              {!hasApiKey && (
                <div className="welcome-warning">
                  <Text
                    variant="body-md"
                    style={{
                      color: "var(--stratakit-color-text-warning-base)",
                    }}
                  >
                    You need to set up your API key to get started.
                  </Text>
                  <Button
                    variant="solid"
                    onClick={() => setShowApiKeyDialog(true)}
                  >
                    Set up API Key
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: "100%" }}
              data={messages}
              followOutput={followOutputConfig}
              atBottomThreshold={48}
              atBottomStateChange={handleAtBottomStateChange}
              totalListHeightChanged={handleTotalListHeightChanged}
              alignToBottom
              itemContent={(_index, message) => (
                <div className="chat-message-row">
                  <ChatMessageComponent
                    key={message.id}
                    message={message}
                    onApplyDiff={stableOnApplyDiff}
                    currentCode={currentCode}
                    streamingDiffs={undefined}
                  />
                </div>
              )}
            />
          )}
        </div>

        <div className="chat-bottom-controls">
          <PromptInput
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            placeholder="Ask me anything about Cesium"
            disabled={!hasApiKey || isLoading}
            isLoading={isLoading}
            isStreaming={isCurrentlyStreaming}
            onStop={handleStop}
            ariaLabel="Chat message input"
            focusSignal={inputFocusSignal}
            attachments={pendingAttachments}
            onPasteImages={handlePasteImages}
            onRemoveAttachment={handleRemovePendingAttachment}
          />

          <div className="chat-toggles-row">
            <ModelPicker
              models={models}
              currentModel={currentModel}
              onModelChange={setCurrentModel}
            />
            <label style={TOGGLE_LABEL_STYLE}>
              <Switch
                checked={settings.extendedThinking.enabled}
                onChange={(e) =>
                  updateSettings({
                    extendedThinking: {
                      ...settings.extendedThinking,
                      enabled: e.target.checked,
                    },
                  })
                }
                disabled={isLoading}
                aria-label="Toggle Extended Thinking"
              />
              <Text variant="caption-md">Thinking</Text>
            </label>
          </div>
        </div>

        {showSettingsPanel && (
          <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
        )}
      </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onClose={handleApiKeyDialogClose}
        onSuccess={handleApiKeySuccess}
      />
    </>
  );
}
