// The browser suites' shared half: the rows of one test case, laid out the
// way the kernels read them, and a GPU's answers compared with the float64
// evaluator to the case's stated tolerance (`wgslCases.ts`). The WGSL suite
// (`bench/irWgsl.ts`) and the GLSL ES suite (`bench/irGlsl.ts`) both run it,
// so the two emitters are held to one claim.
//
// Not exported from the entry point: it is test support.

import { evaluate } from "./evaluate.ts";
import { width, type Type, type Value } from "./types.ts";
import type { WgslCase } from "./wgslCases.ts";

/** A value's lanes as numbers (bools as 0 or 1). */
export const lanesOf = (v: Value): number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];

/** One case's result. */
export interface ReadbackRow {
  name: string;
  rows: number;
  compared: number;
  skipped: number;
  tolerance: { abs: number; rel: number };
  /** Largest |gpu - float64| and the largest |gpu - float64| / |float64|. */
  maxAbs: number;
  maxRel: number;
  /** Largest error as a fraction of what the tolerance allows (pass when <= 1). */
  worstRatio: number;
  worst: { row: number; lane: number; gpu: number; cpu: number } | null;
  /** Compile and link errors; the case isn't run when there are any. */
  compileMessages: string[];
  pass: boolean;
}

export function newReadbackRow(c: WgslCase): ReadbackRow {
  return {
    name: c.name,
    rows: c.rows.length,
    compared: 0,
    skipped: 0,
    tolerance: c.tolerance,
    maxAbs: 0,
    maxRel: 0,
    worstRatio: 0,
    worst: null,
    compileMessages: [],
    pass: false,
  };
}

/**
 * The kernel's input, row by row: every non-uniform input's lanes in
 * parameter order (bools and ints as float32). At least one lane, so a
 * program with no such input still has a buffer.
 */
export function packRows(
  c: WgslCase,
  params: readonly { readonly name: string; readonly type: Type }[],
  inStride: number,
): Float32Array {
  const input = new Float32Array(Math.max(inStride * c.rows.length, 1));
  c.rows.forEach((r, i) => {
    let off = i * inStride;
    for (const q of params) {
      input.set(lanesOf(r[q.name]!), off);
      off += width(q.type);
    }
  });
  return input;
}

/** Compare `gpu` (the outputs, row by row) with the float64 evaluator. */
export function compareReadback(
  row: ReadbackRow,
  c: WgslCase,
  outputs: readonly { readonly name: string; readonly type: Type }[],
  outStride: number,
  gpu: Float32Array,
): void {
  c.rows.forEach((r, i) => {
    const expected = evaluate(c.program, { ...r, ...c.uniforms });
    let off = i * outStride;
    for (const o of outputs) {
      const base = off;
      lanesOf(expected[o.name]!).forEach((cpu, lane) => {
        const g = gpu[base + lane]!;
        // NaN and infinity aren't promised on the GPU (see wgsl.ts).
        if (!Number.isFinite(cpu) || Math.abs(cpu) > 3e38) {
          row.skipped++;
          return;
        }
        row.compared++;
        const err = Math.abs(g - cpu);
        const allowed = c.tolerance.abs + c.tolerance.rel * Math.abs(cpu);
        // NaN on the GPU against a finite answer is an error.
        const ratio = Number.isNaN(err)
          ? Infinity
          : allowed === 0
            ? err === 0
              ? 0
              : Infinity
            : err / allowed;
        row.maxAbs = Math.max(row.maxAbs, err);
        if (cpu !== 0) {
          row.maxRel = Math.max(row.maxRel, err / Math.abs(cpu));
        }
        if (ratio > row.worstRatio || row.worst === null) {
          row.worstRatio = Math.max(ratio, row.worstRatio);
          row.worst = { row: i, lane, gpu: g, cpu };
        }
      });
      off += width(o.type);
    }
  });
  row.pass = row.compared > 0 && row.worstRatio <= 1;
}
