// Types for charts.mjs (shared by the CLI and the results page).
export const CHART_CSS: string;
export const CHART_SCRIPT: string;
export function bindChartsIn(root: ParentNode): void;
export function escape(text: unknown): string;
export function forestPlot(options: Record<string, unknown>): string;
export function lineChart(options: Record<string, unknown>): string;
export function statTile(options: Record<string, unknown>): string;
