# M2 progress

**What this holds:** M2's increments: the demo viewer, `Stepwise` and `Budgeted` selection, OSM Buildings, photogrammetry, mixed-LOD drawing, and the 1.x selection bugs found. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

## Demo viewer (r15)

`/viewer/` shows the PoC's state in a browser: sample glTF models, 3D Tiles
samples at full detail, Cesium ion assets (token in the gitignored
`packages/next/.env.local`) and a synthetic city. It has inspection
navigation (`InspectController`: orbit a focus point, pan, zoom), sun and
lighting controls, exposure, output encoding, an unlit toggle, a linked
overview inset, click-to-pick with feature properties, live stats and content
warnings. Selections are deep-linkable (`?model=`, `?tileset=`, `?asset=`,
`?scene=city`). Georeferenced glTF models (Earth-fixed node translations) are
placed at their own position. The context globe draws one mesh per latitude
band, rotated, so it costs 16 batches rather than 512.

## Foundations (r15)

- **Freeing placed content.** Meshes release their arena ranges. Material
  slots and texture sets go on free lists. Removing a draw decrements its
  batch and recycles empty batches with their index kept, so live records
  stay valid. `Engine.removeModel` frees everything a glTF instance created,
  and instances report their GPU bytes for the cache budget. This also fixes
  a latent overflow: `removeDraw` used to leave batch sizes stale. Verified
  with 20 add/remove cycles of a Draco, textured model: the arena returns to
  baseline with no validation errors.
- **Per-view view masks.** Each draw record carries a 32-bit `viewMask`
  (the record grows to 192 bytes) and each view gets a stable bit
  (`Engine.viewBit`). The prep kernel skips records not selected for the view
  being culled. One shared draw table can therefore carry different LOD
  selections per view: the basis for multi-view tile selection.

## `Stepwise` selection spec (from the 1.x base traversal)

`Stepwise` must reproduce 1.x's default, non-skip-LOD selection exactly
(L1 ≥ 99% Jaccard). The rules that matter, from
`Cesium3DTilesetBaseTraversal.js`, `Cesium3DTilesetTraversal.js` and
`Cesium3DTile.js`:

- **SSE** = `geometricError × drawingBufferHeight / (max(distance, 1e-7) ×
2 tan(fovy/2))` (fovy derived from fov and aspect), divided by `pixelRatio`.
  Default threshold 16. The geometric error is scaled by the transform's
  maximum scale component.
- **Dynamic SSE is on by default and changes selection.** It subtracts
  `fog(distance, density) × 24` with `fog(d, k) = 1 − exp(−(d·k)²)`. The
  density is `2e-4 × (1 − |dir·up|) × (1 − t)`, with `t` from the camera
  height within the root content volume (falloff 0.25).
- **Distance** is to the tile's bounding volume, not a sphere: the closest
  point on the OBB for boxes; for regions, the max of the region-plane
  distance and the OBB distance from `OrientedBoundingBox.fromRectangle`.
  Frustum culling uses six planes with OBB `intersectPlane` and a parent
  plane mask.
- **Traversal.** Root early-out uses the parent-style SSE. A tile traverses if
  it has children and SSE > threshold. Visible children are always pushed,
  nearest first, so whole needed subtrees get requested. REPLACE selects a
  tile when it stops refining. A REPLACE parent with content refines only if
  every child, visible or not, has content available (or is empty and its
  empty subtree is loaded) and is inside its request volume, and at least one
  child is visible. ADD selects every visited tile. Selection also requires
  the content bounding volume to be in view.
- **Visibility extras that change the set:** children-bounds culling (on by
  default for box/region trees whose children project within the parent),
  `meetsScreenSpaceErrorEarly` for children of ADD tiles, viewer request
  volumes, and the memory-adjusted SSE (×1.02 per frame over the 512 MiB
  budget).
- **Request-only behavior** (not selection): foveated deferral, which only
  affects ADD tiles in the base traversal; progressive resolution;
  cull-requests-while-moving; the priority digits; and cancellation of
  untouched in-flight requests.

## Increment 1 (r16): streaming with `Stepwise` selection

Done:

- **Bounding volumes** (`streaming/volumes.ts`): ports of 1.x's OBB
  (including degenerate axes), `OrientedBoundingBox.fromRectangle` (both the
  ≤ π and > π branches), `TileBoundingRegion` edge planes and distance, and
  sphere volumes. Unit-tested against 1.x core and engine modules at 1e-9
  relative tolerance: random regions (hemispheres, equator, antimeridian,
  wider than π), boxes and planes.
- **Tile tree** (`streaming/Tile.ts`): explicit tilesets, external tilesets
  loaded on demand, transforms, refine inheritance, viewer request volumes,
  content volumes and the children-within-parent optimization.
- **`Stepwise`** (`streaming/Stepwise.ts`): the 1.x base traversal rule for
  rule (§12 spec), including dynamic SSE, children-bounds culling,
  `meetsScreenSpaceErrorEarly`, empty-subtree refinement, plane-mask frustum
  culling with 1.x's far plane, and content-volume culling at selection. Per-view
  state lives on the tiles, so one tree serves every view.
- **`Tileset3D`**: per frame, selection runs for each view of the world; tiles
  get the union of their views' bits as the record view mask, so each view
  draws its own LOD from one shared draw table. Requests are nearest-first
  with 18 in flight, uploads are capped per frame, and eviction is LRU over
  untouched tiles above a 512 MiB budget. Unsupported formats (pnts, i3dm,
  cmpt) load as empty content with a warning, so selection and refinement
  still match 1.x, which decodes them.
- **`Engine.addTileset`** builds selection inputs per view: float64
  world-space planes, SSE denominator, and height ÷ pixel ratio.
- **Viewer** streams tilesets and ion assets with live tile, selection and
  cache stats. The ground patch toggles in place and starts hidden for
  georeferenced tilesets, which can sit below the ellipsoid (underground infrastructure).

**L1 selection parity** (`parity/selection.html`, runner suite `selection`).
2.0 renders 3–4 cameras at once as views over one shared cache; 1.x renders
each camera with a stock `Cesium3DTileset` until settled. Jaccard over
selected content:

| Tilesets                                                                                      | View comparisons | Jaccard   |
| --------------------------------------------------------------------------------------------- | ---------------- | --------- |
| 9 public Specs tilesets (REPLACE/ADD, external, empty, request volumes, transforms, quadtree) | 36               | 100% each |
| 3 iModel-derived CAD tilesets (private; run with `ION_ASSET`)                                 | 4 each           | 100% each |

A 1.x bug surfaced along the way. A tileset without the (required) top-level
`geometricError` makes 1.x compute `NaN` for the root's early-out SSE, so it
always traverses the root; iTwin's publisher omits the field. `Stepwise`
copies this, with a warning. `Budgeted` should fall back to the root's error,
and the bug is worth filing against 1.x.

Results: `2026-10-30T00-18-53-878Z` (all suites; the Slang gate read +5.7%
in that run and +1.8%, +3.3%, −1.6% on reruns).

Notes for `Budgeted`, from viewing the CAD tilesets:

- **Silhouettes matter for design models.** iTwin's coarse tiles drop small
  elements, so at the viewer's default distance an underground CAD model shows less than a
  user expects, exactly as 1.x does. `Budgeted` should weigh silhouette loss
  (e.g. refine sooner when children carry geometry the parent lacks).
- A track that ends at the edge of the default view may be in the data
  itself. Check it against full detail when testing `Budgeted`.

## Increment 2 (r17): OSM Buildings, resize robustness, viewer tooling

- **Cesium OSM Buildings streams** (3D Tiles 1.0, b3dm, ADD refinement,
  nested external tilesets, a planet-sized root region). L1 selection parity
  with four simultaneous views at absolute ranges around a location
  (`?at=lon,lat`): **100%** over Philadelphia (14–21 tiles per view) and
  Midtown Manhattan (16–20). In the viewer, Manhattan loads in about 0.5 s:
  24 of 13,224 known tiles, 0.5 ms CPU and 0.9 ms GPU per frame.
- **`3DTILES_batch_table_hierarchy`** (OSM's per-building properties):
  classes, binary and JSON references, multiple parents, inheritance through
  ancestors as 1.x `getProperty`. Tested on 1.x's three hierarchy samples.
  OSM picks now return names, addresses, OSM ids and estimated heights.
- **Resize robustness.**
  - Frame ordering: targets were acquired (and canvases resized) after view
    rectangles were computed, so during a resize the present pass's scissor
    could exceed the new canvas. The frame was rejected (129 validation
    errors in a scripted resize storm). Targets are now acquired first.
  - Render-target memory: a view that changes size frees its old-size
    targets immediately unless another view still uses them, and idle pool
    textures have a 256 MiB budget, evicted after submit. In a 120-frame
    resize storm with two views, resident render targets peaked at 256 MB
    and returned to the 112 MB working set, with zero errors.
  - The viewer reports device loss instead of freezing.
- **Overview link stability.** Ground points are continuous: rays that miss,
  or hit beyond max(20 × altitude, 5 km), use the capped point dropped to the
  surface. The footprint stays closed, and the inset no longer jumps when the
  main camera looks toward the horizon.
- **Viewer.**
  - Split view: a second independent camera with its own selection over the
    shared cache.
  - A memory panel with live meters (arenas, draw records, materials, render
    targets per frame and resident against the idle cap, tile cache against
    its budget, requests in flight, upload queue) and 30-second sparklines.
  - Collapsible sections with remembered state; only the panel scrolls.
- Engine allocations are 2.1–2.5 KB per frame (from ~1.6): the overview
  link's continuous ground points, exercised by the allocation scene. Still
  independent of draw count.

Notes for `Budgeted`:

- A small view (an inset) selects far coarser tiles than the main view,
  exactly as a small 1.x viewer would. In one engine, the finer tiles another
  view already holds can be drawn at no bandwidth cost: opportunistic
  refinement from the shared cache.

Results: `2026-10-30T00-40-56-567Z`.

## Increment 3 (r18): photogrammetry

- **Google Photorealistic 3D Tiles** stream through ion. `resolveIonAsset`
  handles external assets: ion returns the provider URL with its key and no
  ion token, and the session query propagates to child requests. Required
  attributions (Cesium ion and Google logos) and per-tile data credits
  (glTF `asset.copyright`, most frequent first, as 1.x) show in a credit bar
  in the viewer.
- **Memory-adjusted SSE**, ported from 1.x `processTiles`: uploads pause
  above budget + overflow (512 + 512 MiB), the threshold rises ×1.02 per frame
  while content waits, and relaxes back below budget. The viewer meter shows
  budget, overflow and the current SSE.
- **Selection keys.** Tiles are compared by their header (JSON bounding
  volume and geometric error). Google's content URLs carry per-session
  tokens, and 1.x sorts `children` in place by distance, so neither URLs nor
  tree paths are stable across engines.
- **A bug in the port, found by photogrammetry.** 1.x computes a tile's raw
  visibility once per frame but reapplies the traversal-level checks
  (external-tileset copy, ADD early-out, children-bounds culling) on every
  update. The port guarded both with one flag, so when a parent's
  children-bounds check had already evaluated a child, the child skipped its
  own children-bounds check and stayed visible. Planet-scale REPLACE trees
  exposed it: 84–96% Jaccard before the fix, 100% after.

L1 selection parity (`2026-10-30T00-55-07-567Z`; private assets run locally):

| Data                                    | Views | Tiles per view | Jaccard      |
| --------------------------------------- | ----- | -------------- | ------------ |
| 9 public Specs tilesets                 | 4     | 1–17           | 100% (36/36) |
| Google Photorealistic 3D Tiles, Midtown | 4     | 22–164         | 100%         |
| Cesium OSM Buildings, Midtown           | 4     | 16–20          | 100%         |
| iModel-derived CAD tilesets (3)         | 4     | 0–5            | 100%         |

The M2 exit criteria are met for `Stepwise`: OSM Buildings, a CAD tileset and
photogrammetry stream, with ≥ 99% L1 in multiple views (100% measured).
`Budgeted` and its L1′ measurement remain.

## Open design question: memory management

See §13.6 for the fuller notes. 1.x's static 512 + 512 MiB per tileset is
the parity default, not a design. To work out before `Budgeted` and M5:

- One engine-wide GPU budget shared by tilesets, render targets and textures,
  arbitrated by benefit/cost across tilesets and views, rather than caps per
  tileset.
- Sizing: WebGPU exposes no VRAM query. Candidates are adaptive signals
  (allocation failures, frame time, device loss), platform heuristics, and
  an application hint.
- Cheaper residency: Google's JPEG textures become RGBA8 with mips, about 4×
  the size of a GPU block format. Worker transcoding to BC7/ASTC trades
  decode time for memory.
- What eviction keeps (decoded CPU copies vs refetching), and how tile memory
  interacts with the per-view LOD choice when views compete.

## Increment 4 (r19): `Budgeted` v1 and L1′

`Tileset3D` takes `policy: "stepwise" | "next"` (default `stepwise` until
`Budgeted` wins on every L1′ metric). `Budgeted` shares 1.x's visibility, distance
and dynamic SSE and replaces the refinement rules:

- **Skip-LOD with bounded skipping.** The SSE frontier is requested directly;
  a base level loads where nothing is resident, and an intermediate level
  every 3 levels (`skipLevels` 2).
- **Visible-only coverage.** A REPLACE tile is replaced once its visible
  children are covered.
- **Cache reuse.** Resident finer content is drawn in place of a frontier
  tile, down to a quarter of the threshold.
- **Region-grouped requests.** Frontier requests are ordered by the region
  (loaded ancestor) they will replace, nearest first.
- **1.x's NaN root error** falls back to the root tile's error.
- Content-less tiles (empty, expanded external tilesets) always refine and
  never count as covering a region. The first version did, which left holes
  over Google's external-tileset chains until their content arrived; a
  snapshot at 300 ms after the jump showed it.

**L1′** (`parity/lod.html`, runner suite `lod`). One move per policy: settle
at 6 km, jump to 450 m over the same spot, measure from the jump until
settled. Image error is FLIP against a fully refined reference (SSE 2).
Google Photorealistic 3D Tiles over Midtown:

| Policy                  | Requests | MB  | Settle | FLIP @250 ms | @1 s  | Settled |
| ----------------------- | -------- | --- | ------ | ------------ | ----- | ------- |
| `Stepwise` (1.x)        | 315      | 426 | 3.3 s  | 0.499        | 0.421 | 0.148   |
| `Budgeted`              | 147      | 222 | 2.0 s  | 0.564        | 0.564 | 0.148   |
| `Budgeted`, 64 requests | 147      | 222 | 1.3 s  | 0.564        | 0.148 | 0.148   |

`Budgeted` fetches less than half the data for the same final image and settles
faster. 1.x's cap of 18 concurrent requests alone costs about 0.7 s here
(HTTP/2 and decode capacity, not connections, are the real limits now). The
remaining gap is in-between quality: `Budgeted` keeps a region's coarse
ancestor until all its visible frontier tiles have arrived, while 1.x's
level-by-level refinement (at twice the bytes) improves in small steps.

**Next step: mixed-LOD drawing** (§13.1).

## Increment 5 (r21): mixed-LOD drawing

- Records carry a placeholder depth offset (meters, f32) and a per-view
  placeholder mask. The vertex shader moves a placeholder's vertices along
  the camera ray by the offset: screen position unchanged, depth pushed
  back. The offset is the tile's geometric error, the bound on its surface
  deviation. Ported to Slang.
- `Budgeted` returns covers (tiles plus completeness). An incomplete cover keeps
  the finer content that has arrived; the nearest loaded ancestor draws under
  it as a placeholder, in that view only. Regions sharpen tile by tile.

L1′, Google Photorealistic 3D Tiles over Midtown
(`2026-10-30T01-23-54-061Z`):

| Policy                              | Requests | MB  | Settle | FLIP @250 ms | @1 s      | Settled |
| ----------------------------------- | -------- | --- | ------ | ------------ | --------- | ------- |
| `Stepwise` (1.x)                    | 315      | 426 | 3.5 s  | 0.499        | 0.421     | 0.148   |
| `Budgeted` + mixed LOD              | 147      | 222 | 2.1 s  | 0.499        | **0.220** | 0.148   |
| `Budgeted` + mixed LOD, 64 requests | 147      | 222 | 1.6 s  | 0.499        | 0.288     | 0.148   |

OSM Buildings (ADD refinement, shallow) is identical under both policies.
Frames at 400, 800 and 1300 ms after the jump show fine tiles over
placeholders, with no holes or visible z-fighting.

## A second 1.x selection bug

Near the Brooklyn Bridge, 1.x (and `Stepwise`, at 100% parity there) draws a
coarse tile at SSE 446, 30× the threshold, as a dark blocky rectangle over
the water. Mechanism:

1. A REPLACE parent is visible: its loose bounding box touches the frustum.
2. Each child is then marked invisible by children-bounds culling
   (`cullWithChildrenBounds`, on by default), because none of that child's
   own children intersect the view.
3. "No visible children → don't refine" fires, and the parent is selected.

The parent's own children-bounds check uses its children's raw visibility,
but the refinement decision uses their culled visibility. With loose
volumes (Google's) the two disagree, and a very coarse tile is drawn where
nothing, or the finer tiles, should be. `Budgeted` treats a region with no
visible children as empty and shows the correct detail there.

## Increment 6 (r22): hold, prefetch, clipped mixing; design models

The r21 depth offset was the wrong mechanism (§13.1): placeholders fell
behind unrelated surfaces and the context globe, jumped as tiles changed
role, and textures swam. Removing it exposed a worse problem it had been
hiding: rotating brought an unloaded tile into view, the region fell back to
its nearest loaded ancestor (near the root, since levels were skipped), and
selection dropped from about 400 tiles to 3 for a second. Pulling back did
the same.

- **Hold** (both directions) and **zoom-out hold**: a view keeps what it
  drew last frame until the replacement is complete.
- **Prefetch band**: a wider frustum loads what would display just off
  screen, at the lowest priority and 2× the SSE threshold.
- **Clipped mixing**, only where children partition their parent
  (`mixedLod: "auto"`): the ancestor draws at its true depth inside its
  missing descendants' boxes, discarded per fragment elsewhere. Clip boxes
  live in a per-world buffer, one block per placeholder tile, stored hi/lo
  and tested camera-relative. Ported to Slang.
- **Missing top-level `geometricError`** (iTwin exports): `Budgeted` used the
  root's error to decide whether to hide the whole tileset, and a zoomed-out
  design model vanished. The root's error now only drives refinement; the
  tileset is never hidden, as in 1.x.
- **iTwin mesh export**: `resolveITwinIModel` (share key or access token),
  as 1.x `ITwinData`; the viewer takes `?imodel=` and L1′ takes `IMODEL=`.
- Viewer: a live maximum-SSE slider and a placeholder count.

L1′, Google Photorealistic 3D Tiles over Midtown, unthrottled
(`2026-10-30T02-03-44-893Z`):

| Move     | Policy                | Requests | MB  | Settle | FLIP @250 ms | @1 s      | Settled |
| -------- | --------------------- | -------- | --- | ------ | ------------ | --------- | ------- |
| jump in  | `Stepwise` (1.x)      | 315      | 426 | 3.2 s  | 0.499        | 0.421     | 0.148   |
| jump in  | `Budgeted`, no mixing | 217      | 271 | 1.8 s  | 0.499        | **0.155** | 0.148   |
| jump in  | `Budgeted`, mixed     | 217      | 271 | 1.7 s  | 0.499        | 0.160     | 0.148   |
| zoom out | `Stepwise` (1.x)      | 40       | 26  | 1.4 s  | 0.490        | 0.490     | 0.490   |
| zoom out | `Budgeted`            | 27       | 19  | 1.4 s  | 0.496        | 0.496     | 0.496   |
| pan      | `Stepwise` (1.x)      | 93       | 154 | 1.5 s  | 0.533        | 0.554     | 0.554   |
| pan      | `Budgeted`            | 83       | 132 | 1.4 s  | 0.548        | 0.554     | 0.554   |

Hold and prefetch improved `Budgeted`'s jump-in FLIP at 1 s from 0.220 (r21) to
0.155. Prefetch costs about 70 requests and 50 MB, still 35% fewer bytes than
1.x. Mixing makes no measurable difference here: requests are grouped by
region, so regions complete together and partial states are brief on a fast
network.

**Throttled L1′** (20 Mbit/s shared link, 80 ms latency, no cache; applied
at Playwright's request router, which also sees worker fetches; CDP network
emulation can't attach to workers). L1′ now also reports **FLIP avg**:
FLIP sampled every 500 ms from the move until settled, so it rewards a
good image while loading, which fixed marks miss on slow links. The runner
serves pages from its own Vite server with watching and HMR off, so edits
can't reload a run.

Midtown, jump in (`2026-10-30T02-44-06-405Z`):

| Policy                | Requests | MB  | Settle | FLIP @1 s | FLIP avg  | Settled |
| --------------------- | -------- | --- | ------ | --------- | --------- | ------- |
| `Stepwise` (1.x)      | 315      | 426 | 25.9 s | 0.499     | **0.267** | 0.148   |
| `Budgeted`, no mixing | 217      | 271 | 17.4 s | 0.499     | 0.288     | 0.148   |
| `Budgeted`, mixed     | 217      | 271 | 17.4 s | 0.499     | 0.279     | 0.148   |
| `Budgeted`, 64 req.   | 217      | 271 | 17.4 s | 0.499     | 0.319     | 0.148   |

**Correction (r23):** the average below ran only until each policy
settled, which favors slow policies (a long tail of near-final images
lowers the mean). Averaged over a common horizon per move (the slowest
settle, each policy held at its settled image), `Budgeted` beats 1.x on
both links: jump-in FLIP avg throttled 0.225 (18 requests) and 0.251
(adaptive) vs 0.274 for 1.x; fast 0.189 (adaptive) vs 0.278
(`2026-10-30T03-55-56-593Z`, `03-56-55-728Z`). The adaptive window is best
on fast links and second on slow ones; tuning it there is planned work.
The paragraph below is kept as originally written.

On a slow link 1.x looks better on average while loading, though it settles
8.5 s later on 57% more bytes: loading every level improves the image in
small steps, while `Budgeted` skips levels and a region stays coarse longer.
Mixing narrows the gap a little. More concurrency hurts on a saturated
link: 64 parallel requests split the bandwidth, so everything arrives later
and together instead of nearest first. Consequences: adaptive concurrency
grows only while throughput rises (§13.2), and how many levels `Budgeted` skips
should follow bandwidth (skip on fast links, load intermediate levels on
slow ones), which is §13.3's benefit per byte. Pan: equal FLIP avg (0.546
to 0.549), `Budgeted` 7.4 s vs 8.0 s. Zoom out: equal within noise (one `Budgeted`
run settled in 7.0 s against 2.0 to 2.4 s for the others; to recheck).

Design models (the station iModel pair, iTwin mesh export, throttled): the
station jumps in 7.3 s (`Budgeted`) vs 10.8 s (1.x) on 25 vs 37 MB with equal
FLIP; the surrounding area 19.6 to 19.8 s vs 20.6 s on 64 vs 66 MB. Mixing
never engages (their children overlap, so `auto` keeps whole-region swaps),
and zoomed out `Budgeted` now draws the root as 1.x does. The default L1′
cameras (from the root sphere) suit compact tilesets poorly; long, thin
models need cameras along their axis.

**Content pipeline diagnostics.** Each content load is timed per stage:
queued (wanted until a request slot frees), network and decode (in the
worker), worker wait, upload wait (the per-frame upload cap) and upload.
`Tileset3D.pipeline()` gives p50 and p95 over the last 256 loads;
`Tileset3D.resident` sums what loaded content holds (formats, triangles and
lines, geometry vs texture bytes, image types, features). A single glTF
model reports the same stages. The viewer shows them in a Content group, a
status line (streaming or idle), a load timeline (resolve, root, first
content, settled) and a "last move" row (settle time, requests and bytes
after each camera move), plus history lines for bytes received, requests
in flight against the cap, upload queue and decode time.

First readings, Midtown in the viewer (`Budgeted`, unthrottled):

- **Queued p50 3.0 s, p95 4.4 s; network p50 133 ms.** Tiles wait about 3 s
  for one of the 18 request slots, then download in a seventh of a second.
  The cap, not the network, dominates (§13.2).
- **111 MB received became 543 MB of textures** (JPEG decoded to RGBA with
  mips, about 8× its wire size; 953 MB resident in all). Texture transcoding
  (§13.6) is the largest memory lever for photogrammetry.
- **Prefetch and hold keep content resident:** tiles they touch can't be
  evicted, so the cache sat near budget + overflow (953 of 1024 MB). Prefetch
  should yield to the budget before the memory-adjusted SSE rises.

Next:

M2 close-out:

1. Adaptive request concurrency (`RequestScheduler`, r23): wins on fast
   links; slow-link fix (ProbeRTT, transfer-corrected latency, latency-based
   startup exit) being measured.
2. `TileSource`: one streaming abstraction for 3D Tiles, quantized-mesh
   terrain and imagery, sharing the scheduler, cache and per-view selection.
3. One engine-wide cache budget across tilesets, terrain and imagery
   (§13.6), replacing per-tileset 512 + 512 MB.

Then M3 (globe), then the planned `Budgeted` selection work (§6): budget-driven refinement, multi-view
priority, silhouettes and HZB feedback, worker traversal over an SoA tile
table, paging and readahead lessons, a second photogrammetry city.

Done along the way: `Budgeted` is the default (parity harnesses pin
`stepwise`); rendering is on demand, per view, including views sharing a
canvas (§13.8).
