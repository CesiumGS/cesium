// A revision per reference frame: it goes up on invalidate() and on a new
// published accuracy, never with time; a route's revision sums its frames.
import { describe, expect, it } from "vitest";
import { Frame, routeRevision } from "../src/frames/Frame.ts";
import type { FrameAccuracy } from "../src/frames/frameAccuracy.ts";
import { identity } from "../src/math/mat4.ts";
import { Instant } from "../src/time/Instant.ts";

const root = Frame.root("Root");
const at = Instant.fromTt(0);

describe("frame revision", () => {
  it("goes up on invalidate, not with time", () => {
    const f = new Frame("F", root, (_i, out) => void identity(out));
    f.toParent(Instant.fromTt(0));
    f.toParent(Instant.fromTt(60));
    expect(f.revision).toBe(0);
    f.invalidate();
    expect(f.revision).toBe(1);
  });

  it("a cached reference frame recomputes after invalidate at the same instant", () => {
    let calls = 0;
    const f = new Frame("F", root, (_i, out) => {
      calls++;
      identity(out);
    });
    f.toParent(at);
    f.toParent(at);
    f.invalidate();
    f.toParent(at);
    expect(calls).toBe(2);
  });

  it("a subclass's revision getter keys the cache", () => {
    let calls = 0;
    class Driven extends Frame {
      n = 0;
      override get revision(): number {
        return this.n;
      }
    }
    const f = new Driven("D", root, (_i, out) => {
      calls++;
      identity(out);
    });
    f.toParent(at);
    f.n = 1;
    f.toParent(at);
    f.toParent(at);
    expect(calls).toBe(2);
  });

  it("invalidate drops the cache even when a subclass overrides revision", () => {
    let calls = 0;
    class Fixed extends Frame {
      override get revision(): number {
        return 5;
      }
    }
    const f = new Fixed("X", root, (_i, out) => {
      calls++;
      identity(out);
    });
    f.toParent(at);
    f.invalidate();
    f.toParent(at);
    expect(calls).toBe(2);
  });

  it("a route's revision sums the revisions along it", () => {
    const a = new Frame("A", root, (_i, out) => void identity(out));
    const b = new Frame("B", root, (_i, out) => void identity(out));
    const deep = new Frame("Deep", b, (_i, out) => void identity(out));
    a.invalidate();
    b.invalidate();
    b.invalidate();
    root.invalidate();
    expect(routeRevision(a, b)).toBe(3);
    expect(routeRevision(a, deep)).toBe(3);
    expect(routeRevision(deep, b)).toBe(0);
    expect(routeRevision(a, a)).toBe(0);
  });

  it("throws across trees, naming the frames", () => {
    const other = Frame.root("Other");
    expect(() => routeRevision(root, other)).toThrow(/routeRevision/);
  });
});

describe("publishedAccuracy", () => {
  const metres = (m: number) => ({ meters: m, note: "test" });
  const radians = (r: number) => ({ radians: r, note: "test" });
  const drifting = (figure: { value: FrameAccuracy }) =>
    new Frame("F", root, (_i, out) => void identity(out), {
      accuracy: () => figure.value,
    });

  it("publishes a drifting metre figure only past 1% or 1 mm", () => {
    const fig = { value: metres(0.1) };
    const f = drifting(fig);
    expect(f.publishedAccuracy(at).meters).toBe(0.1);
    expect(f.revision).toBe(0);
    fig.value = metres(0.1009);
    expect(f.publishedAccuracy(at).meters).toBe(0.1);
    expect(f.revision).toBe(0);
    fig.value = metres(0.1011);
    expect(f.publishedAccuracy(at).meters).toBe(0.1011);
    expect(f.revision).toBe(1);
  });

  it("uses 1% when that is above 1 mm", () => {
    const fig = { value: metres(100) };
    const f = drifting(fig);
    f.publishedAccuracy(at);
    fig.value = metres(100.9);
    expect(f.publishedAccuracy(at).meters).toBe(100);
    fig.value = metres(101.1);
    expect(f.publishedAccuracy(at).meters).toBe(101.1);
  });

  it("uses 1 mm at the equator as the floor for radians", () => {
    const fig = { value: radians(1e-9) };
    const f = drifting(fig);
    f.publishedAccuracy(at);
    fig.value = radians(1.1e-9); // 1.0e-10 apart, under 1.57e-10
    expect(f.publishedAccuracy(at).radians).toBe(1e-9);
    fig.value = radians(1.2e-9); // 2.0e-10 apart
    expect(f.publishedAccuracy(at).radians).toBe(1.2e-9);
    expect(f.revision).toBe(1);
  });

  it("publishes a metre figure moving while radians stays stated", () => {
    const fig = { value: { meters: 1, radians: 1e-6, note: "test" } };
    const f = drifting(fig);
    f.publishedAccuracy(at);
    fig.value = { meters: 1.5, radians: 1e-6, note: "test" };
    expect(f.publishedAccuracy(at).meters).toBe(1.5);
    expect(f.revision).toBe(1);
  });

  it("always publishes a change of kind", () => {
    const fig = { value: metres(0.1) as FrameAccuracy };
    const f = drifting(fig);
    f.publishedAccuracy(at);
    fig.value = radians(0.1);
    expect(f.publishedAccuracy(at).radians).toBe(0.1);
    fig.value = { note: "unstated" };
    expect(f.publishedAccuracy(at).radians).toBeUndefined();
    expect(f.revision).toBe(2);
  });

  it("returns the stated figure of a fixed frame without a bump", () => {
    const f = Frame.constant("C", root, new Float64Array(16), {
      accuracy: metres(2),
    });
    expect(f.publishedAccuracy(at).meters).toBe(2);
    expect(f.publishedAccuracy(at).meters).toBe(2);
    expect(f.revision).toBe(0);
  });
});
