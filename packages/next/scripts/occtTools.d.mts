// Types for occtTools.mjs (Open CASCADE in WebAssembly, pinned in the store).
export const OCCT_PACKAGE: string;
export const OCCT_VERSION: string;
export function occtDirectory(): string | undefined;
export function ensureOcct(log?: (line: string) => void): string;
