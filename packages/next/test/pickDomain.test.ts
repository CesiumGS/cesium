// Picks by domain point (plan §13.26, increment 5): what the pick variant
// writes (a mesh's triangle and barycentrics, a patch draw's face and (u, v))
// becomes the content's own point: a mesh's stored corners weighted by the
// barycentrics and carried by the draw's matrix, a b-rep face's exact point
// through `refinePick`; a warp that bends the draw moves where it is drawn,
// never the point. The GPU side is spikes/pickDomain.html; the engine runs on
// the fake device of test/fakeGpu.ts and the tests answer each pick's
// readbacks as the passes would (as test/corePick.test.ts does).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brepGeometry } from "../src/geometry/brep.ts";
import {
  FLAGS_WORD,
  PICK_RESULT_WORDS,
  PICK_SIZE,
  RECORD_WORDS,
  RecordFlags,
  TERRAIN_CLIP_WORD,
  writePickBlock,
} from "../src/render/layout.ts";
import { ViewLayout } from "../src/render/generated/layouts.ts";
import {
  standsInForTerrain,
  windowPlanes,
} from "../src/render/view/pickDomain.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Camera } from "../src/scene/Camera.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import {
  NO_DRAW,
  NO_TRIANGLE,
  readSample,
  resolveDomain,
  sampleHit,
  type DomainSample,
} from "../src/scene/pickDomain.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { cappedCylinderBrep } from "./brepFixtures.ts";
import { fakeEngine } from "./fakeGpu.ts";

const R = 6_378_137;
const WIDTH = 64;
const HEIGHT = 48;

let engine: Engine;
let world: World;
let earth: AnchorHandle;
let view: View;

const settle = () => new Promise((resolve) => setImmediate(resolve));

/** The result words of the pick variant's kernels (shaders/pickDomain.slang). */
function words(sample: {
  draw: number;
  feature: number;
  triangle: number;
  instance?: number;
  values: readonly [number, number, number, number];
  depth: number;
  corners?: ArrayLike<number>;
}): Uint32Array {
  const out = new Uint32Array(PICK_RESULT_WORDS);
  const f = new Float32Array(out.buffer);
  out[0] = sample.draw;
  out[1] = sample.feature;
  out[2] = sample.triangle;
  out[3] = sample.instance ?? 0;
  f.set(sample.values, 4);
  f[8] = sample.depth;
  if (sample.corners) {
    out[9] = 1;
    f.set(Array.from(sample.corners), 10);
  }
  return out;
}

/** A mesh draw's sample: `triangle` of the box, at `barycentrics`. */
function boxSample(
  draw: DrawHandle,
  feature: number,
  triangle: number,
  barycentrics: readonly [number, number, number],
  depth = 1e-3,
  instance = 0,
): { sample: DomainSample; mesh: ReturnType<typeof createBox> } {
  const mesh = createBox();
  const corners: number[] = [];
  for (let k = 0; k < 3; k++) {
    const v = mesh.indices[triangle * 3 + k]!;
    corners.push(...mesh.positions.subarray(v * 3, v * 3 + 3));
  }
  return {
    mesh,
    sample: readSample(
      words({
        draw: draw.index,
        feature,
        triangle,
        instance,
        values: [...barycentrics, 0],
        depth,
        corners,
      }),
    ),
  };
}

/** The global feature ID of `draw`'s first feature. */
function firstFeature(w: World, d: DrawHandle): number {
  for (let id = 1; id < 10_000; id++) {
    if (w.feature(id)?.draw.index === d.index) {
      return id;
    }
  }
  throw new Error("no feature for the draw");
}

/** The world's records, writable here (the tests set a record's words). */
const records = () => world.raster.recordsU32 as Uint32Array;

const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** Height over a sphere about the origin times `k`, along the radial (a warp). */
function exaggerate(k: number, p: ArrayLike<number>): number[] {
  const r = Math.hypot(p[0]!, p[1]!, p[2]!);
  const f = (R + k * (r - R)) / r;
  return [p[0]! * f, p[1]! * f, p[2]! * f];
}

beforeEach(async () => {
  vi.spyOn(performance, "now").mockImplementation(() => 1000);
  engine = await fakeEngine();
  world = engine.createWorld({ maxDraws: 16, vertexBytes: 1 << 20 });
  earth = world.bodyAnchor(EARTH);
  view = engine.addView({
    target: new OffscreenTarget(WIDTH, HEIGHT),
    world,
  });
});

afterEach(() => {
  engine.destroy();
  vi.restoreAllMocks();
});

describe("a pick variant's sample", () => {
  it("reads its words: the draw, the feature, the triangle, the barycentrics, the depth and the corners", () => {
    const sample = readSample(
      words({
        draw: 3,
        feature: 9,
        triangle: 5,
        instance: 2,
        values: [0.25, 0.5, 0.25, 0],
        depth: 0.5,
        corners: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      }),
    );
    expect(sample).toMatchObject({
      draw: 3,
      feature: 9,
      triangle: 5,
      instance: 2,
      values: [0.25, 0.5, 0.25, 0],
      depth: 0.5,
    });
    expect(Array.from(sample.corners!)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(sampleHit(sample)).toBe(true);
  });

  it("is no hit where nothing was drawn, and has no corners unless they were fetched", () => {
    const nothing = readSample(
      words({
        draw: NO_DRAW,
        feature: NO_DRAW,
        triangle: NO_TRIANGLE,
        values: [0, 0, 0, 0],
        depth: 0,
      }),
    );
    expect(sampleHit(nothing)).toBe(false);
    expect(nothing.corners).toBeUndefined();
  });
});

describe("a mesh's point", () => {
  it("is the stored triangle's corners weighted by the barycentrics, carried by the draw's matrix", () => {
    const origin = Float64Array.of(R, 1234.5, -987.25);
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin,
      parent: earth,
    });
    const feature = firstFeature(world, draw);
    // The weights as the GPU writes them: float32.
    const b: [number, number, number] = [0.2, 0.3, 0.5].map(Math.fround) as [
      number,
      number,
      number,
    ];
    const { sample, mesh } = boxSample(draw, feature, 2, b);
    const resolved = resolveDomain(sample, world, draw, 0)!;
    const corner = (k: number) => {
      const v = mesh.indices[2 * 3 + k]!;
      return Array.from(mesh.positions.subarray(v * 3, v * 3 + 3));
    };
    // The weights are put to sum to 1: the point is in the triangle's plane.
    const sum = b[0] + b[1] + b[2];
    const expected = [0, 1, 2].map(
      (i) =>
        origin[i]! +
        (b[0] * corner(0)[i]! + b[1] * corner(1)[i]! + b[2] * corner(2)[i]!) /
          sum,
    );
    expect(distance(resolved.position, expected)).toBeLessThan(1e-9);
    expect(resolved.domain).toEqual({
      draw,
      kind: "triangle",
      primitive: 2,
      barycentrics: b.map((w) => w / sum),
    });
    expect(resolved.accuracy.exact).toBe(false);
    expect(resolved.accuracy.route).toBe("stored triangle, barycentric");
    expect(resolved.accuracy.meters).toBeGreaterThan(0);
  });

  it("lies on the triangle's plane to float64 however the weights round", () => {
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
    });
    const feature = firstFeature(world, draw);
    // Weights as the rasterizer leaves them: summing to 1 within a float32.
    const { sample } = boxSample(draw, feature, 6, [
      Math.fround(0.123456789),
      Math.fround(0.654321),
      Math.fround(0.222222),
    ]);
    const c = sample.corners!;
    const resolved = resolveDomain(sample, world, draw, 0)!;
    const p = [0, 1, 2].map((i) => resolved.position[i]! - [R, 0, 0][i]!);
    const e1 = [0, 1, 2].map((i) => c[3 + i]! - c[i]!);
    const e2 = [0, 1, 2].map((i) => c[6 + i]! - c[i]!);
    const n = [
      e1[1]! * e2[2]! - e1[2]! * e2[1]!,
      e1[2]! * e2[0]! - e1[0]! * e2[2]!,
      e1[0]! * e2[1]! - e1[1]! * e2[0]!,
    ];
    const off = [0, 1, 2].reduce((s, i) => s + (p[i]! - c[i]!) * n[i]!, 0);
    expect(Math.abs(off) / Math.hypot(...n)).toBeLessThan(1e-12);
  });

  it("under a warp is the content's own point, not the drawn one: the warp's forward of it is where the surface is shown", () => {
    // A mesh 3 m above the sphere, drawn through height × 10: its vertices
    // are drawn at F(true), so a pixel there sees F(point on the triangle).
    // Nothing is inverted: the point is the corners weighted, whatever F.
    const origin = Float64Array.of(0, 0, R + 3);
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin,
      parent: earth,
    });
    const feature = firstFeature(world, draw);
    const b = [0.6, 0.1, 0.3].map(Math.fround) as [number, number, number];
    const { sample } = boxSample(draw, feature, 4, b);
    const resolved = resolveDomain(sample, world, draw, 0)!;
    const c = sample.corners!;
    const sum = b[0] + b[1] + b[2];
    const unwarped = [0, 1, 2].map(
      (i) =>
        origin[i]! + (b[0] * c[i]! + b[1] * c[3 + i]! + b[2] * c[6 + i]!) / sum,
    );
    expect(distance(resolved.position, unwarped)).toBeLessThan(1e-9);
    const drawn = exaggerate(10, resolved.position);
    // Drawn ten times as high: the true point is not the drawn one.
    const height = Math.hypot(...resolved.position) - R;
    expect(height).toBeGreaterThan(2);
    expect(distance(drawn, resolved.position)).toBeCloseTo(9 * height, 4);
    expect(Math.hypot(...drawn) - R).toBeCloseTo(10 * height, 4);
  });

  it("goes through an instance's matrix, then the draw's", () => {
    // Instance 1: scaled by 2 and moved 10 m along x.
    const matrices = [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 2, 0, 0, 0,
      0, 2, 0, 10, 0, 0, 1,
    ];
    const origin = Float64Array.of(R, 5, 6);
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin,
      parent: earth,
      instances: { matrices },
    });
    const feature = firstFeature(world, draw);
    const b: [number, number, number] = [0.5, 0.25, 0.25];
    const { sample } = boxSample(draw, feature, 1, b, 1e-3, 1);
    const resolved = resolveDomain(sample, world, draw, 0)!;
    const c = sample.corners!;
    const design = [0, 1, 2].map(
      (i) => b[0] * c[i]! + b[1] * c[3 + i]! + b[2] * c[6 + i]!,
    );
    const expected = [
      origin[0]! + 2 * design[0]! + 10,
      origin[1]! + 2 * design[1]!,
      origin[2]! + 2 * design[2]!,
    ];
    expect(distance(resolved.position, expected)).toBeLessThan(1e-9);
    expect(resolved.domain.instance).toBe(1);
  });

  it("is the depth's alone for a triangle whose corners weren't read, other content's hits, and weights that don't add up", () => {
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
    });
    const feature = firstFeature(world, draw);
    const read = (values: [number, number, number, number]) =>
      readSample(
        words({
          draw: draw.index,
          feature,
          triangle: 0,
          values,
          depth: 1e-3,
        }),
      );
    // No corners.
    expect(resolveDomain(read([0.2, 0.3, 0.5, 0]), world, draw, 0)).toBe(
      undefined,
    );
    // Not a hit on this draw.
    const { sample } = boxSample(draw, feature, 0, [0.2, 0.3, 0.5]);
    const other = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 20, 0),
      parent: earth,
    });
    expect(resolveDomain(sample, world, other, 0)).toBeUndefined();
    // Weights of nothing.
    const none = boxSample(draw, feature, 0, [0, 0, 0]).sample;
    expect(resolveDomain(none, world, draw, 0)).toBeUndefined();
    // A billboard's corners are offsets on screen, not a surface.
    records()[draw.index * RECORD_WORDS + FLAGS_WORD]! |= RecordFlags.billboard;
    expect(resolveDomain(sample, world, draw, 0)).toBeUndefined();
  });

  it("is accurate to the rasterizer's vertex snapping, 1/256 of a pixel's footprint, when that is more", () => {
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
    });
    const feature = firstFeature(world, draw);
    const { sample } = boxSample(draw, feature, 0, [0.2, 0.3, 0.5]);
    const fine = resolveDomain(sample, world, draw, 0, 0)!;
    const coarse = resolveDomain(sample, world, draw, 0, 0.5)!;
    expect(coarse.accuracy.meters).toBeCloseTo(0.5 / 256, 12);
    expect(coarse.accuracy.meters).toBeGreaterThan(fine.accuracy.meters);
  });
});

describe("a patch draw's point", () => {
  const origin = Float64Array.of(1000, -2000, 3000);

  it("is the face's exact point at the (u, v) the GPU wrote, from the b-rep behind the draw", () => {
    const form = cappedCylinderBrep();
    const brep = world.addBrep(form, { origin });
    const draw = brep.patches!;
    expect(draw).toBeDefined();
    const feature = firstFeature(world, draw);
    // Face 0 is the side: radius 1 about the axis z, (u, v) = (angle, height).
    // The GPU's (u, v) is the face rect's corner plus the pixel's from it.
    const sample = readSample(
      words({
        draw: draw.index,
        feature,
        triangle: NO_TRIANGLE,
        values: [0.1, 0.7, 1, 1],
        depth: 1e-3,
      }),
    );
    // (u, v) as the GPU's float32s give them.
    const u = Math.fround(0.1) + 1;
    const v = Math.fround(0.7) + 1;
    const resolved = resolveDomain(sample, world, draw, 0)!;
    expect(resolved).toBeDefined();
    const expected = [
      origin[0]! + Math.cos(u),
      origin[1]! + Math.sin(u),
      origin[2]! + v,
    ];
    expect(distance(resolved.position, expected)).toBeLessThan(1e-9);
    // On the cylinder to rounding, which a mesh through the same point could not be.
    expect(
      Math.hypot(
        resolved.position[0]! - origin[0]!,
        resolved.position[1]! - origin[1]!,
      ),
    ).toBeCloseTo(1, 12);
    expect(resolved.domain.kind).toBe("face");
    expect(resolved.domain.face).toBe(0);
    expect(resolved.domain.uv![0]).toBeCloseTo(u, 12);
    expect(resolved.domain.uv![1]).toBeCloseTo(v, 12);
    expect(resolved.accuracy.route).toBe("evaluation at the pick's (u, v)");
    // The geometry's own answer, carried by the draw.
    const refined = brepGeometry(form).refinePick(0, { uv: [u, v] })!;
    expect(
      distance(
        resolved.position,
        [0, 1, 2].map((i) => origin[i]! + refined.position[i]!),
      ),
    ).toBeLessThan(1e-9);
    expect(resolved.accuracy.exact).toBe(refined.accuracy.exact);
  });

  it("goes through the draw's matrix when the form is placed by a model", () => {
    const model = Float64Array.of(
      0,
      2,
      0,
      0,
      -2,
      0,
      0,
      0,
      0,
      0,
      2,
      0,
      50,
      60,
      70,
      1,
    );
    const brep = world.addBrep(cappedCylinderBrep(), { model });
    const draw = brep.patches!;
    const feature = firstFeature(world, draw);
    const sample = readSample(
      words({
        draw: draw.index,
        feature,
        triangle: NO_TRIANGLE,
        values: [0.5, 0.5, 0, 0],
        depth: 1e-3,
      }),
    );
    const resolved = resolveDomain(sample, world, draw, 0)!;
    // The form's point (cos 0.5, sin 0.5, 0.5), turned a quarter and doubled.
    const form = [Math.cos(0.5), Math.sin(0.5), 0.5];
    const expected = [
      50 + model[0]! * form[0]! + model[4]! * form[1]!,
      60 + model[1]! * form[0]! + model[5]! * form[1]!,
      70 + model[10]! * form[2]!,
    ];
    expect(distance(resolved.position, expected)).toBeLessThan(1e-9);
    expect(resolved.accuracy.meters).toBeGreaterThan(0);
  });

  it("is the depth's alone without a b-rep behind the draw, and a draw's source goes with it", () => {
    const brep = world.addBrep(cappedCylinderBrep(), { origin });
    const draw = brep.patches!;
    const feature = firstFeature(world, draw);
    const sample = readSample(
      words({
        draw: draw.index,
        feature,
        triangle: NO_TRIANGLE,
        values: [0.1, 0.1, 1, 1],
        depth: 1e-3,
      }),
    );
    expect(world.pickSource(draw)).toBeDefined();
    world.setPickSource(draw, undefined);
    expect(resolveDomain(sample, world, draw, 0)).toBeUndefined();
    const again = world.addBrep(cappedCylinderBrep(), { origin });
    const source = world.pickSource(again.patches!);
    expect(source).toBeDefined();
    expect(Array.from(source!.origin)).toHaveLength(3);
    world.removeBrep(again);
    expect(world.pickSource(again.patches!)).toBeUndefined();
  });
});

describe("the pick's window", () => {
  const camera = new Camera();
  camera.position.set([R + 1000, 0, 0]);
  camera.direction.set([-1, 0, 0]);
  camera.orient(Float64Array.of(0, 0, 1));
  const aspect = WIDTH / HEIGHT;
  const tanY = Math.tan(camera.fovy(aspect) / 2);
  const tanX = tanY * aspect;

  it("has the view's own planes when it is the whole view", () => {
    const own = camera.frustumPlanes(new Float64Array(20), aspect);
    const window = new Float64Array(20);
    windowPlanes(window, camera, tanX, tanY, [-1, 1, -1, 1]);
    for (let i = 0; i < 20; i++) {
      expect(window[i]!).toBeCloseTo(own[i]!, 12);
    }
  });

  it("holds the points of the window's pixels and nothing a pixel past it", () => {
    const px = 20;
    const py = 30;
    const cx = ((px + 0.5) / WIDTH) * 2 - 1;
    const cy = 1 - ((py + 0.5) / HEIGHT) * 2;
    const hx = PICK_SIZE / WIDTH;
    const hy = PICK_SIZE / HEIGHT;
    const planes = new Float64Array(20);
    windowPlanes(planes, camera, tanX, tanY, [
      cx - hx,
      cx + hx,
      cy - hy,
      cy + hy,
    ]);
    // A point `range` away along the ray of pixel (x, y).
    const along = (x: number, y: number, range: number) => {
      const nx = ((x + 0.5) / WIDTH) * 2 - 1;
      const ny = 1 - ((y + 0.5) / HEIGHT) * 2;
      return [0, 1, 2].map(
        (i) =>
          range *
          (camera.direction[i]! +
            nx * tanX * camera.right[i]! +
            ny * tanY * camera.up[i]!),
      );
    };
    const inside = (p: number[]) =>
      [0, 4, 8, 12, 16].every(
        (o) =>
          planes[o]! * p[0]! +
            planes[o + 1]! * p[1]! +
            planes[o + 2]! * p[2]! +
            planes[o + 3]! >=
          -1e-9,
      );
    // The picked pixel and the window's edges (PICK_SIZE pixels across, so
    // 1.5 each way from the pixel's centre).
    expect(inside(along(px, py, 100))).toBe(true);
    expect(inside(along(px + 1.4, py - 1.4, 100))).toBe(true);
    expect(inside(along(px - 1.4, py + 1.4, 100))).toBe(true);
    // Half a pixel past its edge each way.
    for (const [dx, dy] of [
      [2.1, 0],
      [-2.1, 0],
      [0, 2.1],
      [0, -2.1],
    ] as const) {
      expect(inside(along(px + dx, py + dy, 100)), `${dx}, ${dy}`).toBe(false);
    }
    // Before the near plane.
    expect(inside(along(px, py, 0.01))).toBe(false);
  });

  it("is written into the view block's shading-only fields, the masks as exact halves", () => {
    const block = new Float32Array(ViewLayout.size / 4);
    const planes = new Float32Array(20).fill(7);
    writePickBlock(
      block,
      planes,
      [0.25, -0.5, 0.05, 0.0625],
      0x80010002,
      0x00030004,
    );
    const at = ViewLayout.iblFrame / 4;
    expect(Array.from(block.subarray(at, at + 4))).toEqual(
      [0.25, -0.5, 0.05, 0.0625].map(Math.fround),
    );
    const half = (k: number) => block[at + 4 + k]!;
    expect((half(0) | (half(1) << 16)) >>> 0).toBe(0x80010002);
    expect((half(2) | (half(3) << 16)) >>> 0).toBe(0x00030004);
    expect(
      Array.from(
        block.subarray(ViewLayout.planes / 4, ViewLayout.planes / 4 + 20),
      ),
    ).toEqual(Array.from(planes));
  });
});

describe("terrain placed across a warp", () => {
  const domain = (stopsTerrain: boolean) => ({
    readback: {} as GPUBuffer,
    disposables: [],
    stopsTerrain,
    world,
  });

  it("is stood in for by the pass's hit where it is on terrain and nearer than the image's", () => {
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
    });
    const feature = firstFeature(world, draw);
    const { sample } = boxSample(draw, feature, 0, [0.2, 0.3, 0.5], 2e-3);
    // Not terrain: no regions on the record.
    expect(standsInForTerrain(domain(true), sample, 1e-3)).toBe(false);
    records()[draw.index * RECORD_WORDS + TERRAIN_CLIP_WORD] = 0b101;
    expect(standsInForTerrain(domain(true), sample, 1e-3)).toBe(true);
    // Reverse-Z: a greater depth is nearer. Farther than the image's: no.
    expect(standsInForTerrain(domain(true), sample, 3e-3)).toBe(false);
    // Only where the pass was asked to stand in (a warped globe's stops).
    expect(standsInForTerrain(domain(false), sample, 1e-3)).toBe(false);
  });
});

/** Answers each pick as the passes would: the image's feature and depth, and the pick variant's sample. */
function answerPicks(
  image: { featureId: number; depth: number },
  sample: () => ReturnType<typeof words> | undefined,
): void {
  const picks = engine.raster.picks;
  picks.push = (...items) => {
    for (const item of items) {
      const main = new Uint32Array(4);
      main[0] = image.featureId;
      new Float32Array(main.buffer)[1] = image.depth;
      const mapped = (buffer: ArrayBuffer) =>
        ({
          mapAsync: () => Promise.resolve(),
          getMappedRange: () => buffer.slice(0),
          unmap: () => {},
          destroy: () => {},
        }) as unknown as GPUBuffer;
      item.readback = mapped(main.buffer);
      const answer = sample();
      if (answer) {
        item.domain = {
          readback: mapped(answer.buffer as ArrayBuffer),
          disposables: [],
          stopsTerrain: false,
          world,
        };
      } else if (item.domain) {
        item.domain = {
          ...item.domain,
          readback: mapped(new ArrayBuffer(PICK_RESULT_WORDS * 4)),
        };
      }
    }
    return Array.prototype.push.apply(picks, items);
  };
}

describe("View.pickPoint with the pick variant", () => {
  const above = () => {
    const camera = new Camera();
    camera.position.set([R + 1000, 0, 0]);
    camera.direction.set([-1, 0, 0]);
    camera.orient(Float64Array.of(0, 0, 1));
    return camera;
  };

  async function pickAt() {
    const point = view.pickPoint(32, 24);
    for (let i = 0; i < 3; i++) {
      engine.renderFrame();
      await settle();
    }
    return (await point)!;
  }

  it("adds the domain, the true and drawn positions and the accuracy; the rest is as it was", async () => {
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
      name: "box",
    });
    const feature = firstFeature(world, draw);
    view.setCameraFromAnchor(earth, above());
    const depth = Math.fround(view.camera.near / 1000);
    const { sample } = boxSample(draw, feature, 3, [0.25, 0.25, 0.5], depth);
    answerPicks({ featureId: feature, depth }, () =>
      words({
        draw: draw.index,
        feature,
        triangle: 3,
        values: [0.25, 0.25, 0.5, 0],
        depth,
        corners: sample.corners!,
      }),
    );
    const pick = await pickAt();
    expect(pick.draw?.index).toBe(draw.index);
    expect(pick.domain).toMatchObject({
      kind: "triangle",
      primitive: 3,
      barycentrics: [0.25, 0.25, 0.5],
    });
    expect(pick.domain!.draw.index).toBe(draw.index);
    // The true point is the content's: its corners weighted, in the anchor's
    // coordinates; the drawn one is today's position, in render space.
    const c = sample.corners!;
    const expected = [
      R + 0.25 * c[0]! + 0.25 * c[3]! + 0.5 * c[6]!,
      0.25 * c[1]! + 0.25 * c[4]! + 0.5 * c[7]!,
      0.25 * c[2]! + 0.25 * c[5]! + 0.5 * c[8]!,
    ];
    expect(distance(pick.truePosition!.position, expected)).toBeLessThan(1e-6);
    expect(pick.truePosition!.frame).toBe(earth);
    expect(pick.drawnPosition!.position).toBe(pick.position);
    expect(pick.drawnPosition!.frame).toBe(world.root);
    expect(pick.accuracy!.exact).toBe(false);
    // What it was: the same fields, and the same values.
    expect(pick.anchor).toBe(earth);
    expect(pick.feature).toEqual({ featureId: feature, name: "box" });
    expect(Array.from(pick.anchorPosition)).toEqual(Array.from(pick.position));
  });

  it("adds nothing where the pass's hit isn't the image's draw and feature, or there was none", async () => {
    const draw = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 0, 0),
      parent: earth,
      name: "box",
    });
    const other = world.addDraw({
      mesh: world.addMesh(createBox()),
      origin: Float64Array.of(R, 30, 0),
      parent: earth,
      name: "other",
    });
    const feature = firstFeature(world, draw);
    view.setCameraFromAnchor(earth, above());
    const depth = Math.fround(view.camera.near / 1000);
    const { sample } = boxSample(draw, feature, 3, [0.25, 0.25, 0.5], depth);
    const behind = firstFeature(world, other);
    // The pass hit another draw (a sub-pixel difference at an edge).
    answerPicks({ featureId: feature, depth }, () =>
      words({
        draw: other.index,
        feature: behind,
        triangle: 0,
        values: [0.25, 0.25, 0.5, 0],
        depth,
        corners: sample.corners!,
      }),
    );
    let pick = await pickAt();
    expect(pick.draw?.index).toBe(draw.index);
    for (const key of ["domain", "truePosition", "drawnPosition", "accuracy"]) {
      expect(key in pick, key).toBe(false);
    }
    // It hit nothing.
    answerPicks({ featureId: feature, depth }, () => undefined);
    pick = await pickAt();
    expect(pick.draw?.index).toBe(draw.index);
    expect("domain" in pick).toBe(false);
  });
});
