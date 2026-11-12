/**
 * The sample's view math, apart from the engine and the page: a camera in
 * the sample's own metres (east, north, up at the site), and what a gizmo's
 * handles need of it. A point's pixel, the ray through a pixel, how many
 * pixels a metre is at a point (so a handle keeps its size on screen), and
 * the closest-point and ray-plane solutions that a drag along an axis or in
 * a plane is made of. Pixels are CSS pixels from the canvas's top-left.
 */
export type V3 = [number, number, number];

export const add = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! + b[0]!,
  a[1]! + b[1]!,
  a[2]! + b[2]!,
];
export const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
export const scale = (a: ArrayLike<number>, s: number): V3 => [
  a[0]! * s,
  a[1]! * s,
  a[2]! * s,
];
export const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
export const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
export const length = (a: ArrayLike<number>): number =>
  Math.hypot(a[0]!, a[1]!, a[2]!);
export const normalize = (a: ArrayLike<number>): V3 => {
  const l = length(a);
  return l > 0 ? scale(a, 1 / l) : [0, 0, 0];
};
/** `a + b·s`. */
export const mad = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  s: number,
): V3 => [a[0]! + b[0]! * s, a[1]! + b[1]! * s, a[2]! + b[2]! * s];

export const AXES: readonly V3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** A camera: where it is and which way it looks, in the sample's frame, with its field of view and the size of the view in pixels. */
export interface Rig {
  eye: V3;
  forward: V3;
  right: V3;
  up: V3;
  /** Tangents of the half field of view, across and up. */
  tanX: number;
  tanY: number;
  width: number;
  height: number;
}

/** A rig from an Earth-fixed camera, as the sample's frame (east, north, up at `origin`) sees it. */
export function makeRig(
  camera: {
    position: ArrayLike<number>;
    direction: ArrayLike<number>;
    up: ArrayLike<number>;
    right: ArrayLike<number>;
  },
  fovy: number,
  width: number,
  height: number,
  origin: ArrayLike<number>,
  /** The frame's east, north and up as Earth-fixed unit vectors. */
  frame: readonly [ArrayLike<number>, ArrayLike<number>, ArrayLike<number>],
): Rig {
  const local = (v: ArrayLike<number>): V3 => [
    dot(v, frame[0]),
    dot(v, frame[1]),
    dot(v, frame[2]),
  ];
  const tanY = Math.tan(fovy / 2);
  return {
    eye: local(sub(camera.position, origin)),
    forward: local(camera.direction),
    right: local(camera.right),
    up: local(camera.up),
    tanX: (tanY * width) / Math.max(1, height),
    tanY,
    width,
    height,
  };
}

/** Where a point shows, pixels and its distance along the view; undefined when it is behind the camera. */
export function project(
  rig: Rig,
  p: ArrayLike<number>,
): { x: number; y: number; depth: number } | undefined {
  const d = sub(p, rig.eye);
  const depth = dot(d, rig.forward);
  if (depth < 1e-4) {
    return undefined;
  }
  const nx = dot(d, rig.right) / (depth * rig.tanX);
  const ny = dot(d, rig.up) / (depth * rig.tanY);
  return {
    x: (nx * 0.5 + 0.5) * rig.width,
    y: (0.5 - ny * 0.5) * rig.height,
    depth,
  };
}

export interface Ray {
  origin: V3;
  direction: V3;
}

/** The ray through a pixel. */
export function rayAt(rig: Rig, x: number, y: number): Ray {
  const nx = (x / rig.width) * 2 - 1;
  const ny = 1 - (y / rig.height) * 2;
  return {
    origin: rig.eye,
    direction: normalize(
      add(
        add(rig.forward, scale(rig.right, nx * rig.tanX)),
        scale(rig.up, ny * rig.tanY),
      ),
    ),
  };
}

/** Pixels a metre spans across the view at a point's depth. */
export function pixelsPerMetre(rig: Rig, p: ArrayLike<number>): number {
  const depth = Math.max(1e-4, dot(sub(p, rig.eye), rig.forward));
  return rig.height / (2 * rig.tanY * depth);
}

/**
 * Where along the line `origin + t·axis` it comes closest to a ray (`t`),
 * or undefined when they are parallel. The solution a drag along an
 * axis uses: the point on the axis the pointer's ray points at.
 */
export function closestOnLine(
  origin: ArrayLike<number>,
  axis: ArrayLike<number>,
  ray: Ray,
): number | undefined {
  const w = sub(origin, ray.origin);
  const b = dot(axis, ray.direction);
  const denominator = 1 - b * b;
  if (denominator < 1e-6) {
    return undefined;
  }
  const d = dot(axis, w);
  const e = dot(ray.direction, w);
  return (b * e - d) / denominator;
}

/** Where a ray meets a plane (the point), or undefined when it is parallel to it or points away. */
export function rayPlane(
  ray: Ray,
  point: ArrayLike<number>,
  normal: ArrayLike<number>,
): V3 | undefined {
  const denominator = dot(ray.direction, normal);
  if (Math.abs(denominator) < 1e-6) {
    return undefined;
  }
  const t = dot(sub(point, ray.origin), normal) / denominator;
  return t < 0 ? undefined : mad(ray.origin, ray.direction, t);
}

/** The distance in pixels from (x, y) to the segment a-b. */
export function distanceToSegment(
  x: number,
  y: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t =
    l2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

/** Whether a pixel is inside a convex or simple polygon of pixels. */
export function insidePolygon(
  x: number,
  y: number,
  polygon: ReadonlyArray<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** The nearest multiple of `step` (any value when `step` is 0). */
export const snapTo = (value: number, step: number): number =>
  step > 0 ? Math.round(value / step) * step : value;

// -------------------------------------------------------------- rotations

const RAD = Math.PI / 180;

/** A 3 × 3 matrix by rows. */
export type M3 = [V3, V3, V3];

const mul = (a: M3, b: M3): M3 =>
  a.map((row) =>
    [0, 1, 2].map(
      (j) => row[0]! * b[0]![j]! + row[1]! * b[1]![j]! + row[2]! * b[2]![j]!,
    ),
  ) as M3;

/** The rotation of a placement: about the world's x, then y, then z (degrees): `Rz · Ry · Rx`. */
export function rotationOf(rotate: ArrayLike<number>): M3 {
  const [a, b, c] = [rotate[0]! * RAD, rotate[1]! * RAD, rotate[2]! * RAD];
  const rx: M3 = [
    [1, 0, 0],
    [0, Math.cos(a), -Math.sin(a)],
    [0, Math.sin(a), Math.cos(a)],
  ];
  const ry: M3 = [
    [Math.cos(b), 0, Math.sin(b)],
    [0, 1, 0],
    [-Math.sin(b), 0, Math.cos(b)],
  ];
  const rz: M3 = [
    [Math.cos(c), -Math.sin(c), 0],
    [Math.sin(c), Math.cos(c), 0],
    [0, 0, 1],
  ];
  return mul(rz, mul(ry, rx));
}

/** The rotation about a unit axis by an angle (radians). */
export function axisAngle(axis: ArrayLike<number>, angle: number): M3 {
  const [x, y, z] = normalize(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}

/** `a · b`: b first, then a. */
export const multiply = mul;

export function apply(m: M3, v: ArrayLike<number>): V3 {
  return [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
}

/** `Mᵀ v`: the inverse of a rotation. */
export function applyInverse(m: M3, v: ArrayLike<number>): V3 {
  return [
    m[0][0] * v[0]! + m[1][0] * v[1]! + m[2][0] * v[2]!,
    m[0][1] * v[0]! + m[1][1] * v[1]! + m[2][1] * v[2]!,
    m[0][2] * v[0]! + m[1][2] * v[1]! + m[2][2] * v[2]!,
  ];
}

/** The placement angles (degrees: x, then y, then z) of a rotation, in -180 to 180; the inverse of `rotationOf`. */
export function anglesOf(m: M3): V3 {
  const sinB = -m[2][0];
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)));
  let a: number;
  let c: number;
  if (Math.abs(sinB) > 0.999999) {
    // Looking straight along an axis: x and z turn the same way; put it all in x.
    c = 0;
    a = Math.atan2(-m[1][2], m[1][1]);
  } else {
    a = Math.atan2(m[2][1], m[2][2]);
    c = Math.atan2(m[1][0], m[0][0]);
  }
  const clean = (r: number) => Math.round((r / RAD) * 1e9) / 1e9 + 0;
  return [clean(a), clean(b), clean(c)];
}
