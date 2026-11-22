# B-reps and a geometry query interface (owner, 2026-11-09)

**What this holds:** B-reps, their render form and a geometry query interface (owner, 2026-11-09). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Decided to plan.** Not designed in detail or built. The engine evaluates exact geometry but never models it: booleans, fillets, healing as an edit, feature history and constraints belong to the application, or to a kernel it brings. Builds on [geometry-through-placement-review.md](geometry-through-placement-review.md) (curves through placement), [cad-display-extensions.md](cad-display-extensions.md) (CAD display), [editing.md](editing.md) (editing), the tessellation design input in [bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md) and the vector design.

**One query interface for every representation.** Meshes, b-reps and implicit surfaces (f-reps) each answer the same queries, and every answer states its accuracy: bounds, ray hit, closest point and distance, topology (face, edge and vertex IDs), and display at a tolerance. A mesh is the case where the exact and displayed geometry are the same, so today's picks, snapping and measurement move onto it first with no change in results. Every query names its reference frame and instant, as the ray-query seam in [bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md) already requires. F-reps are designed in from the start and built later: answers come from the distance field, and they draw by ray marching bounded by a constant step count, writing depth.

**One render b-rep form, produced two ways.** The engine defines its own form, as custom shaders take precompiled WGSL or Slang compiled at runtime:

- **Tiles:** a glTF 2.1 extension (a draft, for 3D Tiles 2.0) carries the render b-rep beside a fallback mesh, so a client without the extension still draws. Coarse tiles can stay plain meshes, with exact b-reps only at the finer levels. The tiler converts offline.
- **Host, kernel-neutral:** `World.addBrep` (a working name) takes the form as typed arrays. An application with its own kernel writes it directly and loads no WebAssembly.
- **Host, batteries included:** `BrepSource.fromUsd` (a working name) converts USD BRep or NURBS through SMLib built to WebAssembly in a worker, imported only on first use.

The form: analytic surfaces kept as they are (plane, cylinder, cone, sphere, torus); NURBS, split into rational Bézier patches by the loader in TypeScript (exact, no kernel); trim loops in each face's parameter space; face, loop, edge and vertex tables, each edge with its exact 3D curve and its two faces; stable source IDs for every entity; per-entity tolerances as accuracy terms; and a content version.

**SMLib's jobs** (NVIDIA's USD BRep, Apache 2.0, includes SMLib; noted in [bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md)): conversion from what applications export, including surfaces that aren't NURBS (offsets, sweeps); healing; surface intersection for sections and clashes; and a reference tessellation to test the GPU path against. Never in the core.

**View-based GPU tessellation from the start,** in the one tessellation engine [bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md) describes:

- **Edges first.** Each topological edge is tessellated once at the view's tolerance, and both faces take their boundary from it, so faces don't crack apart. This is the vector pipeline's curve refinement.
- **Patches by screen-space error,** evaluated with the draw's placement in compute and drawn with indirect draws.
- **Trims per pixel.** The patch's whole parameter domain is tessellated, and the fragment stage tests inside or outside the trim with the same per-pixel coverage of quadratic curves the vector fill uses, in (u, v) instead of on screen. Exact, antialiased trim edges, no trim textures, no triangulation on the CPU, and a cap on curves per band as for glyphs. Each face's trim comes from its own parameter space, so pixel slivers along shared edges are possible: cover half a pixel extra, and draw edges on top.
- **Planar faces** are vector polygons on a plane: one quad and the coverage test, while the placement is close to affine over the face.

**What b-reps and vectors share:** the curve pipeline (exact source, placement, quadratic segments with an error bound, refined by view) for vector lines and outlines and for b-rep edges, silhouettes, sections and trims; per-pixel fill coverage for polygons, glyphs and trimmed faces; stroke styles for vector strokes and CAD edge styles (`BENTLEY_materials_line_style`); feature IDs and picking; and the exact source kept for snapping. Curved-surface tessellation is shared with reprojected meshes instead. Design the fill and curve kernels once, in the vector design.

**Exact queries, mostly without a kernel.** The winning pick fragment writes the face ID and (u, v). The CPU evaluates the surface there in float64 with one Newton step, so a pick is exact with no ray-surface solve. Closest point and ray hits: closed form on analytic surfaces, subdivision and Newton on Bézier patches in a worker. The kernel only for intersections, healing and conversion.

**Queries answered by a server,** as one of the host application's own services behind the same interface:

- **In stages:** the client answers at once from what it has, exact if exact data is loaded, otherwise provisional with the tessellation's chordal error stated. It then asks the service with the stable entity ID, the ray, a tolerance in meters and the reference frame and instant, and upgrades the marker without a jump when the answer arrives. Answers are cached per entity, and a moving cursor aborts stale requests.
- **Two kinds of service, both allowed:** answers on demand (the server holds the kernel: proprietary or huge data, sections, clashes, areas and volumes), or exact data on demand (the server returns the one element's b-rep and the client evaluates it).
- **The tiles must carry** stable source IDs for elements, faces, edges and vertices, not only tile-local feature indices, and a content version, so an answer from a newer model is detected.

**Editing.** Modeling, undo, persistence and collaboration are the application's. The engine shows changing geometry fast and correctly:

- **Overrides on tiles:** an edited element hides its tiled version by stable ID across every tile that holds it and draws a live version, until republished tiles replace it. This is how edits coexist with immutable tiles ([editing.md](editing.md)).
- **Incremental updates** at face granularity: only changed patches upload, and the GPU re-tessellates them on the next tick.
- **Transient geometry** for drag previews and handles, with picking optional.
- **Queries see the edit,** live geometry and tiles both, excluding the element being dragged.
- **Stable topology names** from the kernel, carried rather than invented, so a selection survives an edit that splits a face.

**Reprojection, for b-reps and vectors together.**

- **Evaluate in source coordinates, then place** each evaluated point. Subdivision measures error after placement, including how far the placement bends across a patch.
- **Normals** are the surface's derivatives times the placement's Jacobian: exact, which avoids the dual-position normal error in [geometry-through-placement-review.md](geometry-through-placement-review.md).
- **Trims and fills are tested in intrinsic coordinates,** (u, v) or the source plane, which reprojection can't change. The rule for both: tessellate the domain by curvature plus placement error, test coverage in intrinsic coordinates. A large planar face under a non-rigid reprojection isn't planar once placed, so it subdivides; its coverage test doesn't change.
- **Quadratic segments are made after placement,** with their error measured there; snaps and measurements go back to the exact source.
- **Measurements name their reference frame:** a distance in design coordinates and on the ground differ by the projection's scale factor.

**Subdivision surfaces (owner, 2026-11-10).** Another representation for the same query interface and tessellation engine, planned, not designed. A subdivision surface is a control mesh (Catmull-Clark for quads, Loop for triangles) whose limit surface is smooth. They matter here because USD meshes carry a subdivision scheme, and Catmull-Clark is the default, so content from USD and from most modeling tools may mean a smooth surface while storing a coarse mesh. How it fits:

- **Drawing:** on regular faces the Catmull-Clark limit surface is a bicubic B-spline patch, so it converts exactly to Bézier patches and draws through step 5's patch path. Faces at extraordinary vertices need adaptive subdivision toward the vertex, or an approximating patch with a stated error. Creases, corners and boundary rules (as OpenSubdiv defines them) change the patches.
- **Queries:** exact limit-surface evaluation at (face, u, v) (Stam's method, or the patches above), so picks, closest points and normals are exact, with accuracy stated where an approximating patch is used.
- **Input:** USD's subdivision attributes on meshes; glTF has no standard for it that this plan relies on. A fallback mesh stays the coarse cage or a pre-subdivided level.
- **Open:** whether to use OpenSubdiv (its license, its size in WebAssembly) or write the patch conversion in TypeScript, and whether the tessellation engine evaluates subdivision patches directly or only through Bézier conversion.

**Order.**

1. Spike: SMLib in WebAssembly (size, startup, threads, exceptions; converting a USD BRep sample to the render form). Done for the kernel; see the result below.
2. Spike: one trimmed NURBS face on the GPU (tessellation by screen-space error and the per-pixel trim), against SMLib's tessellation for accuracy and cost. It also tests the shared fill idea. Both spikes are decision tools. Done; see the result below.
3. The query interface, with the mesh adapter and an f-rep slot.
4. The render b-rep form and the glTF extension draft, with the TypeScript loader and analytic surfaces.
5. The GPU tessellation engine: edges first, patches, planar faces as fills. Preceded by the placement review ([geometry-through-placement-review.md](geometry-through-placement-review.md)), so it builds on one model of a placement.
6. Trims and edges on the shared vector kernels, from the vector design.
7. Exact picks, snapping and measurement, then the server-backed queries.
8. SMLib as a module: `fromUsd`, healing, sections.
9. The tiler: USD BRep to 3D Tiles 2.0, coarse levels as meshes; overrides for editing.
10. F-reps.
11. Subdivision surfaces, through the patch path of step 5 and the query interface.

**A solid modeling sample with CSG (owner, 2026-11-10; start 2026-11-13).** A second B-rep example beside "B-reps: a first look": a small CAD tool whose interface is a CSG tree, showing the division above, where the application owns modeling and the engine draws and queries the result. Two kernels behind one small interface, with a switch between them (owner, 2026-11-10): SMLib in WebAssembly (Apache 2.0, about 1.1 MiB, its booleans and fillets already in the spike's build) and Open CASCADE (OCCT) through a WebAssembly build such as opencascade.js. Two kernels feeding one `BrepForm` show that the form is the engine's own, not shaped around one kernel: the kernel-neutral path above, demonstrated.

- **The kernel interface:** make a primitive, transform it, apply a boolean, convert the result to `BrepForm`, and say which input each output face came from. The tree, picks and editing use only this.
- **What OCCT adds:** STEP and IGES import, so real CAD parts load and draw exactly, which only OCCT offers here; and a kernel people know from FreeCAD and CadQuery.

- **The tree:** primitives (box, cylinder, sphere, cone, torus) with parameters and transforms as leaves; union, difference and intersection as nodes. Editing a parameter re-evaluates in a worker: SMLib makes the solid, it converts to `BrepForm`, and `tessellateBrep` draws it until step 5's GPU path exists.
- **Picks to the tree:** a picked face highlights the node that made it, from the kernel's record of which input each output face came from: the stable topology names above, in practice.
- **Editing as above describes it:** drag previews as transient geometry, updates face by face, and queries that skip what is being dragged.
- **A four-view layout (owner, 2026-11-10):** CAD's quad view in third-angle projection, Top above Front, Right beside Front, and an isometric perspective in the fourth corner. Four views in one canvas by viewports; the three projected views linked (one target and zoom, and a pan moving the matching axis in the others) while the perspective orbits on its own; a pick in any view highlights the same face and tree node in all four. It exercises an application's comparison views ([infrastructure-and-geoscience-capabilities.md](infrastructure-and-geoscience-capabilities.md)) on the engine's linked views and viewports, and 5d's orthographic camera; until 5d lands, the projected views use a very long lens or the layout waits.
- **First, a spike:** box minus cylinder in each kernel in WebAssembly, converted to `BrepForm` and drawn in the first-look example. It measures each boolean's time and checks that both results validate, and for OCCT records the build's size (a full build is tens of megabytes; a custom one with modeling and STEP only is smaller), whether it needs threads and so cross-origin isolation, and how actively its WebAssembly build is maintained. Its conversion (SMLib's b-rep to `BrepForm`) is the one `fromUsd` needs too, so step 8's start moves here, with SMLib's pinned setup step and build script (above).
- **Open:** both kernels' robustness on real models (their first measures are in "CSG spike, SMLib's half" and "OCCT's half" below, and both answer face provenance); the worker protocol for a re-evaluated solid; OCCT's license (LGPL 2.1 with Open CASCADE's exception, unlike SMLib's Apache 2.0): kept as a separate, lazily loaded WebAssembly module in the example only, and checked before anything built with it is distributed. If OCCT proves too heavy, or its license doesn't fit, the sample runs on SMLib alone and the interface costs nothing extra.

**Core built early (2026-11-11, `70c9917e9e`).** The sample's core is in `examples/csg`, ahead of its 2026-11-13 start.

- **The tree** (`tree.ts`): box, cylinder, sphere, cone and torus leaves with parameters, a rotation and a move; union, difference and intersection nodes that fold left to right; a JSON round trip.
- **The panel:** a kernel switch (SMLib or OCCT), tree editing, an inspector, timings and validity.
- **Worker evaluation:** the kernel protocol has a new `evaluate` request. A leaf's tag survives every boolean, by SMLib's face tags and by OCCT's history.
- **Picks to the tree:** a pick names the leaf that made the face ("Face 9: plane, made by Upright"), and selecting a row lights its faces.
- **Drag previews:** an orange wire proxy while a parameter is dragged, re-evaluation at most every 120 ms, and a newer request supersedes an older one.
- **New kernel functions:** SMLib's `smlib_rotate` binding (it needs the SMLib rebuild that `npm run setup` does), and OCCT's cone, made by revolving a profile.
- **Timings:** an 8-boolean bracket takes about 50 ms warm and 250 to 450 ms cold in SMLib, and about 240 ms in OCCT.
- **Not built:** the four-view layout (it needs 5d's orthographic camera) and fillets.

**Also ([infrastructure-and-geoscience-capabilities.md](infrastructure-and-geoscience-capabilities.md)):** step 3's queries respect clipping and read scalar fields, step 5 draws section caps on B-reps, and step 7's exact picks work through a cut.

**The CSG sample, direct manipulation (owner, 2026-11-11).** The owner asked for 3D widgets for manipulating the solid: extrusions on faces, grabbing and dragging points or lines, "whatever SolidWorks does, how close can we get?". Phases, each usable alone. Phases 1 to 3 are a direct-modeling tool (what SpaceClaim and the Fusion 360 and SolidWorks "move face" tools do). Phases 4 and 5 are the parametric core of SolidWorks and Onshape, a much larger step. A reasonable target for a sample is 1 to 3, and a small version of 4.

1. **Gizmos on tree leaves, with drag previews.** Translate, rotate and scale handles on the selected leaf (arrows, rings, boxes), dragged along an axis or in a plane, changing the leaf's move, rotation or parameters. The preview is today's: transient wire proxy, re-evaluation at most every 120 ms in the worker, a newer request superseding an older one. Handles are picked through the same pick pass as the solid. Effort: about a week, all in the sample.
2. **Face push-pull mapped to the parameter that made the face.** Face provenance says which leaf made a picked face, and the leaf's kind says which parameter that face is:
   - A box's face moves that side (size on that axis, plus the move that keeps the opposite face fixed). A cylinder's side is its radius, and its caps are its height (and the move). A sphere's face is its radius, a cone's side its angle or radius, a torus's its major or minor radius, decided by where the drag started.
   - The drag distance is measured along the face's normal at the picked (u, v) (`refinePick` gives it, exactly).
   - Snapping uses the engine's exact queries: closest point and distance to other faces' planes and edges' curves within a pixel radius, with the snap kind named (face plane, edge, vertex, midpoint) and the distance shown as a measurement.
   - A face whose leaf was cut by a boolean pushes the leaf's parameter, so the result changes by what the tree means (a hole's wall changes the hole's radius). Faces with no single parameter (a face made by a boolean's intersection curve) fall to phase 3. Effort: 1 to 2 weeks. Application-side, apart from one engine need: a face's pick must carry its tree node and provenance, which the sample already does.
3. **Direct b-rep edits on result faces, as feature nodes.** For a face or edge that no leaf parameter explains, apply an OCCT local operation to the result and record it as a _feature node_ in the tree, so the history stays a tree that re-evaluates:
   - Extrude or cut a planar face: `BRepFeat_MakePrism` (a prism of the face's own shape, fused or cut). Offset a face, or thicken: `BRepOffsetAPI_MakeOffsetShape` (and `MakeThickSolid` for shelling).
   - Fillet or chamfer picked edges: `BRepFilletAPI_MakeFillet` and `MakeChamfer`, with the radius dragged as a handle at the edge's midpoint. These are the "fillets" the sample still waits on.
   - A feature node stores the operation, its parameters, and _references to the faces or edges it acted on_ (the next phase's hard part). The SMLib kernel has its own booleans and fillets, so a kernel without the operation disables the handle rather than the sample. Effort: 2 to 3 weeks for extrude, offset, fillet and chamfer on one kernel.
4. **Sketch-based features.** The SolidWorks and Onshape core: pick a planar face or a datum plane, draw a 2D sketch (lines, arcs, circles, splines), constrain it (coincident, horizontal, tangent, equal, dimensions), then extrude, revolve or cut it:
   - A 2D constraint solver. `planegcs` (FreeCAD's sketcher solver, compiled to WebAssembly in the npm package `@salusoft89/planegcs`) is licensed LGPL-2.1, the same as OCCT's, so it would be a separately loaded module in the example only, with the same license check as OCCT's before anything built with it is distributed (confirmed from a web search on 2026-11-11; read the package's license file before relying on it). A small custom solver (Newton on the constraints' equations, for points, lines, circles and the common dimensions) is the alternative, enough for a sample.
   - The sketch is a node: a plane (a face reference or a datum), the entities and constraints, and the solved result as a wire. Its solved wire becomes an OCCT face, and `BRepPrimAPI_MakePrism` or `MakeRevol` makes the solid for the feature.
   - Sketch drawing is a 2D mode on the plane: the view looks straight at it (an orthographic camera, 5d), entities draw as the vector layer's lines, and dragging a point re-solves live. Effort: 3 to 6 weeks for a useful subset.
5. **Parametric history, rebuild, and stable face naming.** A model that re-evaluates when a parameter changes keeps feature nodes working only if the faces they reference are found again. That is the _topological naming problem_: after a change, a face's index or identity may differ, and a feature that referenced "face 7" may attach to the wrong face or none.
   - Within a tree of leaves and booleans the sample already survives it: a face's identity is its leaf's tag, kept by each boolean's history.
   - For feature nodes, name a face by its _origin_ (which feature made it, and which of that feature's faces: "the top of extrude 2's side 3") rather than an index, from the kernel's history of what each operation modified, generated or deleted (OCCT's `BRepBuilderAPI_MakeShape::Modified`, `Generated` and `IsDeleted`, and `BRepTools_History` for chaining them; OCAF's `TNaming` is the older, heavier mechanism). Where a name can't be resolved, the feature reports it and stops there, rather than guessing, as Onshape and SolidWorks flag a failed feature.
   - Effort: open-ended; the first version (names from history, a clear failure) is 2 to 4 weeks, and robust naming is a research problem. Application-side.

**What the engine gives, and what is the application's.** The engine provides: exact picks (a face's (u, v), refined to an exact point and normal); snapping and closest-point and distance queries on b-reps; measurement with accuracy as terms; GPU tessellation, so a re-evaluated solid redraws without a CPU mesh; kernels in workers; transient geometry and the vector layer for handles and sketches; linked views and viewports for the four-view layout; and clipping with exact caps for sections. The application owns: the tree and feature nodes, the gizmos and their behavior, the parameter mapping, the sketch and its solver, history and naming, undo and redo, and the kernel calls. The engine never asks a kernel to draw or to edit.

**Open (CSG sample, direct manipulation):** how a push-pull on a face with no single parameter is shown before phase 3 exists; whether SMLib gets the phase 3 operations or the feature nodes need OCCT (SMLib's face tags already do provenance, but its history for naming is unmeasured); a sketch solver's license against its size; and whether the sample should stop at phase 3 and treat 4 and 5 as a separate product's work.

**Sequencing with the vector design (owner, 2026-11-09).** B-reps go first, but the kernels they share with vectors are set by vectors, their harder user: per-pixel coverage under glyph and label density with the band cap under pressure, strokes with the styling language's full control, and the owner's measured prototype as evidence. A trim loop is a small glyph in (u, v). So:

1. B-rep work that doesn't touch the shared kernels starts first: both spikes, the query interface, the render form, GPU patch tessellation through placement, and exact picks, snapping and measurement. Spike B's trim coverage test is throwaway.
2. The vector design session sets the shared curve, coverage and stroke contracts, with b-rep trims and edges as stated requirements.
3. B-rep trims and edges move onto those kernels.
4. Vectors build the rest: styling, labels, the columnar store that replaces Entity ([2026-11-08-owners-calls-for-later-plans.md](../decisions/2026-11-08-owners-calls-for-later-plans.md)), and draping.

The extensions here are drafts for this proof of concept and free to change, so a format chosen early is no constraint.

**Spike A result (2026-11-09).** SMLib and its C API layer build to WebAssembly with Emscripten and run under Node, with no source edits. Measured at `-O3`:

- Size: 1.11 MiB brotli for the whole kernel (1.63 MB gzip, 5.1 MB raw), plus 19 KB gzip of glue. A trimmed export list, `-Oz` and LTO are not yet tried.
- Instantiate: about 11 ms. Warm tessellation of analytic solids: a box in 3 ms, a cylinder in 7.5 ms, a sphere (224 triangles) in 11 ms.
- Needs: exceptions (`-fexceptions`); a stack of at least 4 MB, since the default 64 KB corrupts the heap (the real need isn't measured); memory growth.
- Doesn't need: threads or SharedArrayBuffer, so no cross-origin isolation; a filesystem; OpenUSD, Boost or Python. The only outside dependency, TBB, becomes a short serial stand-in, so tessellation runs on one thread per worker.
- USD input: the existing reader links OpenUSD. Building OpenUSD to WebAssembly is judged large and risky (inferred, not tried). Cheaper paths: a small reader of the BRep attributes that builds SMLib b-reps through its API, or an offline conversion to SMLib's native format.

The conversion half of the spike remains: one real trimmed NURBS solid (an SMLib native file or one built by hand), with positions, normals and indices extracted to typed arrays, timed against native, and the size options tried.

**SMLib's build, in the repository (2026-11-10).** Nothing in the engine's core uses SMLib: steps 3, 4 and 4b are TypeScript. The spike's build files had been kept outside the repository, on another machine, so they were recreated on Windows. They're committed now, and `npm run setup` builds SMLib on every machine. Setup fetches NVIDIA-Omniverse/usd-brep at commit `3fd5b9548d19aa8c12c29bc9637a96d42a06f8a5` (2026-10-22; only SMLib and SM_API, sparse) and emsdk 7.0.0 into the setup store, as it does the Slang toolchain, and builds `smlib.mjs` and `smlib.wasm` there, outside version control. A clean build takes about 2.5 minutes, and a change to the bindings relinks in about half a minute. The dev server serves the build at `/smlib/`. What is committed (`scripts/smlibTools.mjs`, `scripts/smlib/`):

- `bindings.cpp`, the C layer JavaScript calls over SM_API's C++. It covers primitives, translation, booleans, validity, volume, face tags, the export to the render form (below), and SMLib's own tessellation;
- the build: each library compiled with its own include order (SMLib and SM_API both have a `StdAfx.h`), with no source edits.

Nothing stands in for TBB. SMLib's TBB code (parallel UV trim curves and tessellation, and the scalable allocator) compiles only with `SM_USE_TBB` and `SM_USE_TBB_SCALABLE`, which usd-brep's own build doesn't define either. So the kernel is serial as shipped, and Spike A's serial stand-in was never included. A clean build without it proves this.

`node scripts/smlibTools.mjs --check` loads the build in Node and repeats Spike A's measures:

- Size and startup: 1.05 MiB brotli (4.6 MiB raw) and 6 KB gzip of glue. The glue is smaller than the spike's with no filesystem and an ES module. Instantiation takes about 14 ms.
- Warm tessellation: a box in 0.9 ms, a cylinder in 5.5 ms, and a sphere (224 triangles) in 5 ms. That's about twice as fast as Spike A, measured on a different machine.
- The CSG spike's first boolean: box minus cylinder in about 21 ms (one run, cold). The result is a manifold solid of 7 faces, with its volume matching the exact one to 6 decimals.

**CSG spike, SMLib's half (2026-11-10).** SMLib's b-rep converts to `BrepForm` exactly, and the first-look example draws three booleans made live in the browser. The conversion is also `fromUsd`'s, so step 8 has started.

- **The export.** `smlib_brep_export` walks SMLib's `SmBrepData` (its own flat b-rep: faces, loops, edge-use pairs, edges and vertices as index blocks) and writes one record of doubles. Every surface and curve is the NURBS SMLib holds. A face's outward side comes from its faceuse that bounds a void region, and edges and vertices carry SMLib's tolerances (1e-5 m here). UV trim curves are made where missing, per edge use, since `CreateUVTrimCurvesParallel` exists only with TBB.
- **The reader** (`src/brep/smlib.ts`, outside the public entry). `readSmlibExport` builds the form with `BrepBuilder`. Edges are trimmed to their interval of the curve exactly (`trimNurbsCurve`, new in `nurbs.ts`), and a use against its edge gets its pcurve reversed (`reverseNurbsCurve`). Each loop is turned to the form's winding by its signed area in (u, v), and a sphere's poles become zero-length edges. `SmlibKernel` wraps the module: primitives, translation, booleans, tags, validity, volume and `toForm`.
- **Checked** (`test/data/brepSmlib.test.ts`, in `npm run test:data`): a box, cylinder, sphere, torus and cone frustum, box minus cylinder, and box with sphere united and intersected. Each form validates with no problems. On every face, over 95% of its triangles have the solid's outside off the face's normal and the inside behind it, checked against the exact solid. With every face flipped, that share is 0.
- **Face provenance: yes, for SMLib.** An application attribute (`SmLongAttribute`, id above 10,000, copy behavior) on each input's faces is copied by SMLib to the faces a boolean makes from them. Box minus cylinder gives six faces tagged as the box, including the top and bottom with the hole as an inner loop, and one tagged as the cylinder. In the example, a picked face says which input it came from. This is the CSG sample's picks-to-the-tree, without SMLib's stable topology names.
- **Timings.** Warm, in Node: box minus cylinder in about 5 ms, and the conversion in about 1 ms. Cold, in Chrome on the main thread: loading the module takes 68 ms, the three booleans 7 to 57 ms, and their conversions 3 to 10 ms.
- **Found: analytic kinds are lost.** SMLib's analytic surfaces are B-splines whose NURBS parameterization isn't the form's analytic one: an angle, for example, maps to a rational function of the NURBS parameter. Trim curves live in the NURBS parameterization, so every face converts as Bézier patches. That's exact, but "Color by surface kind" shows only Bézier. The CPU tessellator's Bézier error bound is also looser than its analytic one: an SMLib sphere costs 53 ms and 24k triangles at 1 mm, where the analytic fixture costs 7.5 ms and 6k triangles, and its bound reaches 2.1 mm before the grid cap. Planes could keep their kind, because their map is affine. Quadrics would need their trim curves refit in the analytic parameterization, which is no longer exact. Step 5's GPU path measures error per view, so this is about cost there, not accuracy. The brainstorm below takes it further.
- **Not done yet (SMLib's half):** the kernel interface the sample switches behind, and the four views. The kernels run in workers now (below).

**CSG spike, OCCT's half (2026-11-10).** Open CASCADE converts too, and its faces stay analytic. The first-look example's second scene, "Two kernels", draws each boolean from both kernels side by side in one render form.

- **The build.** `replicad-opencascadejs` 1.2.1, replicad's custom OpenCascade.js build, is actively released (1.0 in August 2026, 1.2.1 on 2026-11-06). OpenCascade.js's own 2.0 betas last published in March 2023. The single-threaded build is 22.9 MB raw and 4.8 MB brotli, against SMLib's 1.06 MiB, and needs no threads, so no cross-origin isolation. It is LGPL 2.1. `npm run setup` fetches it into the store, pinned and checked against npm's integrity hash (`scripts/occtTools.mjs`), and the dev server serves it at `/occt/`. It is never bundled. It includes STEP import (below).
- **Analytic all the way through.** OCCT's plane, cylinder, sphere and torus use the form's own parameterizations, and its cone differs only in measuring v along the slant (v' = v·cos a). So faces convert to the form's analytic kinds, with pcurves unchanged or mapped affinely. `occtToForm` reads each frame off OCCT's evaluator, checks it against the form's formula at three points, and turns y and u around for a left-handed frame. Box minus cylinder gives 6 planes and 1 cylinder, and a picked point's (u, v) is a real angle. This answers the brainstorm's question: only SMLib needs identities.
- **Face provenance: yes, for OCCT,** from each boolean's history (`Modified`, `IsDeleted`). Both kernels now answer which input a face came from.
- **Gaps in the build's bindings, worked around:**
  - OCCT's indexed shape map can't be constructed and shapes expose no hash, so finding a sub-shape is a linear `IsSame` scan. That's quadratic: fine for samples, not for big imports.
  - `BRep_Tool.CurveOnSurface`'s face overload fails, so pcurves come through `BRepAdaptor_Curve2d`.
  - `Oriented()` returns an untyped shape, which must be cast back.
  - There's no 3D curve approximation.
  - Wires aren't explored in loop order, and vertices can't order them on a cylinder's side (seam and circles share both vertices), so uses chain by their ends in (u, v).
- **The first representation error.** OCCT makes plane-sphere intersections B-splines of degree 8, not circles. Curves above the form's degree 3 become piecewise cubic Hermite curves within half the edge's tolerance (`approximateCubic`, kernel-neutral, in `nurbs.ts`). A pcurve's error is measured through the surface in meters, and the error made is added to the edge's tolerance. Box and sphere intersected stays under 1e-5 m. This is the brainstorm's representation error, stated where the validator and queries read it, before the form has a field of its own for it.
- **The validator is exact on curved edges now.** OCCT's tolerances (1e-7 m) are below the chord error of the 64-sample edge polyline the validator used (about 4e-5 m on a 0.5 m circle). It now refines the nearest polyline point by Newton on the exact curve segment. SMLib had passed only because its pcurves share their edge's parameterization, so the sample points coincide. This replaces "curved edges need about 1 mm of tolerance" in step 4's draft below.
- **Timings.** Warm, in Node: box minus cylinder in about 4–5 ms, the same as SMLib. Conversion takes 4–6 ms against SMLib's 1 ms, since every read crosses embind, where SMLib writes one flat record. Instantiation takes 190 ms. Cold, in Chrome: loading takes 250–310 ms, the booleans 18–89 ms, and the conversions 4–131 ms (the most for approximating the intersection's curves). On the CPU tessellator, OCCT's analytic sphere costs 11 ms at exactly the 1 mm asked, where SMLib's NURBS sphere costs 53 ms with its bound at 2.1 mm.
- **The example, reworked as it grew crowded.** It has two scenes behind a switch: the gallery of nine hand-built shapes, and the two kernels side by side, which load only when that scene is first shown. The panel shows display settings in a compact grid, the tessellation's numbers folded to one line, and a shapes table. For the kernels it's a comparison table of operation by kernel: boolean and conversion time, faces by surface kind, and validity. "Color by kind" shows the split at a glance: SMLib's solids all Bézier, OCCT's planes, a cylinder and spheres. The scene's runner (`examples/brep-first-look/kernels.ts`) is a first draft of the sample's kernel switch: the same recipes over primitives both kernels make, and the same tags.
- **Done since (2026-11-10):**
  - OCCT frees every embind handle it makes. Scopes (`withScope`) free the temporaries, and the solids it returns are the caller's to `delete`. A test (`test/data/occtHandles.ts`) wraps the module and counts live handles, since the heap's size can't show a leak: embind frees a forgotten handle when the garbage collector gets to it. One boolean and conversion left 442 alive before. Now only the solids and their tagged faces outlive a call, and the heap grows by at most 4 MiB over repeated runs.
  - STEP import and export (`importStep`, `exportStep` on the kernel, AP203/214/242 as OCCT reads them, in meters whatever the file's units). Solids inside compounds and assemblies count, each with its placement. Four of NIST's MBE PMI test models (FTC-06, FTC-10, FTC-11 and CTC-05, geometry-only AP203, 0.9 MB) are fetched by `npm run setup` from NIST's zip, pinned by SHA-256. They are a US government work, public domain, credited in the scene and `NOTICE.txt`. Each imports in meters, converts, and has the faces and kinds it is known to have: FTC-11 6 faces, FTC-06 144, FTC-10 214 (including a Bézier one), CTC-05 208 (nine Bézier faces). The first three validate clean. CTC-05, a real CAD part 0.5 m across, has 33 tolerance-level problems, open loops and uses off their edge, the largest 18.2 µm against an edge tolerance of 0.6 µm; OCCT calls the solid valid. The test holds them to under 20 µm and the mesh's volume to the solid's. The first-look example has a "STEP file" scene.
  - One reader issue is open: OCCT 8's STEP reader returns the complementary patch (the corner's 1/8 of a ball, not the 7/8 outside) for a sphere face whose loop runs along the seam both ways. The sphere on a box's origin corner, and the other primitives and booleans, round-trip.
- **Not done yet:**
  - the kernel interface proper, beyond the protocol below and the example's runner;
  - the four views.

**Kernels in workers (2026-11-11).** The two kernels run in Web Workers behind a typed protocol (`kernelProtocol.ts`, `kernelHost.ts`, `kernelClient.ts`). A request names a solid, a boolean, an import or an export, and asks for what it wants of each form: bounds, `validateBrep`'s findings, per-face tags and `prepareGpuPatches`' result. The forms come back as typed arrays moved by transfer, and the prepared patches can be passed to `World.addBrep` as `prepared`, so the page's thread does no conversion or preparing. A request can be canceled at its next stage. A form's bounds now come from the form (`formBounds`), not a tessellation. The page's own thread now spends 14 to 23 ms showing CTC-05 and about 12 ms showing the "Two kernels" scene, against 4.3 s for that scene with the kernels on it.

**Representation error today.** `BrepForm.surfaceError` is written as 0 by both converters. SMLib's surfaces convert exactly, and OCCT's analytic ones are the form's own. The only representation error today is on edges, from OCCT's cubic approximation of curves above degree 3, added to the edge's tolerance. The b-rep adapter reads both, so its accuracy terms are right when a source writes a surface error.

**Brainstorm: modeling geometry and render geometry (owner, 2026-11-10).** Not decided; a session to think through. It was prompted by the finding above: the same exact cylinder costs several times more to draw once it arrives as a NURBS. The suspicion is that the form joins two things that could be kept apart. One is what the model _is_: the kernel's geometry, its parameterization, its tolerances and its names. The other is what gets _drawn_: whatever the GPU evaluates fastest within a visual tolerance.

- **Two kinds of geometry, kept apart:**
  - _Modeling geometry_ is the source's: SMLib's B-splines, OCCT's analytic surfaces, a USD BRep. It has the kernel's parameterization and tolerances (SMLib's 1e-5 m), stable topology names and history. Measurement and snapping answer against it, or against an exact copy of it.
  - _Render geometry_ is chosen for the GPU: rational Bézier patches, analytic kinds where cheaper, and planar faces as fills. Its one duty is to lie within the visual tolerance of the modeling surface, and to meet its neighbors on shared edges.
  - The two needn't share a parameterization. Today they must, for one reason: pcurves and picks live in the surface's (u, v). The pick fragment writes (face, u, v), and the CPU evaluates the exact surface there. Whatever separates them must keep that path exact, or state the error it adds.
- **Three tolerances, never mixed:**
  - _Model tolerance:_ how exact the source claims to be, such as edge and vertex gaps (`edgeTolerance`, `vertexTolerance`).
  - _Representation error:_ how far the form's surface is from the source's. NURBS split into Bézier patches has none. An approximated curve or surface, such as SMLib's `ApproximateCurve` for intersection curves (the export's `approximationGap`), offsets and sweeps, or a refit, carries its error. The form has no per-surface field for it yet.
  - _Display tolerance:_ pixels, per view, and never reported as accuracy.
  - The rule: a measured answer states model tolerance plus representation error. A display tolerance enters an answer only when the answer comes from a mesh, and then the answer is provisional and says so, as staged server answers already do. Step 3's open question (`GeometryAccuracy` as one number, or composed with `AccuracyTerm`s) gets its terms from this list.
- **Getting the analytic kinds back, ranked:**
  1. _Keep the NURBS parameterization, and add the surface's analytic identity beside it:_ its kind, frame and radii, which SMLib reports for free (`IsKindOf(SmCylinder_TYPE)`, `SmAxis2Placement`), as does OCCT. Pcurves and picks don't change. Closest points and ray hits use the closed form in 3D, which needs no (u, v). The tessellator bounds error from the known curvature (a sagitta, `r(1 − cos θ/2)`) instead of the Bézier net. "Color by surface kind" works again. This is the separation in its smallest form: identity for queries and error bounds, parameterization for drawing and picks.
  2. _Planes only:_ map NURBS (u, v) to the plane's affinely, and transform pcurves exactly. Cheap, but it covers less than option 1, which planes also get.
  3. _Refit pcurves in the analytic parameterization:_ no longer exact, so it needs a stated representation error. Last resort.
  - On the GPU, a rational biquadratic patch costs about as much to evaluate as `cos`/`sin`. The 7× cost measured on the CPU is probably a loose error bound making extra triangles more than evaluation (to be measured, below). So option 1 may recover the cost without the analytic evaluator. This is also the plan's open item "an error bound that is safe for rational surfaces". Spike B's net bound had almost no margin with a weight of 2, and is loose for circles.
- **API implications:**
  - _The form:_ `surfaceKind` splits into how to evaluate (analytic or Bézier) and what it is (an identity of kind, frame and params, possibly "none"). Each surface gains a representation error. `BENTLEY_brep` gains both as optional arrays, with the fallback mesh unchanged.
  - _`BrepBuilder`:_ `nurbsSurface(surface, { identity, error })`, so a kernel-neutral host passes what it knows. SMLib's and OCCT's converters fill both.
  - _Queries:_ every answer names what it ran against (source, form, or mesh) and its accuracy terms. `display(tolerance)` stays a separate query, since a mesh is never the measurement.
  - _Tessellation options:_ the CPU path takes meters in the source's units, and the GPU path takes pixels per view, with placement error added under reprojection (above). Both report the error they achieved, not only the target.
  - _The kernel interface (CSG sample):_ kernel to form, plus identity and representation error per surface, plus face provenance (tags, history). The engine never asks the kernel to draw.
- **Bypassing the CPU tessellator.** What it does today:
  - It draws everything until step 5.
  - It writes the glTF fallback mesh.
  - It feeds the mesh adapter that picks and rays use.
  - It feeds the example's overlays: selection, iso lines and whiskers.
  - It's the self-check in tests.

  Step 5 can take over most of this:
  - _Drawing:_ compute evaluates patches per view from the form and draws them indirect, so no CPU mesh exists to draw. In the CSG edit loop, the CPU tessellation (13–53 ms per solid here) drops out of the latency. What's left is the kernel (about 5 ms), the conversion (about 1 ms), the upload and one frame.
  - _Picks:_ already exact without a mesh (face ID and (u, v) from the pick fragment, then float64 evaluation).
  - _Rays and closest points away from the screen:_ a hierarchy over patch bounds (the control net's convex hull contains its patch exactly), then subdivision and Newton. No tessellation, and the answers are exact, not mesh-accurate.
  - _Areas, volumes and lengths:_ quadrature on patches, or the kernel, never a sum over triangles.
  - _What stays on the CPU:_ the fallback mesh, written offline by the tiler, not at runtime; a coarse proxy for culling, which the control nets give; and the reference, which is SMLib's (step 4b).
  - _The catch is trims:_ per-pixel trims wait for the shared coverage kernel (the vector-design sequencing above). An interim split: the GPU path for untrimmed faces, faces with rectangular trims and planar faces (fills), and the CPU only for trimmed curved faces until the kernel lands. Building trim curve bands on the CPU is cheap next to tessellating.

- **Where it sits: all of it below `GeometryQueries` (owner, 2026-11-10).** Step 3's query interface is the boundary. Picks, snapping, measurement and the scene layer (`SpatialQueries`) see one interface per object and never the split behind it.
  - _A b-rep adapter_ (`brepGeometry`, beside `meshGeometry` and `sdfGeometry`) holds the modeling side: the form with its surface identities, and optionally a kernel or a server route. It chooses how to answer each query: a closed form from the identity, subdivision and Newton on the Bézier patches, a kernel call, or a provisional answer from a mesh. Callers don't choose.
  - _`GeometryAccuracy` becomes the composed terms:_ model tolerance, representation error, and a display tolerance only when the answer came from a mesh. It also names the route it took (source, form, mesh, or server). Today's `{ meters, exact, note }` is the sum and a flag. The mesh adapter is the degenerate case: its source, form and mesh are the same, so its terms collapse to what it reports now. This answers step 3's question 4 (one number, or composed terms).
  - _The render side's door is `display(tolerance)`_, and only for the CPU path. The GPU path reads the form directly and never goes through the query interface. That answers step 3's question 5: display belongs to the render form, and the query interface keeps it only as a convenience for mesh-only consumers (fallbacks, exports, tests).
  - _GPU picks come back in through the adapter:_ the pick fragment's (face, u, v) is refined by the adapter, as an entry beside `closestPoint`, to an exact point with its accuracy terms. The render parameterization stays an adapter detail. If identity and parameterization ever diverge, as with refit pcurves (option 3), the adapter owns the map and adds its error.
  - _Server answers_ stay at the scene layer (step 3's question 1). A server is one more route, whose accuracy carries the same terms and which upgrades a provisional answer when it arrives.
  - What this asks of step 3's code: an adapter for b-reps, accuracy as terms with a route, and a refine-a-pick entry. Nothing above the interface changes.
- **An example of geometry as one thing (owner, 2026-11-10).** Because exact geometry lives behind one query interface, the engine can answer questions that cross representations and reference frames, which a traditional CAD tool can't. The example: the shortest distance between a 3D Tiles reality mesh (as-built, in its tileset's frame) and an edge of a design b-rep (as-designed, placed from a projected or engineering frame through [geometry-through-placement-review.md](geometry-through-placement-review.md)). Each side states its accuracy terms: the mesh its tile's geometric error at the loaded level; the b-rep its model tolerance plus representation error; the frames the accuracy of the transform between them (the frames layer's terms). The answer composes them.
  - It shows the interface's point: picks, snaps and measurements don't care what a geometry is made of or which frame it was authored in. They name a frame and an instant, and each answer says how sure it is.
  - Use cases: clearance between a designed bridge or pipe and scanned ground or structure, clashes between design and as-built, and checking a design against survey.
  - What it needs: the b-rep adapter (above); the tileset mesh adapter reporting each tile's geometric error as an accuracy term; a distance-between-two-geometries query (closest pair, an entity on each side) beside `segmentDistance`; and the frames layer's transform accuracy feeding `GeometryAccuracy`. A later example, once step 3's b-rep adapter exists.
- **To find out first:**
  - On the GPU, the cost of a rational patch with a curvature bound from its identity, against the analytic evaluator, on the SMLib sphere and cylinder: is option 1 enough?
  - How much of the CPU tessellator's cost on SMLib's solids is the bound, measured by giving it the curvature bound.
  - Answered by OCCT's half (above): its analytic surfaces match the form's up to an affine map (only the cone's v scales), so it writes analytic faces directly and only SMLib needs identities. The two kernels in the first-look example show the split from both sides.
  - Where a representation error comes from for kernels that approximate, and whether they report it, as SMLib's `ApproximateCurve` does.
- **Candidate next steps, small first:**
  1. Surface identity and representation error in the form, the builder and the SMLib export. **Done 2026-11-10.**
     - `BrepForm` gains `surfaceIdentity` and `surfaceError`. A Bézier surface with an identity keeps that identity's frame and params in `surfaceFrame` and `surfaceParams`.
     - `BrepBuilder.nurbsSurface(surface, { identity, error })`.
     - `BENTLEY_brep` carries both as optional arrays.
     - SMLib's export (layout version 2) names planes, cylinders, cones, spheres and tori from `GetCanonical` and `GetPosition`. A cylinder is a cone in SMLib.
     - The validator checks both arrays.
     - The example colors faces by identity and says "held as Bézier patches".
  2. A curvature-aware bound in `tessellateBrep` for surfaces with an identity, and a weight-aware net bound for the rest. **Done 2026-11-10.**
     - `brep/bounds.ts` bounds a rational patch's speed and its angular rate about the identity's axis. The bounds come from Bernstein coefficients over 2 × 2 sub-patches, so they hold for any positive weights.
     - A cylinder's ruling needs one cell.
     - Tests sample every triangle densely against the true surface.
     - SMLib's sphere (r 1.5 m) at 1 mm: 15.5k triangles in 44 ms, within 1 mm. Before: 24k triangles in 53 ms, capped at 2.1 mm.
     - Box minus cylinder: 7.5k triangles in 18 ms.
     - Implemented by a Sonnet 5.5 agent from a brief.
  3. A slice of step 5: untrimmed and planar faces on the GPU, with the CSG sample's edit loop as the measure.

**Step 5 redirected: one GPU path for every face (owner, 2026-11-10).** The owner asked whether the GPU could handle every input, with no CPU fallback. It can, by a published method, and step 5 is built that way instead of the interim split above. The "STEP file" scene shows why: CTC-05's 208 faces take the CPU tessellator 768 ms and 373k triangles at 1 mm, and its planar faces show a sawtooth wherever the cell-discarding trim meets a curve.

- **Direct trimming:**
  - Each face is diced per view on the GPU over the bounding rectangle of its trim loops in (u, v). Analytic surfaces use their formulas; Bézier spans use de Casteljau in homogeneous coordinates.
  - The fragment stage discards outside the trim region by an exact test on the face's pcurves: a winding number, with the curves sorted into bands in v, as Slug does for glyphs (Lengyel, 2017). That is the shared coverage kernel the vector design reserves, built here first.
  - Prior art: Guthe et al. (2005) for GPU trimming and tessellation of NURBS; Schollmeyer and Fröhlich, "Direct Trimming of NURBS Surfaces on the GPU" (2009), and their anti-aliased trimming of large NURBS models (2019).
- **Fast paths:** a face whose trim is its rectangle skips the test, and so do grid cells classified as fully inside. Their fragments keep early depth.
- **Seams:** neighboring faces trim along their own pcurve images of the same edge, so they meet within the edge's tolerance plus the tessellation error. A dilation of about half a pixel outward in (u, v) closes pinholes, and the edge lines draw over the seam. Stitching to shared edge samples isn't needed for drawing.
- **The varying budget:** a patch draw's UV varying carries the face's (u, v), offset to the rectangle's corner so float32 holds it. No varying is added. Depth, shadow and pick passes need the same discard, so patch draws get a fragment stage there.
- **Picks:** each fragment knows its face and (u, v), so a pick is a domain point ([geometry-through-placement-review.md](geometry-through-placement-review.md)'s brainstorm) and the exact point is a float64 evaluation.
- **What the CPU tessellator keeps:** the offline glTF fallback mesh, the mesh adapter for queries until the b-rep adapter exists, and the reference in tests. Nothing it does is in the drawing path.
- **Part 1 is done (2026-11-10, a Sonnet 5.5 agent from a brief).**
  - `brep/gpuPatches.ts` writes a 48-word record per (face, span) for every face. Each holds:
    - its kind, analytic frame or control net, and face rectangle in (u, v);
    - its spheres;
    - the face's per-unit densities;
    - error constants C_u, C_uv and C_v from a sagitta, an identity, or sound Bernstein bounds;
    - a trim word.
  - Records and nets live in the vertex arena.
  - `dicePatches` runs after the cull. It takes a thread per span, sizes the grid from pixels per meter at the face's nearest point (perspective and orthographic), appends chunks of up to 8×8 cells, and writes one non-indexed indirect draw per patch draw.
  - `vsPatch` evaluates the surface (analytic formulas, or de Casteljau in homogeneous coordinates) and its exact normal. It goes through the same `vertexOut`, so placement and the Jacobian normal apply. The UV varying carries (u, v) relative to the rectangle's corner.
  - There are 10 pipeline keys: opaque, depth, shadow, height and prepass, each one- and double-sided.
  - `World.addBrep` is provisional. Faces whose trim is their rectangle go to the GPU, and the rest stay on a CPU mesh until part 2.
  - `spikes/brepPatches.html` passes on an NVIDIA Lovelace GPU:
    - The analytic cylinder, the sphere span and a weighted rational patch are within 0.32 px of the surface (target 0.5 px), at 20 m and 5.5 m.
    - The cell counts match the CPU twin.
    - There are no cracks between spans.
    - A warped patch matches the twin.
    - Shadows, AO and picks work.
- **Part 1's cost (200 faces, 550 spans):** dicing on the GPU costs 0.026 ms. The main pass costs 0.78 ms for 10,300 triangles, against 0.12 ms for `tessellateBrep`'s 7,700. Two causes, for a performance pass after part 2:
  - 211,200 vertex invocations for 5,150 cells. Spans average about 9 cells, so 8×8 chunks are mostly degenerate, and each grid point is evaluated six times. Indexed chunks with shared vertices, and chunks sized to the spans, fix both.
  - Preparing spans on the CPU (34 ms) costs more than tessellating (19 ms), mostly in the Bernstein bounds. That matters for the CSG edit loop.
- **Part 2 is built (2026-11-11, from a brief; not yet run on a GPU).** Every face draws on the GPU; `World.addBrep` has no CPU mesh in the drawing path (`cpuFaces: "trimmed"` restores the old split, as a diagnostic).
  - _Trim data_ (`brep/gpuTrims.ts`, in the face's arena range after the control points): each loop's pcurves, closed by straight pieces where uses don't meet, are cut at their extrema in v and fitted by monotone non-rational quadratics within the least of the edges' tolerances and 1e-5 of the face's size, over hypot(speed_u, speed_v) in (u, v) (not below 2e-7 of the rect's side). Up to 64 bands of v, each listing its pieces by reach in u.
  - _The kernel_ (`shaders/coverage.slang`, shared with the vector fills later): the winding number of a ray along +u with the half-open endpoint rule, one quadratic solved in closed form per piece. Dilation: half a pixel (`fwidth(uv) / 2`) along u from the nearest crossing, and along v from the winding at (u, v ± half a pixel): a plus-shaped dilation that keeps what is within 0.7 of a half pixel of the boundary and nothing beyond 1.4 of it, which closes seam pinholes.
  - _Pipelines_: a solid is two patch draws, complete faces (early depth) and trimmed faces (`...PatchTrimmed` keys for the opaque, depth, shadow, height and prepass passes, whose fragment entries test and discard). Picks read the feature target and the depth the discards leave unwritten.
  - `spikes/brepTrims.html` (`runBrepTrims()`) checks the classification per pixel against the CPU's, closed solids for pinholes, shadows, AO and picks, and the times against `tessellateBrep`.
  - **On an NVIDIA Lovelace GPU (2026-11-11):** every face draws on the GPU.
    - The gallery draws 39 of 39 faces on the GPU. The plate's bolt holes, the filleted block's hole and the trimmed NURBS face are cut per pixel with clean edges, where the CPU path showed a sawtooth.
    - CTC-05 draws 208 of 208.
    - Not good enough yet, for the performance and correctness pass next:
      - The gallery's frame costs 10–12 ms of GPU time and 33–50 ms of CPU time. The CPU path costs about 1 ms of each.
      - Preparing CTC-05 (spans and trims) takes 1.5 s.
      - The trim tolerance of 1e-6 m gives about 66 pieces per round hole. Drawing needs only the display tolerance, since picks are refined exactly.
      - `runBrepTrims()` runs through the classification checks and the built and OCCT closed solids, then stalls at CTC-05's stage without an error.
      - One screenshot showed black box faces in GPU mode: it was captured before the scene finished loading (owner, 2026-11-11), not a bug.
  - **The performance and correctness pass (2026-11-11, on the same GPU, from a brief):**
    - _Indexed chunks._ A patch draw is now one indexed indirect draw over a static 16-bit index buffer: a chunk is 4 × 4 cells and 5 × 5 shared vertices (`CHUNK_CELLS` 4; the dice writes `indexCount` 96 and the chunk count, and zeroes word 4 of the arguments, the chunk counter, after reading it). A reversed face is the grid mirrored along u, so the static indices face outward; columns and rows past a span's counts repeat its last line, so their cells have no area. The vertex stage reads only the words it needs of a span (`loadSpan`): 48 words a vertex became about 22 for an analytic span.
      - 200 faces (550 spans, 5,150 cells): 211,200 vertex invocations (41 a cell) became 18,750 (3.6 a cell); the GPU frame 0.74 ms became 0.12 ms (the mesh's is 0.18 ms), of which the cull is 0.011, the dice 0.009 and the opaque pass 0.10.
      - CTC-05 at 1.3 radii: 0.60 ms became 0.10–0.13 ms (the mesh's is 0.47).
    - _Counts and timing._ `World.readPatchStats()` reads back each patch draw's spans diced, cells, chunks asked for and drawn, triangles and vertex invocations (the dice counts them into a 16-byte buffer a draw, cleared before the cull). The dice has its own pass, so `engine.gpuPasses` shows `cull` and `dice` apart. The example's panel shows both.
    - _Trims at the display tolerance._ The pieces are fitted to the larger of the edges' least tolerance (the model's, a millionth of a meter as built) and a ten-thousandth of the face's size (`DISPLAY_TRIM_TOLERANCE`, a tenth of a pixel on a face filling a thousand pixels; `PrepareOptions.trimTolerance`, `BrepOptions.trimTolerance`). A face whose busiest band lists more than 16 pieces is fitted again at four times the tolerance, up to twice. Bands go up to 256 and double while a band's mean is above 1.5, since a fragment reads its whole band.
      - The plate: 54 pieces in 64 bands became 22 in 32; the busiest band 10 became 8.
      - CTC-05: 5,624 pieces became 3,531 and the trims' time 157 ms became 53 ms; the busiest band, 66 pieces under the old bands (at most 64), is 27, from the finer bands, not the tolerance: it is a face with many holes, and each costs a band two pieces at least.
      - In the fragment stage the dilation's two taps along v are skipped (`Crossings.taps`) where no piece could change them: every piece the taps could meet is on all three rows, with a crossing that can't change sides (it moves within the piece's width), and no tap is in another band. The float64 twin `trimCovers` has the same rule and a test that it never changes an answer. Measured on a plate filling a 3840 × 2160 view, the opaque pass is 0.67 ms with the skip and 0.73 ms without it, and the same at either tolerance: a fragment's cost is the pieces in its band, which finer bands lower; the pieces themselves cost the CPU, the arena and the prepare time.
    - _CPU prepare._ The analytic spans' bounding spheres took most of it (17 × 17 trigonometric samples, allocated per point); they are one flat pass over samples whose straight directions (a plane's, a cylinder's and a cone's v) take only their ends.
      - The 200 analytic faces: 24 ms became 9 ms (`tessellateBrep`: 22 ms).
      - CTC-05 (spans and trims): 180–240 ms became 115–120 ms (`tessellateBrep` at 1 mm: 720–770 ms). A cold first run in a page is two to three times that.
    - _The example's colors._ The trimmed draw of a solid had no palette shader, so its faces drew in the default material (the top faces were whiter than the CPU's); the black box faces could not be reproduced: GPU and CPU renders of the three scenes differ only along silhouettes and shadow edges, from eight camera poses each.
    - _The spike's stall._ Not reproduced here: the run completes in 30 s. The spike now waits for the GPU's answer (`onSubmittedWorkDone`) instead of timers (a background tab's timers crawl), every readback, frame and load has a per-stage timeout that fails naming the stage, `capture` fails rather than returns when its shader is not ready, and a stage's failure is a check. Its classification check had counted a face's far wall seen through a hole, and pixels beside the boundary, as errors: fixed, and all 17 checks pass.

- **Follow-ups after the performance pass (2026-11-11):**
  - The example's "Cells, triangles" row reads "nothing diced in this view" while CTC-05 draws 208 of 208 faces on the GPU. `readPatchStats` probably reads a view or frame the dice didn't run for.
  - Spikes run in a hidden browser tab crawl, because Chrome throttles timers there, so `runBrepTrims()` must run in a visible tab or headless. The agent's headless run on this machine's GPU (RTX 3000 Ada) passed all 17 checks in about 30 s.
- **Degrees 4 to 7 on the GPU (2026-11-11, `d0af2f8938`).** The follow-up that left faces above degree 3 on a CPU mesh is closed. `MAX_GPU_DEGREE` is 7, the form's most.
  - A wide de Casteljau path (`casteljauWide`, `bezierPatchWide`) takes a patch above degree 3 in either direction. It reads the arena a row at a time, holding a row's 8 points and the rows' values and derivatives, with no 64-point copy. The cubic path is unchanged and costs one compare per vertex to choose it.
  - A weighted degree 5 × 4 patch (`spikes/brepPatches.html`, at two distances) is within 0.055 px of the surface.
  - Only a face with nothing to draw (no loop of a finite extent, no patch under its rect) is `unsupported`. The `cpuFaces: "trimmed"` diagnostic is kept.
  - `runBrepTrims()` now passes all 17 checks headless, among them CTC-05: 208 of 208 faces on the GPU, with no pinholes at three distances.
  - The tessellation and B-reps handbook tabs no longer say that a higher-degree face is a CPU mesh.
- **Ray backends respect clips (2026-11-11, `17e50883e7`, [infrastructure-and-geoscience-capabilities.md](infrastructure-and-geoscience-capabilities.md)'s "step 3's queries respect clipping").** `RayQuery.clips` is a `ClipsOption`: it defaults to `"view"` when the query names a view (picks and snaps) and to `"none"` otherwise (distance, clearance, line of sight). Every target honors it, apart from a body's ellipsoid and an impostor, which are no drawn surface.
  - The terrain's march goes past a removed hit, and a terrain the clips remove entirely answers "unknown".
  - The GPU draw cast casts again from behind a removed hit, at most 256 times a ray, skipping 1 mm (or a millionth of the distance), so a kept surface closer than that behind a removed one is passed over. A ray through more than 256 removed surfaces is an error.
  - `sdfGeometry.rayHit` marches past removed hits. `closestPoint` and `segmentDistance` on it still ignore clips.
  - A standing query answers again when the clips change. `test/queryClips.test.ts` covers it; the Clipping tab moved the item from its not-built list.

**The handbook's deep dives (owner, 2026-11-10).** As this work lands, the handbook gains four deep dives. Each is written when its subject is built, and kept to what is built:

1. **Warps and routes:** true coordinates and the drawn map, warps as frame-graph edges, routes, per-tile lattice fits and their error, weighted terms, Jacobian normals, drawn bounds and LOD, parameter ranges, and the varying swap. Increments 1 to 3 are built, so it can be written now.
2. **Clipping:** clips as world objects in any frame, how each is evaluated, shapes and combining, exact b-rep caps and geometric mesh caps, styling, and clips in queries. After increment 8.
3. **The tessellation pipeline:** the CPU tessellator and its sound bounds, GPU dicing per view, direct trimming, seams, error in pixels, and what each path is for. After step 5.
4. **B-reps and the geometry interface:**
   - `GeometryQueries` as the one interface over meshes, SDFs and b-reps, with domain points and fields, and accuracy as terms.
   - Modeling geometry against display geometry: surface identity, representation error, and the three tolerances.
   - The relationship to CAD kernels (SMLib, OCCT, STEP): the engine never asks a kernel to draw.
   - Written in parts as step 3's b-rep adapter and step 5 land.

**Spike B result (2026-11-09).** One rational bicubic NURBS face (100 m square, 3x3 Bézier spans, one control point of weight 2) with a circular hole in (u, v), drawn in Chrome on an Apple GPU. The vertex shader evaluates an n x n grid per span. The pixel shader computes the exact normal and cuts the hole by signed distance in (u, v). n is chosen per view from the bound 0.75·D/n² on the second differences of the Bézier net, converted to pixels, with a target of 0.5 px. Measured:

| Distance | n   | Triangles | Bound   | Measured error | GPU time |
| -------- | --- | --------- | ------- | -------------- | -------- |
| 150 m    | 9   | 1,458     | 0.41 px | 0.40 px        | 0.18 ms  |
| 600 m    | 4   | 288       | 0.48 px | 0.38 px        | 0.03 ms  |
| 3000 m   | 2   | 72        | 0.38 px | 0.23 px        | 0.01 ms  |

- The bound was never exceeded, and over-tessellates by at most about 1.6x in pixels. With almost no margin at 150 m, a stronger weight could exceed it: the engine needs a bound that accounts for weights, or a safety factor.
- Cutting the hole per pixel cost nothing measurable, but a circle is one distance test. General trim curves need a lookup per pixel and wait for the shared coverage kernel. Its effect on MSAA, a depth-only pass, shadows and picking (each needs the same test) was reasoned about, not run.
- SMLib, at the same tolerance from 600 m: 209 triangles, 0.498 px, 9.6 ms to tessellate, and about 270 ms more to build and trim the face (WebAssembly, one thread, Node). Both meshes lie within the target of the true surface; the distance between the two meshes wasn't measured. This supports tessellating on the GPU, with SMLib for conversion and reference.
- Not covered: 32-bit evaluation in a globe position (the engine must evaluate relative to a nearby origin, as it does elsewhere); cracks between spans; compute-driven tessellation, which one face can't judge and step 5 measures with many patches.

**Step 3 draft (2026-11-09, plan `docs/superpowers/plans/2026-11-09-brep-3-geometry-queries.md`).** `GeometryQueries` in `src/geometry`: one interface per object, synchronous, in float64 and in the object's placed coordinates, with an optional `origin` that keeps the arithmetic precise at Earth-fixed scale. Queries: bounds, ray hits (hit, miss or unknown), closest point (on a face, edge or vertex), segment distance, topology and display at a tolerance. Every answer carries its accuracy. Two adapters: `meshGeometry` (triangles as stored, placed in float64) and `sdfGeometry`, the f-rep slot (sphere tracing with a step cap). Tileset rays (`castTilesetRays`) and the client snap's occlusion test run on the mesh adapter, with unchanged results. The scene layer (`SpatialQueries`) keeps frames, instants, batching, asynchronous answers and revisions.

**The b-rep adapter (2026-11-11).** `brepGeometry(form, { matrix, origin, modelTolerance })` in `src/geometry/brep.ts` answers from the form, never from a mesh. A hierarchy over each face's box (analytic faces by intervals, Bézier faces by the control nets' hulls) keeps a query to the surfaces near it. Rays: closed forms for planes, cylinders, cones and spheres (quadratics) and tori (quartic roots), subdivision and Newton on Bézier patches. Closest points: closed forms for the analytic surfaces' stationary points, branch and bound with Newton on patches, projection or bisection on edge curves, and the vertices. Trims: the tessellator's polygon decides, except within twice its sag of a pcurve, where the pcurves do. Each answer names its domain point, `uv` on a face or `t` along an edge, and an accuracy whose terms are the model tolerance, the surface's representation error and the edge's tolerance, with the route in the note and in the new optional `route` field. `refinePick(face, { point?, uv? })` is the refine-a-pick entry. On NIST's CTC-05 (208 faces): about 0.06 ms per ray, 1 ms per closest point, 0.1 ms per pick refinement, 0.13 s to build the hierarchy on the first query.

**Questions for the API review:**

1. Two layers: a synchronous object layer under the asynchronous scene layer. Should a server's staged answers arrive as a scene-layer backend, as drafted, or should the object layer be asynchronous?
2. Frames and instants live at the scene layer, and object answers are in placed coordinates. Should each object state its frame and instant?
3. `EntityRef` is a number plus an optional feature ID, and mesh edges are half-edges (`triangle * 3 + side`). Stable source IDs need strings or a source table.
4. `GeometryAccuracy` is one number in meters. Should it compose with the measure module's `AccuracyTerm`s, and is it a bound or 1σ?
5. Is `display(tolerance)` a query, or does it belong to the render form (steps 4 and 5)?
6. `segmentDistance` exists for the "missed by less than its error" verdict. Keep it, or replace it with a ray answer that carries the near miss?
7. The client snap's search of the screen aperture isn't moved yet (it still uses its own triangle test): it needs a cone or screen-space query.
8. There is no acceleration structure: queries are linear in triangles, as before.

**Step 4 draft (2026-11-10, plan `docs/superpowers/plans/2026-11-10-brep-4-render-form.md`).** `src/brep`: the render form as typed arrays (surfaces analytic or rational Bézier patches; faces, loops, uses, edges and vertices; pcurves and 3D curves as exact rational Bézier of degree ≤ 3; tolerances; one string table of stable IDs; a content version), exact float64 evaluation, the exact NURBS split by knot insertion (agreeing with de Boor within 1e-9 m), `BrepBuilder` for hosts and `validateBrep`, which never throws. The draft glTF extension `BENTLEY_brep` (`src/brep/BENTLEY_brep.md`) holds the arrays in raw bufferViews (glTF accessors have no float64) beside a primitive's fallback triangles, and is never required; `parseGltf` reads it, drops a malformed b-rep with a warning, and composites carry it. Nothing draws it yet. The validator checks pcurve images against a polyline of the edge, so curved edges need about 1 mm of tolerance; make it exact with step 7's closest points. (2026-11-10: done for the validator, which now refines by Newton on the exact curve; see "CSG spike, OCCT's half".)

**Questions for the API review (step 4):**

1. Bézier patches are stored in place of NURBS: size against loader work.
2. Pcurves and edges are exact rational Bézier of degree ≤ 3, and quadratic segments are made later, by the renderer.
3. One `ids` string table, faces then edges then vertices.
4. Float64 throughout the file.
5. The `BENTLEY_` prefix, and the name.

**Open:** the extension's name, and review of its schema; whether tiles store NURBS or pre-split Bézier patches (size against loader work); how b-rep edges meet the vector design's exact circles and clothoids; SMLib on real trimmed models (speed, correctness, memory); the USD input path; an error bound that is safe for rational surfaces; crack-free edges between patches of different density.
