import * as v3 from "./vec3.ts";
import type { Vec3 } from "./vec3.ts";

export const EPSILON12 = 1e-12;
export const EPSILON14 = 1e-14;

/** Geodetic coordinates in radians and meters. */
export interface Cartographic {
  longitude: number;
  latitude: number;
  height: number;
}

export function cartographic(
  longitude = 0,
  latitude = 0,
  height = 0,
): Cartographic {
  return { longitude, latitude, height };
}

export function fromDegrees(
  lonDeg: number,
  latDeg: number,
  height = 0,
): Cartographic {
  return cartographic(
    (lonDeg * Math.PI) / 180,
    (latDeg * Math.PI) / 180,
    height,
  );
}

/**
 * A triaxial ellipsoid. The formulas match CesiumJS 1.x (`Ellipsoid`,
 * `scaleToGeodeticSurface`) so geodesy parity tests can compare outputs directly.
 */
export class Ellipsoid {
  static readonly WGS84 = new Ellipsoid(
    6378137.0,
    6378137.0,
    6356752.3142451793,
  );

  readonly radii: Vec3;
  readonly radiiSquared: Vec3;
  readonly oneOverRadii: Vec3;
  readonly oneOverRadiiSquared: Vec3;
  readonly maximumRadius: number;
  readonly minimumRadius: number;
  private readonly centerToleranceSquared = 0.1;
  private readonly scratchA = v3.vec3();
  private readonly scratchB = v3.vec3();

  constructor(x: number, y: number, z: number) {
    this.radii = v3.vec3(x, y, z);
    this.radiiSquared = v3.vec3(x * x, y * y, z * z);
    this.oneOverRadii = v3.vec3(1 / x, 1 / y, 1 / z);
    this.oneOverRadiiSquared = v3.vec3(1 / (x * x), 1 / (y * y), 1 / (z * z));
    this.maximumRadius = Math.max(x, y, z);
    this.minimumRadius = Math.min(x, y, z);
  }

  geodeticSurfaceNormalCartographic(c: Cartographic, out: Vec3): Vec3 {
    const cosLat = Math.cos(c.latitude);
    v3.set(
      out,
      cosLat * Math.cos(c.longitude),
      cosLat * Math.sin(c.longitude),
      Math.sin(c.latitude),
    );
    return v3.normalize(out, out);
  }

  /** Returns `undefined` at the ellipsoid center, where the normal is undefined. */
  geodeticSurfaceNormal(p: Vec3, out: Vec3): Vec3 | undefined {
    if (
      Math.abs(p[0]!) < EPSILON14 &&
      Math.abs(p[1]!) < EPSILON14 &&
      Math.abs(p[2]!) < EPSILON14
    ) {
      return undefined;
    }
    v3.mul(out, p, this.oneOverRadiiSquared);
    return v3.normalize(out, out);
  }

  cartographicToCartesian(c: Cartographic, out: Vec3): Vec3 {
    const n = this.geodeticSurfaceNormalCartographic(c, this.scratchA);
    const k = v3.mul(this.scratchB, this.radiiSquared, n);
    const gamma = Math.sqrt(v3.dot(n, k));
    v3.scale(k, k, 1 / gamma);
    return v3.scaleAndAdd(out, k, n, c.height);
  }

  /** Returns `undefined` near the ellipsoid center. */
  cartesianToCartographic(
    p: Vec3,
    out: Cartographic,
  ): Cartographic | undefined {
    const surface = this.scaleToGeodeticSurface(p, this.scratchA);
    if (surface === undefined) {
      return undefined;
    }
    const n = this.geodeticSurfaceNormal(surface, this.scratchB)!;
    const hx = p[0]! - surface[0]!,
      hy = p[1]! - surface[1]!,
      hz = p[2]! - surface[2]!;
    const sign = Math.sign(hx * p[0]! + hy * p[1]! + hz * p[2]!);
    out.longitude = Math.atan2(n[1]!, n[0]!);
    out.latitude = Math.asin(n[2]!);
    out.height = sign * Math.sqrt(hx * hx + hy * hy + hz * hz);
    return out;
  }

  /** Newton iteration onto the surface along the geodetic normal (1.x algorithm). */
  scaleToGeodeticSurface(p: Vec3, out: Vec3): Vec3 | undefined {
    const px = p[0]!,
      py = p[1]!,
      pz = p[2]!;
    const r = this.oneOverRadii;
    const ox = r[0]!,
      oy = r[1]!,
      oz = r[2]!;
    const osx = this.oneOverRadiiSquared[0]!,
      osy = this.oneOverRadiiSquared[1]!,
      osz = this.oneOverRadiiSquared[2]!;

    const x2 = px * px * ox * ox;
    const y2 = py * py * oy * oy;
    const z2 = pz * pz * oz * oz;
    const squaredNorm = x2 + y2 + z2;
    const ratio = Math.sqrt(1.0 / squaredNorm);

    if (squaredNorm < this.centerToleranceSquared) {
      return Number.isFinite(ratio)
        ? v3.set(out, px * ratio, py * ratio, pz * ratio)
        : undefined;
    }

    const ix = px * ratio,
      iy = py * ratio,
      iz = pz * ratio;
    const gx = ix * osx * 2.0,
      gy = iy * osy * 2.0,
      gz = iz * osz * 2.0;
    let lambda =
      ((1.0 - ratio) * Math.sqrt(px * px + py * py + pz * pz)) /
      (0.5 * Math.sqrt(gx * gx + gy * gy + gz * gz));
    let correction = 0.0;
    let func: number;
    let xm: number, ym: number, zm: number;

    do {
      lambda -= correction;
      xm = 1.0 / (1.0 + lambda * osx);
      ym = 1.0 / (1.0 + lambda * osy);
      zm = 1.0 / (1.0 + lambda * osz);
      const xm2 = xm * xm,
        ym2 = ym * ym,
        zm2 = zm * zm;
      func = x2 * xm2 + y2 * ym2 + z2 * zm2 - 1.0;
      const denominator =
        x2 * xm2 * xm * osx + y2 * ym2 * ym * osy + z2 * zm2 * zm * osz;
      correction = func / (-2.0 * denominator);
    } while (Math.abs(func) > EPSILON12);

    return v3.set(out, px * xm, py * ym, pz * zm);
  }

  /**
   * Nearest intersection of a ray with the ellipsoid surface, written to
   * `out`, or `undefined` if the ray misses. `direction` is unit length.
   */
  rayIntersection(origin: Vec3, direction: Vec3, out: Vec3): Vec3 | undefined {
    const ox = this.oneOverRadii[0]!,
      oy = this.oneOverRadii[1]!,
      oz = this.oneOverRadii[2]!;
    const qx = origin[0]! * ox,
      qy = origin[1]! * oy,
      qz = origin[2]! * oz;
    const wx = direction[0]! * ox,
      wy = direction[1]! * oy,
      wz = direction[2]! * oz;
    const a = wx * wx + wy * wy + wz * wz;
    const b = 2 * (qx * wx + qy * wy + qz * wz);
    const c = qx * qx + qy * qy + qz * qz - 1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      return undefined;
    }
    const sq = Math.sqrt(disc);
    const t0 = (-b - sq) / (2 * a);
    const t1 = (-b + sq) / (2 * a);
    const t = t0 > 0 ? t0 : t1;
    if (!(t > 0)) {
      return undefined;
    }
    out[0] = origin[0]! + direction[0]! * t;
    out[1] = origin[1]! + direction[1]! * t;
    out[2] = origin[2]! + direction[2]! * t;
    return out;
  }
}
