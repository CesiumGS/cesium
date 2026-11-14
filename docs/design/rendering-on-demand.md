# Rendering on demand

**What this holds:** When the engine renders, sleeps and wakes. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**1.x.** Renders every frame by default. `requestRenderMode` (opt-in, since
1.42) renders only on camera changes, tile, imagery and terrain loads,
simulation-time changes beyond `maximumRenderTimeChange` (default 0: a
running clock still renders every frame), and explicit
`scene.requestRender()`. It is off by default because 1.x can't see every
change: entity property edits, custom shader uniforms or DOM-driven state
can leave a stale frame unless the app calls `requestRender()`.

**2.0: on demand by default, continuous as an option.** Every scene change
already goes through engine APIs, so the engine tracks invalidation itself
instead of relying on the app:

- **Camera:** a view's camera or rect changed, including controller
  inertia.
- **World mutations:** dirty record ranges, mesh, material and texture
  adds or removes, view-mask and placeholder changes (all already pass
  through `World`).
- **Streaming:** while requests are in flight or uploads are queued,
  selection runs on a cheap tick, and a frame renders only when the
  selection or draw records change. With nothing loading and a still camera
  the engine is idle.
- **Environment:** sun, lighting, exposure, output encoding.
- **Time-driven content:** glTF animation, animated materials, and later the
  clock and globe lighting request frames while active.
- **Resize, picking and readbacks** request one frame each.

Dirtiness is per view: a view whose camera and content are unchanged keeps
last frame's image (insets and split views stop re-rendering). The API is
`engine.renderMode = "onDemand" | "continuous"` (default on demand) plus
`engine.requestRender()` for state outside the engine. Statistics report
idle and frames rendered per second instead of stale frame times.
Benchmarks and parity harnesses call `renderFrame()` directly and are
unaffected. The viewer gets a "Render continuously" toggle. Two states stay separate in the API and the viewer: streaming (tiles
loading vs up to date, `Tileset3D.idle`) and rendering (rendering vs idle);
a scene can be up to date and still render (an animation), or stream while
no frame renders (tiles arriving off screen).

**Implemented (r23).** `engine.renderMode` defaults to `"onDemand"`; each
tick evaluates view links, then renders if `requestRender()` was called, a
pick is pending, or an allocation-free fingerprint of the scene changed (the
sun; per view its target size, viewport, camera, exposure, clear color,
encoding, lighting, world). Otherwise active tilesets (loading, changed in
the last few frames, or with the memory-adjusted SSE still moving) run
selection and uploads, and a frame renders only if a world's version moved
(`World.version`, bumped by every record and material change). The viewer
renders 16 to 19 frames per second while Midtown streams, none once it
settles, a frame per camera change while orbiting, and serves picks while
idle.

_r37_: hovering rendered frames. `GlobeController` picks the position
under the cursor on every pointer move (one pick at a time, so wheel zoom
can aim at what's under the cursor), and a pick was served by a pass in a
rendered frame, so the viewer rendered about as often as the pointer
moved. **Fixed**: each view keeps its own feature-ID and depth targets
(not pooled; depth is stored every frame), and a pick for a view that
doesn't render this tick runs only the pick pass on what its last frame
left there. Hovering the milk truck: 60 pointer moves, no frames rendered
(30 pick-only submits); wheel zoom still lands on the hovered point.
The cost is those two MSAA targets per view, no longer shared between
views of one size through the pool.

Per-view dirtiness: each view keeps its own fingerprint, and `World`
accumulates the view-mask bits of every record it changes (a changed mask
contributes its old and new bits; a material change, every view), so a tile
selected or uploaded for one view doesn't redraw another, and content
uploaded hidden redraws nothing. Rendering is per target: a canvas gets a
fresh texture each frame, so a target redraws all its views when any of them
changed, and targets with nothing changed are skipped and keep their last
image. With two canvases, moving one camera ten times rendered ten frames
into its canvas and none into the other. Most applications are expected
to give each view or UI component its own canvas, all driven by one engine
over a shared scene; that case is complete.

**Independent views within one canvas (r23).** Views sharing a canvas
(the viewer's split view and inset) are composited on demand: each view
presents into its own persistent image at its size, only dirty views (or
ones without a current image, e.g. after a continuous frame) re-render,
and every frame that touches the canvas clears it and copies the views'
images in view order, so an inset lands over the view it overlaps. A
clean view costs one copy. Single-view canvases, `renderFrame()` and
continuous mode draw straight into the target with no extra memory. In
the viewer's split view, moving one camera ten times rendered that view
ten times and the other none. Cost: one image per view on a shared canvas
(not yet counted in the render-target budget, §13.6).

**Measure.** Frames rendered while idle (zero), time from a change to its
frame (one frame), and no stale frames in the parity harnesses' interactive
counterparts.
