// A small reader for WKT (ISO 19162) text, to take a bound CRS's TOWGS84
// parameters and ellipsoids from the input itself rather than from PROJ.
// It reads the bracket structure only, character by character (no regular
// expressions over the input), with limits on size and depth because the
// text may be pasted by a user (R18).
import type { HelmertParameters, RotationConvention } from "./geodesy.ts";
import { ARCSECOND } from "./references.ts";

export interface WktNode {
  readonly keyword: string;
  readonly args: readonly (string | number | WktNode)[];
}

const MAX_LENGTH = 200_000;
const MAX_DEPTH = 64;

const isSpace = (c: string) =>
  c === " " || c === "\n" || c === "\r" || c === "\t";
const isWord = (c: string) =>
  (c >= "A" && c <= "Z") ||
  (c >= "a" && c <= "z") ||
  (c >= "0" && c <= "9") ||
  c === "_" ||
  c === "." ||
  c === "-" ||
  c === "+";

/** Parses WKT text into its nodes; throws with the position of the first error. */
export function parseWkt(text: string): WktNode {
  if (text.length > MAX_LENGTH) {
    throw new Error(`the WKT is longer than ${MAX_LENGTH} characters`);
  }
  let i = 0;
  const fail = (what: string): never => {
    throw new Error(`WKT: ${what} at character ${i}`);
  };
  const skip = () => {
    while (i < text.length && isSpace(text[i]!)) {
      i++;
    }
  };
  const word = (): string => {
    const start = i;
    while (i < text.length && isWord(text[i]!)) {
      i++;
    }
    if (i === start) {
      fail("expected a keyword, a number or a quoted text");
    }
    return text.slice(start, i);
  };
  const quoted = (): string => {
    i++; // the opening quote
    let out = "";
    for (;;) {
      if (i >= text.length) {
        fail("unterminated quoted text");
      }
      const c = text[i]!;
      if (c === '"') {
        if (text[i + 1] === '"') {
          out += '"';
          i += 2;
          continue;
        }
        i++;
        return out;
      }
      out += c;
      i++;
    }
  };
  const node = (depth: number): WktNode => {
    if (depth > MAX_DEPTH) {
      fail(`nesting deeper than ${MAX_DEPTH}`);
    }
    skip();
    const keyword = word().toUpperCase();
    skip();
    const open = text[i];
    if (open !== "[" && open !== "(") {
      fail(`expected "[" after ${keyword}`);
    }
    const close = open === "[" ? "]" : ")";
    i++;
    const args: (string | number | WktNode)[] = [];
    skip();
    if (text[i] === close) {
      i++;
      return { keyword, args };
    }
    for (;;) {
      skip();
      const c = text[i];
      if (c === '"') {
        args.push(quoted());
      } else {
        const start = i;
        const w = word();
        skip();
        if (text[i] === "[" || text[i] === "(") {
          i = start;
          args.push(node(depth + 1));
        } else {
          const n = Number(w);
          args.push(Number.isFinite(n) && w !== "" ? n : w);
        }
      }
      skip();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === close) {
        i++;
        return { keyword, args };
      }
      fail(`expected "," or "${close}"`);
    }
  };
  const root = node(0);
  skip();
  if (i !== text.length) {
    fail("text after the end");
  }
  return root;
}

/** The node's child nodes with this keyword. */
export const children = (n: WktNode, keyword: string): WktNode[] =>
  n.args.filter(
    (a): a is WktNode => typeof a === "object" && a.keyword === keyword,
  );

/** The first node with this keyword in a depth-first walk (the node itself first). */
export function find(n: WktNode, keyword: string): WktNode | undefined {
  if (n.keyword === keyword) {
    return n;
  }
  for (const a of n.args) {
    if (typeof a === "object") {
      const hit = find(a, keyword);
      if (hit !== undefined) {
        return hit;
      }
    }
  }
  return undefined;
}

const text = (n: WktNode | undefined, index: number): string | undefined => {
  const a = n?.args[index];
  return typeof a === "string" ? a : undefined;
};
const number = (n: WktNode | undefined, index: number): number | undefined => {
  const a = n?.args[index];
  return typeof a === "number" ? a : undefined;
};

/** A node's ID["EPSG", code] (WKT2) or AUTHORITY["EPSG", "code"] (WKT1), when it has one. */
export function epsgId(n: WktNode): number | undefined {
  for (const id of [...children(n, "ID"), ...children(n, "AUTHORITY")]) {
    if (text(id, 0)?.toUpperCase() === "EPSG") {
      const code = id.args[1];
      const value = typeof code === "number" ? code : Number(code);
      return Number.isFinite(value) ? value : undefined;
    }
  }
  return undefined;
}

/** The CRS a WKT describes: a bound CRS's source, or the CRS itself. */
export function sourceCrsNode(root: WktNode): WktNode {
  if (root.keyword === "BOUNDCRS") {
    const source = children(root, "SOURCECRS")[0];
    const inner = source?.args.find((a): a is WktNode => typeof a === "object");
    if (inner !== undefined) {
      return inner;
    }
  }
  return root;
}

/** An ELLIPSOID (WKT2) or SPHEROID (WKT1) node's semi-major axis (m) and flattening (a sphere has 1/f = 0). */
export function ellipsoidOfNode(n: WktNode | undefined) {
  const e =
    n === undefined ? undefined : (find(n, "ELLIPSOID") ?? find(n, "SPHEROID"));
  const a = number(e, 1);
  const rf = number(e, 2);
  if (e === undefined || a === undefined || rf === undefined) {
    return undefined;
  }
  const unit = number(children(e, "LENGTHUNIT")[0], 1) ?? 1;
  return { name: text(e, 0) ?? "", a: a * unit, f: rf === 0 ? 0 : 1 / rf };
}

/** Metres per unit of a projected CRS's first axis, as its WKT states it. */
export function axisMetres(crs: WktNode): number | undefined {
  const cs = crs.args.filter((a): a is WktNode => typeof a === "object");
  for (const axis of cs.filter((a) => a.keyword === "AXIS")) {
    const unit = number(children(axis, "LENGTHUNIT")[0], 1);
    if (unit !== undefined) {
      return unit;
    }
  }
  // WKT2's CRS-wide LENGTHUNIT, or WKT1's UNIT.
  return (
    number(children(crs, "LENGTHUNIT")[0], 1) ??
    number(children(crs, "UNIT")[0], 1)
  );
}

/** The bound CRS's abridged transformation, read from the WKT's own numbers. */
export interface Towgs84 {
  readonly method: string;
  readonly methodCode: number | undefined;
  readonly parameters: HelmertParameters;
  readonly convention: RotationConvention;
  /** EPSG's geocentric-domain methods transform the height too; geog2D ones keep it. */
  readonly keepsHeight: boolean;
  /** The parameters as the WKT prints them, for display. */
  readonly printed: string;
}

const PARAMETER_CODES: Readonly<Record<number, keyof HelmertParameters>> = {
  8605: "tx",
  8606: "ty",
  8607: "tz",
  8608: "rx",
  8609: "ry",
  8610: "rz",
  8611: "ds",
};
const PARAMETER_NAMES: Readonly<Record<string, keyof HelmertParameters>> = {
  "x-axis translation": "tx",
  "y-axis translation": "ty",
  "z-axis translation": "tz",
  "x-axis rotation": "rx",
  "y-axis rotation": "ry",
  "z-axis rotation": "rz",
  "scale difference": "ds",
};

const POSITION_VECTOR = [9606, 1033, 9603, 1031];
const COORDINATE_FRAME = [9607, 1032];
const GEOCENTRIC_DOMAIN = [1031, 1032, 1033];

/** Within this of 1 a scale is a factor (1 + dS); below it in size, a difference dS. */
const SCALE_FORMS = 0.01;

/**
 * The scale difference dS of a scale parameter in its unit (unity when none
 * is stated). ISO 19162:2019 §15.5.2 writes an abridged transformation's
 * scale as the factor 1 + dS (PROJ writes 0.999979511 for −20.489 ppm, and
 * reads a unity value the same way); a difference in ppm or parts per
 * billion is the difference itself. So the value in unity near 1 is a factor,
 * and a small one a difference; anything else is refused.
 */
function scaleDifference(value: number, unit: number | undefined): number {
  const unity = value * (unit ?? 1);
  if (Math.abs(unity - 1) < SCALE_FORMS) {
    return unity - 1;
  }
  if (Math.abs(unity) < SCALE_FORMS) {
    return unity;
  }
  throw new Error(
    `the bound CRS's scale difference ${value} (${unity} in unity) is neither a factor near 1 nor a small difference`,
  );
}

/**
 * WKT1's TOWGS84[dx, dy, dz(, rx, ry, rz, ds)]: OGC 01-009 and GDAL read it
 * as EPSG 9606, the position vector convention, in metres, arc-seconds and
 * ppm, to WGS 84.
 */
function wkt1Towgs84(node: WktNode): Towgs84 {
  const v = node.args.map((a) => (typeof a === "number" ? a : Number.NaN));
  if (!(v.length === 3 || v.length === 7) || !v.every(Number.isFinite)) {
    throw new Error(
      `WKT1 TOWGS84 needs 3 or 7 numbers, got ${node.args.length}`,
    );
  }
  return {
    method: "WKT1 TOWGS84 (position vector, EPSG 9606)",
    methodCode: 9606,
    parameters: {
      tx: v[0]!,
      ty: v[1]!,
      tz: v[2]!,
      rx: (v[3] ?? 0) * ARCSECOND,
      ry: (v[4] ?? 0) * ARCSECOND,
      rz: (v[5] ?? 0) * ARCSECOND,
      ds: (v[6] ?? 0) * 1e-6,
    },
    convention: "position-vector",
    keepsHeight: true,
    printed: `TOWGS84[${v.join(", ")}]`,
  };
}

/**
 * The TOWGS84 of a WKT2 BOUNDCRS (its ABRIDGEDTRANSFORMATION) or of a WKT1
 * datum's TOWGS84[...], or undefined when it carries none. ISO 19162:2019
 * §15.5.2: an abridged transformation's parameters with no unit are in
 * metres and arc-seconds; a stated LENGTHUNIT or ANGLEUNIT is honoured; the
 * scale is read by `scaleDifference`. Throws for a method that is not a
 * Helmert.
 */
/** The bound transformation is another method, not a Helmert. */
export class NotHelmertError extends Error {
  override name = "NotHelmertError";
}

/**
 * Why the hand-coded Helmert comparison is skipped, from `towgs84Of`'s
 * error: another method, named; or the Helmert's own fault (a refused
 * scale, a malformed WKT1 TOWGS84), in its words.
 */
export function helmertSkipWhy(
  error: unknown,
  methodName: string | undefined,
): string {
  if (error instanceof NotHelmertError) {
    return `the bound transformation isn't a Helmert (${methodName ?? "unnamed"}), so there's no hand comparison`;
  }
  const message = error instanceof Error ? error.message : String(error);
  return `the bound transformation's Helmert couldn't be read (${message}), so there's no hand comparison`;
}

export function towgs84Of(root: WktNode): Towgs84 | undefined {
  const bound = find(root, "BOUNDCRS");
  const abridged =
    bound === undefined
      ? undefined
      : children(bound, "ABRIDGEDTRANSFORMATION")[0];
  if (abridged === undefined) {
    const wkt1 = bound === undefined ? find(root, "TOWGS84") : undefined;
    return wkt1 === undefined ? undefined : wkt1Towgs84(wkt1);
  }
  const method = children(abridged, "METHOD")[0];
  const methodName = text(method, 0) ?? "";
  const methodCode = method === undefined ? undefined : epsgId(method);
  const known =
    methodCode !== undefined &&
    [...POSITION_VECTOR, ...COORDINATE_FRAME].includes(methodCode);
  const byName = /position vector|coordinate frame|geocentric translation/i;
  if (!known && !byName.test(methodName)) {
    throw new NotHelmertError(
      `the bound CRS's transformation "${methodName}" is not a Helmert (EPSG 9603, 9606 or 9607)`,
    );
  }
  const convention: RotationConvention =
    (methodCode !== undefined && COORDINATE_FRAME.includes(methodCode)) ||
    /coordinate frame/i.test(methodName)
      ? "coordinate-frame"
      : "position-vector";
  const values: Record<keyof HelmertParameters, number> = {
    tx: 0,
    ty: 0,
    tz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    ds: 0,
  };
  const shown: string[] = [];
  for (const p of children(abridged, "PARAMETER")) {
    const name = text(p, 0) ?? "";
    const value = number(p, 1);
    const code = epsgId(p);
    const key =
      (code !== undefined ? PARAMETER_CODES[code] : undefined) ??
      PARAMETER_NAMES[name.toLowerCase()];
    if (key === undefined || value === undefined) {
      continue;
    }
    shown.push(`${name} ${value}`);
    const length = number(children(p, "LENGTHUNIT")[0], 1);
    const angle = number(children(p, "ANGLEUNIT")[0], 1);
    const scale = number(children(p, "SCALEUNIT")[0], 1);
    if (key === "tx" || key === "ty" || key === "tz") {
      values[key] = value * (length ?? 1);
    } else if (key === "ds") {
      values.ds = scaleDifference(value, scale);
    } else {
      values[key] = value * (angle ?? ARCSECOND);
    }
  }
  return {
    method: methodName,
    methodCode,
    parameters: values,
    convention,
    keepsHeight: !(
      methodCode !== undefined && GEOCENTRIC_DOMAIN.includes(methodCode)
    ),
    printed: shown.join(", "),
  };
}

/** The name of a BOUNDCRS's transformation method, when it has one. */
export function boundMethodName(root: WktNode): string | undefined {
  const bound = find(root, "BOUNDCRS");
  const abridged =
    bound === undefined
      ? undefined
      : children(bound, "ABRIDGEDTRANSFORMATION")[0];
  const method =
    abridged === undefined ? undefined : children(abridged, "METHOD")[0];
  return text(method, 0);
}

/** A USAGE BBOX's centre (longitude, latitude), when the WKT has one. */
export function bboxCentre(root: WktNode): [number, number] | undefined {
  const box = find(root, "BBOX");
  const [south, west, north, east] = [0, 1, 2, 3].map((k) => number(box, k));
  if (
    south === undefined ||
    west === undefined ||
    north === undefined ||
    east === undefined
  ) {
    return undefined;
  }
  // West may exceed east across 180°.
  const span = east >= west ? east - west : east + 360 - west;
  let lon = west + span / 2;
  if (lon > 180) {
    lon -= 360;
  }
  return [lon, (south + north) / 2];
}

/** The projection's origin (longitude, latitude) from its PARAMETERs, when stated. */
export function projectionOrigin(crs: WktNode): [number, number] | undefined {
  // WKT2 keeps the parameters in a CONVERSION; WKT1 on the PROJCS itself.
  const conversion = find(crs, "CONVERSION") ?? crs;
  let lon: number | undefined;
  let lat: number | undefined;
  for (const p of children(conversion, "PARAMETER")) {
    const name = (text(p, 0) ?? "").toLowerCase();
    const value = number(p, 1);
    if (
      name.startsWith("longitude of natural origin") ||
      name.startsWith("longitude of false origin") ||
      name === "central_meridian" ||
      name === "longitude_of_center" ||
      name === "longitude_of_origin"
    ) {
      lon = value;
    }
    if (
      name.startsWith("latitude of natural origin") ||
      name.startsWith("latitude of false origin") ||
      name === "latitude_of_origin" ||
      name === "latitude_of_center"
    ) {
      lat = value;
    }
  }
  return lon === undefined || lat === undefined ? undefined : [lon, lat];
}
