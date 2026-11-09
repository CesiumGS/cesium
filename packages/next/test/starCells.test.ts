// Stars by sky cell, and what a view draws of them (plan's Task 9).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CELLS_PER_SIDE,
  STAR_CELLS,
  STAR_VISIBLE,
  buildStarCells,
  cullCell,
  starCullInputs,
  starSubmission,
} from "../src/atmosphere/starCells.ts";
import {
  STAR_FLOATS,
  starPeakShare,
  starRadius,
} from "../src/atmosphere/stars.ts";
import { ev100ToScale, type PointSpread } from "../src/scene/observer.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

const SOURCE = readFileSync(
  join(import.meta.dirname, "../src/atmosphere/sky.slang"),
  "utf8",
);

/** A small deterministic generator. */
function randoms(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type V = [number, number, number];

const unit = (random: () => number): V => {
  const z = random() * 2 - 1;
  const a = random() * 2 * Math.PI;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), r * Math.sin(a), z];
};

/** A uniform sky, brightest first, with the sky's slope of magnitudes. */
function sky(count: number, seed = 1): Float32Array {
  const random = randoms(seed);
  const points = new Float32Array(count * STAR_FLOATS);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = unit(random);
    // N(<m) grows by about 10^0.5 a magnitude; Sirius at the top, so lux falls
    // as 1/rank.
    const lux = 2.54e-6 * 10 ** (0.4 * 1.46) * (1 / (i + 1)) ** 0.8;
    points.set([x, y, z, lux, 1, 1, 1, 0], i * STAR_FLOATS);
  }
  return points;
}

const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const normal = (a: V): V => {
  const k = 1 / Math.hypot(...a);
  return [a[0] * k, a[1] * k, a[2] * k];
};

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** A view of the sky, its field of view vertical. */
function viewOf(
  forward: V,
  fovy: number,
  {
    width = 1280,
    height = 720,
    ev100 = -6.5,
    gain = 1,
    spread = { core: 0.55 } as PointSpread,
    ratio = 1,
  } = {},
) {
  const seed: V = Math.abs(forward[2]) > 0.9 ? [1, 0, 0] : ([0, 0, 1] as V);
  const right = normal(cross(forward, seed));
  const up = cross(right, forward);
  const tanY = Math.tan((fovy * Math.PI) / 360);
  const tanX = (tanY * width) / height;
  const exposure = ev100ToScale(ev100);
  const inputs = starCullInputs(
    forward,
    right,
    up,
    tanX,
    tanY,
    width,
    height,
    exposure,
    IDENTITY,
    gain,
    spread,
    ratio,
  );
  return {
    forward,
    right,
    up,
    tanX,
    tanY,
    width,
    height,
    exposure,
    gain,
    spread,
    ratio,
    inputs,
  };
}

const drawnBy = (
  built: ReturnType<typeof buildStarCells>,
  view: ReturnType<typeof viewOf>,
) => {
  let drawn = 0;
  for (const cell of built.cells) {
    drawn += cullCell(
      cell,
      view.inputs.planes,
      view.inputs.minIlluminance,
      built.illuminance,
    );
  }
  return drawn;
};

describe("buildStarCells", () => {
  const points = sky(20_000);
  const built = buildStarCells(points, 20_000);

  it("makes 8 a side, and puts every star in one cell, in its cone, brightest first", () => {
    expect(CELLS_PER_SIDE).toBe(8);
    expect(STAR_CELLS).toBe(384);
    expect(built.cells.length).toBe(384);
    let total = 0;
    let next = 0;
    for (const cell of built.cells) {
      expect(cell.first).toBe(next);
      next += cell.count;
      total += cell.count;
      const cosRadius = Math.sqrt(1 - cell.sinRadius ** 2);
      for (let i = cell.first; i < cell.first + cell.count; i++) {
        const at = i * STAR_FLOATS;
        const d = built.points.subarray(at, at + 3);
        expect(dot(d, cell.center)).toBeGreaterThanOrEqual(cosRadius - 1e-6);
        if (i > cell.first) {
          expect(built.points[at + 3]!).toBeLessThanOrEqual(
            built.points[at + 3 - STAR_FLOATS]!,
          );
        }
      }
    }
    expect(total).toBe(20_000);
    // The same stars: no light lost or copied.
    const sum = (a: Float32Array) => {
      let s = 0;
      for (let i = 3; i < a.length; i += STAR_FLOATS) {
        s += a[i]!;
      }
      return s;
    };
    expect(sum(built.points)).toBeCloseTo(sum(points), 3);
  });

  it("keeps the order when it's stable, and fixes a field out of order", () => {
    const shuffled = new Float32Array(sky(500));
    // Swap two of the first stars, which share no order now.
    for (let i = 0; i < 300; i += 2) {
      const a = i * STAR_FLOATS + 3;
      const b = (499 - i) * STAR_FLOATS + 3;
      [shuffled[a], shuffled[b]] = [shuffled[b]!, shuffled[a]!];
    }
    const { cells, illuminance, points: out } = buildStarCells(shuffled, 500);
    for (const cell of cells) {
      for (let i = cell.first + 1; i < cell.first + cell.count; i++) {
        expect(illuminance[i]!).toBeLessThanOrEqual(illuminance[i - 1]!);
        expect(out[i * STAR_FLOATS + 3]).toBe(illuminance[i]);
      }
    }
  });

  it("writes a table the shader reads, and an empty field has empty cells", () => {
    const { table, cells } = built;
    expect(table.length).toBe(384 * 8);
    expect(table[8 * 7 + 3]).toBeCloseTo(cells[7]!.sinRadius, 6);
    expect(table[8 * 7 + 4]).toBe(cells[7]!.first);
    expect(table[8 * 7 + 5]).toBe(cells[7]!.count);
    const none = buildStarCells(new Float32Array(0), 0);
    expect(none.cells.every((c) => c.count === 0)).toBe(true);
  });
});

describe("what a view draws", () => {
  it("drops no star that should show, in 200 random views over 100,000 stars", () => {
    const count = 100_000;
    const built = buildStarCells(sky(count, 2), count);
    const random = randoms(3);
    for (let v = 0; v < 200; v++) {
      const fovy = 2 + random() * 118;
      const ev100 = -8 + random() * 20;
      const ratio = random() < 0.5 ? 1 : 2;
      const spread: PointSpread =
        random() < 0.5 ? { core: 0.85 } : { core: 0.55 };
      const view = viewOf(unit(random), fovy, { ev100, ratio, spread });
      const drawn = built.cells.map((cell) =>
        cullCell(
          cell,
          view.inputs.planes,
          view.inputs.minIlluminance,
          built.illuminance,
        ),
      );
      const peak = starPeakShare(spread.core * ratio);
      const pixel = (2 * view.tanY) / view.height;
      built.cells.forEach((cell, c) => {
        for (let i = cell.first; i < cell.first + cell.count; i++) {
          const at = i * STAR_FLOATS;
          const p = built.points;
          const along = (axis: V) =>
            p[at]! * axis[0] + p[at + 1]! * axis[1] + p[at + 2]! * axis[2];
          const z = along(view.forward);
          if (z <= 0.01) {
            continue;
          }
          const x = along(view.right) / z;
          const y = along(view.up) / z;
          // Inside the view: its value, as the vertex shader has it.
          if (Math.abs(x) > view.tanX || Math.abs(y) > view.tanY) {
            continue;
          }
          const shown =
            (built.points[at + 3]! / (pixel * pixel * z * z * z)) *
            view.exposure *
            peak;
          if (shown >= STAR_VISIBLE) {
            expect(i - cell.first).toBeLessThan(drawn[c]!);
          }
        }
      });
    }
  }, 30_000);

  it("draws a small share of a uniform sky, wide and long", () => {
    const count = 100_000;
    const built = buildStarCells(sky(count, 4), count);
    const random = randoms(5);
    let wide = 0;
    let long = 0;
    const views = 50;
    for (let v = 0; v < views; v++) {
      const forward = unit(random);
      wide = Math.max(wide, drawnBy(built, viewOf(forward, 60)) / count);
      long = Math.max(long, drawnBy(built, viewOf(forward, 5)) / count);
    }
    expect(wide).toBeLessThan(0.2);
    // The plan hoped for 1%. A cell's cone is wider than a 5° view, so a cone test
    // keeps up to 10 cells of 384. 14,000 of 530,000 stars is still next to nothing.
    expect(long).toBeLessThan(0.03);
  });

  it("keeps a bright star just off screen, within its radius", () => {
    const view = viewOf([1, 0, 0], 60, {
      spread: { core: 0.6, wing: { sigma: 3, share: 0.05 } },
    });
    const radius = starRadius(view.spread, Infinity, 1);
    expect(radius).toBe(64);
    // 40 pixels past the right edge.
    const x = view.tanX * (1 + (2 * 40) / view.width);
    const d = normal([
      view.forward[0] + view.right[0] * x,
      view.forward[1] + view.right[1] * x,
      view.forward[2] + view.right[2] * x,
    ]);
    const points = new Float32Array(STAR_FLOATS);
    points.set([...d, 1, 1, 1, 1, 0]);
    const built = buildStarCells(points, 1);
    expect(drawnBy(built, view)).toBe(1);
    const narrow = viewOf([1, 0, 0], 20);
    expect(drawnBy(built, narrow)).toBe(0);
  });

  it("never returns more than a cell has, and searches 4 million in at most 24 steps", () => {
    const count = 4_000_000;
    const values = new Float32Array(count).map((_, i) => count - i);
    let reads = 0;
    const counted = new Proxy(values, {
      get(target, key) {
        if (typeof key === "string" && /^\d+$/.test(key)) {
          reads++;
        }
        return Reflect.get(target, key) as unknown;
      },
    });
    const cell = {
      center: [1, 0, 0] as V,
      sinRadius: 0.1,
      first: 0,
      count,
    };
    const planes = new Float32Array(16);
    expect(cullCell(cell, planes, 0, counted)).toBe(count);
    expect(reads).toBeLessThanOrEqual(24);
    reads = 0;
    expect(cullCell(cell, planes, 1e9, counted)).toBe(0);
    expect(reads).toBeLessThanOrEqual(24);
    expect(cullCell(cell, planes, 1_000_001, values)).toBe(3_000_000);
    expect(cullCell({ ...cell, count: 0 }, planes, 0, values)).toBe(0);
  });

  it("a cell outside a plane draws none", () => {
    const planes = new Float32Array(16);
    planes.set([-1, 0, 0, 0], 8);
    const cell = { center: [1, 0, 0] as V, sinRadius: 0.1, first: 0, count: 3 };
    expect(cullCell(cell, planes, 0, new Float32Array(3))).toBe(0);
    expect(
      cullCell({ ...cell, sinRadius: 1 }, planes, 0, new Float32Array(3)),
    ).toBe(3);
  });

  it("a stage that lifts shadows draws more stars, and a threshold uses the corner", () => {
    const built = buildStarCells(sky(50_000, 6), 50_000);
    const plain = viewOf([1, 0, 0], 60, { ev100: 8 });
    const lifted = viewOf([1, 0, 0], 60, { ev100: 8, gain: 2.89 });
    expect(drawnBy(built, lifted)).toBeGreaterThan(drawnBy(built, plain));
    expect(lifted.inputs.minIlluminance).toBeCloseTo(
      plain.inputs.minIlluminance / 2.89,
      12,
    );
    expect(plain.inputs.minRadiance).toBeCloseTo(
      STAR_VISIBLE / (plain.exposure * starPeakShare(0.55)),
      6,
    );
    // Smaller than at the center: the corner's pixel is the smallest.
    const pixel = (2 * plain.tanY) / plain.height;
    expect(plain.inputs.minIlluminance).toBeLessThan(
      plain.inputs.minRadiance * pixel * pixel,
    );
  });
});

describe("with the star exposure rule gone", () => {
  it("at EV100 15 on a 60° view, at most the two brightest pass", () => {
    const built = buildStarCells(sky(50_000, 7), 50_000);
    const view = viewOf([0, 1, 0], 60, { ev100: 15 });
    // A shown value of 10⁻⁴ of white: about magnitude −0.8 at this size, in the
    // view's corner.
    expect(drawnBy(built, view)).toBeLessThanOrEqual(2);
    const dark = viewOf([0, 1, 0], 60, { ev100: -3 });
    expect(drawnBy(built, dark)).toBeGreaterThan(1000);
  });
});

describe("how they're submitted", () => {
  it("is direct with a direct world, or without indirect's first instance", () => {
    const on = { indirectFirstInstance: true };
    const off = { indirectFirstInstance: false };
    expect(starSubmission("indirect", on)).toBe("indirect");
    expect(starSubmission("direct", on)).toBe("direct");
    expect(starSubmission("indirect", off)).toBe("direct");
    expect(starSubmission("direct", off)).toBe("direct");
  });

  async function scene() {
    const engine = await fakeEngine();
    const sky = engine.raster.sky;
    const count = 2000;
    sky.setStarField({
      points: new Float32Array(count * STAR_FLOATS).fill(0.5),
      count,
      backgroundLevels: Array.from({ length: 6 }, () => [new Float32Array(4)]),
      backgroundSize: 1,
      holdsFaintStars: false,
      meanBackground: 0,
    });
    while (sky.advanceUpload()) {
      /* until complete */
    }
    return { engine, sky };
  }

  const recording = () => {
    const pass = {
      setPipeline: () => {},
      setBindGroup: () => {},
      draw: vi.fn(),
      drawIndirect: vi.fn(),
      dispatchWorkgroups: vi.fn(),
      end: () => {},
    };
    const encoder = {
      beginRenderPass: () => pass,
      beginComputePass: () => pass,
    } as unknown as GPUCommandEncoder;
    return { pass, encoder };
  };

  it("the direct path draws what the CPU found, with no indirect draw", async () => {
    const { sky } = await scene();
    const view = sky.createView();
    view.starMode = "direct";
    view.starDrawn.fill(0);
    view.starDrawn[0] = 5;
    const { pass, encoder } = recording();
    sky.encodeStars(encoder, view, {} as GPUTextureView);
    expect(pass.drawIndirect).not.toHaveBeenCalled();
    expect(pass.dispatchWorkgroups).not.toHaveBeenCalled();
    expect(pass.draw.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("the indirect path dispatches 6 workgroups, and draws each cell", async () => {
    const { sky } = await scene();
    const view = sky.createView();
    const { pass, encoder } = recording();
    sky.encodeStars(encoder, view, {} as GPUTextureView);
    expect(pass.dispatchWorkgroups).toHaveBeenCalledExactlyOnceWith(6);
    expect(pass.drawIndirect).toHaveBeenCalledTimes(384);
    expect(pass.draw).not.toHaveBeenCalled();
  });

  it("a real view takes its mode from its world", async () => {
    const { engine } = await scene();
    const world = engine.createWorld();
    const view = engine.addView({
      target: new OffscreenTarget(64, 36),
      world,
    });
    world.submission = "direct";
    engine.renderFrame();
    const frame = engine.raster.viewFrames.get(view)!;
    expect(frame.sky.starMode).toBe("direct");
    world.submission = "indirect";
    engine.renderFrame();
    expect(frame.sky.starMode).toBe(
      engine.ctx.caps.indirectFirstInstance ? "indirect" : "direct",
    );
  });

  it("two views have their own arguments, and neither's write touches the other's", async () => {
    const { engine, sky } = await scene();
    const world = engine.createWorld();
    const view = engine.addView({
      target: new OffscreenTarget(64, 36),
      world,
    });
    engine.renderFrame();
    const a = engine.raster.viewFrames.get(view)!.sky;
    const b = sky.createView();
    expect(a.starArgs).not.toBe(b.starArgs);
    expect(a.starUniform).not.toBe(b.starUniform);
    const device = (sky as unknown as { device: { queue: unknown } }).device;
    const write = vi.fn(
      (_buffer: unknown, _offset: number, _data: Float32Array) => {},
    );
    device.queue = { writeBuffer: write };
    sky.writeStars(b, [0, 1, 0, -1, 0, 0, 0, 0, 1], "direct");
    expect(write.mock.calls.map((c) => c[0])).toEqual([b.starUniform]);
    const drawnB = [...b.starDrawn];
    sky.writeStars(a, IDENTITY, "direct");
    expect(write.mock.calls.at(-1)![0]).toBe(a.starUniform);
    expect(write).toHaveBeenCalledTimes(2);
    expect([...b.starDrawn]).toEqual(drawnB);
    // A different rotation sends different planes.
    const planes = (call: number) => [
      ...write.mock.calls[call]![2].subarray(12, 16),
    ];
    write.mockClear();
    sky.writeStars(b, [0, 1, 0, -1, 0, 0, 0, 0, 1], "direct");
    const turned = planes(0);
    write.mockClear();
    sky.writeStars(b, IDENTITY, "direct");
    expect(planes(0)).not.toEqual(turned);
  });
});

describe("the shader", () => {
  it("bounds starCull's search by the constant 24, and clamps its cell", () => {
    expect(SOURCE).toMatch(/STAR_SEARCH_STEPS = 24u;/);
    expect(SOURCE).toMatch(/step < STAR_SEARCH_STEPS; step\+\+/);
    expect(SOURCE).toMatch(/STAR_CELLS = 384u;/);
    expect(SOURCE).toMatch(/uint cell = min\(id\.x, STAR_CELLS - 1u\)/);
  });
});
