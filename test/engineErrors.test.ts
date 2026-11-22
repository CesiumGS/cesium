// `Engine.errors` as an emitter (CS-780): `errors.on(kind, listener)` hears
// each report of a kind, a listener stopped beforehand hears nothing, and the
// errors already raised stay readable as the list. On the WebGPU engine here
// (a fake device); the WebGL 2 engine's own `EngineErrors` is in
// test/webgl2Engine.test.ts. Node only.
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  EngineError,
  Notice,
} from "../packages/core/src/gpu/EngineErrors.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
  personas,
} from "./fakeGpu.ts";

const notice: Notice = {
  kind: "stepped",
  feature: "glare",
  asked: "full",
  given: "reduced",
  rule: "test.rule",
  reason: "a test",
};
const FEATURE = { importance: "preferred", because: [] } as const;

let made: Engine[] = [];
afterEach(() => {
  for (const engine of made) {
    engine.destroy();
  }
  made = [];
  vi.restoreAllMocks();
});

async function engineOn(): Promise<Engine> {
  installGpuGlobals();
  installFakeNavigator(
    fakeDevice(personas["m2-chrome"].limits),
    personas["m2-chrome"],
  );
  const { Engine } = await import("../packages/core/src/scene/Engine.ts");
  const engine = await Engine.create({ warnings: false });
  engine.stop();
  made.push(engine);
  return engine;
}

describe("engine.errors.on", () => {
  it("hears a support notice once, and not after it is stopped", async () => {
    const engine = await engineOn();
    const heard: EngineError[] = [];
    const stopped = vi.fn();
    const stop = engine.errors.on("support", stopped);
    engine.errors.on("support", (error) => heard.push(error));
    stop();
    engine.notices.report(notice, FEATURE, "test");
    expect(stopped).not.toHaveBeenCalled();
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({ kind: "support", notice, count: 1 });
    expect(heard[0]).toBe(engine.errors.at(-1));
  });

  it("hears only the kind it asked for, and onError hears every kind", async () => {
    const engine = await engineOn();
    const support: string[] = [];
    const frames: string[] = [];
    const all: string[] = [];
    engine.errors.on("support", (e) => support.push(e.message));
    engine.errors.on("frame", (e) => frames.push(e.message));
    engine.onError((e) => all.push(e.kind));
    engine.errors.on((e) => all.push(`any:${e.kind}`));
    vi.spyOn(console, "error").mockImplementation(() => {});
    engine.reportError("frame", "a frame failed");
    engine.notices.report(notice, FEATURE, "test");
    expect(frames).toEqual(["a frame failed"]);
    expect(support).toHaveLength(1);
    expect(all).toEqual(["frame", "any:frame", "support", "any:support"]);
  });

  it("hears a repeat of a message with its count, and stopping twice is harmless", async () => {
    const engine = await engineOn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const counts: number[] = [];
    const stop = engine.errors.on("camera", (e) => counts.push(e.count));
    engine.reportError("camera", "same");
    engine.reportError("camera", "same");
    stop();
    stop();
    engine.reportError("camera", "same");
    expect(counts).toEqual([1, 2]);
  });

  it("keeps the errors already raised readable, and the listener doesn't hear them", async () => {
    const engine = await engineOn();
    engine.notices.report(notice, FEATURE, "test");
    const late = vi.fn();
    engine.errors.on("support", late);
    expect(late).not.toHaveBeenCalled();
    expect(engine.errors.filter((e) => e.kind === "support")).toHaveLength(1);
    expect(engine.errors.length).toBeGreaterThanOrEqual(1);
    expect([...engine.errors].map((e) => e.kind)).toContain("support");
    expect(Array.isArray(engine.errors)).toBe(true);
    expect(Object.keys(engine.errors)).not.toContain("on");
    engine.notices.report({ ...notice, given: "off" }, FEATURE, "test");
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("isolates a listener that throws: the next one hears, report returns, the throw is logged once and not listed", async () => {
    const engine = await engineOn();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("bad listener");
    engine.errors.on("camera", () => {
      throw boom;
    });
    const after = vi.fn();
    engine.errors.on("camera", after);
    expect(() => engine.reportError("camera", "one")).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    // The camera error itself is logged once; the throw once more.
    const throws = logged.mock.calls.filter((call) => call[1] === boom);
    expect(throws).toHaveLength(1);
    engine.reportError("camera", "two");
    expect(after).toHaveBeenCalledTimes(2);
    expect(logged.mock.calls.filter((call) => call[1] === boom)).toHaveLength(
      2,
    );
    expect(engine.errors.map((e) => e.message)).toEqual(["one", "two"]);
  });

  it("a listener added during a report hears the next one, not that one", async () => {
    const engine = await engineOn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const late = vi.fn();
    engine.errors.on("camera", () => {
      engine.errors.on("camera", late);
    });
    engine.reportError("camera", "first");
    expect(late).not.toHaveBeenCalled();
    engine.reportError("camera", "second");
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("a listener hears nothing after the engine is destroyed", async () => {
    const engine = await engineOn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const heard = vi.fn();
    engine.errors.on(heard);
    engine.destroy();
    engine.reportError("camera", "after destroy");
    expect(heard).not.toHaveBeenCalled();
  });

  it("hands a listener the live entry, whose count grows with repeats", async () => {
    const engine = await engineOn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const kept: EngineError[] = [];
    engine.errors.on("camera", (e) => kept.push(e));
    engine.reportError("camera", "again");
    engine.reportError("camera", "again");
    expect(kept[0]).toBe(kept[1]);
    expect(kept[0]!.count).toBe(2);
  });
});
