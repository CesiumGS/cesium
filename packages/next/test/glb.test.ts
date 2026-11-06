import { describe, expect, it } from "vitest";
import { splitGlb } from "../src/io/glb.ts";

/**
 * A GLB of a JSON chunk and a BIN chunk of `binLength` bytes whose header
 * claims `claimed`, followed by `trailing` bytes of 0xff outside the GLB
 * (a container's padding, as in an i3dm).
 */
function glb(binLength: number, claimed: number, trailing: number) {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"}}  ');
  const length = 12 + 8 + json.length + 8 + binLength;
  const bytes = new Uint8Array(length + trailing).fill(0xff, length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, length, true);
  view.setUint32(12, json.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(json, 20);
  const bin = 20 + json.length;
  view.setUint32(bin, claimed, true);
  view.setUint32(bin + 4, 0x004e4942, true);
  bytes.fill(7, bin + 8, length);
  return bytes;
}

describe("splitGlb", () => {
  it("splits a GLB's chunks", () => {
    const { json, bin } = splitGlb(glb(16, 16, 0));
    expect(json.asset.version).toBe("2.0");
    expect([...bin!]).toEqual(new Array(16).fill(7));
  });

  it("ends a chunk at the GLB's own length, not its container's", () => {
    // The BIN chunk claims 64 bytes; the GLB holds 16 of them, then its
    // container's padding.
    const { bin } = splitGlb(glb(16, 64, 128));
    expect(bin!.byteLength).toBe(16);
    expect(bin!.every((b) => b === 7)).toBe(true);
  });
});
