import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { layoutDag } from "../bench/suite/dagLayout.ts";
import {
  boardStatus,
  byUrgency,
  columnsOf,
  countsOf,
  filterItems,
  inFlightOf,
  ownerQueue,
  waitingOnOwner,
  type WorkItem,
  type WorkSnapshot,
} from "../bench/suite/work.ts";
import { buildGraph, loadWorkTree, progress } from "../scripts/work/lib.mjs";
import { API_VERSION, queryWork, showItem } from "../scripts/work/query.mjs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

describe("the tracker's read API (scripts/work/query.mjs)", () => {
  const s = queryWork(root);
  const g = buildGraph(loadWorkTree(root));

  it("is versioned and names its branch", () => {
    expect(s.api_version).toBe(API_VERSION);
    expect(s.branch).toBeTruthy();
  });

  it("agrees with views.mjs: every item, the ready list, the rollups", () => {
    expect(s.items.map((i) => i.id)).toEqual(g.items.map((i) => i.data!.id));
    expect(s.items.filter((i) => i.ready).map((i) => i.id)).toEqual(
      g.items.filter(g.isReady).map((i) => i.data!.id),
    );
    for (const ini of s.initiatives) {
      const all = g
        .projectsOf(ini.id)
        .flatMap((p) => g.itemsOf(p.data!.id as string));
      expect(ini.progress.ready).toBe(progress(g, all).ready);
      expect(ini.progress.done).toBe(progress(g, all).done);
    }
  });

  it("shows one item's text, and only for an ID of the tracker's form", () => {
    const first = s.items[0]!;
    const text = showItem(root, first.id)!;
    expect(text.path).toBe(first.path);
    expect(text.body).not.toMatch(/^---/);
    expect(showItem(root, "../../package.json")).toBeUndefined();
    expect(showItem(root, "CS-999999")).toBeUndefined();
  });
});

// A small tracker, by hand.
const item = (id: string, over: Partial<WorkItem> = {}): WorkItem => ({
  id,
  title: `Item ${id}`,
  kind: "work",
  status: "Planned",
  project: "CS-2",
  needs: [],
  path: `packages/next/work/items/${id}.md`,
  ready: true,
  blocked: false,
  open_needs: [],
  needed_by: [],
  ...over,
});
const snapshot: WorkSnapshot = {
  api_version: 1,
  source: "test",
  generated: "2026-11-14T00:00:00Z",
  items: [
    item("CS-10", {
      kind: "decision",
      decided_by: "owner",
      needed_by: ["CS-11"],
    }),
    item("CS-11", {
      needs: ["CS-10"],
      ready: false,
      blocked: true,
      open_needs: ["CS-10"],
    }),
    item("CS-12", { status: "In progress", claimed: "s1", ready: false }),
    item("CS-13", { status: "Done", ready: false, project: "CS-3" }),
    item("CS-14", { priority: "high", title: "Fix the `rail`" }),
    item("CS-15", { status: "Dropped", ready: false, reason: "not needed" }),
  ],
  projects: [
    {
      id: "CS-2",
      title: "Two",
      status: "Planned",
      initiative: "CS-1",
      path: "p2",
      progress: {
        total: 0,
        done: 0,
        dropped: 0,
        in_progress: 0,
        ready: 0,
        blocked: 0,
        proposed: 0,
      },
    },
    {
      id: "CS-3",
      title: "Three",
      status: "Planned",
      initiative: "CS-9",
      path: "p3",
      progress: {
        total: 0,
        done: 0,
        dropped: 0,
        in_progress: 0,
        ready: 0,
        blocked: 0,
        proposed: 0,
      },
    },
  ],
  initiatives: [],
  project_deps: [],
  problems: [],
  elsewhere: [],
};

describe("the Work board's model (bench/suite/work.ts)", () => {
  it("finds what waits on the owner: the decision and what needs it", () => {
    expect([...waitingOnOwner(snapshot)].sort()).toEqual(["CS-10", "CS-11"]);
  });

  it("filters by initiative, project, kind, owner and words", () => {
    const ids = (f: Parameters<typeof filterItems>[1]) =>
      filterItems(snapshot, f).map((i) => i.id);
    expect(ids({ initiative: "CS-9" })).toEqual(["CS-13"]);
    expect(ids({ project: "CS-3" })).toEqual(["CS-13"]);
    expect(ids({ kinds: ["decision"] })).toEqual(["CS-10"]);
    expect(ids({ owner: true })).toEqual(["CS-10", "CS-11"]);
    expect(ids({ q: "rail fix" })).toEqual(["CS-14"]);
    expect(ids({ q: "s1" })).toEqual(["CS-12"]);
  });

  it("puts each item in its status column, the most urgent first", () => {
    const cols = columnsOf(snapshot.items);
    expect(cols.map((c) => c.status)).toEqual([
      "Proposed",
      "Planned",
      "In progress",
      "Done",
      "Dropped",
    ]);
    // Ready before blocked; high priority first; then what unblocks most.
    expect(cols[1]!.items.map((i) => i.id)).toEqual([
      "CS-14",
      "CS-10",
      "CS-11",
    ]);
    expect([...snapshot.items].sort(byUrgency)[0]!.id).toBe("CS-14");
  });

  it("counts the tiles", () => {
    expect(countsOf(snapshot.items)).toEqual({
      owner: 1,
      ready: 2,
      inProgress: 1,
      blocked: 1,
      done: 1,
      live: 5,
    });
  });
});

describe("work in flight on other branches", () => {
  const flight = inFlightOf({
    ...snapshot,
    elsewhere: [{ id: "CS-14", claimed: "s2", where: "ui", worktree: true }],
  });

  // The high-priority CS-14 comes first in the column.
  it("shows a claim elsewhere as in progress, not ready", () => {
    const it14 = snapshot.items.find((i) => i.id === "CS-14")!;
    expect(boardStatus(it14, flight)).toBe("In progress");
    expect(
      columnsOf(snapshot.items, flight)[2]!.items.map((i) => i.id),
    ).toEqual(["CS-14", "CS-12"]);
    const counts = countsOf(snapshot.items, flight);
    expect([counts.ready, counts.inProgress]).toEqual([1, 2]);
  });

  it("never reopens a closed item", () => {
    const done = snapshot.items.find((i) => i.id === "CS-13")!;
    expect(
      boardStatus(
        done,
        inFlightOf({
          ...snapshot,
          elsewhere: [{ id: "CS-13", where: "old", worktree: false }],
        }),
      ),
    ).toBe("Done");
  });
});

describe("the owner's queue", () => {
  it("lists open owner decisions with what waits on each", () => {
    const q = ownerQueue(snapshot, snapshot.items);
    expect(q.map((x) => [x.decision.id, x.waiting.map((w) => w.id)])).toEqual([
      ["CS-10", ["CS-11"]],
    ]);
  });
});

describe("the graphs' layout (bench/suite/dagLayout.ts)", () => {
  it("puts each node one layer after everything it needs", () => {
    const l = layoutDag(
      ["a", "b", "c", "d"],
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "a", to: "c" },
        { from: "x", to: "d" },
      ],
    );
    expect(["a", "b", "c", "d"].map((n) => l.place.get(n)!.layer)).toEqual([
      0, 1, 2, 0,
    ]);
    expect(l.layers).toBe(3);
  });

  it("survives a cycle and gives every node a distinct place", () => {
    const l = layoutDag(
      ["a", "b", "c"],
      [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
        { from: "c", to: "a" },
      ],
    );
    const places = [...l.place.values()].map((p) => `${p.layer},${p.row}`);
    expect(new Set(places).size).toBe(3);
  });

  it("orders rows to follow their neighbours", () => {
    const l = layoutDag(
      ["a", "b", "x", "y"],
      [
        { from: "a", to: "y" },
        { from: "b", to: "x" },
      ],
    );
    const row = (n: string) => l.place.get(n)!.row;
    expect(row("y") < row("x")).toBe(row("a") < row("b"));
  });
});
