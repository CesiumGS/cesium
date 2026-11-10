// A builder for the b-rep render form (overall plan §13.33). A host writes
// surfaces, vertices, edges and faces by name, and the builder does the
// offset counting: it splits NURBS into rational Bézier segments and patches
// exactly, and lays every array out as the form fixes. Lengths are metres and
// angles are radians.
import { SurfaceKind, type BezierCurves, type BrepForm } from "./form.ts";
import {
  nurbsCurveToSegments,
  nurbsSurfaceToPatches,
  type NurbsCurve,
  type NurbsSurface,
} from "./nurbs.ts";

/** The default tolerance of a vertex or an edge, m. */
const DEFAULT_TOLERANCE = 1e-6;

/**
 * One use of an edge in a face's loop. The pcurve runs in the use's own
 * direction, in the surface's (u, v). Two points give a straight (u, v) line.
 */
export interface BrepUse {
  readonly edge: number;
  /** True when the use runs from the edge's end vertex to its start. */
  readonly reversed?: boolean;
  readonly pcurve: NurbsCurve | readonly [ArrayLike<number>, ArrayLike<number>];
}

/** A curve already split and checked, ready to add. */
interface Prepared {
  readonly degree: number;
  readonly points: Float64Array;
}

/** A growing list of rational Bézier curve segments of one dimension. */
class CurveList {
  private readonly degree: number[] = [];
  private readonly first: number[] = [];
  private readonly points: number[] = [];
  private pointCount = 0;

  constructor(private readonly dimension: 2 | 3) {}

  /** Adds segments of one degree, and returns [first segment, segment count]. */
  add(degree: number, homogeneous: Float64Array): [number, number] {
    const perSegment = (degree + 1) * (this.dimension + 1);
    const count = homogeneous.length / perSegment;
    const firstSegment = this.degree.length;
    for (let s = 0; s < count; s++) {
      this.degree.push(degree);
      this.first.push(this.pointCount);
      for (let i = 0; i < perSegment; i++) {
        this.points.push(homogeneous[s * perSegment + i]!);
      }
      this.pointCount += degree + 1;
    }
    return [firstSegment, count];
  }

  /** One degree-1 segment between two points, with weight 1. */
  line(a: ArrayLike<number>, b: ArrayLike<number>): [number, number] {
    const h: number[] = [];
    for (const p of [a, b]) {
      for (let k = 0; k < this.dimension; k++) {
        h.push(p[k]!);
      }
      h.push(1);
    }
    return this.add(1, Float64Array.from(h));
  }

  /** A NURBS curve, split exactly into segments. */
  nurbs(curve: NurbsCurve): [number, number] {
    const split = nurbsCurveToSegments(curve);
    return this.add(split.degree, split.points);
  }

  /** Splits and checks a pcurve without adding it. */
  prepare(pcurve: BrepUse["pcurve"]): Prepared {
    if (isPoints(pcurve)) {
      const h: number[] = [];
      for (const p of pcurve) {
        for (let k = 0; k < this.dimension; k++) {
          h.push(p[k]!);
        }
        h.push(1);
      }
      return { degree: 1, points: Float64Array.from(h) };
    }
    const split = nurbsCurveToSegments(pcurve);
    return { degree: split.degree, points: split.points };
  }

  toCurves(): BezierCurves {
    return {
      degree: Uint8Array.from(this.degree),
      first: Uint32Array.from(this.first),
      points: Float64Array.from(this.points),
    };
  }
}

/** Writes a b-rep render form, one entity at a time. */
export class BrepBuilder {
  private readonly version: number;

  private readonly surfaceKind: number[] = [];
  private readonly surfaceFrame: number[] = [];
  private readonly surfaceParams: number[] = [];
  private readonly surfacePatches: number[] = [];

  private readonly patchDegree: number[] = [];
  private readonly patchFirst: number[] = [];
  private readonly patchPoints: number[] = [];
  private readonly patchDomain: number[] = [];
  private patchPointCount = 0;

  private readonly faceSurface: number[] = [];
  private readonly faceReversed: number[] = [];
  private readonly faceLoops: number[] = [];
  private readonly faceIds: string[] = [];

  private readonly loopUses: number[] = [];
  private useCount = 0;

  private readonly useEdge: number[] = [];
  private readonly useReversed: number[] = [];
  private readonly usePcurve: number[] = [];

  private readonly edgeVertices: number[] = [];
  private readonly edgeCurve: number[] = [];
  private readonly edgeTolerance: number[] = [];
  private readonly edgeIds: string[] = [];

  private readonly vertexPosition: number[] = [];
  private readonly vertexTolerance: number[] = [];
  private readonly vertexIds: string[] = [];

  private readonly curves2 = new CurveList(2);
  private readonly curves3 = new CurveList(3);

  constructor(options?: { version?: number }) {
    this.version = options?.version ?? 1;
  }

  /** A plane: P = origin + u·x + v·y. Returns the surface's index. */
  plane(
    origin: ArrayLike<number>,
    x: ArrayLike<number>,
    y: ArrayLike<number>,
  ): number {
    return this.analytic(SurfaceKind.Plane, origin, x, y, 0, 0);
  }

  /** A cylinder of the given radius, m, about the axis x × y. */
  cylinder(
    origin: ArrayLike<number>,
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    radius: number,
  ): number {
    return this.analytic(SurfaceKind.Cylinder, origin, x, y, radius, 0);
  }

  /** A cone: radius m at v = 0, and half-angle in radians. */
  cone(
    origin: ArrayLike<number>,
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    radius: number,
    halfAngle: number,
  ): number {
    return this.analytic(SurfaceKind.Cone, origin, x, y, radius, halfAngle);
  }

  /** A sphere of the given radius, m. */
  sphere(
    origin: ArrayLike<number>,
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    radius: number,
  ): number {
    return this.analytic(SurfaceKind.Sphere, origin, x, y, radius, 0);
  }

  /** A torus with the given major and minor radii, m. */
  torus(
    origin: ArrayLike<number>,
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    major: number,
    minor: number,
  ): number {
    return this.analytic(SurfaceKind.Torus, origin, x, y, major, minor);
  }

  /** A NURBS surface, stored as the rational Bézier patches it splits into exactly. */
  nurbsSurface(surface: NurbsSurface): number {
    const split = nurbsSurfaceToPatches(surface);
    const index = this.surfaceKind.length;
    const patches = split.domains.length / 4;
    const perPatch = (split.degreeU + 1) * (split.degreeV + 1);
    this.surfaceKind.push(SurfaceKind.Bezier);
    for (let i = 0; i < 9; i++) {
      this.surfaceFrame.push(0);
    }
    this.surfaceParams.push(0, 0);
    this.surfacePatches.push(this.patchDegree.length / 2, patches);
    for (let p = 0; p < patches; p++) {
      this.patchDegree.push(split.degreeU, split.degreeV);
      this.patchFirst.push(this.patchPointCount);
      this.patchPointCount += perPatch;
      for (let i = 0; i < 4; i++) {
        this.patchDomain.push(split.domains[p * 4 + i]!);
      }
    }
    for (let i = 0; i < split.points.length; i++) {
      this.patchPoints.push(split.points[i]!);
    }
    return index;
  }

  /** A vertex at a position in m. Returns its index. */
  vertex(
    position: ArrayLike<number>,
    options?: { tolerance?: number; id?: string },
  ): number {
    const index = this.vertexTolerance.length;
    this.vertexPosition.push(position[0]!, position[1]!, position[2]!);
    this.vertexTolerance.push(options?.tolerance ?? DEFAULT_TOLERANCE);
    this.vertexIds.push(options?.id ?? "");
    return index;
  }

  /**
   * An edge from one vertex to another. Its 3D curve runs start to end, and
   * is a straight line between the vertices when omitted. The tolerance, m,
   * is how far the curve and its uses' images may be apart.
   */
  edge(
    start: number,
    end: number,
    options?: { curve?: NurbsCurve; tolerance?: number; id?: string },
  ): number {
    this.checkVertex("edge", start);
    this.checkVertex("edge", end);
    const index = this.edgeTolerance.length;
    const curve = options?.curve;
    let range: [number, number];
    if (curve) {
      if (curve.dimension !== 3) {
        throw new Error("BrepBuilder.edge: the curve must be 3D");
      }
      range = this.curves3.nurbs(curve);
    } else {
      const p = this.vertexPosition;
      range = this.curves3.line(
        [p[start * 3]!, p[start * 3 + 1]!, p[start * 3 + 2]!],
        [p[end * 3]!, p[end * 3 + 1]!, p[end * 3 + 2]!],
      );
    }
    this.edgeVertices.push(start, end);
    this.edgeCurve.push(range[0], range[1]);
    this.edgeTolerance.push(options?.tolerance ?? DEFAULT_TOLERANCE);
    this.edgeIds.push(options?.id ?? "");
    return index;
  }

  /**
   * A face on a surface: its outer loop first, then its inner loops. Each
   * loop lists its uses in loop order, and the builder keeps that order. A use
   * that is a NURBS pcurve is split into segments, and its degree must be 1
   * to 3.
   */
  face(
    surface: number,
    loops: readonly (readonly BrepUse[])[],
    options?: { reversed?: boolean; id?: string },
  ): number {
    if (!(surface >= 0 && surface < this.surfaceKind.length)) {
      throw new Error(`BrepBuilder.face: no surface ${surface}`);
    }
    if (loops.length === 0 || loops.some((loop) => loop.length === 0)) {
      throw new Error("BrepBuilder.face: a face needs loops with uses");
    }
    const edges = this.edgeTolerance.length;
    for (const loop of loops) {
      for (const use of loop) {
        if (!(use.edge >= 0 && use.edge < edges)) {
          throw new Error(`BrepBuilder.face: no edge ${use.edge}`);
        }
        if (!isPoints(use.pcurve) && use.pcurve.dimension !== 2) {
          throw new Error("BrepBuilder.face: a pcurve must be 2D");
        }
      }
    }
    // Split and check every pcurve first, so a throw leaves the builder as it was.
    const prepared = loops.map((loop) =>
      loop.map((use) => this.curves2.prepare(use.pcurve)),
    );
    const index = this.faceSurface.length;
    this.faceSurface.push(surface);
    this.faceReversed.push(options?.reversed ? 1 : 0);
    this.faceLoops.push(this.loopUses.length / 2, loops.length);
    this.faceIds.push(options?.id ?? "");
    loops.forEach((loop, l) => {
      this.loopUses.push(this.useCount, loop.length);
      loop.forEach((use, u) => {
        const made = prepared[l]![u]!;
        const range = this.curves2.add(made.degree, made.points);
        this.useEdge.push(use.edge);
        this.useReversed.push(use.reversed ? 1 : 0);
        this.usePcurve.push(range[0], range[1]);
        this.useCount++;
      });
    });
    return index;
  }

  /** The finished form, as fresh typed arrays. */
  build(): BrepForm {
    return {
      version: this.version,
      surfaceKind: Uint8Array.from(this.surfaceKind),
      surfaceFrame: Float64Array.from(this.surfaceFrame),
      surfaceParams: Float64Array.from(this.surfaceParams),
      surfacePatches: Uint32Array.from(this.surfacePatches),
      patchDegree: Uint8Array.from(this.patchDegree),
      patchFirst: Uint32Array.from(this.patchFirst),
      patchPoints: Float64Array.from(this.patchPoints),
      patchDomain: Float64Array.from(this.patchDomain),
      faceSurface: Uint32Array.from(this.faceSurface),
      faceReversed: Uint8Array.from(this.faceReversed),
      faceLoops: Uint32Array.from(this.faceLoops),
      loopUses: Uint32Array.from(this.loopUses),
      useEdge: Uint32Array.from(this.useEdge),
      useReversed: Uint8Array.from(this.useReversed),
      usePcurve: Uint32Array.from(this.usePcurve),
      edgeVertices: Uint32Array.from(this.edgeVertices),
      edgeCurve: Uint32Array.from(this.edgeCurve),
      edgeTolerance: Float32Array.from(this.edgeTolerance),
      vertexPosition: Float64Array.from(this.vertexPosition),
      vertexTolerance: Float32Array.from(this.vertexTolerance),
      curves2: this.curves2.toCurves(),
      curves3: this.curves3.toCurves(),
      ids: [...this.faceIds, ...this.edgeIds, ...this.vertexIds],
    };
  }

  private analytic(
    kind: SurfaceKind,
    origin: ArrayLike<number>,
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    a: number,
    b: number,
  ): number {
    const index = this.surfaceKind.length;
    this.surfaceKind.push(kind);
    for (const axis of [origin, x, y]) {
      this.surfaceFrame.push(axis[0]!, axis[1]!, axis[2]!);
    }
    this.surfaceParams.push(a, b);
    this.surfacePatches.push(0, 0);
    return index;
  }

  private checkVertex(what: string, vertex: number): void {
    if (!(vertex >= 0 && vertex < this.vertexTolerance.length)) {
      throw new Error(`BrepBuilder.${what}: no vertex ${vertex}`);
    }
  }
}

/** True for a pcurve given as two points rather than as a NURBS curve. */
function isPoints(
  pcurve: BrepUse["pcurve"],
): pcurve is readonly [ArrayLike<number>, ArrayLike<number>] {
  return Array.isArray(pcurve);
}
