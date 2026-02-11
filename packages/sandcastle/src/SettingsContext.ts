import { createContext } from "react";

export type AvailableFontId =
  | "droid-sans"
  | "fira-code"
  | "cascadia-code"
  | "jetbrains-mono";
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
  "cascadia-code": {
    readableName: "Cascadia Code",
    cssValue: "Cascadia Code",
    supportsLigatures: true,
  },
  "jetbrains-mono": {
    readableName: "JetBrains Mono",
    cssValue: "JetBrains Mono",
    supportsLigatures: true,
  },
};

export type LeftPanel = "editor" | "gallery" | "test-bench";

export type Settings = {
  theme: "dark" | "light";
  fontFamily: AvailableFontId;
  fontSize: number;
  fontLigatures: boolean;
  defaultPanel: LeftPanel;
};

export const initialSettings: Settings = {
  theme: "dark",
  fontFamily: "droid-sans",
  fontSize: 14,
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
