// The veil's rules (sky and observer plan, Task 13). spikes/observer.ts (group `veil`)
// draws them.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GLARE_IMAGE_CLAMP,
  GLARE_SOURCES,
  GLARE_SPRITE_CLAMP,
} from "../src/render/post/glare.ts";
import {
  VEIL_LEVELS,
  sunVeil,
  veilSpread,
  veilWeights,
} from "../src/render/post/veilWeights.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { eyeLimitStage } from "../src/scene/eyeLimit.ts";
import { cameraObserver, type GlareSettings } from "../src/scene/observer.ts";
import { createPostStage } from "../src/scene/postStage.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const DEG = Math.PI / 180;
const BASE = 2;
/** Radians per pixel at the center, for a vertical field of view on `height` pixels. */
const pixelAngle = (fov: number, height: number) =>
  (2 * Math.tan((fov * DEG) / 2)) / height;

/** The log-log slope of `f` between two radii. */
const slope = (f: (r: number) => number, a: number, b: number) =>
  Math.log(f(b) / f(a)) / Math.log(b / a);

describe("veilWeights", () => {
  const angle = pixelAngle(60, 1440);

  it("falls as 1/θ², from 1° to 20°", () => {
    const weights = veilWeights(angle, VEIL_LEVELS, BASE);
    const at = (deg: number) => veilSpread((deg * DEG) / angle, weights, BASE);
    expect(Math.abs(slope(at, 1, 20) + 2)).toBeLessThan(0.15);
    // Within the range, too, and not only from end to end.
    for (const [a, b] of [
      [1, 3],
      [3, 8],
      [8, 16],
    ] as const) {
      expect(Math.abs(slope(at, a, b) + 2), `${a}° to ${b}°`).toBeLessThan(
        0.35,
      );
    }
  });

  it("is told apart from the paper's halved weights, which read −3", () => {
    const halved = Float32Array.from(
      { length: VEIL_LEVELS },
      (_, i) => 2 ** -i,
    );
    const at = (deg: number) => veilSpread((deg * DEG) / angle, halved, BASE);
    expect(slope(at, 1, 16)).toBeLessThan(-2.7);
  });

  it("sums to at most 1, and to the octaves covered at a 60° view", () => {
    const weights = veilWeights(angle, VEIL_LEVELS, BASE);
    const total = weights.reduce((a, b) => a + b, 0);
    const top = BASE * 2 ** (VEIL_LEVELS - 1) * angle * Math.SQRT2;
    const covered = Math.log2(top / (0.1 * DEG)) / Math.log2(600);
    expect(total).toBeLessThanOrEqual(1);
    expect(total).toBeCloseTo(covered, 4);
  });

  it("gives a star's veil at 1° within 15%, at 60° and 20°, on the same pixels", () => {
    const perAngle = (fov: number) => {
      const a = pixelAngle(fov, 1440);
      return (
        veilSpread((1 * DEG) / a, veilWeights(a, VEIL_LEVELS, BASE), BASE) /
        (a * a)
      );
    };
    expect(Math.abs(perAngle(20) / perAngle(60) - 1)).toBeLessThan(0.15);
  });

  it("gives zeros for a pixel angle that isn't one", () => {
    for (const bad of [0, Number.NaN, -1, Infinity]) {
      expect([...veilWeights(bad, VEIL_LEVELS, BASE)]).toEqual(
        new Array(VEIL_LEVELS).fill(0),
      );
    }
  });
});

describe("sunVeil", () => {
  const angle = pixelAngle(60, 1440);
  const weights = veilWeights(angle, VEIL_LEVELS, BASE);
  const omega = angle * angle;
  const veil = (
    offset: [number, number],
    light: [number, number, number],
    visibility = 1,
    z = 1,
  ) => sunVeil(offset, omega, light, visibility, 0.2, weights, BASE, z);

  it("is linear in light and visibility", () => {
    const one = veil([100, 0], [1000, 1000, 1000])[0];
    expect(veil([100, 0], [2000, 2000, 2000])[0]).toBeCloseTo(2 * one, 6);
    expect(veil([100, 0], [1000, 1000, 1000], 0.5)[0]).toBeCloseTo(
      0.5 * one,
      6,
    );
  });

  it("has no step as the sun leaves the screen", () => {
    // It knows only the offset: moving the sun by a pixel past the edge is one more pixel.
    let last = veil([640, 0], [1000, 1000, 1000])[0];
    for (let r = 641; r < 660; r++) {
      const v = veil([r, 0], [1000, 1000, 1000])[0];
      expect(Math.abs(v / last - 1)).toBeLessThan(0.01);
      last = v;
    }
  });

  it("adds nothing with the sun behind the camera, and fades smoothly to there", () => {
    expect(veil([10, 0], [1000, 1000, 1000], 1, 0.05)[0]).toBe(0);
    expect(veil([10, 0], [1000, 1000, 1000], 1, -1)[0]).toBe(0);
    let last = 0;
    for (let z = 0.05; z <= 0.15; z += 0.01) {
      const v = veil([10, 0], [1000, 1000, 1000], 1, z)[0];
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  it("takes 150,000 lux, far past fp16, as only its result is written", () => {
    const [r] = veil([200, 0], [150_000, 150_000, 150_000]);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(0);
  });
});

/** glare.ts's composite, on one pixel. */
function composite(image: number, veil: number, imageShare: number): number {
  // The image is cleaned (glareImage); the veil isn't, so only the clamp bounds it.
  const finite = (v: number) => (Number.isFinite(v) ? v : 0);
  const c = Math.min(finite(image), GLARE_IMAGE_CLAMP);
  return Math.min(c * (1 - imageShare) + veil, GLARE_IMAGE_CLAMP);
}

describe("the composite", () => {
  const share = 0.2;
  const weights = veilWeights(pixelAngle(60, 1024), VEIL_LEVELS, BASE);
  const total = weights.reduce((a, b) => a + b, 0);

  // The algebra only: the pyramid's own sum is checked on the GPU, not here.
  it("gives a flat image back, within 10⁻⁶, if the veil sums to share × the weights", () => {
    const flat = 3.25;
    const veil = share * total * flat;
    expect(Math.abs(composite(flat, veil, share * total) - flat)).toBeLessThan(
      1e-6,
    );
  });

  it("holds a point's total within 2%, less what's outside the view", () => {
    const n = 1024;
    const point = 1000;
    let spread = 0;
    let everywhere = 0;
    for (let y = -2048; y < 2048; y += 4) {
      for (let x = -2048; x < 2048; x += 4) {
        const v = veilSpread(Math.hypot(x, y), weights, BASE) * 16;
        everywhere += v;
        if (Math.abs(x) < n / 2 && Math.abs(y) < n / 2) {
          spread += v;
        }
      }
    }
    // What the image keeps, plus what the spread puts back anywhere in the plane
    // (counted by the grid above, not by `total`), is the point's energy.
    const sum = point * (1 - share * total) + point * share * everywhere;
    expect(Math.abs(sum / point - 1)).toBeLessThan(0.02);
    expect(everywhere).toBeLessThanOrEqual(total * 1.03);
    expect(spread).toBeLessThan(everywhere);
  });

  it("can't reach fp16's infinity, with every sprite on one pixel", () => {
    expect(GLARE_IMAGE_CLAMP + GLARE_SOURCES * GLARE_SPRITE_CLAMP).toBeLessThan(
      65504,
    );
    const source = readFileSync(
      new URL("../src/shaders/glare.slang", import.meta.url),
      "utf8",
    );
    expect(source).toContain(`GLARE_SPRITE_CLAMP = ${GLARE_SPRITE_CLAMP}.0`);
  });

  it("makes what isn't finite 0", () => {
    expect(composite(Infinity, 0, 0.1)).toBe(0);
    expect(composite(Number.NaN, 0, 0.1)).toBe(0);
    // The shader doesn't clean the veil: its infinity meets the clamp.
    expect(composite(1, Infinity, 0.1)).toBe(GLARE_IMAGE_CLAMP);
    expect(composite(1e9, 1e9, 0.1)).toBe(GLARE_IMAGE_CLAMP);
  });
});

describe("the sun's mask", () => {
  // glare.ts's `glareInSun`: by the sine of the angle, in the view's axes.
  const sine = (t: [number, number], s: [number, number]) => {
    const d = [t[0] - s[0], t[1] - s[1]];
    const across = t[0] * s[1] - t[1] * s[0];
    return (
      Math.sqrt(d[0]! ** 2 + d[1]! ** 2 + across ** 2) /
      Math.sqrt((1 + t[0] ** 2 + t[1] ** 2) * (1 + s[0] ** 2 + s[1] ** 2))
    );
  };
  const direction = ([x, y]: [number, number]) => {
    const k = 1 / Math.hypot(x, y, 1);
    return [x * k, y * k, k];
  };
  it("is the sine of the true angle, far from the axis too", () => {
    const t: [number, number] = [0.8, 0.5];
    const s: [number, number] = [0.803, 0.502];
    const [a, b] = [direction(t), direction(s)];
    const cos = a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    expect(sine(t, s)).toBeCloseTo(Math.sqrt(1 - cos * cos), 4);
  });
});

describe("the veil in a view's graph", () => {
  let engine: Engine;
  beforeEach(async () => {
    engine = await fakeEngine();
    engine.stop();
  });

  const veil: GlareSettings = {
    tier: "full",
    veil: { share: 0.2 },
    spikes: null,
  };

  function addView(glare: GlareSettings | null): View {
    return engine.addView({
      target: new OffscreenTarget(2048, 1024),
      world: engine.createWorld(),
      observer: { ...cameraObserver({ ev100: 15 }), glare },
    });
  }

  type Graph = {
    passes: Array<{ name: string; setup: { reads?: { id: number }[] } }>;
    resources: Array<{
      handle: { id: number; name: string };
      desc?: { mipLevelCount?: number; width: number; height: number };
    }>;
  };
  const graphOf = (view: View) =>
    engine.raster.viewFrames.get(view)!.graph as unknown as Graph & {
      compile(): string[];
    };

  it("comes after the meter and the adaptation, and neither reads it", () => {
    const view = addView(veil);
    engine.renderFrame();
    const graph = graphOf(view);
    const list = graph.compile();
    const input = list.indexOf("post.glare.input");
    expect(input).toBeGreaterThan(list.indexOf("meter"));
    expect(input).toBeGreaterThan(list.indexOf("adaptation"));
    expect(list.indexOf("present")).toBeGreaterThan(
      list.indexOf("post.glare.composite"),
    );
    const glareIds = new Set(
      graph.resources
        .filter((r) => r.handle.name.startsWith("post.glare"))
        .map((r) => r.handle.id),
    );
    for (const name of ["meter", "adaptation", "hdr-readback"]) {
      const pass = graph.passes.find((p) => p.name === name)!;
      expect((pass.setup.reads ?? []).some((h) => glareIds.has(h.id))).toBe(
        false,
      );
    }
  });

  it("with the eye, its local adaptation takes the veil, and its meter doesn't", () => {
    const view = addView(veil);
    view.observer.exposure = { eye: true };
    engine.renderFrame();
    const list = graphOf(view).compile();
    expect(list.indexOf("meter")).toBeLessThan(
      list.indexOf("post.glare.input"),
    );
    expect(list.indexOf("adaptation")).toBeGreaterThan(
      list.indexOf("post.glare.composite"),
    );
    expect(list.indexOf("adaptation")).toBeLessThan(list.indexOf("present"));
    view.observer.exposure = { ev100: 15 };
    engine.renderFrame();
    const camera = graphOf(view).compile();
    expect(camera.indexOf("adaptation")).toBeLessThan(
      camera.indexOf("post.glare.input"),
    );
  });

  it("acquires nothing with glare off, and present binds the image", () => {
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    const view = addView(null);
    engine.renderFrame();
    expect(acquire.mock.calls.some(([d]) => d.label?.includes("glare"))).toBe(
      false,
    );
    const { chain } = engine.raster.viewFrames.get(view)!;
    expect(chain.slots.scene!.latest().name).toBe("color");
  });

  it("has 9 mips at half size, and makes each level's view once", () => {
    const view = addView(veil);
    engine.renderFrame();
    const graph = graphOf(view);
    const pyramid = graph.resources.find(
      (r) => r.handle.name === "post.glare.pyramid",
    )!;
    expect(pyramid.desc!.mipLevelCount).toBe(9);
    expect(pyramid.desc!.width).toBe(1024);
    expect(pyramid.desc!.height).toBe(512);
    expect(
      graph.compile().filter((name) => name.startsWith("post.glare.down")),
    ).toHaveLength(8);
  });

  it("has the eye's limit first, and a host's scene stages after it", () => {
    const host = createPostStage({
      name: "host",
      slot: "scene",
      kind: "look",
      label: "A host's (a look)",
      shader: `fn postStage(input: PostInput) -> vec4<f32> { return postColorAt(input.pixel); }`,
    });
    const view = addView(veil);
    view.observer.stages = [eyeLimitStage(), host];
    engine.renderFrame();
    const list = graphOf(view).compile();
    expect(list.indexOf("post.eye-point-limit")).toBeLessThan(
      list.indexOf("glare.sources"),
    );
    expect(list.indexOf("post.glare.composite")).toBeLessThan(
      list.indexOf("post.host"),
    );
  });

  it("reads after glare only when asked", () => {
    const view = addView(veil);
    engine.renderFrame();
    expect(graphOf(view).compile()).toContain("hdr-readback.glare");
    const list = graphOf(view).compile();
    expect(list.indexOf("hdr-readback")).toBeLessThan(
      list.indexOf("glare.sources"),
    );
    void view.readHdr({ after: "glare" });
    expect(view.pendingGlareReads).toHaveLength(1);
    expect(view.pendingHdrReads).toHaveLength(0);
  });
});
