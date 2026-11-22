// The checks on the packed result (CS-612): each package packed with
// `npm pack`, unpacked into a scratch folder with its `package.json` as a
// release publishes it, then scripts/checkDeclarations.mjs over every
// package together, and publint and Are the Types Wrong (`attw`) on each
// tarball (CS-892).
//
//   checkPacked(packageDirs)   throws, listing every problem, when a check fails
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import { checkDeclarations } from "../checkDeclarations.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** The parts of the API the API review has audited (checkDeclarations --only). */
export const AUDITED = ["crs/engineering", "measure", "ui"];

/**
 * `manifest` as a release publishes it: the `@cesium/source` condition,
 * which points at src/ (not in the tarball), taken out of every export.
 */
export function publishedManifest(manifest) {
  const exports = {};
  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    if (typeof target === "string") {
      exports[key] = target;
    } else {
      exports[key] = Object.fromEntries(
        Object.entries(target).filter(([condition]) => condition !== "@cesium/source"),
      );
    }
  }
  return { ...manifest, exports };
}

/** `npm pack`s the packages into `into`; returns each tarball's path, by folder. */
function pack(packageDirs, into) {
  const out = execFileSync(
    "npm",
    [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      into,
      ...packageDirs.flatMap((dir) => [
        "--workspace",
        relative(repo, dir).split("\\").join("/"),
      ]),
    ],
    { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  const packed = JSON.parse(out);
  return packageDirs.map((dir, i) => ({
    folder: basename(dir),
    name: packed[i].name,
    files: packed[i].files.map((f) => f.path),
    tarball: join(into, packed[i].filename),
  }));
}

/** The attw problems' kinds, as its command line names them, in one line each. */
function attw(tarball) {
  try {
    execFileSync(
      join(repo, "node_modules", ".bin", "attw"),
      [tarball, "--profile", "esm-only", "--format", "ascii", "--no-color"],
      { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return [];
  } catch (error) {
    return [`${error.stdout ?? ""}${error.stderr ?? ""}`.trim()];
  }
}

/**
 * Packs and checks every package. Prints one line per package and check;
 * throws when any fails.
 * @param {string[]} packageDirs
 * @param {{ log?: (line: string) => void, keep?: boolean }} [options]
 */
export async function checkPacked(packageDirs, options = {}) {
  const log = options.log ?? console.log;
  const work = mkdtempSync(join(tmpdir(), "cesium-packed-"));
  const problems = [];
  try {
    const tarballs = pack(packageDirs, work);
    const folders = [];
    for (const { folder, name, files, tarball } of tarballs) {
      // What a published tarball must and mustn't hold.
      const sources = files.filter((f) => f.startsWith("src/"));
      if (sources.length > 0 || !files.some((f) => f.startsWith("dist/"))) {
        problems.push(
          `${name}: the tarball holds ${sources.length > 0 ? `src/ (${sources.length} files)` : "no dist/"}`,
        );
      }
      const dir = join(work, folder);
      mkdirSync(dir);
      execFileSync("tar", ["-xzf", tarball, "-C", dir, "--strip-components=1"]);
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      writeFileSync(
        join(dir, "package.json"),
        `${JSON.stringify(publishedManifest(manifest), null, 2)}\n`,
      );
      // The tarball as a release publishes it, for attw.
      const into = join(work, "published", folder);
      mkdirSync(into, { recursive: true });
      const [repacked] = JSON.parse(
        execFileSync(
          "npm",
          ["pack", dir, "--json", "--ignore-scripts", "--pack-destination", into],
          { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
        ),
      );
      const published = join(into, repacked.filename);
      folders.push({ folder, name, dir, published, files: files.length });
    }

    const declarations = checkDeclarations(
      folders.map((f) => f.dir),
      { only: AUDITED },
    );
    for (const line of declarations.pending) {
      log(
        `  checkDeclarations: pending the owner's call (a public export), not failed on: ${line}`,
      );
    }
    problems.push(...declarations.problems.map((p) => `checkDeclarations: ${p}`));
    log(
      `  checkDeclarations: ${declarations.walked} exports over ${declarations.entries.length} entries, ${declarations.problems.length} problem(s)`,
    );

    for (const { name, dir, published, files } of folders) {
      const lint = await publint({ pkgDir: dir, pack: false, strict: true });
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const lines = lint.messages.map(
        (m) => `${m.type}: ${formatMessage(m, manifest) ?? m.code}`,
      );
      problems.push(...lines.map((l) => `${name}: publint ${l}`));
      const types = attw(published);
      problems.push(...types.map((t) => `${name}: attw\n${t}`));
      log(
        `  ${name}: ${files} files; publint ${lines.length === 0 ? "clean" : `${lines.length} message(s)`}; attw ${types.length === 0 ? "no problems (esm-only)" : "problems"}`,
      );
    }
  } finally {
    if (options.keep) {
      log(`  packed into ${work}`);
    } else {
      rmSync(work, { recursive: true, force: true });
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `the packed packages fail ${problems.length} check(s):\n  ${problems.join("\n  ")}`,
    );
  }
}
