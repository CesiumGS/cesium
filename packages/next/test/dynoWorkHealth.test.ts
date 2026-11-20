// The Work page's Health view (CS-745): the work graph's exceptions, each
// with a proposed fix (bench/suite/workHealth.ts). One fixture per kind of
// exception; the two milestone loops and the CS-341 release crossing are
// rebuilt from the tracker as it stood before the owner fixed them on
// 2026-11-20 (commits 5251b4ec9a and 19d98830f4), with their real IDs.
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { Root } from "@stratakit/mui";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  WorkItem,
  WorkLive,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";
import {
  HEALTH_KIND_DEFS,
  HEALTH_KINDS,
  healthForOwner,
  healthInScope,
  healthOf,
  type HealthException,
  releaseExceptionsOf,
  type Words,
  wordsText,
} from "../bench/suite/workHealth.ts";

// Every ID on the page is a router link that opens the pane. Node has no
// window for a router, so this file draws a link as a plain anchor.
vi.mock("@tanstack/react-router", async (actual) => ({
  ...(await actual<typeof import("@tanstack/react-router")>()),
  Link: ({
    children,
    className,
    "aria-label": label,
  }: {
    children?: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => createElement("a", { className, "aria-label": label }, children),
}));

const NOW = "2026-11-20T12:00:00Z";

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
  created: "2026-11-18",
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
  path: `packages/next/work/milestones/${id}.md`,
  progress: { done: 0, total: 0 },
  check_due: false,
  to_shape: [],
  ...over,
});
const release = (id: string, version: string, needs: string[]) =>
  item(id, {
    title: `Release ${version}`,
    release: version,
    needs,
    ready: false,
  });

/**
 * A snapshot from items and milestones, with what the read API derives:
 * each item's milestones, open needs and the open items that need it.
 */
function snap(
  items: WorkItem[],
  milestones: WorkMilestone[],
  over: Partial<WorkSnapshot> = {},
): WorkSnapshot {
  const done = new Set(
    [...items, ...milestones]
      .filter((x) => x.state === "done")
      .map((x) => x.id),
  );
  const holders = new Map<string, string[]>();
  for (const m of milestones) {
    for (const c of m.constraints) {
      holders.set(c.id, [...(holders.get(c.id) ?? []), m.id]);
    }
  }
  const all = items.map((it) => ({
    ...it,
    milestones: holders.get(it.id) ?? [],
    open_needs: it.needs.filter((n) => !done.has(n)),
  }));
  for (const it of all) {
    it.needed_by = all
      .filter((x) => x.state !== "done" && x.needs.includes(it.id))
      .map((x) => x.id);
    it.blocked = it.open_needs.length > 0;
    it.ready = it.state === "planned" && !it.blocked;
  }
  return {
    api_version: 3,
    source: "test",
    generated: NOW,
    items: all,
    milestones,
    projects: [],
    long_outcomes: [],
    project_deps: [],
    problems: [],
    elsewhere: [],
    history: [],
    ...over,
  };
}
const ms = (id: string, ids: string[], over: Partial<WorkMilestone> = {}) =>
  milestone(id, {
    constraints: ids.map((c) => ({ id: c, clause: "c?" })),
    ...over,
  });

const text = (x: Words) => wordsText(x);
const ids = (x: Words) =>
  x.flatMap((p) => (typeof p === "string" ? [] : [p.id]));
const ofKind = (es: readonly HealthException[], k: string) =>
  es.filter((e) => e.kind === k);

// ------------------------------------------------------------ fixtures

// Tonight's first loop: CS-88 sat in both CS-458 (alpha.1) and CS-462
// (beta.1). CS-508 in CS-458 needs CS-88, and CS-95 in CS-462 needs it
// too, so each milestone waited on the other.
const loopA = {
  items: [
    item("CS-88", { title: "One-off engine loads onto `Jobs`" }),
    item("CS-508", {
      title: "Retries for the one-off worker loads",
      needs: ["CS-88"],
    }),
    item("CS-87", { title: "Content decode with priorities" }),
    item("CS-95", {
      title: "The inspector's Jobs section",
      needs: ["CS-87", "CS-88"],
    }),
  ],
  milestones: [
    ms("CS-458", ["CS-508", "CS-88"], {
      title:
        "Every fetch has a deadline and retries within its origin's budget",
    }),
    ms("CS-462", ["CS-87", "CS-88", "CS-95"], {
      title: "Loads and decodes run on Jobs",
    }),
  ],
};

// Tonight's second loop: CS-390, CS-393, CS-394 and CS-404 sat in CS-722
// and in one of CS-478, CS-479 and CS-480 each. Items on both sides need
// them (CS-721 and CS-391 need CS-390, say), so the four milestones
// waited on each other.
const loopB = {
  items: [
    item("CS-390", { title: "Run identity and the machine-wide run lock" }),
    item("CS-393", {
      title: "The settings registry and multi-axis sweeps",
      needs: ["CS-390"],
    }),
    item("CS-394", {
      title: "Example scenes and the development metrics",
      needs: ["CS-393"],
    }),
    item("CS-404", {
      title: "Studies: the model, the files and the commands",
      needs: ["CS-390"],
    }),
    item("CS-391", { title: "Run intent", needs: ["CS-390"] }),
    item("CS-395", { title: "Sweeps", needs: ["CS-393", "CS-394"] }),
    item("CS-405", { title: "Study verdicts", needs: ["CS-404"] }),
    item("CS-721", { title: "A dyno command", needs: ["CS-390"] }),
    item("CS-733", {
      title: "Each run records its device, configuration and state",
      needs: ["CS-390", "CS-721"],
    }),
    item("CS-739", {
      title: "Studies across devices",
      needs: ["CS-404", "CS-733"],
    }),
    item("CS-740", {
      title: "A verdict says whether it carries to another hardware class",
      needs: ["CS-739", "CS-394"],
    }),
  ],
  milestones: [
    ms("CS-478", ["CS-390", "CS-391"], {
      title: "Every run says what it was for",
    }),
    ms("CS-479", ["CS-393", "CS-394", "CS-395"], {
      title: "Sweeps measure development cases",
    }),
    ms("CS-480", ["CS-404", "CS-405"], {
      title: "Studies turn runs into verdicts",
    }),
    ms(
      "CS-722",
      [
        "CS-390",
        "CS-721",
        "CS-733",
        "CS-404",
        "CS-739",
        "CS-393",
        "CS-394",
        "CS-740",
      ],
      {
        title:
          "Benchmark results are shared across machines, and dyno is one command",
      },
    ),
  ],
};

// The CS-341 crossing: beta.1 needs CS-595, whose CS-592 (the VR button)
// needs CS-341 (WebXR), which sat in CS-534, a proposed milestone in no
// release.
const crossing = {
  items: [
    item("CS-341", {
      title: "WebXR, including aligning a model with its site",
    }),
    item("CS-592", { title: "The VR button widget", needs: ["CS-341"] }),
  ],
  milestones: [
    ms("CS-534", ["CS-341"], {
      title: "Infrastructure and geoscience data shows in 2.0",
      state: "proposed",
      project: "CS-196",
    }),
    ms("CS-595", ["CS-592"], {
      title: "Every 1.x widget's job has a StrataKit widget",
      project: "CS-584",
    }),
  ],
};

const releases = [
  release("CS-530", "2.0.0-alpha.1", ["CS-458", "CS-722"]),
  release("CS-531", "2.0.0-beta.1", [
    "CS-530",
    "CS-462",
    "CS-478",
    "CS-479",
    "CS-480",
    "CS-595",
  ]),
];

const tonight = () =>
  snap(
    [...releases, ...loopA.items, ...loopB.items, ...crossing.items],
    [...loopA.milestones, ...loopB.milestones, ...crossing.milestones],
  );

// ------------------------------------------------------------ the kinds

describe("healthOf", () => {
  it("lists tonight's two milestone loops, naming the items that tie them", () => {
    const loops = ofKind(healthOf(tonight()).exceptions, "loop");
    expect(loops.map((e) => e.id)).toEqual(["CS-458", "CS-478"]);
    const [a, b] = loops;

    // CS-458 and CS-462: CS-88 in both; keep it in alpha.1's milestone.
    expect(ids(a!.what)).toEqual(
      expect.arrayContaining(["CS-458", "CS-462", "CS-508"]),
    );
    expect(text(a!.what)).toMatch(/^CS-458 and CS-462 wait on each other/);
    expect(text(a!.fix)).toBe(
      "Keep CS-88 in one milestone: in CS-458, whose release (alpha.1) needs it first, and out of CS-462. Being in both ties them.",
    );
    expect(a!.edit).toBe("CS-462");
    expect(a!.owner).toBe(true);
    expect(a!.releases).toEqual(["CS-530", "CS-531"]);

    // The four: each item in CS-722 and one other.
    expect(text(b!.what)).toMatch(
      /^CS-478, CS-479, CS-480 and CS-722 wait on each other/,
    );
    expect(text(b!.fix)).toBe(
      "Keep each item in one milestone: CS-390, CS-393, CS-394 and CS-404 are each in two of the loop's milestones, and that ties them.",
    );
    expect(b!.involves).toEqual(
      expect.arrayContaining(["CS-390", "CS-393", "CS-394", "CS-404"]),
    );
  });

  it("names the smallest wait when no item is in two of a loop's milestones", () => {
    const s = snap(
      [
        item("CS-10"),
        item("CS-11", { needs: ["CS-20"] }),
        item("CS-20"),
        item("CS-21", { needs: ["CS-10"] }),
      ],
      [ms("CS-1", ["CS-10", "CS-11"]), ms("CS-3", ["CS-20", "CS-21"])],
    );
    const [loop] = ofKind(healthOf(s).exceptions, "loop");
    expect(text(loop!.fix)).toMatch(
      /^Break the smallest wait: move CS-1[01] out of CS-[13]/,
    );
  });

  it("lists the CS-341 release crossing with the move that ended it", () => {
    const [c] = ofKind(healthOf(tonight()).exceptions, "crossing");
    expect(c!.id).toBe("CS-341");
    expect(text(c!.what)).toBe(
      "beta.1 needs it through CS-595 and CS-592, and it sits in CS-534 (a proposal in no release), which beta.1 doesn't need.",
    );
    expect(text(c!.fix)).toBe(
      "Move it out of CS-534 into CS-595 (beta.1), where CS-592 needs it. Or add CS-534 to beta.1.",
    );
    expect(c!.edit).toBe("CS-534");
    expect(c!.releases).toEqual(["CS-531"]);
    expect(c!.owner).toBe(true);
  });

  it("lists a release's direct need on an item and a milestone it doesn't need", () => {
    const s = snap(
      [
        release("CS-100", "2.0.0-alpha.1", ["CS-200", "CS-300"]),
        item("CS-300"),
        item("CS-301"),
      ],
      [ms("CS-200", ["CS-201"]), ms("CS-201", ["CS-301"])],
    );
    const cs = ofKind(healthOf(s).exceptions, "crossing");
    expect(cs.map((c) => c.id)).toEqual(["CS-201", "CS-300"]);
    expect(text(cs[0]!.fix)).toBe(
      "Add CS-201 to alpha.1, or take it out of CS-200's constraints.",
    );
    expect(text(cs[1]!.fix)).toBe(
      "Move it into one of alpha.1's milestones, and take it off alpha.1's needs.",
    );
  });

  it("lists items in two milestones, keeping each where it is needed first", () => {
    const two = ofKind(healthOf(tonight()).exceptions, "two-milestones");
    expect(two.map((e) => e.id)).toEqual([
      "CS-88",
      "CS-390",
      "CS-393",
      "CS-394",
      "CS-404",
    ]);
    expect(text(two[0]!.what)).toBe(
      "Named by 2 milestones: CS-458 (alpha.1) and CS-462 (beta.1).",
    );
    expect(text(two[0]!.fix)).toBe(
      "Keep it in CS-458, whose release (alpha.1) needs it first: take it out of CS-462.",
    );
    // Both in one release: no milestone comes first.
    const same = snap(
      [release("CS-100", "2.0.0-alpha.1", ["CS-1", "CS-3"]), item("CS-10")],
      [ms("CS-1", ["CS-10"]), ms("CS-3", ["CS-10"])],
    );
    expect(
      text(ofKind(healthOf(same).exceptions, "two-milestones")[0]!.fix),
    ).toBe(
      "Keep it in one milestone: take it out of all but one of CS-1 and CS-3.",
    );
  });

  it("lists planned work in no milestone, not decisions, outside waits, proposals or releases", () => {
    const s = snap(
      [
        release("CS-100", "2.0.0-alpha.1", ["CS-600"]),
        item("CS-577", {
          title: "Spike: subdivision surfaces",
          project: "CS-193",
        }),
        item("CS-312", { needs: ["CS-577"], project: "CS-193" }),
        item("CS-578", { project: "CS-579" }),
        item("CS-800", { kind: "decision", decider: "owner" }),
        item("CS-801", { kind: "external", waiting_on: "legal" }),
        item("CS-802", { state: "proposed" }),
        item("CS-803", { state: "done" }),
      ],
      [ms("CS-600", ["CS-312"], { project: "CS-193" })],
    );
    const loose = ofKind(healthOf(s).exceptions, "no-milestone");
    expect(loose.map((e) => e.id)).toEqual(["CS-577", "CS-578"]);
    expect(text(loose[0]!.fix)).toBe(
      "Add it to CS-600, which holds CS-312 that needs it. Or drop it, if no outcome needs it.",
    );
    expect(loose[0]!.releases).toEqual(["CS-100"]);
    expect(text(loose[1]!.fix)).toBe(
      "Give CS-579 a milestone this item serves, or drop the item if no outcome needs it.",
    );
  });

  it("lists decisions whose default is due within two days, when the record has one", () => {
    const due = (deadline: string) =>
      Object.assign(item("CS-0", { kind: "decision", decider: "owner" }), {
        deadline,
        default: "Option A",
      });
    const s = snap(
      [
        { ...due("2026-11-21T12:00:00Z"), id: "CS-900" },
        { ...due("2026-11-25T12:00:00Z"), id: "CS-901" },
      ],
      [],
    );
    const h = healthOf(s);
    const d = ofKind(h.exceptions, "decision-due");
    expect(d.map((e) => e.id)).toEqual(["CS-900"]);
    expect(text(d[0]!.what)).toBe(
      "Its default is taken in 1 day unless it is answered.",
    );
    expect(text(d[0]!.fix)).toBe(
      "Answer it, or let its default stand: Option A.",
    );
    expect(h.unread.map((u) => u.kind)).not.toContain("decision-due");

    // Without the field, the view says it can't tell.
    const none = healthOf(snap([item("CS-902", { kind: "decision" })], []));
    expect(none.unread.find((u) => u.kind === "decision-due")?.why).toMatch(
      /can't be told/,
    );
  });

  it("lists proposals older than the set age, by their header's date or their creation", () => {
    const s = snap(
      [
        item("CS-700", { state: "proposed", created: "2026-10-30" }),
        item("CS-701", { state: "proposed", created: "2026-11-15" }),
        item("CS-702", {
          state: "proposed",
          created: "2026-11-19",
          text: "**Proposal** Source: a review. Filed: 2026-10-01.",
        }),
      ],
      [
        milestone("CS-710", {
          state: "proposed",
          created: "2026-10-01",
        } as never),
      ],
    );
    const old = ofKind(healthOf(s).exceptions, "old-proposal");
    expect(old.map((e) => e.id)).toEqual(["CS-700", "CS-702", "CS-710"]);
    expect(text(old[0]!.what)).toBe("Filed 21 days ago, and still a proposal.");
    expect(text(old[0]!.fix)).toBe(
      "Commit it (state: planned) or drop it with a reason.",
    );
  });

  it("lists spend past appetite, and says when no milestone has one", () => {
    const s = snap(
      [
        item("CS-30", { tokens_spent: 8000, state: "done" }),
        item("CS-31", { estimate_tokens: 5000 }),
        item("CS-32", { tokens_spent: 1000 }),
      ],
      [
        ms("CS-3", ["CS-30", "CS-31"], { appetite_tokens: 10000 }),
        ms("CS-4", ["CS-32"], { appetite_tokens: 10000 }),
      ],
    );
    const a = ofKind(healthOf(s).exceptions, "appetite");
    expect(a.map((e) => e.id)).toEqual(["CS-3"]);
    expect(text(a[0]!.what)).toBe(
      "8k tokens spent and 5k still estimated, past its appetite of 10k.",
    );
    expect(
      healthOf(tonight()).unread.find((u) => u.kind === "appetite")?.why,
    ).toMatch(/No open milestone has an appetite/);
  });

  const live = (over: Partial<WorkLive> = {}): WorkLive => ({
    read_at: NOW,
    main_branch: "main",
    run: {
      ok: true,
      source: "hitld run status",
      read_at: NOW,
      in_flight: 0,
      waiting_to_merge: 0,
    },
    ledger: {
      ok: true,
      source: "hitld ledger",
      read_at: NOW,
      events: 10,
      problems: 0,
      dispatches: [
        { dispatch: "D-9", item: "CS-51", started_at: "2026-11-20T10:00:00Z" },
      ],
    },
    claims: {
      ok: true,
      source: "hitld work claims",
      read_at: NOW,
      list: [
        {
          id: "CS-33",
          claimed_by: "orch-11-CS-33",
          where: "hitld/CS-33-renderer-seam-extracted",
          worktree: true,
          here: false,
          at: "2026-11-20T09:00:00Z",
        },
        {
          id: "CS-51",
          claimed_by: "D-9",
          where: "hitld/CS-51",
          worktree: true,
          here: false,
        },
      ],
      stale: [
        "claude/plan-dyno-harness-18e1ff",
        "claude/quirky-greider-c85eb3",
        "claude/work-tracker-f930da",
      ].map((where) => ({ id: "CS-174", where, worktree: false, here: false })),
    },
    unmerged: { ok: true, source: "git", read_at: NOW, list: [] },
    ...over,
  });

  it("lists claims with no live dispatch, with the unclaim command", () => {
    const s = snap([item("CS-33"), item("CS-51"), item("CS-174")], [], {
      live: live(),
    });
    const nd = ofKind(healthOf(s).exceptions, "no-dispatch");
    expect(nd.map((e) => e.id)).toEqual(["CS-33"]);
    expect(text(nd[0]!.what)).toBe(
      "Claimed by orch-11-CS-33 on hitld/CS-33-renderer-seam-extracted 3 hours ago, and hitld's ledger has no dispatch in flight for it. A session set up by hand has none either.",
    );
    expect(nd[0]!.command).toBe(
      'npx hitld work unclaim CS-33 --branch hitld/CS-33-renderer-seam-extracted --reason "its session ended"',
    );
    expect(nd[0]!.owner).toBe(false);
  });

  it("lists items still open whose claiming branch main has moved past (CS-174)", () => {
    const s = snap(
      [
        item("CS-174", {
          title:
            "1.x computes NaN for a root without the top-level `geometricError`",
        }),
        item("CS-175", { state: "in-progress", claimed_by: "D-1" }),
      ],
      [],
      { live: live() },
    );
    const m = ofKind(healthOf(s).exceptions, "merged-open");
    expect(m.map((e) => e.id)).toEqual(["CS-174", "CS-175"]);
    expect(text(m[0]!.what)).toBe(
      "Still claimed on 3 branches the main branch has moved past: claude/plan-dyno-harness-18e1ff, claude/quirky-greider-c85eb3 and claude/work-tracker-f930da.",
    );
    expect(m[0]!.command).toBe(
      "git branch -d claude/plan-dyno-harness-18e1ff claude/quirky-greider-c85eb3 claude/work-tracker-f930da",
    );
    expect(text(m[1]!.what)).toMatch(
      /^In progress on this branch, and no branch claims it/,
    );
  });

  it("says it can't tell the live kinds when claims or the ledger can't be read", () => {
    const noLive = healthOf(snap([item("CS-1")], []));
    expect(noLive.unread.map((u) => u.kind)).toEqual(
      expect.arrayContaining(["no-dispatch", "merged-open"]),
    );
    const noLedger = healthOf(
      snap([item("CS-33")], [], {
        live: live({
          ledger: {
            ok: false,
            why: "missing",
            source: "hitld ledger",
            read_at: NOW,
          },
        }),
      }),
    );
    expect(ofKind(noLedger.exceptions, "no-dispatch")).toEqual([]);
    const unread = noLedger.unread.map((u) => u.kind);
    expect(unread).toContain("no-dispatch");
    expect(unread).not.toContain("merged-open");
  });

  it("lists what hitld work check reports", () => {
    const s = snap([item("CS-9")], [], {
      problems: ["CS-9: needs CS-999, which doesn't exist"],
    });
    const [c] = ofKind(healthOf(s).exceptions, "check");
    expect(c!.id).toBe("CS-9");
    expect(c!.command).toBe("npx hitld work check");
  });

  it("finds nothing in a clean graph", () => {
    const s = snap(
      [
        release("CS-100", "2.0.0-alpha.1", ["CS-1"]),
        item("CS-10"),
        item("CS-11", { needs: ["CS-10"] }),
        item("CS-12", { kind: "decision", decider: "owner" }),
      ],
      [ms("CS-1", ["CS-10", "CS-11"])],
      {
        live: live({
          claims: { ok: true, source: "c", read_at: NOW, list: [], stale: [] },
        }),
      },
    );
    const h = healthOf(s);
    expect(h.exceptions).toEqual([]);
    expect(Object.values(h.counts).every((n) => n === 0)).toBe(true);
    expect(healthForOwner(h).count).toBe(0);
  });
});

// ------------------------------------------------------------ the uses

describe("the Health view's uses", () => {
  it("counts the exceptions touching a release, for the Release view", () => {
    const h = healthOf(tonight());
    const beta = releaseExceptionsOf(h, "CS-531").map((e) => e.key);
    expect(beta).toEqual(
      expect.arrayContaining([
        "loop:CS-458",
        "crossing:CS-341",
        "two-milestones:CS-88",
      ]),
    );
    const alpha = releaseExceptionsOf(h, "CS-530").map((e) => e.key);
    expect(alpha).not.toContain("crossing:CS-341");
  });

  it("gives Your move only the exceptions that need the owner", () => {
    const s = snap(
      [...releases, ...loopA.items, item("CS-33")],
      loopA.milestones,
      {
        problems: ["CS-9: a problem"],
        live: {
          read_at: NOW,
          main_branch: "main",
          run: {
            ok: true,
            source: "r",
            read_at: NOW,
            in_flight: 0,
            waiting_to_merge: 0,
          },
          ledger: {
            ok: true,
            source: "l",
            read_at: NOW,
            events: 0,
            problems: 0,
            dispatches: [],
          },
          claims: {
            ok: true,
            source: "c",
            read_at: NOW,
            list: [{ id: "CS-33", where: "b", worktree: false, here: false }],
            stale: [],
          },
          unmerged: { ok: true, source: "g", read_at: NOW, list: [] },
        },
      },
    );
    const h = healthOf(s);
    const mine = healthForOwner(h);
    expect(h.exceptions.map((e) => e.kind)).toEqual(
      expect.arrayContaining([
        "check",
        "loop",
        "two-milestones",
        "no-dispatch",
      ]),
    );
    expect(mine.exceptions.map((e) => e.kind).sort()).toEqual([
      "loop",
      "no-milestone",
      "two-milestones",
    ]);
    expect(mine.count).toBe(mine.exceptions.length);
  });

  it("keeps the exceptions that touch the scope", () => {
    const h = healthOf(tonight());
    const scoped = healthInScope(h, (id) => id === "CS-534");
    expect(scoped.map((e) => e.key)).toEqual(["crossing:CS-341"]);
  });

  it("shows only commands that exist, and every kind has words", () => {
    for (const k of HEALTH_KINDS) {
      expect(HEALTH_KIND_DEFS[k].name).toBeTruthy();
      expect(HEALTH_KIND_DEFS[k].rule).toMatch(/\.$/);
    }
    const all = healthOf(tonight()).exceptions;
    for (const e of all) {
      expect(text(e.fix)).toMatch(/\.$/);
      if (e.command) {
        expect(e.command).toMatch(
          /^(npx hitld work (check|unclaim) |git branch -d )/,
        );
      }
    }
  });
});

// ------------------------------------------------------------ the view

describe("the Health view as it renders (views/workHealth.tsx)", () => {
  const render = async (el: ReactElement) =>
    renderToString(createElement(Root, { colorScheme: "light" }, el));
  // The page's modules add a style element to the document when loaded;
  // in Node there is none, so these tests lend them a stand-in.
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
  const props = (s: WorkSnapshot, release?: string) => ({
    s,
    flight: new Map(),
    items: s.items,
    scoped: false,
    msInScope: () => true,
    search: { view: "health", release },
    set: () => {},
    proposals: false,
    releases: [],
    onRelease: () => {},
    openItem: () => {},
    openList: () => {},
    hasView: () => true,
    goView: () => {},
  });
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, " ");

  it("mounts as the page's Health tab", async () => {
    const { workView } = await import("../bench/suite/views/workHealth.tsx");
    expect(workView).toMatchObject({
      id: "health",
      place: "page",
      label: "Health",
    });
  });

  it("leads with the exceptions that need the owner, each with its fix", async () => {
    const { HealthView } = await import("../bench/suite/views/workHealth.tsx");
    const html = plain(
      await render(createElement(HealthView, props(tonight()))),
    );
    expect(html).toMatch(/Milestone loops/);
    expect(html).toMatch(/Release crossings/);
    expect(html).toMatch(/Needs you/);
    expect(html).toMatch(
      /Move it out of .{0,12}CS-534 Infrastructure and geoscience data shows in 2\.0 into .{0,12}CS-595 Every 1\.x widget's job/,
    );
    expect(html.indexOf("Milestone loops")).toBeLessThan(
      html.indexOf("The other checks"),
    );
  });

  it("says so when the graph is clean", async () => {
    const { HealthView } = await import("../bench/suite/views/workHealth.tsx");
    const clean = snap(
      [release("CS-100", "2.0.0-alpha.1", ["CS-1"]), item("CS-10")],
      [ms("CS-1", ["CS-10"])],
    );
    const html = plain(await render(createElement(HealthView, props(clean))));
    expect(html).toMatch(/Nothing is wrong in the graph/);
    // alpha.1 picked: tonight's crossing is beta.1's, so it isn't shown.
    const alpha = plain(
      await render(createElement(HealthView, props(tonight(), "CS-530"))),
    );
    expect(alpha).toMatch(/Milestone loops/);
    expect(alpha).not.toMatch(/CS-341/);
  });
});
