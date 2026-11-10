// Downloads what the handbook's reel embeds, into the setup store's
// handbook-reel directory (not the repository). Run once:
//
//   node handbook/reel/fetchData.mjs
//
// Sources, all public domain or CC0. handbook/reel/CREDITS.md says which, and
// the page credits them:
//   - NASA GIBS: Blue Marble Next Generation and VIIRS Black Marble, as Web
//     Mercator tiles
//   - USGS The National Map: imagery and 3DEP elevation around the corridor
//   - Khronos glTF Sample Assets: ToyCar, CC0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";

const STORE = join(
  process.env.FRAMES_DATA_DIR
    ? dirname(process.env.FRAMES_DATA_DIR)
    : join(homedir(), ".cesium-bench"),
  "handbook-reel",
);

/** Where the corridor stands, degrees, with room for the vehicles. */
export const SITE = { west: -122.25, south: 37.6, east: -121.8, north: 37.92 };

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const DAY = `${GIBS}/BlueMarble_NextGeneration/default/2004-08-01/GoogleMapsCompatible_Level8`;
const NIGHT = `${GIBS}/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8`;
const USGS =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile";
const DEM =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage";
const TOY_CAR =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb";

const tileX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const tileY = (lat, z) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return Math.floor(
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z,
  );
};

const jobs = [];
const add = (url, path) => jobs.push({ url, path: join(STORE, path) });

// The whole Earth, levels 0 to 4. Rows count from the north in both.
for (let z = 0; z <= 4; z++) {
  for (let x = 0; x < 2 ** z; x++) {
    for (let y = 0; y < 2 ** z; y++) {
      add(`${DAY}/${z}/${y}/${x}.jpeg`, `day/${z}/${x}/${y}.jpg`);
      add(`${NIGHT}/${z}/${y}/${x}.png`, `night/${z}/${x}/${y}.png`);
    }
  }
}
// Around the site: Blue Marble down to its detail, then USGS imagery.
for (let z = 5; z <= 14; z++) {
  // A wider ring at the coarser levels, so wide views don't show an edge.
  const ring = z >= 8 && z <= 11 ? 2 : 0;
  for (
    let x = tileX(SITE.west, z) - ring;
    x <= tileX(SITE.east, z) + ring;
    x++
  ) {
    for (
      let y = tileY(SITE.north, z) - ring;
      y <= tileY(SITE.south, z) + ring;
      y++
    ) {
      if (z <= 7) {
        add(`${DAY}/${z}/${y}/${x}.jpeg`, `day/${z}/${x}/${y}.jpg`);
      } else {
        add(`${USGS}/${z}/${y}/${x}`, `day/${z}/${x}/${y}.jpg`);
      }
    }
  }
}
// Finer still where the camera comes close: the lantern, the road's far end and
// its tunnel. (longitude, latitude, finest level, half-width in tiles at it)
for (const [lon, lat, finest, half] of [
  [-122.0, 37.74, 15, 4],
  [-121.8722, 37.6618, 15, 4],
  [-122.0228, 37.8104, 15, 5],
]) {
  for (let z = 15; z <= finest; z++) {
    const cx = tileX(lon, z);
    const cy = tileY(lat, z);
    for (let x = cx - half; x <= cx + half; x++) {
      for (let y = cy - half; y <= cy + half; y++) {
        add(`${USGS}/${z}/${y}/${x}`, `day/${z}/${x}/${y}.jpg`);
      }
    }
  }
}
add(TOY_CAR, "ToyCar.glb");

async function fetchTo(job) {
  if (existsSync(job.path)) {
    return;
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(job.url);
      if (!response.ok) {
        throw new Error(`${response.status}`);
      }
      mkdirSync(dirname(job.path), { recursive: true });
      writeFileSync(job.path, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      if (attempt === 2) {
        console.warn(`gave up on ${job.url}: ${error.message}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

const pending = jobs.filter((job) => !existsSync(job.path));
console.log(`${pending.length} of ${jobs.length} to fetch into ${STORE}`);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (pending.length > 0) {
      await fetchTo(pending.shift());
    }
  }),
);

// Elevation as float32 metres above NAVD88, from an uncompressed TIFF.
const demPath = join(STORE, "dem.f32");
if (!existsSync(demPath)) {
  const width = 1200;
  const height = Math.round(
    (width * (SITE.north - SITE.south)) / (SITE.east - SITE.west) / 0.79,
  );
  const query = new URLSearchParams({
    bbox: `${SITE.west},${SITE.south},${SITE.east},${SITE.north}`,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${width},${height}`,
    format: "tiff",
    pixelType: "F32",
    interpolation: "RSP_BilinearInterpolation",
    compression: "None",
    f: "image",
  });
  const response = await fetch(`${DEM}?${query}`);
  if (!response.ok) {
    throw new Error(`elevation: ${response.status}`);
  }
  const { samples, extent } = tiffFloats(
    Buffer.from(await response.arrayBuffer()),
    width,
    height,
  );
  writeFileSync(demPath, samples);
  // The extent the server drew, which it can widen from the one asked for.
  writeFileSync(
    join(STORE, "dem.json"),
    JSON.stringify({ ...extent, width, height }),
  );
}

/** The samples of a little-endian, uncompressed, float32 TIFF, by strips. */
function tiffFloats(tiff, width, height) {
  if (tiff.toString("latin1", 0, 2) !== "II") {
    throw new Error("elevation: expected a little-endian TIFF");
  }
  const ifd = tiff.readUInt32LE(4);
  const count = tiff.readUInt16LE(ifd);
  const tags = new Map();
  for (let i = 0; i < count; i++) {
    const at = ifd + 2 + i * 12;
    const type = tiff.readUInt16LE(at + 2);
    const n = tiff.readUInt32LE(at + 4);
    const size = type === 3 ? 2 : type === 12 ? 8 : 4;
    const from = n * size <= 4 ? at + 8 : tiff.readUInt32LE(at + 8);
    const values = [];
    for (let k = 0; k < n; k++) {
      values.push(
        size === 2
          ? tiff.readUInt16LE(from + k * 2)
          : size === 8
            ? tiff.readDoubleLE(from + k * 8)
            : tiff.readUInt32LE(from + k * 4),
      );
    }
    tags.set(tiff.readUInt16LE(at), values);
  }
  if (tags.get(259)?.[0] !== 1 || tags.get(258)?.[0] !== 32) {
    throw new Error(
      `elevation: compression ${tags.get(259)}, bits ${tags.get(258)}`,
    );
  }
  const out = Buffer.alloc(width * height * 4);
  const scale = tags.get(33550);
  const tie = tags.get(33922);
  const extent = {
    west: tie[3],
    north: tie[4],
    east: tie[3] + scale[0] * width,
    south: tie[4] - scale[1] * height,
  };
  const tileOffsets = tags.get(324);
  if (tileOffsets) {
    // Tiled: each is tileW by tileH, cut off at the image's edges.
    const tileW = tags.get(322)[0];
    const tileH = tags.get(323)[0];
    const across = Math.ceil(width / tileW);
    tileOffsets.forEach((offset, i) => {
      const left = (i % across) * tileW;
      const top = Math.floor(i / across) * tileH;
      for (let row = 0; row < tileH && top + row < height; row++) {
        const bytes = Math.min(tileW, width - left) * 4;
        const from = offset + row * tileW * 4;
        tiff.copy(out, (top + row) * width * 4 + left * 4, from, from + bytes);
      }
    });
    return { samples: out, extent };
  }
  const offsets = tags.get(273);
  const sizes = tags.get(279);
  let written = 0;
  offsets.forEach((offset, i) => {
    tiff.copy(out, written, offset, offset + sizes[i]);
    written += sizes[i];
  });
  if (written !== out.length) {
    throw new Error(`elevation: read ${written} of ${out.length} bytes`);
  }
  return { samples: out, extent };
}

console.log(
  "done",
  existsSync(join(STORE, "dem.json")) &&
    readFileSync(join(STORE, "dem.json"), "utf8"),
);
