// The Work page's view shell and its Release view (CS-744): how views
// mount (bench/suite/workModel.ts, mountViews), what a release has left
// and what holds it (releaseViewOf), and the shell's shared parts as they
// render (the Proposed switch, the mounted views' contract).
import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { Root } from "@stratakit/mui";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";
import {
  clausesOf,
  mountViews,
  pickRelease,
  pickView,
  releaseChoicesOf,
  releaseViewOf,
  sinceOf,
  sizeOf,
  sizeText,
  type ViewEntry,
} from "../bench/suite/workModel.ts";

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

// Two releases. alpha.1 (CS-100) needs CS-200 (done), CS-201 and CS-202;
// beta.1 (CS-101) comes after it and needs CS-203. CS-201 and CS-202 both
// name CS-303; CS-305 in CS-201 needs CS-401, which sits in beta.1's
// milestone: a crossing. A decision gates CS-302, an outside wait CS-303.
const snapshot: WorkSnapshot = {
  api_version: 3,
  source: "test",
  generated: "2026-11-20T00:00:00Z",
  items: [
    item("CS-100", {
      title: "Release 2.0.0-alpha.1",
      release: "2.0.0-alpha.1",
      needs: ["CS-200", "CS-201", "CS-202", "CS-204"],
      ready: false,
    }),
    item("CS-101", {
      title: "Release 2.0.0-beta.1",
      release: "2.0.0-beta.1",
      needs: ["CS-100", "CS-203"],
      ready: false,
    }),
    item("CS-301", { milestones: ["CS-201"], estimate_tokens: 1000 }),
    item("CS-302", {
      needs: ["CS-310"],
      open_needs: ["CS-310"],
      ready: false,
      blocked: true,
      milestones: ["CS-201"],
    }),
    item("CS-310", {
      title: "Which way?",
      kind: "decision",
      decider: "owner",
      created: "2026-11-01",
      needed_by: ["CS-302"],
    }),
    item("CS-311", {
      title: "Licence review",
      kind: "external",
      waiting_on: "legal",
      created: "2026-11-05",
      needed_by: ["CS-303"],
    }),
    item("CS-303", {
      needs: ["CS-311"],
      open_needs: ["CS-311"],
      ready: false,
      blocked: true,
      milestones: ["CS-201", "CS-202"],
    }),
    item("CS-304", { state: "done", ready: false, milestones: ["CS-202"] }),
    item("CS-305", {
      needs: ["CS-401"],
      open_needs: ["CS-401"],
      ready: false,
      blocked: true,
      milestones: ["CS-201"],
      estimate_tokens: 3000,
    }),
    item("CS-401", { needed_by: ["CS-305"], milestones: ["CS-203"] }),
    item("CS-402", { state: "proposed", ready: false, milestones: ["CS-204"] }),
  ],
  milestones: [
    milestone("CS-200", { state: "done" }),
    milestone("CS-201", {
      outcome: "One thing works.",
      done_when: [
        { clause: "c1", text: "It runs" },
        { clause: "c2", text: "It is decided" },
      ],
      constraints: [
        { id: "CS-301", clause: "c1" },
        { id: "CS-305", clause: "c1" },
        { id: "CS-302", clause: "c2" },
        { id: "CS-303", clause: "c?" },
      ],
    }),
    milestone("CS-202", {
      done_when: [
        { clause: "c1", text: "The done part" },
        { clause: "c2", text: "Nothing linked" },
        { clause: "c3", text: "The shared part" },
      ],
      constraints: [
        { id: "CS-304", clause: "c1" },
        { id: "CS-303", clause: "c3" },
      ],
      check_results: ["pass 2026-11-19 checker: ran it"],
    }),
    milestone("CS-203", { constraints: [{ id: "CS-401", clause: "c?" }] }),
    milestone("CS-204", {
      state: "proposed",
      constraints: [{ id: "CS-402", clause: "c?" }],
    }),
  ],
  projects: [],
  long_outcomes: [],
  project_deps: [],
  problems: [],
  elsewhere: [],
  history: [{ id: "CS-310", at: "2026-11-12T10:00:00Z", state: "planned" }],
};

describe("the view shell's mounting (workModel.ts, mountViews)", () => {
  const v = (
    id: string,
    place: ViewEntry["place"],
    order: number,
    replaces?: string[],
  ): ViewEntry => ({ id, place, order, ...(replaces ? { replaces } : {}) });
  const builtIn = [
    v("move", "page", 10),
    v("roadmap", "page", 20),
    v("proposals", "page", 60),
  ];

  it("puts each view in its row, in order, a mounted one beside the built-in", () => {
    const out = mountViews(builtIn, [
      v("release", "roadmap", 10),
      v("health", "page", 30),
    ]);
    expect(out.page.map((x) => x.id)).toEqual([
      "move",
      "roadmap",
      "health",
      "proposals",
    ]);
    expect(out.roadmap.map((x) => x.id)).toEqual(["release"]);
    expect(out.problems).toEqual([]);
  });

  it("lets a mounted view take a built-in's place by its ID, and retire another", () => {
    const mine = v("proposals", "page", 60);
    const out = mountViews(
      [...builtIn, v("plan", "roadmap", 10)],
      [mine, v("order", "roadmap", 30, ["plan"])],
    );
    expect(out.page.find((x) => x.id === "proposals")).toBe(mine);
    expect(out.roadmap.map((x) => x.id)).toEqual(["order"]);
  });

  it("names a doubled ID or one that isn't a slug, and keeps the first", () => {
    const first = v("path", "roadmap", 20);
    const out = mountViews(builtIn, [
      first,
      v("path", "roadmap", 25),
      v("Bad ID", "page", 5),
    ]);
    expect(out.roadmap).toEqual([first]);
    expect(out.problems).toEqual([
      'Two views use the ID "path"',
      `A view's ID "Bad ID" isn't a lowercase slug`,
    ]);
  });

  it("opens on the first view when the URL names none that is shown", () => {
    const rows = [v("release", "roadmap", 10), v("path", "roadmap", 20)];
    expect(pickView(rows, undefined)?.id).toBe("release");
    expect(pickView(rows, "no-milestone")?.id).toBe("release");
    expect(pickView(rows, "path")?.id).toBe("path");
  });
});

describe("the release picker", () => {
  it("offers the open releases in ladder order, alpha.1 first and by default", () => {
    const choices = releaseChoicesOf(snapshot, false);
    expect(choices.map((r) => r.short)).toEqual(["alpha.1", "beta.1"]);
    expect(pickRelease(choices, undefined)?.id).toBe("CS-100");
    expect(pickRelease(choices, "CS-101")?.id).toBe("CS-101");
    expect(pickRelease(choices, "CS-999")?.id).toBe("CS-100");
  });
});

describe("the Release view (releaseViewOf)", () => {
  const view = releaseViewOf(snapshot, "CS-100")!;

  it("shows its open milestones as rows and its done ones apart", () => {
    expect(view.release.short).toBe("alpha.1");
    expect(view.milestones.map((m) => m.id)).toEqual(["CS-201", "CS-202"]);
    expect(view.done).toEqual(["CS-200"]);
  });

  it("checks a clause only when its items are done and the check passed", () => {
    const [m1, m2] = view.milestones;
    expect(m1!.clauses.map((c) => [c.clause, c.status, c.open])).toEqual([
      ["c1", "open", ["CS-301", "CS-305"]],
      ["c2", "open", ["CS-302"]],
    ]);
    expect(m1!.unlinked).toEqual(["CS-303"]);
    expect(m1!.checked).toBe(0);
    expect(m2!.clauses.map((c) => c.status)).toEqual([
      "checked",
      "unlinked",
      "open",
    ]);
    expect(m2!.checked).toBe(1);
  });

  it("reads a clause whose items are done but whose check hasn't passed as not checked", () => {
    const m = snapshot.milestones.find((x) => x.id === "CS-202")!;
    const { clauses } = clausesOf(
      { ...m, check_results: [] },
      (id) => id === "CS-304",
    );
    expect(clauses[0]!.status).toBe("check");
  });

  it("counts the work left in items, every open item once, through needs too", () => {
    // CS-401 is beta.1's, but alpha.1's CS-305 needs it: it is work alpha.1 can't finish without.
    expect(view.left.items).toBe(5);
    expect(view.milestones[0]!.left.items).toBe(5);
    expect(view.milestones[1]!.left.items).toBe(1);
  });

  it("gives tokens as a range once estimates exist, and labels which", () => {
    // 1000 + 3000 estimated; the three others at the median, 2000.
    expect(view.left.tokens).toEqual({ low: 4000, high: 10000, estimated: 2 });
    expect(sizeText(view.left)).toBe(
      "5 items · 4k–10k tokens (estimates on 2 of 5)",
    );
    expect(sizeText(sizeOf([item("CS-9")]))).toBe("1 item");
  });

  it("lists the decisions and outside waits holding it, with what each holds", () => {
    expect(
      view.gates.map((g) => [g.id, g.kind, g.who, g.milestones, g.behind]),
    ).toEqual([
      ["CS-311", "external", "legal", ["CS-201", "CS-202"], 1],
      ["CS-310", "decision", "owner", ["CS-201"], 1],
    ]);
    expect(view.gates.every((g) => g.answerable)).toBe(true);
    expect(view.milestones[0]!.gates).toEqual(["CS-311", "CS-310"]);
  });

  it("ages a gate from when it entered its state, else from its creation", () => {
    const g = Object.fromEntries(view.gates.map((x) => [x.id, x]));
    expect(g["CS-310"]!.since).toBe("2026-11-12T10:00:00Z");
    expect(g["CS-311"]!.since).toBe("2026-11-05");
    expect(sinceOf(snapshot, item("CS-9", { created: "2026-11-02" }))).toBe(
      "2026-11-02",
    );
  });

  it("shows a gate's default and deadline only when the record has them", () => {
    expect(view.gates[0]!.default).toBeUndefined();
    const timed = {
      ...snapshot,
      items: snapshot.items.map((it) =>
        it.id === "CS-310"
          ? ({ ...it, default: "Option A", deadline: "2026-11-25" } as WorkItem)
          : it,
      ),
    };
    const g = releaseViewOf(timed, "CS-100")!.gates.find(
      (x) => x.id === "CS-310",
    )!;
    expect([g.default, g.deadline]).toEqual(["Option A", "2026-11-25"]);
  });

  it("marks what can start now, most waiting behind it first", () => {
    expect(view.ready).toEqual(["CS-401", "CS-301"]);
    expect(view.readyBehind).toEqual({ "CS-401": 1, "CS-301": 0 });
    expect(view.milestones[0]!.ready).toEqual(["CS-401", "CS-301"]);
    expect(view.milestones[1]!.ready).toEqual([]);
  });

  it("counts its exceptions by the interim rule: crossings and items two milestones name", () => {
    expect(view.exceptions.map((e) => [e.kind, e.id])).toEqual([
      ["crossing", "CS-401"],
      ["two-milestones", "CS-303"],
    ]);
  });

  it("leaves proposed milestones out until the switch asks for them", () => {
    expect(view.milestones.some((m) => m.id === "CS-204")).toBe(false);
    const withProposed = releaseViewOf(snapshot, "CS-100", {
      proposals: true,
    })!;
    const p = withProposed.milestones.find((m) => m.id === "CS-204")!;
    expect(p.proposed).toBe(true);
    expect(p.left.items).toBe(1);
  });

  it("follows the planner's order when given it", () => {
    const v = releaseViewOf(snapshot, "CS-100", {
      order: ["CS-202", "CS-201"],
    })!;
    expect(v.milestones.map((m) => m.id)).toEqual(["CS-202", "CS-201"]);
  });

  it("leaves an earlier release's work to it, and says it comes first", () => {
    const beta = releaseViewOf(snapshot, "CS-101")!;
    expect(beta.milestones.map((m) => m.id)).toEqual(["CS-203"]);
    expect(beta.earlier).toEqual([
      { id: "CS-100", short: "alpha.1", milestones: 2 },
    ]);
    expect(beta.gates).toEqual([]);
    expect(beta.left.items).toBe(1);
  });

  it("has no view when no release is open", () => {
    expect(
      releaseViewOf({ ...snapshot, items: [], milestones: [] }, undefined),
    ).toBeUndefined();
  });
});

describe("the shell's shared parts (views/Work.tsx)", () => {
  const render = (el: ReactElement) =>
    renderToString(createElement(Root, { colorScheme: "light" }, el));
  // The page's modules add a style element to the document when loaded;
  // in Node there is none, so these tests lend them a stand-in for that
  // one call and take it back after.
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

  it("draws Proposed as a real switch, its state in words", async () => {
    const { ProposedSwitch } = await import("../bench/suite/views/Work.tsx");
    const off = render(
      createElement(ProposedSwitch, {
        on: false,
        count: 3,
        onChange: () => {},
      }),
    );
    expect(off).toMatch(/role="switch"/);
    expect(off).not.toMatch(/checked=""/);
    expect(visibleState(off)).toBe("hidden");
    const on = render(
      createElement(ProposedSwitch, { on: true, count: 3, onChange: () => {} }),
    );
    expect(on).toMatch(/checked=""/);
    expect(visibleState(on)).toBe("shown");
    const na = render(
      createElement(ProposedSwitch, {
        on: true,
        count: 3,
        applies: false,
        onChange: () => {},
      }),
    );
    expect(na).toMatch(/disabled=""/);
    expect(visibleState(na)).toBe("n/a");
  });

  it("mounts every views/work<Name>.tsx with a well-formed workView, Release first on the roadmap", async () => {
    const modules = import.meta.glob<{ workView?: unknown }>(
      "../bench/suite/views/work*.tsx",
    );
    const mounted: Array<ViewEntry & Record<string, unknown>> = [];
    for (const load of Object.values(modules)) {
      const m = await load();
      if (m.workView) {
        mounted.push(m.workView as ViewEntry & Record<string, unknown>);
      }
    }
    expect(mounted.length).toBeGreaterThan(0);
    for (const v of mounted) {
      expect(typeof v.label).toBe("string");
      expect(typeof v.question).toBe("string");
      expect(typeof v.Component).toBe("function");
      expect(["page", "roadmap"]).toContain(v.place);
    }
    const out = mountViews([], mounted);
    expect(out.problems).toEqual([]);
    expect(out.roadmap[0]?.id).toBe("release");
  });
});

let lent = false;

/** The state word the switch shows: the one ReservedText doesn't hide. */
function visibleState(html: string): string | undefined {
  const cell =
    /class="work-reserved work-proposed-state">(.*?)<\/span><\/label>/.exec(
      html,
    )?.[1];
  return /<span>([^<]*)<\/span>/.exec(cell ?? "")?.[1];
}
