export function backgroundScale(
  faintConstant: number,
  width: number,
  share?: number,
): number;
export function meanLuminance(
  layer: {
    width: number;
    height: number;
    channels: Record<string, Float32Array>;
  },
  scale: number,
): number;
export function buildBackground(
  layer: {
    width: number;
    height: number;
    channels: Record<string, Float32Array>;
  },
  size: number,
  levels: number,
  scale: number,
): Float32Array[][];
export function floatToHalf(value: number): number;
