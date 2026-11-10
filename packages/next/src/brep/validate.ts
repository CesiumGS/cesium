// A checker for the b-rep render form (overall plan §13.33). It reports what
// is wrong and where, and never throws: a host can run it on a form it did
// not write. Lengths are metres.
import { evaluateCurve2, evaluateCurve3, evaluateSurface } from "./evaluate.ts";
import { SurfaceKind, type BezierCurves, type BrepForm } from "./form.ts";

/** One thing wrong with a form, naming the entity and its index. */
export interface BrepProblem {
  readonly kind:
    | "index"
    | "openLoop"
    | "pcurveOffEdge"
    | "edgeUses"
    | "degenerate"
    | "malformed";
  readonly entity: "surface" | "face" | "loop" | "use" | "edge" | "vertex";
  readonly index: number;
  readonly message: string;
}

/** Slack added to every tolerance, m, so float64 round-off never decides. */
const SLACK = 1e-9;
/** The samples of an edge's 3D curve, per segment, that its polyline joins. */
const EDGE_SAMPLES = 64;
/** Where along a use, from 0 to 1, its pcurve's image is checked. */
const USE_CHECKS = [0, 0.25, 0.5, 0.75, 1];
/** How far a surface's axes may stray from unit length and orthogonal. */
const FRAME_TOLERANCE = 1e-6;

/**
 * Never throws. Checks index ranges and degrees; that each loop closes (each
 * use's pcurve end, through the surface, within the edge's tolerance of the
 * next use's start); that each use's pcurve maps onto its edge's 3D curve
 * within the edge's tolerance (at its two ends and 3 interior points, against
 * 64 samples of the edge curve per segment); and that each edge has 1 or 2
 * uses. Geometry is checked only when every index is in range.
 */
export function validateBrep(form: BrepForm): BrepProblem[] {
  const problems: BrepProblem[] = [];
  try {
    checkIndices(form, problems);
    if (problems.length === 0) {
      checkGeometry(form, problems);
    }
  } catch (error) {
    problems.push({
      kind: "malformed",
      entity: "face",
      index: 0,
      message: `the form could not be read (${String(error)})`,
    });
  }
  return problems;
}

function add(
  problems: BrepProblem[],
  kind: BrepProblem["kind"],
  entity: BrepProblem["entity"],
  index: number,
  message: string,
): void {
  problems.push({ kind, entity, index, message });
}

/** Array lengths, index ranges, degrees and weights. */
function checkIndices(form: BrepForm, out: BrepProblem[]): void {
  const surfaces = form.surfaceKind.length;
  const faces = form.faceSurface.length;
  const patches = form.patchDegree.length / 2;
  const uses = form.useEdge.length;
  const edges = form.edgeVertices.length / 2;
  const vertices = form.vertexPosition.length / 3;
  const loops = form.loopUses.length / 2;

  const lengths: [string, number, number, BrepProblem["entity"]][] = [
    ["surfaceFrame", form.surfaceFrame.length, surfaces * 9, "surface"],
    ["surfaceParams", form.surfaceParams.length, surfaces * 2, "surface"],
    ["surfacePatches", form.surfacePatches.length, surfaces * 2, "surface"],
    ["patchFirst", form.patchFirst.length, patches, "surface"],
    ["patchDomain", form.patchDomain.length, patches * 4, "surface"],
    ["faceReversed", form.faceReversed.length, faces, "face"],
    ["faceLoops", form.faceLoops.length, faces * 2, "face"],
    ["loopUses", form.loopUses.length, Math.floor(loops) * 2, "loop"],
    ["useReversed", form.useReversed.length, uses, "use"],
    ["usePcurve", form.usePcurve.length, uses * 2, "use"],
    ["edgeVertices", form.edgeVertices.length, Math.floor(edges) * 2, "edge"],
    ["edgeCurve", form.edgeCurve.length, edges * 2, "edge"],
    ["edgeTolerance", form.edgeTolerance.length, edges, "edge"],
    [
      "vertexPosition",
      form.vertexPosition.length,
      Math.floor(vertices) * 3,
      "vertex",
    ],
    ["vertexTolerance", form.vertexTolerance.length, vertices, "vertex"],
  ];
  for (const [name, have, want, entity] of lengths) {
    if (have !== want) {
      add(
        out,
        "index",
        entity,
        0,
        `${name} has ${have} entries, expected ${want}`,
      );
    }
  }
  for (const [name, c] of [
    ["curves2", form.curves2],
    ["curves3", form.curves3],
  ] as const) {
    if (c.first.length !== c.degree.length) {
      add(
        out,
        "index",
        "edge",
        0,
        `${name}.first and ${name}.degree differ in length`,
      );
    }
  }
  if (out.length > 0) {
    return;
  }

  // Surfaces.
  for (let s = 0; s < surfaces; s++) {
    const kind = form.surfaceKind[s]!;
    if (kind > SurfaceKind.Bezier) {
      add(out, "index", "surface", s, `surface ${s} has unknown kind ${kind}`);
      continue;
    }
    if (kind !== SurfaceKind.Bezier) {
      continue;
    }
    const first = form.surfacePatches[s * 2]!;
    const count = form.surfacePatches[s * 2 + 1]!;
    if (count < 1 || first + count > patches) {
      add(
        out,
        "index",
        "surface",
        s,
        `surface ${s} names patches ${first}..${first + count} of ${patches}`,
      );
      continue;
    }
    for (let p = first; p < first + count; p++) {
      const du = form.patchDegree[p * 2]!;
      const dv = form.patchDegree[p * 2 + 1]!;
      if (du < 1 || du > 7 || dv < 1 || dv > 7) {
        add(
          out,
          "index",
          "surface",
          s,
          `patch ${p} has degree ${du} by ${dv}, expected 1 to 7`,
        );
        continue;
      }
      const start = form.patchFirst[p]!;
      const end = (start + (du + 1) * (dv + 1)) * 4;
      if (end > form.patchPoints.length) {
        add(out, "index", "surface", s, `patch ${p} reads past patchPoints`);
        continue;
      }
      for (let i = start; i < end / 4; i++) {
        const w = form.patchPoints[i * 4 + 3]!;
        if (!(w > 0)) {
          add(
            out,
            "degenerate",
            "surface",
            s,
            `patch ${p} has a weight of ${w}, expected above 0`,
          );
          break;
        }
      }
      if (
        !(form.patchDomain[p * 4 + 1]! > form.patchDomain[p * 4]!) ||
        !(form.patchDomain[p * 4 + 3]! > form.patchDomain[p * 4 + 2]!)
      ) {
        add(out, "degenerate", "surface", s, `patch ${p} has an empty domain`);
      }
    }
  }

  // Faces and loops.
  for (let f = 0; f < faces; f++) {
    if (form.faceSurface[f]! >= surfaces) {
      add(
        out,
        "index",
        "face",
        f,
        `face ${f} names surface ${form.faceSurface[f]} of ${surfaces}`,
      );
    }
    const first = form.faceLoops[f * 2]!;
    const count = form.faceLoops[f * 2 + 1]!;
    if (count < 1) {
      add(out, "degenerate", "face", f, `face ${f} has no loops`);
    } else if (first + count > loops) {
      add(
        out,
        "index",
        "face",
        f,
        `face ${f} names loops ${first}..${first + count} of ${loops}`,
      );
    }
  }
  for (let l = 0; l < loops; l++) {
    const first = form.loopUses[l * 2]!;
    const count = form.loopUses[l * 2 + 1]!;
    if (count < 1) {
      add(out, "degenerate", "loop", l, `loop ${l} has no uses`);
    } else if (first + count > uses) {
      add(
        out,
        "index",
        "loop",
        l,
        `loop ${l} names uses ${first}..${first + count} of ${uses}`,
      );
    }
  }

  // Uses, edges and their curves.
  for (let u = 0; u < uses; u++) {
    if (form.useEdge[u]! >= edges) {
      add(
        out,
        "index",
        "use",
        u,
        `use ${u} names edge ${form.useEdge[u]} of ${edges}`,
      );
    }
    checkSegments(
      out,
      form.curves2,
      2,
      "use",
      u,
      form.usePcurve[u * 2]!,
      form.usePcurve[u * 2 + 1]!,
    );
  }
  for (let e = 0; e < edges; e++) {
    for (const v of [
      form.edgeVertices[e * 2]!,
      form.edgeVertices[e * 2 + 1]!,
    ]) {
      if (v >= vertices) {
        add(
          out,
          "index",
          "edge",
          e,
          `edge ${e} names vertex ${v} of ${vertices}`,
        );
      }
    }
    checkSegments(
      out,
      form.curves3,
      3,
      "edge",
      e,
      form.edgeCurve[e * 2]!,
      form.edgeCurve[e * 2 + 1]!,
    );
    if (!(form.edgeTolerance[e]! >= 0)) {
      add(
        out,
        "degenerate",
        "edge",
        e,
        `edge ${e} has tolerance ${form.edgeTolerance[e]}, expected 0 or more`,
      );
    }
  }
}

/** A range of curve segments: in range, degree 1 to 3, points present, weights above 0. */
function checkSegments(
  out: BrepProblem[],
  curves: BezierCurves,
  dimension: 2 | 3,
  entity: "use" | "edge",
  index: number,
  first: number,
  count: number,
): void {
  const segments = curves.degree.length;
  if (count < 1) {
    add(
      out,
      "degenerate",
      entity,
      index,
      `${entity} ${index} has no curve segments`,
    );
    return;
  }
  if (first + count > segments) {
    add(
      out,
      "index",
      entity,
      index,
      `${entity} ${index} names segments ${first}..${first + count} of ${segments}`,
    );
    return;
  }
  const comps = dimension + 1;
  for (let s = first; s < first + count; s++) {
    const degree = curves.degree[s]!;
    if (degree < 1 || degree > 3) {
      add(
        out,
        "index",
        entity,
        index,
        `${entity} ${index} has a curve of degree ${degree}, expected 1 to 3`,
      );
      return;
    }
    const start = curves.first[s]!;
    if ((start + degree + 1) * comps > curves.points.length) {
      add(
        out,
        "index",
        entity,
        index,
        `${entity} ${index} reads past the curve points`,
      );
      return;
    }
    for (let i = start; i <= start + degree; i++) {
      if (!(curves.points[i * comps + dimension]! > 0)) {
        add(
          out,
          "degenerate",
          entity,
          index,
          `${entity} ${index} has a curve weight of ${curves.points[i * comps + dimension]}, expected above 0`,
        );
        return;
      }
    }
  }
}

/** Surface axes, loop closure, pcurve images and edge use counts. */
function checkGeometry(form: BrepForm, out: BrepProblem[]): void {
  const edges = form.edgeVertices.length / 2;
  const polylines = new Map<number, Float64Array>();
  const polyline = (edge: number): Float64Array => {
    let line = polylines.get(edge);
    if (!line) {
      line = edgePolyline(form, edge);
      polylines.set(edge, line);
    }
    return line;
  };

  // The surfaces' axes and radii.
  for (let s = 0; s < form.surfaceKind.length; s++) {
    const kind = form.surfaceKind[s]!;
    if (kind === SurfaceKind.Bezier) {
      continue;
    }
    const problem = analyticProblem(form, s);
    if (problem) {
      add(out, "degenerate", "surface", s, problem);
    }
  }

  // The uses' images, loop by loop.
  const faces = form.faceSurface.length;
  for (let f = 0; f < faces; f++) {
    const surface = form.faceSurface[f]!;
    const firstLoop = form.faceLoops[f * 2]!;
    const loopCount = form.faceLoops[f * 2 + 1]!;
    for (let l = firstLoop; l < firstLoop + loopCount; l++) {
      const firstUse = form.loopUses[l * 2]!;
      const useCount = form.loopUses[l * 2 + 1]!;
      for (let k = 0; k < useCount; k++) {
        const use = firstUse + k;
        const next = firstUse + ((k + 1) % useCount);
        const edge = form.useEdge[use]!;
        const tolerance = form.edgeTolerance[edge]! + SLACK;

        // The loop closes: this use's end meets the next use's start.
        const end = image(form, surface, use, 1);
        const start = image(form, surface, next, 0);
        const gap = distance(end, start);
        if (!(gap <= tolerance)) {
          add(
            out,
            "openLoop",
            "loop",
            l,
            `loop ${l} is open between uses ${use} and ${next}: ${gap} m apart, tolerance ${tolerance} m`,
          );
        }

        // The pcurve's image lies on the edge's curve.
        const line = polyline(edge);
        for (const s of USE_CHECKS) {
          const p = image(form, surface, use, s);
          const off = distanceToPolyline(p, line);
          if (!(off <= tolerance)) {
            add(
              out,
              "pcurveOffEdge",
              "use",
              use,
              `use ${use} is ${off} m from edge ${edge} at ${s} of its length, tolerance ${tolerance} m`,
            );
            break;
          }
        }

        // Its two ends meet the right vertices for its direction.
        const reversed = form.useReversed[use] === 1;
        const from = form.edgeVertices[edge * 2 + (reversed ? 1 : 0)]!;
        const to = form.edgeVertices[edge * 2 + (reversed ? 0 : 1)]!;
        const startAt = image(form, surface, use, 0);
        const endAt = image(form, surface, use, 1);
        const startOff = distance(startAt, vertexAt(form, from));
        const endOff = distance(endAt, vertexAt(form, to));
        if (!(startOff <= tolerance) || !(endOff <= tolerance)) {
          add(
            out,
            "pcurveOffEdge",
            "use",
            use,
            `use ${use} misses its vertices: ${startOff} m at its start and ${endOff} m at its end, tolerance ${tolerance} m`,
          );
        }
      }
    }
  }

  // Each edge has 1 or 2 uses, counting only the uses that faces reach.
  const counts = new Uint32Array(edges);
  for (let f = 0; f < faces; f++) {
    const firstLoop = form.faceLoops[f * 2]!;
    for (let l = firstLoop; l < firstLoop + form.faceLoops[f * 2 + 1]!; l++) {
      const firstUse = form.loopUses[l * 2]!;
      for (let k = firstUse; k < firstUse + form.loopUses[l * 2 + 1]!; k++) {
        counts[form.useEdge[k]!]!++;
      }
    }
  }
  for (let e = 0; e < edges; e++) {
    if (counts[e] === 0 || counts[e]! > 2) {
      add(
        out,
        "edgeUses",
        "edge",
        e,
        `edge ${e} has ${counts[e]} uses, expected 1 or 2`,
      );
    }
  }
}

/** A problem with a plane's or a quadric's axes or radii, or undefined. */
function analyticProblem(form: BrepForm, s: number): string | undefined {
  const f = form.surfaceFrame;
  const b = s * 9;
  const x = [f[b + 3]!, f[b + 4]!, f[b + 5]!];
  const y = [f[b + 6]!, f[b + 7]!, f[b + 8]!];
  const dot = (p: number[], q: number[]) =>
    p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!;
  if (
    !(Math.abs(dot(x, x) - 1) <= FRAME_TOLERANCE) ||
    !(Math.abs(dot(y, y) - 1) <= FRAME_TOLERANCE) ||
    !(Math.abs(dot(x, y)) <= FRAME_TOLERANCE)
  ) {
    return `surface ${s} axes are not unit length and orthogonal`;
  }
  const kind = form.surfaceKind[s]!;
  const a = form.surfaceParams[s * 2]!;
  const c = form.surfaceParams[s * 2 + 1]!;
  if (kind === SurfaceKind.Cylinder || kind === SurfaceKind.Sphere) {
    if (!(a > 0)) {
      return `surface ${s} has radius ${a}, expected above 0`;
    }
  } else if (kind === SurfaceKind.Cone) {
    if (!(a >= 0) || !(Math.abs(c) < Math.PI / 2)) {
      return `surface ${s} has radius ${a} and half-angle ${c}, expected a radius of 0 or more and |half-angle| below π/2`;
    }
  } else if (kind === SurfaceKind.Torus) {
    if (!(a > 0) || !(c > 0)) {
      return `surface ${s} has radii ${a} and ${c}, expected above 0`;
    }
  }
  return undefined;
}

/** The surface image, m, of a use's pcurve at s in [0, 1] along the whole use. */
function image(
  form: BrepForm,
  surface: number,
  use: number,
  s: number,
): Float64Array {
  const first = form.usePcurve[use * 2]!;
  const count = form.usePcurve[use * 2 + 1]!;
  const x = s * count;
  const k = Math.min(Math.floor(x), count - 1);
  const uv = evaluateCurve2(form, first + k, x - k).position;
  return evaluateSurface(form, surface, uv[0]!, uv[1]!).position;
}

function vertexAt(form: BrepForm, vertex: number): Float64Array {
  return form.vertexPosition.subarray(vertex * 3, vertex * 3 + 3);
}

/** An edge's curve as a polyline: 64 samples per segment, 3 floats each. */
function edgePolyline(form: BrepForm, edge: number): Float64Array {
  const first = form.edgeCurve[edge * 2]!;
  const count = form.edgeCurve[edge * 2 + 1]!;
  const line = new Float64Array((count * EDGE_SAMPLES + 1) * 3);
  let n = 0;
  for (let s = 0; s < count; s++) {
    // Each segment but the first skips its first sample, shared with the last one's end.
    for (let j = s === 0 ? 0 : 1; j <= EDGE_SAMPLES; j++) {
      line.set(
        evaluateCurve3(form, first + s, j / EDGE_SAMPLES).position,
        n * 3,
      );
      n++;
    }
  }
  return line;
}

function distance(a: Float64Array, b: Float64Array): number {
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
}

/** The distance, m, from a point to a polyline of 3-float points. */
function distanceToPolyline(p: Float64Array, line: Float64Array): number {
  let best = Infinity;
  const n = line.length / 3;
  for (let i = 0; i + 1 < n; i++) {
    const ax = line[i * 3]!;
    const ay = line[i * 3 + 1]!;
    const az = line[i * 3 + 2]!;
    const dx = line[i * 3 + 3]! - ax;
    const dy = line[i * 3 + 4]! - ay;
    const dz = line[i * 3 + 5]! - az;
    const len2 = dx * dx + dy * dy + dz * dz;
    let t =
      len2 > 0
        ? ((p[0]! - ax) * dx + (p[1]! - ay) * dy + (p[2]! - az) * dz) / len2
        : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(
      p[0]! - (ax + t * dx),
      p[1]! - (ay + t * dy),
      p[2]! - (az + t * dz),
    );
    if (d < best) {
      best = d;
    }
  }
  if (n === 1) {
    best = Math.hypot(p[0]! - line[0]!, p[1]! - line[1]!, p[2]! - line[2]!);
  }
  return best;
}
