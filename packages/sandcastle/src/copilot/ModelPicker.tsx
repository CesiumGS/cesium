import { useMemo } from "react";
import { Button, Text } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { DropdownMenu } from "@stratakit/structures";
import { chevronDown } from "../icons";
import type { ModelSelection } from "./ai/types";
import type { ModelInfo } from "./contexts/ModelContext";

interface ModelPickerProps {
  models: ModelInfo[];
  currentModel: ModelSelection | null;
  onModelChange: (selection: ModelSelection) => void;
}

export function ModelPicker({
  models,
  currentModel,
  onModelChange,
}: ModelPickerProps) {
  const currentModelInfo = useMemo(
    () =>
      models.find(
        (m) =>
          currentModel &&
          m.id === currentModel.model &&
          m.route === currentModel.route,
      ),
    [models, currentModel],
  );

  const displayLabel = currentModelInfo
    ? currentModelInfo.displaySuffix
      ? `${currentModelInfo.displayName} ${currentModelInfo.displaySuffix}`
      : currentModelInfo.displayName
    : "Select Model";

  return (
    <DropdownMenu.Provider>
      <DropdownMenu.Button
        render={
          <Button variant="ghost">
            <Text variant="body-sm">{displayLabel}</Text>
            <Icon href={chevronDown} />
          </Button>
        }
      />
      <DropdownMenu.Content>
        {models.map((model) => {
          const label = model.displaySuffix
            ? `${model.displayName} ${model.displaySuffix}`
            : model.displayName;

          return (
            <DropdownMenu.Item
              key={`${model.id}-${model.route}`}
              label={label}
              disabled={!model.isAvailable}
              onClick={() => {
                if (model.isAvailable) {
                  onModelChange({ model: model.id, route: model.route });
                }
              }}
            />
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Provider>
  );
}
