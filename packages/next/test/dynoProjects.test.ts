import { describe, expect, it } from "vitest";
import {
  projectMatrixOf,
  projectReadinessOf,
  sortProjectRows,
} from "../bench/suite/projects.ts";
import {
  committedOnly,
  NO_RELEASE,
  planOf,
  type WorkContainer,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "../bench/suite/work.ts";

// The roadmap's Projects view (CS-693): a small tracker, by hand.

/** An item; `needs` are its open needs unless `done` lists them. */
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
const project = (id: string, title: string): WorkContainer => ({
  id,
  title,
  state: "planned",
  path: `p/${id}`,
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

/** Fills in `open_needs`, `needed_by`, `ready` and `blocked` from `needs`. */
function linked(items: WorkItem[]): WorkItem[] {
  const of = new Map(items.map((i) => [i.id, i]));
  const open = (id: string) => {
    const x = of.get(id);
    return !x || (x.state !== "done" && x.state !== "dropped");
  };
  return items.map((it) => {
    const open_needs = it.needs.filter(open);
    const isOpen = it.state !== "done" && it.state !== "dropped";
    return {
      ...it,
      open_needs,
      needed_by: items.filter((x) => x.needs.includes(it.id)).map((x) => x.id),
      ready: isOpen && it.state !== "in-progress" && !open_needs.length,
      blocked: isOpen && open_needs.length > 0,
    };
  });
}

// Three projects: Core (CS-2), Frames (CS-3, a lower lane), Tools (CS-4).
// alpha.1 (CS-90) needs milestone CS-300: Core's CS-20 (done), CS-21
// (in progress), CS-22 (needs CS-21), CS-23 (needs CS-22 and Frames'
// CS-30) and CS-24 (needs CS-30).
// beta.1 (CS-91) needs alpha.1 and CS-310: Frames' CS-31 (needs the
// owner's decision CS-40 in Tools) and Tools' CS-41 (needs an outside
// wait, CS-42). CS-32 is Frames' and in no milestone: CS-31 needs it,
// so beta.1 pulls it in. CS-50 is in no release and needs CS-22.
const s: WorkSnapshot = {
  api_version: 3,
  source: "test",
  generated: "2026-11-18T00:00:00Z",
  items: linked([
    item("CS-20", { state: "done" }),
    item("CS-21", { state: "in-progress", claimed_by: "s1" }),
    item("CS-22", { needs: ["CS-21"] }),
    item("CS-23", { needs: ["CS-22", "CS-30"] }),
    item("CS-24", { needs: ["CS-30"] }),
    item("CS-30", { project: "CS-3" }),
    item("CS-31", { project: "CS-3", needs: ["CS-40", "CS-32"] }),
    item("CS-32", { project: "CS-3" }),
    item("CS-40", {
      project: "CS-4",
      kind: "decision",
      decider: "owner",
      title: "Which frame is the default?",
    }),
    item("CS-41", { project: "CS-4", needs: ["CS-42"] }),
    item("CS-42", {
      project: "CS-4",
      kind: "external",
      waiting_on: "a partner",
    }),
    item("CS-50", { project: "CS-4", needs: ["CS-22"] }),
    item("CS-90", {
      title: "Release 2.0.0-alpha.1",
      release: "2.0.0-alpha.1",
      needs: ["CS-300"],
    }),
    item("CS-91", {
      title: "Release 2.0.0-beta.1",
      release: "2.0.0-beta.1",
      needs: ["CS-90", "CS-310"],
    }),
  ]),
  milestones: [
    ms("CS-300", ["CS-20", "CS-21", "CS-22", "CS-23", "CS-24"]),
    ms("CS-310", ["CS-31", "CS-41"], { project: "CS-3" }),
    // Proposed: Frames' CS-30 too, for beta.1 when proposals are shown.
    ms("CS-320", ["CS-30"], { project: "CS-3", state: "proposed" }),
  ],
  projects: [
    project("CS-2", "Core"),
    project("CS-3", "Frames"),
    project("CS-4", "Tools"),
  ],
  long_outcomes: [],
  project_deps: [],
  problems: [],
  elsewhere: [],
  history: [],
};

describe("the Projects view by release (CS-693)", () => {
  const r = projectReadinessOf(committedOnly(s));
  const row = (id: string) => r.rows.find((x) => x.id === id)!;

  it("has a column per release in ladder order, then no release", () => {
    expect(r.columns.map((c) => [c.id, c.name])).toEqual([
      ["CS-90", "2.0.0-alpha.1"],
      ["CS-91", "2.0.0-beta.1"],
      [NO_RELEASE, "No release"],
    ]);
  });

  it("counts each project's items a release needs, by stage", () => {
    const core = row("CS-2").cells;
    expect(core[0]!.items).toEqual([
      "CS-20",
      "CS-21",
      "CS-22",
      "CS-23",
      "CS-24",
    ]);
    expect(core[0]!.counts).toEqual({
      Proposed: 0,
      Waiting: 3,
      Ready: 0,
      "In flight": 1,
      Done: 1,
    });
    // beta.1 needs nothing more from Core.
    expect(core[1]).toBeUndefined();
    // Frames: CS-30 is in no milestone, but alpha.1 pulls it in through
    // CS-23; CS-32 is in no milestone and beta.1 pulls it in.
    const frames = row("CS-3").cells;
    expect(frames[0]!.items).toEqual(["CS-30"]);
    expect(frames[1]!.items).toEqual(["CS-31", "CS-32"]);
    expect(frames[1]!.counts.Waiting).toBe(1);
    expect(frames[1]!.counts.Ready).toBe(1);
    // Tools: beta.1 needs CS-41, and pulls in the decision and the
    // outside wait it waits on, which no milestone holds; CS-50 is in no
    // release.
    const tools = row("CS-4").cells;
    expect(tools[1]!.items).toEqual(["CS-40", "CS-41", "CS-42"]);
    expect(tools[1]!.counts.Ready).toBe(2);
    expect(tools[1]!.counts.Waiting).toBe(1);
    expect(tools[2]!.items).toEqual(["CS-50"]);
  });

  it("names what blocks a cell's items: decisions, outside waits, other projects' items", () => {
    const core = row("CS-2").cells[0]!;
    // CS-22 waits on CS-21, Core's own, so only CS-30 is named.
    expect(core.blockers).toEqual([
      { id: "CS-30", kind: "work", project: "CS-3", holds: ["CS-23", "CS-24"] },
    ]);
    expect(row("CS-3").cells[1]!.blockers).toEqual([
      { id: "CS-40", kind: "decision", project: "CS-4", holds: ["CS-31"] },
    ]);
    expect(row("CS-4").cells[1]!.blockers).toEqual([
      { id: "CS-42", kind: "external", project: "CS-4", holds: ["CS-41"] },
    ]);
  });

  it("counts what each project holds up in other projects, and for which releases", () => {
    // Frames' CS-30 holds up Core's CS-23 and CS-24 (alpha.1).
    expect(row("CS-3").holdsUp).toEqual({
      items: ["CS-23", "CS-24"],
      projects: ["CS-2"],
      releases: ["CS-90"],
    });
    // Core's CS-21 and CS-22 hold up Tools' CS-50, in no release.
    expect(row("CS-2").holdsUp).toEqual({
      items: ["CS-50"],
      projects: ["CS-4"],
      releases: [],
    });
    // Tools' decision holds up Frames' CS-31 (beta.1).
    expect(row("CS-4").holdsUp).toEqual({
      items: ["CS-31"],
      projects: ["CS-3"],
      releases: ["CS-91"],
    });
  });

  it("takes what sets each release's finish from the Plan view's chains", () => {
    const plan = planOf(committedOnly(s));
    for (const rel of plan.releases) {
      expect(r.chains.get(rel.id)).toEqual(rel.chain);
    }
    // alpha.1's last item is CS-24, after Frames' CS-30; beta.1's is
    // CS-41, whose outside wait takes no slot.
    expect(r.chains.get("CS-90")).toEqual(["CS-30", "CS-24"]);
    expect(r.chains.get("CS-91")).toEqual(["CS-41"]);
    expect(row("CS-2").finishing).toEqual(["CS-90"]);
    expect(row("CS-3").finishing).toEqual(["CS-90"]);
    expect(row("CS-4").finishing).toEqual(["CS-91"]);
    expect(row("CS-2").cells[0]).toMatchObject({
      finishing: ["CS-24"],
      finishes: ["CS-90"],
    });
    expect(row("CS-3").cells[1]).toMatchObject({ finishing: [], finishes: [] });
  });

  it("puts the owner's decisions that hold up release work in their project's row", () => {
    expect(row("CS-4").decisions).toEqual([
      {
        id: "CS-40",
        title: "Which frame is the default?",
        waiting: ["CS-31"],
        releases: ["CS-91"],
      },
    ]);
    expect(row("CS-2").decisions).toEqual([]);
  });

  it("sorts by what each project holds up, bottlenecks first", () => {
    // Frames holds up two items; Core and Tools one each, both setting
    // one release's finish, so by number.
    expect(sortProjectRows(r.rows, "holds").map((x) => x.id)).toEqual([
      "CS-3",
      "CS-2",
      "CS-4",
    ]);
    expect(sortProjectRows(r.rows, "project").map((x) => x.id)).toEqual([
      "CS-2",
      "CS-3",
      "CS-4",
    ]);
  });

  it("counts items of proposed milestones only when proposals are shown", () => {
    const p = projectReadinessOf(s, undefined, true);
    const frames = p.rows.find((x) => x.id === "CS-3")!.cells;
    // CS-30's milestone is proposed and in no release, yet alpha.1
    // reaches it: its milestone's column wins, so it sits in no release.
    expect(frames[2]!.items).toEqual(["CS-30"]);
    expect(frames[2]!.proposed).toEqual(["CS-30"]);
  });
});

describe("the Projects view's dependency matrix (CS-693)", () => {
  // Five projects. A (CS-2) and B (CS-3) wait on each other: a loop. C
  // (CS-4) waits on A heavily; D (CS-5) waits on E (CS-6) only; E waits
  // on nothing. By number, C would sit between B and D; coupling puts it
  // right after the loop it waits on.
  const ids = ["CS-2", "CS-3", "CS-4", "CS-5", "CS-6"];
  const items = linked([
    item("CS-10", { project: "CS-2", needs: ["CS-20"] }),
    item("CS-11", { project: "CS-2" }),
    item("CS-20", { project: "CS-3", needs: ["CS-11"] }),
    item("CS-30", { project: "CS-4", needs: ["CS-10"] }),
    item("CS-31", { project: "CS-4", needs: ["CS-11"] }),
    item("CS-40", { project: "CS-5", needs: ["CS-50"] }),
    item("CS-50", { project: "CS-6" }),
  ]);
  const m5: WorkSnapshot = {
    ...s,
    items,
    milestones: [],
    projects: ids.map((id) => project(id, `P${id}`)),
  };

  it("marks the loop and keeps its projects together", () => {
    const m = projectMatrixOf(m5, items);
    expect(m.loops.length).toBe(1);
    expect(new Set(m.loops[0])).toEqual(new Set(["CS-2", "CS-3"]));
    expect(m.loopOf.get("CS-2")).toBe(0);
    expect(m.loopOf.has("CS-4")).toBe(false);
    const at = (id: string) => m.order.indexOf(id);
    expect(Math.abs(at("CS-2") - at("CS-3"))).toBe(1);
  });

  it("orders upstream first and coupled projects together", () => {
    const m = projectMatrixOf(m5, items);
    const at = (id: string) => m.order.indexOf(id);
    // Upstream first, outside the loop.
    expect(at("CS-6")).toBeLessThan(at("CS-5"));
    expect(Math.max(at("CS-2"), at("CS-3"))).toBeLessThan(at("CS-4"));
    // Coupled together: C follows the loop it waits on, and D follows E.
    expect(at("CS-4") - Math.max(at("CS-2"), at("CS-3"))).toBe(1);
    expect(at("CS-5") - at("CS-6")).toBe(1);
    // Inside the loop each needs the other once: by number.
    expect(m.order).toEqual(["CS-2", "CS-3", "CS-4", "CS-6", "CS-5"]);
  });

  it("keeps the cells of dependencyMatrix", () => {
    const m = projectMatrixOf(m5, items);
    expect(m.cells.get("CS-4|CS-2")).toEqual(["CS-30", "CS-31"]);
    expect(m.cells.get("CS-2|CS-3")).toEqual(["CS-10"]);
  });
});
