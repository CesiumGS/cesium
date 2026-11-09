// Two-vector reference frames (frames 5b, Task 2) on synthetic frames.
import { describe, expect, it } from "vitest";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { FrameUnavailableError } from "../src/camera/frameResolver.ts";
import { angularVelocity, frameVelocity } from "../src/frames/motion.ts";
import {
  TwoVectorDegenerateError,
  axesAt,
  twoVectorFrame,
  type Axis,
  type VectorDefinition,
} from "../src/frames/twoVector.ts";
import { identity } from "../src/math/mat4.ts";
import { Instant } from "../src/time/Instant.ts";

const root = Frame.root("Root");
const at = Instant.fromTdb(100);
const constant = (v: number[], frame: Frame = root): VectorDefinition => ({
  kind: "constant",
  vector: v,
  frame,
});

/** Column `c` of a column-major matrix. */
const col = (m: Float64Array, c: number): number[] => [
  m[c * 4]!,
  m[c * 4 + 1]!,
  m[c * 4 + 2]!,
];
const close = (a: number[], b: number[], tol: number) =>
  a.forEach((x, i) => expect(Math.abs(x - b[i]!)).toBeLessThan(tol));

/** A reference frame turning about +Z at `rate` rad/s, and one moving on a circle. */
const spinning = (name: string, rate: number) =>
  new Frame(
    name,
    root,
    (i, out) => {
      identity(out);
      const a = rate * i.tdb();
      out[0] = Math.cos(a);
      out[1] = Math.sin(a);
      out[4] = -Math.sin(a);
      out[5] = Math.cos(a);
    },
    { cache: false },
  );
const orbiting = (name: string, radius: number, rate: number) =>
  new Frame(
    name,
    root,
    (i, out) => {
      identity(out);
      out[12] = radius * Math.cos(rate * i.tdb());
      out[13] = radius * Math.sin(rate * i.tdb());
    },
    { cache: false },
  );

describe("twoVectorFrame", () => {
  it("puts the primary axis along the primary vector and the secondary in their plane", () => {
    const f = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 2]) },
      secondary: { axis: "+X", vector: constant([1, 1, 0]) },
    });
    const m = f.toParent(at);
    const s = Math.SQRT1_2;
    close(col(m, 0), [s, s, 0], 1e-15);
    close(col(m, 1), [-s, s, 0], 1e-15);
    close(col(m, 2), [0, 0, 1], 1e-15);
  });

  it("gives a right-handed set for every legal pair of axes", () => {
    const axes: Axis[] = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];
    const u = [0.3, -0.5, 0.8];
    const s = [0.9, 0.2, -0.1];
    let pairs = 0;
    for (const p of axes) {
      for (const q of axes) {
        if (p[1] === q[1]) {
          continue;
        }
        pairs++;
        const m = twoVectorFrame("F", root, {
          primary: { axis: p, vector: constant(u) },
          secondary: { axis: q, vector: constant(s) },
        }).toParent(at);
        const c = [col(m, 0), col(m, 1), col(m, 2)];
        const det =
          c[0]![0]! * (c[1]![1]! * c[2]![2]! - c[1]![2]! * c[2]![1]!) -
          c[1]![0]! * (c[0]![1]! * c[2]![2]! - c[0]![2]! * c[2]![1]!) +
          c[2]![0]! * (c[0]![1]! * c[1]![2]! - c[0]![2]! * c[1]![1]!);
        expect(det).toBeCloseTo(1, 14);
        const pc = c["XYZ".indexOf(p[1]!)]!;
        const sign = p[0] === "-" ? -1 : 1;
        const n = Math.hypot(...u);
        const dot = (pc[0]! * u[0]! + pc[1]! * u[1]! + pc[2]! * u[2]!) / n;
        expect(dot * sign).toBeCloseTo(1, 14);
        const sc = c["XYZ".indexOf(q[1]!)]!;
        const side = sc[0]! * s[0]! + sc[1]! * s[1]! + sc[2]! * s[2]!;
        expect(side * (q[0] === "-" ? -1 : 1)).toBeGreaterThan(0);
      }
    }
    expect(pairs).toBe(24);
  });

  it("refuses the same or opposite axes, naming the reference frame", () => {
    expect(() =>
      twoVectorFrame("F", root, {
        primary: { axis: "+X", vector: constant([1, 0, 0]) },
        secondary: { axis: "-X", vector: constant([0, 1, 0]) },
      }),
    ).toThrow(/"F"/);
    expect(() =>
      twoVectorFrame("G", root, {
        primary: { axis: "+X", vector: constant([1, 0, 0]) },
        secondary: { axis: "+Y", vector: constant([0, 1, 0]) },
        minimumAngle: 0,
      }),
    ).toThrow(/"G"/);
  });

  it("throws TwoVectorDegenerateError below 1 mrad, and not above it", () => {
    const make = (angle: number) =>
      twoVectorFrame("F", root, {
        primary: { axis: "+X", vector: constant([1, 0, 0]) },
        secondary: {
          axis: "+Y",
          vector: constant([Math.cos(angle), Math.sin(angle), 0]),
        },
      });
    for (const bad of [0.0005, Math.PI - 0.0005]) {
      let caught: unknown;
      try {
        make(bad).toParent(at);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(TwoVectorDegenerateError);
      const e = caught as TwoVectorDegenerateError;
      expect(e.minimum).toBe(0.001);
      expect(e.frame).toBe("F");
      expect(e.message).toMatch(/degenerate/);
    }
    expect(Number.isFinite(make(0.0015).toParent(at)[0]!)).toBe(true);
    expect(() =>
      twoVectorFrame("Z", root, {
        primary: { axis: "+X", vector: constant([0, 0, 0]) },
        secondary: { axis: "+Y", vector: constant([0, 1, 0]) },
      }).toParent(at),
    ).toThrow(TwoVectorDegenerateError);
  });

  it("takes a velocity vector's derivative in its stated reference frame", () => {
    // A target on a 1,000 km circle at 1 rad per 1,000 s.
    const target = orbiting("T", 1e6, 1e-3);
    const f = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: {
        axis: "+X",
        vector: { kind: "velocity", target, observer: root, frame: root },
      },
    });
    const m = f.toParent(Instant.fromTdb(0));
    close(col(m, 0), [0, 1, 0], 1e-6);
    close(col(m, 1), [-1, 0, 0], 1e-6);
    // The same velocity taken in a frame turning twice as fast: the target
    // goes round the other way in its axes.
    const turning = spinning("S", 2e-3);
    const g = twoVectorFrame("G", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: {
        axis: "+X",
        vector: { kind: "velocity", target, observer: root, frame: turning },
      },
    });
    close(col(g.toParent(Instant.fromTdb(0)), 0), [0, -1, 0], 1e-6);
  });

  it("a frozen frame keeps its freeze instant's matrix, and re-freezes when an input's revision goes up", () => {
    const turning = spinning("S", 1e-3);
    const f = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: { axis: "+X", vector: constant([1, 0, 0], turning) },
      freeze: Instant.fromTdb(0),
    });
    const a = f.toParent(Instant.fromTdb(0));
    const b = f.toParent(Instant.fromTdb(5000));
    expect(Array.from(b)).toEqual(Array.from(a));
    const before = f.revision;
    turning.invalidate();
    expect(f.revision).toBeGreaterThan(before);
    close(col(f.toParent(Instant.fromTdb(5000)), 0), col(a, 0), 1e-15);
  });

  it("passes an input's own error through, never a matrix of NaNs", () => {
    const loading = new Frame(
      "Loading",
      root,
      () => {
        throw new FrameUnavailableError("Loading", "loading");
      },
      { cache: false },
    );
    const f = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: { axis: "+X", vector: constant([1, 0, 0], loading) },
    });
    expect(() => f.toParent(at)).toThrow(FrameUnavailableError);
    const g = twoVectorFrame("G", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: {
        axis: "+X",
        vector: { kind: "position", target: loading, observer: root },
      },
    });
    expect(() => g.toParent(at)).toThrow(/data is still loading/);
  });

  it("its revision includes its inputs' route revisions", () => {
    const input = new Frame("In", root, (_i, out) => void identity(out));
    const f = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: { axis: "+X", vector: constant([1, 0, 0], input) },
    });
    const r = f.revision;
    input.invalidate();
    expect(f.revision).toBe(r + 1);
    f.invalidate();
    expect(f.revision).toBe(r + 2);
  });

  it("is exact by definition unless the application states its accuracy", () => {
    const f = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: { axis: "+X", vector: constant([1, 0, 0]) },
    });
    expect(f.accuracy(at).byDefinition).toBe(true);
    const g = twoVectorFrame(
      "G",
      root,
      {
        primary: { axis: "+Z", vector: constant([0, 0, 1]) },
        secondary: { axis: "+X", vector: constant([1, 0, 0]) },
      },
      { accuracy: { radians: 1e-6, note: "stated" } },
    );
    expect(g.accuracy(at).radians).toBe(1e-6);
  });
});

describe("axesAt", () => {
  it("takes one reference frame's origin and another's axes", () => {
    const place = orbiting("P", 1e6, 0);
    const turning = spinning("S", 0.5);
    const f = axesAt("A", place, turning);
    const m = frameTransform(f, root, Instant.fromTdb(2));
    expect(m[12]).toBeCloseTo(1e6, 6);
    close(col(m, 0), [Math.cos(1), Math.sin(1), 0], 1e-14);
  });
});

describe("motion", () => {
  it("reports a spinning reference frame's angular velocity", () => {
    const turning = spinning("S", 1e-3);
    const w = angularVelocity(turning, root, at);
    // The central difference's truncation is (rate · 0.5 s)² / 6 of the rate.
    close(Array.from(w), [0, 0, 1e-3], 1e-10);
    const tv = twoVectorFrame("F", root, {
      primary: { axis: "+Z", vector: constant([0, 0, 1]) },
      secondary: { axis: "+X", vector: constant([1, 0, 0], turning) },
    });
    close(Array.from(angularVelocity(tv, root, at)), [0, 0, 1e-3], 1e-10);
  });

  it("reports an origin's velocity", () => {
    const v = frameVelocity(orbiting("T", 1e6, 1e-3), root, Instant.fromTdb(0));
    close(Array.from(v), [0, 1000, 0], 1e-3);
  });
});
