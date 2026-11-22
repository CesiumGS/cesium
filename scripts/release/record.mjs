// The release record's check (CS-613): whether a change is exactly what
// `npm run release:version` writes, so that the release workflow stages it
// and the changeset rule's check lets it through without a changeset.
//
// A change from `base` to `head` is a release record when:
// 1. at least one changeset was pending at the base, every one of them is
//    gone at the head, and the change adds none;
// 2. under packages/, it changes only each package's package.json and
//    CHANGELOG.md, and adds or removes no package; under .changeset/, only
//    the changesets it consumes and the pre mode's files;
// 3. each package's package.json (and the root's) changes only its
//    version and its dependencies on sibling packages, as `changeset
//    version` writes them, and each package's version goes up;
// 4. both version lines hold at the head (scripts/release/lines.mjs): the
//    stable packages at one version, the experimental ones at the paired
//    version, and every dependency on a sibling exact.
//
//   node scripts/release/record.mjs --before <sha> [--head <ref>]
//
// judges each commit of the push (the head's first-parent line from
// `before`) against its first parent, so a record pushed in a batch with
// other commits is still found. It prints `release=true|false`,
// `version=<the umbrella's version>` and `sha=<the record's commit>` (empty
// when there is none), and appends them to $GITHUB_OUTPUT when it is set
// (release.yml's `record` job). A `before` it can't resolve (none, all
// zeros, missing from the clone, or not an ancestor of the head, as after
// a force push) is never a release record. It refuses, exiting 1, a push
// with two records or with a commit that moves the umbrella's version up
// without being one. It imports nothing outside Node.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compareVersions, lineProblems, parseVersion, stableNames, withLines } from "./lines.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A changeset file: `.changeset/<name>.md`, not its README or the pre-mode folder's. */
export function isChangeset(path) {
  return /^\.changeset\/[^/]+\.md$/.test(path) && basename(path) !== "README.md";
}

/** The manifest fields that hold dependencies, which `changeset version` rewrites for siblings. */
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/**
 * What changed between two manifests beyond what `changeset version`
 * writes: its `version` (unless `version` is false) and an existing
 * dependency on a sibling, in any dependency field, moved to exactly that
 * sibling's version at the head. Returns the fields, or
 * `<field>.<dependency>` for a dependency, that changed otherwise.
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @param {Map<string, string>} siblings each sibling's name and its version at the head
 * @param {{ version?: boolean }} [options]
 */
export function manifestChanges(before, after, siblings, options = {}) {
  const allowVersion = options.version ?? true;
  const changes = [];
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  for (const key of keys) {
    const a = before?.[key];
    const b = after?.[key];
    if (key === "version" && allowVersion) {
      continue;
    }
    if (DEPENDENCY_FIELDS.includes(key) && isRecord(a) && isRecord(b)) {
      const deps = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      for (const dep of deps) {
        const added = !(dep in a) || !(dep in b);
        if (added || (a[dep] !== b[dep] && b[dep] !== siblings.get(dep))) {
          changes.push(`${key}.${dep}`);
        }
      }
      continue;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push(key);
    }
  }
  return changes;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The problems that keep a change from being a release record (an empty
 * list when it is one).
 * @param {{ status: string, path: string }[]} changed the change's paths (`git diff --name-status`)
 * @param {Tree} base the tree before the change
 * @param {Tree} head the tree after it
 * @returns {string[]}
 *
 * @typedef {{
 *   changesets: Record<string, string>,
 *   packages: { folder: string, manifest: Record<string, any> }[],
 *   rootManifest: Record<string, any> | undefined,
 *   config: Record<string, any> | undefined,
 * }} Tree
 */
export function releaseRecordProblems(changed, base, head) {
  const problems = [];
  const pending = Object.keys(base.changesets).sort();
  const left = Object.keys(head.changesets).sort();
  if (pending.length === 0) {
    problems.push("no changeset was pending at the base, so there was nothing to version");
  }
  const unconsumed = pending.filter((path) => left.includes(path));
  if (unconsumed.length > 0) {
    problems.push(`it leaves ${unconsumed.join(", ")} unconsumed`);
  }
  const added = left.filter((path) => !pending.includes(path));
  if (added.length > 0) {
    problems.push(`it adds ${added.join(", ")}; a release record adds no changeset`);
  }
  const outside = changed
    .map(({ path }) => path)
    .filter((path) => {
      if (isChangeset(path)) {
        return false;
      }
      if (path.startsWith(".changeset/")) {
        return path !== ".changeset/pre.json" && !path.startsWith(".changeset/pre/");
      }
      return path.startsWith("packages/") && !/^packages\/[^/]+\/(package\.json|CHANGELOG\.md)$/.test(path);
    });
  if (outside.length > 0) {
    problems.push(
      `it changes ${outside.join(", ")}; under packages/ and .changeset/, a release record changes only manifests, changelogs and changesets`,
    );
  }
  const before = new Map(base.packages.map((p) => [p.folder, p.manifest]));
  const after = new Map(head.packages.map((p) => [p.folder, p.manifest]));
  const siblings = new Map([...after.values()].map((m) => [m.name, m.version]));
  for (const folder of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const a = before.get(folder);
    const b = after.get(folder);
    if (!a || !b) {
      problems.push(
        `it ${a ? "removes" : "adds"} the package in packages/${folder}; a release record adds or removes none`,
      );
      continue;
    }
    const extra = manifestChanges(a, b, siblings);
    if (extra.length > 0) {
      problems.push(
        `${b.name}'s package.json changes ${extra.join(", ")}; a release record changes only its version and its dependencies on siblings`,
      );
    }
    if (!parseVersion(`${a.version}`) || !parseVersion(`${b.version}`)) {
      problems.push(`${b.name}'s version ${a.version} to ${b.version} isn't a pair of versions`);
    } else if (compareVersions(b.version, a.version) <= 0) {
      problems.push(
        `${b.name} goes from ${a.version} to ${b.version}; a release record moves every package up`,
      );
    }
  }
  const rootExtra = manifestChanges(base.rootManifest, head.rootManifest, siblings, {
    version: false,
  });
  if (rootExtra.length > 0) {
    problems.push(
      `the root package.json changes ${rootExtra.join(", ")}; a release record changes only its dependencies on siblings`,
    );
  }
  let stable;
  try {
    stable = stableNames(head.config ?? {});
  } catch (error) {
    problems.push(`the head's Changesets config: ${error.message}`);
  }
  if (stable) {
    const lines = withLines(
      head.packages.map((p) => ({ manifest: p.manifest })),
      stable,
    );
    problems.push(...lineProblems(lines, stable, head.rootManifest).map((p) => `the version lines: ${p}`));
  }
  return problems;
}

/**
 * The tree at a git revision, as releaseRecordProblems reads it.
 * @param {string} rev
 * @param {string} [cwd] the repository
 * @returns {Tree}
 */
export function gitTree(rev, cwd = repo) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 << 20,
      stdio: ["ignore", "pipe", "pipe"],
    });
  const names = (...args) =>
    git("ls-tree", "-z", "--name-only", "--full-name", rev, ...args)
      .split("\0")
      .filter((name) => name !== "");
  const show = (path) => {
    try {
      return git("show", `${rev}:${path}`);
    } catch {
      return undefined;
    }
  };
  const json = (path) => {
    const text = show(path);
    return text === undefined ? undefined : JSON.parse(text);
  };
  const changesets = {};
  for (const path of names("--", ".changeset/").filter(isChangeset)) {
    changesets[path] = show(path) ?? "";
  }
  const packages = [];
  for (const dir of names("-d", "--", "packages/")) {
    const manifest = json(`${dir}/package.json`);
    if (manifest) {
      packages.push({ folder: dir.slice("packages/".length), manifest });
    }
  }
  return {
    changesets,
    packages,
    rootManifest: json("package.json"),
    config: json(".changeset/config.json"),
  };
}

/** `git diff -z --name-status --no-renames`'s output as `{ status, path }` entries. */
export function parseNameStatus(text) {
  const parts = text.split("\0");
  if (parts.at(-1) === "") {
    parts.pop();
  }
  const entries = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    entries.push({ status: parts[i][0], path: parts[i + 1] });
  }
  return entries;
}

/** The paths changed from `base` to `head`, read without quoting (`-z`). */
export function changedPaths(base, head, cwd = repo) {
  return parseNameStatus(
    execFileSync("git", ["diff", "-z", "--name-status", "--no-renames", base, head], {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 << 20,
    }),
  );
}

/**
 * Whether npm already has `name@version`, published (`npm view`). A
 * version staged but not yet approved doesn't show; npm itself refuses to
 * stage it twice.
 */
export function onNpm(name, version) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return out !== "";
  } catch (error) {
    if (/E404|404 Not Found/.test(`${error.stderr ?? ""}`)) {
      return false;
    }
    throw error;
  }
}

/**
 * The commits from `before` to `head` along the head's first-parent line,
 * oldest first, each with its first parent. Undefined when that line
 * doesn't reach `before` (the before commit sits only on a merged side
 * branch). `before` must be an ancestor of `head`.
 * @returns {{ commit: string, parent: string }[] | undefined}
 */
export function firstParentCommits(before, head, cwd = repo) {
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const base = git("rev-parse", "--verify", "--quiet", `${before}^{commit}`).trim();
  const pairs = git("rev-list", "--first-parent", "--reverse", "--parents", `${base}..${head}`)
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [commit, parent] = line.split(" ");
      return { commit, parent };
    });
  if (pairs.length > 0 && pairs[0].parent !== base) {
    return undefined;
  }
  return pairs;
}

/**
 * Each commit of the push from `before` to `head` (its first-parent
 * line), judged against its first parent: whether it is a release record,
 * and if not, why, and whether it moves the umbrella's version up.
 * @returns {{ commit: string, parent: string, problems: string[], version: string | undefined, raises: boolean }[] | undefined}
 */
export function judgeCommits(before, head, cwd = repo) {
  const pairs = firstParentCommits(before, head, cwd);
  if (!pairs) {
    return undefined;
  }
  const trees = new Map();
  const tree = (rev) => {
    if (!trees.has(rev)) {
      trees.set(rev, gitTree(rev, cwd));
    }
    return trees.get(rev);
  };
  const umbrella = (t) => t.packages.find((p) => p.folder === "cesium")?.manifest.version;
  return pairs.map(({ commit, parent }) => {
    const a = tree(parent);
    const b = tree(commit);
    const problems = releaseRecordProblems(changedPaths(parent, commit, cwd), a, b);
    const from = umbrella(a);
    const to = umbrella(b);
    const raises =
      parseVersion(`${from}`) !== undefined &&
      parseVersion(`${to}`) !== undefined &&
      compareVersions(to, from) > 0;
    return { commit, parent, problems, version: to, raises };
  });
}

/**
 * Whether the push from `before` to `head` holds a release record to
 * stage, and which commit it is. Each commit of the push (its first-parent
 * line, so a batch pushed from a bundle is judged commit by commit) is
 * tested against its first parent. Logs each reason it isn't one.
 * `published(name, version)` says whether npm already has the umbrella at
 * that version, as after a record that was reverted and landed again.
 *
 * Throws, so the run fails rather than ends green with nothing staged,
 * when the push holds two release records, or a commit that moves the
 * umbrella's version up without being one (a record that landed after new
 * changesets, say); either version would otherwise never release, since
 * the next push's before commit is past it.
 * @returns {{ release: boolean, version: string, sha: string }}
 */
export function pushIsRelease(before, head, options = {}) {
  const { log = console.log, cwd = repo, published = () => false } = options;
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const headVersion = gitTree(head, cwd).packages.find((p) => p.folder === "cesium")?.manifest
    .version;
  if (!headVersion || !parseVersion(headVersion)) {
    throw new Error(`the umbrella's version at ${head} isn't one: ${headVersion}`);
  }
  const no = (why) => {
    log(`record: not a release record: ${why}`);
    return { release: false, version: headVersion, sha: "" };
  };
  if (!before || /^0+$/.test(before)) {
    return no("the push has no before commit (a new branch), so there is nothing to compare");
  }
  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(before)) {
    return no(`the before commit ${JSON.stringify(before)} isn't a commit id`);
  }
  try {
    git("cat-file", "-e", `${before}^{commit}`);
  } catch {
    return no(`the before commit ${before} isn't in the clone`);
  }
  try {
    git("merge-base", "--is-ancestor", before, head);
  } catch {
    return no(`the before commit ${before} isn't an ancestor of ${head} (a force push?)`);
  }
  const judged = judgeCommits(before, head, cwd);
  if (!judged) {
    return no(`${head}'s first-parent line doesn't reach the before commit ${before}`);
  }
  if (judged.length === 0) {
    return no("the push holds no commits");
  }
  const records = judged.filter((c) => c.problems.length === 0);
  const strays = judged.filter((c) => c.problems.length > 0 && c.raises);
  if (records.length > 1) {
    throw new Error(
      `the push holds ${records.length} release records, ${records.map((c) => `${c.commit} (${c.version})`).join(" and ")}; a push holds at most one, so none is staged. Push each record by itself (up to the first, then the rest). Once they have landed together, neither can release: revert both, then write one record from the tip with \`npm run release:version\``,
    );
  }
  if (strays.length > 0) {
    const lines = strays.map(
      (c) =>
        `${c.commit} moves the umbrella's version up to ${c.version} but isn't a release record: ${c.problems.join("; ")}`,
    );
    throw new Error(
      `${lines.join("\n")}\nThat version would never release. Revert the commit, then write the record again from the tip with \`npm run release:version\``,
    );
  }
  if (records.length === 0) {
    for (const c of judged) {
      log(`record: ${c.commit}: ${c.problems.join("; ")}`);
    }
    return no(`none of the push's ${judged.length} commit(s) is one`);
  }
  const [record] = records;
  const version = record.version;
  const name = gitTree(record.commit, cwd).packages.find((p) => p.folder === "cesium").manifest
    .name;
  try {
    git("rev-parse", "--verify", "--quiet", `refs/tags/v${version}`);
    return no(`v${version} is already tagged`);
  } catch {
    // No tag: go on.
  }
  if (published(name, version)) {
    return no(`npm already has ${name}@${version}`);
  }
  log(
    `record: a release record for ${version} at ${record.commit} (commit ${judged.indexOf(record) + 1} of the push's ${judged.length})`,
  );
  return { release: true, version, sha: record.commit };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  try {
    const { release, version, sha } = pushIsRelease(
      option("--before") ?? "",
      option("--head") ?? "HEAD",
      { published: onNpm },
    );
    const lines = `release=${release}\nversion=${version}\nsha=${sha}\n`;
    process.stdout.write(lines);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, lines);
    }
  } catch (error) {
    console.error(`record: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
