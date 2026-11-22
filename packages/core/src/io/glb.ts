/**
 * A binary glTF's JSON and BIN chunks (or a glTF's JSON alone), with no
 * decoders: what the Moon map's tiles need without the Draco, meshopt and
 * Basis modules `gltfParse.ts` loads.
 */

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function splitGlb(bytes: Uint8Array): { json: Json; bin?: Uint8Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength >= 12 && view.getUint32(0, true) === 0x46546c67) {
    let offset = 12;
    let json: Json;
    let bin: Uint8Array | undefined;
    // The GLB's own length: containers (i3dm) may pad after it.
    const end = Math.min(bytes.byteLength, view.getUint32(8, true));
    while (offset + 8 <= end) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      // A chunk ends with the GLB, whatever its length says.
      const chunk = bytes.subarray(
        offset + 8,
        Math.min(end, offset + 8 + length),
      );
      if (type === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(chunk));
      } else if (type === 0x004e4942) {
        bin = chunk;
      }
      offset += 8 + length;
    }
    return { json, bin };
  }
  return { json: JSON.parse(new TextDecoder().decode(bytes)) };
}
