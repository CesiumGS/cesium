import { useState } from "react";
import { Button, Field, TextBox } from "@stratakit/bricks";
import { Tabs, unstable_Banner as Banner } from "@stratakit/structures";
import { SandcastleDialog } from "./SandcastleDialog";
import { ApiKeyManager } from "./AI/ApiKeyManager";
import { useModel } from "./contexts/useModel";

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApiKeyDialog({ open, onClose, onSuccess }: ApiKeyDialogProps) {
  const { refreshModels } = useModel();

  // Anthropic state
  const [anthropicKey, setAnthropicKey] = useState(
    ApiKeyManager.getAnthropicApiKey() || "",
  );
  const [anthropicError, setAnthropicError] = useState<string | null>(null);

  // Gemini state
  const [apiKey, setApiKey] = useState(ApiKeyManager.getApiKey() || "");
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Cesium Ion state
  const [cesiumToken, setCesiumToken] = useState(
    ApiKeyManager.getCesiumIonToken() || "",
  );
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const [cesiumSuccess, setCesiumSuccess] = useState(false);

  const handleAnthropicSave = () => {
    if (!anthropicKey.trim()) {
      setAnthropicError("Please enter an API key");
      return;
    }
    if (!ApiKeyManager.validateAnthropicApiKeyFormat(anthropicKey)) {
      setAnthropicError(
        "Invalid format. Anthropic API keys start with 'sk-ant-'.",
      );
      return;
    }
    try {
      ApiKeyManager.saveAnthropicApiKey(anthropicKey);
      refreshModels();
      onSuccess();
      onClose();
    } catch (err) {
      setAnthropicError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleGeminiSave = () => {
    if (!apiKey.trim()) {
      setGeminiError("Please enter an API key");
      return;
    }
    if (!ApiKeyManager.validateApiKeyFormat(apiKey)) {
      setGeminiError(
        "Invalid format. Gemini API keys typically start with 'AI'.",
      );
      return;
    }
    try {
      ApiKeyManager.saveApiKey(apiKey);
      refreshModels();
      onSuccess();
      onClose();
    } catch (err) {
      setGeminiError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleCesiumSave = () => {
    if (!cesiumToken.trim()) {
      setCesiumError("Please enter a Cesium Ion access token");
      return;
    }
    if (!ApiKeyManager.validateCesiumIonTokenFormat(cesiumToken)) {
      setCesiumError("Invalid format. Cesium Ion tokens start with 'eyJ'.");
      return;
    }
    try {
      ApiKeyManager.saveCesiumIonToken(cesiumToken);
      setCesiumSuccess(true);
      setCesiumError(null);
      setTimeout(() => setCesiumSuccess(false), 2000);
      onSuccess();
    } catch (err) {
      setCesiumError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <SandcastleDialog open={open} onClose={onClose} title="API Configuration">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--stratakit-space-x4)",
        }}
      >
        <Tabs.Root defaultSelectedId="anthropic">
          <Tabs.TabList>
            <Tabs.Tab id="anthropic">Anthropic</Tabs.Tab>
            <Tabs.Tab id="gemini">Gemini</Tabs.Tab>
            <Tabs.Tab id="cesium">Cesium Ion</Tabs.Tab>
          </Tabs.TabList>

          <Tabs.TabPanel tabId="anthropic">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--stratakit-space-x3)",
                paddingTop: "var(--stratakit-space-x3)",
              }}
            >
              <Field.Root>
                <Field.Label>API Key</Field.Label>
                <Field.Control
                  render={
                    <TextBox.Input
                      type="password"
                      value={anthropicKey}
                      onChange={(e) => {
                        setAnthropicKey(e.target.value);
                        setAnthropicError(null);
                      }}
                      placeholder="sk-ant-..."
                    />
                  }
                />
                <Field.Description>
                  Get your key at console.anthropic.com/settings/keys
                </Field.Description>
                {anthropicError && (
                  <Field.ErrorMessage>{anthropicError}</Field.ErrorMessage>
                )}
              </Field.Root>
              <div
                style={{
                  display: "flex",
                  gap: "var(--stratakit-space-x2)",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  tone="accent"
                  onClick={handleAnthropicSave}
                  disabled={!anthropicKey.trim()}
                >
                  Save
                </Button>
                {ApiKeyManager.hasAnthropicApiKey() && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      ApiKeyManager.clearAnthropicApiKey();
                      refreshModels();
                      setAnthropicKey("");
                      setAnthropicError(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel tabId="gemini">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--stratakit-space-x3)",
                paddingTop: "var(--stratakit-space-x3)",
              }}
            >
              <Field.Root>
                <Field.Label>API Key</Field.Label>
                <Field.Control
                  render={
                    <TextBox.Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setGeminiError(null);
                      }}
                      placeholder="AIza..."
                    />
                  }
                />
                <Field.Description>
                  Get your key at aistudio.google.com/app/apikey
                </Field.Description>
                {geminiError && (
                  <Field.ErrorMessage>{geminiError}</Field.ErrorMessage>
                )}
              </Field.Root>
              <div
                style={{
                  display: "flex",
                  gap: "var(--stratakit-space-x2)",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  tone="accent"
                  onClick={handleGeminiSave}
                  disabled={!apiKey.trim()}
                >
                  Save
                </Button>
                {ApiKeyManager.hasApiKey() && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      ApiKeyManager.clearApiKey();
                      refreshModels();
                      setApiKey("");
                      setGeminiError(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel tabId="cesium">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--stratakit-space-x3)",
                paddingTop: "var(--stratakit-space-x3)",
              }}
            >
              <Field.Root>
                <Field.Label>Access Token</Field.Label>
                <Field.Control
                  render={
                    <TextBox.Input
                      type="password"
                      value={cesiumToken}
                      onChange={(e) => {
                        setCesiumToken(e.target.value);
                        setCesiumError(null);
                        setCesiumSuccess(false);
                      }}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                  }
                />
                <Field.Description>
                  Get your token at cesium.com/ion/tokens
                </Field.Description>
                {cesiumError && (
                  <Field.ErrorMessage>{cesiumError}</Field.ErrorMessage>
                )}
              </Field.Root>
              {cesiumSuccess && (
                <Banner
                  tone="positive"
                  label="Saved"
                  message="Cesium Ion token saved!"
                />
              )}
              <div
                style={{
                  display: "flex",
                  gap: "var(--stratakit-space-x2)",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  tone="accent"
                  onClick={handleCesiumSave}
                  disabled={!cesiumToken.trim()}
                >
                  Save
                </Button>
                {ApiKeyManager.hasCesiumIonToken() && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      ApiKeyManager.clearCesiumIonToken();
                      setCesiumToken("");
                      setCesiumError(null);
                      setCesiumSuccess(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </Tabs.TabPanel>
        </Tabs.Root>
      </div>
    </SandcastleDialog>
  );
}
