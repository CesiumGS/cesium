import { describe, expect, it } from "vitest";
import { matchFocus } from "../bench/suite/dependencies.ts";
import type {
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";

// The Path view's chooser (CS-746, CS-775), on a small tracker by hand.
const item = (id: string, over: Partial<WorkItem> = {}): WorkItem => ({
  id,
  title: `Item ${id}`,
  kind: "work",
  state: "planned",
  project: "CS-2",
  needs: [],
  path: `work/items/${id}.md`,
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

const s: WorkSnapshot = {
  api_version: 3,
  source: "test",
  generated: "2026-11-18T00:00:00Z",
  items: [
    item("CS-210"),
    item("CS-211", { state: "in-progress", ready: false }),
    item("CS-212", { state: "done", ready: false }),
    item("CS-213", { state: "dropped", ready: false }),
  ],
  milestones: [
    ms("CS-310", ["CS-210", "CS-211", "CS-212"]),
    ms("CS-311", ["CS-210"], { state: "dropped" }),
  ],
  projects: [],
  long_outcomes: [],
  project_deps: [],
  problems: [],
  elsewhere: [],
  history: [],
};

describe("the Path view's chooser (CS-775, matchFocus)", () => {
  it("finds milestones first, then open items, by every word", () => {
    expect(matchFocus(s, "milestone 31").map((m) => m.id)).toEqual(["CS-310"]);
    expect(matchFocus(s, "cs-21").map((m) => m.id)).toEqual([
      "CS-210",
      "CS-211",
      "CS-212",
    ]);
    expect(matchFocus(s, "  ")).toEqual([]);
  });

  it("leaves dropped work out and keeps to the limit", () => {
    expect(matchFocus(s, "cs-21", 2).map((m) => m.id)).toHaveLength(2);
    expect(matchFocus(s, "cs-213")).toEqual([]);
    expect(matchFocus(s, "cs-311")).toEqual([]);
  });
});
