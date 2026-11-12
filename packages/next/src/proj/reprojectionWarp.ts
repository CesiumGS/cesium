// A coordinate operation as a smooth edge (plan §13.26, §13.37): a design
// CRS's frame sits under the body-fixed frame (`smoothFrame(name, bodyFixed,
// spec)`), its coordinates map up to the body's through the operation, and
// content placed in it keeps its design coordinates and is drawn at its true
// place. It is built on `fromFunction`, so the Jacobian is numerical (see
// there for its accuracy) and the inverse is the operation's own, exact.
import type {
  AreaOfInterest,
  CoordinateOperation,
  ResolvedCoordinates,
} from "../frames/coordinates.ts";
import type { WarpScale } from "../camera/route.ts";
import { cartographic } from "../math/ellipsoid.ts";
import { EARTH, type Body } from "../scene/Body.ts";
import { EngineeringFrame } from "../engineering/EngineeringFrame.ts";
import { fromFunction, type FunctionWarp } from "../transforms/fromFunction.ts";

/** What `reprojectionWarp` takes besides the operation. */
export interface ReprojectionWarpOptions {
  /** The body the operation's geodetic coordinates are on: the Earth by default; an engineering frame's own body is used. */
  readonly body?: Body;
  /**
   * Where the operation is defined, in degrees. The warp's `domain` is a
   * circle round it in the design frame's coordinates, and the numerical
   * derivative's step scales with that circle.
   */
  readonly areaOfInterest?: AreaOfInterest;
  /** A live number moving the warp's strength (see `Warp.scale`): rarely wanted for a reprojection. */
  readonly scale?: WarpScale;
  /** The step of the numerical derivative, in the design frame's units (see `fromFunction`). */
  readonly step?: number;
  /** Words for reports, replacing the operation's own. */
  readonly description?: string;
}

const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

type PointFn = (p: ArrayLike<number>, out: Float64Array) => Float64Array;

function finite3(a: ArrayLike<number>, what: string): void {
  if (!(
    Number.isFinite(a[0]) &&
    Number.isFinite(a[1]) &&
    Number.isFinite(a[2])
  )) {
    throw new RangeError(
      `reprojectionWarp: ${what} is not finite (the point is outside the operation's domain)`,
    );
  }
}

/**
 * A coordinate operation as the smooth edge between a design CRS's frame and
 * its parent, the body-fixed frame: `forward` takes design coordinates to
 * body-fixed metres, the exact inverse the other way. `source` is a PROJ `RecordedOperation` or any `CoordinateOperation`
 * (the CRS's own coordinates, in its own units, to longitude and latitude in
 * degrees and metres of height), a `ResolvedCoordinates` (a coordinate
 * service's answer), or an `EngineeringFrame` (whose `toBodyFixed` and
 * `fromBodyFixed` it is, a site transform included).
 *
 * Use it as `smoothFrame("design", bodyFixed, reprojectionWarp(source))`: the
 * frame's points are the design CRS's coordinates in its own units, and its
 * parent's are body-fixed metres. The map to the body is the operation
 * followed by the body's ellipsoid and the map back is its exact reverse;
 * the Jacobian is numerical (`fromFunction`), as the operation is a black
 * box, and its draws are fitted.
 *
 * Its accuracy is the operation's: its `sigma` when the operation states
 * one, otherwise an accuracy that says it is unstated (never exact).
 */
export function reprojectionWarp(
  source:
    | EngineeringFrame<CoordinateOperation>
    | CoordinateOperation
    | ResolvedCoordinates,
  options: ReprojectionWarpOptions = {},
): FunctionWarp {
  let operation: CoordinateOperation;
  let body: Body;
  let toBody: PointFn;
  let fromBody: PointFn;
  let name: string | undefined;
  if (source instanceof EngineeringFrame) {
    const frame = source as EngineeringFrame<CoordinateOperation>;
    operation = frame.operation;
    body = frame.body;
    name = frame.definition.name;
    toBody = (design, out) =>
      frame.toBodyFixed(design, out as Float64Array<ArrayBuffer>);
    fromBody = (position, out) =>
      frame.fromBodyFixed(position, out as Float64Array<ArrayBuffer>);
  } else {
    const op: CoordinateOperation =
      "operation" in source ? source.operation : source;
    operation = op;
    body = options.body ?? EARTH;
    const { ellipsoid } = body;
    const there = cartographic();
    toBody = (design, out) => {
      const geodetic = op.forward(design, new Float64Array(3));
      finite3(geodetic, "the operation's answer");
      there.longitude = geodetic[0]! * RADIANS_PER_DEGREE;
      there.latitude = geodetic[1]! * RADIANS_PER_DEGREE;
      there.height = geodetic[2]!;
      ellipsoid.cartographicToCartesian(
        there,
        out as Float64Array<ArrayBuffer>,
      );
      return out;
    };
    fromBody = (position, out) => {
      const c = ellipsoid.cartesianToCartographic(
        Float64Array.of(position[0]!, position[1]!, position[2]!),
        cartographic(),
      );
      if (c === undefined) {
        throw new RangeError(
          "reprojectionWarp: a position at the body's centre has no design coordinates",
        );
      }
      const design = op.inverse(
        [
          c.longitude * DEGREES_PER_RADIAN,
          c.latitude * DEGREES_PER_RADIAN,
          c.height,
        ],
        new Float64Array(3),
      );
      finite3(design, "the operation's inverse");
      out[0] = design[0]!;
      out[1] = design[1]!;
      out[2] = design[2]!;
      return out;
    };
  }

  const accuracy = operation.accuracy;
  const description =
    options.description ??
    `reprojection${name !== undefined ? ` of ${name}` : ""}: ${operation.description}`;
  const domain =
    options.areaOfInterest !== undefined
      ? domainOf(options.areaOfInterest, body, fromBody)
      : undefined;

  return fromFunction(
    (p, _params, out) => {
      toBody(p, out);
      finite3(out, "the reprojection");
      return out;
    },
    {
      description,
      ...(domain !== undefined && { domain }),
      accuracy:
        accuracy !== undefined
          ? {
              sigma: accuracy,
              note: "the coordinate operation's stated accuracy",
            }
          : { note: "the coordinate operation states no accuracy" },
      ...(options.scale !== undefined && { scale: options.scale }),
      ...(options.step !== undefined && { step: options.step }),
      inverse: (q, _params, out) => fromBody(q, out),
    },
  );
}

/**
 * A circle over an area of interest in the design frame's coordinates: its
 * centre's, and the farthest of its corners and edge midpoints. `toDesign`
 * takes body-fixed metres to design coordinates.
 */
function domainOf(
  area: AreaOfInterest,
  body: Body,
  toDesign: PointFn | undefined,
): { center: Float64Array; radius: number } {
  const east = area.east < area.west ? area.east + 360 : area.east;
  const lons = [area.west, (area.west + east) / 2, east];
  const lats = [area.south, (area.south + area.north) / 2, area.north];
  const at = (lon: number, lat: number): Float64Array | undefined => {
    try {
      const position = body.ellipsoid.cartographicToCartesian(
        cartographic(lon * RADIANS_PER_DEGREE, lat * RADIANS_PER_DEGREE, 0),
        new Float64Array(3),
      );
      return toDesign ? toDesign(position, new Float64Array(3)) : position;
    } catch {
      return undefined;
    }
  };
  const center = at(lons[1]!, lats[1]!);
  if (center === undefined) {
    throw new RangeError(
      "reprojectionWarp: the area of interest's centre is outside the operation's domain",
    );
  }
  const planar = toDesign !== undefined;
  let radius = 0;
  for (const lon of lons) {
    for (const lat of lats) {
      const point = at(lon, lat);
      if (point !== undefined) {
        radius = Math.max(
          radius,
          Math.hypot(
            point[0]! - center[0]!,
            point[1]! - center[1]!,
            planar ? 0 : point[2]! - center[2]!,
          ),
        );
      }
    }
  }
  return { center, radius: radius > 0 ? radius : 1 };
}
