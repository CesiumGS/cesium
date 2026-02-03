import { useContext } from "react";
import { ModelContext, ModelContextType } from "./ModelContext";

/**
 * Hook to access model context
 * @throws Error if used outside of ModelProvider
 */
export function useModel(): ModelContextType {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
