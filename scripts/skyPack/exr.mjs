// A reader for scanline OpenEXR images, half or float, uncompressed or ZIP
// (compression 2 and 3, as NASA's star maps use). Anything else is refused,
// naming it. Every size is checked before allocating.
import { inflateSync } from "node:zlib";

const MAX_SIDE = 32768;
/** The most bytes of pixels read (4 channels of 16384 × 8192 floats). */
const MAX_PIXEL_BYTES = 2 ** 31;
const COMPRESSION = [
  "none",
  "RLE",
  "ZIPS",
  "ZIP",
  "PIZ",
  "PXR24",
  "B44",
  "B44A",
  "DWAA",
  "DWAB",
];

/** A half float's bits as a number. */
export function halfToFloat(bits) {
  const e = (bits >> 10) & 0x1f;
  const m = bits & 0x3ff;
  const sign = bits & 0x8000 ? -1 : 1;
  if (e === 0) {
    return sign * m * 2 ** -24;
  }
  if (e === 31) {
    return m ? Number.NaN : sign * Infinity;
  }
  return sign * (1 + m / 1024) * 2 ** (e - 15);
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number, channels: Record<string, Float32Array> }}
 */
export function readExr(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  const need = (n, what) => {
    if (at + n > bytes.length) {
      throw new Error(`EXR: truncated in ${what}`);
    }
  };
  const i32 = () => {
    need(4, "header");
    at += 4;
    return view.getInt32(at - 4, true);
  };
  const str = () => {
    let end = at;
    while (end < bytes.length && bytes[end] !== 0) {
      end++;
    }
    need(end - at + 1, "header");
    const s = new TextDecoder("latin1").decode(bytes.subarray(at, end));
    at = end + 1;
    return s;
  };
  if (bytes.length < 8 || view.getUint32(0, true) !== 0x01312f76) {
    throw new Error("EXR: bad magic");
  }
  const flags = view.getUint32(4, true);
  if (flags & (0x200 | 0x800 | 0x1000)) {
    throw new Error("EXR: tiled, deep and multipart files are refused");
  }
  at = 8;
  /** @type {Array<{name: string, type: number}>} */
  let channelList = [];
  let compression = -1;
  let window = null;
  for (;;) {
    const name = str();
    if (name === "") {
      break;
    }
    str(); // type
    const size = i32();
    if (size < 0) {
      throw new Error("EXR: bad attribute size");
    }
    need(size, name);
    const end = at + size;
    const base = at;
    if (name === "channels") {
      channelList = [];
      while (at < end - 1) {
        const channel = str();
        const type = i32();
        at += 4; // pLinear and reserved
        const xs = i32();
        const ys = i32();
        if (xs !== 1 || ys !== 1) {
          throw new Error("EXR: subsampled channels are refused");
        }
        channelList.push({ name: channel, type });
      }
    } else if (name === "compression") {
      compression = bytes[at];
    } else if (name === "dataWindow") {
      window = [0, 4, 8, 12].map((o) => view.getInt32(base + o, true));
    }
    at = end;
  }
  if (!window || channelList.length === 0 || compression < 0) {
    throw new Error(
      "EXR: the header lacks channels, a data window or compression",
    );
  }
  if (![0, 2, 3].includes(compression)) {
    throw new Error(
      `EXR: compression ${COMPRESSION[compression] ?? compression} is refused (supported: none, ZIPS, ZIP)`,
    );
  }
  const width = window[2] - window[0] + 1;
  const height = window[3] - window[1] + 1;
  if (!(width > 0 && height > 0 && width <= MAX_SIDE && height <= MAX_SIDE)) {
    throw new Error(
      `EXR: ${width} x ${height} is refused (at most ${MAX_SIDE} a side)`,
    );
  }
  for (const c of channelList) {
    if (c.type !== 1 && c.type !== 2) {
      throw new Error("EXR: only half and float channels are read");
    }
  }
  if (width * height * channelList.length * 4 > MAX_PIXEL_BYTES) {
    throw new Error("EXR: the image is too large to read");
  }
  const perBlock = compression === 3 ? 16 : 1;
  const blocks = Math.ceil(height / perBlock);
  need(blocks * 8, "the offset table");
  const offsets = [];
  for (let b = 0; b < blocks; b++) {
    const lo = view.getUint32(at + b * 8, true);
    const hi = view.getUint32(at + b * 8 + 4, true);
    if (hi !== 0) {
      throw new Error("EXR: offsets past 4 GB are refused");
    }
    offsets.push(lo);
  }
  const out = Object.fromEntries(
    channelList.map((c) => [c.name, new Float32Array(width * height)]),
  );
  const rowBytes = channelList.reduce(
    (s, c) => s + width * (c.type === 1 ? 2 : 4),
    0,
  );
  for (let b = 0; b < blocks; b++) {
    const start = offsets[b];
    if (start + 8 > bytes.length) {
      throw new Error("EXR: a block is past the end of the file");
    }
    const y0 = view.getInt32(start, true) - window[1];
    const size = view.getInt32(start + 4, true);
    if (size < 0 || start + 8 + size > bytes.length) {
      throw new Error("EXR: a block is past the end of the file");
    }
    const rows = Math.min(perBlock, height - y0);
    if (y0 < 0 || rows <= 0) {
      throw new Error("EXR: a block has a bad scanline");
    }
    const expected = rows * rowBytes;
    let data = bytes.subarray(start + 8, start + 8 + size);
    if (compression !== 0 && size !== expected) {
      const raw = inflateSync(data, { maxOutputLength: expected });
      if (raw.length !== expected) {
        throw new Error("EXR: a block inflated to the wrong size");
      }
      // Undo the predictor, then the byte reordering.
      for (let i = 1; i < raw.length; i++) {
        raw[i] = (raw[i - 1] + raw[i] - 128) & 255;
      }
      const un = new Uint8Array(expected);
      const half = (expected + 1) >> 1;
      for (let i = 0, k = 0; k < expected; i++) {
        un[k++] = raw[i];
        if (k < expected) {
          un[k++] = raw[half + i];
        }
      }
      data = un;
    } else if (size !== expected) {
      throw new Error("EXR: a block has the wrong size");
    }
    const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let p = 0;
    for (let r = 0; r < rows; r++) {
      for (const c of channelList) {
        const row = out[c.name];
        const base = (y0 + r) * width;
        if (c.type === 1) {
          for (let x = 0; x < width; x++, p += 2) {
            row[base + x] = halfToFloat(d.getUint16(p, true));
          }
        } else {
          for (let x = 0; x < width; x++, p += 4) {
            row[base + x] = d.getFloat32(p, true);
          }
        }
      }
    }
  }
  return { width, height, channels: out };
}
