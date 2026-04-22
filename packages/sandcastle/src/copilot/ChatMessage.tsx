import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconButton, Text } from "@stratakit/bricks";
import type { ChatMessage as ChatMessageType, CodeContext } from "./ai/types";
import { SimpleDiffPreview } from "./diff-preview/SimpleDiffPreview";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { useMemo, useState, memo, useRef, useEffect } from "react";
import { copy } from "../icons";
import "./ChatMessage.css";

interface ChatMessageProps {
  message: ChatMessageType;
  codeContext?: CodeContext;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  codeContext,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(copiedTimeoutRef.current);
  }, []);

  const isMessageStreaming = message.isStreaming === true;

  // Suppress empty code blocks until the closing fence arrives.
  const hasIncompleteCodeFence = useMemo(() => {
    if (!message.content) {
      return false;
    }

    const fenceOpenings = ["```javascript", "```js", "```html"];
    for (const fence of fenceOpenings) {
      const lastIndex = message.content.lastIndexOf(fence);
      if (lastIndex !== -1) {
        const remainder = message.content.slice(lastIndex + fence.length);
        if (!remainder.includes("```")) {
          return true;
        }
      }
    }

    const allFences = message.content.match(/```/g);
    return allFences !== null && allFences.length % 2 !== 0;
  }, [message.content]);

  const hasRenderableMarkdown =
    message.content.trim().length > 0 &&
    !isMessageStreaming &&
    !hasIncompleteCodeFence;
  const hasPostReasoningContent =
    hasRenderableMarkdown ||
    (message.toolCalls !== undefined && message.toolCalls.length > 0) ||
    message.error === true;
  const isWaitingForNextReasoningStep =
    message.reasoning !== undefined &&
    message.reasoning.length > 0 &&
    message.isStreaming === true &&
    !hasPostReasoningContent;

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedToClipboard(true);
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(
        () => setCopiedToClipboard(false),
        2000,
      );
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const hasVisibleContent = Boolean(
    isUser ||
    hasRenderableMarkdown ||
    message.reasoning ||
    (message.toolCalls && message.toolCalls.length > 0) ||
    (message.attachments && message.attachments.length > 0),
  );

  useEffect(() => {
    if (!isUser && message.isStreaming && !hasVisibleContent) {
      setShowTypingIndicator(false);
      const timeoutId = window.setTimeout(() => {
        setShowTypingIndicator(true);
      }, 400);

      return () => window.clearTimeout(timeoutId);
    }

    setShowTypingIndicator(false);
  }, [hasVisibleContent, isUser, message.id, message.isStreaming]);

  const shouldRenderTypingIndicator =
    !isUser && !hasVisibleContent && message.isStreaming && showTypingIndicator;
  const canCopyMarkdown = !isUser && hasRenderableMarkdown;
  const hasStructuredContent = Boolean(
    message.toolCalls && message.toolCalls.length > 0,
  );

  // Hide empty assistant bubbles while streaming so they don't flash blank.
  if (
    !isUser &&
    !hasVisibleContent &&
    message.isStreaming &&
    !shouldRenderTypingIndicator
  ) {
    return null;
  }

  const existingMessageBody = (
    <div
      className={`chat-message ${isUser ? "user-message" : "ai-message"} ${hasStructuredContent ? "structured-message" : ""}`}
    >
      <div className="message-body">
        <div className="message-header">
          <div className="message-meta">
            <span className="message-role">{isUser ? "You" : "Copilot"}</span>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          {canCopyMarkdown && (
            <IconButton
              label={copiedToClipboard ? "Copied!" : "Copy markdown"}
              icon={copy}
              variant="ghost"
              onClick={handleCopyMarkdown}
            />
          )}
        </div>

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

        {message.reasoning && (
          <ThinkingBlock
            key={`thinking-${message.id}`}
            content={message.reasoning}
            isStreaming={message.isStreaming ?? false}
            isWaitingForNextStep={isWaitingForNextReasoningStep}
          />
        )}

        {shouldRenderTypingIndicator && (
          <div
            className="message-typing-indicator"
            role="status"
            aria-live="polite"
          >
            <span className="message-typing-label">Thinking</span>
            <span className="message-typing-dots" aria-hidden="true">
              <span className="message-typing-dot"></span>
              <span className="message-typing-dot"></span>
              <span className="message-typing-dot"></span>
            </span>
          </div>
        )}

        {hasRenderableMarkdown && (
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
                  // CES-9: remark-gfm can misread streaming "[ ]" from JS arrays as a task list.
                  input(props) {
                    if (props.type === "checkbox") {
                      return null;
                    }
                    return <input {...props} />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="message-tool-calls">
            {message.toolCalls.map((toolCallItem, index) => (
              <ToolCallDisplay
                key={`tool-${message.id}-${toolCallItem.toolCall.id || index}`}
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
              />
            ))}
          </div>
        )}

        {message.toolCalls &&
          message.toolCalls.length > 0 &&
          codeContext &&
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
                    // Use the pre-tool snapshot so the diff reflects what the tool actually saw.
                    const originalCode =
                      toolCallItem.originalCode?.[language] ??
                      codeContext[language];

                    return (
                      <SimpleDiffPreview
                        key={`tool-${toolCallItem.toolCall.id}-${index}`}
                        originalCode={originalCode}
                        modifiedCode={modifiedCode}
                        language={language}
                        fileName={`${language === "javascript" ? "JavaScript" : "HTML"} Changes`}
                        onApply={() => {}}
                        onReject={() => {}}
                        isApplied={true}
                      />
                    );
                  } catch (error) {
                    console.error("Failed to render tool call diff:", error);
                    return null;
                  }
                })}
            </div>
          )}
      </div>
    </div>
  );

  if (message.autoFix) {
    const { attempt, maxAttempts, status } = message.autoFix;

    let suffix = "";
    if (status === "success") {
      suffix = " — Fixed";
    } else if (status === "stalled") {
      suffix = " — Stalled";
    } else if (status === "capped") {
      suffix = " — Gave up";
    }

    return (
      <div>
        <Text
          variant="body-sm"
          style={{ display: "block", marginBottom: "0.5rem" }}
        >
          Auto-fix attempt {attempt}/{maxAttempts}
          {suffix}
        </Text>
        {existingMessageBody}
      </div>
    );
  }

  return existingMessageBody;
});
