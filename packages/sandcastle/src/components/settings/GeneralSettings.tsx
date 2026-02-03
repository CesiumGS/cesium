import { useContext } from "react";
import {
  SettingsContext,
  availableFonts,
  type AvailableFontId,
  type LeftPanel,
} from "../../SettingsContext";

export function GeneralSettings() {
  const { settings, updateSettings } = useContext(SettingsContext);

  return (
    <div className="settings-category">
      <h3 className="settings-category-title">General Settings</h3>
      <p className="settings-category-description">
        Customize the appearance and behavior of Sandcastle.
      </p>

      <div className="settings-section">
        <div className="settings-group">
          <label htmlFor="theme-select" className="settings-label">
            Theme
          </label>
          <p className="settings-description">
            Choose between light and dark theme
          </p>
          <select
            id="theme-select"
            className="settings-select"
            value={settings.theme}
            onChange={(e) =>
              updateSettings({ theme: e.target.value as "dark" | "light" })
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="settings-group">
          <label htmlFor="font-family-select" className="settings-label">
            Font Family
          </label>
          <p className="settings-description">
            Choose the font for code editor
          </p>
          <select
            id="font-family-select"
            className="settings-select"
            value={settings.fontFamily}
            onChange={(e) =>
              updateSettings({ fontFamily: e.target.value as AvailableFontId })
            }
          >
            {Object.entries(availableFonts).map(([id, font]) => (
              <option key={id} value={id}>
                {font.readableName}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-group">
          <label htmlFor="font-size-input" className="settings-label">
            Font Size
          </label>
          <p className="settings-description">
            Editor font size in pixels (10-24)
          </p>
          <div className="settings-number-input">
            <input
              id="font-size-input"
              type="number"
              className="settings-input"
              min="10"
              max="24"
              value={settings.fontSize}
              onChange={(e) =>
                updateSettings({ fontSize: parseInt(e.target.value) || 14 })
              }
            />
            <span className="settings-input-suffix">px</span>
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Font Ligatures</label>
          <p className="settings-description">
            Enable font ligatures for supported fonts (Fira Code, Cascadia Code,
            JetBrains Mono)
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={settings.fontLigatures}
              disabled={!availableFonts[settings.fontFamily].supportsLigatures}
              onChange={(e) =>
                updateSettings({ fontLigatures: e.target.checked })
              }
            />
            <span>Enable ligatures</span>
          </label>
          {!availableFonts[settings.fontFamily].supportsLigatures && (
            <p className="settings-warning">
              The selected font does not support ligatures
            </p>
          )}
        </div>

        <div className="settings-group">
          <label htmlFor="default-panel-select" className="settings-label">
            Default Panel
          </label>
          <p className="settings-description">
            Which panel to show when Sandcastle loads
          </p>
          <select
            id="default-panel-select"
            className="settings-select"
            value={settings.defaultPanel}
            onChange={(e) =>
              updateSettings({ defaultPanel: e.target.value as LeftPanel })
            }
          >
            <option value="gallery">Gallery</option>
            <option value="editor">Editor</option>
          </select>
        </div>
      </div>
    </div>
  );
}
