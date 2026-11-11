// A b-rep as a geometry (brep 3's adapter, overall plan §13.33): the query
// interface over a `BrepForm`, answered from the modeling surfaces and never
// from a mesh. Each query picks its route per surface: a closed form from the
// analytic surface (planes, cylinders, cones, spheres, tori), subdivision and
// Newton on rational Bézier patches, Newton on edge curves, or the vertices'
// positions. A hierarchy over the faces' and patches' boxes (a control net's
// hull holds its patch) keeps each query to the surfaces near the ray or the
// point. A face's trim is the one the tessellator reads, a polygon of 16
// samples per pcurve segment (`faceTrim`), so a point within that polygon's
// sag of a trim edge can fall on the wrong side. Every answer names its
// domain point, (u, v) on a face or t along an edge, and its accuracy: the
// model tolerance, the surface's representation error and the edge's
// tolerance, with the route in the note.
//
// Coordinates are placed: the form's, turned and moved by `matrix` (a
// rotation, a translation and a uniform scale), and the arithmetic is centred
// on `origin` as the mesh adapter's is. Lengths are metres.
import {
  analyticBounds,
  nearestCandidates,
  periodicU,
  periodicV,
  rayRoots,
  surfaceUv,
  wrapAngle,
} from "../brep/analyticQueries.ts";
import { evaluateSegment } from "../brep/bezier.ts";
import { Bvh } from "../brep/bvh.ts";
import { nearestOnCurve, type CurvePoint } from "../brep/curveQueries.ts";
import { evaluateSurface, faceNormal } from "../brep/evaluate.ts";
import { SurfaceKind, type BrepForm } from "../brep/form.ts";
import { formBounds } from "../brep/formBounds.ts";
import {
  nearestNewton,
  nearestPatch,
  netBox,
  patchPart,
  rayPatch,
  type PatchPart,
} from "../brep/patchQueries.ts";
import { faceTrim, tessellateBrep, type FaceTrim } from "../brep/tessellate.ts";
import type { QueryRay } from "../query/queries.ts";
import type {
  ClosestPoint,
  ClosestPointOptions,
  DisplayMesh,
  EntityInfo,
  EntityKind,
  EntityRef,
  GeometryAccuracy,
  GeometryBounds,
  GeometryQueries,
  GeometryRayAnswer,
  RayHitOptions,
  SegmentDistance,
} from "./query.ts";

export interface BrepGeometryOptions {
  /** Column-major 4x4 placing the form: a rotation, a translation and a uniform scale (default identity). */
  readonly matrix?: Float64Array;
  /** Where the arithmetic is centred unless a query gives its own, in placed coordinates (default the origin). */
  readonly origin?: ArrayLike<number>;
  /** The model's tolerance, m: how far the stored surfaces may be from the model's (default 0.1 µm, Open CASCADE's confusion). */
  readonly modelTolerance?: number;
  /** The content version (default the form's). */
  readonly version?: number;
}

/** What a GPU pick knows of a point on a face. */
export interface PickHint {
  /** A point at or near the pick, in placed coordinates. */
  readonly point?: ArrayLike<number>;
  /** The pick's (u, v) on the face's surface, where the GPU has them. */
  readonly uv?: readonly [number, number];
  readonly origin?: ArrayLike<number>;
}

/** A pick refined onto the exact face. */
export interface RefinedPick {
  readonly entity: EntityRef;
  readonly position: Float64Array;
  /** Unit normal: turned toward the hint's point when it has one, else the face's outward normal. */
  readonly normal: Float64Array;
  readonly uv: readonly [number, number];
  /** Whether (u, v) lies inside the face's trim; a pick just outside it was on the face's edge. */
  readonly inFace: boolean;
  /** From the hint's point to `position`, m; 0 when there was no point. */
  readonly distance: number;
  readonly accuracy: GeometryAccuracy;
}

export interface BrepGeometry extends GeometryQueries {
  readonly kind: "brep";
  /** The exact point of `face` for a GPU pick's hint: Newton from its (u, v) onto the face's surface, the nearest point to its point, or the surface at its (u, v). Undefined for a face with no extent or a hint with neither. */
  refinePick(face: number, hint: PickHint): RefinedPick | undefined;
}

type V3 = [number, number, number];

const IDENTITY = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);
const KIND_NAMES = ["plane", "cylinder", "cone", "sphere", "torus"];
const PATCH_ROUTE = "Newton on Bézier patch";
const EDGE_ROUTE = "Newton on edge curve";
const MODEL_TOLERANCE = 1e-7;

const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const distance3 = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** A length for a note, without e-notation. */
function metres(m: number): string {
  if (m === 0) {
    return "0 m";
  }
  if (m < 1e-3) {
    return `${(m * 1e6).toPrecision(2)} µm`;
  }
  return m < 1 ? `${(m * 1e3).toPrecision(2)} mm` : `${m.toPrecision(2)} m`;
}

/** The trim polygon's samples per pcurve segment, as `faceTrim` reads them. */
const POLYGON_SAMPLES = 16;

/** The distance from (u, v) to the closed polygons (interleaved (u, v)), infinite for none. */
function nearPolygon(
  loops: readonly Float64Array[],
  u: number,
  v: number,
): number {
  let best = Infinity;
  for (const loop of loops) {
    const n = loop.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = loop[i * 2]!;
      const ay = loop[i * 2 + 1]!;
      const bx = loop[j * 2]! - ax;
      const by = loop[j * 2 + 1]! - ay;
      const length2 = bx * bx + by * by;
      const along =
        length2 > 0
          ? Math.min(1, Math.max(0, ((u - ax) * bx + (v - ay) * by) / length2))
          : 0;
      best = Math.min(
        best,
        Math.hypot(u - ax - along * bx, v - ay - along * by),
      );
    }
  }
  return best;
}

/** The most a pcurve strays from the chords of its polygon, in (u, v): checked at three points between each pair of samples. */
function polygonSag(form: BrepForm, pcurves: readonly number[]): number {
  let sag = 0;
  const curves = form.curves2;
  for (const g of pcurves) {
    const at = (t: number) =>
      evaluateSegment(curves.points, curves.first[g]!, curves.degree[g]!, 2, t)
        .position;
    for (let i = 0; i < POLYGON_SAMPLES; i++) {
      const a = at(i / POLYGON_SAMPLES);
      const b = at((i + 1) / POLYGON_SAMPLES);
      for (const q of [0.25, 0.5, 0.75]) {
        const c = at((i + q) / POLYGON_SAMPLES);
        sag = Math.max(
          sag,
          nearPolygon(
            [Float64Array.of(a[0]!, a[1]!, b[0]!, b[1]!)],
            c[0]!,
            c[1]!,
          ),
        );
      }
    }
  }
  return sag;
}

/** A face as the queries use it. */
interface FaceData {
  readonly face: number;
  readonly surface: number;
  readonly kind: SurfaceKind;
  readonly trim: FaceTrim;
  /** The largest tolerance of the edges around the face, m. */
  readonly edgeTolerance: number;
  /** The face's pcurve segments in curves2, and the most (u, v) distance a trim polygon's chord lies from its pcurve (a trimmed face only). */
  readonly pcurves: readonly number[];
  readonly sag: number;
  /** Its items in the hierarchy. */
  readonly items: number[];
}

/** A face (analytic) or a part of a patch under a face, in the hierarchy. */
interface Item {
  readonly face: number;
  readonly part?: PatchPart;
  /** The patch's domain: u0, u1, v0, v1. */
  readonly domain?: readonly [number, number, number, number];
}

/** A point of the form's surface near another, for the closest-point queries. */
interface Candidate {
  readonly kind: EntityKind;
  readonly index: number;
  readonly distance: number;
  readonly position: ArrayLike<number>;
  readonly route: string;
  readonly uv?: readonly [number, number];
  readonly t?: number;
  readonly surface?: number;
  readonly edge?: number;
  readonly vertex?: number;
  readonly face?: number;
}

interface Prepared {
  readonly faces: Array<FaceData | undefined>;
  readonly items: Item[];
  readonly faceTree: Bvh;
  readonly edgeTree: Bvh;
  readonly vertexTree: Bvh;
  /** Per curve segment in the edge tree: its edge, and its index in curves3. */
  readonly segmentEdge: Uint32Array;
  readonly segmentCurve: Uint32Array;
  readonly maxSurfaceError: number;
}

/** `form` as a geometry: kind `"brep"`, exact up to the model tolerance and the surfaces' representation error. */
export function brepGeometry(
  form: BrepForm,
  options: BrepGeometryOptions = {},
): BrepGeometry {
  const matrix = options.matrix ?? IDENTITY;
  const scale = Math.hypot(matrix[0]!, matrix[1]!, matrix[2]!);
  const modelTolerance = options.modelTolerance ?? MODEL_TOLERANCE;
  if (!(modelTolerance >= 0 && Number.isFinite(modelTolerance))) {
    throw new Error(
      "brepGeometry: modelTolerance must be a finite number of metres, 0 or more",
    );
  }
  const columns = [0, 4, 8].map((c) => [
    matrix[c]!,
    matrix[c + 1]!,
    matrix[c + 2]!,
  ]);
  const similar = columns.every(
    (a, i) =>
      Math.abs(dot(a, a) - scale * scale) <= 1e-9 * scale * scale &&
      columns.every(
        (b, j) => j <= i || Math.abs(dot(a, b)) <= 1e-9 * scale * scale,
      ),
  );
  if (!(scale > 0 && similar)) {
    throw new Error(
      "brepGeometry: the matrix must be a rotation, a translation and a uniform scale",
    );
  }
  const scale2 = scale * scale;
  const defaultOrigin: V3 = [
    options.origin?.[0] ?? 0,
    options.origin?.[1] ?? 0,
    options.origin?.[2] ?? 0,
  ];
  const originOf = (o: ArrayLike<number> | undefined): V3 =>
    o ? [o[0]!, o[1]!, o[2]!] : defaultOrigin;

  /** A placed point in the form's coordinates: the translation is taken off relative to the origin before the turn. */
  const toLocal = (p: ArrayLike<number>, o: V3): V3 => {
    const x = p[0]! - o[0] - (matrix[12]! - o[0]);
    const y = p[1]! - o[1] - (matrix[13]! - o[1]);
    const z = p[2]! - o[2] - (matrix[14]! - o[2]);
    return [
      (matrix[0]! * x + matrix[1]! * y + matrix[2]! * z) / scale2,
      (matrix[4]! * x + matrix[5]! * y + matrix[6]! * z) / scale2,
      (matrix[8]! * x + matrix[9]! * y + matrix[10]! * z) / scale2,
    ];
  };
  const toPlaced = (l: ArrayLike<number>, o: V3): Float64Array =>
    Float64Array.from(
      [0, 1, 2],
      (i) =>
        o[i]! +
        (matrix[12 + i]! - o[i]!) +
        l[0]! * matrix[i]! +
        l[1]! * matrix[4 + i]! +
        l[2]! * matrix[8 + i]!,
    );
  const directionToPlaced = (n: ArrayLike<number>): Float64Array =>
    Float64Array.from(
      [0, 1, 2],
      (i) =>
        (n[0]! * matrix[i]! + n[1]! * matrix[4 + i]! + n[2]! * matrix[8 + i]!) /
        scale,
    );

  /** The accuracy of an answer, in placed metres: the composed terms, with the route. */
  const accuracyOf = (
    route: string,
    terms: {
      readonly surface?: number;
      readonly edge?: number;
      readonly vertex?: number;
      readonly exact?: boolean;
      readonly extra?: string;
    } = {},
  ): GeometryAccuracy => {
    const surface = terms.surface ?? 0;
    const edge = terms.edge ?? 0;
    const vertex = terms.vertex ?? 0;
    const parts = [`model ${metres(modelTolerance * scale)}`];
    if (surface > 0) {
      parts.push(`surface ${metres(surface * scale)}`);
    }
    if (edge > 0) {
      parts.push(`edge ${metres(edge * scale)}`);
    }
    if (vertex > 0) {
      parts.push(`vertex ${metres(vertex * scale)}`);
    }
    return {
      meters: (modelTolerance + surface + edge + vertex) * scale,
      exact: terms.exact ?? true,
      note: `${route}; ${parts.join(" + ")}${terms.extra ? `; ${terms.extra}` : ""}`,
      route,
    };
  };

  // Built on the first query that needs it.
  let prepared: Prepared | undefined;
  const prepare = (): Prepared => {
    if (prepared) {
      return prepared;
    }
    const faceCount = form.faceSurface.length;
    const faces: Array<FaceData | undefined> = [];
    const items: Item[] = [];
    const boxes: number[] = [];
    for (let face = 0; face < faceCount; face++) {
      const trim = faceTrim(form, face);
      if (!trim) {
        faces.push(undefined);
        continue;
      }
      const surface = form.faceSurface[face]!;
      const kind = form.surfaceKind[surface] as SurfaceKind;
      let edgeTolerance = 0;
      const pcurves: number[] = [];
      const firstLoop = form.faceLoops[face * 2]!;
      for (
        let l = firstLoop;
        l < firstLoop + form.faceLoops[face * 2 + 1]!;
        l++
      ) {
        const firstUse = form.loopUses[l * 2]!;
        for (let u = firstUse; u < firstUse + form.loopUses[l * 2 + 1]!; u++) {
          edgeTolerance = Math.max(
            edgeTolerance,
            form.edgeTolerance[form.useEdge[u]!]!,
          );
          for (
            let g = form.usePcurve[u * 2]!;
            g < form.usePcurve[u * 2]! + form.usePcurve[u * 2 + 1]!;
            g++
          ) {
            pcurves.push(g);
          }
        }
      }
      const data: FaceData = {
        face,
        surface,
        kind,
        trim,
        edgeTolerance,
        pcurves,
        sag: trim.trimmed ? polygonSag(form, pcurves) : 0,
        items: [],
      };
      faces.push(data);
      const [u0, u1, v0, v1] = trim.domain;
      if (kind !== SurfaceKind.Bezier) {
        const box = analyticBounds(form, surface, trim.domain);
        data.items.push(items.length);
        items.push({ face });
        boxes.push(...box.min, ...box.max);
        continue;
      }
      const first = form.surfacePatches[surface * 2]!;
      const count = form.surfacePatches[surface * 2 + 1]!;
      for (let patch = first; patch < first + count; patch++) {
        const d = form.patchDomain;
        const domain = [
          d[patch * 4]!,
          d[patch * 4 + 1]!,
          d[patch * 4 + 2]!,
          d[patch * 4 + 3]!,
        ] as const;
        const width = domain[1] - domain[0];
        const height = domain[3] - domain[2];
        const eps = 1e-9;
        const lo = Math.max(domain[0], u0);
        const hi = Math.min(domain[1], u1);
        const vlo = Math.max(domain[2], v0);
        const vhi = Math.min(domain[3], v1);
        if (!(hi >= lo - eps && vhi >= vlo - eps && width > 0 && height > 0)) {
          continue;
        }
        const part = patchPart(form, patch, [
          Math.max(0, (lo - domain[0]) / width),
          Math.min(1, (hi - domain[0]) / width),
          Math.max(0, (vlo - domain[2]) / height),
          Math.min(1, (vhi - domain[2]) / height),
        ]);
        data.items.push(items.length);
        items.push({ face, part, domain });
        boxes.push(...netBox(part.net));
      }
    }
    // Slack for the float64 round-off of the boxes.
    for (let i = 0; i < boxes.length; i += 6) {
      const size = Math.hypot(
        boxes[i + 3]! - boxes[i]!,
        boxes[i + 4]! - boxes[i + 1]!,
        boxes[i + 5]! - boxes[i + 2]!,
      );
      const pad = 1e-9 * (1 + size);
      for (let k = 0; k < 3; k++) {
        boxes[i + k] = boxes[i + k]! - pad;
        boxes[i + 3 + k] = boxes[i + 3 + k]! + pad;
      }
    }
    const faceBoxes = Float64Array.from(boxes);

    // Edge curve segments.
    const segmentBoxes: number[] = [];
    const segmentEdge: number[] = [];
    const segmentCurve: number[] = [];
    const edges = form.edgeVertices.length / 2;
    const curves = form.curves3;
    for (let e = 0; e < edges; e++) {
      const first = form.edgeCurve[e * 2]!;
      for (let g = first; g < first + form.edgeCurve[e * 2 + 1]!; g++) {
        const box = [
          Infinity,
          Infinity,
          Infinity,
          -Infinity,
          -Infinity,
          -Infinity,
        ];
        const start = curves.first[g]!;
        for (let i = 0; i <= curves.degree[g]!; i++) {
          const w = curves.points[(start + i) * 4 + 3]!;
          for (let k = 0; k < 3; k++) {
            const x = curves.points[(start + i) * 4 + k]! / w;
            box[k] = Math.min(box[k]!, x);
            box[3 + k] = Math.max(box[3 + k]!, x);
          }
        }
        const pad =
          1e-9 *
          (1 +
            Math.hypot(
              box[3]! - box[0]!,
              box[4]! - box[1]!,
              box[5]! - box[2]!,
            ));
        for (let k = 0; k < 3; k++) {
          box[k] = box[k]! - pad;
          box[3 + k] = box[3 + k]! + pad;
        }
        segmentBoxes.push(...box);
        segmentEdge.push(e);
        segmentCurve.push(g);
      }
    }
    const vertices = form.vertexPosition.length / 3;
    const vertexBoxes = new Float64Array(vertices * 6);
    for (let v = 0; v < vertices; v++) {
      for (let k = 0; k < 3; k++) {
        vertexBoxes[v * 6 + k] = form.vertexPosition[v * 3 + k]!;
        vertexBoxes[v * 6 + 3 + k] = form.vertexPosition[v * 3 + k]!;
      }
    }
    let maxSurfaceError = 0;
    for (const e of form.surfaceError) {
      maxSurfaceError = Math.max(maxSurfaceError, e);
    }
    prepared = {
      faces,
      items,
      faceTree: new Bvh(faceBoxes),
      edgeTree: new Bvh(Float64Array.from(segmentBoxes)),
      vertexTree: new Bvh(vertexBoxes),
      segmentEdge: Uint32Array.from(segmentEdge),
      segmentCurve: Uint32Array.from(segmentCurve),
      maxSurfaceError,
    };
    return prepared;
  };

  // Faces, in (u, v).

  /**
   * Whether (u, v) is inside the face's trim. The trim polygon decides, except
   * within twice its sag of a pcurve, where the pcurves themselves do: a
   * loop keeps its face on the left, so the sign of the cross product of the
   * nearest pcurve's tangent and the offset says which side the point is on.
   * An untrimmed face's box takes a hair of slack at its seams.
   */
  const inFace = (data: FaceData, u: number, v: number): boolean => {
    const [u0, u1, v0, v1] = data.trim.domain;
    if (data.trim.trimmed) {
      const polygon = data.trim.contains(u, v);
      const guard = 2 * data.sag + 1e-12;
      if (!(nearPolygon(data.trim.loops, u, v) <= guard)) {
        return polygon;
      }
      let best: CurvePoint | undefined;
      for (const g of data.pcurves) {
        const found = nearestOnCurve(form.curves2, 2, g, [u, v]);
        if (!best || found.distance < best.distance) {
          best = found;
        }
      }
      // At a corner, or on the curve itself, the polygon's verdict stands.
      if (!best || best.tau <= 1e-9 || best.tau >= 1 - 1e-9) {
        return polygon;
      }
      const side =
        best.tangent[0]! * (v - best.position[1]!) -
        best.tangent[1]! * (u - best.position[0]!);
      return side === 0 ? polygon : side > 0;
    }
    const eu = 1e-9 * Math.max(1, u1 - u0);
    const ev = 1e-9 * Math.max(1, v1 - v0);
    return u >= u0 - eu && u <= u1 + eu && v >= v0 - ev && v <= v1 + ev;
  };

  /** (u, v) of an analytic surface moved by whole turns into the face's domain, or undefined when no turn puts it there. */
  const wrapUv = (
    data: FaceData,
    u: number,
    v: number,
  ): [number, number] | undefined => {
    const [u0, u1, v0, v1] = data.trim.domain;
    const eu = 1e-9 * Math.max(1, u1 - u0);
    const ev = 1e-9 * Math.max(1, v1 - v0);
    const wu = periodicU(data.kind)
      ? wrapAngle(u, u0, u1, eu)
      : u >= u0 - eu && u <= u1 + eu
        ? Math.min(Math.max(u, u0), u1)
        : undefined;
    const wv = periodicV(data.kind)
      ? wrapAngle(v, v0, v1, ev)
      : v >= v0 - ev && v <= v1 + ev
        ? Math.min(Math.max(v, v0), v1)
        : undefined;
    return wu === undefined || wv === undefined ? undefined : [wu, wv];
  };

  /** The nearest (u, v) in the face's domain box, for a point to be projected onto the face's surface wherever it falls. */
  const clampUv = (data: FaceData, u: number, v: number): [number, number] => {
    const [u0, u1, v0, v1] = data.trim.domain;
    const fit = (
      x: number,
      lo: number,
      hi: number,
      periodic: boolean,
    ): number => {
      const wrapped = periodic ? wrapAngle(x, lo, hi, 0) : undefined;
      if (wrapped !== undefined) {
        return wrapped;
      }
      if (!periodic) {
        return Math.min(Math.max(x, lo), hi);
      }
      // The end whose angle is nearer.
      return Math.abs(Math.sin((x - lo) / 2)) <=
        Math.abs(Math.sin((x - hi) / 2))
        ? lo
        : hi;
    };
    return [
      fit(u, u0, u1, periodicU(data.kind)),
      fit(v, v0, v1, periodicV(data.kind)),
    ];
  };

  const faceAccuracy = (route: string, data: FaceData): GeometryAccuracy =>
    accuracyOf(route, {
      surface: form.surfaceError[data.surface]!,
      edge: data.edgeTolerance,
    });

  const faceRoute = (data: FaceData): string =>
    data.kind === SurfaceKind.Bezier
      ? PATCH_ROUTE
      : `closed form, ${KIND_NAMES[data.kind]}`;

  /** The face's outward unit normal, or a stand-in where the surface has none (a pole). */
  const outward = (
    data: FaceData,
    u: number,
    v: number,
    stand: ArrayLike<number>,
  ): V3 => {
    const n = faceNormal(form, data.face, u, v);
    if (n) {
      return [n[0]!, n[1]!, n[2]!];
    }
    const length = Math.hypot(stand[0]!, stand[1]!, stand[2]!);
    return length > 0
      ? [stand[0]! / length, stand[1]! / length, stand[2]! / length]
      : [0, 0, 1];
  };

  // Rays.

  interface RayFound {
    readonly t: number;
    readonly face: number;
    readonly u: number;
    readonly v: number;
  }

  /** The nearest face crossing of the segment `from + t·d` in the form's coordinates. */
  const cast = (
    from: V3,
    d: V3,
    tMin: number,
    tMax: number,
    anyHit: boolean,
  ): { found: RayFound | undefined; unsettled: number } => {
    const p = prepare();
    let found: RayFound | undefined;
    let limit = tMax;
    let unsettled = 0;
    p.faceTree.ray(
      from,
      d,
      tMin,
      () => limit,
      (index) => {
        const item = p.items[index]!;
        const data = p.faces[item.face]!;
        if (!item.part) {
          for (const t of rayRoots(form, data.surface, from, d, tMin, limit)) {
            if (found && !(t < found.t)) {
              break;
            }
            const point: V3 = [
              from[0] + t * d[0],
              from[1] + t * d[1],
              from[2] + t * d[2],
            ];
            const [u, v] = surfaceUv(form, data.surface, point);
            const uv = wrapUv(data, u, v);
            if (!uv || !inFace(data, uv[0], uv[1])) {
              continue;
            }
            found = { t, face: item.face, u: uv[0], v: uv[1] };
            limit = t;
            return anyHit;
          }
          return false;
        }
        const [u0, u1, v0, v1] = item.domain!;
        const result = rayPatch(form, item.part, from, d, tMin, limit, (s, t) =>
          inFace(data, u0 + s * (u1 - u0), v0 + t * (v1 - v0)),
        );
        unsettled += result.unsettled;
        if (result.hit && (!found || result.hit.t < found.t)) {
          found = {
            t: result.hit.t,
            face: item.face,
            u: u0 + result.hit.s * (u1 - u0),
            v: v0 + result.hit.tt * (v1 - v0),
          };
          limit = found.t;
          return anyHit;
        }
        return false;
      },
    );
    return { found, unsettled };
  };

  const rayHit = (ray: QueryRay, o: RayHitOptions = {}): GeometryRayAnswer => {
    const p = prepare();
    const origin = originOf(o.origin);
    const from = toLocal(ray.from, origin);
    const d = sub(toLocal(ray.to, origin), from);
    const none = accuracyOf("rays over the b-rep's faces", {
      surface: p.maxSurfaceError,
    });
    if (!(dot(d, d) > 0 && Number.isFinite(dot(d, d)))) {
      return { verdict: "miss", accuracy: none };
    }
    const { found, unsettled } = cast(
      from,
      d,
      o.tMin ?? 0,
      o.tMax ?? 1,
      o.anyHit === true,
    );
    if (!found) {
      return unsettled > 0
        ? {
            verdict: "unknown",
            reason: "notConverged",
            accuracy: { ...none, exact: false },
          }
        : { verdict: "miss", accuracy: none };
    }
    const data = p.faces[found.face]!;
    const point: V3 = [
      from[0] + found.t * d[0],
      from[1] + found.t * d[1],
      from[2] + found.t * d[2],
    ];
    const n = outward(data, found.u, found.v, [-d[0], -d[1], -d[2]]);
    const flip = dot(n, d) > 0 ? -1 : 1;
    return {
      verdict: "hit",
      hit: {
        t: found.t,
        position: toPlaced(point, origin),
        normal: directionToPlaced([flip * n[0], flip * n[1], flip * n[2]]),
        entity: { kind: "face", index: found.face },
        uv: [found.u, found.v],
        accuracy: faceAccuracy(faceRoute(data), data),
      },
    };
  };

  // Closest points.

  /** The nearest points of a face's items to `p`, offered as they are found. */
  const faceCandidates = (
    index: number,
    p: ArrayLike<number>,
    bound: () => number,
    ignoreTrim: boolean,
    offer: (c: Candidate) => void,
  ): void => {
    const pr = prepare();
    const item = pr.items[index]!;
    const data = pr.faces[item.face]!;
    if (!item.part) {
      const [u0, u1] = data.trim.domain;
      for (const [cu, cv] of nearestCandidates(
        form,
        data.surface,
        p,
        (u0 + u1) / 2,
      )) {
        const uv =
          wrapUv(data, cu, cv) ??
          (ignoreTrim ? clampUv(data, cu, cv) : undefined);
        if (!uv || (!ignoreTrim && !inFace(data, uv[0], uv[1]))) {
          continue;
        }
        const position = evaluateSurface(
          form,
          data.surface,
          uv[0],
          uv[1],
        ).position;
        offer({
          kind: "face",
          index: data.face,
          face: data.face,
          surface: data.surface,
          distance: distance3(position, p),
          position,
          uv,
          route: faceRoute(data),
        });
      }
      return;
    }
    const [u0, u1, v0, v1] = item.domain!;
    nearestPatch(
      form,
      item.part,
      p,
      bound,
      (s, t) =>
        ignoreTrim || inFace(data, u0 + s * (u1 - u0), v0 + t * (v1 - v0)),
      (point) =>
        offer({
          kind: "face",
          index: data.face,
          face: data.face,
          surface: data.surface,
          distance: point.distance,
          position: point.position,
          uv: [u0 + point.s * (u1 - u0), v0 + point.t * (v1 - v0)],
          route: PATCH_ROUTE,
        }),
    );
  };

  /** The nearest point of one face to `p`; `ignoreTrim` takes the face's whole surface over its domain box. */
  const faceNearest = (
    face: number,
    p: ArrayLike<number>,
    ignoreTrim: boolean,
  ): Candidate | undefined => {
    const data = prepare().faces[face];
    if (!data) {
      return undefined;
    }
    let best: Candidate | undefined;
    const bound = () => best?.distance ?? Infinity;
    const offer = (c: Candidate): void => {
      if (!best || c.distance < best.distance) {
        best = c;
      }
    };
    for (const item of data.items) {
      faceCandidates(item, p, bound, ignoreTrim, offer);
    }
    return best;
  };

  let topology:
    | {
        readonly edgeFaces: number[][];
        readonly vertexFaces: number[][];
        readonly faceVertices: number[][];
      }
    | undefined;
  const topologyOf = (): NonNullable<typeof topology> => {
    if (topology) {
      return topology;
    }
    const edges = form.edgeVertices.length / 2;
    const vertices = form.vertexPosition.length / 3;
    const edgeFaces: number[][] = Array.from({ length: edges }, () => []);
    const vertexFaces: number[][] = Array.from({ length: vertices }, () => []);
    const faceVertices: number[][] = [];
    for (let face = 0; face < form.faceSurface.length; face++) {
      const seen = new Set<number>();
      const firstLoop = form.faceLoops[face * 2]!;
      for (
        let l = firstLoop;
        l < firstLoop + form.faceLoops[face * 2 + 1]!;
        l++
      ) {
        const firstUse = form.loopUses[l * 2]!;
        for (let u = firstUse; u < firstUse + form.loopUses[l * 2 + 1]!; u++) {
          const e = form.useEdge[u]!;
          if (!edgeFaces[e]!.includes(face)) {
            edgeFaces[e]!.push(face);
          }
          for (const v of [
            form.edgeVertices[e * 2]!,
            form.edgeVertices[e * 2 + 1]!,
          ]) {
            seen.add(v);
            if (!vertexFaces[v]!.includes(face)) {
              vertexFaces[v]!.push(face);
            }
          }
        }
      }
      faceVertices.push([...seen]);
    }
    topology = { edgeFaces, vertexFaces, faceVertices };
    return topology;
  };

  /** The nearest point to `p` (in the form's coordinates) of the kinds wanted, within `bound0`. */
  const closestLocal = (
    p: V3,
    wantFace: boolean,
    wantEdge: boolean,
    wantVertex: boolean,
    bound0: number,
  ): Candidate | undefined => {
    const pr = prepare();
    let best: Candidate | undefined;
    const limit = () => best?.distance ?? bound0;
    const offer = (c: Candidate): void => {
      if (c.distance <= bound0 && (!best || c.distance < best.distance)) {
        best = c;
      }
    };
    if (wantFace) {
      pr.faceTree.nearest(p, limit, (index) =>
        faceCandidates(index, p, limit, false, offer),
      );
    }
    if (wantFace || wantEdge) {
      const adjacent = topologyOf().edgeFaces;
      pr.edgeTree.nearest(p, limit, (segment) => {
        const edge = pr.segmentEdge[segment]!;
        const found = nearestOnCurve(
          form.curves3,
          3,
          pr.segmentCurve[segment]!,
          p,
        );
        if (found.distance > limit()) {
          return;
        }
        const count = form.edgeCurve[edge * 2 + 1]!;
        const k = pr.segmentCurve[segment]! - form.edgeCurve[edge * 2]!;
        const atStart = k === 0 && found.tau === 0;
        const atEnd = k === count - 1 && found.tau === 1;
        if (wantVertex && (atStart || atEnd)) {
          const vertex = form.edgeVertices[edge * 2 + (atEnd ? 1 : 0)]!;
          const position = form.vertexPosition.subarray(
            vertex * 3,
            vertex * 3 + 3,
          );
          offer({
            kind: "vertex",
            index: vertex,
            vertex,
            edge,
            distance: distance3(position, p),
            position,
            route: "vertex position",
          });
        } else if (wantEdge) {
          offer({
            kind: "edge",
            index: edge,
            edge,
            distance: found.distance,
            position: found.position,
            t: (k + found.tau) / count,
            route: found.closedForm ? "closed form, line edge" : EDGE_ROUTE,
          });
        } else {
          // Only faces were asked for: the point is on a face the edge borders.
          const face = adjacent[edge]![0];
          const onFace =
            face === undefined
              ? undefined
              : faceNearest(face, found.position, true);
          if (onFace) {
            offer({ ...onFace, distance: distance3(onFace.position, p) });
          }
        }
      });
    }
    if (wantVertex) {
      pr.vertexTree.nearest(p, limit, (vertex) => {
        const position = form.vertexPosition.subarray(
          vertex * 3,
          vertex * 3 + 3,
        );
        offer({
          kind: "vertex",
          index: vertex,
          vertex,
          distance: distance3(position, p),
          position,
          route: "vertex position",
        });
      });
    }
    return best;
  };

  const closestPoint = (
    point: ArrayLike<number>,
    o: ClosestPointOptions = {},
  ): ClosestPoint | undefined => {
    const kinds = o.kinds ?? ["face", "edge", "vertex"];
    const wantFace = kinds.includes("face");
    const wantEdge = kinds.includes("edge");
    const wantVertex = kinds.includes("vertex");
    if (!wantFace && !wantEdge && !wantVertex) {
      return undefined;
    }
    const origin = originOf(o.origin);
    const p = toLocal(point, origin);
    const found = closestLocal(
      p,
      wantFace,
      wantEdge,
      wantVertex,
      o.maxDistance === undefined ? Infinity : o.maxDistance / scale,
    );
    if (!found) {
      return undefined;
    }
    const position = toPlaced(found.position, origin);
    const distance = found.distance * scale;
    const pr = prepare();
    if (found.kind === "face") {
      const data = pr.faces[found.face!]!;
      const [u, v] = found.uv!;
      const to = sub(p, found.position);
      const n = outward(data, u, v, to);
      const flip = dot(n, to) < 0 ? -1 : 1;
      return {
        position,
        distance,
        entity: { kind: "face", index: found.face! },
        normal: directionToPlaced([flip * n[0], flip * n[1], flip * n[2]]),
        uv: [u, v],
        accuracy: faceAccuracy(found.route, data),
      };
    }
    if (found.kind === "edge") {
      return {
        position,
        distance,
        entity: { kind: "edge", index: found.edge! },
        t: found.t,
        accuracy: accuracyOf(found.route, {
          edge: form.edgeTolerance[found.edge!]!,
        }),
      };
    }
    return {
      position,
      distance,
      entity: { kind: "vertex", index: found.vertex! },
      accuracy: accuracyOf(found.route, {
        vertex: form.vertexTolerance[found.vertex!]!,
      }),
    };
  };

  const segmentDistance = (
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    o: { readonly origin?: ArrayLike<number> } = {},
  ): SegmentDistance => {
    const pr = prepare();
    const origin = originOf(o.origin);
    const a = toLocal(from, origin);
    const d = sub(toLocal(to, origin), a);
    const near = accuracyOf("closest points", { surface: pr.maxSurfaceError });
    if (pr.faceTree.empty) {
      return { distance: Infinity, accuracy: near };
    }
    const length = Math.hypot(d[0], d[1], d[2]);
    if (length > 0 && cast(a, d, 0, 1, true).found) {
      return {
        distance: 0,
        accuracy: accuracyOf("ray crossing", { surface: pr.maxSurfaceError }),
      };
    }
    const at = (t: number): number =>
      closestLocal(
        [a[0] + t * d[0], a[1] + t * d[1], a[2] + t * d[2]],
        true,
        false,
        false,
        Infinity,
      )?.distance ?? Infinity;
    const SAMPLES = 32;
    const values = Array.from({ length: SAMPLES + 1 }, (_, i) =>
      at(i / SAMPLES),
    );
    let best = Math.min(...values);
    if (length > 0) {
      const golden = (Math.sqrt(5) - 1) / 2;
      for (let i = 1; i < SAMPLES; i++) {
        if (!(values[i]! <= values[i - 1]! && values[i]! <= values[i + 1]!)) {
          continue;
        }
        let lo = (i - 1) / SAMPLES;
        let hi = (i + 1) / SAMPLES;
        let x1 = hi - golden * (hi - lo);
        let x2 = lo + golden * (hi - lo);
        let f1 = at(x1);
        let f2 = at(x2);
        for (let k = 0; k < 40; k++) {
          if (f1 < f2) {
            hi = x2;
            x2 = x1;
            f2 = f1;
            x1 = hi - golden * (hi - lo);
            f1 = at(x1);
          } else {
            lo = x1;
            x1 = x2;
            f1 = f2;
            x2 = lo + golden * (hi - lo);
            f2 = at(x2);
          }
        }
        best = Math.min(best, f1, f2);
      }
    }
    return {
      distance: best * scale,
      accuracy: accuracyOf("closest points along the segment", {
        surface: pr.maxSurfaceError,
        exact: length === 0,
        extra:
          "sampled at 33 points and refined: a dip narrower than a 32nd of the segment can be missed",
      }),
    };
  };

  // Bounds, entities and display.

  const bounds = (): GeometryBounds => {
    const box = formBounds(form);
    const min = new Float64Array([Infinity, Infinity, Infinity]);
    const max = new Float64Array([-Infinity, -Infinity, -Infinity]);
    for (let c = 0; c < 8; c++) {
      const corner = [0, 1, 2].map((k) =>
        (c >> k) & 1 ? box.max[k]! : box.min[k]!,
      );
      const placed = toPlaced(corner, defaultOrigin);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k]!, placed[k]!);
        max[k] = Math.max(max[k]!, placed[k]!);
      }
    }
    const diagonal = Math.hypot(
      box.max[0] - box.min[0],
      box.max[1] - box.min[1],
      box.max[2] - box.min[2],
    );
    return {
      min,
      max,
      accuracy: accuracyOf("form bounds", {
        surface: prepare().maxSurfaceError,
        exact: false,
        // formBounds' own share of the part's size, 0.1%.
        extra: `the box holds the faces within ${metres(1e-3 * diagonal * scale)} (0.1% of the part's size); a turned part has the box of the turned box`,
      }),
    };
  };

  const entity = (ref: EntityRef): EntityInfo | undefined => {
    if (!Number.isInteger(ref.index) || ref.index < 0) {
      return undefined;
    }
    const topo = topologyOf();
    const vertex = (v: number): Float64Array =>
      toPlaced(form.vertexPosition.subarray(v * 3, v * 3 + 3), defaultOrigin);
    const face = (f: number): EntityRef => ({ kind: "face", index: f });
    if (ref.kind === "face") {
      if (ref.index >= form.faceSurface.length) {
        return undefined;
      }
      return {
        ref: face(ref.index),
        points: topo.faceVertices[ref.index]!.map(vertex),
        faces: [face(ref.index)],
      };
    }
    if (ref.kind === "edge") {
      if (ref.index >= form.edgeVertices.length / 2) {
        return undefined;
      }
      return {
        ref: { kind: "edge", index: ref.index },
        points: [
          vertex(form.edgeVertices[ref.index * 2]!),
          vertex(form.edgeVertices[ref.index * 2 + 1]!),
        ],
        faces: topo.edgeFaces[ref.index]!.map(face),
      };
    }
    if (ref.index >= form.vertexPosition.length / 3) {
      return undefined;
    }
    return {
      ref: { kind: "vertex", index: ref.index },
      points: [vertex(ref.index)],
      faces: topo.vertexFaces[ref.index]!.map(face),
    };
  };

  let displayed: { tolerance: number; mesh: DisplayMesh } | undefined;
  const display = (tolerance: number): DisplayMesh => {
    if (displayed?.tolerance === tolerance) {
      return displayed.mesh;
    }
    const mesh = tessellateBrep(form, { tolerance: tolerance / scale });
    const placed = Float64Array.from(matrix);
    // The mesh's positions are relative to its own origin, in the form's coordinates.
    for (let i = 0; i < 3; i++) {
      placed[12 + i] =
        matrix[12 + i]! +
        matrix[i]! * mesh.origin[0]! +
        matrix[4 + i]! * mesh.origin[1]! +
        matrix[8 + i]! * mesh.origin[2]!;
    }
    const result: DisplayMesh = {
      positions: mesh.faces.positions,
      indices: mesh.faces.indices,
      matrix: placed,
      error: mesh.error * scale,
    };
    displayed = { tolerance, mesh: result };
    return result;
  };

  // Picks.

  const refinePick = (
    face: number,
    hint: PickHint,
  ): RefinedPick | undefined => {
    const data = prepare().faces[face];
    if (!data || (!hint.point && !hint.uv)) {
      return undefined;
    }
    const origin = originOf(hint.origin);
    const target = hint.point ? toLocal(hint.point, origin) : undefined;
    const domain = data.trim.domain;
    let u: number;
    let v: number;
    let position: ArrayLike<number>;
    let route: string;
    if (hint.uv && target) {
      // Newton from the pick's own (u, v).
      const seed =
        periodicU(data.kind) || periodicV(data.kind)
          ? (wrapUv(data, hint.uv[0], hint.uv[1]) ??
            clampUv(data, hint.uv[0], hint.uv[1]))
          : clampUv(data, hint.uv[0], hint.uv[1]);
      const found = nearestNewton(
        (a, b) => evaluateSurface(form, data.surface, a, b),
        target,
        seed,
        domain,
      );
      [u, v, position] = [found.s, found.t, found.position];
      route = `Newton from the pick's (u, v), ${data.kind === SurfaceKind.Bezier ? "Bézier patch" : KIND_NAMES[data.kind]}`;
    } else if (target) {
      const found = faceNearest(face, target, true);
      if (!found) {
        return undefined;
      }
      [u, v] = found.uv!;
      position = found.position;
      route = found.route;
    } else {
      const seed = clampUv(data, hint.uv![0], hint.uv![1]);
      [u, v] = seed;
      position = evaluateSurface(form, data.surface, u, v).position;
      route = "evaluation at the pick's (u, v)";
    }
    const to = target ? sub(target, position) : [0, 0, 0];
    const n = outward(data, u, v, to);
    const flip = target && dot(n, to) < 0 ? -1 : 1;
    return {
      entity: { kind: "face", index: face },
      position: toPlaced(position, origin),
      normal: directionToPlaced([flip * n[0], flip * n[1], flip * n[2]]),
      uv: [u, v],
      inFace: inFace(data, u, v),
      distance: target ? distance3(target, position) * scale : 0,
      accuracy: faceAccuracy(route, data),
    };
  };

  return {
    kind: "brep",
    version: options.version ?? form.version,
    bounds,
    rayHit,
    closestPoint,
    segmentDistance,
    entity,
    display,
    refinePick,
  };
}
