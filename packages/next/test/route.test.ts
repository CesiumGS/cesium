import { describe, expect, it } from "vitest";
import {
  routeForward,
  routeInverse,
  routeIsRigid,
  warpInverse,
  type Route,
  type Warp,
} from "../src/camera/route.ts";

const itrf = { name: "ITRF" };
const drawn = { name: "exaggerated" };

/** z scaled by `k`, as an exaggeration over a flat reference. */
function heightScale(k: number): Warp {
  return {
    from: itrf,
    to: drawn,
    presentation: true,
    revision: 1,
    forward(p, out, jacobian) {
      out[0] = p[0]!;
      out[1] = p[1]!;
      out[2] = k * p[2]!;
      jacobian?.set([1, 0, 0, 0, 1, 0, 0, 0, k]);
      return out;
    },
  };
}

/** A smooth non-linear warp, inverted only by Newton. */
const swirl: Warp = {
  from: itrf,
  to: drawn,
  presentation: false,
  revision: 1,
  forward(p, out, jacobian) {
    const [x, y, z] = [p[0]!, p[1]!, p[2]!];
    out[0] = x + 0.1 * Math.sin(y);
    out[1] = y + 0.1 * x * x;
    out[2] = z + 0.05 * x * y;
    jacobian?.set([
      1,
      0.2 * x,
      0.05 * y,
      0.1 * Math.cos(y),
      1,
      0.05 * x,
      0,
      0,
      1,
    ]);
    return out;
  },
};

function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

describe("routes", () => {
  it("carries a point through rigid steps and a warp, and back", () => {
    const route: Route = {
      frame: { name: "site" },
      base: drawn,
      seconds: 0,
      steps: [
        { kind: "rigid", matrix: translation(10, 0, 100) },
        { kind: "warp", warp: heightScale(10), inverse: false },
        { kind: "rigid", matrix: translation(0, -5, 0) },
      ],
      presentation: true,
      revision: 1,
    };
    expect(routeIsRigid(route)).toBe(false);
    const q = routeForward(route, [1, 2, 3]);
    expect(Array.from(q)).toEqual([11, -3, 1030]);
    const p = routeInverse(route, q);
    expect(p[0]).toBeCloseTo(1, 12);
    expect(p[1]).toBeCloseTo(2, 12);
    expect(p[2]).toBeCloseTo(3, 9);
  });

  it("inverts a warp without an inverse by Newton", () => {
    const p = [0.7, -0.4, 2];
    const q = swirl.forward(p, new Float64Array(3));
    const back = warpInverse(swirl, q);
    for (let i = 0; i < 3; i++) {
      expect(back[i]).toBeCloseTo(p[i]!, 9);
    }
  });
});
