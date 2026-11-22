/**
 * The Path view's model (CS-746; views/workPath.tsx; DESIGN.md, "The Path
 * view"): only what lies upstream of one target, a release, a milestone
 * or an item, collapsed to milestones so it is small enough to draw with
 * arrows. Pure, for tests.
 *
 * - **The closure** follows needs. A release reaches what it needs; a
 *   milestone reaches what it names (its items, its milestones); an item
 *   reaches its open needs. Done and dropped work ends a chain, and so
 *   does another release: it is one node, its own path one click away.
 * - **Collapsed to milestones.** Each open item on the path is drawn
 *   inside the milestone that holds it. A milestone reached as a whole
 *   (named by the target or by a milestone on the path) holds all its
 *   open items; one reached only through an item's need holds just the
 *   items on the path, and says how many of its own that is. An item in
 *   no milestone is a node of its own. Decisions and outside waits are
 *   always nodes of their own: the gates.
 * - **The spine** is the longest remaining chain to the target, counted
 *   in nodes. Between chains of one length it takes the one with more
 *   open work items on it, then the one whose nodes have the lower
 *   numbers, first node first, so the same board always draws the same
 *   spine.
 * - **The layout** is layered: a node's layer is how far it sits from
 *   the target along its longest chain, the target last, so the spine
 *   takes one node in every layer, in the first lane. Nothing moves when
 *   a node opens: positions come from here, never from what is shown.
 */

import {
  idNumber,
  type InFlight,
  isOpen,
  isReleaseItem,
  isWork,
  releaseBandsOf,
  releaseClosuresOf,
  shortVersion,
  type Stage,
  stageOf,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "./work.ts";

export type PathTargetKind = "release" | "milestone" | "item";

/** What a node on the path is. */
export type PathNodeKind =
  "milestone" | "item" | "decision" | "external" | "release" | "group";

/** Nodes that would sit side by side, alike, before they are drawn as one group. */
export const BUNDLE_MIN = 3;
/** A group's ID: this, then the ID of the node its members all lead to. */
export const GROUP_PREFIX = "group:";

/** One node of the drawing: a milestone, an item, a gate or another release. */
export interface PathNode {
  id: string;
  kind: PathNodeKind;
  title: string;
  /** The target itself. */
  target: boolean;
  proposed: boolean;
  /**
   * A milestone's open items on the path, by number: every open item it
   * names when reached whole, only those the path needs otherwise. An
   * item's own ID for an item or a gate; empty for a release.
   */
  items: string[];
  /** A milestone reached as a whole, not only through some of its items. */
  whole: boolean;
  /** A milestone's open items in all (for one reached in part: "2 of its 9"). */
  openTotal: number;
  /** Of `items`, the work that can start now. */
  ready: string[];
  /** Of `items`, the work someone has in progress. */
  inFlight: string[];
  /** Its stage as one fill: In flight, Ready, Waiting, Proposed or Done. */
  stage: Stage;
  /** For a gate: who answers it or whom it waits on, and whether it can be answered now. */
  gate?: { who?: string; answerable: boolean };
  /** For another release: its version, short, and its open milestones. */
  release?: { short: string; milestones: number };
  /** For a group: the nodes drawn as it, by number. */
  members?: PathNode[];
  /** The longest chain from it to the target, in arrows (the target is 0). */
  rank: number;
  /** Its column, the first upstream at 0 and the target last. */
  layer: number;
  /** Its row in the column; the spine is in lane 0. */
  lane: number;
  spine: boolean;
}

/** An arrow: `from` must be done before `to`. */
export interface PathEdge {
  from: string;
  to: string;
  /**
   * Why: the item needs behind it (`from` an item in `to` or `to` itself,
   * `to` an item in `from` or `from` itself). Empty when the target or a
   * milestone names the node directly.
   */
  via: Array<{ from: string; to: string }>;
  spine: boolean;
}

export interface PathView {
  target: {
    id: string;
    kind: PathTargetKind;
    title: string;
    /** A release's version, short ("alpha.1"). */
    short?: string;
    state: string;
    proposed: boolean;
    /** Where the target sits: the milestones that hold it and its release, by CS-685's band. */
    milestones: string[];
  };
  nodes: PathNode[];
  edges: PathEdge[];
  /** The longest remaining chain, upstream first, the target last. */
  spine: string[];
  /** Columns and rows the drawing needs. */
  layers: number;
  lanes: number;
  /** The chain in words' numbers: the spine's milestones and items before the target. */
  chain: { milestones: number; items: number; gates: number; releases: number };
  /** Other chains just as long as the spine (it was chosen among them by the rule above). */
  ties: number;
  /** Every gate on the path, answerable first; and those on the spine. */
  gates: string[];
  spineGates: string[];
  /** Gates that can be answered now. */
  answerable: string[];
  /** Open work on the path that can start now, by number; and that on the spine. */
  ready: string[];
  spineReady: string[];
  /** Open on the path: milestones (the target's own aside) and work items. */
  open: { milestones: number; items: number };
  /** Arrows left out to break a loop (a tracker error), each `from` → `to`. */
  loops: Array<{ from: string; to: string }>;
}

/** The target asked for: an ID, or the release when none is chosen. */
export interface PathTargetChoice {
  id: string;
  kind: PathTargetKind;
}

/**
 * Reads a target from the URL: `focus=` names a milestone or an item, and
 * otherwise the release picked is the target.
 */
export function pathTargetOf(
  s: WorkSnapshot,
  focus: string | undefined,
  release: string | undefined,
): PathTargetChoice | undefined {
  if (focus) {
    const m = s.milestones.find((x) => x.id === focus);
    if (m && m.state !== "dropped") {
      return { id: m.id, kind: "milestone" };
    }
    const it = s.items.find((x) => x.id === focus);
    if (it && it.state !== "dropped") {
      return { id: it.id, kind: isReleaseItem(it) ? "release" : "item" };
    }
  }
  return release ? { id: release, kind: "release" } : undefined;
}

const byNumber = (a: string, b: string) => idNumber(a) - idNumber(b);

/**
 * The path to one target (see the module's note). Proposed milestones
 * and items join only when `proposals`; a proposed target is always
 * drawn.
 */
export function pathViewOf(
  snap: WorkSnapshot,
  targetId: string,
  {
    proposals = false,
    flight,
  }: { proposals?: boolean; flight?: InFlight } = {},
): PathView | undefined {
  const itemOf = new Map(snap.items.map((i) => [i.id, i]));
  const msOf = new Map(
    snap.milestones.filter((m) => m.state !== "dropped").map((m) => [m.id, m]),
  );
  const tItem = itemOf.get(targetId);
  const tMs = msOf.get(targetId);
  if (!tMs && (!tItem || tItem.state === "dropped")) {
    return undefined;
  }
  const kind: PathTargetKind = tMs
    ? "milestone"
    : isReleaseItem(tItem)
      ? "release"
      : "item";

  const openMs = (id: string) => {
    const m = msOf.get(id);
    return (
      !!m &&
      m.state !== "done" &&
      (proposals || m.state !== "proposed" || id === targetId)
    );
  };
  const counts = (it: WorkItem) =>
    isOpen(it) && (proposals || it.state !== "proposed");

  // For a release, an earlier release's milestones are that release's
  // (as in the Release view): its node stands for them and their items.
  const earlierOf = new Map<string, string>();
  if (kind === "release") {
    const sc = proposals
      ? snap
      : {
          ...snap,
          milestones: snap.milestones.filter((m) => m.state !== "proposed"),
        };
    const closures = releaseClosuresOf(
      sc,
      proposals || tItem!.state === "proposed",
    );
    const { bandOf } = releaseBandsOf(sc, closures);
    const k = closures.findIndex((c) => c.id === targetId);
    for (const [id, b] of bandOf) {
      if (k >= 0 && b < k && msOf.has(id)) {
        earlierOf.set(id, closures[b]!.id);
      }
    }
  }
  /** The earlier releases an item is in, when every milestone that holds it is one of theirs. */
  const earlierItem = new Map<string, string[]>();
  const earlierOfItem = (it: WorkItem) => {
    const holders = it.milestones.filter(openMs);
    return holders.length && holders.every((m) => earlierOf.has(m))
      ? [...new Set(holders.map((m) => earlierOf.get(m)!))]
      : undefined;
  };

  // ---- the closure, item by item
  const onPath = new Set<string>(); // open items (not releases) on the path
  const whole = new Set<string>(); // milestones reached as a whole
  const releases = new Set<string>(); // other releases reached
  const queue: string[] = [];
  if (kind === "release") {
    queue.push(...tItem!.needs);
  } else {
    queue.push(targetId);
  }
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    if (msOf.has(id)) {
      if (earlierOf.has(id)) {
        releases.add(earlierOf.get(id)!);
      } else if (openMs(id)) {
        whole.add(id);
        queue.push(...msOf.get(id)!.constraints.map((c) => c.id));
      }
      continue;
    }
    const it = itemOf.get(id);
    if (!it || (id === targetId && kind === "release")) {
      continue;
    }
    if (id !== targetId && !counts(it)) {
      continue;
    }
    if (isReleaseItem(it) && id !== targetId) {
      // Another release answers for its own path: one node, not opened.
      releases.add(id);
      continue;
    }
    const earlier = id === targetId ? undefined : earlierOfItem(it);
    if (earlier) {
      earlier.forEach((r) => releases.add(r));
      earlierItem.set(id, earlier);
      continue;
    }
    onPath.add(id);
    queue.push(...it.open_needs);
  }

  // ---- where each item is drawn
  const partial = new Set<string>();
  const homesOf = new Map<string, string[]>();
  const isGate = (it: WorkItem) =>
    it.kind === "decision" || it.kind === "external";
  for (const id of [...onPath].sort(byNumber)) {
    const it = itemOf.get(id)!;
    if (id === targetId || isGate(it)) {
      homesOf.set(id, [id]);
      continue;
    }
    const holders = it.milestones.filter(openMs).sort(byNumber);
    if (kind === "milestone" && holders.includes(targetId)) {
      homesOf.set(id, [targetId]);
      continue;
    }
    const wholes = holders.filter((m) => whole.has(m));
    if (wholes.length) {
      homesOf.set(id, wholes);
    } else if (holders.length) {
      partial.add(holders[0]!);
      homesOf.set(id, [holders[0]!]);
    } else {
      homesOf.set(id, [id]);
    }
  }
  const homeOf = (id: string): string[] =>
    homesOf.get(id) ??
    earlierItem.get(id) ??
    (earlierOf.has(id) ? [earlierOf.get(id)!] : undefined) ??
    (msOf.has(id) && (whole.has(id) || partial.has(id))
      ? [id]
      : releases.has(id)
        ? [id]
        : []);

  // ---- arrows between nodes
  const edgeOf = new Map<string, PathEdge>();
  const arrow = (
    from: string,
    to: string,
    via?: { from: string; to: string },
  ) => {
    if (from === to) {
      return;
    }
    const key = `${from}>${to}`;
    const e = edgeOf.get(key) ?? { from, to, via: [], spine: false };
    if (via && !e.via.some((v) => v.from === via.from && v.to === via.to)) {
      e.via.push(via);
    }
    edgeOf.set(key, e);
  };
  for (const id of onPath) {
    const it = itemOf.get(id)!;
    for (const n of it.open_needs) {
      for (const b of homeOf(n)) {
        for (const a of homeOf(id)) {
          arrow(b, a, { from: id, to: n });
        }
      }
    }
  }
  for (const m of [...whole, ...partial]) {
    if (!whole.has(m)) {
      continue;
    }
    for (const c of msOf.get(m)!.constraints) {
      if (openMs(c.id) && whole.has(c.id)) {
        arrow(c.id, m);
      } else {
        const it = itemOf.get(c.id);
        if (it && onPath.has(c.id) && isGate(it)) {
          arrow(c.id, m);
        }
      }
    }
  }
  if (kind === "release") {
    for (const n of tItem!.needs) {
      for (const b of homeOf(n)) {
        arrow(b, targetId);
      }
    }
  }

  // ---- nodes
  const nodeIds = new Set<string>([targetId]);
  for (const hs of homesOf.values()) {
    hs.forEach((h) => nodeIds.add(h));
  }
  whole.forEach((m) => nodeIds.add(m));
  releases.forEach((r) => nodeIds.add(r));
  const itemsIn = new Map<string, string[]>();
  for (const [id, hs] of homesOf) {
    for (const h of hs) {
      itemsIn.set(h, [...(itemsIn.get(h) ?? []), id]);
    }
  }
  const isReadyWork = (it: WorkItem) =>
    isWork(it) && !isReleaseItem(it) && stageOf(it, flight) === "Ready";
  const isFlying = (it: WorkItem) =>
    isWork(it) && stageOf(it, flight) === "In flight";

  // ---- the longest chains, by depth-first search; loops are broken
  const out = new Map<string, string[]>();
  for (const e of edgeOf.values()) {
    out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  }
  const workOn = (id: string) =>
    (itemsIn.get(id) ?? []).filter((x) => itemOf.get(x)?.kind === "work")
      .length;
  /** The best chain from a node to the target: the longest, then the most work, then the lowest numbers. */
  const best = new Map<string, { chain: string[]; work: number }>();
  const loops: Array<{ from: string; to: string }> = [];
  const onStack = new Set<string>();
  const better = (
    a: { chain: string[]; work: number },
    b: { chain: string[]; work: number },
  ) => {
    if (a.chain.length !== b.chain.length) {
      return a.chain.length > b.chain.length;
    }
    if (a.work !== b.work) {
      return a.work > b.work;
    }
    for (let i = 0; i < a.chain.length; i++) {
      const d = idNumber(a.chain[i]!) - idNumber(b.chain[i]!);
      if (d) {
        return d < 0;
      }
    }
    return false;
  };
  const chainOf = (id: string): { chain: string[]; work: number } | null => {
    if (id === targetId) {
      return { chain: [id], work: 0 };
    }
    const known = best.get(id);
    if (known) {
      return known;
    }
    onStack.add(id);
    let top: { chain: string[]; work: number } | null = null;
    for (const next of [...(out.get(id) ?? [])].sort(byNumber)) {
      if (onStack.has(next)) {
        loops.push({ from: id, to: next });
        continue;
      }
      const c = chainOf(next);
      if (!c) {
        continue;
      }
      const mine = { chain: [id, ...c.chain], work: c.work + workOn(id) };
      if (!top || better(mine, top)) {
        top = mine;
      }
    }
    onStack.delete(id);
    // A node cut off from the target by a broken loop sits beside it.
    const result = top ?? { chain: [id, targetId], work: workOn(id) };
    best.set(id, result);
    return result;
  };
  let spineBest: { chain: string[]; work: number } = {
    chain: [targetId],
    work: 0,
  };
  for (const id of [...nodeIds].sort(byNumber)) {
    const c = chainOf(id)!;
    if (better(c, spineBest)) {
      spineBest = c;
    }
  }
  const spine = spineBest.chain;
  const ties = [...nodeIds].filter(
    (id) =>
      id !== spine[0] &&
      !spine.includes(id) &&
      best.get(id)?.chain.length === spine.length,
  ).length;

  // ---- nodes, before they are placed
  const rankOf = new Map<string, number>();
  for (const id of nodeIds) {
    rankOf.set(id, id === targetId ? 0 : best.get(id)!.chain.length - 1);
  }
  const maxRank = spine.length - 1;
  const spineSet = new Set(spine);
  const isLoop = (e: { from: string; to: string }) =>
    loops.some((l) => l.from === e.from && l.to === e.to);
  const made = new Map<string, PathNode>();
  for (const id of nodeIds) {
    const m = msOf.get(id);
    const it = itemOf.get(id);
    const items = (itemsIn.get(id) ?? []).sort(byNumber);
    const its = items
      .map((x) => itemOf.get(x))
      .filter((x): x is WorkItem => !!x);
    const isRelease =
      releases.has(id) || (id === targetId && kind === "release");
    const rank = rankOf.get(id)!;
    const base = {
      id,
      target: id === targetId,
      items: m ? items : isRelease ? [] : [id],
      whole: m ? whole.has(id) || id === targetId : true,
      openTotal: m
        ? m.constraints.filter((c) => {
            const x = itemOf.get(c.id);
            return !!x && counts(x);
          }).length
        : 0,
      ready: m
        ? its.filter(isReadyWork).map((x) => x.id)
        : it && !isRelease && isReadyWork(it)
          ? [id]
          : [],
      inFlight: m
        ? its.filter(isFlying).map((x) => x.id)
        : it && !isRelease && isFlying(it)
          ? [id]
          : [],
      rank,
      layer: maxRank - rank,
      lane: 0,
      spine: spineSet.has(id),
    };
    if (m) {
      made.set(id, {
        ...base,
        kind: "milestone",
        title: m.title,
        proposed: m.state === "proposed",
        stage: milestoneStageOf(m, its, base.ready, base.inFlight),
      });
      continue;
    }
    const x = it!;
    if (isRelease) {
      made.set(id, {
        ...base,
        kind: "release",
        title: x.title,
        proposed: x.state === "proposed",
        stage: stageOf(x, flight) ?? "Done",
        release: {
          short: shortVersion(x.release ?? x.title),
          milestones: x.needs.filter(openMs).length,
        },
      });
      continue;
    }
    made.set(id, {
      ...base,
      kind: x.kind === "work" ? "item" : x.kind,
      title: x.title,
      proposed: x.state === "proposed",
      stage: stageOf(x, flight) ?? "Done",
      ...(isGate(x)
        ? {
            gate: {
              who: x.kind === "decision" ? x.decider : x.waiting_on,
              answerable: !x.open_needs.length,
            },
          }
        : {}),
    });
  }
  let live = [...edgeOf.values()].filter((e) => !isLoop(e));

  // ---- bundles: overview by aggregation, not by shrinking. Nodes off
  // the spine whose one arrow goes to the same node, and that either
  // have nothing open before them or lead straight to the target, are
  // drawn as one group that opens in place; arrows into them go to the
  // group. Gates never join one, nor does a node a gate holds: every
  // gate stays in view, with what it holds.
  const incoming = new Set(live.map((e) => e.to));
  // A node a gate holds stays in view, so the gate shows what it holds.
  const gated = new Set(
    live.filter((e) => made.get(e.from)?.gate).map((e) => e.to),
  );
  const leavesTo = new Map<string, string[]>();
  for (const n of made.values()) {
    const outs = live.filter((e) => e.from === n.id);
    if (
      n.target ||
      n.spine ||
      n.gate ||
      gated.has(n.id) ||
      outs.length !== 1 ||
      (incoming.has(n.id) && outs[0]!.to !== targetId)
    ) {
      continue;
    }
    const to = outs[0]!.to;
    leavesTo.set(to, [...(leavesTo.get(to) ?? []), n.id]);
  }
  for (const [to, ids] of leavesTo) {
    if (ids.length < BUNDLE_MIN) {
      continue;
    }
    const members = ids.sort(byNumber).map((id) => made.get(id)!);
    const id = `${GROUP_PREFIX}${to}`;
    const ready = [...new Set(members.flatMap((m) => m.ready))].sort(byNumber);
    const inFlight = [...new Set(members.flatMap((m) => m.inFlight))].sort(
      byNumber,
    );
    const rank = rankOf.get(to)! + 1;
    made.set(id, {
      id,
      kind: "group",
      title: "",
      target: false,
      proposed: members.every((m) => m.proposed),
      items: [...new Set(members.flatMap((m) => m.items))].sort(byNumber),
      whole: true,
      openTotal: 0,
      ready,
      inFlight,
      stage: inFlight.length ? "In flight" : ready.length ? "Ready" : "Waiting",
      rank,
      layer: maxRank - rank,
      lane: 0,
      spine: false,
      members,
    });
    const gone = new Set(ids);
    const via = live.filter((e) => gone.has(e.from)).flatMap((e) => e.via);
    ids.forEach((m) => made.delete(m));
    const into = new Map<string, PathEdge>();
    for (const e of live.filter((x) => gone.has(x.to))) {
      const was = into.get(e.from);
      into.set(e.from, {
        from: e.from,
        to: id,
        via: [...(was?.via ?? []), ...e.via],
        spine: false,
      });
    }
    live = [
      ...live.filter((e) => !gone.has(e.from) && !gone.has(e.to)),
      ...into.values(),
      { from: id, to, via, spine: false },
    ];
  }

  // ---- lanes: the spine first in each layer, then the others by where
  // their arrows go, then milestones, releases, gates, items and groups
  const laneOf = new Map<string, number>();
  const outOf = new Map<string, string[]>();
  for (const e of live) {
    outOf.set(e.from, [...(outOf.get(e.from) ?? []), e.to]);
  }
  const kindRank: Record<PathNodeKind, number> = {
    milestone: 0,
    release: 1,
    decision: 2,
    external: 2,
    item: 3,
    group: 4,
  };
  let lanes = 1;
  for (let layer = maxRank; layer >= 0; layer--) {
    const here = [...made.values()].filter((n) => n.layer === layer);
    const succLane = (id: string) =>
      Math.min(
        ...(outOf.get(id) ?? []).map((t) => laneOf.get(t) ?? Infinity),
        Infinity,
      );
    here
      .sort(
        (a, b) =>
          Number(b.spine) - Number(a.spine) ||
          succLane(a.id) - succLane(b.id) ||
          kindRank[a.kind] - kindRank[b.kind] ||
          byNumber(a.id, b.id),
      )
      .forEach((n, i) => {
        laneOf.set(n.id, i);
        n.lane = i;
      });
    lanes = Math.max(lanes, here.length);
  }
  const nodes = [...made.values()].sort(
    (a, b) => a.layer - b.layer || a.lane - b.lane,
  );

  const edges = live
    .map((e) => {
      const i = spine.indexOf(e.from);
      return { ...e, spine: i >= 0 && spine[i + 1] === e.to };
    })
    .sort(
      (a, b) =>
        Number(a.spine) - Number(b.spine) ||
        byNumber(a.from, b.from) ||
        byNumber(a.to, b.to),
    );
  // Every node there is, grouped or not, for the counts below.
  const allNodes = nodes.flatMap((n) => [n, ...(n.members ?? [])]);

  const nodeOf = new Map(allNodes.map((n) => [n.id, n]));
  const gateNodes = nodes.filter((n) => n.gate && !n.target);
  const gates = gateNodes
    .sort(
      (a, b) =>
        Number(b.gate!.answerable) - Number(a.gate!.answerable) ||
        byNumber(a.id, b.id),
    )
    .map((n) => n.id);
  const upstream = spine.slice(0, -1).map((id) => nodeOf.get(id)!);
  const workOnPath = [...onPath].filter(
    (id) => id !== targetId && itemOf.get(id)?.kind === "work",
  );
  const ready = [...new Set(allNodes.flatMap((n) => n.ready))].sort(byNumber);
  const spineReady = [
    ...new Set(spine.flatMap((id) => nodeOf.get(id)!.ready)),
  ].sort(byNumber);
  const targetHolders = tItem
    ? tItem.milestones.filter((m) => msOf.has(m)).sort(byNumber)
    : [];

  return {
    target: {
      id: targetId,
      kind,
      title: tMs?.title ?? tItem!.title,
      short:
        kind === "release"
          ? shortVersion(tItem!.release ?? tItem!.title)
          : undefined,
      state: (tMs ?? tItem)!.state,
      proposed: (tMs ?? tItem)!.state === "proposed",
      milestones: targetHolders,
    },
    nodes,
    edges,
    spine,
    layers: maxRank + 1,
    lanes,
    chain: {
      milestones: upstream.filter((n) => n.kind === "milestone").length,
      items: upstream.filter((n) => n.kind === "item").length,
      gates: upstream.filter((n) => !!n.gate).length,
      releases: upstream.filter((n) => n.kind === "release").length,
    },
    ties,
    gates,
    spineGates: gates.filter((g) => spineSet.has(g)),
    answerable: gates.filter((g) => nodeOf.get(g)!.gate!.answerable),
    ready,
    spineReady,
    open: {
      milestones: allNodes.filter((n) => n.kind === "milestone" && !n.target)
        .length,
      items: workOnPath.length,
    },
    loops: loops.filter(
      (l, i) =>
        loops.findIndex((x) => x.from === l.from && x.to === l.to) === i,
    ),
  };
}

/** A milestone's one fill, from the items of it on the path. */
function milestoneStageOf(
  m: WorkMilestone,
  items: readonly WorkItem[],
  ready: readonly string[],
  inFlight: readonly string[],
): Stage {
  if (m.state === "done") {
    return "Done";
  }
  if (m.state === "proposed") {
    return "Proposed";
  }
  if (inFlight.length) {
    return "In flight";
  }
  if (ready.length) {
    return "Ready";
  }
  return items.some((it) => isOpen(it)) ? "Waiting" : "Ready";
}

/** "3 milestones", "1 item": a count with its noun. */
export function countText(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A list in words: "a", "a and b", "a, b and c". */
export function andList(parts: readonly string[]): string {
  return parts.length < 2
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * The answer to "why isn't this done?", in three plain parts, counted in
 * items and milestones, never in time: how long the chain left is, the
 * gates open, and what can start now.
 */
export function whyNotDone(v: PathView): {
  chain: string;
  gates: string;
  start: string;
} {
  const t = v.target;
  if (t.state === "done") {
    return { chain: "It is done.", gates: "", start: "" };
  }
  const upstream = v.spine.length - 1;
  const parts = [
    v.chain.milestones && countText(v.chain.milestones, "milestone"),
    v.chain.items && countText(v.chain.items, "item"),
    v.chain.gates && countText(v.chain.gates, "gate"),
    v.chain.releases && countText(v.chain.releases, "earlier release"),
  ].filter((x): x is string => !!x);
  const chain = !upstream
    ? t.kind === "milestone"
      ? "Nothing outside it is open upstream: what is left is its own work."
      : t.kind === "item"
        ? "Nothing it needs is open."
        : "Nothing it needs is open."
    : `Its longest chain left runs through ${andList(parts)}${v.ties ? `, one of ${v.ties + 1} as long` : ""}.`;
  const g = v.gates.length;
  const gates = !g
    ? "No gate is open on its path."
    : `${countText(g, "gate")} ${g === 1 ? "is" : "are"} open on its path${v.spineGates.length ? `, ${v.spineGates.length} on that chain` : ""}${v.answerable.length ? `; ${v.answerable.length === g ? (g === 1 ? "it" : "all") : v.answerable.length} can be answered now` : "; none can be answered yet"}.`;
  const r = v.ready.length;
  const start =
    t.kind === "item" && v.ready.includes(t.id)
      ? "It can start now."
      : !r
        ? t.kind === "item" && !upstream && t.state === "planned"
          ? "It can start now."
          : "Nothing on its path can start now."
        : `${countText(r, "item")} can start now${upstream && v.spineReady.length ? `, ${v.spineReady.length} on that chain` : ""}.`;
  return { chain, gates, start };
}
