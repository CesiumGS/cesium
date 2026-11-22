// The Work page's Order view (CS-749): the planner's sequence for one
// release, interleaved across projects, with sizes as items now and token
// ranges once estimates exist, and how many items run at once read from
// history instead of a setting (bench/suite/views/workOrder.tsx).
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { Root } from "@stratakit/mui";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  InFlight,
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";

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

// The page's modules add a style element to the document when loaded; in
// Node there is none, so these tests lend them a stand-in.
let lent = false;
beforeAll(() => {
  if (typeof document === "undefined") {
    Object.assign(globalThis, {
      document: { createElement: () => ({}), head: { append: () => {} } },
    });
    lent = true;
  }
});
afterAll(() => {
  if (lent) {
    delete (globalThis as { document?: unknown }).document;
  }
});
const order = () => import("../bench/suite/views/workOrder.tsx");

const NOW = "2026-11-20T12:00:00Z";
const ENGINE = "CS-200";
const DATA = "CS-201";

const item = (id: string, over: Partial<WorkItem> = {}): WorkItem => ({
  id,
  title: `Item ${id}`,
  kind: "work",
  state: "planned",
  project: ENGINE,
  needs: [],
  path: `work/items/${id}.md`,
  ready: true,
  blocked: false,
  open_needs: [],
  needed_by: [],
  milestones: [],
  created: "2026-11-18",
  ...over,
});
const release = (id: string, version: string, needs: string[]) =>
  item(id, {
    title: `Release ${version}`,
    release: version,
    needs,
    project: undefined,
  });
const ms = (
  id: string,
  ids: string[],
  over: Partial<WorkMilestone> = {},
): WorkMilestone => ({
  id,
  title: `Milestone ${id}`,
  kind: "milestone",
  learning: false,
  state: "planned",
  project: ENGINE,
  done_when: [],
  constraints: ids.map((c) => ({ id: c, clause: "c?" })),
  contributions: [],
  check_results: [],
  path: `work/milestones/${id}.md`,
  progress: { done: 0, total: ids.length },
  check_due: false,
  to_shape: [],
  ...over,
});

/** A snapshot with what the read API derives: milestones, open needs, needed by. */
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
    projects: [
      {
        id: ENGINE,
        title: "The engine",
        state: "planned",
        path: "p/CS-200.md",
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
        id: DATA,
        title: "The data",
        state: "planned",
        path: "p/CS-201.md",
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
    elsewhere: [],
    history: [],
    ...over,
  };
}

/**
 * Two releases. alpha.1 needs CS-1: two items of the engine (CS-11 after
 * CS-10), CS-12 (which needs beta.1's CS-30), and two of the data's
 * (CS-21 waits on the decision CS-50). beta.1 needs CS-5: CS-30 and CS-31.
 */
function board(est: Partial<Record<string, number>> = {}): WorkSnapshot {
  const w = (id: string, over: Partial<WorkItem> = {}) =>
    item(id, {
      ...(est[id] ? { estimate_tokens: est[id] } : {}),
      ...over,
    });
  return snap(
    [
      release("CS-100", "2.0.0-alpha.1", ["CS-1"]),
      release("CS-101", "2.0.0-beta.1", ["CS-5", "CS-100"]),
      w("CS-10"),
      w("CS-11", { needs: ["CS-10"] }),
      w("CS-12", { needs: ["CS-30"] }),
      w("CS-20", { project: DATA }),
      w("CS-21", { project: DATA, needs: ["CS-50"] }),
      w("CS-30", { project: DATA }),
      w("CS-31"),
      item("CS-50", { kind: "decision", decider: "owner", project: DATA }),
    ],
    [
      ms("CS-1", ["CS-10", "CS-11", "CS-12", "CS-20", "CS-21"]),
      ms("CS-5", ["CS-30", "CS-31"], { project: DATA }),
    ],
  );
}

const at = (iso: string) => iso;
const ev = (id: string, when: string, state: WorkItem["state"]) => ({
  id,
  at: at(when),
  state,
});

describe("concurrency, from history (concurrencyOf)", () => {
  it("reads the most at once on each day with work in progress, as a range", async () => {
    const { concurrencyOf } = await order();
    const s = snap(
      [item("CS-1"), item("CS-2"), item("CS-3"), item("CS-4")],
      [],
      {
        history: [
          ev("CS-1", "2026-11-17T10:00:00", "in-progress"),
          ev("CS-2", "2026-11-17T12:00:00", "in-progress"),
          ev("CS-1", "2026-11-17T14:00:00", "done"),
          ev("CS-2", "2026-11-18T09:00:00", "done"),
          // Claimed and closed at one commit time: no span to time.
          ev("CS-3", "2026-11-18T10:00:00", "in-progress"),
          ev("CS-3", "2026-11-18T10:00:00", "done"),
        ],
      },
    );
    // CS-4 is in progress now on another branch, claimed this morning.
    const flight: InFlight = new Map([
      [
        "CS-4",
        [
          {
            id: "CS-4",
            where: "hitld/CS-4",
            worktree: true,
            at: "2026-11-19T08:00:00",
          },
        ],
      ],
    ]);
    const c = concurrencyOf(s, flight, Date.parse("2026-11-19T12:00:00"))!;
    expect(c).toMatchObject({
      low: 1,
      high: 2,
      typical: 1,
      days: 3,
      first: "2026-11-17",
      last: "2026-11-19",
      timed: 2,
      untimed: 1,
      now: 1,
    });
  });

  it("counts back-to-back work as one at once, and nothing without history", async () => {
    const { concurrencyOf } = await order();
    const s = snap([item("CS-1"), item("CS-2")], [], {
      history: [
        ev("CS-1", "2026-11-17T10:00:00", "in-progress"),
        ev("CS-1", "2026-11-17T11:00:00", "done"),
        ev("CS-2", "2026-11-17T11:00:00", "in-progress"),
        ev("CS-2", "2026-11-17T12:00:00", "done"),
      ],
    });
    expect(concurrencyOf(s, undefined, Date.parse(NOW))).toMatchObject({
      low: 1,
      high: 1,
      days: 1,
    });
    expect(
      concurrencyOf(snap([item("CS-1")], []), undefined, Date.parse(NOW)),
    ).toBeUndefined();
  });

  it("plans the order with the typical day's most at once, never a setting", async () => {
    const { orderPlanOf } = await order();
    const s = board();
    const c = {
      low: 1,
      high: 4,
      typical: 3,
      days: 5,
      first: "2026-11-14",
      last: "2026-11-19",
      timed: 9,
      untimed: 0,
      now: 2,
    };
    expect(orderPlanOf(s, { concurrency: c }).slots).toBe(3);
    expect(orderPlanOf(s).slots).toBe(1);
  });
});

describe("a release's order (orderViewOf)", () => {
  it("is the planner's sequence, interleaved across projects, sized in items", async () => {
    const { orderPlanOf, orderViewOf } = await order();
    const s = board();
    const v = orderViewOf(s, orderPlanOf(s), "CS-100")!;
    // Most unblocked first (CS-10, CS-30), then by ID once needs are done.
    expect(v.rows.map((r) => r.id)).toEqual([
      "CS-10",
      "CS-30",
      "CS-11",
      "CS-12",
      "CS-20",
      "CS-21",
    ]);
    expect(v.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(v.rows.map((r) => r.at)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(v.unit).toBe("items");
    expect(v.size).toEqual({ items: 6 });
    expect(v.lanes).toEqual([
      {
        project: ENGINE,
        title: "The engine",
        ids: ["CS-10", "CS-11", "CS-12"],
      },
      { project: DATA, title: "The data", ids: ["CS-30", "CS-20", "CS-21"] },
    ]);
    expect(v.release).toMatchObject({ short: "alpha.1", proposed: false });
    expect(v.before).toEqual([]);
  });

  it("names the gates before an item, what is pulled in, and what starts next", async () => {
    const { orderPlanOf, orderViewOf } = await order();
    const s = board();
    const byId = (v: ReturnType<typeof orderViewOf>) =>
      new Map(v!.rows.map((r) => [r.id, r]));
    const c = {
      low: 1,
      high: 2,
      typical: 1,
      days: 2,
      first: "2026-11-18",
      last: "2026-11-19",
      timed: 3,
      untimed: 0,
      now: 0,
    };
    const v = orderViewOf(s, orderPlanOf(s), "CS-100", { concurrency: c })!;
    const rows = byId(v);
    expect(rows.get("CS-21")!.held).toEqual(["CS-50"]);
    expect(v.gates).toEqual({ decisions: ["CS-50"], outside: [], rows: 1 });
    // beta.1's CS-30 is worked in alpha.1, since alpha.1's CS-12 needs it.
    expect(rows.get("CS-30")).toMatchObject({ loose: "later" });
    expect(rows.get("CS-30")!.milestone).toBeUndefined();
    expect(rows.get("CS-10")).toMatchObject({ milestone: "CS-1" });
    // The first two ready items: runs have had two at once at most.
    expect(v.nextCount).toBe(2);
    expect(v.rows.filter((r) => r.next).map((r) => r.id)).toEqual([
      "CS-10",
      "CS-30",
    ]);
    expect(rows.get("CS-11")!.stage).toBe("Waiting");

    const beta = orderViewOf(s, orderPlanOf(s), "CS-101")!;
    expect(beta.rows.map((r) => r.id)).toEqual(["CS-31"]);
    expect(beta.before).toEqual([{ id: "CS-100", short: "alpha.1", items: 6 }]);
  });

  it("sizes in tokens as a range once estimates exist", async () => {
    const { orderPlanOf, orderViewOf } = await order();
    const s = board({ "CS-10": 40_000, "CS-20": 20_000 });
    const v = orderViewOf(s, orderPlanOf(s), "CS-100")!;
    expect(v.unit).toBe("tokens");
    // 60k estimated; four more at the median, 30k each.
    expect(v.size.tokens).toEqual({ low: 60_000, high: 180_000, estimated: 2 });
    const first = v.rows.find((r) => r.id === "CS-10")!;
    expect(first).toMatchObject({ estimate: 40_000, size: 40_000 });
    expect(v.rows.find((r) => r.id === "CS-11")!.estimate).toBeUndefined();
    expect(v.total).toBe(v.rows.reduce((n, r) => n + r.size, 0));
  });
});

describe("one card at a time (barReducer)", () => {
  it("opens the bar under the pointer, else the bar focused from the keyboard", async () => {
    const { BAR_IDLE, barReducer, openBarOf } = await order();
    const run = (...es: Parameters<typeof barReducer>[1][]) =>
      es.reduce(barReducer, BAR_IDLE);
    // The pointer alone.
    expect(openBarOf(run({ type: "hover", id: "A" }), "A")).toBe("A");
    expect(
      openBarOf(run({ type: "hover", id: "A" }, { type: "leave" }), "A"),
    ).toBeUndefined();
    // The keyboard alone: arrow keys move the one open card.
    const keys = run(
      { type: "focus", id: "A", visible: true },
      { type: "move", id: "B" },
    );
    expect(openBarOf(keys, "A")).toBe("B");
    // Both: the pointer's bar wins while it is there, so one card shows.
    const both = barReducer(keys, { type: "hover", id: "C" });
    expect(openBarOf(both, "A")).toBe("C");
    expect(openBarOf(barReducer(both, { type: "leave" }), "A")).toBe("B");
    // A key moves the card back to the keyboard's bar.
    expect(openBarOf(barReducer(both, { type: "move", id: "D" }), "A")).toBe(
      "D",
    );
    // A click focuses without :focus-visible: no card stays behind.
    expect(
      openBarOf(
        run(
          { type: "hover", id: "A" },
          { type: "focus", id: "A", visible: false },
          { type: "leave" },
        ),
        "A",
      ),
    ).toBeUndefined();
    // Escape closes it until the pointer or the focus moves on.
    const shut = barReducer(keys, { type: "escape" });
    expect(openBarOf(shut, "A")).toBeUndefined();
    expect(openBarOf(barReducer(shut, { type: "move", id: "A" }), "A")).toBe(
      "A",
    );
    expect(openBarOf(barReducer(keys, { type: "blur" }), "A")).toBeUndefined();
  });
});

describe("the Order view as it renders", () => {
  const render = async (el: ReactElement) =>
    renderToString(createElement(Root, { colorScheme: "light" }, el));
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, " ");
  const props = (s: WorkSnapshot) => {
    const alpha = {
      id: "CS-100",
      version: "2.0.0-alpha.1",
      short: "alpha.1",
      title: "Release 2.0.0-alpha.1",
      proposed: false,
    };
    return {
      s,
      flight: new Map(),
      items: s.items,
      scoped: false,
      msInScope: () => true,
      search: { view: "roadmap", roadmap: "plan" },
      set: () => {},
      proposals: false,
      releases: [alpha],
      release: alpha,
      onRelease: () => {},
      openItem: () => {},
      openList: () => {},
      hasView: () => true,
      goView: () => {},
    };
  };

  it("mounts on the roadmap as Order, in the Plan view's place", async () => {
    const { workView } = await order();
    expect(workView).toMatchObject({
      id: "plan",
      label: "Order",
      place: "roadmap",
      order: 40,
      proposals: true,
    });
  });

  it("labels every color, sizes in items, and has no slot setting", async () => {
    const { OrderView } = await order();
    const html = plain(await render(createElement(OrderView, props(board()))));
    for (const label of [
      "Blocked",
      "Ready",
      "In progress",
      "Waits on a decision",
      "Waits on an outside party",
      "Starts next",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toMatch(/In order 6 items · 2 projects/);
    expect(html).toMatch(/Size 6 items · no token estimates yet/);
    expect(html).toMatch(/At once, in history – no run history yet/);
    expect(html).not.toMatch(/slot/i);
    // Every ID carries its short title.
    for (const id of ["CS-10", "CS-11", "CS-12", "CS-20", "CS-21", "CS-30"]) {
      expect(html).toContain(`${id} Item ${id}`);
    }
    expect(html).toMatch(/CS-200 The engine/);
    expect(html).toContain("Waits on 1 decision");
  });
});
