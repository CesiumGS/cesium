import { describe, expect, it } from "vitest";
import {
  dependencyGraphOf,
  depthOf,
  depTreeOf,
  DEPTH_DEFAULT,
  DEPTH_MAX,
  DEPTH_MIN,
  type DepTreeNode,
  matchFocus,
  milestoneStage,
  milestoneStages,
  mostWaitedOn,
  nodeReleasesOf,
  reachOf,
  wavesOf,
} from "../bench/suite/dependencies.ts";
import type {
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";

// The Dependencies view's model (CS-694), on a small tracker by hand.
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
const needs = (...ids: string[]) => ({
  needs: ids,
  open_needs: ids,
  ready: false,
  blocked: true,
});
const ms = (
  id: string,
  constraints: string[],
  over: Partial<WorkMilestone> = {},
): WorkMilestone => ({
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
  ...over,
});

// A (CS-300) waits on B (CS-310) through CS-200, and on C (CS-320)
// through CS-203; B waits on C. A holds an owner decision (CS-209) and
// waits outside through CS-201 (CS-250). CS-221, in no milestone, needs A
// itself, and so does alpha.1 (CS-401). D (CS-330) and E (CS-340) wait on
// each other through different items: a loop of milestones, not of items.
const s: WorkSnapshot = {
  api_version: 3,
  source: "test",
  generated: "2026-11-18T00:00:00Z",
  items: [
    item("CS-200", needs("CS-210")),
    item("CS-201", needs("CS-250")),
    item("CS-202", needs("CS-200")),
    item("CS-203", needs("CS-220")),
    item("CS-209", { kind: "decision", decider: "owner" }),
    item("CS-210", needs("CS-220")),
    item("CS-211", { state: "in-progress", ready: false }),
    item("CS-212", { state: "done", ready: false }),
    item("CS-220"),
    item("CS-221", needs("CS-300")),
    item("CS-230", { ...needs("CS-241"), project: "CS-3" }),
    item("CS-231", { project: "CS-3" }),
    item("CS-240", { ...needs("CS-231"), project: "CS-3" }),
    item("CS-241", { project: "CS-3" }),
    item("CS-250", { kind: "external", waiting_on: "a vendor" }),
    item("CS-260", { state: "proposed", ready: false }),
    item("CS-401", {
      title: "Release 2.0.0-alpha.1",
      release: "2.0.0-alpha.1",
      ...needs("CS-300"),
    }),
  ],
  milestones: [
    ms("CS-300", ["CS-200", "CS-201", "CS-202", "CS-203", "CS-209"]),
    ms("CS-310", ["CS-210", "CS-211", "CS-212"]),
    ms("CS-320", ["CS-220"]),
    ms("CS-330", ["CS-230", "CS-231"], { project: "CS-3" }),
    ms("CS-340", ["CS-240", "CS-241"], { project: "CS-3" }),
    ms("CS-350", ["CS-260"], { state: "proposed" }),
    ms("CS-360", ["CS-212"], { state: "done" }),
  ],
  projects: [],
  long_outcomes: [],
  project_deps: [],
  problems: [],
  elsewhere: [],
  history: [],
};

/** A tree as nested IDs, with its marks, for comparing. */
const shape = (nodes: readonly DepTreeNode[]): unknown[] =>
  nodes.map((n) => {
    const marks = [
      n.loop && "loop",
      n.repeat && "repeat",
      !n.children && n.more && !n.loop && !n.repeat && "cut",
    ].filter(Boolean);
    const head = marks.length ? `${n.id} (${marks.join(", ")})` : n.id;
    return n.children ? [head, shape(n.children)] : head;
  });

describe("the Dependencies view's graph (CS-694)", () => {
  const g = dependencyGraphOf(s);

  it("reads a milestone at its own level: other milestones, loose waits, its decisions", () => {
    expect(g.up.get("CS-300")).toEqual([
      { id: "CS-209", via: [], rel: "holds" },
      { id: "CS-250", via: [{ from: "CS-201", to: "CS-250" }], rel: "needs" },
      { id: "CS-310", via: [{ from: "CS-200", to: "CS-210" }], rel: "needs" },
      { id: "CS-320", via: [{ from: "CS-203", to: "CS-220" }], rel: "needs" },
    ]);
    // CS-202 needs CS-200, in its own milestone: its own work, no wait.
    expect(g.up.get("CS-300")!.some((e) => e.id === "CS-200")).toBe(false);
  });

  it("reads an item at its own level: its open needs, items and milestones", () => {
    expect(g.up.get("CS-221")).toEqual([
      { id: "CS-300", via: [], rel: "needs" },
    ]);
    expect(g.up.get("CS-401")!.map((e) => e.id)).toEqual(["CS-300"]);
    expect(g.up.get("CS-220")).toBeUndefined();
  });

  it("unblocks the other way, and an item is part of its milestones", () => {
    expect(g.down.get("CS-300")!.map((e) => e.id)).toEqual([
      "CS-221",
      "CS-401",
    ]);
    expect(g.down.get("CS-220")).toEqual([
      { id: "CS-203", via: [], rel: "needs" },
      { id: "CS-210", via: [], rel: "needs" },
      { id: "CS-320", via: [], rel: "part-of" },
    ]);
    expect(g.down.get("CS-320")!.map((e) => [e.id, e.via])).toEqual([
      ["CS-300", [{ from: "CS-203", to: "CS-220" }]],
      ["CS-310", [{ from: "CS-210", to: "CS-220" }]],
    ]);
  });

  it("leaves done milestones out, and proposed ones unless asked for", () => {
    expect(g.milestones.has("CS-360")).toBe(false);
    expect(g.milestones.has("CS-350")).toBe(false);
    expect(g.items.has("CS-212")).toBe(false);
    const withProposed = dependencyGraphOf(s, true);
    expect(withProposed.milestones.has("CS-350")).toBe(true);
    expect(withProposed.down.get("CS-260")).toEqual([
      { id: "CS-350", via: [], rel: "part-of" },
    ]);
  });
});

describe("the focused trees (CS-694)", () => {
  const g = dependencyGraphOf(s);

  it("shows what a milestone waits on, a node reached twice expanded once", () => {
    expect(shape(depTreeOf(g, "CS-300", "up", 3))).toEqual([
      "CS-209",
      "CS-250",
      // C is next to the focus too, so under B it is a repeat.
      ["CS-310", ["CS-320 (repeat)"]],
      "CS-320",
    ]);
  });

  it("shows what a milestone unblocks, down to releases", () => {
    expect(shape(depTreeOf(g, "CS-320", "down", 3))).toEqual([
      ["CS-300", ["CS-221", "CS-401"]],
      ["CS-310", ["CS-300 (repeat)"]],
    ]);
    // From an item: what needs it, and the milestone it is part of.
    expect(shape(depTreeOf(g, "CS-220", "down", 2))).toEqual([
      ["CS-203", ["CS-300 (cut)"]],
      ["CS-210", ["CS-200 (cut)", "CS-310 (cut)"]],
      ["CS-320", ["CS-300 (repeat)", "CS-310 (repeat)"]],
    ]);
  });

  it("cuts the tree at its depth, saying a node has more beyond", () => {
    const one = depTreeOf(g, "CS-300", "up", 1);
    expect(shape(one)).toEqual(["CS-209", "CS-250", "CS-310 (cut)", "CS-320"]);
    expect(one.find((n) => n.id === "CS-310")).toMatchObject({
      more: true,
      level: 1,
    });
    expect(one.find((n) => n.id === "CS-310")!.children).toBeUndefined();
    // Expanding below the cut carries the way there, so a loop still ends.
    expect(shape(depTreeOf(g, "CS-310", "up", 1, ["CS-300"]))).toEqual([
      "CS-320",
    ]);
  });

  it("ends a loop where it comes back round", () => {
    expect(shape(depTreeOf(g, "CS-330", "up", 4))).toEqual([
      ["CS-340", ["CS-330 (loop)"]],
    ]);
    expect(depTreeOf(g, "CS-330", "up", 4)[0]!.children![0]).toMatchObject({
      loop: true,
      more: false,
    });
  });
});

describe("how far a chain goes (CS-694)", () => {
  const g = dependencyGraphOf(s);
  const up = reachOf(g, "up");
  const down = reachOf(g, "down");

  it("counts distinct nodes and the longest chain, with decisions and outside waits", () => {
    expect(up.get("CS-300")).toEqual({
      nodes: 4,
      levels: 2,
      decisions: 1,
      outside: 1,
    });
    expect(up.get("CS-220")).toEqual({
      nodes: 0,
      levels: 0,
      decisions: 0,
      outside: 0,
    });
    // C unblocks B and A, and A unblocks CS-221 and alpha.1.
    expect(down.get("CS-320")).toMatchObject({ nodes: 4, levels: 3 });
  });

  it("counts a loop as one level, never endless", () => {
    expect(up.get("CS-330")).toMatchObject({ nodes: 1, levels: 1 });
    // CS-231 unblocks CS-240 and is part of D; CS-240 is part of E; D and
    // E wait on each other. The loop is one level at the end.
    expect(down.get("CS-231")).toMatchObject({ nodes: 3, levels: 3 });
  });

  it("ranks milestones by what waits on them", () => {
    expect(mostWaitedOn(g, down, 2)).toEqual(["CS-320", "CS-310"]);
  });
});

describe("the releases on the nodes (CS-694)", () => {
  const rel = nodeReleasesOf(s);

  it("puts milestones, their items and loose items in the earliest release", () => {
    expect(rel.get("CS-300")).toEqual({ id: "CS-401", name: "2.0.0-alpha.1" });
    expect(rel.get("CS-200")).toEqual({ id: "CS-401", name: "2.0.0-alpha.1" });
    expect(rel.get("CS-401")).toEqual({ id: "CS-401", name: "2.0.0-alpha.1" });
    // No release names B; what A pulls in is a closure problem, not a band.
    expect(rel.get("CS-310")).toEqual({ name: "No release" });
    expect(rel.get("CS-221")).toEqual({ name: "No release" });
  });
});

describe("the global structure: earliest possible start, in waves (CS-694)", () => {
  const w = wavesOf(s);

  it("places each milestone one wave after the latest it waits on", () => {
    expect(Object.fromEntries(w.waveOf)).toEqual({
      "CS-320": 1,
      "CS-330": 1,
      "CS-340": 1,
      "CS-310": 2,
      "CS-300": 3,
    });
    expect(w.count).toBe(3);
    expect(w.perWave).toEqual([3, 1, 1]);
  });

  it("lays them in project lanes and marks a loop", () => {
    expect(w.lanes).toEqual([
      { id: "CS-2", waves: [["CS-320"], ["CS-310"], ["CS-300"]] },
      { id: "CS-3", waves: [["CS-330", "CS-340"], [], []] },
    ]);
    expect(w.loopOf.get("CS-330")).toEqual(["CS-330", "CS-340"]);
    expect(w.loopOf.has("CS-300")).toBe(false);
  });
});

describe("the view's settings and chooser (CS-694)", () => {
  it("keeps the depth in bounds", () => {
    expect(depthOf(undefined)).toBe(DEPTH_DEFAULT);
    expect(depthOf("2")).toBe(2);
    expect(depthOf("99")).toBe(DEPTH_MAX);
    expect(depthOf("0")).toBe(DEPTH_MIN);
    expect(depthOf("x")).toBe(DEPTH_DEFAULT);
  });

  it("finds milestones first, then open items, by every word", () => {
    expect(matchFocus(s, "milestone 31").map((m) => m.id)).toEqual(["CS-310"]);
    expect(matchFocus(s, "cs-21").map((m) => m.id)).toEqual([
      "CS-210",
      "CS-211",
      "CS-212",
    ]);
    expect(matchFocus(s, "  ")).toEqual([]);
  });

  it("reads a milestone's stage from its items", () => {
    const g = dependencyGraphOf(s);
    const b = s.milestones.find((m) => m.id === "CS-310")!;
    const counts = milestoneStages(b, g.items, s.items);
    expect(counts).toMatchObject({ Waiting: 1, "In flight": 1, Done: 1 });
    expect(milestoneStage(b, counts)).toBe("In flight");
  });
});
