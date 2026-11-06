// Engineering frames: a design CRS (an engineer's projected, ground or site
// coordinates) placed on a body through a recorded PROJ operation (plan 4a).
//
// The chain from design to body-fixed is
//
//   design (site grid, design units)
//     -> site transform (R6)            -> projected CRS coordinates, CRS units
//     -> PROJ operation (R2, R4)        -> geographic: degrees, height
//     -> body.ellipsoid                 -> body-fixed metres
//
// PROJ ends at the body's geographic CRS (EPSG:4979 for the Earth,
// MOON_GEOGRAPHIC_CRS for the Moon); the engine's own `Ellipsoid` does geodetic
// to body-fixed (R4).
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import { cartographic, type Cartographic } from "../math/ellipsoid.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import {
  MOON_GEOGRAPHIC_CRS,
  crsUnits,
  crsDefinition,
  resolveOperation,
  type CrsRef,
  type CrsUnits,
  type RecordedOperation,
} from "./crs.ts";
import type { ProjApi } from "./projApi.ts";
import { Alignment, type AlignmentDefinition } from "./alignment.ts";

/**
 * A site (ground) coordinate system on the projected CRS, R6:
 *
 *   [E, N] = [E0, N0] + scale * R(rotation) * [e, n]        U = U0 + u
 *
 * where (e, n, u) are site-grid coordinates in design units and (E, N, U) the
 * projected CRS's coordinates in its units. Height is not scaled. The inverse
 * is exact.
 */
export interface SiteTransform {
  /** The site origin (E0, N0, U0) in the CRS's units. */
  readonly origin: readonly [number, number, number];
  /** Radians, counterclockwise from the CRS's grid east. */
  readonly rotation: number;
  /** The site scale factor (a ground-to-grid factor, or a Helmert scale). */
  readonly scale: number;
}

export interface EngineeringFrameDefinition {
  readonly name: string;
  readonly body: Body;
  readonly crs: CrsRef;
  readonly site?: SiteTransform;
  /** Alignments in this frame's design (site-grid) coordinates, by unique name. */
  readonly alignments?: readonly AlignmentDefinition[];
  /** A PROJ pipeline to use as is (R2) instead of PROJ's candidate search. */
  readonly pipeline?: string;
  /** Accept a ballpark operation; its accuracy is then undefined. */
  readonly allowBallpark?: boolean;
}

/** The PROJ code of the geographic CRS where PROJ stops for a body (R4). */
function geographicTarget(body: Body): string {
  if (body === EARTH || body.naifId === EARTH.naifId) {
    return "EPSG:4979";
  }
  if (body === MOON || body.naifId === MOON.naifId) {
    return MOON_GEOGRAPHIC_CRS;
  }
  throw new Error(
    `EngineeringFrame: no geographic CRS is known for the body "${body.name}"`,
  );
}

const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * A design CRS on a body. Design coordinates are (e, n, u) in the CRS's own
 * units (`units`, from PROJ, never assumed; R5): the projected CRS's easting
 * and northing in `units.metersPerUnit`, and its height. When `definition.site`
 * is set they are site-grid coordinates instead (see `SiteTransform`).
 *
 * Heights. A design height is in the CRS's vertical unit (its horizontal unit
 * when the CRS has no vertical axis) and the geodetic height is in metres above
 * the body's ellipsoid. For the Earth with a vertical axis PROJ converts the
 * unit on the way to EPSG:4979 (100 ftUS on EPSG:6420+6360 is 30.48 m above the
 * geoid, plus the geoid separation). Otherwise, including the Moon, whose
 * operation to MOON_GEOGRAPHIC_CRS passes heights through unchanged, the frame
 * converts the unit itself; a Moon height is above the IAU 1,737,400 m sphere.
 */
export class EngineeringFrame {
  readonly definition: EngineeringFrameDefinition;
  readonly units: CrsUnits;
  readonly operation: RecordedOperation;
  readonly body: Body;
  /** The PROJ the frame's operation was resolved with. */
  readonly proj: ProjApi;
  /** The frame's alignments, built from `definition.alignments`. */
  readonly alignments: readonly Alignment[];
  /** Metres per design height unit: the vertical unit, else the horizontal. */
  readonly metersPerHeightUnit: number;
  // Metres per design height unit the operation leaves unconverted; 1 where
  // PROJ already returns metres.
  private readonly heightScale: number;

  private constructor(
    definition: EngineeringFrameDefinition,
    units: CrsUnits,
    operation: RecordedOperation,
    heightScale: number,
    proj: ProjApi,
  ) {
    this.proj = proj;
    this.definition = definition;
    this.alignments = (definition.alignments ?? []).map(
      (a) => new Alignment(a),
    );
    const names = new Set<string>();
    for (const { name } of this.alignments) {
      if (names.has(name)) {
        throw new Error(
          `EngineeringFrame "${definition.name}": two alignments are named "${name}"`,
        );
      }
      names.add(name);
    }
    this.units = units;
    this.operation = operation;
    this.body = definition.body;
    this.heightScale = heightScale;
    this.metersPerHeightUnit =
      units.metersPerVerticalUnit ?? units.metersPerUnit;
  }

  /**
   * Resolves the PROJ operation once (R2). Throws for a body with no known
   * geographic CRS, and as `resolveOperation` does when no operation has its
   * grids.
   */
  static create(
    definition: EngineeringFrameDefinition,
    proj: ProjApi,
  ): EngineeringFrame {
    const target = geographicTarget(definition.body);
    const { site } = definition;
    if (site !== undefined) {
      if (!(site.scale > 0 && Number.isFinite(site.scale))) {
        throw new RangeError(
          `EngineeringFrame: site scale must be positive, got ${site.scale}`,
        );
      }
      if (!Number.isFinite(site.rotation)) {
        throw new RangeError(
          `EngineeringFrame: site rotation must be finite, got ${site.rotation}`,
        );
      }
      if (site.origin.length !== 3 || !site.origin.every(Number.isFinite)) {
        throw new RangeError(
          `EngineeringFrame: site origin must be three finite numbers, got [${site.origin.join(", ")}]`,
        );
      }
    }
    const units = crsUnits(proj, definition.crs);
    if (!units.projected) {
      throw new Error(
        `EngineeringFrame: an engineering frame needs a projected CRS; ${crsDefinition(definition.crs).slice(0, 80)} is geographic or not projected`,
      );
    }
    const operation = resolveOperation(proj, definition.crs, target, {
      ...(definition.pipeline !== undefined && {
        pipeline: definition.pipeline,
      }),
      ...(definition.allowBallpark !== undefined && {
        allowBallpark: definition.allowBallpark,
      }),
    });
    // PROJ converts a vertical axis's unit on the way to EPSG:4979. Where it
    // does not (the Moon's target passes heights through; a CRS with no
    // vertical axis has nothing to convert), the design height is in the
    // vertical unit, or else the horizontal one, and the frame converts it.
    const projConverts =
      target === "EPSG:4979" && units.metersPerVerticalUnit !== undefined;
    const heightScale = projConverts
      ? 1
      : (units.metersPerVerticalUnit ?? units.metersPerUnit);
    return new EngineeringFrame(
      definition,
      units,
      operation,
      heightScale,
      proj,
    );
  }

  /**
   * Projected-CRS coordinates (E, N, U) in CRS units of design coordinates:
   * the site transform, or a copy when the frame has none.
   */
  projected(
    design: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const e = design[0]!;
    const n = design[1]!;
    const u = design[2] ?? 0;
    const site = this.definition.site;
    if (site === undefined) {
      out[0] = e;
      out[1] = n;
      out[2] = u;
      return out;
    }
    const c = Math.cos(site.rotation);
    const s = Math.sin(site.rotation);
    out[0] = site.origin[0] + site.scale * (c * e - s * n);
    out[1] = site.origin[1] + site.scale * (s * e + c * n);
    out[2] = site.origin[2] + u;
    return out;
  }

  /** The exact inverse of `projected`: design coordinates of CRS coordinates. */
  fromProjected(
    projected: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const site = this.definition.site;
    const x = projected[0]!;
    const y = projected[1]!;
    const z = projected[2] ?? 0;
    if (site === undefined) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return out;
    }
    const c = Math.cos(site.rotation);
    const s = Math.sin(site.rotation);
    const dx = (x - site.origin[0]) / site.scale;
    const dy = (y - site.origin[1]) / site.scale;
    out[0] = c * dx + s * dy;
    out[1] = -s * dx + c * dy;
    out[2] = z - site.origin[2];
    return out;
  }

  /** Geodetic position of a design point: radians and metres (R4). */
  toGeodetic(design: ArrayLike<number>): Cartographic {
    const geographic = this.operation.forward(this.projected(design));
    return cartographic(
      geographic[0]! * RADIANS_PER_DEGREE,
      geographic[1]! * RADIANS_PER_DEGREE,
      geographic[2]! * this.heightScale,
    );
  }

  /** Design units to body-fixed metres. */
  toBodyFixed(
    design: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    this.body.ellipsoid.cartographicToCartesian(this.toGeodetic(design), out);
    return out;
  }

  /** Body-fixed metres to design units: the exact reverse of `toBodyFixed`. */
  fromBodyFixed(
    position: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const geodetic = this.body.ellipsoid.cartesianToCartographic(
      v3.copy(v3.vec3(), position),
      cartographic(),
    );
    if (geodetic === undefined) {
      throw new RangeError(
        "EngineeringFrame: a position at the body's centre has no design coordinates",
      );
    }
    const projected = this.operation.inverse([
      geodetic.longitude / RADIANS_PER_DEGREE,
      geodetic.latitude / RADIANS_PER_DEGREE,
      geodetic.height / this.heightScale,
    ]);
    return this.fromProjected(projected, out);
  }
}

/** A position in design coordinates, with the frame that gives them meaning. */
export interface DesignPoint {
  readonly engineeringFrame: EngineeringFrame;
  readonly design: Float64Array;
}

export function designPoint(
  frame: EngineeringFrame,
  design: ArrayLike<number>,
): DesignPoint {
  return {
    engineeringFrame: frame,
    design: new Float64Array([design[0]!, design[1]!, design[2] ?? 0]),
  };
}

/**
 * Rigid placement of design coordinates at one anchor, as an iModel's
 * `ecefLocation` does, matching `EXT_georeference`'s east-north-up semantics:
 * design (e, n, u) maps to body-fixed metres by one rotation, a uniform scale
 * and a translation. It is exact at the anchor and sags away from it (the
 * body curves away from the tangent plane: about 7.8 m at 10 km, spec 7.2).
 *
 *  - The origin is the anchor's exact body-fixed position, `frame.toBodyFixed`.
 *  - Up is the ellipsoid's surface normal there.
 *  - Grid north is the direction from `toBodyFixed(anchor)` to
 *    `toBodyFixed(anchor + one design unit along +N)` (along the frame's own
 *    design axes, so a site transform's rotation is included), projected onto
 *    the tangent plane and normalized. It comes from the operation itself, not
 *    from a convergence formula. East is north x up.
 *  - Scale is `units.metersPerUnit` horizontally and the frame's
 *    `metersPerHeightUnit` along up (the vertical unit, else the horizontal
 *    one), not the point scale factor.
 */
export class RigidPlacement {
  readonly frame: EngineeringFrame;
  readonly anchor: Float64Array;
  /** Design units to body-fixed metres, column-major. */
  readonly matrix: Mat4;
  private readonly origin: Float64Array;
  private readonly east: Float64Array;
  private readonly north: Float64Array;
  private readonly up: Float64Array;
  private readonly scale: number;
  private readonly heightUnit: number;

  private constructor(frame: EngineeringFrame, anchorDesign: Float64Array) {
    this.frame = frame;
    this.anchor = anchorDesign;
    this.scale = frame.units.metersPerUnit;
    this.heightUnit = frame.metersPerHeightUnit;
    const origin = frame.toBodyFixed(anchorDesign);
    const up = v3.vec3();
    if (frame.body.ellipsoid.geodeticSurfaceNormal(origin, up) === undefined) {
      throw new RangeError(
        "RigidPlacement: the anchor is at the body's centre",
      );
    }
    const stepped = frame.toBodyFixed([
      anchorDesign[0]!,
      anchorDesign[1]! + 1,
      anchorDesign[2]!,
    ]);
    const north = v3.sub(v3.vec3(), stepped, origin);
    // Remove the vertical part, leaving the tangent-plane direction.
    v3.scaleAndAdd(north, north, up, -v3.dot(north, up));
    v3.normalize(north, north);
    const east = v3.cross(v3.vec3(), north, up);
    this.origin = origin;
    this.east = east;
    this.north = north;
    this.up = up;

    const k = this.scale;
    const kz = this.heightUnit;
    const t = v3.vec3();
    for (let i = 0; i < 3; i++) {
      t[i] =
        origin[i]! -
        (k * (east[i]! * anchorDesign[0]! + north[i]! * anchorDesign[1]!) +
          kz * up[i]! * anchorDesign[2]!);
    }
    this.matrix = m4.fromBasis(
      m4.mat4(),
      v3.scale(v3.vec3(), east, k),
      v3.scale(v3.vec3(), north, k),
      v3.scale(v3.vec3(), up, kz),
      t,
    );
  }

  static at(
    frame: EngineeringFrame,
    anchorDesign: ArrayLike<number>,
  ): RigidPlacement {
    return new RigidPlacement(
      frame,
      new Float64Array([
        anchorDesign[0]!,
        anchorDesign[1]!,
        anchorDesign[2] ?? 0,
      ]),
    );
  }

  // Both directions work from the anchor, so no large coordinate is
  // differenced against another.
  toBodyFixed(
    design: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const dx = (design[0]! - this.anchor[0]!) * this.scale;
    const dy = (design[1]! - this.anchor[1]!) * this.scale;
    const dz = ((design[2] ?? 0) - this.anchor[2]!) * this.heightUnit;
    for (let i = 0; i < 3; i++) {
      out[i] =
        this.origin[i]! +
        this.east[i]! * dx +
        this.north[i]! * dy +
        this.up[i]! * dz;
    }
    return out;
  }

  fromBodyFixed(
    position: ArrayLike<number>,
    out = new Float64Array(3),
  ): Float64Array {
    const px = position[0]! - this.origin[0]!;
    const py = position[1]! - this.origin[1]!;
    const pz = position[2]! - this.origin[2]!;
    const d = [
      px * this.east[0]! + py * this.east[1]! + pz * this.east[2]!,
      px * this.north[0]! + py * this.north[1]! + pz * this.north[2]!,
      px * this.up[0]! + py * this.up[1]! + pz * this.up[2]!,
    ];
    for (let i = 0; i < 3; i++) {
      out[i] = this.anchor[i]! + d[i]! / (i < 2 ? this.scale : this.heightUnit);
    }
    return out;
  }
}
