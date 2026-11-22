/**
 * An albedo map's mean, for the sky's Moon (`Sky.setMoonMap`): with no
 * GPU or DOM, so the Moon map's worker can work it out from the raster it
 * composed, and the page needn't read the map back.
 */

/** sRGB 8-bit levels to linear, one entry a level. */
const LINEAR = new Float64Array(256).map((_, c) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
});

/**
 * An equirectangular map's mean (linear luminance of its sRGB texels),
 * weighted by latitude's cosine (its rows shrink toward the poles). `data`
 * is RGBA8, rows top down. 1 for a black map: no scale to set.
 */
export function meanAlbedo(
  data: ArrayLike<number>,
  width: number,
  height: number,
): number {
  let sum = 0;
  let weights = 0;
  for (let y = 0; y < height; y++) {
    const w = Math.cos(((y + 0.5) / height - 0.5) * Math.PI);
    let row = 0;
    for (let i = y * width * 4, end = i + width * 4; i < end; i += 4) {
      row +=
        0.2126 * LINEAR[data[i]!]! +
        0.7152 * LINEAR[data[i + 1]!]! +
        0.0722 * LINEAR[data[i + 2]!]!;
    }
    sum += w * row;
    weights += w * width;
  }
  return sum > 0 ? sum / weights : 1;
}
