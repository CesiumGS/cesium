# The transform graph: implementation plan

**Status (2026-11-12):** tasks 1–5 have landed.

| Task | Commits |
| --- | --- |
| 1 | `7726acf613` |
| 2 | `a868441a50` |
| 3 | `a3c59bda7b` |
| 4a | `dfb2b88dde` |
| 4b | `23c7b191be`, `811ed8814a` |
| 5 | `e242b4609b`, `e3b3d015de` |

- **Task 5 left two things open:** tessellation is a spike only, and Taylor bounds aren't used for selection on geodetic routes.
- **Tasks 6–8 unblocked (owner, 2026-11-12):** the tree with per-view switch nodes and the names (`affine`/`smooth`; modules `transform`, `frames`, `georeference`, `transforms`) are confirmed. After task 8, a handbook revamp for the new model (owner).
- **The exaggeration example's remaining ~1 s long task** is warped tile bounds in selection (`drawnTile` → `scaledImage`), not shader compilation.
- **Per-view route structure (task 6's known limit) is closed, not yet committed:** views that reach an anchor by routes of different shape are drawn by one twin of each mesh draw per shape (`src/scene/world/variants.ts`; CESIUM2_WEBGPU_PLAN.md §13.37, "Per-view route structure"). Billboards, instanced draws and patch draws have no twin.

> **For agentic workers:** execute task by task, with a fresh implementer per task. Verification is lean, as the owner asked on 2026-11-11:
>
> - each task runs typecheck, eslint and prettier on its files, its own targeted tests, and at most one headless check;
> - the lead runs the full suite and the spikes once before each commit;
> - no baseline worktrees or benchmarks unless the task says so.
>
> Name existing code by symbol (`grep -rn "class WarpFrame" packages/next/src`). Other agents share this checkout: start each task with `git status` for the files it changes.

**Goal:** replace §13.26's warps (`warpFrame`, `Warp.presentation`, `Warp.domain`, one warp context per world) with one transform graph.

- **Edges:** each is affine or smooth (a differentiable function with parameters).
- **Placement:** where content and cameras sit decides what is warped.
- **Compilation:** a compiler differentiates smooth nodes automatically and emits fused GPU code per route shape, with a float64 CPU path for truth.
- **Library:** built-in transforms in Slang autodiff with TS mirrors; application functions in restricted plain JS.

**Spec:** CESIUM2_WEBGPU_PLAN.md §13.37, plus the session note `transform-graph-unified.md` and the handbook's "Transform graph (draft)" tab.

**Decisions in force (owner, 2026-11-11):**

- application functions are restricted plain JS, parsed from source with no `eval`; a builder comes later;
- built-ins are Slang `[Differentiable]` with a TS mirror and a parity test;
- warps land before the shared IR work;
- the raw layer is called "transform graph".

**Decided by the owner (2026-11-12), formerly the lead's defaults:**

- a tree with per-view parameters and switch nodes, not a DAG;
- `affine(...)` / `smooth(...)` nodes;
- modules `transform`, `frames`, `georeference` and `transforms`.

**Builds on:**

- `277f2f3e57`, the GPU warp spike: `warpForms.ts`, `warpDirect.ts`, `warpFitGpu.ts`, `warpFitDirect.slang` and `warpFitGpu.slang`;
- the fits, picks by domain point, drawn bounds and curved clips from §13.26.

## Architecture

- **`src/transform/` (core, no geo knowledge):**
  - `graph.ts`: nodes (`affine`, `smooth`, `switch`), parenting, revisions.
  - `route.ts`: a route between two nodes, with affine runs collapsed and smooth steps up (forward) or down (inverse by Newton, or the declared inverse).
  - `ir.ts`: about 25 ops on scalars and vec3.
  - `parse.ts`: restricted JS source to IR.
  - `ad.ts`: forward-mode duals for J, and hyper-duals for H.
  - `interval.ts`: bounds over a box of positions and parameter ranges.
  - `codegen.ts`: IR to WGSL, with df64 variants for centre constants.
  - `compile.ts`: a route shape to a cached GPU program.
  - `accuracy.ts`: Σ propagation, taking over `frames/pointAccuracy.ts`'s quadrature.
- **`src/transforms/`** (built-ins): Slang sources with `[Differentiable]` (`transforms.slang`), TS mirrors, and descriptors that give the compiler an IR or an intrinsic.
  - Families: scale-about, bump, bend, twist, taper, lattice (FFD), radial lens distortion (Brown–Conrady), corridor unroll, 1D velocity model.
- **`src/georeference/`:**
  - `verticalExaggeration`, now a lift profile that is constant above a ceiling;
  - `heightOffset` and flattening;
  - reprojection nodes, absorbing `src/proj`'s operations;
  - CRS readers (`EXT_geospatial_crs`, WKID, WKT2, `EXT_georeference`);
  - `Georeference`, replacing `DesignPlacement`.
- **`src/frames/`** keeps the reference-frame catalogue (ICRF, ITRF, bodies, EOP, ephemerides) and feeds the graph. `warpFrame`, `heightWarps.ts` and `warps.ts` move to `transforms` or `georeference`, or are deleted.
- **The renderer** consumes compiled route programs:
  - per draw, a centre constant (CPU float64, or a df64 compute pass for parameters that don't separate);
  - per view, the parameter uniforms;
  - per vertex, the residual. Today's `WorldWarps` becomes the scheduler for this, and its fits stay as the fallback for functions the compiler refuses.

## Tasks

### Task 1: graph and routes (CPU only)

- **Build:** `src/transform/graph.ts` and `route.ts`.
  - **Node kinds:** `affine({ matrix | at(seconds) })`, `smooth({ forward, inverse?, params, accuracy? })` and `switch({ byView })`.
  - **Routes:** up or down through the lowest common ancestor. Collapsed affine runs become one float64 matrix. `route.forward(p)` and `route.inverse(q)` evaluate in float64. `route.shapeKey` is the node kinds and the switch choices, without values.
  - **Adapter:** today's `Frame` catalogue maps onto it (each `Frame` edge is an affine node), so `FrameResolver` can delegate.
- **Tests:** composition and inverse round trips (affine, smooth, mixed), the switch chosen by view, shape keys stable under parameter changes, and the Moon unwarped when the deformer sits over Earth content.

### Task 2: IR, restricted JS parser, autodiff and intervals

- **IR (`ir.ts`):** constants, parameters, `p.x/y/z`; `+ - * /`, `neg`, `abs`, `min`, `max`, `select` (ternary), `sqrt`, `exp`, `log`, `pow`, `sin`, `cos`, `tan`, `atan`, `atan2`, `asin`, `acos`, `sinh`, `cosh`, `tanh`, `floor`, `fract`, `clamp`, `mix`, `smoothstep`; vec3 construct, dot, cross, length and normalize. Local `const`s, and `for` loops with constant bounds (unrolled).
- **Parser (`parse.ts`):** read `fn.toString()` with a small hand-written parser for the subset (no new dependency, unless acorn turns out to be smaller to adopt).
  - **Accept:** arrow or function expressions with parameters `(p, params)`; reads of `p[0]`, `p.x` and `params.name`; `Math.*`; and the lowered forms `Math.pow` and `void 0`.
  - **Refuse,** with an error naming the construct and its position: free variables other than `Math`, calls to other functions, objects, arrays beyond the vec3 literal, `this`, and assignment to parameters.
  - **Minifier safety:** a test runs esbuild with minify on sample functions and checks they still parse.
- **Autodiff (`ad.ts`):** forward-mode on the IR. J with 3 dual lanes, H by forward-over-forward. Checked against finite differences.
- **Intervals (`interval.ts`):** natural interval extension over a position box and parameter ranges, with monotone ops tightened. Used for bounds and as a sanity check on Taylor residuals.

### Task 3: built-in transforms (Slang autodiff and TS mirrors)

- **Slang:** `src/shaders/transforms.slang` holds the families listed above, as `[Differentiable]` functions of (p, params). `fwd_diff` gives J. H uses nested `fwd_diff` where the family is ≤ cubic in p; otherwise an analytic H.
- **TS mirrors** live in `src/transforms/*.ts`. Each built-in carries a descriptor: `{ id, params schema, ts forward, ts jacobian?, slang entry, separable params }`.
- **Parity test:** generated WGSL entry points are run through the existing parity harness (as `parity/slang` does) at sample points, checking float32 against float64 within a stated tolerance.
- **Geo families** in `src/georeference/`: `verticalExaggeration({ body, factor, ceiling })` (lift above the ceiling), `heightOffset`, `flatten({ polygon, height, falloff })`, and reprojection (transverse Mercator/UTM, LCC, Web Mercator, geographic↔geocentric) from `warpForms.ts`.

### Task 4: the compiler and the GPU back end

- **`compile.ts`:** for a route shape, emit one WGSL function `transformPoint(p_local, draw, view) -> vec3`.
  - Collapsed affine runs become matrices.
  - Each smooth node becomes the centre constant (per draw, hi/lo) plus the residual in float32 offsets: the full function on (c + δ) − f(c), or the Taylor polynomial when the draw is small (the compiler chooses by draw size and declared error).
  - Normals come from the cofactor of the composed J (AD-generated WGSL), followed by Gram–Schmidt against the tangent.
- **Parameters:** those that enter linearly are uniforms (detected on the IR). Others mark the node "centre-dynamic", which adds a per-frame df64 compute pass for the centre constants (from `warpFitDirect.slang`).
- **Caching:** pipelines are keyed by `shapeKey` plus the material variant. Reuse `ShaderCache`'s async compile and the `whenReady` gate.
- **Fallback:** the fitted lattice path, unchanged, for smooth nodes whose functions the compiler refuses (JS outside the subset).
- **Check:** a spike `spikes/transformGraph.ts` against float64 (positions within the stated error, normals within 0.1°), and one route with a time-varying parameter at 60 fps of GPU time.

### Task 5: picks, measurements, bounds, clips and tessellation through routes

- **Picks:** they carry the content's local point (the domain point) and its node. `pick.in(node)` evaluates the route in float64. True and drawn are just two frames.
- **Measurement:** distances, areas and accuracy in a named node. Accuracy: Σ along the route from each node's σ and the AD J.
- **Selection bounds:** interval or Taylor bounds per tile over parameters' expected ranges (and `valid` ranges for clamping), replacing `warpBounds.ts`'s sampling where an IR exists.
- **Clips:** a clip set is placed at a node. Curved clips come from the route between the clip's node and the content's.
- **Tessellation:** an H-based chord bound per triangle edge. A compute subdivision pass for meshes whose bound exceeds the tolerance, reusing the b-rep dicing's indirect-draw path. B-rep patches evaluate the route after `vsPatch`'s surface evaluation.
- **Status (2026-11-12):** built as above except that selection bounds keep sampling and tessellation is a spike (`spikes/routeTessellation.ts`), not wired; results and reasons in CESIUM2_WEBGPU_PLAN.md §13.37, "Queries through routes".

### Task 6: migrate the engine and examples

- **The vertical exaggeration example:** the deformer sits over the Earth's content node (terrain, tileset, model, pins), and the camera is at ITRF. Height visuals read true height through the route.
- **The globe:** terrain keeps the exact h·n̂ path as the built-in's intrinsic for `verticalExaggeration` on its own body.
- **Removals:** delete `Warp.presentation`, `Route.presentation`, `PresentationRouteError` and the "one warp context per world" code. `NonRigidRouteError` remains only for asking a matrix of a smooth route.
- **Per-view parameters:** `view.setParameter(param, value)`.
- **Other moves:** the design globe moves to a switch node; the clipping example's curved clip moves to a node-placed clip.
- **Docs:** handbook tabs (Warps and routes becomes Transform graph; the draft tour stays) and `api/surface.txt` with handbook rows.

### Task 7: rewrite plans 5c and 5d

Rewrite plans 5c and 5d against the graph. Their open questions are answered by placement (§13.37's table). Remove the amendments that no longer apply.

### Task 8: the "Transform graph" gallery example

Build the gallery example from §13.37's eight scenes, on real data, each with its graph and route shown.

## Order and size

Tasks 1 and 2 can run in parallel. Task 3 needs 2's descriptor shape, Task 4 needs 1 to 3, Task 5 needs 4, and Task 6 needs 5; Tasks 7 and 8 come last. Tasks 2 and 4 are about a week each with agents, and the rest are a few days each.

## Follow-ups: known limits and their general fixes (owner, 2026-11-12; not started)

The owner asked for these to be planned, not started.

### Task 9: the IR and the built-ins (task 3's limits)

The IR has no arrays, no data-dependent loops, and no `atanh`, `asinh`, `%` or `expm1`. So:

- the lattice, corridor and flatten sources are generated per shape, which means a new pipeline per polygon or lattice;
- the ellipsoid foot is 5 unrolled Newton steps;
- missing ops are rewritten by hand.

**General fix: grow the IR, not the workarounds.**

1. **Array parameters.** Fixed-size arrays of scalars or vec3 (lattice control points, polygon vertices, alignment elements) become uniforms or storage, with indexed reads.
   - A shape's source no longer embeds its data, so one pipeline serves every polygon of a kind. Only the element count enters the key, bucketed.
2. **Bounded loops** with a declared maximum iteration count and an early exit: a WGSL `for` with `break`, unrolled only when short.
   - Newton solves become ordinary IR, with a contraction check, so inverses of bump, lattice and flatten, and the corridor's projection onto its alignment, can be compiled rather than TS-only.
   - AD goes through the loop by the implicit-function theorem (the solve's Jacobian is the inverse of the forward Jacobian at the solution), not by differentiating the iterations. This also answers task 5's finding that the unrolled foot iteration ruins interval bounds: bound the converged map, not the iteration.
3. **Missing ops:** `atanh`, `asinh`, `acosh`, `expm1`, `log1p`, `%`/`mod`, `hypot`, with df64 and residual rules.

**Per-family fixes:**

- **Flatten:** today's distance is a local planar approximation. Measure distance to the polygon in a gnomonic frame centred on it, where geodesics are straight lines. Edges are then exact segments, and the planar distance agrees with the geodesic one to second order. Polygons wider than about 500 km are split into tiles.
- **Corridor unroll:** a polyline's outer corners leave gaps. Use C¹ alignment geometry (lines, circular arcs and clothoids, as IFC 4.3's `IfcAlignment` does), or fillet polyline corners with arcs of radius at least the strip's maximum offset.
  - An offset curve is regular while |offset| < 1/κ, so the strip has no gaps or folds.
  - The inverse becomes closed form per element (dot product, `atan2` about the centre, bounded Newton on a clothoid) and compiles.
- **Bend:** its inverse needs |θ| < π. Injectivity gives a parameter's `valid` range: det J > 0 and no global overlap. Bend derives it, the engine clamps animated values to it and refuses a direct set outside it. Every built-in declares its `valid` range the same way.
- **TM Jacobian:** central differences today. Use the IR's AD Jacobian, now exact, and drop the difference.

### Task 10: per-view routes without twins (task 6b's limits)

**The limits:**

- billboards, instanced draws and b-rep patch draws get no per-view twin;
- a ray query with no view sees both a draw and its twin;
- a view whose route differs only in a draw's record data (a rigid step before the last warp) shows its group's first view.

**General fix: choose the program per (draw, view), not per draw.** Bundles are already recorded per view.

- A draw keeps one record per route group it needs: centre constants in a per-view-group block of the placements buffer, indexed by a small per-view table.
- Each view's bundle binds that group's pipeline for the draw. The vertex stage reads the block for the view being drawn.
- That makes one draw serve every view with no twins. Every draw kind gets it, because instances, billboards and patches all read the same per-draw block; patches through `vsPatch`'s route call.
- Ray queries see one draw and route it per view, or per the view they name. A view-less query uses the true route.
- The 6b twin machinery (`src/scene/world/variants.ts`) is then deleted.
- Cost: one extra indexed read per vertex, and a block per route group in use (usually one).

**Also to look into:** a 14 m slab at ×10 on the compiled route draws 3.6 px off. This predates 6b, and was seen with the warpViews spike's buildings. Compare the compiled residual against float64 for tall extents (the residual rules are exact, so suspect the drawn bounds or the depth path) before task 10.

### Task 11: the camera branch (scene 7's gaps; partial work saved)

- **The gaps:**
  - Streaming tilesets through a lens on the camera branch draw nothing, because selection is done through a map with z ≤ 0.
  - Moving the camera re-derives routes for every draw, at 250–400 ms a tick.
  - Routes through a smooth step's inverse don't compile.
- **The general fix:** a camera-branch smooth node acts in camera space after the view matrix. Call it an "eye step": a per-view post-view smooth step evaluated in the vertex stage from uniforms only, needing no float64 centre because camera-space coordinates are small.
  - Selection uses the route without the eye step, padded by the eye step's largest displacement at each depth.
  - Inverse steps compile when they carry an `inverseSource`.
- **Partial work exists:** a cancelled agent got part of this done (`compileEye.ts`, `cameraEffect.ts`, `inverseSource`, and selection changes). It was reverted because it broke two tests (the frame loop's sleep, a translucent-terrain pick). It is saved in the session files (`lens-wip/`) to resume from.

### Task 12: streamed content under smooth nodes as cheap as under affine ones (owner, 2026-11-12)

**What the owner saw:** tilesets streamed through a smooth node load slowly. Fitting isn't the cause: it is the fallback, and the vertical-exaggeration example runs 0 fits. The cost is per-tile work that still happens on the CPU before a tile can draw, and per-shape pipeline compiles. "On the fly" covers only the vertex stage today.

**The costs, measured or read from the code:**

1. **Drawn bounds for selection.** Selection needs each tile's bounding volume after the warp before the GPU sees the tile. It samples the route at 7–27 points per tile in float64, with the exact height solve (`drawnTile` → `scaledImage` → `footOf`).
   - That was the exaggeration example's remaining long task (about 1 s).
   - Exaggeration also refines more tiles, so more tiles pay.
2. **Centre constants on the CPU.** A static route's F(c) is computed once per draw in float64. A lift is microseconds, but the nested UTM route is about 183 ms per 1,024 draws.
3. **Per-route-shape pipeline compiles.** Generated WGSL of up to about 280 KB takes 2.3–4.3 s per pipeline in the GPU process, compiled one at a time. A routed draw stays hidden until its pipelines exist, so content appears late on first load.
4. **Terrain loses its exact path under a ceiling.** `verticalExaggeration` with a `ceiling` drops `heightScale` (src/georeference/heightWarps.ts), so the globe's exact `h·n̂` path turns off. Terrain then pays costs 1–3, as in the gallery's scene 1.

**Status (2026-11-12): fixes 1 and 2 built** (`d66510f3cd`, `bbde3070d8`); 3 and 5 not started; **4 (the interpreter pipeline) deferred by the owner** as more than is needed now. Keep it as written below, to revisit if compile latency still shows once the rest lands.

**Measured after fixes 1 and 2** (the exaggeration scene, in the app's browser pane on Apple Metal; `scripts/profilePage.mjs` for the CPU):

- The main thread is busy 5.2 s of 25 s, with no fits and a longest task of 562 ms, so CPU is no longer the limit there.
- Tiles drawn grow with the factor: ×1 gives 184 tiles at 29 ms GPU (settled), ×5 gives 949 at 77 ms (still loading), and ×10 gives 1,795 at 106 ms (still loading, 1,236 waiting to upload).
- The cause is selection's `geometricError × σ_max`. Under a lift, σ_max ≈ k, so keeping the same pixel error takes about k times the tiles. That is correct for the drawn surface, but it costs about k×. Fixes 3 and 5 don't change it, and terrain no longer pays them in this scene.

**Built after measuring (2026-11-12):**

- **The GPU, per pass, at ×10:** 92 ms a tick (opaque 67 ms, depth prepass 13 ms, shadows 11 ms) against about 40 ms at ×1. Tiles waited 19.6 s (p50) to upload while an upload takes 0.1 ms, because uploads were paced per rendered tick at 8 ticks a second.
- **Upload pacing by time** (`b970854262`, `d292e23e21`, `21ee66bdc2`): while uploads wait, a tick's allowance scales with its length over 16.7 ms, up to 8×. An idle gap counts as 1×. Requests, admission and the cache budget are unchanged. Benchmark runs record `uploadPacing: 2`.
- **Per-tile terrain error, refitted** (merged in `3b891e09a7`): when a child's mesh arrives, the largest vertical gap between it and its parent's mesh is measured at both meshes' vertices and at their edges' crossings. A parent's error becomes min(the level estimate, the largest of gap + child error) over its four children. The work per tile is capped against crafted data, falling back to the level estimate.
  - It applies to all terrain, warped or not (owner, 2026-11-12). The `globe` suite keeps 1.x's selection in five of six views; San Francisco coast selects 24 tiles to 1.x's 27 (overlap 0.82), because smooth ground stops refining earlier.
  - A predictive estimate for tiles whose children aren't loaded exists behind `predictiveErrors`, off. On synthetic fractal terrain it underestimated the true error on 72–100% of tiles at ratio 0.5.
- **Direction-aware vertical error** (same merge): under a height profile, a globe tile's error is g′max · ε · sin θmax, with θ between the view ray and the local up, instead of σ_max · ε. Top-down views at 200 km get over 20 times less. With no warp, nothing changes.

**Fix 6 (candidates, owner to choose): refinement under a smooth node.** The error policy and occlusion culling remain; horizon culling folds into occlusion culling.

**Fix 8: level of detail through a warp (design, 2026-11-12; owner asked for it).** This covers the error policy, transitions that hide pops, and the general rule for terrain and 3D Tiles under any smooth node.

- **What was measured:** at ×10, the exaggeration scene settles at 3,360 tiles to ×1's 144, and the GPU frame is about 250 ms on an M2. That is real demand under today's rule, not a leak: requests stop and the cache holds about 250 MB of its 512 MB. Under a warp that moves vertices, `Budgeted.mixes()` turns mixed LOD off, so tiles swap whole regions at once, and each swap is a large pop at ×10.
- **The general rule.** A tile's error is a vector in its own (true) frame, of size ε. Its drawn size is |J·ê|·ε, with ê the error's direction and J the route's Jacobian. Its screen size is that over the distance, projected.
  - **Heightfields (terrain, and 3D Tiles that declare it):** ê is the local up. The bound on |J·ê| comes from fix 2's entrywise bounds as the norm of |J|'s up column over the tile's box. This replaces fix 6's special case, g′max · sin θ, with one rule for every bounded warp: lifts, projections, bends.
  - **Meshes with no declared direction (most 3D Tiles):** isotropic, σ_max · ε, as today, or per axis from the same bounds.
  - **Chord error:** a warp that curves straight edges adds the edge's chord error, M₂ L² / 8 (task 5's `curvatureOver`), to the drawn error. Large flat triangles under a strong bend then refine, or are tessellated once task 5's subdivision is wired.
- **The error policy.** Each smooth node carries `lodExponent` α in [0, 1], and a view may override it. Selection uses s^α in place of the stretch s (the |J·ê| or σ_max above).
  - α = 1 is exact in the drawn frame (today). α = 0 measures error in the true frame, as 1.x does, so drawn pops grow by s. α = 0.5 is between.
  - **Proposed defaults:** the vertical exaggeration declares 0.5, because it's a visualization and at ×10 its error factor drops from 10 to about 3.2. Every other node declares 1. Projections are near s = 1 anyway. The owner decides.
  - **The settings live on the node,** because the node knows what it's for. The view override lets one view of a split compare.
- **Transitions, so a coarser level is acceptable:**
  - **Mixed LOD under warps:** test a placeholder's clip boxes against the content's true point (the vertex stage already carries it as a varying, `814f561970`), not the drawn one. The boxes then move with any warp, and `mixes()` no longer needs to turn mixed LOD off for tilesets that move vertices. This removes the whole-region swaps.
  - **Terrain geomorphing:**
    - Each child vertex carries its parent's surface height at its (u, v). The refit already computes it (`terrainRefit.ts`), so it becomes one more component of the profile attribute.
    - After a tile appears, the vertex stage blends h from the parent height to its own over about 300 ms, before the lift: g(mix(h_parent, h, t)). When coarsening, the children stay until they have morphed back.
    - This works under every height profile, and for any warp, morphing in the true frame before the route.
    - **Built (2026-11-13), terrain only:** the attribute is `_HEIGHT_MORPH`, `(n̂, parent height − own height)` per vertex (4 components, so it needs no height attribute and works unwarped); the draw record carries the start time; `View.lodTransitions: "morph" | "pop"` (default "morph"); the loop's wake reason is `morph`.
    - **Coarsening pops in this first version.** TODO (plan text, not code): morph out. The children must stay alive after the selection deselects them, until they have morphed back to their parent's surface, then be released.
  - **Meshes without correspondence (3D Tiles replacement):** a dithered cross-fade of about 300 ms between a parent and its children, both drawn opaque with a blue-noise discard. Only the kept pixels write depth, so occlusion stays correct. The pair costs about twice as much for the fade's duration.
- **Transitions are where the error shows (owner, 2026-11-12):**
  - **A swap or a mixed-LOD boundary shows the gap between two levels.** Its drawn size is s · ε_parent, with s the stretch of every node above the content, affine scales included. A model scaled ×10 by an affine node pops ten times as far, as an exaggeration of 10 does.
  - **During loading it's worse:** a coarse ancestor several levels up stands in, with an error of 2ⁿ times the threshold, times s. That's what the exaggeration scene shows while it loads: large untextured coarse peaks (imagery not loaded yet) poking through finer ones nearby.
  - **So:**
    - Request priority follows the drawn error that's showing (s · ε of the tile now drawn in that place, over its distance), so the largest visible errors close first.
    - Mixed LOD works under any node, through the true-point clip test.
    - Transitions morph (terrain) or fade (meshes).
    - The measurements report the largest transition error on screen during loading as well as at rest.
  - **Affine scales:** check that selection multiplies geometric error by an affine node's largest scale, as 1.x does for a tileset's transform. If not, that's the same bug in its simplest form.
- **Owner, 2026-11-13:**
  - **Geomorphing has a switch:** `View.lodTransitions: "morph" | "pop"`, and per content where it makes sense.
  - **The exponent's default is found empirically,** not chosen. Increment 4 sweeps α over 0, 0.25, 0.5, 0.75 and 1 at several factors and views, and reports tiles, GPU time and the largest transition error. The owner picks from the curves.
  - **More than 1,000 tiles for this view is suspect.** Before tuning anything, find out why with debug views (below), tile by tile: which level each tile is, why it was refined, and what it shows as.
  - **Debug views, built into the engine as public, documented API, so application developers can debug their own scenes:** `View.debug` (or one family of debug shaders) with the following views:
    - colour by tile level;
    - tile boundaries;
    - screen-space error as a heat map, against the threshold;
    - each tile's state (drawn, a placeholder, a stand-in, held, hidden by occlusion);
    - the stretch s and α in use;
    - wireframe.
    - It's a debug shading mode in the opaque pass with a legend, not an example's private code. The prior art is 1.x's `debugColorizeTiles` and `debugShowBoundingVolume`, and Unreal's view modes.
- **Feedback must converge, not be damped:** occlusion feedback is now monotone under a still camera. A hidden verdict only blocks new refinement and never coarsens, so refinement can only grow and must reach a fixed point. Any remaining tick-to-tick flipping is a verdict changing near the threshold. The fix is hysteresis both ways (a depth margin to enter hidden, two ticks to leave), and a render is requested only when a verdict change would change the selection. A stronger damper isn't the answer.
- **Increments:**
  1. `lodExponent` per node and per view, plus the general |J·ê| factor for heightfields.
  2. Mixed LOD under warps through true-point clip tests.
  3. Terrain geomorphing.
  4. Measure: tiles, GPU, time to settle and pops, at ×1, ×5 and ×10, with α at 1, 0.5 and 0. A pop is measured as the largest screen displacement when tiles swap.
  5. Dithered cross-fade for 3D Tiles, if the measurements ask for it.

**Fix 7: occlusion feedback to selection (design, 2026-11-12).** This is the first step of the overall plan's two-phase occlusion culling (M5), and it can't leave holes.

- **The idea:**
  - Each opaque view builds a depth pyramid from its own drawn depth.
  - The next tick, tile selection tests boxes against it: the drawn tiles and their refinement candidates.
  - A tile that is occluded **stops refining and requesting children**, but it is **still drawn**.
  - Nothing is ever removed from the picture, so a stale pyramid only delays refinement by a tick or two after the camera moves. It never opens a hole.
  - Culling draws (the two-phase pass, a second set of draw arguments and bundles) waits until this has been measured, and comes only if GPU time still needs it.
- **What blocks and what is tested:**
  - The blockers are the opaque depth actually drawn: real triangles, so a peak hides only what lies behind its own pixels, and the sky (depth 0 with reversed Z) hides nothing.
  - The tested things are the drawn boxes that selection already uses (fixes 1 and 2), each tested on its own. A child's box isn't assumed to sit inside its parent's.
  - Translucent content isn't in the opaque depth, so it blocks nothing.
- **Increment 1: the depth pyramid** (`hzb` compute pass, after `opaque`, opaque views only, not shadow, pick or height views).
  - Level 0 is half the frame, rounded down. Each texel is the farthest depth of its 2 × 2 block of pixels and of every sample (the opaque depth is `depth32float`, reversed Z, maybe multisampled: the minimum value is the farthest).
  - Each further level is the farthest of 2 × 2, folding in an odd edge row and column.
  - It's an `r32float` texture with mips, kept per view across ticks, not a transient frame-graph target. The view-projection it was built with is kept beside it.
  - No loops beyond a constant bound, and every load is clamped.
  - A debug view shows a chosen level.
- **Increment 2: tile queries** (a compute pass after `hzb`, plus a readback).
  - Selection hands each opaque view a list of up to `MAX_QUERIES` (8,192) boxes: the drawn tiles and the children it would refine to. Each is a centre relative to the eye (float64 on the CPU, float32 on the GPU) and three half-axes, with the tile's slot.
  - The kernel projects the 8 corners with the pyramid's view-projection. Any corner behind the near plane, or outside the pyramid's camera, means visible.
  - It picks the level where the screen rectangle spans at most 2 × 2 texels and reads those 4 texels. The tile is occluded if its nearest depth is farther than all 4.
  - It writes one bit per query. The readback goes through a pool of buffers like `GpuTimer`'s, about one tick late, and a tick is dropped when every buffer is in flight.
  - The CPU maps each bit back to its tile's `TileViewState.occludedTicks`, a counter cleared at once when the tile is seen.
- **Increment 3: selection reads it.** In `Budgeted` only (`GlobeBudgeted` included); `Stepwise` keeps 1.x parity.
  - A tile occluded for 2 or more ticks running doesn't refine, and its children's requests drop below every visible request. A request already in flight is kept.
  - With no result yet for a tile, or after a camera cut, it is treated as visible.
  - An engine option, `occlusionFeedback`, is on by default and can be turned off for parity runs. Benchmarks record its version.
- **The switch (owner, 2026-11-12):** `occlusionFeedback: "on" | "off"` per view as well as engine-wide; off costs nothing (no pyramid, no queries). An `"auto"` mode is decided after increment 4 (below); the code keeps the tick each result was measured on so passes can run on some ticks only.
- **Translucency:** only fully opaque draws feed the pyramid. Alpha-cutout draws count; translucent, x-ray or ghosted draws, overlays drawn without a depth test, and translucent globe or terrain don't. Translucent tiles are still tested as occludees.
- **Increment 4: measure.**
  - **The cost where little is hidden:** big open expanses seen from high up (the `globe` suite's Front Range at 300 km and Everest regional, a whole-Earth view), as pyramid GPU time, query GPU time, CPU per tick to build the queries, and the occluded share. The win where much is hidden: the exaggeration scene, a craggy valley, and dense design models (a building with interiors, an industrial plant) with additive refinement.
  - **Additive refinement must stay snappy (owner):** occlusion never stops an added child from being selected and requested. It only moves the child's request into the occluded band, after every visible one, and the child is drawn as soon as it's loaded, so turning a corner usually finds it resident. Under memory pressure, occluded added content goes first. The no-refinement gate is for replacement refinement only, where the parent stays drawn. Measure how often revealed added content is already resident in a walk-through.
- **Vectors and Gaussian splats (owner, 2026-11-12): settle each when it's built.** The overall plan's §13.27 (the vector design) and M6 (splats) point here.
  - **Point splats today** write depth for any covered pixel, translucent symbols included, so a tick that draws them skips the pyramid. That's safe but switches occlusion off in those views. The fix is for splats to draw after the pyramid, or into depth the pyramid doesn't read.
  - **Vector marks:**
    - Opaque 3D marks (extruded polygons, tubes, walls) are occluders like any opaque draw.
    - Screen-space marks (points, billboards, labels) and draped marks never are, and draped content follows its terrain tile's result.
    - Labels can read the pyramid for their own visibility against terrain and buildings, a known win for declutter.
  - **Gaussian splats** are blended, so they block nothing as drawn, and their tiles are tested like any other.
    - Splats behind splats aren't caught. A later option writes a solid depth where accumulated opacity passes a threshold, for example 0.95, in its own target.
    - Splat tiles refine by replacement, so the occlusion gate applies to them.
- **Oscillation found and fixed (2026-11-12):**
  - **Measured:** at ×10 with occlusion on, loading stopped but the drawn set flipped between about 2,626 and 3,219 tiles, and the loop never went idle. With it off, the scene settled at 3,360 tiles and idled.
  - **Cause:** a refined tile that read hidden was coarsened back to its parent. That changed the depth, so its children read visible again.
  - **Fix** (`1f4fb9c463`): hiding only blocks new refinement. A refined tile keeps its children, and a result asks for a render only when a verdict changed.
- **Increment 5 (after measuring): an `"auto"` mode.**
  - Per view, run the pyramid and queries every tick while the occluded share is worth it. When it stays low (for example, under 5% for a couple of seconds), drop to one tick in N, and come back on a large camera move or a rising share.
  - The application or the camera controller can still force `"on"` or `"off"`, for example off during a fast flight, or on for a walk-through.
  - The exaggeration scene at ×1, ×5 and ×10 (tiles drawn, requests, bytes, GPU per tick, time to settle), the `globe` suite's six views (1.x parity must hold), and a camera flight for pops.
  - Report the occluded share of the drawn tiles and the candidates.
- **Risks:**
  - It adds compute passes and one small readback per view, and no indirect draws, so §13.23's exposure on Intel GPUs doesn't grow.
  - On this M2, the pyramid's cost must be under about 0.5 ms.
  - Tiles that should refine as the camera comes round a ridge lag by the readback's latency. That's what the 2-tick hysteresis and the "visible until known" rule bound.

- **An error policy:** measure error in the true frame (as 1.x does, so the drawn error is k× coarser), in the drawn frame (today), or in between (for example, σ_max^½).
- **Anisotropic error:** terrain's error is vertical. Project k·ε along the drawn up axis at the tile and the view direction, as view-dependent terrain LOD does (Lindstrom et al. 1996), rather than taking an isotropic σ_max · ε. This is exact and gains in steep or top-down views, but little in this example's oblique one.
- **Horizon culling under a lift:** it is off under any smooth route today. A lift with a ceiling keeps the ellipsoid, shrunk by the lowest drawn height, as a valid occluder, and tile boxes from fix 2 give the culling points in closed form.
- **Occlusion culling:** a hierarchical-Z test of tile boxes against the previous tick's depth, treating the tile tree as the bounding volume hierarchy, so ridges hide valleys from both drawing and refinement. This is the largest of the four, and it helps every scene with relief, exaggerated or not.

- **Fix 1:** `HeightScale` gains an optional `profile` (ceiling, band). Under it, terrain carries (n̂, signed h) in a 4-component attribute, and the vertex stage draws (k − 1)·G(h)·n̂, with G written once in `heightProfile.slang` and mirrored in `camera/heightProfile.ts`. A region's image is the region over [g(hMin), g(hMax)]. Limits: a view that sets the factor itself still takes the compiled route for terrain, and a tile loaded in the other mode keeps it until it reloads.
- **Fix 2:** descriptors declare `bound(box, ranges)` as an entrywise bound on |J| in chosen bases, and `composeBox` (`scene/routeBounds.ts`) carries a tile's box along the route by the mean value theorem, as an upper Riemann sum over 4 scaled boxes. Bounded: exaggeration, heightOffset, geographic↔geocentric, TM/UTM and Web Mercator forward, scaleAbout, scaleAlongAxes, bend; the rest sample as before.
  - Measured against dense sampling: a flat 100 × 100 × 1 km box at ×10 under a 9 km ceiling is 1.00, 1.00 and 1.34 per axis (a sphere bound was 9.8×). UTM is within 1.5, and most exaggeration cases 1.0–1.2. Flat regions 100 km across near the ceiling reach 4.4 vertically.
  - `ParamSpec.expected` exists but no descriptor sets it yet, so bounds use each parameter's current value.

**What the ×10 views showed (2026-11-13, measured with the dev handle `globalThis.__cesium`).** In `vertical-exaggeration?x=10&view=zermatt-close`, terrain draws went from 8,487 (mid-load) toward the near field's needs as each cause was found:

- **Upsampled tiles took the warp's stretch.** Beyond the data's last level (13 there) tiles are upsampled: their parent's surface, cut smaller. Refining them adds no geometry, so the stretched part of an error counts only where refining can add geometry (`geometryRefines`); elsewhere the error is unstretched, since imagery isn't stretched vertically.
- **Height-scale bounds were made for a range of multipliers.** That range (9.44 to 10) left about 1 km of slack at 1.8 km altitude. A 13 m tile got a 619 m sphere, and the camera was "inside" 979 tiles (distance 0, refined to level 21). The closed-form height range now uses the exact multiplier and is remade on every change.
- **Skirts belong to culling, not to level of detail.** Cull volumes include skirts so a bound never misses geometry. The distance for screen-space error is measured to the surface alone (`DrawnTile.surface`). Upsampled tiles hang their source tile's skirt depth only on edges at the source tile's boundary (`skirtDepths`).
- **The per-tile refit ran on the main thread:** about 7 s of a 25 s load. It now runs in the decode worker; the page measures only pairs the worker couldn't, within 2 ms a frame.
- **Horizon culling was off under any warp.** It is now an occluder built from the drawn terrain (below), which needs a small set of base levels resident. The first version requested levels 0 to 4 for every globe (682 tiles) and walked cold for 236 ms. Being changed: a small base set only for warped views, and an incremental walk that is a yielding job.
- **97% of the remaining draws were hidden** (5,396 of 5,567 settled): far terrain refined during load, before the depth pyramid showed it hidden, and kept its refinement. The depth-pyramid draw cull (two-phase) and the coarsening of long-hidden tiles (hysteresis both ways) address it.
- **The error exponent α** (`View.lodExponent`, `Warp.lodExponent`, the example's slider): a first sweep suggested 0.5, but every number in it predates the fixes above. Re-sweep before choosing the default.
- **Still open:** the cliff streaks at ×10. Either boundary skirts drawn ten times deeper, or imagery smeared vertically (a ×10 wall has a tenth of the imagery's resolution per drawn metre vertically). A debug tint for skirts would settle it.

**Occlusion, unified (owner, 2026-11-13).** Horizon culling is occlusion by a known convex occluder, so both live behind one interface:

- **The interface:** a per-view list of occluders, each answering `hidden(bound, view)`: true only when it proves the bound hidden. A bound is hidden if any occluder says so. Selection (refine), the request scheduler (fetch) and the GPU draw cull all ask the same list.
- **Analytic occluders** (CPU, no latency, can cull what was never loaded): first `bodyOccluder`, the body's ellipsoid scaled to fit inside the drawn terrain. It holds under any warp because it is derived from the drawn terrain's bounds, not from a property of the warp. Its soundness premises are a closed, opaque drawn surface (no translucent globe, no clip holes, the underlay counted) with the camera outside it; otherwise it is off. It is local: only the cap facing the camera has to enclose it, with exact minima from loaded tiles' vertices and box bounds elsewhere. Later: content-declared proxies (a building's interior box).
- **The image occluder:** the depth pyramid (one frame late, the real drawn depth; it can't cull what was never drawn from here). Draw culling is two-phase, so nothing pops.
- **Combined:** analytic occluders can be rasterized into the pyramid as a prior, which gives the GPU cull horizon culling and a sound start after a camera jump.

Built on branches `dev/horizon` (the interface and the body occluder) and the "Occlusion-cull hidden draws with the depth pyramid" session (the draw cull).

**The fixes, in order of payoff:**

1. **Exact terrain under any height profile.** Terrain carries h, so generalize `HeightScale` to a height profile f(h): the lift with a ceiling and blend band, with parameters as uniforms. Terrain under it stays on the exact attribute path, with no bounds sampling and no route compile. Tile bounds come from f over the tile's height range, which is exact and closed form.
2. **Declared bounds, not sampled.** Each built-in's descriptor gains a closed-form bound over a box and a parameter range: its largest displacement and a Lipschitz constant (σ_max of J). A lift's is |D| ≤ (k−1)·max g(h) over the tile's heights; a projection's comes from its scale-factor range over the box.
   - Selection composes these along the route: a sphere moves by the bound and scales by the Lipschitz constant. That's a few flops per tile per node.
   - Sampling stays only for user functions with no declared bound, and for those, task 9's bounded loops make interval bounds on the converged map usable.
   - Check: on the exaggeration and UTM routes the composed bound must stay conservative against dense sampling, within about 1.5× of its radius.
3. **Centre constants on the GPU for every draw.** Run the existing df64 centre pass (`centreConstantsWgsl`) for newly added draws as well as dynamic parameters: one dispatch per frame over that frame's new draws, writing the WARP_ROUTE blocks directly. The CPU float64 path stays for picks and queries, which evaluate the route on demand, not per draw.
4. **No compile before first draw.**
   - **An interpreter pipeline:** one surface pipeline per pass whose vertex stage evaluates any chain of built-in node families from a small per-route program in a storage buffer (node kinds, parameter offsets, the collapsed affine matrices), switching on node kind. It's the residual form, with the same centre constants.
   - **Swap in specialized code:** content draws through it at once, the per-shape specialized pipeline compiles in the background, and draws switch when it's ready (OptiX-style: a general kernel first, specialized when ready).
   - **Pre-warm** the common shapes at engine start: a lift alone, a lift over a projection, and the geocentric ↔ geographic pair.
   - **Measure:** the interpreter's per-vertex cost against the specialized code, with an aim of within 2× for one or two nodes.
5. **A non-blocking fit fallback.** A draw the compiler refuses shows at once with the nearest cheap stand-in instead of hiding until its fit: rigid at its anchor, or a one-cell fit made on the GPU (the GPU fit spike: 1,100–4,900 cells/ms). It refines when the full fit lands.

**Done when:** streamed tiles under a built-in smooth node cost about what they cost under an affine node.

- **Profile:** with `scripts/profilePage.mjs` on the vertical-exaggeration example and the gallery's scenes 1 and 3, compare per-tile CPU time, time to first drawn tile, and the longest task against the same scene with the smooth node replaced by its affine part.
- **Report** fits run, interpreter-drawn draws and specialized draws.

It depends on nothing else in tasks 9–11, but item 2's interval fallback uses task 9's loops.

### Task 13: the gallery example's camera in object-scale scenes (owner, 2026-11-12)

**Status (2026-11-12): built.** The cause is confirmed: the assembly sits 1,800 m above a hidden globe, so over the background the wheel's target was the ellipsoid kilometers away, and one notch out took the camera from 3.4 m to 536 m.

- **Controller:** over the background, `GlobeController` takes a zoom's scale from the last drawn point any pick found, when it is in view and at least 4 times nearer than the stand-in target (`nearContent`). The target is the point on the cursor's ray at that distance, so nothing jumps sideways. This covers the wheel, right-drag and two-finger zoom. It needs one earlier pick of content; ray queries and visible bounds weren't needed for the example.
- **Example:** the assembly and the seismic section orbit about their content (`viewer.setControls("orbit")` with range limits) and go back to the globe controls when the scene is left. The lens scene already turns the controller off.
- **Check:** `test/globeControllerZoom.test.ts`: with the cursor over the background below and above the horizon, each notch changes the distance to the content by at most a notch's factor (it fails without the fix).

**What the owner saw:** in the "Transform graph" example's exploded-assembly scene (scene 6), the scroll wheel sometimes zooms out to a very distant position.

**The likely cause** (read from the code, not reproduced yet): the scene uses the Viewer's `GlobeController`.

- Its wheel zoom moves the camera by a share of its distance to the zoom target. The target is the pick under the cursor, and while there is no pick it falls back to the ellipsoid: under the cursor if it's within 20× the camera's height above the ground (`ellipsoidAt`), else the ground below the camera (`ground`).
- The assembly scene draws no globe, and its parts are small next to the Earth. Over the background, a zoom-out step is therefore measured against the Earth's surface, not the assembly, and one notch can move the camera many times the assembly's size.
- It happens "sometimes" because it depends on whether the cursor was over a part when the hover pick last landed (`refreshZoomTarget`).
- `maximumHeight` only caps the far end.

**Fixes:**

1. **In the controller:** with no globe drawn, or when the target is the ellipsoid but there's content near the camera, take the zoom target from the content. Use the last content pick, the nearest content along the cursor ray (`RayQuery` against the world), or the visible content's bounds. Cap a zoom-out step at a few times the distance to the nearest visible content.
2. **In the example:** object-scale scenes (the assembly, the seismic section, the lens's synthetic city) should use an orbit or CAD controller centred on their content rather than the globe controller.
   - Plan 5d's controllers (the CAD controller orbiting about `pick.drawnPosition`) are the long-term home.
   - Until 5d lands, the example can set the globe controller's zoom target to the scene's centre and clamp its range per scene.
3. **Check:** a test drives wheel events with the cursor over the background in a globe-less scene and asserts each notch changes the distance to the content by at most the wheel's per-notch factor.
