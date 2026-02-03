import { DialogDismiss } from "@ariakit/react";
import { useContext } from "react";
import {
  AvailableFontId,
  availableFonts,
  initialSettings,
  LeftPanel,
  SettingsContext,
} from "./SettingsContext";
import {
  Button,
  Field,
  IconButton,
  Select,
  Switch,
  Text,
} from "@stratakit/bricks";
import {
  SandcastleDialog,
  SandcastleDialogFooter,
  SandcastleDialogHeading,
} from "./SandcastleDialog";
import "./SettingsModal.css";
import InfoBadge from "./InfoBadge";
import { moon, retry, sun } from "./icons";
import { Input } from "@stratakit/bricks/TextBox";

export function SettingsModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { settings, updateSettings } = useContext(SettingsContext);

  const selectedFont = availableFonts[settings.fontFamily];

  return (
    <SandcastleDialog open={open} onClose={() => setOpen(false)}>
      <SandcastleDialogHeading>Settings</SandcastleDialogHeading>
      <div className="settings-row">
        <div>Theme</div>
        <div className="multi-option horizontal">
          <IconButton
            icon={sun}
            // @ts-expect-error tone works but is not passed through the types from Button
            tone={settings.theme === "light" ? "accent" : "neutral"}
            label="Light mode"
            onClick={() => {
              if (settings.theme === "dark") {
                updateSettings({ theme: "light" });
              }
            }}
          />
          <IconButton
            icon={moon}
            // @ts-expect-error tone works but is not passed through the types from Button
            tone={settings.theme === "dark" ? "accent" : "neutral"}
            label="Dark mode"
            onClick={() => {
              if (settings.theme === "light") {
                updateSettings({ theme: "dark" });
              }
            }}
          />
        </div>
      </div>
      <div className="settings-row">
        <div>Editor font</div>
        <div className="multi-option">
          <Select.Root>
            <Select.HtmlSelect
              className="tag-select"
              value={settings.fontFamily}
              onChange={(e) => {
                updateSettings({
                  fontFamily: e.target.value as AvailableFontId,
                });
              }}
            >
              {Object.entries(availableFonts).map(([id, family]) => (
                <option value={id} key={id}>
                  {family.readableName}
                </option>
              ))}
            </Select.HtmlSelect>
          </Select.Root>
          <Field.Root>
            <Field.Control
              render={
                <Switch
                  defaultChecked={settings.fontLigatures}
                  onChange={(e) => {
                    updateSettings({ fontLigatures: e.target.checked });
                  }}
                  disabled={!selectedFont.supportsLigatures}
                />
              }
            />
            <Field.Label>
              Font ligatures
              <InfoBadge
                content="Not all fonts support ligatures"
                placement="bottom"
              />
            </Field.Label>
          </Field.Root>
        </div>
      </div>
      <div className="settings-row">
        <div>Editor font size (px)</div>
        <div className="multi-option horizontal">
          {settings.fontSize !== initialSettings.fontSize && (
            <IconButton
              label="Reset"
              icon={retry}
              onClick={() => {
                updateSettings({ fontSize: initialSettings.fontSize });
              }}
            />
          )}
          <Input
            type="number"
            value={settings.fontSize}
            min={5}
            max={50}
            onChange={(e) => {
              updateSettings({ fontSize: Number.parseInt(e.target.value) });
            }}
          />
        </div>
      </div>
      <div className="settings-row">
        <div>
          Show on startup
          <Text variant="caption-lg" className="caption">
            Select the default view mode
          </Text>
        </div>
        <Select.Root>
          <Select.HtmlSelect
            className="tag-select"
            value={settings.defaultPanel}
            onChange={(e) => {
              updateSettings({
                defaultPanel: e.target.value as LeftPanel,
              });
            }}
          >
            <option value="gallery">Gallery</option>
            <option value="editor">Editor</option>
          </Select.HtmlSelect>
        </Select.Root>
      </div>
      <div className="settings-section-heading">
        <Text variant="headline-md">Auto-Iteration</Text>
      </div>
      <div className="settings-row">
        <Field.Root>
          <Field.Control
            render={
              <Switch
                checked={settings.autoIteration.enabled}
                onChange={(e) => {
                  updateSettings({
                    autoIteration: {
                      ...settings.autoIteration,
                      enabled: e.target.checked,
                    },
                  });
                }}
              />
            }
          />
          <Field.Label>Enable Auto-Iteration</Field.Label>
        </Field.Root>
      </div>
      <div className="settings-row">
        <div>
          Max Iterations per Error
          <InfoBadge
            content="Maximum attempts to fix the same error"
            placement="right"
          />
        </div>
        <div className="slider-container">
          <input
            type="range"
            min={1}
            max={10}
            value={settings.autoIteration.maxIterations}
            onChange={(e) => {
              updateSettings({
                autoIteration: {
                  ...settings.autoIteration,
                  maxIterations: Number.parseInt(e.target.value),
                },
              });
            }}
            disabled={!settings.autoIteration.enabled}
          />
          <Text variant="body-md">{settings.autoIteration.maxIterations}</Text>
        </div>
      </div>
      <div className="settings-row">
        <div>
          Max Total Requests
          <InfoBadge
            content="Total AI requests allowed per conversation"
            placement="right"
          />
        </div>
        <div className="slider-container">
          <input
            type="range"
            min={5}
            max={50}
            value={settings.autoIteration.maxTotalRequests}
            onChange={(e) => {
              updateSettings({
                autoIteration: {
                  ...settings.autoIteration,
                  maxTotalRequests: Number.parseInt(e.target.value),
                },
              });
            }}
            disabled={!settings.autoIteration.enabled}
          />
          <Text variant="body-md">
            {settings.autoIteration.maxTotalRequests}
          </Text>
        </div>
      </div>
      <div className="settings-row">
        <div>
          Escalation Threshold
          <InfoBadge
            content="Consecutive failures before asking for help"
            placement="right"
          />
        </div>
        <div className="slider-container">
          <input
            type="range"
            min={2}
            max={5}
            value={settings.autoIteration.escalationThreshold}
            onChange={(e) => {
              updateSettings({
                autoIteration: {
                  ...settings.autoIteration,
                  escalationThreshold: Number.parseInt(e.target.value),
                },
              });
            }}
            disabled={!settings.autoIteration.enabled}
          />
          <Text variant="body-md">
            {settings.autoIteration.escalationThreshold}
          </Text>
        </div>
      </div>
      <div className="settings-row">
        <Field.Root>
          <Field.Control
            render={
              <Switch
                checked={settings.autoIteration.detectOscillation}
                onChange={(e) => {
                  updateSettings({
                    autoIteration: {
                      ...settings.autoIteration,
                      detectOscillation: e.target.checked,
                    },
                  });
                }}
                disabled={!settings.autoIteration.enabled}
              />
            }
          />
          <Field.Label>Detect Oscillating Errors</Field.Label>
        </Field.Root>
      </div>
      <div className="settings-row">
        <Field.Root>
          <Field.Control
            render={
              <Switch
                checked={settings.autoIteration.includeStackTraces}
                onChange={(e) => {
                  updateSettings({
                    autoIteration: {
                      ...settings.autoIteration,
                      includeStackTraces: e.target.checked,
                    },
                  });
                }}
                disabled={!settings.autoIteration.enabled}
              />
            }
          />
          <Field.Label>Include Stack Traces</Field.Label>
        </Field.Root>
      </div>
      <div className="settings-section-heading">
        <Text variant="headline-md">Extended Thinking</Text>
      </div>
      <div className="settings-row">
        <Field.Root>
          <Field.Control
            render={
              <Switch
                checked={settings.extendedThinking.enabled}
                onChange={(e) => {
                  updateSettings({
                    extendedThinking: {
                      ...settings.extendedThinking,
                      enabled: e.target.checked,
                    },
                  });
                }}
              />
            }
          />
          <Field.Label>Enable Extended Thinking</Field.Label>
        </Field.Root>
      </div>
      <div className="settings-row">
        <div>
          Thinking Budget (tokens)
          <Text variant="caption-lg" className="caption">
            Higher budget = more thorough reasoning, but higher cost
          </Text>
        </div>
        <div className="slider-container">
          <input
            type="range"
            min={1024}
            max={10000}
            step={1024}
            value={settings.extendedThinking.budget}
            onChange={(e) => {
              updateSettings({
                extendedThinking: {
                  ...settings.extendedThinking,
                  budget: Number.parseInt(e.target.value),
                },
              });
            }}
            disabled={!settings.extendedThinking.enabled}
          />
          <Text variant="body-md">{settings.extendedThinking.budget}</Text>
        </div>
      </div>
      <SandcastleDialogFooter>
        <DialogDismiss render={<Button>Done</Button>}></DialogDismiss>
      </SandcastleDialogFooter>
    </SandcastleDialog>
  );
}
