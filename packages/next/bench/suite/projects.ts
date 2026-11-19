/**
 * The model of the roadmap's Projects view (CS-693; DESIGN.md, "The
 * roadmap's Projects view"): how ready each project's work is for each
 * release, what of other projects' work waits on it, the owner's
 * decisions that hold it up, and the projects' waits on each other as a
 * matrix ordered so coupled projects sit together. Pure, for tests; the
 * view is views/Projects.tsx.
 */

import {
  dependencyMatrix,
  idNumber,
  type InFlight,
  isOpen,
  isOwnerDecision,
  isReleaseItem,
  NO_RELEASE,
  planOf,
  releaseClosuresOf,
  type Stage,
  STAGES,
  stageOf,
  type WorkItem,
  type WorkSnapshot,
} from "./work.ts";

// ------------------------------------------------------------ by release

/** A column: a release in ladder order, or the last, no release. */
export interface ReleaseColumn {
  /** The release item's ID, or `NO_RELEASE`. */
  id: string;
  /** Its version ("2.0.0-alpha.1"), or "No release". */
  name: string;
  proposed: boolean;
}

/** Something that holds up a cell's blocked items. */
export interface CellBlocker {
  id: string;
  /**
   * "decision", an open decision of the owner's; "external", a wait on
   * another party; "work", an open item of another project.
   */
  kind: "decision" | "external" | "work";
  /** The blocker's project. */
  project?: string;
  /** The cell's blocked items it holds up. */
  holds: string[];
}

/** One project's items one release needs: work, decisions and outside waits. */
export interface ProjectCell {
  /** The items, by number. */
  items: string[];
  /** How many are at each stage. */
  counts: Record<Stage, number>;
  /** Those that sit in proposed milestones (with proposals shown). */
  proposed: string[];
  /**
   * What holds up its blocked items: open decisions and outside waits
   * anywhere upstream, and the first open item of another project on
   * each way up (that project's own row says what holds it). Decisions
   * first, then outside waits, then work; most held first.
   */
  blockers: CellBlocker[];
  /** Its items on what sets some release's finish, by number. */
  finishing: string[];
  /** The releases whose finish those items set, in ladder order. */
  finishes: string[];
}

/** The owner's decision in a project's row. */
export interface RowDecision {
  id: string;
  /** Its title: the question. */
  title: string;
  /** The open items that wait on it, directly or through others. */
  waiting: string[];
  /** The releases those items, or the decision itself, belong to. */
  releases: string[];
}

export interface ProjectRow {
  id: string;
  title: string;
  /** One per column; undefined where the release needs nothing from it. */
  cells: (ProjectCell | undefined)[];
  /**
   * Other projects' open items that wait on this project's open work,
   * directly or through others, and the releases they belong to.
   */
  holdsUp: { items: string[]; projects: string[]; releases: string[] };
  /** The releases whose finish its items set, in ladder order. */
  finishing: string[];
  /** Its open decisions of the owner's that hold up release work. */
  decisions: RowDecision[];
}

export interface ProjectReadiness {
  columns: ReleaseColumn[];
  rows: ProjectRow[];
  /** Each item's column, for the items some release needs. */
  columnOf: Map<string, number>;
  /**
   * What sets each release's finish: the Plan view's chain of needs that
   * ends at the last item the release needs (CS-692's `planOf`), earliest
   * first. Its items may sit in earlier releases' columns.
   */
  chains: Map<string, string[]>;
}

const emptyCounts = (): Record<Stage, number> =>
  Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<Stage, number>;

/**
 * Projects against releases (CS-693): each cell is the project's items
 * the release needs, with their stages and what holds the blocked ones.
 *
 * An item belongs to the earliest release whose milestones hold it, as
 * in CS-685's release bands. An item no milestone holds belongs to the
 * earliest release that reaches it through needs, or that needs it
 * directly. Everything else belongs to no release. Release items are
 * the columns, never cells. Reads the snapshot as given: pass
 * `committedOnly(s)` for committed work alone.
 */
export function projectReadinessOf(
  s: WorkSnapshot,
  flight?: InFlight,
  /** Proposed releases and milestones too. */
  proposals = false,
  /** The executor slots the Plan view sequences for, as it does. */
  slots = 1,
): ProjectReadiness {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(
    s.milestones.filter((m) => m.state !== "dropped").map((m) => [m.id, m]),
  );
  const closures = releaseClosuresOf(s, proposals);
  const columns: ReleaseColumn[] = [
    ...closures.map((c) => ({
      id: c.id,
      name: c.version,
      proposed: c.proposed,
    })),
    { id: NO_RELEASE, name: "No release", proposed: false },
  ];
  const none = closures.length;
  // A milestone's column: the earliest release whose closure holds it.
  const msColumn = new Map<string, number>();
  for (const m of msOf.values()) {
    const k = closures.findIndex((c) => c.closure.has(m.id));
    msColumn.set(m.id, k < 0 ? none : k);
  }
  const holders = new Map<string, string[]>();
  for (const m of msOf.values()) {
    for (const c of m.constraints) {
      if (!msOf.has(c.id)) {
        holders.set(c.id, [...(holders.get(c.id) ?? []), m.id]);
      }
    }
  }
  const columnOf = new Map<string, number>();
  for (const it of s.items) {
    if (isReleaseItem(it) || it.state === "dropped") {
      continue;
    }
    const held = holders.get(it.id);
    if (held?.length) {
      columnOf.set(it.id, Math.min(...held.map((m) => msColumn.get(m)!)));
    }
  }
  // Items no milestone holds: the earliest release that reaches them.
  closures.forEach((c, k) => {
    const release = itemOf.get(c.id)!;
    const seen = new Set<string>();
    const queue: string[] = [];
    const visit = (id: string) => {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
    };
    for (const n of release.needs) {
      visit(n);
    }
    for (const m of c.closure) {
      visit(m);
    }
    while (queue.length) {
      const id = queue.shift()!;
      const m = msOf.get(id);
      if (m) {
        if (c.closure.has(id)) {
          for (const x of m.constraints) {
            visit(x.id);
          }
        }
        continue;
      }
      const it = itemOf.get(id);
      if (!it || isReleaseItem(it) || it.state === "dropped") {
        continue;
      }
      const held = holders.get(id);
      if (!held?.length && !columnOf.has(id)) {
        columnOf.set(id, k);
      }
      // An item another release's milestone holds answers for itself.
      if (held?.length && columnOf.get(id) !== k) {
        continue;
      }
      for (const n of it.open_needs) {
        visit(n);
      }
    }
  });
  for (const it of s.items) {
    if (
      !columnOf.has(it.id) &&
      !isReleaseItem(it) &&
      it.state !== "dropped" &&
      (isOpen(it) || holders.has(it.id))
    ) {
      columnOf.set(it.id, none);
    }
  }

  const plan = planOf(s, { slots, proposals, flight });
  const chains = new Map(plan.releases.map((r) => [r.id, r.chain]));
  // Each item → the releases whose finish it sets, in ladder order.
  const onChain = new Map<string, string[]>();
  for (const c of closures) {
    for (const id of chains.get(c.id) ?? []) {
      onChain.set(id, [...(onChain.get(id) ?? []), c.id]);
    }
  }

  // Upstream of each open item, among open items.
  const openOf = new Map(s.items.filter(isOpen).map((i) => [i.id, i]));
  const downstream = (id: string): Set<string> => {
    const out = new Set<string>();
    const stack = [...(itemOf.get(id)?.needed_by ?? [])];
    while (stack.length) {
      const d = stack.pop()!;
      if (out.has(d) || !openOf.has(d)) {
        continue;
      }
      out.add(d);
      stack.push(...openOf.get(d)!.needed_by);
    }
    return out;
  };
  const blockersOf = (it: WorkItem): Array<Omit<CellBlocker, "holds">> => {
    const out: Array<Omit<CellBlocker, "holds">> = [];
    const seen = new Set<string>();
    const stack = [...it.open_needs];
    while (stack.length) {
      const id = stack.pop()!;
      const b = openOf.get(id);
      if (!b || seen.has(id)) {
        continue;
      }
      seen.add(id);
      if (isOwnerDecision(b)) {
        out.push({ id, kind: "decision", project: b.project });
      } else if (b.kind === "external") {
        out.push({ id, kind: "external", project: b.project });
      } else if (b.project !== it.project) {
        if (!isReleaseItem(b)) {
          out.push({ id, kind: "work", project: b.project });
        }
        continue;
      }
      stack.push(...b.open_needs);
    }
    return out;
  };

  const proposedMs = new Set(
    [...msOf.values()].filter((m) => m.state === "proposed").map((m) => m.id),
  );
  const projects = s.projects.filter((p) => p.state !== "dropped");
  const known = new Set(projects.map((p) => p.id));
  const rows: ProjectRow[] = [];
  const NONE = "";
  const ids = [
    ...projects.map((p) => p.id),
    ...(s.items.some(
      (it) => columnOf.has(it.id) && (!it.project || !known.has(it.project)),
    )
      ? [NONE]
      : []),
  ];
  for (const pid of ids) {
    const mine = s.items
      .filter(
        (it) =>
          columnOf.has(it.id) &&
          (pid === NONE
            ? !it.project || !known.has(it.project)
            : it.project === pid),
      )
      .sort((a, b) => idNumber(a.id) - idNumber(b.id));
    const cells: (ProjectCell | undefined)[] = columns.map(() => undefined);
    for (const it of mine) {
      const k = columnOf.get(it.id)!;
      const cell = (cells[k] ??= {
        items: [],
        counts: emptyCounts(),
        proposed: [],
        blockers: [],
        finishing: [],
        finishes: [],
      });
      cell.items.push(it.id);
      const st = stageOf(it, flight);
      if (st) {
        cell.counts[st]++;
      }
      if (
        (holders.get(it.id) ?? []).length &&
        holders.get(it.id)!.every((m) => proposedMs.has(m))
      ) {
        cell.proposed.push(it.id);
      }
      if (st === "Waiting") {
        for (const b of blockersOf(it)) {
          const seen = cell.blockers.find((x) => x.id === b.id);
          if (seen) {
            seen.holds.push(it.id);
          } else {
            cell.blockers.push({ ...b, holds: [it.id] });
          }
        }
      }
    }
    const rank = { decision: 0, external: 1, work: 2 } as const;
    cells.forEach((cell, k) => {
      if (!cell) {
        return;
      }
      cell.blockers.sort(
        (a, b) =>
          rank[a.kind] - rank[b.kind] ||
          b.holds.length - a.holds.length ||
          idNumber(a.id) - idNumber(b.id),
      );
      cell.finishing = cell.items.filter((id) => onChain.has(id));
      cell.finishes = columns
        .map((c) => c.id)
        .filter((r) =>
          cell.finishing.some((id) => onChain.get(id)!.includes(r)),
        );
    });

    // What waits on its open work, in other projects.
    const waiting = new Set<string>();
    for (const it of mine.filter(isOpen)) {
      for (const d of downstream(it.id)) {
        const p = itemOf.get(d)?.project ?? NONE;
        if (p !== pid && !isReleaseItem(itemOf.get(d))) {
          waiting.add(d);
        }
      }
    }
    const releasesOf = (list: Iterable<string>) => {
      const ks = new Set<number>();
      for (const id of list) {
        const k = columnOf.get(id);
        if (k !== undefined && k < none) {
          ks.add(k);
        }
      }
      return [...ks].sort((a, b) => a - b).map((k) => columns[k]!.id);
    };
    const waitingList = [...waiting].sort((a, b) => idNumber(a) - idNumber(b));

    const decisions: RowDecision[] = s.items
      .filter(
        (it) =>
          isOwnerDecision(it) &&
          (pid === NONE
            ? !it.project || !known.has(it.project)
            : it.project === pid),
      )
      .map((d) => {
        const w = [...downstream(d.id)]
          .filter((id) => !isReleaseItem(itemOf.get(id)))
          .sort((a, b) => idNumber(a) - idNumber(b));
        return {
          id: d.id,
          title: d.title,
          waiting: w,
          releases: releasesOf([d.id, ...w]),
        };
      })
      .filter((d) => d.releases.length > 0)
      .sort(
        (a, b) =>
          b.waiting.length - a.waiting.length ||
          idNumber(a.id) - idNumber(b.id),
      );

    if (!mine.length && !waiting.size && !decisions.length) {
      continue;
    }
    rows.push({
      id: pid,
      title:
        pid === NONE
          ? "No project"
          : (projects.find((p) => p.id === pid)?.title ?? pid),
      cells,
      holdsUp: {
        items: waitingList,
        projects: [
          ...new Set(waitingList.map((id) => itemOf.get(id)?.project ?? NONE)),
        ].sort((a, b) => idNumber(a) - idNumber(b)),
        releases: releasesOf(waitingList),
      },
      finishing: columns
        .map((c) => c.id)
        .filter((r) => mine.some((it) => onChain.get(it.id)?.includes(r))),
      decisions,
    });
  }
  return { columns, rows, columnOf, chains };
}

/** How the rows are ordered: by what they hold up, or by project number. */
export type ProjectSort = "holds" | "project";

/**
 * The rows in order. By what they hold up (the default): most of other
 * projects' items waiting first, then those on more finishing chains,
 * so the bottleneck projects rise to the top; by project number to
 * break ties. "No project" comes last either way.
 */
export function sortProjectRows(
  rows: readonly ProjectRow[],
  by: ProjectSort,
): ProjectRow[] {
  const last = (r: ProjectRow) => (r.id ? 0 : 1);
  return [...rows].sort(
    (a, b) =>
      last(a) - last(b) ||
      (by === "holds"
        ? b.holdsUp.items.length - a.holdsUp.items.length ||
          b.finishing.length - a.finishing.length
        : 0) ||
      idNumber(a.id) - idNumber(b.id),
  );
}

// ------------------------------------------------------------ dependencies

export interface ProjectMatrix {
  /**
   * The projects that wait on or are waited on by another. Upstream
   * first, so most marks sit below the diagonal; among the projects
   * that can come next, the one most coupled to those just placed, so
   * tightly coupled projects sit together. A loop's projects sit
   * together, ordered to put as few of its marks above the diagonal as
   * the greedy rule finds.
   */
  order: string[];
  /** "waiting|needed" → the waiting project's open items that need it. */
  cells: Map<string, string[]>;
  /** The loops: groups of projects that wait on each other, in order. */
  loops: string[][];
  /** Each project in a loop → its loop's index. */
  loopOf: Map<string, number>;
  /** Projects in the scope that wait on no other and none waits on. */
  alone: string[];
}

/**
 * The projects' waits on each other (a design structure matrix), each
 * cell from `dependencyMatrix`, ordered to cluster coupled projects and
 * with loops found as strongly connected components (Tarjan's).
 */
export function projectMatrixOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
): ProjectMatrix {
  const base = dependencyMatrix(s, items);
  const { cells } = base;
  const nodes = [...base.order].sort((a, b) => idNumber(a) - idNumber(b));
  const weight = (a: string, b: string) => cells.get(`${a}|${b}`)?.length ?? 0;
  const needs = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const k of cells.keys()) {
    const [from, to] = k.split("|") as [string, string];
    needs.get(from)?.push(to);
  }

  // Tarjan's strongly connected components over "needs".
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const comps: string[][] = [];
  const connect = (v: string) => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    on.add(v);
    for (const w of needs.get(v) ?? []) {
      if (!idx.has(w)) {
        connect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) {
        low.set(v, Math.min(low.get(v)!, idx.get(w)!));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        comp.push(w);
      } while (w !== v);
      comps.push(comp.sort((a, b) => idNumber(a) - idNumber(b)));
    }
  };
  for (const n of nodes) {
    if (!idx.has(n)) {
      connect(n);
    }
  }
  const compOf = new Map<string, number>();
  comps.forEach((c, i) => c.forEach((n) => compOf.set(n, i)));
  const compNeeds = comps.map(
    (c) =>
      new Set(
        c.flatMap((n) =>
          (needs.get(n) ?? [])
            .map((w) => compOf.get(w)!)
            .filter((j) => j !== compOf.get(n)),
        ),
      ),
  );
  const coupling = (a: string, b: string) => weight(a, b) + weight(b, a);

  // Upstream first; next, the component most coupled to the last placed.
  const order: string[] = [];
  const placedComp = new Set<number>();
  const firstNum = (i: number) => idNumber(comps[i]![0]!);
  while (placedComp.size < comps.length) {
    const free = comps
      .map((_, i) => i)
      .filter(
        (i) =>
          !placedComp.has(i) &&
          [...compNeeds[i]!].every((j) => placedComp.has(j)),
      );
    const recent = order.slice(-3).reverse();
    const score = (i: number) =>
      recent.map((r) => comps[i]!.reduce((sum, n) => sum + coupling(n, r), 0));
    free.sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      for (let t = 0; t < sa.length; t++) {
        if (sa[t] !== sb[t]) {
          return sb[t]! - sa[t]!;
        }
      }
      return firstNum(a) - firstNum(b);
    });
    const next = free[0]!;
    placedComp.add(next);
    order.push(...inLoopOrder(comps[next]!, weight));
  }
  const loops = comps
    .filter((c) => c.length > 1)
    .map((c) => order.filter((n) => c.includes(n)))
    .sort((a, b) => order.indexOf(a[0]!) - order.indexOf(b[0]!));
  const loopOf = new Map<string, number>();
  loops.forEach((l, i) => l.forEach((n) => loopOf.set(n, i)));
  return { order, cells, loops, loopOf, alone: base.alone };
}

/**
 * A loop's projects in order: each time, the one whose needs on those
 * not yet placed weigh least (so few marks sit above the diagonal), the
 * most waited on by those not yet placed to break ties, then by number.
 */
function inLoopOrder(
  comp: readonly string[],
  weight: (a: string, b: string) => number,
): string[] {
  if (comp.length < 2) {
    return [...comp];
  }
  const left = new Set(comp);
  const out: string[] = [];
  while (left.size) {
    const rest = [...left];
    const above = (n: string) =>
      rest.reduce((sum, w) => (w === n ? sum : sum + weight(n, w)), 0);
    const below = (n: string) =>
      rest.reduce((sum, w) => (w === n ? sum : sum + weight(w, n)), 0);
    rest.sort(
      (a, b) =>
        above(a) - above(b) || below(b) - below(a) || idNumber(a) - idNumber(b),
    );
    out.push(rest[0]!);
    left.delete(rest[0]!);
  }
  return out;
}
