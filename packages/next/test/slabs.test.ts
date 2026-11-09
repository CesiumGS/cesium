import { beforeAll, describe, expect, it } from "vitest";
import { installGpuGlobals } from "./fakeGpu.ts";
import type { Slabs as SlabsType, SlabOptions } from "../src/scene/Slabs.ts";

let Slabs: typeof SlabsType;

const MiB = 1 << 20;

interface Buffer {
  label: string;
  size: number;
  destroyed: boolean;
  destroy(): void;
}

/** A device that records buffers and growth copies (Slabs' only calls). */
function recorder() {
  const buffers: Buffer[] = [];
  const copies: Array<[number, number]> = [];
  const device = {
    createBuffer: (d: { label: string; size: number }) => {
      const buffer: Buffer = {
        label: d.label,
        size: d.size,
        destroyed: false,
        destroy() {
          this.destroyed = true;
        },
      };
      buffers.push(buffer);
      return buffer;
    },
    createCommandEncoder: () => ({
      copyBufferToBuffer: (
        _from: unknown,
        _a: number,
        _to: unknown,
        _b: number,
        size: number,
      ) => copies.push([buffers.length, size]),
      finish: () => ({}),
    }),
    queue: { submit: () => {} },
  };
  return { device: device as unknown as GPUDevice, buffers, copies };
}

function make(options: Partial<SlabOptions> = {}) {
  const r = recorder();
  const slabs = new Slabs(
    r.device,
    {
      vertexBudget: 1024 * MiB,
      indexBudget: 512 * MiB,
      slabCap: 256 * MiB,
      bindingBytes: 1024 * MiB,
      ...options,
    },
    () => {},
    () => {},
  );
  return { slabs, ...r };
}

describe("slabs", () => {
  beforeAll(async () => {
    installGpuGlobals();
    ({ Slabs } = await import("../src/scene/Slabs.ts"));
  });

  it("gives a range past the cap a slab of its exact aligned size", () => {
    const { slabs, copies } = make();
    const bytes = 280_000_001;
    const slab = slabs.pick(bytes, 0)!;
    expect(slab.id).toBe(1);
    expect(slab.vertexBuffer.size).toBe(280_000_004);
    expect(slab.vertex.capacity).toBe(280_000_004);
    expect(slabs.allocateVertex(slab, bytes)).toBe(0);
    // No doubling and no copy.
    expect(copies).toEqual([]);
    expect(slab.vertexBuffer.size).toBe(280_000_004);
  });

  it("doubles an ordinary slab to the cap, then opens another", () => {
    const { slabs, buffers } = make();
    const slab = slabs.pick(100 * MiB, 0)!;
    expect(slab.id).toBe(0);
    expect(slab.vertex.capacity).toBe(128 * MiB);
    expect(slabs.allocateVertex(slab, 100 * MiB)).toBe(0);
    const grown = slabs.pick(100 * MiB, 0)!;
    expect(grown).toBe(slab);
    expect(slab.vertex.capacity).toBe(256 * MiB);
    slabs.allocateVertex(slab, 100 * MiB);
    // 56 MiB left in the first slab: the next 100 MiB opens a second.
    const next = slabs.pick(100 * MiB, 0)!;
    expect(next.id).toBe(1);
    expect(next.vertex.capacity).toBe(128 * MiB);
    expect(buffers.every((b) => b.size <= 256 * MiB)).toBe(true);
  });

  it("refuses a range past the binding, naming the bytes and the limit", () => {
    const { slabs } = make({ slabCap: 128 * MiB, bindingBytes: 128 * MiB });
    expect(slabs.pick(280_000_000, 0)).toBeUndefined();
    const why = slabs.refusal(280_000_000, 0)!;
    expect(why).toContain("280,000,000");
    expect(why).toContain("134,217,728");
    expect(slabs.refusal(MiB, 0)).toBeUndefined();
  });

  it("counts a dedicated slab against the budget", () => {
    const { slabs } = make({ vertexBudget: 512 * MiB });
    const big = slabs.pick(300 * MiB, 0)!;
    expect(big.id).toBe(1);
    slabs.allocateVertex(big, 300 * MiB);
    // 16 MiB first slab + 300 MiB: a second 300 MiB doesn't fit in 512.
    expect(slabs.pick(300 * MiB, 0)).toBeUndefined();
    expect(slabs.refusal(300 * MiB, 0)).toContain("budget");
    expect(slabs.allocatedBytes).toBeGreaterThanOrEqual(300 * MiB);
  });

  it("destroys a dedicated slab's buffers when its range is released", () => {
    const { slabs } = make();
    const bytes = 300 * MiB;
    const slab = slabs.pick(bytes, 0)!;
    const offset = slabs.allocateVertex(slab, bytes)!;
    const vertexBuffer = slab.vertexBuffer as unknown as Buffer;
    const indexBuffer = slab.indexBuffer as unknown as Buffer;
    const before = slabs.allocatedBytes;
    slabs.releaseVertex(slab, offset, bytes);
    expect(vertexBuffer.destroyed).toBe(true);
    expect(indexBuffer.destroyed).toBe(true);
    expect(slabs.slabs[slab.id]).toBeUndefined();
    expect(slabs.allocatedBytes).toBe(before - 300 * MiB - 8 * MiB);
  });
});
