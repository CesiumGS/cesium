# Frames 5c: The Second Body Implementation Plan

**Before starting (2026-11-09):** the file split, its second pass and the sky and observer work landed after this plan was written. Check paths by symbol, and read "What other plans need" in `docs/superpowers/plans/2026-11-08-sky-and-observer.md`, which lists what changes here.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner chose subagent-driven execution: a fresh implementer per task, a fresh reviewer after each, and a whole-branch review at the end.

**Goal:** Put the Moon's content in one world with the Earth's: every Earth-only path takes its body from the content it serves, the Moon draws as an impostor that hands over to its tileset by level of detail with no hole and no jump, Cesium Moon is declared and fetched lazily from ion only when the camera nears the Moon, two views of one world can stand on two bodies, and depth is right across bodies, while every Earth-only scene renders the same pixels.

**Architecture:**

- **Content takes its body.** A tileset's body comes from its options, its `3DTILES_ellipsoid` or its anchor, and its volumes, horizon culling and selection camera use that body's ellipsoid in that body's anchor. Clamping, models, point sources and picks do the same. The globe, vector layers and terrain clipping stay the Earth's.
- **A view on another body.** A view whose body is the Moon shades in the Moon anchor's axes (5a's shading axes); its sun, stars and Moon inputs are turned into those axes per view, in float64, until 5e makes the sky per body.
- **Depth across bodies.** True depth already orders bodies. The bare ellipsoid globe is the exception: it draws as an underlay at 2⁻⁶⁴ of its depth. Content on a body that lies behind the underlay's body takes the same scale, per view and anchor, so it stays behind.
- **The impostor is the body's coarsest level of detail.** A CPU model per body decides, per view, whether the impostor draws whole, draws as a floor under a loading tileset, or is off. It is the virtual parent of the body's *surface* tilesets: they select nothing in a view until its screen-space error passes the threshold. A GPU pass in the opaque pass ray-casts the impostor's ellipsoid at its true distance, with the sky's own pixel composition, so from the Earth's ground the Moon looks as it does today.
- **Declared, lazy, ion.** `engine.declareTileset` holds a source function and no tileset. The first refinement in any view calls it (for ion, the endpoint request), then loads the tileset. Failures keep the impostor and give one warning naming the cause. A 401 refreshes the ion endpoint's short-lived token once and retries.
- **One material.** Surface tiles on the Moon are shaded by the impostor's Lommel–Seeliger function, normalised the same way, so the handover has no brightness jump. 5e swaps the function for Hapke's.
- **The Viewer opts in.** `moon: "impostor"` (default, no ion), `"ion"` (Cesium Moon declared), a tileset of the application's, or `false`. Credits follow what draws.

**Tech Stack:** TypeScript (float64 on the CPU), Slang compiled to checked-in WGSL (`npm run shaders`), WebGPU, Vitest, Playwright (`bench/run.mjs`), the Vite dev server for check pages. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 10 (sub-plan 5c) and its done-when list, with sections 5 to 8 for terms and 5a's seams, section 12 for what 5e expects, and section 14 for what 5g expects. **Builds on:** `docs/superpowers/plans/2026-11-07-frames-5a-core-and-camera-chain.md` and `docs/superpowers/plans/2026-11-07-frames-5b-frames-library.md`; every 5a and 5b name below is those plans' Interfaces blocks'.

**Base:** the commit that closes 5b (its Task 13, "Plan: frames 5b results"). If an executed 5a or 5b name differs from its plan, follow `api/surface.txt` and the code, and say so in the task's commit message. Other agents share this checkout: each task starts with `git status` for the files it will change and waits for the owner of any uncommitted edit.

## Calls made by this plan

Each is marked "(plan's call)" where it is used. One line each, then what undoing it costs.

1. **A tileset's body** is `TilesetOptions.body`, else its `3DTILES_ellipsoid`, else its `anchor`'s body, else the Earth. Any two of these that disagree are refused at load with `TilesetBodyError`, naming both. *Undo:* the precedence.
2. **The core reads `3DTILES_ellipsoid`** (`src/streaming/tilesetBody.ts`), before tile volumes are built; the proj entry's declaration reader calls it. `body: "none"` means no body. An external tileset inherits its parent's body. *Undo:* a reader move.
3. **Volumes and horizon culling take an ellipsoid,** defaulting to WGS 84, so today's callers get today's numbers. `SelectionView.ellipsoid` is the selection anchor's body's. *Undo:* parameters.
4. **A tileset under an anchor with no body** (a trajectory's) gets no horizon culling, and region volumes in it are refused, naming the tile. *Undo:* one rule.
5. **Earth-only by design:** the globe (terrain and the bare ellipsoid), vector layers (GeoJSON is WGS 84 by RFC 7946), terrain clipping, and `measure`'s station code. Each refuses a non-Earth anchor, naming it. Controllers are 5d's. *Undo:* per module.
6. **Clamping's body is its content's anchor's:** rays are cast in that anchor, against its collision tilesets, and against the globe only on the Earth. *Undo:* one option.
7. **A pick names its body:** `CorePick.body` (the hit anchor's), and `CorePick.impostor` when the hit is an impostor. *Undo:* additive fields.
8. **Sky inputs are turned into each view's shading axes** per view, in float64, from 5a's Earth-anchor axes (5a call 30). 5e replaces this with a sky per body. *Undo:* one function.
9. **Content behind an underlay's body takes the underlay's depth scale,** per view and anchor: a body anchor whose bounding sphere lies across the separating plane from the underlay body's, away from the eye; an anchor with no body whose origin the underlay body's ellipsoid hides from the eye. The scale rides in `AnchorEye.eyeLo.w` (1 by default). *Undo:* one lane and one function.
10. **Only the Moon has an appearance in 5c** (`Body.appearance`). The impostor is generic; the Earth's look from far away is mostly its air, which is 5e's. *Undo:* data.
11. **The impostor's geometric error** is the larger of the body's relief (`max(|terrainBand.min|, terrainBand.max)`, 10,800 m for the Moon, from 5b) and its map's texel size (2π × maximum radius ÷ map width). Its distance is the eye's from the sphere of radius maximum radius + `terrainBand.max`, at least 1 m. *Undo:* two formulas.
12. **The handover threshold** is the surface tileset's maximum screen-space error × `errorBias`, with `errorBias` 0.25 by default: the impostor's error sits at the limb, where the eye sees it, and its map's texels grow past two pixels soon after. Once refined in a view, it stays refined until its error falls below 0.9 × the threshold. *Undo:* two constants.
13. **Only surface tilesets refine from an impostor** (`TilesetOptions.surface: true`, under the body's own anchor). Other content on the body draws by its own screen-space error. *Undo:* one option.
14. **Impostor states per view:** `"full"` (not refined, or no surface tile drew in the view last tick), `"floor"` (a surface tile drew: the impostor shrinks to `terrainBand.min − 100 m` and fills only holes), `"off"` (mode `"tileset"`, off screen, or the eye inside the floor sphere). *Undo:* a state machine.
15. **A declared tileset loads** at its body's impostor's first refinement in any view, or at `load()`. A failure is not retried on its own; `retry()` tries once more. *Undo:* one trigger.
16. **ion failures by kind:** no token is `"noToken"`, found before any request; 401 `"unauthorized"`; 403 `"forbidden"`; 404 `"notFound"` (the asset isn't in the account's My Assets); anything else `"network"`. A wrong asset type is `"unsupported"`. *Undo:* a table.
17. **A 401 on content refreshes the headers once,** shared by every 401 in flight, and retries each request once, for 3D Tiles and terrain. *Undo:* one wrapper.
18. **The impostor pass** draws a full-viewport triangle scissored to the impostor's projected bounding sphere, in the opaque pass after the splats and before the sky, with no shader loop. *Undo:* where it sits.
19. **The impostor's colour is the sky's own pixel composition,** with the impostor's disk sample, blended by coverage (premultiplied over what is drawn), and depth written where the coverage is at least ½. The sky's disk, which still draws where nothing wrote depth, is placed from the impostor's anchor, so a limb against the sky is today's pixels. *Undo:* shader structure.
20. **Impostor pick ids** are a reserved range above every world feature id: `IMPOSTOR_FEATURE_BASE = 0xffff_ff00` plus the anchor's slot. *Undo:* a constant.
21. **A world without a Moon impostor keeps today's sky disk** from `engine.moonPosition` and `engine.moonAxes`, so an application that sets them keeps its pixels. *Undo:* the legacy path.
22. **Regolith shading on surface tiles:** one regolith body per world in 5c (a second is refused, naming it), each surface's albedo normalised by its source's mean (`TilesetOptions.albedoMean`, else the impostor map's), no sky light on it, and earthshine as a flat term, as on the impostor. *Undo:* one material branch.
23. **`CESIUM_MOON_ALBEDO_MEAN`** is measured once from `loadIonMoonMap(…).mean` at level 2 and recorded in `src/io/moonMap.ts` with its date. *Undo:* a constant.
24. **The Viewer's Moon:** `moon?: boolean | "impostor" | "ion" | TilesetSource` (`true` is `"impostor"`, the default; `false` is none), and `moonMap?: "bundled" | "ion"` (default `"bundled"`: 1.x's `moonSmall.jpg`; `"ion"` is today's composed map, an ion request at start the application asks for). *Undo:* option shapes.
25. **Credits that follow what draws:** `addAttributions(owner, attributions, { shown?: () => boolean })`, with `Tileset3D.drawing`, `DeclaredTileset.drawing` and `Impostor.drawing` (drawn in some view last tick). *Undo:* one predicate.
26. **The Viewer's camera operations move the rig to the content's body-fixed frame** (`zoomTo`, `flyTo`, framing) and back to ITRF for Earth content, when the Viewer has its catalog. *Undo:* local.
27. **A split view on a body:** `viewer.setSplit(on: boolean, options?: { body?: Body })`; `split = true` keeps today's Earth split. *Undo:* one method.
28. **A view link's body is its source view's:** follow copies the pose in that body's anchor; the footprint lies on that body's ellipsoid. *Undo:* local.
29. **`Viewer.place()` is undefined off the Earth,** so the time controls fall back to UTC there. *Undo:* one guard.
30. **One check page, `spikes/bodies.html`,** grown by Tasks 4, 7, 8 and 10, with `runBodies(group)` on `globalThis`. *Undo:* a page.
31. **Ports:** Task 4 checks on 5191, Task 7 on 5192, Task 8 on 5193, Task 9 on 5194, Task 10 on 5195, Task 11 on 5196. *Undo:* none.
32. **The ion probe is an opt-in data test** (`ION_PROBE=1`) that reads the token from `.env.local` itself and prints only statuses. *Undo:* a test.

## Rulings on the spec

Places where the spec, read against the code and the 5a and 5b plans, is contradictory, can't be built as written, or needs something neither plan produces, and what this plan does.

1. **"The Earth and the Moon share one depth range"** (section 10.3). True depth does, but the Viewer's default globe, the bare ellipsoid, is an underlay drawn at 2⁻⁶⁴ of its depth (`RecordFlags.underlay`, `UNDERLAY_DEPTH`), so anything at true depth draws in front of it: a Moon below the ellipsoid's horizon would show through the ground. *Ruling:* call 9. Content in the underlay's own anchor keeps today's rule, so Earth parity holds.
2. **"The ion resource layer refreshes the endpoint's short-lived access token, as it does for other ion assets"** (section 10.4). Nothing refreshes today: `resolveIonAsset` caches the endpoint for 45 minutes, and a loaded tileset keeps the headers it was given. *Ruling:* call 17, for 3D Tiles and terrain.
3. **"The Viewer's default is the impostor only: no token, no download"** (section 10.4) and the anti-goal of ion traffic in a globe-only app (section 3). Today the Viewer composes the Moon's map from Cesium Moon Terrain's tiles (`loadIonMoonMap`) whenever a token is set. *Ruling:* call 24: the default map is the bundled one; the ion map is its own opt-in.
4. **"A tileset on that body refines from it"** (section 10.4). Read literally, a lunar lander's own tileset would vanish until the camera came within about 2,000 km. *Ruling:* call 13: a body's surface tilesets refine from its impostor; other content is ordinary.
5. **"Both use the same reflectance model … and the same exposure"** (section 10.4) against 5e owning the Moon's material (section 12.2). Tiles today go through the engine's physically based path, which would jump in brightness at the handover. *Ruling:* call 22: 5c gives surface tiles the impostor's Lommel–Seeliger function, which section 10.4 allows; 5e replaces that one function with Hapke's for both.
6. **"One tile cache and one budget across bodies"** (section 10.2). Each tileset has its own cache budget today (`TilesetOptions.cacheBytes`) and every tileset shares the engine's request scheduler. *Ruling:* read as "nothing per body": 5c adds no per-body cache or budget. A single budget across tilesets is renderer work outside 5c, recorded as carried forward.
7. **"The same works for any body: the Earth seen from far away without a globe"** (section 10.4). The impostor is built for any body with an appearance, but the Earth's look from far away is mostly its atmosphere, which 5e builds. *Ruling:* call 10.
8. **Sky inputs for a view on the Moon.** 5a keeps the sky's inputs in the Earth anchor's axes (5a call 30) and shades each view in its body anchor's axes (5a call 18), so a view on the Moon would get the sun from the wrong axes. *Ruling:* call 8.
9. **The body must be known before tile volumes are built,** but 5a moved the declaration parser out of the core (5a call 7). *Ruling:* call 2.
10. **Section 18 asks that Cesium Moon's access be checked before the handover is built.** *Ruling:* Task 6's probe (call 32) records what ion's endpoint returns for a good token and a bad one. The case "the asset isn't in My Assets" can be seen only from an account without it; if the owner's account has it, the 404 mapping stays the plan's reading and is listed for the owner.
11. **"The impostor … sits at infinity behind everything, placed from the sky inputs"** is also a public API today (`engine.moonPosition`, `engine.moonAxes`). *Ruling:* call 21.

## Global Constraints

Copied from 5a's and 5b's plans where they apply, with 5c's additions.

- **Precision** (spec section 4): "Float64 on the CPU throughout. The GPU sees only camera-relative values (hi/lo and camera-relative, §13.15). Hi/lo is valid to ±2³¹ m (about 2.1 million km), which covers Earth to Moon." Nothing large is ever rotated in float32; the impostor is ray-cast in its body's scaled space with the eye-relative offset form `moonDisk` uses, so no large values cancel.
- **Earth-only scenes are unchanged:** "The parity pages, the bench gate and every test keep passing. A globe-only scene renders the same pixels before and after." This holds after every task, not only at the end. The gates are 5a's call 46: `parity`, `models`, `tileset`, `customShader`, `translucency`, `tracks` and `imagery`, plus `globe`, `heights` and `lod` with a token; the bench gate is `alloc`.
- **Cost rule:** per-view work grows with the number of anchors and impostors, not the number of draws or tiles.
- **Pay for what you use.** A globe-only Viewer downloads nothing new and **makes no request for the Moon to ion** (no endpoint call, no tile), with or without a token. Its per-tick work for the Moon is what the sky's Moon costs today. **The library never adds ion content or contacts ion on its own:** only the application, or the Viewer on its say-so, declares ion assets, and a declared asset is fetched only when the camera nears its body.
- **No ion tokens** anywhere in code, logs, URLs, reports, screenshots, storage or the DOM. Errors name the cause, never the token. Examples get it from Dyno's `ionToken()` (`bench/suite/ionToken.ts`) or the `ExampleContext.accessToken` the gallery resolved; check pages from `ionToken()`.
- **The dependency rule** (spec section 7.7): the core imports nothing from `frames`, `proj` or `measure`, and nothing from `time`. `frames` imports `time` and core types only. The Viewer and the widgets may import `time` without `frames`. 5a's `test/importBoundary.test.ts` enforces it; every new file in this plan is core unless it says otherwise.
- **Browser only.** No server-side computation. Data lives outside the repo (`~/.cesium-bench/…`, `FRAMES_DATA_DIR`). Nothing new is committed or shipped.
- **Examples are documentation:** public API only; where an example or check page reaches past it, record it for 5i in the task's commit message.
- **Repository practice:**
  - Commands run in `packages/next`.
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Other agents share this checkout. Commit only your task's files, by path (`git add -- <paths>` then `git commit -m "…" -- <paths>`). Check `git diff --cached --name-only` first. Never `git add -A`, `git stash`, `git checkout`, `git reset` or `git push`. While `.git/index.lock` exists, wait and retry.
  - Slang for engine shaders (`src/**/*.slang`), compiled by `npm run shaders`. Never edit generated output; `npm run shaders:check` must pass.
  - Node 24 (`engines`).
- **Testing cadence per task:** the task's focused tests (`npx vitest run <files>`; data tests `FRAMES_DATA=1 npx vitest run test/data/<file>`), `npx tsc --noEmit -p .`, and `npx eslint` and `npx prettier --check` on the changed files. A task that changes `World`, `View`, `Engine`, `Tileset3D`, `Sky` or the Viewer also runs `npm test`. A task that changes `src/frames`, `src/engineering` or `src/measure` also runs `npm run test:data`.
- **The surface map:** every task that changes an entry point's exports runs `npm run surface` and commits `api/surface.txt` with its code. The reviewer reads `git diff -- api/surface.txt` as the task's surface diff.
- **GPU safety:**
  - Node tests first (`test/fakeGpu.ts`'s `fakeEngine`). A task says when it needs a browser check.
  - A browser check uses one small page at a time, on the port its task names (5191 to 5197), with the task's own server: `npx vite --port <port> --strictPort`, started in the background and stopped afterwards, or `BENCH_URL=http://127.0.0.1:<port> node bench/run.mjs <one suite>`. **Never** use, restart or stop the server on 127.0.0.1:5190.
  - Every shader loop is bounded by a constant (`for (uint i = 0u; i < CONSTANT; i++)` with an early `break`). The impostor pass adds none. Each changed shader's Metal is read with `node scripts/dumpMsl.mjs <module.wgsl> <entry>` before its first browser run.
- **Snyk:** each task runs `snyk_code_scan` on the first-party files it adds or changes before it commits, fixes what the scan finds in its own code, and rescans until clean. Findings that predate 5c are reported, not fixed.
- **Wording:**
  - "Frame" is never used alone: a *reference frame*, a *tick* ("per tick", never "per frame"), *render space*, *render root*, *a draw's placement*. Compounds that can't be misread keep their names (the frame tree, the frames module, a body-fixed frame). Code names (`Frame`) keep theirs.
  - House style for docs, comments and UI text: plain, short sentences, units and datums named, no e-notation in prose.
  - Describe the purpose in generic words ("an embeddable rendering core", "a host application's own services").

## Review Focus

1. **The eye at or inside a body:** underground on the Moon, a few metres above Cesium Moon's surface, or inside the impostor's floor sphere. The impostor is off, no pass draws a full-view fill, the surface tiles still select and draw, and horizon culling with the eye below the ellipsoid culls nothing it shouldn't. Tests: Tasks 1 and 5.
2. **A camera hovering at the handover threshold, or two views on opposite sides of it:** no flicker tick to tick (the 0.9 hysteresis), one view refining never makes the other view draw or request surface tiles, and the declared tileset's source is called once however many views cross in one tick. Tests: Tasks 5 and 6.
3. **ion access that fails, then changes:** a token pasted after the warning, a token that expires an hour into a session, or a 401 burst across many tiles. One warning per failure, no request loop, `retry()` tries once, one refresh serves every 401 in flight, and no message carries the token. Tests: Task 6.
4. **Declarations that disagree:** a tileset whose `3DTILES_ellipsoid` names the Moon given `body: EARTH` or an Earth anchor, a surface tileset under an anchor that isn't its body's, region volumes with `body: "none"`. Each is refused with an error naming both sides, and nothing is drawn on the wrong ellipsoid. Tests: Tasks 1 and 5.
5. **The bare ellipsoid globe with another body behind it, beside it, or with the eye between them:** the Moon setting behind the ellipsoid's horizon from the ground, Earthset from beyond the Moon, a spacecraft passing behind the Earth. Content behind the underlay's body stays behind it and content in front stays in front, at every eye position, with no flicker at the limbs. Tests: Tasks 4 and 10.

---

## File structure

New files, by responsibility (modified files are listed in each task):

- **A tileset's body:** `src/streaming/tilesetBody.ts` (the core `3DTILES_ellipsoid` reader, `TilesetBodyError`).
- **Views on bodies:** `src/scene/viewSky.ts` (sky inputs per view), `src/scene/anchorDepth.ts` (depth scales per view and anchor).
- **Impostors:** `src/scene/Impostor.ts` (the CPU model: error, thresholds, states, the virtual parent), `src/atmosphere/impostor.slang` and `src/atmosphere/Impostors.ts` (the GPU pass, with the sky's resources), `src/atmosphere/regolith.slang` (the shared material).
- **Declared tilesets:** `src/streaming/DeclaredTileset.ts`; `IonAssetError` and `ionTilesetSource` in `src/io/ion.ts`; `src/streaming/refreshHeaders.ts` (the 401 wrapper).
- **Checks:** `spikes/bodies.html`, `spikes/bodies.ts`.

Where each of today's 21 files naming `Ellipsoid.WGS84` lands (the spec counted 24 once 5a's and 5b's files are in):

| File | In 5c |
| --- | --- |
| `src/streaming/volumes.ts`, `Stepwise.ts`, `debugVolumes.ts`; `src/math/horizon.ts` | Task 1 |
| `src/scene/Engine.ts` (selection's cartographic, `sampleHeightMostDetailed`, height captures) | Tasks 1 and 2 |
| `src/scene/HeightClamping.ts`, `gltfModel.ts`; `src/vector/PointSource.ts` | Task 2 |
| `src/scene/ViewLink.ts`, `widgets/Viewer.ts`, `widgets/orbitFocus.ts` | Task 9 |
| `src/scene/Body.ts` | the Earth's own definition |
| `src/globe/*.ts`, `src/io/features.ts`, `src/measure/lightTime.ts` | Earth only (call 5) |
| `src/scene/GlobeController.ts`, `InspectController.ts`, `OrbitController.ts`, `Camera.ts` | 5d (`Camera.lookAt` already takes an ellipsoid) |

---

### Task 1: Volumes, horizon culling and selection on the content's body

**Files:**

- Create: `src/streaming/tilesetBody.ts`, `test/tilesetBody.test.ts`
- Modify: `src/math/horizon.ts`, `src/streaming/volumes.ts`, `src/streaming/Stepwise.ts`, `src/streaming/Budgeted.ts`, `src/streaming/debugVolumes.ts`, `src/streaming/Tile.ts` (`loadTilesetJson` reads the body first), `src/streaming/Tileset3D.ts`, `src/scene/Engine.ts` (`selectionViews`), `src/engineering/georeference.ts` (`readEllipsoid` calls the core reader), `src/index.ts`, `api/surface.txt`
- Test: `test/tilesetBody.test.ts`, `test/volumes.test.ts`, `test/horizon.test.ts` (each existing or new as the code has them)

**Interfaces:**

- Consumes: 5a's `World.bodyAnchor(body)`, `AnchorHandle.body`, `TilesetOptions.anchor`, `Tileset3D.anchor`, selection views per anchor (5a call 21); `EARTH`, `MOON`.
- Produces:
  - `src/streaming/tilesetBody.ts` (plan's call 2):
    - `class TilesetBodyError extends Error { readonly path: string; readonly reason: string }`;
    - `tilesetBody(extensions: unknown, bodies?: readonly Body[]): Body | null | undefined`: `3DTILES_ellipsoid`'s body, by its radii within 0.01 m per axis of a known body's (default `[EARTH, MOON]`) and its `body` name if given; `null` for `"none"`; `undefined` without the extension. Other radii, or a name naming another body, throw `TilesetBodyError` with today's wording from `georeference.ts`.
  - `TilesetOptions.body?: Body | null` and `Tileset3D.body: Body | undefined` (plan's call 1). The precedence and the refusal are call 1's; an explicit `anchor` whose `body` differs from the resolved body throws `TilesetBodyError` naming `anchor` and the other source. Without `anchor`, the tileset hangs under `world.bodyAnchor(body)`.
  - `horizon.ts`: `horizonCullingPoint(direction, positions, minimumHeight, radii?: ArrayLike<number>)` and `isScaledSpacePointVisible(camera, occludee, minimumHeight, radii?)`, `radii` defaulting to WGS 84's (plan's call 3).
  - `volumes.ts`: an `ellipsoid: Ellipsoid = Ellipsoid.WGS84` last parameter on `obbFromRectangle`, `regionFromJson`, `volumeFromJson`, `volumeOccludee` and `aboveHorizon`. `aboveHorizon(tile, camera, ellipsoid?)`; the cached occludee stays keyed by the volume (a tile's ellipsoid never changes).
  - `SelectionView.ellipsoid?: Ellipsoid`: the selection anchor's body's. `cartographic` is on it; without a body, `cartographic` is `{ longitude: 0, latitude: 0, height: |position| }` and `Budgeted` skips horizon culling (plan's call 4). `Stepwise`'s module-level ellipsoid becomes `view.ellipsoid ?? Ellipsoid.WGS84`.
  - `loadTilesetJson` takes `body?: Body | null` (resolved by call 1 before any tile is built), builds every volume on its ellipsoid, and refuses a region volume when the body is `null`, naming the tile's path. An external tileset inherits its parent's body; its own `3DTILES_ellipsoid`, if it disagrees, adds one warning and is ignored.
  - `georeference.ts`'s `readEllipsoid` is `tilesetBody` plus its own refusal of `"none"`; its messages and the proj tests are unchanged.

- [ ] **Step 1: Write the failing tests:**

```ts
it("WGS 84 is the default: today's volumes, occludees and selection views exactly", () => {
  expect(regionFromJson(R)).toEqual(regionFromJson(R, Ellipsoid.WGS84));
  expect(volumeOccludee(V)).toEqual(volumeOccludee(V, Ellipsoid.WGS84));
  // and the Earth anchor's selection view equals the one built before this task (toEqual)
});
it("reads a region on the Moon's sphere", () => {
  const r = regionFromJson([0, 0, 0.1, 0.1, 0, 1000], Ellipsoid.MOON);
  expect(v3.length(r.southwestCorner)).toBeCloseTo(1_738_400, 6);
});
it("culls the Moon's far side against the Moon's limb", () => {
  const far = tileOf(regionFromJson([Math.PI - 0.1, -0.1, Math.PI, 0.1, 0, 1000], Ellipsoid.MOON));
  const near = tileOf(regionFromJson([-0.1, -0.1, 0.1, 0.1, 0, 1000], Ellipsoid.MOON));
  const eye = v3.vec3(1_737_400 + 10_000_000, 0, 0);
  expect(aboveHorizon(far, eye, Ellipsoid.MOON)).toBe(false);
  expect(aboveHorizon(near, eye, Ellipsoid.MOON)).toBe(true);
});
it("an eye below the Moon's ellipsoid culls nothing it can see", ...);   // Review Focus 1: eye at radius − 500 m, tile overhead: true
it("a tileset declaring the Moon hangs under the Moon's anchor", async () => {
  const t = await stubTileset({ extensions: { "3DTILES_ellipsoid": { body: "Moon", radii: [1737400, 1737400, 1737400] } } });
  expect(t.body).toBe(MOON);
  expect(t.anchor).toBe(world.bodyAnchor(MOON));
});
it("refuses a body option or an anchor that disagrees with 3DTILES_ellipsoid, naming both", async () => {  // Review Focus 4
  await expect(stubTileset(moonJson, { body: EARTH })).rejects.toThrow(/3DTILES_ellipsoid.*body|body.*3DTILES_ellipsoid/);
  await expect(stubTileset(moonJson, { anchor: world.bodyAnchor(EARTH) })).rejects.toThrow(/anchor/);
});
it("refuses region volumes in a tileset with no body, naming the tile", ...);  // Review Focus 4: body "none"
it("the Moon anchor's selection view is on the Moon's ellipsoid", () => {
  // cartographic.height = |eye in the Moon anchor| − 1,737,400 within 1e-6 m; ellipsoid === Ellipsoid.MOON
});
it("an anchor with no body gets no horizon culling", ...);
```

  `stubTileset` is `test/tilesetPlacement.test.ts`'s stubbed harness, moved to a shared helper if it isn't one already.

- [ ] **Step 2: Run** them and confirm they fail.
- [ ] **Step 3: Implement** `tilesetBody.ts` (moving `readEllipsoid`'s checks from `georeference.ts`), then `horizon.ts` and `volumes.ts`, then `loadTilesetJson` and `Tileset3D`, then `selectionViews`, `Stepwise`, `Budgeted` and `debugVolumes`.
- [ ] **Step 4: Run** the tests, `test/tilesetPlacement.test.ts` and the georeference tests unchanged, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "streaming: tile volumes, horizon culling and selection on the content's body; the core reads 3DTILES_ellipsoid".

### Task 2: Clamping, heights, models, point sources and picks per body

**Files:**

- Modify: `src/scene/HeightClamping.ts`, `src/scene/Engine.ts` (`sampleHeightMostDetailed`, `addHeightCapture`, `addTerrain`, `addEllipsoid`, picks), `src/scene/gltfModel.ts`, `src/vector/PointSource.ts`, `src/vector/VectorLayer.ts` (the refusal), `src/scene/pick.ts`, `src/frames/pickInterpreter.ts`, `src/index.ts`, `api/surface.txt`
- Test: `test/bodyContent.test.ts`, `test/framesPick.test.ts`

**Interfaces:**

- Consumes: Task 1's `Tileset3D.body`; 5a's `PlacementOptions.anchor`, `PointSourceOptions.anchor`, `addHeightCapture`'s `anchor`, `CastOptions.anchor`, `CorePick`, `createFramesPickInterpreter`, `FramedPoint`, `FrameCatalog.bodyFixed`.
- Produces:
  - `ClampOptions.anchor?: AnchorHandle` (default the Earth's): positions are geodetic on its body's ellipsoid; rays are cast with `anchor` against that anchor's collision tilesets, and against the globe only when the body is the Earth (plan's call 6). An anchor with no body refuses `heightReference` other than `"none"`, naming the anchor.
  - `sampleHeightMostDetailed(world, positions, options?: { tilesets?: readonly Tileset3D[]; body?: Body })`: on `body`'s ellipsoid (default the Earth), its rays in `world.bodyAnchor(body)`.
  - A model's `place({ at, anchor })` and a point source's ENU axes are built on the anchor's body's ellipsoid; a height capture's ENU on its anchor's body.
  - `addTerrain`, `addEllipsoid` and `new VectorLayer` refuse an anchor whose body isn't the Earth, naming it and saying why (plan's call 5).
  - `CorePick.body: Body | undefined`: the hit anchor's body (plan's call 7). The frames interpreter's `FramedPoint.frame` is `catalog.bodyFixed(body)` for a hit on a body anchor: MOON_ME on the Moon, ITRF on the Earth.

- [ ] **Step 1: Write the failing tests** (`fakeEngine`, the stubbed tileset harness):
  - a clamped model at (10° E, 20° N) under the Moon's anchor casts its rays with `anchor: world.bodyAnchor(MOON)`, from 10,000 m above the Moon's ellipsoid along its normal there, against Moon collision tilesets only, and never against the globe;
  - `sampleHeightMostDetailed(world, [p], { body: MOON })` casts in the Moon's anchor; with no body it casts as today (rays `toEqual` today's);
  - a model placed at (10° E, 20° N, 0 m) under the Moon's anchor sits at `Ellipsoid.MOON.cartographicToCartesian(…)` within 1 × 10⁻⁶ m; a point source's up axis there is the Moon's normal;
  - `addTerrain`, `addEllipsoid` and a vector layer under the Moon's anchor each throw, naming the anchor and "the Earth";
  - a pick on Moon content: `pick.body === MOON`; through the frames interpreter, `point.frame.name === "MOON_ME"` and `point.bodyFixed` equals `pick.anchorPosition`; on Earth content, ITRF and the Earth, as before.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `test/heightClamping*.test.ts` and `test/corePick.test.ts` unchanged, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "scene: clamping, heights, models, point sources and picks take their body from their anchor".

### Task 3: A view on another body

**Files:**

- Create: `src/scene/viewSky.ts`, `test/viewOnBody.test.ts`
- Modify: `src/scene/Engine.ts` (the view block's sky inputs, `environmentFrame` with the view's body, `updateEnvironment`, `moonFrom`), `src/atmosphere/Sky.ts` (`write` takes per-view inputs), `src/scene/View.ts` (doc of `body`)

**Interfaces:**

- Consumes: 5a's shading axes (call 18), `view.bodyAnchor`, `view.anchorPlacement`, the engine's internal `bodyCamera(view)`, the sky inputs in the Earth anchor's axes (`engine.sunDirection`, `icrfToFixed`, `moonPosition`, `moonAxes`).
- Produces:
  - `viewSkyInputs(view: View, engine: Engine, out: ViewSkyInputs): ViewSkyInputs` in `src/scene/viewSky.ts` (plan's call 8), `interface ViewSkyInputs { sunDirection: Float64Array; icrfToShading: Float64Array; moonPosition?: Float64Array; moonAxes?: Float64Array }`: the engine's inputs turned, in float64, from the Earth anchor's axes into the view's shading axes by the rotation part of `anchorPlacement(view.bodyAnchor)⁻¹ · anchorPlacement(earthAnchor)`, and the Moon's position re-expressed in the view's body anchor. For a view on the Earth it returns the inputs unchanged (identical floats). A view on the Moon has no Moon in its sky.
  - The view block's `sunDirection`, star rotation, `iblFrame` (`environmentFrame(camera, view.body.ellipsoid)`), `bodyRadii` and the sky's `write` read them. A view whose body has no atmosphere draws no sky (as today) and throws nothing.

- [ ] **Step 1: Write the failing test** (`fakeEngine`, the core's table resolver, the Moon's anchor placed by hand 384,400 km away and turned 0.4 rad about Z):
  - a view on the Moon (`addView({ body: MOON })`, rig on `world.bodyAnchor(MOON)`): its block's `sunDirection` equals R · `engine.sunDirection` within float32 rounding, its star rotation R · `icrfToFixed`, its `bodyRadii` the Moon's, and its `iblFrame` the Moon's ENU at the camera;
  - an Earth view in the same world: every float of its block equals a world without the Moon view;
  - the Moon view renders a tick with no thrown error and no sky pass;
  - the Earth's tilesets' selection view for the Moon view is that view's camera in the Earth's anchor (5a's per-anchor selection).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Commit** with "scene: a view on another body shades in its own axes, with the sun and stars turned there".

### Task 4: Depth across bodies

A browser check (port 5191).

**Files:**

- Create: `src/scene/anchorDepth.ts`, `test/anchorDepth.test.ts`, `spikes/bodies.html`, `spikes/bodies.ts`
- Modify: `src/scene/anchorEyes.ts` (writes the scale), `src/shaders/common.slang` (`AnchorEye` doc), `src/shaders/surface.slang` (vertex stages), `src/shaders/pointCull.slang`, generated shaders, `src/scene/Engine.ts` (picks read the scale)

**Interfaces:**

- Consumes: 5a's `AnchorEye`, `writeAnchorEyes`, `MAX_ANCHORS`, `RecordFlags.underlay`, `UNDERLAY_DEPTH`; Task 3.
- Produces:
  - `anchorDepthScales(view: View, eye: ArrayLike<number>, out: Float32Array): Float32Array` in `src/scene/anchorDepth.ts` (plan's call 9), one value per anchor slot, in float64 before the store. Every slot is 1 unless the view's world holds an underlay draw (the bare ellipsoid globe); then, with U the underlay's body:
    - a body anchor B ≠ U holding draws gets `UNDERLAY_DEPTH` when the eye lies on U's side of the plane that separates their bounding spheres (radius: maximum radius + `terrainBand.max`), perpendicular to the line between their centres, halfway between the spheres;
    - an anchor with no body gets `UNDERLAY_DEPTH` when the segment from the eye to its origin crosses U's ellipsoid;
    - U's own anchor stays 1, so the Earth's content keeps today's rule.
  - `AnchorEye.eyeLo.w` holds the scale (plan's call 9; if 5a used that lane, the next free one, said in the commit message). `surface.slang`'s vertex stages and `pointCull.slang`'s depth multiply clip-space z by it. With every scale 1, the multiply is exact and Earth pixels are unchanged.
  - Picks already read depths at or below `UNDERLAY_DEPTH` as underlay, so a pick on scaled content resolves its true distance; a test pins it.
  - The check page `spikes/bodies.html` (plan's call 30): `runBodies("depth")`, on a core-only scene (no ion, no frames module): the bare ellipsoid globe and a sphere mesh of the Moon's radius under the Moon's anchor, placed by hand.

- [ ] **Step 1: Write the failing test** (`test/anchorDepth.test.ts`):

```ts
it("is 1 everywhere without an underlay", () => { /* a terrain globe and the Moon: all ones */ });
it("puts the Moon behind the bare ellipsoid from the Earth's ground", () => {
  expect(scales(eyeOnGround)[moon.slot]).toBe(2 ** -64);
});
it("leaves the Moon in front from beyond it, and decides at the separating plane", () => {   // Review Focus 5
  expect(scales(eyeBeyondMoon)[moon.slot]).toBe(1);
  expect(scales(eyeOnPlane)[moon.slot]).toBe(1);
});
it("puts a spacecraft's anchor behind the Earth only while the Earth hides its origin", ...);  // Review Focus 5
it("never scales the underlay's own anchor", ...);
it("a pick on scaled content resolves its true distance", ...);   // within 1e-3 relative
it("with every scale 1, the view block's floats are the ones before this task", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement** the Slang first, then `npm run shaders`, `npm run shaders:check`, and read the surface vertex stage's Metal (`node scripts/dumpMsl.mjs src/shaders/generated/surface.wgsl vs`); then `anchorDepth.ts` and the writer.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Write the page's `depth` group.** Each check reports its value and pass or fail:
  1. Moonset from the ground: with the Moon's mesh below the ellipsoid's horizon, no Moon pixel shows; half risen, its visible part ends at the horizon within one pixel;
  2. Earthset from 100 km above the Moon's far limb: the Moon's mesh covers the Earth where they overlap;
  3. a box under an anchor with no body passing behind the Earth: hidden while behind, shown after;
  4. limbs: two renders with the eye moved by 1 mm show the same pixels at both limbs (no z-fighting).
- [ ] **Step 6: Browser check (port 5191):** `/spikes/bodies.html?bench` and `runBodies("depth")`; every check passes. Then `parity`, `models`, `tracks` and `alloc`, one at a time, against the base commit's results. Record the metrics in the commit message. Stop the server.
- [ ] **Step 7: Commit** with "render: content behind the bare ellipsoid's body stays behind it; depth across bodies".

### Task 5: The impostor's level of detail and surface tilesets

**Files:**

- Create: `src/scene/Impostor.ts`, `test/impostor.test.ts`
- Modify: `src/scene/Body.ts` (`appearance`), `src/streaming/Tileset3D.ts` (`surface`, the virtual parent, `drawing`), `src/scene/Engine.ts` (`addImpostor`, the per-tick update), `src/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 1 and 3; 5b's `Body.terrainBand`; 5a's `view.anchorCamera`, selection views per anchor; `MOON_ALBEDO`, `moonPhaseBrightness` (5a's `src/atmosphere/moonLight.ts`).
- Produces:
  - `Body.appearance?: BodyAppearance`, `interface BodyAppearance { readonly reflectance: "lommelSeeliger"; readonly geometricAlbedo: number; readonly phaseBrightness: (phaseAngle: number) => number }`. `MOON.appearance` is `{ reflectance: "lommelSeeliger", geometricAlbedo: MOON_ALBEDO, phaseBrightness: moonPhaseBrightness }`; no other body has one (plan's call 10).
  - `type ImpostorMode = "auto" | "impostor" | "tileset"`, `type ImpostorState = "full" | "floor" | "off"`.
  - `interface ImpostorOptions { readonly mode?: ImpostorMode; readonly errorBias?: number }` (defaults `"auto"` and 0.25, plan's call 12).
  - `class Impostor`:
    - `readonly body: Body`, `readonly anchor: AnchorHandle` (`world.bodyAnchor(body)`), `mode: ImpostorMode`, `errorBias: number` (finite and positive, else a `RangeError` naming it);
    - `readonly geometricError: number` (plan's call 11), recomputed when the map changes;
    - `setMap(image: ImageBitmap | null, mean?: number): void`; `readonly mapWidth: number`, `readonly mapMean: number`;
    - `screenSpaceError(view: View): number`, from the camera in the impostor's anchor and the view's `sseDenominator` and height (plan's call 11);
    - `refines(view: View): boolean`, with the threshold and hysteresis of plan's call 12 (the threshold's maximum screen-space error is the first surface tileset's, else 16);
    - `state(view: View): ImpostorState` (plan's call 14);
    - `readonly surfaces: readonly (Tileset3D | DeclaredTileset)[]` (Task 6 adds the declared kind);
    - `readonly drawing: boolean` (its state wasn't `"off"` in some view last tick);
    - `dispose(): void`.
  - `engine.addImpostor(world: World, body: Body, options?: ImpostorOptions): Impostor`: one per world and body (a second throws naming the body); a body without `appearance` throws naming "appearance". `engine.impostors(world): readonly Impostor[]`.
  - `TilesetOptions.surface?: boolean` (plan's call 13): a surface tileset must hang under its body's anchor (else `TilesetBodyError` naming `surface` and `anchor`). When its body has an impostor in its world, it is the impostor's virtual parent: in a view where `impostor.refines(view)` is false, the tileset selects nothing, requests nothing and draws nothing. Without an impostor, `surface` changes nothing.
  - `Tileset3D.drawing: boolean`: some tile drew in some view last tick; `Tileset3D.drawnIn(view: View): boolean`.

- [ ] **Step 1: Write the failing tests** (`fakeEngine`; a view 1,000 px tall with a 60° vertical field of view, so `sseDenominator` is 1.1547; the stubbed tileset harness marked `surface: true` under the Moon's anchor):

```ts
it("the Moon's error is its relief while its map's texels are smaller", () => {
  impostor.setMap(mapOfWidth(2048));            // texel 5,330 m
  expect(impostor.geometricError).toBe(10_800);
});
it("from the Earth's ground the Moon stays an impostor", () => {
  expect(impostor.screenSpaceError(groundView)).toBeLessThan(0.03);
  expect(impostor.refines(groundView)).toBe(false);
});
it("refines at a quarter of the tileset's maximum screen-space error", () => {
  at(2_000_000);  // m from the Moon's centre: 10,800 × 1000 / (1,989,200 × 1.1547) = 4.70 px > 4
  expect(impostor.refines(view)).toBe(true);
  at(3_000_000);  // 3.12 px
  expect(impostor.refines(view2)).toBe(false);
});
it("holds a refinement down to 0.9 of the threshold, and no further", () => {   // Review Focus 2
  // refined at 4.70 px; still refined at 3.8 px; not at 3.5 px; no flip over 100 ticks at 3.7 px
});
it("a surface tileset selects only in views where the impostor refines", () => {   // Review Focus 2
  // two views, one at 2,000 km and one on the Earth's ground: the tileset's policy sees only the first's id
});
it("is full until a surface tile draws in the view, then floor, and off in tileset mode", ...);
it("is off when the eye is inside its floor sphere", ...);   // Review Focus 1: eye at 1,737,400 − 9,200 − 200 m
it("a tileset on the Moon that isn't its surface draws by its own error", ...);
it("refuses a surface tileset under another anchor, a second impostor, and a body without appearance", ...);  // Review Focus 4
it("impostor mode never refines; errorBias 1 refines at 16 px", ...);
```

- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** `Body.appearance`, then `Impostor.ts`, then the engine's update (once per tick, after the camera layer and before selection) and the virtual parent in `Tileset3D`'s per-view selection.
- [ ] **Step 4: Run** the tests, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "scene: a body's impostor as its coarsest level of detail, and surface tilesets that refine from it".

### Task 6: Declared tilesets, ion failures by kind, and header refresh

**Files:**

- Create: `src/streaming/DeclaredTileset.ts`, `src/streaming/refreshHeaders.ts`, `test/declaredTileset.test.ts`, `test/ionErrors.test.ts`, `test/data/ionMoonProbe.test.ts`
- Modify: `src/io/ion.ts`, `src/streaming/Tileset3D.ts` (`refreshHeaders`), `src/globe/TerrainSource.ts` (`refreshHeaders`), `src/scene/Engine.ts` (`declareTileset`, `GlobeOptions.refreshHeaders`), `src/scene/Impostor.ts` (declared surfaces), `src/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Task 5's `Impostor.refines`, `surfaces`; `resolveIonAsset`, `IonAttribution`, `IonOptions`; 5a's `EngineErrors`.
- Produces:
  - In `src/io/ion.ts`:
    - `class IonAssetError extends Error { readonly assetId: number; readonly kind: "noToken" | "unauthorized" | "forbidden" | "notFound" | "network" | "unsupported"; readonly status?: number }` (plan's call 16), thrown by `resolveIonAsset`. Its message names the asset and what to do ("paste an ion access token", "the token is invalid or has expired", "the token's scopes don't include this asset", "add the asset to My Assets from the ion Asset Depot") and never the token. The no-token message keeps the words "no access token".
    - `IonOptions.fresh?: boolean`: skip the 45-minute endpoint cache and replace its entry.
    - `ionTilesetSource(assetId: number, options?: () => IonOptions): TilesetSource`, which calls `resolveIonAsset` only when invoked, reading `options()` then (so a token set later is used), and returns its endpoint with a `refreshHeaders` that resolves again with `fresh: true`.
  - In `src/streaming/DeclaredTileset.ts`:
    - `type TilesetSource = (signal: AbortSignal) => Promise<TilesetEndpoint>`, `interface TilesetEndpoint { readonly url: string; readonly headers?: Record<string, string>; readonly attributions?: readonly IonAttribution[]; readonly refreshHeaders?: (signal: AbortSignal) => Promise<Record<string, string>> }`;
    - `interface TilesetDeclaration { readonly body: Body; readonly source: TilesetSource; readonly options?: TilesetOptions }` (`options.surface` defaults to true here);
    - `type DeclaredState = "declared" | "resolving" | "loading" | "ready" | "failed"`;
    - `class DeclaredTileset { readonly body: Body; readonly state: DeclaredState; readonly tileset: Tileset3D | undefined; readonly error: Error | undefined; readonly attributions: readonly IonAttribution[]; readonly drawing: boolean; readonly events: Emitter<{ state: DeclaredState; warning: string }>; load(): Promise<Tileset3D>; retry(): Promise<Tileset3D>; dispose(): void }` (plan's call 15). A failure emits one `warning` (the error's message), reports once through `EngineErrors`, and leaves the impostor drawing. `dispose` aborts a source call or a load in flight.
  - `engine.declareTileset(world: World, declaration: TilesetDeclaration): DeclaredTileset`: makes no request. It joins its body's impostor's `surfaces` and starts at that impostor's first refinement in any view (one source call however many views cross in one tick).
  - `TilesetOptions.refreshHeaders?` and `GlobeOptions.refreshHeaders?: (signal: AbortSignal) => Promise<Record<string, string>>` (plan's call 17), through `withHeaderRefresh` in `src/streaming/refreshHeaders.ts`: a 401 on content starts one refresh shared by every 401 in flight; each such request retries once with the new headers; a 401 after a refresh fails that tile as today and adds one warning.
  - The probe (plan's call 32): `test/data/ionMoonProbe.test.ts` runs only with `ION_PROBE=1`, reads `VITE_ION_TOKEN` from `.env.local` itself, and checks that asset 2684829's endpoint answers 200 with type `3DTILES`, and that a deliberately wrong token gives `kind: "unauthorized"`. It prints statuses and kinds only.

- [ ] **Step 1: Write the failing tests** (`fakeEngine`, stubbed `fetch` that records every URL and answers by script, `T = "test-token-value"`):

```ts
it("declaring Cesium Moon makes no request from the Earth's ground", () => {
  engine.addImpostor(world, MOON);
  engine.declareTileset(world, { body: MOON, source: ionTilesetSource(2684829, () => ({ accessToken: T })) });
  tick(600, groundView);
  expect(fetchCalls()).toEqual([]);
});
it("nearing the Moon calls the endpoint once, then loads the tileset", async () => {
  at(2_000_000, viewA); at(2_000_000, viewB); tick(1);       // Review Focus 2: two views cross in one tick
  expect(fetchCalls().filter((u) => u.includes("/v1/assets/2684829/endpoint"))).toHaveLength(1);
  await declared.load();
  expect(declared.state).toBe("ready");
});
it("with no token it fails before any request, warns once, and the impostor stays", () => {
  expect(fetchCalls()).toEqual([]);
  expect(warnings).toEqual([expect.stringMatching(/no access token/)]);
  expect(impostor.state(view)).toBe("full");
});
it("names 401, 403 and 404 by kind, never the token, and warns once each", ...);  // Review Focus 3: 100 more ticks above the threshold add no request and no warning
it("retry() tries once more, with a token set since", ...);                        // Review Focus 3
it("a 401 on content refreshes once for every 401 in flight and retries each once", ...);  // Review Focus 3: 20 tiles, one fresh endpoint call
it("a second 401 after a refresh fails the tile with one warning", ...);
it("dispose aborts a source call in flight", ...);
it("terrain refreshes its headers the same way", ...);
```

  And in `test/ionErrors.test.ts`: `resolveIonAsset` with no token throws `IonAssetError` `noToken` with no fetch; 401, 403, 404 and 500 map to their kinds; `fresh: true` bypasses and replaces the cache; no message contains `T`.

- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** `IonAssetError` and `fresh`, then `withHeaderRefresh` and its use in `Tileset3D` and `TerrainSource`, then `DeclaredTileset` and `engine.declareTileset`, then `ionTilesetSource`.
- [ ] **Step 4: Run** the tests, `npm test`, tsc, eslint, prettier. Then the probe once, if `.env.local` has a token: `ION_PROBE=1 npx vitest run test/data/ionMoonProbe.test.ts`. Record the statuses in the commit message (ruling 10); if ion answers a case differently from call 16, fix the mapping here.
- [ ] **Step 5: Surface and commit** with "streaming: declared tilesets that load when the camera nears their body; ion failures by kind; header refresh on 401".

### Task 7: The impostor pass on the GPU

A browser check (port 5192).

**Files:**

- Create: `src/atmosphere/impostor.slang`, `src/atmosphere/Impostors.ts`, `test/impostorPass.test.ts`
- Modify: `src/atmosphere/sky.slang` (the pixel composition as a function both fragments call; the disk's inputs), `src/atmosphere/Sky.ts`, `src/scene/Engine.ts` (the opaque pass, `setMoonMap`, `moonFrom`, picks), `src/scene/pick.ts`, `src/frames/pickInterpreter.ts`, `src/render/layout.ts` (`IMPOSTOR_FEATURE_BASE`), `src/shaders/layouts.slang`, generated shaders, `spikes/bodies.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 3 to 5; 5a's `writeAnchorEyes`, `CorePick`, the pick readback; 5b's impostor ray rule (relief as accuracy).
- Produces:
  - `sky.slang`: `skyStarsFragment` and `skyFromTableFragment` keep their outputs exactly; their bodies become `skyPixel(position, direction, group, moon: MoonSample)` and `skyTablePixel(direction, position, moon)`, which `impostor.slang` imports.
  - `impostor.slang` (plan's calls 18 and 19), no loops:
    - vertex: a full-viewport triangle;
    - fragment: the impostor's ellipsoid in its scaled space from the eye-relative centre direction and sine of the angular radius, as `moonDisk` does; `discard` outside; the colour is the sky's pixel at that direction with the impostor's disk sample (with the view's air when the view draws its sky, without it otherwise), premultiplied by the coverage and blended over; depth `near / viewZ × depthScale` written where the coverage is at least ½; target 1 the feature `IMPOSTOR_FEATURE_BASE + slot`;
    - `"floor"` uses the floor radius, `"full"` the ellipsoid.
  - `Impostors` (in `src/atmosphere/Impostors.ts`), drawn by the engine in the opaque pass after `drawSplats` and before `sky.draw`: per view and impostor not `"off"`, an `ImpostorBlock` uniform written in float64 then stored as float32 (`impostorBlock(view, impostor, eye, out)`): the centre's direction in shading axes, the angular radius's sine, the body's axes in shading axes, the radii ratios, the floor scale, the direction to the sun from the body, the disk's brightness scale and earthshine as `Sky.write` computes them today, the depth scale (Task 4) and the feature id. The scissor is the projected bounding sphere plus one pixel, clipped to the viewport; empty means no draw.
  - The Moon's impostor's map is `engine.setMoonMap`'s. With a Moon impostor in its world, the sky's disk for a view is placed from the impostor's anchor; without one, from `engine.moonPosition` as today (plan's call 21).
  - `IMPOSTOR_FEATURE_BASE = 0xffff_ff00` (plan's call 20). A pick reading such an id resolves `CorePick.impostor = body`, `anchor` that slot's anchor, `draw` and `feature` undefined. The frames interpreter adds an accuracy term `"impostor"`, the body's relief in metres, noted "the body's ellipsoid, not its terrain".

- [ ] **Step 1: Write the failing test** (`test/impostorPass.test.ts`, `fakeEngine`):
  - `impostorBlock` for the Moon seen from the Earth's ground: the centre's direction equals the normalised eye-to-centre vector in shading axes within 1 × 10⁻⁷, the sine is 1,737,400 m over the distance, the brightness scale and earthshine equal `Sky.write`'s for the same instant;
  - the scissor contains the projected limb plus one pixel and stays inside the viewport; an impostor behind the camera or off screen records no draw on the fake pass;
  - `"floor"` sets the floor scale to (1,737,400 − 9,200 − 100) / 1,737,400;
  - a pick whose readback carries `IMPOSTOR_FEATURE_BASE + slot` resolves `impostor === MOON`, no draw, and an `"impostor"` accuracy term of 10,800 m through the frames interpreter;
  - `world.feature(IMPOSTOR_FEATURE_BASE)` is undefined, and no world feature id can reach the range (the allocator refuses it).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement** the Slang (the sky refactor first, then `impostor.slang`), `npm run shaders`, `npm run shaders:check`; read the Metal of `skyStarsFragment` and the impostor's fragment (`node scripts/dumpMsl.mjs src/shaders/generated/<module>.wgsl <entry>`). Then the TypeScript.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Grow the page's `impostor` group** (core scene plus the frames module at `"analytic"`, no ion):
  1. the Moon from the ground at one instant, drawn once by today's sky disk (no impostor) and once as the impostor: its interior pixels are identical and its limb within the gate's tolerance;
  2. Earthset from beyond the Moon: the impostor hides the Earth's globe;
  3. moonset behind the bare ellipsoid's horizon: hidden (Task 4's scale);
  4. a pick on the impostor reports the Moon and its relief.
- [ ] **Step 6: Browser check (port 5192):** `/spikes/bodies.html?bench`, `runBodies("impostor")` and `runBodies("depth")`; every check passes. Then `parity` and `alloc`, one at a time, against the base commit. Record the metrics. Stop the server.
- [ ] **Step 7: Surface and commit** with "atmosphere: the impostor pass: a body ray-cast at its true distance in the opaque pass, with the sky's own pixel; picks on it".

### Task 8: One material for the impostor and its surface tiles

A browser check (port 5193).

**Files:**

- Create: `src/atmosphere/regolith.slang`, `test/regolith.test.ts`
- Modify: `src/atmosphere/sky.slang` (`moonDisk` calls it), `src/atmosphere/impostor.slang`, `src/shaders/surface.slang` (`shadeSurface`'s branch), `src/shaders/common.slang` (the view block's regolith fields), `src/shaders/layouts.slang`, generated shaders, `src/render/layout.ts` (`RecordFlags.regolith = 128`), `src/streaming/Tileset3D.ts` (sets the flag, `albedoMean`), `src/scene/Engine.ts` (the view block), `src/io/moonMap.ts` (`CESIUM_MOON_ALBEDO_MEAN`), `spikes/bodies.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 5 and 7; 5a's `DrawConstants.setFlags`.
- Produces:
  - `regolith.slang`: `float regolithRadiance(float mu0, float mu, float albedo, float scale, float earthshine)`: `((mu0 > 0 ? scale · 2μ₀ / (μ₀ + μ) : 0) + earthshine) · albedo`, today's `moonDisk` term, called by the sky's disk, the impostor and the surface branch. 5e replaces its body with Hapke's.
  - `RecordFlags.regolith` (the next free bit, 128): set by `DrawConstants` for draws of surface tilesets whose body's `appearance.reflectance` is `"lommelSeeliger"` (plan's call 22). `shadeSurface` gives such a draw the sun's term from `regolithRadiance` with the base colour's linear luminance ÷ its mean as the albedo, no image-based light, and the view's solar factor, so that the same albedo, angles and phase give the impostor's output.
  - The view block's `regolith: float4` (scale, earthshine, 1 ÷ mean, solar factor) and `regolithSun: float4` (to the sun from the body, shading axes), written from the same function `impostorBlock` uses, so the two can't drift. A second regolith body in one world throws, naming it.
  - `TilesetOptions.albedoMean?: number` (default the impostor map's mean); `CESIUM_MOON_ALBEDO_MEAN` in `src/io/moonMap.ts` (plan's call 23), measured in this task's browser check.

- [ ] **Step 1: Write the failing test** (`test/regolith.test.ts`, `fakeEngine`):
  - a surface tileset on the Moon gets `RecordFlags.regolith`; a non-surface Moon tileset, Earth content and a body without an appearance don't;
  - the view block's regolith fields equal `impostorBlock`'s scale, earthshine and mean for the same view;
  - a second regolith body throws, naming it;
  - an Earth-only world's view block and records are byte-for-byte unchanged.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement,** `npm run shaders`, `npm run shaders:check`, and read `surface.wgsl`'s fragment Metal.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Grow the page's `material` group:** a sphere mesh of the Moon's radius, its texture a uniform grey of the impostor map's mean, flagged as a surface draw, beside the impostor at the same distance and phase; their disks' mean luminances agree within 2%, at full, at quarter and at a thin crescent. With a token, log `loadIonMoonMap({ level: 2 }).mean` once (never the token) and write it as `CESIUM_MOON_ALBEDO_MEAN` with the date.
- [ ] **Step 6: Browser check (port 5193):** `runBodies("material")` and `runBodies("impostor")` pass; then `parity`, `models`, `tileset` and `customShader`, one at a time, against the base commit. Stop the server.
- [ ] **Step 7: Surface and commit** with "atmosphere: one Lommel–Seeliger material for the Moon's impostor and its surface tiles".

### Task 9: View links and the Viewer per body; the Viewer's Moon

A browser check (port 5194).

**Files:**

- Modify: `src/scene/ViewLink.ts`, `widgets/Viewer.ts`, `widgets/orbitFocus.ts`, `widgets/index.ts`, `bench/suite/views/viewerHost.ts` (lists the Moon's warning with the others), `api/surface.txt`
- Test: `test/viewerMoon.test.ts`, `test/viewLinkBody.test.ts`

**Interfaces:**

- Consumes: Tasks 2, 5, 6 and 7; 5a's `viewer.frames`, `engine.cameras.setRig`, `root(view)`, `Viewer.warnings`, `ViewerWarning`; `CESIUM_MOON_TERRAIN`, `loadIonMoonMap`.
- Produces:
  - `ViewerOptions.moon?: boolean | "impostor" | "ion" | TilesetSource` and `ViewerOptions.moonMap?: "bundled" | "ion"` (plan's call 24):
    - any value but `false` adds the Moon's impostor (`engine.addImpostor(world, MOON)`), its map 1.x's bundled one unless `moonMap: "ion"`;
    - `"ion"` declares Cesium Moon: `engine.declareTileset(world, { body: MOON, source: ionTilesetSource(CESIUM_MOON_TERRAIN, () => this.tokenOptions()), options: { surface: true, policy, albedoMean: CESIUM_MOON_ALBEDO_MEAN } })`; a `TilesetSource` declares the application's own;
    - `Viewer.moon: { readonly impostor: Impostor; readonly tileset?: DeclaredTileset } | undefined`.
  - `ViewerWarning.kind` gains `"moonTileset"`: a declared Moon's failure, with its message.
  - `addAttributions(owner: object, attributions: IonAttribution[], options?: { shown?: () => boolean })` (plan's call 25). The Moon tileset's attributions show while `declared.drawing`; the ion map's while `impostor.drawing`; the bundled map needs none (its source is checked here and written in the doc comment; if none is found, it goes to the owner's list).
  - `zoomTo`, `flyTo` and framing of content on another body set the view's rig on `viewer.frames.bodyFixed(body)` and fit the content with the camera in that body's anchor; Earth content sets it back on ITRF (plan's call 26).
  - `setSplit(on: boolean, options?: { body?: Body }): void` (plan's call 27): the second view is made with that body and a rig on its body-fixed frame.
  - `ViewLink`'s body is the source view's (plan's call 28); `orbitFocus` takes the view's body.
  - `place()` is undefined for a view off the Earth (plan's call 29).

- [ ] **Step 1: Write the failing tests** (`fakeEngine`, stubbed `fetch`, as 5a's `test/viewerFrameData.test.ts`):
  - a default Viewer with a token set: the Moon's impostor exists; the only Moon request is the bundled map; no URL contains `2684829` or `api.cesium.com/v1/assets` for the Moon over 600 ticks;
  - `moonMap: "ion"` requests the endpoint at start, as today; `moon: false` adds no impostor and fetches no Moon map; `moon: true` equals `"impostor"`;
  - `moon: "ion"` with no token: no request on the ground; nearing the Moon gives one `"moonTileset"` warning naming the cause, and the impostor keeps drawing;
  - `credits()` lacks Cesium Moon's attributions until its tiles draw, has them while they draw, and drops them when the camera leaves;
  - `zoomTo(moonTileset)` leaves `engine.cameras.root(view).name === "MOON_ME"`; `zoomTo` an Earth tileset after it gives `"ITRF"`;
  - `setSplit(true, { body: MOON })` makes a second view on the Moon with its rig on MOON_ME;
  - a link from a Moon view copies the pose in the Moon's anchor within 1 × 10⁻⁹ m, and its footprint lies on the Moon's ellipsoid;
  - `place()` on a Moon view is undefined.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `test/viewerFrameData.test.ts` unchanged, `npm test`, `npm run check:bundle` (the main chunk grows by no more than the impostor's code: record the size), tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5194):** Dyno's Viewer (`/#/viewer`) with a token: the Moon from the ground looks as on the base commit, the network log has no request for asset 2684829, and the console is clean. Light and dark. Stop the server.
- [ ] **Step 6: Surface and commit** with "widgets: the Viewer's Moon (impostor by default, Cesium Moon on request), credits that follow what draws, views and links per body".

### Task 10: Earth and Moon together: the done-when checks

A browser check (port 5195), with a token.

**Files:**

- Modify: `spikes/bodies.ts`, `spikes/bodies.html`

**Interfaces:**

- Consumes: everything above, through the public API only (the Viewer, `viewer.frames`, `engine.cameras`, `viewer.moon`); the token from `ionToken()`.
- Produces: the page's `together` group, each check reporting its measured value and pass or fail (spec section 10.5):
  1. **A rig on MOON_ME:** Cesium Moon near the camera and the Earth with Cesium World Terrain and imagery behind it, at the clock's time. The Earth's anchor placement equals `frameTransform(ITRF → MOON_ME)` within 1 m at the Earth's surface, and the Earth's centre projects within one pixel of the CPU's projection of it.
  2. **No ion request from the ground:** with Cesium Moon declared, 10 s on the Earth's ground; no resource entry (`performance.getEntriesByType("resource")`) names asset 2684829.
  3. **The handover:** a scripted 60 s approach from 50,000 km to 200 km above the Moon at a constant rate of the logarithm of the distance. Every tick: no background pixel inside the Moon's projected limb (no hole); the limb's centroid moves no more than one pixel beyond the camera's own motion; the disk's mean luminance changes by no more than 5% from the tick before, across the handover tick included.
  4. **No usable token:** the same approach with no token; the impostor draws throughout, and exactly one warning names the cause.
  5. **From behind the Moon:** Earthset with the impostor, and again after the handover with the tileset: in both, no Earth pixel shows where the Moon is in front.
  6. **Two views:** one on each body, side by side, both drawn in one tick.
  7. **Picks:** a pick on the Moon reports MOON_ME coordinates, one on the Earth ITRF.
  8. **Limbs:** the Moon's limb from the Earth and the Earth's from the Moon show no z-fighting between two renders 1 mm apart.

- [ ] **Step 1: Write the group.** The page reads the token through `ionToken()`, passes it to the Viewer and nothing else, and prints values only.
- [ ] **Step 2: Browser check (port 5195):** `/spikes/bodies.html?bench`, then `runBodies("together")`, `runBodies("impostor")`, `runBodies("material")` and `runBodies("depth")`; every check passes. Save review screenshots of checks 1, 3, 5 and 6 in the git-ignored `design-screenshots/`, with no token or settings panel in view. Then `parity`, `globe`, `heights` and `lod`, one at a time, against the base commit. Record every value in the commit message. Stop the server.
- [ ] **Step 3: Fix** what a check finds, in the module that owns it, naming the earlier task in the commit message, and rerun the group.
- [ ] **Step 4: Commit** `spikes/bodies.ts spikes/bodies.html` (and any fix's files) with "spikes: the Earth and the Moon together: handover, depth, two views, picks". List anything the page reached past the public API for, for 5i.

### Task 11: Docs, the plan note, the final gates and Snyk

**Files:**

- Modify: `packages/next/README.md`, `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document a tileset's body and `3DTILES_ellipsoid`; per-body volumes, horizon culling, clamping and picks; what stays Earth-only; a view on another body; depth across bodies and the underlay; impostors (states, error, threshold, bias, modes), surface tilesets, declared tilesets and their failures; header refresh; the shared material; the Viewer's `moon` and `moonMap`; credits that follow what draws.
- [ ] **Step 2: Plan note** in §13.14, "Frames 5c results": the measured values (the check page's, the parity metrics against the base commit, the bundle size, the ion probe's statuses, `CESIUM_MOON_ALBEDO_MEAN`), the plan's calls and rulings one line each, the owner's open items (the 404 case if unseen; the bundled map's credit if unfound), and a "Carried forward" list of real deferred work from this plan's ledger, without nits, written before the ledger is deleted. It includes a single cache budget across tilesets (ruling 6), the Earth's appearance for its impostor (5e), and controllers on the Moon (5d). Mark the section 16 row "The Moon as a tileset" closed, naming the tasks.
- [ ] **Step 3: Gates:**
  - `npx tsc --noEmit -p .`, `npx eslint .`, `npx prettier --check .`;
  - `npm test`, `npm run test:data`;
  - `npm run build`, `npm run build:lib`, `npm run check:bundle`, `npm run shaders:check`;
  - the parity pages and the bench gate against the base commit, one suite at a time, on port 5196 (plan's call 31);
  - `snyk_code_scan` on `src/streaming`, `src/scene`, `src/atmosphere`, `src/io/ion.ts`, `src/io/moonMap.ts`, `src/globe/TerrainSource.ts`, `src/frames/pickInterpreter.ts`, `widgets/Viewer.ts`, `widgets/orbitFocus.ts` and `spikes/bodies.ts`. Fix new findings and rescan until clean; record the findings that predate this plan.
- [ ] **Step 4: Commit** `README.md` and `CESIUM2_WEBGPU_PLAN.md` with "Plan: frames 5c results".

---

## Self-review

- **Spec coverage.** 10.2: bodies are `Body` (Task 5's appearance), content belongs to a body and regions read on its ellipsoid (1), one cache and budget (ruling 6), picks name the body (2, 7), the globe stays the Earth's (call 5), the handover generalising "the disk is off" (5 to 8); free flight's re-attachment is 5d's. 10.3: a body's anchor (5a; 1 and 2 hang content under it), horizon culling, volumes, clamping (1, 2), view links and the Viewer (9), picks (2, 7), `View.body` kept (3), depth across bodies (4, 10). 10.4: the impostor as coarsest level of detail and virtual parent (5), no hole (5's floor, 10's check), no pop: one anchor (5, 7) and one material (8), depth-correct in the opaque pass (7), picks on it (7), overrides (5's mode and bias), any body (5, call 10), the handover not the data (6), lazy to the endpoint (6, 9, 10), failures fall back with one warning (6, 9, 10), token refresh (6), credits follow what draws (9), any tileset (6's `TilesetSource`), MOON_ME and heights as published (the body anchor's binding and `modelMatrix`, each a single setting). 10.5: every item is a check in Task 10, and Earth parity is gated in Tasks 4, 7, 8, 10 and 11.
- **For later sub-plans:** 5e gets the camera in every body's anchor and the sky inputs per view (3), the impostor in the opaque pass with the sky's own pixel (7) for its compositing, and one shared material function to turn into Hapke's (8). 5g gets the Viewer's `moon: "ion"` declaration (9), retained geometry on the declared tileset through `options` (6) for 5b's tileset rays, picks in MOON_ME (2), views on either body (3, 9) and depth across bodies (4). 5d gets per-body content and selection to build per-body controllers on.
- **Type consistency:** `TilesetBodyError`, `tilesetBody`, `Tileset3D.body`, `SelectionView.ellipsoid` (Tasks 1, 2); `CorePick.body`, `CorePick.impostor` (2, 7); `viewSkyInputs` (3, 7); `anchorDepthScales` (4, 7); `BodyAppearance`, `Impostor`, `ImpostorMode`, `ImpostorState`, `TilesetOptions.surface`, `Tileset3D.drawing` (5 to 9); `TilesetSource`, `TilesetEndpoint`, `DeclaredTileset`, `IonAssetError`, `ionTilesetSource`, `refreshHeaders` (6, 9); `impostorBlock`, `IMPOSTOR_FEATURE_BASE` (7, 8); `RecordFlags.regolith`, `albedoMean`, `CESIUM_MOON_ALBEDO_MEAN` (8, 9) are named the same wherever they recur.
- **Review Focus:** each line's test sits in its owning task's Step 1 and is marked there.
