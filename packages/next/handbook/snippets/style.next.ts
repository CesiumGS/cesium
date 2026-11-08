import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
import { FeatureStyle } from "@cesium/next";

// The same expressions, compiled for the GPU.
// Given when the tileset is added.
const tileset = await viewer.addTileset(
  { ion: 96188 },
  {
    style: new FeatureStyle({
      show: "${Height} > 10",
      color: {
        conditions: [
          ["${Height} > 100", "color('red')"],
          ["true", "color('white')"],
        ],
      },
    }),
  },
);
// --- end
export { tileset };
