// Alignments (plan 4a R8): a horizontal geometry of lines, circular arcs and
// clothoid spirals, and an optional vertical profile of grades and parabolas,
// in design (site-grid) coordinates.
//
// Conventions, stated once:
// - Positions are design E, N in design units; stations and lengths are in
//   the same units.
// - The azimuth α is in radians clockwise from grid north. The direction of
//   travel is T = (sin α, cos α) in (E, N); the left normal is
//   (−cos α, sin α) and the right normal (cos α, −sin α).
// - Curvature κ is signed: positive curves left (counterclockwise seen from
//   above, toward the left normal), negative right. A radius R gives κ = 1/R
//   (±Infinity gives 0). The math heading angle φ = π/2 − α increases at
//   dφ/ds = κ, so the azimuth changes at dα/ds = −κ: a left curve decreases
//   the azimuth.
// - The offset is positive to the right of the direction of travel.
// - `azimuthAt` is continuous along the alignment: it starts at
//   `startAzimuth` and is not reduced to [0, 2π).
//
// Each element is evaluated in its own frame, x along its start tangent and
// y along its start left normal, so that a heading change Δφ(s) turns x
// toward y. Within an element κ(s) = κ0 + c·s with c = (κ1 − κ0)/L, and
// Δφ(s) = κ0·s + c·s²/2:
// - line: (s, 0);
// - arc:  (sin(κs)/κ, 2 sin²(κs/2)/κ);
// - spiral: ∫₀ˢ exp(iΔφ(t)) dt in closed form with Fresnel integrals.
//   Completing the square, Δφ = (c/2)(t + κ0/c)² − κ0²/(2c), and with
//   τ = (t + κ0/c)·√(|c|/π)
//     ∫₀ˢ exp(iΔφ) dt = exp(−iκ0²/(2c)) · √(π/|c|) · [ΔC + i·sgn(c)·ΔS],
//   ΔC and ΔS the differences of C and S between τ(0) and τ(s). For a spiral
//   from a tangent (κ0 = 0) this is the classical a·(C(τ), S(τ)) with
//   a = √(π L R_end) = √π · √(L·R_end) (the brief's scale √(L·R) up to the
//   √π of the normalization ∫cos(πu²/2)). A partial spiral (κ0 ≠ 0) is the
//   same full clothoid entered at the arc length where κ = κ0. The Fresnel
//   difference cancels as the spiral nears a constant curvature: its error
//   is about ε·(√(π/|c|) + L·κ0²/(2|c|)) (6e-9 at R 800 → 800.001 over 200).
//   When that estimate exceeds 1e-11 the element is instead evaluated by
//   composite 10-point Gauss–Legendre quadrature of exp(iΔφ), with panels
//   of at most 0.5 rad of heading (truncation below 1e-20), so every spiral
//   stays exact to float64.
//
// Everything is computed relative to the alignment's start point, so the
// geometry keeps its float64 precision however large the design E and N; only
// the E and N passed in and out carry their own rounding (half an ulp, ~5e-10
// at E = 6e6), which `stationOffset` allows for at joins and ends.
import { fresnel } from "./fresnel.ts";

/** One horizontal element. Lengths and radii are in design units. */
export type HorizontalElement =
  | { readonly kind: "line"; readonly length: number }
  | {
      readonly kind: "arc";
      readonly length: number;
      /** Positive curves left, negative right. */
      readonly radius: number;
    }
  | {
      readonly kind: "spiral";
      readonly length: number;
      /** Positive curves left, negative right; ±Infinity is a tangent end. */
      readonly startRadius: number;
      readonly endRadius: number;
    };

/** A constant-grade segment of a vertical profile (grade = rise/run). */
export interface ProfileGrade {
  readonly kind: "grade";
  readonly length: number;
  readonly grade: number;
}

/** A parabolic vertical curve whose grade changes linearly over its length. */
export interface ProfileParabola {
  readonly kind: "parabola";
  readonly length: number;
  readonly startGrade: number;
  readonly endGrade: number;
}

export type ProfileSegment = ProfileGrade | ProfileParabola;

/** Elevation against station: segments laid end to end from `startStation`. */
export interface VerticalProfile {
  readonly startStation: number;
  readonly startElevation: number;
  readonly segments: readonly ProfileSegment[];
}

export interface AlignmentDefinition {
  readonly name: string;
  /** Design E, N of the start. */
  readonly start: readonly [number, number];
  /** Radians clockwise from grid north. */
  readonly startAzimuth: number;
  readonly startStation: number;
  readonly horizontal: readonly HorizontalElement[];
  readonly vertical?: VerticalProfile;
}

export interface StationOffset {
  readonly station: number;
  /** Positive to the right of the direction of travel. */
  readonly offset: number;
  /** The profile's elevation at `station`, when there is a profile. */
  readonly elevation?: number;
}

/** An element placed on the alignment (positions relative to its start). */
interface Placed {
  /** As evaluated: a spiral of constant curvature is placed as an arc or a line. */
  readonly kind: Kind;
  readonly station: number;
  readonly length: number;
  /** Start point, relative to the alignment's start. */
  readonly x: number;
  readonly y: number;
  /** Start azimuth, and its tangent (tx, ty) and left normal (−ty, tx). */
  readonly azimuth: number;
  readonly tx: number;
  readonly ty: number;
  /** Curvature at the start, and its rate of change. */
  readonly k0: number;
  readonly c: number;
  /** Spiral constants: √(π/|c|), τ(0), sgn(c), C and S at τ(0), exp(−iκ0²/2c). */
  readonly scale: number;
  readonly tau0: number;
  readonly sign: number;
  readonly c0: number;
  readonly s0: number;
  readonly rotRe: number;
  readonly rotIm: number;
  /** Tolerance at the element's ends when accepting a perpendicular foot. */
  readonly eps: number;
  /** max(|κ0|, |κ1|): bounds the heading change per unit of arc length. */
  readonly maxCurvature: number;
  /** A near-constant-curvature spiral, evaluated by quadrature (see the file comment). */
  readonly quadrature: boolean;
}

interface PlacedProfile {
  readonly segment: ProfileSegment;
  readonly station: number;
  readonly elevation: number;
}

type Kind = "line" | "arc" | "spiral";

export class Alignment {
  readonly name: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly length: number;
  private readonly e0: number;
  private readonly n0: number;
  private readonly elements: readonly Placed[];
  private readonly profile: readonly PlacedProfile[] | undefined;
  private readonly profileEnd: number;

  constructor(definition: AlignmentDefinition) {
    const name = definition.name;
    const where = `Alignment "${name}"`;
    const [e0, n0] = definition.start;
    if (
      !Number.isFinite(e0) ||
      !Number.isFinite(n0) ||
      !Number.isFinite(definition.startAzimuth) ||
      !Number.isFinite(definition.startStation)
    ) {
      throw new Error(
        `${where}: start, startAzimuth and startStation must be finite`,
      );
    }
    if (definition.horizontal.length === 0) {
      throw new Error(`${where}: needs at least one horizontal element`);
    }
    this.name = name;
    this.e0 = e0;
    this.n0 = n0;
    this.startStation = definition.startStation;

    const elements: Placed[] = [];
    let x = 0;
    let y = 0;
    let azimuth = definition.startAzimuth;
    let length = 0;
    definition.horizontal.forEach((element, i) => {
      const [k0, k1] = curvatures(
        element,
        `${where}: element ${i} (${element.kind})`,
      );
      const L = element.length;
      const placed = place(
        definition.startStation + length,
        L,
        x,
        y,
        azimuth,
        k0,
        k1,
      );
      elements.push(placed);
      const [dx, dy] = local(placed, L);
      x += dx * placed.tx - dy * placed.ty;
      y += dx * placed.ty + dy * placed.tx;
      azimuth -= k0 * L + (placed.c * L * L) / 2;
      length += L;
    });
    this.elements = elements;
    this.length = length;
    this.endStation = definition.startStation + length;

    const vertical = definition.vertical;
    if (vertical === undefined) {
      this.profile = undefined;
      this.profileEnd = NaN;
    } else {
      const placed: PlacedProfile[] = [];
      if (
        !Number.isFinite(vertical.startStation) ||
        !Number.isFinite(vertical.startElevation)
      ) {
        throw new Error(
          `${where}: the vertical profile's start station and elevation must be finite`,
        );
      }
      if (vertical.segments.length === 0) {
        throw new Error(
          `${where}: the vertical profile needs at least one segment`,
        );
      }
      let station = vertical.startStation;
      let elevation = vertical.startElevation;
      vertical.segments.forEach((segment, i) => {
        const label = `${where}: profile segment ${i} (${segment.kind})`;
        if (!(segment.length > 0) || !Number.isFinite(segment.length)) {
          throw new Error(`${label} needs a finite, positive length`);
        }
        const grades =
          segment.kind === "grade"
            ? [segment.grade]
            : [segment.startGrade, segment.endGrade];
        if (!grades.every(Number.isFinite)) {
          throw new Error(`${label} needs finite grades`);
        }
        placed.push({ segment, station, elevation });
        elevation = segmentElevation(segment, elevation, segment.length);
        station += segment.length;
      });
      this.profile = placed;
      this.profileEnd = station;
    }
  }

  /**
   * Design E, N (and the profile's elevation, if there is a profile) at a
   * station, moved `offset` to the right of the direction of travel. With a
   * profile, a station outside it throws "outside the profile".
   */
  pointAt(station: number, offset = 0): Float64Array {
    const element = this.elementAt(station);
    const s = station - element.station;
    const [x, y] = this.position(element, s);
    const azimuth = element.azimuth - turn(element, s);
    const out = new Float64Array(this.profile === undefined ? 2 : 3);
    out[0] = this.e0 + (x + offset * Math.cos(azimuth));
    out[1] = this.n0 + (y - offset * Math.sin(azimuth));
    if (this.profile !== undefined) {
      out[2] = this.elevationAt(station);
    }
    return out;
  }

  /** The azimuth of the direction of travel at a station (continuous; see the file comment). */
  azimuthAt(station: number): number {
    const element = this.elementAt(station);
    return element.azimuth - turn(element, station - element.station);
  }

  /** The profile's elevation at a station; throws outside the profile. */
  elevationAt(station: number): number {
    const profile = this.profile;
    if (profile === undefined) {
      throw new Error(`Alignment "${this.name}" has no vertical profile`);
    }
    const first = profile[0]!.station;
    if (!(station >= first && station <= this.profileEnd)) {
      throw new Error(
        `Alignment "${this.name}": station ${station} is outside the profile (${first} to ${this.profileEnd})`,
      );
    }
    let i = profile.length - 1;
    while (i > 0 && profile[i]!.station > station) {
      i--;
    }
    const placed = profile[i]!;
    return segmentElevation(
      placed.segment,
      placed.elevation,
      station - placed.station,
    );
  }

  /**
   * Station and offset of a design point (E, N; any third value is ignored):
   * the nearest foot of the perpendicular on the alignment. Ties take the
   * lower station. A point whose nearest foot would lie before the start or
   * after the end throws "outside the alignment"; nothing is extrapolated.
   * With a profile, a station outside it throws "outside the profile".
   */
  stationOffset(point: ArrayLike<number>): StationOffset {
    const e = point[0] ?? NaN;
    const n = point[1] ?? NaN;
    const px = e - this.e0;
    const py = n - this.n0;
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      throw new Error(
        `Alignment "${this.name}": stationOffset needs a finite point`,
      );
    }
    // The point's own float64 rounding is more than 1e-12 of an element's
    // length at state-plane magnitudes (E ~ 1e6–1e7, ulp ~1e-9), so a point
    // at a join or at the end station may round to just past it. Rounding E
    // and N each by at most half an ulp (≤ ε|E|/2, ε|N|/2) moves the point
    // along any direction by at most ε(|E| + |N|)/2; the second term covers
    // the rounding of the geometry relative to the start. The windows at the
    // elements' ends, and the tie between equal distances, allow for it.
    const slack =
      (Number.EPSILON * (Math.abs(e) + Math.abs(n))) / 2 +
      8 * Number.EPSILON * (Math.abs(px) + Math.abs(py));
    const tieOf = (distance: number) =>
      Math.max(1e-12 * Math.max(1, distance), slack);
    let best: { station: number; distance: number; offset: number } | undefined;
    for (const element of this.elements) {
      const window = element.eps + slack;
      for (const s of feet(element, px, py, window)) {
        if (!(s >= -window && s <= element.length + window)) {
          continue;
        }
        const [x, y] = this.position(element, s);
        const azimuth = element.azimuth - turn(element, s);
        const dx = px - x;
        const dy = py - y;
        const distance = Math.hypot(dx, dy);
        const station = element.station + s;
        const tie = tieOf(distance);
        if (
          best === undefined ||
          distance < best.distance - tie ||
          (distance <= best.distance + tie && station < best.station)
        ) {
          best = {
            station,
            distance,
            offset: dx * Math.cos(azimuth) - dy * Math.sin(azimuth),
          };
        }
      }
    }
    // The nearest point of the alignment may be an end, with the point's
    // perpendicular foot beyond it.
    const first = this.elements[0]!;
    const last = this.elements[this.elements.length - 1]!;
    const [ex, ey] = this.position(last, last.length);
    const endAzimuth = last.azimuth - turn(last, last.length);
    const beforeStart = (px - first.x) * first.tx + (py - first.y) * first.ty;
    const afterEnd =
      (px - ex) * Math.sin(endAzimuth) + (py - ey) * Math.cos(endAzimuth);
    const outside = Math.min(
      beforeStart < -(first.eps + slack)
        ? Math.hypot(px - first.x, py - first.y)
        : Infinity,
      afterEnd > last.eps + slack ? Math.hypot(px - ex, py - ey) : Infinity,
    );
    if (best === undefined || outside < best.distance - tieOf(outside)) {
      throw new Error(
        `Alignment "${this.name}": the point (${e}, ${n}) is outside the alignment (its perpendicular foot is not between stations ${this.startStation} and ${this.endStation})`,
      );
    }
    const station = Math.min(
      this.endStation,
      Math.max(this.startStation, best.station),
    );
    return this.profile === undefined
      ? { station, offset: best.offset }
      : { station, offset: best.offset, elevation: this.elevationAt(station) };
  }

  private elementAt(station: number): Placed {
    if (!(station >= this.startStation && station <= this.endStation)) {
      throw new Error(
        `Alignment "${this.name}": station ${station} is outside the alignment (${this.startStation} to ${this.endStation})`,
      );
    }
    // The last element whose start station is at or before `station`.
    const elements = this.elements;
    let lo = 0;
    let hi = elements.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (elements[mid]!.station <= station) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return elements[lo]!;
  }

  /** Position at arc length `s` along an element, relative to the alignment's start. */
  private position(element: Placed, s: number): [number, number] {
    const [dx, dy] = local(element, s);
    return [
      element.x + (dx * element.tx - dy * element.ty),
      element.y + (dx * element.ty + dy * element.tx),
    ];
  }
}

/** Signed start and end curvature of an element, validating it. */
function curvatures(
  element: HorizontalElement,
  label: string,
): [number, number] {
  if (!(element.length > 0) || !Number.isFinite(element.length)) {
    throw new Error(`${label} needs a finite, positive length`);
  }
  switch (element.kind) {
    case "line":
      return [0, 0];
    case "arc":
      if (!Number.isFinite(element.radius) || element.radius === 0) {
        throw new Error(`${label} needs a finite, non-zero radius`);
      }
      return [1 / element.radius, 1 / element.radius];
    case "spiral":
      for (const radius of [element.startRadius, element.endRadius]) {
        if (Number.isNaN(radius) || radius === 0) {
          throw new Error(
            `${label} needs a non-zero start and end radius (±Infinity for a tangent end)`,
          );
        }
      }
      return [1 / element.startRadius, 1 / element.endRadius];
    default:
      throw new Error(`${label}: unknown element kind`);
  }
}

function place(
  station: number,
  length: number,
  x: number,
  y: number,
  azimuth: number,
  k0: number,
  k1: number,
): Placed {
  // 1/±Infinity is ±0; normalize so a tangent is exactly 0.
  const a = k0 === 0 ? 0 : k0;
  const b = k1 === 0 ? 0 : k1;
  const c = (b - a) / length;
  const kind: Kind = c !== 0 ? "spiral" : a !== 0 ? "arc" : "line";
  let scale = 0;
  let tau0 = 0;
  let sign = 0;
  let c0 = 0;
  let s0 = 0;
  let rotRe = 1;
  let rotIm = 0;
  let quadrature = false;
  if (kind === "spiral") {
    scale = Math.sqrt(Math.PI / Math.abs(c));
    tau0 = a / c / scale;
    sign = Math.sign(c);
    [c0, s0] = fresnel(tau0);
    const phase = -(a * a) / (2 * c);
    rotRe = Math.cos(phase);
    rotIm = Math.sin(phase);
    // Error estimate of the Fresnel-difference form (see the file comment).
    quadrature =
      8 * Number.EPSILON * (scale + length * Math.abs(phase)) > 1e-11;
  }
  return {
    kind,
    station,
    length,
    x,
    y,
    azimuth,
    tx: Math.sin(azimuth),
    ty: Math.cos(azimuth),
    k0: a,
    c,
    scale,
    tau0,
    sign,
    c0,
    s0,
    rotRe,
    rotIm,
    eps: 1e-12 * length,
    maxCurvature: Math.max(Math.abs(a), Math.abs(b)),
    quadrature,
  };
}

/** The heading change Δφ(s) = κ0 s + c s²/2 (the azimuth decreases by it). */
function turn(element: Placed, s: number): number {
  return element.k0 * s + (element.c * s * s) / 2;
}

/** Position at arc length s in the element's frame (x along its start tangent, y left). */
function local(element: Placed, s: number): [number, number] {
  switch (element.kind) {
    case "line":
      return [s, 0];
    case "arc": {
      const k = element.k0;
      const half = Math.sin((k * s) / 2);
      return [Math.sin(k * s) / k, (2 * half * half) / k];
    }
    default: {
      if (element.quadrature) {
        return integrateHeading(element, s);
      }
      const [c1, s1] = fresnel(element.tau0 + s / element.scale);
      const dc = element.scale * (c1 - element.c0);
      const ds = element.scale * element.sign * (s1 - element.s0);
      return [
        element.rotRe * dc - element.rotIm * ds,
        element.rotRe * ds + element.rotIm * dc,
      ];
    }
  }
}

/** Arc lengths along an element of the perpendicular feet from (px, py). */
function feet(
  element: Placed,
  px: number,
  py: number,
  window: number,
): number[] {
  const { tx, ty } = element;
  const dx = px - element.x;
  const dy = py - element.y;
  switch (element.kind) {
    case "line":
      return [dx * tx + dy * ty];
    case "arc": {
      const k = element.k0;
      const r = 1 / k;
      // Centre: the start moved r along the left normal (−ty, tx).
      const vx = dx + r * ty;
      const vy = dy - r * tx;
      if (vx === 0 && vy === 0) {
        return [0]; // at the centre every point is equidistant: the lowest station
      }
      // Unit radial from the centre to the start: −sgn(k)·(left normal).
      const sg = Math.sign(k);
      const rx = sg * ty;
      const ry = -sg * tx;
      // Counterclockwise angle from the start radial to the point; s = θ/κ.
      const theta = Math.atan2(rx * vy - ry * vx, rx * vx + ry * vy);
      let s = theta / k;
      if (s < -window) {
        s += (2 * Math.PI) / Math.abs(k);
      }
      return [s];
    }
    default:
      return spiralFeet(element, px, py);
  }
}

// 10-point Gauss–Legendre nodes (positive half) and weights on [−1, 1].
const GL_NODES = [
  0.14887433898163122, 0.43339539412924716, 0.6794095682990244,
  0.8650633666889845, 0.9739065285171717,
];
const GL_WEIGHTS = [
  0.29552422471475304, 0.26926671930999685, 0.21908636251598226,
  0.1494513491505805, 0.06667134430868729,
];

/** ∫₀ˢ exp(iΔφ(t)) dt by composite Gauss–Legendre, panels ≤ 0.5 rad of heading. */
function integrateHeading(element: Placed, s: number): [number, number] {
  const panels = Math.max(
    1,
    Math.ceil((element.maxCurvature * Math.abs(s)) / 0.5),
  );
  const h = s / panels;
  let re = 0;
  let im = 0;
  for (let p = 0; p < panels; p++) {
    const mid = (p + 0.5) * h;
    for (let k = 0; k < GL_NODES.length; k++) {
      const u = (GL_NODES[k]! * h) / 2;
      const w = GL_WEIGHTS[k]!;
      const a = turn(element, mid - u);
      const b = turn(element, mid + u);
      re += w * (Math.cos(a) + Math.cos(b));
      im += w * (Math.sin(a) + Math.sin(b));
    }
  }
  return [(re * h) / 2, (im * h) / 2];
}

/**
 * Perpendicular feet on a spiral: the roots of f(s) = (P − X(s))·T(s), with
 * f'(s) = −1 + κ(s)·(P − X(s))·N_left(s).
 *
 * f is roughly D·sin(ψ − φ(s)) in the heading φ, so on a spiral that turns
 * far its roots can lie anywhere; a few Newton seeds miss them. f is sampled
 * at most 0.25 rad of heading apart, and each sign change is solved by
 * Newton safeguarded with bisection inside its bracket. A foot just past
 * either end (within the join window) has no sign change inside, so Newton
 * also runs from each end. Converged to 1e-12 in arc length (or a few ulps
 * of the element's length if that is coarser).
 */
function spiralFeet(element: Placed, px: number, py: number): number[] {
  const L = element.length;
  const tolerance = Math.max(1e-12, 8 * Number.EPSILON * L);
  const g = (s: number): [number, number] => {
    const [lx, ly] = local(element, s);
    const dx = px - (element.x + (lx * element.tx - ly * element.ty));
    const dy = py - (element.y + (lx * element.ty + ly * element.tx));
    const azimuth = element.azimuth - turn(element, s);
    const sin = Math.sin(azimuth);
    const cos = Math.cos(azimuth);
    const kappa = element.k0 + element.c * s;
    return [dx * sin + dy * cos, -1 + kappa * (dy * sin - dx * cos)];
  };
  const found: number[] = [];
  const add = (s: number) => {
    if (!found.some((other) => Math.abs(other - s) < 1e-9)) {
      found.push(s);
    }
  };
  const samples = Math.max(1, Math.ceil((element.maxCurvature * L) / 0.25));
  let a = 0;
  let fa = g(0)[0];
  if (fa === 0) {
    add(0);
  }
  for (let i = 1; i <= samples; i++) {
    const b = (L * i) / samples;
    const fb = g(b)[0];
    if (fb === 0) {
      add(b);
    } else if (fa !== 0 && fa < 0 !== fb < 0) {
      add(bracketed(g, a, fa, b, tolerance));
    }
    a = b;
    fa = fb;
  }
  for (const start of [0, L]) {
    const s = newton(g, start, L, tolerance);
    if (s !== undefined) {
      add(s);
    }
  }
  return found;
}

/** A root of g in [a, b], where g(a) = fa and g(b) differ in sign. */
function bracketed(
  g: (s: number) => [number, number],
  a: number,
  fa: number,
  b: number,
  tolerance: number,
): number {
  let lo = a;
  let hi = b;
  let flo = fa;
  let s = (a + b) / 2;
  for (let iteration = 0; iteration < 200; iteration++) {
    const [f, derivative] = g(s);
    if (f === 0) {
      return s;
    }
    if (f < 0 === flo < 0) {
      lo = s;
      flo = f;
    } else {
      hi = s;
    }
    const min = Math.min(lo, hi);
    const max = Math.max(lo, hi);
    let next = s - f / derivative;
    if (!(next > min && next < max)) {
      next = (lo + hi) / 2; // Newton left the bracket: bisect
    }
    if (Math.abs(next - s) <= tolerance || max - min <= tolerance) {
      return next;
    }
    s = next;
  }
  return s;
}

/** Plain Newton from `start`; undefined if it stalls or leaves the element's neighbourhood. */
function newton(
  g: (s: number) => [number, number],
  start: number,
  L: number,
  tolerance: number,
): number | undefined {
  let s = start;
  for (let iteration = 0; iteration < 60; iteration++) {
    const [f, derivative] = g(s);
    if (Math.abs(derivative) < 1e-12) {
      return undefined;
    }
    const step = f / derivative;
    s -= step;
    if (!(Math.abs(s - L / 2) < 1.5 * L)) {
      return undefined;
    }
    if (Math.abs(step) <= tolerance) {
      return s;
    }
  }
  return undefined;
}

function segmentElevation(
  segment: ProfileSegment,
  start: number,
  x: number,
): number {
  if (segment.kind === "grade") {
    return start + segment.grade * x;
  }
  return (
    start +
    segment.startGrade * x +
    ((segment.endGrade - segment.startGrade) * x * x) / (2 * segment.length)
  );
}
