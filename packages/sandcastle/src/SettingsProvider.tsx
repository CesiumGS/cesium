import { ReactNode, useCallback, useState } from "react";
import {
  availableFonts,
  initialSettings,
  Settings,
  SettingsContext,
} from "./SettingsContext";

// Helper function to safely access localStorage
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`localStorage.getItem failed for key "${key}":`, error);
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    return false;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isLocalStorageAvailable] = useState(() => {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  });

  // Load settings from localStorage using lazy initialization
  const [settings, setSettings] = useState<Settings>(() => {
    if (!isLocalStorageAvailable) {
      console.warn("localStorage is not available, using default settings");
      return initialSettings;
    }

    try {
      const stored = safeGetItem("sandcastle/settings");
      if (stored) {
        const parsedValue = JSON.parse(stored);

        // Validate and sanitize loaded settings
        let fontFamily = parsedValue.fontFamily ?? initialSettings.fontFamily;
        if (!(fontFamily in availableFonts)) {
          fontFamily = "droid-sans";
        }

        let fontSize = parsedValue.fontSize ?? initialSettings.fontSize;
        if (Number.isNaN(fontSize)) {
          fontSize = initialSettings.fontSize;
        }

        const autoIteration = {
          ...initialSettings.autoIteration,
          ...parsedValue.autoIteration,
        };

        const extendedThinking = {
          ...initialSettings.extendedThinking,
          ...parsedValue.extendedThinking,
        };

        return {
          theme: parsedValue.theme ?? initialSettings.theme,
          fontFamily: fontFamily,
          fontSize: fontSize,
          fontLigatures:
            parsedValue.fontLigatures ?? initialSettings.fontLigatures,
          defaultPanel:
            parsedValue.defaultPanel ?? initialSettings.defaultPanel,
          autoIteration: autoIteration,
          extendedThinking: extendedThinking,
          autoApplyChanges:
            parsedValue.autoApplyChanges ?? initialSettings.autoApplyChanges,
          pinnedModels:
            parsedValue.pinnedModels ?? initialSettings.pinnedModels,
          customPromptAddendum:
            parsedValue.customPromptAddendum ??
            initialSettings.customPromptAddendum,
        };
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }

    return initialSettings;
  });

  const mergeSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      // Allow partial updates but make sure we don't lose settings keys
      const mergedSettings = {
        ...initialSettings,
        ...settings,
        ...newSettings,
      };

      // Try to save to localStorage if available
      if (isLocalStorageAvailable) {
        const serialized = JSON.stringify({
          theme: mergedSettings.theme ?? initialSettings.theme,
          fontFamily: mergedSettings.fontFamily ?? initialSettings.fontFamily,
          fontSize: mergedSettings.fontSize ?? initialSettings.fontSize,
          fontLigatures:
            mergedSettings.fontLigatures ?? initialSettings.fontLigatures,
          defaultPanel:
            mergedSettings.defaultPanel ?? initialSettings.defaultPanel,
          autoIteration:
            mergedSettings.autoIteration ?? initialSettings.autoIteration,
          extendedThinking:
            mergedSettings.extendedThinking ?? initialSettings.extendedThinking,
          autoApplyChanges:
            mergedSettings.autoApplyChanges ?? initialSettings.autoApplyChanges,
          pinnedModels:
            mergedSettings.pinnedModels ?? initialSettings.pinnedModels,
          customPromptAddendum:
            mergedSettings.customPromptAddendum ??
            initialSettings.customPromptAddendum,
        });
        safeSetItem("sandcastle/settings", serialized);
      }

      setSettings(mergedSettings);
    },
    [settings, isLocalStorageAvailable],
  );

  return (
    <SettingsContext
      value={{
        settings: settings,
        updateSettings: mergeSettings,
      }}
    >
      {children}
    </SettingsContext>
  );
}
