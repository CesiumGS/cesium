import type { Camera } from "./Camera.ts";

/** Cascades of the sun's shadow map (each a layer of a 2D array). */
export const SHADOW_CASCADES = 4;
/** Each cascade's resolution, texels. */
export const SHADOW_SIZE = 2048;
/** Bytes of opaque.wgsl's `Shadows` (four matrices, then four vectors). */
export const SHADOWS_SIZE = 4 * 64 + 4 * 16;
/** One view's `Shadows` in the staging buffer (uniform offsets: 256). */
export const SHADOWS_STRIDE = 512;

/**
 * The sun's cascaded shadow maps for one view, fitted each frame: each
 * cascade covers a slice of the view's depth with a sphere (so its size
 * doesn't change as the camera turns), seen from the sun with an
 * orthographic projection whose texels are snapped to a grid fixed on the
 * ground (so shadow edges don't crawl as the camera moves). Everything is
 * camera-relative, as the engine draws: positions near the camera stay
 * small, so float32 keeps the precision on the GPU.
 */
export interface ShadowCascades {
  /** Per cascade: camera-relative position → light clip space (col-major). */
  matrices: Float64Array;
  /** Per cascade: 5 culling planes, camera-relative (inward; 4 floats each). */
  planes: Float32Array[];
  /** Each cascade's far distance along the view, m. */
  splits: Float32Array;
  /** Each cascade's texel size, m (the receivers' normal offset). */
  texels: Float32Array;
  /** Distance along the view where shadows start to fade, and end, m. */
  fadeStart: number;
  far: number;
}

export function createShadowCascades(): ShadowCascades {
  return {
    matrices: new Float64Array(16 * SHADOW_CASCADES),
    planes: Array.from({ length: SHADOW_CASCADES }, () => new Float32Array(20)),
    splits: new Float32Array(SHADOW_CASCADES),
    texels: new Float32Array(SHADOW_CASCADES),
    fadeStart: 0,
    far: 0,
  };
}

/**
 * Fits the cascades for a camera and the sun (`sun`, unit, toward it,
 * Earth-fixed). `height` is the camera's height above the ground, m: the
 * shadows reach 20 times as far (at least 200 m, at most 150 km), so a
 * street-level camera gets fine cascades and a mountain view long ones.
 * Splits blend logarithmic and uniform (Zhang et al.'s practical scheme).
 */
export function fitShadowCascades(
  out: ShadowCascades,
  camera: Camera,
  aspect: number,
  sun: ArrayLike<number>,
  height: number,
): void {
  const near = Math.max(camera.near, 1);
  const far = Math.min(Math.max(20 * height, 200), 150_000);
  out.far = far;
  out.fadeStart = far * 0.85;
  const lambda = 0.9;
  const tanY = Math.tan(camera.fovy(aspect) / 2);
  const tanX = tanY * aspect;
  // The light's axes: z toward the sun, x and y across it.
  const lz = [sun[0]!, sun[1]!, sun[2]!];
  const reference = Math.abs(lz[2]!) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const lx = normalize(cross(reference, lz));
  const ly = cross(lz, lx);
  const f = camera.direction;
  const position = camera.position;
  let previous = near;
  for (let c = 0; c < SHADOW_CASCADES; c++) {
    const i = (c + 1) / SHADOW_CASCADES;
    const split =
      lambda * near * Math.pow(far / near, i) +
      (1 - lambda) * (near + (far - near) * i);
    out.splits[c] = split;
    // The slice's bounding sphere: centered on the view axis where the
    // farthest corners of both ends are equally far (rotation invariant).
    const d0 = previous;
    const d1 = split;
    const k0 = tanX * tanX + tanY * tanY;
    // Center at distance t along the view: |t − d0|² + d0²k0 = |d1 − t|² +
    // d1²k0, clamped to the far end's (a wide view's slice is tallest there).
    let t = (d1 * d1 * (1 + k0) - d0 * d0 * (1 + k0)) / (2 * (d1 - d0));
    t = Math.min(t, d1);
    let radius = Math.sqrt((d1 - t) * (d1 - t) + d1 * d1 * k0);
    // Quantized, so the sphere (and the texel size) doesn't wobble.
    radius = Math.ceil(radius * 16) / 16;
    previous = split;
    const center = [f[0]! * t, f[1]! * t, f[2]! * t];
    // Snap the center to the texel grid in absolute (Earth-fixed) light
    // coordinates: the grid stays on the ground as the camera moves.
    const texel = (2 * radius) / SHADOW_SIZE;
    out.texels[c] = texel;
    const cx =
      snap(dot(center, lx) + dot(position, lx), texel) - dot(position, lx);
    const cy =
      snap(dot(center, ly) + dot(position, ly), texel) - dot(position, ly);
    const cz = dot(center, lz);
    // Depth: from the sphere's far side (away from the sun) to well past
    // its near side toward the sun, where casters outside the view are
    // (mountains tens of kilometers away at a low sun). Reverse-Z: nearest
    // to the sun is 1.
    const behind = cz - radius;
    const reach = cz + radius + Math.max(30_000, 2 * radius);
    const m = out.matrices;
    const o = c * 16;
    const sx = 1 / radius;
    const sz = 1 / (reach - behind);
    // Column-major: clip = M · (p, 1).
    m[o] = lx[0]! * sx;
    m[o + 1] = ly[0]! * sx;
    m[o + 2] = lz[0]! * sz;
    m[o + 3] = 0;
    m[o + 4] = lx[1]! * sx;
    m[o + 5] = ly[1]! * sx;
    m[o + 6] = lz[1]! * sz;
    m[o + 7] = 0;
    m[o + 8] = lx[2]! * sx;
    m[o + 9] = ly[2]! * sx;
    m[o + 10] = lz[2]! * sz;
    m[o + 11] = 0;
    m[o + 12] = -cx * sx;
    m[o + 13] = -cy * sx;
    m[o + 14] = -behind * sz;
    m[o + 15] = 1;
    // Culling: the box's four sides and its far side (away from the sun);
    // toward the sun the depth range bounds it.
    const p = out.planes[c]!;
    setPlane(p, 0, lx, -(cx - radius));
    setPlane(p, 1, [-lx[0]!, -lx[1]!, -lx[2]!], cx + radius);
    setPlane(p, 2, ly, -(cy - radius));
    setPlane(p, 3, [-ly[0]!, -ly[1]!, -ly[2]!], cy + radius);
    setPlane(p, 4, lz, -behind);
  }
}

function setPlane(
  out: Float32Array,
  index: number,
  normal: number[],
  w: number,
): void {
  out[index * 4] = normal[0]!;
  out[index * 4 + 1] = normal[1]!;
  out[index * 4 + 2] = normal[2]!;
  out[index * 4 + 3] = w;
}

function snap(x: number, step: number): number {
  return Math.round(x / step) * step;
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

function cross(a: number[], b: number[]): number[] {
  return [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
}

function normalize(a: number[]): number[] {
  const l = Math.hypot(a[0]!, a[1]!, a[2]!);
  return [a[0]! / l, a[1]! / l, a[2]! / l];
}

/**
 * Writes a view's `Shadows` uniform (opaque.wgsl); `enabled` false: none.
 * It also says whether the ambient-occlusion buffer holds the view's.
 */
export function writeShadows(
  out: Float32Array,
  offsetFloats: number,
  cascades: ShadowCascades,
  forward: ArrayLike<number>,
  enabled: boolean,
  ambientOcclusion: boolean,
): void {
  const o = offsetFloats;
  out.set(cascades.matrices, o);
  out.set(cascades.splits, o + 64);
  out.set(cascades.texels, o + 68);
  out[o + 72] = forward[0]!;
  out[o + 73] = forward[1]!;
  out[o + 74] = forward[2]!;
  out[o + 75] = enabled ? 1 : 0;
  out[o + 76] = cascades.fadeStart;
  out[o + 77] = cascades.far;
  out[o + 78] = ambientOcclusion ? 1 : 0;
  out[o + 79] = 0;
}
