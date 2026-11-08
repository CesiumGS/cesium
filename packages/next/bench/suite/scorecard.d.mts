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
