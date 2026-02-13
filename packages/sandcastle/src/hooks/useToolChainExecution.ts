import { useRef, useEffect, useCallback } from "react";
import type {
  ChatMessage as ChatMessageType,
  CodeContext,
  ToolCall,
  ToolResult,
  ToolDefinition,
  StreamChunk,
  ConversationHistory,
} from "../AI/types";
import {
  initializeToolRegistry,
  setToolRegistry,
  toolRegistry,
} from "../AI/tools/toolRegistry";

// Type for content blocks in conversation history
type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    };

const MAX_CHAINED_TOOL_CALLS = 10;

interface UseToolChainExecutionParams {
  currentCode?: CodeContext;
  codeContext: CodeContext;
  onApplyCode: (javascript?: string, html?: string) => void;
  onClearConsole?: () => void;
  addMessage: (msg: ChatMessageType) => void;
  updateMessage: (id: string, data: Partial<ChatMessageType>) => void;
  appendToolCallToMessage: (
    id: string,
    entry: NonNullable<ChatMessageType["toolCalls"]>[number],
  ) => void;
  updateToolCallResult: (
    msgId: string,
    callId: string,
    result: ToolResult,
  ) => void;
}

export function useToolChainExecution({
  currentCode,
  codeContext,
  onApplyCode,
  onClearConsole,
  addMessage,
  updateMessage,
  appendToolCallToMessage,
  updateToolCallResult,
}: UseToolChainExecutionParams) {
  // Working code ref: authoritative snapshot used for both prompts AND tool execution
  const workingCodeRef = useRef<CodeContext>(currentCode ?? codeContext);
  const toolChainActiveRef = useRef(false);

  // Keep workingCodeRef synced when NOT in an active tool chain
  useEffect(() => {
    if (toolChainActiveRef.current) {
      return;
    }
    workingCodeRef.current = currentCode ?? codeContext;
  }, [currentCode, codeContext]);

  // Initialize tool registry once
  useEffect(() => {
    if (!toolRegistry) {
      const registry = initializeToolRegistry((file: "javascript" | "html") => {
        const ctx = workingCodeRef.current;
        return file === "javascript" ? ctx.javascript : ctx.html;
      });
      setToolRegistry(registry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolRegistry]);

  const getTools = useCallback((): ToolDefinition[] | undefined => {
    return toolRegistry ? toolRegistry.getAllTools() : undefined;
  }, []);

  const getWorkingCode = useCallback((): CodeContext => {
    return workingCodeRef.current;
  }, []);

  /**
   * Execute a single tool call and apply the result to the editor.
   */
  const executeToolCall = useCallback(
    async (toolCall: ToolCall): Promise<ToolResult> => {
      if (toolCall.name !== "apply_diff" || !toolRegistry) {
        return {
          tool_call_id: toolCall.id,
          status: "error",
          error: "Tool registry not available",
        };
      }

      const result = await toolRegistry.executeTool(toolCall);

      // Update workingCodeRef so subsequent chained calls see modified code
      if (result.status === "success" && result.output) {
        try {
          const { file, modifiedCode } = JSON.parse(result.output);
          if (file && modifiedCode) {
            workingCodeRef.current = {
              ...workingCodeRef.current,
              [file]: modifiedCode,
            };
            if (file === "javascript") {
              onApplyCode(modifiedCode, undefined);
            } else {
              onApplyCode(undefined, modifiedCode);
            }
            onClearConsole?.();
          }
        } catch {
          // Ignore parse errors
        }
      }

      return result;
    },
    [onApplyCode, onClearConsole],
  );

  /**
   * Continue conversation after tool execution, handling chained tool calls.
   */
  const continueToolChain = useCallback(
    async (
      initialToolCall: ToolCall,
      initialResult: ToolResult,
      client: {
        submitToolResult?: (
          call: ToolCall,
          result: ToolResult,
          systemPrompt: string,
          history: ConversationHistory,
          tools?: ToolDefinition[],
        ) => AsyncGenerator<StreamChunk>;
      },
      systemPrompt: string,
      initialHistory: ConversationHistory,
      selectedModel: string,
      _messageContent: string,
      _accumulatedText: string,
      tools?: ToolDefinition[],
    ) => {
      const isGeminiModel = selectedModel.startsWith("gemini");

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

      const buildToolResultMessage = (call: ToolCall, result: ToolResult) => ({
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

      const buildGeminiFunctionCallPart = (call: ToolCall) => {
        const signature =
          call.thoughtSignature ?? "skip_thought_signature_validator";
        return {
          functionCall: {
            name: call.name,
            args: call.input,
          },
          thoughtSignature: signature,
          thought_signature: signature,
        };
      };

      // Use unknown[] internally since we extend with provider-specific shapes
      let historyBeforeToolResult: unknown[] = [...initialHistory];

      let currentCall = initialToolCall;
      let currentResult = initialResult;

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
          addMessage(contMsg);
        };

        if (!client.submitToolResult) {
          return;
        }

        try {
          for await (const rchunk of client.submitToolResult(
            currentCall,
            currentResult,
            systemPrompt,
            historyBeforeToolResult as ConversationHistory,
            tools,
          )) {
            if (rchunk.type === "reasoning") {
              contReasoning += rchunk.reasoning;
              ensureContMsg({ reasoning: contReasoning });
            }
            if (rchunk.type === "text") {
              contText += rchunk.text;
              if (contText.trim().length > 0) {
                ensureContMsg({ content: contText, reasoning: contReasoning });
              }
            }
            if (rchunk.type === "tool_call") {
              nextToolCall = rchunk.toolCall;
              const originalCodeSnapshot = {
                javascript: workingCodeRef.current.javascript,
                html: workingCodeRef.current.html,
              };
              if (contMsgId) {
                appendToolCallToMessage(contMsgId, {
                  toolCall: nextToolCall,
                  originalCode: originalCodeSnapshot,
                });
              } else {
                ensureContMsg({
                  toolCalls: [
                    {
                      toolCall: nextToolCall,
                      originalCode: originalCodeSnapshot,
                    },
                  ],
                });
              }
            }
            if (rchunk.type === "error") {
              streamError = rchunk.error;
              ensureContMsg({
                content: `Error: ${rchunk.error}`,
                error: true,
              });
            }
            if (contMsgId) {
              updateMessage(contMsgId, {
                content: contText,
                reasoning: contReasoning,
              });
            }
          }

          // Finalize message
          const finalContent =
            contText || (streamError ? `Error: ${streamError}` : "");
          if (!contMsgId) {
            if (finalContent || contReasoning || streamError || nextToolCall) {
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
              addMessage(contMsg);
            }
          } else {
            updateMessage(contMsgId, {
              content: finalContent,
              isStreaming: false,
              error: !!streamError,
            });
          }
        } catch {
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
            addMessage(contMsg);
          } else {
            updateMessage(contMsgId, {
              content: errorContent,
              isStreaming: false,
              error: true,
            });
          }
          return;
        }

        if (!nextToolCall) {
          return;
        }

        // Execute chained tool call
        let nextResult: ToolResult;
        try {
          nextResult = await executeToolCall(nextToolCall);
          if (contMsgId) {
            updateToolCallResult(contMsgId, nextToolCall.id, nextResult);
          }
        } catch (error) {
          nextResult = {
            tool_call_id: nextToolCall.id,
            status: "error",
            error:
              error instanceof Error ? error.message : "Tool execution failed",
          };
          if (contMsgId) {
            updateToolCallResult(contMsgId, nextToolCall.id, nextResult);
          }
        }

        // Extend conversation history
        if (isGeminiModel) {
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
        currentResult = nextResult;
      }

      console.warn(
        `[useToolChainExecution] Stopping chained tool calls after ${MAX_CHAINED_TOOL_CALLS} iterations`,
      );
    },
    [
      addMessage,
      updateMessage,
      appendToolCallToMessage,
      updateToolCallResult,
      executeToolCall,
    ],
  );

  const lockToolChain = useCallback(() => {
    toolChainActiveRef.current = true;
  }, []);

  const unlockToolChain = useCallback(() => {
    toolChainActiveRef.current = false;
  }, []);

  return {
    workingCodeRef,
    getTools,
    getWorkingCode,
    executeToolCall,
    continueToolChain,
    lockToolChain,
    unlockToolChain,
  };
}
