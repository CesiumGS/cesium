import {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  memo,
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
  DiffBlock,
  ExecutionResult,
  IterationState,
  AutoIterationConfig,
  ToolCall,
  ToolResult,
  ImageAttachment,
} from "./AI/types";
import { SettingsContext } from "./SettingsContext";
import { detectOscillation } from "./AI/ErrorContext";
import { settings as settingsIcon, cesiumLogo, add as addIcon } from "./icons";
import cesiumChatLogo from "./assets/cesium-chat-logo.png";
import {
  initializeToolRegistry,
  setToolRegistry,
  toolRegistry,
} from "./AI/tools/toolRegistry";
import "./ChatPanel.css";
import { useModel } from "./contexts/useModel";

// Type for content blocks in conversation history
type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

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

/**
 * PERFORMANCE OPTIMIZATION #1: Debounce delay for error detection
 * Wait 1000ms after errors stop appearing before triggering iteration
 */
const ERROR_DETECTION_DEBOUNCE_MS = 1000;

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
  // Note: isOpen is part of the public API but not currently used
  void isOpen;
  // Get auto-iteration settings from context
  const { settings, updateSettings } = useContext(SettingsContext);
  const autoIterationConfig: AutoIterationConfig = settings.autoIteration;

  // Get model context
  const { models, currentModel, setCurrentModel, refreshModels } = useModel();
  const selectedModel =
    currentModel ||
    AIClientFactory.getDefaultModel() ||
    "gemini-3-flash-preview";

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(ApiKeyManager.hasAnyCredentials());

  // Streaming state management
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] =
    useState<boolean>(false);

  // Enhanced iteration state tracking
  const [iterationState, setIterationState] = useState<IterationState>({
    errorIterationCount: 0,
    consecutiveMistakes: 0,
    totalRequests: 0,
    lastErrorSignature: "",
    recentErrorSignatures: [],
    escalationActive: false,
  });

  // Iteration status UI state
  const [iterationStatus, setIterationStatus] = useState<{
    isWaiting: boolean;
    isIterating: boolean;
    currentIteration: number;
    completionMessage: string | null;
    completionType:
      | "success"
      | "max-iterations"
      | "oscillation"
      | "max-requests"
      | null;
  }>({
    isWaiting: false,
    isIterating: false,
    currentIteration: 0,
    completionMessage: null,
    completionType: null,
  });

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // PERFORMANCE OPTIMIZATION #6: Track all timeouts for cleanup
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const errorDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const iterationDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const followUpIterationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Track requestAnimationFrame IDs for cleanup
  const rafIdRef = useRef<number | null>(null);

  // Track if we've already scheduled an auto-iteration to prevent duplicates
  const autoIterationScheduledRef = useRef(false);

  // Track if we've already shown an oscillation message to prevent spam
  const oscillationMessageShownRef = useRef(false);

  // Track last error message to prevent duplicates
  const lastErrorMessageRef = useRef<{
    content: string;
    timestamp: number;
  } | null>(null);

  // Track last execution of handleErrorDetection to prevent rapid double-triggers
  const lastErrorDetectionRunRef = useRef<number>(0);

  // PERFORMANCE OPTIMIZATION #6: Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      if (errorDebounceTimeoutRef.current) {
        clearTimeout(errorDebounceTimeoutRef.current);
        errorDebounceTimeoutRef.current = null;
      }
      if (iterationDelayTimeoutRef.current) {
        clearTimeout(iterationDelayTimeoutRef.current);
        iterationDelayTimeoutRef.current = null;
      }
      if (followUpIterationTimeoutRef.current) {
        clearTimeout(followUpIterationTimeoutRef.current);
        followUpIterationTimeoutRef.current = null;
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Reset auto-iteration flag to prevent race conditions
      autoIterationScheduledRef.current = false;
    };
  }, []);

  // Keep a ref to the latest code so tools never see stale snapshots
  const latestCodeRef = useRef<CodeContext | undefined>(currentCode);
  useEffect(() => {
    latestCodeRef.current = currentCode;
  }, [currentCode]);

  // Working code ref: authoritative snapshot used for both prompts AND tool execution
  // This ensures the model sees the same code that the tool will operate on
  const workingCodeRef = useRef<CodeContext>(currentCode ?? codeContext);

  // Prevent React effects from overwriting the working buffer mid-chain
  const toolChainActiveRef = useRef(false);

  // Keep workingCodeRef synced when NOT in an active tool chain
  // (During tool chains, it's updated manually after each successful apply_diff)
  useEffect(() => {
    // Don't overwrite workingCodeRef while a tool chain is running
    if (toolChainActiveRef.current) {
      return;
    }

    if (currentCode) {
      workingCodeRef.current = currentCode;
    } else {
      workingCodeRef.current = codeContext;
    }
  }, [currentCode, codeContext]);

  // Initialize tool registry once; it will always read from workingCodeRef
  // This ensures tool execution uses the same code snapshot as the model prompt
  useEffect(() => {
    if (!toolRegistry) {
      const registry = initializeToolRegistry((file: "javascript" | "html") => {
        const ctx = workingCodeRef.current;
        return file === "javascript" ? ctx.javascript : ctx.html;
      });
      setToolRegistry(registry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toolRegistry is a mutable object used to check initialization state, not a true dependency
  }, [toolRegistry]);

  // Virtuoso handles smart scrolling automatically with followOutput

  // Focus input when panel opens (handled by PromptInput component internally)

  // Monitor for API key changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sandcastle_gemini_api_key") {
        setHasApiKey(ApiKeyManager.hasAnyCredentials());
      }
    };

    // Listen for storage changes (e.g., from other tabs or direct manipulation)
    window.addEventListener("storage", handleStorageChange);

    // Also periodically check in case localStorage is modified in the same tab
    const checkInterval = setInterval(() => {
      const currentHasApiKey = ApiKeyManager.hasAnyCredentials();
      setHasApiKey((prevHasApiKey) => {
        // Only update if state changed to avoid unnecessary re-renders
        if (prevHasApiKey !== currentHasApiKey) {
          return currentHasApiKey;
        }
        return prevHasApiKey;
      });
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(checkInterval);
    };
  }, []);

  // PERFORMANCE OPTIMIZATION #6: Auto-hide completion messages with proper cleanup
  useEffect(() => {
    if (iterationStatus.completionMessage) {
      // Clear any existing timeout
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }

      completionTimeoutRef.current = setTimeout(() => {
        setIterationStatus((prev) => ({
          ...prev,
          completionMessage: null,
          completionType: null,
        }));
        completionTimeoutRef.current = null;
      }, 5000);

      return () => {
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
      };
    }
  }, [iterationStatus.completionMessage]);

  // PERFORMANCE OPTIMIZATION #2: Memoize error signature calculation
  // Only recalculate when console messages actually change
  const currentErrorSignature = useMemo(() => {
    const runtimeErrors =
      currentCode?.consoleMessages?.filter((msg) => msg.type === "error") || [];

    if (runtimeErrors.length === 0) {
      return "";
    }

    return runtimeErrors.map((e) => e.message).join("|");
  }, [currentCode?.consoleMessages]);

  // PERFORMANCE OPTIMIZATION #2: Memoize oscillation detection result
  // Avoid recalculating the same oscillation check multiple times
  const isCurrentlyOscillating = useMemo(() => {
    if (!autoIterationConfig.detectOscillation || !currentErrorSignature) {
      return false;
    }
    return detectOscillation(
      iterationState.recentErrorSignatures,
      currentErrorSignature,
    );
  }, [
    autoIterationConfig.detectOscillation,
    iterationState.recentErrorSignatures,
    currentErrorSignature,
  ]);

  // PERFORMANCE OPTIMIZATION #2: Memoize error context formatting
  // Only reformat when errors actually change
  const formattedErrorContext = useMemo(() => {
    const runtimeErrors =
      currentCode?.consoleMessages?.filter((msg) => msg.type === "error") || [];

    if (runtimeErrors.length === 0) {
      return "";
    }

    return runtimeErrors.map((err, i) => `${i + 1}. ${err.message}`).join("\n");
  }, [currentCode?.consoleMessages]);

  // PERFORMANCE OPTIMIZATION #1: Debounced error detection
  // Uses useCallback to prevent recreating function on every render
  const handleErrorDetection = useCallback(() => {
    // Prevent rapid double-triggers - enforce minimum 2 second gap
    const now = Date.now();
    if (now - lastErrorDetectionRunRef.current < 2000) {
      return;
    }
    lastErrorDetectionRunRef.current = now;

    // Only run if we have messages and aren't currently loading
    if (messages.length === 0 || isLoading || isCurrentlyStreaming) {
      return;
    }

    // Don't trigger if we've already scheduled an iteration
    if (autoIterationScheduledRef.current) {
      return;
    }

    // Get the last assistant message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "assistant") {
      return;
    }

    // Check for console errors using memoized values
    const runtimeErrors =
      currentCode?.consoleMessages?.filter((msg) => msg.type === "error") || [];

    if (runtimeErrors.length > 0) {
      const errorSignature = currentErrorSignature;

      // Use memoized oscillation detection result
      const isOscillating = isCurrentlyOscillating;

      const isSameError = errorSignature === iterationState.lastErrorSignature;
      const shouldIterate =
        iterationState.errorIterationCount <
          autoIterationConfig.maxIterations &&
        !isSameError &&
        !isOscillating &&
        !iterationState.escalationActive;

      if (shouldIterate) {
        // console.log(
        //   `🔄 Detected ${runtimeErrors.length} runtime error(s), auto-iterating (${iterationState.errorIterationCount + 1}/${autoIterationConfig.maxIterations})...`
        // );

        // Mark that we've scheduled an iteration
        autoIterationScheduledRef.current = true;

        // PERFORMANCE OPTIMIZATION #5: Batch state updates together
        setIterationState((prev) => ({
          ...prev,
          lastErrorSignature: errorSignature,
          errorIterationCount: prev.errorIterationCount + 1,
          recentErrorSignatures: [
            ...prev.recentErrorSignatures,
            errorSignature,
          ].slice(-5),
        }));

        setIterationStatus({
          isWaiting: true,
          isIterating: true,
          currentIteration: iterationState.errorIterationCount + 1,
          completionMessage: null,
          completionType: null,
        });

        // Use pre-formatted error context from memoized value
        const followUpPrompt = `The code is running but the following console errors occurred:\n\n${formattedErrorContext}\n\nPlease analyze and fix these errors.`;

        // Check if this is a duplicate message within the last 3 seconds
        const now = Date.now();
        const isDuplicate =
          lastErrorMessageRef.current &&
          lastErrorMessageRef.current.content === followUpPrompt &&
          now - lastErrorMessageRef.current.timestamp < 3000;

        if (isDuplicate) {
          autoIterationScheduledRef.current = false;
          return;
        }

        // Track this error message
        lastErrorMessageRef.current = {
          content: followUpPrompt,
          timestamp: now,
        };

        // Add user message for the error feedback
        const userFeedbackMessage: ChatMessageType = {
          id: `msg-${Date.now()}-user-feedback`,
          role: "user",
          content: followUpPrompt,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userFeedbackMessage]);

        // Trigger iteration after a brief delay
        if (iterationDelayTimeoutRef.current) {
          clearTimeout(iterationDelayTimeoutRef.current);
        }

        iterationDelayTimeoutRef.current = setTimeout(() => {
          autoIterationScheduledRef.current = false;
          setIterationStatus((prev) => ({
            ...prev,
            isWaiting: false,
          }));
          // Safe forward reference - function will be defined before setTimeout callback executes
          // eslint-disable-next-line no-use-before-define
          sendMessageWithContent(followUpPrompt);
          iterationDelayTimeoutRef.current = null;
        }, 1000);
      } else if (
        isOscillating &&
        !iterationState.escalationActive &&
        !oscillationMessageShownRef.current
      ) {
        // console.log(
        //   "⚠️ Error oscillation detected (errors cycling between states). Stopping iteration to prevent infinite loop."
        // );
        // Mark that we've shown the oscillation message
        oscillationMessageShownRef.current = true;

        // PERFORMANCE OPTIMIZATION #5: Batch state updates
        setIterationState((prev) => ({
          ...prev,
          escalationActive: true,
        }));
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: "Oscillation detected, stopping",
          completionType: "oscillation",
        });
        // Show notification to user
        const oscillationMessage: ChatMessageType = {
          id: `msg-${Date.now()}-oscillation`,
          role: "assistant",
          content:
            "⚠️ I've detected that errors are cycling between different states. This suggests the fixes I'm applying are creating new problems. Please review the code or provide additional guidance.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, oscillationMessage]);
      } else if (isSameError) {
        // console.log(
        //   "⚠️ Same errors detected, stopping auto-iteration to prevent infinite loop"
        // );
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: "Same errors detected, stopping",
          completionType: "oscillation",
        });
      } else if (
        iterationState.errorIterationCount >= autoIterationConfig.maxIterations
      ) {
        // console.log(
        //   `Maximum iterations (${autoIterationConfig.maxIterations}) reached, stopping auto-iteration`
        // );
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: "Max iterations reached",
          completionType: "max-iterations",
        });
      }
    } else if (iterationState.lastErrorSignature !== "") {
      // No errors - reset iteration tracking if we had errors before
      //         console.log("✅ No errors detected, resetting error iteration tracking");
      // PERFORMANCE OPTIMIZATION #5: Batch state updates
      setIterationState((prev) => ({
        ...prev,
        lastErrorSignature: "",
        errorIterationCount: 0,
      }));
      // Always reset isWaiting, but only show completion message if we were iterating
      setIterationStatus({
        isWaiting: false,
        isIterating: false,
        currentIteration: 0,
        completionMessage: iterationStatus.isIterating
          ? "Errors fixed successfully"
          : null,
        completionType: iterationStatus.isIterating ? "success" : null,
      });
      // Reset oscillation flag when errors are cleared
      oscillationMessageShownRef.current = false;
      // Reset duplicate message tracking when errors are cleared
      lastErrorMessageRef.current = null;
    } else if (iterationStatus.isWaiting) {
      // If we're waiting but had no previous errors, just reset the waiting state
      setIterationStatus((prev) => ({
        ...prev,
        isWaiting: false,
      }));
    }
    //TODO: Smelly dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages,
    isLoading,
    isCurrentlyStreaming,
    currentCode?.consoleMessages,
    iterationState.lastErrorSignature,
    iterationState.errorIterationCount,
    iterationState.escalationActive,
    iterationStatus.isWaiting,
    iterationStatus.isIterating,
    currentErrorSignature,
    isCurrentlyOscillating,
    autoIterationConfig.maxIterations,
    formattedErrorContext,
  ]);

  // PERFORMANCE OPTIMIZATION #1: Monitor for console errors with debouncing
  // Wait for errors to settle before triggering iteration
  useEffect(() => {
    // Clear any existing debounce timeout
    if (errorDebounceTimeoutRef.current) {
      clearTimeout(errorDebounceTimeoutRef.current);
    }

    // Set up new debounced error detection
    errorDebounceTimeoutRef.current = setTimeout(() => {
      handleErrorDetection();
      errorDebounceTimeoutRef.current = null;
    }, ERROR_DETECTION_DEBOUNCE_MS);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (errorDebounceTimeoutRef.current) {
        clearTimeout(errorDebounceTimeoutRef.current);
        errorDebounceTimeoutRef.current = null;
      }
    };
  }, [handleErrorDetection]);

  // ============================================================================
  // Image Handling Utilities
  // ============================================================================

  // PERFORMANCE OPTIMIZATION #4: Wrap sendMessageWithContent in useCallback
  // This ensures the function reference stays stable
  const sendMessageWithContent = useCallback(
    async (messageContent: string, attachments?: ImageAttachment[]) => {
      // Allow sending if we have either message content or attachments
      if (
        (!messageContent && (!attachments || attachments.length === 0)) ||
        isLoading ||
        isCurrentlyStreaming
      ) {
        return;
      }

      // Always re-check the current API key status to catch cases where user clears it
      // This is important for handling edge cases where the state might be out of sync
      const currentHasApiKey = ApiKeyManager.hasAnyCredentials();

      if (!currentHasApiKey) {
        setShowApiKeyDialog(true);
        setHasApiKey(false);
        return;
      }

      // Update hasApiKey state to reflect current status
      if (currentHasApiKey !== hasApiKey) {
        setHasApiKey(currentHasApiKey);
      }

      // Check if we can use the selected model
      if (!AIClientFactory.canUseModel(selectedModel)) {
        setShowApiKeyDialog(true);
        return;
      }

      // Check max total request limit before proceeding
      if (
        iterationState.totalRequests >= autoIterationConfig.maxTotalRequests
      ) {
        //       console.log(`⚠️ Maximum total request limit reached (${autoIterationConfig.maxTotalRequests}). Stopping iteration.`);
        // Show notification to user
        const notificationMessage: ChatMessageType = {
          id: `msg-${Date.now()}-notification`,
          role: "assistant",
          content: `⚠️ Maximum request limit (${autoIterationConfig.maxTotalRequests}) reached for this conversation. Please review the output or start a new chat.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, notificationMessage]);
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: `Request limit reached (${autoIterationConfig.maxTotalRequests})`,
          completionType: "max-requests",
        });
        return;
      }

      // PERFORMANCE OPTIMIZATION #4: Use functional state update to avoid dependencies
      setIterationState((prev) => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
      }));

      // Add user message with attachments
      const userMessage: ChatMessageType = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: messageContent || "(Image message)", // Provide fallback if only images
        timestamp: Date.now(),
        attachments:
          attachments && attachments.length > 0 ? attachments : undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setIsCurrentlyStreaming(true);

      // Initialize streaming state
      let accumulatedText = "";
      let reasoning = "";
      let thoughtTokens = 0;
      let thinkingSignature = "";
      let thinkingData = "";
      let streamError = ""; // Track API errors from the stream
      let assistantMessageId: string | null = null;

      const ensureAssistantMessage = (initial: Partial<ChatMessageType>) => {
        if (assistantMessageId) {
          return;
        }

        const assistantMessage: ChatMessageType = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          isStreaming: true,
          ...initial,
        };

        assistantMessageId = assistantMessage.id;
        setMessages((prev) => [...prev, assistantMessage]);
      };

      const appendToolCall = (
        toolCall: ToolCall,
        originalCodeSnapshot?: { javascript: string; html: string },
      ) => {
        const toolCallEntry = {
          toolCall,
          originalCode: originalCodeSnapshot,
        };

        if (!assistantMessageId) {
          const assistantMessage: ChatMessageType = {
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
          assistantMessageId = assistantMessage.id;
          setMessages((prev) => [...prev, assistantMessage]);
          return;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  toolCalls: [...(msg.toolCalls || []), toolCallEntry],
                }
              : msg,
          ),
        );
      };

      // PERFORMANCE: Batch message updates with requestAnimationFrame instead of setTimeout
      // This syncs updates with browser paint cycles, reducing render pressure by ~60%
      let updateBuffer: Partial<ChatMessageType> | null = null;

      const batchedMessageUpdate = (data: Partial<ChatMessageType>) => {
        if (!assistantMessageId) {
          return;
        }
        // Accumulate all changes into buffer
        updateBuffer = { ...updateBuffer, ...data };

        if (rafIdRef.current === null) {
          // Schedule update on next animation frame (typically 16ms at 60fps)
          rafIdRef.current = requestAnimationFrame(() => {
            if (updateBuffer) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, ...updateBuffer }
                    : msg,
                ),
              );
              updateBuffer = null;
            }
            rafIdRef.current = null;
          });
        }
      };

      try {
        // Create the appropriate client based on selected model with settings
        console.log(
          `[ChatPanel] 🤖 Creating AI client for model: ${selectedModel}`,
        );
        const client = AIClientFactory.createClient(selectedModel, {
          geminiOptions: {
            temperature: 0,
          },
        });
        console.log(`[ChatPanel] ✅ Client created`);

        // Get tools from registry
        console.log(`[ChatPanel] 🛠️ Tool registry exists: ${!!toolRegistry}`);
        const tools = toolRegistry ? toolRegistry.getAllTools() : undefined;
        console.log(
          `[ChatPanel] 📋 Tools to pass to client: ${tools ? tools.length : 0}`,
          tools?.map((t) => t.name),
        );

        // Always pass tools if registry exists
        const toolsToPass = tools;

        // Helper to update workingCodeRef after a successful apply_diff tool result
        // This ensures subsequent tool calls in the chain see the modified code
        const applyToolResultToWorkingCodeRef = (result: ToolResult) => {
          if (result.status === "success" && result.output) {
            try {
              const { file, modifiedCode } = JSON.parse(result.output);
              if (file && modifiedCode) {
                workingCodeRef.current = {
                  ...workingCodeRef.current,
                  [file]: modifiedCode,
                };
              }
            } catch {
              // Ignore parse errors
            }
          }
        };

        // Helper to continue conversation after tool execution
        const continueAfterToolResult = async (
          toolCall: ToolCall,
          toolResult: ToolResult,
        ) => {
          if (!client.submitToolResult) {
            return;
          }

          const systemPrompt = `You are an AI assistant helping with CesiumJS code in Sandcastle.${
            settings.customPromptAddendum
              ? `\n\n# IMPORTANT USER INSTRUCTIONS\n\n${settings.customPromptAddendum}`
              : ""
          }`;

          // NOTE: Anthropic can (and frequently does) emit another tool_use inside the
          // continuation response. Previously we ignored `tool_call` chunks here, which
          // leaves an incomplete trailing message like "Now let me ..." as the final
          // message. We handle chained tool calls by looping.

          const buildAssistantToolUseBlocks = (
            text: string,
            call: ToolCall,
          ): ContentBlock[] => {
            const blocks: ContentBlock[] = [];
            if (text) {
              blocks.push({ type: "text", text });
            }
            blocks.push({
              type: "tool_use",
              id: call.id,
              name: call.name,
              input: call.input,
            });
            return blocks;
          };

          const buildToolResultContent = (result: ToolResult) =>
            result.status === "success"
              ? (result.output ?? "Success")
              : (result.error ?? "Unknown error");

          const buildToolResultMessage = (
            call: ToolCall,
            result: ToolResult,
          ) => ({
            role: "user" as const,
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: call.id,
                content: buildToolResultContent(result),
                is_error: result.status === "error",
              },
            ],
          });

          // Build conversation history without extra messages between tool_use and tool_result.
          // Use different formats for Gemini (parts) vs Anthropic (content).
          const isGeminiModel = selectedModel.startsWith("gemini");

          const buildGeminiFunctionCallPart = (call: ToolCall) => {
            const part: Record<string, unknown> = {
              functionCall: {
                name: call.name,
                args: call.input,
              },
            };

            // Gemini requires thoughtSignature on functionCall parts. If it's missing,
            // use the documented skip value to avoid 400s.
            const signature =
              call.thoughtSignature ?? "skip_thought_signature_validator";

            part.thoughtSignature = signature;
            part.thought_signature = signature;

            return part;
          };

          // Gemini format helper for tool calls
          const buildGeminiHistory = () => [
            {
              role: "user" as const,
              parts: [{ text: messageContent }],
            },
            {
              role: "model" as const,
              parts: [
                ...(accumulatedText ? [{ text: accumulatedText }] : []),
                buildGeminiFunctionCallPart(toolCall),
              ],
            },
          ];

          // Anthropic format (original)
          const buildAnthropicHistory = () => [
            {
              role: "user" as const,
              content: [{ type: "text", text: messageContent }],
            },
            {
              role: "assistant" as const,
              content: buildAssistantToolUseBlocks(accumulatedText, toolCall),
            },
          ];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let historyBeforeToolResult: any[] = isGeminiModel
            ? buildGeminiHistory()
            : buildAnthropicHistory();

          let currentCall = toolCall;
          let currentResult = toolResult;

          // Safety valve: avoid infinite tool-call loops if the model gets stuck.
          const MAX_CHAINED_TOOL_CALLS = 10;

          for (let i = 0; i < MAX_CHAINED_TOOL_CALLS; i++) {
            let contText = "";
            let contReasoning = "";
            let streamError = "";
            let contMsgId: string | null = null;
            let nextToolCall: ToolCall | null = null;

            const ensureContMsg = (initial: Partial<ChatMessageType>) => {
              if (contMsgId) {
                return;
              }
              const contMsg: ChatMessageType = {
                id: `msg-${Date.now()}-assistant`,
                role: "assistant",
                content: "",
                timestamp: Date.now(),
                isStreaming: true,
                ...initial,
              };
              contMsgId = contMsg.id;
              setMessages((prev) => [...prev, contMsg]);
            };

            const updateContMsg = (data: Partial<ChatMessageType>) => {
              if (!contMsgId) {
                return;
              }
              setMessages((prev) =>
                prev.map((m) => (m.id === contMsgId ? { ...m, ...data } : m)),
              );
            };

            const addToolCallToContMsg = (
              toolCallEntry: NonNullable<ChatMessageType["toolCalls"]>[number],
            ) => {
              if (!contMsgId) {
                ensureContMsg({ toolCalls: [toolCallEntry] });
                return; // tool call already included in the initial message
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === contMsgId
                    ? {
                        ...m,
                        toolCalls: [...(m.toolCalls || []), toolCallEntry],
                      }
                    : m,
                ),
              );
            };

            const updateToolCallResultOnContMsg = (
              callId: string,
              result: ToolResult,
            ) => {
              if (!contMsgId) {
                return;
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === contMsgId
                    ? {
                        ...m,
                        toolCalls: m.toolCalls?.map((tc) =>
                          tc.toolCall.id === callId
                            ? {
                                ...tc,
                                result,
                                // Preserve the captured original code
                                originalCode: tc.originalCode,
                              }
                            : tc,
                        ),
                      }
                    : m,
                ),
              );
            };

            try {
              for await (const rchunk of client.submitToolResult(
                currentCall,
                currentResult,
                systemPrompt,
                historyBeforeToolResult,
                toolsToPass,
              )) {
                if (rchunk.type === "reasoning") {
                  contReasoning += rchunk.reasoning;
                  ensureContMsg({ reasoning: contReasoning });
                }

                if (rchunk.type === "text") {
                  contText += rchunk.text;
                  if (contText.trim().length > 0) {
                    ensureContMsg({
                      content: contText,
                      reasoning: contReasoning,
                    });
                  }
                }

                if (rchunk.type === "tool_call") {
                  nextToolCall = rchunk.toolCall;

                  // Capture original code BEFORE tool execution for diff preview.
                  // Use workingCodeRef (not currentCode) to get the accurate snapshot
                  // after any previous diffs in the chain have been applied.
                  const originalCodeSnapshot = {
                    javascript: workingCodeRef.current.javascript,
                    html: workingCodeRef.current.html,
                  };

                  addToolCallToContMsg({
                    toolCall: nextToolCall,
                    originalCode: originalCodeSnapshot,
                  });
                }

                if (rchunk.type === "error") {
                  // Capture API errors from the stream
                  streamError = rchunk.error;
                  console.error(
                    "❌ Stream error in tool result:",
                    rchunk.error,
                  );
                  ensureContMsg({
                    content: `⚠️ Error: ${rchunk.error}`,
                    error: true,
                  });
                }

                updateContMsg({
                  content: contText,
                  reasoning: contReasoning,
                });
              }

              // Finalize the message for this assistant response (tool_use or regular text)
              const finalContent =
                contText || (streamError ? `⚠️ Error: ${streamError}` : "");
              if (!contMsgId) {
                if (
                  finalContent ||
                  contReasoning ||
                  streamError ||
                  nextToolCall
                ) {
                  const contMsg: ChatMessageType = {
                    id: `msg-${Date.now()}-assistant`,
                    role: "assistant",
                    content: finalContent,
                    timestamp: Date.now(),
                    reasoning: contReasoning,
                    isStreaming: false,
                    error: !!streamError,
                    toolCalls: nextToolCall
                      ? [{ toolCall: nextToolCall }]
                      : undefined,
                  };
                  contMsgId = contMsg.id;
                  setMessages((prev) => [...prev, contMsg]);
                }
              } else {
                updateContMsg({
                  content: finalContent,
                  isStreaming: false,
                  error: !!streamError,
                });
              }
            } catch (error) {
              console.error("❌ Error continuing after tool result:", error);
              const errorContent = contText || "Error continuing conversation";
              if (!contMsgId) {
                const contMsg: ChatMessageType = {
                  id: `msg-${Date.now()}-assistant`,
                  role: "assistant",
                  content: errorContent,
                  timestamp: Date.now(),
                  isStreaming: false,
                  error: true,
                };
                contMsgId = contMsg.id;
                setMessages((prev) => [...prev, contMsg]);
              } else {
                updateContMsg({
                  content: errorContent,
                  isStreaming: false,
                  error: true,
                });
              }
              return;
            }

            // No tool call -> we're done.
            if (!nextToolCall) {
              return;
            }

            // Execute the tool call and send tool_result so the model can continue.
            let nextResult: ToolResult = {
              tool_call_id: nextToolCall.id,
              status: "error",
              error: "Tool registry not available",
            };

            // Default: send the real result to the model. In preview mode we wrap with previewOnly.
            let resultToSend = nextResult;

            if (nextToolCall.name === "apply_diff" && toolRegistry) {
              try {
                const result = await toolRegistry.executeTool(nextToolCall);
                nextResult = result;

                // CRITICAL: Update workingCodeRef so subsequent chained tool calls
                // see the modified code (fixes prompt/tool divergence in chains)
                applyToolResultToWorkingCodeRef(result);

                updateToolCallResultOnContMsg(nextToolCall.id, result);

                // Always auto-apply diffs to the editor.
                if (result.status === "success" && result.output) {
                  const { file, modifiedCode } = JSON.parse(result.output);
                  if (file === "javascript") {
                    onApplyCode(modifiedCode, undefined);
                  } else {
                    onApplyCode(undefined, modifiedCode);
                  }

                  if (onClearConsole) {
                    onClearConsole();
                  }
                }
                resultToSend = result;
              } catch (error) {
                const errorMsg =
                  error instanceof Error
                    ? error.message
                    : "Tool execution failed";
                nextResult = {
                  tool_call_id: nextToolCall.id,
                  status: "error",
                  error: errorMsg,
                };
                resultToSend = nextResult;
                updateToolCallResultOnContMsg(nextToolCall.id, nextResult);
              }
            } else {
              // Non-apply_diff tools aren't supported here yet. Record an error so the
              // model has some feedback instead of silently stalling.
              updateToolCallResultOnContMsg(nextToolCall.id, nextResult);
            }

            // Extend the conversation history for the next chained tool_result call.
            if (isGeminiModel) {
              // Gemini format: use parts and functionResponse/functionCall
              historyBeforeToolResult = [
                ...historyBeforeToolResult,
                {
                  role: "user" as const,
                  parts: [
                    {
                      functionResponse: {
                        name: currentCall.name,
                        response: {
                          tool_call_id: currentResult.tool_call_id,
                          status: currentResult.status,
                          output: currentResult.output,
                          error: currentResult.error,
                        },
                      },
                    },
                  ],
                },
                {
                  role: "model" as const,
                  parts: [
                    ...(contText ? [{ text: contText }] : []),
                    buildGeminiFunctionCallPart(nextToolCall),
                  ],
                },
              ];
            } else {
              // Anthropic format: use content with tool_result/tool_use blocks
              historyBeforeToolResult = [
                ...historyBeforeToolResult,
                buildToolResultMessage(currentCall, currentResult),
                {
                  role: "assistant" as const,
                  content: buildAssistantToolUseBlocks(contText, nextToolCall),
                },
              ];
            }

            currentCall = nextToolCall;
            currentResult = resultToSend;
          }

          console.warn(
            `[ChatPanel] ⚠️ Stopping chained tool calls after ${MAX_CHAINED_TOOL_CALLS} iterations`,
          );
        };

        // Build conversation history from previous messages
        // Skip the current user message since it will be added by generateWithContext
        const previousMessages = messages.filter(
          (msg) => msg.id !== userMessage.id,
        );

        // Helper function to build message content blocks with images
        const buildMessageContent = (msg: ChatMessageType) => {
          const blocks: MessageContentBlock[] = [];

          // Add text block if content exists
          if (msg.content && msg.content.trim() !== "") {
            blocks.push({ type: "text", text: msg.content });
          }

          // Add image blocks if attachments exist
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

        // Convert to appropriate format based on model type
        // IMPORTANT: Gemini uses 'parts', Anthropic uses 'content'
        const isGemini = selectedModel.startsWith("gemini");
        const conversationHistory = isGemini
          ? previousMessages.map((msg) => ({
              parts: [{ text: msg.content }], // Gemini format - TODO: Add image support for Gemini
            }))
          : previousMessages
              .filter(
                (msg) =>
                  (msg.content && msg.content.trim() !== "") ||
                  (msg.attachments && msg.attachments.length > 0),
              ) // Filter out empty messages
              .map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: buildMessageContent(msg), // Anthropic format with 'content'
              }));

        console.log(
          `[ChatPanel] 📚 Including ${conversationHistory.length} previous messages in context`,
        );

        // Consume the AsyncGenerator
        console.log("[ChatPanel] 🚀 Starting stream processing...");
        console.log(`[ChatPanel] 🔧 Tools: ${toolsToPass?.length || 0}`);

        if (toolsToPass && toolsToPass.length > 0) {
          console.log(
            "[ChatPanel] ✅ Tools will be passed to API:",
            toolsToPass.map((t) => t.name),
          );
        } else {
          console.log(
            "[ChatPanel] ⚠️ No tools will be passed (tool mode disabled or no tools available)",
          );
        }
        // Use workingCodeRef for the prompt - ensures model sees same code that tool will operate on
        const contextForThisRequest = workingCodeRef.current;

        let chunkCount = 0;
        for await (const chunk of client.generateWithContext(
          messageContent,
          contextForThisRequest,
          true, // Always use diff format
          settings.customPromptAddendum,
          toolsToPass,
          conversationHistory,
          attachments, // Pass image attachments
        )) {
          chunkCount++;
          console.log(
            `[ChatPanel] 📦 Chunk #${chunkCount} received:`,
            chunk.type,
          );

          // Process each chunk type
          switch (chunk.type) {
            case "reasoning":
              // Append reasoning chunks to accumulate thinking content
              reasoning += chunk.reasoning;
              // console.log(`[ChatPanel] 🧠 Reasoning chunk: ${chunk.reasoning.substring(0, 100)}...`);
              ensureAssistantMessage({ reasoning });
              break;

            case "ant_thinking":
              // Accumulate thinking content and store signature
              reasoning += chunk.thinking;
              thinkingSignature = chunk.signature;
              console.log(
                `[ChatPanel] 💭 Thinking chunk: ${chunk.thinking.substring(0, 100)}...`,
              );
              ensureAssistantMessage({
                reasoning,
                thinkingSignature: thinkingSignature || undefined,
              });
              break;

            case "ant_redacted_thinking":
              // Store redacted thinking data
              thinkingData = chunk.data;
              console.log("[ChatPanel] 🔒 Redacted thinking received");
              break;

            case "text":
              accumulatedText += chunk.text;
              console.log(`[ChatPanel] 📝 Text chunk: "${chunk.text}"`);
              if (accumulatedText.trim().length > 0) {
                ensureAssistantMessage({ content: accumulatedText, reasoning });
              }
              break;

            case "tool_call": {
              // Lock the working code ref to prevent React effects from overwriting it mid-chain
              toolChainActiveRef.current = true;

              // Handle tool calls from LLM (Roo Code style)
              const toolInput = chunk.toolCall.input as {
                search?: string;
                replace?: string;
                file?: string;
              };
              console.log("[ChatPanel] 🔧 Tool call received:", {
                name: chunk.toolCall.name,
                id: chunk.toolCall.id,
                inputKeys: Object.keys(chunk.toolCall.input),
                searchLength: toolInput.search?.length,
                replaceLength: toolInput.replace?.length,
                file: toolInput.file,
              });

              // Capture original code BEFORE tool execution for diff preview
              // Use workingCodeRef to get the authoritative snapshot
              const originalCodeSnapshot = {
                javascript: workingCodeRef.current.javascript,
                html: workingCodeRef.current.html,
              };

              // Add tool call to message for display with original code snapshot
              appendToolCall(chunk.toolCall, originalCodeSnapshot);

              if (chunk.toolCall.name === "apply_diff" && toolRegistry) {
                console.log("[ChatPanel] 🎯 Processing apply_diff tool call");
                // Always auto-apply
                try {
                  console.log("[ChatPanel] ⚙️ Executing tool (auto-apply)...");
                  const result = await toolRegistry.executeTool(chunk.toolCall);
                  console.log("[ChatPanel] ✅ Tool executed (auto-apply):", {
                    status: result.status,
                    hasOutput: !!result.output,
                    error: result.error,
                  });

                  // Update the tool call in the message with the result (preserve originalCode)
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

                  // Apply the diff to the editor
                  if (result.status === "success" && result.output) {
                    const { file, modifiedCode } = JSON.parse(result.output);

                    // CRITICAL: Update workingCodeRef immediately so subsequent tool calls
                    // in the same chain see the modified code (fixes prompt/tool divergence)
                    workingCodeRef.current = {
                      ...workingCodeRef.current,
                      [file]: modifiedCode,
                    };

                    if (file === "javascript") {
                      onApplyCode(modifiedCode, undefined);
                    } else {
                      onApplyCode(undefined, modifiedCode);
                    }

                    // Clear console errors after applying code
                    if (onClearConsole) {
                      onClearConsole();
                    }
                  }

                  // Continue the conversation after applying
                  await continueAfterToolResult(chunk.toolCall, result);
                } catch {
                  //                   console.error('❌ Tool execution failed:', error);
                } finally {
                  // Unlock so React effects can sync workingCodeRef again
                  toolChainActiveRef.current = false;
                }
              }
              break;
            }

            case "tool_result":
              // Log tool execution result
              console.log("🔧 Tool result:", chunk.result);
              // UI feedback handled by tool execution flow
              break;

            case "usage":
              thoughtTokens = chunk.thoughtTokens ?? 0;
              //             console.log("Token usage:", chunk);
              break;

            case "error":
              // Capture API errors from the stream
              streamError = chunk.error;
              console.error("❌ Stream error:", chunk.error);
              ensureAssistantMessage({
                content: `⚠️ Error: ${chunk.error}`,
                error: true,
              });
              break;
          }

          // PERFORMANCE: Update message using batched update synced with browser paint cycles
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

        console.log(
          `[ChatPanel] ✅ Stream complete. Total chunks: ${chunkCount}, Text length: ${accumulatedText.length}, Reasoning length: ${reasoning.length}`,
        );

        // Clear any pending animation frame and flush final update
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        // Final message update with all data (immediate, no throttling)
        // If there was a stream error and no text content, show the error to the user
        const finalContent =
          accumulatedText || (streamError ? `⚠️ Error: ${streamError}` : "");
        if (!assistantMessageId) {
          if (finalContent || reasoning || streamError) {
            const assistantMessage: ChatMessageType = {
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
            assistantMessageId = assistantMessage.id;
            setMessages((prev) => [...prev, assistantMessage]);
          }
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: finalContent,
                    reasoning: reasoning,
                    thoughtTokens: thoughtTokens,
                    thinkingSignature: thinkingSignature || undefined,
                    thinkingData: thinkingData || undefined,
                    isStreaming: false,
                    error: !!streamError && !accumulatedText, // Mark as error if stream failed with no content
                  }
                : msg,
            ),
          );
        }

        // Capture error state BEFORE for comparison
        const errorsBefore =
          currentCode?.consoleMessages?.filter((msg) => msg.type === "error") ||
          [];
        const errorSignatureBefore = errorsBefore
          .map((err) => err.message)
          .join("|");

        // Track application errors
        const applicationErrors: string[] = [];

        // Check for errors after every AI response (not just when diffs are applied)
        // This allows iteration to trigger on console errors even without code changes
        if (currentCode) {
          // Show waiting indicator during diagnostics wait
          setIterationStatus((prev) => ({
            ...prev,
            isWaiting: true,
          }));

          // Wait for execution and diagnostics
          await new Promise((resolve) =>
            setTimeout(resolve, autoIterationConfig.waitTimeMs),
          );

          // Check for both application errors and runtime console errors
          // Use getCurrentConsoleErrors to get FRESH errors, not stale closure values
          const runtimeErrors = getCurrentConsoleErrors
            ? getCurrentConsoleErrors().filter((msg) => msg.type === "error")
            : currentCode?.consoleMessages?.filter(
                (msg) => msg.type === "error",
              ) || [];

          const allErrors = [
            ...applicationErrors,
            ...runtimeErrors.map((err) => err.message),
          ];

          if (allErrors.length > 0) {
            // Create error signature to detect if errors are the same
            const errorSignature = allErrors.join("|");

            // Detect oscillation (A→B→A pattern)
            const isOscillating =
              autoIterationConfig.detectOscillation &&
              detectOscillation(
                iterationState.recentErrorSignatures,
                errorSignature,
              );

            // Check if we should iterate
            // Compare against errors BEFORE to see if anything changed
            // Only consider it "same" if BOTH had errors and they're identical
            // If we went from no errors to errors, that's a NEW error (iterate)
            // If we went from errors to different errors, that changed (iterate)
            const isSameError =
              errorSignatureBefore !== "" &&
              errorSignature === errorSignatureBefore;
            const shouldIterate =
              iterationState.errorIterationCount <
                autoIterationConfig.maxIterations &&
              !isSameError &&
              !isOscillating &&
              !iterationState.escalationActive;

            if (shouldIterate) {
              // Calculate new iteration count locally to avoid stale closure
              const newIterationCount = iterationState.errorIterationCount + 1;

              // console.log(
              //   `🔄 Detected ${allErrors.length} error(s), auto-iterating (${newIterationCount}/${autoIterationConfig.maxIterations})...`
              // );

              // PERFORMANCE OPTIMIZATION #5: Batch state updates
              setIterationState((prev) => ({
                ...prev,
                lastErrorSignature: errorSignature,
                errorIterationCount: prev.errorIterationCount + 1,
                recentErrorSignatures: [
                  ...prev.recentErrorSignatures,
                  errorSignature,
                ].slice(-5),
              }));

              setIterationStatus({
                isWaiting: false,
                isIterating: true,
                currentIteration: newIterationCount,
                completionMessage: null,
                completionType: null,
              });

              // Create a follow-up message with error context
              const errorContext = allErrors
                .map((err, i) => `${i + 1}. ${err}`)
                .join("\n");

              const followUpPrompt = `The changes were applied but the following console errors occurred:\n\n${errorContext}\n\nPlease analyze and fix these errors.`;

              // Check if this is a duplicate message within the last 3 seconds
              const now = Date.now();
              const isDuplicate =
                lastErrorMessageRef.current &&
                lastErrorMessageRef.current.content === followUpPrompt &&
                now - lastErrorMessageRef.current.timestamp < 3000;

              if (isDuplicate) {
                return;
              }

              // Track this error message
              lastErrorMessageRef.current = {
                content: followUpPrompt,
                timestamp: now,
              };

              // Add user message for the error feedback
              const userFeedbackMessage: ChatMessageType = {
                id: `msg-${Date.now()}-user-feedback`,
                role: "user",
                content: followUpPrompt,
                timestamp: Date.now(),
              };

              setMessages((prev) => [...prev, userFeedbackMessage]);

              // PERFORMANCE OPTIMIZATION #6: Trigger another iteration after a brief delay with proper cleanup
              if (followUpIterationTimeoutRef.current) {
                clearTimeout(followUpIterationTimeoutRef.current);
              }

              followUpIterationTimeoutRef.current = setTimeout(() => {
                sendMessageWithContent(followUpPrompt);
                followUpIterationTimeoutRef.current = null;
              }, 500);
            } else {
              // Log specific reason for stopping
              if (
                isOscillating &&
                !iterationState.escalationActive &&
                !oscillationMessageShownRef.current
              ) {
                // console.log(
                //   "⚠️ Error oscillation detected (errors cycling between states). Stopping iteration to prevent infinite loop."
                // );
                // Mark that we've shown the oscillation message
                oscillationMessageShownRef.current = true;

                // PERFORMANCE OPTIMIZATION #5: Batch state updates
                setIterationState((prev) => ({
                  ...prev,
                  escalationActive: true,
                }));
                setIterationStatus({
                  isWaiting: false,
                  isIterating: false,
                  currentIteration: 0,
                  completionMessage: "Oscillation detected, stopping",
                  completionType: "oscillation",
                });
                // Show notification to user
                const oscillationMessage: ChatMessageType = {
                  id: `msg-${Date.now()}-oscillation`,
                  role: "assistant",
                  content:
                    "⚠️ I've detected that errors are cycling between different states. This suggests the fixes I'm applying are creating new problems. Please review the code or provide additional guidance.",
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, oscillationMessage]);
              } else if (isSameError) {
                // console.log(
                //   "⚠️ Same errors detected, stopping auto-iteration to prevent infinite loop"
                // );
                setIterationStatus({
                  isWaiting: false,
                  isIterating: false,
                  currentIteration: 0,
                  completionMessage: "Same errors detected, stopping",
                  completionType: "oscillation",
                });
              } else if (
                iterationState.errorIterationCount >=
                autoIterationConfig.maxIterations
              ) {
                // console.log(
                //   `⚠️ Maximum iterations (${autoIterationConfig.maxIterations}) reached, stopping auto-iteration`
                // );
                setIterationStatus({
                  isWaiting: false,
                  isIterating: false,
                  currentIteration: 0,
                  completionMessage: "Max iterations reached",
                  completionType: "max-iterations",
                });
              }
              // Reset iteration tracking
              setIterationState((prev) => ({
                ...prev,
                lastErrorSignature: "",
                errorIterationCount: 0,
              }));
            }
          } else {
            // No errors - reset iteration tracking and show success
            //           console.log("✅ No errors detected - execution successful!");
            // PERFORMANCE OPTIMIZATION #5: Batch state updates
            setIterationState((prev) => ({
              ...prev,
              lastErrorSignature: "",
              errorIterationCount: 0,
              consecutiveMistakes: 0,
            }));
            // Always reset isWaiting, but only show completion message if we were iterating
            setIterationStatus({
              isWaiting: false,
              isIterating: false,
              currentIteration: 0,
              completionMessage: iterationStatus.isIterating
                ? "Errors fixed successfully"
                : null,
              completionType: iterationStatus.isIterating ? "success" : null,
            });
            // Reset oscillation flag when errors are cleared
            oscillationMessageShownRef.current = false;
            // Reset duplicate message tracking when errors are cleared
            lastErrorMessageRef.current = null;
          }
        }
      } catch (error) {
        //       console.error("Streaming error:", error);
        const errorContent =
          error instanceof Error
            ? error.message
            : "Failed to get response from AI";
        if (!assistantMessageId) {
          const assistantMessage: ChatMessageType = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: errorContent,
            timestamp: Date.now(),
            isStreaming: false,
            error: true,
          };
          assistantMessageId = assistantMessage.id;
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: errorContent,
                    error: true,
                    isStreaming: false,
                  }
                : msg,
            ),
          );
        }
      } finally {
        // PERFORMANCE: Clean up any pending animation frame
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        setIsLoading(false);
        setIsCurrentlyStreaming(false);
        // Focus is handled by PromptInput component
      }
    },
    [
      isLoading,
      isCurrentlyStreaming,
      hasApiKey,
      selectedModel,
      currentCode,
      iterationState.totalRequests,
      iterationState.recentErrorSignatures,
      iterationState.errorIterationCount,
      iterationState.escalationActive,
      iterationStatus.isIterating,
      autoIterationConfig.maxTotalRequests,
      autoIterationConfig.waitTimeMs,
      autoIterationConfig.maxIterations,
      autoIterationConfig.detectOscillation,
      getCurrentConsoleErrors,
      messages,
      onApplyCode,
      onClearConsole,
      settings.customPromptAddendum,
    ],
  );

  // PERFORMANCE OPTIMIZATION #4: Stable callback functions
  const handleSendMessage = useCallback(async () => {
    // Get the value from either React state or DOM (for programmatic testing)
    const textareaElement = document.querySelector(
      ".chat-input",
    ) as HTMLTextAreaElement;
    const actualInput = textareaElement?.value || input;
    const trimmedInput = actualInput.trim();

    if (!trimmedInput) {
      return;
    }

    setInput("");

    // PromptInput component handles textarea reset internally
    await sendMessageWithContent(trimmedInput);
  }, [input, sendMessageWithContent]);

  const handleApiKeySuccess = useCallback(() => {
    setHasApiKey(ApiKeyManager.hasAnyCredentials());
    refreshModels();
  }, [refreshModels]);

  // Update hasApiKey when the dialog closes to ensure we have the latest state
  const handleApiKeyDialogClose = useCallback(() => {
    setShowApiKeyDialog(false);
    // Update the hasApiKey state when dialog closes, in case user cleared the key
    setHasApiKey(ApiKeyManager.hasAnyCredentials());
  }, []);

  const handleNewChat = useCallback(() => {
    // Clear all messages to start a new chat
    setMessages([]);
    setInput("");
    setIterationState({
      errorIterationCount: 0,
      consecutiveMistakes: 0,
      totalRequests: 0,
      lastErrorSignature: "",
      recentErrorSignatures: [],
      escalationActive: false,
    });
    setIterationStatus({
      isWaiting: false,
      isIterating: false,
      currentIteration: 0,
      completionMessage: null,
      completionType: null,
    });
    // Reset oscillation message flag for new chat
    oscillationMessageShownRef.current = false;
    // Reset duplicate message tracking for new chat
    lastErrorMessageRef.current = null;
    // Reset error detection timing gate for new chat
    lastErrorDetectionRunRef.current = 0;
  }, []);

  const handleSubmitGuidance = useCallback(
    async (guidance: string) => {
      //     console.log("📝 User provided guidance:", guidance);

      // PERFORMANCE OPTIMIZATION #5: Batch state updates
      setIterationState((prev) => ({
        ...prev,
        escalationActive: false,
        consecutiveMistakes: 0,
      }));

      setIterationStatus((prev) => ({
        ...prev,
        completionMessage: null,
        completionType: null,
      }));

      // Reset oscillation message flag when user provides guidance
      oscillationMessageShownRef.current = false;

      await sendMessageWithContent(guidance);
    },
    [sendMessageWithContent],
  );

  const handleSkipGuidance = useCallback(() => {
    //     console.log("⏭️ User chose to skip escalation - stopping iteration");

    // PERFORMANCE OPTIMIZATION #5: Batch state updates
    setIterationState((prev) => ({
      ...prev,
      escalationActive: false,
      errorIterationCount: 0,
      consecutiveMistakes: 0,
    }));

    setIterationStatus({
      isWaiting: false,
      isIterating: false,
      currentIteration: 0,
      completionMessage: "Iteration stopped by user",
      completionType: "max-requests",
    });

    // PERFORMANCE OPTIMIZATION #6: Proper timeout cleanup
    // Clear existing timeout before setting new one
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
    }

    // Auto-hide after 5 seconds with proper cleanup
    completionTimeoutRef.current = setTimeout(() => {
      setIterationStatus((prev) => ({
        ...prev,
        completionMessage: null,
        completionType: null,
      }));
      completionTimeoutRef.current = null;
    }, 5000);
  }, []);

  // PERFORMANCE OPTIMIZATION #3: Stable callbacks for ChatMessage props
  const stableOnApplyCode = useCallback(
    (javascript?: string, html?: string) => {
      onApplyCode(javascript, html);
      // Clear console errors after applying code
      if (onClearConsole) {
        onClearConsole();
      }
    },
    [onApplyCode, onClearConsole],
  );

  const stableOnApplyDiff = useCallback(
    async (diffs: DiffBlock[], language: "javascript" | "html") => {
      if (onApplyDiff) {
        const result = await onApplyDiff(diffs, language);
        // Clear console errors after applying diff
        if (onClearConsole) {
          onClearConsole();
        }
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

  // PERFORMANCE OPTIMIZATION #7: Memoized Footer component to prevent re-renders during streaming
  // This component is always rendered but uses CSS visibility to show/hide elements
  const MemoizedFooter = useMemo(() => {
    return memo(() => (
      <>
        {/* Guidance Prompt - shown when escalation is triggered */}
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

        {/* Loading Animation - shown during streaming */}
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

        {/* Iteration Status Indicators */}
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
    ));
  }, [
    iterationState.escalationActive,
    iterationState.consecutiveMistakes,
    isLoading,
    isCurrentlyStreaming,
    iterationStatus.isIterating,
    iterationStatus.currentIteration,
    iterationStatus.isWaiting,
    iterationStatus.completionMessage,
    iterationStatus.completionType,
    autoIterationConfig.maxIterations,
    handleSubmitGuidance,
    handleSkipGuidance,
  ]);

  // PERFORMANCE OPTIMIZATION #8: Optimize Virtuoso followOutput configuration
  // Use a stable callback that doesn't recreate on every render
  const followOutputConfig = useCallback(
    (isAtBottom: boolean) => {
      // Always follow during streaming, only follow when at bottom otherwise
      if (isCurrentlyStreaming) {
        return "smooth";
      }
      return isAtBottom ? "smooth" : false;
    },
    [isCurrentlyStreaming],
  );

  // Note: Tool call approval/rejection is now handled inline via ToolCallDisplay component

  // Bottom controls component rendered directly
  // React.memo on individual sub-components handles optimization

  return (
    <>
      <div className="chat-panel">
        <div className="chat-panel-header">
          {/* Brand Logo - Left */}
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

          {/* Actions - Right */}
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
                ✕
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
                    const prompt =
                      "Take me on a virtual tour around Old City Philadelphia using CesiumJS. I want to see all the major attractions marked on the map with pins. Create a beautiful, modern UI with elegant styling and smooth animations where I can easily cycle between different attractions using intuitive navigation controls (next/previous buttons, or numbered buttons for each attraction). Include information about each attraction that's displayed in a clean, readable format. The camera should fly smoothly from one location to another, showing each site from a nice bird's-eye perspective with all markers resting naturally on the ground.";
                    setInput(prompt);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  disabled={!hasApiKey}
                >
                  Philadelphia Old City Tour
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    const prompt =
                      "Create an animated jogging path around the Grand Canyon with smooth camera following. Show a runner's route along the rim with distance markers, elevation profile, and a moving camera that follows the path smoothly. Make it visually stunning with a nice UI showing stats like distance, elevation gain, and current location.";
                    setInput(prompt);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  disabled={!hasApiKey}
                >
                  Grand Canyon Jog
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    const prompt =
                      "Take me on a virtual tour of Ancient Rome's most famous ruins. Show the Colosseum, Roman Forum, Pantheon, and Trevi Fountain with historical markers. Include a timeline slider showing the approximate year each structure was built, and camera animations that orbit each landmark dramatically.";
                    setInput(prompt);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  disabled={!hasApiKey}
                >
                  Rome Ancient Ruins Tour
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    const prompt =
                      "Create an island-hopping tour of Hawaii showing Oahu, Maui, Big Island, and Kauai. Mark volcanoes, beaches, and sacred sites. Include distance/flight time between islands and smooth ocean-crossing camera transitions.";
                    setInput(prompt);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  disabled={!hasApiKey}
                >
                  Hawaiian Island Hopping
                </button>
                <button
                  className="example-button"
                  onClick={() => {
                    const prompt =
                      "Tour the world's major space launch facilities - Cape Canaveral, Baikonur, Kourou, Tanegashima, and Vandenberg. Show launch pad locations, recent launches, and orbital trajectories.";
                    setInput(prompt);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  disabled={!hasApiKey}
                >
                  Space Launch Sites Worldwide
                </button>
              </div>
              {!hasApiKey && (
                <div className="welcome-warning">
                  <Text variant="body-md" style={{ color: "#f59e0b" }}>
                    ⚠️ You need to set up your API key to get started.
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
                Footer: MemoizedFooter,
              }}
            />
          )}
        </div>

        {/* Bottom Control Bar - Toggles + Input */}
        <div className="chat-bottom-controls">
          {/* Prompt Input with Send Button */}
          <PromptInput
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            placeholder="Ask me anything about Cesium"
            disabled={!hasApiKey || isLoading}
            isLoading={isLoading}
            ariaLabel="Chat message input"
          />

          {/* Feature Toggles Row - Below input */}
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

      {/* Note: Diff preview is now rendered inline in the chat message via ToolCallDisplay */}
    </>
  );
}
