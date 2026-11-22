// Support reports on views (CS-23): `view.support`, `view.effective` and
// `view.explain(feature)` on a fake engine, after a resize and after device
// loss, and `strict` (docs/superpowers/plans/2026-11-13-engine-profiles.md,
// sections 4 and 6). Node only.
import { afterEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../packages/core/src/math/vec3.ts";
import { CATALOG } from "../packages/core/src/profile/catalog.ts";
import { describePaths, paths } from "../packages/core/src/profile/paths.ts";
import type {
  Engine,
  EngineOptions,
} from "../packages/core/src/scene/Engine.ts";
import {
  cameraGlare,
  cameraObserver,
} from "../packages/core/src/scene/observer.ts";
import { OffscreenTarget } from "../packages/core/src/scene/renderTarget.ts";
import type { View, ViewOptions } from "../packages/core/src/scene/View.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
  personas,
  type PersonaName,
} from "./fakeGpu.ts";

const R = 6_378_137;
const FEATURES = Object.keys(CATALOG);

/** An engine on persona `name`, whose device can be lost (`lose`). */
async function engineOn(
  name: PersonaName,
  options: EngineOptions = {},
): Promise<{ engine: Engine; lose: () => void }> {
  installGpuGlobals();
  const device = fakeDevice(personas[name].limits);
  let lose!: () => void;
  (device as unknown as { lost: Promise<GPUDeviceLostInfo> }).lost =
    new Promise((resolve) => {
      lose = () =>
        resolve({ reason: "unknown", message: "a test" } as GPUDeviceLostInfo);
    });
  installFakeNavigator(device, personas[name]);
  const { Engine } = await import("../packages/core/src/scene/Engine.ts");
  const engine = await Engine.create(options);
  engine.stop();
  return { engine, lose };
}

function addView(
  engine: Engine,
  width = 1000,
  height = 1000,
  options: Partial<ViewOptions> = {},
): View {
  const view = engine.addView({
    target: new OffscreenTarget(width, height),
    world: engine.createWorld(),
    observer: { ...cameraObserver({ ev100: 15 }), glare: cameraGlare() },
    ...options,
  });
  view.camera.lookAt(v3.vec3(R + 100, 0, 0), 0, -Math.PI / 2, 100);
  return view;
}

const supportNotices = (engine: Engine) =>
  engine.errors.filter((e) => e.kind === "support");

let made: Engine[] = [];
afterEach(() => {
  for (const engine of made) {
    engine.destroy();
  }
  made = [];
  vi.restoreAllMocks();
});
const track = <T extends { engine: Engine }>(value: T): T => {
  made.push(value.engine);
  return value;
};

describe("view.support", () => {
  it("names the renderer, content, steps per feature and the device's paths", async () => {
    const { engine } = track(await engineOn("m2-chrome"));
    const view = addView(engine);
    const report = view.support;
    expect(report.renderer).toBe("webgpu");
    expect(report.content.required).toEqual([
      "globe",
      "terrain",
      "imagery",
      "meshes",
    ]);
    expect(Object.keys(report.features).sort()).toEqual([...FEATURES].sort());
    expect(report.features["translucency"]).toEqual([
      "exact",
      "moments32",
      "moments16",
    ]);
    expect(report.paths).toEqual(describePaths(engine.gpu.facts));
    expect(engine.ctx.paths).toEqual(paths(engine.gpu.facts));
    expect(structuredClone(report)).toEqual(report);
  });

  it("leaves out a step the device can't run", async () => {
    const { engine } = track(await engineOn("no-float32-blendable"));
    const view = addView(engine);
    expect(view.support.features["translucency"]).toEqual([
      "exact",
      "moments16",
    ]);
  });

  it("is for views in an engine", async () => {
    const { engine } = track(await engineOn("m2-chrome"));
    const view = addView(engine);
    engine.removeView(view);
    expect(() => view.support).toThrow(/isn't in an engine/);
    expect(() => view.effective).toThrow(/isn't in an engine/);
  });
});

describe("view.effective and view.explain", () => {
  it("gives every feature what was asked, what was given, and why", async () => {
    const { engine } = track(await engineOn("m2-chrome"));
    const view = addView(engine, 1000, 1000, {
      shadows: true,
      translucencyMethod: "exact",
      lodTransitions: "pop",
    });
    const { features } = view.effective;
    expect(Object.keys(features).sort()).toEqual([...FEATURES].sort());
    for (const name of FEATURES) {
      const feature = features[name]!;
      const offered = view.support.features[name]!;
      expect(
        feature.given === "off" || offered.includes(feature.given),
        name,
      ).toBe(true);
      expect(feature.scope, name).toBe(
        CATALOG[name as keyof typeof CATALOG].scope,
      );
      expect(feature.because[0]!.rule, name).toBe(`${name}.catalog`);
      const explained = view.explain(name);
      expect(explained.asked, name).toEqual(feature.asked);
      expect(explained.given, name).toEqual(feature.given);
      expect(explained.trail, name).toBe(feature.because);
    }
    // The view's options are its look.
    expect(features["glare"]).toMatchObject({ asked: true, given: "full" });
    expect(features["shadows"]).toMatchObject({ asked: true, given: "full" });
    expect(features["ambientOcclusion"]).toMatchObject({
      asked: false,
      given: "off",
    });
    expect(features["translucency"]).toMatchObject({
      asked: "exact",
      given: "exact",
    });
    expect(features["lodTransitions"]).toMatchObject({
      asked: "pop",
      given: "pop",
    });
    // Engine-wide features appear in every view, marked so.
    expect(features["msaa"]).toMatchObject({ scope: "engine", given: "4x" });
    expect(() => view.explain("bloom")).toThrow(/unknown feature/);
  });

  it("is the same object while nothing it reads changes, and follows an option", async () => {
    const { engine } = track(await engineOn("m2-chrome"));
    const view = addView(engine);
    const first = view.effective;
    view.camera.lookAt(v3.vec3(R + 120, 0, 0), 0, -Math.PI / 2, 100);
    expect(view.effective).toBe(first);
    view.observer = { glare: { ...cameraGlare(), tier: "sources" } };
    expect(view.explain("glare")).toMatchObject({
      asked: "sources",
      given: "sources",
    });
    view.observer = { glare: null };
    expect(view.explain("glare")).toMatchObject({ asked: false, given: "off" });
  });

  it("follows the camera's height across aerial perspective's bands", async () => {
    const { engine } = track(await engineOn("m2-chrome"));
    const view = addView(engine);
    expect(view.explain("aerialPerspective").given).toBe("volume");
    view.camera.lookAt(v3.vec3(R + 100_000, 0, 0), 0, -Math.PI / 2, 100);
    expect(view.explain("aerialPerspective").given).toBe("march");
    view.camera.lookAt(v3.vec3(R + 2_000_000, 0, 0), 0, -Math.PI / 2, 100);
    const high = view.explain("aerialPerspective");
    expect(high.given).toBe("screen");
    expect(
      high.trail.some((r) => r.rule === "aerialPerspective.rank.high"),
    ).toBe(true);
  });
});

describe("after a resize", () => {
  it("steps glare left to the engine by the view's pixels, and reports it", async () => {
    const { engine } = track(await engineOn("intel-uhd-4k"));
    const view = addView(engine, 3000, 1500);
    engine.renderFrame();
    // 4.5 million pixels on an Intel GPU: sources.
    const big = view.explain("glare");
    expect(big.given).toBe("sources");
    const applied = big.trail.filter((r) => r.applied && r.layer === "cost");
    expect(applied.map((r) => r.rule)).toEqual(["glare.intel.pixels"]);
    expect(view.readout().glare).toEqual({
      tier: "sources",
      reason: "an Intel GPU above 3.7 million pixels",
    });
    expect(supportNotices(engine).map((e) => e.notice)).toEqual([
      expect.objectContaining({
        kind: "stepped",
        feature: "glare",
        asked: "full",
        given: "sources",
        rule: "glare.intel.pixels",
      }),
    ]);
    // Half as wide: 2.25 million pixels, reduced.
    view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
    engine.renderFrame();
    const small = view.explain("glare");
    expect(small.given).toBe("reduced");
    expect(
      small.trail
        .filter((r) => r.applied && r.layer === "cost")
        .map((r) => r.rule),
    ).toEqual(["glare.intel.start"]);
    expect(view.readout().glare?.tier).toBe("reduced");
    expect(supportNotices(engine).at(-1)?.notice).toMatchObject({
      kind: "stepped",
      given: "reduced",
      rule: "glare.intel.start",
    });
  });

  it("limits ambient occlusion above 4096 × 4096 pixels", async () => {
    const { engine } = track(await engineOn("m2-chrome"));
    const view = addView(engine, 5000, 5000, { ambientOcclusion: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(view.explain("ambientOcclusion").given).toBe("off");
    expect(supportNotices(engine).at(-1)?.notice).toMatchObject({
      kind: "limited",
      rule: "ambientOcclusion.maxPixels",
    });
    view.viewport = { x: 0, y: 0, width: 0.5, height: 0.5 };
    engine.renderFrame();
    expect(view.explain("ambientOcclusion").given).toBe("full");
    // Warned once when the view was added (before the spy), not again.
    view.viewport = { x: 0, y: 0, width: 1, height: 1 };
    engine.renderFrame();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("after device loss", () => {
  it("reports the replacement device's support and resolves again", async () => {
    const { engine, lose } = track(await engineOn("m2-chrome"));
    const view = addView(engine);
    const before = view.support;
    expect(view.explain("glare").given).toBe("full");
    expect(before.paths[1]).toMatch(/^textureTranscode: astc-4x4/);
    // The browser hands out another GPU: an Intel one.
    installFakeNavigator(
      fakeDevice(personas["intel-uhd-4k"].limits),
      personas["intel-uhd-4k"],
    );
    const restored = new Promise((resolve) =>
      engine.gpu.events.on("restored", resolve),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    lose();
    await restored;
    const after = view.support;
    expect(after).not.toBe(before);
    expect(after.paths).toEqual(describePaths(engine.gpu.facts));
    expect(after.paths[1]).toMatch(/^textureTranscode: bc7/);
    const glare = view.explain("glare");
    expect(glare.given).toBe("reduced");
    expect(glare.trail.find((r) => r.applied && r.layer === "cost")?.rule).toBe(
      "glare.intel.start",
    );
    engine.renderFrame();
    expect(supportNotices(engine).at(-1)?.notice).toMatchObject({
      kind: "stepped",
      feature: "glare",
      given: "reduced",
    });
  });
});

describe("notices, warnings and strict", () => {
  it("warns once for a pinned step the device can't run, and records it", async () => {
    const { engine } = track(await engineOn("no-float32-blendable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = addView(engine);
    expect(view.explain("translucency")).toMatchObject({
      asked: "moments32",
      given: "moments16",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(
      /translucency unmet.*float32-blendable/,
    );
    const [notice] = supportNotices(engine);
    expect(notice?.notice).toMatchObject({
      kind: "unmet",
      feature: "translucency",
      asked: "moments32",
      given: "moments16",
      rule: "translucency.moments32.blendable",
    });
    // Away and back: recorded again, warned once.
    view.translucencyMethod = "exact";
    engine.renderFrame();
    view.translucencyMethod = "moments";
    engine.renderFrame();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(supportNotices(engine)[0]!.count).toBe(2);
  });

  it("keeps the console quiet with warnings off", async () => {
    const { engine } = track(
      await engineOn("no-float32-blendable", { warnings: false }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    addView(engine);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(supportNotices(engine)).toHaveLength(1);
  });

  it("throws under strict for a pinned step that can't run", async () => {
    const { engine } = track(
      await engineOn("no-float32-blendable", { strict: true }),
    );
    expect(() => addView(engine)).toThrow(
      /strict: translucency unmet: asked moments32, given moments16/,
    );
    // The view wasn't added; the notice is recorded.
    expect(engine.views).toHaveLength(0);
    expect(supportNotices(engine)).toHaveLength(1);
    // A look that runs here is added, and a change to one that can't throws
    // from the next frame.
    const view = addView(engine, 100, 100, { translucencyMethod: "exact" });
    expect(engine.views).toEqual([view]);
    view.translucencyMethod = "moments";
    expect(() => engine.renderFrame()).toThrow(/strict: translucency unmet/);
  });

  it("doesn't throw under strict for a step taken for cost", async () => {
    const { engine } = track(await engineOn("intel-uhd-4k", { strict: true }));
    const view = addView(engine, 3000, 1500);
    engine.renderFrame();
    expect(view.explain("glare").given).toBe("sources");
  });
});
