// The two version lines (CS-613; CS-888, CS-891): the stable packages
// release in lockstep, as Changesets' one `fixed` group in
// .changeset/config.json, and every other package under packages/ is on the
// experimental line, whose version is derived from the stable one:
//
//   0.(100 × major + minor).patch, with the same prerelease suffix
//
// so 2.0.0-alpha.1 pairs with 0.200.0-alpha.1, and 2.1.3 with 0.201.3.
// Changesets versions the stable group; `apply` then writes the derived
// version into each experimental package (its package.json, its sibling
// dependencies and its CHANGELOG.md's newest heading), and `check` proves
// both lines are consistent before anything is packed or published.
//
//   node scripts/release/lines.mjs --check   exits 1, listing each problem
//   node scripts/release/lines.mjs --apply   writes the derived versions
//   node scripts/release/lines.mjs --tag     prints the dist-tag for the version
//
// It imports nothing outside Node, so the release workflow's jobs that run
// no `npm ci` (the record and the publish jobs) can use it.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A version's parts, or undefined when it isn't `major.minor.patch[-pre][+build]`. */
export function parseVersion(version) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
      version,
    );
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

/**
 * The experimental line's version paired with a stable `version` (CS-891):
 * `0.(100 × major + minor).patch`, with the same prerelease suffix. Throws
 * when the version isn't one, or is itself on the 0.x line, or when its
 * minor reaches 100 and would collide with the next major's numbers.
 */
export function pairedVersion(version) {
  const parts = parseVersion(version);
  if (!parts) {
    throw new Error(`${JSON.stringify(version)} isn't a version`);
  }
  const { major, minor, patch, prerelease } = parts;
  if (major === 0) {
    throw new Error(
      `${version} is on the 0.x line; the stable line pairs from 1.0.0`,
    );
  }
  if (minor >= 100) {
    throw new Error(
      `${version}: a minor of 100 or more would pair with ${major + 1}.0's numbers`,
    );
  }
  return `0.${100 * major + minor}.${patch}${prerelease ? `-${prerelease}` : ""}`;
}

/** The dist-tag a version publishes under: `next` for a prerelease, else `latest`. */
export function distTag(version) {
  const parts = parseVersion(version);
  if (!parts) {
    throw new Error(`${JSON.stringify(version)} isn't a version`);
  }
  return parts.prerelease ? "next" : "latest";
}

/**
 * Compares two prereleases' dot-separated identifiers as semver does:
 * numeric identifiers as numbers, below any alphanumeric one, others as
 * ASCII text, and a shorter list below a longer one it begins. Returns a
 * negative number, zero or a positive number.
 */
export function comparePrerelease(a, b) {
  const x = a.split(".");
  const y = b.split(".");
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === undefined) {
      return -1;
    }
    if (y[i] === undefined) {
      return 1;
    }
    const xNumeric = /^\d+$/.test(x[i]);
    const yNumeric = /^\d+$/.test(y[i]);
    if (xNumeric && yNumeric) {
      const d = Number(x[i]) - Number(y[i]);
      if (d !== 0) {
        return Math.sign(d);
      }
    } else if (xNumeric !== yNumeric) {
      return xNumeric ? -1 : 1;
    } else if (x[i] !== y[i]) {
      return x[i] < y[i] ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Compares two versions by semver's precedence: major, minor and patch as
 * numbers, then a prerelease below its release, then the prereleases'
 * identifiers (comparePrerelease). Build metadata is ignored. Throws when
 * either isn't a version.
 */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) {
    throw new Error(`can't compare ${a} with ${b}`);
  }
  for (const key of ["major", "minor", "patch"]) {
    if (x[key] !== y[key]) {
      return Math.sign(x[key] - y[key]);
    }
  }
  if (x.prerelease === y.prerelease) {
    return 0;
  }
  if (!x.prerelease || !y.prerelease) {
    return x.prerelease ? -1 : 1;
  }
  return comparePrerelease(x.prerelease, y.prerelease);
}

/** Whether `next` is lower than `current` (compareVersions). */
export function isLower(next, current) {
  return compareVersions(next, current) < 0;
}

/** The stable group: Changesets' one `fixed` group, from its config. */
export function stableNames(config) {
  const fixed = config.fixed ?? [];
  if (fixed.length !== 1) {
    throw new Error(
      `.changeset/config.json has ${fixed.length} fixed groups; the stable packages are exactly one`,
    );
  }
  return fixed[0];
}

/** The repository's Changesets config. */
export function readConfig(root = repo) {
  return JSON.parse(readFileSync(join(root, ".changeset", "config.json"), "utf8"));
}

/**
 * Every package under packages/, each with its line: `stable` when it is in
 * the fixed group, else `experimental`.
 * @param {{ dir: string, manifest: { name: string } }[]} packages
 * @param {string[]} stable
 */
export function withLines(packages, stable) {
  return packages.map((p) => ({
    ...p,
    line: stable.includes(p.manifest.name) ? "stable" : "experimental",
  }));
}

const DEPENDENCY_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];
const ROOT_DEPENDENCY_FIELDS = ["dependencies", "devDependencies"];

/**
 * The problems with the two lines (an empty list when none):
 * - every stable package is at one version, and every name in the fixed
 *   group is a package under packages/;
 * - every experimental package is at the paired version;
 * - every dependency on a sibling names its exact version, and no stable
 *   package depends on an experimental one;
 * - the root's `package.json`, when given, names each sibling it depends
 *   on (the umbrella, as a dev dependency) at its exact version.
 * @param {{ manifest: { name: string, version: string } & Record<string, unknown>, line: "stable" | "experimental" }[]} packages
 * @param {string[]} stable the fixed group's names
 * @param {Record<string, unknown>} [rootManifest] the root's package.json
 */
export function lineProblems(packages, stable, rootManifest) {
  const problems = [];
  const names = new Set(packages.map((p) => p.manifest.name));
  for (const name of stable) {
    if (!names.has(name)) {
      problems.push(`the fixed group names ${name}, which isn't a package under packages/`);
    }
  }
  const stablePackages = packages.filter((p) => p.line === "stable");
  const versions = [...new Set(stablePackages.map((p) => p.manifest.version))];
  if (versions.length !== 1) {
    problems.push(
      `the stable packages aren't at one version: ${stablePackages.map((p) => `${p.manifest.name}@${p.manifest.version}`).join(", ")}`,
    );
    return problems;
  }
  const version = versions[0];
  let paired;
  try {
    paired = pairedVersion(version);
  } catch (error) {
    problems.push(`the stable version: ${error.message}`);
    return problems;
  }
  const want = new Map(
    packages.map((p) => [p.manifest.name, p.line === "stable" ? version : paired]),
  );
  for (const { manifest, line } of packages) {
    if (manifest.version !== want.get(manifest.name)) {
      problems.push(
        `${manifest.name} (${line}) is at ${manifest.version}, not ${want.get(manifest.name)}`,
      );
    }
    for (const field of DEPENDENCY_FIELDS) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (!want.has(dep)) {
          continue;
        }
        const depLine = stable.includes(dep) ? "stable" : "experimental";
        if (line === "stable" && depLine === "experimental") {
          problems.push(
            `${manifest.name} (stable) depends on ${dep}, which is experimental`,
          );
        }
        if (range !== want.get(dep)) {
          problems.push(
            `${manifest.name}'s ${field} names ${dep}@${range}, not the exact ${want.get(dep)}`,
          );
        }
      }
    }
  }
  for (const field of ROOT_DEPENDENCY_FIELDS) {
    for (const [dep, range] of Object.entries(rootManifest?.[field] ?? {})) {
      if (want.has(dep) && range !== want.get(dep)) {
        problems.push(
          `the root package.json's ${field} names ${dep}@${range}, not the exact ${want.get(dep)}`,
        );
      }
    }
  }
  return problems;
}

/**
 * Writes the paired version into each experimental package, in place: its
 * `version`, its dependencies on siblings (exact), and its CHANGELOG.md's
 * newest `## <version>` heading, which Changesets wrote with a number of
 * its own. With `root` (the repository's folder and its package.json), it
 * also writes any of the root's dependencies on an experimental package;
 * Changesets already writes its dependencies on stable ones. Returns the
 * packages it changed.
 * @param {{ dir: string, manifest: Record<string, any>, line: string }[]} packages
 * @param {{ dir: string, manifest: Record<string, any> }} [root]
 */
export function applyPaired(packages, root) {
  const stable = packages.filter((p) => p.line === "stable");
  const version = stable[0]?.manifest.version;
  if (!version || stable.some((p) => p.manifest.version !== version)) {
    throw new Error("the stable packages aren't at one version; run Changesets first");
  }
  const paired = pairedVersion(version);
  const want = new Map(
    packages.map((p) => [p.manifest.name, p.line === "stable" ? version : paired]),
  );
  const changed = [];
  for (const p of packages) {
    if (p.line !== "experimental") {
      continue;
    }
    const before = p.manifest.version;
    p.manifest.version = paired;
    for (const field of DEPENDENCY_FIELDS) {
      for (const dep of Object.keys(p.manifest[field] ?? {})) {
        if (want.has(dep)) {
          p.manifest[field][dep] = want.get(dep);
        }
      }
    }
    writeFileSync(join(p.dir, "package.json"), `${JSON.stringify(p.manifest, null, 2)}\n`);
    const changelog = join(p.dir, "CHANGELOG.md");
    if (existsSync(changelog) && before !== paired) {
      const text = readFileSync(changelog, "utf8");
      writeFileSync(changelog, renameNewestHeading(text, before, paired));
    }
    changed.push(p.manifest.name);
  }
  if (root) {
    let rewrote = false;
    for (const field of ROOT_DEPENDENCY_FIELDS) {
      for (const [dep, range] of Object.entries(root.manifest[field] ?? {})) {
        if (want.has(dep) && range !== want.get(dep)) {
          root.manifest[field][dep] = want.get(dep);
          rewrote = true;
        }
      }
    }
    if (rewrote) {
      writeFileSync(join(root.dir, "package.json"), `${JSON.stringify(root.manifest, null, 2)}\n`);
    }
  }
  return changed;
}

/** `text` with its first `## <from>` heading renamed `## <to>`. */
export function renameNewestHeading(text, from, to) {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => /^## /.test(line));
  if (index >= 0 && lines[index].trim() === `## ${from}`) {
    lines[index] = `## ${to}`;
  }
  return lines.join("\n");
}

/** Each folder under `<root>/packages/` with a package.json, by path, sorted. */
export function packageFolders(root = repo) {
  const dir = join(root, "packages");
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "package.json")))
    .map((entry) => join(dir, entry.name))
    .sort();
}

/**
 * The repository's packages under packages/, each with its manifest and
 * line, and the root's own package.json.
 */
export function repositoryPackages(root = repo) {
  const stable = stableNames(readConfig(root));
  return {
    stable,
    rootManifest: JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
    packages: withLines(
      packageFolders(root).map((dir) => ({
        dir,
        manifest: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")),
      })),
      stable,
    ),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const { stable, packages, rootManifest } = repositoryPackages();
  if (args.includes("--apply")) {
    const changed = applyPaired(packages, { dir: repo, manifest: rootManifest });
    console.log(
      changed.length > 0
        ? `lines: the experimental line set on ${changed.join(", ")}`
        : "lines: no experimental packages",
    );
  }
  if (args.includes("--tag")) {
    const version = packages.find((p) => p.line === "stable").manifest.version;
    console.log(distTag(version));
  }
  if (args.includes("--check") || args.includes("--apply")) {
    const problems = lineProblems(packages, stable, rootManifest);
    if (problems.length > 0) {
      console.error(`lines: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
      process.exit(1);
    }
    const version = packages.find((p) => p.line === "stable").manifest.version;
    const experimental = packages.filter((p) => p.line === "experimental");
    console.log(
      `lines: ${stable.length} stable packages at ${version}; ${experimental.length > 0 ? `${experimental.length} experimental at ${pairedVersion(version)}` : "no experimental packages"}; dist-tag ${distTag(version)}`,
    );
  }
}
