// The depth pyramid and the box test, on the CPU: the shape the GPU passes
// (hzb.slang, occlusionQuery.slang) are written to, and the reference the
// tests hold them to. Reverse-Z: larger depth is nearer, so a texel's
// farthest depth is the minimum of its block, and the sky (0) hides nothing.

/** The pyramid's size for a frame: level 0 is half of it, rounded down. */
export interface PyramidShape {
  /** Level 0's size, texels (at least 1). */
  readonly width: number;
  readonly height: number;
  /** Levels down to one texel. */
  readonly levels: number;
}

export function pyramidShape(
  frameWidth: number,
  frameHeight: number,
): PyramidShape {
  const width = Math.max(frameWidth >> 1, 1);
  const height = Math.max(frameHeight >> 1, 1);
  return {
    width,
    height,
    levels: 1 + Math.floor(Math.log2(Math.max(width, height))),
  };
}

/** A level's size: halved each level, never below one texel. */
export function levelSize(
  shape: PyramidShape,
  level: number,
): [number, number] {
  return [
    Math.max(shape.width >> level, 1),
    Math.max(shape.height >> level, 1),
  ];
}

/**
 * The input texels, first and last, that output texel `i` folds along an
 * axis: its 2, and an odd input size's last texel too (the last output texel
 * takes the extra one), clamped to the input.
 */
export function blockOf(
  i: number,
  inputSize: number,
  outputSize: number,
): [number, number] {
  const first = i * 2;
  let last = first + 1;
  if (i + 1 === outputSize && (inputSize & 1) === 1) {
    last = first + 2;
  }
  return [Math.min(first, inputSize - 1), Math.min(last, inputSize - 1)];
}

/** One level of the pyramid: texels, row-major. */
export interface PyramidLevel {
  readonly width: number;
  readonly height: number;
  readonly texels: Float32Array;
}

/**
 * A pyramid from a frame's depth: `depth(x, y)` is the farthest of the
 * pixel's samples (`hzb.slang`'s `level0` takes the minimum over them).
 */
export function buildPyramid(
  frameWidth: number,
  frameHeight: number,
  depth: (x: number, y: number) => number,
): PyramidLevel[] {
  const shape = pyramidShape(frameWidth, frameHeight);
  const out: PyramidLevel[] = [];
  const { width, height } = shape;
  const first = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const [y0, y1] = blockOf(y, frameHeight, height);
    for (let x = 0; x < width; x++) {
      const [x0, x1] = blockOf(x, frameWidth, width);
      let farthest = Infinity;
      for (let j = y0; j <= y1; j++) {
        for (let i = x0; i <= x1; i++) {
          farthest = Math.min(farthest, depth(i, j));
        }
      }
      first[y * width + x] = farthest;
    }
  }
  out.push({ width, height, texels: first });
  for (let level = 1; level < shape.levels; level++) {
    const before = out[level - 1]!;
    const [w, h] = levelSize(shape, level);
    const texels = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const [y0, y1] = blockOf(y, before.height, h);
      for (let x = 0; x < w; x++) {
        const [x0, x1] = blockOf(x, before.width, w);
        let farthest = Infinity;
        for (let j = y0; j <= y1; j++) {
          for (let i = x0; i <= x1; i++) {
            farthest = Math.min(farthest, before.texels[j * before.width + i]!);
          }
        }
        texels[y * w + x] = farthest;
      }
    }
    out.push({ width: w, height: h, texels });
  }
  return out;
}

/** What the box test needs of the camera the pyramid was built for. */
export interface PyramidCamera {
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Tangents of half the field of view, across and up. */
  readonly tanX: number;
  readonly tanY: number;
  readonly near: number;
}

/** A box in camera space (x right, y up, z forward), relative to the eye. */
export interface CameraBox {
  readonly centre: ArrayLike<number>;
  /** Three half-axes, 9 numbers. */
  readonly axes: ArrayLike<number>;
}

/** The widest window the box test reads, texels across (hzbTest.slang). */
export const MAX_WINDOW = 8;

/** The depth margin (relative) a box's nearest depth is tested with. */
export const OCCLUSION_BIAS = 1e-3;

/**
 * Whether the box is certainly hidden by the pyramid: `hzbTest.slang`'s test
 * (the tile queries', `window` 2). Any corner at or behind the near plane, a
 * rectangle off the screen, or a rectangle that isn't covered by `window` ×
 * `window` texels of its level leaves it visible. A wider window reads a
 * finer level (the draws' occlusion cull reads 8).
 */
export function boxHidden(
  levels: readonly PyramidLevel[],
  camera: PyramidCamera,
  box: CameraBox,
  bias = OCCLUSION_BIAS,
  window = 2,
): boolean {
  const { frameWidth, frameHeight } = camera;
  const c = box.centre;
  const a = box.axes;
  let nearestZ = Infinity;
  let lowX = Infinity;
  let lowY = Infinity;
  let highX = -Infinity;
  let highY = -Infinity;
  for (let k = 0; k < 8; k++) {
    const sa = (k & 1) === 0 ? -1 : 1;
    const sb = (k & 2) === 0 ? -1 : 1;
    const sc = (k & 4) === 0 ? -1 : 1;
    const x = c[0]! + sa * a[0]! + sb * a[3]! + sc * a[6]!;
    const y = c[1]! + sa * a[1]! + sb * a[4]! + sc * a[7]!;
    const z = c[2]! + sa * a[2]! + sb * a[5]! + sc * a[8]!;
    if (!(z > camera.near)) {
      return false;
    }
    const sx = ((x / z / camera.tanX) * 0.5 + 0.5) * frameWidth;
    const sy = (0.5 - (y / z / camera.tanY) * 0.5) * frameHeight;
    lowX = Math.min(lowX, sx);
    highX = Math.max(highX, sx);
    lowY = Math.min(lowY, sy);
    highY = Math.max(highY, sy);
    nearestZ = Math.min(nearestZ, z);
  }
  if (
    !(highX >= 0) ||
    !(highY >= 0) ||
    !(lowX < frameWidth) ||
    !(lowY < frameHeight)
  ) {
    return false;
  }
  const clampPixel = (v: number, size: number) =>
    Math.min(Math.max(Math.floor(v), 0), size - 1);
  const firstX = clampPixel(lowX, frameWidth);
  const firstY = clampPixel(lowY, frameHeight);
  const lastX = clampPixel(highX, frameWidth);
  const lastY = clampPixel(highY, frameHeight);
  const shape = {
    width: levels[0]!.width,
    height: levels[0]!.height,
    levels: levels.length,
  };
  const spanX =
    Math.min(lastX >> 1, shape.width - 1) -
    Math.min(firstX >> 1, shape.width - 1);
  const spanY =
    Math.min(lastY >> 1, shape.height - 1) -
    Math.min(firstY >> 1, shape.height - 1);
  const extent = Math.max(spanX, spanY) + 1;
  const wide = Math.min(Math.max(window, 2), MAX_WINDOW);
  let level = 0;
  while (((extent - 1) >> level) + 2 > wide && level + 1 < shape.levels) {
    level++;
  }
  const [width, height] = levelSize(shape, level);
  const fromX = Math.min(firstX >> (level + 1), width - 1);
  const toX = Math.min(lastX >> (level + 1), width - 1);
  const fromY = Math.min(firstY >> (level + 1), height - 1);
  const toY = Math.min(lastY >> (level + 1), height - 1);
  if (toX - fromX > wide - 1 || toY - fromY > wide - 1) {
    return false;
  }
  let farthest = Infinity;
  for (let y = fromY; y <= toY; y++) {
    for (let x = fromX; x <= toX; x++) {
      farthest = Math.min(farthest, levels[level]!.texels[y * width + x]!);
    }
  }
  const nearest = camera.near / nearestZ;
  return farthest > nearest * (1 + bias);
}

/**
 * Whether a draw's culling sphere is certainly hidden by the pyramid: the
 * occlusion cull's test (cull.slang `sphereHidden`), the box around the
 * sphere along the camera's axes, through the widest window. `centre` is in camera space (x right, y
 * up, z forward), relative to the eye. A sphere with no bound (a radius of
 * 10³⁰ or more) never is.
 */
export function sphereHidden(
  levels: readonly PyramidLevel[],
  camera: PyramidCamera,
  centre: ArrayLike<number>,
  radius: number,
  bias = OCCLUSION_BIAS,
): boolean {
  if (!(radius < 1e30)) {
    return false;
  }
  return boxHidden(
    levels,
    camera,
    { centre, axes: [radius, 0, 0, 0, radius, 0, 0, 0, radius] },
    bias,
    MAX_WINDOW,
  );
}
