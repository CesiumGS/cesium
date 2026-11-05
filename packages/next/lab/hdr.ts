/**
 * Showing scene-referred (HDR) images in lab pages: exposure, Khronos PBR
 * Neutral as 2.0's present pass applies it, sRGB encoding; and a heat map
 * of the relative difference between two images.
 */

/** Rec. 709 luminance. */
export const luminance = (r: number, g: number, b: number): number =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Khronos PBR Neutral, as present.slang. */
export function pbrNeutral(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const startCompression = 0.8 - 0.04;
  const desaturation = 0.15;
  const x = Math.min(r, g, b);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  let c: [number, number, number] = [r - offset, g - offset, b - offset];
  const peak = Math.max(...c);
  if (peak < startCompression) {
    return c;
  }
  const d = 1 - startCompression;
  const newPeak = 1 - (d * d) / (peak + d - startCompression);
  c = c.map((v) => (v * newPeak) / peak) as [number, number, number];
  const k = 1 - 1 / (desaturation * (peak - newPeak) + 1);
  return c.map((v) => v * (1 - k) + newPeak * k) as [number, number, number];
}

const encodeSrgb = (c: number): number => {
  const x = Math.min(Math.max(c, 0), 1);
  return Math.round(
    (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) * 255,
  );
};

export interface HdrPixels {
  width: number;
  height: number;
  /** Linear RGB, `stride` values per pixel (3 or 4), rows from the top. */
  data: ArrayLike<number>;
  stride: number;
  /** Pixels to show; others are black. */
  mask?: (i: number) => boolean;
}

/** Mean luminance over the pixels shown. */
export function meanLuminance(image: HdrPixels): number {
  let sum = 0;
  let n = 0;
  const { data, stride } = image;
  for (let i = 0; i < image.width * image.height; i++) {
    if (!image.mask || image.mask(i)) {
      sum += luminance(
        data[i * stride]!,
        data[i * stride + 1]!,
        data[i * stride + 2]!,
      );
      n++;
    }
  }
  return sum / Math.max(n, 1);
}

function canvasFor(width: number, height: number, zoom: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width * zoom}px`;
  canvas.style.height = `${height * zoom}px`;
  canvas.style.display = "block";
  canvas.style.imageRendering = zoom > 1 ? "pixelated" : "auto";
  return canvas;
}

/** A canvas of an HDR image: exposed, tonemapped (PBR Neutral), sRGB. */
export function picture(
  image: HdrPixels,
  exposure: number,
  zoom = 1,
): HTMLCanvasElement {
  const { width, height, data, stride } = image;
  const canvas = canvasFor(width, height, zoom);
  const g = canvas.getContext("2d")!;
  const out = g.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const shown = !image.mask || image.mask(i);
    const c = pbrNeutral(
      Math.max(0, data[i * stride]! * exposure),
      Math.max(0, data[i * stride + 1]! * exposure),
      Math.max(0, data[i * stride + 2]! * exposure),
    );
    for (let k = 0; k < 3; k++) {
      out.data[i * 4 + k] = shown ? encodeSrgb(c[k]!) : 0;
    }
    out.data[i * 4 + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return canvas;
}

/**
 * Relative luminance difference (b − a) / a as a heat map: blue where b is
 * darker, red where brighter, white at ±`range` and beyond.
 */
export function differenceMap(
  a: HdrPixels,
  b: HdrPixels,
  range = 0.25,
  zoom = 1,
): HTMLCanvasElement {
  const { width, height } = a;
  const canvas = canvasFor(width, height, zoom);
  const g = canvas.getContext("2d")!;
  const out = g.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const shown = (!a.mask || a.mask(i)) && (!b.mask || b.mask(i));
    const la = luminance(
      a.data[i * a.stride]!,
      a.data[i * a.stride + 1]!,
      a.data[i * a.stride + 2]!,
    );
    const lb = luminance(
      b.data[i * b.stride]!,
      b.data[i * b.stride + 1]!,
      b.data[i * b.stride + 2]!,
    );
    const t = shown
      ? Math.max(-1, Math.min(1, (lb - la) / Math.max(la, 1e-6) / range))
      : 0;
    // Diverging: blue, gray at 0, red.
    const rgb = !shown
      ? [0, 0, 0]
      : t < 0
        ? [128 + 127 * t, 128 + 127 * t * 0.4, 128 - 100 * t]
        : [128 + 100 * t, 128 - 127 * t * 0.4, 128 - 127 * t];
    for (let k = 0; k < 3; k++) {
      out.data[i * 4 + k] = Math.round(rgb[k]!);
    }
    out.data[i * 4 + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return canvas;
}

/** A figure of canvases side by side with a caption. */
export function figure(
  caption: string,
  ...canvases: HTMLCanvasElement[]
): HTMLElement {
  const element = document.createElement("figure");
  element.style.margin = "0 0 12px";
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.flexWrap = "wrap";
  row.append(...canvases);
  const text = document.createElement("figcaption");
  text.textContent = caption;
  element.append(row, text);
  return element;
}
