import {
  framePoint,
  type Frame,
  type Frames,
  type TruePick,
} from "@cesium/next/frames";
import { measure } from "@cesium/next/measure";
import type { Instant } from "@cesium/next/time";
import type { Exaggeration, Geodetic } from "./exaggeration.ts";

/** What a pick tells of a point: its height as it is, and as it is drawn. */
export interface PickReading {
  /** The reference frame the true values are in, and what its heights are above. */
  readonly frame: string;
  readonly heightsAbove: string;
  /** The point (ITRF, m) and its geodetic position: heights are true ones. */
  readonly point: Float64Array;
  readonly true: Geodetic;
  /** The height it is drawn at when read, in the application's frame. */
  readonly drawnHeight: number;
  /** The point is an estimate: the drawn point went back through the route's inverse. */
  readonly provisional: boolean;
}

/**
 * A pick's true point (`truePick`: the content's own point where the pick
 * resolved one, else the drawn point through the route's inverse at the
 * scale it was drawn at), in the Earth's anchor's coordinates, ITRF. Its
 * height is the same at any exaggeration; the drawn height is the factor in
 * force times it.
 */
export function readPick(
  exaggeration: Exaggeration,
  itrf: Frame,
  truth: Pick<TruePick, "position" | "provisional">,
): PickReading {
  const point = Float64Array.from(truth.position);
  return {
    frame: itrf.name,
    heightsAbove: "the WGS84 ellipsoid",
    point,
    true: exaggeration.geodetic(point),
    drawnHeight: exaggeration.geodetic(exaggeration.drawn(point)).height,
    provisional: truth.provisional,
  };
}

/** A measurement between two true points: true values from the measure module, drawn ones beside them. */
export interface MeasurementReading {
  /** The reference frame the measurement is in (`Measurement.deltaFrame`). */
  readonly frame: string;
  /** B's height above the ellipsoid minus A's, m. */
  readonly heightDifference: number;
  /** The straight-line distance, and the distance along the ellipsoid between the two feet, m. */
  readonly distance: number;
  readonly groundDistance: number;
  /** The same two points as drawn: the height difference between them, and the straight distance. */
  readonly drawnHeightDifference: number;
  readonly drawnDistance: number;
}

/**
 * `measure` between two points of ITRF, true coordinates, the way a pick
 * gives them back (`readPick`). Exaggeration never enters it; the drawn
 * values come from the same points put through the map.
 */
export function readMeasurement(
  exaggeration: Exaggeration,
  itrf: Frame,
  frames: Frames,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  instant: Instant,
): MeasurementReading {
  const m = measure(framePoint(itrf, a), framePoint(itrf, b), instant, frames, {
    signal: false,
  });
  if (!m.overBody) {
    throw new Error("measure: the two points are not over one body");
  }
  const da = exaggeration.drawn(a);
  const db = exaggeration.drawn(b);
  return {
    frame: m.deltaFrame.name,
    heightDifference: m.overBody.heightDifference,
    distance: m.distance,
    groundDistance: m.overBody.distance,
    drawnHeightDifference:
      exaggeration.geodetic(db).height - exaggeration.geodetic(da).height,
    drawnDistance: Math.hypot(
      db[0]! - da[0]!,
      db[1]! - da[1]!,
      db[2]! - da[2]!,
    ),
  };
}
