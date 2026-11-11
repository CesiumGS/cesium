// Caps for clips (src/scene/world/caps.ts, plan §13.26 increment 8b): the
// planes of a clip set, b-rep caps drawn through `addBrep` under a bias, mesh
// caps cut per tile and cached, and the scheduler's throttle and budget.
import { beforeAll, describe, expect, it } from "vitest";
import { validateBrep } from "../src/brep/validate.ts";
import type { Engine } from "../src/scene/Engine.ts";
import {
  BrepCaps,
  CapScheduler,
  MeshCaps,
  biasedCapPlanes,
  invertSimilarity,
} from "../src/scene/world/caps.ts";
import { capPlanes, type ClipSet } from "../src/scene/world/clips.ts";
import type { MeshCapTile } from "../src/scene/world/meshCaps.ts";
import { boxBrep } from "./brepFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";

const FRAME = { name: "test" } as ClipSet["frame"];

describe("capPlanes", () => {
  it("a plane's cap is out of what is kept: along the normal, or against it", () => {
    const set: ClipSet = {
      frame: FRAME,
      shapes: [{ kind: "plane", point: [0, 0, 1], normal: [0, 0, 2] }],
    };
    const inside = capPlanes(set);
    expect("planes" in inside && inside.planes[0]!.normal).toEqual([0, 0, 2]);
    const outside = capPlanes({ ...set, keep: "outside" });
    expect("planes" in outside && outside.planes[0]!.normal).toEqual([
      0, 0, -2,
    ]);
    expect("planes" in inside && inside.planes[0]!.limits).toEqual([]);
  });

  it("a box is six planes, each limited to the other five, whatever is kept", () => {
    const set: ClipSet = {
      frame: FRAME,
      shapes: [{ kind: "box", center: [1, 2, 3], halfExtents: [1, 2, 3] }],
    };
    for (const keep of ["inside", "outside"] as const) {
      const planes = capPlanes({ ...set, keep });
      expect("planes" in planes).toBe(true);
      if ("planes" in planes) {
        expect(planes.planes).toHaveLength(6);
        for (const p of planes.planes) {
          expect(p.limits).toHaveLength(5);
          // Each limit keeps the box's inside (the normal points out of the box).
          for (const l of p.limits) {
            expect(l.normal.some((x) => Math.abs(x) === 1)).toBe(true);
          }
        }
        const top = planes.planes.find((p) => p.point[2] === 6)!;
        expect(top.normal[2]).toBe(keep === "inside" ? 1 : -1);
      }
    }
  });

  it("planes united are limited to the outside of the others, and intersected to the inside", () => {
    const planes: ClipSet["shapes"] = [
      { kind: "plane", point: [0, 0, 0], normal: [1, 0, 0] },
      { kind: "plane", point: [0, 0, 0], normal: [0, 1, 0] },
    ];
    const united = capPlanes({ frame: FRAME, shapes: planes });
    const crossed = capPlanes({
      frame: FRAME,
      shapes: planes,
      combine: "intersection",
    });
    expect("planes" in united && united.planes[0]!.limits[0]!.normal).toEqual([
      0, -1, 0,
    ]);
    expect("planes" in crossed && crossed.planes[0]!.limits[0]!.normal).toEqual(
      [0, 1, 0],
    );
  });

  it("a polygon's set is not built, and says why", () => {
    const set: ClipSet = {
      frame: FRAME,
      shapes: [
        {
          kind: "polygon",
          ring: [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        },
      ],
    };
    const planes = capPlanes(set);
    expect("unsupported" in planes && planes.unsupported).toMatch(/polygon/);
  });
});

describe("the bias", () => {
  it("moves each plane against its outward normal, and each limit against its own", () => {
    const [p] = biasedCapPlanes(
      [
        {
          point: [0, 0, 1],
          normal: [0, 0, 1],
          limits: [{ point: [2, 0, 0], normal: [1, 0, 0] }],
        },
      ],
      0.01,
    );
    expect(p!.point).toEqual([0, 0, 0.99]);
    expect(p!.limits[0]!.point).toEqual([1.99, 0, 0]);
  });

  it("inverts a rotation, translation and uniform scale", () => {
    const s = 2;
    const m = Float64Array.from([
      0,
      s,
      0,
      0,
      -s,
      0,
      0,
      0,
      0,
      0,
      s,
      0,
      5,
      6,
      7,
      1,
    ]);
    const { inverse, scale } = invertSimilarity(m);
    expect(scale).toBe(2);
    // m takes (1, 0, 0) to (5, 8, 7): the inverse brings it back.
    const q = [5, 8, 7];
    const back = [0, 1, 2].map(
      (r) =>
        inverse[r]! * q[0]! +
        inverse[4 + r]! * q[1]! +
        inverse[8 + r]! * q[2]! +
        inverse[12 + r]!,
    );
    expect(back[0]).toBeCloseTo(1, 12);
    expect(back[1]).toBeCloseTo(0, 12);
    expect(back[2]).toBeCloseTo(0, 12);
  });
});

describe("BrepCaps", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  const options = { maxDraws: 64, vertexBytes: 1 << 20, indexBytes: 1 << 20 };

  it("caps a box where a plane cuts it, lying a hair inside what is kept", () => {
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep() });
    expect(caps.dirty).toBe(false);
    caps.setClip({
      frame: FRAME,
      shapes: [{ kind: "plane", point: [0, 0, 1.5], normal: [0, 0, 1] }],
    });
    expect(caps.dirty).toBe(true);
    caps.rebuild();
    expect(caps.dirty).toBe(false);
    expect(caps.report.faces).toBe(1);
    expect(caps.report.area).toBeCloseTo(6, 3);
    expect(validateBrep(caps.capForm!)).toEqual([]);
    // The cap's plane is a bias (2e-5 of the size) below the clip's.
    const z = caps.capForm!.surfaceFrame[2]!;
    expect(z).toBeLessThan(1.5);
    expect(1.5 - z).toBeCloseTo(2e-5 * Math.hypot(2, 3, 4), 9);
    expect(caps.draw).toBeDefined();
    expect(caps.draw!.patches ?? caps.draw!.trimmed).toBeDefined();
    caps.dispose();
    expect(caps.draw).toBeUndefined();
  });

  it("keeping what is above makes a cap that faces down", () => {
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep() });
    caps.setClip({
      frame: FRAME,
      shapes: [{ kind: "plane", point: [0, 0, 1.5], normal: [0, 0, 1] }],
      keep: "outside",
    });
    caps.rebuild();
    const f = caps.capForm!.surfaceFrame;
    // x × y is the plane's normal: down, out of the kept region above.
    expect(f[3]! * f[7]! - f[4]! * f[6]!).toBeCloseTo(-1, 12);
    // The plane is a bias above the clip's.
    expect(f[2]!).toBeGreaterThan(1.5);
    caps.dispose();
  });

  it("a clip box inside the solid is six caps, one per side", () => {
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep() });
    caps.setClip({
      frame: FRAME,
      shapes: [
        { kind: "box", center: [1, 1.5, 2], halfExtents: [0.5, 0.5, 0.5] },
      ],
    });
    caps.rebuild();
    expect(caps.report.planes).toBe(6);
    expect(caps.report.faces).toBe(6);
    // Each cap is a hair smaller than a face of the clip box: the bias keeps its edges inside.
    expect(caps.report.area).toBeCloseTo(6, 2);
    caps.dispose();
  });

  it("follows the form's placement: a form scaled and moved into the frame", () => {
    const world = engine.createWorld(options);
    // The form in metres is drawn at twice the size, at x + 10.
    const m = Float64Array.from([
      2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 10, 0, 0, 1,
    ]);
    const caps = new BrepCaps(world, { form: boxBrep(), formToFrame: m });
    caps.setClip({
      frame: FRAME,
      shapes: [{ kind: "plane", point: [0, 0, 3], normal: [0, 0, 1] }],
    });
    caps.rebuild();
    expect(caps.report.faces).toBe(1);
    // The area is in the frame's units: 4 × the form's 6.
    expect(caps.report.area).toBeCloseTo(24, 2);
    // The caps' form stays in the form's own coordinates.
    expect(caps.capForm!.surfaceFrame[2]!).toBeCloseTo(1.5, 3);
    caps.dispose();
  });

  it("reports a set it cannot cap and makes nothing", () => {
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep() });
    caps.setClip({
      frame: FRAME,
      shapes: [
        {
          kind: "polygon",
          ring: [
            [0, 0],
            [3, 0],
            [3, 3],
          ],
        },
      ],
    });
    caps.rebuild();
    expect(caps.report.unsupported).toMatch(/polygon/);
    expect(caps.draw).toBeUndefined();
  });

  it("replaces its draws when the clip moves, and clears them when it goes", () => {
    const world = engine.createWorld(options);
    const caps = new BrepCaps(world, { form: boxBrep() });
    const at = (z: number): ClipSet => ({
      frame: FRAME,
      shapes: [{ kind: "plane", point: [0, 0, z], normal: [0, 0, 1] }],
    });
    caps.setClip(at(1));
    caps.rebuild();
    const first = caps.draw;
    caps.setClip(at(2));
    caps.rebuild();
    expect(caps.draw).not.toBe(first);
    expect(caps.capForm!.surfaceFrame[2]!).toBeGreaterThan(1.9);
    caps.setClip(at(9));
    caps.rebuild();
    expect(caps.draw).toBeUndefined();
    expect(caps.capForm).toBeUndefined();
    caps.setClip(undefined);
    caps.rebuild();
    expect(caps.report.planes).toBe(0);
  });

  it("styles a cap by the hook, in the language's place", () => {
    const world = engine.createWorld(options);
    const asked: unknown[] = [];
    const caps = new BrepCaps(world, {
      form: boxBrep(),
      style: (input) => {
        asked.push(input);
        return [0, 1, 0, 1];
      },
    });
    caps.setClip({
      frame: FRAME,
      shapes: [{ kind: "plane", point: [0, 0, 1], normal: [0, 0, 1] }],
    });
    caps.rebuild();
    expect(asked).toEqual([{ kind: "brep", feature: undefined }]);
  });
});

describe("the scheduler", () => {
  const item = (cost = 0) => {
    let dirty = true;
    return {
      builds: 0,
      get dirty() {
        return dirty;
      },
      changedAt: 0,
      dirtyAgain() {
        dirty = true;
      },
      rebuild(_budget: number) {
        const until = performance.now() + cost;
        while (performance.now() < until) {
          /* spin */
        }
        this.builds++;
        dirty = false;
        return true;
      },
    };
  };

  it("rebuilds what is out of date once, and not again until it changes", () => {
    const scheduler = new CapScheduler({ intervalMs: 0 });
    const a = item();
    scheduler.add(a);
    expect(scheduler.tick(0).rebuilt).toBe(1);
    expect(scheduler.tick(1).rebuilt).toBe(0);
    a.dirtyAgain();
    expect(scheduler.tick(2).rebuilt).toBe(1);
    expect(a.builds).toBe(2);
  });

  it("throttles an item whose clip keeps moving, and lets the last move land", () => {
    const scheduler = new CapScheduler({ intervalMs: 100 });
    const a = item();
    scheduler.add(a);
    expect(scheduler.tick(0).rebuilt).toBe(1);
    a.dirtyAgain();
    const early = scheduler.tick(40);
    expect(early.rebuilt).toBe(0);
    expect(early.pending).toBe(1);
    expect(scheduler.tick(120).rebuilt).toBe(1);
  });

  it("stops after the budget, leaving the rest for the next tick, with one always done", () => {
    const scheduler = new CapScheduler({ intervalMs: 0, budgetMs: 5 });
    const items = [item(8), item(8), item(8)];
    items.forEach((i) => scheduler.add(i));
    const first = scheduler.tick(0);
    expect(first.rebuilt).toBe(1);
    expect(first.pending).toBe(2);
    expect(scheduler.tick(1).rebuilt).toBe(1);
    expect(scheduler.tick(2).rebuilt).toBe(1);
    expect(items.map((i) => i.builds)).toEqual([1, 1, 1]);
  });
});

describe("MeshCaps", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });
  const options = { maxDraws: 64, vertexBytes: 1 << 20, indexBytes: 1 << 20 };

  /** A box's two halves (x < 0, x > 0) as two open tiles, outward winding. */
  function halves(feature = 0): MeshCapTile[] {
    const positions: number[] = [];
    const indices: number[] = [];
    const centroids: number[] = [];
    for (let a = 0; a < 3; a++) {
      for (const s of [-1, 1]) {
        const u = (a + 1) % 3;
        const v = (a + 2) % 3;
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const at = (p: number, q: number) => {
              const x = [0, 0, 0];
              x[a] = s;
              x[u] = -1 + p;
              x[v] = -1 + q;
              return x;
            };
            const corners = [
              at(i, j),
              at(i + 1, j),
              at(i + 1, j + 1),
              at(i, j + 1),
            ];
            if (s < 0) {
              corners.reverse();
            }
            const base = positions.length / 3;
            for (const c of corners) {
              positions.push(...c);
            }
            for (const t of [
              [0, 1, 2],
              [0, 2, 3],
            ]) {
              indices.push(base + t[0]!, base + t[1]!, base + t[2]!);
              centroids.push(
                (positions[(base + t[0]!) * 3]! +
                  positions[(base + t[1]!) * 3]! +
                  positions[(base + t[2]!) * 3]!) /
                  3,
              );
            }
          }
        }
      }
    }
    const take = (keep: (x: number) => boolean, id: string): MeshCapTile => ({
      id,
      revision: 1,
      positions: Float32Array.from(positions),
      indices: Uint32Array.from(
        centroids.flatMap((x, t) =>
          keep(x)
            ? [indices[t * 3]!, indices[t * 3 + 1]!, indices[t * 3 + 2]!]
            : [],
        ),
      ),
      featureIds: new Uint32Array(positions.length / 3).fill(feature),
    });
    return [take((x) => x < 0, "left"), take((x) => x >= 0, "right")];
  }

  const clip = (z: number): ClipSet => ({
    frame: FRAME,
    shapes: [{ kind: "plane", point: [0, 0, z], normal: [0, 0, 1] }],
  });

  it("assembles the caps across tiles and draws them", () => {
    const world = engine.createWorld(options);
    const caps = new MeshCaps(world, { name: "mesh caps" });
    const [left, right] = halves();
    caps.setTile(left!);
    caps.setClip(clip(0.3));
    caps.rebuild();
    // One half alone: a chain, drawn as a line, not filled.
    expect(caps.report.planes[0]!.openChains).toBe(1);
    expect(caps.report.planes[0]!.closedLoops).toBe(0);
    caps.setTile(right!);
    caps.rebuild();
    expect(caps.report.planes[0]!.closedLoops).toBe(1);
    expect(caps.report.planes[0]!.openChains).toBe(0);
    expect(caps.report.planes[0]!.elements[0]!.area).toBeCloseTo(4, 3);
    caps.dispose();
  });

  it("caches the cuts per tile, plane and revision, and cuts again only what changed", () => {
    const world = engine.createWorld(options);
    const caps = new MeshCaps(world);
    const [left, right] = halves();
    caps.setTile(left!);
    caps.setTile(right!);
    caps.setClip(clip(0.3));
    caps.rebuild();
    expect(caps.report.cut).toBe(2);
    caps.rebuild();
    expect(caps.report.cut).toBe(0);
    // A new revision of one tile.
    caps.setTile({ ...left!, revision: 2 });
    caps.rebuild();
    expect(caps.report.cut).toBe(1);
    // The clip moves: every tile is cut again.
    caps.setClip(clip(0.4));
    caps.rebuild();
    expect(caps.report.cut).toBe(2);
    // A tile that goes.
    caps.removeTile("right");
    caps.rebuild();
    expect(caps.report.cut).toBe(0);
    expect(caps.report.planes[0]!.closedLoops).toBe(0);
    caps.dispose();
  });

  it("cuts within a budget and draws when every tile has its cut", () => {
    const world = engine.createWorld(options);
    const caps = new MeshCaps(world);
    const tiles = halves();
    tiles.forEach((t) => caps.setTile(t));
    caps.setClip(clip(0.3));
    // No time at all: nothing is cut, and the caps are not up to date.
    expect(caps.rebuild(0)).toBe(false);
    expect(caps.report.pendingCuts).toBe(2);
    expect(caps.dirty).toBe(true);
    expect(caps.rebuild(Infinity)).toBe(true);
    expect(caps.report.pendingCuts).toBe(0);
    expect(caps.dirty).toBe(false);
  });

  it("styles each element by the hook, with an ID per element", () => {
    const world = engine.createWorld(options);
    const asked: number[] = [];
    const caps = new MeshCaps(world, {
      style: ({ feature }) => {
        asked.push(feature!);
        return feature === 5 ? [1, 0, 0, 1] : undefined;
      },
    });
    halves(5).forEach((t) => caps.setTile(t));
    caps.setClip(clip(0.3));
    caps.rebuild();
    expect(asked).toEqual([5]);
  });

  it("an unsupported set draws nothing and says why", () => {
    const world = engine.createWorld(options);
    const caps = new MeshCaps(world);
    halves().forEach((t) => caps.setTile(t));
    caps.setClip({
      frame: FRAME,
      shapes: [
        {
          kind: "polygon",
          ring: [
            [0, 0],
            [3, 0],
            [3, 3],
          ],
        },
      ],
    });
    caps.rebuild();
    expect(caps.report.unsupported).toMatch(/polygon/);
  });
});
