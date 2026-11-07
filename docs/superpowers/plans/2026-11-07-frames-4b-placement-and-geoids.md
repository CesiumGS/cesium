# Frames 4b: Tileset Placement Modes, Design Picking and Snapping, Global Geoids Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place long design models on the globe rigidly or reprojected per vertex, pick and snap on them in design coordinates, and measure in design and true terms. Do it in any country's height system, with grids fetched lazily and verified against a pinned PROJ-data catalog. Then show it in the §8.1 gallery example, "Design coordinates on the globe".

**Architecture:**

- **Grids.** The PROJ-data catalog (`files.geojson`, PROJ-data 1.25.0) is pinned by SHA-256 and is the trust root for every grid.
  - A `GridSource` is any base URL with cdn.proj.org's layout. Grids are fetched per file, verified against the catalog and loaded into PROJ.
  - The dev server's `/proj-grids/` fetches a grid on its first request, verifies it, caches it in the store and serves it.
  - Node and the browser see exactly the grids loaded, nothing more.
  - `EngineeringFrame.load` is the async step before `resolveOperation`: it fetches the best candidate's grids, then resolves as plan 4a's R2 says. EGM96 and EGM2008 are opt-in, named fallbacks.
- **Placement.** A `TilesetPlacement` is `rigid` (an iModel's `ecefLocation`: one `RigidPlacement` at an anchor) or `reprojected` (every vertex through the frame's recorded operation). Each has a forward map for display and an exact inverse for measurement.
  - A tileset declares its placement in a proposed tileset-level extension, `EXT_engineering_frame`, whose `crs` uses the draft's `EXT_geospatial_crs` object shape.
  - The two placements are the two end states of plan 5's morph between design space and the global view. The morph itself is not built here.
- **Picking and snapping.** `pickDesign` turns a pixel into a body-fixed point plus, on a placed tileset, its design coordinates. `SnapService` (after 1.x's `SnapService`, view-scoped) has a client-side implementation over retained tile geometry. The example adds an exact one over the corridor's analytic alignment.
  - Every result states its tolerance, and `measure` carries that tolerance as an accuracy term.
- **The example.** An offline generator makes a 50 km State Plane corridor in US survey feet, tiled twice (rigid and reprojected), plus a site-grid building and a portfolio of sites in six countries' height systems. It writes them, with the exact answers, into the store. `examples/design-globe/` shows them.

**Tech Stack:**

- TypeScript (float64) and Vitest.
- Node setup scripts (`.mjs`, importing `src` TypeScript as `frameData.mjs` already does).
- PROJ 9.7.1 (proj.js v0.9.2, as plan 4a R1), and PROJ-data 1.25.0's catalog and grids.
- The engine's `Viewer`, `Tileset3D`, `View.pick`/`pickPosition`, and Dyno's React panel contract with StrataKit.
- No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`. The sections this plan builds:

- 2 (the anti-goal);
- 4 (rigid sag, US survey foot, tessellation);
- 6.5 (picking, snapping, measurement accuracy);
- 7.2 and 7.3 (placement modes and the inverse);
- 7.4 (grids);
- 8.1 (the example);
- 9 and 10.

It also builds the owner's 4b requirement and the "Plan 4b" items in `CESIUM2_WEBGPU_PLAN.md` §13.14. Read with it:

- `docs/superpowers/plans/2026-11-05-frames-4a-engineering-frames.md`. Its rulings R1–R9 still bind, except where "Amended rulings" below says otherwise.
- The §13.14 entry "Design space and the global view, with a morph between them (owner, 2026-11-06)", which is plan 5's input.

**Roadmap:** plan 5 covers multiple bodies, the Artemis example, camera rigs, and the morph between this plan's two placements.

## Calls made for the owner (review in the morning)

One line each: what was chosen, then what undoing it costs.

1. **The §8.1 example is a new gallery example, `examples/design-globe/`, not an extension of the frames explorer.** The explorer is a proof page for frames and projections. §8.1 is a product-like page for design users, with tilesets, a measure tool with snapping and a check panel, none of which the explorer has. The explorer is also being edited by other agents tonight. The explorer gains only two catalog groups (Task 21). *Undo:* moving the example's modules into an explorer scenario, about a day; the library is unaffected.
2. **The catalog pin is PROJ-data 1.25.0's `files.geojson`,** from the immutable tag URL. It is 331,044 bytes, SHA-256 `46f26c830faa164af9ef9ef51a7325a9d3800eb12ad4b1661c1d3143af7becc3`, byte-identical to cdn.proj.org's copy on 2026-11-06. Its `copyright_and_licenses.csv` (39,115 bytes, `1222fbfae2ad0033876e744d29ee40287ae6fd1f48a943fdde3c2a556b1d2379`) is pinned with it for credits. *Undo:* two constants.
3. **PROJ's own files are pinned in `src/engineering/projPins.ts`,** shared by setup and the loader. The browser hashes the glue, the WebAssembly and `proj.db` before using them. Node re-hashes `proj.db` against the pin, and the native `.node` against setup's manifest entry, because its extracted hash differs per platform. *Undo:* one module.
4. **The glue is imported from a Blob URL of its verified bytes,** so what runs is what was hashed. The importer is injectable, so the unit tests, which run in Node where `blob:` imports fail, inject their own. If the glue needs its own URL, the task records that and imports the verified URL instead. *Undo:* one line.
5. **Both platforms see only the grids loaded explicitly.** In Node, PROJ_DATA points at a per-process staging directory holding `proj.db` and links to the verified grids, and a Node process supports one PROJ base. Node keeps a legacy default (every verified grid already in the base) until Task 21 moves the explorer's tests to explicit lists. *Undo:* loader-only.
6. **Grids live in a new store directory, `grids/`, not PROJ's `proj/`.** So nothing setup prefetches can change the explorer's Node results before Task 21. *Undo:* a path.
7. **The default grid base URL is `/proj-grids/`,** a dev-server endpoint that fetches on a miss and validates every name against the catalog. A `GridSource` takes any base with cdn.proj.org's layout, and the catalog hash can be overridden for a newer catalog. *Undo:* a configuration default.
8. **A coarser operation is not a throw.** Plan 4a's R2 stays (take the first candidate whose grids are loaded). The skipped better candidates are now recorded (`betterCandidates`) and stated as a warning, `coarser-operation`. `EngineeringFrame.load` fetches the best candidate's grids first, so with a catalog the best candidate wins. A throw would change the explorer's fingerprints. A better candidate states a strictly smaller accuracy, isn't a ballpark, and reads the same vertical grids as the chosen operation (2026-11-07, owner's call): PROJ's stated accuracies don't compare geoid models, so one that swaps GEOID18 for GEOID99 isn't better. *Undo:* an option to throw instead.
9. **Fallback semantics.** `geoidFallback: "EGM96" | "EGM2008"` applies only when the compound CRS's horizontal part resolves with no missing grids and its vertical part does not. Design heights are then read as that model's heights. The accuracy term `geoidFallback` is undefined (never small) unless the app gives `fallbackSigma`. *Undo:* one function.
10. **EGM2008 (80.6 MB) is opt-in.** It isn't in setup's default grid set (`--grids egm2008` adds it) and loads whole. Cropped regional tiles aren't built. *Undo:* a setup set; cropping can come later as a setup step.
11. **Tidal and chart datums are supported where PROJ-data has grids** (Danish, Greenlandic and Dutch LAT and MSL). Depth axes are handled through a new `CrsUnits.verticalDirection`. NOAA's MLLW and the other VDatum surfaces aren't in PROJ-data, and are reported as unavailable, naming the datum. *Undo:* nothing to undo; hosting VDatum is held below.
12. **The tileset declaration is `EXT_engineering_frame` in `tileset.json`'s `extensions`,** proposed as a draft addition. It holds `crs` in the draft's `EXT_geospatial_crs` object shape (`format` plus a `_wkid` or `_wkt2` companion), `placement` (`mode`, and `anchor` for rigid), `site`, `alignments`, `areaOfInterest` and `body`. The draft's glTF-level `EXT_geospatial_crs` and `EXT_georeference` aren't read: they carry no placement mode. *Undo:* one reader module; the name is a constant.
13. **A rigid tileset uses the standard root `transform`, equal to `RigidPlacement.matrix`.** The reader checks the declared anchor against that transform and refuses a mismatch. A reprojected tileset is plain Earth-fixed tiles. Both are readable by any 3D Tiles 1.1 viewer. *Undo:* the generator and one check.
14. **PROJ loads on `georeferenceTileset()`,** not on `Tileset3D.load`, which only parses the declaration. *Undo:* one call site.
15. **Ready for the morph.** The generator writes the rigid and reprojected tilesets with identical tile trees and vertex order, and a test pins it, so plan 5 can pair the vertices. No dual-position attribute is written. *Undo:* the generator.
16. **The corridor is in EPSG:6420+6360** (NAD83(2011) / California zone 3 in US survey feet, with NAVD88 heights in US survey feet, through GEOID18). It runs 164,042 ftUS from (6,080,000, 2,110,000) at azimuth 100°, with three spiralled curves and a bridge at stations 600+00 to 612+00 (Task 12). Its frame pins GEOID18's operation (`CORRIDOR_PIPELINE`, 2026-11-07, owner's call): PROJ ranks NADCON5 with GEOID99 or GEOID03 (stated ±1.14 m) ahead of GEOID18 (±2.015 m), and those geoids are superseded for NAVD88. A pin that matches one of PROJ's candidates keeps that candidate's stated accuracy (`matchedCandidate`); one that matches none states none. *Undo:* edit the data file and regenerate; drop the pin.
17. **Tessellation.** The leaf chord error is at most 0.003 ftUS (about 0.9 mm), on 2,000 ft leaf tiles, with parents decimated 2× per level. A tile's `geometricError` is the snap tolerance it states. *Undo:* generator parameters.
18. **Client snapping needs `retainGeometry: true` on the tileset** (CPU copies of the loaded tiles). It snaps to the hit draw's vertices first, then its edges, then the surface. *Undo:* one option; a GPU route could replace it later.
19. **The portfolio** (Task 12):
    - London: 27700+5701, OSTN15 and OSGM15;
    - Sydney: 7856+5711, AUSGeoid2020;
    - Tokyo: 6677+6695, JPGEO2024 (PROJ ranks it ahead of GSIGEO2011; Task 9, 2026-11-07), whose axes are northing first;
    - Amsterdam: 28992+5709, RDNAPTRANS;
    - Nairobi: 32737+5773, EGM96;
    - Phoenix: 6405+8228, NAD83(2011) / Arizona Central in international feet with NAVD88 in feet, pinned to GEOID18 (`PHOENIX_PIPELINE`; PROJ's first choice reads GEOID99). It was 2223+8228 (the original NAD83) until 2026-11-07;
    - Jakarta: 9488+9471 (SRGI2013 / UTM zone 48S with INAGeoid2020 v1 heights), whose grid `INAGEOID2020v1.gtx` isn't in PROJ-data, so it uses the EGM96 fallback. It replaced São Paulo: `proj.db` 9.7.1 has no Brazilian vertical CRS;
    - the corridor's site-grid building, which is the local grid.

    No public ion asset is included: ion exposes no CRS for an asset (the explorer's R18 research), so each needs its frame supplied, and they go in the empty ion slots. *Undo:* a data list.
20. **Pick tolerance.** A depth-buffer pick states one pixel's footprint at the hit, and a snap states its own tolerance. Both enter the accuracy statement as a `pick` term. *Undo:* one term.
21. **Pipelines are structured.** A `Pipeline` type (global parameters plus steps) is added, pinned pipelines accept it, and a pinned string is parsed into it. Grid names come from `grids`, `nadgrids` and `geoidgrids`, with `@` marking an optional grid. *Undo:* small.
22. **The example's globe is the ellipsoid, not terrain,** so a NAVD88 corridor is never buried in, or floating over, a terrain model with its own vertical datum. Imagery is as the gallery provides. *Undo:* one field.
23. **Grid credits come from the pinned licenses CSV** (agency and license, "via PROJ-data 1.25.0") and are exposed as `EngineeringFrame.gridCredits`. The example shows them with the data credits. *Undo:* small.

## Held for the owner

Each of these is expensive to undo or is genuinely the owner's. The task order keeps them at the end or off the path.

1. **The design-globe example's look.** *Resolved 2026-11-07:* no mockup gate (the owner reviews the built page in context). The owner set the story: a viewer audience first, the rigid placement's error as the point, a smooth morph between placements with the other ghosted, the surveyor's numbers secondary, the portfolio as a fly-to list (examples/design-globe/DESIGN.md, "The story"). Originally: the controller makes the mockup tonight (Task 0), and the owner reviews it in the morning. *Blocks:* Tasks 18–20, the example's UI. Everything else proceeds, including the example's non-visual core (Task 17), Task 21, and Task 22's docs and plan note. Only Task 22's final gates wait for Tasks 18–20.
2. **Metrostation and the owner's real long iModel.** Their CRS, units, site transform and placement mode are needed, and so is the decision whether to use the Sandcastle share key (it expires 2027-01-01; ion's terms apply). *Blocks:* only filling the portfolio's ion slots in Task 20. The slots are built empty.
3. **NOAA VDatum surfaces (MLLW, MHW and others).** They aren't in PROJ-data, and NOAA distributes them separately. Whether to self-host them, and how, is the owner's call. *Blocks:* nothing; 4b reports them as unavailable.
4. **Submitting `EXT_engineering_frame` to the 3D Tiles 2.0 draft:** its name, and whether a placement mode belongs in the draft at all. *Blocks:* nothing; locally the name is one constant.
5. **A hosted grid service** (Cesium ion, with CORS and possibly cropped tiles). *Blocks:* nothing; `GridSource` is configurable.

## Amended rulings

- **4a R2 (recorded operations):** unchanged in its rule. A frame also records the better candidates it skipped for missing grids, and the accuracy statement warns about them (call 8). `EngineeringFrame.load` loads the best candidate's grids from the catalog first.
- **4a R3 (CRS references):** the tileset-level declaration is `EXT_engineering_frame` (call 12). Its `crs` maps to `CrsRef` unchanged.
- **4a R9 (projection term):** a geoid fallback adds a `geoidFallback` term, and the projection term's note names any better candidate that was skipped.

## Global Constraints

- **Repository practice:**
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Other agents share this checkout. Commit only your task's files, by path (`git commit -m "…" -- <paths>`). Never run `git add -A`, `git stash`, `git checkout` or `git reset`. On an `index.lock` error, wait a few seconds and retry.
  - Commands run in `packages/next`.
  - Never rewrite downloaded or compiler output: the glue loads as shipped.
- **Testing cadence per task:**
  - the task's focused tests (`npx vitest run <files>`; data tests with `FRAMES_DATA=1 npx vitest run test/data/<file>`);
  - `npx tsc --noEmit -p .`;
  - `npx eslint` and `npx prettier --check` on the changed files.

  Run `npm run test:data` in full only when a task changes `src/frames`, `src/engineering`, the explorer's `stress/`, its references or `fingerprints.json`. The full gates (`npm test`, `npm run test:data`, eslint on the tree, Snyk) run once, in Task 22. The exception: Tasks 11 and 16, which change the core `Tileset3D`, `Tile`, `View` and `World`, also run `npm test` once.
- **Security:**
  - **No ion token** in the repo, workers, URLs, logs, storage or the DOM.
  - **Endpoint hardening:** a grid endpoint serves or fetches only a name that is exactly a key of the pinned catalog. There is no path traversal, no fetching of arbitrary URLs, no redirects followed, a size cap from the catalog, and generic error bodies (details go only to the server log). The `/frames-data` mount excludes `grids/` and `*.partial`, so `/proj-grids/` is the only route to a grid (Task 4).
  - Untrusted strings (tileset JSON, catalog fields, WKT) are rendered as text and validated before use.
- **Structured PROJ inputs.** Build CRS references and pipelines from structured data (`CrsRef`, `Pipeline`), never by concatenating strings. Strings are made in one place each: `crsDefinition` and `formatPipeline`.
- **Data comes only through setup and lives outside the repo.** The store (`~/.cesium-bench/frames`, or `FRAMES_DATA_DIR`) gains:
  - `grids/`: `files.geojson`, `copyright_and_licenses.csv` and grid `.tif` files;
  - `design-globe/`: the generated tilesets, `answers.json` and `manifest.json`.

  Nothing downloaded or generated is committed.
- **Lazy loading.** Nothing loads PROJ, the catalog or a grid until an engineering frame or `georeferenceTileset` asks for it. Earth-only scenes and existing tests are unchanged.
- **Units and conventions.** Everything is float64. Design values are in the CRS's own units (R5). Matrix conventions are unchanged (column-major `Mat4`). Angles are in radians.
- **UI:**
  - The quality bar is high: StrataKit and Dyno's design guide, with every state designed.
  - Any new visual gets a mockup first: the controller makes it and the owner reviews it (Task 0).
  - Screenshots are never committed; design-review screenshots go to a git-ignored `design-screenshots/`.
- **Browser checks** use the implementer's own dev server: `npx vite --port <52xx> --strictPort`, started in the background and stopped afterwards, with the browser pane at `http://127.0.0.1:<52xx>`. **Never** use, restart or stop the owner's server on 127.0.0.1:5190.
- **The frames explorer** (`examples/frames-explorer/`, `test/framesExplorer*.test.ts`, `test/data/framesExplorer*.test.ts`) is being edited by other agents. Only Task 21 touches it, and it starts after the controller confirms they are finished.
- **Snyk** (`snyk_code_scan`) runs on all new first-party code once, in Task 22. Fix what it finds and rescan until clean. Findings that predate this plan in `vite.config.ts` and the accepted CWE-23 in `proj.ts` are reported, not fixed here.
- **Licenses and credit:**
  - PROJ-data grids carry their own licenses from the pinned CSV (public domain, CC-BY-4.0, BSD-2-Clause, OGL-Canada-2.0, Etalab Open Licence and others), and a grid that is shown is credited with its agency and license.
  - EPSG/IOGP terms ship with `proj.db` (plan 4a).
- **Pinned values** (recorded 2026-11-06; from setup's current manifest and the catalog):

  | File | SHA-256 |
  | --- | --- |
  | `proj/proj_capi.mjs` | `26cc8f8a83edc2c859f48829bb8dd0e9303e891cab801251974c92763df9031a` |
  | `proj/proj_capi.wasm` | `6efdbdaf7f1ee6bc49b92ea784e45d04e53a1f3f6299179f9397a3cac7539914` |
  | `proj/proj.db` | `b192cb2fd7eb0fab76aa9495743288f4f2da4534f586ab5ccb9d869c644e8272` |
  | `proj/us_noaa_g2018u0.tif` (16,742,155 bytes; equal to `frameData.mjs`'s `PROJ_SHA256`) | `fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2` |
  | `https://raw.githubusercontent.com/OSGeo/PROJ-data/1.25.0/files.geojson` (331,044 bytes; 458 entries) | `46f26c830faa164af9ef9ef51a7325a9d3800eb12ad4b1661c1d3143af7becc3` |
  | `https://raw.githubusercontent.com/OSGeo/PROJ-data/1.25.0/copyright_and_licenses.csv` (39,115 bytes) | `1222fbfae2ad0033876e744d29ee40287ae6fd1f48a943fdde3c2a556b1d2379` |

  Every grid's hash and size come from the catalog: for example `us_nga_egm96_15.tif` is 2,710,815 bytes and `us_nga_egm08_25.tif` is 80,585,622.
- **Accuracy targets:**

  | What | Within |
  | --- | --- |
  | Design → displayed → design, either placement, anywhere on the 50 km corridor (spec §7.3, §10) | 1e-4 m |
  | A rigid placement's inverse of its own forward | 1e-9 m |
  | Rigid sag, 10 km and 20 km from the anchor along grid east | 7.8 ± 1.5 m and 31 ± 3 m |
  | Geoid and height-system cases against published references | each reference's stated precision, written in the fixture |
  | An exact snap's design point against the analytic geometry | 1e-6 design units |

## Review Focus

1. **Hostile grid names at the dev endpoint.** `../proj.db`, `%2e%2e%2fmanifest.json`, `proj.db`, `x.tif.partial`, `https://example.com/a.tif`, a name not in the catalog, and a catalog entry marked removed each get a 404. Nothing is fetched upstream and nothing is written. Test: Task 4.
2. **Bytes that don't match the catalog** (a truncated download, a corrupted cache, a mirror serving another catalog's version). They are refused by the dev server, by `loadGrids` in the browser and Node, and by setup. Nothing is stored or loaded, and the error names the file and both hashes. Tests: Tasks 1, 2, 3 and 4.
3. **A tileset declaration that is malformed or wrong.** An unknown mode, a missing `crs`, NaN in a site transform, a WKT2 over 65,536 characters, or a rigid anchor that disagrees with the root transform gives no design coordinates, and an error or warning names the field. The engine never guesses a placement. Tests: Task 11.
4. **Picks and snaps that have no design answer:** the sky, a tileset without a placement, a draw not in the given tilesets, or a point beyond the alignment's ends. These return true values only, with no design coordinates and no station: nothing is extrapolated. Tests: Tasks 15, 16 and 17.
5. **Depth-positive vertical CRSs and geoid fallbacks.** A LAT depth of +10 lies 10 m *below* depth 0, a rigid placement's up axis points down for a depth CRS, and a fallback's accuracy is undefined unless `fallbackSigma` is given, never small. Tests: Tasks 7 and 8.

---

### Task 0: The design-globe mockup (controller, not an implementer)

**Files:**

- Create:
  - `packages/next/examples/design-globe/DESIGN.md`
  - `packages/next/examples/design-globe/design-mocks/*.svg` and `*.png`

- [ ] **Step 1:** Mock the page against Dyno's design guide and the frames explorer's DESIGN.md (layout in the side column, type, colour, the HUD exception), at desktop and at a 380 px panel, light and dark. Cover:
  - the portfolio list;
  - the rigid / reprojected switch, with the sag shown;
  - the measure tool (snap mode: exact, geometry, none), with design, true and scale-factor readouts and station, offset and elevation;
  - the check panel;
  - loading states (PROJ, the catalog, each grid with its bytes) and the missing-data and error states;
  - the empty ion slots.
- [ ] **Step 2:** Commit DESIGN.md and the mocks with "examples: design globe: mockup and design for the owner's review". The owner reviews them in the morning.

### Task 1: The catalog pin and the grid store

**Files:**

- Create:
  - `packages/next/src/engineering/projPins.ts`
  - `packages/next/src/engineering/gridCatalog.ts`
  - `packages/next/src/io/sha256.ts`
  - `packages/next/scripts/gridSets.mjs`
  - `packages/next/scripts/verifiedDownload.mjs`
  - `packages/next/test/gridCatalog.test.ts`
  - `packages/next/test/verifiedDownload.test.ts`
  - `packages/next/test/data/gridStore.test.ts`
- Modify:
  - `packages/next/scripts/frameData.mjs`
  - `packages/next/scripts/frameData.d.mts`
  - `packages/next/scripts/setup.mjs`

**Interfaces:**

- **Produces** (`projPins.ts`):
  - `PROJ_FILE_SHA256: { "proj_capi.mjs": string; "proj_capi.wasm": string; "proj.db": string; "us_noaa_g2018u0.tif": string }`, the values in Global Constraints.
  - `PROJ_DATA_CATALOG: { version: "1.25.0"; catalogUrl: string; catalogSha256: string; catalogBytes: 331044; licensesUrl: string; licensesSha256: string; licensesBytes: 39115 }`.
- **Produces** (`sha256.ts`): `sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string>`, with `crypto.subtle` in both Node and the browser.
- **Produces** (`gridCatalog.ts`):
  - `interface GridEntry`:
    - `name`, `url`, `sha256`, `bytes`;
    - `type?: string` (the catalog's `type`, such as `VERTICAL_OFFSET_GEOGRAPHIC_TO_VERTICAL`);
    - `sourceCrs?`, `targetCrs?`, `area?: AreaOfInterest` (from `full_bbox`);
    - `agency: string` (`source`), `country?`, `license?` (from the CSV), `description?`;
    - `removed: boolean` (`version_removed` set).
  - `class GridCatalog`:
    - `static parse(geojson: string, licensesCsv?: string, version: string = PROJ_DATA_CATALOG.version): GridCatalog` (the catalog carries no version of its own);
    - `get(name: string): GridEntry | undefined`;
    - `readonly entries: ReadonlyMap<string, GridEntry>`;
    - `readonly version: string`;
    - `credit(name: string): string`, as `"<agency> (<license>), via PROJ-data <version>"`.
- **Produces** (`gridSets.mjs`): `GRID_SETS: Record<"portfolio" | "tests" | "egm2008" | "all", readonly string[] | "*">`.
  - `portfolio` holds the grids of call 19: `uk_os_OSTN15_NTv2_OSGBtoETRS.tif`, `uk_os_OSGM15_GB.tif`, `au_ga_AUSGeoid2020_20180201.tif`, `jp_gsi_jpgeo2024.tif` (Task 9: was `jp_gsi_gsigeo2011.tif`, now in `tests`), `nl_nsgi_rdtrans2018.tif`, `nl_nsgi_nlgeo2018.tif`, `us_nga_egm96_15.tif` and `us_noaa_g2018u0.tif`.
  - `tests` holds `us_noaa_conus.tif`, the NADCON5 NAD27→NAD83 CONUS grids, and the LAT grid that Task 7 settles on.
  - Tasks 6, 7, 9 and 12 correct these names to what `listOperations` reports, and say so in their commits.
- **Produces** (`verifiedDownload.mjs`): `verifiedDownload(url: string, path: string, expected: { sha256: string; bytes: number }, options?: { fetch?: typeof fetch; timeoutMs?: number }): Promise<void>`. It is the one verified fetcher; setup and Task 4's cache both use it:
  - it fetches with `redirect: "error"` and `AbortSignal.timeout` (default 120,000 ms);
  - it aborts past `expected.bytes`;
  - it writes to `<path>.partial`, checks the length and the hash, then renames;
  - on a mismatch it deletes the partial file and throws, naming the file and both hashes.
- **Produces** (`frameData.mjs`): `ensureGrids(dir: string, sets: readonly string[], log): Promise<ManifestEntry[]>`.
  - It writes to `<store>/grids/`, with manifest roles `gridCatalog` and `grid`.
  - `ensureFrameData({ span, grids })` calls it with the `--grids` sets and adds its entries to the manifest's `files`, since `ensureFrameData` rewrites `manifest.json`. `ManifestEntry` is declared in `frameData.d.mts`.
  - It links (or copies) `files.geojson` and `copyright_and_licenses.csv` into `proj/` as well, so a PROJ base holds a catalog (Task 3 needs it).
  - It also verifies each extracted PROJ file against `PROJ_FILE_SHA256`.
- `setup.mjs` takes `--grids a,b`, defaulting to `portfolio,tests`. `all` prints the total size first.

- [ ] **Step 1: Write the failing unit test** (`test/gridCatalog.test.ts`), with an inline three-feature catalog and a CSV with a quoted field holding a comma (`"Her Majesty, Natural Resources Canada"`):
  - `parse` gives each entry's `sha256`, `bytes`, `type` and `area`;
  - `credit` reads `"<agency> (CC-BY-4.0), via PROJ-data 1.25.0"`, with the fixture's agency;
  - an entry with `version_removed` has `removed: true`;
  - a feature with no `sha256sum` throws, naming it;
  - `sha256Hex` of "abc" is `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.

  And `test/verifiedDownload.test.ts` (a temporary directory and a stub `fetch`):
  - good bytes are stored, with no `.partial` left;
  - a wrong hash, a short body and a body past the byte count each leave no file and throw, naming both hashes or the size (Review Focus 2);
  - a redirect is not followed.
- [ ] **Step 2: Write the failing data test** (`test/data/gridStore.test.ts`):
  - the store's `grids/files.geojson` hashes to the pin and has 458 entries;
  - `manifest.json` lists the catalog (role `gridCatalog`) and each stored grid (role `grid`);
  - `us_nga_egm96_15.tif`'s entry is 2,710,815 bytes;
  - every grid of the `portfolio` and `tests` sets is present, with the catalog's size and hash.
- [ ] **Step 3: Run** `npx vitest run test/gridCatalog.test.ts test/verifiedDownload.test.ts` and `FRAMES_DATA=1 npx vitest run test/data/gridStore.test.ts`, and confirm both fail.
- [ ] **Step 4: Implement.** Setup's rules:
  - It fetches the catalog and the CSV from the pinned tag URLs with `verifiedDownload`.
  - It fetches each grid from `https://cdn.proj.org/<name>` with `verifiedDownload`, against the catalog's size and hash.
  - `us_noaa_g2018u0.tif` is linked, or copied, from `proj/`.
  - A mismatch deletes the partial file and throws, naming the file and both hashes (Review Focus 2).
- [ ] **Step 5: Run** `npm run setup -- --skip-build`, then both tests, and confirm they pass.
- [ ] **Step 6: Commit** with "setup: the PROJ-data 1.25.0 catalog as the grids' trust root, and grid sets in the store".

### Task 2: Verified PROJ bytes on both platforms

**Files:**

- Modify:
  - `packages/next/src/engineering/proj.ts`
  - `packages/next/src/engineering/projNode.ts`
  - `packages/next/src/engineering/projApi.ts` (`proj_info`, which the native binding has)
  - `packages/next/scripts/frameFixtures.py`
  - `packages/next/test/fixtures/frames/proj.json` (adds `engineProjVersion`, values unchanged)
- Test:
  - `packages/next/test/projLoad.test.ts` (extend; its existing cases are updated to pass their stubs' hashes)
  - `packages/next/test/data/proj.test.ts` (extend)

**Interfaces:**

- Consumes: Task 1's `PROJ_FILE_SHA256` and `sha256Hex`.
- **Produces:**
  - `loadProj` refuses, with `Error("PROJ: <file> SHA-256 mismatch (expected …, got …)")`, any of `proj_capi.mjs`, `proj_capi.wasm` or `proj.db` that doesn't match the pin. A refused load isn't memoized.
  - `LoadProjOptions` gains two internal options for tests: `pins` (defaulting to `PROJ_FILE_SHA256`), so the stubs can pass their own bytes' hashes, and `importGlue?: (bytes: Uint8Array) => Promise<unknown>` (defaulting to an import from a Blob URL of the verified bytes, call 4), so the Node-run unit tests can inject a `data:` or file importer.
  - Node verifies `proj.db` against the pin, and `proj_capi.node` against the `proj/proj_capi.node` entry of the store's `manifest.json`. The store is found the way `framesDataDirectory()` finds it (`FRAMES_DATA_DIR`, else `~/.cesium-bench/frames`), not relative to `base`. A missing manifest throws "run `npm run setup`".
  - `ProjApi.proj_info(): { release: string; version: string }`, read for the fixture guard.

- [ ] **Step 1: Write the failing tests:**
  - **Unit** (`test/projLoad.test.ts`, the existing browser-path stubs): a stubbed `fetch` serving `proj.db` with one byte changed makes `loadProj` reject `/proj\.db SHA-256 mismatch/`, and a retry with the right bytes resolves. Do the same for the WebAssembly.
  - **Data** (`test/data/proj.test.ts`): `proj.json`'s `engineProjVersion` equals the loaded PROJ's version ("9.7.1"), with the failure message "regenerate test/fixtures/frames/proj.json with scripts/frameFixtures.py proj (plan 4a carried forward)".
- [ ] **Step 2: Run** the focused tests and confirm they fail.
- [ ] **Step 3: Implement.** `frameFixtures.py proj` writes `engineProjVersion`; add the field to the checked-in fixture by hand, with no other change.
- [ ] **Step 4: Run** the tests, then `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Check it in the browser** on your own port. From the console, `loadProj({ base: '/frames-data/proj/' })` resolves and evaluates the pinned California pipeline exactly as before.
- [ ] **Step 6: Commit** with "engineering: PROJ's files verified against pins in the browser and in Node".

### Task 3: One grid set on both platforms, and `GridSource`

**Files:**

- Modify:
  - `packages/next/src/engineering/proj.ts`
  - `packages/next/src/engineering/projNode.ts`
  - `packages/next/src/engineering/projApi.ts` (`proj_log_level`, `PJ_LOG_NONE`)
  - `packages/next/src/engineering/crs.ts` (availability and log level)
  - `packages/next/src/index.ts`
- Test:
  - `packages/next/test/gridSource.test.ts`
  - `packages/next/test/data/gridLoad.test.ts`
  - `packages/next/test/projLoad.test.ts` (its stubs gain a small catalog naming `g.tif` and `late.tif`)
  - `packages/next/test/data/crs.test.ts`, whose no-grid cases move to `packages/next/test/data/crsNoGrids.test.ts` with `grids: []`. Its two-base regression ("keeps each base's search path…") becomes "a second base throws".

**Interfaces:**

- Consumes: Tasks 1 and 2.
- **Produces** (`proj.ts`):
  - `interface GridSource { readonly base: string; readonly catalog: GridCatalog }`.
  - `gridSource(options: { base: string; catalogSha256?: string; licensesSha256?: string; version?: string; onProgress?: LoadProgress }): Promise<GridSource>`. `version` (default `PROJ_DATA_CATALOG.version`) goes with an overridden catalog hash, for credits.
    - It reads `${base}files.geojson` and `${base}copyright_and_licenses.csv` (a fetch in the browser, a file read in Node) and verifies them against `PROJ_DATA_CATALOG` or the overrides.
    - It is memoized per base.
  - `loadGrids(proj: ProjApi, source: GridSource, names: readonly string[], options?: { onProgress?: LoadProgress }): Promise<void>`. Each name:
    - must be a plain file name and a catalog key that isn't removed;
    - is length- and hash-checked;
    - in the browser, is written to the module's file system;
    - in Node, is linked into the staging directory.

    Concurrent calls for one name share one fetch. A name loaded already is a no-op.
  - `loadedGrids(proj: ProjApi): ReadonlySet<string>`.
  - `loadProj`'s `grids` option becomes `loadGrids(api, await gridSource({ base }), grids)`. `base` must then hold a catalog; setup puts one in `proj/` by linking it from `grids/`.
- **Node staging** (`projNode.ts`):
  - On the first load, `PROJ_DATA` is a fresh `mkdtemp(<tmpdir>/cesium-proj-)` holding a link to (or copy of) the verified `proj.db`.
  - A second, different base in the same process throws, naming the first.
  - The legacy default: when `grids` is omitted, every `.tif` in `base` that setup's manifest lists is verified and linked. Task 21 removes it.
- **`resolveOperation` and `listOperations`** count a grid as available only when PROJ reports it and `loadedGrids` has it. They lower PROJ's log level to `PJ_LOG_NONE` while listing candidates, and restore it.

- [ ] **Step 1: Write the failing unit test** (`test/gridSource.test.ts`, with a stub `fetch` and a stub `ProjApi` recording `FS.writeFile` and `proj_log_level`):
  - `gridSource` rejects a catalog with one byte changed (Review Focus 2);
  - `loadGrids` rejects `"../proj.db"` and `"nope.tif"` (not in the catalog) before any fetch;
  - grid bytes of the wrong length or hash are refused and not written;
  - two concurrent `loadGrids` for one name make one fetch;
  - listing operations sets `PJ_LOG_NONE` and restores the previous level.
- [ ] **Step 2: Write the failing data test** (`test/data/gridLoad.test.ts`, Node):
  - `loadProj({ base, grids: [] })` then `listOperations` for EPSG:27700+5701 → EPSG:4979 reports `uk_os_OSGM15_GB.tif` missing;
  - after `loadGrids(P, await gridSource({ base: <store>/grids/ }), ["uk_os_OSGM15_GB.tif", "uk_os_OSTN15_NTv2_OSGBtoETRS.tif"])`, it doesn't, and `loadedGrids(P)` has both.

  First confirm that Vitest runs each data test file in its own process (the default `forks` pool with `isolate`), so grids one file links never reach another file's PROJ. Record what you find in the test's header comment.
- [ ] **Step 3: Run** both tests and confirm they fail.
- [ ] **Step 4: Implement.** If the WebAssembly build lacks `proj_log_level`, record that in `projApi.ts`; the browser then keeps PROJ's noise.
- [ ] **Step 5: Run** the tests, then `npm run test:data`. Confirm the explorer's catalog is unchanged against its result count and fingerprints recorded at this task's start (other agents add cases, so don't use a fixed number).
- [ ] **Step 6: Commit** with "engineering: one explicit grid set on both platforms, loaded from a verified GridSource".

### Task 4: The dev server's grid endpoint

**Files:**

- Create:
  - `packages/next/scripts/projGrids.mjs`
  - `packages/next/scripts/projGrids.d.mts`
- Modify: `packages/next/vite.config.ts` (register the plugin, and add `.glb` and `.tif` content types)
- Test: `packages/next/test/projGrids.test.ts`

**Interfaces:**

- Consumes: Task 1's `GridCatalog`.
- **Produces** (`projGrids.mjs`):
  - **`gridRequest(urlPath: string, catalog: GridCatalog): { kind: "catalog" | "licenses" | "grid"; name: string } | undefined`.**
    - It decodes once, and a decoding error gives undefined.
    - The name must match `^[A-Za-z0-9][A-Za-z0-9_.-]*$`, contain no "..", and be exactly a key of the catalog that isn't removed and whose `url` is `https://cdn.proj.org/<name>`.
    - `files.geojson` and `copyright_and_licenses.csv` are the two other names allowed.
  - **`createGridCache({ dir, catalog, fetch, log }): { ensure(name: string): Promise<string> }`.**
    - It returns the verified file's path, fetching on a miss from the fixed origin `https://cdn.proj.org/` through Task 1's `verifiedDownload`.
    - Concurrent `ensure` calls for one name share one fetch.
  - **`projGridsPlugin(prefix: string, dir: string): Plugin`** for GET and HEAD only.
    - It sends `Content-Length` and a content type: `image/tiff`, `application/geo+json` or `text/csv`.
    - An unknown name is a 404. An upstream or hash failure is a 502 with the body "grid unavailable", and the details go to the server log.
    - `vite.config.ts` mounts it at `/proj-grids` when `<store>/grids/files.geojson` exists. Before mounting, it hashes `files.geojson` and the CSV against `PROJ_DATA_CATALOG`; on a mismatch it logs and doesn't mount (Review Focus 2).
  - **`serveDirectory`** gains an `exclude` option, and the `/frames-data` mount excludes `grids/` and `*.partial`.

- [ ] **Step 1: Write the failing test** (`test/projGrids.test.ts`, with a temporary directory, a small catalog and a stub `fetch`):
  - Review Focus 1's names each make `gridRequest` return undefined, with no fetch and no file written.
  - A miss fetches once, verifies and stores. A second request serves from disk with no fetch.
  - Upstream bytes with a wrong hash leave no file, not even `.partial`, and the next request fetches again.
  - Upstream past the byte count is aborted.
  - Two concurrent `ensure` calls make one fetch.
  - A redirect is not followed.
- [ ] **Step 2: Run** `npx vitest run test/projGrids.test.ts` and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and confirm it passes.
- [ ] **Step 5: Check it on your own dev server:**
  - `curl -sI http://127.0.0.1:<52xx>/proj-grids/us_nga_egm96_15.tif` gives 200 with `Content-Length: 2710815`;
  - `/proj-grids/..%2fmanifest.json` and `/proj-grids/nope.tif` give 404;
  - `/frames-data/grids/files.geojson` gives 404.
- [ ] **Step 6: Commit** with "dev server: /proj-grids/, catalog-validated grids fetched on first request and verified".

### Task 5: Structured pipelines

**Files:**

- Create: `packages/next/src/engineering/pipeline.ts`
- Modify:
  - `packages/next/src/engineering/crs.ts` (replace `gridsOf`; `ResolveOptions.pipeline?: string | Pipeline`)
  - `packages/next/src/engineering/EngineeringFrame.ts` (`pipeline?: string | Pipeline`)
  - `packages/next/src/index.ts`
- Test: `packages/next/test/pipeline.test.ts` (parsing, formatting and grids) and `packages/next/test/data/pipeline.test.ts` (the cases that need PROJ)

**Interfaces:**

- **Produces** (`pipeline.ts`):
  - **`type ParamValue = string | true`**.
  - **`interface PipelineStep { readonly operation: string; readonly inverse?: boolean; readonly params?: Readonly<Record<string, ParamValue>> }`**. `operation` is the `+proj=` value.
  - **`interface Pipeline { readonly globals?: Readonly<Record<string, ParamValue>>; readonly steps: readonly PipelineStep[] }`**.
  - **`parsePipeline(text: string): Pipeline`.**
    - It tokenizes on whitespace into `+key[=value]`.
    - A string without `+proj=pipeline` is one step.
    - It throws on an empty step, a token not starting with "+", or a step with no `proj`.
  - **`formatPipeline(pipeline: Pipeline): string`**, the only place a pipeline string is made.
    - It validates keys (`^[A-Za-z_][A-Za-z0-9_]*$`, since PROJ has uppercase keys such as `R`) and values (no whitespace, no "+"), and throws, naming the token.
    - One step with no globals is written without the pipeline wrapper.
  - **`pipelineGrids(pipeline: Pipeline): readonly { name: string; optional: boolean; key: "grids" | "nadgrids" | "geoidgrids" }[]`**. It splits on ",", strips a leading "@" (setting `optional`), and drops PROJ's special name `null`.
  - **`RecordedOperation` gains `optionalGrids: readonly string[]`.** A missing optional grid in a pinned pipeline is not an error; Task 8's projection note names it.

- [ ] **Step 1: Write the failing tests.** In `test/pipeline.test.ts`:
  - `+proj=pipeline +step +proj=hgridshift +grids=@a.tif,b.tif +step +proj=vgridshift +geoidgrids=us_noaa_g2018u0.tif +multiplier=1` gives three grids, with `a.tif` optional.
  - `+nadgrids=@null,conus` gives just `conus`.
  - Malformed input throws, and `formatPipeline` with a value holding a space throws.

  In `test/data/pipeline.test.ts`:
  - **Round trips.** For each case in `test/fixtures/frames/proj.json`, the pipeline PROJ itself records (`resolveOperation(...).pipeline`) round-trips: `formatPipeline(parsePipeline(s))` equals `s` with whitespace normalized. The fixture's own strings are pyproj's, with no "+", so they aren't used. The Moon case covers an uppercase key (`+R=1737400`).
  - **Pinned pipelines:** `resolveOperation` with a `Pipeline` object equals the same pinned as a string, and a pinned pipeline naming `+geoidgrids=` for a grid that isn't loaded throws, naming that grid (the 4a carried-forward item).
- [ ] **Step 2: Run** both tests and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** both tests, then `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "engineering: structured PROJ pipelines, with grids, nadgrids, geoidgrids and optional grids".

### Task 6: Lazy grids for frames, and the better candidates

**Files:**

- Modify:
  - `packages/next/src/engineering/crs.ts`
  - `packages/next/src/engineering/EngineeringFrame.ts`
  - `packages/next/src/index.ts`
  - `packages/next/scripts/gridSets.mjs`
- Test: `packages/next/test/data/frameLoad.test.ts`

**Interfaces:**

- Consumes: Tasks 3 and 5.
- **Produces:**
  - **`RecordedOperation.betterCandidates: readonly { name: string; accuracy?: number; missingGrids: readonly string[] }[]`.** These are the candidates before the chosen one that were skipped only for missing grids, in PROJ's order. A ballpark is never listed. Pinned operations have `[]`.
  - **`EngineeringFrameDefinition.areaOfInterest?: AreaOfInterest`**, passed to `resolveOperation` and `listOperations`.
  - **`static EngineeringFrame.load(definition: EngineeringFrameDefinition, options: { proj: ProjApi; grids?: GridSource }): Promise<EngineeringFrame>`.**
    - It lists the candidates (with the area of interest) and takes the first that isn't a ballpark.
    - It loads that candidate's missing grids that the catalog has.
    - Then it calls `EngineeringFrame.create`.
    - A missing grid the catalog lacks is not fetched; `create` then takes the next candidate and records the better one.
  - **`EngineeringFrame.gridCredits: readonly string[]`**: `catalog.credit` for each grid of the operation when the frame was loaded with a `GridSource`, otherwise `[]`.

- [ ] **Step 1: Write the failing data test** (`test/data/frameLoad.test.ts`):
  - **London.** `EngineeringFrame.load` for EPSG:27700+5701 (London, with an area of interest) loads OSTN15 and OSGM15. Its operation's grids name both, its accuracy is PROJ's stated one, `betterCandidates` is empty, and `gridCredits` names Ordnance Survey and BSD-2-Clause.
  - **EPSG:26741, the plan-4a case, without NADCON loaded.** `create` records `betterCandidates` with the 5 m and 2.15 m candidates and their grids. Then `load` with the `tests` grid set loads `us_noaa_conus.tif` (or the NADCON5 grids PROJ names), the recorded operation is the better one, and `betterCandidates` is empty.
  - **No regression.** `create` for the 4a California frame with GEOID18 loaded is unchanged: the same pipeline and accuracy.
- [ ] **Step 2: Run** `FRAMES_DATA=1 npx vitest run test/data/frameLoad.test.ts` and confirm it fails.
- [ ] **Step 3: Implement.** Correct `GRID_SETS.tests` to the grid names PROJ reports.
- [ ] **Step 4: Run** the test, then `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "engineering: EngineeringFrame.load fetches the best operation's grids; frames record the better candidates they skip".

### Task 7: Opt-in geoid fallbacks, depth axes and tidal datums

**Files:**

- Modify:
  - `packages/next/src/engineering/EngineeringFrame.ts`
  - `packages/next/src/engineering/crs.ts` (`CrsUnits.verticalDirection`)
  - `packages/next/scripts/gridSets.mjs`
- Test:
  - `packages/next/test/data/geoidFallback.test.ts`
  - `packages/next/test/engineeringFrame.test.ts` (the rigid sign, with a stub)

**Interfaces:**

- Consumes: Task 6.
- **Produces:**
  - **`EngineeringFrameDefinition.geoidFallback?: "EGM96" | "EGM2008"`** and **`fallbackSigma?: number`** (m).
  - **`EngineeringFrame.fallback?: { readonly model: "EGM96" | "EGM2008"; readonly replacedVertical: number; readonly sigma?: number }`.** The rule (call 9):
    - the CRS is a `wkid` reference with `vcsWkid`;
    - its resolution fails for missing grids;
    - the horizontal CRS alone resolves with none missing.

    Then the frame resolves `{ ...crs, vcsWkid: 5773 }` (EGM96) or `3855` (EGM2008). `load` first loads `us_nga_egm96_15.tif` or `us_nga_egm08_25.tif` from the catalog.
  - **`CrsUnits.verticalDirection?: "up" | "down"`**, from the height axis's direction.
  - **`RigidPlacement`**: for `"down"` the up column of `matrix`, and `toBodyFixed` and `fromBodyFixed`, use −`metersPerHeightUnit`.
  - **A vertical CRS with no grid.** When only a ballpark operation relates a compound CRS's vertical part to the ellipsoid (MLLW depth, EPSG:5866, has no transformation in `proj.db`), `create` and `load` throw `"<vertical CRS name>: no PROJ-data grid relates it to the ellipsoid"`, not the generic ballpark message.

- [ ] **Step 1: Write the failing tests:**
  - **Unit** (`test/engineeringFrame.test.ts`): with a stub `ProjApi` whose height axis is "down", `RigidPlacement` maps design (0, 0, 10) to 10 units *below* the anchor's surface normal (Review Focus 5).
  - **Data** (`test/data/geoidFallback.test.ts`):
    - **Jakarta** (EPSG:9488+9471, SRGI2013 / UTM zone 48S with INAGeoid2020 v1 heights, through transformation 9305 and `INAGEOID2020v1.gtx`, which PROJ-data lacks; confirm with `listOperations`). Without `geoidFallback`, `load` throws, naming the missing grid. With `"EGM96"`, `frame.fallback.model` is "EGM96", and `toGeodetic` at height 0 equals that of the same horizontal CRS with `vcsWkid: 5773`, within 1e-9 m. `projection` accuracy is a separate concern, in Task 8.
    - **A LAT depth CRS** with its PROJ-data grid. Use the first of these that `proj.db` 9.7.1 resolves: Amersfoort / RD New + LAT NL depth (EPSG:9287, `nl_nsgi_nllat2018.tif`), then DKLAT(2023) depth (EPSG:10550, `dk_sdfi_dklat_2023.tif`); record which.
      - `units.verticalDirection` is "down".
      - The geodetic height at depth 10 is 10 m below that at depth 0, within 1e-6 m.
      - Both points round-trip within 1e-4 m.
      - The rigid round trip is exact to 1e-9 m.
    - **MLLW.** A frame on NAD83(2011) with MLLW depth (EPSG:5866) throws `/MLLW depth: no PROJ-data grid relates it to the ellipsoid/` (call 11).
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.** Correct the grid sets for the grids used.
- [ ] **Step 4: Run** the tests, then `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "engineering: opt-in EGM96 and EGM2008 fallbacks, depth axes and tidal datums".

### Task 8: Measurement: pick tolerances, fallback and candidate warnings, the Moon

**Files:**

- Modify:
  - `packages/next/src/engineering/EngineeringFrame.ts` (`DesignPoint.obtained`)
  - `packages/next/src/measure/accuracy.ts`
  - `packages/next/src/measure/measure.ts`
- Test: `packages/next/test/data/designMeasure.test.ts` (extend)

**Interfaces:**

- Consumes: Tasks 6 and 7.
- **Produces:**
  - **`DesignPoint.obtained?: { readonly how: "pick" | "snap"; readonly tolerance: number; readonly kind?: SnapKind }`** (tolerance in m), and **`designPoint(frame, design, obtained?)`**. `SnapKind` is declared here as `"point" | "segment" | "arc" | "surface"` and re-exported by Task 16.
  - **`AccuracyTerm.source`** gains `"pick"` (meters = `obtained.tolerance`) and `"geoidFallback"` (meters = `fallback.sigma`, or undefined).
  - **`WarningCode`** gains `"coarser-operation"` (when `betterCandidates` isn't empty, naming them and their grids) and `"geoid-fallback"`.
  - **`projectionTerm`'s note** (amended R9) names the operation's missing optional grids (Task 5) and its skipped better candidates, with their accuracies and grids.

- [ ] **Step 1: Write the failing data tests:**
  - **A pick term.** A design point with `obtained: { how: "pick", tolerance: 0.02 }` adds a `pick` term of 0.02 m.
  - **The projection note.** For the EPSG:26741 frame without NADCON (Task 6), the note names the 5 m and 2.15 m candidates and their grids. For a pinned pipeline with a missing optional grid, it names that grid.
  - **The Earth.** The EGM96 fallback frame's ends add `geoidFallback` terms with `meters` undefined, so the statement's `meters` is undefined. With `fallbackSigma: 0.5` it is 0.5 m (Review Focus 5). A frame with better candidates warns `coarser-operation`, naming their grids.
  - **The Moon** (the 4a carried-forward item). Use two Moon frames: the 4a south-polar CRS, and the same CRS with a site transform (rotation 30°, scale 1).
    - Design points in the two frames give no `design` result.
    - The distance equals `|a.toBodyFixed − b.toBodyFixed|` within 1e-9 m.
    - The statement has one `projection` term per end.
    - With `signal: false` there is no `signal` and no `lineOfSight`.
    - In one frame, `design.distance` equals the design-coordinate distance within 1e-9.
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, then `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: pick and snap tolerances, fallback and coarser-operation terms, and Moon design points".

### Task 9: Global geoid coverage against published references

**Files:**

- Create:
  - `packages/next/test/fixtures/frames/geoids.json`
  - `packages/next/test/data/geoids.test.ts`
- Modify:
  - `packages/next/test/data/factors.test.ts` (the Mercator (Spherical) case)
  - `packages/next/scripts/gridSets.mjs`

**Interfaces:**

- Consumes: Tasks 6 and 7.
- **Produces:** `geoids.json`: `{ cases: GeoidCase[] }`, with `GeoidCase` a union of:
  - `{ id, crs: CrsRef, kind: "geographic" | "projected", grids: string[], source: { url, retrieved, publisher }, precision: number /* m */, points: { input: number[], expected: number[] }[] }`;
  - `{ id, grids: string[], missingReference: string }`.

  Task 21 reuses it.

- [ ] **Step 1: Collect the references.** For each grid, take the publisher's own test values, never PROJ or pyproj (the explorer's R10):
  - EGM96 and EGM2008: NGA's interpolation test inputs and outputs;
  - OSTN15 and OSGM15: Ordnance Survey's published test files;
  - AUSGeoid2020: Geoscience Australia;
  - GSIGEO2011: GSI;
  - NLGEO2018 and RDNAPTRANS: NSGI.

  Use either the publisher's examples or its online calculator, with the date it was used. Record each source's URL, the retrieval date and its stated precision. A grid with no published reference found within the task is listed in the fixture as `{ id, missingReference: "<why>" }`, and nothing is compared for it.
- [ ] **Step 2: Write the failing data test** (`test/data/geoids.test.ts`), with a `GridSource` over the store. Forward and inverse match each point within the case's `precision`.
  - **Geographic cases** (NGA, GA and GSI publish latitude and longitude → N): `loadGrids`, then `resolveOperation` on a geographic compound CRS (for example EPSG:4326+5773 → EPSG:4979). `EngineeringFrame` refuses a non-projected CRS, so these don't use it.
  - **Projected cases** (OSTN15 and OSGM15, RD and NAP): `EngineeringFrame.load`.
  - **EGM2008:** run setup with `--grids portfolio,tests,egm2008` first. The case skips, with the reason "us_nga_egm08_25.tif not in the store; run npm run setup -- --grids egm2008", when the grid is absent.
  - `missingReference` cases compare nothing.
- [ ] **Step 3: Write the failing factors case.** Plan 4a's Mercator (Spherical) item asks for a WKT2 CRS using EPSG method 1026 on a sphere:
  - `gridFactors` gives k = 1/cos φ within 1e-12, and convergence 0, at φ = 0°, 30° and 60°;
  - the same method on an ellipsoid whose radii differ throws, as `checkSphere` does.
- [ ] **Step 4: Run** `FRAMES_DATA=1 npx vitest run test/data/geoids.test.ts test/data/factors.test.ts` and confirm they fail.
- [ ] **Step 5: Make them pass.** These are tests of existing code. A failure here is a finding: diagnose it with superpowers:systematic-debugging, fix it in `src/engineering`, and say so in the commit.
- [ ] **Step 6: Run** `npm run test:data` and confirm it passes.
- [ ] **Step 7: Commit** with "engineering: country geoids and EGM fallbacks checked against their publishers' test values".

### Task 10: `TilesetPlacement`: rigid and reprojected

**Files:**

- Create: `packages/next/src/engineering/placement.ts`
- Modify: `packages/next/src/index.ts`
- Test: `packages/next/test/data/placement.test.ts`

**Interfaces:**

- Consumes: `EngineeringFrame` and `RigidPlacement`.
- **Produces:**
  - **`type PlacementMode = "rigid" | "reprojected"`.**
  - **`interface TilesetPlacement`:**
    - `readonly mode: PlacementMode`;
    - `readonly frame: EngineeringFrame`;
    - `readonly rigid?: RigidPlacement` (rigid only);
    - `displayed(design: ArrayLike<number>, out?: Float64Array): Float64Array`, the body-fixed metres of a design point as this placement draws it;
    - `designOf(position: ArrayLike<number>, out?: Float64Array): Float64Array`, the exact inverse (spec §7.3);
    - `displayError(design: ArrayLike<number>): number`, which is `|displayed(design) − frame.toBodyFixed(design)|` in m (0 when reprojected).

    These are plan 5's two end states. Document that on the interface.
  - **`placeRigid(frame: EngineeringFrame, anchor: ArrayLike<number>): TilesetPlacement`** and **`placeReprojected(frame: EngineeringFrame): TilesetPlacement`.**

- [ ] **Step 1: Write the failing data test**, on the 4a California frame:
  - **Rigid:**
    - `displayed(anchor)` equals `frame.toBodyFixed(anchor)` within 1e-6 m;
    - `designOf(displayed(p))` equals p within 1e-9 m, for 21 points on a 164,042 ft line;
    - `displayError` at 10 km and 20 km of grid east is 7.8 ± 1.5 m and 31 ± 3 m.
  - **Reprojected:** `designOf(displayed(p))` equals p within 1e-4 m on the same points, and `displayError` is 0.
- [ ] **Step 2: Run** the test and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and confirm it passes.
- [ ] **Step 5: Commit** with "engineering: rigid and reprojected tileset placements, each with its exact inverse".

### Task 11: The tileset declaration and `Tileset3D` placement

**Files:**

- Create: `packages/next/src/engineering/georeference.ts`
- Modify:
  - `packages/next/src/streaming/Tileset3D.ts`
  - `packages/next/src/index.ts`
- Test:
  - `packages/next/test/georeference.test.ts`
  - `packages/next/test/tilesetPlacement.test.ts`
  - `packages/next/test/data/georeferenceTileset.test.ts`

**Interfaces:**

- Consumes: Tasks 6 and 10.
- **Produces** (`georeference.ts`):
  - **`ENGINEERING_FRAME_EXTENSION = "EXT_engineering_frame"`.**
  - **`interface TilesetGeoreference`:**
    - `name?: string`, `body: Body` (`"EARTH"` by default, or `"MOON"`);
    - `crs: CrsRef`, `site?: SiteTransform`, `alignments?: AlignmentDefinition[]`, `areaOfInterest?: AreaOfInterest`;
    - `placement: { mode: "rigid"; anchor: [number, number, number] } | { mode: "reprojected" }`.
  - **`readGeoreference(tilesetJson: unknown): TilesetGeoreference | undefined`.** It gives undefined when the extension is absent.
    - It maps `crs: { format: "wkid", extensions: { EXT_geospatial_crs_wkid: { authority, wkid, vcsWkid?, epoch? } } }`, and the `wkt2` companion, to `CrsRef`.
    - It throws a `GeoreferenceError` naming the JSON path for: an unknown mode or format; a missing `crs`; non-finite numbers; a WKT2 over 65,536 characters; more than 64 alignments.
  - **`checkRigidTransform`'s and the reader's messages name the field:** a mismatched anchor names `placement.anchor`.
  - **`checkRigidTransform(placement: TilesetPlacement, rootTransform: Mat4): void`.** It throws when `rootTransform × anchor` differs from `placement.displayed(anchor)` by more than 1e-3 m, or a column differs from `rigid.matrix`'s by more than 1e-9 relative.
  - **`georeferenceTileset(tileset: Tileset3D, options: { proj: ProjApi; grids?: GridSource }): Promise<TilesetPlacement>`.** It loads the frame (`EngineeringFrame.load`), builds the placement, checks a rigid placement against `tileset.root.transform`, and sets `tileset.placement`.
    - The frame's `name` is the declared `name`, else the tileset's URL.
    - It refuses, with an error and a `warnings` entry, unless the tileset's `modelMatrix` is the identity: `root.transform` includes it, and a later change would leave `displayed` no longer what is drawn.
- **Produces** (`Tileset3D`):
  - `readonly extensions: Readonly<Record<string, unknown>>` (from `tileset.json`).
  - `readonly georeference?: TilesetGeoreference`, parsed at load. A malformed declaration adds a `warnings` entry naming the path and leaves this undefined; it never fails the load.
  - `placement?: TilesetPlacement` (settable), and `TilesetOptions.placement`, for the application to supply one for an undeclared tileset. Document it beside `Tile.placement`, which is a tile's content (`ModelPlacement`): the two are unrelated.
  - `tileOfDraw(draw: DrawHandle): Tile | undefined`, kept in step with tile placement and unloading (index and generation).

- [ ] **Step 0: Check the draft** (spec §7.2: "The builder first checks the draft's current names and shape"). Read the current 3D Tiles 2.0 draft's `EXT_geospatial_crs` (and its `_wkid` and `_wkt2` companions) and `EXT_georeference`. Record their names, shapes and the date read in `georeference.ts`'s header. If the shape has changed from call 12's, follow it and say so in the commit.
- [ ] **Step 1: Write the failing tests:**
  - **Parsing** (`test/georeference.test.ts`): valid rigid and reprojected declarations, in both CRS formats, parse to the expected shape. Review Focus 3's parse cases (an unknown mode or format, a missing `crs`, NaN in a site transform, a WKT2 over 65,536 characters) each throw, naming their path. Unknown extra fields are ignored.
  - **`Tileset3D`** (`test/tilesetPlacement.test.ts`). No test constructs a `Tileset3D` today, so this one establishes the harness: `fakeEngine` from `test/fakeGpu.ts`, with a stubbed `fetch` for `tileset.json` and its content.
    - `extensions` and `georeference` are read;
    - a malformed declaration warns and the load succeeds;
    - `georeferenceTileset` on a tileset with a non-identity `modelMatrix` refuses and warns;
    - `tileOfDraw` finds a loaded tile's draw and returns undefined after the tile unloads.
  - **Data** (`test/data/georeferenceTileset.test.ts`): `checkRigidTransform` passes for `placeRigid(frame, a).rigid.matrix`, and throws for that matrix translated by 1 cm and rotated by 1e-6 rad, with a message naming `placement.anchor` (Review Focus 3's anchor case).
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm test` once (Global Constraints' exception), then `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "tiles: EXT_engineering_frame placement declarations, and georeferenceTileset".

### Task 12: The corridor and the portfolio, as data

**Files:**

- Create:
  - `packages/next/examples/design-globe/corridor.ts`
  - `packages/next/examples/design-globe/sites.ts`
- Modify: `packages/next/scripts/gridSets.mjs`
- Test: `packages/next/test/designGlobeCorridor.test.ts` and `packages/next/test/data/designGlobeSites.test.ts`

Use erasable TypeScript only (no parameter properties or enums), so the Node generator can import these files.

**Interfaces:**

- **Produces** (`corridor.ts`); all lengths are in US survey feet:
  - **`CORRIDOR_CRS: CrsRef`**: `{ format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 }`.
  - **`CORRIDOR_ALIGNMENT: AlignmentDefinition`**, named "Mainline":
    - start (6,080,000, 2,110,000), azimuth 100° (in radians), start station 10,000;
    - horizontal elements:
      - line 20,000;
      - spiral ∞→5,000, 500;
      - arc +5,000, 6,000;
      - spiral 5,000→∞, 500;
      - line 30,000;
      - spiral ∞→−3,000, 600;
      - arc −3,000, 8,000;
      - spiral −3,000→∞, 600;
      - line 40,000;
      - spiral ∞→8,000, 400;
      - arc +8,000, 10,000;
      - spiral 8,000→∞, 400;
      - line 47,042.

      The total is 164,042 and the end station 174,042.
    - the vertical profile from 10,000 at elevation 120:
      - grade +0.02 for 15,000;
      - parabola +0.02→−0.005 over 2,000;
      - grade −0.005 for 40,000;
      - parabola −0.005→+0.03 over 3,000;
      - grade +0.03 for 20,000;
      - parabola +0.03→0 over 2,500;
      - grade 0 for 81,542.

      Use the sign and grade conventions `alignment.ts` documents.
  - **`CROSS_SECTION`**, with offsets positive to the right:
    - a median barrier at 0 (2 wide at the base, 0.5 at the top, 2.67 high);
    - inner shoulders 1–5 at −4% cross slope;
    - lanes 5–29 at −2%;
    - outer shoulders 29–39 at −4%;
    - outer barriers 39–41;
    - mirrored on the left.
  - **`BRIDGE`**: stations 60,000–61,200, deck 1.5 thick, piers 4×4 at offsets ±20 every 120, down to the profile −25.
  - **`TICKS`**: every 100 ft, on the outer shoulder at offset ±35, 0.5 × 4.
  - **`ANCHOR_STATION = 92,021`**, the middle of the alignment.
  - **`corridorFrame(): EngineeringFrameDefinition`**: EARTH, `CORRIDOR_CRS`, `alignments: [CORRIDOR_ALIGNMENT]`, and an area of interest around the route.
- **Produces** (`sites.ts`):
  - **`interface PortfolioSite`:**
    - `id`, `name`, `place`;
    - `frame: EngineeringFrameDefinition`;
    - `origin: [number, number, number]` (design);
    - `model: { width: number; depth: number; stories: number; storyHeight: number }`;
    - `grids: readonly string[]`.
  - **`SITE_BUILDING`**: 200 × 120, 3 stories of 13, on a site grid of `CORRIDOR_CRS` with origin (start + (2,000, 1,500), 0), rotation 12.5° and scale 1.0000375.
  - **`PORTFOLIO`**, call 19's seven sites (origins in design coordinates):
    - London (530,000, 180,000);
    - Sydney (334,000, 6,252,000);
    - Tokyo (−7,000 E, −35,500 N, in normalized order);
    - Amsterdam (121,000, 487,000);
    - Nairobi (257,000, 9,857,000);
    - Phoenix (EPSG:6405, NAD83(2011) / Arizona Central in international feet, at the zone's centre, + 8228, pinned to GEOID18; EPSG:2223 until 2026-11-07);
    - Jakarta (702,000, 9,314,000) on EPSG:9488+9471, Task 7's compound, with `geoidFallback: "EGM96"`.
  - **`ION_SLOTS: readonly { label: string; ionAssetId?: number; frame?: EngineeringFrameDefinition; placement?: PlacementMode }[]`**, with two empty entries labelled "Metrostation (share key)" and "Your long iModel" (held item 2).

- [ ] **Step 1: Write the failing tests:**
  - **The corridor** (`test/designGlobeCorridor.test.ts`):
    - `new Alignment(CORRIDOR_ALIGNMENT)` has length 164,042 and end station 174,042;
    - azimuth and position are continuous at every join;
    - the elevation at 92,500 is 910;
    - the bridge lies on the long tangent (stations 37,000–67,000);
    - `CROSS_SECTION` is symmetric.
  - **The sites** (`test/data/designGlobeSites.test.ts`): every portfolio frame `load`s with the store's grids, its operation's grids equal `site.grids`, and its origin round-trips within 1e-4 m.
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.** Confirm each EPSG code with `listOperations`. Replace a code that doesn't resolve with the nearest real equivalent, and record the change in the commit. Correct `GRID_SETS.portfolio`.
- [ ] **Step 4: Run** the tests and confirm they pass.
- [ ] **Step 5: Commit** with "examples: design globe: the corridor's alignment and cross-section, and the portfolio's sites".

### Task 13: A glTF and tileset writer for the generator

**Files:**

- Create:
  - `packages/next/scripts/designTiles/gltf.mjs`
  - `packages/next/scripts/designTiles/tileset.mjs`
- Test: `packages/next/test/designTilesWriter.test.ts`

**Interfaces:**

- **Produces:**
  - **`writeGlb(mesh: { positions: Float32Array; normals: Float32Array; indices: Uint32Array; featureIds: Uint16Array; features: readonly { name: string; kind: string }[]; color: [number, number, number, number] }): Uint8Array`.**
    - Positions are glTF Y-up. Feature IDs use `EXT_mesh_features`, with one `EXT_structural_metadata` property table (`name`, `kind`).
    - It writes a minimal valid GLB 2.0: JSON chunk, BIN chunk, 4-byte alignment.
  - **`tilesetJson(root: TileNode, options: { extension?: object; transform?: number[] }): object`**, where `TileNode = { id: string; box: number[]; geometricError: number; transform?: number[]; content?: string; children?: TileNode[] }`. It writes `asset.version: "1.1"`, `extensionsUsed` and the root `transform`.

- [ ] **Step 1: Write the failing test.** `writeGlb` of a two-triangle mesh with two features, parsed by the engine's own glTF loader (find it through `src/io/glb.ts`'s callers), gives back:
  - the same positions, indices and feature IDs;
  - property-table names that `World.feature` would report.

  `tilesetJson` fed to `treeFromJson` gives the expected tile transforms and geometric errors.
- [ ] **Step 2: Run** the test and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and confirm it passes.
- [ ] **Step 5: Commit** with "scripts: a minimal GLB and tileset writer for generated design tiles".

### Task 14: The generator: the corridor twice, the building, the portfolio, and the answers

**Files:**

- Create:
  - `packages/next/scripts/designTiles.mjs`
  - `packages/next/scripts/designTiles/corridorMesh.mjs`
  - `packages/next/scripts/designTiles/siteMesh.mjs`
  - `packages/next/test/designTilesSampling.test.ts`
  - `packages/next/test/data/designTiles.test.ts`
- Modify: `packages/next/scripts/setup.mjs` (call `ensureDesignTiles` after the frames data and the grids)

**Interfaces:**

- Consumes: Tasks 6, 10, 11's `ENGINEERING_FRAME_EXTENSION`, 12 and 13.
- **Produces:**
  - **`sampleStations(alignment: Alignment, from: number, to: number, chordTolerance: number): Float64Array`.** Stations are spaced so the chord error is at most 0.003 ft on curves, and at most 30 ft apart on tangents. Joins and the bridge's ends are always included.
  - **`ensureDesignTiles(store: string, proj: ProjApi, grids: GridSource, frames: Frames, log): Promise<void>`.** Setup loads the `Frames` from the store's frame data; `measure` runs at one fixed instant, `DESIGN_TILES_INSTANT` (2026-01-01T00:00:00 UTC), recorded in `answers.json`. It writes `<store>/design-globe/`:
    - `corridor-rigid/` and `corridor-reprojected/`;
    - `site-building/`;
    - `portfolio-<id>/` for each site (rigid);
    - `answers.json`;
    - `manifest.json` (`version: 1` and the SHA-256 of `corridor.ts`, `sites.ts` and the generator files).

    It regenerates only when the manifest differs.
  - **Tiles:**
    - Leaves cover 2,000 ft of station, and their parents are decimated 2× per level.
    - **`geometricError`.** The engine scales a tile's `geometricError` by its transform's largest scale (`Tile.ts`), which on the rigid root is 0.3048006 (feet to metres). So the rigid tileset writes it in design units (0.003 ft at the leaves) and the reprojected one in metres (0.003 × 0.3048006…), both doubling per level. The scaled `Tile.geometricError` is then equal in the two.
    - **Rigid:** the root `transform` is `placeRigid(frame, pointAt(ANCHOR_STATION)).rigid.matrix`, which takes absolute design units to Earth-fixed metres. Each tile's `transform` translates from its parent's centre to its own, in design units; the root's centre is the design origin. Vertices are design units relative to their tile's centre.
    - **Reprojected:** each vertex goes through `frame.toBodyFixed`, relative to the tile's Earth-fixed centre.
    - Content is glTF Y-up, so a tile-space (E, N, U) is written as (E, U, −N), and the same for Earth-fixed offsets.
    - Both carry `EXT_engineering_frame`. Their tile ids, trees and vertex order are identical (call 15).
  - **`answers.json`:**
    - **`points`:** at every 4,000 ft of station, at each join, at the bridge's ends, and at the stations nearest 10 km and 20 km from the anchor; at offsets 0, ±17 and ±40: the design coordinates, `frame.toBodyFixed`, the rigid `displayed`, `displayError`, the geodetic position, the combined factor, the convergence, the station and offset;
    - **`pairs`:** for four pairs (10,000 ft on the first tangent, across the 5,000 ft curve, across the bridge, end to end): `measure`'s `design.distance`, `horizontalDistance` and `distance`, and the stations and offsets.

- [ ] **Step 1: Write the failing tests:**
  - **Sampling** (`test/designTilesSampling.test.ts`): on an arc of radius 3,000 the maximum chord error is ≤ 0.003; tangents are at most 30 apart; every join is included.
  - **The output** (`test/data/designTiles.test.ts`, reading the store):
    - the two corridor tilesets have identical trees, tile ids and per-tile vertex counts, and equal scaled `Tile.geometricError` (built with `treeFromJson`);
    - for every 50th vertex of every leaf, rigid `designOf(displayed)` and reprojected `designOf(vertex)` equal the vertex's design coordinates within 1e-4 m. This is the spec §10 round trip, with the pick replaced by the exact displayed position;
    - `checkRigidTransform` passes on the rigid root;
    - `answers.json`'s rigid `displayError` at the points nearest 10 km and 20 km from the anchor is in the spec's range (the farthest point, at the end, is about 20.8 km away);
    - recomputing three answers with the library reproduces them exactly.
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.** Generation must take under a minute; log the time.
- [ ] **Step 4: Run** `npm run setup -- --skip-build`, then the tests, and confirm they pass.
- [ ] **Step 5: Check** on your own dev server that `/frames-data/design-globe/corridor-rigid/tileset.json` and a `.glb` are served with the right content types.
- [ ] **Step 6: Commit** with "setup: the design-globe generator: the corridor rigid and reprojected, the site building, the portfolio and the exact answers".

### Task 15: Picking design coordinates

**Files:**

- Create: `packages/next/src/engineering/pick.ts`
- Modify: `packages/next/src/index.ts`
- Test: `packages/next/test/pickDesign.test.ts`

**Interfaces:**

- Consumes: Task 8's `designPoint` with `obtained`, and Task 11's `tileOfDraw` and `placement`.
- **Produces:**
  - **`interface DesignPick`:**
    - `body: Body`;
    - `position: Float64Array` (body-fixed, as displayed);
    - `tileset?: Tileset3D`, `feature?: PickResult`;
    - `design?: DesignPoint`;
    - `tolerance: number` (m).
  - **`pickDesign(view: PickView, x: number, y: number, tilesets: readonly Tileset3D[]): Promise<DesignPick | undefined>`.** `x` and `y` are CSS pixels.
    - `PickView` is the structural subset of `View` it uses, so tests can pass fakes: `pick`, `pickPosition`, `camera`, `pixelRect()`, the render target's `pixelRatio`, and the world's `feature`.
    - `View.pick` and `pickPosition` take target (device) pixels, so `pickDesign` multiplies by `pixelRatio` before calling them. View has no `height`.
    - The tolerance is one CSS pixel's footprint: the distance from the camera × 2·tan(fovy/2) / `pixelRect()`'s height in CSS px.
    - `design` is `placement.designOf(position)`, with `obtained: { how: "pick", tolerance }`, only when the hit draw belongs to a listed tileset with a placement.

- [ ] **Step 1: Write the failing test** (fakes only):
  - with `pixelRatio` 2, a pick at CSS (10, 20) calls `view.pick(20, 40)`;
  - a hit on a rigid tileset's draw gives `design` equal to `placement.designOf(position)` and the footprint tolerance;
  - a hit on a reprojected tileset does the same;
  - Review Focus 4: the sky gives undefined; a tileset without a placement gives no `design`; a draw of an unlisted tileset gives neither `tileset` nor `design`.
- [ ] **Step 2: Run** the test and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and confirm it passes. The check on a real GPU is Task 18's.
- [ ] **Step 5: Commit** with "engineering: pickDesign, frame-tagged picks with design coordinates on placed tilesets".

### Task 16: `SnapService` and client-side snapping

**Files:**

- Create: `packages/next/src/engineering/snap.ts`
- Modify:
  - `packages/next/src/streaming/Tileset3D.ts` (`retainGeometry`)
  - `packages/next/src/streaming/Tile.ts` (`geometry`)
  - `packages/next/src/scene/View.ts` (`toPixel`, if there's no equivalent)
  - `packages/next/src/scene/World.ts` (a draw's float64 world matrix, if there's no accessor: `worldMatrix` takes a `TransformHandle`)
  - `packages/next/src/index.ts`
- Test: `packages/next/test/snap.test.ts`

**Interfaces:**

- Consumes: Task 15.
- **Produces:**
  - **`SnapRequest { view: PickView; x: number; y: number; aperture: number }`**, all in CSS px, as `pickDesign` takes them.
  - **`SnapResult`:**
    - `point` and `raw` (`Float64Array`, displayed, body-fixed);
    - `distance` (CSS px) and `kind: SnapKind`;
    - `normal?: Float64Array` and `curve?: readonly Float64Array[]`;
    - `design?: DesignPoint` (with `obtained: { how: "snap", tolerance, kind }`);
    - `tolerance: number` (m), `exact: boolean`, `tileset?: Tileset3D`.
  - **`interface SnapService { snap(request: SnapRequest): Promise<SnapResult | undefined> }`.**
  - **`class ClientSnapService implements SnapService`**, with `constructor(tilesets: readonly Tileset3D[])`.
    - It starts from `pickDesign`'s hit and the hit draw's retained triangles. Their vertices project to CSS px; the nearest within the aperture is a `point`. Failing that, the nearest point on an edge within it is a `segment` (a 3D point by the edge parameter, with `curve` as the edge). Failing that, the raw hit is a `surface`.
    - The tolerance is the tile's `geometricError`, and `exact` is false.
  - **`TilesetOptions.retainGeometry?: boolean`.** Each loaded tile keeps `geometry: { draw: DrawHandle; positions: Float32Array; indices: Uint32Array; matrix: Float64Array }[]`, released on unload.
  - **`View.toPixel(position: ArrayLike<number>): Float64Array | undefined`**, in CSS px; undefined when the point is behind the camera.

- [ ] **Step 1: Write the failing test** (fakes: a view with a fixed camera, a tileset whose tile has two retained triangles and a placement):
  - a cursor 3 px from a vertex with a 6 px aperture snaps to that vertex exactly;
  - 3 px from an edge's middle snaps to the edge;
  - 20 px from everything gives `surface` with the raw point;
  - the tolerance equals the tile's geometric error;
  - `design` comes through the placement;
  - a tileset loaded without `retainGeometry` gives `surface`, and adds "snap: geometry not retained" to `tileset.warnings` once, however many snaps;
  - Review Focus 4's cases give no `design`.
- [ ] **Step 2: Run** the test and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and `npm test` once (Global Constraints' exception), and confirm they pass.
- [ ] **Step 5: Commit** with "engineering: SnapService, and client-side snapping to retained tile geometry".

### Task 17: The example's core: exact snapping, checks and the measurement model

**Files:**

- Create:
  - `packages/next/examples/design-globe/answers.ts`
  - `packages/next/examples/design-globe/exactSnap.ts`
  - `packages/next/examples/design-globe/checks.ts`
  - `packages/next/examples/design-globe/measureModel.ts`
- Test:
  - `packages/next/test/designGlobeExactSnap.test.ts`
  - `packages/next/test/designGlobeChecks.test.ts`
  - `packages/next/test/designGlobeMeasure.test.ts`

No UI is in this task.

**Interfaces:**

- Consumes: Tasks 12, 14, 15 and 16.
- **Produces:**
  - **`interface Answers`**, Task 14's `answers.json`:
    - `version: number`, `instant: string`, `anchorStation: number`;
    - `points: { station; offset; design: [number, number, number]; bodyFixed: [number, number, number]; rigidDisplayed: [number, number, number]; displayError; geodetic: { longitude; latitude; height }; combinedFactor; convergence }[]`;
    - `pairs: { id; from: number; to: number /* indices into points */; designDistance; horizontalDistance; trueDistance; ends: { a: { station; offset }; b: { station; offset } } }[]`.

    Write the generator and this type from one shape: Task 14 writes what this type reads.
  - **`loadAnswers(url: string, signal: AbortSignal): Promise<Answers>`.** It validates the shape and the finite numbers, and throws naming the path.
  - **`class ExactSnapService implements SnapService`**, with `constructor(tileset: Tileset3D /* a corridor tileset */, alignment: Alignment)`. It is the server side of Task 16's split (owner, 2026-11-07, mirroring 1.x's `SnapService`): it takes a `ServiceSnapRequest` built from the client snap (`testPoint` = the client's `hitPoint`, `closePoint` = its `snapPoint`, the same camera snapshot) and refines it against the design data. The page runs it through `refiningSnap(request, client, exact, onUpdate)`, so the client's mesh snap shows at once and the exact answer replaces it.
    - It snaps in design space, from `placement.designOf(testPoint)`, within the aperture converted to design units by the footprint. In order:
      1. a station tick's point (`point`);
      2. the nearest of the centerline and the lines at the cross-section's edge offsets (`segment` on a tangent, `arc` on an arc or a spiral), with `curve` as 21 points over ±100 ft;
      3. otherwise undefined, so the client's snap stands.
    - An exact snap has tolerance 0, `exact` true and `source: "server"`, and its design point lies on the analytic geometry.
    - Beyond the alignment's ends there is no station, and it returns undefined, so the client's snap stands (Review Focus 4).
  - **`interface CheckRow { id; label; unit; shown?: number; expected: number; tolerance: number; status: "pass" | "fail" | "not-shown"; basis: "exact" | "vertex" | "pick" }`.**
  - **`interface ShownValues`**: what the page shows, by answer id: `{ points: Map<number, { design?: Float64Array; station?: number; offset?: number; basis: CheckRow["basis"]; tolerance?: number }>; pairs: Map<string, { designDistance?: number; horizontalDistance?: number; trueDistance?: number; basis: CheckRow["basis"]; tolerance?: number }> }`.
  - **`checkRows(answers: Answers, shown: ShownValues): CheckRow[]`.** The tolerance by basis:
    - exact: 1e-6 design units;
    - vertex: 1e-4 m in design units;
    - pick: the stated pick tolerance.
  - **`interface MeasureView`**: display strings, `{ designDistance; horizontalDistance; delta: [string, string, string]; unitName; trueDistance; combinedFactorPpm; convergence; a: EndView; b: EndView; accuracy; exact: boolean }`, with `EndView = { station?: string; offset?: string; elevation?: string; snapKind?: string; tolerance: string }`.
  - **`measurementModel(a: SnapResult, b: SnapResult, measurement: Measurement): MeasureView`.** It gives display strings for the design distance and deltas (with the unit name), the true distance, the combined factor (as ppm), the convergence, the stations, offsets and elevations, and the accuracy, following the explorer DESIGN.md's "Copy and numbers" rules.

- [ ] **Step 1: Write the failing tests:**
  - **Exact snapping:**
    - a raw pick 0.4 ft from the centerline at station 31,000 (on the arc) snaps to the centerline exactly, giving `arc` and `stationOffset` offset 0 within 1e-9;
    - near a tick at 45,000 it gives `point` at exactly (45,000, ±35);
    - before the start, it gives the raw pick with no station.
  - **Checks:** a shown value inside its tolerance passes; one 2× outside fails; an absent one is `not-shown`.
  - **The measurement model:** for `answers.pairs[0]` (10,000 ft along the first tangent, on its +2% grade) it shows a horizontal design distance of "10,000.000 ftUS" and a 3D design distance of about "10,002.000 ftUS", each labelled, and the true distance in metres to the millimetre.
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests and confirm they pass.
- [ ] **Step 5: Commit** with "examples: design globe: exact snapping on the alignment, checks against the generator, the measurement model".

### Task 18: the page, the tilesets and the placement morph

**Files:**

- Create: `packages/next/examples/design-globe/main.ts`, `page.ts` and `panel/*.tsx`, as the approved mockup lays them out.
- Modify: `packages/next/examples/index.ts` (id `design-globe`, title "Design coordinates on the globe", `globe: "ellipsoid"`, `layout: "side"`).
- Test: `packages/next/test/designGlobePage.test.ts` (state model and params)

- [ ] **Step 1: Write the failing tests** for the page's state model:
  - the params `mode=rigid|reprojected`, `site=<id>` and `snap=exact|geometry|none` round-trip;
  - unknown values fall back to the defaults;
  - the loading states (PROJ, catalog, each grid with bytes, tiles) follow the order of events.
- [ ] **Step 2: Implement** to DESIGN.md and the approved mockup:
  - load PROJ and the `GridSource` (`/proj-grids/`) lazily, with progress;
  - add both corridor tilesets with `retainGeometry` and `georeferenceTileset` each;
  - make the switch a smooth morph between the placements (owner, 2026-11-07: the page's centrepiece, "really demonstrating the change in coordinate frames"), keeping the camera. Each vertex moves from its rigid to its reprojected position, partnered by call 15's identical tile ids and vertex order.
    - Prefer glTF morph targets written by the generator (the reprojected position as a target on the rigid tiles, in the rigid tile's frame) if the engine animates morph weights; otherwise the page builds the morph from both tilesets' retained geometry. Say which.
    - During the morph, a pick gives no design coordinates (the drawn geometry is between placements), and the HUD says so.
    - The other placement stays as a ghost (thin, translucent), a secondary visual for the before and after.
    - Reduced motion switches at once.
  - show the sag (`displayError`) under the cursor in rigid mode;
  - add the portfolio list, with a fly-to and each site's grid credits.
- [ ] **Step 3: Run** the tests, tsc, eslint and prettier.
- [ ] **Step 4: Browser check** on your own port. Both modes draw. A pick on each (Task 15 on the GPU) gives design coordinates within the stated pick tolerance of the vertex under the cursor. A portfolio site in London loads its OS grids from `/proj-grids/`, with byte progress.
- [ ] **Step 5: Commit** with "examples: design globe: the page, both corridor placements and the portfolio".

### Task 19: measure, snap and alignment readouts

**Files:**

- Create: `packages/next/examples/design-globe/measureTool.ts` and `panel/Measure.tsx`
- Modify: `packages/next/examples/design-globe/main.ts` and `page.ts` (wiring the tool in)
- Test: `packages/next/test/designGlobeMeasureTool.test.ts`

- [ ] **Step 1: Write the failing tests:**
  - the two-click state machine (first point, second point, reset with Escape);
  - the snap mode selects `ExactSnapService`, `ClientSnapService` or a plain `pickDesign`;
  - the deep link carries both design points.
- [ ] **Step 2: Implement:**
  - the measure tool, through `measure(a.design, b.design, …)`;
  - the readouts from `measurementModel`;
  - station, offset and elevation;
  - markers and the line on the globe, in the mockup's styles and drawn as the explorer draws its overlays;
  - keyboard operation.
- [ ] **Step 3: Run** the tests, tsc, eslint and prettier.
- [ ] **Step 4: Browser check** on your own port:
  - exact snapping gives `answers.pairs[0]` exactly;
  - geometry snapping lands within 1e-4 m;
  - the true distance is shown beside the design distance, labelled, never instead of it.
- [ ] **Step 5: Commit** with "examples: design globe: the measure tool with exact and geometry snapping".

### Task 20: checks, slots, reviews and browser checks

**Files:**

- Create: `packages/next/examples/design-globe/panel/Checks.tsx`
- Modify:
  - `packages/next/examples/design-globe/main.ts` and `page.ts` (the panel and "Copy link")
  - `packages/next/examples/design-globe/sites.ts` (only if the owner supplies the ion slots' values)

- [ ] **Step 1: Implement:**
  - the check panel from `checkRows`, comparing every value shown with the generator's answer;
  - the ion slots, drawn empty with what the application must supply (CRS, units, site transform, placement mode);
  - "Copy link".
- [ ] **Step 2: Run** two UX reviews on the most capable model: first against the mockup, then against the real page, in headless Chrome with Metal. Fix every Critical and Important finding.
- [ ] **Step 3: Browser checks** on your own port:
  - both modes and every site;
  - measuring in all three snap modes;
  - deep links and Back/Forward;
  - keyboard operation and contrast (AA);
  - reduced motion;
  - Slow 4G loading, and leaving mid-load;
  - missing store data (the one command to run);
  - a 502 from `/proj-grids/` (an error with Retry);
  - a token search: the ion token appears nowhere in the URL, storage, console or DOM.

  Screenshots go to `design-screenshots/` (git-ignored).
- [ ] **Step 4: Commit** with "examples: design globe: the check panel, ion slots, and review fixes".

### Task 21 (after the explorer's agents finish): the explorer's catalog groups, and explicit grids everywhere

**Files:**

- Create:
  - `packages/next/examples/frames-explorer/stress/groups/global-geoids.ts`
  - `packages/next/examples/frames-explorer/stress/groups/tileset-placement.ts`
- Modify:
  - `packages/next/examples/frames-explorer/stress/stressGroups.ts`
  - `packages/next/examples/frames-explorer/fingerprints.json` (new cases only)
  - every `test/data` file that calls `loadProj` without `grids` (find them with `grep -l "loadProj(" test/data`; at the plan's writing: `crs`, `proj`, `boundCrs`, `designMeasure`, `engineeringFrame`, `factors`, `framesExplorer`, `framesExplorerScenarios`, `framesExplorerOverlays`, `framesExplorerProtocol`, `framesExplorerVehicles`, and 4b's new data tests), each passing explicit `grids`
  - `packages/next/src/engineering/projNode.ts` (remove the legacy default)

- [ ] **Step 1: Write the groups:**
  - **global-geoids:** one result per `geoids.json` case, against its published reference. A `missingReference` case is reported as "no published reference", never as a pass;
  - **tileset-placement:** for the BIM site, the rigid inverse is exact, the reprojected round trip holds, and the sag at 20 km matches the hand formula.
- [ ] **Step 2:** Pass explicit `grids` in the explorer's data tests, remove the Node legacy default (call 5), and confirm Node now sees exactly the grids listed.
- [ ] **Step 3: Run** `npm run test:data`. The existing results, against the count and fingerprints recorded at this task's start, are unchanged, and the new results pass. Check the catalog's "Run all" in the browser on your own port.
- [ ] **Step 4: Commit** with "examples: frames explorer: global geoid and tileset placement groups; explicit grids on both platforms".

### Task 22: Docs, the plan note, the final gates and Snyk

**Files:**

- Modify:
  - `packages/next/README.md`
  - `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document:
  - grids, the catalog trust root, `GridSource` and its layout, and `/proj-grids/`;
  - `EngineeringFrame.load`, the fallbacks, depth axes and tidal datums;
  - placement modes and `georeferenceTileset`;
  - `pickDesign`, `SnapService` and the pick term;
  - **"Proposed: `EXT_engineering_frame`"**: its JSON shape, how it builds on `EXT_geospatial_crs`, and what the draft lacks (the placement mode, the site scale, alignments);
  - the PROJ-data credits and licenses.
- [ ] **Step 2: Plan note** in §13.14, "Frames 4b results":
  - the measured agreements (round trips, sag, geoid cases against their references, snapping);
  - the calls made, one line each;
  - the held items;
  - a "Carried forward" list of the real deferred work from this plan's ledger, without nits, written before the ledger is deleted.

  Mark the 4b items in the earlier lists as done or folded, naming the task. Include `frameCache`, which commit e9f362f3a5 already closed.
- [ ] **Step 3: Gates:**
  - `npx tsc --noEmit -p .`, `npx eslint .`, `npx prettier --check .`;
  - `npm test` and `npm run test:data`;
  - `npm run build` and `npm run build:lib`;
  - `snyk_code_scan` on `src/engineering`, `src/streaming`, `src/measure`, `src/io`, `src/scene`, `scripts/projGrids.mjs`, `scripts/verifiedDownload.mjs`, `scripts/gridSets.mjs`, `scripts/designTiles*`, `scripts/frameData.mjs`, `scripts/setup.mjs` and `examples/design-globe`.

  Fix new findings and rescan until clean. Record the pre-existing findings.
- [ ] **Step 4: Commit** with "Plan: frames 4b results".
