import { ReactNode, useCallback, useMemo } from "react";
import { useLocalStorage } from "react-use";
import {
  CopilotSettings,
  CopilotSettingsContext,
  initialCopilotSettings,
} from "./CopilotSettingsContext";

export function CopilotSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, updateSettings] = useLocalStorage<CopilotSettings>(
    "sandcastle/copilot-settings",
    initialCopilotSettings,
    {
      raw: false,
      serializer: (value) =>
        JSON.stringify({
          extendedThinking:
            value.extendedThinking ?? initialCopilotSettings.extendedThinking,
          customPromptAddendum:
            value.customPromptAddendum ??
            initialCopilotSettings.customPromptAddendum,
          autoFixEnabled:
            value.autoFixEnabled ?? initialCopilotSettings.autoFixEnabled,
        }),
      deserializer: (value) => {
        const parsed = JSON.parse(value);
        return {
          extendedThinking: {
            ...initialCopilotSettings.extendedThinking,
            ...parsed.extendedThinking,
          },
          customPromptAddendum:
            parsed.customPromptAddendum ??
            initialCopilotSettings.customPromptAddendum,
          autoFixEnabled:
            parsed.autoFixEnabled ?? initialCopilotSettings.autoFixEnabled,
        };
      },
    },
  );

  const mergeSettings = useCallback(
    (newSettings: Partial<CopilotSettings>) => {
      updateSettings({
        ...initialCopilotSettings,
        ...settings,
        ...newSettings,
      });
    },
    [updateSettings, settings],
  );

  const contextValue = useMemo(
    () => ({
      settings: settings ?? initialCopilotSettings,
      updateSettings: mergeSettings,
    }),
    [settings, mergeSettings],
  );

  return (
    <CopilotSettingsContext value={contextValue}>
      {children}
    </CopilotSettingsContext>
  );
}
