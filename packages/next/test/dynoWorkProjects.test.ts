// The Work page's Projects view (CS-748): each project as a bet, a row
// per project sorted by its next release, with the releases its
// milestones land in, its progress by clauses, its spend against
// appetite once estimates exist, and its own open decisions
// (bench/suite/projectBets.ts; DESIGN.md, "The Projects view").
// StrataKit's MUI reads the document once, when first loaded: load it
// here, before the stand-in below exists, as the Release view's test does.
import "@stratakit/mui";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type ProjectBet,
  projectBetsOf,
  spendOf,
  spendWords,
} from "../bench/suite/projectBets.ts";
import type {
  WorkContainer,
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";
import { mountViews, type ViewEntry } from "../bench/suite/workModel.ts";

const item = (id: string, over: Partial<WorkItem> = {}): WorkItem => ({
  id,
  title: `Item ${id}`,
  kind: "work",
  state: "planned",
  needs: [],
  path: `packages/next/work/items/${id}.md`,
  ready: true,
  blocked: false,
  open_needs: [],
  needed_by: [],
  milestones: [],
  ...over,
});
const milestone = (
  id: string,
  project: string,
  over: Partial<WorkMilestone> = {},
): WorkMilestone => ({
  id,
  title: `Milestone ${id}`,
  kind: "milestone",
  learning: false,
  state: "planned",
  project,
  done_when: [],
  constraints: [],
  contributions: [],
  check_results: [],
  path: `packages/next/work/milestones/${id}.md`,
  progress: { done: 0, total: 0 },
  check_due: false,
  to_shape: [],
  ...over,
});
const project = (id: string, title: string): WorkContainer => ({
  id,
  title,
  state: "planned",
  path: `packages/next/work/projects/${id}.md`,
  progress: {
    total: 0,
    done: 0,
    dropped: 0,
    in_progress: 0,
    ready: 0,
    blocked: 0,
    proposed: 0,
  },
});

// Two releases: alpha.1 (CS-100) and beta.1 (CS-101), which comes after it.
// Five projects, one per fixture:
// - CS-10 has milestones in both releases: CS-201 in alpha.1 (two clauses,
//   one checked) and CS-202 in beta.1 (no clauses yet).
// - CS-11 has open decisions: the owner's CS-312, answerable now and on
//   CS-211's way; CS-313, decided by the legal team and waiting on work;
//   and the proposed CS-314, shown only with proposals.
// - CS-12 has no milestone, only an item.
// - CS-13 has an appetite and no estimates.
// - CS-14's only milestone is in beta.1, so it sorts after every project
//   whose next release is alpha.1.
function fixture(over: { appetite?: number; estimate?: number } = {}) {
  const s: WorkSnapshot = {
    api_version: 3,
    source: "test",
    generated: "2026-11-20T00:00:00Z",
    items: [
      item("CS-100", {
        title: "Release 2.0.0-alpha.1",
        release: "2.0.0-alpha.1",
        needs: ["CS-201", "CS-211", "CS-221"],
        ready: false,
      }),
      item("CS-101", {
        title: "Release 2.0.0-beta.1",
        release: "2.0.0-beta.1",
        needs: ["CS-100", "CS-202", "CS-231"],
        ready: false,
      }),
      item("CS-301", {
        project: "CS-10",
        state: "done",
        ready: false,
        milestones: ["CS-201"],
      }),
      item("CS-302", {
        project: "CS-10",
        milestones: ["CS-201"],
        estimate_tokens: over.estimate,
      }),
      item("CS-303", {
        project: "CS-10",
        state: "in-progress",
        milestones: ["CS-202"],
      }),
      item("CS-311", {
        project: "CS-11",
        needs: ["CS-312"],
        open_needs: ["CS-312"],
        ready: false,
        blocked: true,
        milestones: ["CS-211"],
      }),
      item("CS-312", {
        project: "CS-11",
        kind: "decision",
        decider: "owner",
        title: "Which reader does the board use?",
        needed_by: ["CS-311"],
      }),
      item("CS-313", {
        project: "CS-11",
        kind: "decision",
        decider: "the legal team",
        title: "May the data ship?",
        needs: ["CS-311"],
        open_needs: ["CS-311"],
        ready: false,
        blocked: true,
      }),
      item("CS-314", {
        project: "CS-11",
        kind: "decision",
        state: "proposed",
        title: "A proposed question",
      }),
      item("CS-315", {
        project: "CS-11",
        kind: "decision",
        state: "done",
        title: "An answered question",
        ready: false,
      }),
      item("CS-321", { project: "CS-12" }),
      item("CS-331", { project: "CS-13", milestones: ["CS-221"] }),
      item("CS-341", { project: "CS-14", milestones: ["CS-231"] }),
    ],
    milestones: [
      milestone("CS-201", "CS-10", {
        outcome: "The board reads one API.",
        done_when: [
          { clause: "c1", text: "It reads the snapshot." },
          { clause: "c2", text: "It says when hitld is missing." },
        ],
        constraints: [
          { id: "CS-301", clause: "c1" },
          { id: "CS-302", clause: "c2" },
        ],
        check_results: ["pass 2026-11-19"],
      }),
      milestone("CS-202", "CS-10", {
        outcome: "The board runs on the other machine.",
        constraints: [{ id: "CS-303", clause: "c?" }],
      }),
      milestone("CS-211", "CS-11", {
        constraints: [{ id: "CS-311", clause: "c?" }],
      }),
      milestone("CS-221", "CS-13", {
        appetite_tokens: over.appetite,
        constraints: [{ id: "CS-331", clause: "c?" }],
      }),
      milestone("CS-231", "CS-14", {
        constraints: [{ id: "CS-341", clause: "c?" }],
      }),
    ],
    projects: [
      project("CS-10", "Two releases"),
      project("CS-11", "Open decisions"),
      project("CS-12", "No milestone"),
      project("CS-13", "Appetite, no estimates"),
      project("CS-14", "Beta only"),
    ],
    long_outcomes: [],
    project_deps: [],
    problems: [],
    elsewhere: [],
    history: [],
  };
  return s;
}

const rowOf = (rows: readonly ProjectBet[], id: string) =>
  rows.find((r) => r.id === id)!;

describe("the Projects view's model (CS-748)", () => {
  it("has a column per open release in ladder order, then None", () => {
    const { columns } = projectBetsOf(fixture({ appetite: 400_000 }));
    expect(columns.map((c) => c.short)).toEqual(["alpha.1", "beta.1", "None"]);
  });

  it("sorts by next release, the beta.1-only project after every alpha.1 one, and no milestone last", () => {
    const bets = projectBetsOf(fixture({ appetite: 400_000 }));
    expect(bets.rows.map((r) => r.id)).toEqual([
      "CS-10",
      "CS-11",
      "CS-13",
      "CS-14",
      "CS-12",
    ]);
    expect(bets.groups.map((g) => [g.label, g.projects.length])).toEqual([
      ["Next in alpha.1", 3],
      ["Next in beta.1", 1],
      ["No open milestone", 1],
    ]);
  });

  it("orders projects with one next release by where the planner reaches their first milestone", () => {
    const bets = projectBetsOf(fixture(), {
      order: ["CS-221", "CS-211", "CS-201", "CS-202", "CS-231"],
    });
    expect(bets.rows.map((r) => r.id)).toEqual([
      "CS-13",
      "CS-11",
      "CS-10",
      "CS-14",
      "CS-12",
    ]);
  });

  it("shows a project with milestones in two releases landing in both, with its progress by clauses", () => {
    const a = rowOf(projectBetsOf(fixture()).rows, "CS-10");
    expect(a.lands).toEqual([1, 1, 0]);
    expect(a.next).toBe(0);
    expect(a.nextOutcome).toEqual({
      id: "CS-201",
      text: "The board reads one API.",
    });
    expect(a.milestones.map((m) => [m.id, m.column])).toEqual([
      ["CS-201", 0],
      ["CS-202", 1],
    ]);
    // c1's item is done and the check passed; c2's item is open; CS-202
    // has no clause yet.
    expect(a.clauses).toMatchObject({
      checked: 1,
      check: 0,
      total: 2,
      unshaped: 1,
    });
    expect(a.clauses.segments).toEqual([
      { id: "CS-201", total: 2, checked: 1, check: 0 },
      { id: "CS-202", total: 0, checked: 0, check: 0 },
    ]);
  });

  it("lists a milestone's items open first, by stage, then done", () => {
    const a = rowOf(projectBetsOf(fixture()).rows, "CS-10");
    const m = a.milestones[0]!;
    expect(m.items.map((x) => [x.id, x.stage, x.clause])).toEqual([
      ["CS-302", "Ready", "c2"],
      ["CS-301", "Done", "c1"],
    ]);
    expect(m.progress).toEqual({ done: 1, total: 2 });
  });

  it("puts a project's own open decisions on its row, the owner's answerable ones first", () => {
    const b = rowOf(projectBetsOf(fixture()).rows, "CS-11");
    expect(b.decisions).toEqual([
      {
        id: "CS-312",
        title: "Which reader does the board use?",
        owner: true,
        answerable: true,
        proposed: false,
      },
      {
        id: "CS-313",
        title: "May the data ship?",
        owner: false,
        answerable: false,
        proposed: false,
      },
    ]);
    // On its milestone's way through the item that needs it.
    expect(b.milestones[0]!.decisions).toEqual(["CS-312"]);
    // Other projects have none.
    const others = projectBetsOf(fixture()).rows.filter(
      (r) => r.id !== "CS-11",
    );
    expect(others.every((r) => r.decisions.length === 0)).toBe(true);
  });

  it("adds proposed decisions only with proposals", () => {
    const b = rowOf(
      projectBetsOf(fixture(), { proposals: true }).rows,
      "CS-11",
    );
    expect(b.decisions.map((d) => [d.id, d.proposed])).toEqual([
      ["CS-312", false],
      ["CS-314", true],
      ["CS-313", false],
    ]);
  });

  it("keeps a project with no milestone, in a group of its own, landing nowhere", () => {
    const bets = projectBetsOf(fixture());
    const c = rowOf(bets.rows, "CS-12");
    expect(c.next).toBeUndefined();
    expect(c.nextOutcome).toBeUndefined();
    expect(c.lands).toEqual([0, 0, 0]);
    expect(c.milestones).toEqual([]);
    expect(c.clauses).toMatchObject({ total: 0, unshaped: 0 });
    expect(bets.groups.at(-1)!.projects.map((r) => r.id)).toEqual(["CS-12"]);
  });

  it("says plainly when a project has an appetite but no estimates", () => {
    const bets = projectBetsOf(fixture({ appetite: 400_000 }));
    const d = rowOf(bets.rows, "CS-13");
    expect(d.spend).toEqual({
      appetite: 400_000,
      items: 1,
      estimated: 0,
      estimate: undefined,
      spent: undefined,
    });
    expect(spendWords(d.spend)).toEqual({
      main: "Appetite 400k",
      sub: "no estimates yet",
    });
    expect(bets.hasSpend).toBe(true);
  });

  it("has no spend to show while no record carries tokens", () => {
    const bets = projectBetsOf(fixture());
    expect(bets.hasSpend).toBe(false);
    expect(spendWords(rowOf(bets.rows, "CS-13").spend)).toEqual({
      main: "No estimates yet",
    });
  });

  it("reads estimates as a range and spend against appetite once they exist", () => {
    const withEstimate = projectBetsOf(fixture({ estimate: 30_000 }));
    const a = rowOf(withEstimate.rows, "CS-10");
    // Three work items, one estimated: 30k, to 30k plus two at the median.
    expect(a.spend.estimate).toEqual({ low: 30_000, high: 90_000 });
    expect(spendWords(a.spend)).toEqual({
      main: "30k–90k estimated",
      sub: "estimates on 1 of 3 · nothing spent yet",
    });
    expect(withEstimate.hasSpend).toBe(true);
    const spent = spendOf(
      [
        item("CS-1", { estimate_tokens: 10_000, tokens_spent: 12_000 }),
        item("CS-2", { estimate_tokens: 20_000 }),
      ],
      [milestone("CS-3", "CS-10", { appetite_tokens: 50_000 })],
    );
    expect(spendWords(spent)).toEqual({
      main: "12k of 50k",
      sub: "estimated 30k (on 2 of 2)",
    });
  });

  // The views' modules add their styles to the document when loaded; lend
  // node a stand-in for that, as the Release view's test does.
  let lent = false;
  beforeAll(() => {
    if (typeof document === "undefined") {
      Object.assign(globalThis, {
        document: {
          createElement: () => ({}),
          head: { append: () => {} },
        },
      });
      lent = true;
    }
  });
  afterAll(() => {
    if (lent) {
      delete (globalThis as { document?: unknown }).document;
    }
  });

  it("mounts as the roadmap's Projects view, after Release, and retires the older one", async () => {
    const { workView } = await import("../bench/suite/views/workProjects.tsx");
    expect(workView).toMatchObject({
      id: "projects",
      place: "roadmap",
      proposals: true,
    });
    const builtIn: ViewEntry[] = [
      { id: "plan", place: "older", order: 10 },
      { id: "projects", place: "older", order: 30 },
    ];
    const out = mountViews(builtIn, [
      { id: "release", place: "roadmap", order: 10 },
      workView,
    ]);
    expect(out.problems).toEqual([]);
    expect(out.roadmap.map((v) => v.id)).toEqual(["release", "projects"]);
    expect(out.older.map((v) => v.id)).toEqual(["plan"]);
  });
});
