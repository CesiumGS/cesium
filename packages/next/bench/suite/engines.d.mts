export type EngineSource =
  | { kind: "release"; version: string }
  | { kind: "tree"; ref?: string }
  | { kind: "ref"; ref: string; sha?: string };
export interface ParsedEngine {
  engine: "1.x" | "2.0";
  source: EngineSource;
  variants: string[];
}
export function parseEngine(spec: string): ParsedEngine;
export function engineId(parsed: {
  engine: "1.x" | "2.0";
  source: EngineSource;
  variants?: string[];
}): string;
export function isRelease(id: string): boolean;
export function engineOf(id: string): "1.x" | "2.0";
export function setupOf(id: string): string;
export function engineLabel(id: string, options?: { short?: boolean }): string;
export function compareEngines(a: string, b: string): number;
