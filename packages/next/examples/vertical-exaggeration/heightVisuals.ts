import { CustomShader, type Globe } from "@cesium/next";

/**
 * Height visuals, the placement review's open question as a spike (plan
 * §13.26, the owner's answer 2): a hypsometric tint, contours and a haze whose
 * density falls with height, each of which can be keyed to the height the
 * terrain really has ("true") or the height it is drawn at ("drawn"), on a
 * terrain drawn up to ten times as tall.
 *
 * It is one custom fragment stage on the globe's tiles (`Globe.shader`). The
 * drawn height comes from the drawn position (`positionWC`), the true height
 * from the true position the engine now passes beside it
 * (`truePositionEC`, the camera-relative position before the warp), each as a
 * height above the WGS84 ellipsoid. Lighting and the haze's path are
 * geometry, so they stay drawn; only the lookups (the ramp, the contour
 * levels, the density) take the key.
 */

/** How a height lookup reads a fragment: where the content is, or where it is drawn. */
export type HeightKey = "true" | "drawn";

/** The ramp's stops: a height in metres and an sRGB colour. */
export const RAMP: ReadonlyArray<readonly [metres: number, rgb: string]> = [
  [0, "#3f7f3b"],
  [500, "#7aa53f"],
  [1000, "#c5cf55"],
  [1500, "#eadb73"],
  [2000, "#d9a860"],
  [2500, "#b97a47"],
  [3000, "#8e5a3e"],
  [3500, "#b89d9b"],
  [4000, "#ece8f2"],
  [4500, "#ffffff"],
];

export const RAMP_TOP = RAMP[RAMP.length - 1]![0];

/** The haze at the ellipsoid: the density (1/m) at 1× the slider, and how far up it thins to 1/e (m). */
export const HAZE = { density: 2.5e-4, scaleHeight: 1500 } as const;
/** The haze's colour as shown (display-relative: it is emitted past the exposure). */
const HAZE_COLOR = [0.62, 0.72, 0.86] as const;

const hex = (rgb: string): [number, number, number] => [
  parseInt(rgb.slice(1, 3), 16) / 255,
  parseInt(rgb.slice(3, 5), 16) / 255,
  parseInt(rgb.slice(5, 7), 16) / 255,
];
const linear = (c: number) => c ** 2.2;
const f32 = (x: number) => x.toFixed(5);

/** The ramp as a CSS gradient across `direction`, for the legend. */
export const rampGradient = (direction = "to right"): string =>
  `linear-gradient(${direction}, ${RAMP.map(
    ([m, rgb]) => `${rgb} ${((m / RAMP_TOP) * 100).toFixed(2)}%`,
  ).join(", ")})`;

/** `ramp(h)`: the stops' colours (linear), each blended in over its band, as straight-line WGSL. */
function rampWgsl(): string {
  const [first, ...rest] = RAMP;
  const vec = (rgb: string) =>
    `vec3f(${hex(rgb)
      .map((c) => f32(linear(c)))
      .join(", ")})`;
  const lines = rest.map(([m, rgb], i) => {
    const from = RAMP[i]![0];
    return `  c = mix(c, ${vec(rgb)}, clamp((h - ${f32(from)}) / ${f32(m - from)}, 0.0, 1.0));`;
  });
  return `fn ramp(h: f32) -> vec3f {\n  var c = ${vec(first![1])};\n${lines.join("\n")}\n  return c;\n}`;
}

const WGSL = /* wgsl */ `
const SEMI_MAJOR: f32 = 6378137.0;
const SEMI_MINOR: f32 = 6356752.3142;

// Metres above the WGS84 ellipsoid, along the radial: within centimetres of
// the geodetic height at the heights the terrain has, and no iteration.
fn heightAbove(p: vec3f) -> f32 {
  let r = length(p);
  let s = p.z / max(r, 1.0);
  let q = SEMI_MINOR * SEMI_MINOR * (1.0 - s * s) + SEMI_MAJOR * SEMI_MAJOR * s * s;
  return r - SEMI_MAJOR * SEMI_MINOR * inverseSqrt(q);
}

${rampWgsl()}

// How near a contour is, 0 to 1: a line about a pixel wide (w: metres of
// height a pixel spans), gone where the lines would be closer than a few pixels.
fn contourLine(h: f32, interval: f32, w: f32) -> f32 {
  let d = abs(fract(h / interval + 0.5) - 0.5) * interval;
  let line = 1.0 - smoothstep(0.5 * w, 1.5 * w, d);
  let crowded = 1.0 - smoothstep(0.12 * interval, 0.3 * interval, w);
  return line * crowded;
}

// The mean of exp(-h / scale) along a stretch whose height goes from h0 to h1.
fn meanDensity(h0: f32, h1: f32, scale: f32) -> f32 {
  let a = exp(-max(h0, -500.0) / scale);
  let b = exp(-max(h1, -500.0) / scale);
  let dh = (h1 - h0) / scale;
  return select((a - b) / dh, a, abs(dh) < 0.001);
}

fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  // Camera-relative positions plus the camera: Earth-fixed, as drawn and as true.
  let camera = fsInput.positionWC - fsInput.positionEC;
  let drawnH = heightAbove(fsInput.positionWC);
  let trueH = heightAbove(fsInput.truePositionEC + camera);
  let lookupH = select(trueH, drawnH, uniforms.tint.y > 0.5);
  // Outside any branch: derivatives need uniform control flow.
  let pixelH = max(fwidth(lookupH), 1e-3);

  var color = (*material).baseColor;
  if (uniforms.tint.x > 0.5) {
    color = mix(color, ramp(lookupH), uniforms.tint.z);
  }
  if (uniforms.tint.w > 0.0) {
    let index = contourLine(lookupH, uniforms.tint.w * 5.0, pixelH);
    let minor = contourLine(lookupH, uniforms.tint.w, pixelH);
    color = mix(color, vec3f(0.01), max(minor * 0.55, index * 0.95));
  }
  (*material).baseColor = color;

  if (uniforms.haze.x > 0.5) {
    // The path is the drawn one; the density along it is read at the key.
    let byDrawn = uniforms.haze.y > 0.5;
    let h0 = select(uniforms.camera.y, uniforms.camera.x, byDrawn);
    let h1 = select(trueH, drawnH, byDrawn);
    let tau = uniforms.haze.z * length(fsInput.positionEC) * meanDensity(h0, h1, uniforms.haze.w);
    let f = 1.0 - exp(-tau);
    (*material).baseColor *= 1.0 - f;
    (*material).emissive += vec3f(${HAZE_COLOR.map(f32).join(", ")}) * f;
  }
}
`;

/** What the panel sets. */
export interface HeightVisualsState {
  /** Whether the hypsometric tint is on. */
  tint: boolean;
  /** The key of the tint and the contours (they are lookups by height alike). */
  lookup: HeightKey;
  /** The contours' interval, m; 0 for none. */
  contours: number;
  /** Whether the haze is on. */
  haze: boolean;
  /** The haze's key. */
  hazeKey: HeightKey;
  /** The haze's density as a multiple of `HAZE.density`. */
  hazeAmount: number;
}

export const INITIAL: Readonly<HeightVisualsState> = {
  tint: false,
  lookup: "true",
  contours: 0,
  haze: false,
  hazeKey: "true",
  hazeAmount: 1,
};

/** The one custom shader, and a state written to its uniforms. */
export interface HeightVisuals {
  readonly shader: CustomShader;
  readonly state: Readonly<HeightVisualsState>;
  /** Whether any effect is on: the globe takes the shader only then. */
  readonly active: boolean;
  set(next: Partial<HeightVisualsState>): void;
  /** The camera's height as drawn and as it is true (m): the haze's path starts there. */
  setCamera(drawn: number, truth: number): void;
}

export function createHeightVisuals(
  initial: Partial<HeightVisualsState> = {},
): HeightVisuals {
  const state: HeightVisualsState = { ...INITIAL, ...initial };
  const shader = new CustomShader({
    label: "vertical exaggeration height visuals",
    wgsl: WGSL,
    uniforms: {
      // on, drawn key, amount, contour interval
      tint: { type: "vec4f", value: [0, 0, 0.8, 0] },
      // on, drawn key, density at the ellipsoid, scale height
      haze: { type: "vec4f", value: [0, 0, HAZE.density, HAZE.scaleHeight] },
      // the camera's drawn and true heights
      camera: { type: "vec4f", value: [0, 0, 0, 0] },
    },
  });
  const write = () => {
    shader.setUniform("tint", [
      state.tint ? 1 : 0,
      state.lookup === "drawn" ? 1 : 0,
      0.8,
      state.contours,
    ]);
    shader.setUniform("haze", [
      state.haze ? 1 : 0,
      state.hazeKey === "drawn" ? 1 : 0,
      HAZE.density * state.hazeAmount,
      HAZE.scaleHeight,
    ]);
  };
  write();
  return {
    shader,
    state,
    get active() {
      return state.tint || state.contours > 0 || state.haze;
    },
    set(next) {
      Object.assign(state, next);
      write();
    },
    setCamera(drawn, truth) {
      shader.setUniform("camera", [drawn, truth, 0, 0]);
    },
  };
}

/** Whether `globe` draws with `visuals` (the shader is on only while an effect is). */
export function attach(globe: Globe | undefined, visuals: HeightVisuals): void {
  if (!globe) {
    return;
  }
  const wanted = visuals.active ? visuals.shader : undefined;
  if (globe.shader !== wanted) {
    globe.shader = wanted;
  }
}
