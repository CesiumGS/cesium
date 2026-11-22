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
// judges every commit the push adds (`before..head`, on every parent's
// side, so a merge made by `git pull` or a force push can't hide one)
// against its own first parent, so a record pushed in a batch with other
// commits is still found. It prints `release=true|false`, `version=<the
// umbrella's version>` and `sha=<the record's commit>` (empty when there is
// none), and appends them to $GITHUB_OUTPUT when it is set (release.yml's
// `record` job). It never ends green while a version could be lost: once
// the before commit resolves, a push whose head moves the umbrella's
// version up, with no tag and not on npm, either holds its record or fails
// (pushIsRelease). It imports nothing outside Node.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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

/**
 * Paths as JSON strings, joined: a path is the push author's text, and in
 * JSON a newline is `\n`, so no path can start a line of the log (a line
 * like `::error::` is a workflow command).
 */
export function quoted(paths) {
  return paths.map((path) => JSON.stringify(path)).join(", ");
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
    problems.push(`it leaves ${quoted(unconsumed)} unconsumed`);
  }
  const added = left.filter((path) => !pending.includes(path));
  if (added.length > 0) {
    problems.push(`it adds ${quoted(added)}; a release record adds no changeset`);
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
      `it changes ${quoted(outside)}; under packages/ and .changeset/, a release record changes only manifests, changelogs and changesets`,
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
        `it ${a ? "removes" : "adds"} the package in ${JSON.stringify(`packages/${folder}`)}; a release record adds or removes none`,
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
 * version staged but not yet approved doesn't show: npm's stage page says
 * staged versions share the published versions' unique index, so the
 * registry refuses a second staging, and stageTarballs.mjs checks for an
 * earlier run that staged it first.
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
 * oldest first, each with its parents (the first is the one it is judged
 * against). Undefined when that line doesn't reach `before` (the before
 * commit sits only on a merged side branch). `before` must be an ancestor
 * of `head`. The changeset rule's parts follow this line.
 * @returns {{ commit: string, parent: string, parents: string[] }[] | undefined}
 */
export function firstParentCommits(before, head, cwd = repo) {
  const base = gitIn(cwd, "rev-parse", "--verify", "--quiet", `${before}^{commit}`).trim();
  const pairs = revList(cwd, "--first-parent", `${base}..${head}`);
  if (pairs.length > 0 && pairs[0].parent !== base) {
    return undefined;
  }
  return pairs;
}

/**
 * Every commit in `before..head`, on every parent's side and not only the
 * first-parent line, oldest first, each with its parents. A merge made by
 * `git pull` puts the local line first and the remote's old tip (the push's
 * before commit) second, and a force push's before commit isn't an
 * ancestor, so the first-parent line alone can miss a record.
 * @returns {{ commit: string, parent: string, parents: string[] }[]}
 */
export function pushCommits(before, head, cwd = repo) {
  return revList(cwd, "--topo-order", `${before}..${head}`);
}

function gitIn(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 << 20,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function revList(cwd, ...args) {
  return gitIn(cwd, "rev-list", "--reverse", "--parents", ...args)
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [commit, ...parents] = line.split(" ");
      return { commit, parent: parents[0], parents };
    });
}

/** The umbrella's version in a tree, or undefined. */
function umbrellaVersion(tree) {
  return tree.packages.find((p) => p.folder === "cesium")?.manifest.version;
}

/**
 * Each commit given, judged against its first parent: whether it is a
 * release record, and if not, why; whether it moves the umbrella's version
 * above every parent's (`raises`); and, for a merge, whether it only
 * carries a version one of its other parents already has (`carried`), as a
 * merge of a branch that holds a record does. A carried merge is neither a
 * record nor a stray: the record, if any, is the side's own commit.
 * @param {{ commit: string, parent: string, parents: string[] }[]} commits
 * @returns {{ commit: string, parent: string, parents: string[], merge: boolean, problems: string[], version: string | undefined, raises: boolean, carried: boolean }[]}
 */
export function judge(commits, cwd = repo) {
  const trees = new Map();
  const tree = (rev) => {
    if (!trees.has(rev)) {
      trees.set(rev, gitTree(rev, cwd));
    }
    return trees.get(rev);
  };
  const isVersion = (v) => parseVersion(`${v}`) !== undefined;
  return commits
    .filter(({ parent }) => parent !== undefined)
    .map(({ commit, parent, parents }) => {
      const a = tree(parent);
      const b = tree(commit);
      const problems = releaseRecordProblems(changedPaths(parent, commit, cwd), a, b);
      const to = umbrellaVersion(b);
      const versions = parents.map((p) => umbrellaVersion(tree(p)));
      const raises =
        isVersion(to) && versions.every((v) => isVersion(v) && compareVersions(to, v) > 0);
      const merge = parents.length > 1;
      const carried = merge && versions.slice(1).some((v) => v === to);
      return { commit, parent, parents, merge, problems, version: to, raises, carried };
    });
}

/**
 * Each commit of the push from `before` to `head` along the head's
 * first-parent line, judged against its first parent (judge). Undefined
 * when that line doesn't reach `before`.
 */
export function judgeCommits(before, head, cwd = repo) {
  const pairs = firstParentCommits(before, head, cwd);
  return pairs ? judge(pairs, cwd) : undefined;
}

/**
 * Whether the push from `before` to `head` holds a release record to
 * stage, and which commit it is. Every commit the push adds (`before..head`,
 * on every parent's side) is judged against its first parent, so a record
 * is found in a batch pushed from a bundle, under a merge made by `git
 * pull` and after a force push. Logs each reason it isn't one.
 * `published(name, version)` says whether npm already has the umbrella at
 * that version.
 *
 * It never ends green while a version could be lost. It throws, so the
 * run fails, when the push holds two records; a commit that moves the
 * umbrella's version up without being one (a record that landed after new
 * changesets, say); a record below the head's version; or, on any other
 * path once the before commit resolves, a head whose umbrella version is
 * above the before commit's with no `v<version>` tag and not on npm. Each
 * such version would otherwise never release, since the next push's
 * before commit is past it. When the before commit isn't in the clone (a
 * force push's old tip that couldn't be fetched), it can't tell what the
 * push added, and throws unless the head's version is tagged or on npm.
 * A record the head has since reverted (the head's version below it) is
 * not staged, and the run ends green.
 * @returns {{ release: boolean, version: string, sha: string }}
 */
export function pushIsRelease(before, head, options = {}) {
  const { log = console.log, cwd = repo, published = () => false } = options;
  const git = (...args) => gitIn(cwd, ...args);
  const headTree = gitTree(head, cwd);
  const headVersion = umbrellaVersion(headTree);
  if (!headVersion || !parseVersion(headVersion)) {
    throw new Error(`the umbrella's version at ${head} isn't one: ${headVersion}`);
  }
  const name = headTree.packages.find((p) => p.folder === "cesium").manifest.name;
  const tagged = (version) => {
    try {
      git("rev-parse", "--verify", "--quiet", `refs/tags/v${version}`);
      return true;
    } catch {
      return false;
    }
  };
  const released = (version) => tagged(version) || published(name, version);
  const no = (why) => {
    log(`record: not a release record: ${why}`);
    return { release: false, version: headVersion, sha: "" };
  };
  const recovery = `Find the release record's commit (\`git log --first-parent -- packages/cesium/package.json\`). If it is a record, rerun this workflow with "Re-run all jobs" once the cause is fixed, or revert it and write the record again from the tip with \`npm run release:version\`, then push that commit by itself`;
  // A new branch's first push: GitHub sends no before commit, so what the
  // push adds can't be told apart from what other branches hold. Judging
  // only the commits on no other remote branch would miss a record pushed
  // to another branch first, so it fails unless the head's version is out.
  if (!before || /^0+$/.test(before)) {
    if (released(headVersion)) {
      return no(
        `the push has no before commit (a new branch), and the head's version ${headVersion} is already tagged or on npm`,
      );
    }
    throw new Error(
      `the push has no before commit (a new branch), so this can't tell whether it holds a release record, and the head's version ${headVersion} has no tag and isn't on npm. ${recovery}. If no record was pushed, nothing is lost`,
    );
  }
  if (!/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(before)) {
    return no(`the before commit ${JSON.stringify(before)} isn't a commit id`);
  }
  try {
    git("cat-file", "-e", `${before}^{commit}`);
  } catch {
    if (released(headVersion)) {
      return no(
        `the before commit ${before} isn't in the clone, and the head's version ${headVersion} is already tagged or on npm`,
      );
    }
    throw new Error(
      `the before commit ${before} isn't in the clone (a force push's old tip that couldn't be fetched?), so this can't tell whether the push holds a release record, and the head's version ${headVersion} has no tag and isn't on npm. ${recovery}. If no record was pushed, nothing is lost`,
    );
  }
  const beforeVersion = umbrellaVersion(gitTree(before, cwd));
  // Every "not a release" path from here: green only when the head's
  // version didn't go up, or is already released.
  const notRelease = (why) => {
    if (
      parseVersion(`${beforeVersion}`) &&
      compareVersions(headVersion, beforeVersion) > 0 &&
      !released(headVersion)
    ) {
      throw new Error(
        `${why}, yet the umbrella's version goes from ${beforeVersion} to ${headVersion}, with no v${headVersion} tag and not on npm, so that version would never release. ${recovery}`,
      );
    }
    return no(why);
  };
  let ancestor = true;
  try {
    git("merge-base", "--is-ancestor", before, head);
  } catch {
    ancestor = false;
    log(
      `record: the before commit ${before} isn't an ancestor of ${head} (a force push?); judging the commits the head adds`,
    );
  }
  const judged = judge(pushCommits(before, head, cwd), cwd);
  if (judged.length === 0) {
    return notRelease(`the push holds no commits${ancestor ? "" : " of its own"}`);
  }
  // When the before commit is an ancestor, a record or a stray at or below
  // its version, or at a version already out, is a stale copy a merged side
  // branch carries (a record rewritten by `pull --rebase`, say, whose
  // rewrite released): the push can't release it, and it can't hide a
  // version the head raises, since notRelease still checks the head.
  const stale = (c) =>
    ancestor &&
    parseVersion(`${beforeVersion}`) !== undefined &&
    parseVersion(`${c.version}`) !== undefined &&
    (compareVersions(c.version, beforeVersion) <= 0 || released(c.version));
  const candidates = judged.filter((c) => !c.carried && (c.problems.length === 0 || c.raises));
  for (const c of candidates.filter(stale)) {
    log(
      `record: ${c.commit}: ${c.problems.length === 0 ? "a release record" : "a commit that moves the umbrella's version up"} for ${c.version}, at or below the before commit's ${beforeVersion} or already released; a stale copy from a merged side branch, skipped`,
    );
  }
  const live = candidates.filter((c) => !stale(c));
  const records = live.filter((c) => c.problems.length === 0);
  const strays = live.filter((c) => c.problems.length > 0);
  // Only a force push gets here with a version already out (stale skips
  // them otherwise). Such a commit is left as it is, never reverted.
  const named = (list) => list.map((c) => `${c.commit} (${c.version})`).join(" and ");
  const leave = (list) => {
    const kept = list.filter((c) => released(c.version));
    return {
      kept,
      rest: list.length - kept.length,
      note:
        kept.length === 0
          ? ""
          : ` ${named(kept)} ${kept.length === 1 ? "is" : "are"} already tagged or on npm: leave ${kept.length === 1 ? "it" : "them"} as ${kept.length === 1 ? "it is" : "they are"}.`,
    };
  };
  if (records.length > 1) {
    const { kept, rest, note } = leave(records);
    const revert =
      kept.length === 0
        ? rest === 2
          ? "revert both"
          : `revert all ${rest}`
        : rest === 1
          ? "revert the other"
          : `revert the other ${rest}`;
    throw new Error(
      `the push holds ${records.length} release records, ${named(records)}; a push holds at most one, so none is staged. Push each record by itself (up to the first, then the rest).${note} ${rest === 0 ? "Nothing is lost: the next push judges them as stale" : `Once they have landed together, none can release: ${revert}, then write one record from the tip with \`npm run release:version\``}`,
    );
  }
  if (strays.length > 0) {
    const lines = strays.map(
      (c) =>
        `${c.commit} moves the umbrella's version up to ${c.version} but isn't a release record: ${c.problems.join("; ")}`,
    );
    const { kept, rest, note } = leave(strays);
    const revert =
      kept.length === 0
        ? strays.length === 1
          ? "the commit"
          : "each commit"
        : rest === 1
          ? "the other"
          : "the others";
    throw new Error(
      `${lines.join("\n")}\n${rest === 0 ? `${note.trim()} Nothing is lost: the next push judges ${strays.length === 1 ? "it" : "them"} as stale` : `That version would never release.${note} Revert ${revert}, then write the record again from the tip with \`npm run release:version\``}`,
    );
  }
  if (records.length === 0) {
    for (const c of judged) {
      log(
        `record: ${c.commit}: ${c.carried ? `a merge that carries ${c.version} from a side` : c.problems.join("; ")}`,
      );
    }
    return notRelease(`none of the push's ${judged.length} commit(s) is one`);
  }
  const [record] = records;
  const version = record.version;
  const order = compareVersions(headVersion, version);
  if (order < 0) {
    return notRelease(
      `${record.commit} is a release record for ${version}, but the head is at ${headVersion}, below it: a later commit reverts it, so it isn't staged`,
    );
  }
  if (order > 0) {
    throw new Error(
      `${record.commit} is a release record for ${version}, but the head is at ${headVersion}, above it, and no commit of the push is a record for that. ${recovery}`,
    );
  }
  if (tagged(version)) {
    return no(`v${version} is already tagged`);
  }
  if (published(name, version)) {
    return no(`npm already has ${name}@${version}`);
  }
  log(
    `record: a release record for ${version} at ${record.commit} (commit ${judged.indexOf(record) + 1} of the push's ${judged.length})`,
  );
  return { release: true, version, sha: record.commit };
}

/**
 * Runs `fn` with GitHub's workflow commands stopped, in GitHub Actions
 * only, so a path or a message that holds a line like `::error::` or
 * `::stop-commands::` is printed, not obeyed. The token is random for each
 * run, as GitHub's workflow-commands page asks. The markers go to stdout,
 * so `fn` writes everything there too, errors included: a line on stderr
 * can land after the end marker. Paths in messages are JSON strings as
 * well (quoted), so a newline in one can't start a line.
 */
export function withCommandsStopped(fn, env = process.env, write = (line) => process.stdout.write(line)) {
  if (env.GITHUB_ACTIONS !== "true") {
    return fn();
  }
  const token = randomUUID();
  write(`::stop-commands::${token}\n`);
  try {
    return fn();
  } finally {
    write(`::${token}::\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const code = withCommandsStopped(() => {
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
      return 0;
    } catch (error) {
      // stdout, as the log is, so the message lands inside the markers.
      process.stdout.write(`record: ${error instanceof Error ? error.message : error}\n`);
      return 1;
    }
  });
  process.exit(code);
}
