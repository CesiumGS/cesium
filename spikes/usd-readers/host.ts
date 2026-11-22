// What a USD reader costs its host page (CS-900): the bytes it ships (raw,
// gzip and Brotli), and what the page must allow for it to run, read from
// the files themselves. Node only (zlib). Spike code for CS-900; not part of
// @cesium/next.

import { brotliCompressSync, constants, gzipSync } from "node:zlib";

export interface Sizes {
  raw: number;
  gzip: number;
  brotli: number;
}

/** One file's sizes: gzip at level 9, Brotli at quality 11, as a static host would precompress. */
export function sizesOf(bytes: Uint8Array): Sizes {
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
      },
    }).length,
  };
}

/** The sizes of every file a reader ships, and their total. */
export function shippedSizes(files: Readonly<Record<string, Uint8Array>>): {
  files: Record<string, Sizes>;
  total: Sizes;
} {
  const out: Record<string, Sizes> = {};
  const total: Sizes = { raw: 0, gzip: 0, brotli: 0 };
  for (const [name, bytes] of Object.entries(files)) {
    const s = sizesOf(bytes);
    out[name] = s;
    total.raw += s.raw;
    total.gzip += s.gzip;
    total.brotli += s.brotli;
  }
  return { files: out, total };
}

/** What the host page must allow, with the evidence for each. */
export interface HostRequirements {
  /** Threads: SharedArrayBuffer, so the page must be cross-origin isolated (COOP and COEP). */
  crossOriginIsolation: boolean;
  /** WebAssembly under a strict CSP needs `wasm-unsafe-eval` in script-src. */
  wasmUnsafeEval: boolean;
  /** Code built from strings (`new Function`, `eval`) needs `unsafe-eval`. */
  unsafeEval: boolean;
  evidence: string[];
}

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d];

const isWasm = (bytes: Uint8Array): boolean =>
  WASM_MAGIC.every((b, i) => bytes[i] === b);

/** A WebAssembly module's imports include a shared memory (threads). */
function importsSharedMemory(bytes: Uint8Array): boolean {
  // Walk the sections to the import section (id 2) and read each import's
  // kind; a memory import (kind 2) with the shared flag (limits flag & 2).
  let at = 8;
  const leb = (): number => {
    let result = 0;
    let shift = 0;
    for (;;) {
      const b = bytes[at++]!;
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) {
        return result >>> 0;
      }
      shift += 7;
    }
  };
  while (at < bytes.length) {
    const id = bytes[at++]!;
    const size = leb();
    const end = at + size;
    if (id === 2) {
      const n = leb();
      for (let i = 0; i < n; i++) {
        // Read each length before moving past it: `at += leb()` would read
        // `at` before leb() advances it.
        const moduleName = leb();
        at += moduleName;
        const fieldName = leb();
        at += fieldName;
        const kind = bytes[at++]!;
        if (kind === 0) {
          leb(); // function type index
        } else if (kind === 1) {
          at++; // reference type
          const flags = leb();
          leb();
          if (flags & 1) {
            leb();
          }
        } else if (kind === 2) {
          const flags = leb();
          leb();
          if (flags & 1) {
            leb();
          }
          if (flags & 2) {
            return true;
          }
        } else if (kind === 3) {
          at += 2; // value type, mutability
        } else {
          return false;
        }
      }
      return false;
    }
    at = end;
  }
  return false;
}

/**
 * Reads what a reader's files need from the page: shared memory (threads)
 * in a WebAssembly module or its glue, any WebAssembly at all, and code
 * built from strings in its JavaScript.
 */
export function hostRequirements(
  files: Readonly<Record<string, Uint8Array>>,
): HostRequirements {
  const out: HostRequirements = {
    crossOriginIsolation: false,
    wasmUnsafeEval: false,
    unsafeEval: false,
    evidence: [],
  };
  const decoder = new TextDecoder();
  for (const [name, bytes] of Object.entries(files)) {
    if (isWasm(bytes)) {
      out.wasmUnsafeEval = true;
      out.evidence.push(`${name}: a WebAssembly module`);
      if (importsSharedMemory(bytes)) {
        out.crossOriginIsolation = true;
        out.evidence.push(`${name}: imports a shared memory (threads)`);
      }
      continue;
    }
    const text = decoder.decode(bytes);
    const fn = text.match(/new Function\s*\(/g)?.length ?? 0;
    const ev = text.match(/(?<![\w$.])eval\s*\(/g)?.length ?? 0;
    if (fn + ev > 0) {
      out.unsafeEval = true;
      out.evidence.push(
        `${name}: ${fn} \`new Function(\` and ${ev} \`eval(\` in its text`,
      );
    }
    if (/new SharedArrayBuffer|shared:\s*(true|!0)/.test(text)) {
      out.crossOriginIsolation = true;
      out.evidence.push(`${name}: makes a shared memory`);
    }
  }
  return out;
}
