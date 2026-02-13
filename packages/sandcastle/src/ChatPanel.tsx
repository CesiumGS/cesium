import {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { Button, Text, Tooltip, Switch } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { unstable_Banner as Banner } from "@stratakit/structures";
import { PromptInput } from "./components/common/PromptInput";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { ModelPicker } from "./components/controls/ModelPicker";
import { ApiKeyManager } from "./AI/ApiKeyManager";
import { AIClientFactory } from "./AI/AIClientFactory";
import type {
  ChatMessage as ChatMessageType,
  CodeContext,
  ConversationHistory,
  DiffBlock,
  ExecutionResult,
  AutoIterationConfig,
  ToolCall,
  ImageAttachment,
} from "./AI/types";
import { SettingsContext } from "./SettingsContext";
import {
  settings as settingsIcon,
  cesiumLogo,
  add as addIcon,
  close as closeIcon,
} from "./icons";
import cesiumChatLogo from "./assets/cesium-chat-logo.png";
import "./ChatPanel.css";
import { useModel } from "./contexts/useModel";
import { useChatMessages } from "./hooks/useChatMessages";
import { useAutoIteration } from "./hooks/useAutoIteration";
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
  isOpen: boolean;
  onClose: () => void;
  codeContext: CodeContext;
  onApplyCode: (javascript?: string, html?: string) => void;
  onApplyDiff?: (
    diffs: DiffBlock[],
    language: "javascript" | "html",
  ) => ExecutionResult | Promise<ExecutionResult>;
  currentCode?: CodeContext;
  onClearConsole?: () => void;
  getCurrentConsoleErrors?: () => Array<{ type: string; message: string }>;
}

export function ChatPanel({
  isOpen,
  onClose,
  codeContext,
  onApplyCode,
  onApplyDiff,
  currentCode,
  onClearConsole,
  getCurrentConsoleErrors,
}: ChatPanelProps) {
  void isOpen;
  const { settings, updateSettings } = useContext(SettingsContext);
  const autoIterationConfig: AutoIterationConfig = settings.autoIteration;

  const { models, currentModel, setCurrentModel, refreshModels } = useModel();
  const selectedModel =
    currentModel ||
    AIClientFactory.getDefaultModel() ||
    "gemini-3-flash-preview";

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(ApiKeyManager.hasAnyCredentials());

  const virtuosoRef = useRef<VirtuosoHandle>(null);

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

  // sendMessageWithContent ref for auto-iteration callback
  const sendMessageRef = useRef<(msg: string) => void>(() => {});

  const triggerFollowUp = useCallback(
    (prompt: string) => {
      // Add user feedback message then send
      const userFeedbackMessage: ChatMessageType = {
        id: `msg-${Date.now()}-user-feedback`,
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userFeedbackMessage]);
      sendMessageRef.current(prompt);
    },
    [setMessages],
  );

  const {
    iterationState,
    iterationStatus,
    incrementTotalRequests,
    resetIteration,
    checkPostResponseErrors,
    setWaiting,
  } = useAutoIteration({
    messages,
    isLoading,
    isCurrentlyStreaming,
    currentCode,
    autoIterationConfig,
    triggerFollowUp,
  });

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

  // Monitor for API key changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sandcastle_gemini_api_key") {
        setHasApiKey(ApiKeyManager.hasAnyCredentials());
      }
    };
    window.addEventListener("storage", handleStorageChange);
    const checkInterval = setInterval(() => {
      const currentHasApiKey = ApiKeyManager.hasAnyCredentials();
      setHasApiKey((prev) =>
        prev !== currentHasApiKey ? currentHasApiKey : prev,
      );
    }, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(checkInterval);
    };
  }, []);

  // === Core: sendMessageWithContent ===
  const sendMessageWithContent = useCallback(
    async (messageContent: string, attachments?: ImageAttachment[]) => {
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
      if (!AIClientFactory.canUseModel(selectedModel)) {
        setShowApiKeyDialog(true);
        return;
      }

      if (
        iterationState.totalRequests >= autoIterationConfig.maxTotalRequests
      ) {
        const notificationMessage: ChatMessageType = {
          id: `msg-${Date.now()}-notification`,
          role: "assistant",
          content: `Maximum request limit (${autoIterationConfig.maxTotalRequests}) reached for this conversation. Please review the output or start a new chat.`,
          timestamp: Date.now(),
        };
        addMessage(notificationMessage);
        return;
      }

      incrementTotalRequests();

      const userMessage: ChatMessageType = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: messageContent || "(Image message)",
        timestamp: Date.now(),
        attachments:
          attachments && attachments.length > 0 ? attachments : undefined,
      };

      addMessage(userMessage);
      setIsLoading(true);
      setIsCurrentlyStreaming(true);

      let accumulatedText = "";
      let reasoning = "";
      let thoughtTokens = 0;
      let thinkingSignature = "";
      let thinkingData = "";
      let streamError = "";
      let assistantMessageId: string | null = null;

      const ensureAssistantMessage = (initial: Partial<ChatMessageType>) => {
        if (assistantMessageId) {
          return;
        }
        const msg: ChatMessageType = {
          id: `msg-${Date.now()}-assistant`,
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
            id: `msg-${Date.now()}-assistant`,
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
        const client = AIClientFactory.createClient(selectedModel, {
          geminiOptions: { temperature: 0 },
        });

        const toolsToPass = getTools();
        const contextForThisRequest = getWorkingCode();

        // Build conversation history
        const previousMessages = messages.filter(
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

        const isGemini = selectedModel.startsWith("gemini");
        const conversationHistory = isGemini
          ? previousMessages.map((msg) => ({
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

                  const systemPrompt = `You are an AI assistant helping with CesiumJS code in Sandcastle.${
                    settings.customPromptAddendum
                      ? `\n\n# IMPORTANT USER INSTRUCTIONS\n\n${settings.customPromptAddendum}`
                      : ""
                  }`;

                  const initialHistory: ConversationHistory = isGemini
                    ? [
                        {
                          role: "user" as const,
                          parts: [{ text: messageContent }],
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
                          content: [{ type: "text", text: messageContent }],
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
                    selectedModel,
                    messageContent,
                    accumulatedText,
                    toolsToPass,
                  );
                } catch {
                  // Tool execution failed
                } finally {
                  unlockToolChain();
                }
              }
              break;
            }

            case "usage":
              thoughtTokens = chunk.thoughtTokens ?? 0;
              break;

            case "error":
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
          if (finalContent || reasoning || streamError) {
            const msg: ChatMessageType = {
              id: `msg-${Date.now()}-assistant`,
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
          updateMessage(assistantMessageId, {
            content: finalContent,
            reasoning,
            thoughtTokens,
            thinkingSignature: thinkingSignature || undefined,
            thinkingData: thinkingData || undefined,
            isStreaming: false,
            error: !!streamError && !accumulatedText,
          });
        }

        // Post-response error checking for auto-iteration
        const errorsBefore =
          currentCode?.consoleMessages?.filter((msg) => msg.type === "error") ||
          [];
        const errorSignatureBefore = errorsBefore
          .map((err) => err.message)
          .join("|");

        if (currentCode) {
          setWaiting(true);

          await new Promise((resolve) =>
            setTimeout(resolve, autoIterationConfig.waitTimeMs),
          );

          const runtimeErrors = getCurrentConsoleErrors
            ? getCurrentConsoleErrors().filter((msg) => msg.type === "error")
            : currentCode?.consoleMessages?.filter(
                (msg) => msg.type === "error",
              ) || [];

          const allErrors = runtimeErrors.map((err) => err.message);

          checkPostResponseErrors(
            allErrors,
            errorSignatureBefore,
            iterationStatus.isIterating,
          );
        }
      } catch (error) {
        const errorContent =
          error instanceof Error
            ? error.message
            : "Failed to get response from AI";
        if (!assistantMessageId) {
          addMessage({
            id: `msg-${Date.now()}-assistant`,
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
        cancelPendingRaf();
        setIsLoading(false);
        setIsCurrentlyStreaming(false);
      }
    },
    [
      isLoading,
      isCurrentlyStreaming,
      hasApiKey,
      selectedModel,
      currentCode,
      iterationState.totalRequests,
      iterationStatus.isIterating,
      autoIterationConfig.maxTotalRequests,
      autoIterationConfig.waitTimeMs,
      getCurrentConsoleErrors,
      messages,
      settings.customPromptAddendum,
      addMessage,
      updateMessage,
      appendToolCallToMessage,
      setMessages,
      setIsLoading,
      setIsCurrentlyStreaming,
      incrementTotalRequests,
      getTools,
      getWorkingCode,
      executeToolCall,
      continueToolChain,
      lockToolChain,
      unlockToolChain,
      workingCodeRef,
      createBatchedUpdater,
      cancelPendingRaf,
      checkPostResponseErrors,
      setWaiting,
    ],
  );

  // Keep ref in sync for auto-iteration callback
  useEffect(() => {
    sendMessageRef.current = sendMessageWithContent;
  }, [sendMessageWithContent]);

  // === Handlers ===
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return;
    }
    setInput("");
    await sendMessageWithContent(trimmedInput);
  }, [input, setInput, sendMessageWithContent]);

  const handleApiKeySuccess = useCallback(() => {
    setHasApiKey(ApiKeyManager.hasAnyCredentials());
    refreshModels();
  }, [refreshModels]);

  const handleApiKeyDialogClose = useCallback(() => {
    setShowApiKeyDialog(false);
    setHasApiKey(ApiKeyManager.hasAnyCredentials());
  }, []);

  const handleNewChat = useCallback(() => {
    resetChat();
    resetIteration();
  }, [resetChat, resetIteration]);

  const stableOnApplyCode = useCallback(
    (javascript?: string, html?: string) => {
      onApplyCode(javascript, html);
      onClearConsole?.();
    },
    [onApplyCode, onClearConsole],
  );

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

  const FooterComponent = useMemo(
    () => () => (
      <>
        <div
          className="footer-guidance-wrapper"
          style={{
            display:
              iterationState.escalationActive && !isLoading ? "block" : "none",
          }}
        >
          <Banner
            tone="info"
            label="Help needed"
            message="The AI has encountered repeated errors and needs your guidance."
          />
        </div>

        <div
          className="footer-loading-wrapper"
          style={{
            display: isLoading || isCurrentlyStreaming ? "block" : "none",
          }}
        >
          <div className="chat-loading">
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </div>
        </div>

        <div
          className="footer-iteration-badge-wrapper"
          style={{
            display:
              iterationStatus.isIterating &&
              iterationStatus.currentIteration > 0
                ? "block"
                : "none",
          }}
        >
          <div className="iteration-status-badge">
            <span className="iteration-icon"></span>
            <span className="iteration-text">
              Auto-fix {iterationStatus.currentIteration}/
              {autoIterationConfig.maxIterations}
            </span>
          </div>
        </div>

        <div
          className="footer-waiting-wrapper"
          style={{
            display: iterationStatus.isWaiting ? "block" : "none",
          }}
        >
          <div className="iteration-waiting">
            <div className="loading-spinner small" />
            <Text variant="body-sm" style={{ opacity: 0.7 }}>
              Checking for errors...
            </Text>
          </div>
        </div>

        <div
          className="footer-completion-wrapper"
          style={{
            display: iterationStatus.completionMessage ? "block" : "none",
          }}
        >
          <div
            className={`iteration-completion iteration-completion-${iterationStatus.completionType}`}
          >
            <span className="completion-icon">
              {iterationStatus.completionType === "success" && "✓"}
              {iterationStatus.completionType === "max-iterations" && "⚠️"}
              {iterationStatus.completionType === "oscillation" && "🔄"}
              {iterationStatus.completionType === "max-requests" && "🛑"}
            </span>
            <Text variant="body-sm">{iterationStatus.completionMessage}</Text>
          </div>
        </div>
      </>
    ),
    [
      iterationState.escalationActive,
      isLoading,
      isCurrentlyStreaming,
      iterationStatus.isIterating,
      iterationStatus.currentIteration,
      iterationStatus.isWaiting,
      iterationStatus.completionMessage,
      iterationStatus.completionType,
      autoIterationConfig.maxIterations,
    ],
  );

  const followOutputConfig = useCallback(
    (isAtBottom: boolean) => {
      if (isCurrentlyStreaming) {
        return "smooth";
      }
      return isAtBottom ? "smooth" : false;
    },
    [isCurrentlyStreaming],
  );

  return (
    <>
      <div className="chat-panel">
        <div className="chat-panel-header">
          <div className="chat-header-brand">
            <Icon href={cesiumLogo} className="brand-logo" />
            <Text
              variant="body-lg"
              style={{
                fontWeight: 600,
                color: "var(--stratakit-color-text-accent-strong)",
              }}
            >
              Cesium Copilot
            </Text>
          </div>

          <div className="chat-header-actions">
            <Tooltip content="Start a new chat" placement="bottom">
              <Button
                variant="ghost"
                onClick={handleNewChat}
                disabled={messages.length === 0}
                aria-label="Start a new chat"
              >
                <Icon href={addIcon} />
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
                      "Create an animated jogging path around the Grand Canyon with smooth camera following. Show a runner's route along the rim with distance markers, elevation profile, and a moving camera that follows the path smoothly. Make it visually stunning with a nice UI showing stats like distance, elevation gain, and current location.",
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
              alignToBottom
              itemContent={(_index, message) => (
                <ChatMessageComponent
                  key={message.id}
                  message={message}
                  onApplyCode={stableOnApplyCode}
                  onApplyDiff={stableOnApplyDiff}
                  currentCode={currentCode}
                  streamingDiffs={undefined}
                />
              )}
              components={{
                Footer: FooterComponent,
              }}
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
            ariaLabel="Chat message input"
          />

          <div className="chat-toggles-row">
            <ModelPicker
              models={models}
              currentModel={currentModel}
              onModelChange={setCurrentModel}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--stratakit-space-x1)",
                cursor: "pointer",
              }}
            >
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
