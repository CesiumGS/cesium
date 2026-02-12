import { useMemo } from "react";
import { unstable_AccordionItem as AccordionItem } from "@stratakit/structures";
import { Badge } from "@stratakit/bricks";
import { CodeBlock } from "./CodeBlock";

export interface DiffAccordionProps {
  language: "javascript" | "html";
  diffContent: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DiffAccordion({
  language,
  diffContent,
  isExpanded,
  onToggle,
}: DiffAccordionProps) {
  const editCount = useMemo(() => {
    const matches = diffContent.match(/[-]{3,} SEARCH/g);
    return matches ? matches.length : 0;
  }, [diffContent]);

  return (
    <AccordionItem.Root open={isExpanded} onOpenChange={onToggle}>
      <AccordionItem.Header>
        <AccordionItem.Button>
          <AccordionItem.Marker />
          <AccordionItem.Label>
            <Badge label={language.toUpperCase()} />{" "}
            {editCount === 1 ? "1 edit" : `${editCount} edits`}
          </AccordionItem.Label>
        </AccordionItem.Button>
      </AccordionItem.Header>
      <AccordionItem.Content>
        <div style={{ maxHeight: "400px", overflow: "auto" }}>
          <CodeBlock code={diffContent} language="diff" />
        </div>
      </AccordionItem.Content>
    </AccordionItem.Root>
  );
}
