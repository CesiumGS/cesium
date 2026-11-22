// Types for scorecard.mjs (the parts TypeScript callers use).
export interface BudgetScene {
  scene: string;
  value: number;
  limit: number;
  ok: boolean;
}
export function checkBudgets(
  results: unknown,
  budgets?: unknown[],
): Array<{ scenes: BudgetScene[] } & Record<string, unknown>>;
/** A run's scorecard against its plan; undefined without two engines to compare. */
export function scorecard(
  results: unknown,
  options?: { baseline?: string; candidate?: string },
): unknown;
