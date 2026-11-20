# The transform graph (owner, 2026-11-11)

**What this holds:** The transform graph's design: nodes, routes, placement and the gallery scenes (owner, 2026-11-11). The plan is `docs/superpowers/plans/2026-11-12-transform-graph.md`. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

This revisits [geometry-through-placement-review.md](geometry-through-placement-review.md)'s curvilinear maps from first principles. Three passes led here:

- The owner asked what a curvilinear map is for and how it relates to the frame tree.
- Fable and the lead wrote independent notes (session files `curvilinearMaps-first-principles-*.md`).
- The owner's framing replaced both, in `transform-graph-unified.md`.

The handbook's "Transform graph (draft)" tab (`527e3bded1`) is the visual tour of it.

**The design.** One graph of frames.

- **Edges:** each node's edge to its parent is **affine** (a 4×4, cheap to recompute per frame from time or anything else) or **curvilinear** (a differentiable function with parameters: time, sliders, any input; an optional inverse; a declared accuracy).
- **Placement:** content, cameras and lights sit at nodes. Where something sits decides what is curvilinear: a deformer over the Earth's content curvilinear maps the terrain and not the Moon, so there are no modes and no regions.
- **Compilation:** a compiler collapses affine runs into matrices and differentiates curvilinear nodes automatically (J for normals, distortion and σ propagation; H for chord error, tessellation and bounds). It emits one fused GPU function per route shape, keyed by structure, with parameter values as uniforms.
- **Truth on the CPU:** the CPU evaluates the same functions in float64 for picks, measurements (in a named frame) and accuracy (Σ_out = J Σ Jᵀ plus each node's σ).
- **Data on top:** georeferencing, CRSs, views and charts sit above the graph. The graph itself encodes no meaning.

**Decided by the owner (2026-11-11):**

1. **Application functions are restricted plain JS first;** a builder (or another approach) comes later.
   - The CPU path is the function itself. Its source (`Function.prototype.toString`) is parsed, not evaluated, into the IR for the GPU and the derivatives.
   - No `eval` or `new Function`, so it stays CSP-safe.
   - It is minifier-safe if the subset is pure: no free variables but `Math` and the declared parameters, with lowered syntax accepted (`Math.pow` for `**`).
   - Anything else is refused with a clear error naming the construct.
2. **Built-in curvilinear transforms** are written once in Slang with `[Differentiable]`, mirrored in TS for the CPU, and checked by a parity test, so most applications never write their own.
3. **CurvilinearMaps land first; the IR layer comes later,** in its own plan step.
   - The owner is interested in an IR shared by the curvilinear map functions, the 3D Tiles styling language and other styling languages for vectors and geometry, sitting beside the custom-shader toolchain. A light IR between the language front ends and the renderer keeps language specifics out of the core.
   - References: MaterialX node graphs, three.js TSL, Unreal's material graph, SPIR-V.
4. **Naming:** "transform graph" for the raw layer.

**Parameterized functions.** Parameters are explicit inputs (time, sliders, data), never closures. The compiler handles each by how it enters:

- **Linearly** (an exaggeration factor): it stays a uniform in the GPU residual, with no per-frame work.
- **Otherwise** (a moving center, a time-varying field): each frame, a compute pass evaluates the compiled function in df64 at each draw's center. That costs about 4 µs for 1,024 draws in the GPU spike. The vertex stage evaluates the residual on float32 offsets from the center, so no CPU work is done per frame.
- **Selection bounds** come from interval evaluation of the IR over each parameter's expected range, or cheap per-frame analytic bounds for the built-ins.

**One view's content under different transforms: a tree, with per-view parameters and per-view switch nodes (decided by the owner, 2026-11-12: switch nodes to start, a DAG only if this gets inelegant).**

1. **Same structure, different strengths** (view A at ×10, view B at ×1): the deformer's parameters take a value per view. This covers most uses with a plain tree, and the GPU cost is a per-view uniform.
2. **Different structures** (view A exaggerated, view B a plan-and-profile sheet or a UTM chart): a **switch node** whose transform is chosen per view, like a USD variant set or OpenSceneGraph's switch node with camera masks. Every view still sees a tree, so a pixel's route, and so its pick, is unambiguous. "True" frames are unaffected because they sit below the switch.
3. **The same content twice in one view** (an inset, a before-and-after): instancing (a reference node), later.

A general DAG (a node with several parents) adds nothing the switch doesn't. It would make "which route did this pixel take" depend on more than the view.

**Naming and modules (decided by the owner, 2026-11-12).**

- **The mathematical category:** curvilinear maps that are locally invertible where content is (local diffeomorphisms), and invertible where a route goes down through them (diffeomorphisms onto their image). Affine maps are the special case.
- **Proposed API:** `affine(...)` and `curvilinear({ forward, inverse?, params })` nodes; "curvilinear transform" in the docs. "Curvilinear map" remains the friendly word for presentation-minded ones (3ds Max calls these "space curvilinear maps").
- **Modules:**
  - **`transform`** (core): the graph, the compiler and IR, autodiff, routes and accuracy.
  - **`frames`**: the reference-frame catalog (ICRF, ITRF, bodies, EOP, ephemerides), which is data feeding the graph. It isn't renamed to "georeference", which names placing _content_: `Georeference` replaces `DesignPlacement`, as [geometry-through-placement-review.md](geometry-through-placement-review.md) planned.
  - **`georeference`**: CRSs (`EXT_geospatial_crs`, WKID, WKT2, `EXT_georeference`), reprojection nodes, and the geo transforms built on `curvilinear`: vertical exaggeration, height offset, flattening.
  - **`transforms`**: common curvilinear transforms (bend, twist, taper, lattice (FFD), scale-about, bump, lens distortion, corridor unroll, velocity model).

**A gallery example: "Transform graph" (planned).** 3D versions of the tour's scenes on real data, each showing its graph and route:

1. Exaggeration over the Earth's content: Alps terrain and OSM Buildings, with the Moon affine.
2. A split view, true and exaggerated, through per-view parameters.
3. A BIM site in a projected CRS under the exaggeration, with ground and grid distances.
4. Plan and profile: a road alignment unrolled into a strip with ×10 vertical, in two views (plan and profile) through a switch node.
5. Seismic time to depth: a public section, for example the F3 Netherlands block (CC BY-SA).
6. An exploded NIST STEP assembly, with measurements mapped back.
7. A drone camera's lens distortion over photogrammetry.
8. A time-varying deformation field: subsidence over a city, animated.

The example lands after the transform graph is built.

**Migration from [geometry-through-placement-review.md](geometry-through-placement-review.md)'s code.**

- **Keep:** float64 maps, fits as the fallback for functions the compiler can't take, picks by domain point, cofactor normals, drawn bounds and curved clips.
- **Change:**
  - `curvilinearFrame` becomes a `curvilinear` node.
  - The exaggeration example puts the deformer over the Earth's content (not between ITRF and the camera).
  - `CurvilinearMap.presentation`, `CurvilinearMap.domain` and `NonRigidRouteError`'s uses are replaced by placement.
  - The GPU spike's direct evaluation (`277f2f3e57`) becomes the compiler's back end for the built-ins.
- **5c and 5d** are rewritten against this before they start.

**Queries through routes (plan task 5, built 2026-11-12).** CPU side in `src/transform`, adapters beside the frames and clips they bridge.

- **Picks and measurements:** `pointIn` and `measureIn` carry points to any node in float64, from the point and its node, with J, [σ_min, σ_max] and accuracy. `pickIn(pick, "true" | "drawn" | node | Frame)` (`frames/pickIn.ts`) bridges a core pick: its camera route becomes a graph whose nodes are its steps, and a catalog frame is reached through `graphOfFrames`. `truePick` shares the located point (`locatePick`) and is unchanged.
- **Accuracy:** `accuracyAlong(route, point, σ)` is Σ_out = J Σ Jᵀ plus each curvilinear node's `accuracy`, with J chained edge by edge (`Route.walk`; the IR's autodiff where a spec has IR). `FrameGraph.accuracy` supplies affine edges' figures from `pointAccuracy`'s composer; the two agree for a pad to ITRF and ITRF to GCRF. `pointAccuracy`'s covariance rotation now calls the same `congruence`; its terms (shared sources, levers, piecewise frames) stay frame-side.
- **Bounds:** `taylorBounds` is a first-order Taylor model (F(c) + J(c)·δ + a remainder from the Hessian program's intervals, or J's for a function with a kink). It is conservative everywhere tested and within 1.1× of sampling for a twist up to 10 km boxes and a lens up to 10 m, but ×5 to ×28 sampling's radius for exaggeration and UTM at 100 m to 10 km (×3 to ×6 with 4³ cells), and refused at 100 km: the unrolled foot-point iteration's intervals swell even over a 100 m box (J over it: [−3, 9] for a true 5.1). So selection keeps sampling (`curvilinearBounds.ts`, `tileCurvilinearMap.ts`); interval Hessians over geodetic functions need affine arithmetic to be useful.
- **Clips:** `nodeResolver` (`scene/world/nodeResolver.ts`) wraps a world's `FrameResolver` so a `ClipSet.frame` may be a node (a `TransformNode` is a `FrameKey`): rigid routes give a matrix, curvilinear ones `NonRigidRouteError` (so `planClip` says "curved") and `route()` gives the camera layer's route, which `WorldCurvedClips` already fits.
- **Tessellation (spike, not wired):** `curvatureOver` (M₂ from the route's Jacobian by differences; the AD Hessian at Earth scale is rounding noise) and `subdivisionFor` give n = ⌈√(M₂L²/8 / tolerance)⌉ per triangle; `spikes/routeTessellation.ts` runs the compute pass and indirect draw (dice.slang's pattern). A 50 km tile under ×10 exaggeration at 10 km: 2 triangles take n = 36 (2,592 sub-triangles, 102 px unsubdivided to 0.08 px), 128 triangles take n = 5; a lens across ±50°: n = 64 (cap) and n = 15. Left unwired: a mesh draw needs its own batch kind, a vertex entry in every pass's pipeline (depth, shadow, pick) that decodes (triangle, n, sub-triangle), attribute interpolation, and per-edge levels from each edge's length (one level per triangle leaves T-junction cracks between neighbors of different n).

**Per-view route structure (built 2026-11-12).** A draw has one program and one record, so a switch frame whose views take structurally different routes is drawn by one draw per shape of route (`scene/world/variants.ts`).

- **Groups:** the views that reach an anchor are grouped by the shape of their route to their render root: the curvilinear edges crossed, in order and direction, by the identity of each curvilinear map (`viewShape`). A view that crosses no curvilinear edge is a group of its own, and its content is drawn affine. A view that sets a slider for itself stays in its group: that is a per-view uniform.
- **One shape is the common case, and costs nothing:** no draw is added, no mask is touched and the frame's work is as before.
- **Several shapes:**
  - The anchor's draws belong to the primary group (the first view that crosses a curvilinear edge; it stays primary while it has views).
  - Every other group gets a twin of each mesh draw its views show (`World.twinDraw`), made the tick a view of the group first shows it. The twin is curvilinear by its group's route as an anchor of its own, with a virtual key (`VIRTUAL_SLOT`), so fits, the compiled program, drawn bounds and terrain's exact `h·n̂` term all follow that route. A twin for the identity group is not registered and draws as it is.
  - What the owner sets with `setViewMask` and `setCasterMask` is kept and narrowed to each group's views, so the draws of one anchor never draw in the same view twice. Everything else in a twin's record follows its source's each tick (`DrawConstants.mirror`): material, shader, tint, imagery, clips, visibility, its own placement, `curvilinearAt` and `h·n̂`.
  - A twin is released when its group's last view goes or changes shape, or its source goes. When the views agree again, the sources show what the owner asked for.
- **Picks:** a twin's record has its source's first feature ID, so a pick in any view resolves to the source draw, and the route it is carried through is that view's own (`View.pickPlacements`). `placementOf` reports the view's variant.
- **Selection:** each view's tile selection runs on its own route's drawn bounds (`World.tileCurvilinearMap(anchor, viewId)`: none for the identity group). A tile keeps drawn volumes for each map it was asked for (`Tile.drawnOthers`), so views asking in turn remake nothing.
- **Checked:** `test/curvilinearViewVariants.test.ts` (twins, masks, picks, selection, release, terrain's exact term per view) and `spikes/curvilinearViews.ts` (three views on one GPU world: ×10, the true place and a 60 m lift; each box within 1.5 px of its own route, and the twins released with their views).
- **Limits:** billboards, instanced draws and patch draws have no twin and are drawn by the primary group's route in every view (said once). A twin costs a draw record and its share of the world's draw table, for each tile a second group shows. A route that differs from its group's in what a draw's record is made from (a rigid step before the last curvilinear map) is still said once and shows the group's first view's. A tile keeps drawn volumes for the map last asked and three others.
