import type { ExampleInfo } from "./types.ts";

export type { ExampleContext, ExampleInfo, ExampleModule } from "./types.ts";

/** The gallery's examples, in the order it lists them. */
export const EXAMPLES: ExampleInfo[] = [
  {
    id: "realtime-tracks",
    title: "Real-time tracks",
    description:
      "Up to 100,000 vehicles from a 10 Hz feed, moved and clamped to terrain on the GPU: trucks up close, symbols from afar.",
    labels: ["Tracks", "Terrain", "Custom shading"],
    globe: "terrain",
    load: () => import("./realtime-tracks/main.ts"),
    source: () =>
      import("./realtime-tracks/main.ts?raw").then((m) => m.default),
  },
];
