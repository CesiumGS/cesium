# Ray queries, ray tracing and path tracing

**What this holds:** What ray queries, ray tracing and a path tracer would mean for the engine. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Height and pick queries.** Terrain answers on the CPU: it is a height
field and each tile keeps its drawn triangles, so the triangle under a
point is a direct lookup, synchronous and exact against the drawn surface.
3D Tiles keep no CPU geometry (1.x keeps it with `enablePick` or reads it
back), so their queries run on the GPU behind one batched, asynchronous
API: rays in float64 in, hits out (distance, point, normal, draw, feature).

1. _Raster probes (M3, clamping)._ Tiny views along each ray, depth and
   feature ID read back. They reuse culling, view masks and level of
   detail, and handle point clouds. 1.x's `Scene.sampleHeight` works the
   same way.
2. _Compute ray tracing (later)._ A BVH per mesh (BLAS), built in the
   worker at decode, and a top-level BVH (TLAS) over the transform and
   instance tables, rebuilt per frame (it covers draws, so it is cheap).
   Exact nearest hits for any batch of rays.

Rays and targets across frames of the frame tree, such as the Moon in MOON_ME, moving bodies and design-space models, are plan 5 ([bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md), "Ray queries through the frame tree"). Where queries run and when acceleration structures are built is [ray-queries-where-they-run.md](ray-queries-where-they-run.md).

**Path tracing grows out of (2).** The architecture suits it: all geometry
is in one arena read by index from storage buffers, and materials, draw
records, transforms and instances are tables, so one compute shader can
fetch any triangle and its material. Gaps: WebGPU has no hardware ray
tracing (traversal is software, as in three-gpu-pathtracer: fine for
progressive or offline images, not real time at Google 3D Tiles scale; a
native Slang backend could use hardware ray queries); no bindless textures
(texture sets would move into arrays or atlases, as imagery already is,
[risks.md](risks.md), "Bindless textures: not in the PoC, designed for in 2.0"); float32 (the TLAS is camera-relative with hi/lo origins, as the
rasterizer is); streaming (BLAS once per tile, TLAS per frame).
