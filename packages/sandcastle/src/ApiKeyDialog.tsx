import { useState } from "react";
import { Button, Text } from "@stratakit/bricks";
import { SandcastleDialog } from "./SandcastleDialog";
import { ApiKeyManager } from "./AI/ApiKeyManager";
import { GeminiClient } from "./AI/GeminiClient";
import { AnthropicClient } from "./AI/AnthropicClient";
import { useModel } from "./contexts/useModel";
import "./ApiKeyDialog.css";

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabId = "anthropic" | "gemini" | "cesium";

export function ApiKeyDialog({ open, onClose, onSuccess }: ApiKeyDialogProps) {
  const { refreshModels } = useModel();
  const [activeTab, setActiveTab] = useState<TabId>("anthropic");

  // Anthropic state (preferred provider)
  const [anthropicKey, setAnthropicKey] = useState(
    ApiKeyManager.getAnthropicApiKey() || "",
  );
  const [anthropicTesting, setAnthropicTesting] = useState(false);
  const [anthropicError, setAnthropicError] = useState<string | null>(null);
  const [anthropicSuccess, setAnthropicSuccess] = useState(false);

  // Gemini state
  const [apiKey, setApiKey] = useState(ApiKeyManager.getApiKey() || "");
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiSuccess, setGeminiSuccess] = useState(false);

  // Cesium Ion state
  const [cesiumToken, setCesiumToken] = useState(
    ApiKeyManager.getCesiumIonToken() || "",
  );
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const [cesiumSuccess, setCesiumSuccess] = useState(false);

  // Anthropic handlers
  const handleAnthropicTest = async () => {
    if (!anthropicKey.trim()) {
      setAnthropicError("Please enter an API key");
      return;
    }

    if (!ApiKeyManager.validateAnthropicApiKeyFormat(anthropicKey)) {
      setAnthropicError(
        "Invalid API key format. Anthropic API keys start with 'sk-ant-'.",
      );
      return;
    }

    setAnthropicTesting(true);
    setAnthropicError(null);
    setAnthropicSuccess(false);

    const client = new AnthropicClient(anthropicKey);
    const result = await client.testApiKey();

    setAnthropicTesting(false);

    if (result.valid) {
      setAnthropicSuccess(true);
      setAnthropicError(null);
    } else {
      setAnthropicError(result.error || "Failed to validate API key");
      setAnthropicSuccess(false);
    }
  };

  const handleAnthropicSave = () => {
    if (!anthropicKey.trim()) {
      setAnthropicError("Please enter an API key");
      return;
    }

    try {
      ApiKeyManager.saveAnthropicApiKey(anthropicKey);
      refreshModels();
      onSuccess();
      onClose();
    } catch (err) {
      setAnthropicError(
        err instanceof Error ? err.message : "Failed to save API key",
      );
    }
  };

  const handleAnthropicClear = () => {
    ApiKeyManager.clearAnthropicApiKey();
    refreshModels();
    setAnthropicKey("");
    setAnthropicError(null);
    setAnthropicSuccess(false);
  };

  // Gemini handlers
  const handleGeminiTest = async () => {
    if (!apiKey.trim()) {
      setGeminiError("Please enter an API key");
      return;
    }

    if (!ApiKeyManager.validateApiKeyFormat(apiKey)) {
      setGeminiError(
        "Invalid API key format. Gemini API keys typically start with 'AI'.",
      );
      return;
    }

    setGeminiTesting(true);
    setGeminiError(null);
    setGeminiSuccess(false);

    const client = new GeminiClient(apiKey);
    const result = await client.testApiKey();

    setGeminiTesting(false);

    if (result.valid) {
      setGeminiSuccess(true);
      setGeminiError(null);
    } else {
      setGeminiError(result.error || "Failed to validate API key");
      setGeminiSuccess(false);
    }
  };

  const handleGeminiSave = () => {
    if (!apiKey.trim()) {
      setGeminiError("Please enter an API key");
      return;
    }

    try {
      ApiKeyManager.saveApiKey(apiKey);
      refreshModels();
      onSuccess();
      onClose();
    } catch (err) {
      setGeminiError(
        err instanceof Error ? err.message : "Failed to save API key",
      );
    }
  };

  const handleGeminiClear = () => {
    ApiKeyManager.clearApiKey();
    refreshModels();
    setApiKey("");
    setGeminiError(null);
    setGeminiSuccess(false);
  };

  const handleCesiumSave = () => {
    if (!cesiumToken.trim()) {
      setCesiumError("Please enter a Cesium Ion access token");
      return;
    }

    if (!ApiKeyManager.validateCesiumIonTokenFormat(cesiumToken)) {
      setCesiumError(
        "Invalid token format. Cesium Ion tokens are JWTs that start with 'eyJ'.",
      );
      return;
    }

    try {
      ApiKeyManager.saveCesiumIonToken(cesiumToken);
      setCesiumSuccess(true);
      setCesiumError(null);
      setTimeout(() => setCesiumSuccess(false), 2000);
      onSuccess();
    } catch (err) {
      setCesiumError(
        err instanceof Error ? err.message : "Failed to save token",
      );
    }
  };

  const handleCesiumClear = () => {
    ApiKeyManager.clearCesiumIonToken();
    setCesiumToken("");
    setCesiumError(null);
    setCesiumSuccess(false);
  };

  return (
    <SandcastleDialog
      open={open}
      onClose={onClose}
      title="API Configuration"
      className="api-key-dialog-wrapper"
    >
      <div className="api-key-dialog">
        {/* Provider Status Summary */}
        <div className="provider-status">
          <Text variant="body-md" style={{ marginBottom: "8px" }}>
            {ApiKeyManager.hasAnthropicApiKey() && "✓ Anthropic configured"}
            {ApiKeyManager.hasAnthropicApiKey() &&
              ApiKeyManager.hasApiKey() &&
              " • "}
            {ApiKeyManager.hasApiKey() && "✓ Gemini configured"}
            {(ApiKeyManager.hasAnthropicApiKey() ||
              ApiKeyManager.hasApiKey()) &&
              ApiKeyManager.hasCesiumIonToken() &&
              " • "}
            {ApiKeyManager.hasCesiumIonToken() && "✓ Cesium Ion configured"}
            {!ApiKeyManager.hasAnyCredentials() &&
              !ApiKeyManager.hasCesiumIonToken() &&
              "No providers configured"}
          </Text>
        </div>

        {/* Tabs */}
        <div className="provider-tabs" role="tablist">
          <button
            id="anthropic-tab"
            className={`provider-tab ${activeTab === "anthropic" ? "active" : ""}`}
            onClick={() => setActiveTab("anthropic")}
            role="tab"
            aria-selected={activeTab === "anthropic"}
            aria-controls="anthropic-panel"
            aria-label="Anthropic (Claude) configuration"
          >
            Anthropic (Claude)
          </button>
          <button
            id="gemini-tab"
            className={`provider-tab ${activeTab === "gemini" ? "active" : ""}`}
            onClick={() => setActiveTab("gemini")}
            role="tab"
            aria-selected={activeTab === "gemini"}
            aria-controls="gemini-panel"
            aria-label="Gemini (Google AI) configuration"
          >
            Gemini (Google AI)
          </button>
          <button
            id="cesium-tab"
            className={`provider-tab ${activeTab === "cesium" ? "active" : ""}`}
            onClick={() => setActiveTab("cesium")}
            role="tab"
            aria-selected={activeTab === "cesium"}
            aria-controls="cesium-panel"
            aria-label="Cesium Ion configuration"
          >
            Cesium Ion
          </button>
        </div>

        {/* Anthropic Tab Content */}
        {activeTab === "anthropic" && (
          <div
            className="tab-content"
            role="tabpanel"
            id="anthropic-panel"
            aria-labelledby="anthropic-tab"
          >
            <Text variant="body-md">
              Use Claude models (Opus 4.5, Sonnet 4.5, Haiku 4.5) with your
              Anthropic API key.
            </Text>

            <div className="api-key-section">
              <Text
                variant="body-md"
                style={{ fontWeight: 500, marginBottom: "8px" }}
              >
                How to get an API key:
              </Text>
              <ol>
                <li>
                  Visit{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Anthropic Console
                  </a>
                </li>
                <li>Sign in or create an account</li>
                <li>Create a new API key</li>
                <li>Copy the key and paste it below</li>
              </ol>
            </div>

            <div className="api-key-input-section">
              <label htmlFor="anthropic-key-input">
                <Text variant="body-md" style={{ fontWeight: 500 }}>
                  API Key
                </Text>
              </label>
              <input
                id="anthropic-key-input"
                type="password"
                value={anthropicKey}
                onChange={(e) => {
                  setAnthropicKey(e.target.value);
                  setAnthropicError(null);
                  setAnthropicSuccess(false);
                }}
                placeholder="sk-ant-..."
                className="api-key-input"
              />
            </div>

            {anthropicError && (
              <div className="api-key-error">{anthropicError}</div>
            )}
            {anthropicSuccess && (
              <div className="api-key-success">
                API key is valid and working!
              </div>
            )}

            <div className="api-key-warning">
              <Text variant="caption-md" style={{ fontSize: "0.875rem" }}>
                Your API key will be stored in your browser's localStorage. For
                production apps, use server-side key management.
              </Text>
            </div>

            <div className="api-key-actions">
              <Button
                onClick={handleAnthropicTest}
                disabled={anthropicTesting || !anthropicKey.trim()}
              >
                {anthropicTesting ? "Testing..." : "Test API Key"}
              </Button>
              <Button
                onClick={handleAnthropicSave}
                disabled={!anthropicKey.trim()}
              >
                Save
              </Button>
              {ApiKeyManager.hasAnthropicApiKey() && (
                <Button onClick={handleAnthropicClear} variant="outline">
                  Clear Saved Key
                </Button>
              )}
              <Button onClick={onClose} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Gemini Tab Content */}
        {activeTab === "gemini" && (
          <div
            className="tab-content"
            role="tabpanel"
            id="gemini-panel"
            aria-labelledby="gemini-tab"
          >
            <Text variant="body-md">
              Use Google Gemini models with a free API key.
            </Text>

            <div className="api-key-section">
              <Text
                variant="body-md"
                style={{ fontWeight: 500, marginBottom: "8px" }}
              >
                How to get an API key:
              </Text>
              <ol>
                <li>
                  Visit{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google AI Studio
                  </a>
                </li>
                <li>Sign in with your Google account</li>
                <li>Click "Create API Key"</li>
                <li>Copy the key and paste it below</li>
              </ol>
            </div>

            <div className="api-key-input-section">
              <label htmlFor="api-key-input">
                <Text variant="body-md" style={{ fontWeight: 500 }}>
                  API Key
                </Text>
              </label>
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setGeminiError(null);
                  setGeminiSuccess(false);
                }}
                placeholder="AIza..."
                className="api-key-input"
              />
            </div>

            {geminiError && <div className="api-key-error">{geminiError}</div>}
            {geminiSuccess && (
              <div className="api-key-success">
                API key is valid and working!
              </div>
            )}

            <div className="api-key-warning">
              <Text variant="caption-md" style={{ fontSize: "0.875rem" }}>
                ⚠️ Your API key will be stored in your browser's localStorage.
                For production apps, use server-side key management.
              </Text>
            </div>

            <div className="api-key-actions">
              <Button
                onClick={handleGeminiTest}
                disabled={geminiTesting || !apiKey.trim()}
              >
                {geminiTesting ? "Testing..." : "Test API Key"}
              </Button>
              <Button onClick={handleGeminiSave} disabled={!apiKey.trim()}>
                Save
              </Button>
              {ApiKeyManager.hasApiKey() && (
                <Button onClick={handleGeminiClear} variant="outline">
                  Clear Saved Key
                </Button>
              )}
              <Button onClick={onClose} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Cesium Ion Tab Content */}
        {activeTab === "cesium" && (
          <div
            className="tab-content"
            role="tabpanel"
            id="cesium-panel"
            aria-labelledby="cesium-tab"
          >
            <Text variant="body-md">
              Configure your Cesium Ion access token to use default world
              imagery and terrain.
            </Text>

            <div className="api-key-section">
              <Text
                variant="body-md"
                style={{ fontWeight: 500, marginBottom: "8px" }}
              >
                How to get an access token:
              </Text>
              <ol>
                <li>
                  Visit{" "}
                  <a
                    href="https://cesium.com/ion/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cesium Ion Tokens
                  </a>
                </li>
                <li>Sign in or create a free account</li>
                <li>Copy your default access token (or create a new one)</li>
                <li>Paste the token below</li>
              </ol>
            </div>

            <div className="api-key-input-section">
              <label htmlFor="cesium-token-input">
                <Text variant="body-md" style={{ fontWeight: 500 }}>
                  Access Token
                </Text>
              </label>
              <input
                id="cesium-token-input"
                type="password"
                value={cesiumToken}
                onChange={(e) => {
                  setCesiumToken(e.target.value);
                  setCesiumError(null);
                  setCesiumSuccess(false);
                }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="api-key-input"
              />
            </div>

            {cesiumError && <div className="api-key-error">{cesiumError}</div>}
            {cesiumSuccess && (
              <div className="api-key-success">Cesium Ion token saved!</div>
            )}

            <div className="api-key-warning">
              <Text variant="caption-md" style={{ fontSize: "0.875rem" }}>
                ⚠️ Your token will be stored in your browser's localStorage. The
                token is used to access Cesium Ion assets like world imagery and
                terrain.
              </Text>
            </div>

            <div className="api-key-actions">
              <Button onClick={handleCesiumSave} disabled={!cesiumToken.trim()}>
                Save
              </Button>
              {ApiKeyManager.hasCesiumIonToken() && (
                <Button onClick={handleCesiumClear} variant="outline">
                  Clear
                </Button>
              )}
              <Button onClick={onClose} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </SandcastleDialog>
  );
}
