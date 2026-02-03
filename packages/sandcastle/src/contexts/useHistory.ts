import { useContext } from "react";
import { HistoryContext, type HistoryContextType } from "./HistoryContext";

/**
 * Hook to access conversation history context
 * @throws Error if used outside of HistoryProvider
 */
export function useHistory(): HistoryContextType {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistory must be used within a HistoryProvider");
  }
  return context;
}
