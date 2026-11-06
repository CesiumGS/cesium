import { describe, expect, it } from "vitest";
import {
  capPixelToMap,
  capRotation,
  composeMoonMap,
  type MoonCap,
  type MoonMapSource,
  type Raster,
  readMoonMap,
} from "../src/io/moonMap.ts";

const DEG = Math.PI / 180;

// Cesium Moon Terrain's cap tilesets' `root.transform` (ion 2684829): a
// quarter turn about y that puts the pole on the frame's +x axis.
const SOUTH_TRANSFORM = [
  6.123233995736766e-17, 0, -1, 0, 0, 1, 0, 0, 1, 0, 6.123233995736766e-17, 0,
  0, 0, 0, 1,
];
const NORTH_TRANSFORM = [
  6.123233995736766e-17, 0, 1, 0, 0, 1, 0, 0, -1, 0, 6.123233995736766e-17, 0,
  0, 0, 0, 1,
];

function raster(
  width: number,
  height: number,
  rgba: (x: number, y: number) => [number, number, number, number],
): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set(rgba(x, y), (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

/** A map texel's center: latitude, longitude in degrees. */
function texelAngles(r: Raster, x: number, y: number): [number, number] {
  return [90 - ((y + 0.5) / r.height) * 180, ((x + 0.5) / r.width) * 360 - 180];
}

function direction(latitude: number, longitude: number) {
  const c = Math.cos(latitude * DEG);
  return [
    c * Math.cos(longitude * DEG),
    c * Math.sin(longitude * DEG),
    Math.sin(latitude * DEG),
  ] as const;
}

/** The south cap's frame to the Moon's, written out: x' = -z, z' = x. */
function southCapToMoon(latitude: number, longitude: number) {
  const [lx, ly, lz] = direction(latitude, longitude);
  return [lz, ly, -lx] as const;
}

function texel(r: Raster, x: number, y: number): number[] {
  const i = (y * r.width + x) * 4;
  return [...r.data.subarray(i, i + 4)];
}

/** A band of latitudes, transparent beyond ±85° (as the asset's tiles). */
function band(
  width: number,
  shade: (latitude: number, longitude: number) => number,
): Raster {
  return raster(width, width / 2, (x, y) => {
    const [latitude, longitude] = texelAngles(
      { width, height: width / 2, data: new Uint8ClampedArray() },
      x,
      y,
    );
    return Math.abs(latitude) > 85
      ? [0, 0, 0, 0]
      : [shade(latitude, longitude), 0, 0, 255];
  });
}

describe("Moon map polar caps", () => {
  it("puts a cap pixel at a known latitude and longitude in that map texel", () => {
    const cap: MoonCap = {
      pole: "south",
      rotation: capRotation(SOUTH_TRANSFORM),
      patches: [],
    };
    // 87°S, 30°E in the cap's frame, worked by hand: x' = -z, y' = y, z' = x.
    const [mx, my, mz] = direction(-87, 30);
    const capLongitude = Math.atan2(my, -mz) / DEG; // 1.501°
    const capLatitude = Math.asin(mx) / DEG; // 2.598°
    // A patch of 3° (0.19° pixels): inside 85°, so it does not overlap
    // the band and its tones are kept as they are.
    const size = 16;
    const patch = {
      image: raster(size, size, () => [0, 0, 0, 255]),
      west: 0,
      east: 3,
      north: 3,
      south: 0,
    };
    const px = (capLongitude / 3) * size;
    const py = ((3 - capLatitude) / 3) * size;
    const width = 720;
    const height = 360;
    const at = capPixelToMap(cap, patch, px, py, width, height);
    expect(at.x).toBeCloseTo(((30 + 180) / 360) * width, 6);
    expect(at.y).toBeCloseTo(((90 + 87) / 180) * height, 6);

    // And the map, composed, shows that pixel there.
    const bright = [Math.floor(px), Math.floor(py)];
    // A 3 × 3 block about it: the texel's center is up to half a texel
    // from the point, and the cap is sampled bilinearly.
    patch.image = raster(size, size, (x, y) =>
      Math.abs(x - bright[0]!) <= 1 && Math.abs(y - bright[1]!) <= 1
        ? [255, 255, 255, 255]
        : [0, 0, 0, 255],
    );
    cap.patches.push(patch);
    const map = composeMoonMap(
      band(width, () => 0),
      [cap],
    );
    const row = Math.floor(at.y);
    const column = Math.floor(at.x);
    expect(texel(map, column, row)[0]).toBeGreaterThan(128);
    // Elsewhere along the row it stays dark: 60 texels (30° of longitude)
    // is 1.6° across the meridians at 87°, past the block's 0.3° and the
    // filter's reach.
    expect(texel(map, column + 60, row)[0]).toBeLessThan(16);
    expect(texel(map, column - 60, row)[0]).toBeLessThan(16);
  });

  it("agrees with the band at 85° (one surface, sampled two ways)", () => {
    expect(seamError((v) => v)).toBeLessThanOrEqual(3);
  });

  it("matches a cap's tones to the band's at 85° (a darker, flatter mosaic)", () => {
    // Cesium Moon Terrain's caps are darker and lower in contrast than its
    // band where the two overlap (10–90% of the band 1–77, of the cap 6–43).
    expect(seamError((v) => 0.5 * v + 20)).toBeLessThanOrEqual(4);
  });

  it("keeps the stretched row over a cap that does not load, with a warning", async () => {
    const files = stubAsset();
    const source: MoonMapSource = {
      fetch: async (url) => {
        const body = files.get(url);
        if (!body) {
          throw new Error(`Moon map: ${url} (404)`);
        }
        return {
          json: async () => JSON.parse(new TextDecoder().decode(body)),
          arrayBuffer: async () => body.slice().buffer,
        };
      },
      decode: async (bytes) => images.get(new TextDecoder().decode(bytes))!,
    };
    const { map, warnings } = await readMoonMap(
      "https://moon.test/tileset.json",
      source,
      0,
    );
    expect(map.width).toBe(128);
    expect(map.height).toBe(64);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/south polar cap/);
    // The south: every row past the band's last is that row, stretched.
    const last = 61; // 83.0°S: rows 62 and 63 (85.8°S, 88.6°S) are past 85°
    for (let y = last + 1; y < 64; y++) {
      for (let x = 0; x < 128; x += 7) {
        expect(texel(map, x, y)).toEqual(texel(map, x, last));
      }
    }
    // The north: the cap's imagery (blue), not the band's (red).
    for (let x = 0; x < 128; x += 7) {
      const [r, , b, a] = texel(map, x, 0);
      expect(a).toBe(255);
      expect(b).toBe(200);
      expect(r).toBe(0);
    }
  });
});

/**
 * The worst difference, rows 80°S to the pole, between a composed map and
 * the surface both the band and the south cap show (the cap with its tones
 * changed by `tone`): one smooth albedo, sampled two ways.
 */
function seamError(tone: (v: number) => number): number {
  const shade = (x: number, y: number, z: number) =>
    Math.round(128 + 60 * x + 50 * y + 10 * z);
  const width = 720;
  const map = composeMoonMap(
    band(width, (latitude, longitude) =>
      shade(...direction(latitude, longitude)),
    ),
    [
      {
        pole: "south",
        rotation: capRotation(SOUTH_TRANSFORM),
        // 0.1° pixels over ±6° of the cap's frame, in four tiles; imagery
        // ±5° about the pole, as the asset's.
        patches: [
          [-6, 0, 6, 0],
          [0, 6, 6, 0],
          [-6, 0, 0, -6],
          [0, 6, 0, -6],
        ].map(([west, east, northEdge, southEdge]) => ({
          west: west!,
          east: east!,
          north: northEdge!,
          south: southEdge!,
          image: raster(60, 60, (x, y) => {
            const longitude = west! + ((x + 0.5) / 60) * 6;
            const latitude = northEdge! - ((y + 0.5) / 60) * 6;
            const inside =
              Math.max(Math.abs(longitude), Math.abs(latitude)) <= 5;
            return inside
              ? [
                  Math.round(
                    tone(shade(...southCapToMoon(latitude, longitude))),
                  ),
                  0,
                  0,
                  255,
                ]
              : [0, 0, 0, 0];
          }),
        })),
      },
    ],
  );
  const height = width / 2;
  let worst = 0;
  for (let y = height - 20; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [latitude, longitude] = texelAngles(map, x, y);
      const [r, , , a] = texel(map, x, y);
      expect(a).toBe(255);
      worst = Math.max(
        worst,
        Math.abs(r! - shade(...direction(latitude, longitude))),
      );
    }
  }
  return worst;
}

// ---- A stub of the ion asset: root, band and north cap; the south cap 404s.

const images = new Map<string, Raster>([
  // The band's two level-0 tiles: red, transparent past ±85°.
  ...["band-west", "band-east"].map(
    (name) =>
      [
        name,
        raster(64, 64, (_, y) => {
          const latitude = 90 - ((y + 0.5) / 64) * 180;
          return Math.abs(latitude) > 85 ? [0, 0, 0, 0] : [200, 10 + y, 0, 255];
        }),
      ] as [string, Raster],
  ),
  ["north-cap", raster(32, 32, () => [0, 0, 200, 255])],
]);

function stubAsset(): Map<string, Uint8Array> {
  const json = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value));
  const box = (z: number) => [0, 0, z, 1e5, 0, 0, 0, 1e5, 0, 0, 0, 1e4];
  const base = "https://moon.test/";
  return new Map([
    [
      `${base}tileset.json`,
      json({
        root: {
          children: [
            {
              boundingVolume: { box: box(0) },
              content: { uri: "band/tileset.json" },
            },
            {
              boundingVolume: { box: box(-1.7e6) },
              content: { uri: "south/tileset.json" },
            },
            {
              boundingVolume: { box: box(1.7e6) },
              content: { uri: "north/tileset.json" },
            },
          ],
        },
      }),
    ],
    [
      `${base}band/tileset.json`,
      json({
        root: {
          children: [
            { content: { uri: "0/0/0.b3dm" } },
            { content: { uri: "0/1/0.b3dm" } },
          ],
        },
      }),
    ],
    [
      `${base}band/0/0/0.b3dm`,
      tile(-180, 0, 90, -90, (lat, lon) => direction(lat, lon), "band-west"),
    ],
    [
      `${base}band/0/1/0.b3dm`,
      tile(0, 180, 90, -90, (lat, lon) => direction(lat, lon), "band-east"),
    ],
    [
      `${base}north/tileset.json`,
      json({
        root: {
          transform: NORTH_TRANSFORM,
          // Level 3 (the band's 0, plus 3): one tile, deep in the tree.
          children: [
            {
              children: [
                {
                  children: [
                    { children: [{ content: { uri: "3/0/0.b3dm" } }] },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ],
    [
      `${base}north/3/0/0.b3dm`,
      tile(-6, 6, 6, -6, (lat, lon) => direction(lat, lon), "north-cap"),
    ],
  ]);
}

/**
 * A b3dm tile: a grid over a longitude and latitude rectangle of its
 * tileset's frame (`position` gives its points there, z up), its texture
 * coordinates linear in both, and an image named `image` (the stub decoder
 * looks it up).
 */
function tile(
  west: number,
  east: number,
  northEdge: number,
  southEdge: number,
  position: (latitude: number, longitude: number) => readonly number[],
  image: string,
): Uint8Array {
  const n = 5;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const v = j / (n - 1);
      const [x, y, z] = position(
        northEdge + v * (southEdge - northEdge),
        west + u * (east - west),
      ).map((c) => c * 1737400);
      positions.push(x!, z!, -y!); // glTF's y up
      uvs.push(u, v);
    }
  }
  const imageBytes = new TextEncoder().encode(image);
  const bin = new Uint8Array(
    pad4(positions.length * 4 + uvs.length * 4 + imageBytes.length),
  );
  new Float32Array(bin.buffer, 0, positions.length).set(positions);
  new Float32Array(bin.buffer, positions.length * 4, uvs.length).set(uvs);
  bin.set(imageBytes, positions.length * 4 + uvs.length * 4);
  const gltf = {
    asset: { version: "2.0" },
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 } }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: n * n, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: n * n, type: "VEC2" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length * 4 },
      {
        buffer: 0,
        byteOffset: positions.length * 4,
        byteLength: uvs.length * 4,
      },
      {
        buffer: 0,
        byteOffset: positions.length * 4 + uvs.length * 4,
        byteLength: imageBytes.length,
      },
    ],
    images: [{ bufferView: 2, mimeType: "image/png" }],
    buffers: [{ byteLength: bin.length }],
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonChunk = new Uint8Array(pad4(jsonBytes.length)).fill(0x20);
  jsonChunk.set(jsonBytes);
  const glbLength = 12 + 8 + jsonChunk.length + 8 + bin.length;
  const out = new Uint8Array(28 + glbLength);
  const view = new DataView(out.buffer);
  out.set(new TextEncoder().encode("b3dm"), 0);
  view.setUint32(4, 1, true);
  view.setUint32(8, out.length, true);
  // Feature and batch tables empty (lengths 12–27 stay 0).
  let o = 28;
  view.setUint32(o, 0x46546c67, true);
  view.setUint32(o + 4, 2, true);
  view.setUint32(o + 8, glbLength, true);
  o += 12;
  view.setUint32(o, jsonChunk.length, true);
  view.setUint32(o + 4, 0x4e4f534a, true);
  out.set(jsonChunk, o + 8);
  o += 8 + jsonChunk.length;
  view.setUint32(o, bin.length, true);
  view.setUint32(o + 4, 0x004e4942, true);
  out.set(bin, o + 8);
  return out;
}

function pad4(n: number): number {
  return (n + 3) & ~3;
}
