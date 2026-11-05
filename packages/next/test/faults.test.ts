import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import { EngineErrors } from "../src/gpu/EngineErrors.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

describe("EngineErrors", () => {
  it("keeps each distinct error once, counted", () => {
    const errors = new EngineErrors();
    const heard: number[] = [];
    errors.on((e) => heard.push(e.count));
    const log = console.error;
    console.error = () => {};
    try {
      errors.report("frame", "rejected");
      errors.report("frame", "rejected");
      errors.report("shader", "rejected");
    } finally {
      console.error = log;
    }
    expect(errors.all.map((e) => [e.kind, e.count])).toEqual([
      ["frame", 2],
      ["shader", 1],
    ]);
    expect(heard).toEqual([1, 2, 1]);
  });
});

describe("fault isolation", () => {
  let engine: Engine;

  beforeAll(async () => {
    installGpuGlobals();
    installFakeNavigator(fakeDevice({}));
    const { Engine } = await import("../src/scene/Engine.ts");
    engine = await Engine.create({ limits: "adapter" });
  });

  const quietly = <T>(fn: () => T): T => {
    const log = console.error;
    console.error = () => {};
    try {
      return fn();
    } finally {
      console.error = log;
    }
  };

  it("reports a texture destroyed while a texture set binds it", () => {
    const world = engine.createWorld();
    const device = engine.gpu.device;
    const texture = device.createTexture({
      label: "test.baseColor",
      size: [4, 4],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    world.createTextureSet({
      baseColor: {
        view: texture.createView(),
        sampler: device.createSampler(),
      },
    });
    quietly(() => texture.destroy());
    expect(
      engine.errors.some(
        (e) => e.kind === "resource" && e.message.includes("test.baseColor"),
      ),
    ).toBe(true);
  });

  it("says nothing when a texture set goes before its texture", () => {
    const world = engine.createWorld();
    const device = engine.gpu.device;
    const texture = device.createTexture({
      label: "test.inOrder",
      size: [4, 4],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    const set = world.createTextureSet({
      baseColor: {
        view: texture.createView(),
        sampler: device.createSampler(),
      },
    });
    world.removeTextureSet(set);
    texture.destroy();
    expect(engine.errors.some((e) => e.message.includes("test.inOrder"))).toBe(
      false,
    );
  });

  it("unbinds an imagery array destroyed while bound", () => {
    const world = engine.createWorld();
    const texture = engine.gpu.device.createTexture({
      label: "test.imagery",
      size: [4, 4, 2],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    world.setImageryArray(texture.createView({ dimension: "2d-array" }));
    quietly(() => texture.destroy());
    expect(
      engine.errors.some(
        (e) => e.kind === "resource" && e.message.includes("test.imagery"),
      ),
    ).toBe(true);
  });
});
