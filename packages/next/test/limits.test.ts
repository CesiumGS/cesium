import { beforeAll, describe, expect, it } from "vitest";
import {
  BASE_BINDING_LIMITS,
  countBindings,
  layoutObservers,
  layoutViolations,
  requiredLimitsFor,
  wgslBindings,
} from "../src/gpu/limits.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

const { VERTEX, FRAGMENT, COMPUTE } = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };

describe("limits", () => {
  it("counts bindings per stage", () => {
    const counts = countBindings([
      [
        { binding: 0, visibility: COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: COMPUTE | FRAGMENT, buffer: {} },
        { binding: 2, visibility: FRAGMENT, texture: {} },
      ],
      [{ binding: 0, visibility: VERTEX, sampler: {} }],
    ]);
    expect(counts.compute.storageBuffers).toBe(1);
    expect(counts.compute.uniformBuffers).toBe(1);
    expect(counts.fragment.uniformBuffers).toBe(1);
    expect(counts.fragment.sampledTextures).toBe(1);
    expect(counts.vertex.samplers).toBe(1);
  });

  it("names what a layout exceeds", () => {
    const storage = Array.from({ length: 9 }, (_, binding) => ({
      binding,
      visibility: COMPUTE,
      buffer: { type: "storage" as const },
    }));
    expect(layoutViolations([storage], BASE_BINDING_LIMITS)).toEqual([
      {
        stage: "compute",
        limit: "maxStorageBuffersPerShaderStage",
        count: 9,
        max: 8,
      },
    ]);
  });

  it("raises no binding count for the base tier", () => {
    const adapter = {
      maxStorageBuffersPerShaderStage: 10,
      maxSampledTexturesPerShaderStage: 48,
      maxStorageBufferBindingSize: 2 ** 32 - 4,
      maxBufferSize: 2 ** 32 - 4,
      maxTextureArrayLayers: 2048,
      maxComputeWorkgroupStorageSize: 32768,
    } as unknown as GPUSupportedLimits;
    const base = requiredLimitsFor("base", adapter);
    expect(base.maxStorageBuffersPerShaderStage).toBeUndefined();
    expect(base.maxSampledTexturesPerShaderStage).toBeUndefined();
    expect(base.maxTextureArrayLayers).toBe(2048);
    expect(requiredLimitsFor("minimum", adapter)).toEqual({});
  });

  it("reads bindings from WGSL", () => {
    const groups = wgslBindings(
      `@group(0) @binding(0) var<uniform> view: View;
       @group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
       @group(1) @binding(3) var<storage, read_write> items: array<u32>;
       @group(1) @binding(4) var color: texture_2d<f32>;
       @group(1) @binding(5) var linear: sampler;`,
      COMPUTE,
    );
    const counts = countBindings(groups).compute;
    expect(counts.uniformBuffers).toBe(1);
    expect(counts.storageBuffers).toBe(2);
    expect(counts.sampledTextures).toBe(1);
    expect(counts.samplers).toBe(1);
  });
});

/**
 * Every layout the engine creates fits the `base` tier (§13.15): the
 * engine starts on a recording fake device, and each explicit layout (and
 * each `layout: "auto"` pipeline, from its WGSL) is checked against the
 * spec defaults.
 */
describe("layout budget", () => {
  const layouts: Array<{
    label: string;
    groups: ReadonlyArray<ReadonlyArray<GPUBindGroupLayoutEntry> | undefined>;
  }> = [];

  beforeAll(async () => {
    installGpuGlobals();
    // Large limits so setup runs through; the budget is checked below.
    installFakeNavigator(fakeDevice({}));
    layoutObservers.add((label, groups) => layouts.push({ label, groups }));
    const { Engine } = await import("../src/scene/Engine.ts");
    const { POINT_STYLE_DEFAULTS } =
      await import("../src/scene/RenderContext.ts");
    const { PointSource } = await import("../src/vector/PointSource.ts");
    const engine = await Engine.create({ limits: "adapter" });
    const world = engine.createWorld();
    // Created on demand: a vector style's point cull, a point source.
    world.createPointCuller({ code: POINT_STYLE_DEFAULTS, uniforms: {} });
    const source = new PointSource(engine, world, {
      capacity: 16,
      origin: new Float64Array(3),
    });
    expect(source.capacity).toBe(16);
  });

  it("records the engine's layouts", () => {
    expect(layouts.length).toBeGreaterThan(20);
  });

  it("fits every layout in the base tier", () => {
    const over = layouts
      .map(({ label, groups }) => ({
        label,
        violations: layoutViolations(groups, BASE_BINDING_LIMITS),
      }))
      .filter((l) => l.violations.length > 0)
      .map(
        ({ label, violations }) =>
          `${label}: ${violations
            .map((v) => `${v.stage} ${v.limit} ${v.count}/${v.max}`)
            .join(", ")}`,
      );
    expect(over).toEqual([]);
  });
});
