// Piecewise reference frames (frames 5b, Task 6) on synthetic frames: a stack
// moving at 1 m/s along X, a stage offset 10 m in it, and the stage's own path.
import { describe, expect, it } from "vitest";
import { FrameUnavailableError } from "../src/camera/frameResolver.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { frameVelocity } from "../src/frames/motion.ts";
import { framePoint } from "../src/frames/local.ts";
import { PiecewiseJumpError, piecewiseFrame } from "../src/frames/piecewise.ts";
import { pointAccuracy } from "../src/frames/pointAccuracy.ts";
import { identity } from "../src/math/mat4.ts";
import { Instant } from "../src/time/Instant.ts";

const CHANGE = 100;
const at = (t: number) => Instant.fromTdb(t);

function scene() {
  const catalog = createFrameCatalog();
  const root = catalog.get("ICRF");
  const moving = (name: string, parent: Frame, x: (t: number) => number) =>
    new Frame(
      name,
      parent,
      (i, out) => {
        identity(out);
        out[12] = x(i.tdb());
      },
      { cache: false, accuracy: { meters: 0.1, note: name } },
    );
  const stack = moving("stack", root, (t) => t);
  const offset = Frame.constant(
    "stage-in-stack",
    stack,
    Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1]),
    { accuracy: { meters: 0.2, note: "offset" } },
  );
  // The stage's own path, continuous with the stack's at CHANGE.
  const own = moving("own", root, (t) => t + 10);
  return { catalog, root, stack, offset, own, moving };
}

describe("piecewiseFrame", () => {
  it("is continuous at each change within its tolerance", () => {
    const { root, offset, own } = scene();
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: own, from: at(CHANGE) },
    ]);
    expect(stage.hub).toBe(root);
    expect(stage.changes).toHaveLength(1);
    const before = frameTransform(stage, root, at(50));
    const after = frameTransform(stage, root, at(150));
    expect(before[12]).toBeCloseTo(60, 9);
    expect(after[12]).toBeCloseTo(160, 9);
  });

  it("throws PiecewiseJumpError at an undeclared jump, with its size", () => {
    const { root, offset, moving } = scene();
    const far = moving("far", root, (t) => t + 15);
    let caught: unknown;
    try {
      piecewiseFrame("stage", [
        { frame: offset, from: at(0) },
        { frame: far, from: at(CHANGE) },
      ]);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PiecewiseJumpError);
    const e = caught as PiecewiseJumpError;
    expect(e.meters).toBeCloseTo(5, 6);
    expect(e.tolerance).toEqual({ meters: 0.01, metersPerSecond: 0.01 });
    const rest = moving("rest", root, () => 110);
    try {
      piecewiseFrame("stage", [
        { frame: offset, from: at(0) },
        { frame: rest, from: at(CHANGE) },
      ]);
    } catch (error) {
      caught = error;
    }
    expect((caught as PiecewiseJumpError).metersPerSecond).toBeCloseTo(1, 6);
  });

  it("accepts a jump the application declares", () => {
    const { root, offset, moving } = scene();
    const far = moving("far", root, (t) => t + 15);
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: far, from: at(CHANGE), jump: true },
    ]);
    expect(frameTransform(stage, root, at(150))[12]).toBeCloseTo(165, 9);
  });

  it("takes velocity within one piece next to a declared jump", () => {
    const { root, offset, moving } = scene();
    const far = moving("far", root, (t) => t + 1015);
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: far, from: at(CHANGE), jump: true },
    ]);
    // A central difference across the change read the 1 km jump as speed.
    expect(frameVelocity(stage, root, at(CHANGE + 0.25))[0]).toBeCloseTo(1, 6);
    expect(frameVelocity(stage, root, at(CHANGE - 0.25))[0]).toBeCloseTo(
      frameVelocity(offset, root, at(CHANGE - 0.25))[0]!,
      6,
    );
  });

  it("draws its parent per piece", () => {
    const { catalog, stack, offset, own, root } = scene();
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: own, from: at(CHANGE) },
    ]);
    catalog.add(stage);
    expect(stage.parentAt(at(50))).toBe(stack);
    expect(stage.parentAt(at(150))).toBe(own.parent);
    expect(
      catalog.treeInUse(at(50)).find((e) => e.frame === stage)!.parent,
    ).toBe(stack);
    const later = catalog.treeInUse(at(150));
    expect(later.find((e) => e.frame === stage)!.parent).toBe(root);
    expect(catalog.treeInUse().find((e) => e.frame === stage)!.parent).toBe(
      stage.hub,
    );
    // The current parent and its ancestors are listed.
    expect(catalog.treeInUse(at(50)).map((e) => e.frame)).toContain(stack);
  });

  it("at a change instant takes the later piece, and scrubbing back takes the earlier", () => {
    const { root, offset, own, stack } = scene();
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: own, from: at(CHANGE) },
    ]);
    expect(stage.pieceAt(at(CHANGE))!.frame).toBe(own);
    expect(stage.pieceAt(at(CHANGE - 1))!.frame).toBe(offset);
    // Distinguish the pieces: the later one rests at the origin offset.
    const rest = new Frame(
      "rest",
      root,
      (_i, out) => {
        identity(out);
        out[13] = 7;
      },
      { cache: false },
    );
    const marked = piecewiseFrame("marked", [
      { frame: offset, from: at(0) },
      { frame: rest, from: at(CHANGE), jump: true },
    ]);
    const seen: number[] = [];
    for (const t of [CHANGE, CHANGE - 1, CHANGE, CHANGE + 1, CHANGE - 1]) {
      const m = frameTransform(marked, root, at(t));
      seen.push(m[13]!);
      const parent = marked.parentAt(at(t));
      expect(parent).toBe(t >= CHANGE ? root : stack);
    }
    expect(seen).toEqual([7, 0, 7, 7, 0]);
  });

  it("throws FrameUnavailableError outside its pieces", () => {
    const { root, offset, own } = scene();
    const stage = piecewiseFrame(
      "stage",
      [
        { frame: offset, from: at(0) },
        { frame: own, from: at(CHANGE) },
      ],
      { until: at(200) },
    );
    for (const t of [-1, 200, 300]) {
      let caught: unknown;
      try {
        frameTransform(stage, root, at(t));
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(FrameUnavailableError);
      expect((caught as FrameUnavailableError).reason).toBe("outsideData");
    }
  });

  it("its revision doesn't change at a change, and goes up when a piece's input does", () => {
    const { offset, own, stack } = scene();
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: own, from: at(CHANGE) },
    ]);
    const r = stage.revision;
    frameTransform(stage, stage.hub, at(CHANGE - 1));
    frameTransform(stage, stage.hub, at(CHANGE));
    expect(stage.revision).toBe(r);
    stack.invalidate();
    expect(stage.revision).toBeGreaterThan(r);
  });

  it("a route across a simulated piece makes no accuracy claim and names it", () => {
    const { offset, own, root } = scene();
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0), simulated: true, note: "a simulated span" },
      { frame: own, from: at(CHANGE) },
    ]);
    const sim = pointAccuracy(framePoint(stage, [0, 0, 0], at(50)), root);
    expect(sim.meters).toBeUndefined();
    expect(sim.simulatedBy).toBe("stage");
    const real = pointAccuracy(framePoint(stage, [0, 0, 0], at(150)), root);
    expect(real.simulatedBy).toBeUndefined();
  });

  it("a route across a stated piece composes that piece's own edges", () => {
    const { offset, own, root } = scene();
    const stage = piecewiseFrame("stage", [
      { frame: offset, from: at(0) },
      { frame: own, from: at(CHANGE) },
    ]);
    const a = pointAccuracy(framePoint(stage, [0, 0, 0], at(50)), root);
    expect(a.terms.map((t) => t.frame)).toEqual(["stage-in-stack", "stack"]);
    expect(a.meters).toBeCloseTo(Math.hypot(0.2, 0.1), 12);
    const b = pointAccuracy(framePoint(stage, [0, 0, 0], at(150)), root);
    expect(b.terms.map((t) => t.frame)).toEqual(["own"]);
    expect(b.meters).toBeCloseTo(0.1, 12);
  });

  it("refuses a change it can't evaluate yet, with the reference frame's own error", () => {
    const { root, offset } = scene();
    const loading = new Frame(
      "loading",
      root,
      () => {
        throw new FrameUnavailableError("loading", "loading");
      },
      { cache: false },
    );
    expect(() =>
      piecewiseFrame("stage", [
        { frame: offset, from: at(0) },
        { frame: loading, from: at(CHANGE) },
      ]),
    ).toThrow(FrameUnavailableError);
  });

  it("refuses no pieces, unsorted pieces and pieces in different trees, naming it", () => {
    const { offset, own } = scene();
    expect(() => piecewiseFrame("S", [])).toThrow(/"S"/);
    expect(() =>
      piecewiseFrame("S", [
        { frame: offset, from: at(5) },
        { frame: own, from: at(5) },
      ]),
    ).toThrow(/"S"/);
    const elsewhere = Frame.constant(
      "elsewhere",
      Frame.root("OTHER"),
      identity(new Float64Array(16)),
    );
    expect(() =>
      piecewiseFrame("S", [
        { frame: offset, from: at(0) },
        { frame: elsewhere, from: at(5), jump: true },
      ]),
    ).toThrow(/"S"/);
  });
});
