# Real-time tracks: thousands of moving, clamped entities

**What this holds:** The design for track collections: instance data, GPU clamping, interpolation, symbology, labels and picks. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Use case.** Defense and operations customers show live unit positions
from a network feed or database as custom symbology (usually billboards,
sometimes models or decals), clamped to terrain and 3D Tiles, updated
fluidly. 1.x does this with entities and billboard collections, re-clamping
each one on the CPU.

**What exists (r31).** Clamped models with event-driven re-clamping (one
`setTransform` per move), GPU ray casts for 3D Tiles heights batched over
all anchors, per-instance updates without allocation (100,000 instances:
1.8 ms CPU to move 1% per frame, 101 ms to move all), and scatter uploads.

**Design.**

- _Tracks as instance data, not objects:_ a track collection is one
  record (a billboard set or an instanced model) with per-instance streams
  (position as longitude, latitude and height or Earth-fixed hi/lo,
  heading, symbol, color, flags). A feed update writes a typed-array slice
  (bulk update API) that uploads as a scatter; no per-entity JavaScript
  object or call on the hot path, and decoding of the feed can run in a
  worker.
- _Clamping on the GPU:_ a compute pass gives each instance its ground
  height every frame, from the terrain tiles drawn (their heights uploaded
  as a texture array or read from the arena) and from 3D Tiles by ray
  casts against the views' draws; the instance matrix is built on the GPU.
  Moving anchors then cost nothing on the CPU, and many-entity clamping
  scales with the GPU.
- _Smooth motion:_ interpolation (or extrapolation) between feed samples
  in the shader from two timestamped positions per track, so 1-10 Hz
  feeds animate at frame rate.
- _Symbology:_ billboards by point expansion ([transforms-and-instancing.md](transforms-and-instancing.md)) with programmable
  shading (custom shading, [shaders.md](shaders.md)) for military symbols (MIL-STD-2525 /
  APP-6 style) from per-instance attributes; decals for areas; labels
  with GPU decluttering.
- _Picking and selection per track_ through per-instance feature IDs.
- _Model up close, symbol from afar (r47):_ each track is an instance in
  two draws, an instanced model (e.g. 1.x's Cesium Milk Truck, oriented
  by heading) and a billboard set with its symbol. The cull pass, which
  already visits every instance on the GPU, picks one per instance and
  view by the track's projected size, writing it into that draw's list,
  with hysteresis and a short crossfade so tracks at the threshold don't
  flicker; no CPU work, so it scales with the track count. Billboards
  clamp with the same GPU clamping, with a depth policy like 1.x's
  `disableDepthTestDistance` (symbols behind a ridge visible when
  wanted). Symbols are drawn once into an atlas (e.g. milsymbol to a
  canvas), chosen and colored per instance by custom shading.
- _Before the milestone (done, r47):_ custom shaders read per-instance
  streams by name (`vsInput.instance.<name>`, Custom shading increment
  9), and `World.setInstanceStreams` rewrites many instances in one
  copy.
- _The showcase:_ the first showcase example ([examples-and-the-gallery.md](examples-and-the-gallery.md)), in the gallery as
  an Examples section of Dyno (one engine and canvas, deep links), its
  module following the `run(context)` contract so it can move to
  Sandcastle or get a standalone page.

**Measure** (benchmark suite v1, [benchmark-suite.md](benchmark-suite.md), "Catalog (initial)" group C; instanced models until
billboards exist): 10,000 and 100,000 tracks updated at 1 Hz and 10 Hz
from a synthetic feed over terrain and over Google 3D Tiles: CPU per
frame, GPU per frame, update-to-display latency, clamping error, frame
time stability; against 1.x entities and billboard collections.

**When.** The measurement belongs in benchmark suite v1. The feature needs
billboards and custom shading for symbology, so it follows the "Custom
shading" milestone ("Real-time tracks" milestone), unless its priority
moves it earlier.
