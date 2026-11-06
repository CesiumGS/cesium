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
//   same full clothoid entered at the arc length where κ = κ0. Its absolute
//   error is about 1e-16·√(πL/|Δκ|) plus the error of the phase
//   κ0²/(2c)·1e-16 times the length: well under 1e-9 for any spiral whose
//   curvature change |Δκ| is above ~1e-7 per unit over a few hundred units;
//   a spiral much closer to a constant curvature than that is better given
//   as an arc.
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
    // The point's own float64 rounding (up to half an ulp of its E and N,
    // ~1e-16·|E|) is more than 1e-12 of an element's length at state-plane
    // magnitudes (E ~ 1e6–1e7, ulp ~1e-9), so a point at a join or at the
    // end station may round to just past it. The windows at the elements'
    // ends, and the tie between equal distances, allow for it.
    const slack = 2 * Number.EPSILON * Math.max(Math.abs(e), Math.abs(n));
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
  if (kind === "spiral") {
    scale = Math.sqrt(Math.PI / Math.abs(c));
    tau0 = a / c / scale;
    sign = Math.sign(c);
    [c0, s0] = fresnel(tau0);
    const phase = -(a * a) / (2 * c);
    rotRe = Math.cos(phase);
    rotIm = Math.sin(phase);
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

/**
 * Newton on arc length for f(s) = (P − X(s))·T(s) = 0, with
 * f'(s) = −1 + κ(s)·(P − X(s))·N_left(s), from three starts (the projection
 * on the chord and both ends); converged to 1e-12 in arc length (or a few
 * ulps of the element's length if that is coarser).
 */
function spiralFeet(element: Placed, px: number, py: number): number[] {
  const L = element.length;
  const tolerance = Math.max(1e-12, 8 * Number.EPSILON * L);
  const [ex, ey] = local(element, L);
  const chordX = ex * element.tx - ey * element.ty;
  const chordY = ex * element.ty + ey * element.tx;
  const along =
    ((px - element.x) * chordX + (py - element.y) * chordY) /
    Math.hypot(chordX, chordY);
  const found: number[] = [];
  for (const start of [Math.min(L, Math.max(0, along)), 0, L]) {
    let s = start;
    let converged = false;
    for (let iteration = 0; iteration < 60; iteration++) {
      const [lx, ly] = local(element, s);
      const x = element.x + (lx * element.tx - ly * element.ty);
      const y = element.y + (lx * element.ty + ly * element.tx);
      const azimuth = element.azimuth - turn(element, s);
      const sin = Math.sin(azimuth);
      const cos = Math.cos(azimuth);
      const dx = px - x;
      const dy = py - y;
      const f = dx * sin + dy * cos;
      const kappa = element.k0 + element.c * s;
      const slope = 1 - kappa * (-dx * cos + dy * sin);
      if (Math.abs(slope) < 1e-12) {
        break;
      }
      const step = f / slope;
      s += step;
      if (!(Math.abs(s - L / 2) < 1.5 * L)) {
        break; // wandered far outside the element: no foot near it
      }
      if (Math.abs(step) <= tolerance) {
        converged = true;
        break;
      }
    }
    if (converged && !found.some((other) => Math.abs(other - s) < 1e-9)) {
      found.push(s);
    }
  }
  return found;
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
