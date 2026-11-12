import type { Viewer } from "../../widgets/index.ts";
declare const world: import("@cesium/next").World;
declare const viewer: Viewer;
declare const catalog: import("@cesium/next/frames").FrameCatalog;
declare const resolver: import("@cesium/next/frames").FramesResolver;
declare const geographicNode: import("@cesium/next/frames").Frame;
// ---
import { liveEdge, utmToGeographic } from "@cesium/next";
import { smoothFrame } from "@cesium/next/frames";

// A tileset authored in a projected CRS (here UTM 48S, EPSG:32748) is placed
// by that CRS's node, not by a mode. Its node's edge is the projection,
// run from the grid to geographic; the node above it takes geographic to
// body-fixed metres.
const utm48s = smoothFrame(
  "UTM 48S (grid E, N, height)",
  geographicNode,
  liveEdge(utmToGeographic({ zone: 48, hemisphere: "south" }), {
    description: "transverse Mercator, central meridian 105°E, scale 0.9996",
  }),
);
catalog.add(utm48s);

// Hang the tileset under it: an anchor bound to the node, and the root
// transform left out. The tiles' coordinates are then the CRS's own, and
// every vertex goes through the projection, exact at any distance.
const anchor = world.addAnchor("Port, UTM 48S");
resolver.bindAnchor(anchor, utm48s);
export const port = viewer.addTileset("https://example.com/port/tileset.json", {
  anchor,
  rootTransform: "none",
});
// --- end
