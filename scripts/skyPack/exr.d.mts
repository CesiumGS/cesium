/** A half float's bits as a number. */
export function halfToFloat(bits: number): number;
/** A scanline EXR (half or float; none, ZIPS or ZIP); others are refused. */
export function readExr(bytes: Uint8Array): {
  width: number;
  height: number;
  channels: Record<string, Float32Array>;
};
