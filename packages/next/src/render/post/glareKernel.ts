// A lens's spikes, as a kernel: from a pupil, by its diffraction, once, in a worker. No
// FFT runs in the live path: a sprite is one sample of what this leaves (CESIUM2_WEBGPU_PLAN.md
// §13.22). No GPU types here.
import type { GlarePupil } from "../../scene/observer.ts";

/** What a kernel holds. */
export interface GlareKernel {
  /** RGBA by row, `size`² of them; each channel sums to 1, and its center is 0. */
  texels: Float32Array;
  /**
   * The visible radius in cells at a display brightness of `2^i` (what a kernel value of
   * 1 would show as, where 1 is white): the farthest cell that reaches `KERNEL_VISIBLE`.
   * 0 below 2 cells: no sprite.
   */
  radii: Float32Array;
  size: number;
}

/** Entries in `GlareKernel.radii` (glare.slang `GLARE_RADII`). */
export const KERNEL_RADII = 32;
/** What counts as seen in a sprite, as a share of white. */
export const KERNEL_VISIBLE = 0.004;
/** The smallest sprite, cells (glare.slang `GLARE_SPRITE_MIN_CELLS`). */
export const KERNEL_MIN_CELLS = 2;

const WAVELENGTHS = 16;
const FROM_NM = 440;
const TO_NM = 660;
/** The wavelength the pupil's transform is taken at: others are it, scaled. */
const REFERENCE_NM = 550;
/** The pupil's radius, as a share of the grid: what's left pads the transform. */
const PUPIL_SHARE = 1 / 8;
/** Samples of the pupil per grid cell, per axis. */
const SUPERSAMPLE = 4;
/**
 * The taper of the core, from past the pupil's first dark ring (about 4.9 cells, at any
 * size) to a share of the half-width, or at least 12 cells. Then the edge's, as a share.
 */
const CORE_FROM_CELLS = 6;
const CORE_TO_CELLS = 12;
const CORE_TO_SHARE = 0.12;
const EDGE_FROM = 0.7;
/** The vanes' width and the obstruction's radius, as shares of the pupil's radius. */
const VANE_WIDTH = 0.03;
const OBSTRUCTION = 0.2;
/** How far the vanes are turned from the image's axes, so spikes avoid its grid. */
const VANE_TURN = Math.PI / 4;

/** Whether a point of the unit pupil lets light through. */
function pupilAt(aperture: GlarePupil, x: number, y: number): boolean {
  const r = Math.hypot(x, y);
  if (r > 1) {
    return false;
  }
  switch (aperture) {
    case "round":
      return true;
    case "vanes": {
      if (r < OBSTRUCTION) {
        return false;
      }
      const c = Math.cos(VANE_TURN);
      const s = Math.sin(VANE_TURN);
      const u = x * c + y * s;
      const v = -x * s + y * c;
      return Math.abs(u) > VANE_WIDTH / 2 && Math.abs(v) > VANE_WIDTH / 2;
    }
    case "hex":
      return inPolygon(6, x, y);
    case "blades7":
      return inPolygon(7, x, y);
  }
}

/** Inside a regular polygon of `sides`, its corners on the unit circle. */
function inPolygon(sides: number, x: number, y: number): boolean {
  const step = (2 * Math.PI) / sides;
  const apothem = Math.cos(step / 2);
  for (let i = 0; i < sides; i++) {
    const a = (i + 0.5) * step;
    if (x * Math.cos(a) + y * Math.sin(a) > apothem) {
      return false;
    }
  }
  return true;
}

/** The radix-2 FFT of one line, in place. */
function fftLine(
  re: Float64Array,
  im: Float64Array,
  cos: Float64Array,
  sin: Float64Array,
): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const half = length >> 1;
    const stride = n / length;
    for (let start = 0; start < n; start += length) {
      for (let k = 0; k < half; k++) {
        const w = k * stride;
        const a = start + k;
        const b = a + half;
        const tr = re[b]! * cos[w]! + im[b]! * sin[w]!;
        const ti = im[b]! * cos[w]! - re[b]! * sin[w]!;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
      }
    }
  }
}

/** The pupil's |FFT|², centered, at the reference wavelength. */
function pupilSpectrum(aperture: GlarePupil, size: number): Float32Array {
  const radius = size * PUPIL_SHARE;
  const re = new Float64Array(size * size);
  const im = new Float64Array(size * size);
  const middle = size / 2;
  const from = Math.floor(middle - radius - 1);
  const to = Math.ceil(middle + radius + 1);
  for (let y = from; y < to; y++) {
    for (let x = from; x < to; x++) {
      let seen = 0;
      for (let j = 0; j < SUPERSAMPLE; j++) {
        for (let i = 0; i < SUPERSAMPLE; i++) {
          const px = (x + (i + 0.5) / SUPERSAMPLE - middle) / radius;
          const py = (y + (j + 0.5) / SUPERSAMPLE - middle) / radius;
          if (pupilAt(aperture, px, py)) {
            seen++;
          }
        }
      }
      re[y * size + x] = seen / (SUPERSAMPLE * SUPERSAMPLE);
    }
  }
  const cos = new Float64Array(size / 2);
  const sin = new Float64Array(size / 2);
  for (let i = 0; i < size / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / size);
    sin[i] = Math.sin((2 * Math.PI * i) / size);
  }
  const lineRe = new Float64Array(size);
  const lineIm = new Float64Array(size);
  for (let y = 0; y < size; y++) {
    lineRe.set(re.subarray(y * size, (y + 1) * size));
    lineIm.set(im.subarray(y * size, (y + 1) * size));
    fftLine(lineRe, lineIm, cos, sin);
    re.set(lineRe, y * size);
    im.set(lineIm, y * size);
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      lineRe[y] = re[y * size + x]!;
      lineIm[y] = im[y * size + x]!;
    }
    fftLine(lineRe, lineIm, cos, sin);
    for (let y = 0; y < size; y++) {
      re[y * size + x] = lineRe[y]!;
      im[y * size + x] = lineIm[y]!;
    }
  }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = (y + middle) % size;
    for (let x = 0; x < size; x++) {
      const fx = (x + middle) % size;
      const a = re[fy * size + fx]!;
      const b = im[fy * size + fx]!;
      out[y * size + x] = a * a + b * b;
    }
  }
  return out;
}

/** A wavelength's share in sRGB's channels: a broad, plain response. */
function channelShare(nm: number): [number, number, number] {
  const bell = (center: number, width: number) =>
    Math.exp(-(((nm - center) / width) ** 2) / 2);
  return [bell(605, 35), bell(540, 35), bell(465, 28)];
}

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(Math.max((x - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * The kernel of a pupil, on a grid of `size`, a power of 2: its |FFT|², resampled per
 * wavelength and summed to RGB, longer wavelengths wider, with its core tapered out and
 * the rest normalized. So its spikes come from what the pupil is. The veil carries the
 * core. Takes about a second at 1024: run it in a worker.
 */
export function computeKernel(aperture: GlarePupil, size: number): GlareKernel {
  if (!["round", "vanes", "hex", "blades7"].includes(aperture)) {
    throw new Error(
      `"${String(aperture)}" isn't an aperture; use "round", "vanes", "hex" or "blades7".`,
    );
  }
  if (!Number.isInteger(Math.log2(size)) || size < 8) {
    throw new Error(`A kernel's size must be a power of 2, not ${size}.`);
  }
  const spectrum = pupilSpectrum(aperture, size);
  const texels = new Float32Array(size * size * 4);
  const middle = size / 2;
  const half = middle;
  for (let w = 0; w < WAVELENGTHS; w++) {
    const nm = FROM_NM + ((TO_NM - FROM_NM) * (w + 0.5)) / WAVELENGTHS;
    const [cr, cg, cb] = channelShare(nm);
    // A longer wavelength spreads wider: at a cell, it reads nearer the middle.
    const scale = REFERENCE_NM / nm;
    const energy = scale * scale;
    for (let y = 0; y < size; y++) {
      const sy = middle + (y - middle) * scale;
      const y0 = Math.floor(sy);
      if (y0 < 0 || y0 > size - 2) {
        continue;
      }
      const fy = sy - y0;
      for (let x = 0; x < size; x++) {
        const sx = middle + (x - middle) * scale;
        const x0 = Math.floor(sx);
        if (x0 < 0 || x0 > size - 2) {
          continue;
        }
        const fx = sx - x0;
        const i = y0 * size + x0;
        const v =
          energy *
          ((1 - fy) * ((1 - fx) * spectrum[i]! + fx * spectrum[i + 1]!) +
            fy *
              ((1 - fx) * spectrum[i + size]! + fx * spectrum[i + size + 1]!));
        const o = (y * size + x) * 4;
        texels[o] = texels[o]! + v * cr;
        texels[o + 1] = texels[o + 1]! + v * cg;
        texels[o + 2] = texels[o + 2]! + v * cb;
      }
    }
  }
  const totals = [0, 0, 0];
  const coreTo = Math.max(CORE_TO_CELLS, CORE_TO_SHARE * half);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - middle, y - middle);
      const keep =
        smooth(CORE_FROM_CELLS, coreTo, r) *
        (1 - smooth(EDGE_FROM, 1, r / half));
      const o = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v = texels[o + c]! * keep;
        texels[o + c] = v;
        totals[c] = totals[c]! + v;
      }
      texels[o + 3] = 1;
    }
  }
  for (let o = 0; o < texels.length; o += 4) {
    for (let c = 0; c < 3; c++) {
      texels[o + c] = texels[o + c]! / totals[c]!;
    }
  }
  return { texels, radii: kernelRadii(texels, size), size };
}

/** `GlareKernel.radii`, for `texels`. */
export function kernelRadii(texels: Float32Array, size: number): Float32Array {
  const middle = size / 2;
  // The brightest channel's largest value at each radius.
  const atRadius = new Float32Array(middle + 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.ceil(Math.hypot(x - middle, y - middle));
      if (r <= middle) {
        const o = (y * size + x) * 4;
        const v = Math.max(texels[o]!, texels[o + 1]!, texels[o + 2]!);
        atRadius[r] = Math.max(atRadius[r]!, v);
      }
    }
  }
  const radii = new Float32Array(KERNEL_RADII);
  for (let i = 0; i < KERNEL_RADII; i++) {
    const cut = KERNEL_VISIBLE / 2 ** i;
    let reach = 0;
    for (let r = middle; r > 0; r--) {
      if (atRadius[r]! >= cut) {
        reach = r;
        break;
      }
    }
    radii[i] = reach >= KERNEL_MIN_CELLS ? reach : 0;
  }
  return radii;
}

/** A float as fp16's bits. */
function toHalf(value: number): number {
  const v = Math.abs(value);
  const sign = value < 0 ? 0x8000 : 0;
  if (v < 6.2e-5) {
    return sign | Math.round(v * 2 ** 24);
  }
  if (v >= 65504) {
    return sign | 0x7bff;
  }
  const e = Math.floor(Math.log2(v));
  return (
    sign |
    ((e + 15) << 10) |
    Math.min(Math.round((v / 2 ** e - 1) * 1024), 1023)
  );
}

/** A kernel as it goes to the GPU: fp16 levels of it, which reach a value of 1 at most. */
export interface GlareKernelImage {
  /** RGBA half-floats, by level, each half across. */
  levels: Uint16Array[];
  /** A stored value of 1 is this much of the kernel. */
  scale: number;
  radii: Float32Array;
  size: number;
}

/** `kernel`'s image: box-filtered levels down to a side of 4, scaled for fp16. */
export function kernelImage(kernel: GlareKernel): GlareKernelImage {
  const { texels, size, radii } = kernel;
  let most = 0;
  for (let i = 0; i < texels.length; i += 4) {
    most = Math.max(most, texels[i]!, texels[i + 1]!, texels[i + 2]!);
  }
  const scale = most > 0 ? most : 1;
  const levels: Uint16Array[] = [];
  let level = texels;
  let n = size;
  for (;;) {
    const out = new Uint16Array(n * n * 4);
    for (let i = 0; i < level.length; i += 4) {
      out[i] = toHalf(level[i]! / scale);
      out[i + 1] = toHalf(level[i + 1]! / scale);
      out[i + 2] = toHalf(level[i + 2]! / scale);
      out[i + 3] = 0;
    }
    levels.push(out);
    if (n <= 4) {
      break;
    }
    const m = n >> 1;
    const next = new Float32Array(m * m * 4);
    for (let y = 0; y < m; y++) {
      for (let x = 0; x < m; x++) {
        const o = (y * m + x) * 4;
        for (let c = 0; c < 3; c++) {
          next[o + c] =
            (level[(y * 2 * n + x * 2) * 4 + c]! +
              level[(y * 2 * n + x * 2 + 1) * 4 + c]! +
              level[((y * 2 + 1) * n + x * 2) * 4 + c]! +
              level[((y * 2 + 1) * n + x * 2 + 1) * 4 + c]!) /
            4;
        }
      }
    }
    level = next;
    n = m;
  }
  return { levels, scale, radii, size };
}
