import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
// Adding and loading are one step.
const tileset = await viewer.addTileset({ ion: 96188 });

// Frames it from above, without a flight.
viewer.zoomTo(tileset);
