// Types for serve.mjs (`npm run dyno`, `dyno serve` and their tests).
export const PORTS: { from: number; to: number };
export const SERVERS: Record<string, { owner: number; label: string }>;
export function canListen(port: number, host: string): Promise<boolean>;
export function portFree(port: number): Promise<boolean>;
export function freePort(options?: {
  from?: number;
  to?: number;
  free?: (port: number) => Promise<boolean>;
}): Promise<number>;
export function serversDirectory(
  env?: Record<string, string | undefined>,
): string;
export function alive(pid: number): boolean;
export function answers(port: number, timeoutMs?: number): Promise<boolean>;
export function tail(file: string, lines?: number): string[];
export interface Checkout {
  worktree: string;
  linked: boolean;
}
export function checkout(root?: string): Checkout;
export interface ServerCommand {
  file: string;
  args: string[];
  cwd: string;
  shell?: boolean;
}
export interface ServerState {
  id: string;
  name: string;
  port: number;
  url: string;
  pid: number;
  owner: boolean;
  mine: boolean;
  alive: boolean;
  answering: boolean;
  worktree?: string;
  started?: string;
  log: string;
}
interface Where {
  directory?: string;
  root?: string;
  here?: Checkout;
}
export function startServer(
  options: Where & {
    name: string;
    port?: number;
    owner?: boolean;
    wait?: number;
    command?: (name: string, port: number, root: string) => ServerCommand;
  },
): Promise<{ started: boolean; already_running: boolean; server: ServerState }>;
export function stopServer(
  options: Where & {
    name: string;
    owner?: boolean;
    port?: number;
    graceMs?: number;
  },
): Promise<{
  stopped: boolean;
  reason?: string;
  id?: string;
  port?: number;
  pid?: number;
}>;
export function serverStatus(
  options?: Where,
): Promise<{ directory: string; worktree: string; servers: ServerState[] }>;
export function serverLogs(
  options: Where & {
    name: string;
    owner?: boolean;
    port?: number;
    lines?: number;
  },
): { log: string; lines: string[] };
