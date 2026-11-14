# Design notes: tile selection and memory beyond `Stepwise`

**What this holds:** Design notes for selection and memory: mixed-LOD drawing, request scheduling, budget-driven refinement, multi-view priority, quality signals, memory management, structure and formats. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

The `Budgeted` policy was called `Next` until r23 (renamed for its goal:
spend limited memory, bandwidth and requests where they improve the image
most, without leaving holes).

Working notes for the `Budgeted` policy and the engine's memory model, written
during M2 so the ideas survive the session. Each item states the problem,
the approach in this engine, and how L1′ (or another harness) measures it.
`Stepwise` stays as the parity reference throughout. Nothing here changes it.

## Mixed-LOD drawing

**Problem.** `Budgeted` replaces a coarse ancestor only once every visible
frontier tile under it has arrived, so a region stays coarse and then
changes all at once. 1.x looks progressive only because it loads every
level, at about twice the bytes (L1′, r19).

**What 1.x does.** By default it never mixes levels: a parent swaps for all
its children at once, one level at a time. With `skipLevelOfDetail`
(opt-in) it mixes through the stencil buffer: finer tiles draw first and
mark their pixels with their selection depth, ancestors draw only where
nothing finer did, and a back-face pass of unresolved tiles keeps that
depth-correct. Its source documents remaining artifacts (back-facing child
content drawn over ancestors).

**First attempt, dropped (r21).** Push the ancestor back in depth by its
geometric error, so finer content wins the depth test. Wrong in principle:
depth priority isn't spatial priority. The pushed-back tile falls behind
unrelated surfaces (neighbors, the context globe), which then show through
and jump as tiles start and stop being placeholders. Moving vertices along
the ray also changed clip w, so textures swam.

**Approach (r22): clip the ancestor to its holes.** The ancestor draws at
its true depth, but only inside the bounding boxes of its missing
descendants, tested per fragment against up to 8 oriented boxes per tile.
Where finer content exists the ancestor doesn't draw, so no depth tricks,
and selection stays in the single GPU-driven pass. Boxes grow vertically by
the ancestor's geometric error (its surface may lie that far above or below
the finer content) but not sideways, so they don't spill over finer
neighbors.

This is only sound where children partition their parent: photogrammetry,
terrain-like quadtrees and octrees. Design models subdivide by element, so
child boxes overlap heavily and coarse tiles drop whole elements; there,
mixing either leaves holes or changes the silhouette piece by piece. `Budgeted`
decides per tile (`mixedLod: "auto"`): it mixes when the children lie
within the parent and their box volumes sum to at most 1.25× the parent's,
and otherwise swaps whole regions as 1.x does.

**Independent of mixing:**

- **Hold.** A coarse tile that a view drew last frame stays until its
  region is complete. Finer tiles a view drew last frame stay while a newly
  visible neighbor loads; without this, one unloaded tile coming into view
  collapsed the whole region to its nearest loaded ancestor, which with
  skipped levels was near the root (rotation showed a coarse globe for
  about a second). Zooming out, resident finer content draws until the
  coarser tile arrives.
- **Prefetch.** A guard band around the frustum (half-angle tangents
  × 1.25) loads what would display there, at the lowest priority and 2×
  the SSE threshold (about a quarter of the bytes), so rotation reveals
  coarse content instead of gaps.

**Measure.** L1′ FLIP at 250 ms and 1 s with and without mixing, on
photogrammetry and on a design model; time to settle and bytes no worse.
Later: dithered cross-fades for whole-region swaps, and FLIP between
consecutive frames with a static camera as a popping metric.

## Request scheduling

- **Adaptive concurrency.** 1.x caps at 18 per server, an HTTP/1.1-era limit.
  With HTTP/2 and HTTP/3 the real limits are bandwidth × latency and worker
  decode throughput. Raise concurrency while delivered bytes per second keep
  rising, and back off when latency climbs or the decode queue backs up
  (AIMD). L1′ on Google: 18 → 64 requests cut time to settle from 2.0 s to
  1.3 s (r19); with prefetch the gain is smaller (r22).
- **Protocol-aware, per origin.** One limiter per origin, shared by every
  tileset on it, owns the window and the priority queue (the queue is not
  built yet: see "Scheduling across tilesets" below). The protocol comes
  from Resource Timing (`nextHopProtocol`: `http/1.1`, `h2`, `h3`, also in
  workers; cross-origin servers must send `Timing-Allow-Origin`, else it is
  empty). It seeds the window: about 6 for HTTP/1.1 (the browser's
  per-host connection limit), about 32 for HTTP/2 and 3; AIMD adapts from
  there. Unknown protocol: start low and infer it (time to first byte jumps
  once requests exceed the browser's connection limit). On HTTP/1.1,
  requests beyond that limit queue inside the browser, where they can be
  neither reprioritized nor cancelled. Keeping the queue on our side is the
  real purpose of a cap, which 1.x's fixed 18 only approximates.
- **Implemented (r23): `RequestScheduler`,** one window per origin shared
  by its tilesets. Seeded by the protocol, then modeled as TCP BBR does:
  the highest recent delivered throughput and the lowest recent request
  latency give, by Little's law, the requests needed to keep the link busy
  (throughput × latency / request size + 1); more only queues. Startup
  doubles while throughput grows 25% per period; the window cycles 1.25× /
  0.75× around the target to keep measuring; periods that didn't fill the
  window don't count; cache hits don't count as latency; after idle the
  next burst starts up again (TCP's slow-start restart); it holds while
  decoded content backs up behind the upload. HTTP/1.1 stays at 6 or
  below. `maximumRequests` pins the window.
- **Cancellation.** Drop queued and in-flight requests no view still needs
  (1.x cancels requests for untouched tiles). Our worker decode isn't
  abortable yet: pass an `AbortSignal` to `fetch` in the worker and discard
  late results.
- **Decode-aware priority.** Cost includes decode time: Draco, KTX2 and JPEG
  decode differently. Estimate it per format from history.
- **Upload budget in milliseconds,** measured, rather than a count of tiles
  per frame. Uploads share the queue with rendering.

**Lessons from operating systems and networking** (where these problems
were solved first):

- **Congestion control:** model the bottleneck (BBR), not just react to
  loss or delay (AIMD); Little's law sizes the window. Implemented above.
- **Readahead:** the OS grows its prefetch window while prefetched pages get
  used and shrinks it when they don't. Size the prefetch band (§13.5) by its
  hit rate: prefetched tiles later displayed vs evicted unused.
- **Fair queueing** (weighted fair queueing, deficit round robin): share an
  origin's window across tilesets and views by weight (§13.4) instead of
  first come, first served.
- **Deadlines (EDF):** a tile the camera's motion will reveal has a deadline,
  the time until it is visible; request earliest deadline first. **Aging**
  keeps prefetch and distant tiles from starving under constant churn.
- **Backpressure** (as dirty-page throttling): never fetch faster than the
  decode and upload stages drain. The scheduler holds on upload backlog.
- **Shortest job first** among equal priorities: smaller tiles first
  maximizes coverage per second (sizes are learnable per level).

**Scheduling across tilesets (to try).** Each tileset sorts its own
requests (prefetch already sorts after visible tiles), but the tilesets
on one origin take free slots of the shared window in update order, first
come first served. Seen at Mount Rainier (r25): OSM Buildings' prefetches
filled the `assets.ion.cesium.com` window while Cesium World Terrain's
visible tiles waited. The r25 fixes cut the flood (783 requests to 31),
not the cause; Google 3D Tiles prefetching while terrain is missing would
repeat it. Ideas, with the operating-system analog each comes from:

- **One priority queue per origin** (the I/O scheduler that arbitrates a
  disk among processes): every tileset submits what it wants each frame;
  after all have updated, the origin issues requests from one queue.
  Tilesets and views are the processes, the origin is the disk. Rebuilt
  every frame, as wanted sets change with the camera (1.x re-sorts each
  frame too).
- **Priority classes before priorities** (Linux I/O priority classes,
  `ionice`: realtime, best-effort, idle): needed now (holes in a view),
  refinement, prefetch. Prefetch is the idle class, served only when
  nothing else waits. Within a class, each policy's own key (distance,
  1.x load priority, region group). Classes make tilesets comparable
  where their priority numbers aren't.
- **Preempt in-flight prefetch** (the kernel may drop readahead requests,
  `REQ_RAHEAD`): when the window is full and visible requests wait, cancel
  the lowest-class in-flight requests. A slow prefetch holding a slot
  that a visible tile needs is priority inversion.
- **Priorities on the wire** (the network analog): HTTP/2 and HTTP/3
  carry request priorities (RFC 9218, urgency and incremental), and
  `fetch(url, { priority: "low" })` passes the hint on. In-flight prefetch
  then gets bandwidth only when visible responses don't need it; the
  server can order bytes, which the client can't.
- **Aging** (as in OS schedulers): a request's effective priority rises
  the longer it waits, so prefetch and far tiles still progress while the
  camera keeps moving, and no tileset starves another.
- **Weighted fair sharing** (weighted fair queueing, deficit round robin,
  above): when several tilesets need the same class at once, share the
  window by weight (view importance, screen coverage) instead of by
  update order.
- **Measure**: L1′ with two tilesets on one origin (OSM with terrain;
  Google with terrain): time until each tileset's visible tiles settle,
  and how long visible requests wait behind others' prefetches.

## Budget-driven refinement

**Problem.** Under memory pressure 1.x raises one global SSE threshold
(×1.02 per frame), degrading everything uniformly, including the area the
user is looking at.

**Approach.** Benefit/cost selection (Funkhouser–Séquin):

- Benefit of refining a tile = SSE reduction × screen coverage × view
  weight. Cost = bytes + decode time.
- Refine greedily by benefit/cost until the budget is spent. Coarsen the
  lowest-value tiles first when over.
- One engine-wide budget (13.6) arbitrates across tilesets and views.

**Measure.** L1′ image error at a fixed byte budget: lower FLIP than 1.x's
memory-adjusted SSE at the same bytes.

**Product question: whose network?** Throttled L1′ (r22) shows the choice
depends on the link. On fast links skipping levels wins on every metric; on
a 20 Mbit/s, 80 ms link 1.x's level-by-level loading looks better on average
while loading, though it settles later on more bytes. Which default is right
depends on the distribution of our users' bandwidth and latency (desktop on
office networks vs mobile and field use, regions). Get that distribution
(ion CDN logs, or opt-in client telemetry) before tuning defaults; until
then, adapt at runtime from measured throughput (§13.2), and add a 2nd and
10th percentile profile to L1′ once the distribution is known.

## Multi-view priority

- Pin a tile while the most demanding view needs it (max over views), and
  order bandwidth by a weighted sum across views.
- **View weights:** a small inset or offscreen thumbnail shouldn't compete
  equally with the main view. Apps set weights; defaults follow pixel area.
- **Cache reuse across views** (in `Budgeted` v1): a view may draw finer content
  another view already loaded. In 1.x, each viewer has its own cache.

**Measure.** The split-view and inset scenarios in the viewer; L1′ with two
views and asymmetric weights.

## Visual quality signals beyond geometric error

- **Silhouettes (design models).** iTwin's coarse tiles drop small elements,
  changing the silhouette (the underground CAD case). Refine sooner where
  children carry geometry the parent lacks, using the per-child difference
  in feature count or bounding volume as a cheap proxy. Element-level
  metadata could flag significant elements.
- **GPU coverage feedback.** The depth pyramid (HZB, M5) gives pixels covered
  per tile and occlusion. Occluded tiles (behind buildings) lose priority;
  coverage replaces the bounding-sphere estimate of screen size.
- **Stability.** Hysteresis bands on refine and coarsen, no coarsening while
  a finer sibling is still loading, and dithered cross-fades instead of
  popping.
- **Prediction.** Prefetch along camera velocity and at flight destinations;
  1.x's flight-destination preloading becomes a general velocity prior.

## Memory management (open design question)

1.x's static 512 + 512 MiB per tileset is a parity default, not a design.

- **One engine-wide GPU budget** covering tilesets, render targets
  (already capped: 256 MiB idle), materials and textures. The arbiter is
  13.3's benefit/cost, not per-tileset caps.
- **Sizing without a VRAM query** (WebGPU exposes none). Candidates:
  - adaptive signals: allocation failures, frame-time pressure, device loss;
  - platform heuristics (integrated vs discrete GPU from the adapter);
  - an application hint.
    Start conservative and grow while there are no failures.
- **Cheaper residency:**
  - Transcode photogrammetry textures (JPEG → BC7/ASTC) in workers: about 4×
    less GPU memory, at a decode-time cost.
  - Quantized vertex streams.
  - Share textures and materials across tiles where content repeats.
- **Paging lessons:** the tile cache is virtual memory. Measure
  _thrashing_ directly: the rate at which evicted tiles are requested again
  within a few seconds (page-fault frequency). That says the budget is too
  small far better than 1.x's ×1.02 SSE creep. Working-set or ARC-style
  replacement keeps a fast fly-through from flushing tiles the user keeps
  returning to, which plain LRU doesn't.
- **Eviction policy:** what survives eviction (decoded CPU copies,
  compressed bytes, nothing) trades memory against refetch and decode time.
  The HTTP cache already keeps raw bytes.
- **Fragmentation:** the arena allocator is first-fit. Measure churn under
  streaming, and move to TLSF or size classes if it fragments. (r50: size
  classes come with the arena slabs, §13.15; the pools' capacity joins the
  budget there too.)
- **Visibility:** the viewer's memory panel shows every pool against its cap,
  so budget changes are visible in real time.

## Structure and formats

- **Traversal off the main thread.** Move the tile tree to a struct-of-arrays
  table that a worker can own (transferable, no SharedArrayBuffer required),
  and run selection there. The main thread receives per-view selections and
  requests.
- **3D Tiles 1.1:** implicit tiling and subtrees, multiple contents per tile,
  and metadata at tileset, group and content level.
- **Formats:** pnts (M6, with the compute point-cloud path), i3dm (instancing
  maps directly onto draw records: one record per instance), cmpt.
- **Edge and planar-fill extensions for CAD** (`EXT_mesh_primitive_edge_visibility`,
  `BENTLEY_materials_planar_fill`, line and point styles), as noted in §11.
