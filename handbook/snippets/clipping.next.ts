declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
// ---
import type { ClipSet } from "@cesium/next";
import { createFrameCatalog } from "@cesium/next/frames";

// A clip belongs to the world, so it cuts every tileset, model and b-rep in
// it. It is named in a reference frame, and it keeps what is on the plane's
// negative side.
const itrf = createFrameCatalog().get("ITRF");
const section: ClipSet = {
  frame: itrf,
  shapes: [{ kind: "plane", point: [6_378_237, 0, 0], normal: [1, 0, 0] }],
  // What was cut stays as a ghost, instead of vanishing.
  effect: { kind: "translucent", alpha: 0.2 },
};
const clip = world.addClip(section);

// Each view opts in.
view.setClips([clip]);
// --- end
export { clip };
