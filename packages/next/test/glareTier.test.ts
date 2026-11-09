// Glare's tiers, presets and many views (sky and observer plan, Task 15).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { glareFor, glareTier, resolveGlare } from "../src/render/post/glare.ts";
import type { Engine } from "../src/scene/Engine.ts";
import {
  cameraGlare,
  cameraObserver,
  eyeGlare,
  eyeObserver,
  type GlareSettings,
} from "../src/scene/observer.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { View } from "../src/scene/View.ts";
import { fakeEngine } from "./fakeGpu.ts";

const apple = { vendor: "apple", isFallbackAdapter: false };
const intel = { vendor: "Intel", isFallbackAdapter: false };
const fallback = { vendor: "google", isFallbackAdapter: true };

describe("glareTier", () => {
  it("has none on a fallback adapter", () => {
    expect(glareTier(fallback, 1e6)).toBe("off");
  });
  it("starts Intel reduced, then sources above 3.7 million pixels", () => {
    expect(glareTier(intel, 2e6)).toBe("reduced");
    expect(glareTier(intel, 4e6)).toBe("sources");
  });
  it("is full elsewhere, and reduced above 8.3 million pixels", () => {
    expect(glareTier(apple, 3e6)).toBe("full");
    expect(glareTier(apple, 9e6)).toBe("reduced");
  });
});

describe("resolveGlare", () => {
  it("has no glare with no settings", () => {
    expect(resolveGlare(null, apple, 1e6).tier).toBe("off");
    expect(
      resolveGlare({ tier: "full", veil: null, spikes: null }, apple, 1e6).tier,
    ).toBe("off");
  });

  it("lets an explicit tier beat auto", () => {
    const settings: GlareSettings = { ...cameraGlare(), tier: "sources" };
    expect(resolveGlare(settings, apple, 1e6).tier).toBe("sources");
    expect(resolveGlare({ ...settings, tier: "off" }, apple, 1e6).tier).toBe(
      "off",
    );
    expect(resolveGlare(cameraGlare(), intel, 2e6).tier).toBe("reduced");
  });

  it("gives reduced a base of 4 and 7 levels, up to 64 sprites", () => {
    expect(
      resolveGlare({ ...cameraGlare(), tier: "reduced" }, apple, 1e6),
    ).toMatchObject({
      levels: 7,
      basePixels: 4,
      sprites: 64,
      spritePixels: 1_000_000,
      sunVeil: true,
    });
  });

  it("gives sources no pyramid, the sun's veil, and 16 sprites", () => {
    expect(
      resolveGlare({ ...cameraGlare(), tier: "sources" }, apple, 1e6),
    ).toMatchObject({ levels: 0, sunVeil: true, sprites: 16 });
  });
});

describe("the presets", () => {
  it("gives the eye a veil and no spikes", () => {
    expect(eyeGlare()).toEqual({
      tier: "auto",
      veil: { share: 0.2 },
      spikes: null,
    });
  });
  it("gives a camera spikes, vanes by default", () => {
    expect(cameraGlare().spikes?.aperture).toBe("vanes");
    expect(cameraGlare({ aperture: "hex" }).spikes?.aperture).toBe("hex");
  });
  it("leaves both observers' defaults with none", () => {
    expect(eyeObserver().glare).toBeNull();
    expect(cameraObserver({ ev100: 15 }).glare).toBeNull();
  });
});

describe("in an engine", () => {
  let engine: Engine;
  beforeEach(async () => {
    engine = await fakeEngine();
    engine.stop();
  });

  function addView(
    glare: GlareSettings | null,
    width = 512,
    height = 256,
  ): View {
    return engine.addView({
      target: new OffscreenTarget(width, height),
      world: engine.createWorld(),
      observer: { ...cameraObserver({ ev100: 15 }), glare },
    });
  }
  const passes = (view: View) =>
    engine.raster.viewFrames.get(view)!.graph.compile();

  it("reads the adapter once", () => {
    expect(engine.gpu.adapterInfo).toBe(engine.gpu.adapterInfo);
    expect(engine.gpu.adapterInfo.isFallbackAdapter).toBe(false);
  });

  it("has no down pass at sources, and 6 at reduced", () => {
    const sources = addView({ ...cameraGlare(), tier: "sources" });
    engine.renderFrame();
    expect(passes(sources).some((p) => p.includes("glare.down"))).toBe(false);
    expect(passes(sources)).toContain("post.glare.composite");
    const reduced = addView({ ...cameraGlare(), tier: "reduced" });
    engine.renderFrame();
    expect(
      passes(reduced).filter((p) => p.includes("glare.down")),
    ).toHaveLength(6);
  });

  it("keeps two views' settings apart, and shares their pooled textures", () => {
    const a = addView({ ...eyeGlare(), tier: "full" });
    engine.renderFrame();
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    const release = vi.spyOn(engine.raster.pool, "release");
    const b = addView({ ...cameraGlare(), tier: "full" });
    engine.renderFrame();
    expect(passes(a)).not.toContain("glare.sprites");
    expect(passes(b)).toContain("glare.sprites");
    const glareFrame = (view: View) =>
      engine.raster.viewFrames.get(view)!.glare!;
    expect(glareFrame(a)).not.toBe(glareFrame(b));
    expect(glareFrame(a).sources).not.toBe(glareFrame(b).sources);
    // A view's textures go back within its tick, for the next to take.
    expect(release.mock.calls.length).toBe(acquire.mock.calls.length);
  });

  it("gives each target the same texture tick after tick", () => {
    const view = addView({ ...cameraGlare(), tier: "full" });
    engine.renderFrame();
    const acquire = vi.spyOn(engine.raster.pool, "acquire");
    const taken = () => {
      acquire.mockClear();
      engine.renderFrame();
      return acquire.mock.calls.map(([desc], i) => [
        desc.label,
        acquire.mock.results[i]!.value,
      ]);
    };
    const first = taken();
    expect(first.some(([label]) => label === "post.glare.pyramid")).toBe(true);
    expect(first.some(([label]) => label === "post.glare.veil")).toBe(true);
    const second = taken();
    expect(second.length).toBe(first.length);
    second.forEach(([label, texture], i) => {
      expect(label).toBe(first[i]![0]);
      expect(texture, String(label)).toBe(first[i]![1]);
    });
    void view;
  });

  it("frees a removed view's list", () => {
    const view = addView(cameraGlare());
    engine.renderFrame();
    const { glare } = engine.raster.viewFrames.get(view)!;
    const destroy = vi.fn();
    (glare!.sources as unknown as { destroy: () => void }).destroy = destroy;
    engine.removeView(view);
    expect(destroy).toHaveBeenCalled();
  });

  it("goes to sleep with glare on, and an edit wakes it", () => {
    const view = addView(cameraGlare());
    const wake = vi.fn();
    view.wake = wake;
    engine.renderFrame();
    const before = view.observerRevision;
    engine.renderFrame();
    engine.renderFrame();
    // Nothing a tick does counts as a change.
    expect(view.observerRevision).toBe(before);
    expect(wake).not.toHaveBeenCalled();
    view.observer.glare!.veil!.share = 0.1;
    expect(wake).toHaveBeenCalledTimes(1);
    expect(view.observerRevision).toBe(before + 1);
  });

  it("doesn't rebuild the graph for a share", () => {
    const view = addView(cameraGlare());
    engine.renderFrame();
    const frame = engine.raster.viewFrames.get(view);
    view.observer.glare!.veil!.share = 0.1;
    view.observer.glare!.spikes!.aperture = "hex";
    engine.renderFrame();
    expect(engine.raster.viewFrames.get(view)).toBe(frame);
    view.observer.glare!.spikes = null;
    engine.renderFrame();
    expect(engine.raster.viewFrames.get(view)).not.toBe(frame);
    expect(passes(view)).not.toContain("glare.sprites");
  });

  it("frees the targets when glare goes", () => {
    const view = addView(cameraGlare());
    engine.renderFrame();
    const graph = engine.raster.viewFrames.get(view)!.graph;
    const purge = vi.spyOn(engine.raster.pool, "purge");
    view.observer.glare = null;
    engine.renderFrame();
    const purged = purge.mock.calls.map(([d]) => d.label);
    expect(purged).toContain("post.glare.pyramid");
    expect(graph).not.toBe(engine.raster.viewFrames.get(view)!.graph);
    expect(passes(view).some((p) => p.includes("glare"))).toBe(false);
  });

  it("rebuilds on a resize, with no glare in a squeezed view", () => {
    const view = addView(cameraGlare());
    engine.renderFrame();
    const first = engine.raster.viewFrames.get(view)!.glare;
    view.viewport = { x: 0, y: 0, width: 0.5, height: 0.5 };
    engine.renderFrame();
    const second = engine.raster.viewFrames.get(view)!.glare;
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    view.viewport = { x: 0, y: 0, width: 0, height: 0 };
    engine.renderFrame();
    expect(engine.raster.viewFrames.get(view)!.glare).toBeUndefined();
    expect(passes(view).some((p) => p.includes("glare"))).toBe(false);
  });

  it("has no glare at all on a fallback adapter", () => {
    const made = glareFor(
      {
        ...(engine as unknown as Parameters<typeof glareFor>[0]),
        gpu: { adapterInfo: fallback },
      },
      addView(null),
      512,
      256,
    );
    expect(made).toBeUndefined();
  });
});
