// OpenUSD's integer compression (Usd_IntegerCompression and its 64-bit twin),
// as USDC files use it for index tables and integer arrays. The payload is
// TfFastCompression around a delta coding: a common delta, two bits per value
// saying which width its delta has, then the deltas that aren't the common
// one. Spike code for CS-833 and CS-843; not part of @cesium/next.

import { tfFastDecompress } from "./lz4.ts";

/**
 * Refuses a declared count the compressed bytes can't hold, before anything
 * is allocated: each value takes at least two bits of the decoded stream,
 * which LZ4 expands from its input at most about 255 times.
 */
function checkCount(src: Uint8Array, n: number): void {
  if (n > src.length * 1100 + 1024) {
    throw new Error(`ints: ${n} values declared from ${src.length} bytes`);
  }
}

/** Bytes the decoded stream can take for `n` values of `width` bytes, as OpenUSD sizes its buffer. */
function workingSize(n: number, width: 4 | 8): number {
  return width + ((n * 2 + 7) >> 3) + n * width;
}

/** Decodes `n` 32-bit integers (signed) from a compressed buffer. */
export function decodeInts32(src: Uint8Array, n: number): Int32Array {
  checkCount(src, n);
  const out = new Int32Array(n);
  if (n === 0) {
    return out;
  }
  const raw = tfFastDecompress(src, workingSize(n, 4), false);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const common = view.getInt32(0, true);
  const codesStart = 4;
  let v = codesStart + ((n * 2 + 7) >> 3);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const code = (raw[codesStart + (i >> 2)]! >> ((i & 3) * 2)) & 3;
    let delta: number;
    if (code === 0) {
      delta = common;
    } else if (code === 1) {
      delta = view.getInt8(v);
      v += 1;
    } else if (code === 2) {
      delta = view.getInt16(v, true);
      v += 2;
    } else {
      delta = view.getInt32(v, true);
      v += 4;
    }
    prev = (prev + delta) | 0;
    out[i] = prev;
  }
  return out;
}

/** Decodes `n` 64-bit integers (signed) from a compressed buffer, as JavaScript numbers. */
export function decodeInts64(src: Uint8Array, n: number): Float64Array {
  checkCount(src, n);
  const out = new Float64Array(n);
  if (n === 0) {
    return out;
  }
  const raw = tfFastDecompress(src, workingSize(n, 8), false);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const common = view.getBigInt64(0, true);
  const codesStart = 8;
  let v = codesStart + ((n * 2 + 7) >> 3);
  let prev = 0n;
  for (let i = 0; i < n; i++) {
    const code = (raw[codesStart + (i >> 2)]! >> ((i & 3) * 2)) & 3;
    let delta: bigint;
    if (code === 0) {
      delta = common;
    } else if (code === 1) {
      delta = BigInt(view.getInt16(v, true));
      v += 2;
    } else if (code === 2) {
      delta = BigInt(view.getInt32(v, true));
      v += 4;
    } else {
      delta = view.getBigInt64(v, true);
      v += 8;
    }
    prev = BigInt.asIntN(64, prev + delta);
    out[i] = Number(prev);
  }
  return out;
}
