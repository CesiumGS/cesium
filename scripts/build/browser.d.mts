import type { build } from "vite";

/** The browser build's entry points, by output name, to their source files. */
export const BROWSER_ENTRIES: Readonly<Record<string, string>>;

/**
 * Builds the umbrella's browser bundle into `outDir`
 * (packages/cesium/dist/browser by default), emptying it first.
 */
export function buildBrowser(options?: {
  outDir?: string;
  logLevel?: "info" | "warn" | "error" | "silent";
}): ReturnType<typeof build>;
