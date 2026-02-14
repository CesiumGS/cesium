import { useMemo } from "react";
import { Button, Text } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { DropdownMenu } from "@stratakit/structures";
import { chevronDown } from "../../icons";
import type { AIModel } from "../../AI/types";
import type { ModelInfo } from "../../contexts/ModelContext";

interface ModelPickerProps {
  models: ModelInfo[];
  currentModel: AIModel | null;
  onModelChange: (modelId: AIModel) => void;
}

export function ModelPicker({
  models,
  currentModel,
  onModelChange,
}: ModelPickerProps) {
  const currentModelInfo = useMemo(
    () => models.find((m) => m.id === currentModel),
    [models, currentModel],
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Button
        render={
          <Button variant="ghost">
            <Text variant="body-sm">
              {currentModelInfo?.displayName || "Select Model"}
            </Text>
            <Icon href={chevronDown} />
          </Button>
        }
      />
      <DropdownMenu.Content>
        {models.map((model) => (
          <DropdownMenu.Item
            key={model.id}
            label={model.displayName}
            disabled={!model.isAvailable}
            onClick={() => {
              if (model.isAvailable) {
                onModelChange(model.id);
              }
            }}
          />
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
