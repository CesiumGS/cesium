// The machine-wide run lock (CS-390): two runs started together run one
// after the other, the second saying whose run it waited for; a lock whose
// process is gone is taken over.
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  acquireRunLock,
  defaultLockFile,
  holderLine,
  processAlive,
} from "../bench/suite/runLock.mjs";

const lockModule = fileURLToPath(
  new URL("../bench/suite/runLock.mjs", import.meta.url),
);

describe("the run lock", () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dyno-lock-"));
    file = join(dir, "run.lock");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const quick = { pollMs: 20, handlers: false };

  it("lives in the bench folder unless BENCH_LOCK says otherwise", () => {
    expect(defaultLockFile({})).toMatch(/\.cesium-bench[\\/]run\.lock$/);
    expect(defaultLockFile({ BENCH_LOCK: "/x/y.lock" })).toBe("/x/y.lock");
  });

  it("records the run that holds it, and frees it on release", async () => {
    const lock = await acquireRunLock({
      file,
      info: {
        worktree: "feature-tree",
        command: "run --scenes a",
        item: "CS-390",
      },
      ...quick,
    });
    expect(lock.waitedFor).toBeUndefined();
    expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({
      pid: process.pid,
      worktree: "feature-tree",
      command: "run --scenes a",
      item: "CS-390",
    });
    lock.release();
    lock.release();
    expect(existsSync(file)).toBe(false);
  });

  it("leaves a lock that another run took alone when released late", async () => {
    const lock = await acquireRunLock({ file, ...quick });
    writeFileSync(file, JSON.stringify({ pid: 1, start: "other" }));
    lock.release();
    expect(existsSync(file)).toBe(true);
  });

  it("waits for a live holder and says whose run it is", async () => {
    const first = await acquireRunLock({
      file,
      info: { worktree: "tree-a", command: "run", item: "CS-1" },
      ...quick,
    });
    const waits: string[] = [];
    const second = acquireRunLock({
      file,
      info: { worktree: "tree-b", command: "images" },
      onWait: (holder, path) => waits.push(holderLine(holder, path)),
      ...quick,
    });
    await new Promise((r) => setTimeout(r, 150));
    expect(waits).toHaveLength(1);
    expect(waits[0]).toMatch(/worktree tree-a/);
    expect(waits[0]).toMatch(/CS-1/);
    expect(waits[0]).toContain(file);
    expect(JSON.parse(readFileSync(file, "utf8")).worktree).toBe("tree-a");
    first.release();
    const lock = await second;
    expect(lock.waitedFor).toMatchObject({ worktree: "tree-a" });
    expect(JSON.parse(readFileSync(file, "utf8")).worktree).toBe("tree-b");
    lock.release();
  });

  it("exits instead of waiting with --no-wait, naming the holder", async () => {
    const first = await acquireRunLock({
      file,
      info: { worktree: "tree-a", command: "run" },
      ...quick,
    });
    await expect(
      acquireRunLock({ file, wait: false, ...quick }),
    ).rejects.toThrow(/worktree tree-a.*--no-wait/);
    first.release();
  });

  it("takes over a lock whose process is gone", async () => {
    const dead = spawnSync(process.execPath, ["-e", ""]);
    expect(dead.status).toBe(0);
    const pid = dead.pid;
    expect(processAlive(pid)).toBe(false);
    writeFileSync(
      file,
      JSON.stringify({
        pid,
        start: "2026-11-19T00:00:00.000Z",
        worktree: "gone",
      }),
    );
    const waits: string[] = [];
    const lock = await acquireRunLock({
      file,
      onWait: (holder) => waits.push(holder.worktree ?? ""),
      ...quick,
    });
    expect(waits).toEqual([]);
    expect(JSON.parse(readFileSync(file, "utf8")).pid).toBe(process.pid);
    lock.release();
  });

  it("clears a lock file that stays unreadable", async () => {
    writeFileSync(file, "{ half");
    const old = new Date(Date.now() - 60_000);
    const { utimesSync } = await import("node:fs");
    utimesSync(file, old, old);
    const lock = await acquireRunLock({ file, ...quick });
    expect(JSON.parse(readFileSync(file, "utf8")).pid).toBe(process.pid);
    lock.release();
  });

  it.each([
    ["SIGTERM", "kill"],
    ["a failed run's process.exit(1)", "exit"],
  ])("is freed when its run ends by %s", async (_name, how) => {
    const script = `
      import { acquireRunLock } from ${JSON.stringify(lockModule)};
      await acquireRunLock({ file: ${JSON.stringify(file)}, info: { command: "run" } });
      ${how === "exit" ? "setTimeout(() => process.exit(1), 300);" : "console.log('held'); setInterval(() => {}, 1000);"}
    `;
    const p = spawn(process.execPath, ["--input-type=module", "-e", script], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    const ended = new Promise((resolve) => p.on("exit", resolve));
    if (how === "kill") {
      await new Promise((resolve) => p.stdout.once("data", resolve));
      expect(existsSync(file)).toBe(true);
      p.kill("SIGTERM");
    }
    await ended;
    expect(existsSync(file)).toBe(false);
  });

  it("serializes two runs started together, in separate processes", async () => {
    const log = join(dir, "events.log");
    const child = (name: string) => {
      const script = `
        import { appendFileSync } from "node:fs";
        import { acquireRunLock } from ${JSON.stringify(lockModule)};
        const at = () => process.hrtime.bigint();
        const note = (what, extra = "") =>
          appendFileSync(${JSON.stringify(log)}, [what, ${JSON.stringify(name)}, at(), extra].join(" ") + "\\n");
        const lock = await acquireRunLock({
          file: ${JSON.stringify(file)},
          info: { worktree: ${JSON.stringify(name)}, command: "run" },
          pollMs: 20,
          onWait: (holder) => note("WAIT", holder.worktree),
        });
        note("GOT");
        await new Promise((r) => setTimeout(r, 400));
        note("DONE");
        lock.release();
      `;
      return new Promise<number | null>((resolve) => {
        const p = spawn(
          process.execPath,
          ["--input-type=module", "-e", script],
          {
            stdio: "ignore",
          },
        );
        p.on("exit", resolve);
      });
    };
    const codes = await Promise.all([child("run-x"), child("run-y")]);
    expect(codes).toEqual([0, 0]);
    const events = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const [what, who, time, extra] = line.split(" ") as [
          string,
          string,
          string,
          string | undefined,
        ];
        return { what, who, time: BigInt(time), extra };
      });
    const of = (what: string, who: string) =>
      events.find((e) => e.what === what && e.who === who);
    const first =
      of("GOT", "run-x")!.time < of("GOT", "run-y")!.time ? "run-x" : "run-y";
    const second = first === "run-x" ? "run-y" : "run-x";
    // One after the other: the second gets it only after the first is done.
    expect(of("DONE", first)!.time).toBeLessThan(of("GOT", second)!.time);
    // And the second says whose run it waited for.
    expect(of("WAIT", second)?.extra).toBe(first);
    expect(of("WAIT", first)).toBeUndefined();
    expect(existsSync(file)).toBe(false);
  });
});
