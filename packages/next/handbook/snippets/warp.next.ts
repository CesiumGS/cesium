declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
declare const engine: import("@cesium/next").Engine;
// ---
import {
  blendWarps,
  createFrameCatalog,
  createFramesResolver,
  heightOffset,
  scaleAbout,
  verticalExaggeration,
  warpFrame,
  warpFromFunction,
  type WarpSpec,
} from "@cesium/next/frames";

// The common warps are one call each. This draws heights above the WGS84
// ellipsoid up to ten times as tall, and the slider is one float: at slider
// value s the heights are multiplied by 1 + s × (10 − 1).
const slider = world.createPlacementParameter(0, { range: [0, 1] });
const exaggeration = verticalExaggeration({ factor: 10, scale: slider });

// A reference frame whose edge to ITRF is the warp. The helper made its
// Jacobian, its inverse and its description (for reports).
const catalog = createFrameCatalog();
const exaggerated = warpFrame("exaggerated", catalog.get("ITRF"), exaggeration);
catalog.add(exaggerated);

// The camera rig sits on it. Nothing is set on any item.
engine.cameras.setResolver(world, createFramesResolver(catalog));
engine.cameras.setRig(view, {
  position: { frame: exaggerated },
  orientation: { kind: "free" },
});

slider.value = 0.4; // heights × 4.6

// Change a helper's inputs and say so: its routes refit, and anyone
// watching the frames hears of it.
exaggeration.factor = 20;

// More of them: lift everything 30 m, stretch east-west 2× about a point,
// blend two warps, or `reprojectionWarp(operation)` from "@cesium/next/proj"
// for a coordinate operation.
export const lifted = warpFrame(
  "lifted",
  catalog.get("ITRF"),
  heightOffset(30),
);
export const wide = scaleAbout([1_200_000, -4_800_000, 4_000_000], [2, 1, 1]);
export const between = blendWarps(wide, heightOffset(30), 0.5);

// Your own map, as a plain function from a point to a point in metres. The
// engine differentiates it (central differences, to about 1e-10) and
// inverts it by Newton; `changed()` after it behaves differently.
export const swirl = warpFromFunction(
  (p, out) => {
    const turn = 1e-8 * Math.hypot(p[0]!, p[1]!);
    out[0] = p[0]! * Math.cos(turn) - p[1]! * Math.sin(turn);
    out[1] = p[0]! * Math.sin(turn) + p[1]! * Math.cos(turn);
    out[2] = p[2]!;
  },
  { presentation: true, description: "swirl about the pole" },
);

// The advanced path: write the whole warp by hand. Here is the same
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
export const byHand: WarpSpec = {
  presentation: true,
  revision: 1,
  description: `height × ${K}`,
  scale: slider,
  forward: exaggerate,
};
// --- end
export { slider };
