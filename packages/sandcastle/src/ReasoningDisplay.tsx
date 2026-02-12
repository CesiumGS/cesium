import { unstable_AccordionItem as AccordionItem } from "@stratakit/structures";
import { Spinner } from "@stratakit/bricks";

export interface ReasoningDisplayProps {
  reasoning: string;
  isStreaming: boolean;
  thoughtTokens?: number;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export function ReasoningDisplay({
  reasoning,
  isStreaming,
}: ReasoningDisplayProps) {
  if (!reasoning && !isStreaming) {
    return null;
  }

  return (
    <AccordionItem.Root>
      <AccordionItem.Header>
        <AccordionItem.Button>
          <AccordionItem.Marker />
          <AccordionItem.Label>
            {isStreaming ? "Thinking..." : "Reasoning"}
          </AccordionItem.Label>
          {isStreaming && <Spinner size="small" />}
        </AccordionItem.Button>
      </AccordionItem.Header>
      <AccordionItem.Content>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "var(--stratakit-font-family-mono)",
            fontSize: "var(--stratakit-font-size-12)",
            maxHeight: "400px",
            overflow: "auto",
            margin: 0,
            padding: "var(--stratakit-space-x3)",
            color: "var(--stratakit-color-text-neutral-secondary)",
          }}
        >
          {reasoning || ""}
          {isStreaming && "▊"}
        </pre>
      </AccordionItem.Content>
    </AccordionItem.Root>
  );
}
