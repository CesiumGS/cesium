// What the generator writes into a site's one tileset and the page reads back
// (scripts/designTiles.mjs, siteDrawings.ts): each vertex's two
// positions, its stand-off, and the spacing of a ladder site's whiskers. Plain
// data and arithmetic: both run it, the generator in Node.

/**
 * The attribute carrying each vertex's reprojected position, in the rigid
 * tile's model space: its second position (`DUAL_POSITION_EXTENSION`).
 */
export const REPROJECTED_SEMANTIC = "_DG_REPROJECTED";

/**
 * The attribute carrying how far each vertex's two positions stand apart
 * along its face's normal, metres: what keeps the ghost off the solid's depth.
 */
export const STANDOFF_SEMANTIC = "_DG_STANDOFF";

/**
 * The tileset-level extension stating the second position: the engine's own
 * (`Tileset3D.ts` `DUAL_POSITION_EXTENSION`, which a test holds this equal to),
 * `{ position, maxDistance }`. The engine reads it at load.
 */
export const DUAL_POSITION_EXTENSION = "CESIUM_dual_position";

/**
 * The points of `xyz` (three numbers each) at least `spacing` apart, greedily
 * on a grid of that size: where a model's whiskers stand. Their indices.
 */
export function spacedPoints(
  xyz: ArrayLike<number>,
  spacing: number,
): number[] {
  const taken = new Map<string, number[]>();
  const out: number[] = [];
  const cell = (x: number) => Math.floor(x / spacing);
  for (let v = 0; v < xyz.length / 3; v++) {
    const x = xyz[3 * v]!;
    const y = xyz[3 * v + 1]!;
    const z = xyz[3 * v + 2]!;
    const [cx, cy, cz] = [cell(x), cell(y), cell(z)];
    let near = false;
    for (let dx = -1; dx <= 1 && !near; dx++) {
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dz = -1; dz <= 1 && !near; dz++) {
          for (const u of taken.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            if (
              Math.hypot(
                xyz[3 * u]! - x,
                xyz[3 * u + 1]! - y,
                xyz[3 * u + 2]! - z,
              ) < spacing
            ) {
              near = true;
              break;
            }
          }
        }
      }
    }
    if (!near) {
      out.push(v);
      const key = `${cx},${cy},${cz}`;
      taken.set(key, [...(taken.get(key) ?? []), v]);
    }
  }
  return out;
}
