import { useState } from "react";
import { Button, Text } from "@stratakit/bricks";
import { ApiKeyDialog } from "../../ApiKeyDialog";
import { ApiKeyManager } from "../../AI/ApiKeyManager";

export function ModelSettings() {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [hasApiKey] = useState(ApiKeyManager.hasAnyCredentials());

  const handleApiKeySuccess = () => {
    // Refresh the page or update state to reflect new credentials
    window.location.reload();
  };

  return (
    <>
      <div className="settings-category">
        <h3 className="settings-category-title">AI Model Configuration</h3>
        <p className="settings-category-description">
          Configure API keys and credentials for AI providers.
        </p>

        <div className="settings-section">
          <div className="settings-group">
            <label className="settings-label">Provider Status</label>
            <p className="settings-description">
              Current configuration status for AI providers
            </p>
            <div className="provider-status-list">
              <div
                className={`provider-status-item ${ApiKeyManager.hasApiKey() ? "configured" : "not-configured"}`}
              >
                <span className="provider-status-icon">
                  {ApiKeyManager.hasApiKey() ? "✓" : "○"}
                </span>
                <span className="provider-status-name">Gemini (Google AI)</span>
                <span className="provider-status-state">
                  {ApiKeyManager.hasApiKey() ? "Configured" : "Not configured"}
                </span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">API Configuration</label>
            <p className="settings-description">
              Set up API keys and credentials to enable AI models
            </p>
            <Button variant="solid" onClick={() => setShowApiKeyDialog(true)}>
              Configure API Keys
            </Button>
          </div>

          {!hasApiKey && (
            <div className="settings-warning-box">
              <Text variant="body-md" style={{ color: "#f59e0b" }}>
                ⚠️ No AI providers configured. Configure at least one provider
                to use Cesium Copilot.
              </Text>
            </div>
          )}
        </div>
      </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onSuccess={handleApiKeySuccess}
      />
    </>
  );
}
