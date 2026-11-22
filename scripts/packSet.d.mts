export const HOST_FOLDER: string;
export const MANIFEST_FORMAT: number;

export interface PackedPackage {
  name: string;
  version: string;
  tarball: string;
  integrity: string;
  size: number;
}

export interface InstallFragment {
  dependencies: Record<string, string>;
  overrides: Record<string, string>;
}

export interface SetManifest {
  format: number;
  commit: string;
  date: string;
  node: string;
  npm: string;
  packages: PackedPackage[];
  install: InstallFragment;
  installFolder: string;
}

/** The folder a set goes to by default: ~/.cesium-bench/packs/<commit>. */
export function defaultOut(commit: string): string;
/** The full SHA of the commit checked out in `repoDir`. */
export function headCommit(repoDir?: string): string;
/** The paths git sees as changed: staged, unstaged, untracked and not ignored. */
export function dirtyPaths(repoDir?: string): string[];
/** Throws, naming the changed paths, when the tree isn't clean. */
export function requireCleanTree(repoDir?: string): void;
/** npm's integrity string for a file. */
export function integrityOf(file: string): string;
/** The package.json fragment a host merges in. */
export function installFragment(
  packages: readonly { name: string; tarball: string }[],
  folder?: string,
): InstallFragment;
/** Packs every package into the output folder; returns the manifest. */
export function packSet(options?: {
  out?: string;
  force?: boolean;
  build?: boolean;
  requireClean?: boolean;
  repoDir?: string;
  log?: (line: string) => void;
}): SetManifest;
/** Checks a set's folder against its manifest; returns the problems. */
export function verifySet(folder: string): string[];
