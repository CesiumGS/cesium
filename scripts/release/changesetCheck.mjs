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
//   node scripts/release/changesetCheck.mjs --base <ref> [--head <ref>]
//
// It compares the head with its merge base with `<base>` (head defaults
// to HEAD), so the base must be fetched. Exits 1 with the reason when the
// change fails the rule.
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  changedPaths,
  gitTree,
  isChangeset,
  parseNameStatus,
  releaseRecordProblems,
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
      return result({ ok: false, problem: `${path}: ${error.message}` });
    }
  }
  const sortedNamed = [...new Set(named)].sort();
  const unnamed = touched.filter((name) => !named.includes(name));
  // Why it isn't a release record, for a change that looks like one.
  const asRecord =
    deleted.length > 0
      ? `; it consumes ${deleted.join(", ")} but isn't a release record: ${recordProblems.join("; ")}`
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
  const mergeBase = execFileSync("git", ["merge-base", base, head], {
    cwd: repo,
    encoding: "utf8",
  }).trim();
  const result = checkChangesets(
    changedPaths(mergeBase, head),
    gitTree(mergeBase),
    gitTree(head),
  );
  if (!result.ok) {
    console.error(`changesetCheck: ${result.problem}`);
    process.exit(1);
  }
  if (result.touched.length === 0) {
    console.log("changesetCheck: no published package changed");
  } else if (result.release) {
    console.log(`changesetCheck: a release record for ${result.touched.join(", ")}`);
  } else {
    console.log(
      `changesetCheck: ${result.added.length} changeset(s) for a change to ${result.touched.join(", ")}; they name ${result.named.join(", ")}`,
    );
  }
  if (!result.release && result.deleted.length > 0) {
    console.log(
      `changesetCheck: note: it deletes ${result.deleted.join(", ")} outside a release record; the merge review checks that's right (a revert, say)`,
    );
  }
}
