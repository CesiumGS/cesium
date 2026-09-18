# Extract GltfPipeline into @cesium/gltf

Create a published `@cesium/gltf` workspace whose only runtime dependency is `@cesium/core`, then mechanically move the 24 `GltfPipeline` modules into its flat `Source` directory and rewrite every consumer of the moved symbols through a deterministic reviewer-runnable script. Scene loaders and metadata classes remain in engine for this effort.

## Phase 1: Package and orchestration foundation

1. Add `packages/gltf` as a workspace with package metadata and standard repository files, modeled on `packages/core`: `package.json`, `.gitignore`, `LICENSE.md`, `README.md`, `lint-staged.config.js`, `tsconfig.json`, `tsd-conf.json`, `scripts/build.js`, `Specs/spec-main.js`, `Specs/karma-main.js`, and `Specs/test.mjs`.
   - Name/version: `@cesium/gltf` at an initial `0.1.0` version unless release management selects another initial version.
   - Dependencies: only `@cesium/core`; never `@cesium/engine`.
   - Source/spec globs: flat `packages/gltf/Source/*.js` and `packages/gltf/Specs/*Spec.js`.
   - README scope: glTF parsing/transformation utilities independent of Cesium rendering and resource loading.
   - Add a temporary `Source/Placeholder.js` module with an `@internal` top-level export, a trivial `Specs/PlaceholderSpec.js` imported through `../index.js`, and a `Specs/test.mjs` smoke test that imports `Placeholder` from `@cesium/gltf` and asserts it is defined. These files keep the directories tracked and exercise barrel generation, declarations, and package-scoped tests before real source moves.

2. Wire the new workspace into root package/build metadata.
   - Add `packages/gltf` to root `workspaces`.
   - Add `@cesium/gltf` to `packages/engine/package.json` dependencies.
   - Add `@cesium/gltf` to root `dependencies` alongside `@cesium/core`, `@cesium/engine`, and `@cesium/widgets`.
   - Add `npm install cesium-gltf*.tgz` to `.github/actions/verify-package/script.sh`, alongside its existing `cesium-core`/`cesium-engine`/`cesium-widgets` lines.
   - Add `packages/gltf/Source` to the `source.include` list in `Tools/jsdoc/conf.json` and `Tools/jsdoc/ts-conf.json`, alongside `packages/core/Source`, `packages/engine/Source`, and `packages/widgets/Source`.

3. Add `buildGltf` to root build orchestration with dependency order `core -> gltf -> engine -> widgets` wherever package builds are explicitly sequenced, including the default build and release/build-series paths.

4. Add gltf source/spec globs to watch-mode lists that are still explicitly hard-coded.

5. Verify the empty/scaffolded workspace independently before any source movement. This makes build-system failures reviewable separately from migration failures.

## Phase 2: Deterministic migration tooling

1. Add a dedicated glTF migration manifest listing exactly the 24 current files under `packages/engine/Source/Scene/GltfPipeline`. Keep this separate from the completed core migration manifest.

2. Add a dedicated migration script, modeled on `moveCoreFiles.js` and `rewriteCoreImports.js`.
   - Support `--dry-run`, apply, and `--check` modes.
   - Preflight: assert the source directory contains exactly the manifest set; assert every moved module depends only on another manifest module, `@cesium/core`, or an explicitly allowed third-party package; fail before writes on drift.
   - Move: use `git mv` from `packages/engine/Source/Scene/GltfPipeline/<name>.js` to flat `packages/gltf/Source/<name>.js` so the committed mechanical change is reproducible and rename history is clear.
   - Remove `packages/gltf/Source/Placeholder.js` and `packages/gltf/Specs/PlaceholderSpec.js` after the real source files are moved, and update `Specs/test.mjs`'s smoke test to import a real moved symbol instead of `Placeholder`, mirroring `moveCoreFiles.js`'s equivalent smoke-test content swap. Include these changes in dry-run output and post-migration checks.
   - Internal imports: retain/recompute sibling relative imports after flattening.
   - Consumer imports: scan `packages/engine/Source/**`, `packages/engine/Specs/**`, `packages/widgets/Source/**`, `packages/widgets/Specs/**`, and root `Specs/**` for every consumer of a manifest symbol - whether via a relative import of a manifest module (e.g. `./GltfPipeline/X.js`) or a named import of a manifest symbol from the engine barrel (`@cesium/engine`, or a relative self-barrel resolving to `packages/engine/index.js`) - and rewrite each into a merged, sorted named import from `@cesium/gltf`, splitting out any symbols that stay in the barrel.
   - Tagging: for each manifest symbol discovered above to be imported from outside `packages/gltf`, promote its top-level declaration's `@private` tag to `@internal`, mirroring how `rewriteCoreImports.js` scopes the same promotion to symbols referenced across the `@cesium/core` package boundary. Manifest symbols with no such reference keep `@private`; `removeExtension` has no existing tag at all and gets `@private` added directly, matching its equally internal-only siblings.
   - Scan all source/spec files for stale `Scene/GltfPipeline` references and report any unhandled case.
   - Format only files whose imports changed.
   - Post-migration `--check`: require all destination files, no old source directory/files, no remaining relative-path or engine-barrel imports of any manifest symbol anywhere in the scanned globs, and the expected `@private`/`@internal` split on each of the 24 top-level declarations. It must be idempotent and perform no writes.

3. Document reviewer reproduction: from the parent of the mechanical migration commit, run the migration script and confirm the resulting tracked diff matches the committed migration; on the migrated commit, run `--check` to verify invariants.

## Phase 3: Mechanical move

1. Run the migration script in one dedicated commit/change containing only moved source files and generated import rewrites.

2. Run `npx gulp build --workspace @cesium/gltf` and `npx gulp build --workspace @cesium/engine` to regenerate `packages/gltf/index.js` and `packages/engine/index.js`.

3. Validate the migrated dependency graph: gltf imports core only; engine imports gltf; core does not import gltf; gltf does not import engine; `Source/Cesium.d.ts` and public documentation contain none of gltf's `@internal` symbols.

## Phase 4: Tests and package contract

1. Copy relevant specs from the gltf-pipeline repo, update import paths as needed.

2. Reuse existing engine fixture data only if it has no engine/runtime dependency; otherwise copy or create minimal package-owned fixtures.

3. Keep existing engine loader and terrain specs as integration coverage after their imports switch to `@cesium/gltf`.

4. Generate and inspect package declarations:
   - The cross-package-referenced `@internal` top-level exports must appear in `packages/gltf/index.d.ts` so engine and typed package consumers can resolve them.
   - The remaining `@private` top-level exports, and all nested `@private` helpers, must not appear in `packages/gltf/index.d.ts`.
   - None of the 24 may remain in `packages/engine/index.d.ts`.
   - None may appear in root `Source/Cesium.d.ts` or generated public documentation.

5. Add a release note describing the new package and its role as an internal glTF parsing/transformation boundary for existing private engine implementation details.

## Phase 5: Final verification

1. Run focused checks first: migration-script tests and `--check`, gltf build/type generation/typecheck/specs, then engine build and the affected GltfJsonLoader/GltfLoader/terrain specs.

2. Run repository-wide build, type generation/typecheck, lint/format check, and test suite. Inspect generated `Source/Cesium.js`, `packages/gltf/index.js`, and both package declaration files for the intended API boundaries.

3. Run `npm pack --dry-run --json --workspace @cesium/gltf` to verify the package contains `Source`, generated JavaScript/types, README, and license, and confirm `@cesium/engine` resolves its declared gltf dependency.

## Relevant files

- `packages/engine/Source/Scene/GltfPipeline/*.js`: exact 24-file migration source.
- `packages/engine/Source/Scene/GltfJsonLoader.js`: seven imports become `@cesium/gltf` named imports.
- `packages/engine/Source/Scene/GltfLoader.js`: three accessor utility imports become package imports.
- `packages/engine/Source/Core/Cesium3DTilesTerrainProvider.js`: `parseGlb` becomes a package import.
- `packages/engine/Specs/Core/Cesium3DTilesTerrainDataSpec.js`: one of the consumers the migration script's scan finds and rewrites (`parseGlb` via the engine barrel).
- `packages/core/package.json` and `packages/core/scripts/build.js`: package/build templates.
- `packages/gltf/`: new package, source, specs, type config, and build script.
- `package.json` and `package-lock.json`: workspace graph and lock metadata.
- `packages/engine/package.json`: add `@cesium/gltf` dependency.
- `gulpfile.js`: explicit build order, workspace routing, watchers, types/tests/docs orchestration.
- `scripts/build-utilities.js`: add `gltf` to the `Workspace` typedef.
- `scripts/moveCoreFiles.js`, `scripts/rewriteCoreImports.js`, and `scripts/coreMigrationShared.js`: behavior templates for the new script's preflight, move, and rewrite logic.
- `Tools/jsdoc/cesiumTags.js`: existing `@internal` semantics.
- `CHANGES.md`: package announcement.

## Verification

1. Migration script dry run reports exactly 24 moves and only the expected consumer import rewrites.
2. Migration script `--check` passes on the migrated tree and a repository search finds no live `Scene/GltfPipeline` import or source path.
3. `@cesium/gltf` package build, declaration generation, `tsc`, and specs pass independently.
   - Before migration, this includes the temporary placeholder module/spec; after migration, the placeholders must be absent.
4. A dependency scan confirms `packages/gltf/Source` has no `@cesium/engine` or relative imports into engine.
5. Affected engine specs and the full engine build pass with package imports.
6. Full repository build, declarations/typecheck, lint/format check, and tests pass.
7. Generated API inspection confirms all 24 symbols exist in the gltf JavaScript barrel, only the cross-package-referenced `@internal` symbols appear in gltf's generated types, none of the 24 exist in engine types, and none appear in root `Source/Cesium.d.ts` or public documentation.

## Decisions

- The first milestone moves exactly GltfPipeline; no related Scene classes move with it.
- All 24 modules are treated as private engine implementation details, including `removeExtension`; no engine compatibility re-exports are required.
- Only the manifest symbols actually imported from outside `packages/gltf`, as discovered by the migration script's repo-wide consumer scan, are promoted to `@internal`, matching how `rewriteCoreImports.js` scopes the same promotion for `@cesium/core`. The remaining manifest symbols, used only within `packages/gltf/Source`, keep `@private`.
- Source is flattened into `packages/gltf/Source`, matching the requested layout and core package pattern.
- `@cesium/gltf` depends only on `@cesium/core`; `@cesium/engine` depends on gltf; `@cesium/gltf` is also a root `dependencies` entry, matching `core`/`engine`/`widgets`.
- Gltf's `@internal` symbols stay out of the root `cesium` package's generated TypeScript declarations and public documentation, per the existing `@internal` convention.
- Use dedicated migration tooling with deterministic validation, scoped specifically to this GltfPipeline extraction.
- Engine loaders, `GltfJsonLoader`, renderer/resource classes, structural metadata parsing, property textures, and metadata containers remain in engine for this milestone; dependency-clean metadata containers are a candidate for a later, separate proposal.
