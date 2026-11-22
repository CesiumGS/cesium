// Types for measure.mjs (dyno's measurements and their tests).
export const KINDS: Record<string, string[]>;
export interface Measurement {
  handle: string;
  kind: string;
  args: string[];
  target: string;
  state: string;
  requested_by: { via: string; caller?: string };
  requested: string;
  started?: string;
  finished?: string;
  exit_code?: number;
  result?: Record<string, unknown>;
  completion?: Record<string, unknown>;
}
export function storeDirectory(options?: {
  env?: Record<string, string | undefined>;
  fake?: boolean;
}): string;
export function readMeasurement(dir: string, handle: string): Measurement;
export function work(options: {
  handle: string;
  env?: Record<string, string | undefined>;
  runCommand?: (
    record: Measurement,
    env: Record<string, string | undefined>,
    log: (text: string) => void,
  ) => Promise<{ code: number; answer: Record<string, unknown> }>;
  quiet?: () => { quiet: boolean; others?: boolean; reasons: string[] };
  pollMs?: number;
  log?: (text: string) => void;
}): Promise<Measurement>;
