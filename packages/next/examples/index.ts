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
    load: () => import("./translucency/main.ts"),
    source: () => import("./translucency/main.ts?raw").then((m) => m.default),
  },
  {
    id: "slang-playground",
    title: "Slang playground",
    description:
      "Write custom shader stages in Slang and see them on a model as you type: compiled in the page by the Slang WebAssembly build.",
    labels: ["Custom shading", "Slang"],
    globe: false,
    layout: "side",
    load: () => import("./slang-playground/main.ts"),
    source: () =>
      import("./slang-playground/main.ts?raw").then((m) => m.default),
  },
];
