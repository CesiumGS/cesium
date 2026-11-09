// The accuracy composer beyond first order (frames 5b, Task 4), on synthetic reference frames.
import { describe, expect, it } from "vitest";
import {
  rotateCovariance,
  eigenSymmetric,
  symmetricSqrt,
} from "../src/frames/covariance.ts";
import { Frame } from "../src/frames/Frame.ts";
import {
  checkedAccuracy,
  type FrameAccuracy,
} from "../src/frames/frameAccuracy.ts";
import { framePoint } from "../src/frames/local.ts";
import {
  pointAccuracy,
  routeLegs,
  separationAccuracy,
} from "../src/frames/pointAccuracy.ts";
import { identity } from "../src/math/mat4.ts";
import { Instant } from "../src/time/Instant.ts";

const root = Frame.root("ROOT");
const at = Instant.fromTdb(0);
const place = (x: number, y: number, z: number): Float64Array => {
  const m = identity(new Float64Array(16));
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
};
/** A child at (x, y, z) in its parent, with the stated accuracy. */
const child = (
  name: string,
  parent: Frame,
  accuracy: FrameAccuracy,
  offset: [number, number, number] = [0, 0, 0],
) => Frame.constant(name, parent, place(...offset), { accuracy });
/** Turned 90 degrees about +Z, then placed. */
const turned = (name: string, parent: Frame, accuracy: FrameAccuracy) => {
  const m = place(0, 0, 0);
  m[0] = 0;
  m[1] = 1;
  m[4] = -1;
  m[5] = 0;
  return Frame.constant(name, parent, m, { accuracy });
};
const at0 = (frame: Frame, p: [number, number, number] = [0, 0, 0]) =>
  framePoint(frame, p, at);

describe("covariance helpers", () => {
  it("rotates, decomposes and takes square roots", () => {
    const c = [9, 0, 0, 0, 4, 0, 0, 0, 1];
    const r = [0, -1, 0, 1, 0, 0, 0, 0, 1];
    const out = rotateCovariance(c, r, new Float64Array(9));
    expect(Array.from(out)).toEqual(
      [4, 0, 0, 0, 9, 0, 0, 0, 1].map((v) => v + 0),
    );
    const e = eigenSymmetric([2, 1, 0, 1, 2, 0, 0, 0, 5]);
    expect(Array.from(e.values)).toEqual(
      [5, 3, 1].map((v) => expect.closeTo(v, 12)),
    );
    const s = symmetricSqrt([2, 1, 0, 1, 2, 0, 0, 0, 5], new Float64Array(9));
    // s · s = c
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let v = 0;
        for (let k = 0; k < 3; k++) {
          v += s[i * 3 + k]! * s[k * 3 + j]!;
        }
        expect(v).toBeCloseTo([2, 1, 0, 1, 2, 0, 0, 0, 5][i * 3 + j]!, 12);
      }
    }
  });
});

describe("pointAccuracy beyond first order", () => {
  it("today's inputs give today's numbers: a root sum square of metres and radian levers", () => {
    const a = child("A", root, { meters: 0.3, note: "a" });
    const b = child("B", a, { radians: 1e-6, note: "b" });
    const p = pointAccuracy(at0(b, [3000, 4000, 0]), root);
    expect(p.meters).toBe(Math.hypot(0.3, 1e-6 * 5000));
    expect(p.terms.map((t) => t.kind)).toEqual(["angular", "meters"]);
    expect(p.confidence).toBe("1σ");
  });

  it("an angle about a stated axis has the distance to the axis as its lever", () => {
    const f = child("F", root, { radians: 1e-6, axis: [0, 0, 1], note: "z" });
    const p = pointAccuracy(at0(f, [3000, 4000, 12000]), root);
    expect(p.meters).toBeCloseTo(0.005, 12);
    expect(p.terms[0]).toMatchObject({ kind: "angular", lever: 5000 });
  });

  it("two figures with one linear source add linearly; other ids root-sum-square", () => {
    const shared = (id: string): FrameAccuracy => ({
      radians: 1e-6,
      source: { id, rule: "linear" },
      note: "encoder",
    });
    const mk = (a: FrameAccuracy, b: FrameAccuracy) => {
      const f = child("F", root, {
        radians: 1e-12,
        parts: [a, b],
        note: "shaft",
      });
      return pointAccuracy(at0(f, [1000, 0, 0]), root).meters!;
    };
    // The 1e-12 base is negligible against 1 mm.
    expect(mk(shared("s"), shared("s"))).toBeCloseTo(0.002, 6);
    expect(mk(shared("s"), shared("t"))).toBeCloseTo(0.001 * Math.SQRT2, 6);
  });

  it("subtracts a linear source across opposite legs", () => {
    const f = child("F", root, {
      radians: 1e-6,
      source: { id: "s", rule: "linear" },
      note: "a",
    });
    const g = child("G", root, {
      radians: 1e-6,
      source: { id: "s", rule: "linear" },
      note: "b",
    });
    const same = separationAccuracy(
      at0(f, [1000, 0, 0]),
      at0(g, [1000, 0, 0]),
      at,
    );
    expect(same.meters).toBeCloseTo(0, 12);
    const h = child("H", root, {
      radians: 1e-6,
      source: { id: "u", rule: "linear" },
      note: "c",
    });
    const other = separationAccuracy(
      at0(f, [1000, 0, 0]),
      at0(h, [1000, 0, 0]),
      at,
    );
    expect(other.meters).toBeCloseTo(0.001 * Math.SQRT2, 9);
  });

  it("a difference source counts once across both legs, and is not stated on one leg", () => {
    const diff = (m: number): FrameAccuracy => ({
      meters: m,
      source: { id: "fit", rule: "difference" },
      note: "fit",
    });
    const a = child("A", root, diff(0.01));
    const b = child("B", root, diff(0.02));
    const both = separationAccuracy(at0(a), at0(b), at);
    expect(both.meters).toBeCloseTo(0.02, 12);
    const one = separationAccuracy(at0(a), at0(root), at);
    expect(one.meters).toBeUndefined();
    expect(one.refusedBy).toBe("A");
    expect(one.terms.at(-1)).toMatchObject({ kind: "refused" });
    expect(one.terms.at(-1)!.note).toMatch(/one leg only/);
  });

  it("converts a 95% normal figure and a uniform maximum, saying so", () => {
    const n = child("N", root, {
      meters: 1,
      confidence: "95%",
      distribution: "normal",
      note: "n",
    });
    const p = pointAccuracy(at0(n), root);
    expect(p.meters).toBeCloseTo(Math.sqrt(3) / 2.7955, 12);
    expect(p.terms[0]).toMatchObject({ confidence: "95%" });
    expect((p.terms[0] as { converted?: string }).converted).toMatch(
      /95% \(normal\) read as 1σ: × 0\.6196/,
    );
    const u = child("U", root, {
      meters: 1,
      confidence: "max",
      distribution: "uniform",
      note: "u",
    });
    expect(pointAccuracy(at0(u), root).meters).toBeCloseTo(
      Math.sqrt(3 / 5),
      12,
    );
    const r = child("R", root, {
      radians: 1e-3,
      confidence: "95%",
      distribution: "normal",
      note: "r",
    });
    expect(pointAccuracy(at0(r, [1000, 0, 0]), root).meters).toBeCloseTo(
      1 / 1.95996,
      9,
    );
  });

  it("refuses a 95% figure with no distribution, naming the edge", () => {
    const c = child("CHILD", root, {
      meters: 1,
      confidence: "95%",
      note: "c",
    });
    const p = pointAccuracy(at0(c), root);
    expect(p.meters).toBeUndefined();
    expect(p.refusedBy).toBe("CHILD");
    expect(p.terms.at(-1)!.kind).toBe("refused");
    expect(p.terms.at(-1)!.note).toMatch(/needs a distribution/);
  });

  it("refuses a hard maximum with no distribution beside 1σ edges", () => {
    const a = child("A", root, { meters: 0.1, note: "a" });
    const m = child("M", a, { meters: 1, confidence: "max", note: "m" });
    const p = pointAccuracy(at0(m), root);
    expect(p.meters).toBeUndefined();
    expect(p.refusedBy).toBe("M");
  });

  it("composes a covariance through each edge's rotation into an error ellipsoid", () => {
    const f = turned("F", root, {
      covariance: [9, 0, 0, 0, 4, 0, 0, 0, 1],
      note: "stated",
    });
    const p = pointAccuracy(at0(f), root);
    expect(
      Array.from(p.covariance!).map((v) => Math.round(v * 1e9) / 1e9),
    ).toEqual([4, 0, 0, 0, 9, 0, 0, 0, 1]);
    expect(Array.from(p.ellipsoid!.semiAxes).map((v) => +v.toFixed(9))).toEqual(
      [3, 2, 1],
    );
    // The longest semi-axis is along the parent's Y.
    expect(Math.abs(p.ellipsoid!.axes[3]!)).toBeCloseTo(1, 9);
    expect(p.meters).toBeCloseTo(Math.sqrt(14), 12);
  });

  it("gives a 95% bound as 2.7955 times the longest 1σ semi-axis", () => {
    const f = child("F", root, {
      covariance: [9, 0, 0, 0, 4, 0, 0, 0, 1],
      note: "s",
    });
    const p = pointAccuracy(at0(f), root, at, { confidence: "95%" });
    expect(p.confidence).toBe("95%");
    expect(p.meters).toBeCloseTo(2.7955 * 3, 12);
  });

  it("says when a term is a prediction, and when it is estimated", () => {
    const f = child("F", root, {
      radians: 1e-7,
      parts: [{ meters: 0.1, estimated: true, term: "estimate" }],
      predicted: true,
      note: "n",
    });
    const t = pointAccuracy(at0(f, [1000, 0, 0]), root).terms;
    expect(t[1]).toMatchObject({
      kind: "meters",
      estimated: true,
      term: "estimate",
    });
    expect(t[0]).toMatchObject({ kind: "angular", predicted: true });
  });

  it("adds route terms beside the edges' terms", () => {
    const f = child("F", root, { meters: 0.3, note: "f" });
    const p = pointAccuracy(at0(f), root, at, {
      routeTerms: [{ source: "lightTime", meters: 0.4, note: "t" }],
    });
    expect(p.meters).toBeCloseTo(0.5, 12);
    expect(p.terms.at(-1)).toMatchObject({ kind: "route", frame: "lightTime" });
    const unknown = pointAccuracy(at0(f), root, at, {
      routeTerms: [{ source: "pick", meters: undefined, note: "?" }],
    });
    expect(unknown.meters).toBeUndefined();
    expect(unknown.unboundedBy).toBe("pick");
  });

  it("a simulated edge makes no claim and names itself", () => {
    const f = child("SIM", root, { simulated: true, note: "simulated span" });
    const p = pointAccuracy(at0(f), root);
    expect(p.meters).toBeUndefined();
    expect(p.simulatedBy).toBe("SIM");
    expect(p.terms[0]!.kind).toBe("simulated");
    expect(() =>
      checkedAccuracy("X", { simulated: true, meters: 1, note: "x" }),
    ).toThrow(/X/);
  });

  it("separationAccuracy takes each leg's lever at its own end", () => {
    const a = child("A", root, { radians: 1e-6, note: "a" });
    const b = child("B", root, { radians: 1e-6, note: "b" });
    const s = separationAccuracy(
      at0(a, [1000, 0, 0]),
      at0(b, [3000, 0, 0]),
      at,
    );
    expect(s.meters).toBeCloseTo(1e-6 * Math.hypot(1000, 3000), 12);
    expect(s.terms.map((t) => (t as { lever?: number }).lever)).toEqual([
      1000, 3000,
    ]);
  });

  it("routeLegs lists each leg nearest its end first", () => {
    const a = child("A", root, { meters: 1, note: "a" });
    const b = child("B", a, { meters: 1, note: "b" });
    const c = child("C", root, { meters: 1, note: "c" });
    const d = child("D", c, { meters: 1, note: "d" });
    const legs = routeLegs(b, d, at);
    expect(legs.up.map((f) => f.name)).toEqual(["B", "A"]);
    expect(legs.down.map((f) => f.name)).toEqual(["D", "C"]);
  });

  it("checks axes, covariances and simulated figures when built", () => {
    expect(() =>
      child("X", root, { radians: 1, axis: [0, 0, 2], note: "x" }),
    ).toThrow(/"X".*unit/);
    expect(() =>
      child("X", root, { covariance: [1, 2, 0, 0, 1, 0, 0, 0, 1], note: "x" }),
    ).toThrow(/symmetric/);
    expect(() =>
      child("X", root, { covariance: [1, 0, 0, 0, -1, 0, 0, 0, 1], note: "x" }),
    ).toThrow(/semi-definite/);
    expect(() =>
      child("X", root, {
        covariance: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        meters: 5,
        note: "x",
      }),
    ).toThrow(/√trace/);
    expect(() =>
      child("X", root, {
        covariance: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        confidence: "95%",
        note: "x",
      }),
    ).toThrow(/1σ/);
  });

  it("publishedAccuracy publishes when any part moves past 1% or 1 mm", () => {
    let drift = 0.1;
    const f = new Frame("F", root, (_i, out) => void identity(out), {
      accuracy: () => ({
        radians: 1e-6,
        parts: [{ meters: drift }],
        note: "n",
      }),
    });
    f.publishedAccuracy(at);
    const r = f.revision;
    drift = 0.1005;
    f.publishedAccuracy(at);
    expect(f.revision).toBe(r);
    drift = 0.2;
    f.publishedAccuracy(at);
    expect(f.revision).toBe(r + 1);
  });
});
