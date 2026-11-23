# Packed pre-release builds for a host application

A host application outside this repository can install a pre-release of 2.0 from packed tarballs, before 2.0 publishes. One command packs every package at the commit you have checked out. The host copies the tarballs into a folder of its own and installs them by `file:` path.

Nothing here depends on any host. The command only writes to its output folder.

## Make a set

In any 2.0 checkout or worktree, at the commit you want, installed with `pnpm install` (the repository installs with pnpm; the set is still packed with `npm pack`, and a host installs it with its own package manager, npm below):

```sh
node scripts/packSet.mjs
```

The command:

1. Refuses a dirty tree. Dirty means any change git sees: staged, unstaged, or an untracked file that isn't ignored. An untracked file counts because the build reads it, so a new module under `src/` would land in `dist/`. The error names the paths. The check is git's, so it doesn't cover an ignored file the build reads, or a file marked `assume-unchanged` or `skip-worktree`. It runs again after the build and after the packs, to catch an edit made while they ran.
2. Runs `npm run build`, with its packed checks (`checkDeclarations`, publint, attw).
3. Packs every package under `packages/` as a release would publish it. The `@cesium/source` condition is out of `exports`, which points at `src/`, and `gitHead` holds the commit. Then it checks that every `@cesium/*` dependency of every package is a package in the set, at exactly that package's version, and stops if one isn't.
4. Writes the set to `~/.cesium-bench/packs/<commit>/`, with the full 40-character SHA as the folder name.

A set that already exists for the commit is never replaced by accident. The command stops and says so. Pass `--force` to replace it. A replacement stages the new tarballs and manifest first and renames them into place, so a failure leaves the old set whole.

To write somewhere else, pass the folder itself: `node scripts/packSet.mjs --out /path/to/folder`. The folder can't be inside the checkout, even through a symbolic link, and it must be empty, new, or an earlier set.

While it runs, the command keeps scratch files in a `.work` folder inside the output folder and removes it at the end. Outside the output folder it writes only what `npm run build` writes into the checkout (`packages/*/dist/`, which git ignores).

## What the folder holds

- One tarball per package, such as `cesium-core-2.0.0-poc.0-9f2e37af28.tgz`. The file name ends in the first ten characters of the commit. Every pre-release has the version `2.0.0-poc.0`, so without the commit in the name, npm would serve an older set's content from its cache.
- `manifest.json`:
  - `commit`: the full SHA the set was packed at.
  - `date`: when it was packed, in UTC.
  - `node` and `npm`: the versions that packed it.
  - `packages`: for each package, its `name`, `version`, `tarball` file name, `integrity` (`sha512-…`, as npm records it) and `size` in bytes.
  - `install`: a `dependencies` and an `overrides` object, ready to copy into the host's `package.json`.

## Install a set in the host

Install the whole set together. The packages depend on each other by exact version, and `@cesium/core` is also the name of 1.x's package on the public registry.

**The `overrides` are mandatory.** They point every `@cesium/*` package at its tarball, so each sibling comes from the set. Without them, `npm install` can silently install 1.x's `@cesium/core` from the public registry, or fail on a version that doesn't exist there. This holds even when `dependencies` names only the packages the host imports, which is the usual case. A leftover `package-lock.json` or `node_modules` from an earlier install can hide a missing override, because npm reuses what it finds. When the host moves to a new set, delete both and run `npm install`, or run `npm ci` against a lockfile that already names the new set.

1. Copy the tarballs into a folder of the host, named `cesium-packs` (the fragment's paths use that name), and add the folder to the host's `.gitignore`.
2. Merge `install` from `manifest.json` into the host's `package.json`. To print it:

   ```sh
   node -p 'JSON.stringify(require("/path/to/set/manifest.json").install, null, 2)'
   ```

   Keep the `overrides` for every package. In `dependencies`, keep the packages the host imports. The others still install, as dependencies of those.

3. Run `npm install`. The host's lockfile now records each package as `file:cesium-packs/<tarball>`, with its integrity.

Commit the lockfile. A fresh clone of the host needs the set copied into `cesium-packs` first, then `npm ci`. If a tarball doesn't match the lockfile, npm stops with an integrity error.

## Ask for a fresh set

When 2.0 moves, check out the new commit and run `node scripts/packSet.mjs` again. Then, in the host:

1. Delete the old tarballs from `cesium-packs` and copy in the new set. Never leave tarballs from two sets side by side.
2. Merge the new `install` into `package.json`. The file names changed, so the `file:` paths did too.
3. Delete `package-lock.json` and `node_modules`, then run `npm install`.

## Check a set

```sh
node scripts/packSet.mjs --verify /path/to/set
```

This reads the manifest and checks that every tarball is there, with the recorded size and integrity, that each holds the package name and version the manifest records, that each was packed at the manifest's commit, that no tarball is present that the manifest doesn't list, that the `install` fragment is the one the packages make, and that every `@cesium/*` dependency is in the set. A mixed set, with tarballs from two commits, fails this check and says which tarball. It exits non-zero when anything is wrong.

The check runs from a checkout of 2.0, so a host without one relies on its lockfile, which pins each tarball's integrity.
