# Level-of-detail transitions: coarsening, and 3D Tiles both ways

**Status (2026-11-13):** design, reviewed and merged. The owner answered seven questions on 2026-11-13 (recorded under "Decisions") and accepted the plan with two additions at review: retargeting runs on the job system, and the clock rebase moves into milestone 1. Its milestones are in project CS-14. Nothing is built yet.

**Goal:** nothing pops when a level of detail changes, except the very first load. Today terrain morphs in and imagery cross-fades when they refine. This plan adds:

- terrain and imagery coarsening;
- 3D Tiles content in both directions;
- one setting and one way to measure it all.

**Sources:**

- The transform-graph plan (`2026-11-12-transform-graph.md`): fix 8 (transitions) and "What the ×10 views showed".
- [architecture.md](../../design/architecture.md), "Unified streaming and tile selection (streaming/)" ("cross-fade or dither transitions, budgeting for the overlap"), [tile-selection-and-memory.md](../../design/tile-selection-and-memory.md), "Mixed-LOD drawing" ("dithered cross-fades for whole-region swaps"), [tile-selection-and-memory.md](../../design/tile-selection-and-memory.md), "Visual quality signals beyond geometric error" ("Stability") and [investigations-2026-11-13.md](../../design/investigations-2026-11-13.md) item 7 (refinement as a general concept, of which transitions are one source).

> **For agentic workers:** execute milestone by milestone, with a fresh implementer per milestone. Verification is lean, as in the transform-graph plan: typecheck, eslint and prettier on the files changed, the milestone's own tests, and at most one headless check. The lead runs the full suite and the parity suites once before each merge. Name code by symbol (`grep -rn "function startMorphs" packages/next/src`). Start each milestone with `git status` for the files it changes.

---

## What exists today

- **`View.lodTransitions`:** `"morph"` (default) or `"pop"`. `&lod=pop|morph` in an example's URL sets it for every view (`widgets/engine.ts`).
- **Terrain geomorph on refinement.**
  - A tile carries `_HEIGHT_MORPH`, `(n̂, d)` per vertex: d is its nearest drawn ancestor's surface height there, less its own (`globe/heightNormal.ts`, `TerrainSource.morphRequest`).
  - From the time in the draw record's `morph` word, the vertex stage moves each vertex from the ancestor's height to its own (`surface.slang` `morphOf`), before any warp.
  - The CPU side is `streaming/tileMorph.ts` (`startMorphs`, `endMorphs`), called from `tilesetUpdate.ts` after the view masks are applied.
  - Tiles with no resident, non-upsampled ancestor heights, and upsampled tiles, carry no morph and pop.
- **Imagery cross-fade on refinement.**
  - When a drawn tile's imagery changes, `GlobeImagery.apply` writes `imageryFrom` (the old packed slice) and `imageryFade` (the start time). The fragment stage blends old into new.
  - The old slice is pinned (`GlobeImagery.pinned`) until the fade ends.
- **One duration:** `transitionSeconds`: max(0.3 s, 8 rendered frames), capped at 1 s. The shaders read it from the view block's `transition.x`.
- **The very first load pops,** by the owner's choice: terrain rising from the ellipsoid read as the camera moving.
- **Coarsening pops** for terrain and imagery. 3D Tiles content pops both ways.
- **Mixed LOD:** a coarse tile drawn while its children load is a placeholder, clipped per fragment to exact holes (`Budgeted`, `placeholderOut` in `surface.slang`). Under warps the boxes are tested at the true position, so they move with any warp.
- **A dither already exists:** the clip sets' stipple mode uses interleaved gradient noise, the same at a pixel in every pass (`surface.slang` `clipDither`).
- **The draw record** is 176 bytes, with 172 used: one word (4 bytes) is free.

---

## Prior art

| Source | What it does | What we take |
| --- | --- | --- |
| Ulrich, "Rendering Massive Terrains using Chunked Level of Detail Control", SIGGRAPH 2002 course notes ([notes](https://tulrich.com/geekstuff/chunklod.html)) | A quadtree of preprocessed chunks, skirts for cracks, and a vertex morph between a chunk and its parent, driven by screen-space error. | Skirts and a per-tile morph, as we have. |
| Strugar, "Continuous Distance-Dependent Level of Detail for Rendering Heightmaps", JGT 14(4), 2009 ([reference code](https://github.com/CarsF/CDLOD)) | The morph factor is a function of each vertex's distance, so a node is fully morphed to its parent's shape exactly where the quadtree switches. Coarsening is as invisible as refining, with no state. | Considered for terrain coarsening and not chosen (below). Kept as a later option, measured by the same statistic. |
| de Boer, "Fast Terrain Rendering Using Geometrical MipMapping", 2000 ([PDF](https://dcmpx.remotevs.com/com/flipcode/www/PL/archives/article_geomipmaps.pdf)); Wagner, "Terrain Geomorphing in the Vertex Shader", ShaderX2 ([article](https://gamedev.net/tutorials/programming/graphics/terrain-geomorphing-in-the-vertex-shader-r1936)) | Geomipmapping pops between levels; Wagner adds a time- or distance-driven morph in the vertex shader. | Time-driven morphs work on block terrain without a continuous LOD function, which is our case: selection is budgeted and loading is late. |
| Unreal Engine, "Dithered LOD Transition" material option ([forum thread on behavior](https://forums.unrealengine.com/t/ue-5-3-dithered-lod-transition-issues/1778945)) | Both levels drawn during the transition, with a dither threshold changed over time. Every material on a mesh must opt in. | The dither, drawn opaque. Unreal smooths the noise with TAA; we have none, so our pattern is fixed per pixel (below). |
| Cesium for Unreal, "Smoother LOD Transitions … with Dithered Opacity Masking", 2022-10-20 ([blog](https://cesium.com/blog/2022/10/20/smoother-lod-transitions-in-cesium-for-unreal/)), v1.17.0 | 3D Tiles fades by a screen-space dither on a ramped threshold. The incoming tile inverts the dither value, so the pair stays watertight. 0.5 s by default. Translucency was rejected: it needs sorting, writes no depth and overdraws. Many fades at once spike draw calls and uniform updates. | Complementary masks, opaque, no sorting. Our per-draw state lives on the GPU (one word), so no per-tick uniform updates. |
| Unity `LODGroup` cross-fade ([manual](https://docs.unity.com/en-us/engine/current/manual/analysis/graphics-performance-profiling/lod/lod-group/lod-transitions-lod-group); [`crossFadeAnimationDuration`](https://docs.unity3d.com/ScriptReference/LODGroup-crossFadeAnimationDuration.html)) | Two modes: time-based ("Animate Cross-fading", one global duration in seconds) and width-based (a share of the LOD's range). The shader gets `unity_LODFade` and the `LOD_FADE_CROSSFADE` keyword; the last LOD fades out to nothing. | Time-based by default, with one global duration, as we have. |
| Enderton, Sintorn, Shirley, Luebke, "Stochastic Transparency", I3D 2010 and TVCG 2011 ([paper](https://www.cse.chalmers.se/~d00sint/stochtransp-tvcg.pdf)) | Random sub-pixel stipple covers a share of samples in proportion to alpha: order-independent, one pass, noisy without accumulation. | A cross-fade is stochastic transparency with two complementary layers. With MSAA the mask can be per sample (finer steps, less visible noise). |
| Google: US 9,547,921 "Texture fading for smooth level of detail transitions" ([patent](https://patents.google.com/patent/US9547921)); US 9,105,129 "Level of detail transitions for geometric objects" ([patent](https://patents.google.com/patent/US9105129)) | Both assigned to Google; both filed in 2012–2014. The first blends the previous and new texture level over frames, at a rate scaled by the level gap so the time stays constant. The second blends a parent terrain tile's sub-tiles with its children as a function of camera distance. | The closest documented account of Google Earth's approach: imagery fades are independent of geometry, and terrain blends by distance. Read for design only; check before shipping anything close to the claims. |
| CesiumJS 1.x | No transitions: terrain, imagery and 3D Tiles all pop. A search of `packages/engine` finds no geomorph, cross-fade or dither. Users have asked for fades ([forum: Fade-in transitions for 3d Tiles](https://community.cesium.com/t/fade-in-transitions-for-3d-tiles/7490)). | `Stepwise` parity runs use `"pop"`. |
| Apple, "Tailor your apps for Apple GPUs and tile-based deferred rendering" ([doc](https://developer.apple.com/tutorials/data/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering.md)) | Hidden-surface removal shades only visible fragments per tile; A11 and later improve fragment-discard performance. A shader that can discard can't be hidden-surface-removed before it runs (as with any early depth test). | Discard only in the cheap depth prepass, only for fading draws (below). |

---

## Decisions (owner, 2026-11-13)

1. **Terrain coarsening morphs back.** Deselected children stay drawn for one transition and morph to the replacing tile's surface (today's morph, reversed), while their imagery fades to its texels. Then they swap invisibly. Not a dithered cross-fade, and not CDLOD's distance-driven morph.
2. **3D Tiles content with nothing behind it:** added (ADD) children fade in, since they're refinement. A tileset's very first content pops, like terrain's first load.
3. **Settings:** `View.lodTransitions` becomes `"smooth" | "pop"` (default `"smooth"`), plus an optional `transitions: "smooth" | "pop"` on each tileset and globe layer. A view's `"pop"` wins everywhere, for A/B and parity runs (`&lod=pop`).
4. **Fades dither in every pass,** opaque, translucent and shadow, with complementary masks. Picks, ray queries and height captures see only the destination (the side fading in).
5. **One duration for every transition:** `transitionSeconds` (0.3 s or 8 frames, up to 1 s). 3D Tiles fades don't get a longer floor.
6. **Memory:** leaving tiles are held for at most one transition. If the cache is over budget by more than what's leaving, new coarsening transitions pop, and the stats say so.
7. **Multi-level coarsening chains one level at a time.** An ancestor's coarsening waits until its descendants have finished leaving (at most 1 s each). It is skipped when the leaving tiles are off screen, hidden, or when the swap's error is under half a pixel.

**Why morph back for terrain, not a dither and not CDLOD:**

- **One draw per place.** A dither draws both levels for the whole fade. Morphing draws only the children, which were already drawn.
- **No noise.** A fixed dither on large smooth terrain shows as a screen-door pattern, and without TAA nothing smooths it. Morphing is continuous.
- **No gap midway.** Halfway through a cross-fade, half the pixels show each level, so the vertical gap between them shows as speckle. A morph closes the gap.
- **It reuses what's built:** `_HEIGHT_MORPH`, the record's word, the clock and the imagery fade.
- **CDLOD's distance-driven factor** is stateless and invisible on coarsening, but here it needs a time-based fallback anyway: late loads, budget limits and occlusion all change the selection off the distance rule. It also gives one factor per record across views. It stays a later option if the measurements ask (milestone 8).

---

## Design

### 1. One word, one clock, one direction rule

- **The record's `morph` word becomes `transition`:** a signed start time, in seconds on `View.time.x`'s clock.
  - Positive: transitioning in (a tile arriving, morphing from its ancestor's surface or fading in).
  - Negative: transitioning out (a tile leaving, morphing to its replacement's surface or fading out).
  - 0: none.
  - The shader's progress is `t = clamp((view.time.x − |w|) / view.transition.x, 0, 1)`, eased by smoothstep `e(t)`. A tile coming in shows `e(t)` of itself; a tile going out shows `1 − e(t)`.
- **How a record transitions is a new `RecordFlags` bit, `dither`** (call it `RecordFlags.ditherTransition`):
  - Clear: geomorph in the vertex stage (globe tiles with `_HEIGHT_MORPH`).
  - Set: dither in the fragment stage (3D Tiles content, and globe tiles without morph data).
- **The free word stays free.** The record is nearly full; one shared word with a flag covers both methods, since no draw needs both.
- **Reversal is continuous.** If a tile going out is selected again (or one coming in is deselected), its new start is chosen so its shown amount doesn't jump. Smoothstep is symmetric (e(1 − t) = 1 − e(t)), so a tile at progress t in one direction restarts at 1 − t in the other: `start = now − (1 − t) · duration`, with the sign flipped. A test holds `morphFactor` continuous across a reversal.
- **Precision:** an f32 time in seconds loses steps after long sessions (at 10⁶ s, about 11 days, a step is 0.06 s). **Fix in milestone 1 (owner, at review):** the word and `View.time.x` share an epoch kept on the CPU in f64. When the shader clock passes a threshold (an hour), the epoch moves forward and every nonzero word is rebased by the same amount in the next record write, so the shader always works with small times.

### 2. Leaving tiles: the shared machinery

Coarsening needs a tile to stay drawn after selection drops it. This is one mechanism for terrain and 3D Tiles: the **leaving set**.

- **Where:** `tilesetUpdate.ts`, after every view's selection and before the view masks are applied. `tileMorph.ts` grows into `streaming/transitions.ts`, with `startTransitions` and `endTransitions` in place of `startMorphs` and `endMorphs`.
- **What enters it:** a tile drawn in view v last tick (bit v of `state.masked`) and not now, when all of these hold:
  - v and the tile's content are `"smooth"`;
  - the tile was in view and not hidden (fewer than the occlusion feedback's hysteresis ticks occluded, and not frustum-culled this tick);
  - its **destination** is drawn in v this tick and ready (loaded, uploaded, with its records written);
  - the swap's error is at least half a pixel (below that, a pop can't be seen);
  - the memory rule allows it (below).
- **The destination:**
  - REPLACE coarsening: the nearest ancestor selected in v this tick.
  - REPLACE refining (3D Tiles only): the selected descendants. Terrain's parent leaves at once on refining, as today, since its children morph in from its surface.
  - ADD coarsening: nothing replaces the content; it fades out over what stays.
- **While leaving:** the tile keeps bit v in its view mask (so its records draw in v), is counted as drawn by the cache (so it isn't evicted), and its record's word is negative.
- **Its destination is held back** in v until the leaving tiles finish, for morphs: the replacing terrain tile isn't drawn until its children are at its surface. For dither fades, both draw at once with complementary masks.
- **Release:** at the end of the transition the tile drops bit v and its word goes to 0. If it left for every view, it becomes an ordinary cache entry.
- **Chaining (decision 7):** if a destination is itself deselected while tiles are still leaving to it, its own coarsening waits: it stays selected in v until they finish, at most one transition. Each level of a fast zoom-out then takes one transition. The skip rules (off screen, hidden, under half a pixel) let most intermediate levels go at once.
- **Memory (decision 6):** leaving tiles are pinned for at most one transition. Each tick, if the cache is over its budget by more than the leaving set's bytes, no new coarsening transition starts; those tiles pop. `stats.transitions` reports `started`, `skipped` by reason (`hidden`, `offscreen`, `subpixel`, `memory`, `chained`) and `leaving` (tiles and bytes).
- **Occlusion:** a tile coarsened because it was hidden long enough (the occlusion session's work) pops by the hidden rule, as it can't be seen. Leaving tiles aren't queried.
- **Mixed-LOD placeholders:** a leaving child counts as present for its parent's placeholder clip. The parent's holes don't open where a child is still leaving; they close as each child is released.
- **Debug view:** the tile-state view (`View.debug` "state") gains `leaving` and `arriving` colors beside drawn, placeholder, stand-in, held and hidden.
- **The loop:** while any tile is transitioning, the on-demand loop keeps ticking (today's `morph` wake reason, renamed `transition`), and `view.refinement` lists it as a source once [investigations-2026-11-13.md](../../design/investigations-2026-11-13.md) item 7 lands.

### 3. Terrain coarsening: morph back

- **The common case needs no new data.** A child's `_HEIGHT_MORPH` holds d = (its nearest drawn ancestor's height − its own) at each vertex. When it leaves to that same ancestor, the vertex stage already has what it needs: shift = (1 − e(t)) · d for coming in becomes e(t) · d for going out. `morphOf` reads the word's sign.
- **Retargeting.** When the destination isn't the ancestor the child was decoded against (selection skipped levels differently, or the ancestor wasn't drawn then):
  - The child's d is recomputed against the destination's resident `heights`, in the decode worker, with the same code `morphRequest` uses (`MorphSource`: the ancestor's heights, scale and quadrant).
  - The new `(n̂, d)` stream is rewritten into the arena in place (16 bytes a vertex; a level-15 tile is about 65 KB).
  - The child stays drawn and selected-looking until it lands, a tick or two. That's invisible: the picture doesn't change while it waits. A request older than one transition gives up and pops (counted as `skipped: retarget`).
  - **On the job system** ([job-system.md](../../design/job-system.md), owner at review): the recompute is a `Jobs` job with the decode workers' group, prioritized by the swap's screen error, with an apply step that writes the stream into the arena. The give-up rule is its cancellation, as is the child's release or a reversal; the inspector's Jobs section shows it.
- **Tiles with no morph data** (parent not resident at decode): a dither fade both ways, with the `dither` flag. Upsampled tiles keep no geometry change to hide (they are their source's surface, cut smaller), so only their imagery changes, which the imagery fade covers.
- **Skirts** move with the morph, as they do on morph-in (they share `morphOf`).
- **Neighbors at different progress** leave small cracks for a moment, as morph-in does; skirts cover them.
- **Crease residual:** a child at its parent's heights sits on the parent's surface at its own vertices, but its triangles are chords of the parent's surface between them. Where a parent edge crosses a child triangle, the two differ slightly. It's the same residual morph-in starts from, and it's far below the swap's error. The jump statistic will show whether it matters.
- **Shadows, the depth prepass and picks** use the same vertex stage. Picks and CPU height queries see the destination (decision 4): `terrainRay` and height captures skip leaving tiles and answer from the destination's heights, as morph-in tiles already answer from their own heights.

### 4. Imagery coarsening

Three cases.

- **With terrain coarsening.**
  - Each leaving child fades its imagery to what its destination will draw with: the destination's own slice if it has one, else its stand-in. Mapped into the child as an ancestor slice (`packImagery` with `up` = the level difference), through the existing `imageryFrom` and `imageryFade` words.
  - The child's own slice is pinned as the fade's `from`, as today.
  - At release the child shows exactly the destination's texels on the destination's surface, so the swap is invisible.
  - If the destination's own slice arrives later, the ordinary refine-direction fade on the destination covers it.
- **A drawn tile's own slice is given up** (`GlobeImagery.trim` handing slices to another layer, or `recycle`). The tile falls back to its ancestor's slice, which is a coarsening.
  - Today the slice goes back to the pool at once, and then `apply` starts a fade from it (read from the code, not reproduced). The pool can hand it to another layer's composite in the same tick, so the fade may read a slice being overwritten.
  - **Fix:** a drawn tile's given-up slice is *retired*: pinned as the fade's `from` for one transition, then given back. `pinned()` and the pool's free list both respect it. The hand-over pace (`HANDOVER_PER_UPDATE`) is unchanged; the slices arrive at the taker one transition later.
- **A tile drawn again after a gap** (the destination of a coarsening, drawn before, then hidden under its children).
  - `GlobeImagery.applied` is a `WeakMap` by placement that survives while a tile isn't drawn. When the tile comes back, `apply` may see its old packed value as `before` and fade from a slice that has since been recycled (read from the code; to confirm with a test first).
  - **Fix:** forget `applied` for a placement when its tile stops being drawn, so its return is a first imagery. Under the morph-back rule, its children have already faded to its texels, so nothing shows.
- **Not changed:** a layer shown or hidden, or its opacity changed, isn't a level change and isn't faded here.

### 5. 3D Tiles: dithered cross-fades and fade-ins

**The dither.**

- **The test:** a record with the `dither` flag and a nonzero word keeps a fragment where `n < e(t)` when coming in, and where `n ≥ e(t)` when going out. n is a noise value in [0, 1) at the pixel. With the same start time and the same n, a pair coming in and going out cover each pixel exactly once where both cover it.
- **The noise:** interleaved gradient noise, as `clipDither`, but at an offset pixel position, so a draw that is both stippled by a clip set and fading isn't correlated (correlated, the kept share would be min(α, e) instead of α · e). It's fixed per screen pixel, not animated: with no TAA to average it, each pixel flips once during the fade, a dissolve rather than a shimmer.
- **MSAA:** a later refinement writes a per-sample coverage mask (four steps a pixel, `n_s = fract(n + s/4)`), as point sets already write their sample mask. Finer steps, less visible noise. It needs a sample-mask output in the depth prepass's fragment stage, so it's measured before it's adopted (milestone 7).
- **Screen-fixed noise swims** relative to moving content. For 0.3 s it's what Unreal and Cesium for Unreal ship.

**Which pairs fade.**

- **REPLACE, refining, whole region:** the parent fades out and every child fades in, with one start time. The parent is held by the leaving set until the end.
- **REPLACE, refining, mixed LOD:** the parent is a placeholder clipped to its holes. When child i arrives, its box stays in the parent's clip list for one transition with a fade start. Inside a fading box the parent draws where `n ≥ e(tᵢ)`, and child i draws where `n < e(tᵢ)`. The box's start time goes in its clip-block row (a spare lane, or one more row per box if there is none; check `insideClipBoxes`). The boxes are tested at the true position, so this holds under warps.
- **REPLACE, coarsening:** the children fade out (held by the leaving set) while the parent fades in, with one start time. The parent must be resident: a coarsening to a parent that isn't loaded keeps the children drawn (no holes) until it is, as `Budgeted` already avoids coarsening to nothing.
- **ADD, refining:** a child's content fades in over its parent, which stays.
- **ADD, coarsening:** a child's content fades out (held by the leaving set) over what stays.
- **The first content of a tileset pops** (decision 2): a tile with no drawn ancestor and nothing drawn in its place doesn't fade in.
- **Instanced and point-set content** (`I3DM`, point clouds) fade per record, as meshes. Gaussian splats, when they land, fade by opacity: they're blended already, and the splat session decides ([investigations-2026-11-13.md](../../design/investigations-2026-11-13.md), M6).

**Passes (decision 4).**

- **Depth prepass and opaque pass:** the prepass decides which fragments survive (its fragment stages already discard for placeholders and cutouts: `shadowPlaceholderFs`, `depthCoverageFs`). The opaque pass draws with depth `equal` and no discards (`cutOutInDepth`), so it shades only what the prepass kept. Coplanar parent and child surfaces may both pass `equal` and shade twice: they look the same, and it lasts one transition.
- **Without the prepass:** the opaque fragment stage dithers (`cutOut`).
- **Translucent passes:** the same dither, so a translucent parent and child never blend over each other.
- **Shadow casters:** the same dither, evaluated at the shadow map's pixel. The pair is complementary there too, so the caster's union is whole and filtering smooths the mix.
- **Picks, ray queries and height captures:** the destination only. A record going out is skipped whole; a record coming in counts whole. A pick during a fade answers what the scene is becoming, and doesn't flicker per pixel between two tiles' features. `pickOutput` and `heightFs` skip the dither and apply this rule instead; CPU ray queries skip leaving tiles.
- **The depth pyramid** is built from the dithered depth. A dithered hole shows a farther depth, so the pyramid errs toward visible: safe for occlusion, for one transition.
- **Ambient occlusion** reads the dithered prepass depth: some noise in the AO term during a fade. Measured, not fixed in advance.

**GPU cost, and on tile-based GPUs.**

- **Vertex and rasterization cost:** both levels for one transition, as [architecture.md](../../design/architecture.md), "Unified streaming and tile selection (streaming/)" budgets ("the overlap of two tiles drawn at once"). Fragment shading isn't doubled: the opaque pass shades only kept fragments.
- **Discard defeats early depth tests,** on immediate-mode GPUs (late Z for that pipeline) and on tile-based GPUs (Apple's hidden-surface removal can't reject a discarding fragment before it runs).
- **It's already paid in the prepass:** the prepass fragment stages discard today for placeholders and cutouts, so the dither adds no new class of pipeline. It adds a uniform per-draw branch (the word is per record), and discards only for fading draws.
- **Mitigations, in order:**
  1. Discard only in the depth prepass, never in the shading pass (true today with the prepass on).
  2. Fades are short and few: bounded by what changes level in one transition. `stats.transitions` reports the fading draws and their screen area.
  3. **A plain prepass pipeline** with no fragment stage for records that neither clip, cut out nor fade, with the discarding variant kept for the rest. This helps today's placeholders as much as the fades. The cull kernel would sort records into two draw lists by flags. Measured first (milestone 7), adopted only if the prepass's GPU time on the M2 moves.
  4. Order: plain opaque first, then discarding draws, so hidden-surface removal and early Z have the most occluders in place.

### 6. Under warps

- **Morphs happen in the true frame, before the route,** as morph-in does: `g(mix(h_parent, h, t))` for any height profile and any warp.
- **Fades happen in drawn space.** The dither is a screen test; it doesn't care what moved the vertices.
- **The placeholders' clip boxes** are tested at the true position (the varying the vertex stage carries), so a fading box moves with the content under any warp.
- **The swap's error under a warp** is s · ε of the tile being replaced (the transform-graph plan's fix 8), so the half-pixel skip rule uses the stretched error, with the view's `lodExponent`, as selection does.
- **Retargeted morph data** is in the true frame (heights), so it's warp-independent.

### 7. Settings and API

- **`View.lodTransitions: "smooth" | "pop"`,** default `"smooth"`. The old name `"morph"` goes; this is a proof of concept, so no alias. `&lod=pop|smooth` in URLs.
- **`transitions?: "smooth" | "pop"`** on `Tileset3D` options and on the globe's terrain and imagery layers. Absent means the view's. A view's `"pop"` wins everywhere.
- **The duration stays internal:** `transitionSeconds`, one rule for everything (decision 5). No public knob until someone needs it.
- **`Stepwise` selection** (1.x parity) runs with `"pop"`: the parity suites set it.
- **Docs:** each type says what it promises ("levels change without a visible jump, except the first content shown") and what it leaves to the engine (the method, the duration, when a transition is skipped).
- **`api/surface.txt`** changes with the rename: run `npm run surface`.

### 8. How to judge it

**The jump statistic.** For two consecutive rendered images, the share of pixels whose luminance changes by more than a threshold (default 0.1 in linear luminance, about 25 levels in sRGB mid-grays).

- A pop is a spike of the share in one step. A transition spreads the same change over the transition's frames, so its peak share falls.
- **A new script,** `scripts/frameJumps.mjs <recording folder>`: reads the recorder's PNG dumps (`widgets/recorder.ts`, `frames=every:1`) in tick order and writes a CSV of tick, share and the largest change. It prints the peak share and the count of steps above 1%. It was done by hand for geomorph's A/B; this makes it repeatable.

**Protocols,** each run with `&lod=pop` and `&lod=smooth`, with the recorder on and a fixed clock:

- **Still camera after a cut (coarsening):** settle close, cut the camera back two levels' distance in one tick, and hold still. With the camera still, every changed pixel is a level change. Terrain (`vertical-exaggeration` at ×1 and ×10, `zermatt-close`), photogrammetry (REPLACE), a design model (ADD).
- **Still camera after a cut (refining):** the reverse, as geomorph's A/B did.
- **A steady dolly out and in** at a fixed speed in ticks: the share has a camera-motion floor, so compare the spikes above the floor between modes.
- **Report:** peak share, steps above 1%, time to settle, tiles drawn (peak and settled), the leaving set's peak tiles and bytes, transitions skipped by reason, and GPU time per pass (prepass, opaque, shadows) during fades against at rest.
- **Pass:** in `"smooth"`, no step above 1% except the first load and camera motion, and GPU time during fades within 1.5× of at rest for the prepass.
- **Few screenshots:** read the CSVs; look at an image only to judge a visual question (the dither's look).

---

## Milestones

Sized for one agent each. Each lands on the proof-of-concept branch with its tests; the lead runs the suites once per merge. The overall plan names them CS-121, CS-122, CS-123, CS-124, CS-125, CS-126, CS-127, CS-128 and CS-133 (project CS-14).

1. **The word, the flag, the rename.** `morph` → `transition` in `common.slang`, `layout.ts`, `drawConstants.ts`; signed start; `RecordFlags.ditherTransition`; `morphOf` reads the sign; the clock's epoch rebase (section 1, with a test that a transition spanning a rebase stays continuous); `View.lodTransitions` `"smooth" | "pop"`; `&lod=` values; `api/surface.txt`. `tileMorph.ts` → `transitions.ts` with reversal math and tests (`morphFactor` continuous across a reversal). No behavior change beyond the names. *Model: fast.*
2. **The leaving set** (section 2), with terrain morph-back for the common case (destination = the decode-time ancestor), skip rules, chaining, the memory rule, `stats.transitions`, the placeholder rule and the debug state. Tests with `test/fakeGpu.ts`: a coarsening holds the children for one transition, then releases them; hidden and off-screen children pop; a reversal keeps the tile. *Model: most capable (design-heavy, touches selection output).*
3. **Imagery coarsening** (section 4): children fade to the destination's texels; retired slices; `applied` forgotten when a tile stops drawing. First a test that shows each suspected bug (fade from a given-up slice; fade from a recycled slice on return), then the fixes. *Model: fast, with a capable reviewer.*
4. **Retargeting and the terrain dither fallback:** worker recompute of `_HEIGHT_MORPH` against a new destination as a `Jobs` job (canceled by the give-up rule), the in-place stream rewrite, the give-up rule; dither fades for globe tiles without morph data. *Model: fast.*
5. **The dither in the shaders:** the noise, `cutOut`, the prepass stages, translucent and shadow stages, the destination rule in `pickOutput`, `heightFs` and CPU ray queries. Read the Metal output with `scripts/dumpMsl.mjs` before the first browser run. Tests: complementary coverage on a fake pair; picks during a fade hit the destination. *Model: fast.*
6. **3D Tiles transitions:** REPLACE both ways (whole region and mixed-LOD boxes with per-box start times), ADD in and out, first content pops. *Model: most capable (mixed-LOD boxes).*
7. **Measure** (section 8): `scripts/frameJumps.mjs`, the protocols, the report. Then decide the two measured options: the plain prepass pipeline and the per-sample MSAA mask. *Model: fast.*
8. **Later, if the measurements ask:** CDLOD-style distance-driven morph factors for terrain (t = min(time-based, error-based)), so a camera moving at a steady speed shows no timed morphs at all.

Milestones 1 and 7's script can start at once. 2 needs 1; 3 and 4 need 2; 5 needs 1; 6 needs 2 and 5.

**Handbook:** when milestones 2 and 6 land, update the streaming and globe tabs (prose, "checked" date, status), and add the prior-art sources to `handbook/src/sources.ts` with the dates read (2026-11-13).

---

## Risks and open points

- **Time precision:** handled by milestone 1's epoch rebase. The remaining risk is a rebase landing mid-transition; its test covers that.
- **Fast zoom-outs:** chaining adds up to one transition per level for tiles that stay visible. The half-pixel and off-screen skips should cover most; the dolly protocol measures the extra tiles drawn.
- **The parent must be resident to coarsen to it.** With skip-LOD (photogrammetry), ancestors may have been evicted. Coarsening then waits for the ancestor's load, drawing the finer children meanwhile: correct, but it costs memory while zoomed out. The stats show how often.
- **Dither look on large flat content** (a city's ground plane from a 3D Tiles mesh): a visible dissolve for one transition. The MSAA mask is the first remedy.
- **Multi-view:** the word is per record, shared by every view that draws it. Two views transitioning the same tile at different times can't both be exact; the later one restarts it (a small step in the other view). Split views of one scene are rare enough for the proof of concept.
- **Custom shaders:** a user fragment stage that discards on its own still works (both discards apply). A custom vertex stage on terrain runs after the morph, as today.
