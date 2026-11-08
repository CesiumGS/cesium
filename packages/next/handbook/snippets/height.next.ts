import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
const deg = Math.PI / 180;

// Radians. Loads the most detailed tiles there,
// then casts on the GPU.
const [height] = await viewer.engine.sampleHeightMostDetailed(viewer.world, [
  { longitude: -75.6 * deg, latitude: 40.0 * deg },
]);
console.log(height);
