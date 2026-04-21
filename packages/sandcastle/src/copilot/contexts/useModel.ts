import { useContext } from "react";
import { ModelContext, ModelContextType } from "./ModelContext";

/** Throws if used outside of a ModelProvider. */
export function useModel(): ModelContextType {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
