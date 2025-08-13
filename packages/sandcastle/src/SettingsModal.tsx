import { Dialog, DialogDismiss, DialogHeading } from "@ariakit/react";
import "./SettingsModal.css";
import { useContext } from "react";
import {
  AvailableFontId,
  availableFonts,
  SettingsContext,
} from "./SettingsContext";
import { Button, Field, Select, Switch } from "@stratakit/bricks";

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
    <Dialog open={open} onClose={() => setOpen(false)} className="dialog">
      <DialogHeading className="heading">Settings</DialogHeading>
      <p>Theme: {settings.theme}</p>
      <Button
        onClick={() => {
          if (settings.theme === "dark") {
            updateSettings({ theme: "light" });
          } else {
            updateSettings({ theme: "dark" });
          }
        }}
      >
        Change Theme
      </Button>
      <p>Font size: {settings.fontSize}</p>
      <Button
        onClick={() => {
          if (settings.fontSize === "large") {
            updateSettings({ fontSize: "small" });
          } else {
            updateSettings({ fontSize: "large" });
          }
        }}
      >
        Change Font Size
      </Button>
      <Select.Root>
        <Select.HtmlSelect
          className="tag-select"
          value={settings.fontFamily}
          onChange={(e) => {
            updateSettings({ fontFamily: e.target.value as AvailableFontId });
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
        <Field.Label>Use Font Ligatures</Field.Label>
      </Field.Root>
      <div>
        <DialogDismiss className="button">OK</DialogDismiss>
      </div>
    </Dialog>
  );
}
