// The frame tree as a branching diagram (spec "The tree diagram"; the
// owner's choice of a top-down tidy tree over the outline, ruling S6
// overridden). Pills sized to their labels, coloured by family; the frames
// the scenario added are distinct (a diamond and a tinted, family-edged
// pill). Docked, it draws the frames the scenario uses and folds the rest
// into "+N" chips (`focusTree`); too wide for its column, it pans, never
// squeezing, and keeps the lit path and the selection in view. The answer's
// path (`branchPath`) lights edge by edge, up to the common ancestor and
// down. On a scenario switch the shared nodes glide to their new places and
// the added ones grow out of their parents; reduced motion cuts straight to
// the new shape (panel.css).
//
// The layout is chosen in one place, `diagramLayout` below.
import { Typography } from "@mui/material";
import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TreeNode } from "../tree.ts";
import { EDGE_LABEL, FAMILY_INFO, familyMap, type Family } from "./families.ts";
import { edgeAccuracyText } from "./FrameTree.tsx";
import { focusTree, layoutTree } from "./treeLayout.ts";

/** A pill's height, a depth row's and the gap between pills, px. */
const PILL = 28;
const ROW = 76;
const GAP = 14;
/** The room round the diagram, px. */
const PAD = 14;
/** A pill's padding (10 + 12), its glyph and gap (8 + 7), its border and a little slack, px. */
const PILL_EXTRA = 44;

export type DiagramSelection = { kind: "node" | "edge"; id: string };

export interface DiagramPath {
  up: readonly string[];
  ancestor: string;
  down: readonly string[];
}

let measurer: CanvasRenderingContext2D | null | undefined;
/** The pills' type: the panel's own family at body-sm, semibold. */
let pillFont = "600 12px Inter, system-ui, sans-serif";
/** Measures in the font the diagram is drawn in (from its box's computed style). */
export function setPillFont(el: Element): void {
  const style = getComputedStyle(el);
  pillFont = `600 ${style.fontSize} ${style.fontFamily}`;
}
/** A label's width in the pills' type, px. */
function textWidth(text: string): number {
  if (measurer === undefined) {
    measurer =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!measurer) {
    return text.length * 8;
  }
  measurer.font = pillFont;
  return measurer.measureText(text).width;
}

/** A chip's node id: "+N" on `parent`. */
const chipId = (parent: string) => `+${parent}`;

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
}

/**
 * The diagram's layout (the one place the choice is made): the focused tree
 * (or the whole one), its chips as leaves, then `layoutTree` with pills
 * sized to their labels.
 */
export function diagramLayout(
  tree: TreeNode,
  keep: ReadonlySet<string> | undefined,
  expanded: ReadonlySet<string>,
  width: number,
): { placed: Placed[]; width: number; height: number; fits: boolean } {
  const focused = keep
    ? focusTree(tree, keep, expanded)
    : { tree, folded: new Map<string, number>() };
  // Chips as leaves: each folded parent gets one more child.
  const chips = new Set<string>();
  const withChips = (n: TreeNode): TreeNode => {
    const count = focused.folded.get(n.id);
    const children = n.children.map(withChips);
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
  const walk = (n: TreeNode, parent?: string) => {
    const isChip = chips.has(n.id);
    const w = isChip
      ? textWidth(n.label) + 22
      : Math.ceil(textWidth(n.label) + PILL_EXTRA);
    widths.set(n.id, w);
    info.set(n.id, {
      id: n.id,
      w,
      ...(parent !== undefined && { parent }),
      ...(isChip
        ? { chip: { parent: parent!, count: focused.folded.get(parent!)! } }
        : { node: n }),
    });
    n.children.forEach((c) => walk(c, n.id));
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
  const mid = top + (bottom - top) * 0.45;
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
}: {
  tree: TreeNode;
  path?: DiagramPath | undefined;
  /** The frames to draw, with their ancestors; the rest fold into chips. Undefined: the whole tree. */
  keep?: ReadonlySet<string> | undefined;
  selected?: DiagramSelection | undefined;
  onSelect: (s: DiagramSelection | undefined) => void;
  /** The diagram's accessible name. */
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [focus, setFocus] = useState<string>();
  const [hover, setHover] = useState<string>();
  const pills = useRef(new Map<string, HTMLButtonElement>());
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
  // A new tree (another scenario) folds again.
  const treeKey = tree.id + tree.children.map((c) => c.id).join();
  useEffect(() => setExpanded(new Set()), [treeKey]);

  const families = useMemo(() => familyMap(tree), [tree]);
  const layout = useMemo(
    () => diagramLayout(tree, keep, expanded, width),
    [tree, keep, expanded, width],
  );
  const byId = useMemo(
    () => new Map(layout.placed.map((p) => [p.id, p])),
    [layout],
  );
  // The lit path, in order along it: each edge named by its child.
  const lit = useMemo(() => {
    const order = new Map<string, number>();
    if (path) {
      [...path.up, ...[...path.down]].forEach((id, i) => order.set(id, i));
    }
    return order;
  }, [path]);
  const ends = useMemo(() => {
    const out = new Map<string, string>();
    if (path) {
      const from = path.up[0] ?? path.ancestor;
      const to = path.down.at(-1) ?? path.ancestor;
      out.set(path.ancestor, "meet");
      out.set(from, from === path.ancestor ? "meet" : "from");
      out.set(to, to === path.ancestor ? "meet" : "to");
    }
    return out;
  }, [path]);

  // Keep the lit path and the selection in view when the diagram pans.
  useEffect(() => {
    const el = box.current;
    if (!el || layout.width <= el.clientWidth) {
      return;
    }
    const xs = selected
      ? [byId.get(selected.id)?.x]
      : [...lit.keys(), path?.ancestor].map((id) => id && byId.get(id)?.x);
    const at = xs.filter((x): x is number => x !== undefined);
    if (at.length === 0) {
      return;
    }
    const centre = (Math.min(...at) + Math.max(...at)) / 2;
    el.scrollTo({
      left: centre - el.clientWidth / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [layout, selected, lit, path, byId]);

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
  const onKey = (p: Placed) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = move(p, e.key);
    if (next) {
      e.preventDefault();
      setFocus(next.id);
      pills.current.get(next.id)?.focus();
    }
  };

  const edgeText = (p: Placed) => {
    if (!p.node || p.parent === undefined) {
      return undefined;
    }
    const parent = byId.get(p.parent)?.node;
    const a = edgeAccuracyText(p.node.edge.kind, p.node.edge.accuracy);
    return {
      line: `${EDGE_LABEL[p.node.edge.kind]} · ${a.text}`,
      full: `${parent?.label ?? p.parent} → ${p.node.label}: ${EDGE_LABEL[p.node.edge.kind]}, ${a.text}`,
      unknown: a.unknown,
    };
  };
  const hovered = hover !== undefined ? byId.get(hover) : undefined;
  const hoverText = hovered && edgeText(hovered);

  return (
    <div
      ref={box}
      className={`fx-diagram${layout.fits ? "" : " fx-diagram-pans"}`}
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
          aria-hidden
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
            return (
              <g key={c.id}>
                <path
                  className={`fx-diagram-edge fx-family-${family}${i !== undefined ? " fx-lit" : ""}${c.chip ? " fx-chip-edge" : ""}${on ? " fx-selected" : ""}`}
                  style={
                    {
                      d: `path("${d}")`,
                      "--fx-from-d": `path("${from}")`,
                      "--i": i ?? 0,
                    } as React.CSSProperties
                  }
                />
                {c.node && (
                  <path
                    className="fx-diagram-hit"
                    style={{ d: `path("${d}")` } as React.CSSProperties}
                    onClick={() =>
                      onSelect(on ? undefined : { kind: "edge", id: c.id })
                    }
                    onPointerEnter={() => setHover(c.id)}
                    onPointerLeave={() => setHover(undefined)}
                  />
                )}
              </g>
            );
          })}
        </svg>
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
          if (p.chip) {
            const name = byId.get(p.chip.parent)?.node?.label ?? p.chip.parent;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  if (el) {
                    pills.current.set(p.id, el);
                  } else {
                    pills.current.delete(p.id);
                  }
                }}
                type="button"
                className="fx-node fx-chip"
                style={style}
                tabIndex={roving === p.id ? 0 : -1}
                aria-label={`Show ${p.chip.count} more ${p.chip.count === 1 ? "frame" : "frames"} under ${name}`}
                title={`${p.chip.count} more under ${name}`}
                onFocus={() => setFocus(p.id)}
                onKeyDown={onKey(p)}
                onClick={() =>
                  setExpanded((e) => new Set([...e, p.chip!.parent]))
                }
              >
                +{p.chip.count}
              </button>
            );
          }
          const n = p.node!;
          const family = families.get(n.id) ?? "earth";
          const edge = edgeText(p);
          const end = ends.get(n.id);
          const isSelected = selected?.kind === "node" && selected.id === n.id;
          const onPath = lit.has(n.id) || path?.ancestor === n.id;
          return (
            <button
              key={p.id}
              ref={(el) => {
                if (el) {
                  pills.current.set(p.id, el);
                } else {
                  pills.current.delete(p.id);
                }
              }}
              type="button"
              className={`fx-node fx-family-${family}${n.added ? " fx-added" : ""}${onPath ? " fx-on-path" : ""}`}
              style={
                {
                  ...style,
                  "--i": lit.get(n.id) ?? 0,
                } as React.CSSProperties
              }
              tabIndex={roving === p.id ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={`${n.label}, ${FAMILY_INFO[family].label}${n.added ? ", added by this scenario" : ""}${end ? `, the path's ${end === "meet" ? "common ancestor" : end === "from" ? "start" : "end"}` : ""}${edge ? `. Edge from ${edge.full}` : ", the root"}`}
              onFocus={() => {
                setFocus(p.id);
                setHover(p.id);
              }}
              onBlur={() => setHover(undefined)}
              onPointerEnter={() => setHover(p.id)}
              onPointerLeave={() => setHover(undefined)}
              onKeyDown={onKey(p)}
              onClick={() =>
                onSelect(isSelected ? undefined : { kind: "node", id: n.id })
              }
            >
              <span className="fx-node-glyph" aria-hidden />
              <span className="fx-node-label">{n.label}</span>
              {end && (
                <span className={`fx-node-end fx-end-${end}`} aria-hidden>
                  {end}
                </span>
              )}
            </button>
          );
        })}
        {/* The lit path's edges say their kind and accuracy inline; any
            other's shows on hover or focus. */}
        {layout.placed.map((p) => {
          const t =
            lit.has(p.id) && hover === undefined ? edgeText(p) : undefined;
          const parent =
            p.parent !== undefined ? byId.get(p.parent) : undefined;
          if (!t || !parent) {
            return null;
          }
          // Up to the next pill's line on its right, so tags never collide.
          const next = layout.placed
            .filter((q) => q.depth === p.depth && q.x > p.x)
            .reduce((m, q) => Math.min(m, q.x), layout.width - 8);
          const room = Math.max(48, next - p.x - 18);
          return (
            <span
              key={`edge:${p.id}`}
              className={`fx-edge-tag${t.unknown ? " fx-unbounded" : ""}`}
              title={t.full}
              style={
                {
                  transform: `translate(${p.x + 6}px, ${p.y - PILL / 2 - 20}px)`,
                  maxInlineSize: room,
                  "--i": lit.get(p.id) ?? 0,
                } as React.CSSProperties
              }
              aria-hidden
            >
              {t.line}
            </span>
          );
        })}
        {hovered && hoverText && (
          <Typography
            variant="caption-lg"
            render={<span />}
            className={`fx-edge-tip${hoverText.unknown ? " fx-unbounded" : ""}`}
            style={{
              left: Math.min(Math.max(8, hovered.x - 110), layout.width - 228),
              top: hovered.y + PILL / 2 + 6,
            }}
            aria-hidden
          >
            {hoverText.full}
          </Typography>
        )}
      </div>
    </div>
  );
}
