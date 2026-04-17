export { ChatPanel } from "./ChatPanel";
export { ErrorBoundary } from "./ErrorBoundary";
export { DiffReviewPanel, type DiffReviewItem } from "./DiffReviewPanel";

export { InlineChangeWidget } from "./editor/InlineChangeWidget";

export { DiffApplier } from "./ai/diff/DiffApplier";
export { DiffMatcher } from "./ai/diff/DiffMatcher";

export { ModelProvider } from "./contexts/ModelContext";

export type {
  ApplyResult,
  CodeContext,
  DiffBlock,
  DiffError,
  InlineChange,
  ExecutionResult,
} from "./ai/types";
