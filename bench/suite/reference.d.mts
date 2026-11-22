// Types for reference.mjs (reference images for a settings sweep, CS-395).
import type { SweepRecord, SweepReference } from "./settings.mjs";

export const PIXEL_THRESHOLD: number;
export const REFERENCE_MOMENT: string;
export const WHOLE: string;

/** A crop in whole pixels; x1 and y1 exclusive. */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** One region's difference from the reference (or between two repeats). */
export interface Difference {
  share: number;
  mean: number;
  flip?: number;
  flipP95?: number;
}
export interface Region {
  name: string;
  box?: [number, number, number, number];
}
export interface NoiseFloor {
  pairs: number;
  regions: Record<string, Required<Difference>>;
}
export interface ReferenceFloor {
  scene: string;
  scenario: string;
  pairs: number;
  reps: number;
  regionNames: string[];
  regions?: Record<string, Required<Difference>>;
}
export interface ReferencePoint {
  scene: string;
  scenario: string;
  config: string;
  image: string;
  reference?: true;
  against?: string;
  regions?: Record<string, Difference>;
  within?: Record<string, boolean | null>;
  heatmap?: string;
}
export interface ReferenceRecord {
  moment: string;
  threshold: number;
  reference: SweepReference;
  floors: ReferenceFloor[];
  points: ReferencePoint[];
  repeats: Array<{
    scene: string;
    scenario: string;
    config: string;
    repeat: number;
    image: string;
  }>;
}
export interface Shot {
  scene: string;
  scenario: string;
  config: string;
  moment?: string;
  repeat?: number;
  png: unknown;
}

export function linearLuminance(r: number, g: number, b: number): number;
export function cropRect(
  crop: readonly number[] | undefined,
  width: number,
  height: number,
): Rect;
export function pixelDifference(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  width: number,
  height: number,
  rect?: Rect,
): { share: number; mean: number; pixels: number };
export function errorStats(
  errors: ArrayLike<number>,
  width: number,
  rect: Rect,
): { mean: number; p95: number };
export function regionsOf(scene: { crop?: Record<string, number[]> } | undefined): Region[];
export function shotName(f: {
  scene: string;
  scenario: string;
  config: string;
  moment: string;
  repeat?: number;
}): string;
export function referenceIndex(
  sweep: Pick<SweepRecord, "axes" | "points" | "reference"> | undefined,
): Array<number | undefined>;
export function noiseFloor(
  pairs: Array<{ regions: Record<string, Difference> }>,
): NoiseFloor | undefined;
export function withinNoise(
  difference: Difference | undefined,
  floor: Difference | undefined,
): boolean | undefined;
export function percent(share: number): string;
export function differenceWords(
  difference: Difference | undefined,
  floor: Difference | undefined,
  options?: { reference?: boolean },
): string;
export function referenceKeys(region: string): {
  share: string;
  mean: string;
  flip: string;
  flipP95: string;
};
export function differenceMetrics(
  regions: Record<string, Difference> | undefined,
): Record<string, number>;
export function compareSweep(options: {
  shots: Shot[];
  sweep: SweepRecord | undefined;
  scenes: Record<string, { crop?: Record<string, number[]> } | undefined>;
  compare: (
    test: unknown,
    ref: unknown,
    regions: Region[],
  ) => Promise<{ regions: Record<string, Difference>; heatmap?: string }>;
  save: (name: string, base64: string, type: "jpeg" | "png") => Promise<string>;
  image: (shot: Shot) => string;
  encode: (shot: Shot) => Promise<string>;
}): Promise<ReferenceRecord | undefined>;
export function referenceCellValues(
  record: ReferenceRecord | undefined,
): Record<string, Record<string, number>>;
