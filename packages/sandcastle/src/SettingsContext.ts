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

export type Settings = {
  theme: "dark" | "light";
  fontSize: "large" | "small";
  fontFamily: AvailableFontId;
  fontLigatures: boolean;
};

export const initialSettings: Settings = {
  theme: "dark",
  fontSize: "large",
  fontFamily: "droid-sans",
  fontLigatures: false,
};

export const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}>({
  settings: initialSettings,
  updateSettings: () => {},
});
