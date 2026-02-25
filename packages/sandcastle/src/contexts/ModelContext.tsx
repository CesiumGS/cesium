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
import type { AIModel } from "../AI/types";

/**
 * Model information for UI display
 */
export interface ModelInfo {
  id: AIModel;
  displayName: string;
  provider: "gemini" | "anthropic";
  isAvailable: boolean;
}

export interface ModelContextType {
  models: ModelInfo[];
  currentModel: AIModel | null;
  pinnedModels: string[];
  setCurrentModel: (modelId: AIModel) => void;
  togglePin: (modelId: string) => void;
  refreshModels: () => void;
}

export const ModelContext = createContext<ModelContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "cesium-copilot-pinned-models";

/**
 * Get all models with availability status
 * Claude models are listed first (preferred when available)
 */
function getAllModels(): ModelInfo[] {
  return AIClientFactory.getAllModelIds().map((id) => {
    const info = AIClientFactory.getModelInfo(id);
    const isAvailable = AIClientFactory.canUseModel(id);

    return {
      id,
      displayName: info.displayName,
      provider: info.provider,
      isAvailable,
    };
  });
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
  const [currentModel, setCurrentModelState] = useState<AIModel | null>(
    AIClientFactory.getDefaultModel(),
  );
  const [pinnedModels, setPinnedModels] = useState<string[]>(loadPinnedModels);

  // Use ref for currentModel to keep refreshModels stable
  const currentModelRef = useRef(currentModel);
  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  // Refresh models - exposed via context for same-tab updates
  const refreshModels = useCallback(() => {
    setModels(getAllModels());
    const defaultModel = AIClientFactory.getDefaultModel();
    if (defaultModel && !currentModelRef.current) {
      setCurrentModelState(defaultModel);
    }
  }, []);

  // Listen for storage events (when credentials are updated in another tab)
  useEffect(() => {
    window.addEventListener("storage", refreshModels);

    return () => {
      window.removeEventListener("storage", refreshModels);
    };
  }, [refreshModels]);

  const setCurrentModel = useCallback((modelId: AIModel) => {
    setCurrentModelState(modelId);
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
