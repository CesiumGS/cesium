import { createContext } from "react";

export type AvailableFontId = "droid-sans" | "fira-code" | "dejavu-sans";
type FontDefinition = {
  readableName: string;
  cssValue: string;
  supportsLigatures: boolean;
};
export const availableFonts: Record<AvailableFontId, FontDefinition> = {
  "droid-sans": {
    readableName: "Droid Sans Mono (default)",
    cssValue: "Droid Sans Mono",
    supportsLigatures: false,
  },
  "fira-code": {
    readableName: "Fira Code",
    cssValue: "Fira Code",
    supportsLigatures: true,
  },
  "dejavu-sans": {
    readableName: "DejaVu Sans Mono",
    cssValue: "DejaVu Sans Mono",
    supportsLigatures: false,
  },
};

export type LeftPanel = "editor" | "gallery";

export type Settings = {
  theme: "dark" | "light";
  fontFamily: AvailableFontId;
  fontLigatures: boolean;
  defaultPanel: LeftPanel;
};

export const initialSettings: Settings = {
  theme: "dark",
  fontFamily: "droid-sans",
  fontLigatures: false,
  defaultPanel: "gallery",
};

export const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}>({
  settings: initialSettings,
  updateSettings: () => {},
});
