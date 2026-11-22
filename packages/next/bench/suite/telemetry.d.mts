// Types for telemetry.mjs: what TypeScript reads of it (the tests).
export function machineState(options?: {
  os?: string;
  run?: (file: string, args: string[]) => string | undefined;
  load?: () => number[];
}): {
  power?: "ac" | "battery";
  battery?: number;
  loadAverage?: number[];
  thermal?: string;
};
export function conditions(): Record<string, unknown>;
