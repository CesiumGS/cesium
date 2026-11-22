// The release's packing step (CS-613; CS-889): checks the release and
// packs every package for staging, in a job with no OIDC token. The
// `publish` job then stages exactly these tarballs
// (scripts/release/stageTarballs.mjs).
//
//   node scripts/release/stage.mjs --pack <dir>   checks, then writes the tarballs and release.json
//   node scripts/release/stage.mjs --dry-run      the same into a scratch folder, then a dry-run staging
//
// Before it packs anything, it checks, and stops on the first failure:
// 1. both version lines (scripts/release/lines.mjs);
// 2. no package is `private` (npm refuses to stage one, and making the
//    packages public is the owner's step);
// 3. for a `latest` release, no package's `latest` would move to a lower
//    version (`npm view`; a name not yet on npm passes);
// 4. the packed checks (scripts/build/pack.mjs), which leave each package
//    as it publishes and its tarball.
// `<dir>` must lie inside a scratch folder (the system's temporary folder
// or the runner's RUNNER_TEMP). Then it copies each checked tarball into
// `<dir>` and writes
// `<dir>/release.json`: the version, the dist-tag, and each package's
// tarball and SHA-256, siblings before their dependents and the umbrella
// last. `--dry-run` reports check 2 instead of refusing, skips the release
// gate, and passes `--dry-run` to npm, so it publishes nothing: npm 11's
// dry run skips only the upload (lib/commands/publish.js), and still reads
// each name's versions from the registry.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { checkPacked } from "../build/pack.mjs";
import { distTag, isLower, lineProblems, repositoryPackages } from "./lines.mjs";
import { scratchFolder, sha256, stageTarballs } from "./stageTarballs.mjs";

/**
 * The packages in an order where each comes after the siblings it depends
 * on; ties by name. Throws on a cycle.
 * @param {{ manifest: { name: string, dependencies?: Record<string, string>, peerDependencies?: Record<string, string> } }[]} packages
 */
export function publishOrder(packages) {
  const names = new Set(packages.map((p) => p.manifest.name));
  const deps = new Map(
    packages.map((p) => [
      p.manifest.name,
      Object.keys({ ...p.manifest.dependencies, ...p.manifest.peerDependencies }).filter(
        (d) => names.has(d),
      ),
    ]),
  );
  const done = new Set();
  const order = [];
  while (order.length < packages.length) {
    const ready = packages
      .filter((p) => !done.has(p.manifest.name))
      .filter((p) => deps.get(p.manifest.name).every((d) => done.has(d)))
      .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
    if (ready.length === 0) {
      throw new Error("the packages' sibling dependencies form a cycle");
    }
    for (const p of ready) {
      done.add(p.manifest.name);
      order.push(p);
    }
  }
  return order;
}

/** The `latest` npm has for `name`, or undefined when the name isn't published. */
function publishedLatest(name) {
  try {
    const out = execFileSync("npm", ["view", name, "dist-tags.latest"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return out === "" ? undefined : out;
  } catch (error) {
    if (/E404|404 Not Found/.test(`${error.stderr ?? ""}`)) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Checks the release and packs every package into `into`; returns the
 * SHA-256 of the release.json it writes there.
 */
async function packForStaging(into, { dryRun }) {
  const { stable, packages, rootManifest } = repositoryPackages();
  const problems = lineProblems(packages, stable, rootManifest);
  if (problems.length > 0) {
    throw new Error(`the version lines:\n  ${problems.join("\n  ")}`);
  }
  const version = packages.find((p) => p.line === "stable").manifest.version;
  const tag = distTag(version);
  const privates = packages.filter((p) => p.manifest.private).map((p) => p.manifest.name);
  if (privates.length > 0) {
    const line = `${privates.length} package(s) are private (${privates.join(", ")}); npm won't stage them, and making them public is the owner's step`;
    if (!dryRun) {
      throw new Error(line);
    }
    console.log(`stage: ${line} (a dry run, so going on)`);
  }
  if (tag === "latest") {
    for (const { manifest } of packages) {
      const latest = publishedLatest(manifest.name);
      if (latest && isLower(manifest.version, latest)) {
        throw new Error(`${manifest.name}@${manifest.version} would move latest down from ${latest}`);
      }
    }
  }
  const { work, packed } = await checkPacked(
    packages.map((p) => p.dir),
    { keep: true },
  );
  try {
    mkdirSync(into, { recursive: true });
    const byName = new Map(packed.map((p) => [p.name, p]));
    const listed = publishOrder(packages).map((p) => {
      const { tarball } = byName.get(p.manifest.name);
      const file = basename(tarball);
      copyFileSync(tarball, join(into, file));
      return {
        name: p.manifest.name,
        version: p.manifest.version,
        file,
        sha256: sha256(readFileSync(join(into, file))),
      };
    });
    const text = `${JSON.stringify({ version, tag, packages: listed }, null, 2)}\n`;
    writeFileSync(join(into, "release.json"), text);
    console.log(
      `stage: ${listed.length} packages packed at ${version} for ${tag} into ${into}: ${listed.map((p) => p.name).join(", ")}`,
    );
    return sha256(Buffer.from(text));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const packIndex = args.indexOf("--pack");
  const into = packIndex >= 0 ? args[packIndex + 1] : undefined;
  if (!dryRun && !into) {
    console.error("stage: --pack <dir> or --dry-run is required");
    process.exit(2);
  }
  const scratch = into ? undefined : mkdtempSync(join(tmpdir(), "cesium-stage-"));
  try {
    const folder = scratchFolder(into ?? scratch);
    const sum = await packForStaging(folder, { dryRun });
    console.log(`stage: release.json SHA-256 ${sum}`);
    if (dryRun) {
      stageTarballs(folder, sum, { dryRun: true });
    }
  } catch (error) {
    console.error(`stage: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  } finally {
    if (scratch) {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
}
