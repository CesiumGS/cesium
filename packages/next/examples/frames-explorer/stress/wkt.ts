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

/** A node's ID["EPSG", code], when it has one. */
export function epsgId(n: WktNode): number | undefined {
  for (const id of children(n, "ID")) {
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

/** An ELLIPSOID node's semi-major axis (m) and flattening (a sphere has 1/f = 0). */
export function ellipsoidOfNode(n: WktNode | undefined) {
  const e = n === undefined ? undefined : find(n, "ELLIPSOID");
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
  return number(children(crs, "LENGTHUNIT")[0], 1);
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

/**
 * The TOWGS84 of a WKT2 BOUNDCRS (its ABRIDGEDTRANSFORMATION), or undefined
 * when it carries none. ISO 19162:2019 §15.5.2: an abridged transformation's
 * parameters with no unit are in metres and arc-seconds, and its scale
 * difference is then given as the scale factor itself (1 + dS); a stated
 * LENGTHUNIT, ANGLEUNIT or SCALEUNIT is honoured. Throws for a method that is
 * not a Helmert.
 */
export function towgs84Of(root: WktNode): Towgs84 | undefined {
  const bound = find(root, "BOUNDCRS");
  const abridged =
    bound === undefined
      ? undefined
      : children(bound, "ABRIDGEDTRANSFORMATION")[0];
  if (abridged === undefined) {
    return undefined;
  }
  const method = children(abridged, "METHOD")[0];
  const methodName = text(method, 0) ?? "";
  const methodCode = method === undefined ? undefined : epsgId(method);
  const known =
    methodCode !== undefined &&
    [...POSITION_VECTOR, ...COORDINATE_FRAME].includes(methodCode);
  const byName = /position vector|coordinate frame|geocentric translation/i;
  if (!known && !byName.test(methodName)) {
    throw new Error(
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
      values.ds = scale !== undefined ? value * scale : value - 1;
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
  const conversion = find(crs, "CONVERSION");
  if (conversion === undefined) {
    return undefined;
  }
  let lon: number | undefined;
  let lat: number | undefined;
  for (const p of children(conversion, "PARAMETER")) {
    const name = (text(p, 0) ?? "").toLowerCase();
    const value = number(p, 1);
    if (
      name.startsWith("longitude of natural origin") ||
      name.startsWith("longitude of false origin")
    ) {
      lon = value;
    }
    if (
      name.startsWith("latitude of natural origin") ||
      name.startsWith("latitude of false origin")
    ) {
      lat = value;
    }
  }
  return lon === undefined || lat === undefined ? undefined : [lon, lat];
}
