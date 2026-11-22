// The Work page's Proposals view (CS-750): each proposal grouped by why
// it is proposed, with its header, its age and its call in words
// (bench/suite/workProposals.ts), and the view as it renders.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Root } from "@stratakit/mui";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";
import {
  callQuestionOf,
  GROUP_NAMES,
  PROPOSAL_GROUPS,
  type ProposalRow,
  proposalsViewOf,
  STALE_DAYS,
} from "../bench/suite/workProposals.ts";

const NOW = Date.parse("2026-11-20T12:00:00Z");

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
const milestone = (
  id: string,
  over: Partial<WorkMilestone> = {},
): WorkMilestone => ({
  id,
  title: `Milestone ${id}`,
  kind: "milestone",
  learning: false,
  state: "planned",
  project: "CS-2",
  done_when: [],
  constraints: [],
  contributions: [],
  check_results: [],
  path: `work/milestones/${id}.md`,
  progress: { done: 0, total: 0 },
  check_due: false,
  to_shape: [],
  ...over,
});
const header = (fields: string) => `**Proposal** (CS-686). ${fields}\n\nBody.`;
const DONE_WHEN = "\n\n## Done when\n\n- It works.";

// One fixture per group and exception:
// - CS-10, needed: the planned CS-11 (in the committed CS-50) needs it.
// - CS-12, waiting: the open decision CS-13 comes before its commit.
// - CS-14, new and shaped; CS-15, new, not shaped; CS-16, new, not shaped
//   and filed three weeks ago (stale).
// - CS-17, deferred by its header.
// - CS-18, no header and nothing in the graph: unheaded.
// - CS-60, a proposed milestone with the planned CS-61 inside.
// - CS-19, a header and a dropped need.
// - CS-20, no header but needed by committed work: needed, flagged.
const snapshot: WorkSnapshot = {
  api_version: 3,
  source: "test",
  generated: "2026-11-20T00:00:00Z",
  items: [
    item("CS-10", {
      state: "proposed",
      title: "A shared cache",
      ready: false,
      needed_by: ["CS-11"],
      milestones: [],
      text: header(
        "Source: CS-9's report, 2026-11-18. Why now: CS-11 reads from it. Rough size: small. Decider: the owner. Filed: 2026-11-18.",
      ),
    }),
    item("CS-11", {
      needs: ["CS-10"],
      open_needs: ["CS-10"],
      ready: false,
      blocked: true,
      milestones: ["CS-50"],
    }),
    item("CS-12", {
      state: "proposed",
      needs: ["CS-13"],
      open_needs: ["CS-13"],
      ready: false,
      blocked: true,
      text: header(
        "Source: research. Why now: only if CS-13 says yes. Rough size: medium. Filed: 2026-11-19.",
      ),
    }),
    item("CS-13", {
      kind: "decision",
      decider: "owner",
      title: "Should we cache?",
      needed_by: ["CS-12"],
    }),
    item("CS-14", {
      state: "proposed",
      ready: false,
      milestones: ["CS-50"],
      text:
        header(
          "Source: a review. Why now: it unblocks CS-30. Rough size: small. Filed: 2026-11-17.",
        ) + DONE_WHEN,
    }),
    item("CS-15", {
      state: "proposed",
      ready: false,
      text: header(
        "Source: the owner's words. Why now: users asked. Rough size: large. Decider: Ines. Filed: 2026-11-16.",
      ),
    }),
    item("CS-16", {
      state: "proposed",
      ready: false,
      text: header(
        "Source: a run's follow-up. Why now: it was slow. Rough size: small. Filed: 2026-10-30.",
      ),
    }),
    item("CS-17", {
      state: "proposed",
      ready: false,
      text: header(
        "Source: the owner's deferral, 2026-11-10. Why now: deferred until the second body. Rough size: medium. Filed: 2026-11-10.",
      ),
    }),
    item("CS-18", {
      state: "proposed",
      ready: false,
      created: "2026-11-13",
      project: "CS-3",
      text: "Carried forward from a design list. Marked later.",
    }),
    item("CS-19", {
      state: "proposed",
      ready: false,
      needs: ["CS-21"],
      text:
        header(
          "Source: a review. Why now: it extends CS-21. Rough size: small. Filed: 2026-11-19.",
        ) + DONE_WHEN,
    }),
    item("CS-20", {
      state: "proposed",
      ready: false,
      created: "2026-11-13",
      needed_by: ["CS-50"],
    }),
    item("CS-21", { state: "dropped", reason: "not needed" }),
    item("CS-61", { milestones: ["CS-60"] }),
    item("CS-62", { state: "proposed", milestones: ["CS-60"], ready: false }),
  ],
  milestones: [
    milestone("CS-50", {
      constraints: [
        { id: "CS-11", clause: "c1" },
        { id: "CS-20", clause: "c1" },
      ],
    }),
    milestone("CS-60", {
      state: "proposed",
      title: "A proposed milestone",
      constraints: [
        { id: "CS-61", clause: "c1" },
        { id: "CS-62", clause: "c?" },
      ],
      to_shape: ["clauses"],
      text: header(
        "Source: the plan. Why now: CS-61 is planned inside it. Rough size: medium. Filed: 2026-11-19.",
      ),
    }),
  ],
  projects: [],
  long_outcomes: [],
  project_deps: [],
  problems: [],
  elsewhere: [],
  history: [{ id: "CS-18", at: "2026-11-14T09:00:00Z", state: "proposed" }],
};

const model = proposalsViewOf(snapshot, snapshot.items, snapshot.milestones, {
  now: NOW,
});
const row = (id: string): ProposalRow => {
  const r = model.rows.find((x) => x.id === id);
  if (!r) {
    throw new Error(`no row ${id}`);
  }
  return r;
};

describe("the Proposals view's groups (CS-750)", () => {
  it("puts each proposal in the group of why it's proposed", () => {
    expect(
      Object.fromEntries(
        model.groups.map((g) => [g.group, g.rows.map((r) => r.id)]),
      ),
    ).toEqual({
      needed: ["CS-10", "CS-20"],
      waiting: ["CS-12"],
      new: ["CS-16", "CS-15", "CS-14", "CS-19", "CS-60"],
      deferred: ["CS-17"],
      // By project: CS-62 is in CS-2, CS-18 in CS-3.
      unheaded: ["CS-62", "CS-18"],
    });
  });

  it("leads with the proposals committed work needs", () => {
    expect(model.groups[0]!.group).toBe("needed");
    expect(model.rows[0]!.id).toBe("CS-10");
    expect(row("CS-10").neededBy).toEqual(["CS-11"]);
    // A committed milestone's constraint counts as a need too.
    expect(row("CS-20").neededBy).toEqual(["CS-50"]);
  });

  it("keeps the groups in their order, each named", () => {
    expect(model.groups.map((g) => g.group)).toEqual(PROPOSAL_GROUPS);
    for (const g of PROPOSAL_GROUPS) {
      expect(GROUP_NAMES[g]).toBeTruthy();
    }
  });

  it("reads the source, why now, size, decider and age from the header", () => {
    const r = row("CS-15");
    expect(r.header).toMatchObject({
      source: "the owner's words",
      why: "users asked",
      size: "large",
      decider: "Ines",
    });
    expect(r.decider).toBe("Ines");
    expect(r.since).toEqual({ at: "2026-11-16", from: "header" });
    expect(r.days).toBe(4);
  });

  it("says plainly when a proposal has no header, and dates it from the history", () => {
    const r = row("CS-18");
    expect(r.header).toBeUndefined();
    expect(r.flags).toContain("no-header");
    expect(r.since).toEqual({ at: "2026-11-14T09:00:00Z", from: "history" });
    // In a graph group, the missing header is still flagged.
    expect(row("CS-20").flags).toContain("no-header");
    expect(model.unheaded).toBe(3);
  });

  it("flags a proposed milestone with committed work inside, and lists its constraints", () => {
    const r = row("CS-60");
    expect(r.milestone).toBe(true);
    expect(r.constraints).toEqual([
      { id: "CS-61", state: "planned" },
      { id: "CS-62", state: "proposed" },
    ]);
    expect(r.committedInside).toEqual(["CS-61"]);
    expect(r.flags).toContain("committed-inside");
  });

  it("flags a header two weeks old, and a dropped need", () => {
    expect(row("CS-16").flags).toContain("stale");
    expect(row("CS-15").flags).not.toContain("stale");
    expect(row("CS-19").droppedNeeds).toEqual(["CS-21"]);
    expect(row("CS-19").flags).toContain("need-dropped");
    expect(STALE_DAYS).toBe(14);
  });
});

describe("the Proposals view's calls (CS-750)", () => {
  it("recommends committing what committed work needs, to that work's milestone", () => {
    expect(row("CS-10").recommend).toBe("commit");
    expect(row("CS-10").target).toBe("CS-50");
    expect(row("CS-10").reason).toMatch(/holds that work up/);
  });

  it("recommends holding one that waits on a decision", () => {
    expect(row("CS-12").recommend).toBe("hold");
    expect(row("CS-12").waitsOn).toEqual(["CS-13"]);
    expect(row("CS-12").reason).toMatch(
      /until the decision or study it waits on is answered/,
    );
  });

  it("recommends committing a shaped new one, holding an unshaped one, and dropping a stale unshaped one", () => {
    expect(row("CS-14").recommend).toBe("commit");
    expect(row("CS-14").target).toBe("CS-50");
    expect(row("CS-15").recommend).toBe("hold");
    expect(row("CS-15").reason).toMatch(/shaping/);
    expect(row("CS-16").recommend).toBe("drop");
  });

  it("recommends committing a proposed milestone with planned work inside", () => {
    expect(row("CS-60").recommend).toBe("commit");
    expect(row("CS-60").reason).toMatch(/already planned/);
  });

  it("holds a deferred one, and drops one whose need was dropped", () => {
    expect(row("CS-17").recommend).toBe("hold");
    expect(row("CS-19").recommend).toBe("drop");
    expect(row("CS-19").reason).toMatch(/was dropped/);
  });

  it("names none of a row's own relations in its reason: the view shows each with its title beside it", () => {
    for (const r of model.rows) {
      for (const id of [
        r.target,
        ...r.neededBy,
        ...r.waitsOn,
        ...r.droppedNeeds,
      ]) {
        if (id) {
          expect(r.reason).not.toContain(id);
        }
      }
    }
  });

  it("never recommends dropping a proposal with no header", () => {
    for (const r of model.rows.filter((x) => !x.header)) {
      expect(r.recommend).not.toBe("drop");
    }
    expect(row("CS-18").recommend).toBe("hold");
    expect(row("CS-18").reason).toMatch(/never dropped by default/);
  });

  it("copies a question for the chief of staff, never a command that changes anything", () => {
    const titleOf = (id: string) =>
      snapshot.items.find((i) => i.id === id)?.title ??
      snapshot.milestones.find((m) => m.id === id)?.title;
    const commit = callQuestionOf(row("CS-10"), "commit", titleOf);
    expect(commit).toMatch(
      /^Chief of staff: Commit the proposal CS-10 \(A shared cache\) to CS-50 \(Milestone CS-50\)/,
    );
    expect(commit).toMatch(
      /Why it's proposed: committed work needs it: CS-11 \(Item CS-11\)\. Its header's why now: CS-11 reads from it\./,
    );
    expect(commit).toMatch(/recommends: commit/);
    expect(commit).toMatch(/npx hitld work show CS-10$/);
    const hold = callQuestionOf(row("CS-18"), "hold", titleOf);
    expect(hold).toMatch(/write its header/);
    const drop = callQuestionOf(row("CS-14"), "drop", titleOf);
    expect(drop).toMatch(/with the reason: \(say why\)/);
    expect(callQuestionOf(row("CS-15"), "commit")).toMatch(
      /Its decider is Ines/,
    );
    // The only command shown reads; rc.1 has none that commits or drops.
    for (const r of model.rows) {
      for (const c of ["commit", "hold", "drop"] as const) {
        const cmds = callQuestionOf(r, c).match(/npx hitld [a-z ]+/g) ?? [];
        expect(cmds).toEqual(["npx hitld work show "]);
      }
    }
  });
});

describe("the Proposals view mounts (CS-750)", () => {
  // The page's modules add a style element to the document when loaded;
  // in Node there is none, so these tests lend them a stand-in for that
  // one call and take it back after.
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

  it("takes the built-in Proposals tab's place", async () => {
    const { workView } = await import("../bench/suite/views/workProposals.tsx");
    expect(workView).toMatchObject({ id: "proposals", place: "page" });
    expect(typeof workView.Component).toBe("function");
  });

  it("renders every group, the exceptions first, with each ID's title", async () => {
    const { ProposalsBody } =
      await import("../bench/suite/views/workProposals.tsx");
    const html = renderToString(
      createElement(
        Root,
        { colorScheme: "light" },
        createElement(ProposalsBody, {
          model,
          titleOf: (id: string) =>
            id === "CS-680"
              ? "Triage the open items that fit no release"
              : (snapshot.items.find((i) => i.id === id)?.title ??
                snapshot.milestones.find((m) => m.id === id)?.title),
          now: NOW,
        }),
      ),
    );
    const at = (s: string) => html.indexOf(s);
    expect(at(GROUP_NAMES.needed)).toBeGreaterThan(-1);
    for (const g of PROPOSAL_GROUPS) {
      expect(html).toContain(GROUP_NAMES[g]);
    }
    expect(at("A shared cache")).toBeLessThan(at("Should we cache?"));
    expect(html).toContain("No header");
    expect(html).toContain("Committed work inside");
    expect(html).toContain("Nothing changes from this page");
    // An ID in prose (a group's rule, a reason) is drawn with its title.
    expect(html).toContain("Triage the open items that fit no release");
  });
});
