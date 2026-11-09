import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import { MaterialFlags } from "../src/render/layout.ts";
import { type View } from "../src/scene/View.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { World } from "../src/scene/World.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import { fakeEngine } from "./fakeGpu.ts";

/**
 * Translucency's passes (moments, color, composite) run for a view only
 * when a blended draw is visible in it: one drawn in no view (`viewMask`)
 * or hidden switches nothing on (it used to cost every frame the passes'
 * full-screen work, task-18 report "Fix round 2").
 */

const square: MeshData = {
  positions: new Float32Array([
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
  uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
};

let engine: Engine;
/** Every test's views, removed after it. */
const created: View[] = [];
/** Labels of the render passes the last frame began. */
const passes: string[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
  const device = engine.gpu.device as unknown as Record<string, unknown>;
  const create = device.createCommandEncoder as (
    d?: GPUCommandEncoderDescriptor,
  ) => GPUCommandEncoder;
  device.createCommandEncoder = (d?: GPUCommandEncoderDescriptor) => {
    const encoder = create(d) as unknown as Record<string, unknown>;
    const begin = encoder.beginRenderPass as (
      p: GPURenderPassDescriptor,
    ) => GPURenderPassEncoder;
    encoder.beginRenderPass = (p: GPURenderPassDescriptor) => {
      passes.push(p.label ?? "");
      return begin(p);
    };
    return encoder;
  };
});

function scene(views = 1): { world: World; views: View[] } {
  const world = engine.createWorld({
    maxDraws: 16,
    vertexBytes: 1 << 16,
    indexBytes: 1 << 16,
  });
  const list: View[] = [];
  for (let i = 0; i < views; i++) {
    const view = engine.addView({ target: new OffscreenTarget(64, 64), world });
    view.camera.position.set([0, 0, 10]);
    list.push(view);
    created.push(view);
  }
  return { world, views: list };
}

function blended(world: World, viewMask?: number) {
  const mesh = world.addMesh(square);
  const material = world.addMaterial({
    baseColor: [1, 1, 1, 0.4],
    flags: MaterialFlags.alphaBlend,
  });
  return world.addDraw({
    mesh,
    material,
    origin: new Float64Array(3),
    ...(viewMask === undefined ? {} : { viewMask }),
  });
}

/** Renders a frame; whether each view's translucent passes ran. */
function frame(views: View[]): boolean[] {
  passes.length = 0;
  engine.renderFrame();
  const frames = engine.raster.viewFrames;
  return views.map((view) => frames.get(view)!.translucent);
}

const translucentPasses = () =>
  passes.filter(
    (label) => label.startsWith("translucent") || label === "composite",
  );

afterEach(() => {
  for (const view of created.splice(0)) {
    engine.removeView(view);
  }
});

describe("translucency's passes run only for visible blended draws", () => {
  it("a blended draw in no view (viewMask 0) runs none", () => {
    const { world, views } = scene();
    blended(world, 0);
    expect(world.translucentRange([0, 0, 10], engine.viewBit(views[0]!))).toBe(
      undefined,
    );
    expect(frame(views)).toEqual([false]);
    expect(translucentPasses()).toEqual([]);
  });

  it("a hidden blended draw runs none", () => {
    const { world, views } = scene();
    const draw = blended(world);
    world.setVisible(draw, false);
    expect(frame(views)).toEqual([false]);
    expect(translucentPasses()).toEqual([]);
  });

  it("a visible blended draw runs them", () => {
    const { world, views } = scene();
    blended(world);
    expect(frame(views)).toEqual([true]);
    expect(translucentPasses()).toEqual([
      "translucent.moments",
      "translucent.color",
      "composite",
    ]);
  });

  it("a draw shown in one view of two runs them in that view only", () => {
    const { world, views } = scene(2);
    const draw = blended(world, engine.viewBit(views[1]!));
    expect(frame(views)).toEqual([false, true]);
    world.setViewMask(draw, engine.viewBit(views[0]!));
    expect(frame(views)).toEqual([true, false]);
    world.setViewMask(draw, 0);
    expect(frame(views)).toEqual([false, false]);
    expect(translucentPasses()).toEqual([]);
  });
});
