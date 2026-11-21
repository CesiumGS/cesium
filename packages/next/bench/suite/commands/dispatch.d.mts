// Types for dispatch.mjs (dyno's dispatcher and its tests).
export const API_VERSION: number;
export const EXIT: Record<
  "ok" | "problem" | "usage" | "not-built" | "refused",
  number
>;
export const EXIT_MEANINGS: Record<number, string>;
export class DynoError extends Error {
  constructor(kind: string, message: string, data?: Record<string, unknown>);
  kind: string;
  data: Record<string, unknown>;
}
export interface CommandNode {
  summary?: string;
  usage?: string;
  planned?: string;
  hidden?: boolean;
  children?: Record<string, CommandNode>;
  options?: Record<string, { help?: string; value?: string }>;
}
export function parseOptions(
  tokens: string[],
  spec?: Record<string, unknown>,
): { opts: Record<string, string | true>; positional: string[] };
export function describe(
  table: Record<string, CommandNode>,
  prefix?: string[],
): unknown[];
export function dispatch(
  argv: string[],
  io: {
    table: Record<string, CommandNode>;
    env?: Record<string, string | undefined>;
    stdout?: (line: string) => void;
    stderr?: (line: string) => void;
  },
): Promise<number>;
