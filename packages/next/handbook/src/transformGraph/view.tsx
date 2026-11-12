/** The drawing and the controls of the transform-graph explainer. */
import { useId, type ReactNode } from "react";
import { DataTable } from "../parts.tsx";
import { compile, type GNode, type Step, type V2 } from "./graph.ts";
import {
  sigmaAxes,
  type Built,
  type Control,
  type DrawnItem,
  type Item,
  type Overlays,
  type Rendered,
  type Toggle,
  type Values,
  type Flags,
} from "./model.ts";

const path = (pts: readonly V2[], close: boolean) =>
  pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join("") + (close ? "Z" : "");

const matrix = (J: readonly number[], p: V2) =>
  `matrix(${J[0]} ${J[2]} ${J[1]} ${J[3]} ${p[0].toFixed(2)} ${p[1].toFixed(2)})`;

function Marker({ item, p }: { item: Item; p: V2 }) {
  const r = item.size ?? 3.5;
  if (item.marker === "diamond") {
    return (
      <path
        d={`M${p[0]} ${p[1] - r}L${p[0] + r} ${p[1]}L${p[0]} ${p[1] + r}L${p[0] - r} ${p[1]}Z`}
      />
    );
  }
  if (item.marker === "square") {
    return <rect x={p[0] - r} y={p[1] - r} width={2 * r} height={2 * r} />;
  }
  return <circle cx={p[0]} cy={p[1]} r={r} />;
}

function Drawn({
  di,
  hot,
  subdivision,
}: {
  di: DrawnItem;
  hot: boolean;
  subdivision: boolean;
}) {
  const { item } = di;
  const cls = `tg-i tg-${item.tone}${hot ? " tg-hot" : ""}`;
  if (item.kind === "text") {
    const p = di.paths[0]!.pts[0];
    if (!p) {
      return null;
    }
    const dx = item.dx ?? 0;
    return (
      <text
        className={`tg-label${hot ? " tg-hot" : ""}`}
        x={p[0] + dx}
        y={p[1] + (item.dy ?? 0)}
        textAnchor={dx < 0 ? "end" : "start"}
      >
        {item.text}
      </text>
    );
  }
  if (item.kind === "point") {
    const p = di.paths[0]!.pts[0];
    return p ? (
      <g className={`${cls} tg-marker`}>
        <Marker item={item} p={p} />
      </g>
    ) : null;
  }
  return (
    <g className={cls}>
      {di.paths.map((dp, i) => {
        const closed = item.kind === "area" && !dp.open;
        return (
          <g key={i}>
            {hot ? (
              <path className="tg-halo" d={path(dp.pts, closed)} fill="none" />
            ) : null}
            <path
              className={closed ? "tg-area" : "tg-line"}
              d={path(dp.pts, closed)}
              strokeWidth={item.width ?? 1.6}
              strokeDasharray={item.dash}
            />
            {dp.naive ? (
              <path
                className="tg-naive"
                d={path(dp.naive, closed)}
                fill="none"
              />
            ) : null}
            {subdivision
              ? dp.pts.map((p, j) =>
                  dp.added[j] ? (
                    <circle
                      key={j}
                      className="tg-sub"
                      cx={p[0]}
                      cy={p[1]}
                      r={2.4}
                    />
                  ) : null,
                )
              : null}
          </g>
        );
      })}
    </g>
  );
}

export function Stage({
  built,
  rendered,
  picked,
  overlays,
  onMove,
  label,
}: {
  built: Built;
  rendered: Rendered;
  picked: Item | undefined;
  overlays: Overlays;
  onMove: (px: V2 | undefined) => void;
  label: string;
}) {
  const uid = useId().replace(/:/g, "");
  const main = built.panels[0]!;
  const sigma = built.sigma;
  return (
    <svg
      className="tg-svg"
      viewBox="0 0 800 520"
      role="img"
      aria-label={label}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onMove([
          ((e.clientX - r.left) / r.width) * 800,
          ((e.clientY - r.top) / r.height) * 520,
        ]);
      }}
      onMouseLeave={() => onMove(undefined)}
    >
      <defs>
        {built.panels.map((p) => (
          <clipPath id={`${uid}-${p.id}`} key={p.id}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} />
          </clipPath>
        ))}
      </defs>
      {built.panels.map((panel) => (
        <g key={panel.id} clipPath={`url(#${uid}-${panel.id})`}>
          <rect
            className={panel.id === main.id ? "tg-bg" : "tg-bg tg-inset"}
            x={panel.x}
            y={panel.y}
            width={panel.w}
            height={panel.h}
          />
          {rendered.items
            .filter((d) => d.panel.id === panel.id)
            .map((d) => (
              <Drawn
                key={d.item.id}
                di={d}
                hot={overlays.route && d.item === picked}
                subdivision={overlays.subdivision && panel.id === main.id}
              />
            ))}
          {panel.title ? (
            <text className="tg-title" x={panel.x + 8} y={panel.y + 16}>
              {panel.title}
            </text>
          ) : null}
        </g>
      ))}
      {built.panels.slice(1).map((p) => (
        <rect
          key={p.id}
          className="tg-frame"
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
        />
      ))}
      <g clipPath={`url(#${uid}-${main.id})`}>
        {rendered.tissot.map((t, i) => (
          <g key={i} className="tg-tissot">
            <circle
              r={built.tissot!.r}
              transform={matrix(t.J, t.p)}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={t.p[0]} cy={t.p[1]} r={1.5} />
          </g>
        ))}
        {rendered.normals.map((n, i) => (
          <g key={i}>
            <path
              className="tg-normal-naive"
              d={`M${n.p[0]} ${n.p[1]}l${n.naive[0] * 20} ${n.naive[1] * 20}`}
            />
            <path
              className="tg-normal"
              d={`M${n.p[0]} ${n.p[1]}l${n.good[0] * 24} ${n.good[1] * 24}`}
            />
          </g>
        ))}
        {rendered.sigma && sigma ? (
          <g className="tg-sigma">
            <circle
              r={sigma.sigma}
              transform={matrix(rendered.sigma.J, rendered.sigma.p)}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={rendered.sigma.p[0]} cy={rendered.sigma.p[1]} r={2} />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------- the tree */

const TREE_W = 300;

function layout(nodes: readonly GNode[]) {
  const kids = new Map<string | undefined, GNode[]>();
  for (const n of nodes) {
    kids.set(n.parent, [...(kids.get(n.parent) ?? []), n]);
  }
  const out: { node: GNode; depth: number }[] = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const n of kids.get(parent) ?? []) {
      out.push({ node: n, depth });
      walk(n.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

export function Tree({
  built,
  picked,
  steps,
  routeOn,
}: {
  built: Built;
  picked: Item | undefined;
  steps: Step[];
  routeOn: boolean;
}) {
  const rows = layout(built.nodes);
  const holds = new Map<string, string[]>();
  for (const it of built.items) {
    if (it.pick) {
      holds.set(it.node, [...(holds.get(it.node) ?? []), it.label]);
    }
  }
  const cams = new Set(built.panels.map((p) => p.camera));
  const onRoute = new Map<string, Step>();
  const routeNodes = new Set<string>();
  if (routeOn && picked) {
    routeNodes.add(picked.node);
    for (const s of steps) {
      onRoute.set(s.node, s);
      routeNodes.add(s.to);
    }
  }
  const GAP = 12;
  let y = 4;
  const laid = rows.map(({ node, depth }) => {
    const h = 24 + (node.edge ? 16 : 0) + (holds.has(node.id) ? 16 : 0);
    const x = 4 + depth * 16;
    const r = { node, depth, x, y, h, w: TREE_W - x - 4 };
    y += h + GAP;
    return r;
  });
  const byId = new Map(laid.map((r) => [r.node.id, r]));
  return (
    <svg
      className="tg-tree"
      viewBox={`0 0 ${TREE_W} ${y}`}
      role="img"
      aria-label="The transform graph as a tree: each node's edge to its parent is affine or non-linear"
    >
      {laid.map((r) => {
        const parent = r.node.parent ? byId.get(r.node.parent) : undefined;
        if (!parent || !r.node.edge) {
          return null;
        }
        const nl = r.node.edge.kind === "fn";
        const hot = onRoute.has(r.node.id);
        const tx = parent.x + 8;
        const my = r.y + r.h / 2;
        return (
          <path
            key={r.node.id}
            className={`tg-edge ${nl ? "tg-edge-fn" : "tg-edge-affine"}${hot ? " tg-edge-route" : ""}`}
            d={`M${tx} ${parent.y + parent.h}V${my}H${r.x}`}
          />
        );
      })}
      {laid.map((r) => {
        const e = r.node.edge;
        const s = onRoute.get(r.node.id);
        const nl = e?.kind === "fn";
        const held = holds.get(r.node.id);
        return (
          <g
            key={r.node.id}
            className={`tg-node${routeNodes.has(r.node.id) ? " tg-node-route" : ""}${nl ? " tg-node-fn" : ""}`}
          >
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} />
            <text className="tg-n-title" x={r.x + 8} y={r.y + 16}>
              {r.node.label}
            </text>
            {cams.has(r.node.id) ? (
              <text
                className="tg-n-cam"
                x={r.x + r.w - 8}
                y={r.y + 16}
                textAnchor="end"
              >
                ◉ camera
              </text>
            ) : null}
            {e ? (
              <text className="tg-n-edge" x={r.x + 8} y={r.y + 32}>
                {s ? (s.dir === "up" ? "↑ " : "↓ ") : ""}
                {nl ? "" : "affine · "}
                {e.label}
                {s && nl && s.dir === "down" ? " · inverse" : ""}
              </text>
            ) : null}
            {held ? (
              <text className="tg-n-held" x={r.x + 8} y={r.y + (e ? 48 : 32)}>
                ▪ {held.join(", ")}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** The route as the chain it is evaluated as: affine runs already one matrix. */
export function RouteChips({
  built,
  picked,
  steps,
}: {
  built: Built;
  picked: Item | undefined;
  steps: Step[];
}) {
  if (!picked) {
    return null;
  }
  const label = (id: string) =>
    built.nodes.find((n) => n.id === id)?.label ?? id;
  const compiled = compile(steps);
  return (
    <ol
      className="tg-chips"
      aria-label="The route from the content to the camera"
    >
      <li className="tg-chip tg-chip-end">
        <b>{picked.label}</b>
        <span>{label(picked.node)}</span>
      </li>
      {compiled.map((c, i) => (
        <li
          key={i}
          className={`tg-chip ${c.kind === "fn" ? "tg-chip-fn" : "tg-chip-affine"}`}
        >
          {c.kind === "affine" ? (
            <>
              <b>{c.count > 1 ? `M · ${c.count} edges` : "M"}</b>
              <span>
                {c.count > 1 ? "collapsed to one matrix" : "one matrix"}
              </span>
            </>
          ) : (
            <>
              <b>{c.dir === "up" ? "f ↑" : "f⁻¹ ↓"}</b>
              <span>{c.dir === "up" ? c.label : `Newton on ${c.label}`}</span>
            </>
          )}
        </li>
      ))}
      <li className="tg-chip tg-chip-end">
        <b>camera</b>
        <span>{label(built.panels[0]!.camera)}</span>
      </li>
    </ol>
  );
}

/* ------------------------------------------------------------- controls */

export function Controls({
  controls,
  toggles,
  values,
  flags,
  onValue,
  onFlag,
}: {
  controls: Control[];
  toggles: Toggle[];
  values: Values;
  flags: Flags;
  onValue: (key: string, v: number) => void;
  onFlag: (key: string, v: boolean) => void;
}) {
  return (
    <div className="tg-controls">
      {controls.map((c) => (
        <label key={c.key} className="tg-slider">
          <span>{c.label}</span>
          <input
            type="range"
            min={c.min}
            max={c.max}
            step={c.step}
            value={values[c.key]}
            onChange={(e) => onValue(c.key, Number(e.target.value))}
          />
          <output>
            {values[c.key]!.toFixed(c.digits ?? 1)}
            {c.unit ?? ""}
          </output>
        </label>
      ))}
      {toggles.map((t) => (
        <label key={t.key} className="tg-check">
          <input
            type="checkbox"
            checked={flags[t.key] ?? false}
            onChange={(e) => onFlag(t.key, e.target.checked)}
          />
          {t.label}
        </label>
      ))}
    </div>
  );
}

export const OVERLAY_LABELS: {
  key: keyof Overlays;
  label: string;
  hint: string;
}[] = [
  { key: "tissot", label: "Tissot ellipses", hint: "unit circles mapped by J" },
  {
    key: "route",
    label: "Route highlight",
    hint: "the picked content, on the tree and in the picture",
  },
  { key: "readouts", label: "True vs drawn", hint: "measured in named frames" },
  {
    key: "subdivision",
    label: "Subdivision points",
    hint: "added where H says the edge bends",
  },
  {
    key: "normals",
    label: "Normals",
    hint: "cofactor of J (green) against J·n (red)",
  },
  { key: "sigma", label: "σ ellipse", hint: "J Σ Jᵀ" },
];

export function OverlayToggles({
  overlays,
  onChange,
}: {
  overlays: Overlays;
  onChange: (key: keyof Overlays, v: boolean) => void;
}) {
  return (
    <div className="tg-overlays" role="group" aria-label="Overlays">
      {OVERLAY_LABELS.map((o) => (
        <label key={o.key} className="tg-check" title={o.hint}>
          <input
            type="checkbox"
            checked={overlays[o.key] as boolean}
            onChange={(e) => onChange(o.key, e.target.checked)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ the readouts */

const num = (v: number) =>
  Math.abs(v) >= 1000
    ? v.toFixed(0)
    : Math.abs(v) >= 100
      ? v.toFixed(1)
      : Math.abs(v) >= 10
        ? v.toFixed(2)
        : v.toFixed(3);

export function Measures({
  built,
  values,
}: {
  built: Built;
  values: {
    id: string;
    label: string;
    cols: { key: string; label: string; v: number }[];
  }[];
}) {
  void built;
  const heads: { key: string; label: string }[] = [];
  for (const m of values) {
    for (const c of m.cols) {
      if (!heads.some((h) => h.key === c.key)) {
        heads.push({ key: c.key, label: c.label });
      }
    }
  }
  const ratio =
    heads.some((h) => h.key === "true") && heads.some((h) => h.key === "drawn");
  return (
    <DataTable
      label="True and drawn measurements"
      rows={values}
      columns={[
        { head: "Measured", cell: (r) => r.label },
        ...heads.map((h) => ({
          head: h.label,
          numeric: true,
          cell: (r: (typeof values)[number]) => {
            const c = r.cols.find((x) => x.key === h.key);
            return c ? num(c.v) : "";
          },
        })),
        ...(ratio
          ? [
              {
                head: "Drawn ÷ true",
                numeric: true,
                cell: (r: (typeof values)[number]) => {
                  const a = r.cols.find((x) => x.key === "true");
                  const b = r.cols.find((x) => x.key === "drawn");
                  return a && b && Math.abs(a.v) > 1e-9
                    ? `${(b.v / a.v).toFixed(3)}×`
                    : "–";
                },
              },
            ]
          : []),
      ]}
    />
  );
}

export function Sigma({
  built,
  rendered,
}: {
  built: Built;
  rendered: Rendered;
}): ReactNode {
  const s = built.sigma;
  if (!s || !rendered.sigma) {
    return null;
  }
  const label = (id: string) =>
    id === "screen"
      ? "Drawn (px)"
      : (built.nodes.find((n) => n.id === id)?.label ?? id);
  const rows = [
    { frame: label(s.node), axes: [s.sigma, s.sigma] as V2 },
    ...rendered.sigma.stages.map((st) => ({
      frame: label(st.node),
      axes: sigmaAxes(st.J, s.sigma),
    })),
  ];
  return (
    <DataTable
      label="One standard deviation, frame by frame"
      rows={rows}
      columns={[
        { head: `σ = ${s.sigma} ${s.unit}, in`, cell: (r) => r.frame },
        { head: "Major", numeric: true, cell: (r) => num(r.axes[0]) },
        { head: "Minor", numeric: true, cell: (r) => num(r.axes[1]) },
        {
          head: "Area ÷ source",
          numeric: true,
          cell: (r) =>
            `${((r.axes[0] * r.axes[1]) / (s.sigma * s.sigma)).toFixed(2)}×`,
        },
      ]}
    />
  );
}
