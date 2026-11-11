// A dense tessellation as the oracle for the b-rep adapter's answers (plan
// §13.33): the tessellator's mesh as a mesh geometry in the form's own
// coordinates, and the checks the adapter's tests share.
import { expect } from "vitest";
import { evaluateSurface } from "../src/brep/evaluate.ts";
import type { BrepForm } from "../src/brep/form.ts";
import { formBounds } from "../src/brep/formBounds.ts";
import { faceTrim, tessellateBrep } from "../src/brep/tessellate.ts";
import { meshGeometry } from "../src/geometry/mesh.ts";
import type { GeometryQueries } from "../src/geometry/query.ts";

/** A seeded generator in [0, 1). */
export function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Float32 positions round to about this at the fixtures' sizes, m. */
export const FLOAT32 = 2e-6;

/**
 * A fine tessellation of a form as a mesh geometry in the form's
 * coordinates: `inner` holds only triangles whose corners are all inside
 * their face's trim (the tessellator's trimmed edge is jagged by a cell,
 * outside the face), and `slack` is how far the whole mesh may be from the
 * form there.
 */
export function meshOf(
  form: BrepForm,
  tolerance = 1e-4,
): {
  inner: GeometryQueries;
  error: number;
  slack: number;
} {
  const mesh = tessellateBrep(form, { tolerance });
  const o = mesh.origin;
  const { positions, indices, uvs, featureIds } = mesh.faces;
  const trims = Array.from({ length: form.faceSurface.length }, (_, f) =>
    faceTrim(form, f),
  );
  const kept: number[] = [];
  let slack = mesh.error;
  for (let t = 0; t < indices.length; t += 3) {
    const corners = [0, 1, 2].map((c) => indices[t + c]!);
    const trim = trims[featureIds[corners[0]!]!]!;
    if (
      !trim.trimmed ||
      corners.every((v) => trim.contains(uvs[v * 2]!, uvs[v * 2 + 1]!))
    ) {
      kept.push(...corners);
    }
    if (trim.trimmed) {
      for (let c = 0; c < 3; c++) {
        const a = corners[c]!;
        const b = corners[(c + 1) % 3]!;
        slack = Math.max(
          slack,
          Math.hypot(
            positions[a * 3]! - positions[b * 3]!,
            positions[a * 3 + 1]! - positions[b * 3 + 1]!,
            positions[a * 3 + 2]! - positions[b * 3 + 2]!,
          ),
        );
      }
    }
  }
  return {
    inner: meshGeometry(
      {
        positions,
        indices: Uint32Array.from(kept),
        matrix: Float64Array.from([
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          o[0]!,
          o[1]!,
          o[2]!,
          1,
        ]),
      },
      { error: mesh.error },
    ),
    error: mesh.error,
    slack,
  };
}

/** What `checkAgainstMesh` found. */
export interface MeshAgreement {
  readonly points: number;
  readonly rays: number;
  readonly hits: number;
  /** Rays the mesh's inner pieces hit and the form did not. */
  readonly missed: number;
  /** Rays whose verdicts agree. */
  readonly agree: number;
  /** Answers on a face whose (u, v) the trim polygon puts outside it: within the polygon's sag of the trim. */
  readonly outside: number;
  /** The mesh's error, and how far its inner pieces may be from the form at a jagged trim, m. */
  readonly error: number;
  readonly slack: number;
}

/**
 * Closest points: no farther than the mesh's inner pieces plus their error,
 * no nearer than its jag allows, and on the face's surface, inside its trim.
 * Rays: hits lie on the ray, on the surface and inside the face's trim, face
 * the ray's start, and mostly agree with the mesh's verdicts.
 */
export function checkAgainstMesh(
  form: BrepForm,
  exact: GeometryQueries,
  { points, rays, seed = 1 }: { points: number; rays: number; seed?: number },
): MeshAgreement {
  const { inner: mesh, error, slack } = meshOf(form);
  const box = formBounds(form);
  const diagonal = Math.hypot(
    box.max[0] - box.min[0],
    box.max[1] - box.min[1],
    box.max[2] - box.min[2],
  );
  const next = random(seed);
  let outside = 0;
  const trims = new Map<number, ReturnType<typeof faceTrim>>();
  const trimOf = (face: number) => {
    if (!trims.has(face)) {
      trims.set(face, faceTrim(form, face));
    }
    return trims.get(face)!;
  };
  for (let i = 0; i < points; i++) {
    const p = [0, 1, 2].map(
      (k) =>
        box.min[k]! -
        0.3 * diagonal +
        next() * (box.max[k]! - box.min[k]! + 0.6 * diagonal),
    );
    const a = exact.closestPoint(p)!;
    const b = mesh.closestPoint(p)!;
    expect(a.distance).toBeLessThanOrEqual(b.distance + error + FLOAT32);
    expect(a.distance).toBeGreaterThanOrEqual(b.distance - slack - FLOAT32);
    expect(a.accuracy.exact).toBe(true);
    if (a.entity.kind === "face") {
      const [u, v] = a.uv!;
      const on = evaluateSurface(
        form,
        form.faceSurface[a.entity.index]!,
        u,
        v,
      ).position;
      expect(
        Math.hypot(
          on[0]! - a.position[0]!,
          on[1]! - a.position[1]!,
          on[2]! - a.position[2]!,
        ),
      ).toBeLessThan(1e-6);
      if (!trimOf(a.entity.index)!.contains(u, v)) {
        outside++;
      }
    }
  }
  let agree = 0;
  let hits = 0;
  let missed = 0;
  for (let i = 0; i < rays; i++) {
    const dir = [next() - 0.5, next() - 0.5, next() - 0.5];
    const length = Math.hypot(...dir) || 1;
    const centre = [0, 1, 2].map((k) => (box.min[k]! + box.max[k]!) / 2);
    const from = centre.map((c, k) => c + (dir[k]! / length) * 1.5 * diagonal);
    const target = [0, 1, 2].map(
      (k) => box.min[k]! + next() * (box.max[k]! - box.min[k]!),
    );
    const to = from.map((f, k) => f + 2 * (target[k]! - f));
    const ray = { from: Float64Array.from(from), to: Float64Array.from(to) };
    const a = exact.rayHit(ray);
    const b = mesh.rayHit(ray);
    expect(a.verdict).not.toBe("unknown");
    if (a.verdict === b.verdict) {
      agree++;
    }
    if (b.verdict === "hit" && a.verdict !== "hit") {
      missed++;
    }
    if (a.verdict !== "hit") {
      continue;
    }
    hits++;
    const hit = a.hit;
    for (let k = 0; k < 3; k++) {
      expect(hit.position[k]!).toBeCloseTo(
        from[k]! + hit.t * (to[k]! - from[k]!),
        6,
      );
    }
    const direction = to.map((x, k) => x - from[k]!);
    expect(
      hit.normal[0]! * direction[0]! +
        hit.normal[1]! * direction[1]! +
        hit.normal[2]! * direction[2]!,
    ).toBeLessThanOrEqual(1e-9);
    expect(Math.hypot(...Array.from(hit.normal))).toBeCloseTo(1, 9);
    expect(
      exact.closestPoint(hit.position, { kinds: ["face"] })!.distance,
    ).toBeLessThan(1e-6);
    if (!trimOf(hit.entity.index)!.contains(...hit.uv!)) {
      outside++;
    }
    expect(mesh.closestPoint(hit.position)!.distance).toBeLessThanOrEqual(
      slack + FLOAT32,
    );
    expect(hit.accuracy.exact).toBe(true);
    expect(hit.accuracy.route).toBeTruthy();
  }
  return { points, rays, hits, missed, agree, outside, error, slack };
}
