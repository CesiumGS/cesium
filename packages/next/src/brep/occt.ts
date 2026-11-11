// Open CASCADE's b-reps as the engine's render form (overall plan §13.33):
// the CSG sample's second kernel, beside SMLib (smlib.ts). OCCT is replicad's
// WebAssembly build of OpenCascade.js, LGPL 2.1: a separate module
// (scripts/occtTools.mjs fetches it; the dev server serves it at /occt/),
// loaded only by whoever asks for it. Nothing in the engine imports it.
//
// Unlike SMLib's, OCCT's analytic surfaces keep their analytic
// parameterizations, and those are the form's own: a plane, cylinder, sphere
// and torus match term for term, and a cone differs only in measuring v
// along its slant. So faces stay analytic, and pcurves carry over unchanged
// or through an affine map of (u, v). A frame OCCT stores left-handed has its
// y axis and u turned around. Other surfaces arrive as their B-spline, which
// keeps their parameterization.
//
// The module's classes are typed here by the members this file uses: the
// build's own declarations are 1.5 MB and live in the store, not the repo.
//
// Every embind object lives in the WASM heap until its `delete()`: a `new`, a
// shape from an explorer, a curve or surface a call returns. Temporaries are
// freed by `withScope`; what escapes (`OcctSolid`) is owned by its caller.
import { BrepBuilder } from "./build.ts";
import type { BrepForm } from "./form.ts";
import { windLoop, type CurveUse } from "./loops.ts";
import type { Placement } from "./kernelProtocol.ts";
import {
  approximateCubic,
  reverseNurbsCurve,
  type NurbsCurve,
} from "./nurbs.ts";

interface Deletable {
  delete(): void;
}

/** Registers an embind handle with its scope, and returns it. */
export type Keep = <T extends Deletable>(handle: T) => T;

/**
 * Runs `fn`, then deletes every handle it passed to `keep`, last first, even
 * if it throws. Handles that must outlive the scope (a result) are not kept.
 */
export function withScope<T>(fn: (keep: Keep) => T): T {
  const handles: Deletable[] = [];
  let result: T;
  try {
    result = fn((handle) => {
      handles.push(handle);
      return handle;
    });
  } finally {
    freeAll(handles);
  }
  return result;
}

/** Deletes the handles last first. All are tried; a failure is thrown once the rest are freed. */
function freeAll(handles: readonly Deletable[]): void {
  let failure: unknown;
  for (let i = handles.length - 1; i >= 0; i--) {
    try {
      handles[i]!.delete();
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure !== undefined) {
    throw failure;
  }
}
interface Pnt extends Deletable {
  X(): number;
  Y(): number;
  Z(): number;
}
/** An OCCT enum value: compared by identity with the module's constants. */
type OcEnum = object;
interface Shape extends Deletable {
  IsNull(): boolean;
  IsSame(other: Shape): boolean;
  Orientation(): OcEnum;
  Oriented(orientation: OcEnum): Shape;
  ShapeType(): OcEnum;
}
interface Explorer extends Deletable {
  More(): boolean;
  Next(): void;
  Current(): Shape;
}
interface ShapeList extends Deletable {
  Size(): number;
  First(): Shape;
  RemoveFirst(): void;
}
interface SurfaceAdaptor extends Deletable {
  GetType(): OcEnum;
  Value(u: number, v: number): Pnt;
  BSpline(): BSplineSurface;
}
interface BSplineSurface extends Deletable {
  UDegree(): number;
  VDegree(): number;
  NbUPoles(): number;
  NbVPoles(): number;
  NbUKnots(): number;
  NbVKnots(): number;
  UKnot(i: number): number;
  VKnot(i: number): number;
  UMultiplicity(i: number): number;
  VMultiplicity(i: number): number;
  Pole(i: number, j: number): Pnt;
  Weight(i: number, j: number): number;
  IsUPeriodic(): boolean;
  IsVPeriodic(): boolean;
  SetUNotPeriodic(): void;
  SetVNotPeriodic(): void;
}
interface BSplineCurve extends Deletable {
  Degree(): number;
  NbPoles(): number;
  NbKnots(): number;
  Knot(i: number): number;
  Multiplicity(i: number): number;
  Pole(i: number): Pnt;
  Weight(i: number): number;
  IsPeriodic(): boolean;
  SetNotPeriodic(): void;
}
interface BooleanOp extends Deletable {
  IsDone(): boolean;
  Shape(): Shape;
  Modified(shape: Shape): ShapeList;
  IsDeleted(shape: Shape): boolean;
}
type Ctor<T> = new (...args: never[]) => T;

/** The members of replicad's OpenCascade.js build this file uses. */
export interface OcctModule {
  gp_Pnt: Ctor<Pnt>;
  gp_Dir: Ctor<Deletable>;
  gp_Ax2: Ctor<Deletable>;
  Message_ProgressRange: Ctor<Deletable>;
  BRepPrimAPI_MakeBox: Ctor<Deletable & { Shape(): Shape }>;
  BRepPrimAPI_MakeCylinder: Ctor<Deletable & { Shape(): Shape }>;
  BRepPrimAPI_MakeSphere: Ctor<Deletable & { Shape(): Shape }>;
  BRepPrimAPI_MakeTorus: Ctor<Deletable & { Shape(): Shape }>;
  BRepPrimAPI_MakeRevol: Ctor<
    Deletable & { IsDone(): boolean; Shape(): Shape }
  >;
  BRepBuilderAPI_MakeEdge: Ctor<Deletable & { Edge(): Shape }>;
  BRepBuilderAPI_MakeWire: Ctor<Deletable & { Wire(): Shape }>;
  BRepBuilderAPI_MakeFace: Ctor<Deletable & { Face(): Shape }>;
  BRepBuilderAPI_Transform: Ctor<
    Deletable & { IsDone(): boolean; Shape(): Shape }
  >;
  gp_Ax1: Ctor<Deletable>;
  gp_Vec: Ctor<Deletable>;
  gp_Trsf: Ctor<
    Deletable & {
      SetRotation(axis: Deletable, angle: number): void;
      SetTranslationPart(offset: Deletable): void;
      Multiply(other: Deletable): void;
    }
  >;
  BRepAlgoAPI_Cut: Ctor<BooleanOp>;
  BRepAlgoAPI_Fuse: Ctor<BooleanOp>;
  BRepAlgoAPI_Common: Ctor<BooleanOp>;
  BRepCheck_Analyzer: Ctor<Deletable & { IsValid(): boolean }>;
  GProp_GProps: Ctor<Deletable & { Mass(): number }>;
  BRepGProp: {
    VolumeProperties(
      shape: Shape,
      props: Deletable,
      onlyClosed: boolean,
      skipShared: boolean,
      useTriangulation: boolean,
    ): void;
  };
  TopExp_Explorer: Ctor<Explorer>;
  TopoDS: {
    Face(shape: Shape): Shape;
    Edge(shape: Shape): Shape;
    Vertex(shape: Shape): Shape;
    Wire(shape: Shape): Shape;
  };
  BRepTools: { OuterWire(face: Shape): Shape };
  BRepAdaptor_Surface: Ctor<SurfaceAdaptor>;
  BRepAdaptor_Curve2d: Ctor<
    Deletable & {
      Curve(): Deletable;
      FirstParameter(): number;
      LastParameter(): number;
    }
  >;
  BRep_Tool: {
    Pnt(vertex: Shape): Pnt;
    Tolerance(shape: Shape): number;
    Degenerated(edge: Shape): boolean;
    Curve(
      edge: Shape,
      first: number,
      last: number,
    ): { returnValue: Deletable; First: number; Last: number };
  };
  Geom_TrimmedCurve: Ctor<Deletable>;
  Geom2d_TrimmedCurve: Ctor<Deletable>;
  GeomConvert: { CurveToBSplineCurve(curve: Deletable): BSplineCurve };
  Geom2dConvert: { CurveToBSplineCurve(curve: Deletable): BSplineCurve };
  STEPControl_Reader: Ctor<
    Deletable & {
      ReadFile(path: string): OcEnum;
      TransferRoots(progress: Deletable): number;
      OneShape(): Shape;
    }
  >;
  STEPControl_Writer: Ctor<
    Deletable & {
      Transfer(
        shape: Shape,
        mode: OcEnum,
        compgraph: boolean,
        progress: Deletable,
      ): OcEnum;
      Write(path: string): OcEnum;
    }
  >;
  STEPControl_StepModelType: Record<"STEPControl_AsIs", OcEnum>;
  IFSelect_ReturnStatus: Record<"IFSelect_RetDone", OcEnum>;
  Interface_Static: { SetCVal(name: string, value: string): boolean };
  /** Emscripten's virtual file system, the way STEP files reach the reader and writer. */
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  };
  /** The WASM linear memory, whose size only grows. */
  wasmMemory: { readonly buffer: ArrayBuffer };
  TopAbs_ShapeEnum: Record<
    | "TopAbs_SOLID"
    | "TopAbs_FACE"
    | "TopAbs_WIRE"
    | "TopAbs_EDGE"
    | "TopAbs_VERTEX"
    | "TopAbs_SHAPE",
    OcEnum
  >;
  TopAbs_Orientation: Record<
    | "TopAbs_FORWARD"
    | "TopAbs_REVERSED"
    | "TopAbs_INTERNAL"
    | "TopAbs_EXTERNAL",
    OcEnum
  >;
  GeomAbs_SurfaceType: Record<
    | "GeomAbs_Plane"
    | "GeomAbs_Cylinder"
    | "GeomAbs_Cone"
    | "GeomAbs_Sphere"
    | "GeomAbs_Torus"
    | "GeomAbs_BezierSurface"
    | "GeomAbs_BSplineSurface",
    OcEnum
  >;
}

/** A b-rep from OCCT, as the form and where its faces came from. */
export interface OcctBrep {
  readonly form: BrepForm;
  /** Per face: the tag of the input face it came from (`OcctKernel.tag`, carried through booleans by their history); -1 for none. */
  readonly faceTags: Int32Array;
}

type Vec3 = [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => scale(a, 1 / length(a));

/** How far the form's surface may be from OCCT's at a check point, m (relative to the surface's size). */
const IDENTITY_TOLERANCE = 1e-9;

/**
 * An analytic surface in the form's terms: the builder call that makes it,
 * the map from OCCT's (u, v) to the form's, and whether that map turns the
 * normal around. `form(u, v)` is the form's point, to check against OCCT's.
 */
interface Analytic {
  make(builder: BrepBuilder): number;
  /** u' = su·u, v' = sv·v. */
  su: number;
  sv: number;
  form(u: number, v: number): Vec3;
}

/** Reads a plane's, cylinder's, cone's, sphere's or torus's frame and radii off OCCT's evaluator. */
function analyticOf(
  oc: OcctModule,
  type: OcEnum,
  at: (u: number, v: number) => Vec3,
): Analytic | undefined {
  const T = oc.GeomAbs_SurfaceType;
  const h = Math.PI / 2;
  if (type === T.GeomAbs_Plane) {
    const o = at(0, 0);
    const x = sub(at(1, 0), o);
    const y = sub(at(0, 1), o);
    return {
      make: (b) => b.plane(o, x, y),
      su: 1,
      sv: 1,
      form: (u, v) => add(o, add(scale(x, u), scale(y, v))),
    };
  }
  // Around an axis: OCCT's u is the angle from x towards y about z.
  // Returns the centre at v, x and y, and whether x × y is against z.
  const around = (v: number) => {
    const a = at(0, v);
    const centre = scale(add(a, at(Math.PI, v)), 0.5);
    const x = unit(sub(a, centre));
    const y = unit(sub(at(h, v), centre));
    return { centre, radius: length(sub(a, centre)), x, y };
  };
  // A left-handed frame: turn y and u around, so z = x × y is the axis.
  const handed = (x: Vec3, y: Vec3, z: Vec3) =>
    dot(cross(x, y), z) < 0 ? { y: scale(y, -1), su: -1 } : { y, su: 1 };
  if (type === T.GeomAbs_Cylinder) {
    const base = around(0);
    const z = sub(at(0, 1), at(0, 0));
    const { y, su } = handed(base.x, base.y, z);
    const r = base.radius;
    return {
      make: (b) => b.cylinder(base.centre, base.x, y, r),
      su,
      sv: 1,
      form: (u, v) =>
        add(
          base.centre,
          add(
            add(scale(base.x, r * Math.cos(u)), scale(y, r * Math.sin(u))),
            scale(cross(base.x, y), v),
          ),
        ),
    };
  }
  if (type === T.GeomAbs_Sphere) {
    const eq = around(0);
    const z = unit(sub(at(0, h), eq.centre));
    const { y, su } = handed(eq.x, eq.y, z);
    const r = eq.radius;
    return {
      make: (b) => b.sphere(eq.centre, eq.x, y, r),
      su,
      // Latitude keeps its sign: z = x × y is the axis after the turn.
      sv: 1,
      form: (u, v) =>
        add(
          eq.centre,
          add(
            scale(
              add(scale(eq.x, Math.cos(u)), scale(y, Math.sin(u))),
              r * Math.cos(v),
            ),
            scale(cross(eq.x, y), r * Math.sin(v)),
          ),
        ),
    };
  }
  if (type === T.GeomAbs_Torus) {
    const ring = around(0);
    const inner = length(sub(at(0, Math.PI), ring.centre));
    const major = (ring.radius + inner) / 2;
    const minor = (ring.radius - inner) / 2;
    const z = unit(sub(sub(at(0, h), ring.centre), scale(ring.x, major)));
    const { y, su } = handed(ring.x, ring.y, z);
    return {
      make: (b) => b.torus(ring.centre, ring.x, y, major, minor),
      su,
      sv: 1,
      form: (u, v) =>
        add(
          ring.centre,
          add(
            scale(
              add(scale(ring.x, Math.cos(u)), scale(y, Math.sin(u))),
              major + minor * Math.cos(v),
            ),
            scale(cross(ring.x, y), minor * Math.sin(v)),
          ),
        ),
    };
  }
  if (type === T.GeomAbs_Cone) {
    // OCCT: O + (R + v·sin a)(cos u·x + sin u·y) + v·cos a·z, v along the
    // slant. The form measures v along the axis: v' = v·cos a. The frame
    // comes from v = 0, so a cone with its apex there isn't read here.
    const base = around(0);
    if (!(base.radius > 0)) {
      return undefined;
    }
    const top = scale(add(at(0, 1), at(Math.PI, 1)), 0.5);
    const rise = sub(top, base.centre);
    const cosA = length(rise);
    const z = scale(rise, 1 / cosA);
    const sinA = dot(sub(at(0, 1), top), base.x) - base.radius;
    const halfAngle = Math.atan2(sinA, cosA);
    const { y, su } = handed(base.x, base.y, z);
    const r = base.radius;
    return {
      make: (b) => b.cone(base.centre, base.x, y, r, halfAngle),
      su,
      sv: cosA,
      form: (u, v) =>
        add(
          base.centre,
          add(
            scale(
              add(scale(base.x, Math.cos(u)), scale(y, Math.sin(u))),
              r + v * Math.tan(halfAngle),
            ),
            scale(cross(base.x, y), v),
          ),
        ),
    };
  }
  return undefined;
}

/** A B-spline curve's NURBS, in 2 or 3 dimensions. */
function curveOf(curve: BSplineCurve, dimension: 2 | 3): NurbsCurve {
  if (curve.IsPeriodic()) {
    curve.SetNotPeriodic();
  }
  const degree = curve.Degree();
  const count = curve.NbPoles();
  const knots: number[] = [];
  for (let i = 1; i <= curve.NbKnots(); i++) {
    const k = curve.Knot(i);
    for (let m = curve.Multiplicity(i); m > 0; m--) {
      knots.push(k);
    }
  }
  const points = new Float64Array(count * dimension);
  const weights = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const p = curve.Pole(i + 1);
    points[i * dimension] = p.X();
    points[i * dimension + 1] = p.Y();
    if (dimension === 3) {
      points[i * dimension + 2] = p.Z();
    }
    p.delete();
    weights[i] = curve.Weight(i + 1);
  }
  return {
    degree,
    count,
    dimension,
    knots: Float64Array.from(knots),
    points,
    weights,
  };
}

/** The pcurve with u and v scaled, exactly: an affine map of the control points. */
function scaleUv(curve: NurbsCurve, su: number, sv: number): NurbsCurve {
  if (su === 1 && sv === 1) {
    return curve;
  }
  const points = Float64Array.from(curve.points, (value, i) =>
    i % 2 === 0 ? value * su : value * sv,
  );
  return { ...curve, points };
}

/**
 * The distinct sub-shapes of a kind, in the order first met, found by
 * `IsSame` (which ignores orientation). This build can't construct OCCT's
 * indexed map and its shapes expose no hash, so finding one is a linear
 * scan: quadratic over a shape, fine for a sample's solids, not for big
 * imported models.
 */
class ShapeSet {
  readonly shapes: Shape[] = [];

  /** The shapes are freed with `keep`'s scope. */
  constructor(oc: OcctModule, keep: Keep, shape: Shape, kind: OcEnum) {
    each(oc, shape, kind, (s) => {
      if (this.indexOf(s) < 0) {
        this.shapes.push(keep(s));
        return true;
      }
    });
  }

  /** The 0-based index of the shape, or -1. */
  indexOf(shape: Shape): number {
    return this.shapes.findIndex((s) => s.IsSame(shape));
  }
}

/**
 * Visits the sub-shapes of a kind. Each is a new handle, deleted after its
 * visit unless the visitor returns true and so takes it over.
 */
function each(
  oc: OcctModule,
  shape: Shape,
  kind: OcEnum,
  visit: (shape: Shape) => boolean | void,
): void {
  const explorer = new oc.TopExp_Explorer(
    ...([shape, kind, oc.TopAbs_ShapeEnum.TopAbs_SHAPE] as never[]),
  );
  try {
    for (; explorer.More(); explorer.Next()) {
      const current = explorer.Current();
      let taken = false;
      try {
        taken = visit(current) === true;
      } finally {
        if (!taken) {
          current.delete();
        }
      }
    }
  } finally {
    explorer.delete();
  }
}

/**
 * Builds the render form from an OCCT shape (a solid, or anything with
 * faces). `tags` names input faces; each face of the form takes the tag of
 * the one it is the same as. A curve above the form's degree 3 (OCCT's
 * intersection curves are often degree 8) becomes a piecewise cubic within
 * the edge's tolerance, and the error it makes widens that tolerance: the
 * representation error, stated where the validator and queries read it.
 * Throws for a surface it can't carry exactly (an offset, a sweep, a surface
 * of revolution).
 */
export function occtToForm(
  oc: OcctModule,
  shape: Shape,
  options?: {
    tags?: ReadonlyArray<{ face: Shape; tag: number }>;
    version?: number;
  },
): OcctBrep {
  return withScope((keep) => convert(oc, keep, shape, options));
}

function convert(
  oc: OcctModule,
  keep: Keep,
  shape: Shape,
  options?: {
    tags?: ReadonlyArray<{ face: Shape; tag: number }>;
    version?: number;
  },
): OcctBrep {
  const O = oc.TopAbs_Orientation;
  const S = oc.TopAbs_ShapeEnum;
  const builder = new BrepBuilder({ version: options?.version });
  const vertices = new ShapeSet(oc, keep, shape, S.TopAbs_VERTEX);
  const edges = new ShapeSet(oc, keep, shape, S.TopAbs_EDGE);
  const faces = new ShapeSet(oc, keep, shape, S.TopAbs_FACE);

  // Edges first, as data: each with its vertices in its own direction and
  // its 3D curve between them; a degenerate edge (a sphere's pole) is
  // zero-length. Their tolerances may still grow as pcurves are approximated.
  const edgeData = edges.shapes.map((edgeShape) =>
    withScope((keep) => {
      // Oriented() returns a plain shape: cast it back, for BRep_Tool's overloads.
      const typed = keep(oc.TopoDS.Edge(edgeShape));
      const edge = keep(oc.TopoDS.Edge(keep(typed.Oriented(O.TopAbs_FORWARD))));
      let start = -1;
      let end = -1;
      each(oc, edge, S.TopAbs_VERTEX, (v) => {
        const index = vertices.indexOf(v);
        if (v.Orientation() === O.TopAbs_FORWARD) {
          start = index;
        } else if (v.Orientation() === O.TopAbs_REVERSED) {
          end = index;
        }
      });
      start = start < 0 ? end : start;
      end = end < 0 ? start : end;
      let tolerance = oc.BRep_Tool.Tolerance(edge);
      if (oc.BRep_Tool.Degenerated(edge)) {
        return { start, end, tolerance, curve: undefined };
      }
      const c = oc.BRep_Tool.Curve(edge, 0, 0);
      keep(c.returnValue);
      const trimmed = keep(
        new oc.Geom_TrimmedCurve(
          ...([c.returnValue, c.First, c.Last, true, true] as never[]),
        ),
      );
      let curve = curveOf(keep(oc.GeomConvert.CurveToBSplineCurve(trimmed)), 3);
      if (curve.degree > MAX_CURVE_DEGREE) {
        const cubic = approximateCubic(curve, approximationTarget(tolerance));
        curve = cubic.curve;
        tolerance += cubic.error;
      }
      return { start, end, tolerance, curve };
    }),
  );

  // Faces: the surface, then its loops, with the face taken forward so that
  // edge orientations are relative to the surface's (u, v).
  const faceData: {
    surface: number;
    loops: CurveUse[][];
    reversed: boolean;
    face: Shape;
  }[] = [];
  for (let f = 0; f < faces.shapes.length; f++) {
    const face = faces.shapes[f]!;
    withScope((keep) => {
      const forward = keep(
        oc.TopoDS.Face(keep(face.Oriented(O.TopAbs_FORWARD))),
      );
      const adaptor = keep(
        new oc.BRepAdaptor_Surface(...([forward, true] as never[])),
      );
      const at = (u: number, v: number): Vec3 => {
        const p = adaptor.Value(u, v);
        const out: Vec3 = [p.X(), p.Y(), p.Z()];
        p.delete();
        return out;
      };
      const type = adaptor.GetType();
      const analytic = analyticOf(oc, type, at);
      let surface: number;
      let su = 1;
      let sv = 1;
      if (analytic) {
        checkIdentity(analytic, at, f);
        surface = analytic.make(builder);
        su = analytic.su;
        sv = analytic.sv;
      } else if (
        type === oc.GeomAbs_SurfaceType.GeomAbs_BSplineSurface ||
        type === oc.GeomAbs_SurfaceType.GeomAbs_BezierSurface
      ) {
        // A B-spline or Bézier surface in OCCT is free-form: no identity.
        surface = builder.nurbsSurface(surfaceOf(keep(adaptor.BSpline())));
      } else {
        throw new Error(
          `occtToForm: face ${f} is on a surface the form can't carry exactly yet`,
        );
      }
      // A pcurve's error is measured where it matters, through the surface.
      const throughSurface = (a: Float64Array, b: Float64Array) =>
        length(sub(at(a[0]!, a[1]!), at(b[0]!, b[1]!)));

      const outerWire = keep(oc.BRepTools.OuterWire(forward));
      const loops: CurveUse[][] = [];
      each(oc, forward, S.TopAbs_WIRE, (wireShape) =>
        withScope((keep) => {
          const wire = keep(oc.TopoDS.Wire(wireShape));
          const uses: CurveUse[] = [];
          each(oc, wire, S.TopAbs_EDGE, (edgeShape) =>
            withScope((keep) => {
              const orientation = edgeShape.Orientation();
              if (
                orientation !== O.TopAbs_FORWARD &&
                orientation !== O.TopAbs_REVERSED
              ) {
                return;
              }
              const edge = keep(oc.TopoDS.Edge(edgeShape));
              const index = edges.indexOf(edge);
              // BRep_Tool.CurveOnSurface's face overload doesn't bind in this
              // build; the adaptor reads the same pcurve, the seam's side picked
              // by the edge's orientation.
              const pc = keep(
                new oc.BRepAdaptor_Curve2d(...([edge, forward] as never[])),
              );
              const trimmed = keep(
                new oc.Geom2d_TrimmedCurve(
                  ...([
                    keep(pc.Curve()),
                    pc.FirstParameter(),
                    pc.LastParameter(),
                    true,
                    true,
                  ] as never[]),
                ),
              );
              let inUv = curveOf(
                keep(oc.Geom2dConvert.CurveToBSplineCurve(trimmed)),
                2,
              );
              if (inUv.degree > MAX_CURVE_DEGREE) {
                const data = edgeData[index]!;
                const cubic = approximateCubic(
                  inUv,
                  approximationTarget(data.tolerance),
                  throughSurface,
                );
                inUv = cubic.curve;
                data.tolerance += cubic.error;
              }
              const along = scaleUv(inUv, su, sv);
              const reversed = orientation === O.TopAbs_REVERSED;
              uses.push({
                edge: index,
                reversed,
                pcurve: reversed ? reverseNurbsCurve(along) : along,
              });
            }),
          );
          if (uses.length > 0) {
            const ordered = chain(uses);
            if (wire.IsSame(outerWire)) {
              loops.unshift(ordered);
            } else {
              loops.push(ordered);
            }
          }
        }),
      );
      // The form's normal is ∂u × ∂v in its own (u, v): a turned u turns it.
      const reversed = (face.Orientation() === O.TopAbs_REVERSED) !== su < 0;
      faceData.push({ surface, loops, reversed, face });
    });
  }

  // Now the builder: vertices, edges with their final tolerances, faces.
  for (const vertex of vertices.shapes) {
    withScope((keep) => {
      const v = keep(oc.TopoDS.Vertex(vertex));
      const p = keep(oc.BRep_Tool.Pnt(v));
      builder.vertex([p.X(), p.Y(), p.Z()], {
        tolerance: oc.BRep_Tool.Tolerance(v),
      });
    });
  }
  for (const { start, end, tolerance, curve } of edgeData) {
    builder.edge(start, end, { curve, tolerance });
  }
  const faceTags = new Int32Array(faceData.length).fill(-1);
  faceData.forEach(({ surface, loops, reversed, face }, f) => {
    builder.face(
      surface,
      loops.map((loop, l) => windLoop(loop, l === 0)),
      { reversed },
    );
    for (const { face: tagged, tag } of options?.tags ?? []) {
      if (tagged.IsSame(face)) {
        faceTags[f] = tag;
        break;
      }
    }
  });
  return { form: builder.build(), faceTags };
}

/** The form's highest curve degree. */
const MAX_CURVE_DEGREE = 3;

/** What an approximation aims for: half the edge's tolerance, at least 0.1 µm. */
function approximationTarget(tolerance: number): number {
  return Math.max(tolerance / 2, 1e-7);
}

/** Throws unless the form's surface matches OCCT's at a few points. */
function checkIdentity(
  analytic: Analytic,
  at: (u: number, v: number) => Vec3,
  face: number,
): void {
  const size = Math.max(1, length(at(0, 0)));
  for (const [u, v] of [
    [0.3, 0.2],
    [1.1, -0.4],
    [2.7, 0.9],
  ] as const) {
    const off = length(
      sub(analytic.form(u * analytic.su, v * analytic.sv), at(u, v)),
    );
    if (!(off <= IDENTITY_TOLERANCE * size)) {
      throw new Error(
        `occtToForm: face ${face}'s surface doesn't match the form's parameterization (${off} m off)`,
      );
    }
  }
}

/** A B-spline surface's NURBS, u fastest. */
function surfaceOf(surface: BSplineSurface) {
  if (surface.IsUPeriodic()) {
    surface.SetUNotPeriodic();
  }
  if (surface.IsVPeriodic()) {
    surface.SetVNotPeriodic();
  }
  const knots = (
    n: number,
    k: (i: number) => number,
    m: (i: number) => number,
  ) => {
    const out: number[] = [];
    for (let i = 1; i <= n; i++) {
      for (let r = m(i); r > 0; r--) {
        out.push(k(i));
      }
    }
    return Float64Array.from(out);
  };
  const countU = surface.NbUPoles();
  const countV = surface.NbVPoles();
  const points = new Float64Array(countU * countV * 3);
  const weights = new Float64Array(countU * countV);
  for (let j = 0; j < countV; j++) {
    for (let i = 0; i < countU; i++) {
      const p = surface.Pole(i + 1, j + 1);
      const at = j * countU + i;
      points[at * 3] = p.X();
      points[at * 3 + 1] = p.Y();
      points[at * 3 + 2] = p.Z();
      p.delete();
      weights[at] = surface.Weight(i + 1, j + 1);
    }
  }
  return {
    degreeU: surface.UDegree(),
    degreeV: surface.VDegree(),
    countU,
    countV,
    knotsU: knots(
      surface.NbUKnots(),
      (i) => surface.UKnot(i),
      (i) => surface.UMultiplicity(i),
    ),
    knotsV: knots(
      surface.NbVKnots(),
      (i) => surface.VKnot(i),
      (i) => surface.VMultiplicity(i),
    ),
    points,
    weights,
  };
}

/**
 * The uses in loop order: each one starts in (u, v) where the one before
 * ends. OCCT's explorer doesn't give a wire's edges in order, and vertices
 * can't order them: on a cylinder's side the seam and both circles meet the
 * same two vertices. Ends in (u, v) can, since the seam's two uses lie at
 * u = 0 and u = 2π. Each step takes the nearest start.
 */
function chain(uses: readonly CurveUse[]): CurveUse[] {
  const endOf = (u: CurveUse, last: boolean) => {
    const i = last ? u.pcurve.count - 1 : 0;
    return [u.pcurve.points[i * 2]!, u.pcurve.points[i * 2 + 1]!] as const;
  };
  const left = [...uses];
  const out = [left.shift()!];
  while (left.length > 0) {
    const [eu, ev] = endOf(out[out.length - 1]!, true);
    let best = 0;
    let bestGap = Infinity;
    left.forEach((u, i) => {
      const [su, sv] = endOf(u, false);
      const gap = Math.hypot(su - eu, sv - ev);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    out.push(left.splice(best, 1)[0]!);
  }
  return out;
}

/** A boolean's operation. */
export type OcctBoolean = "union" | "difference" | "intersection";

/**
 * A shape in OCCT's memory, with the tags its faces carry. It owns its
 * embind handles: whoever gets one from the kernel frees it with `delete`
 * (as with SmlibSolid). A boolean leaves its operands alive.
 */
export class OcctSolid {
  private deleted = false;

  constructor(
    readonly shape: Shape,
    /** The tagged faces: handles of their own, freed with the solid. */
    readonly tags: { face: Shape; tag: number }[] = [],
  ) {}

  delete(): void {
    if (!this.deleted) {
      this.deleted = true;
      freeAll([this.shape, ...this.tags.map(({ face }) => face)]);
    }
  }
}

/** A copy of the handle, to the same shape: for a second owner. */
const copyOf = (shape: Shape): Shape => shape.Oriented(shape.Orientation());

let stepFiles = 0;

/**
 * OCCT through replicad's OpenCascade.js build: primitives, booleans, face
 * tags through a boolean's history, validity, volume, the render form and
 * STEP files. Solids it returns are the caller's to `delete`.
 */
export class OcctKernel {
  constructor(readonly oc: OcctModule) {}

  /** Loads the build at `url` (default the dev server's /occt/replicad_single.js). */
  static async load(url = "/occt/replicad_single.js"): Promise<OcctKernel> {
    const imported = (await import(/* @vite-ignore */ url)) as {
      default: () => Promise<OcctModule>;
    };
    return new OcctKernel(await imported.default());
  }

  /** A solid from a primitive's maker, which is freed. */
  private make(
    build: (keep: Keep) => Deletable & { Shape(): Shape },
  ): OcctSolid {
    return withScope((keep) => new OcctSolid(keep(build(keep)).Shape()));
  }

  private point(keep: Keep, p: ArrayLike<number>): Pnt {
    return keep(new this.oc.gp_Pnt(...([p[0], p[1], p[2]] as never[])));
  }

  /** An axis frame at `origin`, up z. */
  private upAt(keep: Keep, origin: ArrayLike<number>): Deletable {
    const dir = keep(new this.oc.gp_Dir(...([0, 0, 1] as never[])));
    return keep(
      new this.oc.gp_Ax2(...([this.point(keep, origin), dir] as never[])),
    );
  }

  /** A box from its corner, its sides along x, y and z, m. */
  box(origin: ArrayLike<number>, size: ArrayLike<number>): OcctSolid {
    return this.make(
      (keep) =>
        new this.oc.BRepPrimAPI_MakeBox(
          ...([this.point(keep, origin), size[0], size[1], size[2]] as never[]),
        ),
    );
  }

  /** A cylinder up z from the centre of its base, m. */
  cylinder(base: ArrayLike<number>, radius: number, height: number): OcctSolid {
    return this.make(
      (keep) =>
        new this.oc.BRepPrimAPI_MakeCylinder(
          ...([this.upAt(keep, base), radius, height] as never[]),
        ),
    );
  }

  sphere(centre: ArrayLike<number>, radius: number): OcctSolid {
    return this.make(
      (keep) =>
        new this.oc.BRepPrimAPI_MakeSphere(
          ...([this.point(keep, centre), radius] as never[]),
        ),
    );
  }

  /** A torus about z, m. */
  torus(centre: ArrayLike<number>, major: number, minor: number): OcctSolid {
    return this.make(
      (keep) =>
        new this.oc.BRepPrimAPI_MakeTorus(
          ...([this.upAt(keep, centre), major, minor] as never[]),
        ),
    );
  }

  /**
   * A cone or frustum up z from the centre of its base, m: the revolution of
   * its profile about z (this build has no cone maker), whose side is an
   * analytic cone. A top radius of 0 is a point.
   */
  cone(
    base: ArrayLike<number>,
    radiusBase: number,
    radiusTop: number,
    height: number,
  ): OcctSolid {
    const [x, y, z] = [base[0]!, base[1]!, base[2]!];
    return withScope((keep) => {
      const corners = [
        this.point(keep, [x, y, z]),
        this.point(keep, [x + radiusBase, y, z]),
        ...(radiusTop > 0
          ? [this.point(keep, [x + radiusTop, y, z + height])]
          : []),
        this.point(keep, [x, y, z + height]),
      ];
      const edges = corners.map((from, i) =>
        keep(
          keep(
            new this.oc.BRepBuilderAPI_MakeEdge(
              ...([from, corners[(i + 1) % corners.length]] as never[]),
            ),
          ).Edge(),
        ),
      );
      const wire = keep(
        keep(new this.oc.BRepBuilderAPI_MakeWire(...(edges as never[]))).Wire(),
      );
      const profile = keep(
        keep(
          new this.oc.BRepBuilderAPI_MakeFace(...([wire, false] as never[])),
        ).Face(),
      );
      const dir = keep(new this.oc.gp_Dir(...([0, 0, 1] as never[])));
      const axis = keep(
        new this.oc.gp_Ax1(...([this.point(keep, [x, y, z]), dir] as never[])),
      );
      const revolution = keep(
        new this.oc.BRepPrimAPI_MakeRevol(
          ...([profile, axis, true] as never[]),
        ),
      );
      if (!revolution.IsDone()) {
        throw new Error("OCCT: cone failed");
      }
      return new OcctSolid(revolution.Shape());
    });
  }

  /**
   * The solid turned about the world's x, then y, then z axes (degrees,
   * through the origin) and moved by `translate`, as a new solid; the one
   * given is deleted. Place a solid before tagging it: its tags name faces of
   * the shape it was.
   */
  place(solid: OcctSolid, placement: Placement): OcctSolid {
    const { rotate = [0, 0, 0], translate = [0, 0, 0] } = placement;
    if (rotate.every((a) => a === 0) && translate.every((t) => t === 0)) {
      return solid;
    }
    try {
      return withScope((keep) => {
        const trsf = keep(new this.oc.gp_Trsf());
        // z·y·x: a point turns about x first. `Multiply` composes on the right.
        let first = true;
        for (const axis of [2, 1, 0]) {
          const angle = (rotate[axis]! * Math.PI) / 180;
          if (angle === 0) {
            continue;
          }
          const unit = [0, 0, 0];
          unit[axis] = 1;
          const turn = first ? trsf : keep(new this.oc.gp_Trsf());
          turn.SetRotation(
            keep(
              new this.oc.gp_Ax1(
                ...([
                  this.point(keep, [0, 0, 0]),
                  keep(new this.oc.gp_Dir(...(unit as never[]))),
                ] as never[]),
              ),
            ),
            angle,
          );
          if (!first) {
            trsf.Multiply(turn);
          }
          first = false;
        }
        trsf.SetTranslationPart(
          keep(
            new this.oc.gp_Vec(
              ...([translate[0], translate[1], translate[2]] as never[]),
            ),
          ),
        );
        const moved = keep(
          new this.oc.BRepBuilderAPI_Transform(
            ...([solid.shape, trsf, true, false] as never[]),
          ),
        );
        if (!moved.IsDone()) {
          throw new Error("OCCT: place failed");
        }
        return new OcctSolid(moved.Shape());
      });
    } finally {
      solid.delete();
    }
  }

  /**
   * Tags every face of the solid in place, so the faces booleans make from
   * them say where they came from. Returns the same solid.
   */
  tag(solid: OcctSolid, tag: number): OcctSolid {
    each(this.oc, solid.shape, this.oc.TopAbs_ShapeEnum.TopAbs_FACE, (face) => {
      solid.tags.push({ face, tag });
      return true;
    });
    return solid;
  }

  /**
   * The boolean of `a` and `b` as a new solid, which the caller deletes (the
   * operands stay alive). Each tagged input face that survives passes its tag
   * to the faces it became (OCCT's `Modified`), or keeps it if it came
   * through unchanged.
   */
  boolean(operation: OcctBoolean, a: OcctSolid, b: OcctSolid): OcctSolid {
    const Op = {
      union: this.oc.BRepAlgoAPI_Fuse,
      difference: this.oc.BRepAlgoAPI_Cut,
      intersection: this.oc.BRepAlgoAPI_Common,
    }[operation];
    return withScope((keep) => {
      const progress = keep(new this.oc.Message_ProgressRange());
      const op = keep(new Op(...([a.shape, b.shape, progress] as never[])));
      if (!op.IsDone()) {
        throw new Error(`OCCT: ${operation} failed`);
      }
      const result = new OcctSolid(op.Shape());
      try {
        for (const { face, tag } of [...a.tags, ...b.tags]) {
          if (op.IsDeleted(face)) {
            continue;
          }
          const modified = keep(op.Modified(face));
          if (modified.Size() === 0) {
            result.tags.push({ face: copyOf(face), tag });
          }
          while (modified.Size() > 0) {
            result.tags.push({ face: modified.First(), tag });
            modified.RemoveFirst();
          }
        }
      } catch (error) {
        result.delete();
        throw error;
      }
      return result;
    });
  }

  /** OCCT's own check (BRepCheck_Analyzer, with geometry). */
  isValid(solid: OcctSolid): boolean {
    return withScope((keep) =>
      keep(
        new this.oc.BRepCheck_Analyzer(...([solid.shape, true] as never[])),
      ).IsValid(),
    );
  }

  /** The enclosed volume, m³. */
  volume(solid: OcctSolid): number {
    return withScope((keep) => {
      const props = keep(new this.oc.GProp_GProps());
      this.oc.BRepGProp.VolumeProperties(
        solid.shape,
        props,
        false,
        false,
        false,
      );
      return props.Mass();
    });
  }

  faceCount(solid: OcctSolid): number {
    let n = 0;
    each(this.oc, solid.shape, this.oc.TopAbs_ShapeEnum.TopAbs_FACE, () => {
      n++;
    });
    return n;
  }

  toForm(solid: OcctSolid, options?: { version?: number }): OcctBrep {
    return occtToForm(this.oc, solid.shape, {
      tags: solid.tags,
      version: options?.version,
    });
  }

  /**
   * The solids of a STEP file (AP203/214/242, as OCCT reads), in metres: the
   * file's own units are converted. Solids inside compounds and assemblies
   * count, each with its placement; free shells and surfaces don't. The
   * caller deletes the solids. Throws if the bytes aren't a readable STEP
   * file, or hold nothing OCCT transfers. The bytes pass through the
   * module's in-memory file system, as the reader only takes a path.
   */
  importStep(bytes: Uint8Array): OcctSolid[] {
    const oc = this.oc;
    return withScope((keep) => {
      const reader = keep(new oc.STEPControl_Reader());
      this.useMetres();
      const status = this.throughFile(bytes, (path) => reader.ReadFile(path));
      if (status !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
        throw new Error("OCCT: the STEP file can't be read");
      }
      const progress = keep(new oc.Message_ProgressRange());
      if (reader.TransferRoots(progress) === 0) {
        throw new Error("OCCT: the STEP file has nothing to transfer");
      }
      const solids: OcctSolid[] = [];
      try {
        each(
          oc,
          keep(reader.OneShape()),
          oc.TopAbs_ShapeEnum.TopAbs_SOLID,
          (shape) => {
            solids.push(new OcctSolid(shape));
            return true;
          },
        );
      } catch (error) {
        solids.forEach((solid) => solid.delete());
        throw error;
      }
      return solids;
    });
  }

  /** The solids as a STEP file (AP214), in metres. The inverse of `importStep`. */
  exportStep(solids: OcctSolid | readonly OcctSolid[]): Uint8Array {
    const oc = this.oc;
    return withScope((keep) => {
      const writer = keep(new oc.STEPControl_Writer());
      this.useMetres();
      for (const solid of Array.isArray(solids) ? solids : [solids]) {
        const progress = keep(new oc.Message_ProgressRange());
        const status = writer.Transfer(
          solid.shape,
          oc.STEPControl_StepModelType.STEPControl_AsIs,
          true,
          progress,
        );
        if (status !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
          throw new Error("OCCT: a solid can't be written as STEP");
        }
      }
      const { status, data } = this.throughFile(undefined, (path) => {
        const done = writer.Write(path);
        return { status: done, data: oc.FS.readFile(path) };
      });
      if (status !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
        throw new Error("OCCT: the STEP file can't be written");
      }
      return data;
    });
  }

  /** STEP's length unit, which the reader and writer convert to and from, as metres (a module-wide setting). */
  private useMetres(): void {
    const set = this.oc.Interface_Static.SetCVal;
    if (!set("xstep.cascade.unit", "M") || !set("write.step.unit", "M")) {
      throw new Error("OCCT: STEP unit parameters are missing");
    }
  }

  /** Runs `use` on a path in the module's file system, holding `bytes` if given, and removes it. */
  private throughFile<T>(
    bytes: Uint8Array | undefined,
    use: (path: string) => T,
  ): T {
    const path = `/occt-${stepFiles++}.step`;
    try {
      if (bytes) {
        this.oc.FS.writeFile(path, bytes);
      }
      return use(path);
    } finally {
      try {
        this.oc.FS.unlink(path);
      } catch {
        // Nothing was written.
      }
    }
  }
}
