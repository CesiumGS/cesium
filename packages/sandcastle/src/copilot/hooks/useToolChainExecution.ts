import { useRef, useEffect, useCallback } from "react";
import type {
  AIModel,
  ChatMessage as ChatMessageType,
  CodeContext,
  ToolCall,
  ToolResult,
  ToolDefinition,
  StreamChunk,
  ConversationHistory,
} from "../ai/types";
import {
  initializeToolRegistry,
  setToolRegistry,
  toolRegistry,
} from "../ai/tools/toolRegistry";
import { AIClientFactory } from "../ai/clients/AIClientFactory";
import { buildGeminiFunctionCallPart } from "../ai/clients/geminiShared";

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
  codeContext: CodeContext;
  onApplyCode: (javascript?: string, html?: string, autoRun?: boolean) => void;
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
  codeContext,
  onApplyCode,
  onClearConsole,
  addMessage,
  updateMessage,
  appendToolCallToMessage,
  updateToolCallResult,
}: UseToolChainExecutionParams) {
  // Authoritative snapshot used for both prompts and tool execution during a chain.
  const workingCodeRef = useRef<CodeContext>(codeContext);
  const toolChainActiveRef = useRef(false);

  // Only resync from props when no tool chain is active, so chained calls see their own edits.
  useEffect(() => {
    if (toolChainActiveRef.current) {
      return;
    }
    workingCodeRef.current = codeContext;
  }, [codeContext]);

  const registryInitializedRef = useRef(false);
  useEffect(() => {
    if (!registryInitializedRef.current && !toolRegistry) {
      registryInitializedRef.current = true;
      const registry = initializeToolRegistry((file: "javascript" | "html") => {
        const ctx = workingCodeRef.current;
        return file === "javascript" ? ctx.javascript : ctx.html;
      });
      setToolRegistry(registry);
    }
  }, []);

  const getTools = useCallback((): ToolDefinition[] | undefined => {
    return toolRegistry ? toolRegistry.getAllTools() : undefined;
  }, []);

  const getWorkingCode = useCallback((): CodeContext => {
    return workingCodeRef.current;
  }, []);

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

      // Update workingCodeRef so subsequent chained calls see the modified code.
      if (result.status === "success" && result.output) {
        try {
          const { file, modifiedCode } = JSON.parse(result.output);
          if (file && modifiedCode) {
            workingCodeRef.current = {
              ...workingCodeRef.current,
              [file]: modifiedCode,
              ...(onClearConsole ? { consoleMessages: [] } : {}),
            };
            if (file === "javascript") {
              onApplyCode(modifiedCode, undefined, false);
            } else {
              onApplyCode(undefined, modifiedCode, false);
            }
            onClearConsole?.();
          }
        } catch (e) {
          // Unparseable success output means the editor never updated; convert
          // to an error so the chat UI and the model's next turn both see the failure.
          console.warn(
            "[useToolChainExecution] Failed to parse tool result output:",
            e,
          );
          return {
            tool_call_id: result.tool_call_id,
            status: "error" as const,
            error: `Tool returned unparseable output: ${e instanceof Error ? e.message : "Unknown parse error"}`,
          };
        }
      }

      return result;
    },
    [onApplyCode, onClearConsole],
  );

  const continueToolChain = useCallback(
    async (
      initialToolCall: ToolCall,
      initialResult: ToolResult,
      client: {
        submitToolResult: (
          call: ToolCall,
          result: ToolResult,
          systemPrompt: string,
          history: ConversationHistory,
          tools?: ToolDefinition[],
          abortSignal?: AbortSignal,
        ) => AsyncGenerator<StreamChunk>;
      },
      systemPrompt: string,
      initialHistory: ConversationHistory,
      selectedModel: string,
      tools?: ToolDefinition[],
      abortSignal?: AbortSignal,
    ) => {
      const isGeminiModel =
        AIClientFactory.getProviderForModel(selectedModel as AIModel) ===
        "gemini";

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
        let wasUserStopped = false;

        const ensureContMsg = (initial: Partial<ChatMessageType>) => {
          if (contMsgId) {
            return;
          }
          const contMsg: ChatMessageType = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            isStreaming: true,
            ...initial,
          };
          contMsgId = contMsg.id;
          addMessage(contMsg);
        };

        try {
          for await (const rchunk of client.submitToolResult(
            currentCall,
            currentResult,
            systemPrompt,
            historyBeforeToolResult as ConversationHistory,
            tools,
            abortSignal,
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
              if (rchunk.error === "Request stopped by user") {
                wasUserStopped = true;
                break;
              }
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

          const finalContent =
            contText || (streamError ? `Error: ${streamError}` : "");
          if (!contMsgId) {
            if (finalContent || contReasoning || streamError || nextToolCall) {
              const contMsg: ChatMessageType = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: finalContent,
                timestamp: Date.now(),
                reasoning: contReasoning,
                isStreaming: false,
                error: !!streamError && !wasUserStopped,
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
              error: !!streamError && !wasUserStopped,
            });
          }
        } catch (error) {
          console.warn(
            "[useToolChainExecution] Error in tool chain continuation:",
            error,
          );
          const detail =
            error instanceof Error ? error.message : "Unknown error";
          const errorContent =
            contText || `Error continuing conversation: ${detail}`;
          if (!contMsgId) {
            const contMsg: ChatMessageType = {
              id: crypto.randomUUID(),
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

        if (wasUserStopped) {
          if (!contMsgId) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "(Response stopped by user)",
              timestamp: Date.now(),
              isStreaming: false,
            });
          }
          return;
        }

        if (!nextToolCall) {
          // Model answered in text with no further tool call; finalize so the
          // typing indicator stops.
          if (contMsgId) {
            updateMessage(contMsgId, {
              content: contText,
              reasoning: contReasoning,
              isStreaming: false,
            });
          }
          return;
        }

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

        if (isGeminiModel) {
          historyBeforeToolResult = [
            ...historyBeforeToolResult,
            {
              role: "user" as const,
              parts: [
                {
                  functionResponse: {
                    name: currentCall.name,
                    // Coalesce undefineds to empty strings; some Gemini API versions reject missing keys.
                    response: {
                      tool_call_id: currentResult.tool_call_id,
                      status: currentResult.status,
                      output: currentResult.output ?? "",
                      error: currentResult.error ?? "",
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

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Reached maximum tool chain limit (${MAX_CHAINED_TOOL_CALLS} calls). Some changes may not have been applied.`,
        timestamp: Date.now(),
        isStreaming: false,
      });
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
