// Types for serve.mjs (`npm run dyno` and its tests).
export const PORTS: { from: number; to: number };
export function canListen(port: number, host: string): Promise<boolean>;
export function freePort(options?: {
  from?: number;
  to?: number;
  free?: (port: number) => Promise<boolean>;
}): Promise<number>;
