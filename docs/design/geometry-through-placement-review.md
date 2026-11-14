# For later: an architectural review of geometry through placement (owner, 2026-11-08)

**What this holds:** The review of geometry, placement and warps, its increments and the owner's answers. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Do this before b-rep step 5, the GPU tessellation engine (§13.33), which evaluates placements at points the content never had and takes normals from the placement's Jacobian: a dual position can do neither (moved up by the owner, 2026-11-09). It also has to come before plan 5f's fitted operations are built. Goal: one elegant way of handling reference frames and reprojection through the geometry pipeline, without patched-together machinery. Things it has to settle:

- **Also (§13.34):** the acceptance test that an application can exaggerate everything, the globe and terrain included, through placements alone (exaggeration is the application's, not an engine feature); and clip and section planes in the same coordinates.

- **One model of a placement:** rigid, dual position and fitted operation as cases of a single idea, and what each layer owns: the frame tree (rigid), coordinate operations (non-rigid), content (precomputed results), and the renderer's placement seam (applying the mapping per vertex).
- **Normals and tangents.** Today a dual-position vertex moves but keeps its rigid normal: 0.197 degrees on the 44 km corridor, 0.225 calculated at 50 km. Tried on 2026-11-08: deriving it per fragment from both positions. It fails, because the design position isn't in the fragment stage, a varying would cost every draw, and float32 derivative noise is estimated at about 0.13 degrees up close. Other options: a second normal, 12 bytes a vertex or about 4 octahedrally encoded; a displacement varying on placed draws; or dropping dual positions for a fitted operation with its Jacobian.
- **Everything else carried per vertex or per instance:** instances, skins and morph targets when animation arrives, and what custom shaders see (`positionMC`, `normalMC`, design and placed).
- **Recomputing a placement when the root changes.** The spec (§7.2 step 3, §7.6) has the frames module recomputing per-vertex placements for each root. No such hook exists: `FrameResolver` has no method for it, a placement is a model-space map, and `DrawPlacementInfo.root` names a root nothing is computed for. Harmless for dual positions, and 5f will need it.
- **Bounds, picks and snaps, and shadow casters** through the same model, and the inter-stage varying budget, which is full.
- **2D and Columbus view as design view (owner, 2026-11-08).** Design view (spec §13.2) is 2.0's route to this need: the render root in a projected CRS, tiles fitted flat, and an orthographic camera for the 2D look. As specified, it's regional, drawn within the CRS's area of use. Decide whether a whole-world flat map follows from the same mechanism, with a world-spanning CRS, tiling and wrapping across the antimeridian.
- **What the tile format carries,** and how it relates to glTF 2.1 external assets and 3D Tiles (§13.25).
- **Curves through placement.** Vector geometry as render curves: an exact source (a circle or clothoid in its own CRS), then placement, then quadratic segments with an optional rational weight and a per-segment error bound, refined by view. A conic stays a conic only under projective maps, and a reprojection isn't one, so a circle is exact in design coordinates only, and a measure or snap goes back to the source. Quadratics through a perspective view become rational. Planar faces with curved trims and 3D Tiles 2.0's 3D-native vectors both meet this; curved surfaces meet the tessellation seam, and b-reps (§13.20).

**The review (2026-11-10).** Not yet approved by the owner.

_Today there are three placement ideas, built separately:_

- The frame tree, which is rigid (`FrameResolver`).
- The render placement (`scene/placement.ts`, `shaders/placement.slang`): per draw, in model space, before the custom vertex stage, from a closed set:
  - dual position
  - a cubic fitted over a tile
  - a blend of two fits by a parameter
- `DesignPlacement` (`streaming/designPlacement.ts`): CPU only, with `displayed` and an exact `designOf`. Engineering snaps and picks use it to get back to design coordinates.

They already share most of what's needed: a CPU twin in float64, `maxDisplacement` padding tile bounds, `secondDerivativeBound` for resampling, and a parameter written once a tick. What's missing, measured against the acceptance test:

- Normals don't turn with the placement.
- Rays ignore placements (`World.castRays` and the CPU terrain-pick fallback in `render/view/picks.ts`).
- Picks can't invert a non-rigid placement.
- Nothing recomputes a placement for a new root.
- The globe isn't a scene item, so it can't take a placement.
- LOD doesn't know a placement stretches error.
- There are no clip planes.
- Custom shaders get a placed `positionMC` with an unplaced `normalMC`.

_The model: true coordinates, then one drawn map._

- **True coordinates** are content after its coordinate operation and the frame tree. That is where content _is_, and every world question is asked there: distances, line of sight, clearance, volumes, scalar fields, section planes, b-rep queries.
- A reprojection belongs here. It's exact in float64 on the CPU (`DesignPlacement.displayed` and `designOf` are this). Its GPU fit is an approximation of truth, with an error bound: the existing `displayError`.
- **The drawn map** is applied last, in the vertex stage. It decides where content is _drawn_, never where it _is_: vertical exaggeration, design view's flattening, the 2D and 3D morph, exploded views.
- A world answer never changes when the drawn map does. That's the acceptance test's "measurements report true heights", made a rule.
- This also settles today's "rays don't see placements": it's right for world questions, and wrong for view questions.

_One placement interface, exact on the CPU and fitted for the GPU._

- A `PlacementMap` is defined in a named frame, with:
  - `forward`, `inverse` and `jacobian` in float64
  - `bounds(volume)`
  - `stretch(volume)`: the largest singular value of its Jacobian over the volume
  - a revision
- Both a coordinate operation and a drawn map are `PlacementMap`s. The application writes its maps. The engine composes them on the CPU, exact, and fits the composition per tile and per root: one cubic, as today's `FittedOperation`.
- The GPU keeps evaluating a single fitted term, or a blend of two, so the shader and the buffer don't grow and there's no chain to walk.
- Exaggeration by a factor k is `blend(identity, fit of h·n̂, t = k − 1)`, which exists today. The slider writes one float; nothing is refit when k changes.
- Two independent parameters at once, such as exaggeration during the 2D morph, refit when either changes. Measure that before designing more.
- The fit's error bound joins the tile's geometric error in screen-space error, so a coarse tile with a poor fit refines. That covers globe tiles near the root, where a cubic fits a hemisphere badly.
- **Dual positions leave the engine (owner, 2026-11-10).** A dual position isn't a map. It's per-vertex data: a second position the producer made, mixed by a parameter. That's application code over content: a custom vertex shader mixing `positionMC` toward a named attribute, which `CustomShader` already supports.
  - The attribute is declared vertex-only, so it costs no varying.
  - `displacement` declares how far it moves vertices, which pads the bounds.
  - A second normal attribute, if the producer wrote one, sets `normalMC`.
  - The parameter is the shader's uniform.
  - Picks need nothing from it: the primitive-index route below interpolates the content's own positions, so a pick reports the design point whatever the shader drew.
  - It's also glTF's morph target with one target, so when morph targets arrive (before the map, with skins) a producer can ship it that way instead.
  - `DualPosition` drops out of the closed set, which leaves maps only: fitted operations and their blends. `Tileset3D.dualPosition`'s metadata reading moves to the design globe example, with its shader. The example later moves to fitted operations.
  - The cost is accepted: the content can't be resampled, so it can't feed b-rep step 5 or curves. That's the same as today.

_What each layer owns:_

- **The frames layer:** coordinate operations, the frame tree, and a placement cache keyed by item, tile, root, and map revision. It refits on `routeRevision` and `watch`. This is the missing per-root hook of §7.2 step 3, so `DrawPlacementInfo.root` names a root that something was computed for.
- **Content:** true geometry in its own CRS, with metadata naming that CRS. Nothing is baked: "hosted" content declares that its producer reprojected it.
- **Items:** a placement per scene item. The globe becomes an item, or at least takes a placement, ahead of §13.25's full version.
- **The renderer:** the seam it has now, plus the Jacobian.

_Normals and tangents._

- The vertex stage evaluates the fit's Jacobian analytically: about 60 more multiply-adds, and no varying.
- It turns the normal by the cofactor matrix (det·J⁻ᵀ, so no inverse is needed) and the tangent by J.
- Exaggeration needs this, not just tolerates it: with k = 10, slopes are ten times steeper.
- A custom shader sees the placed `positionMC` and the turned `normalMC`, and `designPositionMC` in the vertex stage.

_Bounds, LOD, culling and shadows._

- Bounds go through `PlacementMap.bounds`, with today's padding as the fallback.
- Screen-space error multiplies geometric error by `stretch`. Otherwise k = 10 would draw terrain ten times coarser than its error allows.
- The horizon occluder is the map's image of the ellipsoid. Exaggerating heights above the ellipsoid leaves the ellipsoid where it is.
- Shadow casters already share the vertex path, so they follow the map.

_Picks, snaps and measurements: view questions answered with true points._

- The pick pass writes the primitive index beside the feature, using WebGPU's `primitive-index` feature where it's available.
- The CPU forward-maps that triangle's three vertices, intersects the camera ray with the placed triangle for barycentrics, and interpolates the true vertices. The result is exact on the content triangle, with no inverse, whatever moved the vertices: a map or a custom shader.
- Without the feature: depth, then Newton on `PlacementMap.inverse`. The answer is provisional, and its accuracy includes the fit's error bound.
- The CPU terrain-pick fallback tests placed triangles.
- The GPU snap pass (5f) works in drawn space, with its pixel tolerance there, and returns true points the same way.
- Measurements report true values, name their frame, and say when what was drawn was exaggerated.
- Their lines and labels are content in true coordinates, drawn through the same map. A straight true segment draws as a curve, sampled by the curves-through-placement path.
- `GeometryQueries` answer in true coordinates only. The pick refinement entry from the b-rep brainstorm (§13.33) takes a pick's (draw, primitive, barycentrics), or (face, u, v), never a drawn position.

_Clip and section planes:_

- They're defined in a named frame and transformed on the CPU into each draw's model space.
- They're evaluated per vertex on the pre-placement design position. A plane's distance is linear in true coordinates, so on a planar content triangle the interpolated distance is exact, whatever the drawn map does.
- They cost inter-stage budget: a varying, or WebGPU's `clip-distances` feature. Confirm what that feature draws from `maxInterStageShaderVariables` before choosing. Packing today's 13 user locations comes first.
- Caps are content in true coordinates, drawn through the map.
- Picks, snaps and queries test the plane on true points, in float64.
- A view-fixed cut is the other kind: it's in render space, for "cut away the near half".

_The other open items:_

- **2D and Columbus view:**
  - A whole-world flat map follows from design view's mechanism: a world-spanning CRS as the root, with globe tiles fitted per tile.
  - The 2D and 3D morph is a blend.
  - At the antimeridian, tiles are drawn twice with an instance offset of one circumference.
  - Columbus view is the same, with heights kept.
- **Instances:** applied before the map. A pool's fit spans every instance's bounds, and a pool splits by cluster when the fit's error bound is too large.
- **Skins and morph targets:** applied before the map, when animation arrives.
- **The tile format:** see "Content" above. A glTF 2.1 external asset carries its own CRS and transform, which the item composes like any coordinate operation.
- **Curves through placement and b-rep step 5:** both sample the exact source in true coordinates and evaluate the fit at points the content never had. Their error budgets take `secondDerivativeBound` and `stretch`.

_The acceptance increments, in order:_

1. `PlacementMap` and the frames layer's per-tile fitter and cache, with refits on a root change. `DualPosition` is removed, and the design globe example becomes a custom shader.
2. The Jacobian in the vertex stage, for normals and tangents.
3. Bounds through the map, `stretch` in screen-space error, and the horizon occluder.
4. The globe and terrain take a placement.
5. Picks by primitive index and barycentrics, with the Newton fallback; and the terrain-pick fallback placed.
6. Measurements and snaps in true coordinates, with their graphics drawn through the map.
7. An example, "Vertical exaggeration":
   - The application writes the height-scale map (about 40 lines), not the engine.
   - The scene has the globe, terrain, a tileset and measurements.
   - The tests read true heights while k goes from 1 to 10.
8. Clip planes on the design position, with caps.

Increments 1 to 3 come before b-rep step 5. Increment 8 comes with §13.34's capabilities (2).

**Brainstorm: one geometry interface, from domains, fields and maps (owner's question, 2026-11-10).** The question: is there one change to the abstractions that lifts the limits above, such as dual positions that can't be resampled and picks that need an inverse, without costing the main pass? A proposal for review. If accepted, it revises the dual-position bullet and increment 5 above.

_What the limits have in common._ Data is attached to _vertices_, not to _where on the geometry_ it is.

- A dual position can't be resampled because nothing says which point of the surface a vertex stands for. It's the same per-vertex data that resamples fine when it's tied to a domain.
- A pick needs an inverse because it reports a _position_, then has to work back to which geometry it hit. Report _which geometry_ instead, and the position follows.

_The model: every representation is a domain, an embedding, and fields._

- **The domain** is where on the geometry, as a discrete element plus continuous coordinates. Its value is a _domain point_:

  | Representation | Domain point                     |
  | -------------- | -------------------------------- |
  | Mesh           | (triangle, barycentrics)         |
  | B-rep          | (face, u, v), or (edge, t)       |
  | Curve          | (segment, t)                     |
  | Terrain        | (tile, longitude, latitude)      |
  | Points         | (point)                          |
  | Volume or SDF  | (cell, x, y, z), or just x, y, z |

  It's pbrt's `SurfaceInteraction` (a point with its uv, its derivatives and its shape), made the currency of the whole engine.

- **The embedding** takes a domain point to true coordinates. It's exact on the CPU in float64, and evaluable on the GPU with a stated error. A mesh's is linear interpolation; a b-rep's is its surfaces.
- **Fields** are values on the domain: colours, scalars, element IDs, normals, and _displacements_. This is RenderMan's and USD's _primvars_, whose interpolation classes say how a value is spread over the domain:
  - _constant:_ one value for the whole geometry
  - _uniform:_ one value per element (per face)
  - _varying:_ linear over each element's parameters
  - _vertex:_ through the geometry's own basis. On a NURBS surface that means the control points.
  - _faceVarying:_ per corner of each face

  §13.34's scalar fields (1) are fields. The styling language's run-time data by element ID (5) is a uniform field.

- **Maps** act on space, not on the domain: coordinate operations and drawn maps, as the review above has them.

_Two kinds of data, two meanings:_

|                               | Defined on space                                     | Defined on the domain                                      |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Changes where content _is_    | A coordinate operation (a reprojection)              | A deformer for a state: 4D construction, a survey epoch    |
| Changes only how it's _drawn_ | A drawn map (exaggeration, flattening, the 2D morph) | A drawn deformer (an analysis shape at ×50); colour fields |

- Queries, clipping and measurement apply the first row only.
- The pipeline per sample: domain point → embedding → the deformers for its state (true) → the coordinate operation (true coordinates) → drawn deformers → the drawn map.

_What it lifts:_

- **Resampling.** A field on a continuous domain can be evaluated at any domain point, so GPU tessellation and curve sampling get it for free.
  - Dual positions become _morph targets_: displacement fields with a weight, the general glTF and USD mechanism, which animation needs anyway. The content carries the targets, and the application sets the weights. That's the owner's boundary, with no concept in the engine that is specific to dual positions.
  - A displacement in the geometry's own basis costs almost nothing. On a mesh it's a vertex attribute, which is today's dual position. On a b-rep it's three more components per control point, evaluated by the same de Casteljau steps as the surface. On a curve it's the same again.
  - A mesh's vertex data is linear over each triangle, so a measurement line draped over a morphed mesh samples it too.
  - Data on one domain doesn't move to another at run time: a producer refits analysis results onto a b-rep's basis, and states the error, as a representation error. Data on a tile's mesh changes with level of detail; element IDs don't. A b-rep's (face, u, v) is the same at every level, which makes picks and fields on b-reps stable across LOD.
- **Inverses.** Every draw path writes a domain point: draw, element, and coordinates. A pick, a snap and a field read then evaluate the embedding in true coordinates, exactly. No inverse of any map or deformer is needed. This is the _visibility buffer_ (Burns and Hunt, 2013), and nvdiffrast's `rasterize` then `interpolate`.
  - The one exception is ray marching (SDFs and volumes), whose domain is space itself. It marches in drawn space and evaluates the field at the map's inverse: one fixed-point step, `x − D(x)`, for a near-identity fit. Steps shrink by the map's `stretch`, the Lipschitz bound of Hart's sphere tracing.
- **One interface.** A representation adapter provides:
  - `evaluate(domainPoint, state)`: position, derivatives and accuracy
  - its fields
  - its queries, in true coordinates, each answer carrying its domain point
  - its draw path: fixed samples (meshes, points), generated samples (b-reps, curves, terrain), or ray marched (SDFs, volumes)

  `GeometryQueries` keeps its shape. What changes is that answers name their domain point, and the frames layer, not the adapter, owns placement.

_Cost: the main pass doesn't change._

- Domain points are written only by the pick and snap variants, which are separate pipelines whose other varyings are free.
- On meshes, in core WebGPU with no optional feature:
  1. The pick variant draws non-indexed, `indexCount` vertices, and reads each index itself. This needs `STORAGE` usage on index buffers.
  2. `vertex_index % 3` gives the corner, interpolated into barycentrics.
  3. `vertex_index / 3` is the triangle, passed flat.
  4. Losing the vertex cache doesn't matter over a pick's few pixels.
- Generated samples interpolate their (u, v), which is two floats. Points write their index.
- Morph targets cost one more attribute read per target per vertex, and only where they're present.
- Going further: a visibility buffer for the main pass too, re-evaluating attributes from domain points per pixel, would remove the varying budget as a limit altogether. That's a large change (MSAA, translucency, re-fetch cost); measure it before considering it, not as part of this.

_Names._

- "Fitted operation" is the engine's own coinage, not a term of art.
- In geodesy, the per-tile cubic is a _polynomial transformation_ approximating a concatenated coordinate operation. EPSG has "General polynomial" and "Reversible polynomial" methods; GDAL's approximate transformer is the same idea, interpolated linearly with a stated error.
- Twenty cubic terms in normalized offset-and-scale coordinates is exactly the numerator of photogrammetry's _rational function model_ (RPC00B).
- In graphics, a smooth map of space is a _warp_, and a polynomial one in Bernstein form is a _free-form deformation_ (FFD; Sederberg and Parry, 1986).
- Candidate names: `Warp` for the exact map (today's draft `PlacementMap`), and `BezierWarp` for its GPU form (today's `FittedOperation`). For the owner to decide.

_The non-linear math worth using:_

1. **The per-tile cubic in Bernstein form, as an FFD:**
   - The convex hull of its control points bounds displacement, Jacobian, `stretch` and second derivatives soundly. These are the same Bernstein bounds as `brep/bounds.ts`.
   - Neighbouring tiles can share boundary control points, so independent fits don't crack at tile seams. Today two fits may disagree there by up to twice their error bound.
   - A polynomial warp of a Bézier patch is again a Bézier patch, of three times the degree, so a placed b-rep or curve stays exact relative to the fit.
2. **A rational function model where the map has a projective part:** a cubic over a cubic. Oblique imagery and camera-like projections become exact, and strongly non-linear maps fit a coarse tile better, at twice the evaluation cost.
3. **A hierarchical B-spline lattice** (multilevel B-spline approximation; Lee, Wolberg and Shin, 1997) aligned with the tile tree, instead of independent fits.
   - It is C² everywhere, and only the cells that change get refit.
   - It costs 64 control-point reads against 20 terms now.
   - The trick of evaluating cubic B-splines in eight trilinear texture fetches (Sigg and Hadwiger, _GPU Gems 2_, chapter 20) is ruled out: hardware filter weights carry about 8 fractional bits, far too coarse for millimetres.
   - Take this only if seams or refitting show up in measurements.
4. **Slang's automatic differentiation:** `fwd_diff` of `placePosition` gives the Jacobian for normals with no hand-written derivatives. Confirm it on the WGSL target. The CPU twin uses dual numbers, and a test compares the two.
5. **Newton with that Jacobian** for the few inverses left: ray-march fallbacks, and depth-only picks.

_Lessons from the renderers:_

- **RenderMan:**
  - `displacementbound`: the bound is declared, not discovered. That's `maxDisplacement`, and `CustomShader.displacement`.
  - `Pref`: the reference position that textures and analysis stick to while the shape deforms. That's the true position.
  - REYES: split and dice in parameter space, then displace. That's b-rep step 5's order: sample the domain, then deform, then warp.
  - Deformation blur: time-sampled positions are morph targets keyed by time.
- **USD:** primvars and their interpolation classes for fields; `UsdSkel` blend shapes for morph targets. The owner leans towards USD's concepts (§13.25), so these are the names to use.
- **pbrt:**
  - Normals transform by the inverse transpose, as the cofactor matrix above.
  - Floating-point error bounds (the γₙ terms, carried as `pError`) turn our float32 noise estimates into sound accuracy terms.
  - `AnimatedTransform`'s motion bounds solve for where the derivative is zero over a time interval. That's how to bound a blend over a range of its parameter, such as a slider being dragged, instead of at one value.
- **Differentiable renderers:**
  - nvdiffrast's barycentric and triangle-ID buffer: picks as domain points.
  - Mitsuba 3 and Dr.Jit: forward-mode derivatives through the whole pipeline.
  - What we take: derivatives as a property of the pipeline, not hand-written per kind. That gives Jacobians for normals, and the sensitivity of a point to a placement's parameters. That sensitivity is what aligning a model to a site by optimization needs (§13.34's AR, 7).
  - What we leave: the gradients of visibility.

**Second review (Fable 5.2, 2026-11-10): adjust, don't replace.** The owner accepted the brainstorm, with `Warp` as the name for the exact map. An independent review then kept its core (float64-exact maps, a per-tile cubic on the GPU, picks as domain points) and found three reformulations that cut concepts, and gaps to close before increment 1. Its code citations were spot-checked. This is the current proposal: where it differs from the review or the brainstorm above, it wins. It is not locked until the owner answers the questions at the end.

_Three reformulations:_

1. **A warp is an edge of the frame graph, and "true" is not a layer.**
   - `Warp { from, to, presentation, revision, domain?, forward(p, out, jacobian?), inverse? }`. Without an `inverse`, the engine uses Newton.
   - `FrameResolver` gains `route(frame, base, seconds)`, which returns the rigid part, the presentation edges, the forward map, the accuracy and a revision. Today it returns a 4×4 only.
   - Coordinate operations and exaggeration are both edges. The acceptance test becomes: define a frame `exaggerated` over ITRF with the application's warp, and put the camera rig on it. Every item already routes to the root, so nothing is set per item.
   - "True" means any frame reached without crossing a presentation edge. A query names its frame, and the resolver refuses a presentation frame unless drawn values are asked for.
   - Design view's flattening is a change of chart, not a drawn map: spec §13.2 makes the engineering frame the root. The 2D morph blends two roots (spec §7.3).
   - Deformers fold into the embedding as `embed(domainPoint, weights)`, each target flagged presentation or not. That fixes an ordering bug above: a drawn deformer is a vector in content coordinates, so it can't be added after a non-rigid operation.
   - `bounds` and `stretch` leave the interface. The engine derives them from the fit's Bernstein hull plus its error, as `brep/bounds.ts` does, so an application's warp is `forward` alone.
2. **One GPU form: a weighted sum of displacement terms.**
   - p′ = p + Σ wᵢ·Dᵢ, with at most three terms. Each Dᵢ is a cubic or a vertex attribute.
   - It replaces `DualPosition | FittedOperation | PlacementBlend`. A blend, exaggeration (w = k − 1), and morph targets (which is what dual positions become) are all cases of it.
   - Two parameters need no refit. Exaggeration during the 2D morph is three terms with weights t, (k − 1)(1 − t) and (k − 1)t, because both charts are affine in height.
   - The order-0 term moves to the cull kernel as hi and lo parts, beside the camera-relative matrix it already writes per view. The vertex stage keeps orders 1 to 3: 19 rows.
   - Measured cost: about 22 reads and 200 float operations per placed vertex for one term with its Jacobian and cofactor matrix (the Jacobian alone is about 90 multiply-adds, not 60). Each further term on the same centre adds 19 reads and 57 multiply-adds. Unplaced vertices pay one compare.
   - The rows' unused `.w` carries one fitted scalar per tile for free: the true height for contours, or a curved section surface.
3. **Interpolate the true point, and reconstruct the drawn one.**
   - Two varyings (locations 4 and 8) both carry drawn positions, which `@builtin(position)` already holds.
   - Location 8 becomes the design `positionMC`, and location 4 the true camera-relative position. The drawn position is unprojected per fragment, in about 10 multiply-adds.
   - Interpolation is barycentric, so each fragment gets the true point at its domain point. Then:
     - Clip planes, clip boxes and terrain clip regions test true points per fragment. That needs no new varying, no optional feature, and works for any number of planes. `clip-distances`, already requested, becomes an optional optimisation.
     - Procedural textures stop sliding under a warp, as RenderMan's `Pref` intends.
     - The pick variant writes the true position, so the "depth, then Newton" fallback goes.

_Accuracy as an algebra._ Each stage is a pair (L, ε): its Lipschitz bound and its error. They compose as (L₂L₁, L₂ε₁ + ε₂). The screen-space error's "times stretch" and "plus fit error" are that one rule. A bound and 1σ are carried separately: today a fit's bound is "taken as 1σ" (`engineering/pickInterpreter.ts`).

_Flaws found, with fixes:_

1. **Bounds pad instead of moving.**
   - Each tile's sphere grows by `maxDisplacement` around its true centre: tens of kilometres at k = 10.
   - Selection measures distance to true volumes while the camera is in drawn space, so LOD comes out too coarse.
   - A parameter outside [0, 1] walks every draw each tick, and t = k − 1 always is. The blend's pad is 17 times too large at k = 10.
   - Fix: move the centre by the order-0 term in the cull kernel and pad by the residual only; run selection on drawn volumes; and have parameters declare a range, padded once.
2. **Fit error can't share geometric error's budget.**
   - Two neighbouring fits may disagree by twice their bound. Against a 16-pixel threshold that's a visible crack wherever there are no skirts, and refining the tile downloads content to fix a fit.
   - Fix: require fit error ≤ geometricError/64, which is 0.25 px at the threshold. Reach it with a small lattice of cubics per tile (cell = ⌊u·n⌋, the same reads), with a millimetre floor for leaves.
   - Shared Bernstein control points work only where tile faces are lattice planes of the fit's variable, and model-space tiles aren't. So drop the seam claim in the brainstorm's math item 1.
3. **Float32 constants.** The fit's constant is added in model space before the camera-relative transform, so two large float32 numbers cancel. The estimate is about 4 mm at a 36 km displacement, and 0.25–0.5 m for a whole-world flat map viewed at street level. Fix: the order-0 term in hi and lo parts in the cull kernel (reformulation 2), and keep the root on the chart the camera is in.
4. **There is no pick pipeline to vary.**
   - Picks today read the main pass's feature target and depth in a compute pass.
   - Fix: add a pick variant, culled to a frustum a few pixels wide, with the same discards and custom vertex stage. Its kernel returns (item, primitive, barycentrics) and the triangle's three stored positions from the vertex arena, so custom-shader draws and generated samples need no CPU mesh.
   - WebGPU's `primitive-index` is fragment-only and resets per instance, which is fine since batches draw as instances. It costs one inter-stage variable, so it's for the pick variant, never the main pass.
5. **Anchored content refuses placements.**
   - Billboards, points and instanced draws throw (`render/placements.ts`), and "instances before the map" shears each instance.
   - Fix: a granularity, `warpAt: "vertex" | "anchor"`, where anchor evaluates the route at the origin. It's the application's choice per item, and forced for billboards.
6. **The ray-march step uses the wrong bound.**
   - The Lipschitz constant of f∘W⁻¹ is 1/σ_min, not `stretch` (σ_max). Exaggeration by 10 leaves steps unchanged, and compression shrinks them.
   - Fix: state both, as [σ_min, σ_max], and divide snap tolerances by σ_min.
7. **Horizon culling.**
   - The occludee point is precomputed from true heights.
   - The occluder is the ellipsoid shrunk by the minimum height.
   - Both change with k, so recompute them from drawn bounds.
8. **Fitting on the main thread.** A warp written as a JavaScript closure can't run in a worker, and a root change refits everything. Fit lazily within a per-frame budget, with padded bounds until a fit is ready, and label a sampled error an estimate, not a bound.
9. **The clip-plane claim above fails across a non-rigid operation.** One composed fit hides the intermediate true point. Reformulation 3 gives the true point per fragment.
10. **Aerial perspective marches from the drawn position,** so at k = 10 mountains reach into thin air. It should read the true position, or the owner rules otherwise (question 2).
11. **Corrections.**
    - There are 13 user locations, not 12, and they're full along with three builtins.
    - Keep Slang's `fwd_diff` as a test oracle. The hand-written derivative is about 30 rows in the same loop.
    - `clip-distances` costs ⌈N/4⌉ vertex outputs and nothing on the fragment side, so eight distances fit today. `maxInterStageShaderVariables` defaults to 16.
    - Not yet confirmed: `fwd_diff` on the WGSL target, the Chrome version that shipped `primitive-index`, and `INDEX | STORAGE` usage on one buffer.

_Revised increments, replacing the list above:_

1. Routes and `Warp`, and the fitter, with lattice cells and a per-frame budget. Weighted terms replace the closed set.
2. The Jacobian for normals and tangents, with the varying swap (reformulation 3). Clip planes and caps became increment 8, decided below.
3. Drawn bounds in cull and selection, parameter ranges, and the horizon.
4. The globe as an item, and `warpAt` granularity. Done (2026-11-11).
5. The pick variant, and its kernel fetching the triangle. Done (2026-11-11).
6. Measurements and snaps in true frames, with their graphics drawn through the route. Done (2026-11-11).
7. The "Vertical exaggeration" example: the application defines a frame and a rig, nothing per item. Done (2026-11-11). It found engine gaps, closed with increment 8b (below).
8. Clips and caps, as decided below:
   - **8a, world clips.** Done (2026-11-11).
   - **8b, caps.** Done (2026-11-11).
   - **8c, curved clips.** Done (2026-11-11).

Increments 1 to 3 come before b-rep step 5.

**Overnight summary (2026-11-11).** Placement increments 4 to 7, 8a, 8b and 8c landed, each with a GPU spike or Node tests. Picks report a domain point and the exact true point with no inverse of any warp (5); measurements and snaps are in true frames, and the drawn distance is named as one (6); world clips are tested per fragment in true or drawn space (8a); the vertical exaggeration example holds true heights constant across ×1 to ×10 with no refit on the slider (7). Caps landed with 8b: exact for b-reps, joined loops for meshes, and the example's engine gaps closed with it. Curved clips landed with 8c: a clip across a non-rigid route is cut along a signed distance fitted per draw (spike 7 of 7). The CSG sample's core (§13.33) was built ahead of its date: a tree of leaves and booleans evaluated in a worker through either kernel, with picks naming the leaf and drag previews (the four-view layout and fillets wait). The handbook gained its clipping deep dive, updated for 8c. B-rep faces of degree 4 to 7 now draw on the GPU (`d0af2f8938`: a wide de Casteljau path, the cubic one unchanged; a 5 × 4 weighted patch within 0.055 px), so no face is a CPU mesh in drawing and the brepTrims spike passes all 17 checks headless, CTC-05 at 208 of 208 faces with no pinholes. Every ray backend respects clips (`17e50883e7`): terrain, the GPU draw cast and the distance field march past removed hits, `RayQuery.clips` defaults to the view's when a view is named, and standing queries answer again on clip changes. The placement leftovers are closed (`c0179db727`): each lattice's centre reaches the cull as float32 hi and lo parts, summed exactly, so a 37 km displacement is 0.03 mm on the GPU (was 0.43) and `DrawItem` is 96 bytes; shadow, request and dynamic-error volumes are drawn volumes; and point sets and pools follow warps (`warpRadius`, `warpTolerance`). Warp fits are keyed by the route's shape (`54d85b4ada`), so a re-root that leaves it unchanged refits nothing and shows nothing hidden. Plans 5c and 5d were reviewed against the placement model; their proposed amendments and owner questions are at the top of each plan (`62f28384bd`). Owner decisions pending: the proposal below, "no placement modes", and the 5c/5d questions (warp domains first: today an exaggeration warp would also warp the Moon in the same world).

**Increment 1, in progress (2026-11-10).** Slices A to C are done. Each was implemented by a Sonnet 5.5 agent from a brief, against a contract committed first (`camera/route.ts`, `scene/warpTerms.ts`).

- **A, routes:**
  - `warpFrame(name, parent, { presentation, revision, forward })` defines a frame on a warp edge, and `FrameResolver.route()` returns its steps.
  - `resolve`, `motion` and `frameTransform` throw `NonRigidRouteError` across a warp.
  - `accuracy` adds a warp's σ in quadrature, and puts a bound in the note, never as σ.
  - `warpInverse` stops on a relative step, since a 1e-9 m residual is below float64 precision at Earth scale.
- **B, the fitter:**
  - `fitLattice` fits each cell by Householder QR on 5³ Chebyshev–Lobatto samples, and measures the error on a 9³ grid, so the error is an estimate.
  - With k = 10 exaggeration at Everest, a 10 km tile fits in one cell to 0.43 mm in 0.7 ms. A 1000 km tile reaches geometricError/64 with 4 cells (304 m) in 40 ms.
  - On 2,000 random points, the observed error is at most 0.85 of the estimate.
  - `WarpFitCache` keeps fits per key and root, returns the stale fit while a refit is queued, runs within a per-frame budget, and evicts the least recently used.
- **C, the GPU form:**
  - Draws place by up to three weighted terms in the table and the Slang. Public `Placement`s are converted by `termsOf`, so behaviour is unchanged.
  - One cubic term with one cell costs 23 row reads and 20 multiply-adds, against 22 and 20 before.
  - The placement spike passes on an NVIDIA Lovelace GPU, every vertex within half a pixel of the CPU twin: dual at t = 1.5, a fitted operation, and blends at t = 0.75 and −0.5.

- **D, the wiring:** the GPU spike (`spikes/warpRoute.html`) passes on an NVIDIA Lovelace GPU. Quads anchored in ITRF are drawn in a view rooted on a ×10 height warp, at scales 0, 0.4 and 1. Every vertex is within 0.06 px of `routeForward`, and a change of scale only rewrites the term's weight.
  - `CameraLayer` places an anchor across a warp by the route's affine part and marks it with the route (`View.anchorRoute`). A rig frame that crosses a warp to the root is refused, with a message.
  - `scene/world/warps.ts` is one context per world, for the root of its first view (the engine warns once if another view disagrees). It finds the draws under a warped anchor and holds each hidden until its first fit. It fits the route over the draw's bounding sphere (tolerance `max(1 mm, geometricError / 64)`), and applies the lattice as a term of weight 1 after the draw's own terms. A route term is read at the undeformed position, so with a morph it is first-order.
  - The engine runs the cache once a frame, 4 ms by default (`Engine.warpBudgetMs`), and stays awake while fits are pending.
  - A warp may carry a `scale` (a `PlacementParameter` is one). With one scaled warp, forward, followed by rigid steps only, the unit displacement is fitted once and the scale is the term's weight: a slider writes one float. Otherwise a change refits, as a revision bump does.
  - `frameRays` carries rays by `resolveRoute` and refuses presentation routes. `placementOf` reports the route and the fit's state.
  - Not yet: billboards, points and instanced draws are drawn at their anchor's affine place, unwarped. Selection, picks and ray casts still read undeformed bounds and depth (increments 3 and 5). Normals are not warped (increment 2).

**Increment 1 is done (2026-11-10).** The example is increment 7.

**Increment 2a is done (2026-11-10).**

- `placement.slang`'s `placeVertex` returns the position and the Jacobian J = I + Σ wᵢ·Jᵢ. A lattice's derivative is analytic, chained by cells/scale. Dual positions and morph targets add nothing, so under one a vertex keeps its stored normal.
- The vertex stage turns the normal by J's cofactor matrix and the tangent by J, keeping its sign. The CPU twin is `placeJacobianWithTerms`, tested against central differences.
- Cost for one cubic term with one cell: still 23 reads, 80 float3 multiply-adds against 20, and about 44 more for the normal and tangent.
- The varying swap. Location 8 is the design `positionMC`. Location 4 is the true camera-relative position, the draw's affine transform of the design position.
  - An unplaced draw's fragment uses location 4 as it is, bit-identical to before.
  - A placed draw rebuilds its drawn position from `@builtin(position)` and the view's rotation-only reverse-Z projection, in about 17 multiply-adds.
  - Still 13 user locations.
- For custom shaders, `fsInput.positionMC` is now the design position, as RenderMan's `Pref` is, and `vsInput.normalMC` is the turned normal. Slang playground presets that displace in `vertexMain` and read `positionMC` look slightly different.
- `spikes/placementNormals.html` passes on an NVIDIA Lovelace GPU, at k = 10 and then 4 (one float written, no refit), with the unplaced path held to the same checks. Turned normals are within 0.003° of the twin, and positions within 0.03 mm. The placement and warp-route spikes still pass.

**Increment 3 is done (2026-11-10).**

- A placed draw's culling sphere moves by Σ w̄ᵢ·Dᵢ(c), and grows by the residual: weight half-widths times |Dᵢ(c)|, plus |w|max times each term's bound on |Dᵢ(p) − Dᵢ(c)| and its fit error (`scene/warpBounds.ts`).
  - The record's centre and radius are rewritten through `DrawConstants.setBounds`, and `cull.slang` is unchanged. Unplaced records are never written.
  - At k = 10 a 400 m quad's sphere grows by 2.5 km instead of more than 20 km.
- `createPlacementParameter(value, { range: [min, max] })`. Bounds are made once over the range, so a change inside it writes one float and walks no draws. A value outside the range throws. Without a range, bounds follow the current value.
- Selection under a warped anchor uses drawn volumes (`World.tileWarp`, `streaming/tileWarp.ts`).
  - A tile's volume is sampled on a 3×3×3 grid, and the drawn sphere is padded for bulge by (1/8)·M₂·L², with M₂ estimated from Jacobian differences.
  - Screen-space error is geometricError × σ_max + fit error, with σ_max an estimate.
  - At k = 10 selection goes one level deeper than at k = 1. On a 200 km tile, 5,000 random warped points all land inside the drawn sphere, which is 4.9% larger than the 9-point sphere.
- Horizon culling is off under a warped anchor: its true-ellipsoid occluder says nothing about a drawn Earth.
- `routeSingularRange` gives [σ_min, σ_max], about [1.004, 10] at k = 10, for the ray-march and snaps later.
- Not yet on drawn volumes: shadow casters' selection, the viewer's request volume, and dynamic screen-space error (done: "Placement leftovers closed", below).

**Increment 4 is done (2026-11-11).** The globe, terrain, billboards and instances follow a warp, and an item can keep its shape.

- **`warpAt: "vertex" | "anchor"`.** `SceneItemOptions.warpAt` (and a setter that refits the loaded tiles), `World.setWarpAt(draw, at, origin?)`, `DrawOptions.warpAt` and `World.drawWarpAt`, which says what a draw asked and what it is drawn as. Vertex, the default, stretches content by the per-draw fit. Anchor evaluates the route once, at the draw's origin in float64 (`scene/warpAnchor.ts`).
  - **The anchor rule.** The draw gets the route's translation and the rotation of its Jacobian, the orthogonal factor of the polar decomposition, relative to the route's rigid part. Scale and shear are dropped, so a ×10 exaggeration leaves a car as tall as it was, and a reprojection turns it with the grid's convergence without scaling it. A route with no warp gives the identity. The term is an exact one-cell lattice: it costs the vertex stage what a fit does, and nothing to fit. A scale redoes it, since the rotation isn't linear in a scale. Give a model's draws one `origin` and the whole model moves as one.
  - **Forced.** A billboard is always anchored: its anchor goes through the route and its corners stay pixels on screen. Instanced draws are anchored per instance, on the CPU: each instance's origin goes through the route, in slices within the frame's budget, and its matrix in the instance table is rewritten, which the cull and vertex stages already read. `World.setInstance` writes the application's matrix again, so the route moves it afresh.
  - **Not warped, and reported.** Point sets, whose cull reads positions a placement doesn't reach, and a `ModelPool`'s instances, which the GPU writes. They are drawn at their anchor's affine place, and the engine says so once. The owner's rule had points anchored; they aren't moved at all yet. (Since closed for a `PointSource` and its pool; see "Placement leftovers closed", below.)
- **The globe under a warp.** Its tiles are placed like any content: selected on drawn volumes, fitted per vertex, with the horizon test off. A warp may declare `Warp.heightScale` (`HeightScale`: the reference's radii, the factor, a base height), which `verticalExaggeration` sets for an ellipsoid or a sphere. Under one height-scale warp followed by rigid steps, on the ellipsoid a terrain tile was made on (WGS84, base height 0), the tile is exact in height with no fit, the owner's answer 3:
  - each vertex carries `h·n̂`, its geodetic height times the ellipsoid's normal there (`_HEIGHT_NORMAL`, `globe/heightNormal.ts`), and the globe asks its source, in a worker, for it only while the anchor's route is such a warp;
  - the route's term is that attribute times (k − 1). The slider is one float, the term's weight;
  - a tile without it is fitted like any, and the draw is held until its first term lands.
- **The spike** (`spikes/warpGlobe.html`, NVIDIA GPU, in Edge) draws four kinds in one view rooted on a ×10 height warp: a terrain tile with `h·n̂`, the same tile fitted, an anchored billboard, and a pole with `warpAt: "anchor"`. Each is within 0.58 px of the float64 route at ×10 and at ×4.6 (scale 0.4, one float written, no refit of the exact tile), against a limit of 1.5 px. The globe's tiles, generated in a worker, are then drawn under the warp: 4,760 tile draws, all exact, none pending. The Node test is `test/warpGlobe.test.ts`.
- **Running a spike headless.** `node scripts/runSpike.mjs <spike page URL> <run function>` (for example `http://127.0.0.1:5190/spikes/warpGlobe.html?bench runWarpGlobe`, with the dev server running) loads it in a visible, focused Edge on this machine's GPU and prints the checks. A page hidden behind other windows throttles timers, and spikes then crawl or stall.
- **Not built:**
  - exact terrain for any warp but a height scale on its own ellipsoid, such as flattening: those are fitted;
  - warping point sets and a `ModelPool`'s instances (done: "Placement leftovers closed", below);
  - picks by domain point (increment 5, done below).

**Increment 5 is done (2026-11-11).** A pick says where the hit is in the content, and the exact point there, with no inverse of any warp.

- **The pick variant** of the surface shader records the draw, the feature, and the triangle (or b-rep face) with its barycentrics (or (u, v)) beside the depth; a kernel fetches the stored triangle. `CorePick.domain` (`PickDomain`) is that domain point. `truePosition`, in the hit anchor's frame, is the content's own point, evaluated in float64 and carried by the draw's matrix. `drawnPosition` is the depth's, in the render root's frame. Both are `PickPoint`s, each with its frame, and `accuracy` says what `truePosition` is: exact on a b-rep face (`refinePick`), on the triangle for a mesh.
- **Never inverted.** A warp may have no inverse, or a fitted one that is only close; the pick reads the triangle it hit instead. Where the variant's hit isn't the image's (another draw or feature), and for the bare ellipsoid, billboards and points, there is no domain point and the depth's `position` is all there is.
- **The spike** (`spikes/pickDomain.html`, NVIDIA GPU) passes 8 of 8. A ×10 tile's true point is 10.07 m from the drawn one, and lies on its triangle to 1.6e-10 m. The Node test is `test/pickDomain.test.ts`.

**Increment 6 is done (2026-11-11).** Measurements and snaps are in true frames, and what is drawn is the only drawn thing.

- **True by default.** `measure` runs on true points, a pick's `truePosition` where it has one. Snaps (`engineering/snap.ts`) return true points too.
- **`drawnDistance`** (`measure/drawn.ts`) is the one question about the drawing, named so it can't be mistaken for a measurement. It returns the distance between the drawn ends, the length of the true segment as it is drawn (`pathLength`) and the true distance beside them, with a label that carries the warps' words. It scales with a vertical exaggeration; the true distance doesn't. For what a vector style needs: dash lengths, label spacing, symbol density.
- **Graphics through the route.** A straight true segment draws as a curve under a warp. `DrawnCurve` (`measure/curve.ts`) samples it adaptively until the drawn polyline is within 0.5 px of the routed curve (1 mm without a camera), and samples again when the route, a warp's scale or the camera's pixel size changes. Labels anchor at routed points.
- **Accuracy keeps its two kinds apart.** A term is `sigma` (1σ, added in quadrature) or `bound` (worst case: a pick's pixel footprint, a snap's geometric error, added linearly). `AccuracyStatement.sigma` and `.bound` are separate; the old root sum square stays for readers that want one number.
- **Checked** by `test/measureTruth.test.ts`.

**Increment 7 is done (2026-11-11).** `examples/vertical-exaggeration` is the placement review's acceptance test: Matterhorn and Zermatt on Cesium World Terrain, OSM buildings and the milk truck. The application writes a frame and a rig (`exaggeration.ts`) and sets nothing on any item.

| Quantity                     | ×1 to ×10                      |
| ---------------------------- | ------------------------------ |
| Pick's true height           | 2,824 m, constant              |
| Zermatt to the Matterhorn    | about 2,660 m, constant        |
| Refits when the slider moves | 0 (one float, the term weight) |

True heights stay put while the drawn ones follow the slider. `test/verticalExaggerationExample.test.ts` asks the questions in Node.

- **Engine gaps it found,** which the example worked around, and which increment 8b closed (see "Engine gaps closed", below):
  - `anchorPosition` is a drawn position, so an application that asks for where an anchor is gets the drawn one;
  - there are no public scale-aware warp functions, so an application can't evaluate its map at a slider's multiplier through the engine;
  - a pick lags its tick, so one read just after the slider moves can be at the old multiplier;
  - there is no public fit counter (`fits.ts` is the one place the page reaches past the API);
  - `View.toPixel` and the camera controller are not warp-aware;
  - a rig can't re-root across a warp (`CameraLayer` refuses it, increment 1D), so the camera keeps its true place.

**Increment 8a is done (2026-11-11).** World clips, tested per fragment in the space where they are exact.

- **A world object.** `world.addClip(set)` takes a `ClipSet` (`ClipShape`s: planes, boxes and extruded polygons, in a reference frame, combined by union or intersection, keeping the inside or outside) and returns a `WorldClip`. A view opts in by mask (`View.clipMask`, `View.setClips`). `setClip`, `removeClip` and `clipOf` complete it. A world holds 32 clips, a view uses 8 and a set takes 16 shapes (`MAX_WORLD_CLIPS`, `MAX_CLIP_SETS`, `MAX_CLIP_SHAPES`), all in one storage table of 4,096 rows. A polygon takes up to 128 vertices.
- **True or drawn space, per fragment.** Each clip is planned by its route: if its route to the content's true side is rigid it is tested on the true point (location 4 where that is the true position, increment 2a's varying swap), and if its route to the root is rigid it is tested on the drawn point rebuilt from the fragment's position. A curved clip, rigid on neither, isn't built (below).
- **Lazy pipelines.** A view without clips keeps the unclipped pipelines and early depth. The clipped variant of each pipeline and bundle (`clippedBundle`) is made when a view first uses a clip, so nothing recompiles when a clip's shapes change.
- **Queries.** Every pick and snap takes `clips: "view" | ClipSet | "none"` (`ClipsOption`; a list of sets too), `clipFilter` and `clipSetKeeps` test points in float64. Picks and snaps default to the view's clips.
- **The spike** (`spikes/clips.html`, NVIDIA GPU) passes 10 of 10. On a ×10 tower, a plane cut in the true frame lands at row 287, against the route's 287.9. Tested on the drawn point it would be 345. The Node test is `test/clips.test.ts`.
- **Deferred:** curved clips (a route rigid on neither side: increment 8c, done below), `TerrainClips` as clip shapes, exemptions (the styling language's), and caps (increment 8b, done below).

**Increment 8b is done (2026-11-11).** Caps close a cut: exact for a b-rep, real geometry for a mesh.

- **B-rep caps are exact sections.** `sectionBrep` cuts every face by each plane of the clip and builds planar faces on it with `BrepBuilder`, drawn through `addBrep`, so they are diced per view with per-pixel trims and are queried and picked as any form. The cap's outer loops run counter-clockwise in the plane's (u, v), holes clockwise.

  | Surface              | Section                                           | Accuracy                                                                                            |
  | -------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
  | Plane                | A line                                            | Exact                                                                                               |
  | Cylinder             | An ellipse, or two lines parallel to the axis     | Exact                                                                                               |
  | Sphere               | A circle                                          | Exact                                                                                               |
  | Cone, torus          | Circles where the plane is square to the axis     | Exact                                                                                               |
  | Cone, torus, oblique | Marched on the (u, v) grid, then fitted in cubics | Within the tolerance (1e-5 of the size by default; the tests use 1e-6 m and the fit stays under it) |
  | Bézier patches       | Marched and fitted                                | The same                                                                                            |

- **The bias replaces a per-draw exemption.** The owner's call was to exclude a cap from its own clip. A cap lies on the clip's plane, so a per-fragment test would drop half of it to rounding, and excluding it needs a per-draw exemption, which is the styling language's and isn't built (decision 10). So each cap lies a bias inside the kept side: 2e-5 of the solid's size (at least 1e-6 m) for a b-rep, 1e-6 m for a mesh, applied to the cap's plane and to each limit plane of a box. When the styling language's exemptions land, the bias can go.
- **Planes that touch.** A plane lying on a face or an edge is nudged 1e-6 of the size into the solid so it has a loop to cap, and the report counts it. A set of planes, or of one box, has caps (`capPlanes`: each plane limited by the others, inside for an intersection and outside for a union). A set with a polygon or several boxes reports why it has none.
- **Mesh caps are on the CPU.** `MeshCaps` cuts each tile's triangles into segments keyed by element ID, caches the cut per tile, plane and revision, joins the segments across every tile (ends within 1% of the largest geometric error, at least 1e-6 of the largest tile), nests and triangulates the loops with holes, and draws chains that don't close as section lines, never filled. A report counts open chains and near misses (an end within 100 snaps of another's, probably tiles at different levels of detail that haven't met). A compute pass is a later step behind the same `TileSection`.
- **Scheduling and style.** `CapScheduler` rebuilds within 4 ms a tick, at most every 100 ms per cap while its clip moves, and swaps new draws in before the old go. `style(input)` returns a colour per cap (a b-rep's, or a mesh element's by feature ID): the styling language's hook, for hatching later.
- **Checked.** `spikes/caps.html` passes 7 of 7 on the GPU (a capped cylinder following a moving clip, a block with a bore, a closed mesh, an open wall's section line, a mesh split across two tiles). Node tests: `test/brepSection*.test.ts`, `test/caps.test.ts`, `test/meshCaps.test.ts`. On NIST's CTC-05 (208 faces, through Open CASCADE), caps along each axis and aslant close and validate, and the middle ones match a ray oracle to about 0.3% (the test allows 1%).
- **Not built:** the compute section pass, caps for polygon and multi-shape sets, caps made automatically from `addClip` and a tileset's tiles (an application creates `BrepCaps` and `MeshCaps` and feeds them), and hatching.
- The handbook's clipping deep dive is written (the Clipping tab).

**Increment 8c is done (2026-11-11, `391ffca72c`).** A clip across a non-rigid route is cut along a signed distance fitted per draw.

- **Curved.** A clip set whose frame reaches neither the content's true side nor the render root rigidly is curved (`src/scene/world/curvedClips.ts`).
- **Evaluated in float64, fitted as a lattice.** Per draw, its signed distance is evaluated in float64 (model to anchor, along the route, into the set's frame) and fitted as a scalar cubic lattice in the placement rows' `.w`. A draw without a lattice gets a weight-0 carrier lattice, at most 4 cells per axis.
- **On the GPU.** The vertex stage evaluates the lattice and passes it in `airTransmittance.w`, which takes no extra location. The fragment stage discards above 0. Picks share it, and `clipFilter` routes in float64.
- **The spike** (`spikes/curvedClips.html`) passes 7 of 7. A wavy plane on a 24 m plate fits to 4.6 cm, about half a pixel. A box window's kinks fit to 1.49 m. The ×10 plate is cut on its true surface. The Node test is `test/curvedClips.test.ts`.
- **Limits:** one curved field per world (one view's curved sets combine by max, and differing views are reported); moving a curved clip refits every draw within the per-frame budget; a warp-scale change after the fit isn't followed; billboards, points and instances aren't cut by curved clips; a draw already at 3 terms with no lattice has no room for a carrier; and a draw is uncut until its field lands.
- **Not done:** folding `TerrainClips` into clip shapes (it carries translucency, holes, pick stops and `sampleHeight` semantics), and `clips` on `RayQuery`, the terrain's ray and the draw ray backends.
- The Clipping tab is updated.

**Engine gaps closed (2026-11-11).** The vertical exaggeration example's gaps, closed in the same commit as 8b (7326cfa3c4), and its workarounds removed (`fits.ts` is gone).

- **`anchorPosition` is honest.** It stays the drawn position, written in the anchor's coordinates, and says so; `truePosition` and `truePick(pick)` give the true one.
- **Scale-aware maps are exported** from `/frames`: `routeForward`, `routeInverse`, `warpForward`, `warpInverse`, `truePick`, and the types `Route`, `Warp` and `WarpScale`. Each warp is applied at its live scale, which a warp's own `inverse` is not (it is the inverse at scale 1).
- **A pick keeps its route.** `CorePick.route` is the route that drew the hit, scales frozen at their values when the pick pass was encoded, so a pick that resolves after the slider moved is inverted at the multiplier it was drawn at.
- **`world.warpStats()`** (provisional) counts fits run, refits, placements, moved draws and pending fits, and the warped draws by state, so an application needs no reach past the API for the fit counter.
- **`View.toPixel` and `GlobeController` are warp-aware.** `toPixel` carries a true position through the anchor's route, and the controller keeps the camera above the ground as drawn.
- **`setRig` re-roots across a warp.** The camera is carried through the route (its position mapped, its axes by the Jacobian there) rather than refused.
- **A moved draw refitted wrongly, and is fixed.** A draw whose transform moved was handed back the fit held for its route's stamp, which was made for the old matrix. A box moved from 1,000 m to 3,000 m up under ×10 drew at 12,005 m instead of 30,005 m. It now drops that fit and asks again (`test/warpMovedDraw.test.ts`: 10,005 m, then 30,005 m, with no refit counted). Also `test/warpCameraPick.test.ts` and `test/warpScaleExports.test.ts`.

**Placement leftovers closed (2026-11-11, `c0179db727`).** The three things increments 1 to 4 left are built.

- **The centre is exact (second-review flaw 3).** Each lattice's centre value goes to the cull kernel as float32 high and low parts, summed into the camera-relative translation with exact float32 arithmetic (`src/shaders/exactSum.slang`: two-sum and two-product), and the cells hold the lattice minus that constant. `DrawItem` grew from 80 to 96 bytes (`DrawItem.drawn`). The cull binds the placements buffer, so it has 8 storage buffers, the base tier's limit, and the indirect arguments moved to binding 9. A custom shader's `positionMC` on a placed draw excludes the centre displacement. Where the platform reassociates float math (Dawn's relaxed math on Apple), the error terms fold to zero and accuracy is the old one; verified only on NVIDIA under D3D12.

  | Case                                            | Before  | After    |
  | ----------------------------------------------- | ------- | -------- |
  | 37 km displacement, GPU                         | 0.43 mm | 0.03 mm  |
  | 3,600 km translation, GPU                       | 9.8 mm  | 0.01 mm  |
  | 37 km displacement, float32 emulation in Node   | 3.2 mm  | 0.06 mm  |
  | Whole-world map at street level, Node emulation | 125 mm  | 0.001 mm |

- **More drawn volumes.** Shadow-caster selection, the viewer's request volume (a conservative sphere of its image) and the dynamic screen-space error use drawn volumes under a warped anchor.
- **Point sets and pools follow a warp.** A `PointSource` owns a hidden carrier draw fitted like any draw, and `points.slang` evaluates the fit per point before it writes the anchor. Pools move by position only, not turned. New options: `PointSourceOptions.warpRadius` (default 50 km) and `warpTolerance` (default 0.05 m). GPU anchors are within 0.9 mm of the twin over 14 km moves. The once-per-world "not warped" report remains for point sets no source owns.
- **Checked.** Spikes `spikes/warpPrecision.html` (`runWarpPrecision`) and `spikes/warpPoints.html` (`runWarpPoints`); tests `test/warpPrecision.test.ts`, `test/warpDrawnVolumes.test.ts` and `test/warpPoints.test.ts`.
- **Still not built:** the lattice rows' free `.w` scalar for a fitted true height, and fitting off the main thread.

**Spike runner and a build message.** `node scripts/runSpike.mjs` runs a spike's checks headless in Edge on this machine's GPU, as described under increment 4: the page is visible and focused because a hidden browser tab throttles timers. Separately, the deliberate failing bundle build in `scripts/checkBundle.mjs` printed Vite's "Build failed" line although its error is the one the check expects; it now builds silently (de36500ada).

**Gaps found writing the handbook's deep dive (2026-11-10).** These are for the next increments:

- Location 4 carries the position before the whole fitted route. It's the true position only when every warp crossed is a presentation warp. Second-review flaw 9's fix for mixed routes, a true point under a non-presentation warp, isn't built.
- The order-0 term isn't in the cull kernel as hi and lo parts, so float32 cancellation remains (second-review flaw 3). Closed: "Placement leftovers closed", below.
- The lattice rows' `.w` scalar is unused (0).
- `warpAt` is built (increment 4, above).
- `Warp`, `Route`, `resolveRoute` and `NonRigidRouteError` aren't exported from an entry point. Only `warpFrame`, `WarpFrame`, `WarpSpec` and `isWarpFrame` are. They wait for the API review's names.
- A warp's `forward` must write its Jacobian when asked: Newton and σ estimates use it.
- The 1000 km tile's "4 cells" is 4 per axis (64 cells). The 0.7 ms was its one-cell fit. The 10 km tile's cold fit takes about 6 ms.

**Decided: no placement modes (owner's question, 2026-11-11; approved by the owner 2026-11-11).** The owner asked whether "rigid" and "reprojected" need to be separate. Can one represent the other? Is a rigid placement just an ordinary transform in the frame tree? Is `EXT_geospatial_crs_source` needed, and can placement have no modes?

- **The answer is yes, no modes.** The mode says something the content's CRS already says, once it's declared fully:
  - **The content is in an engineering CRS:** local Cartesian, ground distances, as a building or plant is authored. It's tied to the Earth by a declared similarity transform (a site transform, as IFC's `IfcMapConversion` is). That's a rigid edge in the frame tree, an ordinary transform, drawn with no warp. Today's "rigid".
  - **The content is in a projected or geographic CRS:** grid coordinates, as civil alignments and survey data are. Its route to the body frame is a coordinate operation: a warp edge, fitted per tile (§13.26). Today's "reprojected".
  - **The content is already in the body's frame:** ECEF or ITRF. That's the identity route. Today's "hosted".
- So the engine never asks how to place content; it routes from the declared CRS, and whether the route is rigid is a property of the route. The one reason "rigid" existed for projected content was to approximate the reprojection near an anchor, sagging away from it. The fits make that approximation pointless: same drawing cost, no sag.
- **The real distinction underneath is grid against ground distances.** That is a property of the CRS, not a mode. A design in a projected CRS has grid distances, scaled by the projection; reprojecting is right. A design meant to keep its dimensions on the ground belongs in an engineering CRS with a site transform. `IfcMapConversionScaled`'s scale factors are how IFC carries the difference.
- **Consequences (approved 2026-11-11; to build in the API review, 5i, with the renames):**
  - The Spec extensions tab already drops the proposal "A placement mode on the source CRS", and reworks the others (below).
  - `BENTLEY_engineering_frame` loses its placement-mode field. It keeps what the 2.0 draft's extensions can't say (below), and may shrink to that.
  - `DesignPlacement.mode` goes, and `Georeference` (the API review's name) is just the route from the content's CRS to the body frame.
  - `georeferenceTileset` reads the CRS and the node's georeference or the site transform, and picks the route from the CRS's type.
  - The design globe moves to the warp path; its projected content was "reprojected" anyway.
- **The 3D Tiles 2.0 finding (owner, 2026-11-11), which corrects the text that was here.** That text said neither 3D Tiles nor glTF can name a CRS, and kept `EXT_geospatial_crs_source` for it. The 3D Tiles 2.0 draft (CesiumGS/3d-tiles, branch `draft-2.0`, `next/2.0/README.md`) lists four glTF 2.1 extensions, in CesiumGS/glTF's branch `3d-tiles-2.0`, folder `extensions/2.1/Vendor` (read 2026-11-11). `EXT_geospatial_crs_source` (open PR #131) isn't among them. They are optional, and written against glTF 2.1:
  - **`EXT_geospatial_crs`:** declares an asset's CRS, overriding glTF's own coordinate system (-x right, +y up, +z forward, metres). It has a type: _geographic_ (longitude, latitude, height), _geocentric_ (global x, y, z), _projected_ (x, y, height in a 2D projection), _compound_ (horizontal plus vertical) or _local_ (x, y, z). Its `format` is defined by sub-extensions, and a CRS's axes and units are the CRS's own (its example is a projected CRS in U.S. Survey Feet, +x east, +y north, +z up).
  - **`EXT_geospatial_crs_wkid`:** format `wkid`: an `authority` and an integer `wkid` (EPSG 4978 in its example), an optional `vcsWkid` for a vertical CRS, and an optional `epoch` for a dynamic CRS. Other authorities appear (its example has `IAU_2015` for another body).
  - **`EXT_geospatial_crs_wkt2`:** format `wkt2`: a WKT2 string, such as UTM zone 11N.
  - **`EXT_georeference`:** on a node. Anchors its local origin at a `longitude`, `latitude` (degrees) and `height` (metres) on WGS 84, or on the ellipsoid of the declared CRS when `EXT_geospatial_crs` is present. It rotates the node to east-north-up axes with -x east, +y up (the geodetic normal) and +z north, and it applies _after_ the node's own transform.
- **So the CRS type selects the route, with no mode field:**

  | Declared CRS                       | Route to the body frame                                                                                                    | Edge                  |
  | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- |
  | Geocentric (ECEF, ITRF; EPSG 4978) | None, or a transformation between frames when the epochs or datums differ                                                  | Identity              |
  | Geographic, projected or compound  | A coordinate operation from the CRS to the body's geographic CRS, then to geocentric (a datum shift and a projection)      | Warp, fitted per tile |
  | Local, with `EXT_georeference`     | The node's translation, rotation and scale (the site transform), then the anchor's east-north-up frame, then to geocentric | Rigid                 |

  A local CRS without `EXT_georeference` or a site transform has no route, and the engine should say so rather than guess.

- **What may still need a Bentley extension.** Each is to check against the draft's text before proposing, and none is needed to remove the mode:
  - _A declared coordinate operation and its accuracy._ A CRS says where content is, not which operation the producer used to move it there. Two operations between the same CRSs can differ by metres (a ballpark transformation against a gridded one), so a producer who reprojected needs to say which, as WKT2 `COORDINATEOPERATION` or `BOUNDCRS`, so a consumer reproduces the placement exactly (the Spec extensions tab's proposal, kept).
  - _`IfcMapConversionScaled`'s scale semantics._ A node's scale and an `EXT_georeference` anchor can carry IFC's origin, rotation and one scale. IFC's separate horizontal and vertical factors, and what they scale (grid or ground distances), may not fit. Left open, and reworked in the Spec extensions tab.
  - _Alignments:_ nothing in the four extensions carries alignment geometry, so `BENTLEY_alignments` stays as a proposal.
  - _The site transform at the tileset level._ `EXT_georeference` is on a glTF node, so a tileset whose tiles all share a site transform either repeats it per tile or declares it once. A tileset-level declaration may remain, as what `BENTLEY_engineering_frame` holds, without a mode.
- **Built with the API review (5i):** it changes a public API (`DesignPlacement`, `georeferenceTileset`) and a declared extension. The code already reads `EXT_geospatial_crs`'s shape (`src/engineering/georeference.ts`), so reading the 2.0 draft's CRS and node anchor is a small step.

**Clip planes and caps: decided by the owner (2026-11-10).** Built as increment 8, once increments 2a and 3 have landed. 2a's varying swap provides the true point per fragment.

1. **A clip is a world object, defined in a frame, which views opt into by mask.** One section cuts federated content and moves with its frame. Clips per item can be added later if a need appears.
2. **Clips may be named in any frame, presentation frames included.** A plane drawn in design space, for example, stays where the user drew it when the scene is warped into another frame. Each clip is evaluated in its own frame:
   - If its route to the content's true side is rigid, it's tested exactly on the true point.
   - If its route to the root, the drawn side, is rigid, it's tested exactly on the drawn point, which is rebuilt per fragment.
   - If neither is rigid, the plane is curved in the scene. Its signed distance is fitted per tile, in the lattice rows' free `.w` channel that the second review pointed out: one clip per draw costs nothing, and more need rows. Its error joins the fit's.
   - Queries test clips in float64, by routing points to the clip's frame.
3. **Shapes:** planes, boxes and extruded polygons, which absorb today's `TerrainClips`. One loop over a storage buffer, so no shader recompiles.
4. **Combining:** union or intersection, keeping inside or outside, per clip set.
5. **B-rep caps are exact.** The cut through the solid gives planar faces with trimmed loops. These join the form as faces that can be tessellated, queried and picked. Curved cuts (case 2) give non-planar section faces, through the same path.
6. **Mesh caps are real geometry,** because content may be open meshes:
   - A compute pass cuts each tile's triangles by the clip and writes segments keyed by element ID.
   - Segments are joined into loops per element across every loaded tile, because a solid often spans several.
   - Closed loops are triangulated into caps. Chains that don't close are drawn as section lines instead of being filled, and a report says so.
   - Caps are cached per tile, clip and revision, and rebuilt within a per-frame budget.
   - Known gap: tiles at different levels of detail may not meet, so a loop can stay open until they settle.
   - B-rep caps are exact, and mesh caps are as accurate as the mesh's geometric error.
7. **Cap styling is the styling language's:** hatching per material or element, through §13.27's planar fill.
8. **Queries support both uses.** Every query takes `clips: "view" | ClipSet | "none"`. Picks and snaps default to their view's clips. World questions, such as distance, clearance and line of sight, default to none, and can pass a set.
9. **A plane can define an orthographic section view** looking at the cut (5d's orthographic camera), which leads to printing to scale (§13.34, 6).
10. **Exemptions are the styling language's:** run-time data by element ID, for example "don't clip the terrain". There is no exemption list per clip.

**Increment 2a, normals and the varying swap (2026-11-10).** Reformulations 2 and 3 of the second review, without the height lookup, which waits for the API review.

- **The Jacobian.** `placeVertex` (placement.slang) returns `Placed { position, jacobian }`, with J = I + Σ wᵢ·Jᵢ. A lattice's Jᵢ is the cubic's analytic derivative, chained by dv/dp = cells / scale. An attribute term (a morph target, a dual position) has no derivative in space: its Jᵢ is zero, so under one the normal stays as stored. `NO_PLACEMENT` is still one compare. `surface.slang` turns the normal by the cofactor matrix (`turnNormal`, no inverse, a fold keeps the normal on its side) and the tangent by J, keeping w. The twin is `placeJacobianWithTerms` in `scene/warpEvaluate.ts`.
- **Cost per vertex,** one cubic term, one cell: 23 row reads, as before. Multiply-adds: 80 float3 against 20 (the value and the three columns of J, each a float3 of the monomial's coefficient), and 7 scalar products per monomial against 2. Then about 35 for the normal's cofactor and normalize, and 9 for the tangent. Reads dominate; this is ALU.
- **The varyings, 13 user locations as before.** Location 8 is the design `positionMC`. Location 4 is the draw's transform on the position before the placement, which for an unplaced draw is where it is drawn, bit for bit as before. A placed draw's drawn position is rebuilt in the fragment stage from `@builtin(position)` and the view's `viewProj`, whose rows 0, 1 and 3 are orthogonal for the rotation-only perspective: `w · (right·x/|row0|² + up·y/|row1|² + direction)`, `w = near / depth`, camera-relative, no new view field. Billboards, the underlay and shadow and height-capture views (orthographic, with a window of their own) keep the varying. Clips (mixed-LOD boxes, terrain regions) stay on the varying: they are defined on the content as stored.
- **Custom shaders.** `fsInput.positionMC` is the design position, a Pref: a procedural texture stays on the surface under a warp, and no longer follows `vertexMain`'s displacement (carry that in a named attribute). `vsInput.normalMC` is the turned normal after a placement.
- Checked by `test/placementJacobian.test.ts` (central differences, cofactor against placed triangles, the unprojection in float64) and `spikes/placementNormals.html` on the GPU.

**Increment 3, drawn bounds, parameter ranges, selection and the horizon (2026-11-10).** Flaws 1, 2 (the error budget in selection), 6 and 7 of the second review.

- **A draw's sphere moves, then pads by the residual.** The cull kernel tests the record's `center` and `radius`, so the record carries the moved sphere and `cull.slang` is unchanged. The base centre and radius are kept on the draw's placement, and an unplaced draw's record is never written. For a term with weight in [w₁, w₂] (middle w̄, half-width ω) the centre moves by Σ w̄ᵢ·Dᵢ(c) (float64, rounded to float32), and the radius grows by Σ (ωᵢ·|Dᵢ(c)| + max|wᵢ|·residualᵢ), with the float32 rounding of the centre added and the whole rounded up. `residualᵢ` bounds |Dᵢ(p) − Dᵢ(c)| over the sphere plus the fit's `errorBound` (`scene/warpBounds.ts`, `latticeResidual`). Per cell the sphere's box touches, the polynomial is expanded about a point in it: the linear part counts the smaller of Σ|cₐ|hₐ and its Frobenius norm times the distance, orders 2 and 3 count |c|·(Π(|mₐ| + hₐ)^eₐ − Π|mₐ|^eₐ), and the exact |D_cell(m) − D(c)| carries a jump between cells. A tile fitted over its own sphere gets about the size of its Jacobian times the radius: the 400 m quad of `warpWorld.test.ts`, 3 km up at k = 10 and tilted 67° to the local horizontal, grew by about 20 km before and grows by 2.5 km now. An attribute term has no displacement at the centre; it pads by max|w|·`maxDistance`.
- **Parameters declare a range.** `World.createPlacementParameter(value, { range: [min, max] })`. Bounds of the draws reading it are made once, over the range (a weight is `scale × Π` of at most two affine factors: the extreme at a corner of the box of ranges, or at the stationary point of a quadratic when one parameter is used twice), so a change within it writes one float and walks no draw. A value outside the range throws a `RangeError` and keeps the old one, so a parameter never leaves what its bounds were made for. Without a range a change walks the draws that read it and recomputes their spheres at the value it has, as before. `Warp.scale` is a `WarpScale`, which may carry a `range` too; a world parameter used as a scale does. Selection's drawn volumes hold for the one of 16 buckets over the range that the value is in, not the whole range (2026-11-11): held at the range's top, a slider at the bottom had the tileset refine and load far past what was drawn (heap past 2 GB in the exaggeration example). For a route that is one scaled warp among rigid steps the map is affine in the scale, so a tile keeps a compact record and a bucket crossing rebuilds its bounds without evaluating the map.
- **Selection on drawn volumes.** An anchor whose route crosses a warp has a `TileWarp` (`World.tileWarp(anchor)`, `streaming/tileWarp.ts`): the map `A⁻¹ · route`, from the anchor's coordinates to where they are drawn in them, where `A` is the anchor's place, so the camera, the planes and the distances stay as they are. `Tileset3D.update` puts it on each `SelectionView`. A tile's volume goes to its drawn bounding sphere (its centre and 8 corners through the map, cached on the tile per map version and fit version; the map's version moves with the route, or a scale's bucket of 1/64 when it has no range, in which case both ends of the bucket are carried), distance, the frustum planes and the content volume use that, and the screen-space error uses `geometricError × σ_max + fit error`. σ_max is the largest singular value of the Jacobian at those samples: an estimate. A route's Jacobian is composed from its steps' (`warpForward`), differenced for an inverse step. The globe is left alone, as are the viewer request volume, dynamic SSE and shadow casters, which still read true volumes.
- **The horizon.** Off for tiles under a warped anchor. The occluder is the ellipsoid shrunk to the volume's lowest height, which says nothing about a drawn Earth: at k = 10 the drawn heights differ, and under a general warp there is no ellipsoid. No occludee made from drawn bounds would be sound, so the frustum and the error decide.
- **[σ_min, σ_max].** `routeSingularRange(route, volume)`: about [1, k] for exaggeration by k (radially k, across it (R + kh) / (R + h)). σ_min sets the ray-march step and divides snap tolerances (flaw 6); not wired yet.
- Checked by `test/warpBounds.test.ts` (random placed points against moved spheres for lattices of 1, 2 and 4 cells and weights of two factors, intervals by brute force, σ for k = 10), `test/warpSelection.test.ts` (k = 10 selects a level deeper than k = 1 at the same camera, and the tile is culled where it is drawn; the horizon) and `test/warpWorld.test.ts` (a ranged scale writes one float and walks no draw; selection through the engine).

_Open questions for the owner:_

1. Should models and instances stretch per vertex or move per anchor by default?
2. Should aerial perspective, local lights and height-based styles read true or drawn positions?
3. May terrain keep (u, v, h)? Exaggeration and flattening would then be exact in height, with no fit along it.
4. Is accuracy reported as a bound, as 1σ, or both?
5. Is 0.25–0.5 m of imprecision in the middle of the 2D morph acceptable, given both ends are exact?
6. Should a "drawn distance" query exist, labelled as such?

**The owner's answers (2026-11-10).** These lock the second review, with question 4 provisional.

1. **Content stretches per vertex.** That is what reprojection means. `warpAt: "anchor"` stays for things that must keep their shape, such as a vehicle model, a symbol or a billboard. It's forced for billboards and points, and is an item's choice otherwise.
2. **Shading reads drawn positions, and lookups keyed by height read the true height.** The owner leaned towards drawn; this is the reasoning for the split.
   - A true height isn't drawn anywhere. It's a value the shader looks something up with.
   - Normals, shadows, light directions and distances, and the length of the path through air are geometry, so they're drawn.
   - A hypsometric tint, contours, a style's height thresholds and the air's density are lookups keyed by height. Keyed by drawn height, a legend reading 1,000 m would sit at 100 m of true height when k = 10, and an exaggerated summit would stand in near-vacuum.
   - Integrating the drawn path while reading density at the true height is the same as warping the atmosphere along with everything else. That is the consistent picture.
   - The true height comes from the free `.w` scalar (reformulation 2), or from the true-position varying (reformulation 3).
   - Not settled: whether the owner agrees. The owner wants to see it first: a spike comparing a tint and a height-based haze keyed to drawn and to true height, on an exaggerated terrain patch. It's deferred to the API review (5i), to be judged with the rest of the API.
3. **Terrain keeps (u, v, h).** Exaggeration and flattening are exact in height for terrain, with no fit along it.
4. **Accuracy: both, provisionally.**
   - A worst-case `bound` comes from fits, representation error, tessellation and float32 rounding. Bounds compose linearly, by the (L, ε) algebra.
   - A statistical `sigma` comes from the frames layer, surveys and ephemerides. Sigmas compose in quadrature, as `frames/pointAccuracy.ts` already does.
   - This fits what exists. `Confidence` already has `"max"` beside `"1σ"` and `"95%"` (`frames/frameAccuracy.ts`). `GeometryAccuracy`'s `meters` and `exact` become `bound` plus `sigma`.
   - What changes: no bound is "taken as 1σ" any more, as `frames/pickInterpreter.ts` does today. A report shows both figures, and never converts one into the other silently.
5. **0.25–0.5 m in the middle of the morph is acceptable** until it's shown not to be.
6. **A drawn-distance query exists,** named as one, in a presentation frame. Vector styling needs it: dash lengths, label spacing and symbol density in what's drawn.

**Names: "placement" retires as the umbrella term.** It has come to mean four different things: `SceneItem.placement`, a per-draw `Placement`, `DesignPlacement`, and `ModelPlacement`, which is a placed glTF instance. The new model's terms, with the standards' names beside them:

- **`Warp`:** a non-rigid edge of the frame graph, exact on the CPU.
- **`Route`:** the composed path from a content frame to the root. This is ISO 19111's _concatenated coordinate operation_ and PROJ's _pipeline_. `FrameResolver` already says `routeRevision`.
- **Warp terms:** the GPU form, an internal name.
- **`Georeference`** instead of `DesignPlacement`. That is the 3D Tiles and CAD term of art, and its modes map onto the new model: rigid is a rigid edge, reprojected is a warp edge, and hosted needs neither.
- **Scene items:** they attach to a frame, and their morph targets take weights: `world.add(tileset, { frame, weights })`. `ModelPlacement` becomes an instance, as USD names it.
- "Place" survives as an ordinary verb.

The renames themselves wait for the API review (5i). New code from increment 1 uses these names.
