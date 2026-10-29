import { describe, expect, it } from "vitest";
import { RangeAllocator } from "../src/gpu/RangeAllocator.ts";
import {
  FrameGraph,
  type TextureAllocator,
  type TextureDesc,
} from "../src/render/FrameGraph.ts";

describe("RangeAllocator", () => {
  it("allocates aligned ranges and coalesces freed neighbors", () => {
    const a = new RangeAllocator(100, 4);
    const x = a.allocate(10)!; // rounds to 12
    const y = a.allocate(20)!;
    const z = a.allocate(30)!;
    expect([x, y, z]).toEqual([0, 12, 32]);
    expect(a.allocate(100)).toBeUndefined();
    a.release(y, 20);
    a.release(x, 10);
    // x and y coalesce into one 32-byte range at offset 0.
    expect(a.allocate(32)).toBe(0);
    a.release(0, 32);
    a.release(z, 30);
    expect(a.used).toBe(0);
    expect(a.allocate(100)).toBe(0);
  });
});

/** Records acquire/release order with fake textures; no GPU needed. */
class FakeAllocator implements TextureAllocator {
  log: string[] = [];
  private next = 0;
  acquire(desc: TextureDesc): GPUTexture {
    const id = `t${this.next++}`;
    this.log.push(`acquire ${desc.label} ${id}`);
    return {
      label: id,
      createView: () => ({ label: id }),
    } as unknown as GPUTexture;
  }
  release(desc: TextureDesc, texture: GPUTexture): void {
    this.log.push(`release ${desc.label} ${texture.label}`);
  }
}

const fakeEncoder = {
  pushDebugGroup() {},
  popDebugGroup() {},
} as unknown as GPUCommandEncoder;
const desc = (label: string): TextureDesc => ({
  label,
  format: "rgba8unorm",
  width: 4,
  height: 4,
  usage: 0,
});

describe("FrameGraph", () => {
  it("culls passes whose outputs are never consumed", () => {
    const graph = new FrameGraph(new FakeAllocator());
    const a = graph.createTexture("a", desc("a"));
    const unused = graph.createTexture("unused", desc("unused"));
    const out = graph.importTexture("out", {} as GPUTextureView);
    graph.addPass("produce", { writes: [a] }, () => {});
    graph.addPass("dead", { writes: [unused] }, () => {});
    graph.addPass("upload", { sideEffect: true }, () => {});
    graph.addPass("present", { reads: [a], writes: [out] }, () => {});
    expect(graph.compile()).toEqual(["produce", "upload", "present"]);
  });

  it("releases transient textures after their last use so they can alias", () => {
    const allocator = new FakeAllocator();
    const graph = new FrameGraph(allocator);
    const a = graph.createTexture("a", desc("a"));
    const b = graph.createTexture("b", desc("b"));
    const out = graph.importTexture("out", {} as GPUTextureView);
    graph.addPass("pa", { writes: [a] }, (_, get) => void get(a));
    graph.addPass("pb", { reads: [a], writes: [b] }, (_, get) => {
      get(a);
      get(b);
    });
    graph.addPass("present", { reads: [b], writes: [out] }, (_, get) => {
      get(b);
      get(out);
    });
    graph.execute(fakeEncoder);
    expect(allocator.log).toEqual([
      "acquire a t0",
      "acquire b t1",
      "release a t0",
      "release b t1",
    ]);
  });

  it("executes a built graph every frame and rebinds imported textures", () => {
    const allocator = new FakeAllocator();
    const graph = new FrameGraph(allocator);
    const a = graph.createTexture("a", desc("a"));
    const out = graph.importTexture("out", {
      label: "frame0",
    } as GPUTextureView);
    const seen: string[] = [];
    graph.addPass("pa", { writes: [a] }, (_, get) => void get(a));
    graph.addPass("present", { reads: [a], writes: [out] }, (_, get) => {
      get(a);
      seen.push(get(out).label);
    });
    graph.execute(fakeEncoder);
    graph.setImported(out, { label: "frame1" } as GPUTextureView);
    graph.execute(fakeEncoder);
    expect(seen).toEqual(["frame0", "frame1"]);
    expect(allocator.log).toEqual([
      "acquire a t0",
      "release a t0",
      "acquire a t1",
      "release a t1",
    ]);
  });
});
