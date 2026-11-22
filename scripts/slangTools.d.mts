// Types for slangTools.mjs (the pinned Slang toolchain).
import type { DatasetStatus } from "./dataFormats.mjs";
export const SLANG_VERSION: string;
export function slangWasmStatus(): DatasetStatus;
export function slangcStatus(): DatasetStatus;
export function slangWasmDirectory(): string;
export function slangcPath(): string | undefined;
export function ensureSlangWasm(log?: (line: string) => void): Promise<string>;
export function ensureSlangc(log?: (line: string) => void): Promise<string>;
