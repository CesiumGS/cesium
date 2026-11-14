# Budgeted selection: planned work (after M3)

**What this holds:** The planned and finished work on `Budgeted` selection after M3, in order (r37 onwards). Open points in it are not work items yet. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

In order (r37). First the findings from the r37 baseline ([benchmark-suite.md](../design/benchmark-suite.md), "Scope of v1 (milestone "Benchmark suite v1")"), so each
change after them is measured against a guardrail:

- **Image guardrail (done r37)**: selection parity, `Budgeted` against
  `Stepwise` on the same renderer (the settled end view captured under both
  after every measurement; FLIP at most 0.1 per scene, counted with the
  guardrails). Calibrated: untextured scenes 0.001 to 0.008, textured
  0.04 to 0.08 (Melbourne 0.083, to look at); Rainier's under-refinement
  was about 0.3. FLIP against 1.x can't tell: lighting and sky alone put
  most scenes at 0.3 to 0.55. _r37_: Rainier's 0.055 was not texture
  noise but a real patch (below, free detail on terrain); 0.009 since.
- **Free detail on terrain (fixed r37)**: after the orbit, Rainier's end
  view showed a hazy, snowless patch on the south flank that a direct load
  of the same view didn't. Terrain selection and imagery were both
  correct for the tiles drawn: `Budgeted` drew level-12 tiles left in the
  cache by the orbit (free detail, `opportunisticRatio` 0.25) where a
  direct load and `Stepwise` draw level 11, and Bing's level 12 there is
  a different, hazy capture. A still view looked different depending on
  where the camera had been. The globe now takes no free detail by
  default (`opportunisticRatio` 0; 3D Tiles keep it), and 0 now disables
  it on every path. Rainier: selection parity 0.055 → 0.009, quality in
  motion 0.062 → 0.026 (1.x 0.025); OSM Philadelphia 0.008 → 0.004;
  settle, resettle and bytes unchanged.
- **Terrain loading (done r37)**: `Budgeted` expanded a terrain tile
  only once it loaded, so terrain loaded one level per round trip and
  never skipped levels (the waterfalls' curve: 2 to 4 terrain requests in
  flight for seconds where 1.x has 18). It now expands tiles as it visits
  them, as 1.x's quadtree does. The benchmark adapters set up imagery,
  terrain and tilesets in parallel (2.0's waited on each, about a second).
  Measured (3 reps, against the r37 baseline): Rainier settles in 4.3 s
  (was 6.5 s; 1.x 5.8 s) loading 13.5 MB (was 4.3 MB under-refined; 1.x
  13.1 MB); OSM Philadelphia 4.9 s (was 7.7 s; 1.x 4.4 s), 23.3 MB (was
  26.6 MB). Selection parity unchanged (Rainier 0.059, Philadelphia 0.008,
  NYC 0.002).
- **Startup latency**: 2.0's first request starts 150 to 550 ms after
  1.x's in every scene (engine and device setup come before the first
  endpoint request), and NYC's first content request waits about 300 ms
  after the tileset JSON arrives, where 1.x's starts with it. Start
  resolving endpoints while the device is created; issue root content in
  the frame the tileset JSON arrives.
- **Hitches on uncapped orbits**: NYC 8 per run over 100 ms on 2.0 (1.x
  none), as in the baseline (Google Manhattan 3 to 6, Melbourne 6 to 14,
  Tokyo 6 to 10). Content arriving faster than the uncapped frame loop can
  upload; see H6 and the hitch harness.
- **Requests by purpose (done r37)**: each tileset counts requests and bytes by what
  they are for, `Budgeted`'s priority bands: base (a first coarse level),
  intermediate (steps between skipped levels), view (the frontier) and
  prefetch (the guard band). The inspector shows them (a stacked bar in
  Streaming, prefetch share in its history); waterfalls tag each request so
  scene pages can color by purpose.
- **Over-fetching on 3D Tiles**: NYC ×3.2 and OSM Philadelphia ×1.5 the
  bytes of 1.x with settled images that match its selection (0.002, 0.008):
  until settled, 155 tiles (7.5 MB) to 1.x's 74 (3.8 MB), so not drawn
  content (prefetch, base and intermediate requests); during the orbit
  another 119 (6.1 MB) to 1.x's 5, which defers requests while the camera
  moves (`cullRequestsWhileMoving`). Bound the prefetch band and loading in
  motion by their benefit, against the image guardrail.
  _r37, by purpose_ (requests now tagged): NYC's extra bytes are prefetch
  during the orbit (170 requests, 8.4 MB; no view requests were needed,
  prefetch had loaded what came into view), and only 145 of 312
  prefetched tiles were ever drawn (Philadelphia 31 of 110). The fixed
  guard band (tangents ×1.25 on all four sides) loaded the top and bottom
  bands an orbit never reveals. **Prefetch ahead of motion (done r37)**:
  the engine measures each view's camera velocity and prefetches the view
  it will have 1 s ahead (margin ×1.1; just the margin while still). NYC
  312 → 226 prefetches with the same 145 drawn, 13.9 → 10.9 MB;
  Philadelphia 37 drawn of 94; selection parity, settle and resettle
  unchanged. What remains (NYC ×2.6 of 1.x) is mostly content 2.0 draws
  during the orbit and 1.x never loads: a choice of quality in motion
  against bytes ([product-choices.md](../decisions/product-choices.md)), not waste.
- **Quality in motion (done r37)**: the image guardrail compares settled
  views only, so it can't see what loading in motion buys. After the
  measured runs, each engine replays the motion in a fresh context (cold
  cache, vsync, the same pace; nothing timed) and copies the canvas as
  drawn at 8 evenly spaced points (`createImageBitmap` in the frame's
  task, so loading isn't paused), then settles at each of those poses and
  copies it again. FLIP between the pair is what motion cost the image
  (0: drawn in motion as settled; renderer differences cancel). Scene
  pages show the frames with their settled pair and heatmap; the CLI
  prints the table; summaries and Analysis carry `motionFlip`. First
  results (r37, two reps):

  | Scene            | 1.x   | 2.0   |
  | ---------------- | ----- | ----- |
  | NYC              | 0.030 | 0.008 |
  | OSM Philadelphia | 0.012 | 0.011 |
  | Rainier          | 0.025 | 0.062 |
  | Aerometrex SF    | 0.014 | 0.031 |
  | Flight (below)   | 0.166 | 0.153 |

  NYC confirms what prefetch ahead buys (sharp in motion where 1.x defers
  requests). Rainier looked worse in motion (0.062), but its settled
  frames carried free detail the orbit had cached (above); 0.026 since,
  as 1.x. Aerometrex loses its first frame (0.09) and matches after.
  **Next**: bound
  loading in motion by benefit: a tile whose expected time on screen is
  shorter than its load time is not worth requesting (1.x's
  `cullRequestsWhileMoving` is the special case of 60 frames' travel
  against the tile's diameter), checked against both image metrics.

- **Big camera moves (r37, measuring)**: a scene flies 1.x's
  `camera.flyTo` path (CameraFlightPath in 3D, its defaults: up to a
  fifth of the framing altitude on a flat-topped curve, quintic easing,
  at most 3 s) from street level in Philadelphia to Tokyo over OSM
  Buildings on terrain, about 2,900 km up, the sun over the camera
  (`flight-philadelphia-tokyo`; camera script `flight`). Waterfalls now
  mark the motion and split requests before, in and after it. Two reps:
  - _In flight_ (3 s): 1.x 271 requests, 2.1 MB; 2.0 685, 8.5 MB (imagery
    234 to 71, terrain 430 to 196, 3D Tiles content 9 to 2, tileset JSON
    12 to 2). Uncapped, 2.0 434 requests, 4.9 MB.
  - _After arrival_: 1.x 138 requests, 11.2 MB (107 of them imagery);
    2.0 25, 9.9 MB, having loaded Tokyo's imagery and terrain during the
    descent. Tokyo settles after 1.4 to 1.6 s on 1.x and 1.1 to 1.6 s on
    2.0 (vsync); uncapped 2.8 s on 1.x, 0.9 s on 2.0. Totals +27% bytes.
  - _In motion_: alike (0.17 and 0.15); both draw only the coarsest
    levels near arrival (0.6 at 94% of the flight) and space at the top
    (the end pitch, −35°, is kept the whole way, as flyTo does).
  - Nothing was cancelled: 3D Tiles and terrain cancel a request only
    after 30 frames untouched, and most loads finish sooner; imagery
    sources are never cancelled once requested. **Next**: what 2.0
    fetches in flight that is never drawn (purpose stats for imagery
    too), cancellation for imagery, and whether the descent's loads or
    the 3 s flight's prefetch (1 s ahead at thousands of km/s) are
    worth their bytes; a slower flight (`seconds`) and a flight between
    3D Tiles cities with no globe.

- **Untextured terrain while zooming out (fixed r37)**: 2.0 drew a
  terrain tile as soon as its geometry arrived, with its own imagery or an
  ancestor's within 8 levels, else untextured: zooming out fast over
  Rainier (3 km to 600 km in 0.25 s) drew up to 31 gray tiles in a frame.
  As 1.x (`GlobeSurfaceTile.processImagery`), a terrain tile is now
  drawable only with imagery, its own or a stand-in ancestor's; until
  then what was drawn stays (finer cached tiles, or the ancestor), and
  its imagery loads (`SelectionResult.waiting`, both policies). Stand-in
  slices count as used, so a composite can't evict one a drawn tile is
  borrowing; placeholders get imagery too. Zoom-outs from 1.5 s down to
  0.15 s (×1000): no untextured tile in any frame. Rainier, OSM
  Philadelphia and the flight: settle 4.3, 4.3 and 4.3 s (1.x 6.0, 4.8,
  4.6), Tokyo after the flight 0.9 s (was 1.3; 1.x 1.5 to 2.1); bytes,
  selection parity and quality in motion unchanged. First content on
  Rainier waits for imagery too (2.7 to 3.1 s; 1.x 2.1 to 2.2).
- **Imagery captures in motion**: Bing's levels are different captures on
  Rainier (bluish ice, hazy level 12), so a tile drawn with a stand-in
  ancestor's imagery while its own loads shows a different capture for a
  moment. Both engines do (32 frames of the orbit: 1.x 0.022, 2.0 0.023,
  bumps at the same moments; 2.0's at 33% covers more of the summit).
  `--motion-samples` sets the frames per replay (default 8).
- **Dyno's guardrails, after tuning `Budgeted`**: some comparisons with
  1.x now measure product choices rather than regressions (bytes for
  loading in motion and prefetch, JS heap, terrain free detail). Revisit
  the plan's guardrails and their tolerances per scene once `Budgeted`
  settles, so a verdict means what it says.

_r38 (overnight, toward the L1′ exit check)_:

- **FLIP on the GPU (done r38)**: `parity/flipGpu.ts`, a WebGPU compute
  port of `parity/flip.ts` (separable filters as passes, per-workgroup
  sums and a histogram for mean and percentiles). Same mean as the JS
  reference to 5 decimals (per pixel within 2e-4) at 4 to 8 ms a
  comparison instead of 220 to 310. Benchmark filmstrips and the L1′
  loop use it; in L1′ the JS FLIP ran on the main thread every 500 ms of
  the very loading it measured.
- **The exit check as a matrix (done r38)**: `bench/lod-matrix.mjs` runs
  L1′ for Stepwise and adaptive Budgeted over five datasets
  (photogrammetry: Google Midtown, Aerometrex SF; OSM Philadelphia;
  design models: BIM and AEC samples) on a fast link and the throttled
  one (20 Mbit/s, 80 ms), with repetitions (`--reps`; single runs vary
  by up to 0.03 in FLIP avg) and re-scoring (`--summarize`). A cell
  passes where Budgeted's FLIP average is no worse (within 0.002) at no
  more bytes downloaded (within 2%; L1′'s "MB" column was GPU upload).
  L1′ rows record requests and bytes by purpose.
- **FLIP against the target (r38)**: the fully refined reference (SSE 2)
  rewards lingering on content that happens to look more like SSE 2 than
  the image both policies settle to. Zooming out on AEC, Budgeted reaches
  the target in 500 ms and Stepwise after 1 s, yet Budgeted scored worse
  (the finer content still drawn resembles SSE 2); BIM's SSE-16 tiles
  drop an element its coarse tiles keep, so settling sooner scored worse.
  L1′ now also measures FLIP against the target (Stepwise settled at the
  default SSE), samples every 100 ms (500 ms decided whole averages by
  whether a sub-second move had converged at the one sample), and the
  exit check judges on the target metric, showing both.
- **Prefetch only ahead of real motion (done r38)**: a still camera
  prefetched a 1.1× margin around the view; on a jump into OSM
  Philadelphia 13 prefetches were half of Budgeted's bytes (21.6 MB to
  Stepwise's 11.3) and, throttled, delayed what the view showed (settle
  8.1 s vs 3.6). Prefetch now needs steady motion: a camera set somewhere
  else in one frame (a teleport, a flight's end) read as thousands of m/s
  and prefetched far from the view. Budgeted's prefetch requests also wait
  until no visible request of the tileset is queued or in flight
  (`prefetchAfterVisible`; 1.x's preloads go out with the rest). OSM:
  11.3 MB both, throttled FLIP avg no worse.
- **Partial resident cover (done r38)**: a missing frontier tile draws
  whatever resident finer content lies under it (tiles count loaded
  descendants, `residentBelow`), instead of nothing unless every visible
  child is resident.
- **Startup (done r38)**: `Viewer.create` resolves the default globe's
  imagery and terrain endpoints while the device is created, and both at
  once; the benchmark adapter does the same for every dataset. NYC's
  first request now leaves at 0.50 s (was 0.90; 1.x 0.46) and its first
  content request 0.17 s after the tileset JSON (was 0.29). Settle
  (cold orbit, two reps): NYC 3.0 s (was 3.5 to 3.7; 1.x 3.1), OSM
  Philadelphia 4.1 s (was 4.3; 1.x 4.7), Rainier 3.9 s (was 4.4; 1.x 6.0).
- **Loading in motion by benefit (done r38)**: while the camera moves,
  Budgeted doesn't request a tile (frontier, intermediate or prefetch)
  whose time on screen, the field of view over how fast it crosses it, is
  shorter than the tileset's median load time (`motionBenefit`, default
  1). Only motion across the line of sight counts (a tile straight ahead
  of a camera flying toward it stays in view), less the camera's turning
  as vectors (|−v⊥/d − ω × u|: an orbit's target stays still on screen;
  adding the two as speeds first made near content look fast). Views carry
  their steady motion, tilesets their recent load time. 1.x's
  `cullRequestsWhileMoving` is the crude case. Slow orbits are untouched
  (NYC 10.9 MB, quality in motion 0.008 vs 1.x 0.030).
- **Imagery requests (done r38)**: globe imagery counts requests, bytes,
  drawn and cancelled (an Imagery row in the inspector's purposes and in
  run metrics) and cancels sources no wanted tile has needed for 30
  frames. Flight Philadelphia–Tokyo: 31.7 → 25.9 MB (1.x 24.7), quality
  in motion unchanged (0.149 vs 1.x 0.164). Nothing was cancelled on a
  fast link (loads finish inside the 30 frames); the savings come from
  not requesting in motion.
- **Dyno's guardrails (retuned r38)**: the default plan depends on what
  is compared. 2.0 against 1.x judges what should match: time to settle,
  frame p95, hitches, and bytes until settled (`bytesLoad`: requests
  started before the motion); bytes in and after motion and the JS heap
  are product choices there, reported but not judged. 2.0 against 2.0
  judges them all. Quality in motion is an image guardrail beside
  selection parity: the candidate's may not be worse than the baseline's
  by more than 0.01 per scene. Re-summarized runs that stored the old
  default plan get the new one (runs before r38 have no `bytesLoad`).
- **No free detail by default (done r38)**: Google Manhattan's quality in
  motion was 0.046 to 1.x's 0.026 (the new motion guardrail broke) with
  the motion bound on or off, prefetch at full detail or none, and at
  r37's commit too. The cause was free detail: after the replay's orbit
  filled the cache, each settled reference drew cached tiles up to two
  levels finer than its view needs, so in-motion frames were scored
  against an over-refined image, and a still view depended on where the
  camera had been (as Rainier's patch on terrain). `opportunisticRatio`
  now defaults to 0 for 3D Tiles too: quality in motion 0.020 (1.x
  0.026), selection parity 0.066 → 0.024, bytes unchanged. Zooming out,
  resident finer content still stands in while the coarser tile loads.
- **JS heap (r38, partly done)**: 2.0's main-thread heap is 2 to 6 times
  1.x's in every scene (NYC 172 to 331 MB vs 54). A heap snapshot of NYC
  settled (36,176 tiles known, 176 loaded): the bulk is per-tile
  bookkeeping for tiles never loaded. About 10 small Float64Arrays per
  tile (a region volume's corners, normals and box; each its own
  ArrayBuffer): 377k typed arrays and as many ArrayBuffers. Volumes are
  now compacted into one buffer each (ArrayBuffers 377k → 90k, heap 217
  → 200 MB); the views remain (23 MB), as do 6 to 7 MB each of Tile
  objects, plain objects, heap numbers and short strings. Tiles also keep
  content URIs relative (resolved on use) instead of each carrying the
  tileset URL's query. A cheaper step first: build volumes lazily (keep the 6 or 12 numbers from the JSON; corners, normals, box and sphere on first use, which most of NYC's 36k tiles never see; `childrenWithinParent` and `childrenPartition` on first use too). The real fix is the SoA tile table ([tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Structure and formats"): one
  Float64Array per tileset for every volume. (A 32 MB external string
  in the snapshot is the benchmark page's script source, 1.x's
  unminified build, loaded for both engines.)
  _r39_: volumes are built lazily (`Tile.volume`, content and request
  volumes, the children checks and `headerKey` on first use). Snapshot
  against snapshot, after the orbit, JS heap after full GC: NYC 23.2 →
  15.2 MB, Tokyo 242 → 83 MB, Google Manhattan 123 → 78 MB (1.146.0: 43,
  535, 310); Tokyo's buffers 86 → 49 MB (each volume's packed array was
  an ArrayBuffer). The "2 to 6 times 1.x" above was the metric:
  `performance.memory.usedJSHeapSize` didn't move with a full GC and
  counted ArrayBuffer storage with the main thread's objects (NYC: 93 MB,
  of which 21 MB objects and 64 MB buffers). The suite now reads both
  over CDP, main thread and workers, after full collections (`heapBytes`,
  `bufferBytes`). What remained was buffers: 2.0 held 68 MB on NYC and 73
  MB on Tokyo to 1.x's 13 and 16 (production builds). Heap snapshots of
  the main thread and the workers on NYC (the workers hold 0.5 MB each):
  - **The benchmark page**: it loaded this repository's unminified 1.x
    build on every run, 2.0's too (the note above): 23 MB of the buffer
    count (its source text) and 5.6 MB of JS heap. 2.0 pages now load no
    1.x; snapshots of 2.0 at older refs get an empty one (an annotation
    on the trend charts marks it).
  - **The World's CPU tables**: records, transforms (float64 local and
    world matrices), instances and materials were allocated at full
    capacity, and the suite's world has 65,536 draws: 37 MB, nearly all
    empty. They now start at 1,024 rows and double as slots are used;
    the GPU tables stay full size.
  - **The upload copy buffer** kept its peak (4 MB after NYC's load).
    Queued geometry is now written straight into staging buffers mapped
    at creation (1 MB or the write's size), destroyed after each flush:
    nothing stays between bursts, and one copy of every upload is gone.

  Quick tier, cold start, against 1.146.0 (median MB, main thread and
  workers): NYC buffers 3.1 (1.x 12.3), Tokyo 7.3 (15.9), Google
  Manhattan 2.2 (8.8); JS heap 12.8, 70.7, 38.6 (41.2, 371, 187). NYC
  against HEAD over 6 repetitions: buffers −93%, time to settle and
  first content unchanged; lab parity images identical.

- **Hitches with vsync off (fixed r38)**: a CPU profile of NYC's
  uncapped orbit: the 100 to 300 ms stalls are not script. The main thread
  waits in `getCurrentTexture` (1.4 s of them) and `queue.writeBuffer`
  (0.9 s), the GPU's backlog. The upload and tree-build budgets were per
  frame and grew while frames were "on time", which at 500+ frames a
  second meant gigabytes a second. Each update now gets the budgets'
  share of a 60 Hz frame by the time since the last one; with vsync
  nothing changes. That is sound but did not remove the hitches (NYC
  uncapped still 4.5 per run; settle a little better, 3.3 s and OSM 3.8 s
  vs 3.7 and 4.2). What a second profile and the waterfall show: the two
  hitches come at the same moments of the orbit (1.5 s and 4.6 s), when
  bursts of prefetched tiles arrive (5 to 7 within 100 ms, none larger
  than 130 KB); most of each 200 to 300 ms interval passes outside
  `frame()` (the next animation frame comes late: the GPU process is
  behind), and the main thread's busiest call is `queue.writeBuffer` for
  mesh uploads (1.2 s over 8 s). A trivial uncapped WebGPU loop in the
  same browser never stalls (79k frames, worst 17 ms). **The fix**: a
  `queue.writeBuffer` per stream of every mesh went through the browser's
  transfer ring to the GPU process; `World` now copies writes into a CPU
  staging area when queued and puts them in place, before anything reads
  the arenas (the frame, ray casts) or reuses their ranges, from one
  mapped staging buffer with buffer-to-buffer copies. Profile: no frame
  over 80 ms (was 2 to 5), busy stretches over 80 ms 28 → 5. NYC and OSM
  Philadelphia, vsync on and off, two reps: no hitches (NYC 4.5 → 0), and
  the scorecard against 1.x passes with no guardrail broken.
- **The full catalog (r38)**: every scene, cold and uncapped orbits, two
  reps, 1.x against 2.0 after the changes above. CPU per frame −73%
  (geomean), settle −26%, frame p95 −56%, bytes until settled −5%
  (Google −37%, Melbourne −49%, Aerometrex −54%); quality in motion no
  worse anywhere (Japan 0.018 vs 0.046, NYC 0.008 vs 0.030). Point
  clouds, splats and vector tiles are still unsupported in 2.0; 1.x
  doesn't draw the instanced fleet. The scorecard failed on two
  guardrails, both older than tonight (bisected with snapshot engines):
  BIM's settle (+20%, its first content 0.25 s later since
  `45f86b9e68`) and hitches with vsync off on AEC and Japan (since
  `68328f878f` or earlier). Both are fixed below; the rerun of those
  scenes passes.
- **KTX2 uploads and content origins (fixed r38)**: a CPU profile of
  AEC's uncapped orbit. `writeTexture` of transcoded KTX2 levels blocked
  the main thread for up to 0.5 s under a GPU backlog (the `writeBuffer`
  stall again), and request order parsed two URLs per wanted tile per
  frame (0.5 s over the load) since content URIs stay relative. KTX2
  levels now go through one mapped buffer and `copyBufferToTexture`
  (rows padded to 256 bytes; images unchanged); a relative URI's origin
  is its base's, looked up once per base. AEC uncapped hitches 3 → 2,
  Japan 6.5 → 4.5 (1.x 1 to 2; what remains is during Japan's load).
- **The ellipsoid's expansion (fixed r38)**: since terrain expands tiles
  as it visits them, the ellipsoid (which has every tile) expanded
  everything visited in one startup frame: 0.5 s of `Tile` construction
  before a design model's first request. It now expands within 4 ms per
  selection pass, beyond which tiles expand when they load (its tiles
  are generated, so expanding ahead saves no round trips); terrain keeps
  expanding freely (budgeting it too slowed OSM's settle by 0.5 s).
  Three reps: first content BIM 0.73 → 0.47 s, NYC 1.95 → 1.30 s (1.x
  0.55 and 1.57); settle BIM 1.80 → 1.47 s, NYC 3.38 → 2.83 s (1.x 1.54,
  3.05). Still open: on terrain 2.0's first content comes later than
  1.x's (Rainier 2.7 to 3.2 s vs 1.6 to 1.9, OSM 2.1 vs 1.5) though it
  settles sooner. Not the terrain-waits-for-imagery rule (Rainier 2.5 to
  2.7 s just before `2bd5d85d21`, 2.6 to 2.7 at it, 2.4 to 2.9 now): 2.0's
  has been about 2.5 s since r37 while 1.x's ranges from 1.6 to 3.0 s
  between sessions (it was level in the r37 baseline). The waterfall
  (Rainier, same session): 2.0 requests `layer.json` at 1.37 s to 1.x's
  0.99 (the benchmark adapter adds terrain only once every endpoint,
  Bing's imagery metadata included, has resolved), so its first terrain
  requests leave 0.6 s after 1.x's; and then 66 at once, mostly
  intermediate levels, where 1.x sends 10 before its first content. Next:
  add terrain as soon as its own endpoint resolves (imagery attached when
  ready), and let the root levels' requests go first.
  _Fixed (r39)_: the burst was not the cause (2.0's level 0 tiles take the
  same 230 to 330 ms on the network as 1.x's). Three waits were: terrain
  added only after every endpoint resolved; a tile's imagery requested
  only once its terrain had loaded (about 0.4 s; 1.x requests both at
  once, imagery needing only the rectangle); workers created on the first
  request. Terrain now starts on its own endpoint (adapter and `Viewer`),
  the globe's tiles load while imagery resolves (`GlobeOptions.imagery`
  takes a promise; nothing is drawn without imagery), imagery is wanted
  for loading tiles after drawn ones (not prefetch), and `warmUp` starts
  the workers. First content, median of 3 (ms):

  | Scene · scenario        | 1.146.0 | r38  | r39  |
  | ----------------------- | ------- | ---- | ---- |
  | Rainier · cold          | 1944    | 2561 | 1731 |
  | Rainier · uncapped      | 2754    | 2825 | 1721 |
  | Philadelphia · cold     | 1353    | 2185 | 1624 |
  | Philadelphia · uncapped | 2175    | 2041 | 1361 |
  | Tokyo · cold            | 2726    | 3108 | 2176 |
  | Tokyo · uncapped        | 3607    | 3011 | 2214 |

  Philadelphia cold varies widely in both engines (1.x 1287 to 2718, 2.0
  1361 to 2452).

- **The L1′ exit check (r38)**: the final state (commit `4d94c22c95`:
  no free detail, staging uploads, the ellipsoid's expansion budget),
  three repetitions per cell, FLIP against the target (lower is better),
  bytes downloaded. A cell passes where Budgeted's FLIP is no worse by
  more than 0.002 plus twice the standard error of the per-repetition
  difference (repetitions vary: a throttled jump into OSM ran 0.29 to
  0.44 for either policy), at no more bytes; better where lower by more
  than that:

  | Content           | Link | FLIP S → B    | Δ ± margin     | MB S → B    | Verdict |
  | ----------------- | ---- | ------------- | -------------- | ----------- | ------- |
  | Google Midtown    | fast | 0.129 → 0.053 | −0.077 ± 0.014 | 69.1 → 40.7 | better  |
  | Google Midtown    | slow | 0.127 → 0.096 | −0.031 ± 0.005 | 69.1 → 40.7 | better  |
  | Aerometrex SF     | fast | 0.064 → 0.015 | −0.049 ± 0.016 | 6.1 → 1.4   | better  |
  | Aerometrex SF     | slow | 0.093 → 0.023 | −0.070 ± 0.003 | 6.1 → 1.4   | better  |
  | OSM Philadelphia  | fast | 0.096 → 0.006 | −0.090 ± 0.037 | 11.3 → 11.3 | better  |
  | OSM Philadelphia  | slow | 0.136 → 0.124 | −0.012 ± 0.011 | 11.3 → 11.3 | better  |
  | BIM design model  | fast | 0.015 → 0.000 | −0.015 ± 0.002 | 62.6 → 37.4 | better  |
  | BIM design model  | slow | 0.019 → 0.011 | −0.009 ± 0.002 | 62.6 → 37.4 | better  |
  | AEC design + site | fast | 0.006 → 0.010 | +0.004 ± 0.003 | 12.5 → 12.5 | fail    |
  | AEC design + site | slow | 0.016 → 0.021 | +0.005 ± 0.006 | 12.5 → 12.5 | pass    |

  Nine of ten pass, eight better (two repetitions at `09c78b3fbb`, before
  the later fixes: nine of ten, seven better, with AEC failing on the
  throttled link and passing on the fast one). Settle times are as fast or
  faster everywhere (Google 2.3 vs 4.1 s fast, 23.0 vs 35.8 s throttled).
  AEC is the one gap, about +0.004 to +0.005 on either link, and which
  link's cell fails changes between runs: it sits at the margin. On the
  throttled link both policies request the same 113 tiles zooming out, and Stepwise draws the complete coarse
  parent until a region completes where Budgeted holds the finer tiles it
  has. The hold (kept for pans, so a new edge doesn't collapse a region
  to a near-root tile) now applies only while at most half a region's
  visible children are missing: zoom-out FLIP 0.046 → 0.035 (Stepwise
  0.028); a quarter was worse (0.045, pans too). What remains is likely
  the request order on a FIFO link (coarser tiles first would complete
  regions sooner, but would put near, fine content behind far, coarse
  tiles in oblique views): part of budget-driven refinement below.

Then the planned work:

- Budget-driven refinement (benefit per byte, [tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Budget-driven refinement"), which is also the
  slow-link answer from the throttled L1′ runs.
- Multi-view priority and view weights; fair queueing of an origin's window
  across tilesets and views ([tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Request scheduling", [tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Multi-view priority").
- Silhouette weighting for design models; GPU coverage feedback from the
  HZB ([tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Visual quality signals beyond geometric error").
- Traversal in a worker over a transferable SoA tile table ([tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Structure and formats").
- Paging lessons: thrashing rate, working-set or ARC-style eviction, and a
  prefetch band sized by its hit rate ([tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Request scheduling", [tile-selection-and-memory.md](../design/tile-selection-and-memory.md), "Memory management (open design question)").
- A second photogrammetry city in L1′ (done r38: Aerometrex SF beside
  Google Midtown); network profiles from real-user data (follow-up 6;
  synthetic profiles until that data exists: fast, and 20 Mbit/s with
  80 ms).
- _Exit_: `Budgeted` beats `Stepwise` on FLIP avg at equal or fewer bytes on
  both fast and slow links, across photogrammetry, OSM and design models.
  _r38_: 9 of 10 cells, 8 better (`bench/lod-matrix.mjs`, three
  repetitions, FLIP against the target); AEC trails by about 0.004 on
  either link, at the margin (see the table above).
