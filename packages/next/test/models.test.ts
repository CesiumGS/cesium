import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import type { World } from "../src/scene/World.ts";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import type { PlacementOptions } from "../src/scene/gltfModel.ts";
import {
  fakeDevice,
  installFakeNavigator,
  installGpuGlobals,
} from "./fakeGpu.ts";

/** One triangle, one draw, the default material: nothing to decode. */
function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [
      {
        mesh: 0,
        material: -1,
        matrix: Float64Array.from([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
      },
    ],
    featureTables: [],
    warnings: [],
  };
}

const at = {
  modelMatrix: new Float64Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6378137, 0, 0, 1,
  ]),
};

describe("ModelResource and ModelPlacement", () => {
  let engine: Engine;
  let world: World;
  let usage: typeof import("../src/scene/gltfModel.ts").modelUsage;

  beforeAll(async () => {
    installGpuGlobals();
    installFakeNavigator(fakeDevice({}));
    const { Engine } = await import("../src/scene/Engine.ts");
    ({ modelUsage: usage } = await import("../src/scene/gltfModel.ts"));
    engine = await Engine.create({ limits: "adapter" });
    world = engine.createWorld();
  });

  it("shares one upload between placements, freed after release and the last removal", () => {
    const model = engine.uploadModel(world, triangle(), { name: "tri" });
    const a = model.place(at);
    const b = model.place(at);
    expect(model.placementCount).toBe(2);
    // Removing every placement never frees a model still held.
    a.remove();
    b.remove();
    expect(model.freed).toBe(false);
    const c = model.place(at);
    model.release();
    expect(model.freed).toBe(false); // c holds it
    c.remove();
    expect(model.freed).toBe(true);
    expect(usage(world).some((m) => m.name === "tri")).toBe(false);
  });

  it("frees a one-off model with its placement (using)", () => {
    let placement;
    {
      using model = engine.uploadModel(world, triangle());
      placement = model.place(at);
    }
    expect(placement.model.released).toBe(true);
    expect(placement.model.freed).toBe(false);
    placement.remove();
    expect(placement.model.freed).toBe(true);
  });

  it("refuses to place from a released handle", () => {
    const model = engine.uploadModel(world, triangle());
    model.release();
    expect(() => model.place(at)).toThrow(/released/);
  });

  it("removes idempotently and refuses use after removal", () => {
    using model = engine.uploadModel(world, triangle());
    const p = model.place(at);
    p.remove();
    p.remove();
    expect(model.placementCount).toBe(0);
    expect(() => p.setVisible(false)).toThrow(/removed/);
    expect(() => p.bounds()).toThrow(/removed/);
  });

  it("refuses to upload an asset whose source data was released", () => {
    const asset = triangle();
    using model = engine.uploadModel(world, asset);
    expect(model.freed).toBe(false);
    expect(() => engine.uploadModel(world, asset)).toThrow(/source data/);
    // Kept on request: uploadable again.
    const kept = triangle();
    using first = engine.uploadModel(world, kept, {
      releaseSourceData: false,
    });
    using second = engine.uploadModel(world, kept);
    expect(first.bytes).toBe(second.bytes);
  });

  it("rejects a parent with a height reference, also from JavaScript", () => {
    using model = engine.uploadModel(world, triangle());
    const root = world.addTransform(at.modelMatrix);
    const both = {
      ...at,
      parent: root,
      heightReference: "clampToGround",
    } as unknown as PlacementOptions;
    expect(() => model.place(both)).toThrow(/heightReference/);
  });

  it("follows its transform in its bounds", () => {
    using model = engine.uploadModel(world, triangle());
    const p = model.place(at);
    const before = p.bounds().center[0]!;
    const moved = Float64Array.from(at.modelMatrix);
    moved[12] = moved[12]! + 100;
    p.setTransform(moved);
    expect(p.bounds().center[0]! - before).toBeCloseTo(100, 6);
    p.remove();
  });

  it("swaps a shader in place, keeping its draws", async () => {
    const { CustomShader } = await import("../src/scene/CustomShader.ts");
    const shader = new CustomShader({
      fragment:
        "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}",
    });
    using model = engine.uploadModel(world, triangle());
    const p = model.place(at);
    const draws = [...p.draws];
    p.setShader(shader);
    p.setShader(undefined);
    expect(p.draws).toEqual(draws);
    expect(world.hasDraw(draws[0]!)).toBe(true);
    p.remove();
  });
});
