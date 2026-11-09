// One observer on a view (sky and observer plan, Task 1): exposure and tone
// mapping moved to `view.observer`, a watched copy, with no shim and no change
// in what the passes are given.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v3 from "../src/math/vec3.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { View } from "../src/scene/View.ts";
import {
  EYE,
  cameraObserver,
  ev100ToScale,
  eyeObserver,
  scaleToEv100,
  type Exposure,
} from "../src/scene/observer.ts";
import { eyeResponse, SCOTOPIC_WHITE } from "../src/scene/eye.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

interface Internals {
  scratchKey: Float64Array;
  viewKey(view: View): number;
}

describe("view.observer", () => {
  let engine: Engine;

  beforeEach(async () => {
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
  });

  function addView(exposure?: Exposure): View {
    const view = engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
      ...(exposure && { observer: { exposure } }),
    });
    view.camera.lookAt(v3.vec3(6_378_137, 0, 0), 0, -Math.PI / 2, 100);
    return view;
  }

  /** The view's on-demand fingerprint, as a copy. */
  function key(view: View): number[] {
    const internals = engine as unknown as Internals;
    const n = internals.viewKey(view);
    return [...internals.scratchKey.subarray(0, n)];
  }

  it("replaces the exposure settings, with no shim", () => {
    const view = addView();
    expect("exposure" in view).toBe(false);
    expect("toneMapping" in view).toBe(false);
  });

  it("defaults to a camera set for daylight", () => {
    const { observer } = addView();
    expect(observer.exposure).toEqual({ ev100: 15 });
    expect(observer.toneMapping).toBe("pbrNeutral");
    expect(observer.pointSpread.core).toBe(0.55);
    expect(observer.glare).toBeNull();
    expect(observer.stages).toEqual([]);
  });

  it("has presets for the eye and a camera", () => {
    expect(eyeObserver().pointSpread.core).toBe(0.85);
    expect(eyeObserver().exposure).toEqual({ eye: true });
    expect(eyeObserver({ compensation: 1 }).exposure).toEqual({
      eye: true,
      compensation: 1,
    });
    expect(cameraObserver({ ev100: 3 }).exposure).toEqual({ ev100: 3 });
    expect(cameraObserver({ ev100: 3 }).pointSpread.core).toBe(0.55);
  });

  it("inverts ev100ToScale", () => {
    for (const ev100 of [-12, 0, 15, 18]) {
      expect(scaleToEv100(ev100ToScale(ev100))).toBeCloseTo(ev100, 12);
    }
  });

  it.each<[string, (view: View) => void]>([
    ["assigned", (v) => (v.observer = eyeObserver())],
    ["its tone mapping", (v) => (v.observer.toneMapping = "agx")],
    [
      "a field of its exposure",
      (v) => {
        (v.observer.exposure as { compensation?: number }).compensation = 1;
      },
    ],
    ["its exposure", (v) => (v.observer.exposure = { ev100: 3 })],
    ["a field of its point spread", (v) => (v.observer.pointSpread.core = 1)],
    [
      "a field of its glare",
      (v) => {
        v.observer.glare = { tier: "auto", veil: { share: 0.2 }, spikes: null };
      },
    ],
  ])("wakes the loop once when %s is written", (_, write) => {
    const view = addView({ auto: true });
    const before = key(view);
    const revision = view.observerRevision;
    const wake = vi.fn();
    view.wake = wake;
    write(view);
    expect(wake).toHaveBeenCalledTimes(1);
    expect(view.observerRevision).toBe(revision + 1);
    expect(key(view)).not.toEqual(before);
  });

  it("watches what's nested deeper, and what's assigned later", () => {
    const view = addView();
    view.observer.glare = {
      tier: "auto",
      veil: { share: 0.2 },
      spikes: null,
    };
    const wake = vi.fn();
    view.wake = wake;
    view.observer.glare.veil!.share = 0.1;
    expect(wake).toHaveBeenCalledTimes(1);
    expect(view.observer.glare.veil!.share).toBe(0.1);
  });

  it("keeps a copy: writes to what was set don't reach the view", () => {
    const view = addView();
    const settings = eyeObserver();
    view.observer = settings;
    settings.pointSpread.core = 9;
    (settings.exposure as { compensation?: number }).compensation = 9;
    expect(view.observer.pointSpread.core).toBe(0.85);
    expect(view.observer.exposure).toEqual({ eye: true });
  });

  it("gives updateExposure's numbers as before", () => {
    const view = addView({ ev100: 15 });
    engine.renderFrame();
    expect(view.exposureScale).toBeCloseTo(2.54e-5, 7);
    view.observer.exposure = { scale: 1 };
    engine.renderFrame();
    expect(view.exposureScale).toBe(1);
    view.observer.exposure = EYE;
    engine.renderFrame();
    const state = view.autoExposure!;
    state.cones = Math.log10(40);
    state.rods = Math.log10(40 * SCOTOPIC_WHITE);
    engine.renderFrame();
    const r = eyeResponse(40, 40 * SCOTOPIC_WHITE);
    expect(view.exposureScale).toBe(Math.max(r.cones, r.rods * SCOTOPIC_WHITE));
  });

  describe("readout", () => {
    /** The readout of an eye adapted to `cdm2`. */
    function eyeAt(cdm2: number): ReturnType<View["readout"]> {
      const view = addView(EYE);
      engine.renderFrame();
      const state = view.autoExposure!;
      state.cones = Math.log10(cdm2);
      state.rods = Math.log10(cdm2 * SCOTOPIC_WHITE);
      state.metered = true;
      engine.renderFrame();
      return view.readout();
    }

    it("reads a fixed exposure's EV100", () => {
      expect(addView({ ev100: 15 }).readout()).toEqual({
        ev100: 15,
        equivalent: false,
        preExposure: ev100ToScale(15),
      });
    });

    it("gives a plain scale no EV100", () => {
      expect(addView({ scale: 1 }).readout()).toEqual({
        ev100: undefined,
        equivalent: false,
        preExposure: 1,
      });
    });

    it("reads metered exposure's EV100 as a setting", () => {
      const view = addView({ auto: true });
      engine.renderFrame();
      const r = view.readout();
      expect(r.ev100).toBeCloseTo(15, 6);
      expect(r.equivalent).toBe(false);
      expect(r.cones).toBeUndefined();
    });

    it("reads the eye's as an equivalent, in sunlight", () => {
      const r = eyeAt(4000);
      expect(r.equivalent).toBe(true);
      expect(Math.abs(r.ev100! - 14.18)).toBeLessThan(0.01);
      expect(r.cones).toBeCloseTo(4000, 6);
      expect(r.rods).toBeCloseTo(4000 * SCOTOPIC_WHITE, 6);
    });

    it("reads the eye's as an equivalent, dark-adapted", () => {
      const r = eyeAt(1e-4);
      expect(r.equivalent).toBe(true);
      expect(Math.abs(r.ev100! + 4.04)).toBeLessThan(0.01);
      expect(r.cones).toBeCloseTo(1e-4, 10);
      expect(r.rods).toBeCloseTo(1e-4 * SCOTOPIC_WHITE, 10);
    });
  });

  describe("what the present pass writes", () => {
    /** The params as words, recorded before the observer moved them. */
    const words = () => [
      ...new Uint32Array(engine.raster.presentData.buffer.slice(0)),
    ];

    it("for a daylight camera", () => {
      addView({ ev100: 15 });
      engine.renderFrame();
      expect(words()).toEqual([0, 0, 0, 1, 936727893, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("for a plain scale", () => {
      addView({ scale: 1 });
      engine.renderFrame();
      expect(words()).toEqual([0, 0, 0, 1, 1065353216, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("for an adapted eye", () => {
      const view = addView({ eye: true, compensation: 1 });
      engine.renderFrame();
      const state = view.autoExposure!;
      state.cones = Math.log10(4000);
      state.rods = Math.log10(4000 * SCOTOPIC_WHITE);
      engine.renderFrame();
      expect(words()).toEqual([
        0, 0, 0, 1, 951893602, 1, 1080461351, 1082156646, 1065353216, 0, 0, 0,
      ]);
    });
  });
});

describe("Viewer.setSplit", () => {
  it("gives the second view a copy of the observer", async () => {
    const engine = await fakeEngine();
    const first = engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
      observer: eyeObserver({ compensation: 1 }),
    });
    const second = engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
    });
    second.observer = first.observer;
    (second.observer.exposure as { compensation: number }).compensation = 2;
    second.observer.pointSpread.core = 3;
    expect(first.observer.exposure).toEqual({ eye: true, compensation: 1 });
    expect(first.observer.pointSpread.core).toBe(0.85);
    expect(second.observer.exposure).toEqual({ eye: true, compensation: 2 });
    // The method itself assigns as above (a source pin: it needs a canvas).
    expect(
      readFileSync(new URL("../widgets/Viewer.ts", import.meta.url), "utf8"),
    ).toContain("second.observer = this.view.observer");
    engine.stop();
  });
});
