// Types for instruments.mjs (the tests and the Studies page).
export interface InstrumentMetric {
  key: string;
  label: string;
  unit: string;
  family?: boolean;
}
export interface Instrument {
  id: string;
  title: string;
  runKind: string;
  metrics: InstrumentMetric[];
  noiseFloor: {
    value: number | null;
    aaRun: string | null;
    date: string | null;
  };
}
export const HIGHER_IS_BETTER: Set<string>;
export const INSTRUMENTS: Instrument[];
export function instrumentIds(): string[];
export function instrument(id: string): Instrument | undefined;
export function declares(instrumentId: string, metric: string): boolean;
export function instrumentsFor(metric: string, among?: string[]): string[];
export function metricDirection(metric: string): "lower" | "higher";
