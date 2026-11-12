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
