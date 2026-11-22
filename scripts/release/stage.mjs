// The release workflow's publishing step (CS-613; CS-889): stages every
// package at the release record's version with `npm stage publish`, through
// npm's trusted publishing (the workflow's OIDC identity; no token), so
// nothing is live until a maintainer approves each staged version with 2FA
// on npm, the umbrella last.
//
//   node scripts/release/stage.mjs [--dry-run]
//
// Before it stages anything, it checks, and stops on the first failure:
// 1. both version lines (scripts/release/lines.mjs);
// 2. no package is `private` (npm refuses to stage one, and making the
//    packages public is the owner's step);
// 3. for a `latest` release, no package's `latest` would move to a lower
//    version (`npm view`; a name not yet on npm passes);
// 4. the packed checks (scripts/build/pack.mjs), which leave each package
//    unpacked with its `package.json` as it publishes.
// Then it stages each unpacked package, siblings before their dependents.
// `--dry-run` passes `--dry-run` to npm and skips check 2's refusal (it
// still reports it), so the whole path can be tried on a machine.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { checkPacked } from "../build/pack.mjs";
import { distTag, isLower, lineProblems, repositoryPackages } from "./lines.mjs";

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

/** `npm stage publish`'s arguments for one package. */
export function stageArgs(tag, dryRun) {
  return [
    "stage",
    "publish",
    "--tag",
    tag,
    "--access",
    "public",
    "--ignore-scripts",
    ...(dryRun ? ["--dry-run"] : []),
  ];
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes("--dry-run");
  const fail = (message) => {
    console.error(`stage: ${message}`);
    process.exit(1);
  };
  const { stable, packages } = repositoryPackages();
  const problems = lineProblems(packages, stable);
  if (problems.length > 0) {
    fail(`the version lines:\n  ${problems.join("\n  ")}`);
  }
  const version = packages.find((p) => p.line === "stable").manifest.version;
  const tag = distTag(version);
  const privates = packages.filter((p) => p.manifest.private).map((p) => p.manifest.name);
  if (privates.length > 0) {
    const line = `${privates.length} package(s) are private (${privates.join(", ")}); npm won't stage them, and making them public is the owner's step`;
    if (!dryRun) {
      fail(line);
    }
    console.log(`stage: ${line} (a dry run, so going on)`);
  }
  if (tag === "latest") {
    for (const { manifest } of packages) {
      const latest = publishedLatest(manifest.name);
      if (latest && isLower(manifest.version, latest)) {
        fail(`${manifest.name}@${manifest.version} would move latest down from ${latest}`);
      }
    }
  }
  const { work, packed } = await checkPacked(
    packages.map((p) => p.dir),
    { keep: true },
  );
  try {
    const byName = new Map(packed.map((p) => [p.name, p]));
    for (const p of publishOrder(packages)) {
      const { dir } = byName.get(p.manifest.name);
      console.log(`stage: ${p.manifest.name}@${p.manifest.version} under ${tag}${dryRun ? " (dry run)" : ""}`);
      execFileSync("npm", stageArgs(tag, dryRun), { cwd: dir, stdio: "inherit" });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  console.log(
    `stage: ${packages.length} packages staged at ${version} under ${tag}${dryRun ? " (dry run: nothing sent)" : "; approve each on npm with 2FA, the umbrella last"}`,
  );
}
