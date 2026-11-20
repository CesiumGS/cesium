import { useState, useContext } from "react";
import { Button, Text, Field, TextBox } from "@stratakit/bricks";
import { CopilotSettingsContext } from "./CopilotSettingsContext";
import { ApiKeyManager } from "../ai/clients/ApiKeyManager";
import { useModel } from "../contexts/useModel";

export function AdvancedSettings({ onResetData }: { onResetData: () => void }) {
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
    // Stop the chat before clearing credentials. Reset in place so unsaved
    // editor changes never need to be discarded to finish clearing Copilot.
    onResetData();
    ApiKeyManager.clearAllCredentials();
    resetModelSelection();
    resetSettings();
    setShowConfirmReset(false);
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
            keys, and clear the current chat. Your code will be preserved.
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
