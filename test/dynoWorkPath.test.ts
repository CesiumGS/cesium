// The Work page's Path view (CS-746): what lies upstream of a target,
// collapsed to milestones (bench/suite/workPath.ts, pathViewOf), its
// spine, gates and ready work, its layout, and the sentence that answers
// "why isn't this done?" (whyNotDone).
import { describe, expect, it } from "vitest";
import type {
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";
import {
  BUNDLE_MIN,
  GROUP_PREFIX,
  type PathView,
  pathTargetOf,
  pathViewOf,
  whyNotDone,
} from "../bench/suite/workPath.ts";

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
const milestone = (
  id: string,
  names: string[],
  over: Partial<WorkMilestone> = {},
): WorkMilestone => ({
  id,
  title: `Milestone ${id}`,
  kind: "milestone",
  learning: false,
  state: "planned",
  project: "CS-2",
  done_when: [],
  constraints: names.map((n) => ({ id: n, clause: "c?" })),
  contributions: [],
  check_results: [],
  path: `packages/next/work/milestones/${id}.md`,
  progress: { done: 0, total: 0 },
  check_due: false,
  to_shape: [],
  ...over,
});

/**
 * A snapshot as the read API gives it: each item's open needs and the
 * milestones that name it are filled in from the rest.
 */
function snap(items: WorkItem[], milestones: WorkMilestone[]): WorkSnapshot {
  const state = new Map<string, string>([
    ...items.map((i) => [i.id, i.state] as const),
    ...milestones.map((m) => [m.id, m.state] as const),
  ]);
  const open = (id: string) =>
    state.has(id) && state.get(id) !== "done" && state.get(id) !== "dropped";
  return {
    api_version: 3,
    source: "test",
    generated: "2026-11-20T00:00:00Z",
    items: items.map((it) => {
      const open_needs = it.needs.filter(open);
      return {
        ...it,
        open_needs,
        ready: it.state === "planned" && !open_needs.length,
        blocked: open_needs.length > 0,
        milestones: milestones
          .filter((m) => m.constraints.some((c) => c.id === it.id))
          .map((m) => m.id),
      };
    }),
    milestones,
    projects: [],
    long_outcomes: [],
    project_deps: [],
    problems: [],
    elsewhere: [],
    history: [],
  };
}

// Two releases. alpha.1 (CS-100) names CS-201, CS-202, CS-204 and three
// more milestones that lead straight to it (CS-207 to CS-209).
//
//  - CS-201's CS-302 needs CS-306, in CS-205, which needs CS-308, in
//    CS-206: chain A, CS-206 → CS-205 → CS-201 → alpha.1. Neither CS-205
//    nor CS-206 is named by anything on the path: each is reached in
//    part (CS-205 holds CS-309 too, which nothing here needs).
//  - CS-202's CS-303 needs the owner's decision CS-310, which needs
//    CS-312, in no milestone: chain B, CS-312 → CS-310 → CS-202 →
//    alpha.1, as long as chain A, with a gate on it.
//  - CS-211 is an outside wait with nothing before it, named by CS-202.
//
// beta.1 (CS-101) needs alpha.1 and CS-203, whose CS-313 needs CS-301,
// in alpha.1's CS-201.
const S = snap(
  [
    item("CS-100", {
      title: "Release 2.0.0-alpha.1",
      release: "2.0.0-alpha.1",
      needs: [
        "CS-201",
        "CS-202",
        "CS-204",
        "CS-207",
        "CS-208",
        "CS-209",
        "CS-200",
      ],
    }),
    item("CS-101", {
      title: "Release 2.0.0-beta.1",
      release: "2.0.0-beta.1",
      needs: ["CS-100", "CS-203"],
    }),
    item("CS-301", { title: "Ready in 201" }),
    item("CS-302", { needs: ["CS-306"] }),
    item("CS-303", { needs: ["CS-310"] }),
    item("CS-304", { state: "done" }),
    item("CS-306", { needs: ["CS-308"] }),
    item("CS-307"),
    item("CS-308"),
    item("CS-309"),
    item("CS-310", {
      title: "Which way?",
      kind: "decision",
      decider: "owner",
      needs: ["CS-312"],
    }),
    item("CS-211", {
      title: "License review",
      kind: "external",
      waiting_on: "legal",
    }),
    item("CS-312", { title: "Groundwork, in no milestone" }),
    item("CS-313", { needs: ["CS-301"] }),
    item("CS-317"),
    item("CS-318", { state: "in-progress" }),
    item("CS-319"),
    item("CS-330", { state: "done" }),
  ],
  [
    milestone("CS-200", ["CS-330"], { state: "done" }),
    milestone("CS-201", ["CS-301", "CS-302"]),
    milestone("CS-202", ["CS-303", "CS-304", "CS-211"]),
    milestone("CS-203", ["CS-313"]),
    milestone("CS-204", ["CS-307"]),
    milestone("CS-205", ["CS-306", "CS-309"]),
    milestone("CS-206", ["CS-308"]),
    milestone("CS-207", ["CS-317"]),
    milestone("CS-208", ["CS-318"]),
    milestone("CS-209", ["CS-319"]),
  ],
);

const node = (v: PathView, id: string) => v.nodes.find((n) => n.id === id);
const ids = (v: PathView) => v.nodes.map((n) => n.id).sort();

describe("pathViewOf: a release as the target", () => {
  const v = pathViewOf(S, "CS-100")!;

  it("draws only what lies upstream, collapsed to milestones", () => {
    expect(v.target).toMatchObject({
      id: "CS-100",
      kind: "release",
      short: "alpha.1",
    });
    // CS-203 is beta.1's, and nothing of alpha.1 needs it; CS-200 is done.
    expect(ids(v)).not.toContain("CS-203");
    expect(ids(v)).not.toContain("CS-200");
    for (const id of ["CS-201", "CS-202", "CS-205", "CS-206", "CS-310"]) {
      expect(ids(v)).toContain(id);
    }
    // Items sit inside their milestones; only one in none is its own node.
    expect(node(v, "CS-302")).toBeUndefined();
    expect(node(v, "CS-312")?.kind).toBe("item");
    expect(node(v, "CS-201")?.items).toEqual(["CS-301", "CS-302"]);
  });

  it("says when a milestone is reached only in part", () => {
    expect(node(v, "CS-201")?.whole).toBe(true);
    expect(node(v, "CS-205")).toMatchObject({
      whole: false,
      items: ["CS-306"],
      openTotal: 2,
    });
  });

  it("takes the longest chain as the spine, and between equal ones the one with more work", () => {
    // Chain A (CS-206, CS-205, CS-201: four work items) and chain B
    // (CS-312, CS-310, CS-202: two) are both three nodes before alpha.1.
    expect(v.spine).toEqual(["CS-206", "CS-205", "CS-201", "CS-100"]);
    expect(v.ties).toBe(1);
    expect(v.chain).toEqual({ milestones: 3, items: 0, gates: 0, releases: 0 });
  });

  it("puts decisions and outside waits on the path as gates", () => {
    expect(node(v, "CS-310")).toMatchObject({
      kind: "decision",
      gate: { who: "owner", answerable: false },
    });
    expect(node(v, "CS-211")).toMatchObject({
      kind: "external",
      gate: { who: "legal", answerable: true },
    });
    // Answerable first.
    expect(v.gates).toEqual(["CS-211", "CS-310"]);
    expect(v.answerable).toEqual(["CS-211"]);
    expect(v.spineGates).toEqual([]);
    expect(v.edges).toContainEqual(
      expect.objectContaining({ from: "CS-312", to: "CS-310" }),
    );
    expect(v.edges).toContainEqual(
      expect.objectContaining({ from: "CS-310", to: "CS-202" }),
    );
  });

  it("marks the work that can start now, on the path and on the spine", () => {
    expect(v.ready).toEqual([
      "CS-301",
      "CS-307",
      "CS-308",
      "CS-312",
      "CS-317",
      "CS-319",
    ]);
    expect(v.spineReady).toEqual(["CS-301", "CS-308"]);
    expect(node(v, "CS-206")?.ready).toEqual(["CS-308"]);
  });

  it(`draws ${BUNDLE_MIN} or more milestones that lead straight to the target as one group`, () => {
    const g = node(v, `${GROUP_PREFIX}CS-100`)!;
    expect(g.kind).toBe("group");
    expect(g.members?.map((m) => m.id)).toEqual([
      "CS-204",
      "CS-207",
      "CS-208",
      "CS-209",
    ]);
    expect(g.ready).toEqual(["CS-307", "CS-317", "CS-319"]);
    expect(g.inFlight).toEqual(["CS-318"]);
    expect(node(v, "CS-204")).toBeUndefined();
    expect(v.edges).toContainEqual(
      expect.objectContaining({ from: g.id, to: "CS-100" }),
    );
    // Gates never join a group, though CS-211 has nothing before it.
    expect(node(v, "CS-211")).toBeDefined();
  });

  it("places every node from the model alone: the spine in the first lane, the target last", () => {
    const seen = new Set<string>();
    for (const n of v.nodes) {
      const at = `${n.layer},${n.lane}`;
      expect(seen.has(at)).toBe(false);
      seen.add(at);
      expect(n.layer).toBe(v.layers - 1 - n.rank);
      expect(n.lane).toBeLessThan(v.lanes);
    }
    v.spine.forEach((id, i) => {
      expect(node(v, id)).toMatchObject({ layer: i, lane: 0, spine: true });
    });
    expect(node(v, "CS-100")?.layer).toBe(v.layers - 1);
    // Every arrow runs forward, and only the spine's are marked.
    for (const e of v.edges) {
      expect(node(v, e.from)!.layer).toBeLessThan(node(v, e.to)!.layer);
    }
    // The spine's arrows come last, so they are drawn on top.
    const spineEdges = v.edges.filter((e) => e.spine);
    expect(spineEdges.map((e) => e.to).sort()).toEqual([
      "CS-100",
      "CS-201",
      "CS-205",
    ]);
    expect(v.edges.slice(-spineEdges.length)).toEqual(spineEdges);
    // The same board always draws the same path.
    expect(pathViewOf(S, "CS-100")).toEqual(v);
  });

  it("answers why it isn't done in items and milestones, never in time", () => {
    const why = whyNotDone(v);
    expect(why.chain).toBe(
      "Its longest chain left runs through 3 milestones, one of 2 as long.",
    );
    expect(why.gates).toBe(
      "2 gates are open on its path; 1 can be answered now.",
    );
    expect(why.start).toBe("6 items can start now, 2 on that chain.");
    expect(Object.values(why).join(" ")).not.toMatch(
      /\b(day|week|hour|date)s?\b/i,
    );
  });
});

describe("pathViewOf: a later release", () => {
  it("draws an earlier release as one node, with its milestones folded in", () => {
    const v = pathViewOf(S, "CS-101")!;
    expect(ids(v)).toEqual(["CS-100", "CS-101", "CS-203"]);
    expect(node(v, "CS-100")).toMatchObject({
      kind: "release",
      release: { short: "alpha.1" },
    });
    // CS-203's item needs one in alpha.1's CS-201: that wait is alpha.1's.
    expect(v.edges).toContainEqual(
      expect.objectContaining({
        from: "CS-100",
        to: "CS-203",
        via: [{ from: "CS-313", to: "CS-301" }],
      }),
    );
    expect(v.spine).toEqual(["CS-100", "CS-203", "CS-101"]);
    expect(whyNotDone(v).chain).toBe(
      "Its longest chain left runs through 1 milestone and 1 earlier release.",
    );
  });
});

describe("pathViewOf: a milestone as the target", () => {
  const v = pathViewOf(S, "CS-201")!;

  it("holds its own items and draws what they wait on", () => {
    expect(v.target.kind).toBe("milestone");
    expect(ids(v)).toEqual(["CS-201", "CS-205", "CS-206"]);
    expect(node(v, "CS-201")?.items).toEqual(["CS-301", "CS-302"]);
    expect(v.spine).toEqual(["CS-206", "CS-205", "CS-201"]);
    expect(v.open).toEqual({ milestones: 2, items: 4 });
  });

  it("with no open upstream, says what is left is its own work", () => {
    const w = pathViewOf(S, "CS-204")!;
    expect(ids(w)).toEqual(["CS-204"]);
    expect(w.spine).toEqual(["CS-204"]);
    expect(w.edges).toEqual([]);
    expect(w.layers).toBe(1);
    expect(whyNotDone(w)).toEqual({
      chain:
        "Nothing outside it is open upstream: what is left is its own work.",
      gates: "No gate is open on its path.",
      start: "1 item can start now.",
    });
  });

  it("calls a done target done", () => {
    const w = pathViewOf(S, "CS-200")!;
    expect(whyNotDone(w).chain).toBe("It is done.");
  });
});

describe("pathViewOf: an item as the target", () => {
  it("follows its needs into the milestones that hold them", () => {
    const v = pathViewOf(S, "CS-302")!;
    expect(v.target).toMatchObject({
      kind: "item",
      milestones: ["CS-201"],
    });
    expect(ids(v)).toEqual(["CS-205", "CS-206", "CS-302"]);
    expect(v.spine).toEqual(["CS-206", "CS-205", "CS-302"]);
  });

  it("with no open upstream, says nothing it needs is open and that it can start", () => {
    const v = pathViewOf(S, "CS-301")!;
    expect(ids(v)).toEqual(["CS-301"]);
    expect(whyNotDone(v)).toEqual({
      chain: "Nothing it needs is open.",
      gates: "No gate is open on its path.",
      start: "It can start now.",
    });
  });

  it("goes through a gate when the item waits on a decision", () => {
    const v = pathViewOf(S, "CS-303")!;
    expect(v.spine).toEqual(["CS-312", "CS-310", "CS-303"]);
    expect(v.spineGates).toEqual(["CS-310"]);
    expect(v.chain).toEqual({ milestones: 0, items: 1, gates: 1, releases: 0 });
    expect(whyNotDone(v).gates).toBe(
      "1 gate is open on its path, 1 on that chain; none can be answered yet.",
    );
  });
});

describe("pathViewOf: the rules at the edges", () => {
  it("picks between equal chains with equal work by the lower numbers", () => {
    const s = snap(
      [
        item("CS-1", { needs: ["CS-3"] }),
        item("CS-2", { needs: ["CS-4"] }),
        item("CS-3"),
        item("CS-4"),
        item("CS-9", { needs: ["CS-1", "CS-2"] }),
      ],
      [],
    );
    const v = pathViewOf(s, "CS-9")!;
    expect(v.spine).toEqual(["CS-3", "CS-1", "CS-9"]);
    expect(v.ties).toBe(1);
    expect(node(v, "CS-4")?.lane).toBe(1);
  });

  it("leaves out an arrow that closes a loop between milestones, and names it", () => {
    const s = snap(
      [
        item("CS-11", { needs: ["CS-22"] }),
        item("CS-12"),
        item("CS-21"),
        item("CS-22", { needs: ["CS-12"] }),
      ],
      [
        milestone("CS-50", ["CS-51", "CS-52"]),
        milestone("CS-51", ["CS-11", "CS-12"]),
        milestone("CS-52", ["CS-21", "CS-22"]),
      ],
    );
    const v = pathViewOf(s, "CS-50")!;
    expect(v.loops).toHaveLength(1);
    expect(
      v.edges.some(
        (e) => e.from === v.loops[0]!.from && e.to === v.loops[0]!.to,
      ),
    ).toBe(false);
    for (const e of v.edges) {
      expect(node(v, e.from)!.layer).toBeLessThan(node(v, e.to)!.layer);
    }
  });

  it("adds proposed milestones only when asked, and always draws a proposed target", () => {
    const s = snap(
      [
        item("CS-1", { release: "2.0.0-alpha.1", needs: ["CS-5", "CS-6"] }),
        item("CS-7"),
        item("CS-8"),
      ],
      [
        milestone("CS-5", ["CS-7"]),
        milestone("CS-6", ["CS-8"], { state: "proposed" }),
      ],
    );
    expect(ids(pathViewOf(s, "CS-1")!)).toEqual(["CS-1", "CS-5"]);
    const shown = pathViewOf(s, "CS-1", { proposals: true })!;
    expect(ids(shown)).toEqual(["CS-1", "CS-5", "CS-6"]);
    expect(node(shown, "CS-6")?.proposed).toBe(true);
    expect(pathViewOf(s, "CS-6")?.target.proposed).toBe(true);
  });

  it("is undefined for an ID the board doesn't have", () => {
    expect(pathViewOf(S, "CS-9999")).toBeUndefined();
  });
});

describe("pathTargetOf: the target from the URL", () => {
  it("takes a milestone or item from focus=, else the release", () => {
    expect(pathTargetOf(S, "CS-201", "CS-100")).toEqual({
      id: "CS-201",
      kind: "milestone",
    });
    expect(pathTargetOf(S, "CS-302", "CS-100")).toEqual({
      id: "CS-302",
      kind: "item",
    });
    expect(pathTargetOf(S, "CS-101", "CS-100")).toEqual({
      id: "CS-101",
      kind: "release",
    });
    expect(pathTargetOf(S, undefined, "CS-100")).toEqual({
      id: "CS-100",
      kind: "release",
    });
    expect(pathTargetOf(S, "CS-9999", "CS-100")?.id).toBe("CS-100");
    expect(pathTargetOf(S, undefined, undefined)).toBeUndefined();
  });
});
