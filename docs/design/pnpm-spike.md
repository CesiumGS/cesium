# A pnpm spike: install time, disk, strict dependencies and publishing, against npm (CS-951, 2026-11-22)

**What this holds:** The data and the decision for CS-951: should 2.0 move from npm to pnpm? It compares `npm ci` with `pnpm install --frozen-lockfile` across fresh worktrees, runs the build and the tests under pnpm, lists what pnpm's strict layout catches, checks publishing, and lists what a move would change, file by file. It changes no default on main. The trial files (`pnpm-workspace.yaml`, `pnpm-lock.yaml`) live on a branch that never merges.

**The answer in short.** pnpm is faster and far smaller across many worktrees: a second worktree installs in 2.6 s instead of 7.7 s and adds 21 MiB instead of about 1.1 GiB. The move itself is real work, and it lands on files the owner controls. The disk problem has a cheaper fix that stays on npm. The recommendation is to stay on npm for alpha.1, declare the three dependencies pnpm showed to be missing, and decide the move again when a trigger below fires. The decision item is at the end.

## The question

2.0 installs with npm today: `npm ci` from a committed `package-lock.json` (CS-894, answer A), in every worktree and every CI job. The owner asked whether pnpm would be better on three counts: install time and disk across the many worktrees this repository runs, strict dependencies, and the release pipeline that CS-613 built on Changesets, `npm pack` and `npm stage publish`. Rush was set aside (built for hundreds of packages, overlaps Changesets). Turborepo and Nx were set aside by CS-610's design.

## Setup

| Item         | Value                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine      | Apple M2, 8 cores, 24 GiB, macOS (Darwin 27.2.0), APFS, a shared machine: other sessions ran builds, tests and parity suites during the runs                                                                                 |
| Node         | 24.19.0                                                                                                                                                                                                                      |
| npm          | 11.17.0                                                                                                                                                                                                                      |
| pnpm         | 11.12.0, the one already installed (a corepack shim). Nothing was installed or enabled. An extra data set with pnpm 12.21.0 is described below.                                                                              |
| Commit       | `2dc8e86d05`, main's tip when the spike began, in four fresh detached worktrees: two for npm, two for pnpm                                                                                                                   |
| Install line | npm: `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline --cache <dir>` (hitld's `worktree_setup`, plus an own cache). pnpm: `pnpm install --frozen-lockfile --ignore-scripts --prefer-offline --store-dir <dir>` |
| Isolation    | Every cache and store was a folder made for the spike and deleted at the end. Nothing touched the user's npm cache or pnpm store.                                                                                            |

**The method.** One batch is a cold install in the first worktree, with an empty cache or store, then an install in the second worktree that reuses it. Three batches per side, interleaved (npm, pnpm, npm, pnpm), each with `node_modules` removed first. Before each batch the quiet request was set for at most 20 minutes and the heavy-job gate cleared. The load average was recorded beside every number. The machine was never quiet in Dyno's sense (below 0.3 per core): the 1-minute load at the start of a run was 5.9 to 24.6 on 8 cores. Read the cold numbers with that in mind, and note they include the network.

**What the trial changed.** The pnpm side needs two files and no edit to a `package.json`:

- `pnpm-workspace.yaml`: the `packages` globs (pnpm doesn't read `workspaces` from `package.json`), npm's `overrides` in pnpm's selector form, and `linkWorkspacePackages: true`. Without that last setting pnpm 11 looks for `@cesium/next` on the registry and fails with a 404, because npm links a workspace package whose name and version match a plain range and pnpm doesn't.
- `pnpm-lock.yaml`, from `pnpm import` on `package-lock.json`.

pnpm takes one parent in an override selector (`parent>child`). npm's nested override for `@huggingface/transformers`, then `onnxruntime-web`, then `protobufjs` became `onnxruntime-web>protobufjs`, and the one for `allotment` became `use-resize-observer>react` and `use-resize-observer>react-dom`. These apply under any parent of that name, so they are slightly wider than npm's.

**Same versions on both sides.** The imported lockfile has 832 unique name and version pairs, the same count as `package-lock.json`. No version differs. One entry is spelled differently: `human-in-the-lead` is a Git dependency. npm records `git+ssh://git@github.com/…#fe7827…`, and pnpm records the `codeload.github.com` tarball of the same commit. So `npm ci` needs SSH access to that Git host and pnpm's lockfile doesn't.

## Install time

All times are wall seconds from `/usr/bin/time -p`, with the 1-minute load average at the start. The median is in bold.

**First worktree, empty cache or store (cold, with the network):**

| Run    | npm 11.17.0 |  load | pnpm 11.12.0 | load |
| ------ | ----------: | ----: | -----------: | ---: |
| 1      |      159.89 | 24.60 |        96.45 | 9.38 |
| 2      |      151.98 | 14.26 |        69.35 | 7.01 |
| 3      |      121.69 |  8.23 |        75.90 | 6.21 |
| Median |  **151.98** |       |    **75.90** |      |

**Second worktree, reusing the cache or store (warm):**

| Run    | npm 11.17.0 |  load | pnpm 11.12.0 | load |
| ------ | ----------: | ----: | -----------: | ---: |
| 1      |        7.74 | 15.38 |         2.59 | 5.99 |
| 2      |        7.36 |  8.85 |         2.85 | 5.86 |
| 3      |        9.21 | 10.27 |         2.39 | 5.85 |
| Median |    **7.74** |       |     **2.59** |      |

pnpm is about 2.0 times faster cold and 3.0 times faster warm. The warm case is the usual one for hitld, which sets up a worktree for every dispatch while the user's cache is full. The cold spread is wide on both sides: npm's three runs differ by 31 percent, pnpm's by 28 percent, and the load fell from run to run. The ordering is the same in every pair, so the conclusion holds, but the exact ratio does not.

**Two extra data sets.**

1. **pnpm 12.21.0, by accident.** My first pnpm batches set a cache variable that made the corepack shim fetch and run pnpm 12.21.0, the newest release. I kept them as a second data set. Cold: 98.33, 105.23 and 82.96 s (median 98.33), at loads 9.7, 11.6 and 9.6. Warm: 0.86, 0.84 and 0.87 s. The warm install is three times faster again than 11.12.0. The cold runs were not faster, but they ran at higher load than the 11.12.0 reruns, so I draw no conclusion about the cold case. The 12.x line also keeps a second copy of each package as a directory clone cache inside the store (an extra 780 MiB by `du`).
2. **Other import methods.** The clone and hard-link installs are in the disk section.

**One cost that doesn't show in the tables.** pnpm 11 verifies the lockfile against its supply-chain policies on every install ("Verifying lockfile against supply-chain policies (832 entries)"). That step reads registry metadata, and it is why pnpm's cache folder holds 173 MiB of package metadata. The `trustLockfile` setting skips it. I didn't change it.

**Dyno.** Dyno's `measure` command starts and watches a program, but this machine's Dyno queue was waiting for quiet for over an hour, and the heavy-job gate waited on the same condition. The installs ran as recorded commands (the logs and the load beside each number), as the item allows. `bench_runs: none`.

## Disk

`du` counts a hard link once per call but counts an APFS clone in full, and pnpm clones files on APFS by default. So `du` over-states pnpm's real use. The second column below is the free-space change on the volume (`df`) around the install. It is noisy on a shared machine, but pnpm's three second-worktree readings agree to 6 percent, so I use it for pnpm's per-worktree cost. For npm, `du` is right (npm copies every file).

| Item                                       | `du -sk`, MiB | Free-space change, MiB |
| ------------------------------------------ | ------------: | ---------------------: |
| npm, worktree 1 `node_modules`             |         1,097 |                    n/a |
| npm, worktree 2 `node_modules`             |         1,070 |                    n/a |
| npm cache (compressed tarballs, metadata)  |           322 |                    n/a |
| pnpm, each worktree's `node_modules`       |         1,079 | 20, 21 and 21 (second) |
| pnpm `node_modules/.pnpm` (the real files) |         1,078 |                    n/a |
| pnpm store (uncompressed files)            |         1,006 |                    n/a |
| pnpm metadata cache                        |           173 |                    n/a |
| pnpm, first worktree and store together    |           n/a | 1,224, 1,213 and 1,216 |

The pnpm total for a first worktree, 1,006 + 173 + 21 = 1,200 MiB by parts, matches the 1,213 to 1,224 MiB the volume lost. So the clones cost almost nothing: each extra worktree adds about 21 MiB, the directories and symbolic links pnpm lays out.

**Total disk for N worktrees**, in MiB:

- npm: 322 + 1,084 × N, with 1,084 the mean of the two worktrees above.
- pnpm: 1,179 + 21 × N (store 1,006, metadata 173).
- npm with an APFS clone of a ready `node_modules` (below): 322 + 1,084 + 15 × (N − 1).

| N                             | npm, MiB | pnpm, MiB | npm with clone, MiB |
| ----------------------------- | -------: | --------: | ------------------: |
| 1                             |    1,406 |     1,200 |               1,406 |
| 5                             |    5,742 |     1,284 |               1,466 |
| 10                            |   11,162 |     1,389 |               1,541 |
| 26 (the worktrees here today) |   28,506 |     1,725 |               1,957 |

The machine holds 26 worktrees with a `node_modules` today. At npm's rate that is about 28 GiB, on a volume with 103 GiB free (89 percent used).

**Two cheaper ways to the same disk win, measured.**

- **npm with `cp -cR`.** Copying a ready `node_modules` from another worktree with the APFS clone flag took 7.54, 7.16 and 7.48 s and cost 14.4 to 16.7 MiB of free space each. That is the same time as a warm `npm ci` (7.7 s) but 70 times less disk. The `@cesium/*` workspace links are relative, so they survive the copy (`core -> ../../packages/core`). The catch: it needs a donor worktree at the same lockfile, and a clone on another volume is a full copy.
- **pnpm with hard links.** `--package-import-method=hardlink`, the setting for a filesystem without clones, took 7.4 s (three runs: 7.36, 7.38, 7.49) against 2.6 s for the default clone. With the store and one worktree in a single `du` call it counts 1,006 MiB for the store and 292 MiB for the worktree. The free space fell by 7 to 25 MiB. So hard links work too, but slower, and on Linux CI (hard links by default) the second install gets no clone speed-up.

pnpm's disk win depends on the store and the worktree being on one volume. If a worktree lives on another volume than the store, pnpm falls back to copying, and the saving disappears.

## Correctness under pnpm

The build ran in `-pnpm1` (pnpm 11.12.0, installed with `--ignore-scripts` as `worktree_setup` does), behind the plain heavy-job gate. **The full test suite and `test:data` have not run.** The gate held for over an hour behind a measurement that must not share the machine, and I did not bypass it. They are the open part of the item: the commands are `pnpm test` and `pnpm run test:data` in `-pnpm1`, and if either fails, the same step under npm in `-npm1` says whose failure it is. Until they run, the findings below come from the scan, the build and the pack comparison, not from the tests.

| Step                                | Result under pnpm                                                                                                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run build`                    | Exit 0, 30.8 s. All seven packages pass the packed checks (checkDeclarations, publint, attw).                                                                                       |
| `pnpm test`                         | Not run yet. The plain heavy-job gate was held for over an hour by another job (a nightly measurement), so this and the next row wait for the orchestrator to run them in `-pnpm1`. |
| `pnpm run test:data`                | Not run yet, for the same reason.                                                                                                                                                   |
| `npx --no-install @cesium/dyno`     | Fails: `dyno: command not found` (see "Resolves differently")                                                                                                                       |
| `npx --no-install hitld work check` | Works: `ok`, 1,074 files, no problems                                                                                                                                               |

### Every undeclared dependency pnpm's layout catches

I scanned every tracked JavaScript and TypeScript file for bare imports (`import`, `export … from`, `import()`, `require()`), and resolved each from its own folder in both layouts with Node's own resolver. An import counts when it resolves under npm, because npm hoists every transitive dependency to the root, and doesn't resolve under pnpm, because pnpm links only what a `package.json` declares. I checked each one by running `import()` of the name from the repository root in the pnpm worktree: all three fail with `ERR_MODULE_NOT_FOUND`.

| Import            | File                                                                                                                                                  | Package that needs it                               | Fix: a dependency to declare                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playwright`      | `scripts/alphaSweep.mjs`, `scripts/dumpMsl.mjs`, `scripts/galleryNav.mjs`, `scripts/profilePage.mjs`, `scripts/retainers.mjs`, `scripts/runSpike.mjs` | The root (`cesium-workspace`)                       | Declare `playwright` in the root `devDependencies`, at the version `@playwright/test` pins (1.64.1 in the lockfile). Today only `@playwright/test` is declared. |
| `sharp`           | `scripts/alphaSweep.mjs`                                                                                                                              | The root                                            | Declare `sharp` in the root `devDependencies` (0.35.5 in the lockfile). It arrives today only through `@cesium/sandcastle`'s `@huggingface/transformers`.       |
| `onnxruntime-web` | `spikes/core-ir/run.mjs`                                                                                                                              | `core-ir-spike` (`spikes/core-ir`, not a workspace) | Declare it in `spikes/core-ir/package.json`. The script's own comment says it relies on "the repository root's tree".                                           |

The scan also flagged strings that aren't imports (`cesium` and `Sandcastle` in gallery and example sources, the `cesium-oracle` aliases in `vite.config.ts`, a `three` import named only in a comment, and `@cesium/core` and `@cesium/engine` inside quoted test inputs). I looked at each and none is a missing dependency. The 1.x pin `cesium-1x` resolves through an alias in both layouts.

The three real ones are scripts and a spike, not the engine. Nothing under `packages/*/src` imports an undeclared package, which is what `test/importBoundary.test.ts` guards for the `@cesium/*` rule. pnpm would catch the other kind, a package import outside the repository's own dependencies, at install time and not at the first run of an old script. The fix doesn't need pnpm: declaring the three dependencies works under npm too.

### Resolves differently

| Thing                                 | npm                                                                                            | pnpm                                                                                                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace links, `@cesium/*`          | Every workspace package is linked at the root (`node_modules/@cesium/core`, `dyno`, and so on) | Only what the root declares: `@cesium/next` and the eslint config. A root file that names `@cesium/core`, or a bin from `@cesium/dyno`, doesn't resolve.                                                                                                  |
| Plain version ranges between packages | Link the workspace package when name and version match                                         | Need `linkWorkspacePackages: true`, or `workspace:` ranges in every `package.json`                                                                                                                                                                        |
| `npx --no-install @cesium/dyno`       | Works (the `dyno` bin is linked at the root)                                                   | Fails: `dyno: command not found`. This is the project's own command in `AGENTS.md`, and the heavy-job gate, `quiet-watch.sh` and `test/dynoBin.test.ts` use it. Fix: declare `@cesium/dyno` in the root `devDependencies`, or run it as `pnpm exec dyno`. |
| `npx hitld`                           | Works                                                                                          | Works (`hitld` is a root dependency)                                                                                                                                                                                                                      |
| `npm run <script>`                    | Works                                                                                          | Works unchanged. A `package.json` script is the same under either manager, and `npm run build` ran inside the pnpm tree.                                                                                                                                  |
| Postinstall scripts                   | Skipped by `--ignore-scripts` (the project's choice)                                           | Skipped by the same flag. Without the flag, pnpm 11 also refuses unreviewed build scripts until an allowlist (`allowBuilds`) names them.                                                                                                                  |
| husky and lint-staged                 | `prepare: husky` runs on a plain install; the hooks use `npx --yes lint-staged@17.6.1`         | `prepare` runs the same. `npx` still works with pnpm's tree. I didn't run a commit hook in the pnpm tree.                                                                                                                                                 |
| Vite resolution                       | `@cesium/source` condition and aliases (`vite.config.ts`)                                      | The build under pnpm exited 0. Vite's resolution in the test run is not yet checked                                                                                                                                                                       |
| Git dependency                        | `git+ssh://` in the lockfile                                                                   | `https` tarball of the same commit                                                                                                                                                                                                                        |

## Publishing

CS-613's pipeline packs with `npm pack` in a job with no OIDC token, then a second job stages each tarball with `npm stage publish`, authenticated by npm's trusted publishing (OIDC) and attached to the `npm` environment (`.github/workflows/release.yml`, `scripts/release/stageTarballs.mjs`). I read the documents below as data and checked the installed pnpm 11.12.0 directly. Nothing was published and nothing acted outside the repository.

**What pnpm supports.**

- **Staged publishing: yes.** pnpm 11.3.0 added `pnpm stage` with `publish`, `list`, `view`, `approve`, `reject` and `download`. The installed 11.12.0 has them (`pnpm stage --help`), and `pnpm stage publish` takes `[<tarball>|<dir>]`. `npm stage publish` is documented to pack the current directory; this repository already hands it a tarball path.
- **Trusted publishing (OIDC): yes in `pnpm publish`.** The changelog's 11.0.7 entry says OIDC takes precedence over a configured token in `pnpm publish`, "mirroring the npm CLI's behavior", and honors an `NPM_ID_TOKEN` variable for other CI providers. Later entries fix a 404 under OIDC (11.1.3), a provenance failure on versions with build metadata (11.0.9) and a credential print in OIDC failure messages (11.11.0). pnpm's publish page says that under trusted publishing pnpm attaches provenance on its own.
- **Not checked: `pnpm stage publish` under OIDC, end to end.** Staging with the OIDC token needs a real run on npm's side, with a trusted publisher configured for each package, and that is outside the repository. I found the pieces in the documents and the changelog, not a run. The docs I read say npm lets a trust token (OIDC) stage "if allowed", and none names pnpm. I could not confirm from them that pnpm's staging uses the OIDC exchange the way npm's does.

So pnpm probably supports both, and this is unproven for the combination CS-613 uses. It doesn't have to be proven, because of the fallback:

**The fallback needs no pnpm publish.** Keep `npm pack` for the tarballs and `npm stage publish` for staging. They don't read `node_modules` and work on a pnpm-installed tree: `pnpm run build` ran the packed checks, which call `npm pack`, and exited 0. The release pipeline installs nothing in its `publish` job, so its steps stay as they are under a move. Only the pack job's `npm ci` changes.

**`pnpm pack` against `npm pack`, for the seven packages** (in `-pnpm1`, after the build):

| Check                                                  | Result                                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| File lists, `pack --dry-run --json`, per package       | Identical for all seven: `next` 67 files, `core` 771, `crs` 48, `frames` 118, `measure` 27, `time` 25, `ui` 49 |
| Tarball contents, unpacked and compared with `diff -r` | Identical except one byte: `package.json` has no trailing newline in pnpm's tarball                            |
| Tarball file names                                     | Identical (`cesium-core-2.0.0-poc.0.tgz` and the rest)                                                         |
| Tarball sizes                                          | pnpm's are 0.1 to 0.3 percent larger (compression and archive metadata)                                        |

The manifests have no `workspace:` ranges, so pnpm had nothing to rewrite. If a move adopted `workspace:*` between packages, pnpm would rewrite them on pack and npm would not, so the packing step would have to be pnpm's, and `npm stage publish` of a tarball that contains no `workspace:` text would still work. `scripts/packSet.mjs` and `scripts/build/pack.mjs` call `npm pack` by name (and `packSet.mjs` records npm's version and sets npm's `gitHead` field); I did not run `packSet.mjs` on pnpm's tarballs, since it builds and packs by itself with npm. Its checks read tarballs, so they would pass the pnpm tarballs above, but `gitHead` is added only by npm. That is a difference to keep in mind, not one I tested.

## What would change

Sizes are small (S, one or two lines), medium (M, a file or two), or large (L, many files). "Owner path" is a path `AGENTS.md` and `policy.json` reserve for the owner, so each of those lands as an owner-reviewed change.

| File or area                                                                                                       | Change under a move to pnpm                                                                                                                                                                                                                 | Size | Owner path |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------- |
| `package.json` (root)                                                                                              | Remove `workspaces` and `overrides`. Declare `playwright`, `sharp`, `@cesium/dyno` and the workspace packages the root files import. Optionally add `packageManager`.                                                                       | M    | yes        |
| `pnpm-workspace.yaml`, `pnpm-lock.yaml`                                                                            | New (from the trial branch). `package-lock.json` is deleted, and CS-894's answer (A, `npm ci` everywhere) is reopened.                                                                                                                      | M    | no         |
| `spikes/core-ir/package.json`                                                                                      | Declare `onnxruntime-web`.                                                                                                                                                                                                                  | S    | no         |
| `.human-in-the-lead/policy.json`, `env.worktree_setup`                                                             | `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` becomes `pnpm install --frozen-lockfile --ignore-scripts --prefer-offline`. One line. hitld needs pnpm on `PATH` in every dispatch's environment (the shim is there today). | S    | yes        |
| Gate scripts (`heavy-job-gate.sh`, `quiet-watch.sh`, `merge-gates.sh`, `gate-chain.sh`, `next-slot.sh`)            | Only `npx --no-install @cesium/dyno status` needs the dyno bin to resolve (the root declares it) or `pnpm exec dyno`. The `npm run …` and `npx vitest/tsc/hitld` lines keep working.                                                        | S    | no         |
| `.github/workflows/ci.yml` and `release.yml`                                                                       | Replace `npm ci --ignore-scripts --no-audit --no-fund` (7 places in `ci.yml`, 1 in `release.yml`) and `setup-node`'s `cache: npm` (5 places). Add a pnpm setup step: a new action pinned by SHA, or corepack.                               | M    | yes        |
| `.github/dependabot.yml`                                                                                           | No npm entry exists yet. CS-894's grouped updates need one, and Dependabot's support for pnpm 11's lockfile format must be checked before the move (I did not).                                                                             | S    | yes        |
| `scripts/release/version.mjs`                                                                                      | One call, `npm install --package-lock-only`, becomes `pnpm install --lockfile-only`. The other release scripts call `npm view`, `npm pack` and `npm stage` and stay.                                                                        | S    | no         |
| `scripts/packSet.mjs`, `scripts/build/pack.mjs`, `scripts/release/stage*.mjs`                                      | None needed (`npm pack` and `npm stage publish` work on a pnpm tree). Only the recorded `npm` version in `packSet.mjs`'s manifest stays npm's.                                                                                              | 0    | no         |
| `.changeset/config.json`                                                                                           | None. Changesets reads the workspace from `pnpm-workspace.yaml` and `package.json`. (Not run here.)                                                                                                                                         | 0    | no         |
| Docs: `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `docs/hosts/packed-builds.md`, `.claude/skills/*`, the handbook | About 60 files mention `npm run`, `npm ci` or `npx`. Most `npm run` lines stay valid. The install line, the "Node 24" setup, and the dyno command change in a handful.                                                                      | L    | partly     |
| The hosts guide (`docs/hosts/packed-builds.md`, CS-949)                                                            | None for a host: a host installs tarballs with its own manager. The guide's `npm pack` steps are unchanged.                                                                                                                                 | 0    | no         |
| Contributors and agents                                                                                            | Everyone needs pnpm 11.12.0 or newer, through corepack. pnpm 12 is out; its warm install is faster still, but it's a major version the repository would have to pin.                                                                        | M    | no         |

A move is therefore one change with about ten files in it, and four of those are owner paths. It also reopens CS-894: the committed `package-lock.json` becomes `pnpm-lock.yaml`, the nightly fresh-ranges test and the grouped Dependabot updates need re-pointing, and "`npm ci` everywhere" stops being true.

## Costs and risks of each choice

**Move to pnpm.**

- Gains: 2.0 times faster cold and 3.0 times faster warm installs on this machine; about 21 MiB per extra worktree instead of 1.1 GiB (28 GiB against 1.7 GiB for today's 26 worktrees); a strict layout that already named three undeclared imports.
- Costs: the ten-file change above, four owner paths among them; CS-894 reopened; every contributor and every executor needs pnpm of the right version; a new action or corepack step in CI; pnpm's separate settings surface (`pnpm-workspace.yaml`) in place of `package.json` and `.npmrc`.
- Risks: pnpm's APFS speed and disk win holds only with the store and the worktrees on one volume; `pnpm stage publish` under OIDC is unproven (the fallback holds); Dependabot's pnpm 11 support is unchecked; the dyno bin and the root-link difference break the project's own commands until the root declares what it uses; pnpm's strict install security checks (script allowlist, release-age and trust policy) can block an install in ways npm doesn't; the 11.x and 12.x lines both exist, so a version pin is part of the move.

**Stay on npm.**

- Gains: nothing changes; CS-613's pipeline and CS-894's answer stand while alpha.1's release path is new.
- Costs: about 1.1 GiB and 7.7 s for every worktree, 28 GiB today; installs are twice as slow cold; no strict layout, so a missing declaration shows up only when a script runs.
- Risks: the disk grows with every worktree; the three undeclared dependencies stay hidden until someone declares them.

**Middle option: stay on npm and clone `node_modules`.** Change `worktree_setup` to `cp -cR` a ready worktree's `node_modules`, and fall back to `npm ci` when there's none. Same speed as today's warm install, 15 MiB per extra worktree, 1,957 MiB for 26 worktrees. It is one line in an owner path. It fails safe, since `npm ci` replaces `node_modules` anyway, but it needs a donor on the same lockfile and volume.

**Middle option: pnpm for installs, npm for packing and staging.** The pipeline already works that way (the pack and stage steps don't read `node_modules`). It takes the install and disk gains and keeps CS-613's release path exactly as built. It still costs the lockfile swap and the CI change.

## Recommendation

Stay on npm for alpha.1. Do three small things that don't need the move:

1. Declare `playwright` and `sharp` in the root `devDependencies`, and `onnxruntime-web` in `spikes/core-ir/package.json`. This takes the strictness win without the move.
2. Consider the clone step in `worktree_setup`. It gets the disk win (28 GiB down to about 2 GiB for 26 worktrees) in one line, at the same speed as today.
3. Keep this write-up and the trial branch as the cost basis. Move when one of these happens: CI's install time or the cache bill becomes the slowest step; worktree disk pressure persists after the clone step; or the owner wants the strict layout as a rule and not only a scan.

The recommendation to stay doesn't depend on the open test runs. A decision to move does: it should wait for `pnpm test` and `pnpm run test:data` in `-pnpm1`, and for the type check (`npm run typecheck`) there, which I did not run either.

The reason to wait and not move now is timing, not the numbers. pnpm's gains are real, but they're a convenience on one machine, and the disk part is cheap to get on npm. The move reopens a decision the owner took on 2026-11-22, touches four owner paths, and lands while the release pipeline CS-613 finished is still new and alpha.1 isn't out. Nothing in the data says npm is wrong; it says npm is slower and larger. If the owner puts more weight on the 2.0 to 3.0 times speed-up and the strict layout than on the timing, the move is sound and the table above is its plan.

## The decision asked

Move to pnpm, stay on npm, or take a middle option? The draft item is in the report that came with this write-up. It lists the three options, what each does, and the recommendation above.

## How the numbers were made

- Worktrees: four, detached at `2dc8e86d05`, named for the item and the side; the pnpm ones got the two trial files copied in, uncommitted. At the end I removed `-npm2`, `-pnpm2` and the trial worktree with `git worktree remove`, and deleted the spike folder's npm cache, logs and scratch files after recording the sizes above. `-pnpm1` and `-npm1` stay, with the pnpm store and metadata cache, so the two open test steps can run against them. The orchestrator removes them afterward.
- Trial branch: `hitld/CS-951-pnpm-trial` holds `pnpm-workspace.yaml` and `pnpm-lock.yaml`, in one commit. It never merges. It was cut from the claim commit.
- No `package.json` was edited, on either branch. The three undeclared dependencies and the dyno link are described, not fixed.
- The strictness scan is a throwaway script (not committed): `git ls-files`, a regular expression for the four import forms, and Node's `findPackageJSON` from each file's own folder.
- Raw results of the runs are the tables above. The logs were removed with the spike folder.

## Sources

Read on 2026-11-22. The pages' text is data.

- pnpm 11.3 release notes: <https://pnpm.io/blog/releases/11.3> (adds `pnpm stage`; no date on the page).
- `pnpm publish`: <https://pnpm.io/cli/publish>. The page includes features added in 12.x, so it may describe a newer release than 11.12.0.
- `pnpm pack`: <https://pnpm.io/cli/pack>.
- npm, `npm stage` (CLI 11.21.3, last edited 2026-09-29): <https://docs.npmjs.com/cli/v11/commands/npm-stage>.
- npm, trusted publishers (last edited 2026-10-06): <https://docs.npmjs.com/trusted-publishers>. Needs npm 11.5.1 or later and Node 22.14.0 or later.
- npm, staged publishing (last edited 2026-11-10): <https://docs.npmjs.com/staged-publishing>. Needs npm 11.15.0 or later.
- The installed pnpm 11.12.0's own `CHANGELOG.md` (entries 11.0.7, 11.0.9, 11.3.0, 11.12.0), `pnpm stage --help` and `pnpm publish --help`.
- `docs/design/repository-build-and-release.md`, "Installs and the lockfile", "CI" and "Releases" (CS-610, CS-613).
