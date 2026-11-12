import type { BrepForm } from "../../src/brep/form.ts";
import {
  cross,
  dot,
  length,
  mad,
  normalize,
  scale,
  sub,
  type V3,
} from "./viewMath.ts";

/**
 * What a face is, in the sample's metres, from the b-rep form's analytic
 * identity (plan §13.33, direct manipulation): its outward normal at a point
 * and how far a point is from its surface. A free-form face has no identity
 * here and answers nothing. Surface kinds are the form's: 0 plane, 1
 * cylinder, 2 cone, 3 sphere, 4 torus.
 */
export type FaceForm = Pick<
  BrepForm,
  | "faceSurface"
  | "faceReversed"
  | "surfaceIdentity"
  | "surfaceFrame"
  | "surfaceParams"
>;

interface Frame {
  o: V3;
  x: V3;
  y: V3;
  z: V3;
  params: [number, number];
}

function frameOf(form: FaceForm, face: number): Frame | undefined {
  const surface = form.faceSurface[face];
  if (surface === undefined) {
    return undefined;
  }
  const f = form.surfaceFrame;
  const at = surface * 9;
  const x: V3 = [f[at + 3]!, f[at + 4]!, f[at + 5]!];
  const y: V3 = [f[at + 6]!, f[at + 7]!, f[at + 8]!];
  return {
    o: [f[at]!, f[at + 1]!, f[at + 2]!],
    x,
    y,
    z: cross(x, y),
    params: [
      form.surfaceParams[surface * 2]!,
      form.surfaceParams[surface * 2 + 1]!,
    ],
  };
}

/** The analytic kind of a face's surface (0 to 4), or undefined for a free-form one. */
export function faceIdentity(form: FaceForm, face: number): number | undefined {
  const surface = form.faceSurface[face];
  const kind =
    surface === undefined ? undefined : form.surfaceIdentity[surface];
  return kind === undefined || kind > 4 ? undefined : kind;
}

/** A point's offset from a cylinder, cone or torus axis frame: along the axis and radially (unit direction and distance). */
function radial(frame: Frame, p: V3) {
  const d = sub(p, frame.o);
  const along = dot(d, frame.z);
  const out = sub(d, scale(frame.z, along));
  const distance = length(out);
  return {
    along,
    distance,
    direction: distance > 1e-12 ? scale(out, 1 / distance) : frame.x,
  };
}

/** The face's outward normal at a point of it (unit), or undefined for a free-form face. */
export function faceNormalAt(
  form: FaceForm,
  face: number,
  p: ArrayLike<number>,
): V3 | undefined {
  const kind = faceIdentity(form, face);
  const frame = frameOf(form, face);
  if (kind === undefined || !frame) {
    return undefined;
  }
  const point: V3 = [p[0]!, p[1]!, p[2]!];
  let n: V3;
  switch (kind) {
    case 0:
      n = frame.z;
      break;
    case 1:
      n = radial(frame, point).direction;
      break;
    case 2: {
      // Along (cos u, sin u, −tan a): outward and down for a cone that widens up.
      n = normalize(
        mad(
          radial(frame, point).direction,
          frame.z,
          -Math.tan(frame.params[1]),
        ),
      );
      break;
    }
    case 3:
      n = normalize(sub(point, frame.o));
      break;
    default: {
      const { direction } = radial(frame, point);
      const ring = mad(frame.o, direction, frame.params[0]);
      n = normalize(sub(point, ring));
    }
  }
  return form.faceReversed[face] ? scale(n, -1) : n;
}

/** How far a point is from the face's whole surface (not only the face): undefined for a free-form face. */
export function surfaceDistance(
  form: FaceForm,
  face: number,
  p: ArrayLike<number>,
): number | undefined {
  const kind = faceIdentity(form, face);
  const frame = frameOf(form, face);
  if (kind === undefined || !frame) {
    return undefined;
  }
  const point: V3 = [p[0]!, p[1]!, p[2]!];
  const d = sub(point, frame.o);
  switch (kind) {
    case 0:
      return Math.abs(dot(d, frame.z));
    case 1:
      return Math.abs(radial(frame, point).distance - frame.params[0]);
    case 2: {
      const { along, distance } = radial(frame, point);
      const on = frame.params[0] + along * Math.tan(frame.params[1]);
      return Math.abs(distance - on) * Math.cos(frame.params[1]);
    }
    case 3:
      return Math.abs(length(d) - frame.params[0]);
    default: {
      const { direction } = radial(frame, point);
      const ring = mad(frame.o, direction, frame.params[0]);
      return Math.abs(length(sub(point, ring)) - frame.params[1]);
    }
  }
}

/** A point's signed distance from a planar face's plane along its outward normal; undefined for any other face. */
export function planeOffset(
  form: FaceForm,
  face: number,
  p: ArrayLike<number>,
): number | undefined {
  const frame = frameOf(form, face);
  if (faceIdentity(form, face) !== 0 || !frame) {
    return undefined;
  }
  const n = form.faceReversed[face] ? scale(frame.z, -1) : frame.z;
  return dot(sub(p as V3, frame.o), n);
}

/** The planes of a form's planar faces, for snapping a face drag to them. */
export function planarFaces(
  form: FaceForm,
): Array<{ face: number; normal: V3; offset: number }> {
  const out: Array<{ face: number; normal: V3; offset: number }> = [];
  for (let face = 0; face < form.faceSurface.length; face++) {
    if (faceIdentity(form, face) !== 0) {
      continue;
    }
    const frame = frameOf(form, face)!;
    const normal = form.faceReversed[face] ? scale(frame.z, -1) : frame.z;
    out.push({ face, normal, offset: dot(frame.o, normal) });
  }
  return out;
}
