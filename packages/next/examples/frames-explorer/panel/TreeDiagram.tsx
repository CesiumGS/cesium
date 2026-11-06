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
import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { TreeNode } from "../tree.ts";
import { unfoldedFor } from "./diagramFocus.ts";
import { EDGE_LABEL, FAMILY_INFO, familyMap, type Family } from "./families.ts";
import { edgeAccuracyText } from "./FrameTree.tsx";
import { focusTree, layoutTree } from "./treeLayout.ts";

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
}

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

const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TreeDiagram({
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

  const families = useMemo(() => familyMap(tree), [tree]);
  // The one tag: the frame you draw in (the owner's design).
  const ends = useMemo(() => {
    const out = new Map<string, string>();
    if (targets) {
      out.set(targets.current, "Drawing in");
    }
    return out;
  }, [targets]);
  const layout = useMemo(
    () => diagramLayout(tree, keep, expanded, width, ends, fullLabels, data),
    [tree, keep, expanded, width, ends, fullLabels, data],
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
  const words = (p: Placed) => {
    const parent = p.parent !== undefined ? byId.get(p.parent) : undefined;
    return p.node && parent?.node
      ? edgeWords(p.node, parent.node.label)
      : undefined;
  };
  const tipFor = (id: string) => (e: { currentTarget: Element }) =>
    setTip({ id, el: e.currentTarget });
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
            const d = elbow(p, c);
            const from = `M ${p.x} ${p.y + PILL / 2} V ${p.y + PILL / 2} H ${p.x} V ${p.y + PILL / 2}`;
            const i = lit.get(c.id);
            const family: Family = c.node
              ? (families.get(c.id) ?? "earth")
              : "earth";
            const on = selected?.kind === "edge" && selected.id === c.id;
            const w = words(c);
            return (
              <g key={c.id}>
                <path
                  aria-hidden
                  className={`fx-diagram-edge fx-family-${family}${i !== undefined ? " fx-lit" : ""}${c.chip ? " fx-chip-edge" : ""}${c.data ? " fx-data-tether" : ""}${on ? " fx-selected" : ""}`}
                  style={
                    {
                      d: `path("${d}")`,
                      "--fx-from-d": `path("${from}")`,
                      "--i": i ?? 0,
                    } as React.CSSProperties
                  }
                />
                {c.node && w && (
                  <path
                    className="fx-diagram-hit"
                    role="button"
                    tabIndex={0}
                    aria-label={`Edge ${w.full}`}
                    aria-pressed={on}
                    style={{ d: `path("${d}")` } as React.CSSProperties}
                    onClick={() =>
                      onSelect(on ? undefined : { kind: "edge", id: c.id })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(on ? undefined : { kind: "edge", id: c.id });
                      }
                    }}
                    onPointerEnter={tipFor(c.id)}
                    onPointerLeave={hideTip}
                    onFocus={tipFor(c.id)}
                    onBlur={hideTip}
                  />
                )}
              </g>
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
          const style = {
            transform: `translate(${p.x - p.w / 2}px, ${p.y - PILL / 2}px)`,
            inlineSize: p.w,
            "--fx-from": parent
              ? `translate(${parent.x - p.w / 2}px, ${parent.y - PILL / 2}px) scale(0.6)`
              : `translate(${p.x - p.w / 2}px, ${p.y - PILL / 2}px)`,
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
                    return { ...now, ids: new Set([...now.ids, chip.parent]) };
                  })
                }
              >
                +{chip.count}
              </button>
            );
          }
          const n = p.node!;
          const family = families.get(n.id) ?? "earth";
          const w = words(p);
          const isSelected = selected?.kind === "node" && selected.id === n.id;
          const onPath = lit.has(n.id) || path?.ancestor === n.id;
          const target = targets?.ids.has(n.id) === true;
          const drawing = targets?.current === n.id;
          const end = onPath ? "on the route" : undefined;
          return (
            <button
              key={p.id}
              ref={remember(p.id)}
              type="button"
              className={`fx-node fx-family-${family}${n.added ? " fx-added" : ""}${onPath ? " fx-on-path" : ""}${target ? " fx-target" : ""}${drawing ? " fx-drawing" : ""}`}
              style={
                {
                  ...style,
                  "--i": lit.get(n.id) ?? 0,
                } as React.CSSProperties
              }
              tabIndex={roving === p.id ? 0 : -1}
              aria-pressed={target ? drawing : isSelected}
              aria-label={[
                target
                  ? `${targets!.label(n.id)}${drawing ? ", drawing in it now" : ""}`
                  : undefined,
                `${n.label}, ${FAMILY_INFO[family].label}${n.added ? ", added by this scenario" : ""}`,
                end,
                w ? `Edge from ${w.full}` : "the root",
              ]
                .filter((t) => t !== undefined)
                .join(". ")}
              onFocus={(e) => {
                setFocus(p.id);
                tipFor(p.id)(e);
              }}
              onBlur={hideTip}
              onPointerEnter={tipFor(p.id)}
              onPointerLeave={hideTip}
              onKeyDown={onKey(p)}
              onClick={() => {
                if (target) {
                  // The tree as the control: draw in this frame, and show it.
                  targets!.onPick(n.id);
                  onSelect({ kind: "node", id: n.id });
                } else {
                  onSelect(isSelected ? undefined : { kind: "node", id: n.id });
                }
              }}
            >
              <span className="fx-node-glyph" aria-hidden />
              <span className="fx-node-label">{n.label}</span>
              {p.tag && (
                <span className="fx-node-tag" aria-hidden>
                  {p.tag}
                </span>
              )}
            </button>
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
          document.body,
        )}
    </div>
  );
}
