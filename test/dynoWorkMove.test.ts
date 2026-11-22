// The Work page's Your move (CS-753): each section leads with its number,
// its entries ranked by what they hold up, each with its age, its title and
// its one action, the rest folded; the "Proposals for you" card counts
// CS-750's groups. The model is `yourMoveOf` in bench/suite/views/Work.tsx.
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { Root } from "@stratakit/mui";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  LiveBox,
  LiveUnmerged,
  WorkItem,
  WorkMilestone,
  WorkSnapshot,
} from "../bench/suite/work.ts";
import type { HealthException } from "../bench/suite/workHealth.ts";
import type {
  ProposalGroup,
  ProposalRow,
  ProposalsModel,
} from "../bench/suite/workProposals.ts";
import type * as WorkView from "../bench/suite/views/Work.tsx";

// Every ID on the page is a router link. Node has no window for a router,
// so this file draws a link as a plain anchor, its search as the href.
vi.mock("@tanstack/react-router", async (actual) => ({
  ...(await actual<typeof import("@tanstack/react-router")>()),
  Link: ({
    children,
    className,
    search,
    "aria-label": label,
  }: {
    children?: ReactNode;
    className?: string;
    search?: (prev: Record<string, unknown>) => Record<string, unknown>;
    "aria-label"?: string;
  }) => {
    const q = search ? search({ view: "move", item: "CS-1" }) : {};
    const href = `#/work?${new URLSearchParams(
      Object.entries(q).filter(([, v]) => v !== undefined) as Array<
        [string, string]
      >,
    ).toString()}`;
    return createElement(
      "a",
      { className, href, "aria-label": label },
      children,
    );
  },
}));

const NOW = Date.parse("2026-11-21T12:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

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
  created: "2026-11-18",
  ...over,
});
const milestone = (id: string, constraints: string[]): WorkMilestone => ({
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
  path: `work/milestones/${id}.md`,
  progress: { done: 0, total: 0 },
  check_due: false,
  to_shape: [],
});
const decision = (id: string, title: string, needs: string[] = []) =>
  item(id, { kind: "decision", decider: "owner", title, needs });

/** A snapshot with what the read API derives: open needs and needed-by. */
function snap(items: WorkItem[], milestones: WorkMilestone[] = []) {
  const done = new Set(
    items.filter((x) => x.state === "done").map((x) => x.id),
  );
  const all = items.map((it) => ({
    ...it,
    open_needs: it.needs.filter((n) => !done.has(n)),
  }));
  for (const it of all) {
    it.needed_by = all
      .filter((x) => x.state !== "done" && x.needs.includes(it.id))
      .map((x) => x.id);
  }
  return {
    api_version: 3,
    source: "test",
    generated: new Date(NOW).toISOString(),
    items: all,
    milestones,
    projects: [],
    long_outcomes: [],
    project_deps: [],
    problems: [],
    elsewhere: [],
    history: [],
  } as WorkSnapshot;
}

const exception = (
  over: Partial<HealthException> & { id: string },
): HealthException => ({
  key: `no-milestone ${over.id}`,
  kind: "no-milestone",
  what: ["It sits in no milestone."],
  fix: ["Add it to ", { id: "CS-60" }, "."],
  owner: true,
  involves: [over.id],
  releases: [],
  ...over,
});

const merge = (
  id: string,
  closedAgo: number,
  queue: LiveUnmerged["queue"] = "none",
): LiveUnmerged => ({
  id,
  branches: [`hitld/${id}-work`],
  queue,
  closed: NOW - closedAgo,
});

/** A Proposals model with this many rows in each of CS-750's groups. */
const groups = (n: Partial<Record<ProposalGroup, number>>): ProposalsModel => {
  const order: ProposalGroup[] = [
    "needed",
    "waiting",
    "new",
    "deferred",
    "unheaded",
  ];
  const gs = order.map((group) => ({
    group,
    rows: Array.from(
      { length: n[group] ?? 0 },
      (_, i) => ({ id: `CS-${700 + i}`, group }) as unknown as ProposalRow,
    ),
  }));
  return {
    rows: gs.flatMap((g) => g.rows),
    groups: gs,
    unheaded: n.unheaded ?? 0,
  };
};

// The fixture: seven decisions, so two fold; CS-10 holds the most up
// (CS-20 needs it, and CS-21 needs CS-20), CS-11 and CS-12 one each, the
// older first; the rest hold nothing.
const world = () => {
  const items = [
    decision("CS-10", "Which package names does 2.0 publish under?"),
    decision("CS-11", "Should ion host the grids?"),
    decision("CS-12", "Where does the default token come from?"),
    decision("CS-13", "How is a memory budget sized?"),
    decision("CS-14", "Black hole visualization: how much physics?"),
    decision("CS-15", "Keep marking APIs experimental?"),
    decision("CS-16", "The styling language's form"),
    item("CS-20", { title: "Publish the packages", needs: ["CS-10"] }),
    item("CS-21", { title: "Release notes", needs: ["CS-20"] }),
    item("CS-22", { title: "Host the grids", needs: ["CS-11"] }),
    item("CS-23", { title: "Default token", needs: ["CS-12"] }),
    item("CS-30", {
      kind: "external",
      title: "Legal review of sky data",
      waiting_on: "legal review",
    }),
    item("CS-31", { title: "Ship sky data", needs: ["CS-30"] }),
    item("CS-40", { title: "Lazy pipelines", state: "done" }),
    item("CS-41", { title: "Lazy subsystems" }),
    item("CS-50", { title: "Planned work in no milestone" }),
    item("CS-60", { title: "A milestone's item" }),
  ];
  const s = snap(items, [milestone("CS-70", ["CS-60", "CS-20"])]);
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const since = new Map<string, number>([
    ["CS-10", NOW - 2 * DAY],
    ["CS-11", NOW - 7 * DAY],
    ["CS-12", NOW - 3 * DAY],
    ["CS-13", NOW - 1 * DAY],
    ["CS-14", NOW - 5 * DAY],
    ["CS-15", NOW - 4 * DAY],
    ["CS-16", NOW - 6 * DAY],
    ["CS-30", NOW - 9 * DAY],
    ["CS-50", NOW - 12 * DAY],
    ["CS-60", NOW - 40 * 60_000],
    ["CS-41", NOW - 3 * HOUR],
  ]);
  const unblocks = new Map<string, number>([
    ["CS-10", 2],
    ["CS-11", 1],
    ["CS-12", 1],
    ["CS-20", 1],
    ["CS-30", 1],
  ]);
  return { s, itemOf, since, unblocks };
};

const decisionsOf = (s: WorkSnapshot) =>
  s.items.filter((i) => i.kind === "decision");

let W: typeof WorkView;
// The page's modules add a style element to the document when loaded; in
// Node there is none, so these tests lend them a stand-in.
let lent = false;
beforeAll(async () => {
  if (typeof document === "undefined") {
    Object.assign(globalThis, {
      document: { createElement: () => ({}), head: { append: () => {} } },
    });
    lent = true;
  }
  W = await import("../bench/suite/views/Work.tsx");
});
afterAll(() => {
  if (lent) {
    delete (globalThis as { document?: unknown }).document;
  }
});

const moveOf = (
  over: Partial<Parameters<typeof WorkView.yourMoveOf>[0]> = {},
) => {
  const { s, itemOf, since, unblocks } = world();
  return W.yourMoveOf({
    s,
    decisions: decisionsOf(s),
    unmerged: [],
    exceptions: [],
    outside: [itemOf.get("CS-30")!],
    proposals: groups({}),
    unblocks,
    since,
    now: NOW,
    ...over,
  });
};
const ids = (es: readonly { id: string }[]) => es.map((e) => e.id);

describe("Your move's sections (CS-753)", () => {
  it("ranks a section by what each entry holds up, the oldest first on a tie, then by ID", () => {
    const d = moveOf().sections.decisions;
    expect(ids([...d.top, ...d.more])).toEqual([
      "CS-10", // holds up 2
      "CS-11", // 1, 7 days
      "CS-12", // 1, 3 days
      "CS-16", // none, 6 days
      "CS-14", // 5 days
      "CS-15", // 4 days
      "CS-13", // 1 day
    ]);
    expect(d.top[0]).toMatchObject({ holds: 2, age: 2 * DAY });
  });

  it("leads with its number and folds all but the first five under 'and N more'", () => {
    const d = moveOf().sections.decisions;
    expect(d.count).toBe(7);
    expect(d.top).toHaveLength(W.MOVE_TOP);
    expect(ids(d.more)).toEqual(["CS-15", "CS-13"]);
    const few = moveOf({ top: 3 }).sections.decisions;
    expect(few.top).toHaveLength(3);
    expect(few.more).toHaveLength(4);
  });

  it("ages a decision or an outside wait from its stage, and says nothing when the history can't tell", () => {
    const { s, since } = world();
    since.delete("CS-13");
    const m = moveOf({ s, since });
    const all = [...m.sections.decisions.top, ...m.sections.decisions.more];
    expect(all.find((e) => e.id === "CS-13")!.age).toBeUndefined();
    // Unknown age ranks after every known one on a tie.
    expect(ids(all).at(-1)).toBe("CS-13");
    expect(m.sections.outside.top[0]).toMatchObject({
      id: "CS-30",
      holds: 1,
      age: 9 * DAY,
    });
  });

  it("puts a merge waiting for the owner's yes first, and ages each from its close", () => {
    const m = moveOf({
      unmerged: [
        merge("CS-20", 3 * HOUR, "checking"),
        merge("CS-41", 1 * HOUR, "held"),
        merge("CS-60", 2 * DAY),
      ],
    }).sections.merges;
    expect(ids(m.top)).toEqual(["CS-41", "CS-20", "CS-60"]);
    expect(m.top[0]).toMatchObject({ held: true, age: HOUR });
    expect(m.top[1]).toMatchObject({ held: false, holds: 1 });
  });

  it("counts what an exception holds up through what it involves, a milestone through its constraints, each item once", () => {
    const { s } = world();
    // CS-20 and what waits on it (CS-21).
    expect(W.holdsUpOf(s, ["CS-20"])).toBe(2);
    // CS-70 holds CS-60 and CS-20; CS-20 holds CS-21: three, CS-20 once.
    expect(W.holdsUpOf(s, ["CS-70", "CS-20"])).toBe(3);
    // Done work holds nothing up.
    expect(W.holdsUpOf(s, ["CS-40"])).toBe(0);
    const h = moveOf({
      exceptions: [
        exception({ id: "CS-50" }),
        exception({
          key: "two-milestones CS-60",
          kind: "two-milestones",
          id: "CS-60",
          involves: ["CS-60", "CS-70"],
        }),
      ],
    }).sections.health;
    expect(ids(h.top)).toEqual(["CS-60", "CS-50"]);
    expect(h.top[0]!.holds).toBe(3);
  });

  it("ages an exception from its item, else from the latest change among what it involves, else not at all", () => {
    const h = moveOf({
      exceptions: [
        exception({ id: "CS-50" }),
        exception({
          key: "loop CS-70",
          kind: "loop",
          id: "CS-70",
          involves: ["CS-70", "CS-60", "CS-50"],
        }),
        exception({
          key: "loop CS-71",
          kind: "loop",
          id: "CS-71",
          involves: ["CS-71"],
        }),
      ],
    }).sections.health;
    const age = (id: string) => [...h.top].find((e) => e.id === id)!.age;
    expect(age("CS-50")).toBe(12 * DAY);
    expect(age("CS-70")).toBe(40 * 60_000);
    expect(age("CS-71")).toBeUndefined();
  });

  it("counts the proposals in CS-750's groups, those with no header apart", () => {
    const p = moveOf({
      proposals: groups({ needed: 2, waiting: 3, new: 1, unheaded: 9 }),
    }).proposals;
    expect(p.groups).toEqual([
      { group: "needed", count: 2 },
      { group: "waiting", count: 3 },
      { group: "new", count: 1 },
      { group: "deferred", count: 0 },
    ]);
    expect(p.count).toBe(6);
    expect(p.unheaded).toBe(9);
  });

  it("is clear only when every section and the proposals are empty", () => {
    const empty = {
      decisions: [],
      unmerged: [],
      exceptions: [],
      outside: [],
      proposals: groups({ unheaded: 4 }),
    };
    expect(moveOf(empty).clear).toBe(true);
    expect(moveOf({ ...empty, proposals: groups({ deferred: 1 }) }).clear).toBe(
      false,
    );
    expect(moveOf({ ...empty, unmerged: [merge("CS-20", HOUR)] }).clear).toBe(
      false,
    );
    expect(moveOf().clear).toBe(false);
  });

  it("ranks ready work the same way, a level down", () => {
    const { itemOf } = world();
    const r = moveOf({
      ready: [itemOf.get("CS-41")!, itemOf.get("CS-20")!],
    }).ready;
    expect(ids(r.top)).toEqual(["CS-20", "CS-41"]);
  });

  it("tells an age in its column's width", () => {
    expect(W.moveAgeText(20_000)).toBe("just now");
    expect(W.moveAgeText(60_000)).toBe("1 minute");
    expect(W.moveAgeText(40 * 60_000)).toBe("40 minutes");
    expect(W.moveAgeText(5 * HOUR)).toBe("5 hours");
    expect(W.moveAgeText(7 * DAY)).toBe("7 days");
  });
});

describe("Your move as it renders", () => {
  const live = (unmerged: LiveUnmerged[] = []): LiveBox => ({
    working: [],
    unmerged,
    run: { state: "none" },
    notes: [],
    sources: ["run", "ledger", "claims", "branches"].map((source) => ({
      source,
      at: NOW,
      ok: true,
    })),
    blind: false,
  });
  const render = (move: WorkView.YourMove, box = live()) => {
    const { s } = world();
    const html = renderToString(
      createElement(
        Root,
        { colorScheme: "light" },
        createElement(W.WorkSnapshotProvider, {
          s,
          children: createElement(W.YourMoveView, {
            move,
            live: box,
            openItem: () => {},
            goView: () => {},
            now: NOW,
          }),
        }),
      ),
    );
    return html;
  };
  const plain = (html: string) =>
    html
      .replace(/<style[^>]*>.*?<\/style>/gs, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ");

  it("leads each section with its number, then its top entries, each with its title, age and action", () => {
    const text = plain(render(moveOf()));
    expect(text).toMatch(/7 Decisions The oldest has waited 7 days/);
    // The top five in rank order, then the fold.
    const at = (s: string) => text.indexOf(s);
    expect(at("CS-10 Which package names")).toBeGreaterThan(0);
    expect(at("CS-10 Which package names")).toBeLessThan(
      at("CS-11 Should ion host the grids?"),
    );
    expect(text).toMatch(
      /CS-10 Which package names does 2\.0 publish under\? holds up 2 2 days Decide/,
    );
    expect(text).toMatch(/and 2 more/);
    expect(text).not.toMatch(/CS-13 How is a memory budget sized/);
    expect(text).toMatch(/1 Outside waits On 1 other party/);
    expect(text).toMatch(
      /CS-30 Legal review of sky data holds up 1 9 days Follow up/,
    );
  });

  it("collapses an empty section to one line", () => {
    const html = render(moveOf());
    expect(plain(html)).toMatch(/0 Merges No finished work waits to merge\./);
    expect(plain(html)).toMatch(
      /0 Health exceptions Nothing in the work graph needs you\./,
    );
    expect(html).toMatch(
      /class="work-move-section empty"[^>]*aria-labelledby="work-move-merges-h"/,
    );
  });

  it("names the merge waiting for your yes, and opens a health exception in the Health view", () => {
    const text = plain(
      render(
        moveOf({
          unmerged: [merge("CS-20", HOUR, "held")],
          exceptions: [exception({ id: "CS-50" })],
        }),
      ),
    );
    expect(text).toMatch(/1 Merges 1 waits for your yes/);
    expect(text).toMatch(/CS-20 Publish the packages holds up 1 1 hour Review/);
    expect(text).toMatch(
      /1 Health exceptions Their fixes change scope or a release/,
    );
    expect(text).toMatch(
      /CS-50 Planned work in no milestone holds up 1 12 days Fix/,
    );
    // The drawer: what is wrong and the fix, IDs with their titles.
    expect(text).toMatch(/Fix Add it to Work item CS-60 A milestone's item \./);
  });

  it("counts proposals in CS-750's groups and links to the Proposals view, with none of CS-688's stages", () => {
    const html = render(
      moveOf({
        proposals: groups({ needed: 2, waiting: 3, new: 1, unheaded: 9 }),
      }),
    );
    const text = plain(html);
    expect(text).toMatch(
      /6 Proposals for you .* Needed by committed work 2 Waiting on a decision or study 3 New 1 Deferred 0/,
    );
    expect(text).toMatch(/9 more have no header yet/);
    expect(html).toMatch(
      /href="#\/work\?view=proposals"[^>]*>Open the Proposals view/,
    );
    for (const old of [
      "To discuss",
      "Being shaped",
      "Ready for your yes",
      "Later, for review",
    ]) {
      expect(text).not.toContain(old);
    }
    // Proposals for you comes before the outside waits.
    expect(text.indexOf("Proposals for you")).toBeLessThan(
      text.indexOf("Outside waits"),
    );
  });

  it("says so when nothing waits on you", () => {
    const text = plain(
      render(
        moveOf({
          decisions: [],
          outside: [],
          proposals: groups({ unheaded: 2 }),
        }),
      ),
    );
    expect(text).toMatch(
      /Waiting on you Nothing waits on you: no decision, merge, health exception, outside wait or proposal\./,
    );
    expect(text).not.toMatch(/0 Decisions/);
    expect(text).toMatch(/Moving without you 0 In progress/);
  });

  it("leaves the Proposals tab to the mounted view (CS-750)", async () => {
    const { workView } = await import("../bench/suite/views/workProposals.tsx");
    expect(workView.id).toBe("proposals");
  });
});
