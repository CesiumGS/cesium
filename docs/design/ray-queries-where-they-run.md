# Ray queries: where they run, and when acceleration structures are built (design, owner 2026-11-06)

**What this holds:** Placement of ray queries on CPU and GPU, and when acceleration structures are built (owner, 2026-11-06). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

The owner: "we're going to have to think carefully about ray queries, where
they're performed, when we build acceleration structures, etc." §13.10
sketches the techniques: CPU lookups on terrain, GPU raster probes and
compute ray tracing. This section is the architecture they have to fit into.
It is open, for a brainstorm before any plan.

**The first implementation.** The frames example's Task 5b adds
`castTerrainRay` and a read-only `TerrainRayTarget`: an exact float64 ray
against the drawn terrain triangles, traversing a grid per tile. It raised
the questions below:

- the first query after tiles load spends about 36 ms building each crossed
  tile's grid on the main thread;
- spans off screen count as "unknown";
- tiles still waiting on availability are treated as final.

**Use cases** (the requirements come from these):

- line of sight (a dish, a mast, a drone camera, a robot tool, two objects
  anywhere in the frame tree);
- picking and frame-tagged picking (plan 3 R8);
- clamping and `sampleHeight`;
- viewsheds and footprints (many rays);
- measurement (distance to the surface, clearance);
- collision and reach checks (a robot arm, a camera's minimum range);
- path tracing (§13.10).

**Questions to settle:**

1. **Where a query runs.** The options are synchronous on the main thread, a
   worker, GPU compute, or GPU raster probes. They differ in latency (same
   frame, or frames later), in what geometry they can see (the CPU has
   terrain triangles but no 3D Tiles), and in cost. One API should route by
   target and batch size: a single pick ray or a single line of sight wants
   sync; a viewshed of 10⁵ rays wants GPU.
2. **When acceleration structures are built:**
   - at decode, in the worker, with the mesh (a BLAS or a terrain grid,
     shipped with the tile);
   - lazily on first query (today, which is the 36 ms cost);
   - per frame for the top level (a TLAS over transforms and instances, which
     is cheap).
     This is memory against latency. The structures count against the tile
     memory budget (§13.6) and are evicted with their tile.
3. **Which geometry a ray sees:**
   - the drawn LOD for the current view (what the user sees, view-dependent,
     and coarse far away);
   - the finest loaded LOD;
   - a view-independent "best available" that can request refinement along
     the ray and answer later.
     Line of sight and picking may want different answers. Unknown must always
     stay unknown.
4. **Which spans are unknown.** Above a body's highest possible surface (its
   terrain height band), terrain can't block. Rays must clip to that band
   before counting off-screen or unloaded spans as unknown, or every
   ground-to-space query is "unknown". The same applies to other bodies (the
   Moon in MOON_ME).
5. **Many views and stereo.** Each view has its own drawn LOD (§13.4).
   Queries name the view they are consistent with, or none.
6. **The frame tree:** see plan 5's "Ray queries through the frame tree"
   (§13.14). Rays and targets live in frames, at an instant, with composed
   accuracy.
7. **The API shape.**
   - Batched rays in and hits out: distance, point, normal, target, feature,
     and the frame each is reported in.
   - Every result carries accuracy and unknown spans.
   - Sync and async variants, with `AbortSignal` and progress for large
     batches.
   - It shares the per-frame budget with streaming (plan 5's "async only for
     bulk work").
8. **Precision.** CPU queries are float64. GPU queries use hi/lo,
   camera-relative origins. Hits are refined on the CPU when an exact answer
   matters, the way 1.x refines picks.
9. **Validation data.** Published horizon masks, such as the DSN's for DSS-14, DSS-43 and DSS-63 (810-005, as used by the frames example's dish scenario), are measured horizons. Comparing ray-query terrain horizons against them, across terrain sources and levels of detail, is a standing validation test for this work (owner, 2026-11-06).
