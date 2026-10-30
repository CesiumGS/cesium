/**
 * 3D Tiles bounding volumes with the exact geometry CesiumJS 1.x uses for
 * tile selection (`TileOrientedBoundingBox`, `TileBoundingRegion`,
 * `TileBoundingSphere`): distance to the camera, plane classification, and
 * construction from tileset JSON. `Legacy1x` selection depends on matching
 * these bit for bit in spirit; they are tested against 1.x core.
 */
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";

/** Plane classification, as 1.x `Intersect`. */
export const OUTSIDE = -1;
export const INTERSECTING = 0;
export const INSIDE = 1;

/** Oriented box: center and half axes as matrix columns (column-major 3×3). */
export interface Obb {
  center: Vec3;
  halfAxes: Float64Array;
}

export interface Sphere {
  center: Vec3;
  radius: number;
}

export interface Region {
  west: number;
  south: number;
  east: number;
  north: number;
  minimumHeight: number;
  maximumHeight: number;
  // Precomputed as 1.x TileBoundingRegion.computeBox.
  southwestCorner: Vec3;
  northeastCorner: Vec3;
  westNormal: Vec3;
  eastNormal: Vec3;
  southNormal: Vec3;
  northNormal: Vec3;
  obb: Obb;
}

export type TileVolume =
  | { kind: "box"; obb: Obb; sphere: Sphere }
  | { kind: "sphere"; sphere: Sphere }
  | { kind: "region"; region: Region; sphere: Sphere };

const ellipsoid = Ellipsoid.WGS84;
const TWO_PI = 2 * Math.PI;
const EPSILON7 = 1e-7;

// ---------------------------------------------------------------- OBB

export function obb(center: Vec3, halfAxes: Float64Array): Obb {
  return { center, halfAxes };
}

/** `OrientedBoundingBox.intersectPlane`: plane `n·p + d`, n normalized. */
export function obbIntersectPlane(
  box: Obb,
  n: ArrayLike<number>,
  d: number,
): number {
  const h = box.halfAxes;
  const nx = n[0]!,
    ny = n[1]!,
    nz = n[2]!;
  const radius =
    Math.abs(nx * h[0]! + ny * h[1]! + nz * h[2]!) +
    Math.abs(nx * h[3]! + ny * h[4]! + nz * h[5]!) +
    Math.abs(nx * h[6]! + ny * h[7]! + nz * h[8]!);
  const distance =
    nx * box.center[0]! + ny * box.center[1]! + nz * box.center[2]! + d;
  if (distance <= -radius) {
    return OUTSIDE;
  }
  return distance >= radius ? INSIDE : INTERSECTING;
}

const scratchU = v3.vec3();
const scratchV = v3.vec3();
const scratchW = v3.vec3();
const scratchAxis = v3.vec3();

/** `OrientedBoundingBox.distanceSquaredTo`, including degenerate axes. */
export function obbDistanceSquaredTo(box: Obb, p: Vec3): number {
  const h = box.halfAxes;
  let u = v3.set(scratchU, h[0]!, h[1]!, h[2]!);
  let v = v3.set(scratchV, h[3]!, h[4]!, h[5]!);
  let w = v3.set(scratchW, h[6]!, h[7]!, h[8]!);
  const uHalf = v3.length(u);
  const vHalf = v3.length(v);
  const wHalf = v3.length(w);
  const uValid = uHalf > 0;
  const vValid = vHalf > 0;
  const wValid = wHalf > 0;
  if (uValid) {
    v3.scale(u, u, 1 / uHalf);
  }
  if (vValid) {
    v3.scale(v, v, 1 / vHalf);
  }
  if (wValid) {
    v3.scale(w, w, 1 / wHalf);
  }
  const degenerate = Number(!uValid) + Number(!vValid) + Number(!wValid);
  if (degenerate === 1) {
    const third = (a: Vec3, b: Vec3) => v3.cross(scratchAxis, a, b);
    if (!uValid) {
      u = third(v, w);
    } else if (!vValid) {
      v = third(u, w);
    } else {
      w = third(v, u);
    }
  } else if (degenerate === 2) {
    const valid = uValid ? u : vValid ? v : w;
    let cross: Vec3 = v3.vec3(0, 1, 0);
    if (
      Math.abs(valid[0]! - 0) <= 1e-3 &&
      Math.abs(valid[1]! - 1) <= 1e-3 &&
      Math.abs(valid[2]! - 0) <= 1e-3
    ) {
      cross = v3.vec3(1, 0, 0);
    }
    const a2 = v3.normalize(v3.vec3(), v3.cross(v3.vec3(), valid, cross));
    const a3 = v3.normalize(v3.vec3(), v3.cross(v3.vec3(), valid, a2));
    if (valid === u) {
      v = a2;
      w = a3;
    } else if (valid === v) {
      w = a2;
      u = a3;
    } else {
      u = a2;
      v = a3;
    }
  } else if (degenerate === 3) {
    u = v3.vec3(1, 0, 0);
    v = v3.vec3(0, 1, 0);
    w = v3.vec3(0, 0, 1);
  }
  const ox = p[0]! - box.center[0]!,
    oy = p[1]! - box.center[1]!,
    oz = p[2]! - box.center[2]!;
  let result = 0;
  const axis = (a: Vec3, half: number) => {
    const t = ox * a[0]! + oy * a[1]! + oz * a[2]!;
    if (t < -half) {
      result += (t + half) * (t + half);
    } else if (t > half) {
      result += (t - half) * (t - half);
    }
  };
  axis(u, uHalf);
  axis(v, vHalf);
  axis(w, wHalf);
  return result;
}

/** `BoundingSphere.fromOrientedBoundingBox`: radius |u + v + w|. */
export function sphereFromObb(box: Obb): Sphere {
  const h = box.halfAxes;
  return {
    center: v3.copy(v3.vec3(), box.center),
    radius: Math.hypot(
      h[0]! + h[3]! + h[6]!,
      h[1]! + h[4]! + h[7]!,
      h[2]! + h[5]! + h[8]!,
    ),
  };
}

/** 3D Tiles `boundingVolume.box` under a transform (`Cesium3DTile.createBox`). */
export function boxFromJson(box: ArrayLike<number>, transform: Mat4): Obb {
  const t = transform;
  const cx = box[0]!,
    cy = box[1]!,
    cz = box[2]!;
  const center = v3.vec3(
    t[0]! * cx + t[4]! * cy + t[8]! * cz + t[12]!,
    t[1]! * cx + t[5]! * cy + t[9]! * cz + t[13]!,
    t[2]! * cx + t[6]! * cy + t[10]! * cz + t[14]!,
  );
  const halfAxes = new Float64Array(9);
  for (let c = 0; c < 3; c++) {
    const x = box[3 + c * 3]!,
      y = box[4 + c * 3]!,
      z = box[5 + c * 3]!;
    halfAxes[c * 3] = t[0]! * x + t[4]! * y + t[8]! * z;
    halfAxes[c * 3 + 1] = t[1]! * x + t[5]! * y + t[9]! * z;
    halfAxes[c * 3 + 2] = t[2]! * x + t[6]! * y + t[10]! * z;
  }
  checkHalfAxes(halfAxes);
  return { center, halfAxes };
}

/** `TileOrientedBoundingBox` checkHalfAxes: replace zero-length axes. */
function checkHalfAxes(h: Float64Array): void {
  const len = (c: number) =>
    Math.hypot(h[c * 3]!, h[c * 3 + 1]!, h[c * 3 + 2]!);
  const zero = [len(0) === 0, len(1) === 0, len(2) === 0];
  const count = zero.filter(Boolean).length;
  if (count === 0) {
    return;
  }
  if (count === 3) {
    h.fill(0);
    h[0] = h[4] = h[8] = EPSILON7;
    return;
  }
  if (count === 1) {
    const missing = zero.indexOf(true);
    const a = (missing + 1) % 3;
    const b = (missing + 2) % 3;
    const ca = v3.vec3(h[a * 3]!, h[a * 3 + 1]!, h[a * 3 + 2]!);
    const cb = v3.vec3(h[b * 3]!, h[b * 3 + 1]!, h[b * 3 + 2]!);
    const n = v3.normalize(v3.vec3(), v3.cross(v3.vec3(), ca, cb));
    h[missing * 3] = n[0]! * EPSILON7;
    h[missing * 3 + 1] = n[1]! * EPSILON7;
    h[missing * 3 + 2] = n[2]! * EPSILON7;
    return;
  }
  // Two zero axes: build a basis around the remaining one.
  const keep = zero.indexOf(false);
  const k = v3.normalize(
    v3.vec3(),
    v3.vec3(h[keep * 3]!, h[keep * 3 + 1]!, h[keep * 3 + 2]!),
  );
  let cross = v3.vec3(0, 1, 0);
  if (Math.abs(Math.abs(v3.dot(k, cross)) - 1) < 1e-3) {
    cross = v3.vec3(1, 0, 0);
  }
  const a = v3.normalize(v3.vec3(), v3.cross(v3.vec3(), k, cross));
  const b = v3.normalize(v3.vec3(), v3.cross(v3.vec3(), k, a));
  const others = [0, 1, 2].filter((c) => c !== keep);
  for (const [axis, dir] of [
    [others[0]!, a],
    [others[1]!, b],
  ] as const) {
    h[axis * 3] = dir[0]! * EPSILON7;
    h[axis * 3 + 1] = dir[1]! * EPSILON7;
    h[axis * 3 + 2] = dir[2]! * EPSILON7;
  }
}

// ---------------------------------------------------------------- sphere

/** `Cesium3DTile.createSphere`: center transformed, radius × max scale. */
export function sphereFromJson(
  sphere: ArrayLike<number>,
  transform: Mat4,
): Sphere {
  const t = transform;
  const x = sphere[0]!,
    y = sphere[1]!,
    z = sphere[2]!;
  const scale = Math.max(
    Math.hypot(t[0]!, t[1]!, t[2]!),
    Math.hypot(t[4]!, t[5]!, t[6]!),
    Math.hypot(t[8]!, t[9]!, t[10]!),
  );
  return {
    center: v3.vec3(
      t[0]! * x + t[4]! * y + t[8]! * z + t[12]!,
      t[1]! * x + t[5]! * y + t[9]! * z + t[13]!,
      t[2]! * x + t[6]! * y + t[10]! * z + t[14]!,
    ),
    radius: sphere[3]! * scale || EPSILON7,
  };
}

/** `TileBoundingSphere.distanceToCamera`. */
export function sphereDistance(s: Sphere, p: Vec3): number {
  return Math.max(0, v3.distance(s.center, p) - s.radius);
}

/** `BoundingSphere.intersectPlane`. */
export function sphereIntersectPlane(
  s: Sphere,
  n: ArrayLike<number>,
  d: number,
): number {
  const distance =
    n[0]! * s.center[0]! + n[1]! * s.center[1]! + n[2]! * s.center[2]! + d;
  if (distance < -s.radius) {
    return OUTSIDE;
  }
  return distance < s.radius ? INTERSECTING : INSIDE;
}

// ---------------------------------------------------------------- region

function rectangleWidth(west: number, east: number): number {
  return east < west ? east + TWO_PI - west : east - west;
}

function negativePiToPi(angle: number): number {
  if (angle >= -Math.PI && angle <= Math.PI) {
    return angle;
  }
  // As CesiumMath.zeroToTwoPi(angle + π) − π.
  let a = angle + Math.PI;
  const mod = ((a % TWO_PI) + TWO_PI) % TWO_PI;
  a = Math.abs(mod) < 1e-14 && Math.abs(a) > 1e-14 ? TWO_PI : mod;
  return a - Math.PI;
}

function rectangleCenter(
  west: number,
  south: number,
  east: number,
  north: number,
) {
  const e = east < west ? east + TWO_PI : east;
  return {
    longitude: negativePiToPi((west + e) * 0.5),
    latitude: (south + north) * 0.5,
    height: 0,
  };
}

function toCartesian(
  longitude: number,
  latitude: number,
  height: number,
): Vec3 {
  return ellipsoid.cartographicToCartesian(
    { longitude, latitude, height },
    v3.vec3(),
  );
}

/** `OrientedBoundingBox.fromRectangle` on WGS84. */
export function obbFromRectangle(
  west: number,
  south: number,
  east: number,
  north: number,
  minimumHeight: number,
  maximumHeight: number,
): Obb {
  if (rectangleWidth(west, east) <= Math.PI) {
    const center = rectangleCenter(west, south, east, north);
    const tangentPoint = toCartesian(center.longitude, center.latitude, 0);
    // EllipsoidTangentPlane: origin on the surface, ENU axes.
    const origin = ellipsoid.scaleToGeodeticSurface(tangentPoint, v3.vec3())!;
    const enu = eastNorthUpToFixedFrame(
      origin,
      ellipsoid,
      new Float64Array(16),
    );
    const x = v3.vec3(enu[0]!, enu[1]!, enu[2]!);
    const y = v3.vec3(enu[4]!, enu[5]!, enu[6]!);
    const z = v3.vec3(enu[8]!, enu[9]!, enu[10]!);
    const planeD = -v3.dot(z, origin);
    const project = (p: Vec3): [number, number] => {
      const r = v3.sub(v3.vec3(), p, origin);
      return [v3.dot(x, r), v3.dot(y, r)];
    };
    const lonCenter = center.longitude;
    const latCenter = south < 0 && north > 0 ? 0 : center.latitude;
    const nc = project(toCartesian(lonCenter, north, maximumHeight));
    const nw = project(toCartesian(west, north, maximumHeight));
    const cw = project(toCartesian(west, latCenter, maximumHeight));
    const sw = project(toCartesian(west, south, maximumHeight));
    const sc = project(toCartesian(lonCenter, south, maximumHeight));
    const minX = Math.min(nw[0], cw[0], sw[0]);
    const maxX = -minX;
    const maxY = Math.max(nw[1], nc[1]);
    const minY = Math.min(sw[1], sc[1]);
    const nwLow = toCartesian(west, north, minimumHeight);
    const swLow = toCartesian(west, south, minimumHeight);
    const minZ = Math.min(v3.dot(z, nwLow) + planeD, v3.dot(z, swLow) + planeD);
    const maxZ = maximumHeight;
    return fromPlaneExtents(
      origin,
      x,
      y,
      z,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
    );
  }
  const fullyAbove = south > 0;
  const fullyBelow = north < 0;
  const latNearest = fullyAbove ? south : fullyBelow ? north : 0;
  const centerLon = rectangleCenter(west, south, east, north).longitude;
  const planeOrigin = toCartesian(centerLon, latNearest, maximumHeight);
  planeOrigin[2] = 0;
  const isPole =
    Math.abs(planeOrigin[0]!) < 1e-10 && Math.abs(planeOrigin[1]!) < 1e-10;
  const normal = isPole
    ? v3.vec3(1, 0, 0)
    : v3.normalize(v3.vec3(), planeOrigin);
  const yAxis = v3.vec3(0, 0, 1);
  const xAxis = v3.cross(v3.vec3(), normal, yAxis);
  const planeD = -v3.dot(normal, planeOrigin);
  const horizon = toCartesian(
    centerLon + Math.PI / 2,
    latNearest,
    maximumHeight,
  );
  // Plane.projectPointOntoPlane, then the x component.
  const hd = v3.dot(normal, horizon) + planeD;
  const projected = v3.scaleAndAdd(v3.vec3(), horizon, normal, -hd);
  const maxX = v3.dot(projected, xAxis);
  const minX = -maxX;
  const maxY = toCartesian(
    0,
    north,
    fullyBelow ? minimumHeight : maximumHeight,
  )[2]!;
  const minY = toCartesian(
    0,
    south,
    fullyAbove ? minimumHeight : maximumHeight,
  )[2]!;
  const farZ = toCartesian(east, latNearest, maximumHeight);
  const minZ = v3.dot(normal, farZ) + planeD;
  return fromPlaneExtents(
    planeOrigin,
    xAxis,
    yAxis,
    normal,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    0,
  );
}

function fromPlaneExtents(
  origin: Vec3,
  x: Vec3,
  y: Vec3,
  z: Vec3,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): Obb {
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2,
    cz = (minZ + maxZ) / 2;
  const sx = (maxX - minX) / 2,
    sy = (maxY - minY) / 2,
    sz = (maxZ - minZ) / 2;
  const center = v3.vec3(
    origin[0]! + x[0]! * cx + y[0]! * cy + z[0]! * cz,
    origin[1]! + x[1]! * cx + y[1]! * cy + z[1]! * cz,
    origin[2]! + x[2]! * cx + y[2]! * cy + z[2]! * cz,
  );
  const halfAxes = Float64Array.of(
    x[0]! * sx,
    x[1]! * sx,
    x[2]! * sx,
    y[0]! * sy,
    y[1]! * sy,
    y[2]! * sy,
    z[0]! * sz,
    z[1]! * sz,
    z[2]! * sz,
  );
  return { center, halfAxes };
}

/** 3D Tiles `boundingVolume.region` (`TileBoundingRegion`, WGS84). */
export function regionFromJson(r: ArrayLike<number>): Region {
  const [west, south, east, north, minimumHeight, maximumHeight] = [
    r[0]!,
    r[1]!,
    r[2]!,
    r[3]!,
    r[4]!,
    r[5]!,
  ];
  const region: Region = {
    west,
    south,
    east,
    north,
    minimumHeight,
    maximumHeight,
    southwestCorner: toCartesian(west, south, 0),
    northeastCorner: toCartesian(east, north, 0),
    westNormal: v3.vec3(),
    eastNormal: v3.vec3(),
    southNormal: v3.vec3(),
    northNormal: v3.vec3(),
    obb: obbFromRectangle(
      west,
      south,
      east,
      north,
      minimumHeight,
      maximumHeight,
    ),
  };
  computeRegionPlanes(region);
  return region;
}

const UNIT_Z = v3.vec3(0, 0, 1);

/** `TileBoundingRegion` computeBox: edge planes for distance. */
function computeRegionPlanes(r: Region): void {
  const midLat = (r.south + r.north) * 0.5;
  const western = toCartesian(r.west, midLat, 0);
  v3.normalize(r.westNormal, v3.cross(v3.vec3(), western, UNIT_Z));
  const eastern = toCartesian(r.east, midLat, 0);
  v3.normalize(r.eastNormal, v3.cross(v3.vec3(), UNIT_Z, eastern));
  let westVector = v3.sub(v3.vec3(), western, eastern);
  if (v3.length(westVector) === 0) {
    westVector = v3.copy(westVector, r.westNormal);
  }
  const eastWestNormal = v3.normalize(v3.vec3(), westVector);

  let southSurfaceNormal: Vec3;
  if (r.south > 0) {
    const southCenter = toCartesian((r.west + r.east) * 0.5, r.south, 0);
    // Move the SW corner onto the west plane along the east-west direction.
    const hit = rayPlane(
      southCenter,
      eastWestNormal,
      r.southwestCorner,
      r.westNormal,
    );
    if (hit) {
      v3.copy(r.southwestCorner, hit);
    }
    southSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
      southCenter,
      v3.vec3(),
    )!;
  } else {
    southSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
      { longitude: r.east, latitude: r.south, height: 0 },
      v3.vec3(),
    );
  }
  v3.normalize(
    r.southNormal,
    v3.cross(v3.vec3(), southSurfaceNormal, westVector),
  );

  let northSurfaceNormal: Vec3;
  if (r.north < 0) {
    const northCenter = toCartesian((r.west + r.east) * 0.5, r.north, 0);
    const hit = rayPlane(
      northCenter,
      v3.negate(v3.vec3(), eastWestNormal),
      r.northeastCorner,
      r.eastNormal,
    );
    if (hit) {
      v3.copy(r.northeastCorner, hit);
    }
    northSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
      northCenter,
      v3.vec3(),
    )!;
  } else {
    northSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
      { longitude: r.west, latitude: r.north, height: 0 },
      v3.vec3(),
    );
  }
  v3.normalize(
    r.northNormal,
    v3.cross(v3.vec3(), westVector, northSurfaceNormal),
  );
}

/** `IntersectionTests.rayPlane` with a plane through `point` with `normal`. */
function rayPlane(
  origin: Vec3,
  direction: Vec3,
  point: Vec3,
  normal: Vec3,
): Vec3 | undefined {
  const denominator = v3.dot(normal, direction);
  if (Math.abs(denominator) < 1e-15) {
    return undefined;
  }
  const d = -v3.dot(normal, point);
  const t = (-d - v3.dot(normal, origin)) / denominator;
  if (t < 0) {
    return undefined;
  }
  return v3.scaleAndAdd(v3.vec3(), origin, direction, t);
}

function rectangleContains(r: Region, c: Cartographic): boolean {
  let longitude = c.longitude;
  let east = r.east;
  if (east < r.west) {
    east += TWO_PI;
    if (longitude < 0) {
      longitude += TWO_PI;
    }
  }
  return (
    (longitude > r.west || Math.abs(longitude - r.west) <= 1e-14) &&
    (longitude < east || Math.abs(longitude - east) <= 1e-14) &&
    c.latitude >= r.south &&
    c.latitude <= r.north
  );
}

/** `TileBoundingRegion.distanceToCamera` (3D): max(region, OBB) distance. */
export function regionDistance(
  r: Region,
  p: Vec3,
  cameraCarto: Cartographic,
): number {
  let result = 0;
  if (!rectangleContains(r, cameraCarto)) {
    const sx = p[0]! - r.southwestCorner[0]!,
      sy = p[1]! - r.southwestCorner[1]!,
      sz = p[2]! - r.southwestCorner[2]!;
    const toWest =
      sx * r.westNormal[0]! + sy * r.westNormal[1]! + sz * r.westNormal[2]!;
    const toSouth =
      sx * r.southNormal[0]! + sy * r.southNormal[1]! + sz * r.southNormal[2]!;
    const nx = p[0]! - r.northeastCorner[0]!,
      ny = p[1]! - r.northeastCorner[1]!,
      nz = p[2]! - r.northeastCorner[2]!;
    const toEast =
      nx * r.eastNormal[0]! + ny * r.eastNormal[1]! + nz * r.eastNormal[2]!;
    const toNorth =
      nx * r.northNormal[0]! + ny * r.northNormal[1]! + nz * r.northNormal[2]!;
    if (toWest > 0) {
      result += toWest * toWest;
    } else if (toEast > 0) {
      result += toEast * toEast;
    }
    if (toSouth > 0) {
      result += toSouth * toSouth;
    } else if (toNorth > 0) {
      result += toNorth * toNorth;
    }
  }
  const h = cameraCarto.height;
  if (h > r.maximumHeight) {
    result += (h - r.maximumHeight) ** 2;
  } else if (h < r.minimumHeight) {
    result += (r.minimumHeight - h) ** 2;
  }
  return Math.max(Math.sqrt(result), Math.sqrt(obbDistanceSquaredTo(r.obb, p)));
}

// ---------------------------------------------------------------- tile volumes

/**
 * Builds a tile volume from tileset JSON, as `Cesium3DTile.createBoundingVolume`
 * (regions ignore the tile transform when it equals the JSON transform chain,
 * which is always the case here: there is no runtime model matrix yet).
 */
export function volumeFromJson(
  json: {
    box?: number[];
    sphere?: number[];
    region?: number[];
  },
  transform: Mat4,
): TileVolume | undefined {
  if (json.box) {
    const box = boxFromJson(json.box, transform);
    return { kind: "box", obb: box, sphere: sphereFromObb(box) };
  }
  if (json.region) {
    const region = regionFromJson(json.region);
    return { kind: "region", region, sphere: sphereFromObb(region.obb) };
  }
  if (json.sphere) {
    return { kind: "sphere", sphere: sphereFromJson(json.sphere, transform) };
  }
  return undefined;
}

/** Distance from the camera to a tile volume, as `distanceToTile` in 1.x. */
export function volumeDistance(
  v: TileVolume,
  p: Vec3,
  cameraCarto: Cartographic,
): number {
  switch (v.kind) {
    case "box":
      return Math.sqrt(obbDistanceSquaredTo(v.obb, p));
    case "sphere":
      return sphereDistance(v.sphere, p);
    case "region":
      return regionDistance(v.region, p, cameraCarto);
  }
}

/** Plane classification of a tile volume (box and region test their OBB). */
export function volumeIntersectPlane(
  v: TileVolume,
  n: ArrayLike<number>,
  d: number,
): number {
  switch (v.kind) {
    case "box":
      return obbIntersectPlane(v.obb, n, d);
    case "sphere":
      return sphereIntersectPlane(v.sphere, n, d);
    case "region":
      return obbIntersectPlane(v.region.obb, n, d);
  }
}

/** The OBB used for plane tests, or undefined for spheres. */
export function volumeObb(v: TileVolume): Obb | undefined {
  return v.kind === "box"
    ? v.obb
    : v.kind === "region"
      ? v.region.obb
      : undefined;
}
