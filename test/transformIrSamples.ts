// Sample transform functions in the restricted plain-JS subset: pure, reading
// only their parameters and Math. test/transformIr.test.ts parses them, runs
// them through esbuild's minifier and parses the result.

type V3 = readonly [number, number, number];

/** Vertical lift that grows with height and is constant above a smooth ceiling. */
export const exaggerationLift = (
  p: V3,
  params: { k: number; ceiling: number },
) => {
  const [x, y, h] = p;
  const t = Math.min(Math.max(h / params.ceiling, 0), 1);
  const s = t * t * (3 - 2 * t);
  return [x, y, h + (params.k - 1) * params.ceiling * s];
};

/** A Gaussian bump, written with the `out` parameter. */
export const bump = function (
  p: V3,
  params: { amp: number; cx: number; cy: number; width: number },
  out: number[],
) {
  const dx = p[0] - params.cx;
  const dy = p[1] - params.cy;
  out[0] = p[0];
  out[1] = p[1];
  out[2] =
    p[2] +
    params.amp * Math.exp(-(dx ** 2 + dy ** 2) / (2 * params.width ** 2));
  return out;
};

/** Rotation about z by an angle proportional to height; destructured params. */
export const twist = (p: V3, { rate }: { rate: number }) => {
  const a = rate * p[2];
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]];
};

/** Bend about the y axis with a constant curvature. */
export const bend = (p: V3, params: { curvature: number }) => {
  const r = 1 / params.curvature;
  const theta = params.curvature * p[0];
  const rr = r - p[2];
  return [rr * Math.sin(theta), p[1], r - rr * Math.cos(theta)];
};

/** Brown–Conrady lens distortion of a camera-space point, to pixels. */
export const brownConrady = (
  p: V3,
  params: {
    k1: number;
    k2: number;
    k3: number;
    p1: number;
    p2: number;
    fx: number;
    fy: number;
    cx: number;
    cy: number;
  },
) => {
  const { k1, k2, k3, p1, p2, fx, fy, cx, cy } = params;
  const u = p[0] / p[2];
  const v = p[1] / p[2];
  const r2 = u * u + v * v;
  const radial = 1 + r2 * (k1 + r2 * (k2 + r2 * k3));
  const du = 2 * p1 * u * v + p2 * (r2 + 2 * u * u);
  const dv = p1 * (r2 + 2 * v * v) + 2 * p2 * u * v;
  return [fx * (u * radial + du) + cx, fy * (v * radial + dv) + cy, p[2]];
};

/** A circular alignment unrolled into (station, offset, height). */
export const corridor = (
  p: V3,
  params: { radius: number; cx: number; cy: number; scale: number },
) => {
  const dx = p[0] - params.cx;
  const dy = p[1] - params.cy;
  const rho = Math.sqrt(dx * dx + dy * dy);
  const station = params.radius * Math.atan2(dy, dx);
  return [station, (rho - params.radius) * params.scale, p[2]];
};

/** Two-way time to depth for v(z) = v0 + g z, the integral in closed form. */
export const timeToDepth = (p: V3, params: { v0: number; g: number }) => {
  const { v0, g } = params;
  const t = p[2] / 2;
  const depth = Math.abs(g) < 1e-9 ? v0 * t : (v0 / g) * (Math.exp(g * t) - 1);
  return [p[0], p[1], depth];
};

/** Kepler's equation by four unrolled Newton steps: a `for` with constant bounds. */
export const kepler = (p: V3, params: { e: number }) => {
  const M = p[2];
  let E = M;
  for (let i = 0; i < 4; i++) {
    E = E - (E - params.e * Math.sin(E) - M) / (1 - params.e * Math.cos(E));
  }
  return [p[0], p[1], E];
};

/** Scale by height, with compound assignment on locals. */
export const taper = (p: V3, params: { k: number }) => {
  let x = p[0];
  let y = p[1];
  const s = 1 + params.k * p[2];
  x *= s;
  y *= s;
  return [x, y, p[2]];
};

/** Early return, if/else assigning a local, hypot and a fractional power. */
export const flatten = (p: V3, params: { h: number; falloff: number }) => {
  const r = Math.hypot(p[0], p[1]);
  if (r > params.falloff) {
    return [p[0], p[1], p[2]];
  }
  const w = 1 - r / params.falloff;
  let z = p[2];
  if (z > params.h) {
    z = params.h + Math.pow(z - params.h, 1.5) * w;
  } else {
    z = z * (1 - w) + params.h * w;
  }
  return [p[0], p[1], z];
};

/** Most other ops: hyperbolic and inverse trigonometric functions, logs, rounding. */
export const kitchenSink = (p: V3, params: { a: number }) => {
  const x = p[0] * params.a;
  const y = p[1];
  const z = p[2];
  return [
    Math.sinh(x) + Math.tanh(y) + Math.atan(z),
    Math.asin(Math.tanh(x)) +
      Math.acos(Math.tanh(y) * 0.5) +
      Math.cosh(z) * 0.1,
    Math.log(1 + x * x) +
      Math.sqrt(1 + y * y) +
      Math.tan(Math.tanh(z)) +
      Math.abs(x - y) +
      Math.max(x, z) +
      Math.min(y, z) +
      Math.log2(1 + x * x) +
      Math.log10(2 + y * y) * Math.PI +
      Math.trunc(z * 3) +
      Math.ceil(y * 2),
  ];
};
