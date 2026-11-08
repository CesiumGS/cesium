import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
declare const tileset: import("@cesium/next").Tileset3D;
// ---
// When a tile's request starts.
// There's no event for a tile finishing yet.
tileset.events.on("request", ({ url, purpose }) => {
  console.log(purpose, url);
});

// The engine's errors, of any kind.
viewer.engine.onError((error) => {
  console.error(error.kind, error.message);
});
