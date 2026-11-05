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

  it("keeps geometry in slabs that grow, multiply and close", () => {
    // 4 KB slabs at most: a box (about 1 KB of streams) or two fit each.
    const world = engine.createWorld({
      vertexBytes: 64 << 10,
      indexBytes: 64 << 10,
      slabBytes: 4096,
    });
    const slabs = world.slabs;
    const meshes = Array.from({ length: 12 }, () => world.addMesh(createBox()));
    const ids = new Set(meshes.map((m) => m.slab));
    expect(ids.size).toBeGreaterThan(1);
    // Draws of meshes in different slabs (each batch binds its own).
    for (const mesh of meshes) {
      world.addDraw({ mesh });
    }
    expect(world.memory.vertexBytes.used).toBeGreaterThan(0);
    // A slab past the first closes when its last mesh goes.
    const last = Math.max(...ids);
    for (const mesh of meshes.filter((m) => m.slab === last)) {
      // Draws must go first; these were the only users.
      world.removeMesh(mesh);
    }
    expect(slabs.slabs[last]).toBeUndefined();
  });

  it("throws CapacityError past the geometry budget, taking nothing", () => {
    const world = engine.createWorld({
      vertexBytes: 8192,
      indexBytes: 8192,
      slabBytes: 4096,
    });
    const before = world.memory.vertexBytes.used;
    let added = 0;
    expect(() => {
      for (;;) {
        world.addMesh(createBox());
        added++;
      }
    }).toThrow(CapacityError);
    expect(added).toBeGreaterThan(0);
    expect(world.memory.vertexBytes.used).toBeGreaterThan(before);
    // The failed mesh left no ranges behind: freeing the others empties it.
    expect(world.pressure().pool).toMatch(/arena/);
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
