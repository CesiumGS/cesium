import type { ExampleInfo } from "./types.ts";

export type {
  ExampleContext,
  ExampleInfo,
  ExampleModule,
  ExampleRun,
} from "./types.ts";

/** The gallery's examples, in the order it lists them. */
export const EXAMPLES: ExampleInfo[] = [
  {
    id: "realtime-tracks",
    title: "Real-time tracks",
    description:
      "Up to 10 million vehicles from a simulated feed, moved and clamped to terrain on the GPU and drawn by a vector style: trucks up close, symbols from afar.",
    labels: ["Live points", "Vector styling", "Terrain"],
    globe: "terrain",
    load: () => import("./realtime-tracks/main.ts"),
    source: () =>
      import("./realtime-tracks/main.ts?raw").then((m) => m.default),
  },
  {
    id: "translucency",
    title: "Translucency: moments and exact",
    description:
      "Moment-based OIT and exact sorted per-pixel lists one above the other on one camera, over glass from nearly clear to nearly opaque, stacked, crossing and boxed, with sliders and each way's cost.",
    labels: ["Translucency", "Rendering"],
    globe: false,
    layout: "side",
    stackNarrow: true,
    load: () => import("./translucency/main.ts"),
    source: () => import("./translucency/main.ts?raw").then((m) => m.default),
  },
  {
    id: "night-sky",
    title: "Night sky: the observer",
    description:
      "Stars, the Milky Way and the sun, seen by an eye or by a camera at an exposure: change who is looking and the light stays the same. Each control says whether it is physics, a model of an eye or a lens, or a look.",
    labels: ["Sky", "Exposure", "Glare"],
    globe: "ellipsoid",
    layout: "side",
    stackNarrow: true,
    noWarningNotice: false,
    load: () => import("./night-sky/main.ts"),
    source: () => import("./night-sky/main.ts?raw").then((m) => m.default),
  },
  {
    id: "slang-playground",
    title: "Slang playground",
    description:
      "Write custom shader stages in Slang and see them on a model as you type: compiled in the page by the Slang WebAssembly build.",
    labels: ["Custom shading", "Slang"],
    globe: false,
    layout: "side",
    stackNarrow: true,
    load: () => import("./slang-playground/main.ts"),
    source: () =>
      import("./slang-playground/main.ts?raw").then((m) => m.default),
  },
  {
    id: "brep-first-look",
    title: "B-reps: a first look",
    description:
      "Nine exact CAD shapes as B-reps; a second scene with booleans made live by two kernels in WebAssembly, SMLib and Open CASCADE, side by side in one render form; and a third that imports real parts from NIST's STEP test models with Open CASCADE. Draw the faces on the GPU, diced per view to an error in pixels, or tessellate them on the CPU. Switch display modes, colour by surface kind, draw iso lines and normals, and pick a face for its exact point on the surface, or for which input of a boolean it came from.",
    labels: ["B-reps", "CAD"],
    globe: false,
    layout: "side",
    stackNarrow: true,
    // Its display-mode toolbar takes the view's top left.
    inspector: "bottom-left",
    load: () => import("./brep-first-look/main.ts"),
    source: () =>
      import("./brep-first-look/main.ts?raw").then((m) => m.default),
  },
  {
    id: "frames-explorer",
    title: "Frames and projections",
    description:
      "One frame tree, eleven real problems: each scenario builds its own tree, answers one question on the globe, and shows how sure it is and how that's checked.",
    labels: ["Frames", "Projections", "Measurement"],
    globe: "ellipsoid",
    layout: "side",
    // Its own "missing" item says when frame data didn't load.
    noWarningNotice: true,
    load: () => import("./frames-explorer/main.ts"),
    source: () =>
      import("./frames-explorer/main.ts?raw").then((m) => m.default),
  },
  {
    id: "design-globe",
    title: "Design coordinates on the globe",
    description:
      "A 50 km highway designed in California State Plane, placed rigidly at one anchor as most viewers do, then morphed into its reprojected placement, where every vertex is where the design means it; and sites in seven countries, each in its own CRS and height system.",
    labels: ["Engineering", "Projections", "3D Tiles"],
    globe: "terrain",
    layout: "side",
    panelTitle: "The story and its figures",
    stackNarrow: true,
    load: () => import("./design-globe/main.ts"),
    source: () => import("./design-globe/main.ts?raw").then((m) => m.default),
  },
  {
    id: "vertical-exaggeration",
    title: "Vertical exaggeration",
    description:
      "Everything drawn up to ten times as tall (globe, terrain, buildings, a model, pins) by one reference frame and a camera rig, with nothing set on any item. Picks and measurements go back through the map and report true heights.",
    labels: ["Terrain", "Frames", "Measurement"],
    globe: "terrain",
    load: () => import("./vertical-exaggeration/main.ts"),
    source: () =>
      import("./vertical-exaggeration/main.ts?raw").then((m) => m.default),
  },
];
