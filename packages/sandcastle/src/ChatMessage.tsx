import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, IconButton } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import type { ChatMessage as ChatMessageType, DiffBlock } from "./AI/types";
import { EditParser } from "./AI/EditParser";
import { DiffPreview } from "./DiffPreview";
import { DiffApplier } from "./AI/DiffApplier";
import { ThinkingBlock } from "./components/ThinkingBlock";
import { StreamingDiffPreview } from "./StreamingDiffPreview";
import { ToolCallDisplay } from "./components/ToolCallDisplay";
import { useMemo, useState, memo, useCallback } from "react";
import { aiSparkle, developer, copy } from "./icons";
import "./ChatMessage.css";

/**
 * Represents a partial diff that is currently streaming
 */
export interface PartialDiff {
  /** Language of the file being modified */
  language: "javascript" | "html";
  /** SEARCH content (may be partial while streaming) */
  searchContent: string;
  /** REPLACE content (may be partial while streaming) */
  replaceContent: string;
  /** State of the streaming diff */
  state: "searching" | "replacing" | "complete";
}

interface ChatMessageProps {
  message: ChatMessageType;
  onApplyCode?: (javascript?: string, html?: string) => void;
  onApplyDiff?: (diffs: DiffBlock[], language: "javascript" | "html") => void;
  currentCode?: { javascript: string; html: string };
  /** Map of diffIndex to partial streaming diffs */
  streamingDiffs?: Map<number, PartialDiff>;
}

/**
 * PERFORMANCE OPTIMIZATION: Memoize ChatMessage component
 * Prevents unnecessary re-renders when parent state changes but props remain the same
 */
export const ChatMessage = memo(function ChatMessage({
  message,
  onApplyCode,
  onApplyDiff,
  currentCode,
  streamingDiffs,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  // State for tracking rejected diffs, applied diffs, and applying state
  const [rejectedDiffs, setRejectedDiffs] = useState<Set<string>>(new Set());
  const [appliedDiffs, setAppliedDiffs] = useState<Set<string>>(new Set());
  const [applyingDiffs, setApplyingDiffs] = useState<{
    javascript: boolean;
    html: boolean;
  }>({ javascript: false, html: false });
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Parse the message and clean markdown (removes raw diff blocks)
  const { cleanedMarkdown, parsedResponse } = useMemo(() => {
    if (isUser) {
      return {
        cleanedMarkdown: message.content,
        parsedResponse: { codeBlocks: [], diffEdits: [] },
      };
    }
    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(
      message.content,
    );
    return { cleanedMarkdown, parsedResponse: parsed };
  }, [message.content, isUser]);

  const hasApplicableCode = parsedResponse.codeBlocks.length > 0;
  const hasDiffs = parsedResponse.diffEdits.length > 0;

  // Treat message as streaming if the flag is set or streaming diff content exists
  const isMessageStreaming =
    message.isStreaming === true ||
    (streamingDiffs !== undefined && streamingDiffs.size > 0);

  // Detect incomplete code fences so we can suppress empty code blocks until content arrives
  const hasIncompleteCodeFence = useMemo(() => {
    if (!cleanedMarkdown) {
      return false;
    }

    const fenceOpenings = ["```javascript", "```js", "```html"];
    for (const fence of fenceOpenings) {
      const lastIndex = cleanedMarkdown.lastIndexOf(fence);
      if (lastIndex !== -1) {
        const remainder = cleanedMarkdown.slice(lastIndex + fence.length);
        if (!remainder.includes("```")) {
          return true;
        }
      }
    }

    const allFences = cleanedMarkdown.match(/```/g);
    return allFences !== null && allFences.length % 2 !== 0;
  }, [cleanedMarkdown]);

  const computeModifiedCode = useMemo(() => {
    if (!currentCode) {
      return { javascript: "", html: "" };
    }

    const result = {
      javascript: currentCode.javascript,
      html: currentCode.html,
    };

    for (const diffEdit of parsedResponse.diffEdits) {
      const activeDiffs = diffEdit.diffs.filter(
        (diff) => !rejectedDiffs.has(JSON.stringify(diff)),
      );
      if (activeDiffs.length === 0) {
        continue;
      }

      const applier = new DiffApplier();
      const sourceCode =
        diffEdit.language === "javascript"
          ? currentCode.javascript
          : currentCode.html;

      const applyResult = applier.applyDiffs(
        sourceCode,
        activeDiffs.map((d) => d.block),
        { strict: false },
      );

      if (applyResult.success && applyResult.modifiedCode) {
        if (diffEdit.language === "javascript") {
          result.javascript = applyResult.modifiedCode;
        } else {
          result.html = applyResult.modifiedCode;
        }
      }
    }

    return result;
  }, [currentCode, parsedResponse.diffEdits, rejectedDiffs]);

  const handleApply = () => {
    if (!onApplyCode) {
      return;
    }

    let jsCode: string | undefined;
    let htmlCode: string | undefined;

    for (const block of parsedResponse.codeBlocks) {
      if (block.language === "javascript") {
        jsCode = block.code;
      } else if (block.language === "html") {
        htmlCode = block.code;
      }
    }

    if (jsCode || htmlCode) {
      onApplyCode(jsCode, htmlCode);
    }
  };

  const handleApplyDiff = useCallback(
    async (
      diffs: DiffBlock[],
      language: "javascript" | "html",
      parsedDiffs: (typeof parsedResponse.diffEdits)[0]["diffs"],
    ) => {
      if (!onApplyDiff) {
        return;
      }

      // Set applying state
      setApplyingDiffs((prev) => ({ ...prev, [language]: true }));

      try {
        await onApplyDiff(diffs, language);

        // Mark these diffs as applied
        setAppliedDiffs((prev) => {
          const next = new Set(prev);
          for (const diff of parsedDiffs) {
            next.add(JSON.stringify(diff));
          }
          return next;
        });
      } catch (error) {
        console.error("Error applying diffs:", error);
      } finally {
        // Clear applying state
        setApplyingDiffs((prev) => ({ ...prev, [language]: false }));
      }
    },
    // parsedResponse is only used for TypeScript type inference (typeof), not as a runtime dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onApplyDiff],
  );

  const handleRejectDiff = (
    parsedDiffs: (typeof parsedResponse.diffEdits)[0]["diffs"],
  ) => {
    setRejectedDiffs((prev) => {
      const next = new Set(prev);
      for (const diff of parsedDiffs) {
        next.add(JSON.stringify(diff));
      }
      return next;
    });
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedToClipboard(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // Determine if there's any visible content to show
  const hasVisibleContent =
    isUser || // User messages always have content
    cleanedMarkdown.trim().length > 0 || // Has text content
    message.reasoning || // Has thinking/reasoning
    (message.toolCalls && message.toolCalls.length > 0) || // Has tool calls
    (message.attachments && message.attachments.length > 0) || // Has attachments
    message.error; // Has error to display

  // Don't render empty assistant messages while streaming
  // This prevents blank message bubbles from appearing
  if (!isUser && !hasVisibleContent && message.isStreaming) {
    return null;
  }

  return (
    <div className={`chat-message ${isUser ? "user-message" : "ai-message"}`}>
      <div className="message-icon">
        <Icon href={isUser ? developer : aiSparkle} />
      </div>
      <div className="message-body">
        <div className="message-header">
          <span className="message-role">{isUser ? "You" : "Copilot"}</span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {!isUser && (
            <IconButton
              label={copiedToClipboard ? "Copied!" : "Copy markdown"}
              icon={copy}
              variant="ghost"
              onClick={handleCopyMarkdown}
            />
          )}
        </div>

        {/* Image Attachments - displays images in user messages */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="message-attachment-image">
                <img
                  src={`data:${attachment.mimeType};base64,${attachment.base64Data}`}
                  alt={attachment.name}
                  title={attachment.name}
                  loading="lazy"
                />
                <div className="message-attachment-info">
                  {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                  {attachment.width && attachment.height && (
                    <span>
                      {" "}
                      • {attachment.width}×{attachment.height}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Thinking Block - shows AI reasoning before message content */}
        {message.reasoning && (
          <ThinkingBlock
            content={message.reasoning}
            isStreaming={message.isStreaming ?? false}
          />
        )}

        {/* Only render message content once streaming completes to avoid empty placeholders */}
        {cleanedMarkdown.trim().length > 0 &&
          !isMessageStreaming &&
          !hasIncompleteCodeFence && (
            <div className="message-content">
              {message.error ? (
                <div className="message-error">
                  <span>⚠️ Error: {message.content}</span>
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props) {
                      const { children, className, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      ) : (
                        <code className="inline-code" {...rest}>
                          {children}
                        </code>
                      );
                    },
                    // Prevent task list checkboxes from rendering (fixes CES-9)
                    // During streaming, partial markdown like "[ ]" from JS arrays
                    // can be misinterpreted as task list syntax by remark-gfm
                    input(props) {
                      // Don't render checkboxes from task lists
                      if (props.type === "checkbox") {
                        return null;
                      }
                      return <input {...props} />;
                    },
                  }}
                >
                  {cleanedMarkdown}
                </ReactMarkdown>
              )}
            </div>
          )}

        {/* Tool Calls - displays tool invocations by the AI */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="message-tool-calls">
            {message.toolCalls.map((toolCallItem, index) => (
              <ToolCallDisplay
                key={toolCallItem.toolCall.id || index}
                toolName={toolCallItem.toolCall.name}
                input={toolCallItem.toolCall.input}
                status={
                  toolCallItem.result
                    ? toolCallItem.result.status === "success"
                      ? "success"
                      : "error"
                    : "pending"
                }
                result={toolCallItem.result}
                currentCode={currentCode}
              />
            ))}
          </div>
        )}

        {/* Raw diff accordions hidden - user sees beautiful diff preview instead */}

        {/* Existing code blocks functionality */}
        {hasApplicableCode && onApplyCode && (
          <div className="message-actions">
            <Button onClick={handleApply}>Apply Changes</Button>
          </div>
        )}

        {/* Show streaming diff previews while message is streaming */}
        {streamingDiffs && streamingDiffs.size > 0 && (
          <div className="message-streaming-diffs">
            {Array.from(streamingDiffs.entries()).map(
              ([diffIndex, partialDiff]) => (
                <StreamingDiffPreview
                  key={diffIndex}
                  diffIndex={diffIndex}
                  language={partialDiff.language}
                  searchContent={partialDiff.searchContent}
                  replaceContent={partialDiff.replaceContent}
                  isComplete={partialDiff.state === "complete"}
                  isStreaming={partialDiff.state !== "complete"}
                />
              ),
            )}
          </div>
        )}

        {/* Show inline diff previews for completed messages */}
        {hasDiffs && onApplyDiff && currentCode && !message.isStreaming && (
          <div className="message-diff-previews">
            {parsedResponse.diffEdits.map((diffEdit, index) => {
              const activeDiffs = diffEdit.diffs.filter(
                (diff) => !rejectedDiffs.has(JSON.stringify(diff)),
              );

              if (activeDiffs.length === 0) {
                return null;
              }

              // Check if all diffs in this edit have been applied
              const allApplied = activeDiffs.every((diff) =>
                appliedDiffs.has(JSON.stringify(diff)),
              );

              const language = diffEdit.language;
              const originalCode = currentCode[language];
              const modifiedCode = computeModifiedCode[language];

              return (
                <DiffPreview
                  key={`${language}-${index}`}
                  originalCode={originalCode}
                  modifiedCode={modifiedCode}
                  language={language}
                  fileName={`${language === "javascript" ? "JavaScript" : "HTML"} Changes`}
                  onApply={() =>
                    handleApplyDiff(
                      activeDiffs.map((d) => d.block),
                      language,
                      activeDiffs,
                    )
                  }
                  onReject={() => handleRejectDiff(activeDiffs)}
                  isApplying={applyingDiffs[language]}
                  isApplied={allApplied}
                />
              );
            })}
          </div>
        )}

        {/* Show inline diff previews for tool call results (apply_diff tool) */}
        {message.toolCalls &&
          message.toolCalls.length > 0 &&
          currentCode &&
          !message.isStreaming && (
            <div className="message-diff-previews">
              {message.toolCalls
                .filter(
                  (tc) =>
                    tc.toolCall.name === "apply_diff" &&
                    tc.result?.status === "success" &&
                    tc.result.output,
                )
                .map((toolCallItem, index) => {
                  try {
                    const { file, modifiedCode } = JSON.parse(
                      toolCallItem.result!.output!,
                    );
                    const language = file as "javascript" | "html";
                    // Use the captured originalCode from before tool execution, not current code
                    const originalCode =
                      toolCallItem.originalCode?.[language] ??
                      currentCode[language];

                    return (
                      <DiffPreview
                        key={`tool-${toolCallItem.toolCall.id}-${index}`}
                        originalCode={originalCode}
                        modifiedCode={modifiedCode}
                        language={language}
                        fileName={`${language === "javascript" ? "JavaScript" : "HTML"} Changes`}
                        onApply={() => {}} // Already applied if auto-apply is on
                        onReject={() => {}} // Already applied if auto-apply is on
                        isApplying={false}
                        isApplied={true} // Tool calls are auto-applied
                        theme="dark"
                        mode="inline"
                      />
                    );
                  } catch (error) {
                    console.error("Failed to render tool call diff:", error);
                    return null;
                  }
                })}
            </div>
          )}

        {/* Error message if diffs present but no currentCode */}
        {hasDiffs && onApplyDiff && !currentCode && (
          <div className="message-error">
            <span>
              ⚠️ Cannot preview diffs: current code context not available
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
