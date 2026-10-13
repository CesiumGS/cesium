import { Button, Text } from "@stratakit/bricks";
import { DropdownMenu } from "@stratakit/structures";
import {
  getOpenAIReasoningEfforts,
  resolveOpenAIReasoningEffort,
} from "./ai/clients/OpenAIClient";
import type { OpenAIModel, OpenAIReasoningEffort } from "./ai/types";

export function OpenAIReasoningPicker({
  model,
  effort,
  onChange,
  disabled,
}: {
  model: OpenAIModel;
  effort: OpenAIReasoningEffort;
  onChange: (effort: OpenAIReasoningEffort) => void;
  disabled: boolean;
}) {
  const labels = {
    none: "None",
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "Extra High",
    max: "Max",
  };
  return (
    <DropdownMenu.Provider>
      <DropdownMenu.Button
        render={
          <Button variant="ghost" disabled={disabled}>
            <Text variant="body-sm">
              Reasoning: {labels[resolveOpenAIReasoningEffort(model, effort)]}
            </Text>
          </Button>
        }
      />
      <DropdownMenu.Content>
        {getOpenAIReasoningEfforts(model).map((value) => (
          <DropdownMenu.Item
            key={value}
            label={labels[value]}
            onClick={() => onChange(value)}
          />
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Provider>
  );
}
