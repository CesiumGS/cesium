import { beforeAll, describe, expect, it } from "vitest";
import { CapacityError } from "../src/scene/CapacityError.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import { fakeEngine } from "./fakeGpu.ts";

/** World pools (CESIUM2_WEBGPU_PLAN.md §13.15) on the fake device. */
describe("world pools", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  it("shares materials by content, freed with the last reference", () => {
    const world = engine.createWorld();
    const base = world.materialsInUse;
    const a = world.addMaterial({ baseColor: [1, 0, 0, 1] });
    const b = world.addMaterial({ baseColor: [1, 0, 0, 1] });
    const c = world.addMaterial({ baseColor: [0, 1, 0, 1] });
    expect(b).toBe(a);
    expect(c).not.toBe(a);
    expect(world.materialsInUse).toBe(base + 2);
    world.removeMaterial(a);
    expect(world.materialsInUse).toBe(base + 2); // b still holds it
    world.removeMaterial(b);
    expect(world.materialsInUse).toBe(base + 1);
    // The freed slot is reused for new content.
    expect(world.addMaterial({ baseColor: [0, 0, 1, 1] })).toBe(a);
  });

  it("throws CapacityError at a ceiling and takes nothing", () => {
    const world = engine.createWorld({ maxDraws: 4, maxMaterials: 4 });
    const mesh = world.addMesh(createBox());
    const draws = [0, 1, 2, 3].map(() => world.addDraw({ mesh }));
    const transforms = world.memory.transforms.used;
    expect(() => world.addDraw({ mesh })).toThrow(CapacityError);
    // The failed draw's owned transform was released.
    expect(world.memory.transforms.used).toBe(transforms);
    world.removeDraw(draws[0]!);
    expect(() => world.addDraw({ mesh })).not.toThrow();
    for (let k = world.materialsInUse; k < 4; k++) {
      world.addMaterial({ roughness: k / 8 + 0.01 });
    }
    expect(() => world.addMaterial({ roughness: 0.99 })).toThrow(CapacityError);
    expect(world.pressure()).toEqual({ fraction: 1, pool: "draw table" });
  });

  it("grows its GPU tables past their first rows", () => {
    const world = engine.createWorld();
    const mesh = world.addMesh(createBox());
    const generation = world.tableGeneration;
    for (let i = 0; i < 3000; i++) {
      world.addDraw({ mesh });
    }
    expect(world.memory.draws.used).toBe(3000);
    // Draws and transforms each doubled twice (1024 → 2048 → 4096).
    expect(world.tableGeneration).toBeGreaterThanOrEqual(generation + 4);
    expect(world.pressure().fraction).toBeLessThan(0.05);
  });
});
