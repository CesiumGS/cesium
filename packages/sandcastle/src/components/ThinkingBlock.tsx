import { unstable_AccordionItem as AccordionItem } from "@stratakit/structures";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({
  content,
  isStreaming = false,
}: ThinkingBlockProps) {
  return (
    <AccordionItem.Root defaultOpen={isStreaming}>
      <AccordionItem.Header>
        <AccordionItem.Button>
          <AccordionItem.Marker />
          <AccordionItem.Label>
            {isStreaming ? "Thinking..." : "Thought process"}
          </AccordionItem.Label>
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
          }}
        >
          {content}
        </pre>
      </AccordionItem.Content>
    </AccordionItem.Root>
  );
}
