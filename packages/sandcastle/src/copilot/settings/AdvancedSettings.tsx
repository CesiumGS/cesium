import { useState, useContext } from "react";
import { Button, Text, Field, TextBox } from "@stratakit/bricks";
import { CopilotSettingsContext } from "./CopilotSettingsContext";
import { ApiKeyManager } from "../ai/clients/ApiKeyManager";
import { useModel } from "../contexts/useModel";

export function AdvancedSettings() {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const { settings, updateSettings, resetSettings } = useContext(
    CopilotSettingsContext,
  );
  const { resetModelSelection } = useModel();

  const handleResetData = () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      return;
    }
    // Clear only the Copilot's own data, not everything stored for the origin.
    // The keys and settings are in sessionStorage, which survives a reload,
    // and the reload itself can be cancelled from the unsaved changes prompt,
    // so reset both the stored values and the in-memory state before it.
    // Keys go first so the model list is refreshed without them.
    ApiKeyManager.clearApiKey();
    ApiKeyManager.clearAnthropicApiKey();
    ApiKeyManager.clearVertexServiceAccount();
    resetModelSelection();
    resetSettings();
    setShowConfirmReset(false);
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

      {!showConfirmReset ? (
        <Button variant="outline" onClick={handleResetData}>
          Reset All Data
        </Button>
      ) : (
        <div className="reset-confirmation">
          <Text variant="body-md" className="reset-warning">
            Are you sure? This will delete all your Copilot settings and API
            keys.
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
