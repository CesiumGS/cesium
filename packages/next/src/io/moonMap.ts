/**
 * The Moon's albedo map from Cesium Moon Terrain (ion; public, added to an
 * account from the Asset Depot): NASA's LRO WAC mosaic as its tiles show
 * it. The tileset is a geographic quadtree from 85°S to 85°N (and polar
 * caps, not read here); each tile's texture is an equirectangular patch
 * of its longitude and latitude, so the map is its tiles' images laid side
 * by side, a level of the tree at once, no geometry drawn.
 */

import { unwrapB3dm } from "./features.ts";
import { splitGlb } from "./gltfParse.ts";
import {
  type IonAttribution,
  type IonOptions,
  resolveIonAsset,
  resolveUri,
} from "./ion.ts";

/** Cesium Moon Terrain's ion asset. */
export const CESIUM_MOON_TERRAIN = 2684829;

export interface MoonMap {
  /**
   * Equirectangular, longitude 0 (the near side's center) in the middle,
   * north up, sRGB (`Engine.setMoonMap`).
   */
  image: ImageBitmap;
  /** What the map must credit on screen. */
  attributions: IonAttribution[];
}

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Reads the map from the tree's `level` (2: 8 × 4 tiles of 256², a map of
 * 2048 × 1024; each level doubles it). Rejects without access to the asset.
 */
export async function loadIonMoonMap(
  options: IonOptions & { level?: number } = {},
): Promise<MoonMap> {
  const level = options.level ?? 2;
  const asset = await resolveIonAsset(CESIUM_MOON_TERRAIN, options);
  const fetchFrom = async (url: string): Promise<Response> => {
    const response = await fetch(url, { headers: asset.headers });
    if (!response.ok) {
      throw new Error(`Moon map: ${url} (${response.status})`);
    }
    return response;
  };
  const root: Json = await (await fetchFrom(asset.url)).json();
  // The band's tileset: the child centered on the Moon's (the caps' sit
  // over the poles).
  const band = (root.root.children as Json[]).find(
    (c) =>
      c.content?.uri &&
      Math.hypot(...(c.boundingVolume.box as number[]).slice(0, 3)) < 1000,
  );
  if (!band) {
    throw new Error("Moon map: no tileset for the band of latitudes");
  }
  const bandUrl = resolveUri(band.content.uri, asset.url);
  const tileset: Json = await (await fetchFrom(bandUrl)).json();
  const uris: string[] = [];
  const walk = (tile: Json, depth: number) => {
    if (depth === level) {
      if (tile.content?.uri) {
        uris.push(resolveUri(tile.content.uri, bandUrl));
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
    throw new Error(`Moon map: no tiles at level ${level}`);
  }
  const patches = await Promise.all(
    uris.map(async (uri) =>
      readPatch(new Uint8Array(await (await fetchFrom(uri)).arrayBuffer())),
    ),
  );
  const first = patches[0]!;
  const width =
    Math.round(360 / Math.abs(first.east - first.west)) * first.image.width;
  const height = width / 2;
  const canvas = new OffscreenCanvas(width, height);
  const g = canvas.getContext("2d")!;
  const x = (longitude: number) => ((longitude + 180) / 360) * width;
  const y = (latitude: number) => ((90 - latitude) / 180) * height;
  for (const p of patches) {
    // Edges out to whole texels: no seams between tiles.
    const x0 = Math.floor(x(Math.min(p.west, p.east)));
    const x1 = Math.ceil(x(Math.max(p.west, p.east)));
    const y0 = Math.floor(y(Math.max(p.north, p.south)));
    const y1 = Math.ceil(y(Math.min(p.north, p.south)));
    g.save();
    g.translate(p.east > p.west ? x0 : x1, p.north > p.south ? y0 : y1);
    g.scale(p.east > p.west ? 1 : -1, p.north > p.south ? 1 : -1);
    g.drawImage(p.image, 0, 0, x1 - x0, y1 - y0);
    g.restore();
    p.image.close();
  }
  // Beyond 85° the band's tiles are transparent: the last rows with data
  // stretched over the caps (from the Earth the poles are at the limb).
  const column = g.getImageData(width >> 1, 0, 1, height).data;
  let top = 0;
  while (top < height - 1 && column[top * 4 + 3]! < 255) {
    top++;
  }
  let bottom = height - 1;
  while (bottom > top && column[bottom * 4 + 3]! < 255) {
    bottom--;
  }
  if (top > 0) {
    g.drawImage(canvas, 0, top, width, 1, 0, 0, width, top);
  }
  if (bottom < height - 1) {
    g.drawImage(
      canvas,
      0,
      bottom,
      width,
      1,
      0,
      bottom + 1,
      width,
      height - 1 - bottom,
    );
  }
  return {
    image: canvas.transferToImageBitmap(),
    attributions: asset.attributions,
  };
}

interface Patch {
  image: ImageBitmap;
  /** Longitude at the image's left and right edges, latitude at its top and bottom, degrees. */
  west: number;
  east: number;
  north: number;
  south: number;
}

/**
 * A tile's image and where it lies: its vertices' longitude and latitude
 * against their texture coordinates, each fitted by a line (u linear in
 * longitude, v in latitude).
 */
async function readPatch(bytes: Uint8Array): Promise<Patch> {
  const b3dm = unwrapB3dm(bytes);
  const { json, bin } = splitGlb(b3dm.glb);
  if (!bin) {
    throw new Error("Moon map: a tile without a binary chunk");
  }
  const primitive = json.meshes[0].primitives[0];
  const read = (index: number, size: number): Float32Array => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const stride = (view.byteStride ?? size * 4) / 4;
    const data = new Float32Array(
      bin.buffer,
      bin.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
      (accessor.count - 1) * stride + size,
    );
    const out = new Float32Array(accessor.count * size);
    for (let i = 0; i < accessor.count; i++) {
      for (let c = 0; c < size; c++) {
        out[i * size + c] = data[i * stride + c]!;
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
  const view = json.bufferViews[image.bufferView];
  const blob = new Blob(
    [bin.slice(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)],
    { type: image.mimeType },
  );
  return {
    image: await createImageBitmap(blob, { colorSpaceConversion: "none" }),
    west: -u.offset / u.slope,
    east: (1 - u.offset) / u.slope,
    north: -v.offset / v.slope,
    south: (1 - v.offset) / v.slope,
  };
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
