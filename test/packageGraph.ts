// 2.0's packages as their package.json files declare them (CS-835): each
// package's folder, name, dependencies and entry points, and a resolver for
// the specifiers between them, relative or by name. The import-boundary test
// reads its rule from here, and the tests that walk imports follow names
// through it to the file an entry point names (its @cesium/source
// condition), as development and the suite resolve them. Plain TypeScript
// that Node can run with its types stripped (scripts/handbookData.mjs
// imports it).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

/** The repository root. */
export const repo = normalize(join(import.meta.dirname, ".."));

export interface PackageInfo {
  /** The package's folder, from the root: `packages/core`. */
  readonly dir: string;
  /** Its name: `@cesium/core`. */
  readonly name: string;
  /** The names in its `dependencies` and `peerDependencies`. */
  readonly dependencies: readonly string[];
  /** Each entry point (`.`, `./internal`) and the file it names, from the root. */
  readonly entries: Readonly<Record<string, string>>;
}

interface Manifest {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: Record<string, string | Record<string, string>>;
}

/** A package.json, read as the graph uses it. */
export function packageInfo(dir: string, manifest: Manifest): PackageInfo {
  const entries: Record<string, string> = {};
  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    const file = typeof target === "string" ? target : target["@cesium/source"];
    if (file?.endsWith(".ts")) {
      entries[key] = normalize(join(dir, file)).replaceAll("\\", "/");
    }
  }
  return {
    dir,
    name: manifest.name,
    dependencies: [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ],
    entries,
  };
}

/** Every package under packages/, by folder name. */
export const packages: readonly PackageInfo[] = readdirSync(
  join(repo, "packages"),
)
  .filter((name) => existsSync(join(repo, "packages", name, "package.json")))
  .sort()
  .map((name) =>
    packageInfo(
      `packages/${name}`,
      JSON.parse(
        readFileSync(join(repo, "packages", name, "package.json"), "utf8"),
      ) as Manifest,
    ),
  );

/** The package that holds `file` (a path from the root), if any. */
export function packageOf(
  file: string,
  all: readonly PackageInfo[] = packages,
): PackageInfo | undefined {
  return all.find((p) => file.startsWith(`${p.dir}/`));
}

/** The package a bare specifier names, and the entry point it asks for. */
export function namedPackage(
  specifier: string,
  all: readonly PackageInfo[] = packages,
): { pkg: PackageInfo; entry: string } | undefined {
  for (const pkg of all) {
    if (specifier === pkg.name) {
      return { pkg, entry: "." };
    }
    if (specifier.startsWith(`${pkg.name}/`)) {
      return { pkg, entry: `.${specifier.slice(pkg.name.length)}` };
    }
  }
  return undefined;
}

/**
 * The file a specifier in `from` (a path from the root) loads, from the
 * root: a relative path, or a package's entry point by name. Undefined for
 * anything else (an outside package, a Node built-in). A query (`?raw`) is
 * dropped. Throws for a name of ours that no entry point answers.
 */
export function resolveSpecifier(
  from: string,
  specifier: string,
  all: readonly PackageInfo[] = packages,
): string | undefined {
  const path = specifier.replace(/\?.*$/, "");
  if (path.startsWith(".")) {
    return normalize(join(dirname(from), path)).replaceAll("\\", "/");
  }
  const named = namedPackage(path, all);
  if (!named) {
    return undefined;
  }
  const file = named.pkg.entries[named.entry];
  if (file === undefined) {
    throw new Error(`${from}: ${specifier} is not an entry point`);
  }
  return file;
}

/** The `.ts` files under `dir` (from the root), `.d.ts` aside. */
export function listTs(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(join(repo, dir))) {
    return out;
  }
  for (const entry of readdirSync(join(repo, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...listTs(path));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}
