// SMLib's b-reps as the engine's render form (overall plan §13.33): the
// conversion the CSG sample and `fromUsd` share. SMLib itself is a separate
// WebAssembly module (scripts/smlibTools.mjs builds it; the dev server serves
// it at /smlib/), loaded only by whoever asks for it: nothing in the engine
// imports it. Its bindings (scripts/smlib/bindings.cpp) write a brep as one
// record of doubles, and `readSmlibExport` builds the form from it with
// `BrepBuilder`. Every surface and curve arrives as a NURBS, as SMLib holds
// it, so every face is a Bézier surface here: SMLib's analytic surfaces are
// B-splines whose parameterization isn't the form's analytic one. Those
// surfaces also arrive with their analytic identity (kind, frame, radii),
// which the form keeps beside the patches.
import { BrepBuilder, type SurfaceIdentity } from "./build.ts";
import { SurfaceKind, type BrepForm } from "./form.ts";
import { windLoop, type CurveUse } from "./loops.ts";
import {
  reverseNurbsCurve,
  trimNurbsCurve,
  type NurbsCurve,
  type NurbsSurface,
} from "./nurbs.ts";

/** The layout version the reader knows (bindings.cpp's kExportVersion). */
const EXPORT_VERSION = 2;

/** A b-rep from SMLib, as the form and what the kernel said about its faces. */
export interface SmlibBrep {
  readonly form: BrepForm;
  /**
   * Per face of the form: the tag `SmlibKernel.tag` gave the input face it
   * came from, carried through booleans by SMLib's attributes; -1 for none.
   */
  readonly faceTags: Int32Array;
  /** Per face: 1 when SMLib couldn't say which side is outside (not a solid). */
  readonly faceSideUnknown: Uint8Array;
  /** The largest gap from approximating an edge curve that wasn't a B-spline, m; 0 if none. */
  readonly approximationGap: number;
}

/** Reads numbers off a record in order. */
class Cursor {
  private at = 0;
  constructor(private readonly data: Float64Array) {}
  next(): number {
    if (this.at >= this.data.length) {
      throw new Error("readSmlibExport: the record ends early");
    }
    return this.data[this.at++]!;
  }
  int(): number {
    const value = this.next();
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`readSmlibExport: ${value} is not a count or an index`);
    }
    return value;
  }
  take(count: number): Float64Array {
    if (this.at + count > this.data.length) {
      throw new Error("readSmlibExport: the record ends early");
    }
    const out = this.data.slice(this.at, this.at + count);
    this.at += count;
    return out;
  }
  get done(): boolean {
    return this.at === this.data.length;
  }
}

/** A NURBS curve: degree, count, knot count, knots, count × (dimension + 1). */
function readCurve(cursor: Cursor, dimension: 2 | 3): NurbsCurve {
  const degree = cursor.int();
  const count = cursor.int();
  const knots = cursor.take(cursor.int());
  const raw = cursor.take(count * (dimension + 1));
  const points = new Float64Array(count * dimension);
  const weights = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < dimension; c++) {
      points[i * dimension + c] = raw[i * (dimension + 1) + c]!;
    }
    weights[i] = raw[i * (dimension + 1) + dimension]!;
  }
  return { degree, count, dimension, knots, points, weights };
}

function readSurface(cursor: Cursor): NurbsSurface {
  const degreeU = cursor.int();
  const degreeV = cursor.int();
  const countU = cursor.int();
  const countV = cursor.int();
  const knotsU = cursor.take(cursor.int());
  const knotsV = cursor.take(cursor.int());
  const raw = cursor.take(countU * countV * 4);
  const points = new Float64Array(countU * countV * 3);
  const weights = new Float64Array(countU * countV);
  for (let i = 0; i < countU * countV; i++) {
    points[i * 3] = raw[i * 4]!;
    points[i * 3 + 1] = raw[i * 4 + 1]!;
    points[i * 3 + 2] = raw[i * 4 + 2]!;
    weights[i] = raw[i * 4 + 3]!;
  }
  return { degreeU, degreeV, countU, countV, knotsU, knotsV, points, weights };
}

/**
 * Builds the render form from a record smlib_brep_export wrote (its layout
 * is documented there). Loops are turned to the form's winding, outer loops
 * counter-clockwise in (u, v) and inner ones clockwise; a face is reversed
 * when SMLib says its outside is against its surface's normal. A pole (a
 * loop's use of a vertex where the surface pinches, as on a sphere) becomes
 * a zero-length edge, so the loop still closes in (u, v). Throws for a
 * record it can't read, or a use with no curve in (u, v).
 */
export function readSmlibExport(
  record: Float64Array,
  options?: { version?: number },
): SmlibBrep {
  const cursor = new Cursor(record);
  const version = cursor.next();
  if (version !== EXPORT_VERSION) {
    throw new Error(
      `readSmlibExport: layout version ${version}, expected ${EXPORT_VERSION}`,
    );
  }
  const surfaceCount = cursor.int();
  const vertexCount = cursor.int();
  const edgeCount = cursor.int();
  const faceCount = cursor.int();
  const loopCount = cursor.int();
  const useCount = cursor.int();
  const approximationGap = cursor.next();

  const builder = new BrepBuilder({ version: options?.version });
  const surfaces: number[] = [];
  for (let s = 0; s < surfaceCount; s++) {
    const kind = cursor.int();
    if (kind > SurfaceKind.Bezier) {
      throw new Error(`readSmlibExport: surface ${s} has identity ${kind}`);
    }
    let identity: SurfaceIdentity | undefined;
    if (kind !== SurfaceKind.Bezier) {
      const frame = cursor.take(9);
      identity = {
        kind,
        origin: frame.subarray(0, 3),
        x: frame.subarray(3, 6),
        y: frame.subarray(6, 9),
        params: [cursor.next(), cursor.next()],
      };
    }
    surfaces.push(builder.nurbsSurface(readSurface(cursor), { identity }));
  }

  const vertexTolerance: number[] = [];
  for (let v = 0; v < vertexCount; v++) {
    const position = cursor.take(3);
    const tolerance = cursor.next();
    vertexTolerance.push(tolerance);
    builder.vertex(position, { tolerance });
  }

  for (let e = 0; e < edgeCount; e++) {
    const start = cursor.int();
    const end = cursor.int();
    const t0 = cursor.next();
    const t1 = cursor.next();
    const tolerance = cursor.next();
    const curve = trimNurbsCurve(readCurve(cursor, 3), t0, t1);
    builder.edge(start, end, { curve, tolerance });
  }

  const faces: {
    surface: number;
    outward: number;
    tag: number;
    firstLoop: number;
    loops: number;
  }[] = [];
  for (let f = 0; f < faceCount; f++) {
    faces.push({
      surface: cursor.int(),
      outward: cursor.next(),
      tag: cursor.next(),
      firstLoop: cursor.int(),
      loops: cursor.int(),
    });
  }
  const loops: { first: number; count: number }[] = [];
  for (let l = 0; l < loopCount; l++) {
    loops.push({ first: cursor.int(), count: cursor.int() });
  }

  // Poles become zero-length edges at their vertex, one per use.
  let nextEdge = edgeCount;
  const uses: (CurveUse | undefined)[] = [];
  for (let u = 0; u < useCount; u++) {
    const type = cursor.int();
    const target = cursor.int();
    const same = cursor.next() === 1;
    const hasCurve = cursor.next() === 1;
    const curve = hasCurve ? readCurve(cursor, 2) : undefined;
    if (type !== 0 && type !== 3) {
      uses.push(undefined);
      continue;
    }
    if (!curve) {
      throw new Error(`readSmlibExport: use ${u} has no curve in (u, v)`);
    }
    let edge = target;
    if (type === 3) {
      edge = nextEdge++;
      builder.edge(target, target, { tolerance: vertexTolerance[target] });
    }
    uses.push({
      edge,
      reversed: !same,
      pcurve: same ? curve : reverseNurbsCurve(curve),
    });
  }
  if (!cursor.done) {
    throw new Error("readSmlibExport: the record has more than it describes");
  }

  const faceTags = new Int32Array(faceCount);
  const faceSideUnknown = new Uint8Array(faceCount);
  faces.forEach((face, f) => {
    const faceLoops: ReturnType<typeof windLoop>[] = [];
    for (let l = face.firstLoop; l < face.firstLoop + face.loops; l++) {
      const loop = loops[l]!;
      const list: CurveUse[] = [];
      for (let u = loop.first; u < loop.first + loop.count; u++) {
        const use = uses[u];
        if (use) {
          list.push(use);
        }
      }
      if (list.length > 0) {
        faceLoops.push(windLoop(list, faceLoops.length === 0));
      }
    }
    builder.face(surfaces[face.surface]!, faceLoops, {
      reversed: face.outward === 0,
    });
    faceTags[f] = face.tag;
    faceSideUnknown[f] = face.outward === -1 ? 1 : 0;
  });

  return {
    form: builder.build(),
    faceTags,
    faceSideUnknown,
    approximationGap,
  };
}

/** The functions the SMLib build exports (scripts/smlib/bindings.cpp). */
export interface SmlibModule {
  readonly HEAPF64: Float64Array;
  _smlib_init(): number;
  _smlib_status(): number;
  _smlib_box(
    x: number,
    y: number,
    z: number,
    length: number,
    width: number,
    height: number,
  ): number;
  _smlib_cylinder(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
  ): number;
  _smlib_cone(
    x: number,
    y: number,
    z: number,
    radiusBase: number,
    radiusTop: number,
    height: number,
  ): number;
  _smlib_sphere(x: number, y: number, z: number, radius: number): number;
  _smlib_torus(
    x: number,
    y: number,
    z: number,
    major: number,
    minor: number,
  ): number;
  _smlib_translate(brep: number, dx: number, dy: number, dz: number): number;
  _smlib_boolean(operation: number, a: number, b: number): number;
  _smlib_brep_delete(brep: number): void;
  _smlib_brep_face_count(brep: number): number;
  _smlib_brep_is_manifold_solid(brep: number): number;
  _smlib_brep_volume(brep: number, relativeAccuracy: number): number;
  _smlib_brep_tag_faces(brep: number, tag: number): number;
  _smlib_brep_export(brep: number): number;
  _smlib_export_delete(record: number): void;
  _smlib_export_length(record: number): number;
  _smlib_export_data(record: number): number;
}

/** A boolean's operation. */
export type SmlibBoolean = "union" | "difference" | "intersection";

const BOOLEANS: Record<SmlibBoolean, number> = {
  union: 0,
  difference: 1,
  intersection: 2,
};

/**
 * A solid in SMLib's memory. Free it with `delete`; a boolean consumes its
 * second operand and changes its first in place.
 */
export class SmlibSolid {
  constructor(
    private readonly kernel: SmlibKernel,
    /** The SmBrep pointer, 0 once deleted or consumed. */
    public pointer: number,
  ) {}

  delete(): void {
    if (this.pointer !== 0) {
      this.kernel.module._smlib_brep_delete(this.pointer);
      this.pointer = 0;
    }
  }
}

/**
 * SMLib through its bindings: primitives, translation, booleans, face tags,
 * validity, volume and the render form. One module runs one operation at a
 * time (SMLib's context isn't thread-safe), so a host runs one per worker.
 */
export class SmlibKernel {
  constructor(readonly module: SmlibModule) {
    if (!module._smlib_init()) {
      throw new Error(`SMLib: init failed (${module._smlib_status()})`);
    }
  }

  /** Loads the build at `url` (default the dev server's /smlib/smlib.mjs). */
  static async load(url = "/smlib/smlib.mjs"): Promise<SmlibKernel> {
    const imported = (await import(/* @vite-ignore */ url)) as {
      default: () => Promise<SmlibModule>;
    };
    return new SmlibKernel(await imported.default());
  }

  /** A box from its corner, its sides along x, y and z, m. */
  box(origin: ArrayLike<number>, size: ArrayLike<number>): SmlibSolid {
    return this.made(
      this.module._smlib_box(
        origin[0]!,
        origin[1]!,
        origin[2]!,
        size[0]!,
        size[1]!,
        size[2]!,
      ),
      "box",
    );
  }

  /** A cylinder up z from the centre of its base, m. */
  cylinder(
    base: ArrayLike<number>,
    radius: number,
    height: number,
  ): SmlibSolid {
    return this.made(
      this.module._smlib_cylinder(base[0]!, base[1]!, base[2]!, radius, height),
      "cylinder",
    );
  }

  /** A cone or frustum up z from the centre of its base, m. */
  cone(
    base: ArrayLike<number>,
    radiusBase: number,
    radiusTop: number,
    height: number,
  ): SmlibSolid {
    return this.made(
      this.module._smlib_cone(
        base[0]!,
        base[1]!,
        base[2]!,
        radiusBase,
        radiusTop,
        height,
      ),
      "cone",
    );
  }

  sphere(centre: ArrayLike<number>, radius: number): SmlibSolid {
    return this.made(
      this.module._smlib_sphere(centre[0]!, centre[1]!, centre[2]!, radius),
      "sphere",
    );
  }

  /** A torus about z, m. */
  torus(centre: ArrayLike<number>, major: number, minor: number): SmlibSolid {
    return this.made(
      this.module._smlib_torus(
        centre[0]!,
        centre[1]!,
        centre[2]!,
        major,
        minor,
      ),
      "torus",
    );
  }

  translate(solid: SmlibSolid, offset: ArrayLike<number>): void {
    if (
      !this.module._smlib_translate(
        solid.pointer,
        offset[0]!,
        offset[1]!,
        offset[2]!,
      )
    ) {
      this.fail("translate");
    }
  }

  /**
   * `a` changed in place by `b`; `b` is consumed. On failure both are
   * deleted and it throws.
   */
  boolean(operation: SmlibBoolean, a: SmlibSolid, b: SmlibSolid): SmlibSolid {
    const result = this.module._smlib_boolean(
      BOOLEANS[operation],
      a.pointer,
      b.pointer,
    );
    if (!result) {
      const status = this.module._smlib_status();
      a.delete();
      b.delete();
      throw new Error(`SMLib: ${operation} failed (${status})`);
    }
    b.pointer = 0;
    return a;
  }

  /** Tags every face, so the faces booleans make from them say where they came from. */
  tag(solid: SmlibSolid, tag: number): void {
    if (!this.module._smlib_brep_tag_faces(solid.pointer, tag)) {
      this.fail("tag");
    }
  }

  isManifoldSolid(solid: SmlibSolid): boolean {
    const answer = this.module._smlib_brep_is_manifold_solid(solid.pointer);
    if (answer < 0) {
      this.fail("isManifoldSolid");
    }
    return answer === 1;
  }

  /** The enclosed volume, m³, to the relative accuracy asked. */
  volume(solid: SmlibSolid, relativeAccuracy = 1e-6): number {
    const volume = this.module._smlib_brep_volume(
      solid.pointer,
      relativeAccuracy,
    );
    if (Number.isNaN(volume)) {
      this.fail("volume");
    }
    return volume;
  }

  faceCount(solid: SmlibSolid): number {
    const count = this.module._smlib_brep_face_count(solid.pointer);
    if (count < 0) {
      this.fail("faceCount");
    }
    return count;
  }

  /** The solid as the engine's render form. */
  toForm(solid: SmlibSolid, options?: { version?: number }): SmlibBrep {
    const record = this.module._smlib_brep_export(solid.pointer);
    if (!record) {
      this.fail("export");
    }
    try {
      const length = this.module._smlib_export_length(record);
      const at = this.module._smlib_export_data(record) / 8;
      // A copy: the module's memory may grow and move.
      const data = this.module.HEAPF64.slice(at, at + length);
      return readSmlibExport(data, options);
    } finally {
      this.module._smlib_export_delete(record);
    }
  }

  private made(pointer: number, what: string): SmlibSolid {
    if (!pointer) {
      this.fail(what);
    }
    return new SmlibSolid(this, pointer);
  }

  private fail(what: string): never {
    throw new Error(`SMLib: ${what} failed (${this.module._smlib_status()})`);
  }
}
