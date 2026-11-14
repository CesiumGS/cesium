import { describe, expect, it } from "vitest";
import { Jobs, type JobMessage } from "../src/io/Jobs.ts";

/** A port that records what each worker was sent, and a clock the test moves. */
function setup(size = 1, cpuPerWorker = 1) {
  const posted: Array<{ worker: number; message: JobMessage }> = [];
  let clock = 0;
  const jobs = new Jobs(
    { size, post: (worker, message) => posted.push({ worker, message }) },
    cpuPerWorker,
    () => clock,
  );
  const sent = () =>
    posted
      .filter((p) => p.message.type !== "cancel")
      .map((p) => p.message.name as string);
  const idOf = (name: string) =>
    posted.find((p) => p.message.name === name)!.message.id;
  const reply = (name: string, result: unknown = name) =>
    jobs.reply({ id: idOf(name), ok: true, result });
  return {
    jobs,
    posted,
    sent,
    idOf,
    reply,
    advance: (ms: number) => (clock += ms),
  };
}

const settled = (promise: Promise<unknown>) =>
  promise.then(
    (value) => ({ value }),
    (error: Error) => ({
      error: error.name === "AbortError" ? "abort" : error.message,
    }),
  );

describe("Jobs: priority", () => {
  it("posts the most urgent ready job when a worker frees", async () => {
    const { jobs, sent, reply } = setup();
    jobs.submit({ type: "t", payload: { name: "first" }, priority: 9 });
    jobs.submit({ type: "t", payload: { name: "low" }, priority: 5 });
    jobs.submit({ type: "t", payload: { name: "high" }, priority: 1 });
    jobs.submit({ type: "t", payload: { name: "mid" }, priority: 3 });
    expect(sent()).toEqual(["first"]);
    reply("first");
    reply("high");
    reply("mid");
    expect(sent()).toEqual(["first", "high", "mid", "low"]);
  });

  it("reads a priority function each time it orders the queue", () => {
    const { jobs, sent, reply } = setup();
    const priority = { a: 1, b: 2 };
    jobs.submit({ type: "t", payload: { name: "busy" } });
    jobs.submit({
      type: "t",
      payload: { name: "a" },
      priority: () => priority.a,
    });
    jobs.submit({
      type: "t",
      payload: { name: "b" },
      priority: () => priority.b,
    });
    priority.a = 10; // its tile moved off screen
    reply("busy");
    expect(sent()).toEqual(["busy", "b"]);
  });

  it("keeps submission order among equal priorities", () => {
    const { jobs, sent, reply } = setup();
    for (const name of ["x", "y", "z"]) {
      jobs.submit({ type: "t", payload: { name }, priority: 1 });
    }
    reply("x");
    reply("y");
    expect(sent()).toEqual(["x", "y", "z"]);
  });

  it("starts workers lazily and spreads CPU jobs under the per-worker limit", () => {
    const { jobs, posted } = setup(2, 1);
    for (const name of ["a", "b", "c"]) {
      jobs.submit({ type: "t", payload: { name } });
    }
    expect(posted.map((p) => [p.message.name, p.worker])).toEqual([
      ["a", 0],
      ["b", 1],
    ]);
    expect(jobs.stats).toMatchObject({ queued: 1, running: 2 });
  });

  it("doesn't hold I/O jobs to the CPU limit", () => {
    const { jobs, sent } = setup(1, 1);
    jobs.submit({ type: "t", payload: { name: "cpu" } });
    jobs.submit({ type: "t", payload: { name: "cpu2" } });
    jobs.submit({ type: "t", payload: { name: "fetch" }, io: true });
    expect(sent()).toEqual(["cpu", "fetch"]);
  });
});

describe("Jobs: the apply phase", () => {
  it("applies on arrival while no loop runs the phase", async () => {
    const { jobs, reply } = setup();
    const log: string[] = [];
    const job = jobs.submit({
      type: "t",
      payload: { name: "a" },
      apply: (r: string) => {
        log.push(r);
        return `${r}!`;
      },
    });
    reply("a");
    expect(log).toEqual(["a"]);
    await expect(job.promise).resolves.toBe("a!");
  });

  it("holds results for the phase and applies the most urgent first", async () => {
    const { jobs, reply } = setup(1, 3);
    jobs.phased = true;
    const log: string[] = [];
    let readied = 0;
    jobs.onReady = () => readied++;
    const names = { a: 3, b: 1, c: 2 };
    for (const [name, priority] of Object.entries(names)) {
      jobs.submit({
        type: "t",
        payload: { name },
        priority,
        apply: (r: string) => log.push(r),
      });
    }
    reply("a");
    reply("b");
    reply("c");
    expect(log).toEqual([]);
    expect(readied).toBe(3);
    expect(jobs.stats.waiting).toBe(3);
    expect(jobs.apply(Infinity)).toBe(3);
    expect(log).toEqual(["b", "c", "a"]);
  });

  it("stops at the budget, but always applies one", () => {
    const { jobs, reply, advance } = setup(1, 4);
    jobs.phased = true;
    const log: string[] = [];
    for (const name of ["a", "b", "c", "d"]) {
      jobs.submit({
        type: "t",
        payload: { name },
        apply: (r: string) => {
          advance(3); // each step takes 3 ms
          log.push(r);
        },
      });
      reply(name);
    }
    // 2 ms: the first step alone, though it overruns.
    expect(jobs.apply(2)).toBe(1);
    expect(jobs.stats).toMatchObject({ applied: 1, applyMs: 3, waiting: 3 });
    // 7 ms: two steps (6 ms); a third is expected to overrun.
    expect(jobs.apply(7)).toBe(2);
    expect(log).toEqual(["a", "b", "c"]);
    expect(jobs.apply(7)).toBe(1);
    expect(jobs.stats.appliedTotal).toBe(4);
  });

  it("rejects a job whose apply step throws, and goes on", async () => {
    const { jobs, reply } = setup(1, 2);
    jobs.phased = true;
    const bad = jobs.submit({
      type: "t",
      payload: { name: "bad" },
      apply: () => {
        throw new Error("broken tile");
      },
    });
    const good = jobs.submit({
      type: "t",
      payload: { name: "good" },
      apply: () => 1,
    });
    reply("bad");
    reply("good");
    expect(jobs.apply(Infinity)).toBe(2);
    expect(await settled(bad.promise)).toEqual({ error: "broken tile" });
    expect(await settled(good.promise)).toEqual({ value: 1 });
  });

  it("applies what waits when the loop gives the phase up", () => {
    const { jobs, reply } = setup();
    jobs.phased = true;
    const log: string[] = [];
    jobs.submit({
      type: "t",
      payload: { name: "a" },
      apply: (r: string) => log.push(r),
    });
    reply("a");
    expect(log).toEqual([]);
    jobs.phased = false;
    expect(log).toEqual(["a"]);
  });
});

describe("Jobs: cancellation", () => {
  it("drops a queued job: it is never posted", async () => {
    const { jobs, sent, reply } = setup();
    jobs.submit({ type: "t", payload: { name: "busy" } });
    const controller = new AbortController();
    const job = jobs.submit({
      type: "t",
      payload: { name: "a" },
      signal: controller.signal,
    });
    controller.abort();
    expect(await settled(job.promise)).toEqual({ error: "abort" });
    expect(job.state).toBe("cancelled");
    reply("busy");
    expect(sent()).toEqual(["busy"]);
  });

  it("stops a running job on its worker, and frees the worker when it replies", async () => {
    const { jobs, posted, sent, reply } = setup();
    const job = jobs.submit({ type: "t", payload: { name: "a" } });
    jobs.submit({ type: "t", payload: { name: "b" } });
    job.cancel();
    expect(await settled(job.promise)).toEqual({ error: "abort" });
    expect(posted.at(-1)!.message.type).toBe("cancel");
    // The worker is still busy until it answers.
    expect(sent()).toEqual(["a"]);
    expect(jobs.stats.running).toBe(1);
    reply("a");
    expect(sent()).toEqual(["a", "b"]);
  });

  it("discards a result that arrived but wasn't applied", async () => {
    const { jobs, reply } = setup();
    jobs.phased = true;
    const discarded: unknown[] = [];
    const applied: unknown[] = [];
    const controller = new AbortController();
    const job = jobs.submit({
      type: "t",
      payload: { name: "a" },
      signal: controller.signal,
      apply: (r) => applied.push(r),
      discard: (r) => discarded.push(r),
    });
    reply("a", "image");
    controller.abort(); // its tile was evicted before the phase
    expect(jobs.apply(Infinity)).toBe(0);
    expect(applied).toEqual([]);
    expect(discarded).toEqual(["image"]);
    expect(await settled(job.promise)).toEqual({ error: "abort" });
  });

  it("discards the late result of a job cancelled while it ran", () => {
    const { jobs, reply } = setup();
    const discarded: unknown[] = [];
    const job = jobs.submit({
      type: "t",
      payload: { name: "a" },
      discard: (r) => discarded.push(r),
    });
    job.promise.catch(() => {});
    job.cancel();
    reply("a", "bitmap");
    expect(discarded).toEqual(["bitmap"]);
  });

  it("does nothing once applied", async () => {
    const { jobs, reply } = setup();
    const job = jobs.submit({ type: "t", payload: { name: "a" } });
    reply("a");
    job.cancel();
    expect(job.state).toBe("applied");
    await expect(job.promise).resolves.toBe("a");
  });

  it("cancels on an already aborted signal", async () => {
    const { jobs, sent } = setup();
    const job = jobs.submit({
      type: "t",
      payload: { name: "a" },
      signal: AbortSignal.abort(),
    });
    expect(await settled(job.promise)).toEqual({ error: "abort" });
    expect(sent()).toEqual([]);
  });
});

describe("Jobs: dependencies", () => {
  it("posts a job once the jobs it runs after have applied, with their values", async () => {
    const { jobs, posted, sent, reply } = setup(1, 2);
    jobs.phased = true;
    const parent = jobs.submit({
      type: "decode",
      payload: { name: "parent" },
      apply: (r: string) => ({ heights: `${r}-heights` }),
    });
    const child = jobs.submit({
      type: "refit",
      after: [parent],
      payload: ([p]) => ({
        name: "child",
        parent: (p as { heights: string }).heights,
      }),
    });
    expect(sent()).toEqual(["parent"]);
    expect(child.state).toBe("waiting");
    reply("parent");
    // Arrived, not applied: the child still waits.
    expect(sent()).toEqual(["parent"]);
    jobs.apply(Infinity);
    expect(sent()).toEqual(["parent", "child"]);
    expect(posted.at(-1)!.message).toMatchObject({
      type: "refit",
      parent: "parent-heights",
    });
    reply("child", 0.5);
    await expect(child.promise).resolves.toBe(0.5);
  });

  it("waits for every job it runs after", () => {
    const { jobs, sent, reply } = setup(1, 4);
    const a = jobs.submit({ type: "t", payload: { name: "a" } });
    const b = jobs.submit({ type: "t", payload: { name: "b" } });
    jobs.submit({ type: "t", after: [a, b], payload: { name: "c" } });
    reply("b");
    expect(sent()).toEqual(["a", "b"]);
    reply("a");
    expect(sent()).toEqual(["a", "b", "c"]);
  });

  it("runs at once after a job already applied", () => {
    const { jobs, sent, reply } = setup(1, 2);
    const a = jobs.submit({ type: "t", payload: { name: "a" } });
    reply("a");
    jobs.submit({ type: "t", after: [a], payload: { name: "b" } });
    expect(sent()).toEqual(["a", "b"]);
  });

  it("is cancelled with a job it runs after (a parent's tile evicted)", async () => {
    const { jobs, sent } = setup();
    const parent = jobs.submit({ type: "t", payload: { name: "parent" } });
    const child = jobs.submit({
      type: "t",
      after: [parent],
      payload: { name: "child" },
    });
    const grandchild = jobs.submit({
      type: "t",
      after: [child],
      payload: { name: "g" },
    });
    parent.cancel();
    expect(await settled(parent.promise)).toEqual({ error: "abort" });
    expect(await settled(child.promise)).toEqual({ error: "abort" });
    expect(await settled(grandchild.promise)).toEqual({ error: "abort" });
    expect(sent()).toEqual(["parent"]);
  });

  it("fails when a job it runs after fails", async () => {
    const { jobs, idOf } = setup();
    const parent = jobs.submit({ type: "t", payload: { name: "parent" } });
    const child = jobs.submit({
      type: "t",
      after: [parent],
      payload: { name: "child" },
    });
    jobs.reply({ id: idOf("parent"), ok: false, error: "404" });
    expect(await settled(parent.promise)).toEqual({ error: "404" });
    expect(await settled(child.promise)).toEqual({
      error: "a job it runs after failed: 404",
    });
  });

  it("cancelling a dependent leaves the job it runs after alone", async () => {
    const { jobs, reply } = setup();
    const parent = jobs.submit({ type: "t", payload: { name: "parent" } });
    const child = jobs.submit({
      type: "t",
      after: [parent],
      payload: { name: "child" },
    });
    child.cancel();
    reply("parent");
    await expect(parent.promise).resolves.toBe("parent");
    expect(await settled(child.promise)).toEqual({ error: "abort" });
  });
});

describe("Jobs: destroy", () => {
  it("cancels everything", async () => {
    const { jobs } = setup();
    const a = jobs.submit({ type: "t", payload: { name: "a" } });
    const b = jobs.submit({ type: "t", payload: { name: "b" } });
    jobs.destroy();
    expect(await settled(a.promise)).toEqual({ error: "abort" });
    expect(await settled(b.promise)).toEqual({ error: "abort" });
    expect(jobs.stats).toMatchObject({ queued: 0, running: 0, waiting: 0 });
  });
});

describe("Jobs: progressive jobs on this thread (slice)", () => {
  /** A walk of `n` steps, 2 ms each; each step's partial is a bound that only tightens. */
  function walk(n: number, advance: (ms: number) => void, now: () => number) {
    let i = 0;
    let cancelled = false;
    return {
      cancelled: () => cancelled,
      spec: {
        type: "walk",
        step(budgetMs: number) {
          const end = now() + budgetMs;
          let partial: number | undefined;
          do {
            advance(2);
            i++;
            partial = 1 / i;
          } while (i < n && now() < end);
          return { partial, done: i >= n };
        },
        cancel: () => {
          cancelled = true;
        },
      },
    };
  }

  it("hands out partial results slice by slice, within the phase's budget", async () => {
    const { jobs, advance } = setup();
    let clock = 0;
    const tick = (ms: number) => {
      clock += ms;
      advance(ms);
    };
    jobs.phased = true;
    const w = walk(10, tick, () => clock);
    const partials: Array<[number, boolean]> = [];
    const job = jobs.slice({
      ...w.spec,
      onPartial: (p, done) => partials.push([p, done]),
    });
    expect(jobs.waiting).toBe(1);
    jobs.apply(4); // two steps
    expect(partials).toEqual([[1 / 2, false]]);
    jobs.apply(4);
    jobs.apply(100);
    expect(partials.at(-1)).toEqual([1 / 10, true]);
    // Each partial tightens the last.
    for (let k = 1; k < partials.length; k++) {
      expect(partials[k]![0]).toBeLessThan(partials[k - 1]![0]);
    }
    await expect(job.promise).resolves.toBe(1 / 10);
    expect(jobs.waiting).toBe(0);
  });

  it("gives what is left to the most urgent first, and one slice even when the results spent it", () => {
    const { jobs, reply, advance } = setup();
    let clock = 0;
    const tick = (ms: number) => {
      clock += ms;
      advance(ms);
    };
    jobs.phased = true;
    jobs.submit({ type: "t", payload: { name: "a" }, apply: () => tick(5) });
    reply("a");
    const order: string[] = [];
    const now = () => clock;
    for (const [name, priority] of [
      ["late", 2],
      ["soon", 1],
    ] as const) {
      const w = walk(100, tick, now);
      jobs.slice({ ...w.spec, priority, onPartial: () => order.push(name) });
    }
    jobs.apply(4); // the result takes 5 ms: no slice left after it
    expect(order).toEqual([]);
    jobs.apply(4);
    expect(order).toEqual(["soon"]);
  });

  it("is cancelled when its inputs change, and releases its walk", async () => {
    const { jobs } = setup();
    jobs.phased = true;
    let clock = 0;
    const w = walk(
      10,
      (ms) => (clock += ms),
      () => clock,
    );
    const controller = new AbortController();
    const job = jobs.slice({ ...w.spec, signal: controller.signal });
    controller.abort(); // a warp's signature changed
    expect(await settled(job.promise)).toEqual({ error: "abort" });
    expect(w.cancelled()).toBe(true);
    expect(jobs.waiting).toBe(0);
  });

  it("runs to the end at once while no loop runs the phase", async () => {
    const { jobs } = setup();
    let clock = 0;
    const w = walk(
      5,
      (ms) => (clock += ms),
      () => clock,
    );
    const job = jobs.slice(w.spec);
    expect(job.state).toBe("applied");
    await expect(job.promise).resolves.toBe(1 / 5);
  });
});
