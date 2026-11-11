// Bulk work in one shape (frames 5b, Task 9): slices, an AbortSignal, progress.
import { describe, expect, it } from "vitest";
import { runBulk, tickSlices, timeSlices } from "../src/core/bulk.ts";
import { fakeEngine } from "./fakeGpu.ts";

/** Burns about `ms` of wall time. */
function burn(ms: number): void {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // spin
  }
}

describe("runBulk", () => {
  it("returns the steps' results in order, and its progress is non-decreasing, ending at total", async () => {
    const progress: number[] = [];
    const results = await runBulk(50, (i) => i * 2, {
      onProgress: (p) => {
        expect(p.total).toBe(50);
        progress.push(p.done);
      },
    });
    expect(results).toEqual(Array.from({ length: 50 }, (_, i) => i * 2));
    expect(progress.length).toBeGreaterThan(0);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
    expect(progress.at(-1)).toBe(50);
  });

  it("slices: steps that take 1 ms are spread over several tasks, none past its budget by more than a step", async () => {
    // Counted in steps, not milliseconds: a step that starts after its
    // slice's deadline is the overrun, and a loaded machine's preemption
    // can stretch a step's wall time without the runner doing anything wrong.
    const late: number[] = [];
    let deadline = Infinity;
    const scheduler = timeSlices(5);
    await runBulk(
      40,
      () => {
        if (performance.now() >= deadline) {
          late[late.length - 1]! += 1;
        }
        burn(1);
      },
      {
        scheduler: {
          run: (slice, signal) =>
            scheduler.run((d) => {
              deadline = d;
              late.push(0);
              return slice(d);
            }, signal),
        },
      },
    );
    expect(late.length).toBeGreaterThan(3);
    for (const steps of late) {
      expect(steps).toBeLessThanOrEqual(1);
    }
  });

  it("an abort after 10 steps rejects with AbortError, runs no 11th step and reports no more progress", async () => {
    const controller = new AbortController();
    let steps = 0;
    const progress: number[] = [];
    const run = runBulk(
      100,
      () => {
        steps++;
        if (steps === 10) {
          controller.abort();
        }
      },
      { signal: controller.signal, onProgress: (p) => progress.push(p.done) },
    );
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    expect(steps).toBe(10);
    expect(progress).toEqual([]);
    // Already aborted: nothing runs at all.
    let ran = false;
    await expect(
      runBulk(5, () => void (ran = true), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(ran).toBe(false);
  });

  it("a step that throws rejects the run", async () => {
    await expect(
      runBulk(5, (i) => {
        if (i === 2) {
          throw new Error("bad step");
        }
      }),
    ).rejects.toThrow("bad step");
  });
});

describe("tickSlices", () => {
  /** A loop driven by hand: the listeners it holds, and a tick. */
  function loop() {
    const listeners = new Set<(now: number) => boolean>();
    return {
      listeners,
      onTick: (l: (now: number) => boolean) => {
        listeners.add(l);
        return () => void listeners.delete(l);
      },
      tick(): boolean {
        let busy = false;
        for (const l of [...listeners]) {
          busy = l(performance.now()) || busy;
        }
        return busy;
      },
    };
  }

  it("registers nothing while idle, keeps the loop busy while queued, and spends its budget a tick", async () => {
    const l = loop();
    const bulk = tickSlices(l.onTick, 4);
    expect(l.listeners.size).toBe(0);
    let steps = 0;
    const done = runBulk(
      60,
      () => {
        burn(1);
        steps++;
      },
      { scheduler: bulk },
    );
    expect(l.listeners.size).toBe(1);
    const t0 = performance.now();
    const busy = l.tick();
    const spent = performance.now() - t0;
    expect(busy).toBe(true);
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThan(60);
    expect(spent).toBeLessThan(4 + 3);
    let ticks = 1;
    while (l.tick()) {
      ticks++;
      expect(ticks).toBeLessThan(200);
    }
    await done;
    expect(steps).toBe(60);
    expect(l.listeners.size).toBe(0);
  });

  it("an abort rejects the job and lets go of the tick listener", async () => {
    const l = loop();
    const bulk = tickSlices(l.onTick, 4);
    const controller = new AbortController();
    const job = runBulk(1000, () => burn(1), {
      scheduler: bulk,
      signal: controller.signal,
    });
    l.tick();
    controller.abort();
    await expect(job).rejects.toMatchObject({ name: "AbortError" });
    expect(l.listeners.size).toBe(0);
  });

  it("disposing rejects queued work with an AbortError", async () => {
    const l = loop();
    const bulk = tickSlices(l.onTick);
    const job = runBulk(10, () => {}, { scheduler: bulk });
    bulk.dispose();
    await expect(job).rejects.toMatchObject({ name: "AbortError" });
    expect(l.listeners.size).toBe(0);
  });
});

describe("Engine.bulk", () => {
  it("runs work in its ticks, and destroying the engine rejects what is queued", async () => {
    const engine = await fakeEngine();
    const queued = runBulk(5, () => {}, { scheduler: engine.bulk });
    const outcome = queued.then(
      () => "finished",
      (e: Error) => e.name,
    );
    engine.destroy();
    expect(await outcome).toBe("AbortError");
  });
});
