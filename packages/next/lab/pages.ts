import type { HarnessInfo } from "./harness.ts";

/**
 * Every harness page, for Dyno's Lab and the runner. Each module exports
 * `harness` (lab/harness.ts); its .html page is the runner's entry point.
 */
export const HARNESSES: HarnessInfo[] = [
  // ------------------------------------------------------------ parity
  {
    id: "parity",
    group: "parity",
    title: "Image parity",
    description:
      "A small synthetic scene in both engines from canonical cameras, compared with FLIP (plan §4 L2).",
    page: "/parity/",
    entry: "runParity",
    cesium1x: true,
    load: () => import("../parity/main.ts").then((m) => m.harness),
  },
  {
    id: "models",
    group: "parity",
    title: "Model parity",
    description:
      "Khronos sample models rendered unlit in both engines from one camera: geometry, transforms, axes, UVs, vertex colors, textures and filtering, with picks.",
    page: "/parity/models.html",
    entry: "runModels",
    cesium1x: true,
    load: () => import("../parity/models.ts").then((m) => m.harness),
  },
  {
    id: "translucency",
    group: "parity",
    title: "Translucency",
    description:
      "Blended surfaces in controlled scenes with moment-based OIT against the exact per-pixel lists, both against a computed ground truth for unlit layers, and the lists' order independence.",
    page: "/parity/translucency.html",
    entry: "runTranslucency",
    load: () => import("../parity/translucency.ts").then((m) => m.harness),
  },
  {
    id: "custom-shader",
    group: "parity",
    title: "Custom shaders",
    description:
      "User shader stages (WGSL vertexMain and fragmentMain) on boxes in every pass, against the engine's shader: unchanged stages and a failing shader must match it, the rest must differ.",
    page: "/parity/customShader.html",
    entry: "runCustomShader",
    load: () => import("../parity/customShader.ts").then((m) => m.harness),
  },
  {
    id: "tracks",
    group: "parity",
    title: "Live points and styled layers",
    description:
      "Tracks as a live point source drawn by a vector style: trucks up close (a model pool), symbols from afar (point sets), interpolation between feed samples, clamping against ray casts, and a 100,000-point feed update's cost.",
    page: "/parity/tracks.html",
    entry: "runTracks",
    load: () => import("../parity/tracks.ts").then((m) => m.harness),
  },
  {
    id: "tileset",
    group: "parity",
    title: "Tileset content parity",
    description:
      "A 3D Tiles tileset's full-detail content in both engines (b3dm or glb, feature IDs, property tables), with picks over a grid of pixels.",
    page: "/parity/tileset.html",
    entry: "runTileset",
    cesium1x: true,
    load: () => import("../parity/tileset.ts").then((m) => m.harness),
  },
  {
    id: "selection",
    group: "parity",
    title: "Tile selection parity",
    description:
      "The tiles each engine selects once loading settles, per camera, 1.x against 2.0's Stepwise (Jaccard; the bar is 99%).",
    page: "/parity/selection.html",
    entry: "runSelection",
    cesium1x: true,
    load: () => import("../parity/selection.ts").then((m) => m.harness),
  },
  {
    id: "lod",
    group: "parity",
    title: "Selection against full detail",
    description:
      "Each selection policy against a fully refined reference (plan §4 L1′): image error and bytes, on fast and throttled networks.",
    page: "/parity/lod.html",
    entry: "runLod",
    cesium1x: true,
    load: () => import("../parity/lod.ts").then((m) => m.harness),
  },
  {
    id: "globe",
    group: "parity",
    title: "Globe selection parity",
    description:
      "The terrain tiles each engine draws once settled, compared by level, x and y (Jaccard; the bar is 99%).",
    page: "/parity/globe.html",
    entry: "runGlobe",
    cesium1x: true,
    load: () => import("../parity/globe.ts").then((m) => m.harness),
  },
  {
    id: "imagery",
    group: "parity",
    title: "Globe imagery parity",
    description:
      "Cesium World Terrain with Bing in both engines from the same cameras, terrain selection identical, so FLIP measures the imagery.",
    page: "/parity/imagery.html",
    entry: "runImagery",
    cesium1x: true,
    load: () => import("../parity/imagery.ts").then((m) => m.harness),
  },
  {
    id: "heights",
    group: "parity",
    title: "Height parity",
    description:
      "What clamped content stands on: 1.x Cesium3DTileset.getHeight against 2.0 World.castRays over a grid, on OSM Buildings.",
    page: "/parity/heights.html",
    entry: "runHeights",
    cesium1x: true,
    load: () => import("../parity/heights.ts").then((m) => m.harness),
  },
  // ------------------------------------------------------------ microbenchmarks
  {
    id: "baseline",
    group: "microbenchmarks",
    title: "Engine baselines",
    description:
      "Matched workloads in both engines: many boxes, picking, log depth, time to first frame and four views, with API calls counted.",
    page: "/bench/baseline.html",
    entry: "runBaseline",
    cesium1x: true,
    load: () => import("../bench/baseline.ts").then((m) => m.harness),
  },
  {
    id: "shader-cost",
    group: "microbenchmarks",
    title: "Custom shader costs",
    description:
      "Frames while new custom shaders compile in the background, and CPU and GPU time for the same boxes spread over 1 to 64 shaders.",
    page: "/bench/shaderCost.html",
    entry: "runShaderCost",
    load: () => import("../bench/shaderCost.ts").then((m) => m.harness),
  },
  {
    id: "translucency-cost",
    group: "microbenchmarks",
    title: "Translucency fixed cost",
    description:
      "GPU time at 1456 × 1360 with no blended draw, one in no view or hidden, and a small and a large one on screen; with a wall-time check on the GPU timer.",
    page: "/bench/translucencyCost.html",
    entry: "runTranslucencyCost",
    load: () => import("../bench/translucencyCost.ts").then((m) => m.harness),
  },
  {
    id: "hitch",
    group: "microbenchmarks",
    title: "Hitches",
    description:
      "Content added to and removed from a live world while the camera jumps into new areas: frames over 34 ms, the worst frame, long frames.",
    page: "/bench/hitch.html",
    entry: "runHitch",
    load: () => import("../bench/hitch.ts").then((m) => m.harness),
  },
  {
    id: "instances",
    group: "microbenchmarks",
    title: "Instancing",
    description:
      "One multi-primitive model placed many times: placement time, CPU and GPU per frame while orbiting, and the cost of moving instances.",
    page: "/bench/instances.html",
    entry: "runInstances",
    load: () => import("../bench/instances.ts").then((m) => m.harness),
  },
  {
    id: "tracks-bench",
    group: "microbenchmarks",
    title: "Real-time tracks against 1.x",
    description:
      "N tracks fed at 10 Hz as 16 px symbols: 2.0 live points against 1.x BillboardCollection and entities. Creation, CPU per feed update and per frame, frame intervals, GPU.",
    page: "/bench/tracksBench.html",
    entry: "runTracksBench",
    cesium1x: true,
    load: () => import("../bench/tracksBench.ts").then((m) => m.harness),
  },
  {
    id: "alloc",
    group: "microbenchmarks",
    title: "Frame-loop allocations",
    description:
      "The scene for the allocation gate (boxes and a model in two views); the runner profiles allocations while frames run.",
    page: "/bench/alloc.html",
    entry: "allocSetup",
    load: () => import("../bench/alloc.ts").then((m) => m.harness),
  },
  // ------------------------------------------------------------ spikes
  {
    id: "precision",
    group: "spikes",
    title: "Camera-relative precision",
    description:
      "Jitter of geometry far from the origin with camera-relative rendering on this GPU (the M0 precision gate).",
    page: "/spikes/precision.html",
    entry: "runPrecision",
    load: () => import("../spikes/precision.ts").then((m) => m.harness),
  },
  {
    id: "atmosphere",
    group: "spikes",
    title: "Reference atmosphere",
    description:
      "Spectral Monte Carlo path tracing of Earth's sky in physical units, checked against a deterministic single-scattering integral: the oracle for 2.0's sky and environment lighting.",
    page: "/spikes/atmosphere.html",
    entry: "runAtmosphere",
    load: () => import("../spikes/atmosphere.ts").then((m) => m.harness),
  },
  {
    id: "sky",
    group: "spikes",
    title: "Real-time sky vs reference",
    description:
      "Hillaire's real-time atmosphere (transmittance and multiple-scattering tables, a ray-marched sky) against the spectral path-traced reference, in cd/m².",
    page: "/spikes/sky.html",
    entry: "runSky",
    load: () => import("../spikes/sky.ts").then((m) => m.harness),
  },
  {
    id: "ibl",
    group: "spikes",
    title: "Image-based lighting vs reference",
    description:
      "Material balls lit by an environment: 2.0's real-time image-based lighting against a Monte Carlo integral of the glTF BRDF, and a white furnace for energy conservation.",
    page: "/spikes/ibl.html",
    entry: "runIbl",
    load: () => import("../spikes/ibl.ts").then((m) => m.harness),
  },
  {
    id: "indirect",
    group: "spikes",
    title: "Indirect draws",
    description:
      "drawIndexedIndirect against drawIndexed inside render bundles: what GPU-driven submission costs.",
    page: "/spikes/indirect.html",
    entry: "runIndirect",
    load: () => import("../spikes/indirect.ts").then((m) => m.harness),
  },
  {
    id: "worker",
    group: "spikes",
    title: "Engine in a worker",
    description:
      "The whole engine in a worker rendering to an OffscreenCanvas; block the main thread and the scene keeps moving.",
    page: "/spikes/worker.html",
    entry: "runWorker",
    load: () => import("../spikes/worker-main.ts").then((m) => m.harness),
  },
  {
    id: "slang-probes",
    group: "spikes",
    title: "Slang feature probes",
    description:
      "Each feature the engine's shaders need, compiled by slangc to WGSL and validated in WebGPU: the Slang-first migration's step 1, re-run per Slang release.",
    page: "/spikes/slang-probes.html",
    entry: "runSlangProbes",
    load: () => import("../spikes/slangProbes.ts").then((m) => m.harness),
  },
  {
    id: "slang-kernels",
    group: "microbenchmarks",
    title: "Slang kernels against the WGSL",
    description:
      "Each kernel ported to Slang against the hand-written WGSL it replaced, alternately on the same inputs, timed by GPU timestamps: the migration's 5% gate.",
    page: "/spikes/slang-kernels.html",
    entry: "runSlangKernels",
    load: () => import("../spikes/slangKernels.ts").then((m) => m.harness),
  },
];

export const HARNESS_GROUPS: Array<[HarnessInfo["group"], string, string]> = [
  [
    "parity",
    "Parity",
    "Does 2.0 draw what 1.x draws? Each check renders both engines and compares.",
  ],
  [
    "microbenchmarks",
    "Microbenchmarks",
    "One engine behavior measured in isolation.",
  ],
  ["spikes", "Spikes", "Experiments behind the plan's early decisions."],
];
