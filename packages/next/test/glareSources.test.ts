// Glare's light list (sky and observer plan, Task 12). The fake GPU runs no shaders, so
// the kernel's rules are ported here, with pins on the shader's constants. spikes/observer.ts
// (group `sources`) reads the real buffer back.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GLARE_BRIGHT_STARS,
  GLARE_DISC_TAPS,
  GLARE_SOURCES,
  GLARE_SPRITE_MAX_RADIUS,
  GLARE_SPRITE_PIXELS,
  discTaps,
} from "../src/render/post/glare.ts";
import { brightestStars } from "../src/atmosphere/starCells.ts";
import { STAR_FLOATS } from "../src/atmosphere/stars.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { lightListFor } from "../src/scene/lightList.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { cameraObserver } from "../src/scene/observer.ts";
import type { View } from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const glareSlang = readFileSync(
  new URL("../src/shaders/glare.slang", import.meta.url),
  "utf8",
);

/** The sun at `(cx, cy)`, radius `r`; `blocked` says what covers a point of it. */
function discVisibility(
  cx: number,
  cy: number,
  r: number,
  blocked: (x: number, y: number) => boolean,
): number {
  let seen = 0;
  for (const [x, y] of discTaps(GLARE_DISC_TAPS)) {
    if (!blocked(cx + x * r, cy + y * r)) {
      seen++;
    }
  }
  return seen / GLARE_DISC_TAPS;
}

/** The share of a disc of radius `r` a second one covers, at `d`, of radius `k`. */
function discOverlap(r: number, k: number, d: number): number {
  if (d >= r + k) {
    return 0;
  }
  if (d <= Math.abs(r - k)) {
    return Math.min(r, k) ** 2 / (r * r);
  }
  const a = r * r * Math.acos((d * d + r * r - k * k) / (2 * d * r));
  const b = k * k * Math.acos((d * d + k * k - r * r) / (2 * d * k));
  const c =
    0.5 * Math.sqrt((-d + r + k) * (d + r - k) * (d - r + k) * (d + r + k));
  return (a + b - c) / (Math.PI * r * r);
}

/** glare.slang's `missesBody`, at a camera at radius `r` looking at elevation `e`. */
function missesBody(r: number, radius: number, elevation: number): boolean {
  const mu = Math.sin(elevation);
  return !(mu < 0 && r * r * (mu * mu - 1) + radius * radius >= 0);
}

interface WalkStar {
  id: number;
  brightest: number;
  x: number;
  y: number;
  visible: boolean;
}

/** glare.slang's walk: its budgets, and its table for a sprite's size. */
function walk(
  stars: readonly WalkStar[],
  radiusOf: (brightest: number) => number,
  size = 1024,
): number[] {
  const kept: number[] = [];
  let count = 1; // Record 0 is the sun's.
  let pixels = 0;
  for (const star of stars.slice(0, GLARE_BRIGHT_STARS)) {
    if (count >= GLARE_SOURCES || pixels >= GLARE_SPRITE_PIXELS) {
      break;
    }
    const radius = Math.min(radiusOf(star.brightest), GLARE_SPRITE_MAX_RADIUS);
    if (radius <= 0) {
      continue;
    }
    if (
      star.x < -radius ||
      star.y < -radius ||
      star.x > size + radius ||
      star.y > size + radius ||
      !star.visible
    ) {
      continue;
    }
    pixels += 4 * radius * radius;
    kept.push(star.id);
    count++;
  }
  return kept;
}

describe("discTaps", () => {
  const taps = discTaps(32);

  it("stays in the unit disc, centered", () => {
    let [sx, sy] = [0, 0];
    for (const [x, y] of taps) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(1);
      sx += x;
      sy += y;
    }
    expect(Math.hypot(sx / 32, sy / 32)).toBeLessThan(0.05);
  });

  it("spreads evenly: half the disc holds within 2 of 16, at 8 angles", () => {
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 8;
      const on = taps.filter(
        ([x, y]) => x * Math.cos(a) + y * Math.sin(a) > 0,
      ).length;
      expect(Math.abs(on - 16)).toBeLessThanOrEqual(2);
    }
  });

  it("is the shader's table", () => {
    const table = [
      ...glareSlang.matchAll(/float2\((-?[\d.]+), (-?[\d.]+)\)/g),
    ].map((m) => [Number(m[1]), Number(m[2])]);
    expect(table.length).toBe(32);
    table.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(taps[i]![0], 5);
      expect(y).toBeCloseTo(taps[i]![1], 5);
    });
  });
});

describe("the constants", () => {
  it("are the shader's", () => {
    expect(glareSlang).toContain(`GLARE_SOURCES = ${GLARE_SOURCES}u`);
    expect(glareSlang).toContain(`GLARE_BRIGHT_STARS = ${GLARE_BRIGHT_STARS}u`);
    expect(glareSlang).toContain(`GLARE_DISC_TAPS = ${GLARE_DISC_TAPS}u`);
    expect(glareSlang).toContain(
      `GLARE_SPRITE_MAX_RADIUS = ${GLARE_SPRITE_MAX_RADIUS}.0`,
    );
    expect(GLARE_SPRITE_PIXELS).toBe(4_000_000);
    expect(GLARE_BRIGHT_STARS).toBe(2048);
  });
});

describe("what covers the sun", () => {
  it("a half-covered disc reads 0.5 ± 0.07", () => {
    expect(
      Math.abs(discVisibility(0, 0, 1, (x) => x < 0) - 0.5),
    ).toBeLessThanOrEqual(0.07);
  });

  it("two discs' overlap follows the eclipse's fraction within 0.05, at 10 separations", () => {
    for (let i = 0; i < 10; i++) {
      const d = 0.1 + (i / 9) * 2.1;
      const moon = 1.03;
      const covered = discOverlap(1, moon, d);
      const seen = discVisibility(
        0,
        0,
        1,
        (x, y) => Math.hypot(x - d, y) < moon,
      );
      expect(Math.abs(1 - seen - covered), `at ${d}`).toBeLessThan(0.08);
    }
  });

  it("every tap off screen counts as seen", () => {
    const size = 100;
    const onScreenDrawn = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < size && y < size;
    expect(discVisibility(size + 5, 50, 2, onScreenDrawn)).toBe(1);
  });

  it("a sun below the horizon from the ground is behind the body", () => {
    const R = 6371;
    expect(missesBody(R + 0.001, R, (-5 * Math.PI) / 180)).toBe(false);
    expect(missesBody(R + 0.001, R, (5 * Math.PI) / 180)).toBe(true);
  });

  it("no step of 64 across a limb changes it by over 3/32, at any angle", () => {
    // 2/32 can't hold: a spiral of 32 has three taps in a step at most angles.
    for (let k = 0; k < 16; k++) {
      const [c, s] = [
        Math.cos((k * Math.PI) / 16),
        Math.sin((k * Math.PI) / 16),
      ];
      let last = 1;
      for (let i = 0; i <= 64; i++) {
        const at = -1.2 + (i / 64) * 2.4;
        const seen = discVisibility(
          c * at,
          s * at,
          1,
          (x, y) => x * c + y * s > 0,
        );
        if (i > 0) {
          expect(Math.abs(seen - last)).toBeLessThanOrEqual(3 / 32);
        }
        last = seen;
      }
    }
  });
});

describe("the walk", () => {
  const stars = (n: number): WalkStar[] =>
    Array.from({ length: n }, (_, id) => ({
      id,
      brightest: n - id,
      x: 100,
      y: 100,
      visible: true,
    }));

  it("with 3,000 bright stars keeps the sun and the 255 brightest", () => {
    const kept = walk(stars(3000), () => 4);
    expect(kept.length).toBe(GLARE_SOURCES - 1);
    expect(kept).toEqual(Array.from({ length: 255 }, (_, i) => i));
  });

  it("stops at the pixel budget, with four huge sprites", () => {
    expect(walk(stars(10), () => 2000).length).toBe(4);
  });

  it("gives no source to a star under its cut", () => {
    const table = (brightest: number) => (brightest >= 8 ? 4 : 0);
    expect(walk(stars(10), table)).toEqual([0, 1, 2]);
  });

  it("skips a star behind something, and one off screen by its radius", () => {
    const [a, b, c] = stars(3);
    expect(
      walk(
        [
          { ...a!, visible: false },
          { ...b!, x: -20 },
          { ...c!, x: -3 },
        ],
        () => 4,
      ),
    ).toEqual([2]);
  });
});

describe("brightestStars", () => {
  it("orders the sky's brightest first, whatever the field's order", () => {
    const points = new Float32Array(5 * STAR_FLOATS);
    [3, 9, 1, 7, 5].forEach((lux, i) => {
      points[i * STAR_FLOATS + 3] = lux;
    });
    const out = brightestStars(points, 5, 3);
    expect(out.length).toBe(3 * STAR_FLOATS);
    expect([out[3], out[3 + STAR_FLOATS], out[3 + 2 * STAR_FLOATS]]).toEqual([
      9, 7, 5,
    ]);
  });
});

describe("lightListFor", () => {
  const view = (more: object) => ({
    background: "atmosphere" as const,
    sunDisk: true,
    body: { atmosphere: {} },
    ...more,
  });

  it("names the sun and the bright stars", () => {
    expect(lightListFor(view({}), 2048)).toEqual({ sun: true, stars: 2048 });
  });

  it("has no sun with no sky, or no disc", () => {
    expect(lightListFor(view({ background: "color" }), 9)).toEqual({
      sun: false,
      stars: 0,
    });
    expect(lightListFor(view({ sunDisk: false }), 9)).toEqual({
      sun: false,
      stars: 9,
    });
    expect(lightListFor(view({ body: {} }), 9)).toEqual({
      sun: false,
      stars: 0,
    });
  });

  it("has no stars with no field", () => {
    expect(lightListFor(view({}), 0).stars).toBe(0);
  });
});

describe("the list in a view's graph", () => {
  let engine: Engine;
  const added: View[] = [];
  beforeEach(async () => {
    engine = await fakeEngine();
    engine.stop();
  });
  afterEach(() => {
    added.length = 0;
  });

  function addView(glare: boolean): View {
    const view = engine.addView({
      target: new OffscreenTarget(64, 48),
      world: engine.createWorld(),
      observer: {
        ...cameraObserver({ ev100: 15 }),
        glare: glare
          ? { tier: "full", veil: { share: 0.2 }, spikes: null }
          : null,
      },
    });
    added.push(view);
    return view;
  }

  const passes = (view: View) =>
    engine.raster.viewFrames.get(view)!.graph.compile();

  it("with glare off, has no pass and writes no buffer", () => {
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    const view = addView(false);
    engine.renderFrame();
    expect(passes(view).some((name) => name.includes("glare"))).toBe(false);
    expect(acquire.mock.calls.some(([d]) => d.label?.includes("glare"))).toBe(
      false,
    );
    expect(engine.raster.viewFrames.get(view)!.glare).toBeUndefined();
  });

  it("comes after the adaptation, and reads depth", () => {
    const view = addView(true);
    engine.renderFrame();
    const list = passes(view);
    expect(list.indexOf("glare.sources")).toBeGreaterThan(
      list.indexOf("adaptation"),
    );
    const graph = engine.raster.viewFrames.get(view)!.graph as unknown as {
      passes: Array<{ name: string; setup: { reads?: { name: string }[] } }>;
    };
    const pass = graph.passes.find((p) => p.name === "glare.sources")!;
    expect(pass.setup.reads!.map((r) => r.name)).toContain("depth.msaa");
  });

  it("adds no read of the field of view", () => {
    for (const file of [
      "../src/render/post/glare.ts",
      "../src/scene/lightList.ts",
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/\.fovy\b/);
    }
  });
});
