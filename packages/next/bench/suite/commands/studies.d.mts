// Types for commands/studies.mjs: what TypeScript reads of it (the tests).
export interface StudyForRun {
  id: string;
  fm: Record<string, string | string[]>;
  inherit: Record<string, string>;
  expectations: Record<string, unknown>;
}
export function studyForRun(
  opts: Record<string, unknown>,
  options?: { env?: Record<string, string | undefined>; cwd?: string },
): StudyForRun | undefined;
export function applyStudy(
  opts: Record<string, unknown>,
  found: StudyForRun,
): Record<string, { study: string; run: unknown }>;
