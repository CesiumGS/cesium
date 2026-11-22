import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  agoText,
  liveBoxOf,
  queueText,
  bandStepsOf,
  barCounts,
  boardStatus,
  NO_RELEASE,
  releaseBandsOf,
  releaseClosuresOf,
  releaseLadderOf,
  cardDetail,
  clampZoom,
  fitZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAbout,
  zoomStep,
  committedOnly,
  filterItems,
  filterLoose,
  looseCounts,
  noMilestoneOf,
  clampSlots,
  planOf,
  planSlackOf,
  cardBlockersOf,
  segmentLabel,
  slipText,
  stageWords,
  workCardOf,
  changeText,
  dayKey,
  flowDayOf,
  flowOf,
  moveLabel,
  inFlightOf,
  kindsOf,
  milestoneMapOf,
  milestoneRoadmapOf,
  nextActor,
  ownerQueue,
  byProject,
  possessive,
  proposalHeaderOf,
  proposalsOf,
  releasesGatedBy,
  stageOf,
  unblocksOf,
  waitingOnOwner,
  withoutDropped,
  workInProgress,
  type WorkItem,
  type WorkLive,
  type WorkMilestone,
  type WorkSnapshot,
} from "../bench/suite/work.ts";
import {
  API_VERSION,
  HitldUnavailable,
  LIVE_UNREAD,
  checkVersion,
  elsewhereOf,
  hitldPath,
  queryWork,
  queueOf,
  readLive,
  showItem,
  stateHistory,
  unmergedOf,
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

  it("carries a proposal's text, for its header, and no one else's", () => {
    const withText = [...s.items, ...s.milestones].filter((e) => e.text);
    expect(withText.length).toBeGreaterThan(0);
    expect(withText.every((e) => e.state === "proposed")).toBe(true);
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

describe("a day of the flow chart, in its hover card (CS-698)", () => {
  const day = (d: number, h = 12) =>
    new Date(2026, 10, 13 + d, h).toISOString();
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-1", { state: "done", ready: false, needed_by: ["CS-2"] }),
      item("CS-2", { needs: ["CS-1"] }),
      item("CS-3", { state: "done", ready: false }),
      item("CS-4", { state: "proposed", ready: false }),
      item("CS-5", { state: "in-progress", ready: false }),
      item("CS-6", { state: "in-progress", ready: false }),
    ],
    history: [
      // The import: CS-2 waits on CS-1; the rest are ready.
      ...["CS-1", "CS-2", "CS-3", "CS-5", "CS-6"].map((id) => ({
        id,
        at: day(0, 9),
        state: "planned" as const,
      })),
      // The next day CS-1 finishes (freeing CS-2), three start, CS-4 is made.
      { id: "CS-1", at: day(1, 10), state: "done" },
      { id: "CS-3", at: day(1, 11), state: "in-progress" },
      { id: "CS-5", at: day(1, 11), state: "in-progress" },
      { id: "CS-6", at: day(1, 11), state: "in-progress" },
      { id: "CS-4", at: day(1, 12), state: "proposed" },
      // Nothing the day after; CS-3 finishes today.
      { id: "CS-3", at: day(3, 10), state: "done" },
    ],
  };
  const flow = flowOf(s, s.items, {
    now: new Date(2026, 10, 16, 18).getTime(),
  });
  const counts = (i: number) =>
    Object.fromEntries(flowDayOf(flow, i).rows.map((r) => [r.st, r.count]));
  const changes = (i: number) =>
    Object.fromEntries(flowDayOf(flow, i).rows.map((r) => [r.st, r.change]));

  it("reads each stage's count in the chart's order, top band first", () => {
    expect(flow.days).toHaveLength(4);
    const d = flowDayOf(flow, 1);
    expect(d.rows.map((r) => r.st)).toEqual([
      "Proposed",
      "Waiting",
      "Ready",
      "In flight",
      "Done",
    ]);
    expect(counts(1)).toEqual({
      Proposed: 1,
      Waiting: 0,
      Ready: 1,
      "In flight": 3,
      Done: 1,
    });
    expect(d.total).toBe(6);
  });

  it("gives each stage's change from the day before, and the total's", () => {
    const d = flowDayOf(flow, 1);
    expect(changes(1)).toEqual({
      Proposed: 1,
      Waiting: -1,
      Ready: -3,
      "In flight": 3,
      Done: 1,
    });
    expect(d.totalChange).toBe(1); // CS-4 is new
    // The largest by size, either sign.
    expect(d.rows.filter((r) => r.largest).map((r) => r.st)).toEqual([
      "Ready",
      "In flight",
    ]);
    expect(changes(3)).toMatchObject({ "In flight": -1, Done: 1 });
  });

  it("has no changes on the first day: there is no day before", () => {
    const d = flowDayOf(flow, 0);
    expect(d.first).toBe(true);
    expect(d.rows.every((r) => r.change === undefined && !r.largest)).toBe(
      true,
    );
    expect(d.totalChange).toBeUndefined();
    expect(d.groups).toEqual([]);
    expect(counts(0)).toMatchObject({ Waiting: 1, Ready: 4 });
  });

  it("reads a day with no change as zeros, none of them largest, nothing moved", () => {
    const d = flowDayOf(flow, 2);
    expect(d.rows.every((r) => r.change === 0 && !r.largest)).toBe(true);
    expect(d.totalChange).toBe(0);
    expect(d.groups).toEqual([]);
    expect(d.moved).toBe(0);
  });

  it("says what moved: finishes first, then the largest groups", () => {
    const d = flowDayOf(flow, 1);
    expect(d.groups.map((g) => [g.label, g.ids])).toEqual([
      ["Finished", ["CS-1"]],
      ["Ready → In progress", ["CS-3", "CS-5", "CS-6"]],
      ["New → Proposed", ["CS-4"]],
      ["Blocked → Ready", ["CS-2"]],
    ]);
    expect(d.moved).toBe(6);
    expect(flowDayOf(flow, 3).groups.map((g) => g.label)).toEqual(["Finished"]);
    expect(flowDayOf(flow, 3).today).toBe(true);
  });

  it("matches each stage's change with what entered it less what left", () => {
    for (let i = 1; i < flow.days.length; i++) {
      const d = flowDayOf(flow, i);
      const moves = flow.moves[i]!;
      for (const r of d.rows) {
        const into = moves.filter((m) => m.to === r.st).length;
        const out = moves.filter((m) => m.from === r.st).length;
        expect(r.change).toBe(into - out);
      }
      expect(d.groups.reduce((n, g) => n + g.ids.length, 0)).toBe(moves.length);
    }
  });

  it("puts every finish in one group, whatever stage it left", () => {
    const s2: WorkSnapshot = {
      ...s,
      items: [...s.items, item("CS-7", { state: "done", ready: false })],
      history: [
        ...s.history!,
        // In progress from the first day, so it finishes from another stage.
        { id: "CS-7", at: day(0, 9), state: "planned" },
        { id: "CS-7", at: day(0, 10), state: "in-progress" },
        { id: "CS-7", at: day(1, 10), state: "done" },
      ],
    };
    const d = flowDayOf(
      flowOf(s2, s2.items, { now: new Date(2026, 10, 16, 18).getTime() }),
      1,
    );
    expect(d.groups[0]).toMatchObject({
      label: "Finished",
      ids: ["CS-1", "CS-7"],
    });
    expect(d.groups[0]!.from).toBeUndefined();
    expect(d.groups.filter((g) => g.label === "Finished")).toHaveLength(1);
  });

  it("names moves and changes plainly", () => {
    expect(moveLabel("In flight", "Done")).toBe("Finished");
    expect(moveLabel(undefined, "Done")).toBe("New → Done");
    expect(moveLabel("Ready", undefined)).toBe("Ready → Dropped");
    expect(changeText(3)).toBe("+3");
    expect(changeText(-2)).toBe("\u22122");
    expect(changeText(0)).toBe("0");
    expect(dayKey(flow.days[1]!)).toBe("2026-11-14");
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

  it("leaves out proposals and outside waits no milestone holds", () => {
    const ids = (m: ReturnType<typeof milestoneMapOf>) =>
      m.nodes.map((n) => n.id).sort();
    const committed = milestoneMapOf(s, undefined, "steps");
    // CS-31, a decision of the owner's in no milestone, is a card (CS-683).
    expect(ids(committed)).toEqual([
      "CS-31",
      "CS-50",
      "CS-51",
      "unshaped-CS-2",
    ]);
    const loose = committed.nodes.find((n) => n.unshaped)!;
    // Only CS-33: CS-30 is proposed, CS-31 and CS-32 aren't work.
    expect(Object.values(loose.counts).reduce((a, b) => a + b, 0)).toBe(1);
    expect(loose.items).toEqual(["CS-33"]);
    expect(loose.decision).toBe(false);
  });

  it("draws your decisions in no milestone with their question and what waits (CS-683)", () => {
    const waits: WorkSnapshot = {
      ...s,
      items: [
        ...s.items.map((it) =>
          it.id === "CS-31"
            ? {
                ...it,
                title: "Which way should it go?",
                needed_by: ["CS-33", "CS-20"],
              }
            : it.id === "CS-20" || it.id === "CS-33"
              ? { ...it, needs: ["CS-31"], open_needs: ["CS-31"] }
              : it,
        ),
        // Waited on more, so named first among the project's loose items.
        item("CS-35", { needed_by: ["CS-20"] }),
        // Proposed, and in no project: neither is a card.
        item("CS-36", {
          kind: "decision",
          decider: "owner",
          state: "proposed",
        }),
        item("CS-37", {
          kind: "decision",
          decider: "owner",
          project: undefined,
        }),
      ],
    };
    const m = milestoneMapOf(waits, undefined, "steps");
    const d = m.nodes.find((n) => n.id === "CS-31")!;
    expect(d).toMatchObject({
      decision: true,
      unshaped: false,
      title: "Which way should it go?",
      lane: "CS-2",
      items: ["CS-20", "CS-33"],
      x0: 0,
    });
    expect(m.nodes.some((n) => n.id === "CS-36" || n.id === "CS-37")).toBe(
      false,
    );
    // Its wait to CS-50, whose CS-20 needs it, is soft: it moves nothing.
    expect(
      m.edges.find((e) => e.from === "CS-31" && e.to === "CS-50"),
    ).toMatchObject({ soft: true, items: ["CS-20"] });
    expect(m.nodes.find((n) => n.id === "CS-50")!.x0).toBe(0);
    expect(m.nodes.find((n) => n.unshaped)!.items).toEqual(["CS-35", "CS-33"]);
    // A milestone names nothing on its card; its items are in the pane.
    expect(m.nodes.find((n) => n.id === "CS-50")!.items).toEqual([]);
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
      "CS-31",
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

describe("the proposals (CS-688)", () => {
  const HEADER =
    "**Proposal** (CS-686). Source: the CS-563 executor's report, run 2026-11-18-2, 2026-11-18. Why now: the layout shows no milestones (`shape=graph`). It predates the run. Rough size: small to medium. Decider: the owner. Filed: 2026-11-18.";
  const DONE_WHEN = "## Done when\n\n- It works.";
  const ms = (
    id: string,
    over: Partial<WorkMilestone> = {},
  ): WorkMilestone => ({
    id,
    title: `Milestone ${id}`,
    kind: "milestone",
    learning: false,
    state: "proposed",
    project: "CS-2",
    done_when: [],
    constraints: [],
    contributions: [],
    check_results: [],
    path: `m/${id}`,
    progress: { done: 0, total: 0 },
    check_due: false,
    to_shape: [],
    ...over,
  });
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-20"),
      item("CS-21", { kind: "decision", decider: "owner" }),
      // Ready: a header and a "Done when", nothing open before the commit.
      item("CS-22", {
        state: "proposed",
        text: `${HEADER}\n\n${DONE_WHEN}`,
      }),
      // Being shaped: a decision comes first; its other need is the start's.
      item("CS-23", {
        state: "proposed",
        text: HEADER,
        needs: ["CS-21", "CS-20"],
        open_needs: ["CS-21", "CS-20"],
      }),
      // Later: no header; planned work needs it.
      item("CS-24", {
        state: "proposed",
        text: `Kept from the design's list.\n\n${DONE_WHEN}`,
        needs: ["CS-20"],
        open_needs: ["CS-20"],
      }),
      // To discuss: a header, no "Done when" yet.
      item("CS-25", {
        state: "proposed",
        text: HEADER.replace("2026-11-18.", "2026-11-17."),
      }),
      item("CS-26", { state: "proposed" }),
      item("CS-27", {
        needs: ["CS-24"],
        open_needs: ["CS-24"],
        ready: false,
      }),
      item("CS-30", { state: "proposed", project: "CS-3" }),
      item("CS-31", { state: "done", project: "CS-3" }),
    ],
    milestones: [
      // A proposed milestone: every constraint, whatever its state.
      ms("CS-40", {
        constraints: [
          { id: "CS-26", clause: "c1" },
          { id: "CS-20", clause: "c1" },
          { id: "CS-31", clause: "c2" },
        ],
      }),
      // A committed milestone that names a proposal.
      ms("CS-41", {
        state: "planned",
        constraints: [{ id: "CS-30", clause: "c1" }],
      }),
      // A proposed milestone waiting on a study.
      ms("CS-42", { constraints: [{ id: "CS-43", clause: "c1" }] }),
      ms("CS-43", { state: "planned", learning: true }),
    ],
  };
  const all = proposalsOf(s, s.items, s.milestones, new Map([["CS-26", 3]]));
  const of = (id: string) => all.find((p) => p.id === id)!;

  it("reads a proposal's header from its text, field by field", () => {
    expect(proposalHeaderOf(HEADER)).toEqual({
      source: "the CS-563 executor's report, run 2026-11-18-2, 2026-11-18",
      why: "the layout shows no milestones (`shape=graph`). It predates the run",
      size: "small to medium",
      decider: "the owner",
      date: "2026-11-18",
    });
    expect(
      proposalHeaderOf(`An item.\n\n${HEADER}\n\n${DONE_WHEN}`)?.size,
    ).toBe("small to medium");
    // A header that leaves fields out has only the ones it gives.
    expect(proposalHeaderOf("**Proposal**. Source: a review.")).toEqual({
      source: "a review",
    });
    expect(proposalHeaderOf("Source: not a header.")).toBeUndefined();
    expect(proposalHeaderOf(undefined)).toBeUndefined();
  });

  it("orders proposals: milestones first, then the most waited on, then by ID", () => {
    expect(all.map((p) => p.id)).toEqual([
      "CS-40",
      "CS-42",
      "CS-26",
      "CS-22",
      "CS-23",
      "CS-24",
      "CS-25",
      "CS-30",
    ]);
  });

  it("says what a commit needs, apart from what the start waits for", () => {
    expect(of("CS-23")).toMatchObject({
      decider: "the owner",
      first: ["CS-21"],
      startsAfter: ["CS-20"],
    });
    // Planned work it needs holds back its start, never its commit.
    expect(of("CS-24")).toMatchObject({ first: [], startsAfter: ["CS-20"] });
    // A study among a milestone's constraints comes before its commit.
    expect(of("CS-42").first).toEqual(["CS-43"]);
    expect(of("CS-40")).toMatchObject({ first: [], startsAfter: [] });
    expect(possessive(of("CS-23").decider)).toBe("the owner's");
    expect(possessive("Ines")).toBe("Ines'");
  });

  it("names the committed work that needs a proposal: the alert lane", () => {
    expect(
      all.filter((p) => p.neededBy.length).map((p) => [p.id, p.neededBy]),
    ).toEqual([
      ["CS-24", ["CS-27"]],
      ["CS-30", ["CS-41"]],
    ]);
  });

  it("keeps to the items and milestones it is given", () => {
    const some = proposalsOf(
      s,
      s.items.filter((it) => it.project === "CS-3"),
      [],
    );
    expect(some.map((p) => p.id)).toEqual(["CS-30"]);
    expect(byProject(s, all).map((g) => g.project?.id)).toEqual([
      "CS-2",
      "CS-3",
    ]);
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
    // It lists only the milestone it names (CS-685). CS-72, needed
    // directly and in no milestone, waits on CS-91's item: that places
    // it, but CS-91 isn't one of its milestones.
    expect(flag.feeds).toEqual(["CS-90"]);
    // Both are in step 1: the flag falls between steps 1 and 2.
    expect(flag.at).toBe(1);
    expect(flag.last).toEqual(["CS-90", "CS-91"]);
    // The release takes no step of its own.
    expect(m.total).toBe(1);
    // Its progress counts the items of the milestone it names (CS-70) and
    // CS-72, needed directly; CS-80 itself is no project's loose work.
    expect(flag.progress.items).toBe(2);
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

describe("the closure rule and release bands (CS-685)", () => {
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
  const needs = (...ids: string[]) => ({ needs: ids, open_needs: ids });
  // alpha.1 (CS-401) needs CS-300; beta.1 (CS-400, a lower number) needs
  // alpha.1, CS-310, CS-311 and an item, CS-214, itself. CS-320 is in no
  // release.
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-200", needs("CS-212")),
      item("CS-201", needs("CS-210")),
      item("CS-210"),
      item("CS-211"),
      item("CS-212", needs("CS-220")),
      item("CS-213", needs("CS-200")),
      item("CS-214"),
      item("CS-216", { state: "done" }),
      item("CS-220"),
      item("CS-401", {
        title: "Release 2.0.0-alpha.1",
        release: "2.0.0-alpha.1",
        ...needs("CS-300"),
      }),
      item("CS-400", {
        title: "Release 2.0.0-beta.1",
        release: "2.0.0-beta.1",
        ...needs("CS-401", "CS-310", "CS-311", "CS-214"),
      }),
    ],
    milestones: [
      ms("CS-300", ["CS-200", "CS-201"]),
      ms("CS-310", ["CS-210", "CS-211"]),
      // A milestone that names another milestone: CS-320.
      ms("CS-311", ["CS-213", "CS-320"]),
      ms("CS-320", ["CS-220", "CS-216"]),
    ],
  };

  it("orders the releases by what they need, not by number", () => {
    expect(releaseLadderOf(s).map((r) => r.id)).toEqual(["CS-401", "CS-400"]);
  });

  it("finds each item a release pulls in from a milestone it doesn't need, with the path", () => {
    const [alpha, beta] = releaseClosuresOf(s);
    expect(alpha!.milestones).toEqual(["CS-300"]);
    expect([...alpha!.closure]).toEqual(["CS-300"]);
    expect(alpha!.violations).toEqual([
      {
        release: "CS-401",
        item: "CS-210",
        kind: "item",
        milestones: ["CS-310"],
        path: ["CS-401", "CS-300", "CS-201", "CS-210"],
      },
      // Through CS-212, which no milestone holds: that is allowed, but
      // what it needs counts.
      {
        release: "CS-401",
        item: "CS-220",
        kind: "item",
        milestones: ["CS-320"],
        path: ["CS-401", "CS-300", "CS-200", "CS-212", "CS-220"],
      },
    ]);
    // beta.1 needs alpha.1's milestones too: CS-213 may need CS-200.
    expect([...beta!.closure].sort()).toEqual(["CS-300", "CS-310", "CS-311"]);
    expect(beta!.after).toEqual(["CS-401"]);
    expect(beta!.violations.map((v) => [v.kind, v.item, v.path])).toEqual([
      // A release needs milestones only.
      ["direct", "CS-214", ["CS-400", "CS-214"]],
      // A milestone it needs names one it doesn't.
      ["milestone", "CS-320", ["CS-400", "CS-311", "CS-320"]],
      [
        "item",
        "CS-220",
        ["CS-400", "CS-311", "CS-213", "CS-200", "CS-212", "CS-220"],
      ],
    ]);
  });

  it("finds nothing once the tracker is fixed, and ignores done work", () => {
    const fixed: WorkSnapshot = {
      ...s,
      items: s.items.map((it) =>
        it.id === "CS-201" || it.id === "CS-212"
          ? { ...it, needs: [], open_needs: [] }
          : it.id === "CS-400"
            ? { ...it, ...needs("CS-401", "CS-310", "CS-311") }
            : it,
      ),
      milestones: s.milestones.map((m) =>
        m.id === "CS-311" ? ms("CS-311", ["CS-213", "CS-216"]) : m,
      ),
    };
    expect(releaseClosuresOf(fixed).flatMap((c) => c.violations)).toEqual([]);
  });

  it("puts each milestone in the band of the earliest release that needs it", () => {
    const { bands, bandOf } = releaseBandsOf(s, releaseClosuresOf(s));
    expect(bands.map((b) => [b.id, b.name, b.milestones])).toEqual([
      ["CS-401", "2.0.0-alpha.1", ["CS-300"]],
      ["CS-400", "2.0.0-beta.1", ["CS-310", "CS-311"]],
      [NO_RELEASE, "No release", ["CS-320"]],
    ]);
    expect(bandOf.get("CS-320")).toBe(2);
  });

  it("counts steps inside a band only", () => {
    const rows = milestoneRoadmapOf(s, s.items);
    const { bandOf } = releaseBandsOf(s, releaseClosuresOf(s));
    const steps = bandStepsOf(rows, bandOf);
    // By steps alone, CS-300 waits on CS-310 and CS-311 on CS-300.
    const step = new Map(rows.map((r) => [r.id, r.step]));
    expect([
      step.get("CS-310"),
      step.get("CS-300"),
      step.get("CS-311"),
    ]).toEqual([1, 2, 3]);
    // In bands, each waits only on its own band: all three start their band.
    expect([
      steps.get("CS-300"),
      steps.get("CS-310"),
      steps.get("CS-311"),
    ]).toEqual([1, 1, 1]);
  });

  it("lists exactly the milestones a release names on its flag", () => {
    const m = milestoneMapOf(s, undefined, "steps");
    const flag = (id: string) => m.flags.find((f) => f.id === id)!;
    expect(flag("CS-401").feeds).toEqual(["CS-300"]);
    expect(flag("CS-400").feeds).toEqual(["CS-310", "CS-311"]);
    expect(flag("CS-400").after).toEqual(["CS-401"]);
  });

  it("lays the map out in bands, each release's flag closing its band", () => {
    const m = milestoneMapOf(
      s,
      undefined,
      "steps",
      undefined,
      false,
      "release",
    );
    expect(m.arrange).toBe("release");
    expect(m.bands.map((b) => [b.name, b.x0, b.x1])).toEqual([
      ["2.0.0-alpha.1", 0, 1],
      ["2.0.0-beta.1", 1, 2],
      ["No release", 2, 3],
    ]);
    const x0 = (id: string) => m.nodes.find((n) => n.id === id)!.x0;
    expect([x0("CS-300"), x0("CS-310"), x0("CS-311"), x0("CS-320")]).toEqual([
      0, 1, 1, 2,
    ]);
    const flag = (id: string) => m.flags.find((f) => f.id === id)!;
    expect([flag("CS-401").at, flag("CS-400").at]).toEqual([1, 2]);
    expect(flag("CS-400").last).toEqual(["CS-310", "CS-311"]);
    // The critical path runs on across the bands, through each release.
    expect(m.path).toEqual(["CS-300", "CS-310", "CS-320"]);
    expect(m.total).toBe(3);
    // The loose card sits in the band of the milestone it feeds.
    const loose = m.nodes.find((n) => n.unshaped)!;
    expect([loose.band, loose.x0]).toEqual([0, 0]);
    // By steps alone, the same map has no bands.
    expect(milestoneMapOf(s, undefined, "steps").bands).toEqual([]);
  });

  it("measures to a release in bands over its closure", () => {
    const m = milestoneMapOf(s, undefined, "steps", "CS-400", false, "release");
    expect(m.end).toBe(2);
    const lane = (id: string) => m.nodes.find((n) => n.id === id)!.lane;
    expect(lane("CS-300")).toBe("CS-2");
    expect(lane("CS-311")).toBe("CS-2");
    expect(lane("CS-320")).toBe("outside-CS-2");
  });
});

describe("the Plan view's sequence (CS-692)", () => {
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
  const needs = (...ids: string[]) => ({ needs: ids, open_needs: ids });
  // alpha.1 (CS-501) needs CS-600; beta.1 (CS-502) needs alpha.1 and
  // CS-610; CS-620 is in no release. CS-120 is in no milestone, but
  // alpha.1's CS-101 needs it, so it is worked in alpha.1's band. CS-111
  // waits on the owner's decision CS-140, which takes no slot.
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-100", { milestones: ["CS-600"] }),
      item("CS-101", { milestones: ["CS-600"], ...needs("CS-100", "CS-120") }),
      item("CS-102", { milestones: ["CS-600"] }),
      item("CS-110", { milestones: ["CS-610"] }),
      item("CS-111", { milestones: ["CS-610"], ...needs("CS-110", "CS-140") }),
      item("CS-120"),
      item("CS-130", { milestones: ["CS-620"], ...needs("CS-102") }),
      item("CS-140", { kind: "decision", decider: "owner" }),
      item("CS-150", { state: "done", milestones: ["CS-600"] }),
      item("CS-501", {
        title: "Release 2.0.0-alpha.1",
        release: "2.0.0-alpha.1",
        ...needs("CS-600"),
      }),
      item("CS-502", {
        title: "Release 2.0.0-beta.1",
        release: "2.0.0-beta.1",
        ...needs("CS-501", "CS-610"),
      }),
    ],
    milestones: [
      ms("CS-600", ["CS-100", "CS-101", "CS-102", "CS-150"]),
      ms("CS-610", ["CS-110", "CS-111"]),
      ms("CS-620", ["CS-130"]),
    ],
  };
  const span = (p: ReturnType<typeof planOf>, id: string) => {
    const it = p.items.get(id)!;
    return [it.start, it.finish];
  };

  it("works the items in the planner's order, one slot, a release band at a time", () => {
    const p = planOf(s);
    expect(p.unit).toBe("items");
    expect(p.slots).toBe(1);
    // Decisions, release items and done work take no slot.
    expect(p.order).toEqual([
      "CS-100",
      "CS-102",
      "CS-120",
      "CS-101",
      "CS-110",
      "CS-111",
      "CS-130",
    ]);
    expect(span(p, "CS-101")).toEqual([3, 4]);
    expect(span(p, "CS-130")).toEqual([6, 7]);
    expect(p.total).toBe(7);
    // CS-120 is in no milestone; alpha.1's work needs it.
    expect(p.items.get("CS-120")!.band).toBe(0);
    expect(p.items.get("CS-111")!.held).toEqual(["CS-140"]);
    expect(p.defaulted).toBe(7);
  });

  it("fills several slots, each item starting once what it needs is finished", () => {
    const p = planOf(s, { slots: 2 });
    expect(p.slots).toBe(2);
    expect(span(p, "CS-100")).toEqual([0, 1]);
    expect(span(p, "CS-102")).toEqual([0, 1]);
    // CS-101 waits for CS-120, so beta.1's CS-110 takes the free slot.
    expect(span(p, "CS-120")).toEqual([1, 2]);
    expect(span(p, "CS-110")).toEqual([1, 2]);
    expect(span(p, "CS-101")).toEqual([2, 3]);
    expect(span(p, "CS-111")).toEqual([2, 3]);
    expect(span(p, "CS-130")).toEqual([3, 4]);
    expect(new Set([...p.items.values()].map((i) => i.slot))).toEqual(
      new Set([0, 1]),
    );
    expect(p.total).toBe(4);
    expect(clampSlots("0")).toBe(1);
    expect(clampSlots("3")).toBe(3);
    expect(clampSlots(99)).toBe(8);
    expect(clampSlots("x")).toBe(1);
  });

  it("groups the rows by release, a milestone spanning its items", () => {
    const p = planOf(s);
    expect(
      p.bands.map((b) => [b.name, b.milestones, b.loose, b.start, b.finish]),
    ).toEqual([
      ["2.0.0-alpha.1", ["CS-600"], ["CS-120"], 0, 4],
      ["2.0.0-beta.1", ["CS-610"], [], 4, 6],
      ["No release", ["CS-620"], [], 6, 7],
    ]);
    const m = p.milestones.get("CS-600")!;
    expect([m.start, m.finish, m.items]).toEqual([
      0,
      4,
      ["CS-100", "CS-102", "CS-101"],
    ]);
  });

  it("marks each release where its last needed item finishes, with the chain that sets it", () => {
    const [alpha, beta] = planOf(s).releases;
    expect([alpha!.version, alpha!.at, alpha!.last]).toEqual([
      "2.0.0-alpha.1",
      4,
      "CS-101",
    ]);
    // CS-101 waits on CS-120, which finished last of its needs.
    expect(alpha!.chain).toEqual(["CS-120", "CS-101"]);
    expect(alpha!.chainSize).toBe(2);
    // beta.1 needs alpha.1's work too.
    expect(beta!.needed).toContain("CS-100");
    expect([beta!.at, beta!.chain]).toEqual([6, ["CS-110", "CS-111"]]);
    const two = planOf(s, { slots: 2 }).releases;
    expect(two.map((r) => r.at)).toEqual([3, 3]);
  });

  it("puts work in progress first", () => {
    const p = planOf({
      ...s,
      items: s.items.map((it) =>
        it.id === "CS-110" ? { ...it, state: "in-progress" as const } : it,
      ),
    });
    // beta.1's CS-110 is under way, so it goes before alpha.1's work.
    expect(span(p, "CS-110")).toEqual([0, 1]);
    expect(span(p, "CS-100")).toEqual([1, 2]);
  });

  it("goes across in tokens once items carry estimates, the rest at the median", () => {
    const p = planOf({
      ...s,
      items: s.items.map((it) =>
        it.id === "CS-100"
          ? { ...it, estimate_tokens: 100 }
          : it.id === "CS-102"
            ? { ...it, estimate_tokens: 300 }
            : it,
      ),
    });
    expect([p.unit, p.defaultSize, p.defaulted]).toEqual(["tokens", 200, 5]);
    expect(p.items.get("CS-100")).toMatchObject({ size: 100, sized: true });
    expect(p.items.get("CS-110")).toMatchObject({ size: 200, sized: false });
    // The smaller estimate goes first among equals.
    expect(p.order.slice(0, 2)).toEqual(["CS-100", "CS-120"]);
  });

  it("still covers a loop of needs, flagging where it broke in", () => {
    const p = planOf({
      ...s,
      items: [item("CS-700", needs("CS-701")), item("CS-701", needs("CS-700"))],
      milestones: [],
    });
    expect(p.order).toEqual(["CS-700", "CS-701"]);
    expect(p.items.get("CS-700")!.loop).toBe(true);
    expect(p.items.get("CS-701")!.loop).toBeUndefined();
  });
});

describe("the shared hover card (CS-696)", () => {
  // The Plan view's fixture, again: alpha.1 (CS-501) needs CS-600's
  // items and CS-120; beta.1 (CS-502) needs alpha.1 and CS-610; CS-111
  // waits on CS-110 and the owner's decision CS-140.
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
  const needs = (...ids: string[]) => ({ needs: ids, open_needs: ids });
  const s: WorkSnapshot = {
    ...snapshot,
    items: [
      item("CS-100", { milestones: ["CS-600"] }),
      item("CS-101", { milestones: ["CS-600"], ...needs("CS-100", "CS-120") }),
      item("CS-102", { milestones: ["CS-600"] }),
      item("CS-110", { milestones: ["CS-610"] }),
      item("CS-111", { milestones: ["CS-610"], ...needs("CS-110", "CS-140") }),
      item("CS-120"),
      item("CS-130", { milestones: ["CS-620"], ...needs("CS-102") }),
      item("CS-140", { kind: "decision", decider: "owner" }),
      item("CS-150", { state: "done", milestones: ["CS-600"] }),
      item("CS-501", {
        title: "Release 2.0.0-alpha.1",
        release: "2.0.0-alpha.1",
        ...needs("CS-600"),
      }),
      item("CS-502", {
        title: "Release 2.0.0-beta.1",
        release: "2.0.0-beta.1",
        ...needs("CS-501", "CS-610"),
      }),
    ],
    milestones: [
      ms("CS-600", ["CS-100", "CS-101", "CS-102", "CS-150"]),
      ms("CS-610", ["CS-110", "CS-111"]),
      ms("CS-620", ["CS-130"]),
    ],
  };

  it("says an item sets its release's finish when the sequence leaves it no room", () => {
    // One slot works everything in a row: any delay pushes alpha.1.
    const plan = planOf(s);
    const c = workCardOf(s, "CS-102", { plan })!;
    expect(c.release).toEqual({ id: "CS-501", version: "2.0.0-alpha.1" });
    expect(c.slip).toMatchObject({ sets: true, room: 0 });
    expect(slipText(c.slip!)).toBe(
      "Sets alpha.1's finish: any delay moves alpha.1",
    );
  });

  it("measures room to slip in the Plan view's unit, over needs and slots", () => {
    // Two slots: CS-100 and CS-102 start at once, CS-120 and CS-101
    // follow CS-100 in its slot, so alpha.1 finishes at 3. CS-102
    // finishes at 1 and only work alpha.1 doesn't need comes after it.
    const plan = planOf(s, { slots: 2 });
    const slack = planSlackOf(plan, s, "CS-501");
    expect(slack.get("CS-102")).toBe(2);
    expect(slack.get("CS-100")).toBe(0);
    expect(slack.get("CS-101")).toBe(0);
    // CS-130 can't move alpha.1 at all.
    expect(slack.get("CS-130")).toBe(Infinity);
    const c = workCardOf(s, "CS-102", { plan })!;
    expect(slipText(c.slip!)).toBe(
      "Room to slip: about 2 items before alpha.1 moves",
    );
    expect([c.slip!.finish, c.slip!.latest, c.slip!.at]).toEqual([1, 3, 3]);
    // A milestone is as tight as its tightest item.
    expect(workCardOf(s, "CS-600", { plan })!.slip!.sets).toBe(true);
    // In tokens once items carry estimates.
    const t = planOf(
      {
        ...s,
        items: s.items.map((it) =>
          it.release
            ? it
            : { ...it, estimate_tokens: it.id === "CS-102" ? 20_000 : 40_000 },
        ),
      },
      { slots: 2 },
    );
    expect(t.unit).toBe("tokens");
    // CS-102 goes first, being smaller; CS-100 finishes at 40k and
    // CS-101, which needs it, starts at 60k.
    const ct = workCardOf(s, "CS-100", { plan: t })!;
    expect(slipText(ct.slip!)).toBe(
      "Room to slip: about 20k tokens before alpha.1 moves",
    );
  });

  it("never says critical path, and gives no time", () => {
    for (const slots of [1, 2, 3]) {
      const plan = planOf(s, { slots });
      for (const id of ["CS-100", "CS-101", "CS-102", "CS-110", "CS-600"]) {
        const c = workCardOf(s, id, { plan })!;
        const text = c.slip ? slipText(c.slip) : "";
        expect(text).not.toMatch(/critical path|day|week|hour/i);
      }
    }
  });

  it("names open blockers only, the owner's first, even up the chain", () => {
    // CS-111 waits on CS-110 and the owner's CS-140.
    expect(cardBlockersOf(s, ["CS-111"]).map((b) => [b.id, b.owner])).toEqual([
      ["CS-140", true],
      ["CS-110", false],
    ]);
    // CS-112 waits on CS-111 only, but CS-140 is up its chain.
    const up: WorkSnapshot = {
      ...s,
      items: [...s.items, item("CS-112", needs("CS-111"))],
    };
    expect(cardBlockersOf(up, ["CS-112"]).map((b) => b.id)).toEqual([
      "CS-140",
      "CS-111",
    ]);
    // Done needs aren't blockers; a ready item has none.
    const done: WorkSnapshot = {
      ...s,
      items: [
        ...s.items,
        item("CS-113", { needs: ["CS-150"], open_needs: [] }),
      ],
    };
    expect(cardBlockersOf(done, ["CS-113"])).toEqual([]);
    // In a set, what lies outside it comes before what it waits on of
    // its own: CS-110 is CS-610's own item.
    const c = workCardOf(s, "CS-610", { plan: planOf(s) })!;
    expect(c.blockers.map((b) => b.id)).toEqual(["CS-140", "CS-110"]);
    const x = cardBlockersOf(
      { ...s, items: [...s.items, item("CS-114", needs("CS-120"))] },
      ["CS-111", "CS-114", "CS-110"],
    );
    expect(x.map((b) => b.id)).toEqual(["CS-140", "CS-120", "CS-110"]);
    expect(c.stage).toBe("Ready");
  });

  it("orders other blockers decisions, then outside waits, then work", () => {
    const x: WorkSnapshot = {
      ...s,
      items: [
        ...s.items,
        item("CS-160"),
        item("CS-161", { kind: "external", waiting_on: "a vendor" }),
        item("CS-162", { kind: "decision", decider: "the team" }),
        item("CS-163", needs("CS-160", "CS-161", "CS-162", "CS-140")),
      ],
    };
    expect(cardBlockersOf(x, ["CS-163"]).map((b) => b.id)).toEqual([
      "CS-140",
      "CS-162",
      "CS-161",
      "CS-160",
    ]);
  });

  it("hides what isn't known instead of spelling it out", () => {
    // No plan: no slip line and no note.
    const bare = workCardOf(s, "CS-102")!;
    expect([bare.slip, bare.note]).toEqual([undefined, undefined]);
    // Done work has no room to measure, so neither line shows.
    const done = workCardOf(s, "CS-150", { plan: planOf(s) })!;
    expect([done.stage, done.slip, done.note]).toEqual([
      "Done",
      undefined,
      undefined,
    ]);
    // Counted in items: one muted note, no token line.
    expect(workCardOf(s, "CS-102", { plan: planOf(s) })!.note).toBe(
      "No item has a token estimate yet, so room is counted in items.",
    );
    // Work no release needs has no release to slip against.
    const free = workCardOf(s, "CS-130", { plan: planOf(s) })!;
    expect([free.release, free.slip, free.note]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    // Every item sized: nothing to say.
    const sized = planOf({
      ...s,
      items: s.items.map((it) => ({ ...it, estimate_tokens: 1000 })),
    });
    expect(workCardOf(s, "CS-102", { plan: sized })!.note).toBeUndefined();
  });

  it("counts a set's stages and labels each color in words", () => {
    const c = workCardOf(s, "CS-600", { plan: planOf(s) })!;
    expect(c.counts).toMatchObject({ Done: 1, Ready: 2, Waiting: 1 });
    expect(stageWords(c.counts!).map((w) => w.text)).toEqual([
      "1 done",
      "2 ready",
      "1 blocked",
    ]);
    // An item has its chip, not a bar.
    expect(workCardOf(s, "CS-101")!.counts).toBeUndefined();
    expect(workCardOf(s, "CS-101")!.stage).toBe("Waiting");
    // A Projects cell: the project's items one release needs.
    const cell = workCardOf(s, "CS-2", {
      items: ["CS-110", "CS-111"],
      release: "CS-502",
    })!;
    expect([cell.kind, cell.release?.version, cell.counts?.Waiting]).toEqual([
      "project",
      "2.0.0-beta.1",
      1,
    ]);
  });

  it("labels each progress-bar segment, the blocked with what they wait on", () => {
    const ids = ["CS-100", "CS-101", "CS-111", "CS-150"];
    expect(segmentLabel(s, "Waiting", ids)).toBe(
      "2 blocked: waiting on CS-100, CS-110 and 2 more",
    );
    expect(segmentLabel(s, "Waiting", ["CS-111"])).toBe(
      "1 blocked: waiting on CS-110 and CS-140",
    );
    expect(segmentLabel(s, "Ready", ids)).toBe("1 ready");
    expect(segmentLabel(s, "Done", ids)).toBe("1 done");
  });
});

describe("the roadmap's zoom (CS-683)", () => {
  it("steps through the levels and stays in range", () => {
    expect(zoomStep(1, 1)).toBe(1.25);
    expect(zoomStep(1, -1)).toBe(0.8);
    // Between two levels, a step goes to the next one either way.
    expect(zoomStep(0.9, 1)).toBe(1);
    expect(zoomStep(0.9, -1)).toBe(0.8);
    expect(zoomStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(zoomStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(0)).toBe(ZOOM_MIN);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(0.41234)).toBe(0.412);
  });

  it("keeps the point under the pointer still, past what doesn't scale", () => {
    // Lane names 170 wide keep their size: 200 past them at 100% is 600 past at 300%.
    expect(zoomAbout(370, 170, 1, 3)).toBe(770);
    // Over the lane names, a point stays put.
    expect(zoomAbout(100, 170, 1, 3)).toBe(100);
    // Out and back in lands where it began.
    expect(zoomAbout(zoomAbout(500, 170, 1, 0.5), 170, 0.5, 1)).toBeCloseTo(
      500,
    );
  });

  it("fits the whole map, never past 100%, and never a pixel over", () => {
    const fixed = { x: 170, y: 80 };
    expect(fitZoom({ w: 1000, h: 600 }, { w: 800, h: 400 }, fixed)).toBe(1);
    const z = fitZoom({ w: 1270, h: 646 }, { w: 1270, h: 6000 }, fixed);
    expect(z).toBe(0.095);
    expect(fixed.y + (6000 - fixed.y) * z).toBeLessThanOrEqual(646);
    expect(fitZoom({ w: 100, h: 100 }, { w: 1e6, h: 1e6 }, fixed)).toBe(
      ZOOM_MIN,
    );
  });

  it("draws a card's text at full size or not at all", () => {
    expect(cardDetail(200, 72)).toBe("full");
    expect(cardDetail(100, 36)).toBe("name");
    expect(cardDetail(200, 20)).toBe("mark");
    expect(cardDetail(40, 60)).toBe("mark");
  });
});

describe("the live run in Your move's In progress (CS-547)", () => {
  it("reads a missing store as unreadable, never as nothing in flight", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dyno-live-"));
    try {
      const live = await readLive(root, { store: join(dir, "no-store") });
      expect(live.ledger.ok).toBe(false);
      expect(live.ledger.ok ? "" : live.ledger.why).toBe(LIVE_UNREAD.empty);
      // run status answers "no run" for a missing store, as for no run.
      expect(live.run.ok && live.run.run).toBeFalsy();
      expect(live.claims.ok).toBe(true);
      expect(live.unmerged.ok).toBe(true);
      for (const x of [live.run, live.ledger, live.claims, live.unmerged]) {
        expect(x.source).toBeTruthy();
        expect(Number.isFinite(Date.parse(x.read_at))).toBe(true);
      }
      // No machine's name reaches the page.
      expect(JSON.stringify(live)).not.toMatch(/"host"/);
      // A claim the board counts has its claim commit's date; a stale one
      // (no claim commit since main) is kept apart.
      if (live.claims.ok) {
        expect(live.claims.list.every((c) => c.at)).toBe(true);
        expect(live.claims.stale.every((c) => !c.at)).toBe(true);
        expect(elsewhereOf(live.claims).every((c) => c.where)).toBe(true);
      }
      const box = liveBoxOf({ ...snapshot, live });
      expect(box.blind).toBe(true);
      expect(box.run.state).toBe("unknown");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("folds the merge queue from the ledger as hitld's run state does", () => {
    const q = queueOf([
      { event: "verified", item: "CS-1", result: "pass", at: "a" },
      { event: "verified", item: "CS-2", result: "pass", at: "b" },
      { event: "merged", item: "CS-2", at: "c" },
      { event: "verified", item: "CS-3", result: "fail", at: "d" },
      { event: "verified", item: "CS-4", result: "fail", at: "e" },
      { event: "verified", item: "CS-4", result: "pass", at: "f" },
      { event: "logged", item: "CS-5", at: "g" },
    ]);
    expect(Object.fromEntries([...q].map(([k, v]) => [k, v.state]))).toEqual({
      "CS-1": "queued",
      "CS-3": "rejected",
      "CS-4": "queued",
    });
  });

  describe("items done on an hitld/* branch and not merged, from git", () => {
    let repo: string;
    const g = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: repo,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    const put = (id: string, state: string) => {
      writeFileSync(
        join(repo, "packages/next/work/items", `${id}-x.md`),
        `---\nid: ${id}\ntitle: x\nkind: work\nstate: ${state}\n---\n`,
      );
    };
    const commit = (msg: string) => {
      g("add", "-A");
      g("commit", "-q", "-m", msg);
    };
    beforeAll(() => {
      repo = mkdtempSync(join(tmpdir(), "dyno-unmerged-"));
      mkdirSync(join(repo, "packages/next/work/items"), { recursive: true });
      g("init", "-q", "-b", "trunk");
      g("config", "user.email", "test@example.com");
      g("config", "user.name", "Test");
      g("config", "commit.gpgsign", "false");
      for (const id of ["CS-1", "CS-2", "CS-3", "CS-4", "CS-5"]) {
        put(id, "planned");
      }
      commit("items");
      // CS-1: done on its branch, not merged, queued in the ledger.
      g("checkout", "-q", "-b", "hitld/one");
      put("CS-1", "done");
      commit("work: CS-1");
      // CS-2: done on a branch that was rebased onto trunk and merged.
      g("checkout", "-q", "trunk");
      g("checkout", "-q", "-b", "hitld/two");
      put("CS-2", "done");
      commit("work: CS-2");
      g("checkout", "-q", "trunk");
      put("CS-2", "done");
      commit("work: CS-2, rebased");
      // CS-3: on its branch and checked by hand on a merge-check branch.
      g("checkout", "-q", "-b", "hitld/three");
      put("CS-3", "done");
      commit("work: CS-3");
      g("checkout", "-q", "-b", "hitld/CS-3-merge-check");
      g("checkout", "-q", "trunk");
      // CS-4: held for the owner's yes.
      g("checkout", "-q", "-b", "hitld/four");
      put("CS-4", "done");
      commit("work: CS-4");
      g("update-ref", "refs/hitld/merge-held", "hitld/four");
      g("checkout", "-q", "trunk");
      // CS-5: done on a branch outside hitld/*, which the scan leaves out.
      g("checkout", "-q", "-b", "claude/five");
      put("CS-5", "done");
      commit("work: CS-5");
      g("checkout", "-q", "trunk");
    });
    afterAll(() => rmSync(repo, { recursive: true, force: true }));

    it("lists each with its branches and where the merge queue has it, hitld/* branches only", () => {
      const queue = new Map([["CS-1", { state: "queued" as const, at: "x" }]]);
      const got = unmergedOf(repo, "trunk", queue);
      expect(
        got.map((u) => [u.id, u.branches, u.queue, u.check_branch]),
      ).toEqual([
        ["CS-1", ["hitld/one"], "queued", undefined],
        ["CS-3", ["hitld/three"], "checking", "hitld/CS-3-merge-check"],
        ["CS-4", ["hitld/four"], "held", undefined],
      ]);
      expect(got.every((u) => Number.isFinite(Date.parse(u.closed_at)))).toBe(
        true,
      );
    });

    it("refuses a main branch that doesn't exist, rather than finding nothing", () => {
      expect(() => unmergedOf(repo, "no-such-branch")).toThrow();
    });
  });

  const now = Date.parse("2026-11-18T23:10:00-05:00");
  const live = (over: Partial<WorkLive> = {}): WorkLive => ({
    read_at: "2026-11-19T04:10:00Z",
    main_branch: "trunk",
    run: {
      source: "hitld run status",
      read_at: "2026-11-19T04:10:00Z",
      ok: true,
      run: { id: "2026-11-18-2", started_at: "2026-11-18T04:55:44Z" },
      lease: {
        session: "orch-9",
        renewed_at: "2026-11-19T03:57:41Z",
        expired: false,
        free: false,
      },
      in_flight: 1,
      waiting_to_merge: 1,
    },
    ledger: {
      source: "hitld ledger in-flight and ledger tail",
      read_at: "2026-11-19T04:10:00Z",
      ok: true,
      events: 40,
      problems: 0,
      dispatches: [
        {
          dispatch: "D-7",
          item: "CS-11",
          branch: "exec/eleven",
          started_at: "2026-11-19T03:40:00Z",
        },
      ],
    },
    claims: {
      source: "hitld work claims",
      read_at: "2026-11-19T04:10:00Z",
      ok: true,
      list: [
        {
          id: "CS-11",
          claimed_by: "D-7",
          where: "exec/eleven",
          worktree: true,
          here: false,
          at: "2026-11-19T03:41:00Z",
        },
        {
          id: "CS-14",
          claimed_by: "orch-9-CS-14",
          where: "hitld/CS-14-x",
          worktree: true,
          here: false,
          at: "2026-11-19T04:00:00Z",
        },
      ],
      stale: [
        { id: "CS-15", where: "old/a", worktree: false, here: false },
        { id: "CS-15", where: "old/b", worktree: false, here: false },
      ],
    },
    unmerged: {
      source: "git: local branches against trunk",
      read_at: "2026-11-19T04:10:00Z",
      ok: true,
      list: [
        {
          id: "CS-13",
          closed_at: "2026-11-19T02:00:00Z",
          branches: ["exec/thirteen"],
          queue: "held",
        },
      ],
    },
    ...over,
  });

  it("lists every dispatch in flight with its age from the ledger, never the stage history", () => {
    const box = liveBoxOf({ ...snapshot, branch: "trunk", live: live() });
    expect(box.blind).toBe(false);
    const d = box.working.find((w) => w.id === "CS-11")!;
    expect(d.from).toBe("dispatch");
    expect(d.who).toBe("D-7");
    // The dispatch's start, not its claim commit a minute later.
    expect(d.since).toBe(Date.parse("2026-11-19T03:40:00Z"));
    expect(agoText(now - d.since!)).toBe("30 minutes ago");
    // A claim with no dispatch is timed from its claim commit, and said so.
    const c = box.working.find((w) => w.id === "CS-14")!;
    expect(c.from).toBe("claim");
    expect(c.since).toBe(Date.parse("2026-11-19T04:00:00Z"));
    expect(box.notes.join(" ")).toMatch(
      /CS-14 has a claim with no dispatch in flight/,
    );
    // CS-12 is in progress on this branch with no claim commit found.
    const here = box.working.find((w) => w.id === "CS-12")!;
    expect(here.from).toBe("branch");
    expect(here.since).toBeUndefined();
    // Oldest first, the one with no age last.
    expect(box.working.map((w) => w.id)).toEqual(["CS-11", "CS-14", "CS-12"]);
  });

  it("leaves stale claims out and says so", () => {
    const box = liveBoxOf({ ...snapshot, live: live() });
    expect(box.working.some((w) => w.id === "CS-15")).toBe(false);
    expect(box.notes.join(" ")).toMatch(
      /Left out: CS-15, in progress only on 2 branches trunk has already moved past/,
    );
  });

  it("names the active run and the orchestrator holding its lease, or says there is none", () => {
    expect(liveBoxOf({ ...snapshot, live: live() }).run).toMatchObject({
      state: "active",
      id: "2026-11-18-2",
      session: "orch-9",
    });
    const free = live();
    if (free.run.ok && free.run.lease) {
      free.run.lease.free = true;
    }
    expect(liveBoxOf({ ...snapshot, live: free }).run.state).toBe("free");
    const none = live({
      run: {
        source: "hitld run status",
        read_at: "2026-11-19T04:10:00Z",
        ok: true,
        in_flight: 0,
        waiting_to_merge: 0,
      },
    });
    expect(liveBoxOf({ ...snapshot, live: none }).run.state).toBe("none");
  });

  it("lists items done and not merged with where the merge queue has them", () => {
    const box = liveBoxOf({ ...snapshot, live: live() });
    expect(box.unmerged.map((u) => [u.id, u.queue])).toEqual([
      ["CS-13", "held"],
    ]);
    expect(queueText(box.unmerged[0]!).text).toBe("waits for the owner's yes");
    expect(
      queueText({ queue: "checking", checkBranch: "hitld/CS-3-merge-check" })
        .text,
    ).toMatch(/hitld\/CS-3-merge-check, outside hitld's merge queue/);
    expect(queueText({ queue: "queued" }).text).toBe("in hitld's merge queue");
    expect(queueText({ queue: "none" }).text).toBe(
      "not in hitld's merge queue",
    );
  });

  it("says when a source can't be read, with when it tried, instead of nothing", () => {
    const box = liveBoxOf({
      ...snapshot,
      live: live({
        ledger: {
          source: "hitld ledger in-flight and ledger tail",
          read_at: "2026-11-19T04:10:00Z",
          ok: false,
          why: LIVE_UNREAD.ledger,
        },
      }),
    });
    expect(box.blind).toBe(true);
    const unread = box.sources.filter((x) => !x.ok);
    expect(unread.map((x) => x.why)).toEqual([LIVE_UNREAD.ledger]);
    expect(unread[0]!.at).toBe(Date.parse("2026-11-19T04:10:00Z"));
    // The claims still show; nothing claims to be the whole picture.
    expect(box.working.map((w) => w.id)).toContain("CS-14");
    // A server without the live read is blind too.
    expect(liveBoxOf(snapshot).blind).toBe(true);
  });

  it("keeps to the scope's items", () => {
    const box = liveBoxOf(
      { ...snapshot, live: live() },
      new Set(["CS-14", "CS-13"]),
    );
    expect(box.working.map((w) => w.id)).toEqual(["CS-14"]);
    expect(box.unmerged.map((u) => u.id)).toEqual(["CS-13"]);
  });

  it("tells ages to the minute under a day", () => {
    expect(agoText(30_000)).toBe("just now");
    expect(agoText(10 * 60_000)).toBe("10 minutes ago");
    expect(agoText(61 * 60_000)).toBe("1 hour ago");
    expect(agoText(21 * 3_600_000)).toBe("21 hours ago");
    expect(agoText(50 * 3_600_000)).toBe("2 days ago");
  });
});
