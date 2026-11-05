// Types for slangWasm.mjs.
export const SLANG_VERSION: string;
export function slangWasmDirectory(): string;
export function ensureSlangWasm(log?: (line: string) => void): Promise<string>;
