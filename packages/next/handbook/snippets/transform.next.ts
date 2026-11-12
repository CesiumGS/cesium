declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
declare const left: import("@cesium/next").View;
declare const right: import("@cesium/next").View;
declare const engine: import("@cesium/next").Engine;
declare const earth: import("@cesium/next").AnchorHandle;
// ---
import {
  fromFunction,
  liveEdge,
  utmToGeographic,
  verticalExaggeration,
  type SmoothFrameSpec,
} from "@cesium/next";
import {
  createFrameCatalog,
  createFramesResolver,
  smoothFrame,
  switchFrame,
} from "@cesium/next/frames";

// A deformer is a node over the content it deforms. Its edge maps its own
// coordinates up to its parent's. This one multiplies heights above WGS84 by
// ten, and lifts by a constant above 12 km so that a satellite is moved, not
// stretched. The slider is one float: at s the heights are multiplied by
// 1 + s × (10 − 1).
const slider = world.createPlacementParameter(0, { range: [0, 1] });
const exaggeration = verticalExaggeration({
  factor: 10,
  ceiling: 12_000,
  scale: slider,
});

const catalog = createFrameCatalog();
const content = smoothFrame(
  "Earth content (exaggerated)",
  catalog.get("ITRF"),
  exaggeration,
);
catalog.add(content);

// Placement decides what is warped: bind the Earth's anchor to the node and
// its terrain, tilesets and models are drawn through the edge, with nothing
// set on any item. The camera stays at ITRF, and the Moon, which isn't under
// the node, is untouched.
const resolver = createFramesResolver(catalog);
engine.cameras.setResolver(world, resolver);
resolver.bindAnchor(earth, content);
engine.cameras.setRig(view, {
  position: { frame: catalog.get("ITRF") },
  orientation: { kind: "free" },
});

slider.value = 0.4; // heights × 4.6

// Same structure, different strengths: a view can hold its own value of the
// parameter. One float per view, nothing recompiled.
left.setParameter(slider, 0);
right.setParameter(slider, 1);

// Different structures: a switch node chooses its edge per view, like a
// variant set. Every view still sees a tree, so a pixel's route, and its
// pick, is unambiguous.
export const either = switchFrame("Plan or exaggerated", catalog.get("ITRF"), {
  byView: new Map([[left, "identity" as const]]),
  default: exaggeration,
});

// A built-in as a live edge, for content authored in a projected CRS: UTM
// 48S, run from the grid to geographic. The nodes above it carry the rest
// of the way to body-fixed metres.
export const grid = smoothFrame(
  "UTM 48S",
  catalog.get("ITRF"),
  liveEdge(utmToGeographic({ zone: 48, hemisphere: "south" }), {
    description: "transverse Mercator, grid to geographic",
  }),
);

// Your own map, as restricted JavaScript from a point and named parameters to
// a point in metres. The engine reads the source, never evaluating it, into
// the graph's IR: the Jacobian is exact, the draw is compiled, and the
// parameters are uniforms. A function outside the subset still works,
// fitted, and `compiled` and `fitReason` say so.
export const swirl = fromFunction(
  (p, params, out) => {
    const turn = params.rate! * Math.hypot(p[0]!, p[1]!);
    out[0] = p[0]! * Math.cos(turn) - p[1]! * Math.sin(turn);
    out[1] = p[0]! * Math.sin(turn) + p[1]! * Math.cos(turn);
    out[2] = p[2]!;
  },
  { params: { rate: 1e-8 }, description: "swirl about the pole" },
);
export const swirled = swirl.compiled;
swirl.setParams({ rate: 2e-8 });

// The advanced path: write the whole edge by hand, with its Jacobian
// ∂out/∂p (column-major) where it has an exact one. This is the same
// exaggeration about a sphere.
const R = 6_378_137;
const K = 10;
function exaggerate(
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const [x, y, z] = [p[0]!, p[1]!, p[2]!];
  const r = Math.hypot(x, y, z);
  const f = R + K * (r - R);
  out.set([(f * x) / r, (f * y) / r, (f * z) / r]);
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (K - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}
export const byHand: SmoothFrameSpec = {
  revision: 1,
  description: `height × ${K}`,
  scale: slider,
  forward: exaggerate,
};
// --- end
export { slider };
