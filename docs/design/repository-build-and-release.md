# The 2.0 repository: layout, build, tests and releases (design, 2026-11-21)

**What this holds:** The design of the 2.0 branch's repository once 1.x has left it, for CS-610: the final layout, the build that replaces gulp, the tests and gates, parity and Dyno against a published 1.x, Sandcastle, CI, the release pipeline that publishes alpha.1, and the order of pure moves CS-835 makes into that layout. Nothing here is built. The owner reviews it before CS-611, CS-612, CS-613 and CS-835 start.

**The owner's calls it builds on.** "Design first, move once" (2026-11-21): 1.x leaves the branch and the new build lands before alpha.1, and CS-835 moves 2.0 once, straight into the final layout, with its packages at the repository root and no `packages/next`. Parity and Dyno compare against a pinned, published `cesium@1.x` dev dependency. Sandcastle stays in the repository, working, until it has a repository of its own. Every first-party package releases in lockstep (the release plan, `docs/decisions/2026-11-17-release-plan-and-parity.md`). Experimental packages carry a paired 0.x version line, outside the umbrella (CS-681, answer B). 1.x's `@cesium/core` keeps 0.x under a `1x` dist-tag, and 2.0 takes `latest` at 2.0.0 (CS-880, answer A). Shared utilities live in `@cesium/core/internal` (CS-883, answer A). Catalog adapters are `catalog-*`, decided with CS-818 (CS-881, answer A). Merges check correctness only, and Dyno measures what each merge touched (CS-856). In the owner's plan of 2026-11-21, CS-611 (1.x replaced) needs CS-835; "The order of the work" explains why this design asks to swap them. 1.x on `main` is untouched.

**What it read.** The 2.0 branch at `eed39bb0b2`. The package map ([package-map.md](package-map.md), CS-834) and the content-source seam ([content-source-seam.md](content-source-seam.md), CS-552). The project CS-609, the milestones CS-614 and CS-621, the items CS-102, CS-611, CS-612, CS-613, CS-616, CS-617, CS-681, CS-835, CS-856 and CS-882, the decisions CS-880, CS-881 and CS-883, and Sandcastle's items CS-628 to CS-634. The root `package.json`, `.npmrc`, `.gitignore`, `gulpfile.js`, `gulpfile.apps.js`, `.github/workflows/`, `.husky/`, `.human-in-the-lead/`; `packages/next/package.json`, its Vite and TypeScript configs, `scripts/checkBundle.mjs`, `scripts/slangBuild.mjs`, Dyno's `bench/suite/cesium1x.ts`, `release.mjs`, `engineBuilds.mjs` and `bench/snapshot.mjs`; `packages/sandcastle`'s configs. The npm registry's file lists for `cesium@1.147.0`, `@cesium/engine@26.5.0`, `@cesium/widgets@16.3.1` and `@cesium/core@0.1.1` (2026-11-21). Outside practice is in "Sources" at the end, each with the date it was read.

**What to read first.** "The design in one page", then "The order of the work" (it differs from the owner's plan on one point), "Installs and the lockfile", and "Decisions for the owner". The rest is detail for each item's executor.

## The design in one page

| Area        | The choice                                                                                                                                             | What it replaces                                                                                              | Current practice it follows or departs from                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Layout      | One npm workspace. Published packages in `packages/<name>`, private apps in `apps/`, tools in `tools/`, the one test suite and the harness at the root | 1.x's `Source/`, `Specs/`, `packages/{core,engine,gltf,widgets}`; 2.0 nested in `packages/next`               | npm workspaces for installs and links. No pnpm switch, no Turborepo or Nx (below)                                |
| Installs    | A committed `package-lock.json`, `npm ci` everywhere, grouped dependency updates, a nightly install from fresh ranges                                  | 1.x's `package-lock=false` (`.npmrc`) and its `.gitignore` entry: every install resolves ranges anew          | npm's own advice to commit the lockfile, which never publishes; OpenSSF's advice to also test what users resolve |
| Build       | Vite 8 (Rolldown) library builds, one shared config, one per package; `tsc --build` with project references for declarations                           | gulp, esbuild and 1.x's build; 2.0's single `vite.lib.config.ts` and its `tsconfig.lib.widgets.json` paths    | Vite's library mode with multiple entries; declarations from `tsc`, per file, no rollup for alpha.1              |
| Development | Exports carry a private `@cesium/source` condition that points at `src/`; the release strips it                                                        | Exports that point at `src/*.ts` in the published shape                                                       | Custom export conditions (`customConditions`, Vite's `resolve.conditions`); npm has no `publishConfig.exports`   |
| Shaders     | Unchanged: Slang in core, `npm run shaders`, generated WGSL checked in, `shaders:check` in CI with the pinned `slangc`                                 | Nothing                                                                                                       | Generated output checked in, so a build needs no compiler                                                        |
| Tests       | One Vitest suite at `test/`, three tiers of gates; GPU suites on Dyno's devices                                                                        | gulp's Karma and Jasmine runs, 1.x's coverage and release tests                                               | Vitest; GPU work off hosted runners, which have no GPU                                                           |
| Parity      | `cesium-1x`, an npm alias of `cesium@1.147.0`, as a pinned dev dependency                                                                              | `CESIUM_BUILD_DIR`, `../../Build/CesiumUnminified`, the `cesium-oracle` paths into 1.x's tree, `/cesium-ref/` | A published oracle at an exact version, the same way the trust track pins 1.x at 1.147                           |
| Sandcastle  | `apps/sandcastle`, built by its own scripts, against the pinned 1.x until CS-630 adds 2.0's examples                                                   | `gulpfile.apps.js` and 1.x's in-tree builds                                                                   | Nothing to follow: it is a stopgap until its own repository                                                      |
| CI          | GitHub Actions on the 2.0 branch: `ci.yml` and `release.yml`, least privilege, actions pinned by commit                                                | `dev.yml`, `deploy.yml`, `prod.yml`, `sandcastle-dev.yml`, `update-tokens.yml` on this branch                 | GitHub's hardening advice: pinned SHAs with Dependabot, explicit `permissions`, no `pull_request_target`         |
| Releases    | A release record per version, a repository script that versions every package from it, npm trusted publishing with staged publishing                   | `gulp release`, `make-zip`, `deploy-set-version`, a maintainer's token                                        | OIDC trusted publishing and `npm stage publish`; lockstep as Changesets' `fixed` groups do it, without the tool  |

## Layout

The final layout, after CS-611 has taken 1.x out and CS-835 has moved 2.0:

```text
/                                 the workspace root: private, named cesium-workspace, never published
  package.json                    workspaces: packages/*, apps/*, tools/*; the repository's scripts
  package-lock.json               committed, the one lockfile for every workspace ("Installs and the lockfile")
  tsconfig.json                   the references to every package and to the harness
  tsconfig.base.json              compiler options every package shares (today's packages/next/tsconfig.json)
  vite.config.ts                  the dev server and Dyno's routes (today's packages/next/vite.config.ts)
  vitest.config.ts                the one suite (split out of vite.config.ts)
  packages/
    cesium/                       the umbrella, development name @cesium/next until CS-616's names are final
    core/  time/  frames/  crs/  measure/  ui/
    crs-proj/  ion/  itwin/                                   (as their seams land: the package map)
    source-3d-tiles/  loader-gltf/  loader-draco/  loader-basis/
    imagery-url-template/  imagery-bing/  imagery-quantized-mesh/
    data-node/
  apps/
    sandcastle/                   private, until its own repository
  tools/
    dyno/                         @cesium/dyno, private
  test/                           one suite, as today
  parity/  bench/  lab/  handbook/  examples/  demo/  spikes/  standalone/
  scripts/                        build, release, shaders, surface, checks
  api/surface.txt
  work/                           the tracker (today's packages/next/work)
  docs/                           design notes and decisions (today's docs/ and packages/next/docs/)
  .github/  .husky/  .human-in-the-lead/
  AGENTS.md                       one file: today's root contract and packages/next/AGENTS.md together
  LICENSE.md  README.md  CHANGES.md
```

- **Packages hold only what publishes.** `packages/*` is the set the release script versions and packs. Private workspaces sit in `apps/` and `tools/`, so a glob over `packages/` never has to skip one. Today's root lists 1.x's private Sandcastle among published packages; this keeps them apart.
- **Each package** is laid out as the package map says (folder name is the package name without the scope; today's folder names inside `src/`), plus what publishing needs: `package.json` with `files: ["dist", "LICENSE.md", "README.md"]`, a `tsconfig.json` with `composite: true` and its sibling references, a README and the license. Its build output goes to `dist/`, which git ignores.
- **The harness stays at the root, not in a package.** Tests, parity pages, Dyno's suites, the handbook and the examples exercise the whole engine and import packages by name. That matches the package map, which keeps one suite and puts the tools beside the umbrella.
- **Where the rest lives.** Sandcastle in `apps/sandcastle`. Dyno's command line in `tools/dyno`, its suites, pages and results code in `bench/`, its results store outside the repository as today (`~/.cesium-bench`). The handbook in `handbook/`, built into one HTML file as today. Examples in `examples/`, with their own shaders' `generated/` beside them. Shaders' generated output in `packages/core/src/shaders/generated/` and `packages/core/src/render/generated/`, checked in. The tracker in `work/`, with hitld's settings in `.human-in-the-lead/`. Design notes, decisions, plans and history in `docs/`, with `packages/next/docs/`'s three 1.x specs joining `docs/design/`; the overall plan, `CESIUM2_WEBGPU_PLAN.md`, stays at the root as their index.
- **The workspace root is private and has a name of its own.** The root's `package.json` is named `cesium` today (1.x). Once 1.x leaves, the root is renamed `cesium-workspace`, marked private, so the umbrella in `packages/cesium` can take `cesium` when CS-616 is final. The package map's "one constraint on publishing `cesium`" goes away with it.
- **Node.** `engines` stays `>=24`, as today. CI tests on Node 24 and the current release.

**What it departs from.** Most TypeScript monorepos written up in 2026 add a task runner, Turborepo or Nx, on top of the workspaces, for caching and affected-only runs (sources: Nx's comparison, the DEV write-ups). This design doesn't, for alpha.1. The per-package JavaScript builds are independent of each other (siblings are external, below), `tsc --build` orders the declarations, and the slow parts of this repository's checks (the GPU suites, `test:data`) aren't cacheable task outputs anyway. A runner is a later call if CI time says so. pnpm's stricter installs would catch undeclared dependencies; the import-boundary test catches them instead (below), and npm stays, because hitld's worktree setup, Dyno's release store (`npm pack`) and every script assume it.

## Installs and the lockfile

**Today, no install is reproducible.** The root `.npmrc` says `package-lock=false` and `.gitignore` lists `package-lock.json`, 1.x's long-standing choice. Every `npm install`, in every worktree and every CI job, resolves the ranges in the `package.json` files anew. On 2026-11-21 a fresh worktree resolved `@playwright/test` (`^1.62.1`) to 1.65.1 while the main checkout has 1.64.1, so two checkouts of one commit ran different tools. Most of 2.0's own runtime dependencies are exact pins, but its dev dependencies (`vitest ^5.0.5`, `typescript ^6.0.2`, `ktx-parse ^2.0.0`, `meshoptimizer ^1.2.0`) and every transitive dependency float.

**The design: the 2.0 branch commits one lockfile** and installs from it everywhere.

- **One `package-lock.json` at the root,** for every workspace, committed. CS-611 removes `package-lock=false` from `.npmrc` and `package-lock.json` from `.gitignore`, on the 2.0 branch only; `main` keeps 1.x's practice. The first lockfile is written once, in CS-611, seeded from the versions the main checkout has installed (npm records them in its `node_modules/.package-lock.json` even with `package-lock=false`), then reconciled with `npm install --package-lock-only`, and its diff against those versions is checked to move nothing.
- **`npm ci` everywhere it installs:** hitld's worktree setup (`npm ci --ignore-scripts --no-audit --no-fund --prefer-offline`), every CI job, the release workflow and Dyno's snapshot worktrees. `npm ci` fails when `package.json` and the lockfile disagree, so a forgotten lockfile change fails the fast tier instead of resolving silently. `npm install` stays for the person changing a dependency.
- **Dependency updates come as reviewed changes.** Dependabot's `npm` updates, grouped (development tools weekly in one change, runtime dependencies one at a time), each through the merge queue like any change. It ignores `cesium-1x` (the oracle moves only on purpose) and anything exact-pinned for a reason, such as `naga-wasm` and the Slang toolchain. This is a new service on the repository, so it is part of question 8.
- **Users still get ranges.** npm never publishes `package-lock.json`, and the packages don't ship `npm-shrinkwrap.json`, which npm advises libraries against, because it would take the choice of transitive versions away from applications. So the lockfile pins this repository's development, CI and release, not what an application installs.
- **What users resolve is tested too.** A nightly CI job installs with the lockfile set aside (`npm install --no-package-lock` in a clean checkout) and runs the fast and full tiers, so a new release of a dependency that breaks the packages shows up before a user finds it. OpenSSF's guidance for library authors argues for this half; the committed lockfile is the other half.
- **The toolchain is pinned beside it.** `engines` keeps `node >=24`, and the CI jobs and worktree setup use one npm major, the one the lockfile was written with. Whether `package.json`'s `devEngines` field can enforce that for people too is CS-612's to check in npm's documentation; this note didn't verify it.

What it replaces: 1.x's resolve-on-every-install, and today's worktree setup, `npm install --ignore-scripts --prefer-offline`, which picks whatever the cache and the registry hold that day.

## Build

### What exists today

2.0 already has no gulp. Its dev server, its library build (`vite.lib.config.ts`: six entries into `dist-lib/`, shaders inlined, the worker and the Draco and Basis WebAssembly as assets) and its declarations (`tsc -p tsconfig.lib.json`, then `tsconfig.lib.widgets.json` against those declarations through `paths`) are Vite and `tsc`. gulp runs only for 1.x: `prepare`, `build`, `buildTs`, `release`, `makeZip`, the Karma tests and the website deploys. The root's `prepare` script still runs `gulp prepare`, and hitld's worktree setup still runs `npx gulp prepare` and three gulp builds of 1.x's packages. That is why a new 2.0 worktree can fail to install on a 1.x tool.

### The new build

One command builds every package: `npm run build`, which runs `scripts/build.mjs`.

1. **Declarations:** `tsc --build` over the root `tsconfig.json`, whose references name every package. Each package emits per-file `.d.ts` into its `dist/types/`, with `rewriteRelativeImportExtensions` as today. Project references resolve siblings through the workspace links, so the widgets' `paths` workaround in `tsconfig.lib.widgets.json` goes away. `stripInternal` stays on for every entry but core's `./internal`, whose names siblings' declarations import (CS-883); that subpath is outside the stable API by its name and by the surface check, not by stripping.
2. **JavaScript:** one Vite library build per package, from one shared function (`scripts/build/library.mjs`, given the package's folder). It reads the entries from the package's `exports`, builds ESM only, target `es2023` as today, and:
   - **treats every dependency and peer dependency as external,** siblings included. Each package's code exists once in an application, so `instanceof Emitter` holds across packages, and the per-package builds don't depend on each other's output;
   - **keeps modules as files** (`preserveModules`), so an application's bundler tree-shakes by file and the package's `sideEffects` decide what it pays for, as the bundle check expects;
   - **inlines shaders** (the 43 `?raw` imports of generated WGSL today) and emits workers and WebAssembly as assets found through `import.meta.url`, as today's library build does. Plain `tsc` can't build this, which is why the JavaScript goes through Vite;
   - **runs the same guards as today:** the sky-pack guard and the Basis glue (`basisTranscoderEsm.ts`) move to `scripts/build/` and apply in every package's build.
3. **The browser build (CS-363):** the umbrella also builds today's `dist-lib` shape into `packages/cesium/dist/browser/`, every package bundled in, for pages with no build step. npm's CDNs serve it from the published `cesium` package. It replaces 1.x's `Build/Cesium` and the release zip.
4. **Checks on the packed result:** `npm pack` per package, then `scripts/checkDeclarations.mjs` (today's, run over every package), and `publint` and `@arethetypeswrong/cli` on each tarball if the owner agrees to them (question 6). Without them, `checkDeclarations.mjs` grows the export checks itself.

**The export condition (a call, reversible).** Today's exports point at `./src/index.ts`, which is right for development and wrong for a published package. Each package's `exports` gets a private condition first, then the published files:

```json
"exports": {
  ".": {
    "@cesium/source": "./src/index.ts",
    "types": "./dist/types/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

`tsconfig.base.json` sets `customConditions: ["@cesium/source"]`, and the Vite and Vitest configs add it to `resolve.conditions`, so development, the tests and Dyno run from source with no build, as they do today. The release script removes the condition from the published `package.json`, so no consumer can resolve a file that isn't in the tarball. A scoped name, not `source`, because other tools already use `source`. npm can't do this with `publishConfig`, which doesn't override `exports`; pnpm can, but this repository stays on npm.

**Type rollups are deferred.** One `.d.ts` per entry would be tidier, and it's what API Extractor's rollup or `rolldown-plugin-dts` give. But API Extractor's own value here, release-tag trimming and `ae-incompatible-release-tags`, is what CS-681 already rebuilds in `scripts/surfaceMap.mjs`, and `rolldown-plugin-dts` is pre-1.0 and fast only with `isolatedDeclarations`, which today's code doesn't satisfy. Per-file declarations resolve correctly through `exports`, and the packed-tarball checks prove it. Revisit after the API review (CS-102), when the surface is stable. Turning on `isolatedDeclarations` is a separate, later item: it needs explicit types on every export, which is engine code.

### Shaders

Nothing changes in how shaders build. Slang sources stay in `packages/core/src/**/*.slang` (and examples' own); `npm run shaders` (`scripts/slangBuild.mjs`) writes `packages/core/src/shaders/generated/` and `packages/core/src/render/generated/layouts.ts`; the generated files stay checked in, so `npm run build`, the tests and CI's ordinary jobs need no compiler. `SLANGC` still names the compiler, and `npm run setup` still fetches the pinned one. What changes:

- `slangBuild.mjs` moves to the root `scripts/` and takes a list of package source roots instead of one `src/`. Core is the only one at alpha.1. A later adapter with shaders of its own (a Gaussian-splat render feature, say) adds its root, and core's shader modules stay on the include path for it.
- CI's `shaders` job fetches the pinned `slangc` release, checks it against its recorded hash, caches it, and runs `npm run shaders:check`. Today nothing runs that check outside the merge queue's full suite.

### The bundle check, the surface and the handbook

- **The bundle check** (`scripts/checkBundle.mjs`) stays a Vite build of small application pages, run in the full tier. It builds them against the packages' `dist/` output, not their source, so it checks what users get; it gains the time-only and frames-only pages (below, under "Tests and gates").
- **The surface** (`npm run surface`, `scripts/surfaceMap.mjs`) reads every package's `exports` instead of one package's, writes `api/surface.txt` per package and per umbrella entry, and gains `--check` for CI. It stays the source the handbook's API tab and the API review read.
- **The handbook** builds as today: `npm run handbook` runs `scripts/handbookData.mjs`, then `tsc -p handbook` and its own Vite config, into one HTML file. Its data script reads the new paths (the surface, the import-boundary rules from the packages' `package.json` files, the bundle check, Dyno's results). It isn't a package and never publishes; CI builds it in the `build` job so a broken figure fails there.

### What the build replaces

- 1.x's gulp tasks, its esbuild configuration, `Build/`, `index.cjs`, the zip, `build-ts` and `tsd-jsdoc`: removed with 1.x in CS-611. The root's `prepare` becomes `husky` alone. CS-612 removes what 2.0 itself has that the per-package build supersedes: `vite.lib.config.ts` (it becomes the umbrella's browser build), `tsconfig.lib.json` and `tsconfig.lib.widgets.json`.
- hitld's worktree setup (`.human-in-the-lead/policy.json`, an owner path) becomes `npm ci --ignore-scripts --no-audit --no-fund` and nothing else: no gulp, no 1.x builds. Its merge gates' `cd packages/next && …` become root commands in CS-835.
- A fresh clone builds and tests with `npm ci && npm run build && npm test` (CS-612's done-when). The data stores stay `npm run setup`.

## Tests and gates

One suite at `test/`, run by Vitest from the root, importing packages by name through the source condition. Tests that reach a package's internals keep a relative path into `packages/<name>/src/`, since the suite isn't a package and the boundary rule is about packages.

| Tier            | What                                                                                                                                                                             | Where it runs                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Fast            | `tsc --build` and the harness's `tsc --noEmit`, eslint, prettier, markdownlint, `npx hitld work check`, `scripts/staleNames.mjs`                                                 | The merge queue's fast checks; CI's `checks` job                                                  |
| Full            | `npm test` (Node, `test/fakeGpu.ts`, the import boundary, seams); `npm run surface -- --check`; `shaders:check`; the bundle check; `npm run build` and the packed-tarball checks | The merge queue's full suite (`npm test`); CI's `test`, `build` and `shaders` jobs                |
| Data            | `npm run test:data` against the setup store                                                                                                                                      | Locally when frames, time, ephemeris or CRS code changes (today's rule); CI nightly, store cached |
| GPU             | Parity suites (`dyno lab <suite>`), Dyno's benchmarks and image regression                                                                                                       | Dyno's devices, as today; results in Dyno's store, cited by run ID                                |
| Software WebGPU | A few pages' smoke runs in headless Chrome on software Vulkan: correctness only, never a timing                                                                                  | CI, after alpha.1 (question 7)                                                                    |

- **The import-boundary test** reads the package rule from each `package.json`, as the package map says, and gains one check that pnpm would otherwise give: every bare import in a package's `src/` names a package in its `dependencies` or `peerDependencies`, so an undeclared dependency fails here, not in a user's install.
- **The bundle check** gains the time-only and frames-only pages the package map asks for, built from the packages' published shape (`dist/`), not from source, so a wrong `sideEffects` shows.
- **The surface check** reads every package's exports (CS-617's follow-up in the package map). `--check` fails when `api/surface.txt` is stale, so CI enforces what today is a rule people follow.
- **What leaves with 1.x:** Karma, Jasmine, `Specs/`, the coverage job, the release tests, the WebGL stub and the end-to-end Playwright config.

## Parity and Dyno without 1.x's source

The owner's call: a pinned, published 1.x replaces every path into 1.x's tree.

### The dependency

```json
"devDependencies": {
  "cesium-1x": "npm:cesium@1.147.0"
}
```

- **An npm alias, at an exact version, in the workspace root.** The alias is needed because the umbrella will be named `cesium` in the same workspace. Its dependencies install beside it: `@cesium/engine` 26.x and `@cesium/widgets` 16.x hoist (2.0 publishes neither name), and `@cesium/core` 0.1.x nests under them, because the workspace's own `@cesium/core` is 2.x and doesn't satisfy `^0.1.1`. CS-611 checks that layout in the lockfile.
- **Dependabot and similar tools ignore it.** Moving the oracle is a deliberate change: a new version, then parity and Dyno's baselines rerun against the previous commit, with any difference explained. The trust track names 1.x pinned at 1.147 as an independent oracle; this is that pin.
- **What the published packages carry (read 2026-11-21):** `cesium@1.147.0` has `Build/Cesium`, `Build/CesiumUnminified` and `Source/Cesium.d.ts`. `@cesium/engine@26.5.0` has its `Source/` modules, `Source/ThirdParty/basis_transcoder.*`, the sky box textures, `Source/Core/Ion.js` and `index.d.ts`, but not `Build/Unminified/index.js`. `@cesium/core@0.1.1` has its `Source/` modules (188 files). Neither carries `Specs/Data`.

### What each path into 1.x becomes

| Today                                                                                           | After CS-611                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CESIUM_BUILD_DIR`, else `../../Build/CesiumUnminified`, served at `/cesium1x/`                 | `cesium-1x/Build/CesiumUnminified`, resolved from `node_modules`, served at `/cesium1x/`. The variable goes                                                     |
| `cesium-oracle` → `../core/Source` (the math tests, `styleParity`, `bodyVolumes`, the IR spike) | The same alias → 1.x's `@cesium/core/Source`, resolved from `cesium-1x`'s own dependencies (`createRequire`), so the nested 0.1.x is found, not the workspace's |
| `cesium-engine-oracle` → `../engine/Source`                                                     | The same alias → `@cesium/engine/Source` from the dependency                                                                                                    |
| `src/io/decoders.ts` imports Basis from `../../../engine/Source/ThirdParty`                     | CS-811: `loader-basis` carries its own pinned transcoder. Engine code never imports a dev dependency                                                            |
| `handbook/viewer/main.ts`'s sky box from 1.x's `Source/Assets`                                  | The same files from `@cesium/engine` in the dependency                                                                                                          |
| `bench/suite/ionToken.ts` reads 1.x's `Core/Ion.js?raw`                                         | The same file from the dependency (dev only, as today)                                                                                                          |
| `../../Specs/Data` (two tests; the parity pages' tilesets and glTF models)                      | The files those use `git mv` into `test/fixtures/1x/` in CS-611, before `Specs/` goes; `/specs-data/` serves that folder                                        |
| `../../LICENSE.md` in the library build                                                         | Unchanged: the root license stays. Each package's `LICENSE.md` lists its own third-party notices, which 1.x's `ThirdParty.json` covered                         |

### Dyno

- **`cesium1x.ts`'s `"repo"` build goes.** A 1.x configuration always names a released version, as `release.mjs` already supports, and the default is the dependency's version. Pages that need one 1.x (the parity harness) load the dependency, at `/cesium1x/`. Dyno's sweeps across versions keep the release store (`BENCH_CESIUM_DIR`, `~/.cesium-bench/cesium`), which `npm pack` fills and checks against npm's integrity hash. A parity test that only needs 1.x's math imports it as modules through the aliases, with no page global.
- **1.x at a git ref (`/cesium-ref/<sha>/`) goes.** Building 1.x at a commit needs 1.x's tree and toolchain, which the branch no longer has. An unreleased 1.x commit isn't a baseline; a released version is.
- **2.0 at a git ref stays.** `snapshot.mjs` checks out a 2.0 commit into `.bench/<sha>`; it finds the 2.0 root by the layout at that commit: `packages/next/` before CS-835's merge, the repository root after.
- **What Dyno's results store records, so old and new baselines compare.** Every result already records each engine's identity and source (`EngineConfig` in `bench/suite/schema.ts`). Today a 1.x engine is `1.x` (the working tree's build, source `tree`), `1.x@<ref>` (source `ref`, with its commit) or a release such as `1.146.0` (source `release`, with npm's integrity hash). After CS-611 only releases remain, and the default is `1.147.0` with the lockfile's integrity hash; Dyno's grammar refuses `1.x` and `1.x@<ref>` with a message naming the release to use. CS-611's check below runs `1.x` and `1.147.0` at the same commit and records that they agree, as a study in the store, so Dyno's trend views can join a series across the switch on that evidence instead of silently treating the two as one engine. A 2.0 result keeps recording its commit; results from before CS-835 and after it compare as the same engine, since the move changes no code.
- **How the pin is updated and cached.** Updating 1.x is a change of its own: the new exact version in `package.json`, the lockfile, a parity run and the baselines rerun against the previous commit, and a line in the change's report naming the Dyno runs. The npm cache holds the tarball for CI (`actions/setup-node`'s cache keyed on the lockfile) and for each worktree; Dyno's release store keeps the other versions sweeps use.
- **The switch is checked once.** Before 1.x's source leaves (CS-611's first done-when), parity and the baselines run on the dependency and on the in-tree build at the same version, and their results match. The Dyno run IDs go in CS-611's report.

## Sandcastle

1.x's Sandcastle stays in the repository and working (the owner, 2026-11-21), until CS-628's work moves it to a repository of its own.

- **It moves once, to `apps/sandcastle`,** in CS-835's harness commit (a call, reversible). It's private and never publishes, so it belongs with the apps, not with the packages the release script versions.
- **It builds against the pinned 1.x, not 1.x's tree.** Its dev config and `scripts/buildStatic.js` copy from `../../Build/CesiumUnminified`, `../../Source/Cesium.*`, `../engine` and `../widgets` today. In CS-611 they read the same files from `cesium-1x` and `@cesium/engine` and `@cesium/widgets` in the dependency, and the version it shows comes from `cesium-1x`'s `package.json`, not the root's. One gap: the published `@cesium/engine` and `@cesium/widgets` don't carry `Build/Unminified/index.js`, which Sandcastle's import map serves as `packages/`. Sandcastle builds those two bundles itself from the published `Source/` modules, with the Vite it already uses. `Apps/SampleData` (47 MB, which no 2.0 code reads) moves with it, to `apps/sandcastle/public/SampleData`.
- **`gulpfile.apps.js` goes.** Sandcastle's own `build` script calls `buildStatic()` directly, so it no longer needs the root's gulp.
- **CI builds it on every change and deploys nothing** from the 2.0 branch. `dev-sandcastle.cesium.com` keeps deploying from `main`, where `sandcastle-dev.yml` lives. Hosting 2.0's examples (CS-630) imports `cesium@2` from the umbrella's browser build; replacing 1.x's Sandcastle (CS-634) is that project's.

## CI

GitHub runs a branch's own workflows for `push`, `pull_request` and `merge_group`, so the 2.0 branch's `.github/workflows/` can differ entirely from `main`'s. `pull_request_target`, `schedule` and `workflow_dispatch` without a ref run from the default branch, so `cla.yml` and the CLA reminder keep working from `main` and need no copy here.

**`ci.yml`,** on `pull_request`, `merge_group` and pushes to the 2.0 branch, plus a nightly schedule for the data tier:

| Job       | Steps                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `checks`  | `npm ci --ignore-scripts`; the fast tier                                                                                  |
| `test`    | `npm test`, on Node 24 and the current release                                                                            |
| `build`   | `npm run build`; pack; the packed-tarball checks; the bundle check; `npm run surface -- --check`; Sandcastle's build      |
| `shaders` | The pinned `slangc`, checked against its hash and cached; `npm run shaders:check`                                         |
| `data`    | Nightly, and on changes under `packages/{time,frames,crs}`: `npm run setup` into a cached store, then `npm run test:data` |

**When each part runs:**

| When                                           | What runs                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each pull request and each `merge_group` entry | `checks`, `test`, `build`, `shaders`; `data` only when the change touches `packages/{time,frames,crs}`                                                                                                                                                            |
| Each merge into the 2.0 branch                 | Locally, before it: hitld's merge queue (fast checks, then the full suite). On GitHub, after the push: the same jobs as a pull request, as the record a release reads. Afterwards, Dyno's targeted A/B runs of what the merge touched (CS-856), on Dyno's devices |
| Nightly                                        | `data`; the fresh-ranges install ("Installs and the lockfile"); Dependabot's checks. Dyno's quiet full run overnight (CS-856) stays on Dyno's devices                                                                                                             |
| A merged release record                        | `release.yml` ("Releases")                                                                                                                                                                                                                                        |

**What can't run on hosted runners, and why.** The parity suites, Dyno's benchmarks and image regression need a real GPU and a WebGPU browser on it: parity judges pixels against 1.x on the same adapter, and a timing on a shared virtual machine with software rendering measures nothing (Chrome's own headless guide says headless Chrome disables the GPU by default, and software Vulkan stands in for correctness, not speed). Ordinary GitHub-hosted runners have no GPU. The data tier can run there, but needs the setup store's downloads, so it runs nightly with the store cached instead of on every change. Everything else (Node tests on `fakeGpu`, type checks, builds, the bundle check, `shaders:check`) runs on hosted runners.

**Hardening, from the start.** `permissions: contents: read` at the top of every workflow, widened per job only where needed. Every action pinned to a full commit SHA, with its version in a comment, and Dependabot's `github-actions` updates keeping the pins current. No secrets in any job a pull request can start, and no `pull_request_target`. `npm ci --ignore-scripts`, so no dependency's install script runs in CI. These follow GitHub's guidance and the 2026 write-ups below; today's 1.x workflows pin by tag and set no `permissions`.

**What CI doesn't replace.** The merge queue on the owner's machine (hitld's fast checks and full suite) stays the gate for merges into the 2.0 branch, and Dyno's GPU runs stay the evidence for rendering changes. CI is the second gate, on the public side: for pull requests from outside, and as the record a release reads.

**Secrets: where each lives and who can use it.** Named here, never shown.

| Secret                                                                                          | Where it lives                                                                          | Who can use it                                                                                                        |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| An npm publish token                                                                            | Nowhere: `release.yml` gets a short-lived OIDC credential from npm's trusted publishing | Only `release.yml`, only in the `npm` environment, only after the owner approves the run                              |
| `GITHUB_TOKEN`                                                                                  | Issued per job by GitHub                                                                | Each job, read-only by default; `release.yml`'s last step alone gets `contents: write`, to tag and create the release |
| An ion token                                                                                    | Not in CI. Developers' `.env.local` and Dyno's token setting, as today                  | People and Dyno on their own machines. No CI job reaches ion, since `npm test` runs on fakes                          |
| `ION_TOKEN_CONTROLLER_TOKEN`, the iTwin service app's ID and secret, the AWS and Amplitude keys | `main`'s repository secrets, used by 1.x's workflows                                    | 1.x's workflows on `main`. No 2.0 workflow names them                                                                 |

If a later CI job needs ion (a parity page against an ion asset, say), it gets its own token, scoped to that asset and read-only, as a secret of a GitHub environment that only pushes to the 2.0 branch can use, never a pull request. That would be a new secret, so the owner's call when it comes.

**What replaces each of today's workflows** on the 2.0 branch:

| Today                                  | What it does                                                                    | On the 2.0 branch                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `dev.yml`                              | 1.x's lint, type build, coverage, release tests and Node smoke test             | `ci.yml`                                                                                                                   |
| `deploy.yml`                           | Every branch's 1.x build, zip and packs to `ci-builds.cesium.com`               | Nothing at alpha.1; `ci.yml`'s `build` job packs and checks the tarballs without deploying. A preview deploy is later work |
| `prod.yml`                             | cesium.com's archive, docs, Viewer and Sandcastle, from the `cesium.com` branch | Nothing at alpha.1; 2.0's docs and site deploys are a follow-up                                                            |
| `sandcastle-dev.yml`                   | Sandcastle from `main` to `dev-sandcastle.cesium.com`                           | Nothing; it keeps deploying 1.x's from `main`. `ci.yml` builds Sandcastle without deploying                                |
| `update-tokens.yml`                    | 1.x's scheduled ion and iTwin token refresh                                     | Nothing: it runs from `main`, the default branch, wherever its file lives                                                  |
| `cla.yml`, `cla-rotation-reminder.yml` | The CLA check and its yearly reminder                                           | Unchanged and still from `main`: `pull_request_target` and `schedule` run the default branch's file                        |
| None                                   |                                                                                 | `release.yml`, new                                                                                                         |

All of 1.x's files leave the 2.0 branch with 1.x in CS-611; `main` keeps every one of them.

## Releases

### The release record

A release is a reviewed file, `releases/<version>.md`, committed to the 2.0 branch through the merge queue like any change. Its front matter holds the version (`2.0.0-alpha.1`) and the dist-tag (`next` before 2.0.0, `latest` from 2.0.0); its body is the release notes. `npm run release:prepare <version>` drafts it from the work items closed since the previous record (`npx hitld work query`), and the draft passes `hitld publish check` before anyone edits it. The owner edits and approves it in the merge.

### Changelogs

- **One changelog for the release, not one per package.** Every package releases at every version, so per-package changelogs would mostly say "no changes". The root `CHANGES.md` holds one section per release, built from the release records in order; each package's README links to it.
- **Its source is the tracker.** `release:prepare` lists the work items closed since the previous record (their titles, kinds and projects), grouped by package from each item's `touches`. An item with no `touches`, or one whose title doesn't describe its change for a user, the person editing the record writes by hand. Breaking changes and experimental-line changes get their own headings. 1.x's `CHANGES.md` stays on `main`; on the 2.0 branch the file starts fresh at alpha.1.
- **Nothing private reaches it.** The draft passes `hitld publish check`, as all text written for outside readers does, before the record merges.

### The versions

- **Lockstep.** The release script writes the record's version into every stable package's `package.json`, and each sibling dependency as that exact version. Every package publishes at every release, changed or not, so the set an application installs always matches. That is what Changesets' `fixed` groups do; here it's one assignment, because there's one number.
- **The paired 0.x line** (CS-681). Each experimental package's version is derived from the stable one: `0.(100 × major + minor).patch`, with the same prerelease suffix. So `2.0.0-alpha.1` pairs with `0.200.0-alpha.1`, and `2.1.3` with `0.201.3`. OpenTelemetry pairs its majors the same way (stable 2.x with experimental 0.200 and up, and 3.0.0 with 0.300.0). Deriving every release keeps one release record for both lines. An experimental package depends on its stable siblings at the exact stable version; no stable package depends on an experimental one, which the import-boundary test enforces. The rule is a public commitment, so it's question 5.
- **Dist-tags.** Prereleases go to `next`, 2.0.0 and later to `latest`. 1.x's `@cesium/core` and `cesium` keep their 0.x and 1.x lines under `1x` (CS-880). npm moves `latest` to whatever is published without a tag, so from 2.0.0 on, 1.x's own releases of those two names must publish with `--tag 1x`, or they take `latest` back from 2.0 (question 4).

### The pipeline

`release.yml` runs when a release record merges into the 2.0 branch (a push that adds a file under `releases/`), and in a GitHub environment, `npm`, whose required reviewer is the owner.

1. Check out the merge commit, `npm ci --ignore-scripts`, and run the full tier again: CI's record for that commit must already be green.
2. `node scripts/release.mjs apply releases/<version>.md`: set every version, strip the `@cesium/source` condition, build, pack every package, and check the tarballs.
3. Stage every tarball with `npm stage publish --tag <tag>`, through npm's trusted publishing: the workflow's OIDC identity, no npm token anywhere, provenance attached by default.
4. A maintainer reviews the staged set on npm and approves each with 2FA, the umbrella last. Nothing is live until the approvals, so a failure in step 3 leaves no half-published release.
5. The workflow tags `v<version>` and creates the GitHub release with the record's notes and the browser build as an archive.

**Why this, and what it replaces.** 1.x releases by hand: `gulp release`, `make-zip`, `deploy-set-version`, a maintainer's machine and token. Current practice publishes from CI with short-lived OIDC credentials (npm's trusted publishing, generally available since July 2025), and npm's staged publishing (2026) adds a human approval with 2FA in front of what CI uploads. That approval matters: Socket reports that in May 2026 a project's trusted publisher itself published malicious versions, with no token stolen. Staging plus the owner's environment approval puts the owner in front of every release, which is also how this repository's merges already work.

**The tools it doesn't use.** Changesets keeps a changeset file per change and a version pull request; it handles lockstep with `fixed` groups and prereleases with `pre enter`, but not a derived 0.x line, and hitld's closed items already record what changed. release-please reads Conventional Commits, which this repository's commits aren't, and reports of its `linked-versions` plugin failing to find release candidates make it a poor fit for lockstep (sources below). Either can replace the script later; the release record is the only format it commits to, and that format is internal. The tool choice is question 2.

**Bootstrapping the names.** npm configures a trusted publisher on a package's settings, and the sources disagree on whether staging can create a package that doesn't exist yet. Names that have never been published (most of the package map's list) may need a first publish by a maintainer before the workflow can publish them. `cesium` and `@cesium/core` exist, and 1.x publishes them too; npm supports several trusted-publisher configurations per package since September 2026, so 2.0's workflow can be added beside whatever 1.x uses. Which names, and when, is CS-616's; how they're configured is question 3.

## What stays the same

- **The commit guard.** `.husky/`'s hooks (lint-staged with `--no-stash`, hitld's classification and commit-message checks, the private-term rule) keep working as today. Only the `PATH` lines change, in CS-835's harness commit, because `packages/next/node_modules/.bin` goes.
- **The work tracker.** hitld's files format, IDs, claims, closes, views and merge queue are unchanged. The tracker's folder moves once, from `packages/next/work/` to `work/`, with `tracker.json`'s `work_dir`; nothing in its items changes.
- **The handbook:** its content, its single-file build and its sources rule. Only the paths its data script reads change.
- **Dyno:** its command line, its results store outside the repository, `dyno status`, its owner's ports (5190, 5199) and its release store. Only the 1.x sources narrow to releases.
- **Shaders, the GPU-safety rules, the seams tests and the wording rules.**

## The order of the work

"Move once, into the final layout" can't hold if CS-835 runs before 1.x leaves: the final `packages/core` is 2.0's core, and 1.x's `packages/core` sits at that path until CS-611 deletes it. The owner's plan of 2026-11-21 has CS-611 need CS-835, so this design conflicts with it on that one point, and asks (question 1). The order it asks for is:

1. **CS-611: 1.x leaves.** Parity and the baselines switch to `cesium-1x` and are shown unchanged; the `Specs/Data` subset moves to `test/fixtures/1x/`; Sandcastle switches to the dependency; then 1.x's source, build and workflows are deleted, and the root becomes the private workspace root. 2.0's files don't move: `packages/next` stays where it is. CS-811's decoder fix lands first or with it.
2. **CS-835: the move.** Into the final layout, once, below.
3. **CS-612: the new build,** on the final layout, so its configs are written once.
4. **CS-613: CI and the release pipeline.**
5. **CS-617: the package split, published** with CS-616's names, through the pipeline. CS-882 (PROJ behind its seam) follows CS-835 whenever its other need, CS-808, is done.

If the owner keeps the order, CS-835 can still move 2.0 once: its first commit moves 1.x's `packages/core` (the one path that collides; 2.0 has no `engine`, `gltf` or `widgets` package) aside, to `legacy/core`, with the root's workspaces and 1.x's build paths following, and CS-611 deletes `legacy/` with the rest of 1.x. That costs a change to 1.x's build in a branch about to drop it, and CS-835 then runs while 1.x's gulp build still has to pass.

## CS-835: the move, commit by commit

**What changes from the package map's plan.** The map's "CS-835: the move" put each package at `packages/next/packages/<name>`, kept the umbrella and the harness in `packages/next`, and added `packages/next/packages/*` to the root's workspaces. Here:

- each package lands at `packages/<name>` at the root, and the umbrella at `packages/cesium`, so `packages/next` is gone at the end;
- a new commit (2 below) moves the harness, the tools, `work/` and the docs to the root, and Sandcastle to `apps/`; the map had them stay put;
- the root's workspaces become `packages/*`, `apps/*` and `tools/*`;
- each package's `exports` carries the `@cesium/source` condition from its first commit, so it never has to change shape again in CS-612;
- the owner paths (`.human-in-the-lead/`, `.husky/`, `AGENTS.md`, `.claude/`) change in the move, which the map didn't need.

The map's order inside `src/` (core, time, frames, crs, measure, ui, then the umbrella and the boundary test) and its list of what can't be a pure move (PROJ, ion and iTwin, 3D Tiles, the providers, glTF, Draco and Basis, the Node file provider, the Viewer's defaults) are unchanged.

Pure moves: files change folders, and import specifiers change to follow them. Nothing else changes. A type check per commit (`npx tsc --noEmit` over the harness and `tsc --build` over the packages); once at the end, the full `npm test`, `npm run test:data`, the parity suites against the previous commit and a base, `shaders:check`, the bundle check and `npm run surface`, bisecting the commits on a failure. The specifiers are rewritten by a script the executor runs (it recomputes every relative specifier of a moved file and of every file that imports one), not by hand. It runs with new starts paused (CS-835's done-when).

It starts after CS-611, so the root is already the private workspace root, its workspaces are `packages/next`, `packages/next/tools/dyno` and `packages/sandcastle`, and 1.x is gone.

1. **Scaffolding.** The root's workspaces become `packages/*`, `apps/*` and `tools/*` (`packages/next` is still one of `packages/*`). `tsconfig.base.json` at the root, from today's `packages/next/tsconfig.json`. The six capability packages get a `package.json` (with the `@cesium/source` condition), a `tsconfig.json` and an empty `src/index.ts`. One `npm install` writes the lockfile's links. No outside dependency is added.
2. **The harness and the tools to the root.** `git mv` of `packages/next/{test,parity,bench,lab,handbook,examples,demo,spikes,standalone,scripts,api,work}` to the root, `packages/next/docs/*` into `docs/`, `packages/next/tools/dyno` to `tools/dyno`, and `packages/sandcastle` to `apps/sandcastle`. `vite.config.ts` and `basisTranscoderEsm.ts` move to the root; the root `tsconfig.json` takes the harness's includes; the root `package.json` takes the scripts (`dev`, `dyno*`, `test*`, `shaders*`, `surface`, `check:bundle`, `handbook*`, `setup`, `sky`, `slang`, `bench`). `packages/next` keeps only `src/`, `widgets/`, `package.json` and the library configs. The owner paths change in this commit and are reviewed in the merge: `.human-in-the-lead/tracker.json` (`work_dir: work`), `policy.json`'s gates and owner paths, `.husky/` (no more `packages/next/node_modules/.bin`), `AGENTS.md` and the `.claude/` settings.
3. **`@cesium/core`.** Every folder the package map gives core moves from `packages/next/src/` to `packages/core/src/`, keeping its name; `src/index.ts` moves as core's entry; `src/internal.ts` re-exports what the siblings import (CS-883). The scripts that name `src/` paths (`slangBuild.mjs`, `checkBundle.mjs`, `surfaceMap.mjs`, `handbookData.mjs`) follow. The rest of `packages/next/src/` imports `@cesium/core`.
4. **`@cesium/time`.** The files `TIME_FILES` lists move to `packages/time/src/`.
5. **`@cesium/frames`.** `frames`, `ephemeris`, `trajectory` and the rest of `time` move.
6. **`@cesium/crs`.** `engineering` and `proj` move, PROJ included, until CS-882 splits it out.
7. **`@cesium/measure`.**
8. **`@cesium/ui`.** `packages/next/widgets/` moves to `packages/ui/src/`, and its `@cesium/next/*` imports become `@cesium/core`, `@cesium/time` and `@cesium/frames`.
9. **The umbrella.** `packages/next` becomes `packages/cesium`: its `src/` keeps only the six entry files, each re-exporting its package; its exports become `.`, `./time`, `./frames`, `./crs`, `./measure` and `./ui`; its name stays `@cesium/next`. `vite.lib.config.ts` and the `tsconfig.lib*.json` files move with it and point at the packages, so `npm run build:lib` still works until CS-612 replaces it.
10. **The import-boundary test** reads the rule from the packages' `package.json` files and plants a bad edge of each kind, as the package map says.
11. **The handbook and the docs** follow the new paths: the architecture tab, the API tab's entry names, and every design note's `packages/next/src/` paths, by a search and replace that changes no prose.

`api/surface.txt` changes only where the map renames an entry point: `proj` to `crs`, `widgets` to `ui`.

**For in-flight branches.** A branch cut before the move that touches moved files merges through git's rename detection only for small changes. CS-835's done-when already requires the batch in flight to merge first and new starts to pause, so no such branch should exist; any that does is rebased by its executor onto the merge, with the same specifier script.

## Calls made here

Each was checked with `hitld rights who` (decider: system) and `hitld precedent match` (no candidates), 2026-11-21.

- Sandcastle moves once, to `apps/sandcastle`, in CS-835's harness commit (reversible).
- A private `@cesium/source` export condition points at `src/` for development and tests, and the release strips it from what publishes (reversible).
- The workspace root is named `cesium-workspace`, private, once 1.x leaves (reversible).
- The `Specs/Data` files 2.0 uses `git mv` into `test/fixtures/1x/` in CS-611, keeping their history (reversible).
- The npm alias for the pinned 1.x is `cesium-1x` (reversible).
- Declarations stay per file for alpha.1, with no rollup (reversible).
- No task runner (Turborepo, Nx) and no switch to pnpm for alpha.1 (reversible).
- CI tests on Node 24 and the current Node release (reversible).
- The harness, the tools, `work/` and the docs move to the repository root in CS-835, not into a package (reversible).
- One `CHANGES.md` for each release, drafted from the tracker's closed items, rather than a changelog per package (reversible).
- After CS-611, Dyno's engine grammar accepts only released 1.x versions, and the `1.x` and `1.x@<ref>` sources refuse with a message (reversible).

## Decisions for the owner

All eight went to the owner by `hitld rights who`, with no precedent candidates.

1. **The order of CS-611 (1.x leaves) and CS-835 (the move).** The owner's plan has CS-611 need CS-835, but 1.x's `packages/core` sits where 2.0's must land. A. Swap them: CS-835 needs CS-611, and CS-611 drops CS-835. B. Keep the order: CS-835's first commit moves 1.x's `packages/core` to `legacy/core`, and CS-611 deletes it. _Recommended:_ A: the move runs with 1.x already gone, so its gates are 2.0's alone and nothing of 1.x is touched twice. (Blast radius: the release plan's order.)
2. **The release tool.** A. A repository script driven by a release record (`releases/<version>.md`). B. Changesets, with `fixed` groups and a custom step for the 0.x line. C. release-please with `linked-versions`. _Recommended:_ A: lockstep is one number, the 0.x line is one function, the record matches how this repository already records decisions, and it adds no dependency. (Blast radius and novelty: the release pipeline.)
3. **How 2.0 publishes to npm.** npm trusted publishing from `release.yml`, in a GitHub environment the owner approves, with `npm stage publish` and a maintainer's 2FA approval per package; a trusted-publisher configuration for 2.0's workflow added beside 1.x's on `cesium` and `@cesium/core`; a first manual publish for names npm can't stage. _Recommended:_ yes, as written. No npm token is stored anywhere. (Security and public commitment.)
4. **1.x's releases of `cesium` and `@cesium/core` publish under `1x`** before 2.0.0, so a 1.x release after 2.0.0 doesn't move `latest` back. That changes 1.x's release task on `main`, which the owner, as the 1.x team, would have to agree to. _Recommended:_ yes, from the first 1.x release after alpha.1, so it's habit by 2.0.0. (Public commitment and blast radius.)
5. **The paired 0.x rule:** experimental version = `0.(100 × major + minor).patch`, with the stable release's prerelease suffix. _Recommended:_ yes. The alternative is an independent 0.x line per package, which needs its own release records. (One-way door: published versions can't be taken back.)
6. **`publint` and `@arethetypeswrong/cli` as dev dependencies** for the packed-tarball checks. _Recommended:_ yes, pinned exactly (`@arethetypeswrong/core` is pre-1.0). The alternative is growing `checkDeclarations.mjs` to check `exports` itself. (Security: new dependencies.)
7. **GPU work in CI.** A. No GPU in CI for alpha.1: the GPU suites stay on Dyno's devices, cited by run ID, and CI later adds a software-WebGPU smoke. B. A self-hosted GPU runner, used only for pushes to the 2.0 branch, never for pull requests from forks. _Recommended:_ A: ordinary GitHub-hosted runners have no GPU (GPU runners come with larger plans, which these sources couldn't confirm), and a self-hosted runner is a trust boundary on a machine the owner uses. (Security and blast radius.)
8. **Lockfiles and dependency updates on the 2.0 branch.** A. Commit one root `package-lock.json`, end `package-lock=false` on this branch, install with `npm ci` everywhere (worktree setup, CI, releases, Dyno's snapshots), let Dependabot propose grouped updates through the merge queue, and test fresh ranges nightly. B. The same without Dependabot: updates by hand, as items. C. Keep 1.x's practice: no lockfile, ranges resolved on every install. _Recommended:_ A: without a lockfile two checkouts of one commit don't run the same tools (as on 2026-11-21, with playwright), a merge-queue pass doesn't predict CI, and a release can't be rebuilt. Dependabot is a new service on the repository, which is why B is there. (Blast radius: every install.)

## Follow-up items for the main session

- **`isolatedDeclarations` across the packages,** after CS-612: explicit types on every export, so declarations can come from a fast emitter and a type rollup becomes cheap. Kind work, project CS-609, needs CS-612.
- **Docs and site deploys for 2.0** (the API reference and the handbook), after alpha.1. Kind work, project CS-609, needs CS-613.
- **The software-WebGPU smoke job in CI,** if question 7 is A. Kind work, project CS-609, needs CS-613 and question 7.

## Risks

- **The nested 1.x dependencies.** `cesium-1x` brings `@cesium/core` 0.1.x, `@cesium/engine` and `@cesium/widgets`. If npm hoisted 1.x's `@cesium/core` over the workspace's, 2.0's tests would import the wrong core. Workspaces win over registry versions by name, and `^0.1.1` can't match 2.x, so it shouldn't happen; CS-611 checks the lockfile and adds a test that `@cesium/core` resolves to the workspace.
- **Lost fixtures.** Moving only the `Specs/Data` files 2.0 uses could miss one a page loads by a computed URL. CS-611 finds them by running the parity suites and the dev server's request log against the reduced folder before deleting `Specs/`.
- **`latest` going backwards.** Until question 4 is settled and 1.x's task passes `--tag 1x`, a 1.x release after 2.0.0 would move `latest` on `cesium` and `@cesium/core` back to 1.x. The release script also checks, before staging, that `latest` would not move to a lower version.
- **A trusted publisher is still a way in.** OIDC removes stored tokens, not compromised workflows. Staged publishing and the owner's environment approval are the guard; the workflow's hardening (pinned actions, least privilege, no pull-request trigger) is the rest.
- **The move and the build land close together.** CS-835 runs on today's Vite and `tsc` setup, moved; CS-612 replaces it right after. Keeping `build:lib` working through the move (step 9) is what lets each commit be checked.

## Sources (read 2026-11-21)

- npm, `package-lock.json` (never published; ignored outside the root project): docs.npmjs.com/cli/v11/configuring-npm/package-lock-json; `npm-shrinkwrap.json` (publishable, and why libraries shouldn't): docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json
- OpenSSF, npm best practices for package managers (lockfiles, `npm ci`, testing what consumers resolve): github.com/ossf/package-manager-best-practices
- npm, trusted publishers: docs.npmjs.com/trusted-publishers
- GitHub changelog, npm trusted publishing with OIDC generally available (2025-07-31): github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available
- npm, staged publishing: docs.npmjs.com/staged-publishing; `npm stage`: docs.npmjs.com/cli/v11/commands/npm-stage
- GitHub changelog, staged publishing and new install-time controls for npm (2026-05-22): github.blog/changelog/2026-05-22-staged-publishing-and-new-install-time-controls-for-npm
- GitHub changelog, multiple trusted publishing configurations for npm (2026-09-03): github.blog/changelog/2026-09-03-multiple-trusted-publishing-configurations-for-npm
- Socket, npm trusted publishing (the May 2026 compromise through a trusted publisher; not checked against a primary source): socket.dev/blog/npm-trusted-publishing
- Vite, building for production and library mode: vite.dev/guide/build; build options: vite.dev/config/build-options; Vite 8 announcement: vite.dev/blog/announcing-vite8
- tsdown and `isolatedDeclarations`: tsdown.dev; rolldown-plugin-dts: npmjs.com/package/rolldown-plugin-dts
- Declaration bundlers compared (API Extractor, rollup-plugin-dts, dts-bundle-generator): github.com/timocov/dts-bundle-generator/discussions/68
- Changesets, fixed packages and prereleases: npmjs.com/package/@changesets/cli
- release-please, manifest releaser and plugins: github.com/googleapis/release-please (docs/manifest-releaser.md); the linked-versions "0 candidates" report: znat.github.io/gitpulse/pull/30/release-pipeline-unblocked-with-plugin-removal
- OpenTelemetry JavaScript SDK 3.0, the stable 3.x and experimental 0.300.x lines: opentelemetry.io/blog/2026/otel-js-sdk-3-0
- Nx, Nx and Turborepo compared: nx.dev/docs/guides/comparisons/nx-vs-turborepo; DEV, monorepos in 2026: dev.to/arenasbob2024cell/monorepo-in-2026-turborepo-vs-nx-vs-pnpm-workspaces-44l2
- publint and Are the Types Wrong in CI: tsdown.dev's lint options (main.tsdown.dev/options/lint); github.com/arethetypeswrong/arethetypeswrong.github.io (packages/cli/README.md)
- Chrome, WebGPU and WebGL in headless Chrome: developer.chrome.com/blog/supercharge-web-ai-testing
- GitHub changelog, Actions policy for blocking and SHA-pinning actions (2025-08-15): github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions
- GitHub changelog, safer `pull_request_target` defaults for checkout (2026-06-18): github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout
- Wiz, the state of pwn requests against GitHub Actions: wiz.io/blog/github-actions-security-pwn-request-reckoning
