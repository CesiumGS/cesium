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
  const [thinkingDotCount, setThinkingDotCount] = useState(3);
  const [isReasoningActive, setIsReasoningActive] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setIsReasoningActive(false);
      return;
    }

    setIsReasoningActive(true);
    const timeoutId = window.setTimeout(() => {
      setIsReasoningActive(false);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [content, isStreaming]);

  const showActiveLabel = isReasoningActive || isWaitingForNextStep;

  useEffect(() => {
    if (!showActiveLabel) {
      setThinkingDotCount(3);
      return;
    }

    const intervalId = window.setInterval(() => {
      setThinkingDotCount((current) => (current % 3) + 1);
    }, 450);

    return () => window.clearInterval(intervalId);
  }, [showActiveLabel]);

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
                {statusLabel}
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    minWidth: "3ch",
                    fontFamily: "var(--stratakit-font-family-mono)",
                  }}
                >
                  {".".repeat(thinkingDotCount)}
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
