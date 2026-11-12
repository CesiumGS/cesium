# The transform graph: implementation plan

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

**Lead's defaults, pending the owner's confirmation:**

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
