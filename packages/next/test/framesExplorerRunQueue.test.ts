// The page's one queue for runs (examples/frames-explorer/runQueue.ts): the
// catalog's runs and "Try your own" never overlap (final review, Important 1).
import { describe, expect, it, vi } from "vitest";
import { RunQueue } from "../examples/frames-explorer/runQueue.ts";

/** A task that records when it runs and finishes after a tick or two. */
function tracker() {
  let active = 0;
  let most = 0;
  const order: string[] = [];
  const task =
    (name: string, fail = false) =>
    async () => {
      active++;
      most = Math.max(most, active);
      order.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, 2));
      order.push(`end ${name}`);
      active--;
      if (fail) {
        throw new Error(`${name} failed`);
      }
      return name;
    };
  return { task, order, most: () => most };
}

describe("the run queue", () => {
  it("runs three concurrent calls one at a time, in the order asked", async () => {
    const q = new RunQueue();
    const t = tracker();
    const out = await Promise.all([
      q.run(t.task("a")),
      q.run(t.task("b")),
      q.run(t.task("c")),
    ]);
    expect(out).toEqual(["a", "b", "c"]);
    expect(t.most()).toBe(1);
    expect(t.order).toEqual([
      "start a",
      "end a",
      "start b",
      "end b",
      "start c",
      "end c",
    ]);
  });

  it("keeps catalog and user runs apart too: two calls waiting on one run still start one after the other", async () => {
    const q = new RunQueue();
    const t = tracker();
    const first = q.run(t.task("catalog"));
    // Both ask while the first runs, as two waiters on the same run would.
    const second = q.run(t.task("group"));
    const third = q.run(t.task("your CRS"));
    await Promise.all([first, second, third]);
    expect(t.most()).toBe(1);
  });

  it("goes on after a run that fails, which still rejects to its caller", async () => {
    const q = new RunQueue();
    const t = tracker();
    const failed = q.run(t.task("a", true));
    const next = q.run(t.task("b"));
    await expect(failed).rejects.toThrow("a failed");
    await expect(next).resolves.toBe("b");
    expect(t.most()).toBe(1);
  });

  it("coalesces a second call with the same key while the first is pending (a double-click on Run this group)", async () => {
    const q = new RunQueue();
    const body = vi.fn(async () => "ran");
    const one = q.run(body, "group:time");
    const two = q.run(body, "group:time");
    expect(two).toBe(one);
    await one;
    expect(body).toHaveBeenCalledTimes(1);
    // Once it has settled, the same key runs again.
    await q.run(body, "group:time");
    expect(body).toHaveBeenCalledTimes(2);
  });

  it("says when it's busy, running or waiting", async () => {
    const q = new RunQueue();
    expect(q.busy).toBe(false);
    const t = tracker();
    const a = q.run(t.task("a"));
    const b = q.run(t.task("b"));
    expect(q.busy).toBe(true);
    await a;
    expect(q.busy).toBe(true);
    await b;
    expect(q.busy).toBe(false);
  });
});
