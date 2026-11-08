// The design globe's colours on the globe (plan 4b Task 18): linear RGBA
// from sRGB, and the whiskers' ramp, short (pale) to long (red).

/** Linear RGBA. */
export type Rgba = readonly [number, number, number, number];

/** The whiskers' colour ramp, short to long (sRGB hex; dark HUD tones). */
export const WHISKER_RAMP = ["#fff1b8", "#ffc46b", "#ff8a3d", "#f2552c"];

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** Linear RGBA of an sRGB hex colour. */
export function hexLinear(hex: string, alpha = 1): Rgba {
  const v = Number.parseInt(hex.slice(1), 16);
  return [
    srgbToLinear(((v >> 16) & 255) / 255),
    srgbToLinear(((v >> 8) & 255) / 255),
    srgbToLinear((v & 255) / 255),
    alpha,
  ];
}

/** The ramp's colour at `u` (0 to 1), linear RGBA. */
export function rampAt(u: number): Rgba {
  const stops = WHISKER_RAMP.map((h) => hexLinear(h));
  const x = Math.min(1, Math.max(0, u)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return [0, 1, 2, 3].map(
    (k) => a[k]! + (b[k]! - a[k]!) * f,
  ) as unknown as Rgba;
}
