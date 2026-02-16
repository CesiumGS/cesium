import { useState, useContext } from "react";
import { Button, Text, Field, Switch, TextBox } from "@stratakit/bricks";
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

      {!showConfirmReset ? (
        <Button variant="outline" onClick={handleResetData}>
          Reset All Data
        </Button>
      ) : (
        <div className="reset-confirmation">
          <Text variant="body-md" className="reset-warning">
            Are you sure? This will delete all your settings and API keys.
          </Text>
          <div className="reset-actions">
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
