import { describe, expect, it } from "vitest";
import {
  routeForward,
  routeInverse,
  routeIsRigid,
  warpForward,
  warpInverse,
  withFrozenScales,
  withoutScales,
  type Route,
  type Warp,
} from "../src/camera/route.ts";

const content = { name: "content" };
const drawn = { name: "ITRF" };

/** z scaled by `k`, as an exaggeration over a flat reference. */
function heightScale(k: number): Warp {
  return {
    from: content,
    to: drawn,
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
  from: content,
  to: drawn,
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

describe("a warp's scale", () => {
  /** `heightScale(10)` at a live scale, with its own inverse when asked. */
  function scaled(scale: { value: number }, withInverse = false): Warp {
    return {
      ...heightScale(10),
      scale,
      ...(withInverse && {
        inverse(q: ArrayLike<number>, out: Float64Array) {
          out.set([q[0]!, q[1]!, q[2]! / 10]);
          return out;
        },
      }),
    };
  }

  const step = (warp: Warp, inverse = false): Route => ({
    frame: content,
    base: drawn,
    seconds: 0,
    steps: [{ kind: "warp", warp, inverse }],
    revision: 1,
  });

  it("is p + s·(forward(p) − p): the identity at 0, forward at 1", () => {
    const s = { value: 0 };
    const route = step(scaled(s));
    const p = [3, -2, 5];
    expect(Array.from(routeForward(route, p))).toEqual(p);
    s.value = 1;
    expect(Array.from(routeForward(route, p))).toEqual([3, -2, 50]);
    s.value = 0.5;
    // z + 0.5·(10z − z) = 5.5 z
    expect(Array.from(routeForward(route, p))).toEqual([3, -2, 27.5]);
    s.value = 3;
    expect(routeForward(route, p)[2]).toBeCloseTo(28 * 5, 12);
  });

  it("scales the Jacobian the same way: I + s(J − I)", () => {
    const s = { value: 0.25 };
    const j = new Float64Array(9);
    warpForward(scaled(s), [1, 2, 3], new Float64Array(3), j);
    expect(Array.from(j)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1 + 0.25 * 9]);
  });

  it("inverts at its scale, by its own inverse only at 1 and by Newton otherwise", () => {
    const s = { value: 1 };
    const warp = scaled(s, true);
    const p = [0.5, 1.5, -2];
    const q = warpForward(warp, p, new Float64Array(3));
    expect(Array.from(warpInverse(warp, q))).toEqual([0.5, 1.5, -0.2 * 10]);
    s.value = 0.4;
    const q2 = warpForward(warp, p, new Float64Array(3));
    const back = warpInverse(warp, q2);
    for (let i = 0; i < 3; i++) {
      expect(back[i]).toBeCloseTo(p[i]!, 12);
    }
    s.value = 0;
    expect(Array.from(warpInverse(warp, p))).toEqual(p);
  });

  it("routeForward and routeInverse follow it, and a snapshot or the unit route ignore later changes", () => {
    const s = { value: 0.5 };
    const route = step(scaled(s));
    const frozen = withFrozenScales(route);
    const unit = withoutScales(route);
    const p = [1, 2, 3];
    const at = routeForward(route, p);
    s.value = 1;
    expect(Array.from(routeForward(frozen, p))).toEqual(Array.from(at));
    expect(Array.from(routeForward(unit, p))).toEqual([1, 2, 30]);
    s.value = 0.5;
    const back = routeInverse(route, at);
    for (let i = 0; i < 3; i++) {
      expect(back[i]).toBeCloseTo(p[i]!, 12);
    }
  });

  it("refuses a scale that is not finite", () => {
    const route = step(scaled({ value: Number.NaN }));
    expect(() => routeForward(route, [1, 2, 3])).toThrow(/finite/);
  });
});
