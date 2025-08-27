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
      <SandcastleDialogFooter>
        <DialogDismiss render={<Button>Done</Button>}></DialogDismiss>
      </SandcastleDialogFooter>
    </SandcastleDialog>
  );
}
