// surface.slang's terrain region test, in float32 as the GPU runs it, for
// tests that check what the shader does with a region's rows.
import { splitVec3 } from "../src/math/transforms.ts";

/**
 * surface.slang `terrainOpacity` for one region, in float32 as the GPU
 * runs it: `rows` as packed, the camera split hi/lo, the fragment's
 * camera-relative position in float32.
 */
export function shaderInside(
  rows: Float32Array,
  camera: Float64Array,
  point: Float64Array,
  budget: { left: number; cut?: boolean } = { left: 128 },
): boolean {
  const f = Math.fround;
  const u = new Uint32Array(rows.buffer);
  const hi = new Float32Array(3);
  const lo = new Float32Array(3);
  splitVec3(camera, hi, 0, lo, 0);
  const rel = [0, 1, 2].map((i) => f(point[i]! - camera[i]!));
  // SplitPosition.difference: (int(hi) − int(camera hi)) + (lo − camera lo).
  const anchorRel = [0, 1, 2].map((i) =>
    f(f(rows[i]! - hi[i]!) + f(rows[4 + i]! - lo[i]!)),
  );
  const d = rel.map((v, i) => f(v - anchorRel[i]!));
  const dot = (o: number) =>
    f(
      f(f(rows[o]! * d[0]!) + f(rows[o + 1]! * d[1]!)) +
        f(rows[o + 2]! * d[2]!),
    );
  const lx = dot(8);
  const ly = dot(12);
  const lz = dot(16);
  const denominator = f(rows[3]! + lz);
  if (denominator <= 0) {
    return false;
  }
  const k = f(rows[3]! / denominator);
  const qx = f(lx * k);
  const qy = f(ly * k);
  const [x0, y0, x1, y1] = [rows[20]!, rows[21]!, rows[22]!, rows[23]!];
  if (qx < x0 || qy < y0 || qx > x1 || qy > y1) {
    return false;
  }
  const columns = Math.min(Math.max(u[7]! & 0xffff, 1), 128);
  const gridRows = Math.min(Math.max(u[7]! >>> 16, 1), 128);
  const grid = 6;
  const edges = grid + columns * gridRows;
  const cw = f(f(x1 - x0) / columns);
  const ch = f(f(y1 - y0) / gridRows);
  const ax = Math.min(Math.floor(Math.max(f(f(qx - x0) / cw), 0)), columns - 1);
  const ay = Math.min(
    Math.floor(Math.max(f(f(qy - y0) / ch), 0)),
    gridRows - 1,
  );
  const c = (grid + ay * columns + ax) * 4;
  const start = u[c]!;
  const count = Math.min(u[c + 1]! & 0x7fffffff, 32, budget.left);
  budget.cut ||= count < (u[c + 1]! & 0x7fffffff);
  budget.left -= count;
  let inside = u[c + 1]! >>> 31 === 1;
  const sx = rows[c + 2]!;
  const sy = rows[c + 3]!;
  // surface.slang `segmentsCross`, in float32.
  const side = (ex: number, ey: number, px: number, py: number) =>
    f(f(ex * py) - f(ey * px)) > 0;
  for (let j = 0; j < count; j++) {
    const o = (edges + start + j) * 4;
    const [pax, pay, pbx, pby] = [
      rows[o]!,
      rows[o + 1]!,
      rows[o + 2]!,
      rows[o + 3]!,
    ];
    const ex = f(pbx - pax);
    const ey = f(pby - pay);
    const tx = f(sx - qx);
    const ty = f(sy - qy);
    if (
      side(ex, ey, f(qx - pax), f(qy - pay)) !==
        side(ex, ey, f(sx - pax), f(sy - pay)) &&
      side(tx, ty, f(pax - qx), f(pay - qy)) !==
        side(tx, ty, f(pbx - qx), f(pby - qy))
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** A region as the world's directory holds it (surface.slang `clipBoxes`). */
export interface ShaderRegion {
  /** 0 (not drawn) to 1 (no effect). */
  opacity: number;
  /** Ground for height captures: the directory's w. Default: opacity above 0. */
  ground?: boolean;
  /** The whole globe's slot: no shape. */
  everywhere?: boolean;
  /** `packClipShape`'s rows, for a region with a shape. */
  rows?: Float32Array;
}

/**
 * surface.slang `terrainOpacity`: the least opacity of the regions of
 * `mask` (a bit per slot, tested from the lowest) that hold `point`, 1
 * where none does, 0 in a cut. `which`: "seen" every region's opacity;
 * "cuts" (or true) only regions of opacity 0 (`clippedOut`); "holes" only
 * regions that aren't ground, as opacity 0 (height captures). A region
 * that can't lower what was found isn't tested; the edge budget is shared
 * by the regions tested.
 */
export function shaderOpacity(
  regions: ReadonlyArray<ShaderRegion | undefined>,
  mask: number,
  camera: Float64Array,
  point: Float64Array,
  which: boolean | "seen" | "cuts" | "holes",
): number {
  const mode = which === true ? "cuts" : which === false ? "seen" : which;
  const budget = { left: 128 };
  let opacity = 1;
  for (let slot = 0; slot < 32; slot++) {
    if ((mask & (1 << slot)) === 0) {
      continue;
    }
    // A slot with no region reads as a cut of no shape: never inside.
    const region = regions[slot] ?? { opacity: 0, rows: undefined };
    let alpha = Math.fround(region.opacity);
    if (mode === "holes") {
      if (region.ground ?? region.opacity > 0) {
        continue;
      }
      alpha = 0;
    }
    if (alpha >= opacity || (mode === "cuts" && alpha > 0)) {
      continue;
    }
    if (region.everywhere) {
      opacity = alpha;
      continue;
    }
    if (region.rows && shaderInside(region.rows, camera, point, budget)) {
      opacity = alpha;
      if (opacity <= 0) {
        return 0;
      }
    }
  }
  return opacity;
}

/**
 * surface.slang `terrainAlpha`: a draw's opacity from its regions at a
 * fragment. 1 for a draw with no mask; 0 on a skirt wherever the terrain
 * is less than opaque (`OPAQUE_ALPHA`); `terrainSeen` false is a height
 * capture, which leaves out only what isn't ground.
 */
export function shaderTerrainAlpha(
  regions: ReadonlyArray<ShaderRegion | undefined>,
  mask: number,
  camera: Float64Array,
  point: Float64Array,
  options: { skirt?: boolean; terrainSeen?: boolean } = {},
): number {
  if (mask === 0) {
    return 1;
  }
  const opacity = shaderOpacity(
    regions,
    mask,
    camera,
    point,
    options.terrainSeen === false ? "holes" : "seen",
  );
  if (opacity < OPAQUE_ALPHA && options.skirt) {
    return 0;
  }
  return opacity;
}

/**
 * surface.slang `clippedOut` (without the placeholders' part): whether the
 * pass leaves the fragment out. The drawn passes leave out cuts (opacity
 * 0); a height capture (`terrainSeen` false) leaves out what isn't ground.
 */
export function shaderClippedOut(
  regions: ReadonlyArray<ShaderRegion | undefined>,
  mask: number,
  camera: Float64Array,
  point: Float64Array,
  terrainSeen = true,
): boolean {
  return (
    mask !== 0 &&
    shaderOpacity(
      regions,
      mask,
      camera,
      point,
      terrainSeen ? "cuts" : "holes",
    ) <= 0
  );
}

/** surface.slang `OPAQUE_ALPHA`. */
export const OPAQUE_ALPHA = Math.fround(0.999);
