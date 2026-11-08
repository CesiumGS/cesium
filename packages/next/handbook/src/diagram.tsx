import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Small pieces for the handbook's diagrams (DESIGN.md). Everything is real
 * text in the page, so it can be searched and printed, and none of it hides
 * behind hover. On a phone a board becomes one column, with each card naming
 * its lane.
 */

export interface BoardStep {
  id: string;
  /** Index into `lanes`. */
  lane: number;
  title: string;
  body: ReactNode;
  /** What flows out of it, shown as a line of its own. */
  flow?: ReactNode;
  /** Links to seams and decisions. */
  tags?: ReactNode;
  /** Its row; defaults to its place in the list. */
  row?: number;
  /** Rows it spans, stretched to fill them. */
  rows?: number;
  accent?: boolean;
}

export interface BoardEdge {
  from: string;
  to: string;
  label?: string;
  /** Leave from the top or bottom, and arrive at the side. */
  vertical?: boolean;
}

interface DrawnEdge {
  key: string;
  d: string;
  label?: string;
  x: number;
  y: number;
  dashed: boolean;
}

const NO_EDGES: readonly BoardEdge[] = [];

/**
 * Steps on swim lanes, joined by arrows drawn over the grid. The arrows are
 * drawn from where the cards really are, so a card can grow with its text.
 */
export function Board({
  label,
  lanes,
  steps,
  edges,
  back = NO_EDGES,
}: {
  label: string;
  lanes: readonly string[];
  steps: readonly BoardStep[];
  edges: readonly BoardEdge[];
  /** Arrows that loop back, drawn dashed. */
  back?: readonly BoardEdge[];
}) {
  const marker = useId();
  const root = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState<{
    edges: DrawnEdge[];
    width: number;
    height: number;
  }>({ edges: [], width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const box = element.getBoundingClientRect();
      const rect = (id: string) => {
        const card = element.querySelector<HTMLElement>(
          `[data-step="${CSS.escape(id)}"]`,
        );
        const r = card?.getBoundingClientRect();
        return r
          ? {
              left: r.left - box.left,
              right: r.right - box.left,
              top: r.top - box.top,
              bottom: r.bottom - box.top,
            }
          : undefined;
      };
      const route = (
        edge: BoardEdge,
        dashed: boolean,
      ): DrawnEdge | undefined => {
        const a = rect(edge.from);
        const b = rect(edge.to);
        if (!a || !b) {
          return undefined;
        }
        const ax = (a.left + a.right) / 2;
        const bx = (b.left + b.right) / 2;
        const key = `${edge.from}>${edge.to}`;
        const stacked = a.left < b.right && b.left < a.right;
        if (stacked) {
          const down = b.top >= a.bottom;
          const y1 = down ? a.bottom : a.top;
          const y2 = down ? b.top - 2 : b.bottom + 2;
          return {
            key,
            d: `M${ax} ${y1} L${ax} ${y2}`,
            ...(edge.label ? { label: edge.label } : {}),
            x: ax + 8,
            y: (y1 + y2) / 2 + 4,
            dashed,
          };
        }
        const right = b.left > a.right;
        const sx = right ? a.right : a.left;
        const sy = (a.top + a.bottom) / 2;
        // Side by side: straight across.
        if (a.top < b.bottom && b.top < a.bottom) {
          const ty =
            (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
          const tx = right ? b.left - 2 : b.right + 2;
          return {
            key,
            d: `M${sx} ${ty} L${tx} ${ty}`,
            ...(edge.label ? { label: edge.label } : {}),
            x: (sx + tx) / 2,
            y: ty - 6,
            dashed,
          };
        }
        // Up or down first, then across into its side: clear of whatever
        // sits beside the card it leaves.
        if (edge.vertical) {
          const ty = (b.top + b.bottom) / 2;
          const tx = right ? b.left - 2 : b.right + 2;
          const leave = ty > a.bottom ? a.bottom : a.top;
          return {
            key,
            d: `M${ax} ${leave} L${ax} ${ty} L${tx} ${ty}`,
            ...(edge.label ? { label: edge.label } : {}),
            x: (ax + tx) / 2,
            y: ty - 6,
            dashed,
          };
        }
        // Across lanes: out of its side, then along and down (or up) to the
        // other card's top (or bottom).
        const below = b.top >= sy;
        const ey = below ? b.top - 2 : b.bottom + 2;
        return {
          key,
          d: `M${sx} ${sy} L${bx} ${sy} L${bx} ${ey}`,
          ...(edge.label ? { label: edge.label } : {}),
          x: (sx + bx) / 2,
          y: sy - 6,
          dashed,
        };
      };
      const all = [
        ...edges.map((e) => route(e, false)),
        ...back.map((e) => route(e, true)),
      ].filter((e): e is DrawnEdge => e !== undefined);
      // Only a real change: measuring must not cause another measure.
      setDrawn((now) =>
        now.width === box.width &&
        now.height === box.height &&
        now.edges.length === all.length &&
        now.edges.every((e, i) => e.d === all[i]!.d)
          ? now
          : { edges: all, width: box.width, height: box.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [edges, back]);

  return (
    <div className="board-wrap">
      <div
        className="board"
        ref={root}
        role="group"
        aria-label={label}
        style={{ "--lanes": lanes.length } as React.CSSProperties}
      >
        {lanes.map((lane, i) => (
          <div
            className="board-lane-head"
            style={{ gridColumn: i + 1, gridRow: 1 }}
            key={lane}
          >
            {lane}
          </div>
        ))}
        {steps.map((step, i) => (
          <div
            className={step.accent ? "board-card accent" : "board-card"}
            data-step={step.id}
            style={{
              gridColumn: step.lane + 1,
              gridRow: `${(step.row ?? i) + 2} / span ${step.rows ?? 1}`,
              ...(step.rows ? { alignSelf: "stretch" } : {}),
            }}
            key={step.id}
          >
            <span className="board-card-lane">{lanes[step.lane]}</span>
            <h4>{step.title}</h4>
            <div className="board-card-body">{step.body}</div>
            {step.flow ? <p className="board-flow">{step.flow}</p> : null}
            {step.tags ? <div className="tags">{step.tags}</div> : null}
          </div>
        ))}
        <svg
          className="board-edges"
          width={drawn.width}
          height={drawn.height}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path className="d-head" d="M0 0 L8 4 L0 8 z" />
            </marker>
          </defs>
          {drawn.edges.map((e) => (
            <g key={e.key}>
              <path
                className="d-edge"
                strokeWidth={1.5}
                strokeDasharray={e.dashed ? "5 4" : undefined}
                markerEnd={`url(#${CSS.escape(marker)})`}
                d={e.d}
              />
              {e.label ? (
                <text
                  className="d-edge-label"
                  x={e.x}
                  y={e.y}
                  textAnchor="middle"
                >
                  {e.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Scrolls to something on the page, and puts the keyboard there. */
function jumpTo(id: string) {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  target.scrollIntoView({ block: "center" });
  target.focus({ preventScroll: true });
}

/**
 * A tag that takes you to what it names on the same page. A button rather
 * than a link: the page's hash is its tab.
 */
export function Tag({
  to,
  kind,
  children,
}: {
  /** The id of the row it names. */
  to: string;
  kind: "seam" | "decision";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tag tag-${kind}`}
      onClick={() => jumpTo(to)}
    >
      {children}
    </button>
  );
}

/** Layers a dense figure can show or hide. All start on. */
export function useLayers<Name extends string>(
  names: readonly Name[],
): {
  shown: (name: Name) => boolean;
  controls: ReactNode;
} {
  const [off, setOff] = useState<ReadonlySet<Name>>(new Set());
  return {
    shown: (name) => !off.has(name),
    controls: (
      <div className="layers" role="group" aria-label="Layers of this figure">
        <span>Show</span>
        {names.map((name) => (
          <button
            type="button"
            className="layer"
            aria-pressed={!off.has(name)}
            onClick={() => {
              const next = new Set(off);
              if (!next.delete(name)) {
                next.add(name);
              }
              setOff(next);
            }}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
    ),
  };
}
