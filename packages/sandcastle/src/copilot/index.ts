export { ChatPanel } from "./ChatPanel";
export { ErrorBoundary } from "./ErrorBoundary";
export { DiffReviewPanel, type DiffReviewItem } from "./DiffReviewPanel";

export { useInlineChanges } from "./editor/useInlineChanges";
export { ConsoleChatAction } from "./integrations/ConsoleChatAction";

export { DiffApplier } from "./ai/diff/DiffApplier";
export { DiffMatcher } from "./ai/diff/DiffMatcher";

export { ModelProvider } from "./contexts/ModelContext";
export { CopilotSettingsProvider } from "./settings/CopilotSettingsProvider";

export type {
  ApplyResult,
  CodeContext,
  DiffBlock,
  DiffError,
  InlineChange,
  ExecutionResult,
} from "./ai/types";
