// The frame tree as a branching diagram (spec "The tree diagram"; the
// owner's choice of a top-down tidy tree over the outline, ruling S6
// overridden). Pills sized to their labels, coloured by family; the frames
// the scenario added are distinct (a diamond and a tinted, family-edged
// pill). Docked, it draws the frames the scenario uses and folds the rest
// into "+N" chips (`focusTree`); too wide or tall for its box, it pans,
// never squeezing, and brings the lit path and the selection into view when
// they change. The answer's path (`branchPath`) lights edge by edge, up to
// the common ancestor and down. On a scenario switch the shared nodes glide
// to their new places and the added ones grow out of their parents; reduced
// motion cuts straight to the new shape (TreeDiagram.css, motion.css).
//
// Fix round 1, the owner's tree design: the tree holds only frames. Data
// (Orion's) is a dashed card pinned below the frame its numbers are in, on
// a dashed tether; the frame you draw in carries a teal "Drawing in" tag
// inside its pill (nothing in the edge lane can cover it); the route from
// the data's frame to the drawn-in one lights, and a dot travels along it
// (static at the destination under reduced motion). The route's steps are
// spelled out under the tree (RouteSteps), so the docked tree has no edge
// labels; the Expand dialog lays each edge out with room for its full
// label. Every edge is focusable, its full text in a tip fixed to the
// viewport, never clipped. A scenario can make some nodes its control
// (one-path: "Draw Orion's path in" this frame).
//
// The layout is chosen in one place, `diagramLayout` below.
//
// Task 4d: the diagram is laid out from the tree's shape (`shapeKey`: its
// frames, labels and edge kinds), and the values that drift while the clock
// plays (an edge's accuracy) are read from the latest tree. So a value
// update keeps the layout, and the route's dot runs on; and each edge and
// pill is its own memoized part with plain props, so only one whose
// printed text changed renders again.
import {
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { TreeNode } from "../tree.ts";
import { designRoot } from "./designRoot.ts";
import { unfoldedFor } from "./diagramFocus.ts";
import { EDGE_LABEL, FAMILY_INFO, familyMap, type Family } from "./families.ts";
import { edgeAccuracyText } from "./FrameTree.tsx";
import { useStableCallback } from "./memo.ts";
import { focusTree, layoutTree } from "./treeLayout.ts";
import {
  nextAfter,
  nextText,
  pairPick,
  type PairEnd,
  type PairNodes,
  type PairPress,
} from "./pairPick.ts";

/** A pill's height (a 32 px hit target), a depth row's and the gap between pills, px. */
const PILL = 32;
const ROW = 72;
const GAP = 14;
/** The room round the diagram, px. */
const PAD = 14;
/** A pill's padding (10 + 12), its glyph and gap (8 + 7), its border and a little slack, px. */
const PILL_EXTRA = 44;
/** A tag inside a pill: its padding and the gap before it, px. */
const TAG_EXTRA = 18;
/** An edge label's offset right of its connector, and its padding, px. */
const LABEL_X = 6;
const LABEL_PAD = 10;

export type DiagramSelection = { kind: "node" | "edge"; id: string };

export interface DiagramPath {
  up: readonly string[];
  ancestor: string;
  down: readonly string[];
}

/** Nodes that act as a control (one-path's "Draw Orion's path in"). */
export interface DiagramTargets {
  ids: ReadonlySet<string>;
  current: string;
  /** What choosing it does, for its name and tip: "Draw Orion's path in MOON_ME". */
  label: (id: string) => string;
  onPick: (id: string) => void;
  /**
   * The tree as a pair's control (the capstone's From and To, Task 8): a
   * click picks From, the next click To (or Shift-click To at once); Enter
   * and Shift+Enter the same. Its two ends and the frame they meet at carry
   * "From", "To" and "Meets here" tags.
   */
  pair?: {
    from: string;
    to: string;
    meet?: string;
    pick: (id: string, end: "from" | "to") => void;
  };
}

/** The meeting frame's tag (the capstone's pair). */
export const MEET_TAG = "Meets here";

let measurer: CanvasRenderingContext2D | null | undefined;
/** The pills' type: the panel's own family at body-sm, semibold; the edge labels' at caption-md. */
let fontFamily = "Inter, system-ui, sans-serif";
/** Measures in the font the diagram is drawn in (from its box's computed style). */
export function setPillFont(el: Element): void {
  fontFamily = getComputedStyle(el).fontFamily;
}
function textWidth(text: string, font: "pill" | "tag" | "edge"): number {
  if (measurer === undefined) {
    measurer =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!measurer) {
    return text.length * (font === "pill" ? 8 : 7);
  }
  measurer.font =
    font === "pill"
      ? `600 12px ${fontFamily}`
      : font === "tag"
        ? `600 10px ${fontFamily}`
        : `400 11px ${fontFamily}`;
  return Math.ceil(measurer.measureText(text).width);
}

/** A chip's node id: "+N" on `parent`. */
const chipId = (parent: string) => `+${parent}`;
/** The data card's id, below `frame`. */
const dataId = (frame: string) => `data:${frame}`;
/** The card's second line: "in EME2000 (OEM)". */
const dataLine = (d: { frame: string; source: string }) =>
  `in ${d.frame} (${d.source})`;

/** An edge's words: the full line, and the labels it may show, longest first. */
function edgeWords(node: TreeNode, parentLabel: string) {
  const a = edgeAccuracyText(node.edge.kind, node.edge.accuracy);
  const kind = EDGE_LABEL[node.edge.kind];
  return {
    full: `${parentLabel} → ${node.label}: ${kind}, ${a.text}`,
    labels: [`${kind} · ${a.text}`, a.text, kind],
    unknown: a.unknown,
  };
}

interface Placed {
  id: string;
  /** The node it stands for; undefined for a chip. */
  node?: TreeNode;
  /** A chip: the parent it unfolds, and how many frames it holds. */
  chip?: { parent: string; count: number };
  parent?: string;
  x: number;
  y: number;
  w: number;
  depth: number;
  /** The pill's tag ("Drawing in"). */
  tag?: string;
  /** The data's card, pinned below its frame. */
  data?: true;
}

/**
 * The diagram's layout (the one place the choice is made): the focused tree
 * (or the whole one), its chips as leaves, then `layoutTree` with pills
 * sized to their labels and tags. With `fullLabels` each node's slot is wide
 * enough for its edge's full label too (the Expand dialog).
 */
export function diagramLayout(
  tree: TreeNode,
  keep: ReadonlySet<string> | undefined,
  expanded: ReadonlySet<string>,
  width: number,
  tags: ReadonlyMap<string, string>,
  fullLabels: boolean,
  data?: { label: string; frame: string; source: string },
): { placed: Placed[]; width: number; height: number; fits: boolean } {
  const focused = keep
    ? focusTree(tree, keep, expanded)
    : { tree, folded: new Map<string, number>() };
  // Chips as leaves: each folded parent gets one more child.
  const chips = new Set<string>();
  const withChips = (n: TreeNode): TreeNode => {
    const count = focused.folded.get(n.id);
    const children = n.children.map(withChips);
    if (data && n.id === data.frame) {
      // The data's card hangs below the frame its numbers are in.
      children.unshift({
        id: dataId(n.id),
        label: data.label,
        edge: n.edge,
        children: [],
      });
    }
    if (count !== undefined) {
      chips.add(chipId(n.id));
      children.push({
        id: chipId(n.id),
        label: `+${count}`,
        edge: n.edge,
        children: [],
      });
    }
    return { ...n, children };
  };
  const shown = withChips(focused.tree);
  const widths = new Map<string, number>();
  const info = new Map<string, Omit<Placed, "x" | "y" | "depth">>();
  const walk = (n: TreeNode, parent?: TreeNode) => {
    const isChip = chips.has(n.id);
    const isData = data !== undefined && n.id === dataId(data.frame);
    const tag = tags.get(n.id);
    const pill = isChip
      ? Math.max(PILL, textWidth(n.label, "pill") + 24)
      : isData
        ? Math.max(
            textWidth(data.label, "pill"),
            textWidth(dataLine(data), "edge"),
          ) + 26
        : textWidth(n.label, "pill") +
          PILL_EXTRA +
          (tag ? textWidth(tag, "tag") + TAG_EXTRA : 0);
    // The full label sits right of the connector at the pill's centre.
    const label =
      fullLabels && !isChip && !isData && parent
        ? 2 *
          (LABEL_X +
            LABEL_PAD +
            textWidth(edgeWords(n, parent.label).labels[0]!, "edge"))
        : 0;
    widths.set(n.id, Math.max(pill, label));
    info.set(n.id, {
      id: n.id,
      w: pill,
      ...(parent !== undefined && { parent: parent.id }),
      ...(tag !== undefined && { tag }),
      ...(isChip
        ? {
            chip: {
              parent: parent!.id,
              count: focused.folded.get(parent!.id)!,
            },
          }
        : isData
          ? { data: true as const }
          : { node: n }),
    });
    n.children.forEach((c) => walk(c, n));
  };
  walk(shown);
  const inner = Math.max(0, width - 2 * PAD);
  const layout = layoutTree(shown, {
    width: inner,
    rowHeight: ROW,
    nodeWidth: 0,
    nodeWidths: widths,
    gap: GAP,
  });
  const placed = layout.nodes.map((p) => ({
    ...info.get(p.id)!,
    x: p.x + PAD,
    y: p.y - ROW / 2 + PILL / 2 + PAD,
    depth: p.depth,
  }));
  return {
    placed,
    width: Math.max(width, layout.neededWidth + 2 * PAD),
    height: layout.height - ROW + PILL + 2 * PAD,
    fits: layout.fits,
  };
}

/** The elbow from a parent pill's foot down to a child pill's head. */
function elbow(p: { x: number; y: number }, c: { x: number; y: number }) {
  const top = p.y + PILL / 2;
  const bottom = c.y - PILL / 2;
  const mid = top + (bottom - top) * 0.3;
  return `M ${p.x} ${top} V ${mid} H ${c.x} V ${bottom}`;
}

/**
 * The tree's shape as the diagram lays it out: each frame's id, label,
 * edge kind and whether the scenario added it, in order. With `fullLabels`
 * (the Expand dialog, whose slots are as wide as each edge's label) the
 * edges' accuracy text too. Equal keys draw the same layout.
 */
export function shapeKey(tree: TreeNode, fullLabels: boolean): string {
  const parts: string[] = [];
  const walk = (n: TreeNode) => {
    parts.push(
      n.id,
      n.label,
      n.edge.kind,
      n.app ? "app" : n.added ? "+" : "",
      fullLabels ? edgeAccuracyText(n.edge.kind, n.edge.accuracy).text : "",
      String(n.children.length),
    );
    n.children.forEach(walk);
  };
  walk(tree);
  return JSON.stringify(parts);
}

/**
 * `tree` while its shape is the last one's: the last tree, so what's laid
 * out from it holds. It writes a ref during render; that is idempotent (a
 * repeated or discarded render with the same tree leaves the same value).
 */
function useShape(tree: TreeNode, fullLabels: boolean): TreeNode {
  const last = useRef<{ tree: TreeNode; key: string }>(undefined);
  const key = shapeKey(tree, fullLabels);
  if (last.current?.key !== key) {
    last.current = { tree, key };
  }
  return last.current.tree;
}

/** Every node of `tree`, by id. */
function nodesById(tree: TreeNode): Map<string, TreeNode> {
  const out = new Map<string, TreeNode>();
  const walk = (n: TreeNode) => {
    out.set(n.id, n);
    n.children.forEach(walk);
  };
  walk(tree);
  return out;
}

/** What the diagram's parts call back, one object for the diagram's life. */
interface DiagramHandlers {
  edge(id: string, on: boolean): void;
  /** A pill clicked; `shift` held (the pair's To). */
  node(id: string, shift?: boolean): void;
  key(id: string, e: KeyboardEvent<HTMLElement>): void;
  focus(id: string): void;
  tip(id: string, el: Element): void;
  hideTip(): void;
  remember(id: string, el: HTMLElement | null): void;
}

/** An edge: its connector, and a hit target with its full words (a chip's and the data's tether have none). */
const DiagramEdge = memo(function DiagramEdge({
  id,
  d,
  from,
  family,
  lit,
  chip,
  data,
  on,
  words,
  h,
}: {
  id: string;
  d: string;
  from: string;
  family: Family;
  lit: number | undefined;
  chip: boolean;
  data: boolean;
  on: boolean;
  /** The edge's full line, for its name and tip. */
  words: string | undefined;
  h: DiagramHandlers;
}) {
  return (
    <g>
      <path
        aria-hidden
        className={`fx-diagram-edge fx-family-${family}${lit !== undefined ? " fx-lit" : ""}${chip ? " fx-chip-edge" : ""}${data ? " fx-data-tether" : ""}${on ? " fx-selected" : ""}`}
        style={
          {
            d: `path("${d}")`,
            "--fx-from-d": `path("${from}")`,
            "--i": lit ?? 0,
          } as React.CSSProperties
        }
      />
      {words !== undefined && (
        <path
          className="fx-diagram-hit"
          role="button"
          tabIndex={0}
          aria-label={`Edge ${words}`}
          aria-pressed={on}
          style={{ d: `path("${d}")` } as React.CSSProperties}
          onClick={() => h.edge(id, on)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              h.edge(id, on);
            }
          }}
          onPointerEnter={(e) => h.tip(id, e.currentTarget)}
          onPointerLeave={h.hideTip}
          onFocus={(e) => h.tip(id, e.currentTarget)}
          onBlur={h.hideTip}
        />
      )}
    </g>
  );
});

export interface NodeProps {
  id: string;
  label: string;
  className: string;
  /** The pill's place, and where it grows from: plain values, compared one by one. */
  style: { transform: string; inlineSize: number; from: string; i: number };
  tabbable: boolean;
  pressed: boolean;
  ariaLabel: string;
  tag: string | undefined;
  h: DiagramHandlers;
}

/** A frame's pill. */
const DiagramNode = memo(function DiagramNode({
  id,
  label,
  className,
  style,
  tabbable,
  pressed,
  ariaLabel,
  tag,
  h,
}: NodeProps) {
  const ref = useCallback(
    (el: HTMLElement | null) => h.remember(id, el),
    [h, id],
  );
  return (
    <button
      ref={ref}
      type="button"
      className={className}
      style={
        {
          transform: style.transform,
          inlineSize: style.inlineSize,
          "--fx-from": style.from,
          "--i": style.i,
        } as React.CSSProperties
      }
      tabIndex={tabbable ? 0 : -1}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onFocus={(e) => {
        h.focus(id);
        h.tip(id, e.currentTarget);
      }}
      onBlur={h.hideTip}
      onPointerEnter={(e) => h.tip(id, e.currentTarget)}
      onPointerLeave={h.hideTip}
      onKeyDown={(e) => h.key(id, e)}
      onClick={(e) => h.node(id, e.shiftKey)}
    >
      <span className="fx-node-glyph" aria-hidden />
      <span className="fx-node-label">{label}</span>
      {tag && (
        <span
          className={`fx-node-tag${tag === MEET_TAG ? " fx-tag-meet" : ""}`}
          aria-hidden
        >
          {tag}
        </span>
      )}
    </button>
  );
}, sameNodeProps);

export function sameNodeProps(a: NodeProps, b: NodeProps): boolean {
  return (
    a.id === b.id &&
    a.label === b.label &&
    a.className === b.className &&
    a.style.transform === b.style.transform &&
    a.style.inlineSize === b.style.inlineSize &&
    a.style.from === b.style.from &&
    a.style.i === b.style.i &&
    a.tabbable === b.tabbable &&
    a.pressed === b.pressed &&
    a.ariaLabel === b.ariaLabel &&
    a.tag === b.tag &&
    a.h === b.h
  );
}

const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export const TreeDiagram = memo(function TreeDiagram({
  tree,
  path,
  keep,
  selected,
  onSelect,
  label,
  resetKey,
  targets,
  fullLabels = false,
  data,
}: {
  tree: TreeNode;
  path?: DiagramPath | undefined;
  /** The frames to draw, with their ancestors; the rest fold into chips. Undefined: the whole tree. */
  keep?: ReadonlySet<string> | undefined;
  selected?: DiagramSelection | undefined;
  onSelect: (s: DiagramSelection | undefined) => void;
  /** The diagram's accessible name. */
  label: string;
  /** Unfolded chips fold again when this changes (the scenario). */
  resetKey?: string;
  targets?: DiagramTargets | undefined;
  /** Every edge's full label inline, laid out with room (the Expand dialog). */
  fullLabels?: boolean;
  /** Data pinned below the frame its numbers are in. */
  data?: { label: string; frame: string; source: string } | undefined;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [unfolded, setUnfolded] = useState(() => ({
    key: resetKey,
    ids: new Set<string>() as ReadonlySet<string>,
  }));
  const expanded = unfoldedFor(unfolded, resetKey).ids;
  const [focus, setFocus] = useState<string>();
  const [tip, setTip] = useState<{ id: string; el: Element }>();
  const pills = useRef(new Map<string, HTMLElement>());
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) {
      return;
    }
    setPillFont(el);
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Laid out from the shape; values read from the latest tree (`nodes`).
  const shaped = useShape(tree, fullLabels);
  const nodes = useMemo(() => nodesById(tree), [tree]);
  const families = useMemo(() => familyMap(shaped), [shaped]);
  // The one tag: the frame you draw in (the owner's design); for a pair,
  // its two ends and where they meet.
  const pair = targets?.pair;
  // Laid out from the tags' text, not the targets' identity: a new pair
  // object with the same ends lays out the same.
  const tagKey = JSON.stringify(
    pair
      ? [
          ...(pair.meet !== undefined ? [[pair.meet, MEET_TAG]] : []),
          [pair.from, "From"],
          [pair.to, "To"],
        ]
      : targets
        ? [[targets.current, "Drawing in"]]
        : [],
  );
  const ends = useMemo(
    () => new Map<string, string>(JSON.parse(tagKey) as [string, string][]),
    [tagKey],
  );
  // Which end a plain click sets next (shown and announced under the
  // diagram), kept while the pair is the one the tree's own last pick
  // expected; the knobs, Swap or a moment changing it start again at From.
  const [nextEnd, setNextEnd] = useState<PairEnd>("from");
  const expected = useRef<PairNodes | undefined>(undefined);
  const pairFrom = pair?.from;
  const pairTo = pair?.to;
  useEffect(() => {
    if (pairFrom !== undefined && pairTo !== undefined) {
      setNextEnd((n) =>
        nextAfter(n, expected.current, { from: pairFrom, to: pairTo }),
      );
    }
  }, [pairFrom, pairTo]);
  /** A press on a pair's pill: the knob it sets, and the next end. */
  const press = (id: string, how: PairPress) => {
    const r = pairPick(pair!, nextEnd, id, how);
    expected.current = r.expect;
    setNextEnd(r.next);
    if (r.end) {
      pair!.pick(id, r.end);
    }
  };
  const layout = useMemo(
    () => diagramLayout(shaped, keep, expanded, width, ends, fullLabels, data),
    [shaped, keep, expanded, width, ends, fullLabels, data],
  );
  const byId = useMemo(
    () => new Map(layout.placed.map((p) => [p.id, p])),
    [layout],
  );
  // The lit path, in order along it: each edge named by its child.
  const lit = useMemo(() => {
    const order = new Map<string, number>();
    if (path) {
      [...path.up, ...path.down].forEach((id, i) => order.set(id, i));
    }
    return order;
  }, [path]);

  // The route the dot travels: from the data's frame (or the path's
  // start) up each lit edge to the common ancestor, then down.
  const route = useMemo(() => {
    if (!path) {
      return undefined;
    }
    const pts: { x: number; y: number }[] = [];
    const add = (q: { x: number; y: number }) => pts.push(q);
    const seg = (a: Placed, b: Placed, upward: boolean) => {
      // The elbow from parent a to child b, walked either way.
      const top = a.y + PILL / 2;
      const bottom = b.y - PILL / 2;
      const mid = top + (bottom - top) * 0.3;
      const run = [
        { x: a.x, y: a.y },
        { x: a.x, y: mid },
        { x: b.x, y: mid },
        { x: b.x, y: b.y },
      ];
      (upward ? run.reverse() : run).forEach(add);
    };
    for (const id of path.up) {
      const c = byId.get(id);
      const p = c?.parent !== undefined ? byId.get(c.parent) : undefined;
      if (!c || !p) {
        return undefined;
      }
      seg(p, c, true);
    }
    for (const id of path.down) {
      const c = byId.get(id);
      const p = c?.parent !== undefined ? byId.get(c.parent) : undefined;
      if (!c || !p) {
        return undefined;
      }
      seg(p, c, false);
    }
    if (pts.length === 0) {
      return undefined;
    }
    const d = pts
      .map((q, i) => `${i === 0 ? "M" : "L"} ${q.x} ${q.y}`)
      .join(" ");
    return { d, end: pts.at(-1)! };
  }, [path, byId]);

  // Bring the lit path or the selection into view when it changes (not on
  // every rebuild, so a manual pan holds while the clock plays).
  const viewKey = JSON.stringify([path, selected?.id, resetKey]);
  const shownKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    const el = box.current;
    if (!el || shownKey.current === viewKey) {
      return;
    }
    shownKey.current = viewKey;
    const ids = selected
      ? [selected.id]
      : [...lit.keys(), ...(path ? [path.ancestor] : [])];
    const at = ids
      .map((id) => byId.get(id))
      .filter((p): p is Placed => p !== undefined);
    if (at.length === 0) {
      return;
    }
    // Only along an axis where they're out of view, centred there.
    const fit = (lo: number, hi: number, start: number, size: number) =>
      lo >= start && hi <= start + size ? start : (lo + hi) / 2 - size / 2;
    const xs = at.map((p) => p.x);
    const ys = at.map((p) => p.y);
    el.scrollTo({
      left: fit(
        Math.min(...xs) - 60,
        Math.max(...xs) + 60,
        el.scrollLeft,
        el.clientWidth,
      ),
      top: fit(
        Math.min(...ys) - PILL,
        Math.max(...ys) + PILL,
        el.scrollTop,
        el.clientHeight,
      ),
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [viewKey, byId, lit, path, selected]);

  const roving =
    focus !== undefined && byId.has(focus)
      ? focus
      : selected && byId.has(selected.id)
        ? selected.id
        : layout.placed[0]?.id;

  const move = (from: Placed, key: string): Placed | undefined => {
    const row = layout.placed
      .filter((p) => p.depth === from.depth)
      .sort((a, b) => a.x - b.x);
    const at = row.findIndex((p) => p.id === from.id);
    switch (key) {
      case "ArrowLeft":
        return row[at - 1];
      case "ArrowRight":
        return row[at + 1];
      case "ArrowUp":
        return from.parent !== undefined ? byId.get(from.parent) : undefined;
      case "ArrowDown":
        return layout.placed.find((p) => p.parent === from.id);
      case "Home":
        return layout.placed[0];
      default:
        return undefined;
    }
  };
  const onKey = (p: Placed) => (e: KeyboardEvent<HTMLElement>) => {
    const next = move(p, e.key);
    if (next) {
      e.preventDefault();
      setFocus(next.id);
      pills.current.get(next.id)?.focus();
    }
  };
  const remember = (id: string) => (el: HTMLElement | null) => {
    if (el) {
      pills.current.set(id, el);
    } else {
      pills.current.delete(id);
    }
  };
  // What the memoized edges and pills call: stable, reading this render's state.
  const onEdge = useStableCallback((id: string, on: boolean) =>
    onSelect(on ? undefined : { kind: "edge", id }),
  );
  const onNode = useStableCallback((id: string, shift?: boolean) => {
    const target = targets?.ids.has(id) === true;
    const isSelected = selected?.kind === "node" && selected.id === id;
    if (target && pair) {
      // A click picks From, the next one To; Shift-click To at once. A
      // second click on From's own frame only shows it (pairPick.ts).
      press(id, shift ? "shift-click" : "click");
      onSelect({ kind: "node", id });
    } else if (target) {
      // The tree as the control: draw in this frame, and show it.
      targets!.onPick(id);
      onSelect({ kind: "node", id });
    } else {
      onSelect(isSelected ? undefined : { kind: "node", id });
    }
  });
  const onNodeKey = useStableCallback(
    (id: string, e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && pair && targets?.ids.has(id)) {
        // Enter picks From, Shift+Enter To (not the click's alternation).
        e.preventDefault();
        press(id, e.shiftKey ? "shift-enter" : "enter");
        // Focus stays on the pill, so the next pick is a key away.
        return;
      }
      const p = byId.get(id);
      if (p) {
        onKey(p)(e);
      }
    },
  );
  const onTip = useStableCallback((id: string, el: Element) =>
    setTip({ id, el }),
  );
  const handlers: DiagramHandlers = useMemo(
    () => ({
      edge: onEdge,
      node: onNode,
      key: onNodeKey,
      focus: (id) => setFocus(id),
      tip: onTip,
      hideTip: () => setTip(undefined),
      remember: (id, el) => {
        if (el) {
          pills.current.set(id, el);
        } else {
          pills.current.delete(id);
        }
      },
    }),
    [onEdge, onNode, onNodeKey, onTip],
  );
  /** A placed node's frame as it is now (its edge's accuracy drifts). */
  const nodeOf = (p: Placed | undefined): TreeNode | undefined =>
    p?.node && (nodes.get(p.id) ?? p.node);
  const words = (p: Placed) => {
    const parent = p.parent !== undefined ? byId.get(p.parent) : undefined;
    const n = nodeOf(p);
    const up = nodeOf(parent);
    return n && up ? edgeWords(n, up.label) : undefined;
  };
  const hideTip = () => setTip(undefined);

  // The tip: fixed to the viewport, so the box's scroll never clips it.
  const tipPlaced = tip !== undefined ? byId.get(tip.id) : undefined;
  const tipText = (() => {
    if (!tipPlaced) {
      return undefined;
    }
    const w = words(tipPlaced);
    const action =
      tipPlaced.node && targets?.ids.has(tipPlaced.node.id)
        ? targets.label(tipPlaced.node.id)
        : undefined;
    if (!w && !action) {
      return undefined;
    }
    return {
      text: [action, w?.full].filter((t) => t !== undefined).join(". "),
      unknown: w?.unknown ?? false,
    };
  })();
  const tipRect = tip?.el.getBoundingClientRect();

  return (
    <>
      {pair && (
        // Which end the next click sets, read out as it changes (M2).
        <p className="fx-pair-next" aria-live="polite">
          {nextText(nextEnd)}
        </p>
      )}
      <div
        ref={box}
        className={`fx-diagram${layout.fits ? "" : " fx-diagram-pans"}${fullLabels ? " fx-diagram-full" : ""}`}
        onScroll={hideTip}
      >
        <div
          className="fx-diagram-canvas"
          style={{ inlineSize: layout.width, blockSize: layout.height }}
          role="group"
          aria-label={label}
        >
          <svg
            className="fx-diagram-edges"
            width={layout.width}
            height={layout.height}
          >
            {layout.placed.map((c) => {
              const p = c.parent !== undefined ? byId.get(c.parent) : undefined;
              if (!p) {
                return null;
              }
              const family: Family = c.node
                ? (families.get(c.id) ?? "earth")
                : "earth";
              const w = c.node ? words(c) : undefined;
              return (
                <DiagramEdge
                  key={c.id}
                  id={c.id}
                  d={elbow(p, c)}
                  from={`M ${p.x} ${p.y + PILL / 2} V ${p.y + PILL / 2} H ${p.x} V ${p.y + PILL / 2}`}
                  family={family}
                  lit={lit.get(c.id)}
                  chip={c.chip !== undefined}
                  data={c.data === true}
                  on={selected?.kind === "edge" && selected.id === c.id}
                  words={w?.full}
                  h={handlers}
                />
              );
            })}
            {route && (
              <circle
                key={route.d}
                className="fx-route-dot"
                r={4.5}
                {...(reducedMotion() && { cx: route.end.x, cy: route.end.y })}
              >
                {!reducedMotion() && (
                  <animateMotion
                    dur="2.2s"
                    repeatCount="indefinite"
                    path={route.d}
                  />
                )}
              </circle>
            )}
          </svg>
          {/* Each edge's label, in the lane between rows: the full one in the
            dialog; docked, the lit path's, as much of it as fits whole. */}
          {layout.placed.map((p) => {
            const w = words(p);
            // Docked, the route's steps are spelled out under the tree.
            if (!w || !fullLabels) {
              return null;
            }
            // Up to the next connector on its right in this row.
            const next = layout.placed
              .filter((q) => q.depth === p.depth && q.x > p.x)
              .reduce((m, q) => Math.min(m, q.x), layout.width - PAD);
            const room = next - p.x - LABEL_X - 8;
            const text = fullLabels
              ? w.labels[0]!
              : w.labels.find((t) => textWidth(t, "edge") + LABEL_PAD <= room);
            if (text === undefined) {
              return null;
            }
            return (
              <span
                key={`edge:${p.id}`}
                className={`fx-edge-tag${w.unknown ? " fx-unbounded" : ""}`}
                style={
                  {
                    transform: `translate(${p.x + LABEL_X}px, ${p.y - PILL / 2 - 22}px)`,
                    "--i": lit.get(p.id) ?? 0,
                  } as React.CSSProperties
                }
                aria-hidden
              >
                {text}
              </span>
            );
          })}
          {layout.placed.map((p) => {
            const parent =
              p.parent !== undefined ? byId.get(p.parent) : undefined;
            const transform = `translate(${p.x - p.w / 2}px, ${p.y - PILL / 2}px)`;
            const from = parent
              ? `translate(${parent.x - p.w / 2}px, ${parent.y - PILL / 2}px) scale(0.6)`
              : transform;
            const style = {
              transform,
              inlineSize: p.w,
              "--fx-from": from,
            } as React.CSSProperties;
            if (p.data && data) {
              return (
                <div
                  key={p.id}
                  className="fx-data-card"
                  style={style}
                  role="note"
                  aria-label={`${data.label}, ${dataLine(data)}: data, not a frame`}
                >
                  <span className="fx-data-name">{data.label}</span>
                  <span className="fx-data-line">{dataLine(data)}</span>
                </div>
              );
            }
            if (p.chip) {
              const chip = p.chip;
              const name = byId.get(chip.parent)?.node?.label ?? chip.parent;
              return (
                <button
                  key={p.id}
                  ref={remember(p.id)}
                  type="button"
                  className="fx-node fx-chip"
                  style={style}
                  tabIndex={roving === p.id ? 0 : -1}
                  aria-label={`Show ${chip.count} more ${chip.count === 1 ? "frame" : "frames"} under ${name}`}
                  title={`${chip.count} more under ${name}`}
                  onFocus={() => setFocus(p.id)}
                  onKeyDown={onKey(p)}
                  onClick={() =>
                    setUnfolded((u) => {
                      const now = unfoldedFor(u, resetKey);
                      return {
                        ...now,
                        ids: new Set([...now.ids, chip.parent]),
                      };
                    })
                  }
                >
                  +{chip.count}
                </button>
              );
            }
            const n = nodeOf(p)!;
            const family = families.get(n.id) ?? "earth";
            const w = words(p);
            const isSelected =
              selected?.kind === "node" && selected.id === n.id;
            const onPath = lit.has(n.id) || path?.ancestor === n.id;
            const target = targets?.ids.has(n.id) === true;
            const end =
              pair?.from === n.id
                ? "From"
                : pair?.to === n.id
                  ? "To"
                  : undefined;
            const drawing = pair
              ? end !== undefined
              : targets?.current === n.id;
            const routeWords = onPath
              ? pair?.meet === n.id
                ? "on the route: where From and To meet"
                : "on the route"
              : undefined;
            return (
              <DiagramNode
                key={p.id}
                id={p.id}
                label={n.label}
                className={`fx-node fx-family-${family}${n.added ? " fx-added" : ""}${n.app ? " fx-app" : ""}${onPath ? " fx-on-path" : ""}${target ? " fx-target" : ""}${drawing ? " fx-drawing" : ""}`}
                style={{
                  transform,
                  inlineSize: p.w,
                  from,
                  i: lit.get(n.id) ?? 0,
                }}
                tabbable={roving === p.id}
                pressed={target ? drawing : isSelected}
                ariaLabel={[
                  target
                    ? pair
                      ? `${end ? `${end} now. ` : ""}${targets!.label(n.id)}`
                      : `${targets!.label(n.id)}${drawing ? ", drawing in it now" : ""}`
                    : undefined,
                  `${n.label}, ${FAMILY_INFO[family].label}${n.app ? ", defined by your app" : n.added ? ", added by this scenario" : ""}`,
                  routeWords,
                  w ? `Edge from ${w.full}` : "the root",
                ]
                  .filter((t) => t !== undefined)
                  .join(". ")}
                tag={p.tag}
                h={handlers}
              />
            );
          })}
        </div>
        {tipText &&
          tipRect &&
          createPortal(
            <span
              className={`fx-edge-tip${tipText.unknown ? " fx-unbounded" : ""}`}
              role="tooltip"
              style={{
                left: Math.max(8, Math.min(tipRect.left, innerWidth - 248)),
                top: tipRect.bottom + 6,
              }}
            >
              {tipText.text}
            </span>,
            // Inside StrataKit's root, as the Expand dialog is: its tokens and
            // colour scheme reach the tip (Task 4c item 4).
            designRoot(tip?.el, document.body),
          )}
      </div>
    </>
  );
});
