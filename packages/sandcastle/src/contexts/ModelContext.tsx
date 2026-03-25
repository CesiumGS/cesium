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

const PINNED_MODELS_STORAGE_KEY = "cesium-copilot-pinned-models";
const LAST_MODEL_SELECTION_STORAGE_KEY = "cesium-copilot-last-model-selection";
const sessionModelStorage =
  typeof sessionStorage !== "undefined" ? sessionStorage : null;

function isValidModelSelection(value: unknown): value is ModelSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ModelSelection>;
  return (
    typeof candidate.model === "string" && typeof candidate.route === "string"
  );
}

function areModelSelectionsEqual(
  left: ModelSelection | null,
  right: ModelSelection | null,
): boolean {
  return left?.model === right?.model && left?.route === right?.route;
}

function getStoredPreferredModelSelection(): ModelSelection | null {
  try {
    const stored = sessionModelStorage?.getItem(
      LAST_MODEL_SELECTION_STORAGE_KEY,
    );
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    if (isValidModelSelection(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.warn(
      "Failed to load last picked model from sessionStorage:",
      error,
    );
  }

  return null;
}

function savePreferredModelSelection(selection: ModelSelection): void {
  if (!sessionModelStorage) {
    console.warn(
      "sessionStorage unavailable — last picked model will not persist",
    );
    return;
  }

  try {
    sessionModelStorage.setItem(
      LAST_MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(selection),
    );
  } catch (error) {
    console.warn("Failed to save last picked model to sessionStorage:", error);
  }
}

function getInitialModelSelection(): ModelSelection | null {
  const storedSelection = getStoredPreferredModelSelection();
  if (
    storedSelection &&
    AIClientFactory.canUseModelRoute(
      storedSelection.model,
      storedSelection.route,
    )
  ) {
    return storedSelection;
  }

  return AIClientFactory.getDefaultModelSelection();
}

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
    const stored = localStorage?.getItem(PINNED_MODELS_STORAGE_KEY);
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
    localStorage?.setItem(
      PINNED_MODELS_STORAGE_KEY,
      JSON.stringify(pinnedModels),
    );
  } catch (error) {
    console.warn("Failed to save pinned models:", error);
  }
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ModelInfo[]>(getAllModels);
  const [currentModel, setCurrentModelState] = useState<ModelSelection | null>(
    getInitialModelSelection,
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

    const preferredSelection = getStoredPreferredModelSelection();
    const nextSelection =
      preferredSelection &&
      AIClientFactory.canUseModelRoute(
        preferredSelection.model,
        preferredSelection.route,
      )
        ? preferredSelection
        : AIClientFactory.getDefaultModelSelection();

    if (!areModelSelectionsEqual(currentModelRef.current, nextSelection)) {
      setCurrentModelState(nextSelection);
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
    savePreferredModelSelection(selection);
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
