import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
// Degrees, and metres from the point.
// The camera moves at once.
viewer.zoomTo({ longitude: -75.6, latitude: 40.0, range: 5000 });
