// The BENTLEY_brep glTF extension (draft, src/brep/BENTLEY_brep.md): a b-rep
// (src/brep/form.ts) beside a primitive's fallback triangles. The root
// extension lists the b-reps; each typed array is one bufferView of
// little-endian bytes, its type fixed by the schema below. The reader never
// throws: a b-rep that does not read cleanly is skipped, with a warning.
import type { BezierCurves, BrepForm } from "./form.ts";

type ArrayType =
  | Uint8ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

type TypedArray = Uint8Array | Uint32Array | Float32Array | Float64Array;

/** Every typed array of a form, in the form's property order, with its type. A reader takes `surfaceIdentity` and `surfaceError` as optional. */
const ARRAYS: ReadonlyArray<readonly [keyof BrepForm & string, ArrayType]> = [
  ["surfaceKind", Uint8Array],
  ["surfaceIdentity", Uint8Array],
  ["surfaceError", Float32Array],
  ["surfaceFrame", Float64Array],
  ["surfaceParams", Float64Array],
  ["surfacePatches", Uint32Array],
  ["patchDegree", Uint8Array],
  ["patchFirst", Uint32Array],
  ["patchPoints", Float64Array],
  ["patchDomain", Float64Array],
  ["faceSurface", Uint32Array],
  ["faceReversed", Uint8Array],
  ["faceLoops", Uint32Array],
  ["loopUses", Uint32Array],
  ["useEdge", Uint32Array],
  ["useReversed", Uint8Array],
  ["usePcurve", Uint32Array],
  ["edgeVertices", Uint32Array],
  ["edgeCurve", Uint32Array],
  ["edgeTolerance", Float32Array],
  ["vertexPosition", Float64Array],
  ["vertexTolerance", Float32Array],
];

/** The arrays of a curve set, in order. */
const CURVE_ARRAYS: ReadonlyArray<readonly [keyof BezierCurves, ArrayType]> = [
  ["degree", Uint8Array],
  ["first", Uint32Array],
  ["points", Float64Array],
];

/** Padding, bytes, after each array in the writer's chunk. */
const PAD = 8;

/** Thrown inside the reader to skip one b-rep, naming the property. */
class BrepReadError extends Error {}

/**
 * Reads the root extension's b-reps; one that fails to read is skipped, with
 * a warning naming it. The result has one entry per b-rep of the extension,
 * `undefined` for one that was skipped. Each array is a copy, in a buffer of
 * its own, so a caller may transfer it without detaching the glTF's bytes.
 */
export function readBrepExtension(
  json: unknown,
  bufferView: (index: number) => Uint8Array,
  warnings: string[],
): (BrepForm | undefined)[] {
  const list = (json as { extensions?: { BENTLEY_brep?: { breps?: unknown } } })
    ?.extensions?.BENTLEY_brep?.breps;
  if (!Array.isArray(list)) {
    warnings.push("BENTLEY_brep: the root extension has no breps list");
    return [];
  }
  return list.map((entry, index) => {
    try {
      return readOne(entry, bufferView);
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error);
      warnings.push(`BENTLEY_brep: b-rep ${index}: ${why}; dropped`);
      return undefined;
    }
  });
}

function readOne(
  entry: unknown,
  bufferView: (index: number) => Uint8Array,
): BrepForm {
  if (typeof entry !== "object" || entry === null) {
    throw new BrepReadError("not an object");
  }
  const e = entry as Record<string, unknown>;
  const version = e.version;
  if (typeof version !== "number" || !Number.isFinite(version)) {
    throw new BrepReadError("version: not a number");
  }
  const form: Record<string, unknown> = { version };
  for (const [name, type] of ARRAYS) {
    if (e[name] === undefined && name === "surfaceIdentity") {
      form[name] = (form.surfaceKind as Uint8Array).slice();
    } else if (e[name] === undefined && name === "surfaceError") {
      form[name] = new Float32Array((form.surfaceKind as Uint8Array).length);
    } else {
      form[name] = readArray(e[name], name, type, bufferView);
    }
  }
  for (const name of ["curves2", "curves3"] as const) {
    const curves = e[name] as Record<string, unknown> | undefined;
    if (typeof curves !== "object" || curves === null) {
      throw new BrepReadError(`${name}: missing`);
    }
    const out: Record<string, unknown> = {};
    for (const [key, type] of CURVE_ARRAYS) {
      out[key] = readArray(curves[key], `${name}.${key}`, type, bufferView);
    }
    form[name] = out;
  }
  const ids = e.ids as Record<string, unknown> | undefined;
  if (typeof ids !== "object" || ids === null) {
    throw new BrepReadError("ids: missing");
  }
  const values = readArray(ids.values, "ids.values", Uint8Array, bufferView);
  const offsets = readArray(
    ids.offsets,
    "ids.offsets",
    Uint32Array,
    bufferView,
  );
  const f = form as unknown as BrepForm;
  checkCounts(f);
  form.ids = readIds(values, offsets, f);
  return f;
}

/** One array: the bufferView's bytes, as `type`, in memory of its own. */
function readArray<T extends ArrayType>(
  index: unknown,
  name: string,
  type: T,
  bufferView: (index: number) => Uint8Array,
): InstanceType<T> {
  // An empty array has no bufferView, as glTF forbids zero-length ones; the
  // counts check below catches a property missing from a form that needs it.
  if (index === undefined) {
    const Empty = type;
    return new Empty(0) as InstanceType<T>;
  }
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    throw new BrepReadError(`${name}: not a bufferView index`);
  }
  let bytes: Uint8Array;
  try {
    bytes = bufferView(index);
  } catch {
    throw new BrepReadError(`${name}: bufferView ${index} does not exist`);
  }
  if (!(bytes instanceof Uint8Array)) {
    throw new BrepReadError(`${name}: bufferView ${index} does not exist`);
  }
  const size = type.BYTES_PER_ELEMENT;
  if (bytes.byteLength % size !== 0) {
    throw new BrepReadError(
      `${name}: ${bytes.byteLength} bytes is not a whole number of ${size}-byte elements`,
    );
  }
  // A typed array needs its byteOffset to be a multiple of its element size,
  // and a bufferView's bytes can start anywhere in their buffer. Copying
  // always satisfies that, and gives the form buffers it alone owns.
  const copy = bytes.slice().buffer;
  const Typed = type;
  return new Typed(copy) as InstanceType<T>;
}

/** What each array's length must be, from the counts the form implies. */
function checkCounts(f: BrepForm): void {
  const need = (name: string, got: number, want: number, rule: string) => {
    if (got !== want) {
      throw new BrepReadError(`${name}: ${got} elements, expected ${rule}`);
    }
  };
  const multiple = (name: string, got: number, of: number) => {
    if (got % of !== 0) {
      throw new BrepReadError(
        `${name}: ${got} elements is not a multiple of ${of}`,
      );
    }
  };
  const surfaces = f.surfaceKind.length;
  need("surfaceIdentity", f.surfaceIdentity.length, surfaces, "1 per surface");
  need("surfaceError", f.surfaceError.length, surfaces, "1 per surface");
  need("surfaceFrame", f.surfaceFrame.length, 9 * surfaces, "9 per surface");
  need("surfaceParams", f.surfaceParams.length, 2 * surfaces, "2 per surface");
  need(
    "surfacePatches",
    f.surfacePatches.length,
    2 * surfaces,
    "2 per surface",
  );
  multiple("patchDegree", f.patchDegree.length, 2);
  const patches = f.patchDegree.length / 2;
  need("patchFirst", f.patchFirst.length, patches, "1 per patch");
  need("patchDomain", f.patchDomain.length, 4 * patches, "4 per patch");
  multiple("patchPoints", f.patchPoints.length, 4);
  const faces = f.faceSurface.length;
  need("faceReversed", f.faceReversed.length, faces, "1 per face");
  need("faceLoops", f.faceLoops.length, 2 * faces, "2 per face");
  multiple("loopUses", f.loopUses.length, 2);
  const uses = f.useEdge.length;
  need("useReversed", f.useReversed.length, uses, "1 per use");
  need("usePcurve", f.usePcurve.length, 2 * uses, "2 per use");
  multiple("edgeVertices", f.edgeVertices.length, 2);
  const edges = f.edgeVertices.length / 2;
  need("edgeCurve", f.edgeCurve.length, 2 * edges, "2 per edge");
  need("edgeTolerance", f.edgeTolerance.length, edges, "1 per edge");
  multiple("vertexPosition", f.vertexPosition.length, 3);
  const vertices = f.vertexPosition.length / 3;
  need("vertexTolerance", f.vertexTolerance.length, vertices, "1 per vertex");
  for (const [name, curves, stride] of [
    ["curves2", f.curves2, 3],
    ["curves3", f.curves3, 4],
  ] as const) {
    need(
      `${name}.first`,
      curves.first.length,
      curves.degree.length,
      "1 per segment",
    );
    multiple(`${name}.points`, curves.points.length, stride);
  }
}

/** The IDs, as `EXT_structural_metadata` strings: UTF-8 values and offsets. */
function readIds(
  values: Uint8Array,
  offsets: Uint32Array,
  f: BrepForm,
): string[] {
  const count =
    f.faceSurface.length +
    f.edgeVertices.length / 2 +
    f.vertexPosition.length / 3;
  if (offsets.length !== count + 1) {
    throw new BrepReadError(
      `ids.offsets: ${offsets.length} elements, expected ${count + 1} (one more than the IDs)`,
    );
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const from = offsets[i]!;
    const to = offsets[i + 1]!;
    if (from > to || to > values.length) {
      throw new BrepReadError(`ids.offsets: entry ${i} is out of range`);
    }
    try {
      ids.push(decoder.decode(values.subarray(from, to)));
    } catch {
      throw new BrepReadError(`ids.values: entry ${i} is not UTF-8`);
    }
  }
  return ids;
}

/** Every typed array's buffer in a form, for a transfer list. */
export function brepBuffers(form: BrepForm): ArrayBuffer[] {
  const arrays: TypedArray[] = ARRAYS.map(
    ([name]) => form[name] as unknown as TypedArray,
  );
  for (const curves of [form.curves2, form.curves3]) {
    for (const [key] of CURVE_ARRAYS) {
      arrays.push(curves[key]);
    }
  }
  return arrays.map((a) => a.buffer as ArrayBuffer);
}

/**
 * Writes forms as the extension's JSON and one binary chunk, for a GLB writer
 * and the tests. bufferView indices start at `firstBufferView`, with
 * byteOffsets relative to the chunk. Each array is its own bufferView, in the
 * form's property order, and starts on an 8-byte boundary.
 */
export function writeBrepExtension(
  forms: readonly BrepForm[],
  firstBufferView: number,
): { extension: object; bufferViews: object[]; binary: Uint8Array } {
  const bufferViews: object[] = [];
  const chunks: Uint8Array[] = [];
  let length = 0;
  // An empty array gets no bufferView (glTF forbids zero-length ones), and its
  // property is left out; the reader takes a missing one as empty.
  const add = (array: TypedArray | Uint8Array): number | undefined => {
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength,
    );
    if (bytes.length === 0) {
      return undefined;
    }
    bufferViews.push({
      buffer: 0,
      byteOffset: length,
      byteLength: bytes.length,
    });
    chunks.push(bytes);
    length += Math.ceil(bytes.length / PAD) * PAD;
    return firstBufferView + bufferViews.length - 1;
  };
  const breps = forms.map((form) => {
    const out: Record<string, unknown> = { version: form.version };
    for (const [name] of ARRAYS) {
      const view = add(form[name] as unknown as TypedArray);
      if (view !== undefined) {
        out[name] = view;
      }
    }
    for (const name of ["curves2", "curves3"] as const) {
      const curves: Record<string, number> = {};
      for (const [key] of CURVE_ARRAYS) {
        const view = add(form[name][key]);
        if (view !== undefined) {
          curves[key] = view;
        }
      }
      out[name] = curves;
    }
    const encoder = new TextEncoder();
    const encoded = form.ids.map((id) => encoder.encode(id));
    const offsets = new Uint32Array(encoded.length + 1);
    encoded.forEach((bytes, i) => {
      offsets[i + 1] = offsets[i]! + bytes.length;
    });
    const values = new Uint8Array(offsets[encoded.length]!);
    encoded.forEach((bytes, i) => values.set(bytes, offsets[i]!));
    const valuesView = add(values);
    out.ids = {
      ...(valuesView !== undefined ? { values: valuesView } : {}),
      offsets: add(offsets),
    };
    return out;
  });
  const binary = new Uint8Array(length);
  let at = 0;
  for (const bytes of chunks) {
    binary.set(bytes, at);
    at += Math.ceil(bytes.length / PAD) * PAD;
  }
  return { extension: { breps }, bufferViews, binary };
}
