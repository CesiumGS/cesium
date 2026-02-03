import { createContext } from "react";
import type { AutoIterationConfig } from "./AI/types";

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

export type LeftPanel = "editor" | "gallery";

export type Settings = {
  theme: "dark" | "light";
  fontFamily: AvailableFontId;
  fontSize: number;
  fontLigatures: boolean;
  defaultPanel: LeftPanel;
  autoIteration: AutoIterationConfig;
  extendedThinking: {
    enabled: boolean;
    budget: number;
  };
  autoApplyChanges: boolean;
  pinnedModels: string[];
  customPromptAddendum: string;
};

export const initialSettings: Settings = {
  theme: "dark",
  fontFamily: "droid-sans",
  fontSize: 14,
  fontLigatures: false,
  defaultPanel: "gallery",
  autoIteration: {
    enabled: true,
    maxIterations: 3,
    maxTotalRequests: 20,
    escalationThreshold: 3,
    waitTimeMs: 5000,
    detectOscillation: true,
    includeStackTraces: true,
  },
  extendedThinking: {
    enabled: true,
    budget: 2048,
  },
  autoApplyChanges: true,
  pinnedModels: [],
  customPromptAddendum: "",
};

export const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}>({
  settings: initialSettings,
  updateSettings: () => {},
});
