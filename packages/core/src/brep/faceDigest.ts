// A digest of what a face's preparation for the GPU (gpuPatches.ts
// `prepareFace`) and its bounds (formBounds.ts) read: the face's surface, its
// loops' pcurves, their edges' tolerances and 3D curves. Two faces, in one form
// or in two, with the same digest are prepared and bounded the same (for the
// same origin and tolerances), whatever else of their forms differs, so a
// kernel host that updates a form a little at a time reuses what it made of the
// faces that did not change.
//
// 64 bits, from two multiplicative hashes of the data's 32-bit words: not
// cryptographic, but a chance collision between two faces of one model is
// negligible (about 2⁻⁶⁴ per pair).
import type { BrepForm } from "./form.ts";

const scratch = new Float64Array(1);
const scratchWords = new Uint32Array(scratch.buffer);

class Digest {
  private a = 0x811c9dc5;
  private b = 0x9e3779b9;

  word(w: number): void {
    this.a = Math.imul(this.a ^ w, 0x01000193);
    this.b = Math.imul(this.b ^ (w + 0x7f4a7c15), 0x85ebca6b);
    this.b ^= this.b >>> 15;
  }

  number(x: number): void {
    scratch[0] = x;
    this.word(scratchWords[0]!);
    this.word(scratchWords[1]!);
  }

  /** The doubles of `array[from, to)`. */
  doubles(array: Float64Array, from: number, to: number): void {
    if (array.byteOffset % 4 === 0) {
      const words = new Uint32Array(
        array.buffer,
        array.byteOffset + from * 8,
        (to - from) * 2,
      );
      for (let i = 0; i < words.length; i++) {
        this.word(words[i]!);
      }
      return;
    }
    for (let i = from; i < to; i++) {
      this.number(array[i]!);
    }
  }

  get value(): string {
    return `${(this.a >>> 0).toString(36)}.${(this.b >>> 0).toString(36)}`;
  }
}

const digests = new WeakMap<BrepForm, string[]>();

/** The digest of every face of the form, made once for the form. */
export function faceDigests(form: BrepForm): readonly string[] {
  let all = digests.get(form);
  if (!all) {
    all = Array.from({ length: form.faceSurface.length }, (_, face) =>
      faceDigest(form, face),
    );
    digests.set(form, all);
  }
  return all;
}

/** The digest of one face (see the file). */
export function faceDigest(form: BrepForm, face: number): string {
  const d = new Digest();
  d.word(form.faceReversed[face]!);
  const surface = form.faceSurface[face]!;
  d.word(form.surfaceKind[surface]!);
  d.word(form.surfaceIdentity[surface]!);
  d.number(form.surfaceError[surface]!);
  d.doubles(form.surfaceFrame, surface * 9, surface * 9 + 9);
  d.doubles(form.surfaceParams, surface * 2, surface * 2 + 2);
  const firstPatch = form.surfacePatches[surface * 2]!;
  const patches = form.surfacePatches[surface * 2 + 1]!;
  d.word(patches);
  for (let patch = firstPatch; patch < firstPatch + patches; patch++) {
    const du = form.patchDegree[patch * 2]!;
    const dv = form.patchDegree[patch * 2 + 1]!;
    d.word(du | (dv << 8));
    d.doubles(form.patchDomain, patch * 4, patch * 4 + 4);
    const first = form.patchFirst[patch]!;
    d.doubles(form.patchPoints, first * 4, (first + (du + 1) * (dv + 1)) * 4);
  }
  const firstLoop = form.faceLoops[face * 2]!;
  const loops = form.faceLoops[face * 2 + 1]!;
  d.word(loops);
  const c = form.curves2;
  for (let loop = firstLoop; loop < firstLoop + loops; loop++) {
    const firstUse = form.loopUses[loop * 2]!;
    const uses = form.loopUses[loop * 2 + 1]!;
    d.word(uses);
    for (let use = firstUse; use < firstUse + uses; use++) {
      const edge = form.useEdge[use]!;
      d.number(form.edgeTolerance[edge]!);
      d.word(form.useReversed[use]!);
      const firstCurve = form.edgeCurve[edge * 2]!;
      const curves = form.edgeCurve[edge * 2 + 1]!;
      d.word(curves);
      for (let segment = firstCurve; segment < firstCurve + curves; segment++) {
        const degree = form.curves3.degree[segment]!;
        d.word(degree);
        const at = form.curves3.first[segment]!;
        d.doubles(form.curves3.points, at * 4, (at + degree + 1) * 4);
      }
      const first = form.usePcurve[use * 2]!;
      const count = form.usePcurve[use * 2 + 1]!;
      d.word(count);
      for (let segment = first; segment < first + count; segment++) {
        const degree = c.degree[segment]!;
        d.word(degree);
        const at = c.first[segment]!;
        d.doubles(c.points, at * 3, (at + degree + 1) * 3);
      }
    }
  }
  return d.value;
}
