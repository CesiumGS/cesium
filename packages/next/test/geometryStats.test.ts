import { describe, expect, it } from "vitest";
import {
  addBatches,
  emptyGeometry,
  geometryTotals,
  kindOf,
  worldGeometry,
} from "../src/render/view/geometryStats.ts";
import type { Batch } from "../src/scene/world/types.ts";

const batch = (over: Record<string, unknown>, mesh: Record<string, unknown>) =>
  ({
    shown: 1,
    items: 1,
    points: false,
    patches: false,
    billboard: false,
    instanced: false,
    mesh: { topology: "triangle-list", indexCount: 9, ...mesh },
    ...over,
  }) as unknown as Batch;

describe("geometry stats", () => {
  it("sorts batches into kinds", () => {
    expect(kindOf(batch({}, { skirtStart: 4 }))).toBe("terrain");
    expect(kindOf(batch({}, {}))).toBe("meshes");
    expect(kindOf(batch({ instanced: true }, {}))).toBe("instanced");
    expect(kindOf(batch({ billboard: true }, {}))).toBe("billboards");
    expect(kindOf(batch({}, { topology: "line-list" }))).toBe("lines");
    expect(kindOf(batch({ patches: true }, {}))).toBe("patches");
    expect(kindOf(batch({ points: true }, {}))).toBe("points");
  });

  it("counts whole triangles per draw item and skips hidden batches", () => {
    const g = emptyGeometry();
    addBatches(
      [
        batch({ items: 3 }, { indexCount: 10 }), // 3 whole triangles each
        batch({ shown: 0, items: 5 }, { indexCount: 300 }),
        batch({ items: 2 }, { topology: "line-list", indexCount: 7 }),
        batch({ patches: true, items: 4 }, {}),
        batch({ points: true, items: 2 }, { points: { capacity: 100 } }),
      ],
      g,
    );
    expect(g.meshes).toEqual({
      draws: 3,
      triangles: 9,
      points: 0,
      segments: 0,
    });
    expect(g.lines.segments).toBe(6);
    expect(g.patches).toEqual({
      draws: 4,
      triangles: 0,
      points: 0,
      segments: 0,
    });
    expect(g.points.points).toBe(200);
    expect(geometryTotals(g).triangles).toBe(9);
    expect(Number.isInteger(geometryTotals(g).triangles)).toBe(true);
  });

  it("recounts a world only when its version changes", () => {
    const list = [batch({}, { indexCount: 9 })];
    const world = { version: 1, raster: { batchList: list } };
    expect(worldGeometry(world).meshes.triangles).toBe(3);
    list.push(batch({}, { indexCount: 9 }));
    expect(worldGeometry(world).meshes.triangles).toBe(3);
    world.version = 2;
    expect(worldGeometry(world).meshes.triangles).toBe(6);
  });
});
