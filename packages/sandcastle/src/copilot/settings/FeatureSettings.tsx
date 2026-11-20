import { useContext } from "react";
import { Field, Select, Switch, Text, TextBox } from "@stratakit/bricks";
import { useModel } from "../contexts/useModel";
import { AIClientFactory } from "../ai/clients/AIClientFactory";
import {
  getOpenAIReasoningEfforts,
  resolveOpenAIReasoningEffort,
} from "../ai/clients/OpenAIClient";
import type { OpenAIModel, OpenAIReasoningEffort } from "../ai/types";
import { CopilotSettingsContext } from "./CopilotSettingsContext";

export function FeatureSettings() {
  const { settings, updateSettings } = useContext(CopilotSettingsContext);

  const { currentModel } = useModel();
  if (
    currentModel &&
    AIClientFactory.getProviderForModel(currentModel.model) === "openai"
  ) {
    const model = currentModel.model as OpenAIModel;
    const labels = {
      none: "None",
      low: "Low",
      medium: "Medium",
      high: "High",
      xhigh: "Extra High",
      max: "Max",
    };
    return (
      <>
        <Text variant="headline-sm">OpenAI Reasoning</Text>
        <Field.Root>
          <Field.Label>Reasoning effort</Field.Label>
          <Select.Root>
            <Field.Control
              render={
                <Select.HtmlSelect
                  value={resolveOpenAIReasoningEffort(
                    model,
                    settings.openaiReasoningEffort,
                  )}
                  onChange={(event) =>
                    updateSettings({
                      openaiReasoningEffort: event.target
                        .value as OpenAIReasoningEffort,
                    })
                  }
                >
                  {getOpenAIReasoningEfforts(model).map((effort) => (
                    <option key={effort} value={effort}>
                      {labels[effort]}
                    </option>
                  ))}
                </Select.HtmlSelect>
              }
            />
          </Select.Root>
          <Field.Description>
            Higher effort allows more reasoning and can increase response time
            and cost.
          </Field.Description>
        </Field.Root>
      </>
    );
  }

  return (
    <>
      <Text variant="headline-sm">Extended Thinking</Text>
      <Field.Root layout="inline">
        <Field.Label>Enable Extended Thinking</Field.Label>
        <Field.Control
          render={
            <Switch
              checked={settings.extendedThinking.enabled}
              onChange={(e) =>
                updateSettings({
                  extendedThinking: {
                    ...settings.extendedThinking,
                    enabled: e.target.checked,
                  },
                })
              }
            />
          }
        />
        <Field.Description>
          Allow the AI to show its reasoning process
        </Field.Description>
      </Field.Root>

      <Field.Root>
        <Field.Label>Thinking Budget (tokens)</Field.Label>
        <Field.Control
          render={
            <TextBox.Input
              type="number"
              value={settings.extendedThinking.budget.toString()}
              disabled={!settings.extendedThinking.enabled}
              onChange={(e) =>
                updateSettings({
                  extendedThinking: {
                    ...settings.extendedThinking,
                    budget: parseInt(e.target.value) || 10000,
                  },
                })
              }
            />
          }
        />
      </Field.Root>
    </>
  );
}
