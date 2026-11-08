// The frames explorer's frame loop (examples/frames-explorer/frameLoop.ts)
// keeps the engine's loop awake only while something changes (plan 4b final
// review I2): the clock playing, or a refresh its real-time limit holds back
// and still owes. Paused and settled, the page sleeps: before, its tick
// listener returned true every frame, so the loop never did.
//
// Over a fake engine that runs a frame only when woken or kept busy, as
// Engine.ts `loop` does on demand.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameLoop } from "../examples/frames-explorer/frameLoop.ts";
import type { PageCore } from "../examples/frames-explorer/page.ts";

let real = 0;

beforeEach(() => {
  real = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => real);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function page(options: { owesOrion?: () => boolean } = {}) {
  const clock = {
    time: Date.UTC(2026, 10, 7, 12),
    mode: "paused" as "paused" | "playing",
  };
  const before: Array<(now: number) => boolean> = [];
  const after: Array<(now: number) => void> = [];
  const hook =
    <T>(list: T[]) =>
    (listener: T) => {
      list.push(listener);
      woken = true;
      return () => void list.splice(list.indexOf(listener), 1);
    };
  let woken = false;
  let busy = false;
  const engine = {
    onTick: hook(before),
    onAfterTick: hook(after),
    wake: () => (woken = true),
  };
  let updates = 0;
  let labels = 0;
  const refreshed: number[] = [];
  const core = {
    viewer: { clock, engine },
    globe: {
      update: () => void updates++,
      placeLabels: () => void labels++,
    },
    frames: () => ({ itrf: {} }),
    instantNow: () => ({}),
    disposed: () => false,
  } as unknown as PageCore;
  const loop = createFrameLoop({
    core,
    refreshTree: () => void refreshed.push(clock.time),
    orion: {
      place: () => {},
      askIfMoved: () => options.owesOrion?.() ?? false,
    },
    callouts: { changed: () => false, refresh: () => {} },
    overlays: {
      updateMinorGrid: () => {},
      biasOn: () => false,
      biasAt: () => 0,
      drawBias: () => {},
    },
    followOrbit: () => {},
    sceneTick: () => {},
    walk: { active: () => false, draw: () => {} },
  });
  /**
   * Runs `n` display refreshes (16 ms each), each a frame of the loop if
   * one was asked for: woken, or kept busy by the last frame. Returns the
   * frames run.
   */
  const frames = (n: number): number => {
    let ran = 0;
    for (let i = 0; i < n; i++) {
      real += 16;
      if (clock.mode === "playing") {
        clock.time += 16 * 60;
      }
      if (!woken && !busy) {
        continue;
      }
      woken = false;
      ran++;
      busy = false;
      for (const l of [...before]) {
        busy = l(real) || busy;
      }
      for (const l of [...after]) {
        l(real);
      }
    }
    return ran;
  };
  return {
    clock,
    loop,
    frames,
    wake: engine.wake,
    updates: () => updates,
    labels: () => labels,
    refreshed,
  };
}

describe("the frames explorer's frame loop", () => {
  it("paused and settled, it lets the loop sleep: no frames", () => {
    const p = page();
    p.loop.start();
    expect(p.frames(1)).toBe(1);
    expect(p.updates()).toBe(1);
    expect(p.labels()).toBe(1);
    expect(p.frames(600)).toBe(0);
  });

  it("a wake runs one frame, the labels placed after it, then sleeps", () => {
    const p = page();
    p.loop.start();
    p.frames(10);
    p.wake();
    expect(p.frames(600)).toBe(1);
    expect(p.labels()).toBe(2);
  });

  it("the clock playing keeps it running; paused again, it sleeps", () => {
    const p = page();
    p.loop.start();
    p.frames(10);
    p.clock.mode = "playing";
    p.wake();
    expect(p.frames(120)).toBe(120);
    p.clock.mode = "paused";
    // The tree's refresh may be owed (held back to once a second): at most
    // that long, then nothing.
    expect(p.frames(120)).toBeLessThanOrEqual(70);
    expect(p.frames(600)).toBe(0);
    // It caught up with the clock where it stopped (to its minute).
    expect(p.clock.time - p.refreshed.at(-1)!).toBeLessThanOrEqual(60_000);
  });

  it("a scrub its real-time limit holds back is owed: busy until done, then asleep", () => {
    const p = page();
    p.loop.start();
    p.frames(1);
    real += 2000; // a while after the loop started
    // A first scrub refreshes at once (more than a minute moved).
    p.clock.time += 120_000;
    p.wake();
    p.frames(1);
    expect(p.refreshed).toHaveLength(1);
    // A second, within the second: held back, but still done.
    p.clock.time += 120_000;
    p.wake();
    const ran = p.frames(600);
    expect(ran).toBeGreaterThan(30);
    expect(ran).toBeLessThan(70);
    expect(p.refreshed).toEqual([p.clock.time - 120_000, p.clock.time]);
    expect(p.frames(600)).toBe(0);
  });

  it("an owed ask of Orion's statement keeps it running until asked", () => {
    let owed = 5;
    const p = page({ owesOrion: () => owed-- > 0 });
    p.loop.start();
    expect(p.frames(600)).toBe(6);
  });

  it("stopped, its listeners are gone", () => {
    const p = page();
    const stop = p.loop.start();
    p.frames(5);
    stop();
    p.wake();
    p.frames(1);
    expect(p.updates()).toBe(1);
  });
});
