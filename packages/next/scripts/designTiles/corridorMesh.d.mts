import type { Alignment } from "../../src/engineering/alignment.ts";

/** The most station spacing on a tangent, in design units (30). */
export const TANGENT_SPACING: number;
/** How far the section reaches either side of the centreline (41). */
export const SECTION_REACH: number;
/** A mesh in design coordinates (float64), before it is written as tiles. */
export interface DesignTileMesh {
  design: Float64Array;
  normals: Float32Array;
  indices: Uint32Array;
  featureIds: Uint16Array;
  features: { name: string; kind: string }[];
}
/** "601+20": a station as engineers write it. */
export function stationLabel(station: number): string;
/** The chord error at the middle of [a, b], at the centreline and both edges. */
export function chordError(alignment: Alignment, a: number, b: number): number;
/** The largest chord error of consecutive stations. */
export function largestChordError(
  alignment: Alignment,
  stations: ArrayLike<number>,
): number;
/**
 * Stations from `from` to `to`, within `chordTolerance` on curves and at most
 * TANGENT_SPACING apart on tangents, with every join and the bridge's ends.
 */
export function sampleStations(
  alignment: Alignment,
  from: number,
  to: number,
  chordTolerance: number,
): Float64Array;
/** Every other station, keeping the ends, the joins and the bridge's ends. */
export function decimate(
  alignment: Alignment,
  stations: ArrayLike<number>,
): Float64Array;
/** The corridor between the first and last of `stations`. */
export function corridorMesh(
  alignment: Alignment,
  stations: ArrayLike<number>,
  options?: { tickInterval?: number },
): DesignTileMesh;
export interface CorridorNode {
  id: string;
  level: number;
  from: number;
  to: number;
  stations: Float64Array;
  tickInterval: number;
  children: CorridorNode[];
}
/** The corridor's tile tree: its top tile. */
export function corridorTree(
  alignment: Alignment,
  options: { leafLength: number; chordTolerance: number },
): CorridorNode;
