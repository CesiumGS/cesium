/**
 * What a scene is, and what drawing it takes: content placed at nodes, panels
 * with a camera node each, measurements in named frames, and the overlays.
 */
import {
  applyJ,
  carryLine,
  cofactorApply,
  compile,
  evalRoute,
  length,
  pathBetween,
  singular,
  type CStep,
  type Edge,
  type GNode,
  type Mat,
  type Mat2,
  type Stage,
  type Step,
  type V2,
} from "./graph.ts";

export type Tone = "ink" | "muted" | "accent" | "good" | "warm" | "bad";

/** px per unit, and the unit at the centre of the panel. A negative `sy` draws y down. */
export interface View {
  cx: number;
  cy: number;
  sx: number;
  sy: number;
}

export interface Panel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The node the camera is at. */
  camera: string;
  view: View;
  title?: string;
}

export interface Item {
  id: string;
  label: string;
  node: string;
  kind: "line" | "area" | "point" | "text";
  paths: V2[][];
  tone: Tone;
  width?: number;
  dash?: string;
  marker?: "dot" | "diamond" | "square";
  /** Marker radius in px. */
  size?: number;
  text?: string;
  dx?: number;
  dy?: number;
  /** Panels it is drawn in; the main one if absent. */
  panels?: string[];
  /** Offered as the content whose route is shown. */
  pick?: boolean;
  /** Mapped vertex by vertex, with no subdivision. */
  plain?: boolean;
  /** Draw surface normals along it when it is the one picked. */
  normals?: boolean;
  /** Drawn only when the main camera is at this node. */
  only?: string;
}

export interface MeasureCol {
  key: string;
  label: string;
  node: string;
  /** Multiplies the result, for a frame whose unit isn't the one compared. */
  scale?: number;
  /** Edges taken as they are at rest, for a measurement below a presentation edge. */
  override?: Record<string, Edge>;
}

export interface Measure {
  id: string;
  label: string;
  /** A straight segment in one node, or two points in two. */
  mode: "curve" | "pair";
  a: { node: string; p: V2 };
  b: { node: string; p: V2 };
  cols: MeasureCol[];
}

export interface Built {
  nodes: GNode[];
  items: Item[];
  panels: Panel[];
  measures: Measure[];
  /** Unit circles in this node's frame, at these points. */
  tissot?: { node: string; pts: V2[]; r: number };
  /** A point with an isotropic standard deviation in its own node's frame. */
  sigma?: { node: string; at: V2; sigma: number; unit: string };
  notes?: string[];
}

export const viewMat = (p: Panel): Mat => ({
  a: p.view.sx,
  b: 0,
  c: 0,
  d: -p.view.sy,
  e: p.x + p.w / 2 - p.view.sx * p.view.cx,
  f: p.y + p.h / 2 + p.view.sy * p.view.cy,
});

export interface DrawnPath {
  pts: V2[];
  added: boolean[];
  /** A stretch of a closed path, left open where the map had no image. */
  open?: boolean;
  /** The endpoints-only polyline, when asked for. */
  naive?: V2[];
}

export interface DrawnItem {
  item: Item;
  panel: Panel;
  paths: DrawnPath[];
}

export interface Rendered {
  items: DrawnItem[];
  tissot: { p: V2; J: Mat2 }[];
  sigma?: { p: V2; J: Mat2; stages: Stage[] };
  normals: { p: V2; good: V2; naive: V2 }[];
  stats: {
    source: number;
    drawn: number;
    naiveError: number;
    estimate: number;
    newton: number;
  };
}

export interface Overlays {
  tissot: boolean;
  route: boolean;
  readouts: boolean;
  subdivision: boolean;
  normals: boolean;
  sigma: boolean;
  /** Chord error allowed, in px. */
  tolerance: number;
  naive: boolean;
}

const finite = (p: V2) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** The finite stretches of a path: where a map has no image, the drawing has a gap. */
function finiteRuns(
  pts: readonly V2[],
  added: readonly boolean[],
  naive: V2[] | undefined,
): DrawnPath[] {
  if (pts.every(finite)) {
    return [{ pts: [...pts], added: [...added], naive }];
  }
  const out: DrawnPath[] = [];
  let cur: DrawnPath = { pts: [], added: [], open: true, naive };
  for (let i = 0; i < pts.length; i++) {
    if (finite(pts[i]!)) {
      cur.pts.push(pts[i]!);
      cur.added.push(added[i]!);
    } else {
      if (cur.pts.length > 1) {
        out.push(cur);
      }
      cur = { pts: [], added: [], open: true };
    }
  }
  if (cur.pts.length > 1) {
    out.push(cur);
  }
  return out;
}

export function stepsToCamera(
  nodes: readonly GNode[],
  from: string,
  panel: Panel,
): CStep[] {
  return compile(pathBetween(nodes, from, panel.camera), viewMat(panel));
}

/** The route a picked item takes to the main camera, step by step. */
export function routeOf(built: Built, item: Item) {
  const main = built.panels[0]!;
  const raw: Step[] = pathBetween(built.nodes, item.node, main.camera);
  return { raw, compiled: compile(raw) };
}

/** A pixel in the main panel brought back into an item's own frame. */
export function pickBack(built: Built, item: Item, px: V2): V2 | undefined {
  const main = built.panels[0]!;
  const back = compile(pathBetween(built.nodes, main.camera, item.node));
  const m = viewMat(main);
  const det = m.a * m.d;
  const p: V2 = [(px[0] - m.e) / m.a, (px[1] - m.f) / m.d];
  if (!Number.isFinite(det) || det === 0) {
    return undefined;
  }
  const out = evalRoute(back, p).p;
  return finite(out) ? out : undefined;
}

export function render(built: Built, picked: Item | undefined, o: Overlays) {
  const main = built.panels[0]!;
  const cache = new Map<string, CStep[]>();
  const stepsFor = (node: string, panel: Panel) => {
    const key = `${node}>${panel.id}`;
    let s = cache.get(key);
    if (!s) {
      s = stepsToCamera(built.nodes, node, panel);
      cache.set(key, s);
    }
    return s;
  };
  const stats = {
    source: 0,
    drawn: 0,
    naiveError: 0,
    estimate: 0,
    newton: 0,
  };
  const items: DrawnItem[] = [];
  for (const item of built.items) {
    if (item.only !== undefined && item.only !== main.camera) {
      continue;
    }
    for (const panel of built.panels) {
      const ids = item.panels ?? [main.id];
      if (!ids.includes(panel.id)) {
        continue;
      }
      const steps = stepsFor(item.node, panel);
      const paths: DrawnPath[] = [];
      if (item.kind === "point" || item.kind === "text") {
        const p = evalRoute(steps, item.paths[0]![0]!).p;
        if (finite(p)) {
          paths.push({ pts: [p], added: [false] });
        }
      } else {
        for (const src of item.paths) {
          const line = carryLine(
            steps,
            src,
            o.tolerance,
            !item.plain,
            item.kind === "area",
          );
          let naive: V2[] | undefined;
          if (
            o.naive &&
            panel.id === main.id &&
            steps.some((s) => s.kind === "fn")
          ) {
            naive = carryLine(
              steps,
              src,
              o.tolerance,
              false,
              item.kind === "area",
            ).pts;
          }
          if (panel.id === main.id) {
            stats.source += line.segments;
            stats.drawn += line.drawn;
            stats.naiveError = Math.max(stats.naiveError, line.naive);
            stats.estimate = Math.max(stats.estimate, line.estimate);
            stats.newton = Math.max(stats.newton, line.newton);
          }
          paths.push(
            ...finiteRuns(line.pts, line.added, naive?.filter(finite)),
          );
        }
      }
      items.push({ item, panel, paths });
    }
  }

  const tissot: Rendered["tissot"] = [];
  if (built.tissot && o.tissot) {
    const steps = stepsFor(built.tissot.node, main);
    for (const pt of built.tissot.pts) {
      const e = evalRoute(steps, pt);
      stats.newton = Math.max(stats.newton, e.newton);
      if (finite(e.p)) {
        tissot.push({ p: e.p, J: e.J });
      }
    }
  }

  let sigma: Rendered["sigma"];
  if (built.sigma && o.sigma) {
    const e = evalRoute(stepsFor(built.sigma.node, main), built.sigma.at);
    sigma = { p: e.p, J: e.J, stages: e.stages };
  }

  const normals: Rendered["normals"] = [];
  if (picked?.normals && o.normals) {
    const steps = stepsFor(picked.node, main);
    for (const src of picked.paths) {
      const stride = Math.max(1, Math.round(src.length / 12));
      for (let i = stride; i < src.length - 1; i += stride) {
        const a = src[i - 1]!;
        const b = src[i + 1]!;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 1e-12) {
          continue;
        }
        const n: V2 = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
        const e = evalRoute(steps, src[i]!);
        const unit = (v: V2): V2 => {
          const l = Math.hypot(v[0], v[1]) || 1;
          return [v[0] / l, v[1] / l];
        };
        normals.push({
          p: e.p,
          good: unit(cofactorApply(e.J, n)),
          naive: unit(applyJ(e.J, n)),
        });
      }
    }
  }
  return { items, tissot, sigma, normals, stats } satisfies Rendered;
}

/** One measurement in one frame. */
export function measureIn(
  nodes: readonly GNode[],
  m: Measure,
  col: MeasureCol,
): number {
  const to = (node: string) =>
    compile(pathBetween(nodes, node, col.node, col.override));
  const sa = to(m.a.node);
  if (m.mode === "pair") {
    const pa = evalRoute(sa, m.a.p).p;
    const pb = evalRoute(to(m.b.node), m.b.p).p;
    return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) * (col.scale ?? 1);
  }
  const pa = evalRoute(sa, m.a.p).p;
  const pb = evalRoute(sa, m.b.p).p;
  const chord = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
  const line = carryLine(sa, [m.a.p, m.b.p], Math.max(1e-4 * chord, 1e-9));
  return length(line.pts) * (col.scale ?? 1);
}

/** Semi-axes of the 1σ ellipse for σ in the source frame, through J. */
export function sigmaAxes(J: Mat2, sigma: number): V2 {
  const [a, b] = singular(J);
  return [a * sigma, b * sigma];
}

export interface Control {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  init: number;
  unit?: string;
  digits?: number;
}

export interface Toggle {
  key: string;
  label: string;
  init: boolean;
}

export type Values = Record<string, number>;
export type Flags = Record<string, boolean>;

export interface SceneDef {
  id: string;
  title: string;
  /** What the scene is, in a few words for the picker. */
  short: string;
  caption: string;
  controls: Control[];
  toggles: Toggle[];
  /** Overlays on when the scene opens. */
  overlays?: Partial<Overlays>;
  build(v: Values, t: Flags): Built;
}
