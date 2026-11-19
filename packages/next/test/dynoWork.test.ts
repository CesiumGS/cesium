import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import {
  barCounts,
  boardStatus,
  committedOnly,
  filterItems,
  filterLoose,
  looseCounts,
  noMilestoneOf,
  flowOf,
  inFlightOf,
  kindsOf,
  milestoneMapOf,
  milestoneRoadmapOf,
  nextActor,
  ownerQueue,
  proposalGate,
  proposalsOf,
  releasesGatedBy,
  stageOf,
  unblocksOf,
  waitingOnOwner,
  withoutDropped,
  workInProgress,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "../bench/suite/work.ts";
import {
  API_VERSION,
  HitldUnavailable,
  checkVersion,
  hitldPath,
  queryWork,
  showItem,
  stateHistory,
} from "../scripts/workBoard.mjs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

/** hitld's own answer, for the adapter to agree with. */
const hitld = (...args: string[]) =>
  JSON.parse(
    execFileSync(process.execPath, [hitldPath(), ...args], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1 << 28,
    }),
  ) as { api_version: number; entities: Array<{ id: string; entity: string }> };

describe("the board's adapter (scripts/workBoard.mjs) over hitld's read API", () => {
  let s: WorkSnapshot;
  beforeAll(async () => {
    s = await queryWork(root);
  }, 60_000);

  it("reads version 3 and names its branch and its source", () => {
    expect(s.api_version).toBe(API_VERSION);
    expect(API_VERSION).toBe(3);
    expect(s.branch).toBeTruthy();
    expect(s.source).toMatch(/^hitld work query --json/);
  });

  it("refuses an answer in another read API version, saying so", () => {
    expect(() => checkVersion({ api_version: 2 })).toThrow(HitldUnavailable);
    expect(() => checkVersion({ api_version: 2 })).toThrow(/version 2/);
    expect(checkVersion({ api_version: 3 })).toEqual({ api_version: 3 });
  });

  it("agrees with hitld: every item, the ready list, the long outcomes", () => {
    const all = hitld("work", "query", "--json");
    const ids = (kind: string) =>
      all.entities
        .filter((e) => e.entity === kind)
        .map((e) => e.id)
        .sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
    expect(s.items.map((i) => i.id)).toEqual(ids("item"));
    const ready = hitld("work", "query", "--ready", "--json").entities;
    expect(s.items.filter((i) => i.ready).map((i) => i.id)).toEqual(
      ready
        .map((e) => e.id)
        .sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))),
    );
    // A long outcome's progress is its projects' together.
    for (const lo of s.long_outcomes) {
      const ps = s.projects.filter((p) => p.long_outcome === lo.id);
      expect(lo.progress.total).toBe(
        ps.reduce((n, p) => n + p.progress.total, 0),
      );
      expect(lo.progress.done).toBe(
        ps.reduce((n, p) => n + p.progress.done, 0),
      );
    }
    expect(s.long_outcomes.length).toBeGreaterThan(0);
    expect(s.milestones.every((m) => m.project)).toBe(true);
  });

  it("shows one item's text, and only for an ID of the tracker's form", async () => {
    const first = s.items[0]!;
    const text = (await showItem(root, first.id))!;
    expect(text.path).toBe(first.path);
    expect(text.body).not.toMatch(/^---/);
    expect(await showItem(root, "../../package.json")).toBeUndefined();
    expect(await showItem(root, "CS-999999")).toBeUndefined();
  });

  it("reads the state history in hitld's names, the migration adding no event", () => {
    const events = stateHistory(root);
    expect(events.length).toBeGreaterThan(0);
    const states = new Set(events.map((e) => e.state));
    for (const st of states) {
      expect([
        "proposed",
        "planned",
        "in-progress",
        "done",
        "dropped",
      ]).toContain(st);
    }
    // The migration's commit renamed every item's state; only CS-174
    // (an external item that was in progress) and CS-388 and CS-521 changed.
    const at = execFileSync(
      "git",
      [
        "log",
        "-1",
        "--format=%cI",
        "--grep=^The tracker's files in human-in-the-lead's format",
      ],
      { cwd: root, encoding: "utf8" },
    ).trim();
    if (at) {
      expect(
        events
          .filter((e) => e.at === at)
          .map((e) => e.id)
          .sort(),
      ).toEqual(["CS-174", "CS-388", "CS-521"]);
    }
  });
});

// A small tracker, by hand.
const item = (id: string, over: Partial<WorkItem> = {}): WorkItem => ({
  id,
  title: `Item ${id}`,
  kind: "work",
  state: "planned",
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
  api_version: 3,
  source: "test",
  generated: "2026-11-14T00:00:00Z",
  items: [
    item("CS-10", {
      kind: "decision",
      decider: "owner",
      needed_by: ["CS-11"],
    }),
    item("CS-11", {
      needs: ["CS-10"],
      ready: false,
      blocked: true,
      open_needs: ["CS-10"],
    }),
    item("CS-12", { state: "in-progress", claimed_by: "s1", ready: false }),
    item("CS-13", { state: "done", ready: false, project: "CS-3" }),
    item("CS-14", { title: "Fix the `rail`" }),
    item("CS-15", { state: "dropped", ready: false, reason: "not needed" }),
  ],
  projects: [
    {
      id: "CS-2",
      title: "Two",
      state: "planned",
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
      state: "planned",
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
  long_outcomes: [],
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

  it("names each ID's kind, a release item as a release", () => {
    const s: WorkSnapshot = {
      ...snapshot,
      items: [
        ...snapshot.items,
        item("CS-20", { kind: "external" }),
        item("CS-21", { release: "2.0.0", needs: ["CS-30", "CS-12"] }),
      ],
      milestones: [{ id: "CS-30" } as WorkMilestone],
    };
    const kinds = kindsOf(s);
    expect(kinds.get("CS-2")).toBe("project");
    expect(kinds.get("CS-30")).toBe("milestone");
    expect(kinds.get("CS-10")).toBe("decision");
    expect(kinds.get("CS-14")).toBe("work");
    expect(kinds.get("CS-20")).toBe("external");
    expect(kinds.get("CS-21")).toBe("release");
  });

  it("finds the releases an item gates, directly or through its milestone", () => {
    const s: WorkSnapshot = {
      ...snapshot,
      items: [
        ...snapshot.items,
        item("CS-22", { milestones: ["CS-30"] }),
        item("CS-21", { release: "2.0.0", needs: ["CS-30", "CS-12"] }),
        item("CS-23", { release: "1.0.0", state: "done", needs: ["CS-12"] }),
      ],
    };
    const ids = (id: string) => releasesGatedBy(s, id).map((r) => r.id);
    expect(ids("CS-22")).toEqual(["CS-21"]);
    expect(ids("CS-12")).toEqual(["CS-21"]);
    expect(ids("CS-30")).toEqual(["CS-21"]);
    expect(ids("CS-14")).toEqual([]);
  });

  it("filters by project, kind, owner and words", () => {
    const ids = (f: Parameters<typeof filterItems>[1]) =>
      filterItems(snapshot, f).map((i) => i.id);
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

describe("flow, replayed from the state history", () => {
  const day = (d: number, h = 12) =>
    new Date(2026, 10, 13 + d, h).toISOString();
  const history: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-1", { state: "done", ready: false }),
      item("CS-2", { state: "in-progress", ready: false }),
      item("CS-3"),
    ],
    history: [
      // The import, on the first day.
      { id: "CS-1", at: day(0, 9), state: "planned" },
      { id: "CS-2", at: day(0, 9), state: "planned" },
      // CS-1 done the same day; CS-2 claimed the next; CS-3 made the next.
      { id: "CS-1", at: day(0, 15), state: "done" },
      { id: "CS-2", at: day(1), state: "in-progress" },
      { id: "CS-3", at: day(1, 13), state: "planned" },
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
    elsewhere: [{ id: "CS-14", claimed_by: "s2", where: "ui", worktree: true }],
  });

  it("shows a claim elsewhere as in flight, not ready", () => {
    const it14 = snapshot.items.find((i) => i.id === "CS-14")!;
    expect(boardStatus(it14, flight)).toBe("in-progress");
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
    ).toBe("done");
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
    kind: "milestone",
    learning: false,
    state: "planned",
    project: "CS-2",
    done_when: [],
    contributions: [],
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
      item("CS-22", { kind: "decision", decider: "owner" }),
      item("CS-23", { kind: "external", waiting_on: "Someone" }),
      item("CS-24", { kind: "decision", decider: "owner" }),
      item("CS-30", { state: "proposed" }),
      item("CS-31", { kind: "decision", decider: "owner" }),
      item("CS-32", { kind: "external", waiting_on: "Someone" }),
      item("CS-33"),
      item("CS-34", { state: "proposed" }),
    ],
    milestones: [
      ms("CS-50", ["CS-20", "CS-21", "CS-22"]),
      ms("CS-51", ["CS-24"], { learning: true }),
      ms("CS-52", ["CS-34"], { state: "proposed" }),
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

  it("takes dropped milestones out of every roadmap, lane and count", () => {
    const withDropped: WorkSnapshot = {
      ...s,
      items: s.items.map((it) =>
        it.id === "CS-33" ? { ...it, milestones: ["CS-53", "CS-50"] } : it,
      ),
      milestones: [
        ...s.milestones,
        ms("CS-53", ["CS-33"], { state: "dropped" }),
        // A retired long outcome: a milestone with no project, dropped.
        ms("CS-1", ["CS-53"], { state: "dropped", project: undefined }),
      ],
    };
    const shown = withoutDropped(withDropped);
    expect(shown.milestones.map((m) => m.id)).toEqual([
      "CS-50",
      "CS-51",
      "CS-52",
    ]);
    expect(shown.items.find((i) => i.id === "CS-33")!.milestones).toEqual([
      "CS-50",
    ]);
    const map = milestoneMapOf(shown, undefined, "steps");
    expect(map.nodes.map((n) => n.id).sort()).toEqual([
      "CS-50",
      "CS-51",
      "unshaped-CS-2",
    ]);
    expect(map.lanes.map((l) => l.id)).toEqual(["CS-2"]);
    expect(
      milestoneRoadmapOf(shown, shown.items, undefined, true).map((r) => r.id),
    ).not.toContain("CS-53");
    // Nothing dropped: the same snapshot back.
    expect(withoutDropped(s)).toBe(s);
  });
});

describe("the proposals", () => {
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-20"),
      item("CS-21", { kind: "decision", decider: "owner" }),
      item("CS-22", { state: "proposed" }),
      item("CS-23", {
        state: "proposed",
        needs: ["CS-21"],
        open_needs: ["CS-21"],
      }),
      item("CS-24", {
        state: "proposed",
        needs: ["CS-20"],
        open_needs: ["CS-20"],
      }),
      item("CS-25", { state: "proposed" }),
      item("CS-26", { state: "proposed" }),
      item("CS-30", { state: "proposed", project: "CS-3" }),
      item("CS-31", { state: "done", project: "CS-3" }),
    ],
    milestones: [
      {
        id: "CS-40",
        title: "A bet",
        kind: "milestone",
        learning: false,
        state: "proposed",
        project: "CS-2",
        done_when: [],
        constraints: [{ id: "CS-26", clause: "c?" }],
        contributions: [],
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
      item("CS-60", { state: "in-progress", claimed_by: "s1" }),
      item("CS-61", {
        state: "in-progress",
        kind: "external",
        waiting_on: "1.x",
      }),
      item("CS-62", {
        state: "in-progress",
        kind: "decision",
        decider: "owner",
      }),
      item("CS-63"),
    ];
    expect(workInProgress(items).map((it) => it.id)).toEqual(["CS-60"]);
  });
});

describe("release items are the map's gates", () => {
  const ms = (id: string, constraints: string[]): WorkMilestone => ({
    id,
    title: `Milestone ${id}`,
    kind: "milestone",
    learning: false,
    state: "planned",
    project: "CS-2",
    done_when: [],
    constraints: constraints.map((c) => ({ id: c, clause: "c?" })),
    contributions: [],
    check_results: [],
    path: `m/${id}`,
    progress: { done: 0, total: constraints.length },
    check_due: false,
    to_shape: [],
  });
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-70"),
      item("CS-71"),
      item("CS-72", { needs: ["CS-71"], open_needs: ["CS-71"] }),
      item("CS-74"),
      item("CS-80", {
        title: "Release 2.0.0-alpha.1",
        release: "2.0.0-alpha.1",
        needs: ["CS-90", "CS-72"],
        open_needs: ["CS-72"],
      }),
    ],
    milestones: [
      ms("CS-90", ["CS-70"]),
      ms("CS-91", ["CS-71"]),
      ms("CS-92", ["CS-74"]),
    ],
  };

  it("flags a release after the last milestone it needs, not as a bar", () => {
    const m = milestoneMapOf(s, undefined, "steps");
    expect(m.gates).toEqual([{ id: "CS-80", title: "Release 2.0.0-alpha.1" }]);
    // No bar and no lane of its own: the release is a flag.
    expect(m.nodes.find((n) => n.id === "CS-80")).toBeUndefined();
    expect(m.edges.some((e) => e.to === "CS-80")).toBe(false);
    const flag = m.flags.find((f) => f.id === "CS-80")!;
    expect(flag.version).toBe("2.0.0-alpha.1");
    expect(flag.unplaced).toBeUndefined();
    // CS-72, needed directly and in no milestone, waits on CS-91's item,
    // so CS-91 feeds the release too.
    expect(flag.feeds).toEqual(["CS-90", "CS-91"]);
    // Both are in step 1: the flag falls between steps 1 and 2.
    expect(flag.at).toBe(1);
    expect(flag.last).toEqual(["CS-90", "CS-91"]);
    // The release takes no step of its own.
    expect(m.total).toBe(1);
    // Its progress counts the items of what it waits on (CS-70, CS-71) and
    // CS-72, needed directly; CS-80 itself is no project's loose work.
    expect(flag.progress.items).toBe(3);
    const loose = m.nodes.find((n) => n.unshaped);
    expect(Object.values(loose!.counts).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("leaves a release unplaced while its milestones aren't chosen, and those after it", () => {
    const open: WorkSnapshot = {
      ...s,
      items: [
        ...s.items,
        item("CS-81", {
          kind: "decision",
          decider: "owner",
          state: "proposed",
        }),
        item("CS-82", {
          title: "Release 2.0.0-beta.1",
          release: "2.0.0-beta.1",
          needs: ["CS-81"],
          open_needs: ["CS-81"],
        }),
        item("CS-83", {
          title: "Release 2.0.0",
          release: "2.0.0",
          needs: ["CS-82", "CS-92"],
          open_needs: ["CS-82"],
        }),
        item("CS-85", {
          title: "Release 2.0.0-alpha.3",
          release: "2.0.0-alpha.3",
          needs: ["CS-90", "CS-81"],
          open_needs: ["CS-81"],
        }),
        item("CS-84", {
          title: "Release 2.0.0-alpha.2",
          release: "2.0.0-alpha.2",
          needs: [],
          open_needs: [],
        }),
      ],
    };
    const m = milestoneMapOf(open, undefined, "steps");
    const flag = (id: string) => m.flags.find((f) => f.id === id)!;
    expect(flag("CS-82").at).toBeUndefined();
    expect(flag("CS-82").unplaced).toEqual({
      decisions: ["CS-81"],
      releases: [],
    });
    // CS-83 names a milestone, but it needs CS-82, which has no place.
    expect(flag("CS-83").at).toBeUndefined();
    expect(flag("CS-83").unplaced).toEqual({
      decisions: [],
      releases: ["CS-82"],
    });
    // Naming a milestone isn't enough while a decision on it is open.
    expect(flag("CS-85").at).toBeUndefined();
    expect(flag("CS-85").unplaced).toEqual({
      decisions: ["CS-81"],
      releases: [],
    });
    // A release that names nothing has no place either.
    expect(flag("CS-84").unplaced).toEqual({ decisions: [], releases: [] });
    // Placed flags first, then the unplaced ones by number.
    expect(m.flags.map((f) => f.id)).toEqual([
      "CS-80",
      "CS-82",
      "CS-83",
      "CS-84",
      "CS-85",
    ]);
    // Focusing on one with no place sets nothing apart.
    const focused = milestoneMapOf(open, undefined, "steps", "CS-82");
    expect(focused.focus).toBe("CS-82");
    expect(focused.nodes.some((n) => n.lane.startsWith("outside-"))).toBe(
      false,
    );
  });

  it("measures to a release: what it doesn't need moves apart", () => {
    const m = milestoneMapOf(s, undefined, "steps", "CS-80");
    expect(m.focus).toBe("CS-80");
    const lane = (id: string) => m.nodes.find((n) => n.id === id)!.lane;
    expect(lane("CS-92")).toMatch(/^outside-/);
    expect(lane("CS-91")).not.toMatch(/^outside-/);
    expect(lane("CS-90")).not.toMatch(/^outside-/);
  });
});

describe("the items in no milestone (CS-562)", () => {
  const ms = (
    id: string,
    constraints: string[],
    state: WorkMilestone["state"] = "planned",
  ): WorkMilestone => ({
    id,
    title: `Milestone ${id}`,
    kind: "milestone",
    learning: false,
    state,
    project: "CS-2",
    done_when: [],
    constraints: constraints.map((c) => ({ id: c, clause: "c?" })),
    contributions: [],
    check_results: [],
    path: `m/${id}`,
    progress: { done: 0, total: constraints.length },
    check_due: false,
    to_shape: [],
  });
  const s: WorkSnapshot = withoutDropped({
    ...snapshot,
    items: [
      // In a milestone: not listed.
      item("CS-70", { milestones: ["CS-90"] }),
      // In a proposed milestone only: still named by one.
      item("CS-71", { state: "proposed", milestones: ["CS-91"] }),
      // Named only by a dropped milestone, or a long outcome: no milestone.
      item("CS-72", { milestones: ["CS-92"] }),
      item("CS-73", { state: "proposed", milestones: ["CS-1"] }),
      // In no milestone, of each kind and state.
      item("CS-74", { state: "proposed" }),
      item("CS-75", { kind: "decision", decider: "owner" }),
      item("CS-76", { kind: "external", waiting_on: "1.x" }),
      item("CS-77", { release: "2.0.0", needs: ["CS-90"] }),
      item("CS-78", { state: "in-progress", claimed_by: "s1" }),
      item("CS-79", { project: "CS-3" }),
      // Closed: never listed.
      item("CS-80", { state: "done" }),
      item("CS-81", { state: "dropped" }),
    ],
    milestones: [
      ms("CS-90", ["CS-70"]),
      ms("CS-91", ["CS-71"], "proposed"),
      ms("CS-92", ["CS-72"], "dropped"),
    ],
  });
  const ids = (list: readonly WorkItem[]) => list.map((it) => it.id);

  it("lists the open items no milestone names, in progress first, then planned, then proposed", () => {
    expect(ids(noMilestoneOf(s, s.items))).toEqual([
      "CS-78",
      "CS-72",
      "CS-75",
      "CS-76",
      "CS-77",
      "CS-79",
      "CS-73",
      "CS-74",
    ]);
  });

  it("keeps to the scope's items", () => {
    expect(
      ids(
        noMilestoneOf(
          s,
          s.items.filter((it) => it.project === "CS-3"),
        ),
      ),
    ).toEqual(["CS-79"]);
  });

  it("counts a claim on another branch as in progress", () => {
    const flight = inFlightOf({
      ...s,
      elsewhere: [
        { id: "CS-74", claimed_by: "s2", where: "ui", worktree: true },
      ],
    });
    const all = noMilestoneOf(s, s.items, flight);
    expect(ids(all).slice(0, 2)).toEqual(["CS-74", "CS-78"]);
    expect(ids(filterLoose(all, { states: ["proposed"] }, flight))).toEqual([
      "CS-73",
    ]);
  });

  it("filters by kind, a release apart from work, and by state", () => {
    const all = noMilestoneOf(s, s.items);
    expect(ids(filterLoose(all, {}))).toEqual(ids(all));
    expect(ids(filterLoose(all, { kinds: ["release"] }))).toEqual(["CS-77"]);
    expect(ids(filterLoose(all, { kinds: ["work"] }))).toEqual([
      "CS-78",
      "CS-72",
      "CS-79",
      "CS-73",
      "CS-74",
    ]);
    // Leaving proposals and releases out: what should find a milestone.
    expect(
      ids(
        filterLoose(all, {
          kinds: ["work", "decision", "external"],
          states: ["planned", "in-progress"],
        }),
      ),
    ).toEqual(["CS-78", "CS-72", "CS-75", "CS-76", "CS-79"]);
  });

  it("counts each choice under the other filter", () => {
    const all = noMilestoneOf(s, s.items);
    expect(looseCounts(all, {})).toEqual({
      kinds: { work: 5, release: 1, decision: 1, external: 1 },
      states: { proposed: 2, planned: 5, "in-progress": 1 },
    });
    expect(
      looseCounts(all, { kinds: ["decision"], states: ["proposed"] }),
    ).toEqual({
      kinds: { work: 2, release: 0, decision: 0, external: 0 },
      states: { proposed: 0, planned: 1, "in-progress": 0 },
    });
  });
});

describe("proposed milestones on the roadmap (CS-563)", () => {
  const ms = (
    id: string,
    constraints: string[],
    state: WorkMilestone["state"] = "planned",
  ): WorkMilestone => ({
    id,
    title: `Milestone ${id}`,
    kind: "milestone",
    learning: false,
    state,
    project: "CS-2",
    done_when: [],
    constraints: constraints.map((c) => ({ id: c, clause: "c?" })),
    contributions: [],
    check_results: [],
    path: `m/${id}`,
    progress: { done: 0, total: constraints.length },
    check_due: false,
    to_shape: [],
  });
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-110"),
      item("CS-111", { needs: ["CS-110"], open_needs: ["CS-110"] }),
      item("CS-112", { state: "done" }),
      item("CS-120", {
        title: "Release 2.0.0-alpha.1",
        release: "2.0.0-alpha.1",
        needs: ["CS-100", "CS-101"],
        open_needs: [],
      }),
      item("CS-121", {
        title: "Release 2.0.0-alpha.2",
        release: "2.0.0-alpha.2",
        state: "proposed",
        needs: ["CS-100"],
        open_needs: [],
      }),
    ],
    milestones: [
      ms("CS-100", ["CS-110"]),
      ms("CS-101", ["CS-111", "CS-112"], "proposed"),
    ],
  };

  it("leaves proposed milestones out by default, and shows them when asked", () => {
    const off = milestoneMapOf(s, undefined, "steps");
    expect(off.nodes.map((n) => n.id).sort()).toEqual([
      "CS-100",
      "unshaped-CS-2",
    ]);
    // CS-111 is held only by a proposed milestone: off, it is loose work.
    expect(off.nodes.find((n) => n.unshaped)!.proposed).toBe(false);
    const on = milestoneMapOf(s, undefined, "steps", undefined, true);
    expect(on.nodes.map((n) => [n.id, n.proposed]).sort()).toEqual([
      ["CS-100", false],
      ["CS-101", true],
    ]);
    // Placed by its waits, as a committed one is: after CS-100.
    const at = (m: typeof on, id: string) =>
      m.nodes.find((n) => n.id === id)!.x0;
    expect(at(on, "CS-101")).toBe(1);
    expect(at(on, "CS-100")).toBe(at(off, "CS-100"));
    expect(on.nodes.find((n) => n.id === "CS-101")!.after).toEqual(["CS-100"]);
  });

  it("lists them in the roadmap's list only when asked", () => {
    const ids = (proposals: boolean) =>
      milestoneRoadmapOf(s, s.items, undefined, proposals).map((r) => r.id);
    expect(ids(false)).not.toContain("CS-101");
    expect(ids(false)).not.toContain("CS-121");
    expect(ids(true)).toContain("CS-101");
    expect(ids(true)).toContain("CS-121");
  });

  it("flags proposed releases only when asked, and places releases after proposed milestones then", () => {
    const off = milestoneMapOf(s, undefined, "steps");
    expect(off.flags.map((f) => f.id)).toEqual(["CS-120"]);
    expect(off.flags[0]!.feeds).not.toContain("CS-101");
    const on = milestoneMapOf(s, undefined, "steps", undefined, true);
    const flag = (id: string) => on.flags.find((f) => f.id === id)!;
    expect(flag("CS-120").feeds).toEqual(["CS-100", "CS-101"]);
    expect(flag("CS-120").last).toEqual(["CS-101"]);
    expect(flag("CS-120").at).toBe(2);
    expect(flag("CS-120").proposed).toBeUndefined();
    expect(flag("CS-121").proposed).toBe(true);
    expect(flag("CS-121").at).toBe(1);
  });

  it("draws a proposed milestone's bar all gray, and a committed one's as it is", () => {
    const counts = {
      Proposed: 1,
      Waiting: 2,
      Ready: 0,
      "In flight": 1,
      Done: 3,
    };
    expect(barCounts(counts, true)).toEqual({
      Proposed: 7,
      Waiting: 0,
      Ready: 0,
      "In flight": 0,
      Done: 0,
    });
    expect(barCounts(counts, false)).toBe(counts);
  });

  it("keeps the snapshot as it is when nothing is proposed", () => {
    const committed = committedOnly(s);
    expect(committed.milestones.map((m) => m.id)).toEqual(["CS-100"]);
    expect(committedOnly(committed)).toBe(committed);
  });
});
