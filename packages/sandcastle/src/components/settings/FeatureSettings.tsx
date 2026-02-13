import { useContext } from "react";
import { Field, Switch, Text, TextBox } from "@stratakit/bricks";
import { SettingsContext } from "../../SettingsContext";

export function FeatureSettings() {
  const { settings, updateSettings } = useContext(SettingsContext);

  return (
    <>
      {/* Extended Thinking */}
      <Text variant="body-lg" style={{ fontWeight: 600 }}>
        Extended Thinking
      </Text>

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

      {/* Auto-Iteration */}
      <Text variant="body-lg" style={{ fontWeight: 600 }}>
        Auto-Iteration
      </Text>

      <Field.Root layout="inline">
        <Field.Label>Enable Auto-Iteration</Field.Label>
        <Field.Control
          render={
            <Switch
              checked={settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    enabled: e.target.checked,
                  },
                })
              }
            />
          }
        />
        <Field.Description>
          Automatically retry when runtime errors occur
        </Field.Description>
      </Field.Root>

      <Field.Root>
        <Field.Label>Max Iterations</Field.Label>
        <Field.Control
          render={
            <TextBox.Input
              type="number"
              value={settings.autoIteration.maxIterations.toString()}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    maxIterations: parseInt(e.target.value) || 3,
                  },
                })
              }
            />
          }
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Max Total Requests</Field.Label>
        <Field.Control
          render={
            <TextBox.Input
              type="number"
              value={settings.autoIteration.maxTotalRequests.toString()}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    maxTotalRequests: parseInt(e.target.value) || 20,
                  },
                })
              }
            />
          }
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Wait Time (ms)</Field.Label>
        <Field.Control
          render={
            <TextBox.Input
              type="number"
              value={settings.autoIteration.waitTimeMs.toString()}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    waitTimeMs: parseInt(e.target.value) || 5000,
                  },
                })
              }
            />
          }
        />
      </Field.Root>

      <Field.Root layout="inline">
        <Field.Label>Oscillation Detection</Field.Label>
        <Field.Control
          render={
            <Switch
              checked={settings.autoIteration.detectOscillation}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    detectOscillation: e.target.checked,
                  },
                })
              }
            />
          }
        />
        <Field.Description>
          Detect when errors cycle between states and stop iteration
        </Field.Description>
      </Field.Root>

      <Field.Root layout="inline">
        <Field.Label>Include Stack Traces</Field.Label>
        <Field.Control
          render={
            <Switch
              checked={settings.autoIteration.includeStackTraces}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    includeStackTraces: e.target.checked,
                  },
                })
              }
            />
          }
        />
        <Field.Description>
          Include full stack traces in error messages sent to AI
        </Field.Description>
      </Field.Root>
    </>
  );
}
