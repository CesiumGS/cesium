declare const engine: import("@cesium/next").Engine;
declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
declare const form: import("@cesium/next").BrepForm;
declare const queries: import("@cesium/next").GeometryQueries;
declare const pipe: import("@cesium/next").DrawHandle;
// ---
import {
  BrepCaps,
  CapScheduler,
  EARTH,
  type ClipSet,
  type QueryRay,
} from "@cesium/next";
import { createFrameCatalog } from "@cesium/next/frames";

// A section: keep what is below a level plane 100 m above the ellipsoid at
// longitude 0, latitude 0, named in ITRF. The clip belongs to the world, so it
// cuts every tileset, model and b-rep in it, and it moves with its frame.
const itrf = createFrameCatalog().get("ITRF");
const section: ClipSet = {
  frame: itrf,
  shapes: [{ kind: "plane", point: [6_378_237, 0, 0], normal: [1, 0, 0] }],
  keep: "inside",
};
const clip = world.addClip(section);

// A view opts in by mask. Another view of the same world still sees it whole.
view.setClips([clip]);

// A box or an extruded polygon, joined by union (the default) or intersection.
world.setClip(clip, {
  frame: itrf,
  shapes: [
    { kind: "box", center: [6_378_337, 0, 0], halfExtents: [100, 80, 60] },
    {
      kind: "polygon",
      ring: [
        [0, 0],
        [200, 0],
        [200, 120],
        [0, 120],
      ],
    },
  ],
  combine: "union",
  keep: "outside",
});

// The cut's cap, on the GPU: drawn every frame from the clips as they are, for
// each draw marked solid, so a dragged clip never leaves a frame without one.
view.clipCaps = { color: [0.78, 0.74, 0.68, 1], hatch: { spacing: 0.5 } };

// What a clip does with what it removes: here the ground over a pipe is a
// ghost at 30% instead of a hole, and the pipe, which the clip would also cut,
// is exempt.
world.setClip(clip, {
  frame: itrf,
  shapes: [
    { kind: "box", center: [6_378_337, 0, 0], halfExtents: [20, 20, 5] },
  ],
  effect: { kind: "translucent", alpha: 0.3 },
});
world.setClipExempt(pipe, true);

// An exact cap, for picks and measurement: geometry, drawn as a b-rep. It
// follows the clip: set the clip again when it moves, and tick the scheduler
// once a tick, which rebuilds within a budget (or in a worker) and no more than
// a few times a second while the clip is dragged.
const earth = world.bodyAnchor(EARTH);
const caps = new BrepCaps(world, { form, draw: { parent: earth } });
const scheduler = new CapScheduler();
scheduler.add(caps);
caps.setClip(section);
scheduler.tick();
export const unclosed = caps.report.section?.openChains; // chains that did not close

// A query says which clips it applies: the view's, a set, or none (a world
// question: distance, clearance, line of sight).
const ray: QueryRay = { from: [6_378_337, 0, 0], to: [6_377_937, 0, 0] };
export const throughTheCut = queries.rayHit(ray, {
  clips: engine.clipFilter(view),
});
export const wholeSolid = queries.rayHit(ray, {
  clips: engine.clipFilter(view, { clips: "none" }),
});
// --- end
