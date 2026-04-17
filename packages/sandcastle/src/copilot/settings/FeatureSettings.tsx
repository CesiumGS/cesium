import { useContext } from "react";
import { Field, Switch, Text, TextBox } from "@stratakit/bricks";
import { SettingsContext } from "../../SettingsContext";

export function FeatureSettings() {
  const { settings, updateSettings } = useContext(SettingsContext);

  return (
    <>
      {/* Extended Thinking */}
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
