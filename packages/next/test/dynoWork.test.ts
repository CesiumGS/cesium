import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  boardStatus,
  filterItems,
  flowOf,
  inFlightOf,
  milestoneMapOf,
  nextActor,
  ownerQueue,
  proposalGate,
  proposalsOf,
  stageOf,
  unblocksOf,
  waitingOnOwner,
  workInProgress,
  type WorkItem,
  type WorkMilestone,
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
  milestones: [],
  ...over,
});
const snapshot: WorkSnapshot = {
  api_version: 2,
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
    item("CS-14", { title: "Fix the `rail`" }),
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
  milestones: [],
  elsewhere: [],
  history: [],
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

  it("says whose move each open item is", () => {
    const who = Object.fromEntries(
      snapshot.items.map((i) => [i.id, nextActor(i)]),
    );
    expect(who).toEqual({
      "CS-10": "owner", // a decision the owner answers, nothing before it
      "CS-11": "items", // waits on CS-10
      "CS-12": "agents", // in progress
      "CS-13": undefined, // done
      "CS-14": "agents", // ready
      "CS-15": undefined, // dropped
    });
  });

  it("puts each item in its stage", () => {
    expect(snapshot.items.map((i) => stageOf(i))).toEqual([
      "Ready",
      "Waiting",
      "In flight",
      "Done",
      "Ready",
      undefined,
    ]);
  });

  it("counts what waits behind an item, through other items too", () => {
    const chain: WorkSnapshot = {
      ...snapshot,
      items: [
        item("CS-1", { needed_by: ["CS-2"] }),
        item("CS-2", { needed_by: ["CS-3", "CS-4"] }),
        item("CS-3"),
        item("CS-4"),
      ],
    };
    const n = unblocksOf(chain);
    expect([n.get("CS-1"), n.get("CS-2"), n.get("CS-3")]).toEqual([3, 2, 0]);
  });
});

describe("flow, replayed from the status history", () => {
  const day = (d: number, h = 12) =>
    new Date(2026, 10, 13 + d, h).toISOString();
  const history: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-1", { status: "Done", ready: false }),
      item("CS-2", { status: "In progress", ready: false }),
      item("CS-3"),
    ],
    history: [
      // The import, on the first day.
      { id: "CS-1", at: day(0, 9), status: "Planned" },
      { id: "CS-2", at: day(0, 9), status: "Planned" },
      // CS-1 done the same day; CS-2 claimed the next; CS-3 made the next.
      { id: "CS-1", at: day(0, 15), status: "Done" },
      { id: "CS-2", at: day(1), status: "In progress" },
      { id: "CS-3", at: day(1, 13), status: "Planned" },
    ],
  };
  const flow = flowOf(history, history.items, {
    now: new Date(2026, 10, 14, 18).getTime(),
  });

  it("keeps a stock per stage for each day, now last", () => {
    expect(flow.days).toHaveLength(2);
    expect(flow.stocks.Ready).toEqual([1, 1]); // CS-2, then CS-3
    expect(flow.stocks["In flight"]).toEqual([0, 1]);
    expect(flow.stocks.Done).toEqual([1, 1]);
  });

  it("counts moves between stages, a same-day finish included, not the import", () => {
    expect(flow.left.Ready).toBe(2); // CS-1 to Done, CS-2 to In flight
    expect(flow.arrived.Done).toBe(1);
    expect(flow.arrived["In flight"]).toBe(1);
    expect(flow.created).toBe(1); // CS-3; the first day's items are the import
    expect(flow.leadDays.map((d) => Math.round(d * 24))).toEqual([6]);
  });
});

describe("work in flight on other branches", () => {
  const flight = inFlightOf({
    ...snapshot,
    elsewhere: [{ id: "CS-14", claimed: "s2", where: "ui", worktree: true }],
  });

  it("shows a claim elsewhere as in flight, not ready", () => {
    const it14 = snapshot.items.find((i) => i.id === "CS-14")!;
    expect(boardStatus(it14, flight)).toBe("In progress");
    expect(stageOf(it14, flight)).toBe("In flight");
    expect(nextActor(it14, flight)).toBe("agents");
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

describe("the milestone map shows committed work", () => {
  const ms = (
    id: string,
    constraints: string[],
    over: Partial<Omit<WorkMilestone, "constraints">> = {},
  ): WorkMilestone => ({
    title: `Milestone ${id}`,
    kind: "capability",
    status: "Planned",
    project: "CS-2",
    done_when: [],
    serves: [],
    check_results: [],
    path: `m/${id}`,
    progress: { done: 0, total: constraints.length },
    check_due: false,
    to_shape: [],
    ...over,
    id,
    constraints: constraints.map((c) => ({ id: c, clause: "c?" })),
  });
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-20"),
      item("CS-21", {
        needs: ["CS-22", "CS-23"],
        open_needs: ["CS-22", "CS-23"],
      }),
      item("CS-22", { kind: "decision", decided_by: "owner" }),
      item("CS-23", { kind: "external", party: "Someone" }),
      item("CS-24", { kind: "decision", decided_by: "owner" }),
      item("CS-30", { status: "Proposed" }),
      item("CS-31", { kind: "decision", decided_by: "owner" }),
      item("CS-32", { kind: "external", party: "Someone" }),
      item("CS-33"),
      item("CS-34", { status: "Proposed" }),
    ],
    milestones: [
      ms("CS-50", ["CS-20", "CS-21", "CS-22"]),
      ms("CS-51", ["CS-24"], { kind: "learning" }),
      ms("CS-52", ["CS-34"], { status: "Proposed" }),
    ],
  };

  it("leaves out proposals, and decisions and waits no milestone holds", () => {
    const ids = (m: ReturnType<typeof milestoneMapOf>) =>
      m.nodes.map((n) => n.id).sort();
    const committed = milestoneMapOf(s, undefined, "steps");
    expect(ids(committed)).toEqual(["CS-50", "CS-51", "unshaped-CS-2"]);
    const loose = committed.nodes.find((n) => n.unshaped)!;
    // Only CS-33: CS-30 is proposed, CS-31 and CS-32 aren't work.
    expect(Object.values(loose.counts).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("counts work in the bar and marks what holds it up apart", () => {
    const m = milestoneMapOf(s, undefined, "steps");
    const n50 = m.nodes.find((n) => n.id === "CS-50")!;
    expect(Object.values(n50.counts).reduce((a, b) => a + b, 0)).toBe(2);
    expect(n50.decisions).toBe(1);
    expect(n50.outside).toBe(1);
    // A milestone that is only a decision counts the decision.
    const n51 = m.nodes.find((n) => n.id === "CS-51")!;
    expect(Object.values(n51.counts).reduce((a, b) => a + b, 0)).toBe(1);
    expect(n51.decisions).toBe(1);
  });
});

describe("the proposals", () => {
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-20"),
      item("CS-21", { kind: "decision", decided_by: "owner" }),
      item("CS-22", { status: "Proposed" }),
      item("CS-23", {
        status: "Proposed",
        needs: ["CS-21"],
        open_needs: ["CS-21"],
      }),
      item("CS-24", {
        status: "Proposed",
        needs: ["CS-20"],
        open_needs: ["CS-20"],
      }),
      item("CS-25", { status: "Proposed" }),
      item("CS-26", { status: "Proposed" }),
      item("CS-30", { status: "Proposed", project: "CS-3" }),
      item("CS-31", { status: "Done", project: "CS-3" }),
    ],
    milestones: [
      {
        id: "CS-40",
        title: "A bet",
        kind: "capability",
        status: "Proposed",
        project: "CS-2",
        done_when: [],
        constraints: [{ id: "CS-26", clause: "c?" }],
        serves: [],
        check_results: [],
        path: "m/CS-40",
        progress: { done: 0, total: 1 },
        check_due: false,
        to_shape: [],
      },
    ],
  };
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const byId = (id: string) => itemOf.get(id)!;

  it("says what stands between a proposal and committing to it", () => {
    expect(proposalGate(byId("CS-22"), itemOf)).toBe("free");
    expect(proposalGate(byId("CS-23"), itemOf)).toBe("decision");
    expect(proposalGate(byId("CS-24"), itemOf)).toBe("items");
  });

  it("groups by project, whole projects first, with proposed milestones apart", () => {
    const groups = proposalsOf(
      s,
      s.items,
      s.milestones,
      new Map([["CS-25", 2]]),
    );
    expect(groups.map((g) => [g.project?.id, g.whole, g.count])).toEqual([
      ["CS-3", true, 1],
      ["CS-2", false, 5],
    ]);
    const two = groups[1]!;
    expect(two.milestones.map((m) => m.milestone.id)).toEqual(["CS-40"]);
    expect(two.milestones[0]!.items.map((it) => it.id)).toEqual(["CS-26"]);
    // Free first (the most waited on first), then decisions, then items.
    expect(two.items.map((it) => it.id)).toEqual([
      "CS-25",
      "CS-22",
      "CS-23",
      "CS-24",
    ]);
  });

  it("keeps to the items and milestones it is given", () => {
    const groups = proposalsOf(
      s,
      s.items.filter((it) => it.project === "CS-3"),
      [],
    );
    expect(groups.map((g) => g.project?.id)).toEqual(["CS-3"]);
  });
});

describe("work in progress", () => {
  it("is work someone holds, not a decision or an outside wait in progress", () => {
    const items = [
      item("CS-60", { status: "In progress", claimed: "s1" }),
      item("CS-61", { status: "In progress", kind: "external", party: "1.x" }),
      item("CS-62", {
        status: "In progress",
        kind: "decision",
        decided_by: "owner",
      }),
      item("CS-63"),
    ];
    expect(workInProgress(items).map((it) => it.id)).toEqual(["CS-60"]);
  });
});
