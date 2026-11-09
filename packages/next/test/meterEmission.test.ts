// Display-relative emission must not count toward the exposure reading.
// Emission is added after the exposure (surface.slang), and the meter
// divides the exposure out, so it read light plus emission over exposure:
// a bright emitter lowered the exposure, which raised the reading, which
// lowered the exposure again, down to the floor (the Slang playground's
// "Rim glow": only the glow showed). The surface writes the share of its
// luminance that is scene light to the scene target's alpha; the meter
// takes that share of the color.
//
// Translucent layers: "over" can't blend a share, so the meter reads the opaque
// pass's image before the composite and puts the layers over it itself, with
// their emission kept apart in the lists (surface.slang `appendNode`).
//
// What this can't see: the GPU's own arithmetic (fp16 alpha, the MSAA
// resolve, the moments' weights), and the meter's histogram. The fake GPU runs
// no shaders, so the rule is ported here and the shader sources are checked to
// hold it. A port isn't the shader: it shows the rule is right, not that the
// GPU does it.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { TranslucencyMethod } from "../src/scene/View.ts";
import { EYE } from "../src/scene/observer.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

const LUMINANCE = [0.2126, 0.7152, 0.0722] as const;
const luminance = (c: readonly number[]) =>
  c[0]! * LUMINANCE[0] + c[1]! * LUMINANCE[1] + c[2]! * LUMINANCE[2];

/** surface.slang: the scene's share of a pixel's luminance. */
function sceneShare(lit: number[], shown: number[]): number {
  const e = luminance(shown);
  if (!(e > 0)) {
    return 1;
  }
  const l = luminance(lit);
  return Math.min(Math.max(l / (l + e), 0), 1);
}

/** meter.slang: a pixel's metered luminance, or undefined when left out. */
function metered(
  rgb: number[],
  alpha: number,
  exposure: number,
): number | undefined {
  if (!(alpha > 0)) {
    return undefined;
  }
  const scaled = rgb.map(
    (c) => (Math.max(c, 0) * Math.min(alpha, 1)) / exposure,
  );
  return luminance(scaled);
}

/** A pixel as the surface shader writes it at an exposure. */
function pixel(sceneLight: number[], emission: number[], exposure: number) {
  const lit = sceneLight.map((c) => c * exposure);
  const rgb = lit.map((c, i) => c + emission[i]!);
  return { rgb, alpha: sceneShare(lit, emission) };
}

describe("the exposure meter and emission", () => {
  const light = [4, 4, 4];
  const glow = [30, 10, 5];

  it("reads the scene's light alone, whatever the emission", () => {
    for (const exposure of [0.001, 0.01, 0.1, 1, 10]) {
      const withGlow = pixel(light, glow, exposure);
      const reading = metered(withGlow.rgb, withGlow.alpha, exposure)!;
      expect(reading).toBeCloseTo(luminance(light), 4);
    }
  });

  it("does not move with the exposure when the view holds emission", () => {
    const readings = [0.0005, 0.005, 0.05, 0.5, 5].map((exposure) => {
      const p = pixel(light, glow, exposure);
      return metered(p.rgb, p.alpha, exposure)!;
    });
    for (const r of readings) {
      expect(r).toBeCloseTo(readings[0]!, 6);
    }
    // The old rule, for contrast: the reading climbed as the exposure fell.
    const old = [0.5, 0.005].map((exposure) => {
      const p = pixel(light, glow, exposure);
      return metered(p.rgb, 1, exposure)!;
    });
    expect(old[1]!).toBeGreaterThan(old[0]! * 10);
  });

  it("reads a half emission, half light pixel as its light", () => {
    const exposure = 0.2;
    const lit = [0.8, 0.8, 0.8];
    const p = pixel(
      [4, 4, 4],
      lit.map((c) => c * 1),
      exposure,
    ); // equal luminance
    expect(p.alpha).toBeCloseTo(0.5, 6);
    expect(metered(p.rgb, p.alpha, exposure)).toBeCloseTo(4, 6);
  });

  it("leaves pure emission out, like unlit content", () => {
    const p = pixel([0, 0, 0], glow, 0.1);
    expect(p.alpha).toBe(0);
    expect(metered(p.rgb, p.alpha, 0.1)).toBeUndefined();
  });

  it("keeps a pixel without emission as it was", () => {
    const p = pixel(light, [0, 0, 0], 0.3);
    expect(p.alpha).toBe(1);
    expect(metered(p.rgb, p.alpha, 0.3)).toBeCloseTo(luminance(light), 6);
  });

  describe("through the translucent layers", () => {
    /** A translucent layer, as `shadeSurface` leaves it, at some exposure. */
    interface Layer {
      lit: number[]; // pre-exposed; unlit: display-referred
      emission?: number[];
      opacity: number;
      unlit?: boolean;
    }
    const gray = (v: number) => [v, v, v];

    /** The list's nodes, nearest first, as `appendNode` and `sortLists` read them. */
    function sortLists(layers: Layer[]) {
      let through = 1;
      const shown = [0, 0, 0];
      let scene = 0;
      for (const layer of layers) {
        if (!layer.unlit) {
          const emission = layer.emission ?? [0, 0, 0];
          const total = layer.lit.map((c, i) => c + emission[i]!);
          const share = sceneShare(layer.lit, emission);
          // The emission's node first: nothing of its own layer hides it.
          const glow = total.map((c) => c * (1 - share) * layer.opacity);
          const light = total.map((c) => c * share * layer.opacity);
          for (let i = 0; i < 3; i++) {
            shown[i]! += (glow[i]! + light[i]!) * through;
          }
          scene += luminance(light) * through;
        }
        through *= 1 - layer.opacity;
      }
      return { shown, scene, hidden: 1 - through };
    }

    /** meter.slang: a pixel, with the opaque image's color and share under the layers. */
    function meterOver(
      opaque: { rgb: number[]; alpha: number },
      layers: Layer[],
      exposure: number,
    ): number | undefined {
      const { shown, scene, hidden } = sortLists(layers);
      const all = luminance(shown);
      const through = 1 - hidden;
      const part = all > 0 ? Math.min(scene / all, 1) : 0;
      const counted =
        (opaque.alpha > 0 && through > 0) || (all > 0 && part > 0);
      if (!counted) {
        return undefined;
      }
      const own = luminance(opaque.rgb) * Math.min(opaque.alpha, 1);
      return (all * part + own * through) / exposure;
    }

    /** The old rule: metered after the composite's "over" on alpha. */
    function meterAfterOver(
      opaque: { rgb: number[]; alpha: number },
      layers: Layer[],
      exposure: number,
    ): number | undefined {
      const { shown, hidden } = sortLists(layers);
      const rgb = shown.map((c, i) => c + (1 - hidden) * opaque.rgb[i]!);
      return metered(rgb, hidden + (1 - hidden) * opaque.alpha, exposure);
    }

    /** Where the exposure settles: a reflected-light meter (K = 12.5), EV100. */
    function settle(read: (exposure: number) => number): number {
      let ev100 = 15;
      for (let i = 0; i < 60; i++) {
        const exposure = 1 / (1.2 * 2 ** ev100);
        const target = Math.log2((read(exposure) * 100) / 12.5);
        ev100 += 0.5 * (Math.min(18, Math.max(-6, target)) - ev100);
      }
      return ev100;
    }

    const ground = (exposure: number, cdm2 = 720) => ({
      rgb: gray(cdm2 * exposure),
      alpha: 1,
    });
    const NOTHING = { rgb: gray(0), alpha: 0 };

    it("emission on a translucent item over lit ground doesn't run away", () => {
      const glass = (exposure: number): Layer[] => [
        { lit: gray(720 * exposure), emission: gray(30), opacity: 0.5 },
      ];
      const settled = settle((e) => meterOver(ground(e), glass(e), e)!);
      // As the same pixel without its emission settles, at any exposure.
      const plain = settle((e) =>
        meterOver(ground(e), [{ lit: gray(720 * e), opacity: 0.5 }], e)!,
      );
      expect(settled).toBeCloseTo(plain, 3);
      expect(settled).toBeCloseTo(Math.log2((720 * 100) / 12.5), 3);
      // Metered after an "over" on alpha, the feedback ran to the clamp.
      const old = settle((e) => meterAfterOver(ground(e), glass(e), e)!);
      expect(old).toBeGreaterThan(17.9);
    });

    it("the reading doesn't move with the exposure, emission or not", () => {
      for (const exposure of [0.0005, 0.05, 5]) {
        const reading = meterOver(
          ground(exposure),
          [{ lit: gray(720 * exposure), emission: gray(30), opacity: 0.5 }],
          exposure,
        )!;
        expect(reading).toBeCloseTo(720, 6);
      }
    });

    it("unlit translucent content over unlit or empty pixels is left out", () => {
      const veil: Layer = { lit: gray(0.5), opacity: 0.5, unlit: true };
      expect(meterOver(NOTHING, [veil], 1)).toBeUndefined();
      // The old rule read it as black, in the lowest bin.
      expect(meterAfterOver(NOTHING, [veil], 1)).toBe(0);
    });

    it("pure emission on a translucent item over nothing is left out", () => {
      const glow: Layer = { lit: gray(0), emission: gray(2), opacity: 0.5 };
      expect(meterOver(NOTHING, [glow], 1)).toBeUndefined();
    });

    it.each([0.5, 0.3, 0.1])(
      "lit translucent at %f over nothing reads what's shown, not coverage twice",
      (opacity) => {
        const exposure = 0.5;
        const glass: Layer = { lit: gray(0.8), opacity };
        const shown = luminance(gray(0.8)) * opacity;
        expect(meterOver(NOTHING, [glass], exposure)).toBeCloseTo(
          shown / exposure,
          6,
        );
        // The old rule: off by the opacity, −1 stop at 0.5.
        expect(meterAfterOver(NOTHING, [glass], exposure)).toBeCloseTo(
          (shown * opacity) / exposure,
          6,
        );
      },
    );

    it("an unlit veil over lit ground hides its share of the light, and adds none", () => {
      const veil: Layer = { lit: gray(0.5), opacity: 0.25, unlit: true };
      expect(meterOver(ground(1), [veil], 1)).toBeCloseTo(720 * 0.75, 6);
    });

    it("layers: each hides what's behind it, and only scene light counts", () => {
      const front: Layer = { lit: gray(2), emission: gray(9), opacity: 0.5 };
      const back: Layer = { lit: gray(4), opacity: 0.5 };
      const expected = (2 * 0.5 + 4 * 0.5 * 0.5 + 100 * 0.25) / 1;
      expect(
        meterOver({ rgb: gray(100), alpha: 1 }, [front, back], 1),
      ).toBeCloseTo(expected, 6);
    });

    it("keeps an opaque pixel as it was with no layers", () => {
      const p = pixel(light, glow, 0.2);
      expect(meterOver(p, [], 0.2)).toBeCloseTo(
        metered(p.rgb, p.alpha, 0.2)!,
        6,
      );
      expect(meterOver(NOTHING, [], 1)).toBeUndefined();
    });
  });

  describe("the meter's pass", () => {
    let engine: Engine | undefined;
    afterEach(() => {
      vi.restoreAllMocks();
      engine = undefined;
    });

    /** Renders a view; the `layers` word of its meter's parameters, and the pass order. */
    async function meterOf(
      method: TranslucencyMethod,
      drawsLayers: boolean,
    ): Promise<{ layers: number; passes: string[] }> {
      engine = await fakeEngine();
      const world = engine.createWorld();
      vi.spyOn(world, "translucentRange").mockReturnValue(
        drawsLayers ? { near: 1, far: 100 } : undefined,
      );
      const view = engine.addView({
        target: new OffscreenTarget(64, 36),
        world,
        observer: { exposure: EYE },
        translucencyMethod: method,
      });
      view.camera.lookAt(v3.vec3(6_378_137, 0, 0), 0, -Math.PI / 2, 100);
      // The fake's objects accept any call and keep none: record this one.
      const writes: unknown[] = [];
      const device = engine.ctx.device as { queue: GPUQueue };
      device.queue = new Proxy(device.queue, {
        get: (queue, key) =>
          key === "writeBuffer"
            ? (_buffer: unknown, _offset: unknown, data: unknown) =>
                writes.push(data)
            : Reflect.get(queue, key),
      });
      engine.renderFrame();
      const exposure = new Float32Array([view.exposureScale])[0]!;
      const params = writes
        .filter((data): data is ArrayBuffer => data instanceof ArrayBuffer)
        .filter((data) => data.byteLength === 16)
        .filter(
          (data) =>
            new Float32Array(data)[0] === exposure &&
            new Uint32Array(data)[1] === 64 &&
            new Uint32Array(data)[2] === 36,
        );
      expect(params.length).toBe(1);
      return {
        layers: new Uint32Array(params[0]!)[3]!,
        passes: engine.raster.viewFrames.get(view)!.graph.compile(),
      };
    }

    it("reads the opaque image: after the translucent passes, before the composite", async () => {
      const { passes } = await meterOf("exact", true);
      const at = (name: string) => passes.indexOf(name);
      expect(at("translucent")).toBeGreaterThan(at("opaque"));
      expect(at("meter")).toBeGreaterThan(at("translucent"));
      expect(at("meter")).toBeLessThan(at("composite"));
    });

    it("is told which layers to read", async () => {
      expect((await meterOf("exact", false)).layers).toBe(0);
      expect((await meterOf("moments", false)).layers).toBe(0);
      expect((await meterOf("exact", true)).layers).toBe(1);
      expect((await meterOf("moments", true)).layers).toBe(2);
    });
  });

  describe("the shader sources", () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    it("meter takes the alpha share of the color", () => {
      const wgsl = read("../src/shaders/generated/meter.wgsl");
      expect(wgsl).toMatch(
        /max\(color_0\.xyz, \w+\) \* vec3<f32>\(min\(\w+, 1\.0f\)\)/,
      );
      const slang = read("../src/shaders/meter.slang");
      expect(slang).toContain(
        "float3 opaque = max(color.rgb, float3(0.0)) * min(color.a, 1.0);",
      );
      expect(slang).toContain(
        "(layers.light + opaque * layers.through) / params.exposure",
      );
    });

    it("the lists keep a layer's emission apart, and the composite out of the scene's light", () => {
      const surface = read("../src/shaders/surface.slang");
      expect(surface).toContain(
        "listNode(in, s.color * s.sceneShare, alpha, visible);",
      );
      expect(surface).toContain(
        "listNode(in, s.color * (1.0 - s.sceneShare) * alpha, EMISSION_NODE, visible);",
      );
      const composite = read("../src/shaders/composite.slang");
      expect(composite).toContain(
        "float scene = emission ? 0.0 : dot(color, LUMINANCE);",
      );
      expect(composite).toContain("bool emission = ba.y == EMISSION_NODE;");
      // The display target's alpha is what's hidden, as `sortedLit`'s: its own
      // alpha carries the scene's luminance to the meter.
      expect(composite).toContain(
        "out.display = float4(accumulatedUnlit.Load(p).rgb, lit.a);",
      );
      // Both shaders agree on the node's alpha.
      const value = /static const float EMISSION_NODE = ([\d.]+);/;
      expect(surface.match(value)![1]).toBe(composite.match(value)![1]);
    });

    it("the moments carry the same luminance in the unlit target's alpha", () => {
      const surface = read("../src/shaders/surface.slang");
      expect(surface).toContain(
        "float sceneLuminance = dot(weighted, float3(0.2126, 0.7152, 0.0722)) * s.sceneShare;",
      );
      // Their composite doesn't read that alpha.
      expect(read("../src/shaders/composite.slang")).toContain(
        "out.display = float4(unlit.rgb * k, opacity);",
      );
    });

    it("surface writes the scene share to the scene target's alpha", () => {
      const slang = read("../src/shaders/surface.slang");
      expect(slang).toContain("float4(s.color, s.sceneShare)");
      expect(slang).not.toMatch(/out\.color = float4\(s\.color, 1\.0\)/);
      // The share is built from the light before the display-relative term.
      expect(slang).toContain(
        "dot(lit, luminance) / (dot(lit, luminance) + shownLuminance)",
      );
    });
  });
});
