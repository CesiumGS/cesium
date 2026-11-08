import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import type { DrawHandle, World } from "../src/scene/World.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import { CustomShader } from "../src/scene/CustomShader.ts";
import { fakeEngine } from "./fakeGpu.ts";

/**
 * The draw bundles hold only batches some view draws. A streamed tile the
 * cache keeps but no view selects has view mask 0; its batch used to stay
 * in every bundle (an empty indirect draw in the opaque, depth, prepass
 * and each shadow cascade's pass) and in every recording of them. Flying
 * over the globe for a minute left ~8,800 such batches: 11.5 ms of the
 * frame's CPU recording bundles, and opaque 14.4 ms against 8.5 ms with
 * the same view after a trim (perf-report.md, 2026-11-07).
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
/** Indirect draws recorded into each bundle, by the bundle's label. */
let draws = new Map<string, number>();
/** Bundles recorded, by label. */
let recorded = new Map<string, number>();

beforeAll(async () => {
  engine = await fakeEngine();
  const device = engine.gpu.device as unknown as Record<string, unknown>;
  const create = device.createRenderBundleEncoder as (
    d: GPURenderBundleEncoderDescriptor,
  ) => GPURenderBundleEncoder;
  device.createRenderBundleEncoder = (d: GPURenderBundleEncoderDescriptor) => {
    const label = d.label ?? "";
    recorded.set(label, (recorded.get(label) ?? 0) + 1);
    const encoder = create(d) as unknown as Record<string, unknown>;
    encoder.drawIndexedIndirect = () => {
      draws.set(label, (draws.get(label) ?? 0) + 1);
    };
    return encoder as unknown as GPURenderBundleEncoder;
  };
});

function reset(): void {
  draws = new Map();
  recorded = new Map();
}

/** `count` draws of their own meshes: a batch each, as streamed tiles are. */
function tiles(count: number): { world: World; handles: DrawHandle[] } {
  const world = engine.createWorld({
    maxDraws: 64,
    vertexBytes: 1 << 18,
    indexBytes: 1 << 18,
  });
  const handles: DrawHandle[] = [];
  for (let i = 0; i < count; i++) {
    handles.push(
      world.addDraw({
        mesh: world.addMesh(square),
        origin: new Float64Array([i, 0, 0]),
      }),
    );
  }
  return { world, handles };
}

/** Records the frame's bundles as a frame does; the opaque one's draws. */
function frame(world: World): number {
  reset();
  world.prepareFrame();
  world.depthBundle();
  world.prepassBundle();
  world.shadowBundle();
  return draws.get("world.bundle") ?? 0;
}

describe("draw bundles and caster masks", () => {
  it("holds a batch only its view's cascades draw in the shadow bundle alone", () => {
    const { world, handles } = tiles(3);
    for (const handle of handles) {
      world.setViewMask(handle, 0);
    }
    expect(frame(world)).toBe(0);
    world.setCasterMask(handles[0]!, 1);
    expect(frame(world)).toBe(0);
    expect(draws.get("world.shadowBundle")).toBe(1);
    expect(draws.get("world.depthBundle")).toBeUndefined();
    expect(draws.get("world.prepassBundle")).toBeUndefined();
    // The shadow bundle alone was recorded again.
    expect(recorded.get("world.bundle")).toBeUndefined();
    expect(recorded.get("world.shadowBundle")).toBe(1);
    // Drawn by the view as well: held once. Leaving the view keeps it.
    world.setViewMask(handles[0]!, 1);
    expect(frame(world)).toBe(1);
    expect(draws.get("world.shadowBundle")).toBe(1);
    world.setViewMask(handles[0]!, 0);
    expect(frame(world)).toBe(0);
    expect(draws.get("world.shadowBundle")).toBe(1);
    world.setCasterMask(handles[0]!, 0);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBeUndefined();
  });

  it("keeps the count through a shader change and a removal", () => {
    const { world, handles } = tiles(2);
    const mesh = world.addMesh(square);
    const a = world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    const b = world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    for (const handle of handles) {
      world.setViewMask(handle, 0);
    }
    world.setCasterMask(a, 1);
    world.setCasterMask(b, 1);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBe(1);
    world.removeDraw(a);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBe(1);
    world.removeDraw(b);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBeUndefined();
    // The freed batch's next draw starts with no caster.
    world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    frame(world);
    expect(draws.get("world.shadowBundle")).toBeUndefined();
  });

  it("keeps the count through a real shader change", () => {
    const { world, handles } = tiles(1);
    world.setViewMask(handles[0]!, 0);
    const mesh = world.addMesh(square);
    const a = world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    const b = world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    world.setCasterMask(a, 1);
    world.setCasterMask(b, 1);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBe(1);
    // `a` moves to the batch of its own shader: two batches, each with a caster.
    const shader = new CustomShader({
      label: "tint",
      fragment:
        "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}",
    });
    world.setDrawShader(a, shader);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBe(2);
    // Taking the caster off `a` leaves its batch out of the bundle again.
    world.setCasterMask(a, 0);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBe(1);
    // `b` changes shader as well, into `a`'s batch, empty of casters: held.
    world.setDrawShader(b, shader);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBe(1);
    world.removeDraw(b);
    frame(world);
    expect(draws.get("world.shadowBundle")).toBeUndefined();
  });

  it("records the shadow bundle again only when a batch's first caster joins or its last leaves", () => {
    const { world, handles } = tiles(1);
    world.setViewMask(handles[0]!, 0);
    const mesh = world.addMesh(square);
    const a = world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    const b = world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    world.setCasterMask(a, 1);
    frame(world);
    // A second caster in the same batch: nothing to record again.
    world.setCasterMask(b, 1);
    frame(world);
    expect(recorded.get("world.shadowBundle")).toBeUndefined();
    world.setCasterMask(a, 0);
    frame(world);
    expect(recorded.get("world.shadowBundle")).toBeUndefined();
    world.setCasterMask(b, 0);
    frame(world);
    expect(recorded.get("world.shadowBundle")).toBe(1);
  });

  it("wakes the views it casts for", () => {
    const { world, handles } = tiles(1);
    world.setViewMask(handles[0]!, 0);
    frame(world);
    world.changedViews = 0;
    world.setCasterMask(handles[0]!, 2);
    expect(world.changedViews & 2).not.toBe(0);
  });
});

describe("draw bundles and view masks", () => {
  it("leaves out batches no view draws, in every bundle", () => {
    const { world, handles } = tiles(10);
    expect(frame(world)).toBe(10);
    // Seven tiles stay resident, selected in no view.
    for (const handle of handles.slice(3)) {
      world.setViewMask(handle, 0);
    }
    expect(frame(world)).toBe(3);
    expect(draws.get("world.depthBundle")).toBe(3);
    expect(draws.get("world.prepassBundle")).toBe(3);
    expect(draws.get("world.shadowBundle")).toBe(3);
    // Selected again in a view: back in the bundles.
    world.setViewMask(handles[5]!, 2);
    expect(frame(world)).toBe(4);
  });

  it("records the bundles again only when a batch joins or leaves them", () => {
    const { world, handles } = tiles(4);
    frame(world);
    // A mask changing between views doesn't change what the bundles hold.
    world.setViewMask(handles[0]!, 2);
    world.setViewMask(handles[0]!, 3);
    frame(world);
    expect(recorded.get("world.bundle")).toBeUndefined();
    world.setViewMask(handles[0]!, 0);
    expect(frame(world)).toBe(3);
    expect(recorded.get("world.bundle")).toBe(1);
    // Settled: nothing recorded.
    frame(world);
    expect(recorded.size).toBe(0);
  });

  it("keeps a batch's count through removals and a freed batch's reuse", () => {
    const { world, handles } = tiles(1);
    const mesh = world.addMesh(square);
    // Two draws of one mesh share a batch: it stays while either is shown.
    const a = world.addDraw({ mesh, origin: new Float64Array(3) });
    const b = world.addDraw({
      mesh,
      origin: new Float64Array(3),
      viewMask: 0,
    });
    expect(frame(world)).toBe(2);
    world.setViewMask(a, 0);
    expect(frame(world)).toBe(1);
    world.setViewMask(b, 1);
    expect(frame(world)).toBe(2);
    // The hidden one removed: its batch keeps the shown one.
    world.setViewMask(a, 0);
    world.removeDraw(a);
    expect(frame(world)).toBe(2);
    world.removeDraw(b);
    expect(frame(world)).toBe(1);
    // A new draw in the freed batch's slot starts from its own mask.
    world.addDraw({ mesh, origin: new Float64Array(3), viewMask: 0 });
    expect(frame(world)).toBe(1);
    world.setViewMask(handles[0]!, 0);
    expect(frame(world)).toBe(0);
  });
});
