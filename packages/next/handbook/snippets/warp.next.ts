declare const world: import("@cesium/next").World;
declare const view: import("@cesium/next").View;
declare const engine: import("@cesium/next").Engine;
// ---
import {
  createFrameCatalog,
  createFramesResolver,
  warpFrame,
} from "@cesium/next/frames";

const R = 6_378_137;
const K = 10;

// The application's warp: height above a sphere, times K. The jacobian, when
// asked for, is ∂out/∂p column-major: selection reads it for the stretch.
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

// A reference frame whose edge to ITRF is the warp. The slider is a world's
// parameter, so moving it writes one float and refits nothing.
const slider = world.createPlacementParameter(0, { range: [0, 1] });
const catalog = createFrameCatalog();
const exaggerated = warpFrame("exaggerated", catalog.get("ITRF"), {
  presentation: true,
  revision: 1,
  description: `height × ${K}`,
  scale: slider,
  forward: exaggerate,
});
catalog.add(exaggerated);

// The camera rig sits on it. Nothing is set on any item.
engine.cameras.setResolver(world, createFramesResolver(catalog));
engine.cameras.setRig(view, {
  position: { frame: exaggerated },
  orientation: { kind: "free" },
});

slider.value = 0.4; // height × 4.6
// --- end
export { slider };
