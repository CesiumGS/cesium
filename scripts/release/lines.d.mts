/** A package under packages/, with its manifest and its version line. */
export interface LinePackage {
  dir: string;
  manifest: { name: string; version: string; private?: boolean } & Record<string, unknown>;
  line: "stable" | "experimental";
}

/** A version's parts, or undefined when it isn't `major.minor.patch[-pre][+build]`. */
export function parseVersion(version: string):
  | { major: number; minor: number; patch: number; prerelease: string | undefined }
  | undefined;

/** The experimental line's version paired with a stable one: `0.(100 × major + minor).patch[-pre]`. */
export function pairedVersion(version: string): string;

/** `next` for a prerelease, else `latest`. */
export function distTag(version: string): "next" | "latest";

/** Whether `next` is lower than `current`. */
export function isLower(next: string, current: string): boolean;

/** The stable group: Changesets' one `fixed` group. */
export function stableNames(config: { fixed?: string[][] }): string[];

/** The repository's Changesets config. */
export function readConfig(): { fixed?: string[][]; ignore?: string[] } & Record<string, unknown>;

/** Each package with its line: `stable` when in the fixed group, else `experimental`. */
export function withLines<T extends { manifest: { name: string } }>(
  packages: readonly T[],
  stable: readonly string[],
): (T & { line: "stable" | "experimental" })[];

/** The problems with the two lines; an empty list when none. */
export function lineProblems(
  packages: readonly Pick<LinePackage, "manifest" | "line">[],
  stable: readonly string[],
): string[];

/** Writes the paired version into each experimental package; returns their names. */
export function applyPaired(packages: readonly LinePackage[]): string[];

/** `text` with its first `## <from>` heading renamed `## <to>`. */
export function renameNewestHeading(text: string, from: string, to: string): string;

/** The repository's packages under packages/, each with its line. */
export function repositoryPackages(): { stable: string[]; packages: LinePackage[] };
