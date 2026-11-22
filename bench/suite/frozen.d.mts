// Types for frozen.mjs (the tests).
import type { PreviewServer } from "vite";
export function freezeTree(cwd: string): {
  repo: string;
  sha: string;
  dirty: boolean;
};
export function checkoutFrozen(repo: string, sha: string): string;
export function emptyCesium(): string;
export function serveBuild(
  root: string,
  sha: string,
  options: {
    directories: Record<string, string>;
    port: number;
    log?: (line: string) => void;
  },
): Promise<PreviewServer>;
