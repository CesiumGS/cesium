declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
declare const engine: import("@cesium/next").Engine;
declare const earth: import("@cesium/next").AnchorHandle;
// ---
import {
  blend,
  fromFunction,
  heightOffset,
  scaleAbout,
  verticalExaggeration,
  type SmoothFrameSpec,
} from "@cesium/next";
import {
  createFrameCatalog,
  createFramesResolver,
  smoothFrame,
} from "@cesium/next/frames";

// The common deformations are one call each. This draws heights above the
// WGS84 ellipsoid up to ten times as tall, and the slider is one float: at
// slider value s the heights are multiplied by 1 + s × (10 − 1).
const slider = world.createPlacementParameter(0, { range: [0, 1] });
const exaggeration = verticalExaggeration({ factor: 10, scale: slider });

// A deformer is a frame over the content it deforms: its edge to its parent
// maps its own coordinates up. Content placed in it keeps its true
// coordinates and is drawn through the edge; the camera stays at ITRF, and
// whatever is not under the frame (the Moon) is not touched.
const catalog = createFrameCatalog();
const content = smoothFrame(
  "Earth content (exaggerated)",
  catalog.get("ITRF"),
  exaggeration,
);
catalog.add(content);

// Place the Earth's content in it. Nothing is set on any item.
const resolver = createFramesResolver(catalog);
engine.cameras.setResolver(world, resolver);
resolver.bindAnchor(earth, content);
engine.cameras.setRig(view, {
  position: { frame: catalog.get("ITRF") },
  orientation: { kind: "free" },
});

slider.value = 0.4; // heights × 4.6

// A view can hold its own value of the slider: one float per view.
view.setParameter(slider, 1);

// Change a helper's inputs and say so: its routes refit, and anyone
// watching the frames hears of it.
exaggeration.factor = 20;

// More of them: lift everything 30 m, stretch east-west 2× about a point,
// blend two warps, or `reprojectionWarp(operation)` from "@cesium/next/proj"
// for a coordinate operation.
export const lifted = smoothFrame(
  "lifted",
  catalog.get("ITRF"),
  heightOffset(30),
);
export const wide = scaleAbout([1_200_000, -4_800_000, 4_000_000], [2, 1, 1]);
export const between = blend(wide, heightOffset(30), 0.5);

// Your own map, as a restricted-JavaScript function from a point (and named
// parameters) to a point in metres. The engine reads it into the transform
// graph's IR: its Jacobian is exact, it runs on the GPU in the draw's route,
// and the parameters are uniforms. A function outside the subset still
// works, fitted instead.
export const swirl = fromFunction(
  (p, params, out) => {
    const turn = params.rate! * Math.hypot(p[0]!, p[1]!);
    out[0] = p[0]! * Math.cos(turn) - p[1]! * Math.sin(turn);
    out[1] = p[0]! * Math.sin(turn) + p[1]! * Math.cos(turn);
    out[2] = p[2]!;
  },
  { params: { rate: 1e-8 }, description: "swirl about the pole" },
);

// The advanced path: write the whole edge by hand. Here is the same
// exaggeration about a sphere, with its Jacobian ∂out/∂p, column-major,
// which selection reads for the stretch. Do this for a map that has an
// exact Jacobian and needs no numerical one.
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
