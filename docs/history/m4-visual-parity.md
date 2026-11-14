# M4 — Visual parity (≈3 wks)

**What this holds:** Milestone M4 as planned and worked through. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

- Lighting and shading as designed in [lighting-and-shading.md](../design/lighting-and-shading.md): physical units and exposure,
  Hillaire's atmosphere (sky, aerial perspective, environment lighting),
  shadows and ambient occlusion.
- LDR/HDR paths, FXAA.
- Translucency: MBOIT real-time path plus the per-pixel-linked-list exact reference; tested for opaque/translucent interaction against the reference, not against 1.x.
- _Exit_: L2 on all canonical views, and L3 sign-off.

Progress (r45): **translucency**. Blended materials (glTF "BLEND") no
longer draw opaque. Their surfaces shade as opaque ones do (opaque.wgsl
`shadeSurface`, without the screen's ambient occlusion, which is the
surfaces' behind), then go in order over the opaque pass's resolved
targets one of two ways (`View.translucency`, a switch in the viewer):

- "moments" (default): moment-based OIT (Münstermann, Krumpen, Klein and
  Peters 2018), four power moments of absorbance in 32-bit float targets
  (`float32-blendable`; 16-bit otherwise), depth warped logarithmically
  over the blended draws' own range (their bounding spheres from the
  camera: a range reaching kilometers past a model's centimeters left its
  layers indistinguishable). Two passes over the blended geometry, a
  fixed 36 bytes a pixel, single-sampled. Two fixes to the published
  form, both found as black speckles: a lone layer evaluated at its own
  depth makes the reconstruction's quadratic degenerate (its division
  gave NaN about one time in six in 32-bit floats; caught before
  dividing, the overestimation's weight used), and the bias 5·10⁻⁶, not
  5·10⁻⁷ (no failure in 400,000 random stacks of one to four layers).
- "exact": every fragment into a list per pixel (fragment-stage atomics),
  sorted and blended front to back (since the Slang step 4 work, a compute
  pass, `sortLists`, then the composite), the nearest 32 kept.
  Multisampled: each node keeps the samples it covers and is in front of
  the opaque surfaces at, and the sort blends each sample on its own, so
  glass's edges antialias (see the correction below). The lists grow to a
  quarter more than a frame needed (its count read back). The reference
  "moments" is tested against.

Neither has a depth attachment: a storage write disables early depth
tests, so translucent fragments test the opaque depth themselves, per
sample at their own depth there (from its slope; tested at the pixel's
center, glass meeting its frame speckled). One full-screen composite
blends either result over the scene-referred target (premultiplied
"over") and the display-referred one (its color the same, its alpha, the
unlit share, times the light let through), so glass over imagery and over
lit content tonemap sensibly. Blended surfaces' opaque parts (alpha ≥
0.999) draw in the opaque pass, with depth, shadows (glass lets the sun
through) and picks: near-opaque layers centimeters apart are what the
moments tell apart worst. Cutouts (alpha mask, and those opaque parts)
use alpha to coverage in the opaque pass's depth stage, the alpha
sharpened to a pixel-wide ramp across the cutoff, so their edges
antialias like geometry's; shading at equal depth fills just those
samples. Deviation from [architecture.md](../design/architecture.md), "Frame graph": the lists are the reference and an option,
not the default with the moments as overflow fallback; the moments are
the default, cheaper and bounded (below).

Tested against the reference (parity/translucency, `bench/run.mjs
translucency`): six scenes on the bare ellipsoid (stacked and crossing
layers, glass around opaque boxes with one poking through its wall, 16
layers, near-opaque layers 5 cm apart, layers 1 cm apart). Moments within
mean FLIP 0.02 and p95 0.11 of exact everywhere; near-opaque layers are
worst (the front pane takes on the color of those behind). The lists are
order-independent (draws added in reverse: 0, at most 0.0012 where
near-opaque layers tie). Cost on the station design model's glass canopy
filling a 1489 × 1416 view (4× MSAA, RTX 3000 Ada laptop, rendering
continuously): the frame 15.2 ms without the translucent passes, 15.9 ms
with moments, 17.3 ms with exact lists.

Correction (Slang step 4, Apple M-series, Metal): on this GPU the
reference was wrong, not the moments. A 4× multisampled fragment shader's
storage writes run once per sample: each of the four runs sees the
pixel's center and its whole coverage mask, so the lists' pass put every
layer into its list four times, and "exact" blended each layer as
1 − (1 − α)⁴. Glass came out dark and saturated, and the moments, right,
looked gray beside it (mean FLIP 0.03 to 0.12, p95 to 0.69, since r45 at
least). A bare kernel shows it: a fullscreen triangle whose fragment
shader adds one to an atomic counts 4.00 a pixel at 4× and 1.00 at 1×,
whatever else it reads or writes; the shading itself takes no longer.
The RTX record above did not see it. WebGPU doesn't say how many times
a fragment shader runs for a pixel, so the lists no longer depend on it.
Each node carries the samples it covers and is in front of the opaque
surfaces at (the top four bits of its `next` word, leaving 2²⁸ nodes),
and `sortLists` blends each of the four samples on its own and averages
them: coverage per sample instead of as alpha, so edges where layers
cover different samples are right too. Where storage writes run once per
covered sample (a startup probe, gpu/sampleRateProbe.ts: one 4× draw
counting itself), the pass runs per sample explicitly
(`fsListSamples`) and only the run for the first covered sample writes;
every run's mask is the whole pixel's there, so it is one node per layer,
as before. Where a run's mask were its own sample alone, each would write
its own node, still right. Elsewhere it runs once per pixel (`fsList`),
as at r45. On the kernel gate the sort costs 13% more (2.38 ms against
2.1 on its synthetic lists). On this Mac moments are then within mean
FLIP 0.020 and p95 0.11 of exact (near-opaque the worst; crossing 0.002,
the glass box 0.001; exact's antialiased edges against the moments'
aliased ones count).

The page now has a ground truth: two unlit scenes (three layers over a
backdrop, eight crossing), each pixel's sorted "over" computed on the CPU
from each layer's coverage (rendered alone; its samples covered from the
resolved value, so a pixel on one layer's edge has a truth too). Exact
matches it within 0.6 of an 8-bit step, its 1,675 and more edge pixels
included (before the fix: 63.5; single-sampled, 54 at the edges); moments
are 0.3 to 0.4 steps off on average, 5 at worst (off the edges, which
their single-sampled passes don't antialias). Every row passes or fails against limits
(FLIP mean 0.03, p95 0.15; order 0.001; exact 2 steps, moments 4 on
average), so `bench/run.mjs translucency` catches it. Cost (the page's
`runTranslucencyCost`, 1920 × 1080, each frame waited on; the passes'
timestamps are not usable on Apple's GPUs, a render pass's taking in the
ones before it): single-sampled, exact added 1.5 to 7.8 ms to a frame
over the eight scenes, moments 0.3 to 6.2. The antialiased lists cost
more on this Mac, where every covered sample runs the list pass: the
16-layer stack +12 to +15 ms against +1.3 to +6.5 single-sampled (two
runs each), the lone glass box +8 against +4.5 to +6. Shared memory
can't help there (fragment shaders have none); the sort, which uses it,
stays at 3 to 4 ms either way. The runs that write nothing stop shading
at their alpha (opaque.wgsl `surfaceLight`: their lighting doubled the
pass), 1 to 2 ms of it. Letting them return before any shading at all (an
experiment, derivatives off) saved about 1 ms more: what is left is the
runs themselves, how this GPU runs a multisampled pass with storage
writes, not their work. In the gallery example's default scene
(1164 × 1406, lit): moments +1.9 ms, exact +7.3 antialiased against +4.7
single-sampled. Timed one frame at a time on a canvas, a frame quicker
than the display's refresh heard it was done only at the next one (16.7
ms at 60 Hz), so the scene without glass came out slower than with
moments and exact at +22; both cost measurements now render their frames
back to back and wait once. Where the probe finds once a pixel, the pass
costs what it did at r45. Exact stays the reference, antialiased;
moments stay the default; the Windows runs ([shaders.md](../design/shaders.md) step 4) measure both
again.

Found by the gallery's translucency example (examples/translucency,
moments above and exact below on one camera, sliders for the layers,
their spacing and alphas, and each way's cost): when a frame's lists
overflowed, the engine grew them from its count but drew nothing more
on demand, so glass stayed missing until the camera moved. It now
requests the frame.

Later (the antialiased lists' cost):

- Measure on NVIDIA and on Windows first: there the probe should choose
  `fsList` (once a pixel), and the antialiased lists should cost about
  the single-sampled ones plus the sort's 13%. If they do, the items
  below are only for Apple's GPUs.
- Shade once, cover separately: a single-sampled pass shades each
  fragment and writes its node, and a trivial multisampled pass (no
  shading, only the samples) sets the nodes' sample bits, the two
  matched by draw and `@builtin(primitive_index)` (the optional
  `primitive-index` feature, which the Apple adapter has; without it,
  per sample as now). Should bring Apple near the single-sampled cost.
  The trivial pass's floor, measured with every run returning at once:
  about 2.6 ms in the example's default scene, the sort and composite
  included.
- Or, where the probe finds per-sample runs, single-sampled lists with
  FXAA as an option (`View.fxaa` exists): cheaper, but glass's own
  silhouettes smoothed, not resolved.
- Not to try: shared memory (fragment shaders have none in WebGPU; the
  sort, a compute pass, uses it already and isn't the cost), and
  shading edges per sample and interiors once (WebGPU has no
  variable-rate shading).

**FXAA** (r45, `View.fxaa`, off by default): FXAA 3.11's quality version
(Lottes) after tonemapping, on top of 4× MSAA: the present pass tonemaps
into an encoded 8-bit image and FXAA reads it into the view's rectangle,
overlays after. It smooths what MSAA leaves (within shading, and the
moments' single-sampled edges). A viewer switch for both engines.

**LDR/HDR paths**: settled differently than [architecture.md](../design/architecture.md), "Frame graph" planned. There is one
path, HDR (rgba16float, pre-exposed, tonemapped in the present pass),
with display-referred content (unlit: imagery, photogrammetry) kept in
its own 8-bit sRGB target and added after tonemapping, so photographs
show as authored, as 1.x's LDR default shows them. 1.x's gamma 2.2
output and ACES are view options for comparisons. A separate LDR scene
target isn't needed.

**Exit status (r45).** L2 against 1.x (`bench/run.mjs parity models
imagery globe tileset`, RTX 3000 Ada): 79 of 83 image comparisons within
mean FLIP 0.05 and p95 0.2; the globe's tiles match 1.x's in every view
(Jaccard 1). The four others are intended differences: BoxCutout lit
(mean 0.049 to 0.056, p95 0.38 to 0.48; 0.21 and 0.96 before
translucency), where 1.x's weighted, blended OIT lets the faces behind its
alpha-1 frame show through and 2.0 draws them opaque (translucency is
tested against 2.0's own exact lists, r9); and UnlitTest lit (mean
0.074), where 1.x tonemaps unlit color under HDR and 2.0 shows it as
authored (display-referred, as glTF's unlit and 1.x's LDR default). With
translucency the only failure before, the models table's BoxCutout row
(unlit) is now 0.018. **L3 signed off** by the plan owner (2026-11-03,
"good enough for now"), with the open bug below: M4 is done.

**Open bug: East Antarctica drawn as ocean from far out (r45).** With
Cesium World Terrain and Bing, from about 25,000 km over the South
Atlantic, part of the Antarctic ice sheet beyond the pole shows as
ocean-colored, bounded by straight edges, with a seam through the ice.
A small rotation makes it go away. 1.x at the same camera draws the
whole ice sheet.

- Repro (Dyno viewer, `#/viewer?engine=2.0&asset=96188`, 2026-11-03
  11:00 local, sun from date and time, default settings): camera ECEF
  position (6325610.29, -16639664.12, -18088692.37) m, direction
  (-0.254088, 0.617099, 0.744733), up (-0.092624, -0.78199, 0.61637),
  right (0.962736, 0.087632, 0.255853), vertical fov 60°. Set it with
  `dynoViewer.viewer.view.camera` (`position`, `direction`, `up`,
  `right`, then `version++`). Globe tiles selected: 1/0/0, 1/1/0, 1/0/1,
  1/1/1 and the level-0 eastern hemisphere 0/1/0.
- Fixed (an 8.3° turn): position (4899582.15, -14201053.89,
  -20455237.03) m, direction (-0.196158, 0.517243, 0.833056), up
  (-0.059528, -0.854275, 0.516402). There 0/1/0 refines to 1/2/0 and
  1/3/0.
- 1.x selects the same five tiles at the repro camera, at the same
  distance for 0/1/0 (30,247 km, overestimated: `TileBoundingRegion`'s
  four edge planes coincide for a 180°-wide region, so the plane offset
  counts twice; the tile's nearest point is about 21,300 km away). So
  the selection matches 1.x and isn't the bug; 2.0 draws it wrong.
- Ruled out: 0/1/0's imagery slice (read back on the GPU: ice where it
  belongs) and its mesh and texture coordinates at the blue pixels;
  frustum culling (every sphere inside), mixed-LOD clip and placeholder
  state (none set); sun shadows, ambient occlusion, aerial perspective
  and sunlight through the atmosphere (each toggled off: still broken);
  back-face normal flipping (disabled for globe tiles: still broken).
- Seen: drawn unlit (`World.setImagery(…, unlit)` on 0/1/0's record),
  the missing area shows the tile's ice, so the tile is drawn there
  with the right imagery and its lit color is wrong. Picks in the area
  land 40 to 85 km below the ellipsoid: the level-0 tile's 400
  triangles sag (chords up to about 20° across), and the level-1
  neighbors' skirts reach 193 km below their edges (0/1/0's: 385 km).
  Next: what in the lit path uses the fragment's position or depth
  (the sagged chord is far below the ground), beginning with the IBL
  and specular terms and the deferred aerial-perspective volume.
