// Plan 4b Task 18 fix 2: the design globe page's frame driver
// (examples/design-globe/frameDriver.ts). A settled page requests no frames,
// so on-demand rendering idles; a change wakes it, and it stops again a few
// quiet frames after the change ends.
import { describe, expect, it } from "vitest";
import { createFrameDriver } from "../examples/design-globe/frameDriver.ts";

/** A hand-ticked requestAnimationFrame. */
function fakeFrames() {
  const queue = new Map<number, () => void>();
  let next = 1;
  let requested = 0;
  return {
    request(cb: () => void) {
      requested++;
      queue.set(next, cb);
      return next++;
    },
    cancel(h: number) {
      queue.delete(h);
    },
    /** Runs one frame's callbacks; returns how many ran. */
    tick() {
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        cb();
      }
      return due.length;
    },
    get requested() {
      return requested;
    },
  };
}

describe("design globe frame driver", () => {
  it("requests no frames until woken", () => {
    const f = fakeFrames();
    let steps = 0;
    const d = createFrameDriver({
      step: () => {
        steps++;
        return false;
      },
      request: f.request,
      cancel: f.cancel,
    });
    for (let i = 0; i < 600; i++) {
      f.tick();
    }
    expect(f.requested).toBe(0);
    expect(steps).toBe(0);
    expect(d.running).toBe(false);
  });

  it("runs while something changes, then stops after the quiet frames", () => {
    const f = fakeFrames();
    let busyFor = 10;
    let steps = 0;
    const d = createFrameDriver({
      step: () => {
        steps++;
        return busyFor-- > 0;
      },
      request: f.request,
      cancel: f.cancel,
      quietFrames: 5,
    });
    d.wake();
    let ticks = 0;
    // Bounded, so a driver that never stops fails rather than hangs.
    while (f.tick() > 0 && ticks < 1000) {
      ticks++;
    }
    // Ten busy frames, then five quiet ones.
    expect(steps).toBe(15);
    expect(ticks).toBe(15);
    expect(d.running).toBe(false);
    // Settled: 600 more ticks request nothing.
    const before = f.requested;
    for (let i = 0; i < 600; i++) {
      f.tick();
    }
    expect(f.requested).toBe(before);
  });

  it("restarts its quiet count on wake, and never doubles a frame", () => {
    const f = fakeFrames();
    const d = createFrameDriver({
      step: () => false,
      request: f.request,
      cancel: f.cancel,
      quietFrames: 3,
    });
    d.wake();
    d.wake();
    expect(f.tick()).toBe(1);
    d.wake();
    let more = 0;
    while (f.tick() > 0 && more < 1000) {
      more++;
    }
    expect(more).toBe(3);
  });

  it("stops at once on dispose", () => {
    const f = fakeFrames();
    const d = createFrameDriver({
      step: () => true,
      request: f.request,
      cancel: f.cancel,
    });
    d.wake();
    f.tick();
    d.dispose();
    expect(f.tick()).toBe(0);
    d.wake();
    expect(f.tick()).toBe(0);
  });
});
