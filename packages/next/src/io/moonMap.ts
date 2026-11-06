/**
 * The Moon's albedo map from Cesium Moon Terrain (ion; public, added to an
 * account from the Asset Depot): NASA's LRO WAC mosaic as its tiles show
 * it, laid out equirectangular for the sky's Moon (`moonUv` in sky.slang).
 * No geometry is drawn.
 *
 * The asset is three tilesets, all one tiling scheme: a geographic quadtree
 * (level n: 2^(n+1) × 2^n tiles) whose tiles' textures are equirectangular
 * patches of their longitude and latitude.
 * - The band, `Moon_85s_85n`, in the Moon's own frame: its tiles' images
 *   are transparent past ±85°.
 * - Two polar caps, `Moon_85s_90s` and `Moon_85n_90n`, in a frame turned a
 *   quarter about y (their `root.transform`) that puts the pole on that
 *   frame's equator at longitude 0: only the tiles about that point exist,
 *   their imagery a square ±5° on a side there, from the pole out to 85°
 *   (82.9° at its corners).
 *
 * The band's tiles are laid side by side, a level of the tree at once; the
 * caps' are resampled into the map's polar rows through their frame. This
 * module is the reading and composing alone, with its I/O behind
 * `MoonMapSource`: it runs in the Moon map's worker (moonMapWorker.ts,
 * started by `loadIonMoonMap` in moonMapLoad.ts) and in Node's tests.
 */

import { unwrapB3dm } from "./features.ts";
import { splitGlb } from "./glb.ts";
import { resolveUri } from "./ion.ts";

/** Cesium Moon Terrain's ion asset. */
export const CESIUM_MOON_TERRAIN = 2684829;

/** RGBA8 pixels, rows top down, not premultiplied. */
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * An image and where it lies in its tileset's frame: longitude at its left
 * and right edges, latitude at its top and bottom, degrees.
 */
export interface MoonPatch {
  image: Raster;
  west: number;
  east: number;
  north: number;
  south: number;
}

/** A polar cap's imagery, in its tileset's frame. */
export interface MoonCap {
  pole: "north" | "south";
  /** The cap's frame to the Moon's: 3 × 3, column-major (`capRotation`). */
  rotation: number[];
  patches: MoonPatch[];
}

/**
 * Where the map's tiles come from (`loadIonMoonMap`'s worker: ion, with its
 * token).
 */
export interface MoonMapSource {
  /** A resource of the asset; rejects on an error response. */
  fetch(url: string): Promise<{
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
  }>;
  /** A tile's image, decoded. */
  decode(bytes: Uint8Array, mimeType: string): Promise<Raster>;
}

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * The caps are read this many levels below the band: their pixels are then
 * about the band's across a meridian at 85° (the band's 0.18° at level 2 is
 * 0.47 km there; the caps' level 5, 0.022°, is 0.67 km). Down to level 5
 * a cap's imagery is four tiles (the band's levels 0–2), at level 6 sixteen
 * (the band's 3 and deeper); level 7 and below are external tilesets.
 */
const CAP_LEVELS_BELOW_BAND = 3;
const DEEPEST_CAP_LEVEL = 6;

/**
 * The widest map read: WebGPU's default `maxTextureDimension2D` (the band's
 * level 4; level 2 is 2048).
 */
const MAX_MAP_WIDTH = 8192;

/**
 * Where the band hands over to a cap, degrees of latitude: the cap's
 * imagery fades in from 84° (where the two overlap: the caps' square
 * corners) and is all there is past 85°, where the band has none.
 */
const SEAM_START = 84;
const SEAM_END = 85;

/**
 * The map from the asset's root tileset at `url`: its band at `level`, and
 * its caps (each, when it fails, a warning instead).
 */
export async function readMoonMap(
  url: string,
  source: MoonMapSource,
  level: number,
): Promise<{ map: Raster; warnings: string[] }> {
  const root = (await (await source.fetch(url)).json()) as Json;
  const children = root.root.children as Json[];
  // The band's tileset is the child centered on the Moon's; the caps' sit
  // over the poles.
  const center = (c: Json) => (c.boundingVolume.box as number[]).slice(0, 3);
  const band = children.find(
    (c) => c.content?.uri && Math.hypot(...center(c)) < 1000,
  );
  if (!band) {
    throw new Error("Moon map: no tileset for the band of latitudes");
  }
  const capLevel = Math.min(level + CAP_LEVELS_BELOW_BAND, DEEPEST_CAP_LEVEL);
  const warnings: string[] = [];
  const readCap = async (pole: "north" | "south"): Promise<MoonCap | null> => {
    try {
      const cap = children.find(
        (c) =>
          c !== band &&
          c.content?.uri &&
          Math.sign(center(c)[2]!) === (pole === "north" ? 1 : -1),
      );
      if (!cap) {
        throw new Error(`no tileset over the ${pole} pole`);
      }
      const { tileset, patches } = await readTileset(
        resolveUri(cap.content.uri, url),
        capLevel,
        source,
      );
      return {
        pole,
        rotation: capRotation(tileset.root.transform),
        patches,
      };
    } catch (error) {
      warnings.push(
        `Moon map: the ${pole} polar cap did not load, the band's last row is stretched over it (${error instanceof Error ? error.message : String(error)})`,
      );
      return null;
    }
  };
  // The caps load alongside the band's tiles.
  const [{ patches }, ...caps] = await Promise.all([
    readTileset(resolveUri(band.content.uri, url), level, source),
    readCap("north"),
    readCap("south"),
  ]);
  const first = patches[0]!;
  const width =
    Math.round(360 / Math.abs(first.east - first.west)) * first.image.width;
  // A bad tile (its fitted edges too close, or not numbers) would ask for
  // a map past what a texture can hold.
  if (
    !Number.isInteger(width) ||
    width < 2 ||
    width % 2 !== 0 ||
    width > MAX_MAP_WIDTH
  ) {
    throw new Error(
      `Moon map: the band's tiles make a map ${width} texels wide (at most ${MAX_MAP_WIDTH}, even)`,
    );
  }
  const map = placePatches(width, width / 2, patches);
  return {
    map: composeMoonMap(
      map,
      caps.filter((c) => c !== null),
    ),
    warnings,
  };
}

/** A tileset's tiles at `level` (its root's children are level 0). */
async function readTileset(
  url: string,
  level: number,
  source: MoonMapSource,
): Promise<{ tileset: Json; patches: MoonPatch[] }> {
  const tileset = (await (await source.fetch(url)).json()) as Json;
  const uris: string[] = [];
  const walk = (tile: Json, depth: number) => {
    if (depth === level) {
      if (tile.content?.uri) {
        uris.push(resolveUri(tile.content.uri, url));
      }
      return;
    }
    for (const child of tile.children ?? []) {
      walk(child, depth + 1);
    }
  };
  for (const child of tileset.root.children ?? []) {
    walk(child, 0);
  }
  if (uris.length === 0) {
    throw new Error(`Moon map: no tiles at level ${level} in ${url}`);
  }
  const patches = await Promise.all(
    uris.map(async (uri) => {
      const tile = readTile(
        new Uint8Array(await (await source.fetch(uri)).arrayBuffer()),
      );
      return {
        ...tile,
        image: await source.decode(tile.image, tile.mimeType),
      };
    }),
  );
  return { tileset, patches };
}

/**
 * A tile's image decoded to RGBA8 (`createImageBitmap` and an
 * OffscreenCanvas: a page or a worker).
 */
export async function decodeImage(
  bytes: Uint8Array,
  mimeType: string,
): Promise<Raster> {
  const bitmap = await createImageBitmap(
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mimeType }),
    { colorSpaceConversion: "none", premultiplyAlpha: "none" },
  );
  const { width, height } = bitmap;
  const g = new OffscreenCanvas(width, height).getContext("2d", {
    willReadFrequently: true,
  })!;
  g.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { width, height, data: g.getImageData(0, 0, width, height).data };
}

// ---- Geometry: the map, the Moon's directions, the caps' frames.

const DEG = Math.PI / 180;

/**
 * A tileset `root.transform`'s rotation (its columns' lengths divided out):
 * the tileset's frame to the Moon's, 3 × 3 column-major. Identity without
 * one.
 */
export function capRotation(transform?: number[]): number[] {
  if (!transform) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const out: number[] = [];
  for (let c = 0; c < 3; c++) {
    const column = transform.slice(c * 4, c * 4 + 3);
    const length = Math.hypot(...column);
    out.push(...column.map((v) => v / length));
  }
  return out;
}

function direction(latitude: number, longitude: number): number[] {
  const c = Math.cos(latitude * DEG);
  return [
    c * Math.cos(longitude * DEG),
    c * Math.sin(longitude * DEG),
    Math.sin(latitude * DEG),
  ];
}

/** Latitude and longitude, degrees, of a unit direction. */
function angles(x: number, y: number, z: number): [number, number] {
  return [
    Math.asin(Math.max(-1, Math.min(1, z))) / DEG,
    Math.atan2(y, x) / DEG,
  ];
}

/** A cap frame's latitude and longitude on the Moon (r · direction). */
function fromCapFrame(
  r: number[],
  latitude: number,
  longitude: number,
): [number, number] {
  const [x, y, z] = direction(latitude, longitude) as [number, number, number];
  return angles(
    r[0]! * x + r[3]! * y + r[6]! * z,
    r[1]! * x + r[4]! * y + r[7]! * z,
    r[2]! * x + r[5]! * y + r[8]! * z,
  );
}

/**
 * Where a cap's pixel lands in a `width` × `height` map: `px`, `py` a
 * position in the patch's image (pixels from its top left corner), the
 * result one in the map's (texels from its top left; `moonUv` in sky.slang
 * reads the map as u = 0.5 + longitude / 360°, v = 0.5 − latitude / 180°).
 */
export function capPixelToMap(
  cap: Pick<MoonCap, "rotation">,
  patch: MoonPatch,
  px: number,
  py: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const [latitude, longitude] = fromCapFrame(
    cap.rotation,
    patch.north + (py / patch.image.height) * (patch.south - patch.north),
    patch.west + (px / patch.image.width) * (patch.east - patch.west),
  );
  return {
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  };
}

// ---- Composition.

/**
 * Adds `r`'s pixel at (x, y), bilinear (pixel centers at half integers,
 * clamped to its edges), premultiplied and `weight`ed, to `sum`.
 */
function addSample(
  r: Raster,
  x: number,
  y: number,
  weight: number,
  sum: Float64Array,
): void {
  const fx = Math.min(Math.max(x - 0.5, 0), r.width - 1);
  const fy = Math.min(Math.max(y - 0.5, 0), r.height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, r.width - 1);
  const y1 = Math.min(y0 + 1, r.height - 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const d = r.data;
  const a = (1 - tx) * (1 - ty) * weight;
  const b = tx * (1 - ty) * weight;
  const c = (1 - tx) * ty * weight;
  const e = tx * ty * weight;
  const i00 = (y0 * r.width + x0) * 4;
  const i10 = (y0 * r.width + x1) * 4;
  const i01 = (y1 * r.width + x0) * 4;
  const i11 = (y1 * r.width + x1) * 4;
  // Premultiplied: each pixel's weight times its opacity.
  const w00 = (d[i00 + 3]! / 255) * a;
  const w10 = (d[i10 + 3]! / 255) * b;
  const w01 = (d[i01 + 3]! / 255) * c;
  const w11 = (d[i11 + 3]! / 255) * e;
  for (let k = 0; k < 3; k++) {
    sum[k]! +=
      d[i00 + k]! * w00 +
      d[i10 + k]! * w10 +
      d[i01 + k]! * w01 +
      d[i11 + k]! * w11;
  }
  sum[3]! += w00 + w10 + w01 + w11;
}

/**
 * Lays the band's patches into a `width` × `height` map, each over the
 * texels its edges reach out to (whole texels: no seams between tiles).
 */
function placePatches(
  width: number,
  height: number,
  patches: MoonPatch[],
): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  const sum = new Float64Array(4);
  const x = (longitude: number) => ((longitude + 180) / 360) * width;
  const y = (latitude: number) => ((90 - latitude) / 180) * height;
  for (const p of patches) {
    const x0 = Math.max(0, Math.floor(x(Math.min(p.west, p.east))));
    const x1 = Math.min(width, Math.ceil(x(Math.max(p.west, p.east))));
    const y0 = Math.max(0, Math.floor(y(Math.max(p.north, p.south))));
    const y1 = Math.min(height, Math.ceil(y(Math.min(p.north, p.south))));
    // The patch's pixels per texel, and where its pixel 0 is.
    const sx = (x(p.east) - x(p.west)) / p.image.width;
    const sy = (y(p.south) - y(p.north)) / p.image.height;
    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        sum.fill(0);
        addSample(
          p.image,
          (i + 0.5 - x(p.west)) / sx,
          (j + 0.5 - y(p.north)) / sy,
          1,
          sum,
        );
        over(data, (j * width + i) * 4, sum);
      }
    }
  }
  return { width, height, data };
}

/** Puts a premultiplied color over a map texel. */
function over(data: Uint8ClampedArray, i: number, color: Float64Array): void {
  const a = color[3]!;
  const below = (data[i + 3]! / 255) * (1 - a);
  const alpha = a + below;
  if (alpha <= 0) {
    return;
  }
  for (let c = 0; c < 3; c++) {
    data[i + c] = (color[c]! + data[i + c]! * below) / alpha;
  }
  data[i + 3] = alpha * 255;
}

/**
 * The band's map with its polar rows from the caps: each cap is resampled
 * into the map's texels through its frame, its tones matched to the band's
 * where the two overlap, and faded in over the band from 84° to 85°. Then
 * what is still not opaque (a cap missing, or a sliver neither covers)
 * takes the nearest opaque texel toward the equator, down its column: the
 * band's last row stretched over the pole. Changes and returns `map`.
 */
export function composeMoonMap(map: Raster, caps: MoonCap[]): Raster {
  const { width, height, data } = map;
  const texel = 180 / height; // degrees
  const sum = new Float64Array(5);
  for (const cap of caps) {
    const sign = cap.pole === "north" ? 1 : -1;
    // The cap's rows, from the seam's start to the pole.
    const rows: number[] = [];
    for (let j = 0; j < height; j++) {
      if ((90 - (j + 0.5) * texel) * sign >= SEAM_START - texel) {
        rows.push(j);
      }
    }
    const sampler = capSampler(cap, width, height);
    // Its tones as the band's: histograms of the two where both have
    // imagery, between the seam's ends (the cap's square corners).
    const capCounts = new Float64Array(3 * 256);
    const bandCounts = new Float64Array(3 * 256);
    let overlap = 0;
    for (const j of rows) {
      const latitude = (90 - (j + 0.5) * texel) * sign;
      if (latitude < SEAM_START || latitude > SEAM_END) {
        continue;
      }
      for (let i = 0; i < width; i++) {
        const k = (j * width + i) * 4;
        if (data[k + 3] !== 255 || !sampler(j, i, sum) || sum[3]! < 0.999) {
          continue;
        }
        overlap++;
        for (let c = 0; c < 3; c++) {
          capCounts[c * 256 + Math.round(sum[c]! / sum[3]!)]! += 1;
          bandCounts[c * 256 + data[k + c]!]! += 1;
        }
      }
    }
    const tones =
      overlap >= MIN_OVERLAP
        ? [0, 1, 2].map((c) =>
            matchHistogram(
              capCounts.subarray(c * 256, c * 256 + 256),
              bandCounts.subarray(c * 256, c * 256 + 256),
            ),
          )
        : undefined;
    const color = new Float64Array(4);
    for (const j of rows) {
      for (let i = 0; i < width; i++) {
        if (!sampler(j, i, sum) || sum[4]! <= 0) {
          continue;
        }
        // The cap's color (its tones the band's), at its faded opacity.
        const alpha = sum[4]!;
        for (let c = 0; c < 3; c++) {
          const value = sum[c]! / sum[3]!;
          color[c] = (tones ? lookUp(tones[c]!, value) : value) * alpha;
        }
        color[3] = alpha;
        over(data, (j * width + i) * 4, color);
      }
    }
  }
  // The rest past the band's last opaque texel: stretched to the pole.
  const middle = height >> 1;
  for (let i = 0; i < width; i++) {
    for (let j = middle - 1; j >= 0; j--) {
      copyIfNotOpaque(data, (j * width + i) * 4, ((j + 1) * width + i) * 4);
    }
    for (let j = middle; j < height; j++) {
      copyIfNotOpaque(data, (j * width + i) * 4, ((j - 1) * width + i) * 4);
    }
  }
  return map;
}

/** Fewer texels where band and cap overlap: the cap's tones are kept. */
const MIN_OVERLAP = 64;

/**
 * Samples a cap over a map texel (row j, column i), box-filtered: as many
 * samples as the cap's pixels the texel spans each way (up to 8), each
 * bilinear. Into `sum`: the premultiplied color and its opacity (0–3),
 * and the opacity faded by the seam (4). False where the cap has none.
 */
function capSampler(
  cap: MoonCap,
  width: number,
  height: number,
): (j: number, i: number, sum: Float64Array) => boolean {
  const texel = 180 / height;
  const r = cap.rotation;
  const sign = cap.pole === "north" ? 1 : -1;
  // The cap's pixel size, degrees.
  const pixel = Math.min(
    ...cap.patches.map((p) => Math.abs(p.north - p.south) / p.image.height),
  );
  // Per row: the samples' latitudes' cosines and sines, and their fade.
  const rows = new Map<number, { across: number; samples: number[][] }>();
  const row = (j: number) => {
    let found = rows.get(j);
    if (!found) {
      const latitude = 90 - (j + 0.5) * texel;
      const along = Math.min(8, Math.max(1, Math.round(texel / pixel)));
      const across = Math.min(
        8,
        Math.max(1, Math.round((texel * Math.cos(latitude * DEG)) / pixel)),
      );
      const samples: number[][] = [];
      for (let a = 0; a < along; a++) {
        const sampleLatitude = latitude + ((a + 0.5) / along - 0.5) * texel;
        samples.push([
          Math.cos(sampleLatitude * DEG),
          Math.sin(sampleLatitude * DEG),
          smoothstep(SEAM_START, SEAM_END, sampleLatitude * sign),
        ]);
      }
      found = { across, samples };
      rows.set(j, found);
    }
    return found;
  };
  return (j, i, sum) => {
    sum.fill(0);
    const { across, samples } = row(j);
    const weight = 1 / (samples.length * across);
    for (let b = 0; b < across; b++) {
      const longitude = ((i + (b + 0.5) / across) / width) * 360 - 180;
      const cosLongitude = Math.cos(longitude * DEG);
      const sinLongitude = Math.sin(longitude * DEG);
      for (const [cosLatitude, sinLatitude, fade] of samples) {
        // The Moon's direction, into the cap's frame (rᵀ · d).
        const x = cosLatitude! * cosLongitude;
        const y = cosLatitude! * sinLongitude;
        const z = sinLatitude!;
        const lx = r[0]! * x + r[1]! * y + r[2]! * z;
        const ly = r[3]! * x + r[4]! * y + r[5]! * z;
        const lz = r[6]! * x + r[7]! * y + r[8]! * z;
        const capLatitude = Math.asin(Math.max(-1, Math.min(1, lz))) / DEG;
        const capLongitude = Math.atan2(ly, lx) / DEG;
        const patch = patchAt(cap.patches, capLatitude, capLongitude, pixel);
        if (patch) {
          const before = sum[3]!;
          addSample(
            patch.image,
            ((capLongitude - patch.west) / (patch.east - patch.west)) *
              patch.image.width,
            ((capLatitude - patch.north) / (patch.south - patch.north)) *
              patch.image.height,
            weight,
            sum,
          );
          sum[4]! += (sum[3]! - before) * fade!;
        }
      }
    }
    return sum[3]! > 0;
  };
}

/**
 * Histogram matching: for each of 256 levels of one image, the level of
 * another at the same rank (both histograms of the same ground). A table
 * of 256 levels (fractional), increasing.
 */
function matchHistogram(from: Float64Array, to: Float64Array): Float64Array {
  const cumulative = (counts: Float64Array) => {
    const out = new Float64Array(257);
    for (let v = 0; v < 256; v++) {
      out[v + 1] = out[v]! + counts[v]!;
    }
    const total = out[256]!;
    return out.map((c) => c / total);
  };
  const fromRank = cumulative(from);
  const toRank = cumulative(to);
  const table = new Float64Array(256);
  let level = 0;
  for (let v = 0; v < 256; v++) {
    // The level's middle rank, and where the other reaches it (each level
    // spread evenly over its own rank's span).
    const rank = (fromRank[v]! + fromRank[v + 1]!) / 2;
    while (level < 255 && toRank[level + 1]! < rank) {
      level++;
    }
    const span = toRank[level + 1]! - toRank[level]!;
    table[v] =
      span > 0
        ? level + Math.min(1, Math.max(0, (rank - toRank[level]!) / span)) - 0.5
        : level;
  }
  return table;
}

/** A table's value at a fractional level, linear between its entries. */
function lookUp(table: Float64Array, value: number): number {
  const v = Math.min(Math.max(value, 0), 255);
  const v0 = Math.floor(v);
  const v1 = Math.min(v0 + 1, 255);
  return Math.min(
    255,
    Math.max(0, table[v0]! + (table[v1]! - table[v0]!) * (v - v0)),
  );
}

function copyIfNotOpaque(
  data: Uint8ClampedArray,
  to: number,
  from: number,
): void {
  if (data[to + 3]! < 255 && data[from + 3] === 255) {
    data.copyWithin(to, from, from + 4);
  }
}

/**
 * The patch that has the point, if any; else the nearest within a pixel of
 * its edges (fitted edges leave sub-pixel gaps between tiles). A point
 * near a tile's edge inside the cap is its own tile's, not its
 * neighbour's clamped edge.
 */
function patchAt(
  patches: MoonPatch[],
  latitude: number,
  longitude: number,
  pixel: number,
): MoonPatch | undefined {
  let nearest: MoonPatch | undefined;
  let nearestDistance = pixel;
  for (const p of patches) {
    // How far outside the patch the point is, each way (0 inside).
    const outside = Math.max(
      Math.min(p.west, p.east) - longitude,
      longitude - Math.max(p.west, p.east),
      Math.min(p.north, p.south) - latitude,
      latitude - Math.max(p.north, p.south),
    );
    if (outside <= 0) {
      return p;
    }
    if (outside <= nearestDistance) {
      nearest = p;
      nearestDistance = outside;
    }
  }
  return nearest;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

// ---- Tiles.

/**
 * A tile's image and where it lies in its tileset's frame: its vertices'
 * longitude and latitude against their texture coordinates, each fitted by
 * a line (u linear in longitude, v in latitude).
 */
function readTile(bytes: Uint8Array): Omit<MoonPatch, "image"> & {
  image: Uint8Array;
  mimeType: string;
} {
  const b3dm = unwrapB3dm(bytes);
  const { json, bin } = splitGlb(b3dm.glb);
  if (!bin) {
    throw new Error("Moon map: a tile without a binary chunk");
  }
  const primitive = json.meshes[0].primitives[0];
  // Floats, read from the BIN chunk alone (not the buffer it lies in).
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const read = (index: number, size: number): Float32Array => {
    const accessor = json.accessors?.[index];
    if (!accessor) {
      throw new Error(`Moon map: a tile has no accessor ${index}`);
    }
    if (accessor.componentType !== FLOAT) {
      throw new Error(
        `Moon map: a tile's accessor ${index} has componentType ${accessor.componentType}, not float (${FLOAT})`,
      );
    }
    const view = binView(json, accessor.bufferView, bin.byteLength);
    const stride = view.byteStride ?? size * 4;
    const count: number = accessor.count;
    const start = accessor.byteOffset ?? 0;
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      !Number.isInteger(start) ||
      start < 0 ||
      !Number.isInteger(stride) ||
      stride < size * 4 ||
      start + (count - 1) * stride + size * 4 > view.byteLength
    ) {
      throw new Error(
        `Moon map: a tile's accessor ${index} reaches past its view`,
      );
    }
    const out = new Float32Array(count * size);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < size; c++) {
        out[i * size + c] = data.getFloat32(
          view.byteOffset + start + i * stride + c * 4,
          true,
        );
      }
    }
    return out;
  };
  const positions = read(primitive.attributes.POSITION, 3);
  const uvs = read(primitive.attributes.TEXCOORD_0, 2);
  // The mesh's node's transform from the scene's root, then glTF's y-up
  // to the tileset's z-up, then the tile's RTC center.
  const meshNode = (json.nodes as Json[]).findIndex((n) => n.mesh === 0);
  const chain = [meshNode];
  for (let parent = parentOf(json.nodes, meshNode); parent >= 0;) {
    chain.unshift(parent);
    parent = parentOf(json.nodes, parent);
  }
  let m = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]; // y-up to z-up
  for (const n of chain) {
    m = multiply(m, nodeMatrix(json.nodes[n]));
  }
  const rtc = b3dm.rtcCenter ?? [0, 0, 0];
  const count = positions.length / 3;
  const longitudes: number[] = [];
  const us: number[] = [];
  const latitudes: number[] = [];
  const vs: number[] = [];
  for (let i = 0; i < count; i++) {
    const px = positions[i * 3]!;
    const py = positions[i * 3 + 1]!;
    const pz = positions[i * 3 + 2]!;
    const wx = m[0]! * px + m[4]! * py + m[8]! * pz + m[12]! + rtc[0];
    const wy = m[1]! * px + m[5]! * py + m[9]! * pz + m[13]! + rtc[1];
    const wz = m[2]! * px + m[6]! * py + m[10]! * pz + m[14]! + rtc[2];
    const latitude = (Math.atan2(wz, Math.hypot(wx, wy)) * 180) / Math.PI;
    latitudes.push(latitude);
    vs.push(uvs[i * 2 + 1]!);
    // At the poles longitude says nothing.
    if (Math.abs(latitude) < 89.9) {
      longitudes.push((Math.atan2(wy, wx) * 180) / Math.PI);
      us.push(uvs[i * 2]!);
    }
  }
  // Longitudes about the tile's own (one edge at ±180° reads either way).
  const middle = [...longitudes].sort((a, b) => a - b)[longitudes.length >> 1]!;
  for (let i = 0; i < longitudes.length; i++) {
    longitudes[i] = middle + remainder(longitudes[i]! - middle);
  }
  const u = fitLine(longitudes, us);
  const v = fitLine(latitudes, vs);
  const image = json.images[0];
  const view = binView(json, image.bufferView, bin.byteLength);
  return {
    image: bin.slice(view.byteOffset, view.byteOffset + view.byteLength),
    mimeType: image.mimeType,
    west: -u.offset / u.slope,
    east: (1 - u.offset) / u.slope,
    north: -v.offset / v.slope,
    south: (1 - v.offset) / v.slope,
  };
}

/** glTF's FLOAT component type. */
const FLOAT = 5126;

/** A buffer view, checked to lie inside the BIN chunk (`binLength` bytes). */
function binView(
  json: Json,
  index: number,
  binLength: number,
): { byteOffset: number; byteLength: number; byteStride?: number } {
  const view = json.bufferViews?.[index];
  const byteOffset = view?.byteOffset ?? 0;
  const byteLength = view?.byteLength;
  if (
    !Number.isInteger(byteOffset) ||
    !Number.isInteger(byteLength) ||
    byteOffset < 0 ||
    byteLength < 0 ||
    byteOffset + byteLength > binLength
  ) {
    throw new Error(
      `Moon map: a tile's buffer view ${index} lies outside its BIN chunk`,
    );
  }
  return { byteOffset, byteLength, byteStride: view.byteStride };
}

function parentOf(nodes: Json[], child: number): number {
  return nodes.findIndex((n) => (n.children ?? []).includes(child));
}

function nodeMatrix(node: Json): number[] {
  if (node.matrix) {
    return node.matrix;
  }
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (qy * qy + qz * qz)) * sx,
    2 * (qx * qy + qz * qw) * sx,
    2 * (qx * qz - qy * qw) * sx,
    0,
    2 * (qx * qy - qz * qw) * sy,
    (1 - 2 * (qx * qx + qz * qz)) * sy,
    2 * (qy * qz + qx * qw) * sy,
    0,
    2 * (qx * qz + qy * qw) * sz,
    2 * (qy * qz - qx * qw) * sz,
    (1 - 2 * (qx * qx + qy * qy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

/** a × b, column-major 4 × 4. */
function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r]! * b[c * 4]! +
        a[4 + r]! * b[c * 4 + 1]! +
        a[8 + r]! * b[c * 4 + 2]! +
        a[12 + r]! * b[c * 4 + 3]!;
    }
  }
  return out;
}

/** An angle's difference in degrees, within ±180. */
function remainder(degrees: number): number {
  return degrees - 360 * Math.round(degrees / 360);
}

/** Least squares: y = slope × x + offset. */
function fitLine(
  xs: number[],
  ys: number[],
): { slope: number; offset: number } {
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i]!;
    my += ys[i]!;
  }
  mx /= n;
  my /= n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, offset: my - slope * mx };
}
