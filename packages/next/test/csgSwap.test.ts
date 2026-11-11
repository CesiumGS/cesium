// Changing the CSG sample's solid without a bad frame (plan §13.33): the new
// solid waits hidden until it has drawn a few frames, then replaces the old
// one in one step, and a newer one supersedes a solid still waiting.
import { describe, expect, it, vi } from "vitest";
import { DoubleBuffer, afterFrames } from "../examples/csg/swap.ts";

/** An engine whose frames the test renders by hand. */
function fakeEngine() {
  const listeners = new Set<() => void>();
  const engine = {
    stats: { framesRendered: 0 },
    requestRender: vi.fn(),
    onAfterTick(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    engine,
    listeners,
    frame() {
      engine.stats.framesRendered++;
      [...listeners].forEach((listener) => listener());
    },
  };
}

describe("waiting for frames", () => {
  it("resolves after the frames asked for, keeping the loop running meanwhile", async () => {
    const { engine, frame, listeners } = fakeEngine();
    let done = false;
    const waiting = afterFrames(engine, 3).then(() => (done = true));
    for (let i = 0; i < 2; i++) {
      frame();
      await Promise.resolve();
      expect(done).toBe(false);
    }
    expect(engine.requestRender).toHaveBeenCalled();
    frame();
    await waiting;
    expect(done).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it("counts frames from the call, not from the engine's start", async () => {
    const { engine, frame } = fakeEngine();
    engine.stats.framesRendered = 100;
    const waiting = afterFrames(engine, 1);
    frame();
    await waiting;
  });

  it("gives up after the timeout, and rejects when aborted", async () => {
    vi.useFakeTimers();
    try {
      const { engine, listeners } = fakeEngine();
      const slow = afterFrames(engine, 5, { timeoutMs: 500 });
      vi.advanceTimersByTime(500);
      await slow;
      expect(listeners.size).toBe(0);

      const controller = new AbortController();
      const aborted = afterFrames(engine, 5, { signal: controller.signal });
      controller.abort(new Error("gone"));
      await expect(aborted).rejects.toThrow("gone");
      expect(listeners.size).toBe(0);
      await expect(
        afterFrames(engine, 1, { signal: controller.signal }),
      ).rejects.toThrow("gone");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the double buffer", () => {
  const setup = () => {
    const log: string[] = [];
    const buffer = new DoubleBuffer<string>({
      reveal: (next, previous) =>
        log.push(`reveal ${next}${previous ? ` over ${previous}` : ""}`),
      discard: (thing) => log.push(`discard ${thing}`),
    });
    const gate = () => {
      let open!: () => void;
      let fail!: (e: unknown) => void;
      const ready = new Promise<void>((resolve, reject) => {
        open = resolve;
        fail = reject;
      });
      return { ready: () => ready, open, fail };
    };
    return { buffer, log, gate };
  };

  it("keeps the shown solid until the next is ready, then swaps in one step", async () => {
    const { buffer, log, gate } = setup();
    const a = gate();
    const first = buffer.stage("a", a.ready);
    expect(buffer.current).toBeUndefined();
    expect(buffer.pending).toBe("a");
    a.open();
    await first;
    expect(buffer.current).toBe("a");
    expect(buffer.pending).toBeUndefined();

    const b = gate();
    const second = buffer.stage("b", b.ready);
    // While b waits, a is still the one shown and nothing was revealed or freed.
    expect(buffer.current).toBe("a");
    expect(log).toEqual(["reveal a"]);
    b.open();
    await second;
    expect(buffer.current).toBe("b");
    expect(log).toEqual(["reveal a", "reveal b over a"]);
  });

  it("drops a solid still waiting when a newer one arrives, and never shows it", async () => {
    const { buffer, log, gate } = setup();
    const a = gate();
    const shown = buffer.stage("a", a.ready);
    a.open();
    await shown;
    const b = gate();
    const c = gate();
    const staleB = buffer.stage("b", b.ready);
    const newestC = buffer.stage("c", c.ready);
    expect(log).toEqual(["reveal a", "discard b"]);
    // b's wait ends first and changes nothing.
    b.open();
    await staleB;
    expect(buffer.current).toBe("a");
    c.open();
    await newestC;
    expect(buffer.current).toBe("c");
    expect(log).toEqual(["reveal a", "discard b", "reveal c over a"]);
  });

  it("shows a solid whose wait failed, rather than never changing", async () => {
    const { buffer, log, gate } = setup();
    const a = gate();
    const shown = buffer.stage("a", a.ready);
    a.fail(new Error("a pipeline failed"));
    await shown;
    expect(log).toEqual(["reveal a"]);
  });

  it("clears what is shown and what is waiting, and ignores a wait that ends after", async () => {
    const { buffer, log, gate } = setup();
    const a = gate();
    const first = buffer.stage("a", a.ready);
    a.open();
    await first;
    const b = gate();
    const waiting = buffer.stage("b", b.ready);
    buffer.clear();
    expect(log).toEqual(["reveal a", "discard b", "discard a"]);
    b.open();
    await waiting;
    expect(buffer.current).toBeUndefined();
    expect(log).toHaveLength(3);
  });
});
