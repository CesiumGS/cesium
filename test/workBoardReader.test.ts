// The board's kept reads (CS-704): the dev server's reader answers what a
// whole read answers, keeps each read until what it reads changes, reads
// the ledger incrementally, and gives the rail its count from one read.
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  LEDGER_RECENT,
  LIVE_UNREAD,
  boardReader,
  countOf,
  foldQueue,
  keptRead,
  liveLedger,
  queryWork,
  queueOf,
  readEntities,
  readLive,
  stateHistory,
  elsewhereOf,
  type WorkSnapshot,
} from "../scripts/workBoard.mjs";
import { isOwnerDecision, liveBoxOf } from "../bench/suite/work.ts";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A snapshot without the times it was read at. */
function untimed(s: WorkSnapshot): unknown {
  return JSON.parse(
    JSON.stringify(s, (k, v) =>
      k === "read_at" || k === "generated" ? undefined : v,
    ),
  );
}

describe("keptRead", () => {
  it("reads once while its key holds, and again behind the kept value when it changes", async () => {
    let key = "a";
    let reads = 0;
    let changes = 0;
    const r = keptRead({
      key: () => key,
      read: async () => `${key}${++reads}`,
      onChange: () => changes++,
    });
    const first = r.get();
    expect("promise" in first).toBe(true);
    expect(await (first as { promise: Promise<string> }).promise).toBe("a1");
    expect(r.get()).toEqual({ value: "a1", fresh: true });
    expect(reads).toBe(1);
    key = "b";
    // The kept value answers while the new read runs.
    expect(r.get()).toEqual({ value: "a1", fresh: false });
    // A second get() during that read starts no other.
    r.get();
    await sleep(0);
    expect(reads).toBe(2);
    expect(r.get()).toEqual({ value: "b2", fresh: true });
    expect(changes).toBe(2);
  });

  it("waits for the new read when told to", async () => {
    let key = "a";
    const r = keptRead({ key: () => key, read: async () => key, wait: true });
    await (r.get() as { promise: Promise<string> }).promise;
    key = "b";
    const got = r.get();
    expect("promise" in got).toBe(true);
    expect(await (got as { promise: Promise<string> }).promise).toBe("b");
  });

  it("tells of a read only when its answer differs", async () => {
    let reads = 0;
    let changes = 0;
    const r = keptRead({
      key: () => String(reads),
      read: async () => {
        reads++;
        return { same: true };
      },
      onChange: () => changes++,
    });
    await (r.get() as { promise: Promise<unknown> }).promise;
    r.get();
    await sleep(0);
    expect(reads).toBe(2);
    expect(changes).toBe(1);
  });

  it("reads again when its value is older than allowed", async () => {
    let reads = 0;
    const r = keptRead({
      key: () => "k",
      read: async () => ++reads,
      maxAgeMs: 5,
    });
    await (r.get() as { promise: Promise<number> }).promise;
    await sleep(20);
    expect(r.get()).toEqual({ value: 1, fresh: false });
    await sleep(0);
    expect(r.get()).toEqual({ value: 2, fresh: true });
  });

  it("keeps the last value when a read behind it fails, and tries again", async () => {
    let key = "a";
    let fail = false;
    const r = keptRead({
      key: () => key,
      read: async () => {
        if (fail) {
          throw new Error("no");
        }
        return key;
      },
    });
    await (r.get() as { promise: Promise<string> }).promise;
    fail = true;
    key = "b";
    expect(r.get()).toEqual({ value: "a", fresh: false });
    await sleep(0);
    fail = false;
    expect(r.get()).toEqual({ value: "a", fresh: false });
    await sleep(0);
    expect(r.get()).toEqual({ value: "b", fresh: true });
  });
});

describe("the ledger, read incrementally", () => {
  let store: string;
  const event = (n: number, e: Record<string, unknown>) =>
    `${JSON.stringify({ schema_version: 2, id: `e-${n}`, at: `2026-11-19T00:${String(n % 60).padStart(2, "0")}:00Z`, ...e })}\n`;
  beforeAll(() => {
    store = mkdtempSync(join(tmpdir(), "dyno-ledger-"));
  });
  afterAll(() => rmSync(store, { recursive: true, force: true }));

  it("folds only the new events onto the last read, as a whole read folds them all", async () => {
    const all: string[] = [];
    const add = (e: Record<string, unknown>) => {
      const line = event(all.length, e);
      all.push(line);
      appendFileSync(join(store, "ledger.jsonl"), line);
    };
    writeFileSync(join(store, "ledger.jsonl"), "");
    for (let i = 1; i <= 200; i++) {
      add({
        event: "verified",
        item: `CS-${i}`,
        result: i % 3 ? "pass" : "fail",
      });
    }
    const first = await liveLedger(root, store);
    expect(first.source.ok).toBe(true);
    expect(first.fold!.read).toBe(200);
    add({ event: "merged", item: "CS-1" });
    add({ event: "verified", item: "CS-3", result: "pass" });
    add({ event: "verified", item: "CS-201", result: "pass" });
    const second = await liveLedger(root, store, first.fold);
    // Only the three new events were folded in.
    expect(second.fold!.read).toBe(3);
    const events = all.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect([...second.fold!.queue]).toEqual([...queueOf(events)]);
    const whole = await liveLedger(root, store);
    expect(whole.fold!.read).toBe(events.length);
    expect({ ...second.source, read_at: 0 }).toEqual({
      ...whole.source,
      read_at: 0,
    });
    // Nothing new: nothing folded.
    expect((await liveLedger(root, store, second.fold)).fold!.read).toBe(0);
  }, 30_000);

  it("reads the ledger whole when more is new than it asks for, or the ledger changed under it", async () => {
    writeFileSync(join(store, "ledger.jsonl"), "");
    let n = 0;
    appendFileSync(
      join(store, "ledger.jsonl"),
      event(n++, { event: "verified", item: "CS-1", result: "pass" }),
    );
    const first = await liveLedger(root, store);
    for (let i = 0; i < LEDGER_RECENT + 5; i++) {
      appendFileSync(
        join(store, "ledger.jsonl"),
        event(n++, { event: "verified", item: `CS-${i + 2}`, result: "pass" }),
      );
    }
    const many = await liveLedger(root, store, first.fold);
    expect(many.fold!.read).toBe(n);
    // A rewritten ledger: the event before the new ones isn't the last read.
    writeFileSync(
      join(store, "ledger.jsonl"),
      event(1000, { event: "verified", item: "CS-9", result: "fail" }) +
        event(1001, { event: "verified", item: "CS-10", result: "pass" }),
    );
    const rewritten = await liveLedger(root, store, {
      ...many.fold!,
      total: 1,
    });
    expect(rewritten.fold!.read).toBe(2);
    expect([...rewritten.fold!.queue.keys()]).toEqual(["CS-9", "CS-10"]);
  }, 30_000);

  it("reads an empty ledger as empty, never as nothing in flight", async () => {
    writeFileSync(join(store, "ledger.jsonl"), "");
    const empty = await liveLedger(root, store);
    expect(empty.source.ok).toBe(false);
    expect(empty.source.ok ? "" : empty.source.why).toBe(LIVE_UNREAD.empty);
  }, 30_000);

  it("folds as one pass does, in any split", () => {
    const events = [
      { event: "verified", item: "CS-1", result: "pass", at: "a" },
      { event: "verified", item: "CS-2", result: "fail", at: "b" },
      { event: "merged", item: "CS-1", at: "c" },
      { event: "verified", item: "CS-2", result: "pass", at: "d" },
    ];
    for (let k = 0; k <= events.length; k++) {
      const q = foldQueue(new Map(), events.slice(0, k));
      foldQueue(q, events.slice(k));
      expect([...q]).toEqual([...queueOf(events)]);
    }
  });
});

describe("the dev server's reader against a whole read (this repository)", () => {
  let dir: string;
  let store: string;
  let whole: WorkSnapshot;
  /** A whole read, as the dev server read before CS-704. */
  const wholeRead = async () => {
    const live = await readLive(root, { store });
    return queryWork(root, {
      elsewhere: live.claims.ok ? elsewhereOf(live.claims) : [],
      history: stateHistory(root),
      live,
    });
  };
  /** The reader's answer once every source is in. */
  const settled = async (reader: ReturnType<typeof boardReader>) => {
    let s = await reader.query({ waitMs: 60_000 });
    for (let i = 0; i < 600 && s.pending; i++) {
      await sleep(100);
      s = await reader.query();
    }
    return s;
  };
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "dyno-reader-"));
    store = join(dir, "store");
    mkdirSync(store);
    writeFileSync(
      join(store, "ledger.jsonl"),
      `${JSON.stringify({ schema_version: 2, id: "v-1", event: "verified", item: "CS-1", result: "pass", at: "2026-11-19T00:00:00Z" })}\n`,
    );
    whole = await wholeRead();
  }, 120_000);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("answers the first request with what it has, says what is still reading, and tells when it is in", async () => {
    let told = 0;
    const reader = boardReader(root, { store, onChange: () => told++ });
    const first = await reader.query({ waitMs: 0 });
    expect(first.pending?.length).toBeGreaterThan(0);
    expect(first.items.map((i) => i.id)).toEqual(whole.items.map((i) => i.id));
    if (
      first.live!.claims.ok === false &&
      first.pending!.includes("hitld work claims")
    ) {
      expect(first.live!.claims.why).toBe(LIVE_UNREAD.reading);
    }
    for (let i = 0; i < 600 && told < 1; i++) {
      await sleep(100);
    }
    expect(told).toBeGreaterThan(0);
    let full = await settled(reader);
    expect(full.pending).toBeUndefined();
    // The board and the In progress box are what a whole read shows. Other
    // sessions commit to their branches meanwhile (claims, unmerged items),
    // so the whole read is taken right after; if the repository moved
    // between the two, both are read once more.
    let ref = await wholeRead();
    if (JSON.stringify(untimed(full)) !== JSON.stringify(untimed(ref))) {
      full = await settled(boardReader(root, { store }));
      ref = await wholeRead();
    }
    expect(untimed(full)).toEqual(untimed(ref));
    const box = (s: WorkSnapshot) =>
      JSON.parse(
        JSON.stringify(liveBoxOf(s), (k, v) => (k === "at" ? undefined : v)),
      );
    expect(box(full)).toEqual(box(ref));
  }, 240_000);

  it("answers warm from what it kept, with no hitld process", async () => {
    const reader = boardReader(root, { store });
    const full = await settled(reader);
    const t0 = performance.now();
    const again = await reader.query();
    // Keys only: a few git reads, far below one hitld process.
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(untimed(again)).toEqual(untimed(full));
    // An item file changing makes it read the tracker again.
    reader.changed(join(root, "work/items/CS-1-x.md"));
    expect(untimed(await reader.query())).toEqual(untimed(full));
  }, 240_000);

  it("gives the rail the count the board shows, from one read", async () => {
    const count = countOf(await readEntities(root));
    expect(count.owner_decisions).toBe(
      whole.items.filter((it) => isOwnerDecision(it) && !it.open_needs.length)
        .length,
    );
    expect(count.items).toEqual(
      whole.items.map(({ id, title, kind }) => ({ id, title, kind })),
    );
    const reader = boardReader(root, { store });
    expect(await reader.count()).toEqual(count);
  }, 60_000);

  it("carries only the proposals' text", () => {
    const withText = [...whole.items, ...whole.milestones].filter(
      (e) => e.text,
    );
    expect(withText.length).toBeGreaterThan(0);
    expect(withText.every((e) => e.state === "proposed")).toBe(true);
  });
});
