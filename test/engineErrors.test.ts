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
});
