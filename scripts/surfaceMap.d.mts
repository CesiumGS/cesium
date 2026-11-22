export interface SurfaceOptions {
  /** The package root; default the directory above `scripts`. */
  root?: string;
  /** Entry name to source file (relative to `root`); default the package's `exports` plus the widgets. */
  entries?: Record<string, string>;
}

/** The header line, then one tab-separated line per public export. */
export function surfaceLines(options?: SurfaceOptions): string[];

/**
 * The whole of `api/surface.txt`: the header, the umbrella's entries, then
 * every other package's entries under their full specifiers.
 */
export function surfaceFile(): string[];

/** One public member of a class or interface in the surface map. */
export interface MemberRow {
  entry: string;
  /** The exported name of the class or interface. */
  owner: string;
  /** The member's name; a static member of a class is `static.name`. */
  name: string;
  /** A method, or a property whose type is a function. */
  callable: boolean;
}

/**
 * The public members (own and inherited, statics too) of the given classes and
 * interfaces, sorted by entry, owner and name. Owners the entry does not
 * export give no rows.
 */
export function memberRows(
  owners: readonly { entry: string; name: string }[],
  options?: SurfaceOptions,
): MemberRow[];
