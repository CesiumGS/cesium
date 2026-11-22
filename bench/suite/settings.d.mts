export type SettingValue = number | boolean | string;

export interface Setting {
  id: string;
  label: string;
  description: string;
  type: "number" | "integer" | "boolean" | "enum";
  min?: number;
  max?: number;
  values?: string[];
  also?: string[];
  engines: Array<"1.x" | "2.0">;
  kinds: string[];
  aliases?: string[];
  /** `param.` settings: the examples that declare it. */
  examples?: string[];
}

/** A parameter an example declares (examples/index.ts `params`). */
export interface DeclaredParam {
  name: string;
  label: string;
  type: "number" | "integer" | "boolean" | "enum";
  min?: number;
  max?: number;
  values?: readonly string[];
}
export function registerExampleParams(
  examples: ReadonlyArray<{
    id: string;
    title: string;
    params?: readonly DeclaredParam[];
  }>,
): Setting[];
export function paramsNotTaken(
  settingIds: string[],
  scenes: ReadonlyArray<{ id: string; example: string }>,
): string[];

export const NAMESPACES: string[];
export const SETTINGS: Setting[];
export class SettingError extends Error {}
export function findSetting(key: string): Setting | undefined;
export function rangeOf(setting: Setting): string;
export function settingsList(filter?: {
  engine?: string;
  kind?: string;
}): string;
export function checkSetting(
  key: string,
  raw: unknown,
  filter?: { engine?: string; kind?: string },
): { setting: Setting; value: SettingValue };
export function parseValue(setting: Setting, raw: unknown): SettingValue;
export function variantKey(setting: Setting): string;
export function configPath(setting: Setting): string;
export function variantWords(key: string, value: unknown): string;
export function checkVariants(
  parsed: { engine: string; variants: string[] },
  kind?: string,
): Array<{ setting: Setting; value: SettingValue }>;

export interface SweepAxis {
  id: string;
  values: SettingValue[];
}
export interface SweepReference {
  id: string;
  value: SettingValue;
  reps: number;
  /** A variant outside the grid, run once per combination of the axes. */
  outside?: boolean;
}
export interface SweepPlan {
  axes: SweepAxis[];
  points: Array<{ coords: Record<string, SettingValue>; reference?: true }>;
  reference?: SweepReference;
}
/** A run's sweep record, either form, read as axes and points. */
export interface SweepRecord {
  axes: SweepAxis[];
  reference?: SweepReference;
  engines: string[];
  points: Array<{
    coords: Record<string, SettingValue>;
    configs: string[];
    reference?: true;
  }>;
}
export function pointSuffix(
  coords: Record<string, SettingValue>,
  order: string[],
): string;
export function planSweep(options?: {
  sweeps?: string[];
  file?: unknown;
  reference?: string;
  referenceReps?: string | number;
  engine?: string;
  kind?: string;
}): SweepPlan | undefined;
export function readSweep(sweep: unknown): SweepRecord | undefined;

/** `{ engine, view }`: a 2.0 engine and one of its views. */
export interface ViewTarget {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine's View and Engine, untyped here
  engine?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above
  view: any;
}
export function applyViewSettings(target: ViewTarget, settings?: object): void;
export function readViewSettings(target: ViewTarget): Record<string, unknown>;
export function unappliedViewSettings(
  asked?: object,
  held?: Record<string, unknown>,
): string[];
