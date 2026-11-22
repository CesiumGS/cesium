// USDZ: a zip archive with no compression, whose first file is the root
// layer. This reads its central directory and hands out each file's bytes
// without copying. Spike code for CS-833 and CS-843; not part of @cesium/next.

export interface UsdzEntry {
  readonly name: string;
  readonly bytes: Uint8Array;
  /** Whether the file's data starts on a 64-byte boundary, as USDZ asks. */
  readonly aligned: boolean;
}

export function isZip(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4
  );
}

export function readUsdz(bytes: Uint8Array): UsdzEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record sits within the last 64 KiB plus 22 bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error("usdz: no end of central directory");
  }
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const out: UsdzEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) {
      throw new Error("usdz: bad central directory");
    }
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    p += 46 + nameLength + extraLength + commentLength;
    if (method !== 0) {
      throw new Error(
        `usdz: ${name} is compressed (method ${method}), which USDZ forbids`,
      );
    }
    const localName = view.getUint16(local + 26, true);
    const localExtra = view.getUint16(local + 28, true);
    const start = local + 30 + localName + localExtra;
    out.push({
      name,
      bytes: bytes.subarray(start, start + size),
      aligned: start % 64 === 0,
    });
  }
  return out;
}
