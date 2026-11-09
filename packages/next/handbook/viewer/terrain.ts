/**
 * The ground around the corridor, for the reel's ellipsoid: USGS 3DEP heights,
 * written out as quantized-mesh bytes so the engine's own decoder builds the
 * tile, normals included. Everywhere else stays flat.
 */
export interface Dem {
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
  heights: Float32Array;
}

/** 3DEP is above NAVD88; the geoid here is about 32 m under the ellipsoid. */
const GEOID = -32;
const WGS84_A = 6378137;
const WGS84_E2 = 0.00669437999014;
const DEG = Math.PI / 180;

/** A tile of `SIZE` by `SIZE` samples. */
const SIZE = 64;
/** Degrees over which the ground comes down to the ellipsoid at the edge. */
const FADE = 0.03;

function ecef(lon: number, lat: number, h: number): [number, number, number] {
  const s = Math.sin(lat);
  const c = Math.cos(lat);
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * s * s);
  return [
    (n + h) * c * Math.cos(lon),
    (n + h) * c * Math.sin(lon),
    (n * (1 - WGS84_E2) + h) * s,
  ];
}

/** The ground's height above the ellipsoid, m, at degrees. */
export function demHeight(dem: Dem, lon: number, lat: number): number {
  const x = ((lon - dem.west) / (dem.east - dem.west)) * (dem.width - 1);
  const y = ((dem.north - lat) / (dem.north - dem.south)) * (dem.height - 1);
  if (x < 0 || y < 0 || x > dem.width - 1 || y > dem.height - 1) {
    return 0;
  }
  const x0 = Math.min(Math.floor(x), dem.width - 2);
  const y0 = Math.min(Math.floor(y), dem.height - 2);
  const fx = x - x0;
  const fy = y - y0;
  const at = (i: number, j: number) => {
    const v = dem.heights[j * dem.width + i]!;
    // Water and gaps hold no-data values; nothing here is outside these.
    return v > -100 && v < 1300 ? v : 0;
  };
  const h =
    (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) +
    (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  const edge = Math.min(
    lon - dem.west,
    dem.east - lon,
    lat - dem.south,
    dem.north - lat,
  );
  const fade = Math.min(1, edge / FADE);
  return (h + GEOID) * fade * fade * (3 - 2 * fade);
}

export function overlaps(
  dem: Dem,
  rect: { west: number; south: number; east: number; north: number },
): boolean {
  return (
    rect.west / DEG < dem.east &&
    rect.east / DEG > dem.west &&
    rect.south / DEG < dem.north &&
    rect.north / DEG > dem.south
  );
}

const zigzag = (v: number) => ((v << 1) ^ (v >> 15)) & 0xffff;

function octEncode(n: [number, number, number]): [number, number] {
  const sum = Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]);
  let x = n[0] / sum;
  let y = n[1] / sum;
  if (n[2] < 0) {
    const ox = x;
    x = (1 - Math.abs(y)) * Math.sign(ox || 1);
    y = (1 - Math.abs(ox)) * Math.sign(y || 1);
  }
  return [Math.round((x * 0.5 + 0.5) * 255), Math.round((y * 0.5 + 0.5) * 255)];
}

/** A tile's quantized-mesh bytes, with oct-encoded normals. `rect` in radians. */
export function demTile(
  dem: Dem,
  rect: { west: number; south: number; east: number; north: number },
): ArrayBuffer {
  const n = SIZE;
  const dLon = (rect.east - rect.west) / DEG;
  const dLat = (rect.north - rect.south) / DEG;
  const lonAt = (i: number) => rect.west / DEG + (i / (n - 1)) * dLon;
  const latAt = (j: number) => rect.south / DEG + (j / (n - 1)) * dLat;
  const heights = new Float64Array(n * n);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h = demHeight(dem, lonAt(i), latAt(j));
      heights[j * n + i] = h;
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  }
  if (max - min < 1) {
    max = min + 1;
  }
  const midLon = rect.west + (rect.east - rect.west) / 2;
  const midLat = rect.south + (rect.north - rect.south) / 2;
  const center = ecef(midLon, midLat, (min + max) / 2);
  let radius = 0;
  for (const [i, j] of [
    [0, 0],
    [n - 1, 0],
    [0, n - 1],
    [n - 1, n - 1],
  ] as const) {
    const p = ecef(lonAt(i) * DEG, latAt(j) * DEG, max);
    radius = Math.max(
      radius,
      Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2]),
    );
  }
  const count = n * n;
  const triangles = (n - 1) * (n - 1) * 2;
  const edge = n;
  const size =
    88 +
    4 +
    count * 6 +
    4 +
    triangles * 6 +
    2 +
    (4 + edge * 2) * 4 +
    9 +
    count * 2 +
    8;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let o = 0;
  const f64 = (v: number) => {
    view.setFloat64(o, v, true);
    o += 8;
  };
  center.forEach(f64);
  view.setFloat32(o, min, true);
  view.setFloat32(o + 4, max, true);
  o += 8;
  center.forEach(f64);
  f64(radius);
  center.forEach(f64);
  view.setUint32(o, count, true);
  o += 4;
  const quantized = (v: number, low: number, high: number) =>
    Math.round(((v - low) / (high - low)) * 32767);
  // Each stream as deltas, zigzag.
  const stream = (value: (i: number, j: number) => number) => {
    let last = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const v = value(i, j);
        view.setUint16(o, zigzag(v - last), true);
        o += 2;
        last = v;
      }
    }
  };
  stream((i) => Math.round((i / (n - 1)) * 32767));
  stream((_i, j) => Math.round((j / (n - 1)) * 32767));
  stream((i, j) => quantized(heights[j * n + i]!, min, max));
  if (o % 2 !== 0) {
    o += 1;
  }
  view.setUint32(o, triangles, true);
  o += 4;
  // Indices by high-water mark, in the order vertices first appear.
  const seen = new Int32Array(count).fill(-1);
  const order: number[] = [];
  const emit = (vertex: number) => order.push(vertex);
  for (let j = 0; j + 1 < n; j++) {
    for (let i = 0; i + 1 < n; i++) {
      const a = j * n + i;
      emit(a);
      emit(a + 1);
      emit(a + n);
      emit(a + 1);
      emit(a + n + 1);
      emit(a + n);
    }
  }
  // Renumber so that a first use is always the next number. The streams above
  // are in grid order, so write them again in that numbering below.
  let next = 0;
  const renumbered = new Uint16Array(order.length);
  const backwards = new Int32Array(count);
  order.forEach((vertex, k) => {
    if (seen[vertex] === -1) {
      backwards[next] = vertex;
      seen[vertex] = next++;
    }
    renumbered[k] = seen[vertex]!;
  });
  let high = 0;
  for (const index of renumbered) {
    view.setUint16(o, high - index, true);
    o += 2;
    if (index === high) {
      high++;
    }
  }
  // The vertex streams again, in first-use order.
  let w = 92;
  const rewrite = (value: (vertex: number) => number) => {
    let last = 0;
    for (let k = 0; k < count; k++) {
      const v = value(backwards[k]!);
      view.setUint16(w, zigzag(v - last), true);
      w += 2;
      last = v;
    }
  };
  rewrite((v) => Math.round(((v % n) / (n - 1)) * 32767));
  rewrite((v) => Math.round((Math.floor(v / n) / (n - 1)) * 32767));
  rewrite((v) => quantized(heights[v]!, min, max));
  // Edges: west, south, east, north.
  const list = (vertex: (k: number) => number) => {
    view.setUint32(o, n, true);
    o += 4;
    for (let k = 0; k < n; k++) {
      view.setUint16(o, seen[vertex(k)]!, true);
      o += 2;
    }
  };
  list((k) => k * n);
  list((k) => k);
  list((k) => k * n + n - 1);
  list((k) => (n - 1) * n + k);
  // Oct-encoded normals (extension 1), in that numbering.
  view.setUint8(o, 1);
  view.setUint32(o + 1, count * 2, true);
  o += 5;
  const lonMetres = (dLon / (n - 1)) * DEG * WGS84_A * Math.cos(midLat) || 1;
  const latMetres = (dLat / (n - 1)) * DEG * WGS84_A || 1;
  for (let k = 0; k < count; k++) {
    const v = backwards[k]!;
    const i = v % n;
    const j = Math.floor(v / n);
    const h = (a: number, b: number) =>
      heights[
        Math.min(n - 1, Math.max(0, b)) * n + Math.min(n - 1, Math.max(0, a))
      ]!;
    const de = (h(i + 1, j) - h(i - 1, j)) / (2 * lonMetres);
    const dn = (h(i, j + 1) - h(i, j - 1)) / (2 * latMetres);
    const lon = lonAt(i) * DEG;
    const lat = latAt(j) * DEG;
    const up: [number, number, number] = [
      Math.cos(lat) * Math.cos(lon),
      Math.cos(lat) * Math.sin(lon),
      Math.sin(lat),
    ];
    const east: [number, number, number] = [-Math.sin(lon), Math.cos(lon), 0];
    const north: [number, number, number] = [
      -Math.sin(lat) * Math.cos(lon),
      -Math.sin(lat) * Math.sin(lon),
      Math.cos(lat),
    ];
    const normal: [number, number, number] = [
      up[0] - de * east[0] - dn * north[0],
      up[1] - de * east[1] - dn * north[1],
      up[2] - de * east[2] - dn * north[2],
    ];
    const length = Math.hypot(...normal);
    const [a, b] = octEncode([
      normal[0] / length,
      normal[1] / length,
      normal[2] / length,
    ]);
    view.setUint8(o, a);
    view.setUint8(o + 1, b);
    o += 2;
  }
  return buffer.slice(0, o);
}
