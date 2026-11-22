export interface PointStar {
  dir: number[];
  mag: number;
  color: number[];
}
export function direction(ra: number, dec: number): [number, number, number];
export class DirectionIndex {
  constructor(dirs: ReadonlyArray<readonly number[]>, radius: number);
  nearest(d: readonly number[]): number;
}
export function fitFluxCurve(
  pairs: ReadonlyArray<{ flux: number; magnitude: number }>,
): ((flux: number) => number) & { faintConstant: number };
export function starColor(bv: number): number[];
export function luminanceOf(c: readonly number[]): number;
export function mergeHybrid(
  catalog: PointStar[],
  mapStars: PointStar[],
  split?: number,
): PointStar[];
export function illuminanceOf(m: number): number;
