// Types for runLock.mjs (the CLI and the tests).
export interface LockHolder {
  pid: number;
  start?: string;
  worktree?: string;
  command?: string;
  purpose?: string;
  branch?: string;
  item?: string;
}
export function defaultLockFile(
  env?: Record<string, string | undefined>,
): string;
export function processAlive(pid: number): boolean;
export function holderLine(holder: LockHolder, file: string): string;
export function acquireRunLock(options?: {
  file?: string;
  info?: Record<string, unknown>;
  wait?: boolean;
  onWait?: (holder: LockHolder, file: string) => void;
  pollMs?: number;
  alive?: (pid: number) => boolean;
  pid?: number;
  handlers?: boolean;
}): Promise<{ release: () => void; waitedFor?: LockHolder; file: string }>;
