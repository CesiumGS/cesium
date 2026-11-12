// Changing the CSG sample's solid without a bad frame (plan §13.33): the new
// solid waits hidden until the engine says it is ready (`Engine.whenReady`),
// then replaces the old one in one step, and a newer one supersedes a solid
// still waiting, aborting its wait.
import { describe, expect, it } from "vitest";
import { DoubleBuffer } from "../examples/csg/swap.ts";

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

  it("aborts the wait of a solid that a newer one or a clear replaces", async () => {
    const { buffer } = setup();
    const signals: AbortSignal[] = [];
    const hang = (superseded: AbortSignal) => {
      signals.push(superseded);
      return new Promise<void>(() => {});
    };
    void buffer.stage("a", hang);
    void buffer.stage("b", hang);
    expect(signals.map((s) => s.aborted)).toEqual([true, false]);
    buffer.clear();
    expect(signals[1]!.aborted).toBe(true);
  });

  it("a wait that ends by its abort changes nothing", async () => {
    const { buffer, log } = setup();
    const wait = (superseded: AbortSignal) =>
      new Promise<void>((_, reject) =>
        superseded.addEventListener("abort", () =>
          reject(superseded.reason ?? new Error("aborted")),
        ),
      );
    const stale = buffer.stage("a", wait);
    const gate = Promise.resolve();
    const newest = buffer.stage("b", () => gate);
    await Promise.all([stale, newest]);
    expect(buffer.current).toBe("b");
    expect(log).toEqual(["discard a", "reveal b"]);
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
