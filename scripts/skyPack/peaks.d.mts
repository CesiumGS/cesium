export const PEAK_THRESHOLD: number;
export interface Peak {
  ra: number;
  dec: number;
  flux: number;
  peak: number;
  color?: [number, number, number];
}
export function xOfRa(ra: number, width: number): number;
export function yOfDec(dec: number, height: number): number;
export function findPeaks(
  luminance: Float32Array,
  width: number,
  height: number,
  rgb?: [Float32Array, Float32Array, Float32Array],
): Peak[];
