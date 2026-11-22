import { describe, expect, it } from "vitest";
import {
  MAXIMUM_UPLOAD_CPU_MS,
  uploadCpuMs,
  uploadScale,
} from "../packages/next/src/scene/uploadPacing.ts";
import { updateTilesets } from "../packages/next/src/scene/tileSelection.ts";
import { EngineScene } from "../packages/next/src/scene/engineScene.ts";

/** Ticks to drain a queue at one allowance: 8 uploads per 60 Hz tick. */
function ticksToDrain(queue: number, intervalMs: number): number {
  let ticks = 0;
  while (queue > 0) {
    queue -= Math.max(1, Math.round(8 * uploadScale(intervalMs, true)));
    ticks++;
  }
  return ticks;
}

describe("upload pacing by elapsed time", () => {
  it("leaves a 60 Hz tick as it was, and a faster one at its share", () => {
    expect(uploadScale(1000 / 60, true)).toBeCloseTo(1, 12);
    expect(uploadScale(1000 / 60, false)).toBeCloseTo(1, 12);
    expect(uploadScale(1000 / 120, true)).toBeCloseTo(0.5, 12);
    expect(uploadCpuMs(1, 4)).toBe(Infinity);
  });

  it("drains about 7.5 times faster per tick at 125 ms", () => {
    expect(uploadScale(125, true)).toBeCloseTo(7.5, 12);
    const slow = ticksToDrain(869, 125);
    const fast = ticksToDrain(869, 1000 / 60);
    expect(fast / slow).toBeGreaterThan(7);
    expect(fast / slow).toBeLessThan(8);
  });

  it("clamps at 8 times and caps the CPU time", () => {
    expect(uploadScale(5000, true)).toBe(8);
    expect(uploadCpuMs(8, 4)).toBe(MAXIMUM_UPLOAD_CPU_MS);
    expect(uploadCpuMs(2, 1)).toBe(2);
  });

  it("gives no burst after an idle gap, only while uploads waited", () => {
    expect(uploadScale(900, false)).toBe(1);
    const scene = new EngineScene();
    let now = 0;
    let queue = 0;
    const engine = {
      scene,
      views: [],
      tilesets: [
        {
          state: {
            ready: {
              get length() {
                return queue;
              },
            },
          },
          update() {},
        },
      ],
      uploadBytesPerFrame: 1000,
      treeBuildMsPerFrame: 4,
      minimumUploadBytesPerFrame: 1000,
      maximumUploadBytesPerFrame: 1000,
      clamping: { update() {} },
    };
    const spy = { now: () => now };
    const real = performance.now.bind(performance);
    performance.now = spy.now;
    try {
      const tick = (at: number) => {
        now = at;
        updateTilesets(engine as never, () => false);
        return scene.uploadBudget.scale;
      };
      tick(1); // first
      tick(17);
      expect(scene.uploadsWaiting).toBe(false);
      expect(tick(917)).toBe(1); // idle gap of 900 ms, nothing queued
      queue = 5; // content arrives; this tick ends with it waiting
      tick(934);
      expect(scene.uploadsWaiting).toBe(true);
      expect(tick(1059)).toBeCloseTo(7.5, 12); // 125 ms with it waiting
      queue = 0;
      tick(1076);
      expect(scene.uploadsWaiting).toBe(false);
      expect(tick(1976)).toBe(1);
    } finally {
      performance.now = real;
    }
  });
});
