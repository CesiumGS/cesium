import { useState, useContext } from "react";
import { Button, Text } from "@stratakit/bricks";
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

    // Clear all stored data
    localStorage.clear();

    // Reload the page
    window.location.reload();
  };

  const handleCancelReset = () => {
    setShowConfirmReset(false);
  };

  return (
    <div className="settings-category">
      <h3 className="settings-category-title">Advanced Settings</h3>
      <p className="settings-category-description">
        Developer options and data management.
      </p>

      <div className="settings-section">
        <h4 className="settings-subsection-title">AI Customization</h4>

        <div className="settings-group">
          <label className="settings-label">
            Custom System Prompt Addendum
          </label>
          <p className="settings-description">
            Add recurring directives that will be included in all AI requests.
            Useful for preferences like camera behavior, coding style, or
            specific requirements.
          </p>
          <textarea
            className="settings-textarea"
            value={settings.customPromptAddendum}
            onChange={(e) =>
              updateSettings({ customPromptAddendum: e.target.value })
            }
            placeholder="Example: Always use smooth camera transitions with duration of 2 seconds."
            rows={6}
            style={{
              width: "100%",
              fontFamily: "monospace",
              fontSize: "13px",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid var(--border-color, #ccc)",
              backgroundColor: "var(--input-background, #fff)",
              color: "var(--text-color, #000)",
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: "4px", fontSize: "12px", opacity: 0.7 }}>
            {settings.customPromptAddendum.length} characters
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-subsection-title">Developer Options</h4>

        <div className="settings-group">
          <label className="settings-label">Console Logging</label>
          <p className="settings-description">
            Enable detailed console logging for debugging (requires page reload)
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={localStorage.getItem("debug") === "true"}
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem("debug", "true");
                } else {
                  localStorage.removeItem("debug");
                }
              }}
            />
            <span>Enable debug logging</span>
          </label>
        </div>

        <div className="settings-group">
          <label className="settings-label">Version Information</label>
          <p className="settings-description">
            Current application version and build information
          </p>
          <div className="settings-info-box">
            <Text variant="body-sm" style={{ fontFamily: "monospace" }}>
              Cesium Sandcastle Copilot v1.0.0
            </Text>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-subsection-title">Data Management</h4>

        <div className="settings-group">
          <label className="settings-label">Storage Information</label>
          <p className="settings-description">Current localStorage usage</p>
          <div className="settings-info-box">
            <Text variant="body-sm">
              {ApiKeyManager.hasApiKey() && "• Gemini API key stored"}
              {!ApiKeyManager.hasAnyCredentials() && "No credentials stored"}
            </Text>
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Reset All Data</label>
          <p className="settings-description">
            Clear all settings, API keys, and stored data. This action cannot be
            undone.
          </p>
          {!showConfirmReset ? (
            <Button
              variant="outline"
              onClick={handleResetData}
              style={{
                borderColor: "#ef4444",
                color: "#ef4444",
              }}
            >
              Reset All Data
            </Button>
          ) : (
            <div className="settings-confirm-box">
              <Text
                variant="body-md"
                style={{ color: "#ef4444", marginBottom: "1rem" }}
              >
                ⚠️ Are you sure? This will delete all your settings and API
                keys.
              </Text>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button
                  variant="solid"
                  onClick={handleResetData}
                  style={{
                    background: "#ef4444",
                    borderColor: "#ef4444",
                  }}
                >
                  Yes, Reset Everything
                </Button>
                <Button variant="outline" onClick={handleCancelReset}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
