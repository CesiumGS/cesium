// LZ4 block decoding, and OpenUSD's TfFastCompression framing around it.
// USDC ("crate") files compress their tokens, fields, paths and specs this
// way. Spike code for CS-833 and CS-843; not part of @cesium/next.

/** Decodes one raw LZ4 block (no frame header) into `out`, returning the bytes written. */
export function lz4DecodeBlock(src: Uint8Array, out: Uint8Array): number {
  let s = 0;
  let d = 0;
  const end = src.length;
  while (s < end) {
    const token = src[s++]!;
    // Literals.
    let literals = token >>> 4;
    if (literals === 15) {
      let b = 255;
      while (b === 255) {
        if (s >= end) {
          throw new Error("lz4: truncated literal length");
        }
        b = src[s++]!;
        literals += b;
      }
    }
    if (s + literals > end || d + literals > out.length) {
      throw new Error("lz4: literal run past the end");
    }
    out.set(src.subarray(s, s + literals), d);
    s += literals;
    d += literals;
    if (s >= end) {
      break;
    } // The last sequence has literals only.
    // Match.
    if (s + 2 > end) {
      throw new Error("lz4: truncated offset");
    }
    const offset = src[s]! | (src[s + 1]! << 8);
    s += 2;
    if (offset === 0 || offset > d) {
      throw new Error("lz4: bad match offset");
    }
    let length = (token & 15) + 4;
    if ((token & 15) === 15) {
      let b = 255;
      while (b === 255) {
        if (s >= end) {
          throw new Error("lz4: truncated match length");
        }
        b = src[s++]!;
        length += b;
      }
    }
    if (d + length > out.length) {
      throw new Error("lz4: match past the end");
    }
    let from = d - offset;
    // Matches may overlap their own output, so copy byte by byte.
    for (let i = 0; i < length; i++) {
      out[d++] = out[from++]!;
    }
  }
  return d;
}

/**
 * TfFastCompression::DecompressFromBuffer: a first byte that counts chunks.
 * Zero means one LZ4 block follows. Otherwise each chunk is an int32 size
 * and a block. Returns the decompressed bytes: exactly `size` of them, or
 * at most `size` when `exact` is false (integer coding's buffers).
 */
export function tfFastDecompress(
  src: Uint8Array,
  size: number,
  exact = true,
): Uint8Array {
  const out = new Uint8Array(size);
  const chunks = src[0] ?? 0;
  if (chunks === 0) {
    const n = lz4DecodeBlock(src.subarray(1), out);
    if (exact && n !== size) {
      throw new Error(`lz4: got ${n} bytes, expected ${size}`);
    }
    return out.subarray(0, n);
  }
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  let s = 1;
  let d = 0;
  for (let i = 0; i < chunks; i++) {
    const chunkSize = view.getInt32(s, true);
    s += 4;
    d += lz4DecodeBlock(src.subarray(s, s + chunkSize), out.subarray(d));
    s += chunkSize;
  }
  if (exact && d !== size) {
    throw new Error(`lz4: got ${d} bytes, expected ${size}`);
  }
  return out.subarray(0, d);
}
