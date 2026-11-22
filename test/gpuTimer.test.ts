import { describe, expect, it } from "vitest";
import {
  GpuTimer,
  frameScratch,
  frameTimes,
  mergeOrder,
  passTimes,
} from "../packages/core/src/gpu/GpuTimer.ts";
import { installGpuGlobals } from "./fakeGpu.ts";

describe("GPU pass order", () => {
  it("keeps a skipped pass in its place", () => {
    // shadows 0, cull 1, sky 2, opaque 3; a frame without the cull.
    expect(mergeOrder([0, 1, 2, 3], [0, 2, 3])).toEqual([0, 1, 2, 3]);
  });
  it("inserts a new pass after the one it followed", () => {
    expect(mergeOrder([0, 2, 3], [0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
    expect(mergeOrder([], [4, 5])).toEqual([4, 5]);
    expect(mergeOrder([2, 3], [9, 2, 3])).toEqual([9, 2, 3]);
  });
  it("doesn't reorder known passes", () => {
    expect(mergeOrder([0, 1, 2], [1, 0, 2])).toEqual([0, 1, 2]);
  });
});

describe("GPU pass times", () => {
  const times = (intervals: Array<[number, number]>) => {
    const own = new Float64Array(intervals.length);
    const total = passTimes(
      intervals.map(([b]) => b),
      intervals.map(([, e]) => e),
      intervals.length,
      own,
    );
    return { total, own: [...own] };
  };

  it("adds passes that don't overlap", () => {
    expect(
      times([
        [0, 1],
        [2, 3],
        [3, 5],
      ]),
    ).toEqual({ total: 4, own: [1, 1, 2] });
  });

  it("counts overlapping passes once (a tiler starts a pass before the last ends)", () => {
    // Measured on an M-series MacBook Air: the translucent passes begin
    // while the opaque pass's fragments run, so their intervals nearly
    // cover it. Summed they read 3 opaque passes more (task-18 report);
    // the GPU was busy 13.5.
    expect(
      times([
        [0, 10], // opaque
        [1, 12], // translucent-moments
        [1.5, 13], // translucent-color
        [1.5, 13.5], // translucent-composite
      ]),
    ).toEqual({ total: 13.5, own: [10, 2, 1, 0.5] });
  });

  it("gives a pass inside an earlier one no time of its own", () => {
    expect(
      times([
        [0, 10],
        [2, 3],
        [9, 11],
      ]),
    ).toEqual({ total: 11, own: [10, 0, 1] });
  });

  it("counts a later pass's time before an earlier one began", () => {
    expect(
      times([
        [5, 10],
        [0, 6],
      ]),
    ).toEqual({ total: 10, own: [5, 5] });
    expect(
      times([
        [2, 4],
        [6, 8],
        [0, 10],
      ]),
    ).toEqual({ total: 10, own: [2, 2, 6] });
  });

  it("ignores a pass whose end isn't after its begin", () => {
    expect(
      times([
        [0, 2],
        [5, 5],
        [7, 6],
      ]),
    ).toEqual({ total: 2, own: [2, 0, 0] });
  });
});

/** 64-bit timestamps (ns) as the resolved query set's 32-bit word pairs. */
function words(ns: number[]): Uint32Array {
  const out = new Uint32Array(ns.length * 2);
  ns.forEach((t, i) => {
    out[i * 2] = t % 4294967296;
    out[i * 2 + 1] = Math.floor(t / 4294967296);
  });
  return out;
}

describe("GPU frame times", () => {
  it("adds a label's passes' own times, overlapping ones once", () => {
    // Two shadow cascades (label 0) overlapping each other, then the
    // opaque pass (1) overlapping the second, after 2^32 ns of uptime.
    const base = 2 ** 32 + 5;
    const ns = [0, 4, 3, 6, 5, 15].map((t) => base + t * 1e6);
    const times = frameTimes(words(ns), 3, [0, 0, 1], frameScratch(4));
    expect(times.total).toBeCloseTo(15e6, 0);
    expect(times.perLabel[0]).toBeCloseTo(6e6, 0);
    expect(times.perLabel[1]).toBeCloseTo(9e6, 0);
    expect(times.span).toBeCloseTo(15e6, 0);
  });

  it("ignores a pass whose queries were never written (read as 0)", () => {
    const ns = [0, 0, 5e6, 9e6];
    const times = frameTimes(words(ns), 2, [0, 1], frameScratch(2));
    expect(times.total).toBeCloseTo(4e6, 0);
    expect(times.span).toBeCloseTo(4e6, 0);
    expect(times.perLabel[0]).toBe(0);
  });

  it("is what the timer reports: per-pass entries add up to its frame time", async () => {
    // A device with timestamp queries whose readbacks hold one frame:
    // opaque, then the translucent passes overlapping it (as measured on
    // a tiler; ns).
    const frame = words(
      [
        0, 1_000_000, 1_100_000, 8_500_000, 1_200_000, 9_900_000, 1_250_000,
        10_800_000, 1_250_000, 11_100_000,
      ].map((t) => t + 1_000_000),
    );
    const buffer = () => ({
      mapAsync: () => Promise.resolve(),
      getMappedRange: (offset = 0, size = frame.byteLength) =>
        frame.buffer.slice(offset, offset + size),
      unmap: () => {},
      destroy: () => {},
    });
    const device = {
      features: new Set(["timestamp-query"]),
      createQuerySet: () => ({ destroy: () => {} }),
      createBuffer: buffer,
      queue: { onSubmittedWorkDone: () => Promise.resolve() },
    } as unknown as GPUDevice;
    installGpuGlobals();
    const timer = new GpuTimer(device, true);
    expect(timer.beginFrame()).toBe(true);
    for (const label of [
      "shadows",
      "opaque",
      "translucent-moments",
      "translucent-color",
      "translucent-composite",
    ]) {
      expect(timer.passWrites(label)).toBeDefined();
    }
    timer.endFrame({
      resolveQuerySet: () => {},
      copyBufferToBuffer: () => {},
    } as unknown as GPUCommandEncoder);
    timer.afterSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The union: 0–1 and 1.1–11.1 ms. Summed, it was 39.3 ms.
    expect(timer.milliseconds).toBeCloseTo(11, 6);
    const passes = timer.passes;
    const sum = Object.values(passes).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(timer.milliseconds, 9);
    expect(passes.opaque).toBeCloseTo(7.4, 6);
    expect(passes["translucent-moments"]).toBeCloseTo(1.4, 6);
    expect(passes["translucent-composite"]).toBeCloseTo(0.3, 6);
    expect(timer.spanMilliseconds).toBeCloseTo(11.1, 6);
    expect(GpuTimer.version).toBe(2);
  });
});

describe("GPU timer groups", () => {
  it("puts a group's interval first, with the wall time of the submit", async () => {
    // Imagery (a group, run before the frame: 0-2 ms), then opaque
    // (2.5-6.5 ms).
    const frame = words([1e6, 3e6, 3.5e6, 7.5e6]);
    const buffer = () => ({
      mapAsync: () => Promise.resolve(),
      getMappedRange: (offset = 0, size = frame.byteLength) =>
        frame.buffer.slice(offset, offset + size),
      unmap: () => {},
      destroy: () => {},
    });
    const device = {
      features: new Set(["timestamp-query"]),
      createQuerySet: () => ({ destroy: () => {} }),
      createBuffer: buffer,
      queue: { onSubmittedWorkDone: () => Promise.resolve() },
    } as unknown as GPUDevice;
    installGpuGlobals();
    const timer = new GpuTimer(device, true);
    // The first pass of a group writes both ends, the rest only the end.
    const first = GpuTimer.groupWrites(device, "imagery")!;
    const next = GpuTimer.groupWrites(device, "imagery")!;
    expect(first.beginningOfPassWriteIndex).toBeDefined();
    expect(next.beginningOfPassWriteIndex).toBeUndefined();
    expect(next.endOfPassWriteIndex).toBe(first.endOfPassWriteIndex);
    timer.beginFrame();
    timer.passWrites("opaque");
    const copies: number[] = [];
    timer.endFrame({
      resolveQuerySet: () => {},
      copyBufferToBuffer: (...a: unknown[]) => copies.push(a[3] as number),
    } as unknown as GPUCommandEncoder);
    // The group's 16 bytes, then the frame's passes after them.
    expect(copies).toEqual([0, 16]);
    timer.afterSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(Object.keys(timer.passes)).toEqual(["imagery", "opaque"]);
    expect(timer.passes.imagery).toBeCloseTo(2, 6);
    expect(timer.milliseconds).toBeCloseTo(6, 6);
    expect(timer.lastSample.spanMs).toBeCloseTo(6.5, 6);
    expect(timer.lastSample.wallMs).toBeGreaterThanOrEqual(0);
    // The group is spent: the next frame carries none.
    timer.beginFrame();
    timer.passWrites("opaque");
    copies.length = 0;
    timer.endFrame({
      resolveQuerySet: () => {},
      copyBufferToBuffer: (...a: unknown[]) => copies.push(a[3] as number),
    } as unknown as GPUCommandEncoder);
    expect(copies).toEqual([0]);
    timer.destroy();
  });
});

describe("GPU frame markers", () => {
  it("splits the untimed share into in-frame and between-frames", async () => {
    // One pass 2-6 ms; markers: first 0 / 0.5 ms, last 7 / 7.5 ms. Then a
    // second frame whose first marker comes 1.5 ms after the last (9 ms).
    const first = words([2e6, 6e6, 0, 0.5e6, 7e6, 7.5e6]);
    const second = words([11e6, 14e6, 9e6, 9.5e6, 15e6, 15.5e6]);
    let frames = [first, second];
    const mapped = new Map<object, Uint32Array>();
    const make = () => {
      const b = {
        mapAsync: () => {
          mapped.set(b, frames.shift()!);
          return Promise.resolve();
        },
        getMappedRange: (offset = 0, size = 1e6) =>
          mapped.get(b)!.buffer.slice(offset, offset + size),
        unmap: () => {},
        destroy: () => {},
      };
      return b;
    };
    const finish: Array<() => void> = [];
    const device = {
      features: new Set(["timestamp-query"]),
      createQuerySet: () => ({ destroy: () => {} }),
      createBuffer: make,
      createShaderModule: () => ({}),
      createComputePipeline: () => ({}),
      queue: {
        onSubmittedWorkDone: () =>
          new Promise<void>((resolve) => finish.push(resolve)),
      },
    } as unknown as GPUDevice;
    installGpuGlobals();
    const timer = new GpuTimer(device, true);
    const encoder = {
      beginComputePass: () => ({
        setPipeline: () => {},
        dispatchWorkgroups: () => {},
        end: () => {},
      }),
      resolveQuerySet: () => {},
      copyBufferToBuffer: () => {},
    } as unknown as GPUCommandEncoder;
    const submit = () => {
      timer.beginFrame();
      timer.startMarker(encoder);
      timer.passWrites("opaque");
      timer.endFrame(encoder);
      timer.afterSubmit();
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
    submit();
    submit();
    finish.shift()!();
    await settle();
    expect(timer.lastSample.inFrameUntimedMs).toBeCloseTo(2.5, 6);
    // The GPU idled before the first frame: no between-frames gap.
    expect(timer.lastSample.betweenFramesMs).toBeNaN();
    finish.shift()!();
    await settle();
    expect(timer.lastSample.inFrameUntimedMs).toBeCloseTo(2.5, 6);
    expect(timer.lastSample.betweenFramesMs).toBeCloseTo(1.5, 6);
    frames = [];
    timer.destroy();
  });
});

describe("GPU frame interval", () => {
  it("is reported only when a frame was submitted before the last finished", async () => {
    const frame = words([0, 1_000_000]);
    const buffer = () => ({
      mapAsync: () => Promise.resolve(),
      getMappedRange: (offset = 0, size = frame.byteLength) =>
        frame.buffer.slice(offset, offset + size),
      unmap: () => {},
      destroy: () => {},
    });
    const finish: Array<() => void> = [];
    const device = {
      features: new Set(["timestamp-query"]),
      createQuerySet: () => ({ destroy: () => {} }),
      createBuffer: buffer,
      queue: {
        onSubmittedWorkDone: () =>
          new Promise<void>((resolve) => finish.push(resolve)),
      },
    } as unknown as GPUDevice;
    installGpuGlobals();
    const timer = new GpuTimer(device, true);
    const encoder = {
      resolveQuerySet: () => {},
      copyBufferToBuffer: () => {},
    } as unknown as GPUCommandEncoder;
    const submit = () => {
      timer.beginFrame();
      timer.passWrites("opaque");
      timer.endFrame(encoder);
      timer.afterSubmit();
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
    // Alone: the GPU was idle before it.
    submit();
    finish.shift()!();
    await settle();
    expect(timer.lastSample.intervalMs).toBeNaN();
    expect(timer.intervalMilliseconds).toBeNaN();
    // Two in flight: the second follows the first without a gap.
    submit();
    submit();
    finish.shift()!();
    await new Promise((resolve) => setTimeout(resolve, 10));
    finish.shift()!();
    await settle();
    expect(timer.lastSample.intervalMs).toBeGreaterThanOrEqual(5);
    expect(timer.intervalMilliseconds).toBeGreaterThanOrEqual(5);
    // Alone again: nothing reported.
    submit();
    finish.shift()!();
    await settle();
    expect(timer.intervalMilliseconds).toBeNaN();
    timer.destroy();
  });
});

describe("GPU pass times against a brute-force union", () => {
  /** Seeded (mulberry32), so a failure reproduces. */
  function random(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("agrees on 500 random sets of passes", () => {
    const next = random(18);
    for (let set = 0; set < 500; set++) {
      // Integer endpoints on [0, 60): unit cells count exactly. Some
      // empty or reversed; up to 70 passes (past the union's first size).
      const count = 1 + Math.floor(next() * (set % 10 === 0 ? 70 : 12));
      const begin: number[] = [];
      const end: number[] = [];
      for (let i = 0; i < count; i++) {
        const b = Math.floor(next() * 60);
        const length = Math.floor(next() * 25) - 3;
        begin.push(b);
        end.push(b + length);
      }
      const covered = new Uint8Array(100);
      const expected = begin.map((b, i) => {
        let own = 0;
        for (let x = b; x < end[i]!; x++) {
          own += covered[x] ? 0 : 1;
          covered[x] = 1;
        }
        return own;
      });
      const own = new Float64Array(count);
      const total = passTimes(begin, end, count, own);
      expect([...own], `set ${set}`).toEqual(expected);
      expect(total).toBe(covered.reduce((a, b) => a + b, 0));
    }
  });
});
