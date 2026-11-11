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
import { BrepBuilder } from "./build.ts";
import type { BrepForm } from "./form.ts";
import { windLoop, type CurveUse } from "./loops.ts";
import {
  approximateCubic,
  reverseNurbsCurve,
  type NurbsCurve,
} from "./nurbs.ts";

interface Deletable {
  delete(): void;
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
interface BSplineSurface {
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
interface BSplineCurve {
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
      Curve(): object;
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
    ): { returnValue: object; First: number; Last: number };
  };
  Geom_TrimmedCurve: Ctor<object>;
  Geom2d_TrimmedCurve: Ctor<object>;
  GeomConvert: { CurveToBSplineCurve(curve: object): BSplineCurve };
  Geom2dConvert: { CurveToBSplineCurve(curve: object): BSplineCurve };
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

  constructor(oc: OcctModule, shape: Shape, kind: OcEnum) {
    each(oc, shape, kind, (s) => {
      if (this.indexOf(s) < 0) {
        this.shapes.push(s);
      }
    });
  }

  /** The 0-based index of the shape, or -1. */
  indexOf(shape: Shape): number {
    return this.shapes.findIndex((s) => s.IsSame(shape));
  }
}

function each(
  oc: OcctModule,
  shape: Shape,
  kind: OcEnum,
  visit: (shape: Shape) => void,
): void {
  const explorer = new oc.TopExp_Explorer(
    ...([shape, kind, oc.TopAbs_ShapeEnum.TopAbs_SHAPE] as never[]),
  );
  for (; explorer.More(); explorer.Next()) {
    visit(explorer.Current());
  }
  explorer.delete();
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
  const O = oc.TopAbs_Orientation;
  const S = oc.TopAbs_ShapeEnum;
  const builder = new BrepBuilder({ version: options?.version });
  const vertices = new ShapeSet(oc, shape, S.TopAbs_VERTEX);
  const edges = new ShapeSet(oc, shape, S.TopAbs_EDGE);
  const faces = new ShapeSet(oc, shape, S.TopAbs_FACE);

  // Edges first, as data: each with its vertices in its own direction and
  // its 3D curve between them; a degenerate edge (a sphere's pole) is
  // zero-length. Their tolerances may still grow as pcurves are approximated.
  const edgeData = edges.shapes.map((edgeShape) => {
    // Oriented() returns a plain shape: cast it back, for BRep_Tool's overloads.
    const edge = oc.TopoDS.Edge(
      oc.TopoDS.Edge(edgeShape).Oriented(O.TopAbs_FORWARD),
    );
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
    const trimmed = new oc.Geom_TrimmedCurve(
      ...([c.returnValue, c.First, c.Last, true, true] as never[]),
    );
    let curve = curveOf(oc.GeomConvert.CurveToBSplineCurve(trimmed), 3);
    if (curve.degree > MAX_CURVE_DEGREE) {
      const cubic = approximateCubic(curve, approximationTarget(tolerance));
      curve = cubic.curve;
      tolerance += cubic.error;
    }
    return { start, end, tolerance, curve };
  });

  // Faces: the surface, then its loops, with the face taken forward so that
  // edge orientations are relative to the surface's (u, v).
  const faceData: {
    surface: number;
    loops: CurveUse[][];
    reversed: boolean;
    face: Shape;
  }[] = [];
  for (let f = 0; f < faces.shapes.length; f++) {
    const face = oc.TopoDS.Face(faces.shapes[f]!);
    const forward = oc.TopoDS.Face(face.Oriented(O.TopAbs_FORWARD));
    const adaptor = new oc.BRepAdaptor_Surface(...([forward, true] as never[]));
    try {
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
        surface = builder.nurbsSurface(surfaceOf(adaptor.BSpline()));
      } else {
        throw new Error(
          `occtToForm: face ${f} is on a surface the form can't carry exactly yet`,
        );
      }
      // A pcurve's error is measured where it matters, through the surface.
      const throughSurface = (a: Float64Array, b: Float64Array) =>
        length(sub(at(a[0]!, a[1]!), at(b[0]!, b[1]!)));

      const outerWire = oc.BRepTools.OuterWire(forward);
      const loops: CurveUse[][] = [];
      each(oc, forward, S.TopAbs_WIRE, (wireShape) => {
        const wire = oc.TopoDS.Wire(wireShape);
        const uses: CurveUse[] = [];
        each(oc, wire, S.TopAbs_EDGE, (edgeShape) => {
          const orientation = edgeShape.Orientation();
          if (
            orientation !== O.TopAbs_FORWARD &&
            orientation !== O.TopAbs_REVERSED
          ) {
            return;
          }
          const edge = oc.TopoDS.Edge(edgeShape);
          const index = edges.indexOf(edge);
          // BRep_Tool.CurveOnSurface's face overload doesn't bind in this
          // build; the adaptor reads the same pcurve, the seam's side picked
          // by the edge's orientation.
          const pc = new oc.BRepAdaptor_Curve2d(
            ...([edge, forward] as never[]),
          );
          const trimmed = new oc.Geom2d_TrimmedCurve(
            ...([
              pc.Curve(),
              pc.FirstParameter(),
              pc.LastParameter(),
              true,
              true,
            ] as never[]),
          );
          pc.delete();
          let inUv = curveOf(oc.Geom2dConvert.CurveToBSplineCurve(trimmed), 2);
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
        });
        if (uses.length > 0) {
          const ordered = chain(uses);
          if (wire.IsSame(outerWire)) {
            loops.unshift(ordered);
          } else {
            loops.push(ordered);
          }
        }
      });
      // The form's normal is ∂u × ∂v in its own (u, v): a turned u turns it.
      const reversed = (face.Orientation() === O.TopAbs_REVERSED) !== su < 0;
      faceData.push({ surface, loops, reversed, face });
    } finally {
      adaptor.delete();
    }
  }

  // Now the builder: vertices, edges with their final tolerances, faces.
  for (const vertex of vertices.shapes) {
    const v = oc.TopoDS.Vertex(vertex);
    const p = oc.BRep_Tool.Pnt(v);
    builder.vertex([p.X(), p.Y(), p.Z()], {
      tolerance: oc.BRep_Tool.Tolerance(v),
    });
    p.delete();
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

/** A shape in OCCT's memory, with the tags its faces carry. */
export class OcctSolid {
  constructor(
    readonly shape: Shape,
    readonly tags: ReadonlyArray<{ face: Shape; tag: number }> = [],
  ) {}
}

/**
 * OCCT through replicad's OpenCascade.js build: primitives, booleans, face
 * tags through a boolean's history, validity, volume and the render form.
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

  private make(maker: Deletable & { Shape(): Shape }): OcctSolid {
    const solid = new OcctSolid(maker.Shape());
    maker.delete();
    return solid;
  }

  private point(p: ArrayLike<number>): Pnt {
    return new this.oc.gp_Pnt(...([p[0], p[1], p[2]] as never[]));
  }

  /** An axis frame at `origin`, up z. */
  private upAt(origin: ArrayLike<number>): Deletable {
    const dir = new this.oc.gp_Dir(...([0, 0, 1] as never[]));
    return new this.oc.gp_Ax2(...([this.point(origin), dir] as never[]));
  }

  /** A box from its corner, its sides along x, y and z, m. */
  box(origin: ArrayLike<number>, size: ArrayLike<number>): OcctSolid {
    return this.make(
      new this.oc.BRepPrimAPI_MakeBox(
        ...([this.point(origin), size[0], size[1], size[2]] as never[]),
      ),
    );
  }

  /** A cylinder up z from the centre of its base, m. */
  cylinder(base: ArrayLike<number>, radius: number, height: number): OcctSolid {
    return this.make(
      new this.oc.BRepPrimAPI_MakeCylinder(
        ...([this.upAt(base), radius, height] as never[]),
      ),
    );
  }

  sphere(centre: ArrayLike<number>, radius: number): OcctSolid {
    return this.make(
      new this.oc.BRepPrimAPI_MakeSphere(
        ...([this.point(centre), radius] as never[]),
      ),
    );
  }

  /** A torus about z, m. */
  torus(centre: ArrayLike<number>, major: number, minor: number): OcctSolid {
    return this.make(
      new this.oc.BRepPrimAPI_MakeTorus(
        ...([this.upAt(centre), major, minor] as never[]),
      ),
    );
  }

  /** Tags every face, so the faces booleans make from them say where they came from. */
  tag(solid: OcctSolid, tag: number): OcctSolid {
    const tags = [...solid.tags];
    each(this.oc, solid.shape, this.oc.TopAbs_ShapeEnum.TopAbs_FACE, (face) =>
      tags.push({ face, tag }),
    );
    return new OcctSolid(solid.shape, tags);
  }

  /**
   * The boolean of `a` and `b` as a new solid. Each tagged input face that
   * survives passes its tag to the faces it became (OCCT's `Modified`), or
   * keeps it if it came through unchanged.
   */
  boolean(operation: OcctBoolean, a: OcctSolid, b: OcctSolid): OcctSolid {
    const Op = {
      union: this.oc.BRepAlgoAPI_Fuse,
      difference: this.oc.BRepAlgoAPI_Cut,
      intersection: this.oc.BRepAlgoAPI_Common,
    }[operation];
    const progress = new this.oc.Message_ProgressRange();
    const op = new Op(...([a.shape, b.shape, progress] as never[]));
    progress.delete();
    if (!op.IsDone()) {
      op.delete();
      throw new Error(`OCCT: ${operation} failed`);
    }
    const tags: { face: Shape; tag: number }[] = [];
    for (const { face, tag } of [...a.tags, ...b.tags]) {
      if (op.IsDeleted(face)) {
        continue;
      }
      const modified = op.Modified(face);
      if (modified.Size() === 0) {
        tags.push({ face, tag });
      }
      while (modified.Size() > 0) {
        tags.push({ face: modified.First(), tag });
        modified.RemoveFirst();
      }
      modified.delete();
    }
    const result = new OcctSolid(op.Shape(), tags);
    op.delete();
    return result;
  }

  /** OCCT's own check (BRepCheck_Analyzer, with geometry). */
  isValid(solid: OcctSolid): boolean {
    const check = new this.oc.BRepCheck_Analyzer(
      ...([solid.shape, true] as never[]),
    );
    const valid = check.IsValid();
    check.delete();
    return valid;
  }

  /** The enclosed volume, m³. */
  volume(solid: OcctSolid): number {
    const props = new this.oc.GProp_GProps();
    this.oc.BRepGProp.VolumeProperties(solid.shape, props, false, false, false);
    const volume = props.Mass();
    props.delete();
    return volume;
  }

  faceCount(solid: OcctSolid): number {
    let n = 0;
    each(this.oc, solid.shape, this.oc.TopAbs_ShapeEnum.TopAbs_FACE, () => n++);
    return n;
  }

  toForm(solid: OcctSolid, options?: { version?: number }): OcctBrep {
    return occtToForm(this.oc, solid.shape, {
      tags: solid.tags,
      version: options?.version,
    });
  }
}
