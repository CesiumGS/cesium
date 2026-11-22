/** The stable group's version now and after `changeset version`, from a scratch copy. */
export function planRelease(root: string, changeset: string): { before: string; after: string };

/** Why a planned release is refused, or undefined. */
export function planProblem(plan: { before: string; after: string }): string | undefined;

/** Writes a release record in `root`; throws, with the tree untouched, when refused. */
export function writeReleaseRecord(
  root: string,
  options?: { lockfile?: boolean; log?: (line: string) => void },
): { before: string; after: string };
