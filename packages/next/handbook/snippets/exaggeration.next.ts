declare const engine: import("@cesium/next").Engine;
declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
declare const earth: import("@cesium/next").AnchorHandle;
// ---
import { verticalExaggeration } from "@cesium/next";
import {
  createFrameCatalog,
  createFramesResolver,
  smoothFrame,
} from "@cesium/next/frames";

// The exaggeration is a node over the content it exaggerates. Content placed
// in it keeps its true coordinates and is drawn through the node, so picks and
// measurements still return true heights. The camera stays at ITRF, and
// whatever isn't under the node (the Moon) is untouched.
const slider = world.createPlacementParameter(0.2, { range: [0, 1] });
const catalog = createFrameCatalog();
const exaggerated = smoothFrame(
  "Earth content (exaggerated)",
  catalog.get("ITRF"),
  verticalExaggeration({ factor: 10, ceiling: 9000, scale: slider }),
);
catalog.add(exaggerated);

const resolver = createFramesResolver(catalog);
engine.cameras.setResolver(world, resolver);
resolver.bindAnchor(earth, exaggerated);
engine.cameras.setRig(view, {
  position: { frame: catalog.get("ITRF") },
  orientation: { kind: "free" },
});

// One float, with nothing refitted: heights × 1 + 0.4 × (10 − 1).
slider.value = 0.4;

// A view can hold its own value: this one draws the true heights.
view.setParameter(slider, 0);
// --- end
