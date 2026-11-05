/**
 * The Slang release the engine is built and tested with (plan §3.4): the
 * native slangc and the WebAssembly build are pinned to it
 * (scripts/slangTools.mjs), the generated shaders are compiled with it, and
 * browser-compiled shaders are cached under it (slangCache.ts). Node-safe.
 */
export const SLANG_VERSION = "2026.21";
