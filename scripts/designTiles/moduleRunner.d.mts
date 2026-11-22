/** A Vite module runner over `root`, for TypeScript Node can't strip. */
export function moduleRunner(root: string): Promise<{
  import(path: string): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}>;
