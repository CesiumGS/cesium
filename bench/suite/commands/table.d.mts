// Types for table.mjs (dyno's commands).
import type { CommandNode } from "./dispatch.mjs";
export const TABLE: Record<string, CommandNode>;
export function cli(argv?: string[]): Promise<number>;
