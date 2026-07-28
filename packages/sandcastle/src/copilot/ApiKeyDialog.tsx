import { useState, useMemo } from "react";
import { Anchor, Button, Field, TextBox } from "@stratakit/bricks";
import { Tabs, unstable_Banner as Banner } from "@stratakit/structures";
import { SandcastleDialog } from "../SandcastleDialog";
import { ApiKeyManager } from "./ai/clients/ApiKeyManager";
import { useModel } from "./contexts/useModel";
import "./ApiKeyDialog.css";

function KeyActions({
  onSave,
  saveDisabled,
  onClose,
}: {
  onSave: () => void;
  saveDisabled: boolean;
  onClose: () => void;
}) {
  return (
    <div className="api-dialog-actions">
      <Button tone="accent" onClick={onSave} disabled={saveDisabled}>
        Save
      </Button>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApiKeyDialog({ open, onClose, onSuccess }: ApiKeyDialogProps) {
  return (
    <SandcastleDialog open={open} onClose={onClose} title="API Configuration">
      {open && <ApiKeyDialogBody onClose={onClose} onSuccess={onSuccess} />}
    </SandcastleDialog>
  );
}

function ApiKeyDialogBody({
  onClose,
  onSuccess,
}: Omit<ApiKeyDialogProps, "open">) {
  const { refreshModels } = useModel();
  const hasVertexCredentials = ApiKeyManager.hasVertexServiceAccount();

  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicError, setAnthropicError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const [vertexJson, setVertexJson] = useState("");
  const [vertexRegion, setVertexRegion] = useState(
    ApiKeyManager.getVertexRegion(),
  );
  const [vertexError, setVertexError] = useState<string | null>(null);
  const [showVertexJson, setShowVertexJson] = useState(false);

  const vertexProjectId = useMemo(() => {
    if (!vertexJson.trim()) {
      return ApiKeyManager.getVertexProjectId();
    }
    try {
      const parsed = JSON.parse(vertexJson) as Record<string, unknown>;
      return typeof parsed.project_id === "string" ? parsed.project_id : null;
    } catch {
      return null;
    }
  }, [vertexJson]);

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

  const handleVertexSave = () => {
    const jsonTrimmed = vertexJson.trim();
    const hasStoredCredentials = ApiKeyManager.hasVertexServiceAccount();

    if (!jsonTrimmed && !hasStoredCredentials) {
      setVertexError("Please paste your service account JSON key file");
      return;
    }
    if (
      jsonTrimmed &&
      !ApiKeyManager.validateVertexServiceAccountFormat(jsonTrimmed)
    ) {
      setVertexError(
        'Invalid service account JSON. Required: type "service_account", project_id, client_email, and a valid private_key.',
      );
      return;
    }
    const regionTrimmed = vertexRegion.trim().toLowerCase();
    if (regionTrimmed && !/^[a-z]+[a-z0-9-]*[a-z0-9]$/.test(regionTrimmed)) {
      setVertexError('Invalid region format. Example: "us-central1".');
      return;
    }
    try {
      if (jsonTrimmed) {
        ApiKeyManager.saveVertexServiceAccount(jsonTrimmed);
      }
      ApiKeyManager.saveVertexRegion(regionTrimmed || "global");
      refreshModels();
      onSuccess();
      onClose();
    } catch (err) {
      setVertexError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <form className="api-dialog-content" onSubmit={(e) => e.preventDefault()}>
      <Banner
        className="api-dialog-notice"
        tone="attention"
        label="Security Notice"
        message="API keys are stored in your browser's session storage and sent directly to the provider from your browser. Keys are cleared when you close this tab. Do not use this on shared or untrusted devices."
      />
      <Tabs.Provider defaultSelectedId="anthropic">
        <Tabs.TabList>
          <Tabs.Tab id="anthropic">Anthropic</Tabs.Tab>
          <Tabs.Tab id="gemini">Gemini</Tabs.Tab>
          <Tabs.Tab id="vertex">Vertex AI</Tabs.Tab>
        </Tabs.TabList>

        <Tabs.TabPanel tabId="anthropic">
          <div className="api-dialog-panel">
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
                    placeholder={
                      ApiKeyManager.hasAnthropicApiKey()
                        ? "Key saved • enter new key to replace"
                        : "sk-ant-..."
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                }
              />
              <Field.Description>
                Get your key at{" "}
                <Anchor
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                >
                  console.anthropic.com/settings/keys
                </Anchor>
              </Field.Description>
              {anthropicError && (
                <Field.ErrorMessage>{anthropicError}</Field.ErrorMessage>
              )}
            </Field.Root>
            <KeyActions
              onSave={handleAnthropicSave}
              saveDisabled={!anthropicKey.trim()}
              onClose={onClose}
            />
          </div>
        </Tabs.TabPanel>

        <Tabs.TabPanel tabId="gemini">
          <div className="api-dialog-panel">
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
                    placeholder={
                      ApiKeyManager.hasApiKey()
                        ? "Key saved • enter new key to replace"
                        : "AIza..."
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                }
              />
              <Field.Description>
                Get your key at{" "}
                <Anchor
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                >
                  aistudio.google.com/app/apikey
                </Anchor>
              </Field.Description>
              {geminiError && (
                <Field.ErrorMessage>{geminiError}</Field.ErrorMessage>
              )}
            </Field.Root>
            <KeyActions
              onSave={handleGeminiSave}
              saveDisabled={!apiKey.trim()}
              onClose={onClose}
            />
          </div>
        </Tabs.TabPanel>

        <Tabs.TabPanel tabId="vertex">
          <div className="api-dialog-panel">
            <Field.Root>
              <div className="api-dialog-label-row">
                <Field.Label>Service Account JSON</Field.Label>
                <Button
                  variant="ghost"
                  onClick={() => setShowVertexJson((prev) => !prev)}
                >
                  {showVertexJson ? "Hide" : "Show"}
                </Button>
              </div>
              <Field.Control
                render={
                  <TextBox.Textarea
                    value={vertexJson}
                    onChange={(e) => {
                      setVertexJson(e.target.value);
                      setVertexError(null);
                    }}
                    placeholder={
                      hasVertexCredentials
                        ? "Credentials saved • paste new JSON to replace"
                        : "Paste your GCP service account JSON key file here..."
                    }
                    rows={6}
                    spellCheck={false}
                    autoComplete="off"
                    className={
                      showVertexJson ? undefined : "vertex-json-masked"
                    }
                    {...({ "data-1p-ignore": "true" } as Record<
                      string,
                      string
                    >)}
                  />
                }
              />
              <Field.Description>
                Download from GCP Console &gt; IAM &gt; Service Accounts &gt;
                Keys
              </Field.Description>
              {vertexError && (
                <Field.ErrorMessage>{vertexError}</Field.ErrorMessage>
              )}
            </Field.Root>
            {vertexProjectId && (
              <div className="api-dialog-project-id">
                <span className="api-dialog-project-id-label">Project ID</span>
                <span className="api-dialog-project-id-value">
                  {vertexProjectId}
                </span>
              </div>
            )}
            <Field.Root>
              <Field.Label>Region</Field.Label>
              <Field.Control
                render={
                  <TextBox.Input
                    type="text"
                    value={vertexRegion}
                    onChange={(e) => {
                      setVertexRegion(e.target.value);
                      setVertexError(null);
                    }}
                    placeholder="global"
                    autoComplete="off"
                    spellCheck={false}
                  />
                }
              />
              <Field.Description>Vertex AI region.</Field.Description>
            </Field.Root>
            <div className="api-dialog-actions">
              <Button
                tone="accent"
                onClick={handleVertexSave}
                disabled={!vertexJson.trim() && !hasVertexCredentials}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </Tabs.TabPanel>
      </Tabs.Provider>
    </form>
  );
}
