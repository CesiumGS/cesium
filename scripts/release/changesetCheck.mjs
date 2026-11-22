// The changeset rule's check (CS-613): a change that touches a published
// package (anything under packages/<name>/, including a package folder it
// deletes) must add a changeset, a `.changeset/<name>.md` file, that names
// that package. A change outside packages/ needs none here; the rule asks
// for an empty one (`npx changeset --empty`) for the record.
//
// A release record, the change `npm run release:version` writes, passes
// without one, and only a change that is exactly one passes that way
// (scripts/release/record.mjs): every pending changeset consumed, every
// package's version moved to what scripts/release/lines.mjs computes, and
// nothing else changed in a package. Any other change to a package's
// package.json (a dependency, its exports) needs a changeset.
//
//   node scripts/release/changesetCheck.mjs --base <ref> [--head <ref>] [--split-merges]
//
// It walks the head's first-parent line from its merge base with `<base>`
// (head defaults to HEAD), so the base must be fetched, and judges it in
// parts (changeParts): each release record by itself, against its first
// parent, and each run of commits between records as one change. So a
// push that batches a record with other work passes when each part does,
// and a branch's commits, which land one by one with the changeset in the
// closing commit, are judged together as they were reviewed. With
// `--split-merges` (ci.yml passes it on a push and in the merge queue),
// each merge commit on that line is a part by itself too, so one branch's
// change can't pass on another branch's changeset. Exits 1 with the reason
// when a part fails the rule. In GitHub Actions its output, errors
// included, goes to stdout with workflow commands stopped, and each path
// in a message is a JSON string, so a path can't inject one.
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  changedPaths,
  gitTree,
  isChangeset,
  judgeCommits,
  parseNameStatus,
  quoted,
  releaseRecordProblems,
  withCommandsStopped,
} from "./record.mjs";

export { isChangeset, parseNameStatus };

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * The packages a changeset's front matter names, by name: an empty list
 * for an empty changeset. Throws when it has no front matter.
 */
export function namedPackages(text) {
  const match = /^---\r?\n([\s\S]*?)^---\s*$/m.exec(text);
  if (!match || match.index !== 0) {
    throw new Error("a changeset starts with front matter between --- lines");
  }
  return match[1]
    .split(/\r?\n/)
    .map((line) => /^\s*["']?([^"':]+)["']?\s*:\s*(major|minor|patch)\s*$/.exec(line))
    .filter(Boolean)
    .map((m) => m[1].trim());
}

/**
 * The rule, on one change.
 * @param {{ status: string, path: string }[]} changed the change's paths
 * @param {import("./record.mjs").Tree} base the tree at the merge base
 * @param {import("./record.mjs").Tree} head the tree at the head
 * @returns {{ ok: boolean, touched: string[], added: string[], named: string[], unnamed: string[], deleted: string[], release: boolean, recordProblems: string[], problem?: string }}
 */
export function checkChangesets(changed, base, head) {
  const names = new Map([
    ...base.packages.map((p) => [p.folder, p.manifest.name]),
    ...head.packages.map((p) => [p.folder, p.manifest.name]),
  ]);
  const touched = [
    ...new Set(
      changed
        .map(({ path }) => /^packages\/([^/]+)\//.exec(path)?.[1])
        .filter((folder) => folder !== undefined && names.has(folder))
        .map((folder) => names.get(folder)),
    ),
  ].sort();
  const added = changed
    .filter(({ status, path }) => status === "A" && isChangeset(path))
    .map(({ path }) => path);
  const edited = changed
    .filter(({ status, path }) => status === "M" && isChangeset(path))
    .map(({ path }) => path);
  const deleted = changed
    .filter(({ status, path }) => status === "D" && isChangeset(path))
    .map(({ path }) => path);
  const recordProblems =
    touched.length > 0 || deleted.length > 0 ? releaseRecordProblems(changed, base, head) : [];
  const release = (touched.length > 0 || deleted.length > 0) && recordProblems.length === 0;
  const result = (fields) => ({
    touched,
    added,
    named: [],
    unnamed: [],
    deleted,
    release,
    recordProblems,
    ...fields,
  });
  if (release) {
    return result({ ok: true });
  }
  const named = [];
  for (const path of [...added, ...edited]) {
    try {
      named.push(...namedPackages(head.changesets[path] ?? ""));
    } catch (error) {
      return result({ ok: false, problem: `${JSON.stringify(path)}: ${error.message}` });
    }
  }
  const sortedNamed = [...new Set(named)].sort();
  const unnamed = touched.filter((name) => !named.includes(name));
  // Why it isn't a release record, for a change that looks like one.
  const asRecord =
    deleted.length > 0
      ? `; it consumes ${quoted(deleted)} but isn't a release record: ${recordProblems.join("; ")}`
      : "";
  if (touched.length === 0) {
    return result({ ok: true, named: sortedNamed });
  }
  if (added.length === 0 && edited.length === 0) {
    return result({
      ok: false,
      unnamed,
      problem: `this change touches ${touched.join(", ")} and adds no changeset${asRecord}. Add one with \`npx changeset\` naming each package it touches, the bump and a sentence for users`,
    });
  }
  if (unnamed.length > 0) {
    return result({
      ok: false,
      named: sortedNamed,
      unnamed,
      problem: `this change touches ${unnamed.join(", ")}, and no changeset it adds names ${unnamed.length === 1 ? "it" : "them"}${asRecord}. Name each package the change touches, with its bump`,
    });
  }
  return result({ ok: true, named: sortedNamed, unnamed });
}

/**
 * The parts the rule judges a push or a branch by: each commit along the
 * head's first-parent line from `base` that is a release record, by
 * itself, and each run of commits between them as one change. With
 * `splitMerges`, each merge commit on that line is a part by itself too,
 * judged against its first parent: the merged branch's whole change. One
 * part, base to head, when that line doesn't reach `base`.
 * @param {{ splitMerges?: boolean }} [options]
 * @returns {{ from: string, to: string, commits: number, record: boolean, merge: boolean }[]}
 */
export function changeParts(base, head, cwd = repo, options = {}) {
  const { splitMerges = false } = options;
  const judged = judgeCommits(base, head, cwd);
  if (!judged) {
    return [{ from: base, to: head, commits: 0, record: false, merge: false }];
  }
  const parts = [];
  let run;
  for (const c of judged) {
    const record = c.problems.length === 0;
    if (record || (splitMerges && c.merge)) {
      if (run) {
        parts.push(run);
        run = undefined;
      }
      parts.push({ from: c.parent, to: c.commit, commits: 1, record, merge: c.merge });
    } else if (run) {
      run.to = c.commit;
      run.commits += 1;
    } else {
      run = { from: c.parent, to: c.commit, commits: 1, record: false, merge: false };
    }
  }
  if (run) {
    parts.push(run);
  }
  return parts;
}

/**
 * The rule on each part of the change from `base` to `head`
 * (changeParts), each part's result with its range.
 */
export function checkParts(base, head, cwd = repo, options = {}) {
  return changeParts(base, head, cwd, options).map((part) => ({
    ...part,
    result: checkChangesets(
      changedPaths(part.from, part.to, cwd),
      gitTree(part.from, cwd),
      gitTree(part.to, cwd),
    ),
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const base = option("--base");
  const head = option("--head") ?? "HEAD";
  if (!base) {
    console.error("changesetCheck: --base <ref> is required");
    process.exit(2);
  }
  // Everything goes to stdout, the markers' stream, inside them: an error
  // too, so a line on stderr can't land after the end marker.
  const say = (line) => process.stdout.write(`changesetCheck: ${line}\n`);
  const failed = withCommandsStopped(() => {
    try {
      return checkAll();
    } catch (error) {
      say(`${error instanceof Error ? (error.stack ?? error.message) : error}`);
      return true;
    }
  });
  function checkAll() {
    const mergeBase = execFileSync("git", ["merge-base", base, head], {
      cwd: repo,
      encoding: "utf8",
      // git's own message goes into the error, printed inside the markers.
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const parts = checkParts(mergeBase, head, repo, { splitMerges: args.includes("--split-merges") });
    let failed = false;
    for (const { from, to, commits, record, merge, result } of parts) {
      const range = `${from.slice(0, 10)}..${to.slice(0, 10)}${record ? " (a release record)" : merge ? " (a merge)" : commits > 1 ? ` (${commits} commits)` : ""}`;
      if (!result.ok) {
        say(`${range}: ${result.problem}`);
        failed = true;
      } else if (result.touched.length === 0) {
        say(`${range}: no published package changed`);
      } else if (result.release) {
        say(`${range}: a release record for ${result.touched.join(", ")}`);
      } else {
        say(
          `${range}: ${result.added.length} changeset(s) for a change to ${result.touched.join(", ")}; they name ${result.named.join(", ")}`,
        );
      }
      if (result.ok && !result.release && result.deleted.length > 0) {
        say(
          `${range}: note: it deletes ${quoted(result.deleted)} outside a release record; the merge review checks that's right (a revert, say)`,
        );
      }
    }
    if (parts.length === 0) {
      say("no commits to check");
    }
    return failed;
  }
  if (failed) {
    process.exit(1);
  }
}
