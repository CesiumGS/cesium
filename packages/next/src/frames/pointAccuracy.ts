// The composer that carries a point's accuracy along a route through the
// frame tree, from each edge's stated `FrameAccuracy` (plan 4b, Task 7b:
// "the library composes; the app only declares"; plan 5b, Task 4: beyond
// first order). Each figure becomes a 1σ covariance at the point, rotated
// into the result's axes, and the total is the root of the composed
// covariance's trace: for independent figures with no axis that is the
// root-sum-square, exactly.
import type { Instant } from "../time/Instant.ts";
import { frameTransform, type Frame } from "./Frame.ts";
import {
  eigenSymmetric,
  rotateCovariance,
  symmetricSqrt,
  trace,
} from "./covariance.ts";
import {
  isUnstated,
  type AccuracyFigure,
  type Confidence,
  type SharedSource,
} from "./frameAccuracy.ts";
import { convertPoint, framePoint, type FramePoint } from "./local.ts";
import { rotationPart } from "./matrix.ts";
import { PiecewiseFrame } from "./piecewise.ts";

/** What a figure carried over from its edge, beyond its size. */
interface TermFlags {
  /** What the figure was, when it was not 1σ. */
  readonly confidence?: Confidence;
  /** How it was read as 1σ, in words. */
  readonly converted?: string;
  readonly source?: SharedSource;
  /** The figure's short name ("UT1"). */
  readonly term?: string;
  readonly predicted?: boolean;
  readonly estimated?: boolean;
}

/**
 * One part of a point's accuracy, as a distance at the point (1σ, m). An
 * edge's part is what the edge states:
 *
 * - `meters`: the edge's position error (or a stated covariance's √trace).
 * - `angular`: its rotation error times the lever arm: the point's distance
 *   from the figure's axis, or from that frame's origin when it has none.
 * - `exact`: exact by definition, 0 m.
 * - `unstated`: the edge states no accuracy, so the total is unbounded;
 *   it has no `meters`.
 * - `simulated`: the edge makes no claim (a simulated span); no `meters`.
 * - `refused`: a figure that can't be composed (a confidence level it has no
 *   distribution for, a difference source crossed on one leg); no `meters`.
 *
 * A term on no edge:
 *
 * - `route`: what the route adds (light time, relativity); `frame` is its
 *   source.
 *
 * A picked point (`createFramesPickInterpreter`) also has parts that are
 * no edge's:
 *
 * - `pick`: how the pick itself places the point: `part` `"footprint"`,
 *   one CSS pixel's footprint at the hit (the pick reads the pixel's
 *   centre, which may be this far from where the click was meant);
 *   `"depth"`, the rounding of the depth buffer's float32 depth at the hit.
 * - `content`: how far the content's placement draws its design from where
 *   it truly is (`DesignPlacement.displayError`; 0 m when reprojected).
 */
export type PointAccuracyTerm =
  | {
      /** The reference frame the point is tagged in. */
      readonly frame: string;
      readonly kind: "pick";
      readonly part: "footprint" | "depth";
      /** 1σ, m. */
      readonly meters: number;
      readonly note: string;
    }
  | {
      /** The placement's design reference frame (`DesignPlacement.frameName`). */
      readonly frame: string;
      readonly kind: "content";
      /** 1σ, m. */
      readonly meters: number;
      readonly note: string;
    }
  | ({
      /** The frame whose edge (to its parent) it comes from. */
      readonly frame: string;
      readonly kind: "meters" | "exact";
      /** 1σ, m: what it moves the point by (0 for an exact edge). */
      readonly meters: number;
      /** The edge's own note. */
      readonly note: string;
    } & TermFlags)
  | ({
      readonly frame: string;
      readonly kind: "angular";
      readonly meters: number;
      /** The rotation error, rad (1σ). */
      readonly radians: number;
      /** The point's distance from the figure's axis (or the frame's origin), m. */
      readonly lever: number;
      /** The axis the rotation is about, in the frame's own axes. */
      readonly axis?: readonly [number, number, number];
      readonly note: string;
    } & TermFlags)
  | {
      readonly frame: string;
      readonly kind: "unstated";
      /** Not stated: why, in the edge's note. */
      readonly meters?: undefined;
      readonly note: string;
    }
  | {
      readonly frame: string;
      readonly kind: "simulated" | "refused";
      readonly meters?: undefined;
      readonly note: string;
    }
  | ({
      /** The term's source. */
      readonly frame: string;
      readonly kind: "route";
      /** 1σ, m; undefined when its size is not known. */
      readonly meters: number | undefined;
      readonly note: string;
    } & TermFlags);

/** What a point's position in another frame can claim. */
export interface PointAccuracy {
  /**
   * The total, m: the root of the composed 1σ covariance's trace (at
   * `confidence` `"95%"`, 2.7955 times its longest semi-axis, a bound in
   * every direction); `undefined` when an edge is not stated, refused or
   * simulated.
   */
  readonly meters: number | undefined;
  /** What `meters` is: 1σ (the default) or a 95% bound. */
  readonly confidence: "1σ" | "95%";
  /**
   * One term per figure on each edge of the route, nearest the point first
   * (a picked point's `pick` and `content` terms before them), then the
   * route's own terms.
   */
  readonly terms: readonly PointAccuracyTerm[];
  /** The composed covariance, row-major 3×3, m², 1σ, in the result's axes; absent when `meters` is. */
  readonly covariance?: Float64Array;
  /** The 1σ error ellipsoid: semi-axes (longest first) and their unit directions as columns (row-major). */
  readonly ellipsoid?: {
    readonly semiAxes: Float64Array;
    readonly axes: Float64Array;
  };
  /** The first edge on the route whose accuracy is not stated: the total is then unbounded. */
  readonly unboundedBy?: string;
  /** The first edge with a figure that can't be composed, so no total is stated. */
  readonly refusedBy?: string;
  /** The first simulated edge: no claim is made. */
  readonly simulatedBy?: string;
  /** How the terms combine, in words. */
  readonly combination: string;
}

/** A term on no edge: light time, relativity, an application's own. */
export interface RouteTerm {
  readonly source: string;
  /** 1σ unless `confidence` says otherwise; `undefined` when not known. */
  readonly meters: number | undefined;
  readonly note: string;
  readonly confidence?: Confidence;
  readonly distribution?: "normal" | "uniform";
  /** A row-major 3×3 covariance in the result's axes, m², 1σ. */
  readonly covariance?: ArrayLike<number>;
}

/** Options for `pointAccuracy` and `separationAccuracy`. */
export interface PointAccuracyOptions {
  /** What `meters` is: `"1σ"` (default) or `"95%"`. */
  readonly confidence?: "1σ" | "95%";
  readonly routeTerms?: readonly RouteTerm[];
}

const COMBINATION =
  "root-sum-square of independent 1σ terms; each rotation error times the point's distance from that frame's origin (an upper bound: the accuracy names no axis)";

const BEYOND =
  "the root of the trace of a composed 1σ covariance: each figure becomes a covariance at the point (metres m: m²/3 in every axis; an angle about an axis: its size times the distance from the axis, across it; an angle with no axis: its size times the distance from the origin, across the line to the origin), rotated into the result's axes; independent figures add, shared sources combine by their rules";

/** The radius holding 95% of a 3D normal, in σ (χ² with 3 degrees of freedom). */
const BALL_95 = 2.7955;
/** The two-sided 95% of a 1D normal, in σ. */
const LINE_95 = 1.95996;

/** `frame` and its ancestors, nearest first. */
function chainOf(frame: Frame): Frame[] {
  const out: Frame[] = [];
  for (let f: Frame | undefined = frame; f; f = f.parent) {
    out.push(f);
  }
  return out;
}

/**
 * The edges between `from` and `to`, each named by its child reference
 * frame: `up`, from `from` to their nearest common ancestor, and `down`,
 * from `to` to it, each nearest its end first. Throws across trees.
 */
export function routeLegs(
  from: Frame,
  to: Frame,
  instant?: Instant,
): { readonly up: readonly Frame[]; readonly down: readonly Frame[] } {
  const up = chainOf(from);
  const down = chainOf(to);
  const meet = up.find((f) => down.includes(f));
  if (meet === undefined) {
    throw new Error(
      `pointAccuracy: no common ancestor of "${from.name}" and "${to.name}"`,
    );
  }
  const leg = (edges: Frame[]): Frame[] =>
    instant === undefined ? edges : edges.flatMap((e) => expand(e, instant, 0));
  return {
    up: leg(up.slice(0, up.indexOf(meet))),
    down: leg(down.slice(0, down.indexOf(meet))),
  };
}

/**
 * An edge as the edges it stands for at `instant`: a piecewise reference
 * frame's is its piece's route up to the hub, preceded, for a simulated
 * piece, by the piecewise edge itself (which says so).
 */
function expand(edge: Frame, instant: Instant, depth: number): Frame[] {
  if (!(edge instanceof PiecewiseFrame) || depth > 8) {
    return [edge];
  }
  const piece = edge.pieceAt(instant);
  if (piece === undefined) {
    return [edge];
  }
  const own: Frame[] = [];
  for (
    let f: Frame | undefined = piece.frame;
    f && f !== edge.hub;
    f = f.parent
  ) {
    own.push(...expand(f, instant, depth + 1));
  }
  return piece.simulated === true ? [edge, ...own] : own;
}

/** A figure's size read as 1σ, or why it can't be. */
function sigmaOf(
  value: number,
  unit: "m" | "rad",
  f: Pick<AccuracyFigure, "confidence" | "distribution">,
): { value: number; converted?: string } | { refused: string } {
  const confidence = f.confidence ?? "1σ";
  if (confidence === "1σ") {
    return { value };
  }
  let factor: number;
  let how: string;
  if (confidence === "95%" && f.distribution === "normal") {
    factor = unit === "m" ? Math.sqrt(3) / BALL_95 : 1 / LINE_95;
    how = "95% (normal)";
  } else if (confidence === "max" && f.distribution === "uniform") {
    factor = unit === "m" ? Math.sqrt(3 / 5) : 1 / Math.sqrt(3);
    how = "maximum (uniform)";
  } else {
    return {
      refused: `a ${confidence === "95%" ? "95%" : "maximum"} figure needs a distribution (${confidence === "95%" ? '"normal"' : '"uniform"'}) to be read as 1σ; it has ${f.distribution === undefined ? "none" : `"${f.distribution}"`}`,
    };
  }
  return {
    value: value * factor,
    converted: `${how} read as 1σ: × ${factor.toPrecision(4)}`,
  };
}

/** A figure's expanded contributions on an edge. */
interface Contribution {
  readonly term: PointAccuracyTerm;
  /** The covariance in the result's axes (undefined when none is known, e.g. a failed rotation). */
  readonly c: Float64Array | undefined;
  readonly sign: 1 | -1;
  readonly source: SharedSource | undefined;
  readonly edge: string;
  /** Not the plain first-order kind (see `BEYOND`). */
  readonly beyond: boolean;
}

/** One leg of a route: its edges, the point whose levers they use, and its sign in the result. */
interface Leg {
  readonly edges: readonly Frame[];
  readonly point: FramePoint;
  readonly sign: 1 | -1;
}

const identityRotation = Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]);

function compose(
  legs: readonly Leg[],
  axes: Frame,
  at: Instant,
  options: PointAccuracyOptions,
  lead: readonly PointAccuracyTerm[],
): PointAccuracy {
  const terms: PointAccuracyTerm[] = [...lead];
  const contributions: Contribution[] = [];
  let unboundedBy: string | undefined;
  const refusal: { by?: string } = {};
  let simulatedBy: string | undefined;
  let reliable = true;
  const rotations = new Map<Frame, Float64Array>();
  const rotation = (edge: Frame): Float64Array => {
    let r = rotations.get(edge);
    if (r === undefined) {
      try {
        r = Float64Array.from(rotationPart(frameTransform(edge, axes, at)));
      } catch {
        // A route whose rotation can't be taken (not rigid): the traces stay
        // right, the directions are not known.
        reliable = false;
        r = identityRotation;
      }
      rotations.set(edge, r);
    }
    return r;
  };
  const rotate = (r: Float64Array, v: ArrayLike<number>): number[] => [
    r[0]! * v[0]! + r[1]! * v[1]! + r[2]! * v[2]!,
    r[3]! * v[0]! + r[4]! * v[1]! + r[5]! * v[2]!,
    r[6]! * v[0]! + r[7]! * v[1]! + r[8]! * v[2]!,
  ];

  for (const leg of legs) {
    const start = framePoint(leg.point.frame, leg.point.position, at);
    for (const edge of leg.edges) {
      const a = edge.accuracy(at);
      const frame = edge.name;
      const push = (c: Contribution): void => {
        contributions.push(c);
        terms.push(c.term);
      };
      if (a.byDefinition === true) {
        terms.push({ frame, kind: "exact", meters: 0, note: a.note });
        continue;
      }
      if (a.simulated === true) {
        terms.push({ frame, kind: "simulated", note: a.note });
        simulatedBy ??= frame;
        continue;
      }
      if (isUnstated(a)) {
        terms.push({ frame, kind: "unstated", note: a.note });
        unboundedBy ??= frame;
        continue;
      }
      const figures: AccuracyFigure[] = [];
      if (
        a.meters !== undefined ||
        a.radians !== undefined ||
        a.covariance !== undefined
      ) {
        figures.push(a);
      }
      figures.push(...(a.parts ?? []));
      for (const f of figures) {
        const note = f.note ?? a.note;
        const flags = (converted?: string): TermFlags => ({
          ...(f.confidence !== undefined &&
            f.confidence !== "1σ" && {
              confidence: f.confidence,
            }),
          ...(converted !== undefined && { converted }),
          ...(f.source !== undefined && { source: f.source }),
          ...(f.term !== undefined && { term: f.term }),
          ...(f.predicted === true && { predicted: true }),
          ...(f.estimated === true && { estimated: true }),
        });
        const refuse = (reason: string): void => {
          terms.push({
            frame,
            kind: "refused",
            note: `${reason} (${note})`,
          });
          refusal.by ??= frame;
        };
        const beyondFlags = (extra: boolean) =>
          extra || f.source !== undefined || f.confidence !== undefined;
        if (f.covariance !== undefined) {
          const c = rotateCovariance(
            f.covariance,
            rotation(edge),
            new Float64Array(9),
          );
          push({
            term: {
              frame,
              kind: "meters",
              meters: Math.sqrt(trace(f.covariance)),
              note,
              ...flags(),
            },
            c,
            sign: leg.sign,
            source: f.source,
            edge: frame,
            beyond: true,
          });
        } else if (f.meters !== undefined) {
          const s = sigmaOf(f.meters, "m", f);
          if ("refused" in s) {
            refuse(s.refused);
          } else {
            const k = (s.value * s.value) / 3;
            push({
              term: {
                frame,
                kind: "meters",
                meters: s.value,
                note,
                ...flags(s.converted),
              },
              c: Float64Array.from([k, 0, 0, 0, k, 0, 0, 0, k]),
              sign: leg.sign,
              source: f.source,
              edge: frame,
              beyond: beyondFlags(s.converted !== undefined),
            });
          }
        }
        if (f.radians !== undefined) {
          const s = sigmaOf(f.radians, "rad", f);
          if ("refused" in s) {
            refuse(s.refused);
            continue;
          }
          const r = convertPoint(start, edge, at).position;
          const sigma = s.value;
          let lever: number;
          let c: Float64Array;
          if (f.axis !== undefined) {
            const [ax, ay, az] = f.axis;
            const cross = [
              ay * r[2]! - az * r[1]!,
              az * r[0]! - ax * r[2]!,
              ax * r[1]! - ay * r[0]!,
            ];
            lever = Math.hypot(cross[0]!, cross[1]!, cross[2]!);
            const v = rotate(rotation(edge), cross);
            c = Float64Array.from(
              [
                v[0]! * v[0]!,
                v[0]! * v[1]!,
                v[0]! * v[2]!,
                v[1]! * v[0]!,
                v[1]! * v[1]!,
                v[1]! * v[2]!,
                v[2]! * v[0]!,
                v[2]! * v[1]!,
                v[2]! * v[2]!,
              ].map((x) => x * sigma * sigma),
            );
          } else {
            lever = Math.hypot(r[0]!, r[1]!, r[2]!);
            const u =
              lever > 0
                ? rotate(rotation(edge), r).map((x) => x / lever)
                : [0, 0, 0];
            const k = (sigma * sigma * lever * lever) / 2;
            c = Float64Array.from([
              k * (1 - u[0]! * u[0]!),
              -k * u[0]! * u[1]!,
              -k * u[0]! * u[2]!,
              -k * u[1]! * u[0]!,
              k * (1 - u[1]! * u[1]!),
              -k * u[1]! * u[2]!,
              -k * u[2]! * u[0]!,
              -k * u[2]! * u[1]!,
              k * (1 - u[2]! * u[2]!),
            ]);
          }
          push({
            term: {
              frame,
              kind: "angular",
              meters: sigma * lever,
              radians: sigma,
              lever,
              ...(f.axis !== undefined && { axis: f.axis }),
              note,
              ...flags(s.converted),
            },
            c,
            sign: leg.sign,
            source: f.source,
            edge: frame,
            beyond: beyondFlags(
              s.converted !== undefined || f.axis !== undefined,
            ),
          });
        }
      }
    }
  }

  // Route terms: on no edge, independent of the edges.
  for (const rt of options.routeTerms ?? []) {
    let meters: number | undefined = rt.meters;
    let converted: string | undefined;
    if (meters !== undefined) {
      const s = sigmaOf(meters, "m", rt);
      if ("refused" in s) {
        terms.push({
          frame: rt.source,
          kind: "refused",
          note: `${s.refused} (${rt.note})`,
        });
        refusal.by ??= rt.source;
        continue;
      }
      meters = s.value;
      converted = s.converted;
    }
    const flags: TermFlags = {
      ...(rt.confidence !== undefined &&
        rt.confidence !== "1σ" && { confidence: rt.confidence }),
      ...(converted !== undefined && { converted }),
    };
    let c: Float64Array | undefined;
    if (rt.covariance !== undefined) {
      c = Float64Array.from(rt.covariance);
      meters ??= Math.sqrt(trace(c));
    } else if (meters !== undefined) {
      const k = (meters * meters) / 3;
      c = Float64Array.from([k, 0, 0, 0, k, 0, 0, 0, k]);
    }
    terms.push({
      frame: rt.source,
      kind: "route",
      meters,
      note: rt.note,
      ...flags,
    });
    if (meters === undefined) {
      unboundedBy ??= rt.source;
    } else {
      contributions.push({
        term: terms[terms.length - 1]!,
        c,
        sign: 1,
        source: undefined,
        edge: rt.source,
        beyond: rt.covariance !== undefined || converted !== undefined,
      });
    }
  }

  // Combine. Independent figures add; shared sources combine by their rules.
  const total = new Float64Array(9);
  const add = (c: Float64Array | undefined): void => {
    if (c !== undefined) {
      for (let i = 0; i < 9; i++) {
        total[i] = total[i]! + c[i]!;
      }
    }
  };
  const groups = new Map<string, Contribution[]>();
  let anyGroup = false;
  for (const c of contributions) {
    if (c.source === undefined) {
      add(c.c);
    } else {
      anyGroup = true;
      const key = `${c.source.rule}:${c.source.id}`;
      let g = groups.get(key);
      if (g === undefined) {
        g = [];
        groups.set(key, g);
      }
      g.push(c);
    }
  }
  const groupTerms: PointAccuracyTerm[] = [];
  for (const [key, g] of groups) {
    const rule = key.startsWith("linear:") ? "linear" : "difference";
    if (rule === "linear") {
      const s = new Float64Array(9);
      const root = new Float64Array(9);
      for (const c of g) {
        symmetricSqrt(c.c ?? new Float64Array(9), root);
        for (let i = 0; i < 9; i++) {
          s[i] = s[i]! + c.sign * root[i]!;
        }
      }
      const sq = new Float64Array(9);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          for (let k = 0; k < 3; k++) {
            sq[i * 3 + j] = sq[i * 3 + j]! + s[i * 3 + k]! * s[k * 3 + j]!;
          }
        }
      }
      add(sq);
    } else {
      const signs = new Set(g.map((c) => c.sign));
      if (signs.size < 2) {
        const first = g[0]!;
        const why = `its source "${first.source!.id}" bounds a difference between two edges, and this route crosses it on one leg only`;
        groupTerms.push({ frame: first.edge, kind: "refused", note: why });
        refusal.by ??= first.edge;
      } else {
        let best = g[0]!;
        for (const c of g) {
          if (
            trace(c.c ?? new Float64Array(9)) >
            trace(best.c ?? new Float64Array(9))
          ) {
            best = c;
          }
        }
        add(best.c);
      }
    }
  }
  terms.push(...groupTerms);

  const bounded =
    unboundedBy === undefined &&
    refusal.by === undefined &&
    simulatedBy === undefined;
  const confidence = options.confidence ?? "1σ";
  let meters: number | undefined;
  let ellipsoid: PointAccuracy["ellipsoid"];
  let covariance: Float64Array | undefined;
  if (bounded) {
    const sum = anyGroup
      ? Math.sqrt(Math.max(trace(total), 0))
      : Math.hypot(...terms.map((t) => t.meters ?? 0));
    if (reliable) {
      const e = eigenSymmetric(total);
      covariance = total;
      ellipsoid = {
        semiAxes: Float64Array.from(e.values, (v) => Math.sqrt(Math.max(v, 0))),
        axes: e.vectors,
      };
      meters = confidence === "95%" ? BALL_95 * ellipsoid.semiAxes[0]! : sum;
    } else {
      meters = confidence === "95%" ? BALL_95 * sum : sum;
    }
  }
  const beyond =
    anyGroup || contributions.some((c) => c.beyond) || groupTerms.length > 0;
  return {
    meters,
    confidence,
    terms,
    ...(covariance !== undefined && { covariance }),
    ...(ellipsoid !== undefined && { ellipsoid }),
    ...(unboundedBy !== undefined && { unboundedBy }),
    ...(refusal.by !== undefined && { refusedBy: refusal.by }),
    ...(simulatedBy !== undefined && { simulatedBy }),
    combination: beyond ? BEYOND : COMBINATION,
  };
}

/**
 * How accurately `point`'s position is known once it is carried into frame
 * `to`, from the accuracy each edge on the route states (`Frame`'s
 * `accuracy` option).
 *
 * - An edge's `meters` moves the point by that much, as a covariance of
 *   m²/3 in every axis.
 * - An edge's `radians` turns the point about that edge's own frame origin,
 *   or about its `axis`: it moves by `radians × lever`, the point's distance
 *   from the origin (an upper bound when no axis is named) or from the axis.
 * - A figure at 95% or a hard maximum is read as 1σ by its stated
 *   distribution, and says so; with none it is refused, naming the edge.
 * - Figures of one shared source combine by its rule.
 * - An edge exact by definition adds nothing, and says so.
 * - The total is the root of the trace of the composed 1σ covariance, which
 *   for independent figures is the root-sum-square; at `confidence` `"95%"`
 *   it is 2.7955 times the longest semi-axis of the error ellipsoid.
 * - An edge whose accuracy is not stated gives an `unstated` term, makes
 *   the total unbounded (`meters` undefined) and is named in `unboundedBy`;
 *   it is never dropped. A simulated edge makes no claim and names itself.
 *
 * The instant defaults to the point's own (as `convertPoint`).
 */
export function pointAccuracy(
  point: FramePoint,
  to: Frame,
  instant?: Instant,
  options: PointAccuracyOptions = {},
): PointAccuracy {
  const at = instant ?? point.instant;
  if (!at) {
    throw new Error(
      "pointAccuracy: no instant, on the point or as an argument",
    );
  }
  const { up, down } = routeLegs(point.frame, to, at);
  return compose(
    [
      { edges: up, point, sign: 1 },
      { edges: [...down].reverse(), point, sign: -1 },
    ],
    to,
    at,
    options,
    [],
  );
}

/**
 * The accuracy of `b − a`, composed over both legs of the route through
 * their lowest common ancestor, each leg's levers at its own end, in
 * `options.axes`' axes (default that ancestor's). A shared source's
 * linear figures on opposite legs subtract. The instant defaults to the
 * points' own.
 */
export function separationAccuracy(
  a: FramePoint,
  b: FramePoint,
  instant?: Instant,
  options: PointAccuracyOptions & { readonly axes?: Frame } = {},
): PointAccuracy {
  const at = instant ?? a.instant ?? b.instant;
  if (!at) {
    throw new Error(
      "separationAccuracy: no instant, on a point or as an argument",
    );
  }
  const { up, down } = routeLegs(a.frame, b.frame, at);
  // Where the legs meet, whatever edges the legs expand to.
  const raw = routeLegs(a.frame, b.frame).up;
  const meet = (raw.length > 0 ? raw.at(-1)!.parent : a.frame)!;
  return compose(
    [
      { edges: up, point: a, sign: -1 },
      { edges: [...down].reverse(), point: b, sign: 1 },
    ],
    options.axes ?? meet,
    at,
    options,
    [],
  );
}

/** The term that adds the most, if any adds anything (ties: the first). */
export function dominantTerm(
  a: Pick<PointAccuracy, "terms">,
): PointAccuracyTerm | undefined {
  let best: PointAccuracyTerm | undefined;
  for (const t of a.terms) {
    if (t.meters !== undefined && t.meters > 0) {
      if (best === undefined || t.meters > (best.meters ?? 0)) {
        best = t;
      }
    }
  }
  return best;
}
