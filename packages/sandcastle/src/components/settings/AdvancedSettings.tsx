import { useState, useContext } from "react";
import { Button, Text, Field, Switch, TextBox } from "@stratakit/bricks";
import { ApiKeyManager } from "../../AI/ApiKeyManager";
import { SettingsContext } from "../../SettingsContext";

export function AdvancedSettings() {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const { settings, updateSettings } = useContext(SettingsContext);

  const handleResetData = () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      return;
    }
    localStorage.clear();
    window.location.reload();
  };

  return (
    <>
      <Text variant="headline-sm">Advanced</Text>

      <Field.Root>
        <Field.Label>Custom System Prompt Addendum</Field.Label>
        <Field.Description>
          Add recurring directives included in all AI requests. Useful for
          preferences like camera behavior, coding style, or specific
          requirements.
        </Field.Description>
        <Field.Control
          render={
            <TextBox.Textarea
              value={settings.customPromptAddendum}
              onChange={(e) =>
                updateSettings({ customPromptAddendum: e.target.value })
              }
              placeholder="Example: Always use smooth camera transitions with duration of 2 seconds."
              rows={6}
            />
          }
        />
      </Field.Root>

      <Text variant="caption-md">
        {settings.customPromptAddendum.length} characters
      </Text>

      <Field.Root layout="inline">
        <Field.Label>Console Logging</Field.Label>
        <Field.Control
          render={
            <Switch
              checked={localStorage.getItem("debug") === "true"}
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem("debug", "true");
                } else {
                  localStorage.removeItem("debug");
                }
              }}
            />
          }
        />
        <Field.Description>
          Enable detailed console logging for debugging (requires page reload)
        </Field.Description>
      </Field.Root>

      <Text variant="mono-sm">Cesium Sandcastle Copilot v1.0.0</Text>

      <Text variant="body-sm">
        {ApiKeyManager.hasApiKey() && "Gemini API key stored"}
        {!ApiKeyManager.hasAnyCredentials() && "No credentials stored"}
      </Text>

      {!showConfirmReset ? (
        <Button variant="outline" onClick={handleResetData}>
          Reset All Data
        </Button>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--stratakit-space-x2)",
          }}
        >
          <Text
            variant="body-md"
            style={{ color: "var(--stratakit-color-text-critical-base)" }}
          >
            Are you sure? This will delete all your settings and API keys.
          </Text>
          <div style={{ display: "flex", gap: "var(--stratakit-space-x2)" }}>
            <Button variant="solid" onClick={handleResetData}>
              Yes, Reset Everything
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirmReset(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
