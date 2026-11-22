// The panel's model source (examples/frames-explorer/page.ts) and its
// structural sharing (share.ts), Task 4d: while the clock plays and
// nothing else changes, the panel's model is the same object frame after
// frame, so the panel doesn't render again; the clock's and the scenario's
// times, which do change every frame, come from their own small source.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingModel } from "../examples/frames-explorer/loading.ts";
import {
  createModelSource,
  createTimeSource,
} from "../examples/frames-explorer/page.ts";
import { createPanelModel } from "../examples/frames-explorer/panelModel.ts";
import type { ScenarioHostState } from "../examples/frames-explorer/scenarioHost.ts";
import { scenarioView } from "../examples/frames-explorer/scenarioModel.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import { sameData, share } from "../examples/frames-explorer/share.ts";

describe("share", () => {
  it("hands back the previous value when the new one is equal", () => {
    const prev = { a: [1, { b: "x" }], c: undefined, d: new Float64Array([1]) };
    const next = { a: [1, { b: "x" }], c: undefined, d: new Float64Array([1]) };
    expect(share(prev, next)).toBe(prev);
    expect(sameData(prev, next)).toBe(true);
  });

  it("keeps every unchanged part's identity when one leaf changes", () => {
    const prev = {
      tree: { left: { v: 1 }, right: { v: 2 } },
      list: [{ k: 1 }],
    };
    const next = {
      tree: { left: { v: 1 }, right: { v: 3 } },
      list: [{ k: 1 }],
    };
    const out = share(prev, next);
    expect(out).not.toBe(prev);
    expect(out).toEqual(next);
    expect(out.tree.left).toBe(prev.tree.left);
    expect(out.tree.right).toBe(next.tree.right);
    expect(out.list).toBe(prev.list);
  });

  it("compares class instances by identity, and sees added and removed keys", () => {
    class Thing {
      v = 1;
    }
    expect(share({ t: new Thing() }, { t: new Thing() }).t).not.toBe(undefined);
    expect(sameData({ t: new Thing() }, { t: new Thing() })).toBe(false);
    const t = new Thing();
    expect(sameData({ t }, { t })).toBe(true);
    expect(sameData({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameData({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(sameData([1, 2], [1, 2, 3])).toBe(false);
    expect(sameData(new Float32Array([1]), new Float64Array([1]))).toBe(false);
  });
});

describe("the panel's model while the clock plays (Task 4d)", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function page() {
    const spec = SCENARIOS.find((s) => s.id === "one-path")!;
    const checked = Date.parse(spec.checked.epochUtc);
    const clock = { time: checked, rate: 3600, mode: "playing" };
    const loading = new LoadingModel();
    const host = (): ScenarioHostState => ({
      spec,
      knobs: spec.checked.knobs,
      epochUtcMs: Math.round(clock.time),
      atChecked: false,
      changed: ["time"],
      status: "ready",
      stale: true,
      staleBy: ["time"],
      generation: 1,
    });
    const panel = createPanelModel({
      core: {
        loading,
        frames: () => undefined,
        instantNow: () => undefined,
      },
      token: undefined,
      tree: {
        tree: () => undefined,
        note: () => "The frame tree draws once frame data is in.",
        composed: () => ({ ITRF: {}, GCRF: {}, ICRF: {} }),
      },
      overlays: {
        views: () => [],
        settings: () => ({
          distortionCrs: "6420",
          distortionHeight: 0,
          biasFactor: 1,
          trueScale: false,
        }),
      },
      orionFrame: () => "MOON_ME",
      catalog: {
        results: () => [],
        runView: () => ({ state: "idle", done: 0, total: 0 }),
      },
      user: { results: () => [], view: () => ({ state: "idle" }) },
      scenario: () =>
        scenarioView({
          st: host(),
          results: [],
          tree: undefined,
          playing: true,
          rate: clock.rate,
          scrub: (t) => t,
        }),
      environment: () => [],
      notice: () => undefined,
    });
    const model = createModelSource({
      build: () => panel.build(),
      disposed: () => false,
    });
    const time = createTimeSource({
      clock: () => clock.time,
      epoch: () => host().epochUtcMs,
      disposed: () => false,
    });
    return { clock, model, time };
  }

  it("is the same object frame after frame while only the time moves", () => {
    const p = page();
    const first = p.model.source.get();
    for (let i = 0; i < 30; i++) {
      p.clock.time += 60_000;
      p.model.invalidate();
      expect(p.model.source.get()).toBe(first);
    }
  });

  it("gives the clock's and the scenario's times from their own source, new only when they change", () => {
    const p = page();
    const a = p.time.source.get();
    expect(p.time.source.get()).toBe(a);
    expect(a.utc).toBe("2026-04-06T23:00:00Z");
    expect(a.epochUtc).toBe("2026-04-06T23:00:00.000Z");
    p.clock.time += 60_000;
    p.time.changed();
    const b = p.time.source.get();
    expect(b).not.toBe(a);
    expect(b.utc).toBe("2026-04-06T23:01:00Z");
    expect(b.epochUtc).toBe("2026-04-06T23:01:00.000Z");
  });
});
