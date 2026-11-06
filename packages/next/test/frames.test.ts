import { beforeAll, describe, expect, it } from "vitest";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import {
  convertPoint,
  eastNorthUpFrame,
  framePoint,
  worldTransformFrame,
} from "../src/frames/local.ts";
import { rotationPart, toParentMatrix } from "../src/frames/matrix.ts";
import { Instant } from "../src/time/Instant.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import { identity, invertAffine, multiply } from "../src/math/mat4.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { fakeEngine } from "./fakeGpu.ts";

const OMEGA = 1e-3;

function translation(x: number, y: number, z: number): Float64Array {
  const m = identity(new Float64Array(16));
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/** child -> parent for a frame spun about z by `angle`, origin at `origin`. */
function spinMatrix(angle: number, origin: number[]): Float64Array {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  // parent -> child rotation, row-major (a frame rotation about z).
  return toParentMatrix(
    [c, s, 0, -s, c, 0, 0, 0, 1],
    origin,
    new Float64Array(16),
  );
}

const root = Frame.root("R");
const spin = new Frame("spin", root, (instant, out) => {
  out.set(spinMatrix(OMEGA * instant.tt, [1e11, 0, 0]));
});
const arm = Frame.constant("arm", spin, translation(0, 6.4e6, 0));
const other = Frame.constant("other", root, translation(0, 0, 3.8e8));
const t1 = Instant.fromTt(1000);
const t2 = Instant.fromTt(5000);

function expectClose(a: ArrayLike<number>, b: ArrayLike<number>): void {
  for (let i = 0; i < 16; i++) {
    const tol = i >= 12 && i < 15 ? 1e-4 : 1e-15;
    expect(Math.abs(a[i]! - b[i]!)).toBeLessThanOrEqual(tol);
  }
}

describe("toParentMatrix", () => {
  it("maps a child point to the parent with Rᵀ plus the origin", () => {
    const m = toParentMatrix(
      [0, 1, 0, -1, 0, 0, 0, 0, 1],
      [10, 20, 30],
      new Float64Array(16),
    );
    const p = [m[0]! * 1 + m[12]!, m[1]! * 1 + m[13]!, m[2]! * 1 + m[14]!];
    expect(p).toEqual([10, 21, 30]);
  });
});

describe("rotationPart", () => {
  // A rotation about (1, 2, 2)/3 by 0.7 rad, row-major, by Rodrigues.
  const rotation = (() => {
    const [x, y, z] = [1 / 3, 2 / 3, 2 / 3];
    const c = Math.cos(0.7);
    const s = Math.sin(0.7);
    const t = 1 - c;
    return [
      t * x * x + c,
      t * x * y - s * z,
      t * x * z + s * y,
      t * x * y + s * z,
      t * y * y + c,
      t * y * z - s * x,
      t * x * z - s * y,
      t * y * z + s * x,
      t * z * z + c,
    ];
  })();
  /** A column-major Mat4 whose linear part is the row-major `l`. */
  const mat4Of = (l: readonly number[]): Float64Array => {
    const m = identity(new Float64Array(16));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        m[4 * col + row] = l[3 * row + col]!;
      }
    }
    m[12] = 7e10;
    return m;
  };
  const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
    Math.max(...Array.from({ length: 9 }, (_, i) => Math.abs(a[i]! - b[i]!)));

  it("recovers the rotation from eq. 11.19's scale and shear", () => {
    // R · (k I - ½ V Vᵀ / c²) with k = 1 - 2.5e-8 and |V|/c = 1e-4.
    const k = 1 - 2.5e-8;
    const b = [6e-5, -7e-5, 2e-5];
    const a = Array.from({ length: 9 }, (_, n) => {
      const i = Math.floor(n / 3);
      const j = n % 3;
      return (i === j ? k : 0) - 0.5 * b[i]! * b[j]!;
    });
    const l = Array.from({ length: 9 }, (_, n) => {
      const i = Math.floor(n / 3);
      const j = n % 3;
      return [0, 1, 2].reduce(
        (sum, m) => sum + rotation[3 * i + m]! * a[3 * m + j]!,
        0,
      );
    });
    expect(maxDiff(l, rotation)).toBeGreaterThan(2e-8);
    expect(maxDiff(rotationPart(mat4Of(l)), rotation)).toBeLessThan(1e-15);
  });

  it("leaves a pure rotation unchanged", () => {
    const out = new Float64Array(9);
    expect(rotationPart(mat4Of(rotation), out)).toBe(out);
    expect(maxDiff(out, rotation)).toBeLessThan(1e-15);
  });
});

describe("frameTransform", () => {
  it("composes through the common ancestor", () => {
    const m = frameTransform(arm, other, t1);
    const inv = invertAffine(new Float64Array(16), translation(0, 0, 3.8e8));
    const expected = multiply(
      new Float64Array(16),
      inv,
      multiply(
        new Float64Array(16),
        spinMatrix(OMEGA * t1.tt, [1e11, 0, 0]),
        translation(0, 6.4e6, 0),
      ),
    );
    expectClose(m, expected);
  });

  it("round-trips to the identity", () => {
    const ab = frameTransform(arm, other, t1);
    const ba = frameTransform(other, arm, t1);
    expectClose(
      multiply(new Float64Array(16), ab, ba),
      identity(new Float64Array(16)),
    );
  });

  it("is the identity from a frame to itself", () => {
    expectClose(frameTransform(arm, arm, t1), identity(new Float64Array(16)));
  });

  it("recomputes for a different instant (cache keyed by instant)", () => {
    const a = frameTransform(arm, root, t1);
    const b = frameTransform(arm, root, t2);
    const again = frameTransform(arm, root, t1);
    expect(Array.from(a)).not.toEqual(Array.from(b));
    expect(Array.from(again)).toEqual(Array.from(a));
  });

  it("does not serve a half-written cache entry after a compute throws", () => {
    const failing = new Frame("failing", root, (instant, out) => {
      out.set(translation(instant.tt, 0, 0));
      if (instant.tt === t2.tt) {
        out[12] = -1; // part of the matrix is written, then the compute fails
        throw new Error("no data");
      }
    });
    const first = failing.toParent(t1);
    expect(() => failing.toParent(t2)).toThrow("no data");
    expect(Array.from(failing.toParent(t1))).toEqual(Array.from(first));
  });

  it("throws across trees", () => {
    const r2 = Frame.root("R2");
    expect(() => frameTransform(arm, r2, t1)).toThrow(/no common ancestor/);
    expect(() => frameTransform(r2, arm, t1)).toThrow(/no common ancestor/);
  });

  it("composes through a frame whose toParent itself calls frameTransform", () => {
    // The per-level scratch guards exactly this: the inner calls must not
    // clobber the outer call's matrices.
    const inner = (instant: Instant, out: Float64Array): Float64Array =>
      multiply(
        out,
        frameTransform(arm, other, instant),
        frameTransform(other, spin, instant),
      );
    const reentrant = new Frame("reentrant", root, (instant, out) => {
      inner(instant, out);
    });
    const leaf = Frame.constant("leaf", reentrant, translation(1, 2, 3));
    const up = multiply(
      new Float64Array(16),
      inner(t1, new Float64Array(16)),
      translation(1, 2, 3),
    );
    const hand = multiply(
      new Float64Array(16),
      frameTransform(root, other, t1),
      up,
    );
    expectClose(frameTransform(leaf, other, t1), hand);
  });
});

describe("convertPoint", () => {
  it("converts at the point's own instant or none given, and throws otherwise", () => {
    const p = framePoint(arm, [1, 2, 3], t1);
    const direct = convertPoint(p, root);
    expect(direct.instant).toBe(t1);
    expect(convertPoint(p, root, t1).position).toEqual(direct.position);
    expect(() => convertPoint(p, root, t2)).toThrow(/instant/);
    expect(() => convertPoint(framePoint(arm, [1, 2, 3]), root)).toThrow(
      /no instant/,
    );
    const given = convertPoint(framePoint(arm, [1, 2, 3]), root, t2);
    expect(given.instant).toBe(t2);
  });
});

describe("frames in the world", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  it("worldTransformFrame follows setTransform at the same instant", () => {
    const world = engine.createWorld();
    const handle = world.addTransform(translation(100, 0, 0));
    const earth = Frame.root("ITRF");
    const placed = worldTransformFrame("placed", world, handle, earth);
    const p = framePoint(placed, [1, 0, 0], t1);
    expect(Array.from(convertPoint(p, earth).position)).toEqual([101, 0, 0]);
    world.setTransform(handle, translation(0, 500, 0));
    expect(Array.from(convertPoint(p, earth).position)).toEqual([1, 500, 0]);
  });

  it("eastNorthUpFrame's z axis is the ellipsoid normal", () => {
    const ellipsoid = Ellipsoid.WGS84;
    const earth = Frame.root("ITRF");
    const origin = ellipsoid.cartographicToCartesian(
      fromDegrees(-75, 40, 0),
      new Float64Array(3),
    );
    const enu = eastNorthUpFrame("enu", earth, ellipsoid, origin);
    const up = convertPoint(framePoint(enu, [0, 0, 1], t1), earth).position;
    const normal = ellipsoid.geodeticSurfaceNormal(
      origin,
      new Float64Array(3),
    )!;
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(up[i]! - origin[i]! - normal[i]!)).toBeLessThan(1e-8);
    }
    const m = frameTransform(enu, earth, t1);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(m[8 + i]! - normal[i]!)).toBeLessThan(1e-15);
    }
  });
});
