/**
 * The Dependencies view's model (CS-694; views/Dependencies.tsx): what one
 * chosen milestone or item waits on and what it unblocks, as two small
 * trees around it, and the global structure behind a toggle (the
 * earliest possible start of every milestone, in waves). Pure, for tests.
 *
 * The graph mixes two levels, and each node is read at its own:
 *
 * - An **item** waits on its open needs: items and milestones.
 * - A **milestone** waits on what holds it up besides its own work: the
 *   milestones (or loose items) its open items need, the milestones it
 *   names, and its own open decisions and outside waits. Its own work
 *   items are its content, not a wait, so they aren't in the tree; the
 *   pane lists them.
 *
 * "Unblocks" is the other way round, plus one link up a level: an item
 * unblocks the open items that need it and is part of the open
 * milestones that hold it, so the chain carries on from there.
 */

import {
  committedOnly,
  idNumber,
  type InFlight,
  isOpen,
  isOwnerDecision,
  isReleaseItem,
  milestoneRoadmapOf,
  releaseBandsOf,
  releaseClosuresOf,
  type Stage,
  stageOf,
  STAGES,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "./work.ts";

export type DepDir = "up" | "down";

/** One wait in the graph, from the node that waits to the one waited on. */
export interface DepEdge {
  /** The other end: waited on (up) or waiting (down). */
  id: string;
  /**
   * The item needs behind a wait between levels: `from` (an item in or
   * of the waiting node) needs `to` (an item in or of the other). Empty
   * when the wait is direct (an item's own need, a milestone it names).
   */
  via: Array<{ from: string; to: string }>;
  /**
   * How the two are tied: an item's or milestone's own need ("needs"),
   * an item being part of a milestone ("part-of", down only), or a
   * milestone's own decision or outside wait ("holds").
   */
  rel: "needs" | "part-of" | "holds";
}

/** Every wait between open items and milestones, both ways. */
export interface DepGraph {
  up: Map<string, DepEdge[]>;
  down: Map<string, DepEdge[]>;
  /** Items and milestones the graph knows, open ones only. */
  items: Map<string, WorkItem>;
  milestones: Map<string, WorkMilestone>;
}

const byNumber = (a: { id: string }, b: { id: string }) =>
  idNumber(a.id) - idNumber(b.id);

/**
 * The dependency graph of the open work. Proposed milestones join it only
 * when asked for, as on the roadmap; proposed items are always in it,
 * since their needs are real.
 */
export function dependencyGraphOf(
  snapshot: WorkSnapshot,
  proposals = false,
): DepGraph {
  const s = proposals ? snapshot : committedOnly(snapshot);
  const items = new Map(
    s.items.filter((it) => isOpen(it)).map((it) => [it.id, it]),
  );
  const milestones = new Map(
    s.milestones
      .filter((m) => m.state !== "done" && m.state !== "dropped")
      .map((m) => [m.id, m]),
  );
  // Which open milestones hold each item.
  const holders = new Map<string, string[]>();
  for (const m of milestones.values()) {
    for (const c of m.constraints) {
      if (!milestones.has(c.id)) {
        holders.set(c.id, [...(holders.get(c.id) ?? []), m.id]);
      }
    }
  }
  const up = new Map<string, Map<string, DepEdge>>();
  const add = (
    from: string,
    to: string,
    rel: DepEdge["rel"],
    via?: { from: string; to: string },
  ) => {
    if (from === to) {
      return;
    }
    const out = up.get(from) ?? new Map<string, DepEdge>();
    up.set(from, out);
    const e = out.get(to) ?? { id: to, via: [], rel };
    if (via && !e.via.some((v) => v.from === via.from && v.to === via.to)) {
      e.via.push(via);
    }
    out.set(to, e);
  };
  const known = (id: string) => items.has(id) || milestones.has(id);
  // An item waits on its open needs.
  for (const it of items.values()) {
    for (const n of it.open_needs) {
      if (known(n)) {
        add(it.id, n, "needs");
      }
    }
  }
  // A milestone waits on what holds it up besides its own work.
  for (const m of milestones.values()) {
    for (const c of m.constraints) {
      if (milestones.has(c.id)) {
        add(m.id, c.id, "needs");
        continue;
      }
      const it = items.get(c.id);
      if (!it) {
        continue;
      }
      if (it.kind === "external" || isOwnerDecision(it)) {
        add(m.id, it.id, "holds");
      }
      // A need inside the milestone is its own work, not a wait; a need
      // in a milestone that holds the waiting item too ties nothing (as
      // on the roadmap, `orderOf`).
      const mine = holders.get(it.id) ?? [];
      for (const n of it.open_needs) {
        const held = holders.get(n) ?? [];
        if (milestones.has(n)) {
          add(m.id, n, "needs", { from: it.id, to: n });
        } else if (held.includes(m.id)) {
          continue;
        } else if (held.length) {
          for (const h of held.filter((h) => !mine.includes(h))) {
            add(m.id, h, "needs", { from: it.id, to: n });
          }
        } else if (items.has(n)) {
          add(m.id, n, "needs", { from: it.id, to: n });
        }
      }
    }
  }
  const upOut = new Map<string, DepEdge[]>();
  const downOut = new Map<string, DepEdge[]>();
  for (const [from, edges] of up) {
    upOut.set(from, [...edges.values()].sort(byNumber));
    for (const e of edges.values()) {
      downOut.set(e.id, [
        ...(downOut.get(e.id) ?? []),
        {
          id: from,
          via: e.via.map((v) => ({ ...v })),
          rel: e.rel,
        },
      ]);
    }
  }
  // An item is part of the open milestones that hold it.
  for (const [id, hs] of holders) {
    if (!items.has(id)) {
      continue;
    }
    for (const h of hs) {
      const list = downOut.get(id) ?? [];
      if (!list.some((e) => e.id === h)) {
        list.push({ id: h, via: [], rel: "part-of" });
      }
      downOut.set(id, list);
    }
  }
  for (const [id, list] of downOut) {
    downOut.set(id, list.sort(byNumber));
  }
  return { up: upOut, down: downOut, items, milestones };
}

/** The next nodes one way from a node. */
export const edgesOf = (g: DepGraph, id: string, dir: DepDir): DepEdge[] =>
  (dir === "up" ? g.up : g.down).get(id) ?? [];

/** How far a chain goes one way from a node. */
export interface Reach {
  /** Distinct items and milestones beyond it. */
  nodes: number;
  /**
   * The longest chain beyond it, in levels. Those that wait on each other
   * (a loop) count as one level, so a loop never makes it endless.
   */
  levels: number;
  /** Open decisions the owner answers, among them. */
  decisions: number;
  /** Open waits on other parties, among them. */
  outside: number;
}

/**
 * Every node's reach one way, computed once: distinct nodes by search,
 * levels as the longest path over the graph's loops (strongly connected
 * components) collapsed.
 */
export function reachOf(g: DepGraph, dir: DepDir): Map<string, Reach> {
  const next = dir === "up" ? g.up : g.down;
  const ids = [...new Set([...g.items.keys(), ...g.milestones.keys()])];
  // Tarjan's strongly connected components, iteratively.
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const comp = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  let comps = 0;
  for (const root of ids) {
    if (index.has(root)) {
      continue;
    }
    const work: Array<{ v: string; i: number }> = [{ v: root, i: 0 }];
    index.set(root, counter);
    low.set(root, counter++);
    stack.push(root);
    onStack.add(root);
    while (work.length) {
      const top = work[work.length - 1]!;
      const edges = next.get(top.v) ?? [];
      if (top.i < edges.length) {
        const w = edges[top.i++]!.id;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter++);
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(top.v, Math.min(low.get(top.v)!, index.get(w)!));
        }
        continue;
      }
      work.pop();
      if (work.length) {
        const parent = work[work.length - 1]!.v;
        low.set(parent, Math.min(low.get(parent)!, low.get(top.v)!));
      }
      if (low.get(top.v) === index.get(top.v)) {
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          comp.set(w, comps);
        } while (w !== top.v);
        comps++;
      }
    }
  }
  // Components come out in reverse topological order: successors first.
  const members = new Map<number, string[]>();
  for (const [v, c] of comp) {
    members.set(c, [...(members.get(c) ?? []), v]);
  }
  const levelsOf = new Map<number, number>();
  for (let c = 0; c < comps; c++) {
    let best = 0;
    for (const v of members.get(c) ?? []) {
      for (const e of next.get(v) ?? []) {
        const d = comp.get(e.id);
        if (d !== undefined && d !== c) {
          best = Math.max(best, 1 + levelsOf.get(d)!);
        }
      }
    }
    // A loop's members reach each other: one more level, if it has any.
    levelsOf.set(c, best + ((members.get(c)?.length ?? 1) > 1 ? 1 : 0));
  }
  const out = new Map<string, Reach>();
  for (const id of ids) {
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const v = queue.pop()!;
      for (const e of next.get(v) ?? []) {
        if (e.id !== id && !seen.has(e.id)) {
          seen.add(e.id);
          queue.push(e.id);
        }
      }
    }
    let decisions = 0;
    let outside = 0;
    for (const v of seen) {
      const it = g.items.get(v);
      if (it && isOwnerDecision(it)) {
        decisions++;
      } else if (it?.kind === "external") {
        outside++;
      }
    }
    out.set(id, {
      nodes: seen.size,
      levels: seen.size ? Math.max(1, levelsOf.get(comp.get(id)!) ?? 0) : 0,
      decisions,
      outside,
    });
  }
  return out;
}

/** One node in a focused tree. */
export interface DepTreeNode {
  id: string;
  edge: DepEdge;
  /** Its level: 1 next to the focus. */
  level: number;
  /** Shown, when expanded; absent at the cut. */
  children?: DepTreeNode[];
  /** It leads back to a node on the way here: the chain is a loop. */
  loop?: boolean;
  /** Shown nearer the focus already, and expanded there. */
  repeat?: boolean;
  /** Whether anything lies beyond it (it can be expanded). */
  more: boolean;
}

/**
 * The tree one way from `root`, `depth` levels deep. Built breadth
 * first, so a node that two chains reach is expanded where it is nearest
 * the focus and marked as a repeat elsewhere; a node already on the way
 * here ends its branch as a loop. Below the cut a node keeps no children,
 * and says whether it has any.
 */
export function depTreeOf(
  g: DepGraph,
  root: string,
  dir: DepDir,
  depth: number,
  /** The nodes on the way to `root`, when expanding below a cut. */
  trail: readonly string[] = [],
): DepTreeNode[] {
  const expanded = new Set<string>([root, ...trail]);
  const top: DepTreeNode[] = [];
  type Pending = { node: DepTreeNode; path: string[] };
  const childrenOf = (id: string, level: number, path: string[]): Pending[] =>
    edgesOf(g, id, dir).map((edge) => {
      const loop = path.includes(edge.id);
      const node: DepTreeNode = {
        id: edge.id,
        edge,
        level,
        more: !loop && edgesOf(g, edge.id, dir).length > 0,
        ...(loop ? { loop: true } : {}),
      };
      return { node, path: [...path, edge.id] };
    });
  let layer = childrenOf(root, 1, [...trail, root]);
  top.push(...layer.map((p) => p.node));
  for (let level = 1; level <= depth && layer.length; level++) {
    const nextLayer: Pending[] = [];
    for (const p of layer) {
      const n = p.node;
      if (n.loop) {
        continue;
      }
      if (expanded.has(n.id)) {
        n.repeat = true;
        continue;
      }
      expanded.add(n.id);
      if (level === depth) {
        continue;
      }
      const kids = childrenOf(n.id, level + 1, p.path);
      if (kids.length) {
        n.children = kids.map((k) => k.node);
        nextLayer.push(...kids);
      }
    }
    layer = nextLayer;
  }
  return top;
}

/** The release a node belongs to: the earliest that needs it. */
export interface NodeRelease {
  /** The release item, or undefined for no release. */
  id?: string;
  /** "2.0.0-alpha.1", or "No release". */
  name: string;
}

/**
 * Every open milestone's and item's release, in CS-685's terms: a
 * milestone is in the band of the earliest release that needs it; an
 * item in the earliest band of the milestones that hold it or of a
 * release that needs it itself; a release item in its own.
 */
export function nodeReleasesOf(
  snapshot: WorkSnapshot,
  proposals = false,
): Map<string, NodeRelease> {
  const s = proposals ? snapshot : committedOnly(snapshot);
  const closures = releaseClosuresOf(s, proposals);
  const { bands, bandOf } = releaseBandsOf(s, closures);
  const none = closures.length;
  const out = new Map<string, NodeRelease>();
  const named = (k: number): NodeRelease =>
    k >= none
      ? { name: "No release" }
      : { id: bands[k]!.id, name: bands[k]!.name };
  const ixOf = new Map(closures.map((c, k) => [c.id, k]));
  for (const [id, k] of bandOf) {
    out.set(id, named(k));
  }
  const best = new Map<string, number>();
  const offer = (id: string, k: number) =>
    best.set(id, Math.min(best.get(id) ?? none, k));
  for (const m of s.milestones) {
    const k = bandOf.get(m.id);
    if (k === undefined) {
      continue;
    }
    for (const c of m.constraints) {
      offer(c.id, k);
    }
  }
  for (const it of s.items) {
    const k = ixOf.get(it.id);
    if (k === undefined) {
      continue;
    }
    for (const n of it.needs) {
      offer(n, k);
    }
  }
  for (const it of s.items) {
    if (!isOpen(it) || out.has(it.id)) {
      continue;
    }
    out.set(it.id, named(best.get(it.id) ?? none));
  }
  return out;
}

/** A milestone's open work by stage, for its node. */
export function milestoneStages(
  m: WorkMilestone,
  items: ReadonlyMap<string, WorkItem>,
  all: readonly WorkItem[],
  flight?: InFlight,
): Record<Stage, number> {
  const byId = new Map(all.map((it) => [it.id, it]));
  const counts = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<
    Stage,
    number
  >;
  for (const c of m.constraints) {
    const it = items.get(c.id) ?? byId.get(c.id);
    const st = it && stageOf(it, flight);
    if (st) {
      counts[st]++;
    }
  }
  return counts;
}

/**
 * A milestone's stage as one word for its node: Done, In flight if any
 * of its items is, Ready if any can start, Waiting if all wait, Proposed
 * if it is.
 */
export function milestoneStage(
  m: WorkMilestone,
  counts: Record<Stage, number>,
): Stage {
  if (m.state === "done") {
    return "Done";
  }
  if (m.state === "proposed") {
    return "Proposed";
  }
  if (counts["In flight"]) {
    return "In flight";
  }
  if (counts.Ready) {
    return "Ready";
  }
  if (counts.Waiting) {
    return "Waiting";
  }
  return counts.Proposed ? "Proposed" : "Ready";
}

/** One project's lane on the waves grid. */
export interface WaveLane {
  /** The project's ID, or "" for milestones in none. */
  id: string;
  /** Milestones by wave: index 0 is wave 1. */
  waves: string[][];
}

/** The global structure: every open milestone at its earliest possible start. */
export interface Waves {
  /** How many waves there are. */
  count: number;
  lanes: WaveLane[];
  /** Each milestone's wave, 1 first. */
  waveOf: Map<string, number>;
  /** Milestones that wait on each other, by milestone (a loop's members). */
  loopOf: Map<string, string[]>;
  /** Milestones per wave, across every lane. */
  perWave: number[];
}

/**
 * The depth layering, honestly labeled: each open milestone's earliest
 * possible start, in waves. Wave 1 waits on nothing open; a milestone's
 * wave is one more than the latest wave of what it waits on. It is the
 * earliest it could start with unlimited hands, not when it will: the
 * Plan view answers when. Release items take no wave of their own.
 */
export function wavesOf(
  snapshot: WorkSnapshot,
  flight?: InFlight,
  proposals = false,
): Waves {
  const s = proposals ? snapshot : committedOnly(snapshot);
  const itemOf = new Map(s.items.map((it) => [it.id, it]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const rows = milestoneRoadmapOf(s, s.items, flight, proposals).filter(
    (r) => !isReleaseItem(itemOf.get(r.id)),
  );
  // Release gates sit between waves on the roadmap; here they place
  // nothing, so renumber the waves that are left without gaps.
  const used = [...new Set(rows.map((r) => r.step))].sort((a, b) => a - b);
  const waveOfStep = new Map(used.map((st, i) => [st, i + 1]));
  const waveOf = new Map(rows.map((r) => [r.id, waveOfStep.get(r.step)!]));
  const count = used.length;
  const loopOf = new Map<string, string[]>();
  for (const r of rows) {
    const group = r.group.filter((id) => waveOf.has(id));
    if (group.length > 1) {
      loopOf.set(r.id, group);
    }
  }
  const laneIds = [
    ...new Set(rows.map((r) => msOf.get(r.id)?.project ?? "")),
  ].sort((a, b) => (a && b ? idNumber(a) - idNumber(b) : a ? -1 : 1));
  const lanes: WaveLane[] = laneIds.map((id) => ({
    id,
    waves: Array.from({ length: count }, () => [] as string[]),
  }));
  const laneOf = new Map(lanes.map((l) => [l.id, l]));
  const perWave = Array.from({ length: count }, () => 0);
  for (const r of rows) {
    const w = waveOf.get(r.id)!;
    laneOf.get(msOf.get(r.id)?.project ?? "")!.waves[w - 1]!.push(r.id);
    perWave[w - 1]!++;
  }
  for (const l of lanes) {
    for (const w of l.waves) {
      w.sort((a, b) => idNumber(a) - idNumber(b));
    }
  }
  return { count, lanes, waveOf, loopOf, perWave };
}

/**
 * Open milestones ranked by how much waits on them, directly or not: a
 * starting point when nothing is chosen yet.
 */
export function mostWaitedOn(
  g: DepGraph,
  down: ReadonlyMap<string, Reach>,
  limit: number,
): string[] {
  return [...g.milestones.keys()]
    .filter((id) => (down.get(id)?.nodes ?? 0) > 0)
    .sort(
      (a, b) =>
        (down.get(b)?.nodes ?? 0) - (down.get(a)?.nodes ?? 0) ||
        idNumber(a) - idNumber(b),
    )
    .slice(0, limit);
}

/** The levels a focused tree shows by default, and its bounds. */
export const DEPTH_DEFAULT = 3;
export const DEPTH_MIN = 1;
export const DEPTH_MAX = 6;

/** A depth from the URL, kept in bounds. */
export function depthOf(v: string | number | undefined): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n)
    ? Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, n))
    : DEPTH_DEFAULT;
}

/**
 * Milestones and items whose ID or title holds every word typed, the
 * milestones first: the view's own chooser.
 */
export function matchFocus(
  s: WorkSnapshot,
  q: string,
  limit = 12,
): Array<{ id: string; title: string; kind: "milestone" | "item" }> {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }
  const hit = (id: string, title: string) => {
    const hay = `${id} ${title}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  };
  const ms = s.milestones
    .filter((m) => m.state !== "dropped" && hit(m.id, m.title))
    .sort(byNumber)
    .map((m) => ({ id: m.id, title: m.title, kind: "milestone" as const }));
  const its = s.items
    .filter((it) => it.state !== "dropped" && hit(it.id, it.title))
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || byNumber(a, b))
    .map((it) => ({ id: it.id, title: it.title, kind: "item" as const }));
  return [...ms, ...its].slice(0, limit);
}
