import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  CopilotSettings,
  CopilotSettingsContext,
  initialCopilotSettings,
} from "./CopilotSettingsContext";

// sessionStorage is used (matching ApiKeyManager convention for secret-adjacent
// state) so the customPromptAddendum clears when the tab closes. Note that
// sessionStorage does NOT fire storage events across tabs.
const STORAGE_KEY = "sandcastle/copilot-settings";

const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;

function serializeSettings(value: CopilotSettings): string {
  return JSON.stringify({
    extendedThinking:
      value.extendedThinking ?? initialCopilotSettings.extendedThinking,
    customPromptAddendum:
      value.customPromptAddendum ?? initialCopilotSettings.customPromptAddendum,
    autoFixEnabled:
      value.autoFixEnabled ?? initialCopilotSettings.autoFixEnabled,
  });
}

function deserializeSettings(raw: string): CopilotSettings {
  const parsed = JSON.parse(raw);
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
}

function loadSettings(): CopilotSettings {
  if (!storage) {
    return initialCopilotSettings;
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialCopilotSettings;
    }
    return deserializeSettings(raw);
  } catch (error) {
    console.warn("Failed to read Copilot settings from sessionStorage:", error);
    return initialCopilotSettings;
  }
}

export function CopilotSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CopilotSettings>(() =>
    loadSettings(),
  );

  useEffect(() => {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, serializeSettings(settings));
    } catch (error) {
      console.warn(
        "Failed to persist Copilot settings to sessionStorage:",
        error,
      );
    }
  }, [settings]);

  const mergeSettings = useCallback((newSettings: Partial<CopilotSettings>) => {
    setSettings((current) => ({
      ...initialCopilotSettings,
      ...current,
      ...newSettings,
      extendedThinking: {
        ...initialCopilotSettings.extendedThinking,
        ...current.extendedThinking,
        ...newSettings.extendedThinking,
      },
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      settings,
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
