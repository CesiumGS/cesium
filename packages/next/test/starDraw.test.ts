// How a star is drawn: its light on the pixels, and what the observer's point
// spread does to the uniform and to the draw (plan's Task 8).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Sky } from "../src/atmosphere/Sky.ts";
import { STAR_FLOATS, starRadius } from "../src/atmosphere/stars.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { PointSpread } from "../src/scene/observer.ts";
import { fakeEngine } from "./fakeGpu.ts";

const SOURCE = readFileSync(
  join(import.meta.dirname, "../src/atmosphere/sky.slang"),
  "utf8",
);

/** sky.slang `erfApprox`. */
function erf(x: number): number {
  const x2 = x * x;
  return (
    Math.sign(x) *
    Math.sqrt(1 - Math.exp((-x2 * (1.2732395 + 0.147 * x2)) / (1 + 0.147 * x2)))
  );
}

/** sky.slang `starFragment`: a pixel's share, `(dx, dy)` from the star. */
function share(dx: number, dy: number, spread: PointSpread, ratio = 1): number {
  const s = 1 / (Math.SQRT2 * spread.core * ratio);
  const sharp =
    0.25 *
    (erf((dx + 0.5) * s) - erf((dx - 0.5) * s)) *
    (erf((dy + 0.5) * s) - erf((dy - 0.5) * s));
  if (!spread.wing) {
    return sharp;
  }
  const w = spread.wing.sigma * ratio;
  const halo =
    Math.exp(-(dx * dx + dy * dy) / (2 * w * w)) / (2 * Math.PI * w * w);
  return sharp * (1 - spread.wing.share) + halo * spread.wing.share;
}

/** A star's light summed over the pixels its quad covers. */
function footprint(
  x: number,
  y: number,
  radius: number,
  spread: PointSpread,
  ratio = 1,
): number {
  let sum = 0;
  // Pixels whose centers (at .5) are inside the quad.
  const from = (c: number) => Math.ceil(c - radius - 0.5);
  const to = (c: number) => Math.floor(c + radius - 0.5);
  for (let py = from(y); py <= to(y); py++) {
    for (let px = from(x); px <= to(x); px++) {
      sum += share(px + 0.5 - x, py + 0.5 - y, spread, ratio);
    }
  }
  return sum;
}

/** 20 places of a star within a pixel. */
const OFFSETS = Array.from({ length: 20 }, (_, i) => [
  (i * 0.618034) % 1,
  (i * 0.754878) % 1,
]);

describe("a star's light on the pixels", () => {
  for (const core of [0.55, 0.85]) {
    for (const ratio of [1, 2]) {
      it(`the footprint holds its light: σ ${core}, at ratio ${ratio}`, () => {
        const spread = { core };
        const radius = starRadius(spread, 1, ratio);
        expect(radius).toBeGreaterThanOrEqual(3.5 * core * ratio);
        for (const [x, y] of OFFSETS) {
          const held = footprint(x!, y!, radius, spread, ratio);
          expect(held).toBeGreaterThanOrEqual(0.999);
          expect(held).toBeLessThanOrEqual(1.001);
        }
      });
    }
  }

  it("a bright star's wing keeps its sum at 1", () => {
    const spread = { core: 0.6, wing: { sigma: 3, share: 0.05 } };
    for (const [x, y] of OFFSETS) {
      const radius = starRadius(spread, 1000, 1);
      expect(Math.abs(footprint(x!, y!, radius, spread) - 1)).toBeLessThan(
        0.001,
      );
    }
  });

  it("a wing reaches as far as it shows, up to the most a quad can", () => {
    const spread = { core: 0.6, wing: { sigma: 3, share: 0.05 } };
    expect(starRadius(spread, 1e-3, 1)).toBeCloseTo(3.5 * 0.6 + 0.5, 6);
    expect(starRadius(spread, 1000, 1)).toBeGreaterThan(9);
    expect(starRadius(spread, 1e30, 1)).toBeLessThanOrEqual(64);
    expect(starRadius(spread, Infinity, 2)).toBe(64);
    expect(starRadius({ core: 0.85 }, Infinity, 1)).toBeCloseTo(3.475, 6);
  });

  it("the centered peak's share at the plan's three spreads", () => {
    expect(share(0, 0, { core: 0.6 })).toBeCloseTo(0.354, 2);
    expect(share(0, 0, { core: 0.85 })).toBeCloseTo(0.197, 2);
    expect(share(0, 0, { core: 0.55 })).toBeCloseTo(0.405, 2);
  });
});

describe("the shader", () => {
  it("has no fixed halo and no six-corner array", () => {
    expect(SOURCE).not.toMatch(/STAR_HALO|STAR_CORE\b/);
    expect(SOURCE).not.toMatch(/float2 corners\[6\]/);
    expect(SOURCE).toMatch(/SV_VertexID/);
    expect(SOURCE).toMatch(/sky\.starCore/);
    expect(SOURCE).toMatch(/sky\.starWingShare/);
  });

  it("keeps the same rule for a star's reach as starRadius", () => {
    expect(SOURCE).toMatch(/STAR_CORE_REACH = 3\.5;/);
    expect(SOURCE).toMatch(/STAR_WING_LEVEL = 0\.002;/);
    expect(SOURCE).toMatch(/STAR_RADIUS_MAX = 64\.0;/);
    expect(SOURCE).toMatch(
      /STAR_CORE_REACH \* sky\.starCore \* sky\.starPixel \+ 0\.5/,
    );
  });
});

/** The `Sky` uniform as last written. */
const words = (sky: Sky) => (sky as unknown as { f32: Float32Array }).f32;

async function skyScene() {
  const engine = await fakeEngine();
  const sky = engine.raster.sky;
  const view = engine.addView({
    target: new OffscreenTarget(64, 36),
    world: engine.createWorld(),
  });
  return { engine, sky, view };
}

/** What a star field's last slice leaves: uploaded and swapped in. */
function stars(sky: Sky, count: number): void {
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
}

describe("Sky and the observer", () => {
  it("encodeStars draws a strip of 4 vertices per star", async () => {
    const { sky } = await skyScene();
    stars(sky, 17);
    const draw = vi.fn();
    const pass = {
      setPipeline: () => {},
      setBindGroup: () => {},
      draw,
      drawIndirect: () => {},
      end: () => {},
      dispatchWorkgroups: () => {},
    };
    const encoder = {
      beginRenderPass: () => pass,
      beginComputePass: () => pass,
    } as unknown as GPUCommandEncoder;
    sky.encodeStars(encoder, sky.createView(), {} as GPUTextureView);
    expect(draw).toHaveBeenCalledWith(4, 17);
  });

  it("the observer's point spread reaches the uniform", async () => {
    const { engine, sky, view } = await skyScene();
    const read = () => [...words(sky).subarray(80, 83)];
    engine.renderFrame();
    expect(read()[0]).toBeCloseTo(0.55, 6);
    expect(read().slice(1)).toEqual([0, 0]);
    view.observer.exposure = { eye: true };
    engine.renderFrame();
    expect(read()[0]).toBeCloseTo(0.85, 6);
    view.observer.pointSpread = { core: 0.7, wing: { sigma: 2, share: 0.1 } };
    engine.renderFrame();
    expect(read()[0]).toBeCloseTo(0.7, 6);
    expect(read()[1]).toBeCloseTo(2, 6);
    expect(read()[2]).toBeCloseTo(0.1, 6);
  });

  it("a spread that would divide by zero is kept above it", async () => {
    const { engine, sky, view } = await skyScene();
    view.observer.pointSpread = { core: 0, wing: { sigma: 0, share: 0.5 } };
    engine.renderFrame();
    expect(words(sky)[80]).toBeGreaterThan(0);
    expect(words(sky)[82]).toBe(0);
  });

  it("setting the point spread wakes a sleeping view", async () => {
    const { view } = await skyScene();
    const before = view.observerRevision;
    view.observer.pointSpread = { core: 1 };
    expect(view.observerRevision).toBeGreaterThan(before);
    const revision = view.observerRevision;
    view.observer.pointSpread!.core = 2;
    expect(view.observerRevision).toBeGreaterThan(revision);
  });
});
