// EPSG datum transformations read from references.json and applied by hand
// (R10): the records' parameters in SI units, their ellipsoids, and the
// geog2D-domain Helmert as the EPSG methods define it.
import {
  type HelmertParameters,
  type RotationConvention,
  geocentricToGeodetic,
  geodeticToGeocentric,
  helmert,
} from "./geodesy.ts";
import {
  ARCSECOND,
  MILLIARCSECOND,
  type Printed,
  cited,
  printed,
} from "./references.ts";

/** A parameter as an EPSG record prints it: name, value, unit. */
export type EpsgParameter = readonly [string, string, string];

/** An EPSG transformation record in references.json. */
export interface EpsgTransformation {
  readonly name: string;
  readonly accuracy: string;
  readonly method: string;
  readonly methodCode: number;
  readonly parameters: readonly EpsgParameter[];
  readonly extent?: {
    readonly code: number;
    readonly name: string;
    readonly westBoundLongitude?: string;
    readonly southBoundLatitude?: string;
    readonly eastBoundLongitude?: string;
    readonly northBoundLatitude?: string;
  };
}

const UNIT: Readonly<Record<string, number>> = {
  metre: 1,
  "metres per year": 1,
  "arc-second": ARCSECOND,
  "milliarc-second": MILLIARCSECOND,
  "milliarc-seconds per year": MILLIARCSECOND,
  "parts per million": 1e-6,
  "parts per billion": 1e-9,
  "parts per billion per year": 1e-9,
  year: 1,
};

/** A parameter's value in SI units, or undefined when the record has none of that name. */
function parameter(
  parameters: readonly EpsgParameter[],
  name: string,
): number | undefined {
  const p = parameters.find((q) => q[0] === name);
  if (p === undefined) {
    return undefined;
  }
  const factor = UNIT[p[2]];
  if (factor === undefined) {
    throw new Error(`unknown EPSG unit "${p[2]}"`);
  }
  return printed(p[1]).value * factor;
}

/**
 * The seven parameters of an EPSG record (a geocentric translation's
 * rotations and scale are 0) and its rotation convention: EPSG methods 9603
 * and 1031 (translations), 9606 and 1033 (position vector), 9607 and 1032
 * (coordinate frame), as IOGP 373-7-2 §4.2 defines them.
 */
export function epsgHelmertOf(record: EpsgTransformation): {
  parameters: HelmertParameters;
  convention: RotationConvention;
} {
  const code = record.methodCode;
  const convention: RotationConvention =
    code === 9607 || code === 1032 ? "coordinate-frame" : "position-vector";
  if (![9603, 1031, 9606, 1033, 9607, 1032].includes(code)) {
    throw new Error(
      `EPSG method ${code} (${record.method}) is not a Helmert this case codes`,
    );
  }
  const value = (name: string) => parameter(record.parameters, name) ?? 0;
  const required = (name: string) => {
    const v = parameter(record.parameters, name);
    if (v === undefined) {
      throw new Error(`the EPSG record "${record.name}" has no "${name}"`);
    }
    return v;
  };
  return {
    parameters: {
      tx: required("X-axis translation"),
      ty: required("Y-axis translation"),
      tz: required("Z-axis translation"),
      rx: value("X-axis rotation"),
      ry: value("Y-axis rotation"),
      rz: value("Z-axis rotation"),
      ds: value("Scale difference"),
    },
    convention,
  };
}

/** An EPSG transformation record from references.json, with its parameters in SI units. */
export function epsgTransformation(id: string) {
  const record = cited<EpsgTransformation>(id);
  return {
    record,
    ...epsgHelmertOf(record),
    accuracy: printed(record.accuracy),
  };
}

/**
 * A time-dependent Helmert's parameters and rates from an EPSG record (EPSG
 * 1053/1056), in SI units, with its parameter reference epoch.
 */
export function epsgTimeDependentHelmert(parameters: readonly EpsgParameter[]) {
  const value = (name: string) => {
    const v = parameter(parameters, name);
    if (v === undefined) {
      throw new Error(`the EPSG record has no "${name}"`);
    }
    return v;
  };
  const set = (prefix: string): HelmertParameters => ({
    tx: value(`${prefix}X-axis translation`),
    ty: value(`${prefix}Y-axis translation`),
    tz: value(`${prefix}Z-axis translation`),
    rx: value(`${prefix}X-axis rotation`),
    ry: value(`${prefix}Y-axis rotation`),
    rz: value(`${prefix}Z-axis rotation`),
    ds: value(
      prefix === "" ? "Scale difference" : "Rate of change of scale difference",
    ),
  });
  return {
    parameters: set(""),
    rates: set("Rate of change of "),
    referenceEpoch: value("Parameter reference epoch"),
  };
}

export interface EllipsoidShape {
  /** Semi-major axis, m. */
  readonly a: number;
  /** Flattening. */
  readonly f: number;
}

/** An ellipsoid's EPSG record (a with 1/f, or a with b, as EPSG defines Clarke 1866). */
export function ellipsoidShape(id: string): EllipsoidShape {
  const e = cited<{
    semiMajorAxis: string;
    inverseFlattening?: string;
    semiMinorAxis?: string;
  }>(id);
  const a = printed(e.semiMajorAxis).value;
  if (e.inverseFlattening !== undefined) {
    return { a, f: 1 / printed(e.inverseFlattening).value };
  }
  if (e.semiMinorAxis !== undefined) {
    return { a, f: 1 - printed(e.semiMinorAxis).value / a };
  }
  throw new Error(`references.json's "${id}" defines no flattening`);
}

/**
 * A geog2D-domain Helmert (EPSG 9603, 9606, 9607) by hand: the source
 * geographic position to geocentric on its ellipsoid (IOGP 373-7-2 §4.1.1),
 * the Helmert (§4.2), and back to geographic on the target's. A "geog2D
 * domain" method transforms latitude and longitude only, so the height is
 * kept: PROJ's push and pop of the height around the geocentric step.
 * Returns the target's (longitude, latitude, height) and its geocentric
 * position at the kept height, m.
 */
export function geog2dHelmert(
  geographic: ArrayLike<number>,
  source: EllipsoidShape,
  parameters: HelmertParameters,
  convention: RotationConvention,
  target: EllipsoidShape,
  keepsHeight = true,
): { geographic: [number, number, number]; xyz: [number, number, number] } {
  const height = geographic[2] ?? 0;
  const xyz = geodeticToGeocentric(
    geographic[0]!,
    geographic[1]!,
    height,
    source.a,
    source.f,
  );
  const moved = helmert(xyz, parameters, { convention });
  const [lon, lat, h] = geocentricToGeodetic(moved, target.a, target.f);
  // A geocentric-domain method (EPSG 1031-1033) moves the height too.
  const out = keepsHeight ? height : h;
  return {
    geographic: [lon, lat, out],
    xyz: geodeticToGeocentric(lon, lat, out, target.a, target.f),
  };
}

/** Printed degrees of an EPSG extent's bounding box. */
export function extentBox(record: EpsgTransformation) {
  const e = record.extent;
  if (
    e?.westBoundLongitude === undefined ||
    e.southBoundLatitude === undefined ||
    e.eastBoundLongitude === undefined ||
    e.northBoundLatitude === undefined
  ) {
    return undefined;
  }
  const box: Record<"west" | "south" | "east" | "north", Printed> = {
    west: printed(e.westBoundLongitude),
    south: printed(e.southBoundLatitude),
    east: printed(e.eastBoundLongitude),
    north: printed(e.northBoundLatitude),
  };
  return box;
}
