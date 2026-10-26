import type { OpenAIReasoningEffort } from "../ai/types";
import { createContext } from "react";

export type CopilotSettings = {
  openaiReasoningEffort: OpenAIReasoningEffort;
  extendedThinking: {
    enabled: boolean;
    budget: number;
  };
  customPromptAddendum: string;
  autoFixEnabled: boolean;
};

export const initialCopilotSettings: CopilotSettings = {
  openaiReasoningEffort: "medium",
  extendedThinking: {
    enabled: true,
    budget: 2048,
  },
  customPromptAddendum: "",
  autoFixEnabled: true,
};

export const CopilotSettingsContext = createContext<{
  settings: CopilotSettings;
  updateSettings: (newSettings: Partial<CopilotSettings>) => void;
}>({
  settings: initialCopilotSettings,
  updateSettings: () => {},
});
