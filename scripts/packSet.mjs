// A packed pre-release set (CS-938): every package under packages/ as an
// `npm pack` tarball at the checked-out commit, for a host application that
// installs 2.0 by `file:` path before it publishes.
//
//   node scripts/packSet.mjs [--out <folder>] [--force]
//   node scripts/packSet.mjs --verify <folder>
//
// 1. Refuses a dirty tree: any change git sees, staged, unstaged, or an
//    untracked file that isn't ignored. An untracked file counts because the
//    build reads it (a new module under src/ would land in dist/), so a set
//    from such a tree wouldn't be what its commit says. Git's view is the
//    limit: an ignored file the build reads, and a file marked
//    `assume-unchanged` or `skip-worktree`, aren't covered. The tree is checked
//    again after the build and after the packs, to catch an edit made while
//    they ran.
// 2. Runs `npm run build`, with the packed checks (scripts/build.mjs).
// 3. Packs each package as a release would publish it: the `@cesium/source`
//    condition out of `exports` (scripts/build/pack.mjs's publishedManifest),
//    and `gitHead`, npm's own field for the commit, set to this one.
// 4. Writes the tarballs (each file name ends in the short commit) and
//    `manifest.json` to the output folder, by default
//    ~/.cesium-bench/packs/<full commit SHA>/. It refuses to replace a set
//    that exists unless `--force`; a replacement writes the new tarballs and
//    manifest beside the old ones first, then renames them into place, so a
//    failure leaves the old set whole.
//    Before anything is written, every `@cesium/*` dependency of every packed
//    package must be in the set, at exactly that package's version.
//
// The command writes nowhere but the output folder (its scratch space is a
// `.work` folder inside it, removed at the end) and the build's own outputs.
// `--verify` checks a folder against its manifest: every tarball present and
// matching its integrity, none extra, every tarball's name and version the
// manifest's, every `gitHead` the manifest's commit, the `install` fragment
// the set's, and every sibling dependency in the set. That catches a mixed
// set, tarballs from two commits.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedManifest } from "./build/pack.mjs";
import { packageDirs } from "./build/declarations.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the host's copy of the set goes, relative to the host's package.json. */
export const HOST_FOLDER = "cesium-packs";
/** The manifest's `format`; a change to its shape raises it. */
export const MANIFEST_FORMAT = 1;

function run(command, args, cwd, stdio = ["ignore", "pipe", "inherit"]) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio });
}

/** The folder a set goes to by default: ~/.cesium-bench/packs/<commit>. */
export function defaultOut(commit) {
  return join(homedir(), ".cesium-bench", "packs", commit);
}

/** The full SHA of the commit checked out in `repoDir`. */
export function headCommit(repoDir = repo) {
  const sha = run("git", ["rev-parse", "HEAD"], repoDir).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`git gave ${JSON.stringify(sha)} for HEAD, not a commit SHA`);
  }
  return sha;
}

/**
 * The paths git sees as changed in `repoDir`: staged, unstaged, and untracked
 * ones that aren't ignored (every file, not just its folder). A rename lists
 * its new path.
 */
export function dirtyPaths(repoDir = repo) {
  const out = run(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    repoDir,
  );
  const fields = out.split("\0").filter(Boolean);
  const paths = [];
  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i];
    paths.push(entry.slice(3));
    // A rename or copy is followed by a field holding its old path.
    if (/^[RC]/.test(entry) || /^.[RC]/.test(entry)) {
      i++;
    }
  }
  return paths;
}

/** Throws, naming the changed paths, when the tree isn't clean. */
export function requireCleanTree(repoDir = repo) {
  const dirty = dirtyPaths(repoDir);
  if (dirty.length > 0) {
    const shown = dirty.slice(0, 10).map((p) => `  ${p}`);
    if (dirty.length > shown.length) {
      shown.push(`  and ${dirty.length - shown.length} more`);
    }
    throw new Error(
      `the working tree isn't clean, so a set wouldn't match a commit. Commit or remove:\n${shown.join("\n")}`,
    );
  }
}

/** npm's integrity string for a file: `sha512-` and the digest in base64. */
export function integrityOf(file) {
  return `sha512-${createHash("sha512").update(readFileSync(file)).digest("base64")}`;
}

/** The `package.json` inside a tarball. */
function manifestInTarball(tarball) {
  return JSON.parse(run("tar", ["-xOzf", tarball, "package/package.json"], undefined));
}

/** The dependency fields npm resolves, so a sibling in any of them must be in the set. */
const DEPENDENCY_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies"];

/**
 * The problems with a set's `@cesium/*` dependencies: each one named in a
 * package's `dependencies`, `optionalDependencies` or `peerDependencies` must
 * be a package in the set, and its range must be that package's exact version,
 * since the host's overrides map the name to one tarball. Without this, a
 * package that gained a sibling would resolve it from the public registry.
 * @param {readonly { name: string, version: string, manifest: Record<string, any> }[]} entries
 *   each package's name and version as the set records them, and its packed `package.json`.
 * @param {readonly { name: string, version: string }[]} [members] the set's packages, when
 *   some tarball couldn't be read (it's reported elsewhere, and still counts as in the set).
 */
export function siblingProblems(entries, members = entries) {
  const versions = new Map(members.map((e) => [e.name, e.version]));
  const problems = [];
  for (const { name, manifest } of entries) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (!dep.startsWith("@cesium/")) {
          continue;
        }
        if (!versions.has(dep)) {
          problems.push(`${name} depends on ${dep} (${field}), which isn't in the set`);
        } else if (range !== versions.get(dep)) {
          problems.push(
            `${name} asks for ${dep} ${range} (${field}), and the set holds ${versions.get(dep)}`,
          );
        }
      }
    }
  }
  return problems;
}

/**
 * `path` as an absolute path with every symbolic link resolved in its nearest
 * existing ancestor (the rest doesn't exist yet, so it can't be one).
 */
export function realResolve(path) {
  let existing = resolve(path);
  const rest = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) {
      break;
    }
    rest.unshift(basename(existing));
    existing = parent;
  }
  return join(realpathSync(existing), ...rest);
}

/**
 * The package.json fragment a host merges in: each package by `file:` path to
 * its tarball in the host's copy of the set, and the same for every
 * `@cesium/*` package in `overrides`, so the packages' own exact-version
 * dependencies on one another resolve to the set, never to the registry
 * (where `@cesium/core` is 1.x's package).
 */
export function installFragment(packages, folder = HOST_FOLDER) {
  const spec = Object.fromEntries(
    packages.map((p) => [p.name, `file:./${folder}/${p.tarball}`]),
  );
  return { dependencies: { ...spec }, overrides: { ...spec } };
}

/** A set's folder is empty, absent, or a set with a manifest; else throws. */
function checkOutFolder(out, force, commit) {
  if (!existsSync(out)) {
    return;
  }
  if (!statSync(out).isDirectory()) {
    throw new Error(`${out} exists and isn't a folder`);
  }
  const manifestFile = join(out, "manifest.json");
  if (!existsSync(manifestFile)) {
    if (readdirSync(out).length > 0) {
      throw new Error(
        `${out} holds files but no manifest.json, so it isn't a set this command made; choose another --out`,
      );
    }
    return;
  }
  const existing = readSet(out); // throws on a manifest that isn't a set's
  if (!force) {
    throw new Error(
      `a set already exists at ${out} (commit ${existing.commit}). Use it, or pass --force to replace it for ${commit}`,
    );
  }
}

function readSet(folder) {
  const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8"));
  if (manifest.format !== MANIFEST_FORMAT || !Array.isArray(manifest.packages)) {
    throw new Error(`${join(folder, "manifest.json")} isn't a packed set's manifest`);
  }
  // A manifest is data: a tarball name is a plain file name, never a path, so
  // reading or removing it can't leave the set's folder.
  for (const p of manifest.packages) {
    if (typeof p.tarball !== "string" || !/^[A-Za-z0-9._-]+\.tgz$/.test(p.tarball) || p.tarball.includes("..")) {
      throw new Error(
        `${join(folder, "manifest.json")} names a tarball that isn't a plain file name: ${JSON.stringify(p.tarball)}`,
      );
    }
  }
  return manifest;
}

/**
 * Packs every package into `out` as `manifest.json` describes. Returns the
 * manifest.
 * @param {{
 *   out?: string, force?: boolean, build?: boolean, requireClean?: boolean,
 *   repoDir?: string, log?: (line: string) => void, beforeReplace?: () => void
 * }} [options] `build: false` and `requireClean: false` are for the test,
 *   which packs whatever `dist/` holds; the command always builds from a
 *   clean tree.
 */
export function packSet(options = {}) {
  const repoDir = options.repoDir ?? repo;
  const log = options.log ?? console.log;
  const build = options.build ?? true;
  const requireClean = options.requireClean ?? true;
  if (requireClean) {
    requireCleanTree(repoDir);
  }
  const commit = headCommit(repoDir);
  const out = resolve(options.out ?? defaultOut(commit));
  // Compare real paths: a link in --out, or in a parent of it, can lead into the checkout.
  const realOut = realResolve(out);
  const realRepo = realResolve(repoDir);
  if (realOut === realRepo || realOut.startsWith(`${realRepo}${sep}`)) {
    throw new Error(`--out ${out} is inside the checkout; choose a folder outside it`);
  }
  checkOutFolder(out, options.force ?? false, commit);

  const dirs = packageDirs();
  if (build) {
    log(`packSet: npm run build, at ${commit.slice(0, 10)}`);
    execFileSync("npm", ["run", "build"], { cwd: repoDir, stdio: "inherit" });
    if (requireClean) {
      // The build writes only ignored outputs; a change here would mean the
      // set isn't what its commit says.
      requireCleanTree(repoDir);
    }
    if (headCommit(repoDir) !== commit) {
      throw new Error("HEAD moved during the build");
    }
  }
  for (const dir of dirs) {
    if (!existsSync(join(dir, "dist"))) {
      throw new Error(
        `${relative(repoDir, dir)} has no dist/; run npm run build`,
      );
    }
  }

  const created = !existsSync(out);
  mkdirSync(out, { recursive: true });
  const work = join(out, ".work");
  try {
    rmSync(work, { recursive: true, force: true });
    mkdirSync(work);
    const packed = dirs.map((dir) => packOne(dir, work, commit));
    packed.sort((a, b) => a.name.localeCompare(b.name));
    if (requireClean) {
      // Packing reads the tree too: an edit made since the build shows here.
      requireCleanTree(repoDir);
    }
    const siblings = siblingProblems(
      packed.map((p) => ({ name: p.name, version: p.version, manifest: manifestInTarball(join(work, p.tarball)) })),
    );
    if (siblings.length > 0) {
      throw new Error(`the packages don't resolve inside the set:\n  ${siblings.join("\n  ")}`);
    }

    const manifest = {
      format: MANIFEST_FORMAT,
      commit,
      date: new Date().toISOString(),
      node: process.version,
      npm: run("npm", ["--version"], repoDir).trim(),
      packages: packed.map(({ name, version, tarball, integrity, size }) => ({
        name,
        version,
        tarball,
        integrity,
        size,
      })),
      install: installFragment(packed),
      installFolder: HOST_FOLDER,
    };
    // Everything is staged in the work folder, inside `out`, before the old
    // set is touched: the manifest is written, then each file is renamed into
    // place (a same-folder rename), the manifest last, and only then are the
    // old tarballs the new manifest doesn't list removed.
    writeFileSync(join(work, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const old = existsSync(join(out, "manifest.json")) ? readSet(out).packages : [];
    options.beforeReplace?.(); // for the test: a failure here must leave the old set whole
    for (const p of packed) {
      renameSync(join(work, p.tarball), join(out, p.tarball));
    }
    renameSync(join(work, "manifest.json"), join(out, "manifest.json"));
    const kept = new Set(packed.map((p) => p.tarball));
    for (const o of old) {
      if (!kept.has(o.tarball)) {
        rmSync(join(out, o.tarball), { force: true });
      }
    }
    log(`packSet: ${packed.length} packages for ${commit} in ${out}`);
    return manifest;
  } catch (error) {
    if (created) {
      rmSync(out, { recursive: true, force: true });
    }
    throw error;
  } finally {
    rmSync(work, { recursive: true, force: true });
    try {
      rmdirSync(out); // only if empty
    } catch {
      // not empty, or already removed
    }
  }
}

/** Packs one package as a release publishes it, with `gitHead`; returns its record. */
function packOne(dir, work, commit) {
  const into = join(work, basename(dir));
  mkdirSync(join(into, "first"), { recursive: true });
  const [first] = JSON.parse(
    run("npm", ["pack", dir, "--json", "--ignore-scripts", "--pack-destination", join(into, "first")], work),
  );
  const unpacked = join(into, "package");
  mkdirSync(unpacked);
  run("tar", ["-xzf", join(into, "first", first.filename), "-C", unpacked, "--strip-components=1"], undefined);
  const manifest = JSON.parse(readFileSync(join(unpacked, "package.json"), "utf8"));
  writeFileSync(
    join(unpacked, "package.json"),
    `${JSON.stringify({ ...publishedManifest(manifest), gitHead: commit }, null, 2)}\n`,
  );
  const [final] = JSON.parse(
    run("npm", ["pack", unpacked, "--json", "--ignore-scripts", "--pack-destination", work], work),
  );
  // The commit in the file name: two sets at one version (every pre-release
  // is 2.0.0-poc.0) then differ in the host's package.json and lockfile.
  // With one name, npm serves the first set's content from its cache by the
  // old integrity and never reads the new file.
  const tarball = final.filename.replace(/\.tgz$/, `-${commit.slice(0, 10)}.tgz`);
  renameSync(join(work, final.filename), join(work, tarball));
  const file = join(work, tarball);
  return {
    name: manifest.name,
    version: manifest.version,
    tarball,
    integrity: integrityOf(file),
    size: statSync(file).size,
  };
}

/**
 * Checks a set's folder against its manifest. Returns the problems, none when
 * the set is whole: each tarball present, its size and integrity as recorded,
 * its name and version and `gitHead` the manifest's, no tarball the manifest
 * doesn't list, the `install` fragment the packages' own, and every `@cesium/*`
 * dependency in the set.
 */
export function verifySet(folder) {
  const dir = resolve(folder);
  const manifest = readSet(dir);
  const problems = [];
  const listed = new Set();
  const entries = [];
  for (const p of manifest.packages) {
    listed.add(p.tarball);
    const file = join(dir, p.tarball);
    if (!existsSync(file)) {
      problems.push(`${p.name}: ${p.tarball} is missing`);
      continue;
    }
    if (statSync(file).size !== p.size || integrityOf(file) !== p.integrity) {
      problems.push(
        `${p.name}: ${p.tarball} isn't the tarball the manifest records (integrity differs); the set may mix commits`,
      );
      continue;
    }
    const inside = manifestInTarball(file);
    if (inside.name !== p.name || inside.version !== p.version) {
      problems.push(
        `${p.name}: ${p.tarball} holds ${inside.name}@${inside.version}, the manifest says ${p.name}@${p.version}`,
      );
    }
    if (inside.gitHead !== manifest.commit) {
      problems.push(
        `${p.name}: ${p.tarball} was packed at ${inside.gitHead ?? "no commit"}, the manifest says ${manifest.commit}`,
      );
    }
    entries.push({ name: p.name, version: p.version, manifest: inside });
  }
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".tgz") && !listed.has(name)) {
      problems.push(`${name} isn't in the manifest; it may belong to another set`);
    }
  }
  // The fragment a host copies must be the one these tarballs make.
  const fragment = installFragment(manifest.packages, manifest.installFolder);
  if (JSON.stringify(manifest.install) !== JSON.stringify(fragment)) {
    problems.push("the manifest's install fragment isn't the one its packages make");
  }
  problems.push(...siblingProblems(entries, manifest.packages));
  return problems;
}

function main(argv) {
  let out;
  let force = false;
  let verify;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--force") {
      force = true;
    } else if (arg === "--out" || arg === "--verify") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} needs a folder`);
      }
      if (arg === "--out") {
        out = value;
      } else {
        verify = value;
      }
    } else {
      throw new Error(
        `unknown argument ${arg}\nusage: node scripts/packSet.mjs [--out <folder>] [--force] | --verify <folder>`,
      );
    }
  }
  if (verify !== undefined) {
    const problems = verifySet(verify);
    if (problems.length > 0) {
      throw new Error(`the set in ${verify} isn't whole:\n  ${problems.join("\n  ")}`);
    }
    console.log(`packSet: the set in ${resolve(verify)} is whole`);
    return;
  }
  packSet({ out, force });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`packSet: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
