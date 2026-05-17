import { createContext } from "react";

export type CopilotSettings = {
  extendedThinking: {
    enabled: boolean;
    budget: number;
  };
  customPromptAddendum: string;
  autoFixEnabled: boolean;
};

export const initialCopilotSettings: CopilotSettings = {
  extendedThinking: {
    enabled: true,
    budget: 2048,
  },
  customPromptAddendum: "",
  autoFixEnabled: false,
};

export const CopilotSettingsContext = createContext<{
  settings: CopilotSettings;
  updateSettings: (newSettings: Partial<CopilotSettings>) => void;
}>({
  settings: initialCopilotSettings,
  updateSettings: () => {},
});
