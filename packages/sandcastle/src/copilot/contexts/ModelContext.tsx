import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
  useEffect,
} from "react";
import { AIClientFactory } from "../ai/clients/AIClientFactory";
import type { AIModel, AIRoute, ModelSelection } from "../ai/types";

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
  setCurrentModel: (selection: ModelSelection) => void;
  refreshModels: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ModelContext = createContext<ModelContextType | undefined>(
  undefined,
);

const LAST_MODEL_SELECTION_STORAGE_KEY = "cesium-copilot-last-model-selection";
const persistentModelStorage =
  typeof localStorage !== "undefined" ? localStorage : null;
const legacySessionModelStorage =
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
    const stored = persistentModelStorage?.getItem(
      LAST_MODEL_SELECTION_STORAGE_KEY,
    );
    if (!stored) {
      const legacyStored = legacySessionModelStorage?.getItem(
        LAST_MODEL_SELECTION_STORAGE_KEY,
      );
      if (!legacyStored) {
        return null;
      }

      const parsedLegacy = JSON.parse(legacyStored);
      if (isValidModelSelection(parsedLegacy)) {
        if (persistentModelStorage) {
          persistentModelStorage.setItem(
            LAST_MODEL_SELECTION_STORAGE_KEY,
            JSON.stringify(parsedLegacy),
          );
          legacySessionModelStorage?.removeItem(
            LAST_MODEL_SELECTION_STORAGE_KEY,
          );
        }
        return parsedLegacy;
      }

      return null;
    }

    const parsed = JSON.parse(stored);
    if (isValidModelSelection(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to load last picked model from storage:", error);
  }

  return null;
}

function savePreferredModelSelection(selection: ModelSelection): void {
  if (!persistentModelStorage) {
    console.warn(
      "localStorage unavailable — last picked model will not persist",
    );
    return;
  }

  try {
    persistentModelStorage.setItem(
      LAST_MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(selection),
    );
  } catch (error) {
    console.warn("Failed to save last picked model to localStorage:", error);
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

// Claude models are listed first so they're preferred when available.
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

export function ModelProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ModelInfo[]>(getAllModels);
  const [currentModel, setCurrentModelState] = useState<ModelSelection | null>(
    getInitialModelSelection,
  );

  // Ref keeps refreshModels stable across currentModel changes.
  const currentModelRef = useRef(currentModel);
  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

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

  // Sync model preference across tabs via storage events.
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

  const contextValue = useMemo(
    () => ({
      models,
      currentModel,
      setCurrentModel,
      refreshModels,
    }),
    [models, currentModel, setCurrentModel, refreshModels],
  );

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
}
