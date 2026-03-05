import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
  useEffect,
} from "react";
import { AIClientFactory } from "../AI/AIClientFactory";
import type { AIModel, AIRoute, ModelSelection } from "../AI/types";

/**
 * Model information for UI display
 */
export interface ModelInfo {
  id: AIModel;
  route: AIRoute;
  displayName: string;
  displaySuffix?: string;
  provider: "gemini" | "anthropic";
  isAvailable: boolean;
}

export interface ModelContextType {
  models: ModelInfo[];
  currentModel: ModelSelection | null;
  pinnedModels: string[];
  setCurrentModel: (selection: ModelSelection) => void;
  togglePin: (modelId: string) => void;
  refreshModels: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ModelContext = createContext<ModelContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "cesium-copilot-pinned-models";

/**
 * Get all models with availability status and route info.
 * Claude models are listed first (preferred when available).
 */
function getAllModels(): ModelInfo[] {
  return AIClientFactory.getAvailableModelEntries().map((entry) => ({
    id: entry.id,
    route: entry.route,
    displayName: entry.displayName,
    displaySuffix: entry.displaySuffix,
    provider: entry.provider,
    isAvailable: AIClientFactory.canUseModelRoute(entry.id, entry.route),
  }));
}

/**
 * Load pinned models from localStorage
 */
function loadPinnedModels(): string[] {
  try {
    const stored = localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load pinned models:", error);
  }
  return [];
}

/**
 * Save pinned models to localStorage
 */
function savePinnedModels(pinnedModels: string[]): void {
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(pinnedModels));
  } catch (error) {
    console.warn("Failed to save pinned models:", error);
  }
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ModelInfo[]>(getAllModels);
  const [currentModel, setCurrentModelState] = useState<ModelSelection | null>(
    AIClientFactory.getDefaultModelSelection(),
  );
  const [pinnedModels, setPinnedModels] = useState<string[]>(loadPinnedModels);

  // Use ref for currentModel to keep refreshModels stable
  const currentModelRef = useRef(currentModel);
  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  // Refresh models - exposed via context for same-tab updates
  const refreshModels = useCallback(() => {
    const updatedModels = getAllModels();
    setModels(updatedModels);

    const current = currentModelRef.current;
    if (!current) {
      // No model selected - pick default
      const defaultSel = AIClientFactory.getDefaultModelSelection();
      if (defaultSel) {
        setCurrentModelState(defaultSel);
      }
    } else if (
      !AIClientFactory.canUseModelRoute(current.model, current.route)
    ) {
      // Current route is no longer available - switch to default
      const defaultSel = AIClientFactory.getDefaultModelSelection();
      setCurrentModelState(defaultSel);
    }
  }, []);

  // Listen for storage events (when credentials are updated in another tab)
  useEffect(() => {
    window.addEventListener("storage", refreshModels);

    return () => {
      window.removeEventListener("storage", refreshModels);
    };
  }, [refreshModels]);

  const setCurrentModel = useCallback((selection: ModelSelection) => {
    setCurrentModelState(selection);
  }, []);

  const togglePin = useCallback((modelId: string) => {
    setPinnedModels((prev) => {
      const newPinned = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId];

      savePinnedModels(newPinned);
      return newPinned;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      models,
      currentModel,
      pinnedModels,
      setCurrentModel,
      togglePin,
      refreshModels,
    }),
    [
      models,
      currentModel,
      pinnedModels,
      setCurrentModel,
      togglePin,
      refreshModels,
    ],
  );

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
}
