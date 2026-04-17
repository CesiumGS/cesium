import { useRef, useEffect, useState } from "react";
import { unstable_AccordionItem as AccordionItem } from "@stratakit/structures";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
  isWaitingForNextStep?: boolean;
}

export function ThinkingBlock({
  content,
  isStreaming = false,
  isWaitingForNextStep = false,
}: ThinkingBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [isReasoningActive, setIsReasoningActive] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  useEffect(() => {
    const timeoutIds: number[] = [];

    if (isStreaming) {
      timeoutIds.push(window.setTimeout(() => setIsReasoningActive(true), 0));
      timeoutIds.push(
        window.setTimeout(() => setIsReasoningActive(false), 700),
      );
    } else {
      timeoutIds.push(window.setTimeout(() => setIsReasoningActive(false), 0));
    }

    return () => {
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [content, isStreaming]);

  const showActiveLabel = isReasoningActive || isWaitingForNextStep;

  const statusLabel = isReasoningActive
    ? "Thinking"
    : isWaitingForNextStep
      ? "Working"
      : "Thought process";

  return (
    <AccordionItem.Root defaultOpen={isStreaming}>
      <AccordionItem.Header>
        <AccordionItem.Button>
          <AccordionItem.Marker />
          <AccordionItem.Label>
            {showActiveLabel ? (
              <>
                {statusLabel}{" "}
                <span
                  className="message-typing-dots thinking-status-dots"
                  aria-hidden="true"
                >
                  <span className="message-typing-dot"></span>
                  <span className="message-typing-dot"></span>
                  <span className="message-typing-dot"></span>
                </span>
              </>
            ) : (
              statusLabel
            )}
          </AccordionItem.Label>
        </AccordionItem.Button>
      </AccordionItem.Header>
      <AccordionItem.Content>
        <pre
          ref={preRef}
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "var(--stratakit-font-family-mono)",
            fontSize: "var(--stratakit-font-size-12)",
            maxHeight: "400px",
            overflow: "auto",
            margin: 0,
            padding: "var(--stratakit-space-x3)",
          }}
        >
          {content}
        </pre>
      </AccordionItem.Content>
    </AccordionItem.Root>
  );
}
