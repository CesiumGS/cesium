// Types for smlibTools.mjs (SMLib in WebAssembly, pinned and built in the store).
export const SMLIB_COMMIT: string;
export const EMSDK_VERSION: string;
export function ensureSmlibSource(log?: (line: string) => void): string;
export function ensureEmsdk(log?: (line: string) => void): string;
export function smlibDirectory(): string | undefined;
export function ensureSmlib(log?: (line: string) => void): Promise<string>;
export function checkSmlib(
  directory: string,
  log?: (line: string) => void,
): Promise<void>;
