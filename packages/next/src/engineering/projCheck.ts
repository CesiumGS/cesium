// The byte checks PROJ's loaders share (proj.ts in the browser, projNode.ts in
// Node): a file against its pin, and a grid against its catalog entry. Every
// refusal names the file and both hashes (Review Focus 2).
import { sha256Hex } from "../io/sha256.ts";
import type { GridEntry } from "./gridCatalog.ts";

/** Throws unless `bytes` hash to `expected`, naming the file and both hashes. */
export async function verify(
  name: string,
  bytes: ArrayBuffer | Uint8Array,
  expected: string,
): Promise<void> {
  const actual = await sha256Hex(bytes);
  if (actual !== expected) {
    throw new Error(
      `PROJ: ${name} SHA-256 mismatch (expected ${expected}, got ${actual})`,
    );
  }
}

/** Throws unless `bytes` are `entry`'s: its length, then its SHA-256. */
export async function checkGrid(
  entry: GridEntry,
  bytes: Uint8Array,
): Promise<void> {
  if (bytes.byteLength !== entry.bytes) {
    throw new Error(
      `PROJ: ${entry.name} is ${bytes.byteLength} bytes, not the catalog's ${entry.bytes} (SHA-256 expected ${entry.sha256}, got ${await sha256Hex(bytes)})`,
    );
  }
  await verify(entry.name, bytes, entry.sha256);
}
