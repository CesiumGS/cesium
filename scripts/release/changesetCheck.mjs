// The changeset rule's check (CS-613): a change that touches a published
// package (anything under packages/<name>/) must add a changeset, a
// `.changeset/<name>.md` file. An empty one (front matter with no
// packages) counts: it says the change has nothing for users. A release
// record, the change `npm run release:version` writes, passes too: it
// consumes changesets and changes only the packages' package.json and
// CHANGELOG.md files.
//
//   node scripts/release/changesetCheck.mjs --base <ref> [--head <ref>]
//
// It compares `<base>...<head>` (head defaults to HEAD), so the base must
// be fetched. Exits 1 with the changed packages when the change has none.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packageDirs } from "../build/declarations.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A changeset file: `.changeset/<name>.md`, not its README or the pre-mode folder's. */
export function isChangeset(path) {
  return /^\.changeset\/[^/]+\.md$/.test(path) && basename(path) !== "README.md";
}

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
 * @param {{ status: string, path: string }[]} changed `git diff --name-status --no-renames`'s lines
 * @param {{ folder: string, name: string }[]} packages the published packages
 * @param {(path: string) => string} read a file's text at the change's head
 * @returns {{ ok: boolean, touched: string[], added: string[], named: string[], unnamed: string[], release: boolean, problem?: string }}
 */
export function checkChangesets(changed, packages, read) {
  const byFolder = new Map(packages.map((p) => [p.folder, p.name]));
  const touchedPaths = changed.filter(({ path }) => {
    const m = /^packages\/([^/]+)\//.exec(path);
    return m !== null && byFolder.has(m[1]);
  });
  const touched = [
    ...new Set(touchedPaths.map(({ path }) => byFolder.get(path.split("/")[1]))),
  ].sort();
  const added = changed
    .filter(({ status, path }) => status === "A" && isChangeset(path))
    .map(({ path }) => path);
  const consumed = changed.some(({ status, path }) => status === "D" && isChangeset(path));
  const release =
    consumed &&
    touchedPaths.length > 0 &&
    touchedPaths.every(({ path }) => /^packages\/[^/]+\/(package\.json|CHANGELOG\.md)$/.test(path));
  const named = [];
  for (const path of added) {
    try {
      named.push(...namedPackages(read(path)));
    } catch (error) {
      return {
        ok: false,
        touched,
        added,
        named,
        unnamed: [],
        release,
        problem: `${path}: ${error.message}`,
      };
    }
  }
  const unnamed = touched.filter((name) => !named.includes(name));
  if (touched.length === 0 || release || added.length > 0) {
    return { ok: true, touched, added, named: [...new Set(named)].sort(), unnamed, release };
  }
  return {
    ok: false,
    touched,
    added,
    named: [],
    unnamed,
    release,
    problem: `this change touches ${touched.join(", ")} and adds no changeset. Add one with \`npx changeset\` (the packages, the bump and a sentence for users), or \`npx changeset --empty\` when it has nothing for users`,
  };
}

/** `git diff --name-status --no-renames`'s output as `{ status, path }` lines. */
export function parseNameStatus(text) {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [status, path] = line.split("\t");
      return { status: status[0], path };
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
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
  const git = (...rest) =>
    execFileSync("git", rest, { cwd: repo, encoding: "utf8", maxBuffer: 64 << 20 });
  const changed = parseNameStatus(
    git("diff", "--name-status", "--no-renames", `${base}...${head}`),
  );
  const packages = packageDirs().map((dir) => ({
    folder: relative(join(repo, "packages"), dir),
    name: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name,
  }));
  const result = checkChangesets(changed, packages, (path) =>
    git("show", `${head}:${path}`),
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
      `changesetCheck: ${result.added.length} changeset(s) for a change to ${result.touched.join(", ")}${result.named.length > 0 ? `; they name ${result.named.join(", ")}` : "; empty (nothing for users)"}`,
    );
    if (result.unnamed.length > 0 && result.named.length > 0) {
      console.log(
        `changesetCheck: note: no changeset names ${result.unnamed.join(", ")}; the merge review checks that's right`,
      );
    }
  }
}
