import { useContext } from "react";
import { Field, Select, Switch, Text } from "@stratakit/bricks";
import { SettingsContext } from "../../SettingsContext";

export function GeneralSettings() {
  const { settings, updateSettings } = useContext(SettingsContext);

  return (
    <>
      <Text variant="headline-sm">General</Text>

      <Field.Root>
        <Field.Label>Editor Font</Field.Label>
        <Field.Control
          render={
            <Select.Root>
              <Select.HtmlSelect
                value={settings.fontFamily}
                onChange={(e) =>
                  updateSettings({
                    fontFamily: e.target.value as typeof settings.fontFamily,
                  })
                }
              >
                <option value="droid-sans">Droid Sans Mono</option>
                <option value="fira-code">Fira Code</option>
                <option value="cascadia-code">Cascadia Code</option>
                <option value="jetbrains-mono">JetBrains Mono</option>
              </Select.HtmlSelect>
            </Select.Root>
          }
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Font Size</Field.Label>
        <Field.Control
          render={
            <Select.Root>
              <Select.HtmlSelect
                value={settings.fontSize.toString()}
                onChange={(e) =>
                  updateSettings({ fontSize: parseInt(e.target.value) })
                }
              >
                {[10, 11, 12, 13, 14, 15, 16, 18, 20].map((size) => (
                  <option key={size} value={size.toString()}>
                    {size}px
                  </option>
                ))}
              </Select.HtmlSelect>
            </Select.Root>
          }
        />
      </Field.Root>

      <Field.Root layout="inline">
        <Field.Label>Font Ligatures</Field.Label>
        <Field.Control
          render={
            <Switch
              checked={settings.fontLigatures}
              onChange={(e) =>
                updateSettings({ fontLigatures: e.target.checked })
              }
            />
          }
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Default Panel</Field.Label>
        <Field.Control
          render={
            <Select.Root>
              <Select.HtmlSelect
                value={settings.defaultPanel}
                onChange={(e) =>
                  updateSettings({
                    defaultPanel: e.target.value as "gallery" | "editor",
                  })
                }
              >
                <option value="gallery">Gallery</option>
                <option value="editor">Editor</option>
              </Select.HtmlSelect>
            </Select.Root>
          }
        />
      </Field.Root>
    </>
  );
}
