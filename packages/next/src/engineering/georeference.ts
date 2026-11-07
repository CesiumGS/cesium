// A tileset's engineering frame and placement mode, declared in tileset.json
// (spec section 7.2; plan 4b task 11, call 12).
//
// The 3D Tiles 2.0 draft, as read on 2026-11-07 from CesiumGS/glTF, branch
// 3d-tiles-2.0, extensions/2.1/Vendor/ (linked from CesiumGS/3d-tiles,
// next/2.0/README.md). All four are glTF 2.1 extensions with status "Draft":
//
//   EXT_geospatial_crs       { format: string }  (required; "MUST be defined by
//                            additional extensions"), on the glTF root.
//   EXT_geospatial_crs_wkid  extends that object; format "wkid":
//                            { authority: string, wkid: integer }  (required),
//                            vcsWkid?: integer (the vertical CRS when wkid is
//                            horizontal), epoch?: string (a decimal year,
//                            "2019.81").
//   EXT_geospatial_crs_wkt2  extends that object; format "wkt2":
//                            { wkt2: string }  (required).
//   EXT_georeference         on a node: { longitude, latitude (degrees),
//                            height? (metres above the ellipsoid) }; the node
//                            is translated there and turned to the tangent
//                            plane (-x east, +y up, +z north), after its own
//                            transform. WGS 84 unless EXT_geospatial_crs says
//                            otherwise.
//
// That is the shape call 12 assumed: a companion object under the CRS
// object's own `extensions`, keyed by its extension name. Only `epoch`'s type
// differs from `CrsRef` (a string there, a number here); the reader takes the
// draft's string and converts it.
//
// Composed with what exists (read on 2026-11-07; ext-prior-art.md):
//
//   EXT_geospatial_crs_source  CesiumGS/glTF#131, an open Draft PR on the
//                            3d-tiles-2.0 branch (branch commit 370081df40,
//                            2026-09-01): document level, the *source*
//                            (design) CRS beside the geocentric root CRS, in
//                            EXT_geospatial_crs's shape: { format: string,
//                            extensions: { EXT_geospatial_crs_wkid |
//                            EXT_geospatial_crs_wkt2: ... } }. Its per-node
//                            transforms aren't read.
//   ESRI_crs                 Esri's released 3D Tiles 1.1 vendor extension
//                            (Esri/3D-tiles-layer, ESRI_CRS/
//                            Esri_crs_extension.md, spec commit 8e8b0f349c,
//                            2025-10-29): on the root tileset { wkid: number
//                            ("required"), vcsWkid?: number, wkt?: string
//                            (Esri WKT), wkt2?: string }; "The wkt or wkt2 and
//                            the definition of wkid and vcsWkid are mutually
//                            exclusive". So either wkid (and vcsWkid) or wkt2
//                            is read; Esri's WKT1 `wkt` isn't (a declared CRS
//                            is a code or WKT2). A wkid of 32767 or less is an
//                            EPSG code, a larger one an ESRI code (Esri's
//                            numbering), and the pair must be in one registry.
//                            Its per-tile transforms aren't read.
//   3DTILES_ellipsoid        3D Tiles 1.1, status Complete (CesiumGS/3d-tiles,
//                            extensions/3DTILES_ellipsoid): on the tileset
//                            { body: string (an IAU name such as "Earth" or
//                            "Moon", or "none"), radii: [x, y, z] (metres,
//                            absent for "none") }. The radii pick EARTH or
//                            MOON within 0.01 m per axis; anything else is
//                            refused, and so is a body that names the other.
//
// The source CRS comes from EXT_geospatial_crs_source, else ESRI_crs, else
// this declaration's own `crs`, which is now optional (the fallback). Every
// one present is read and screened (a WKT2 through wkt2Problem and the
// PARAMETERFILE check here, then PROJ's strict parser in
// georeferenceTileset), and they must agree: the same format, registry
// (case aside), codes and epoch, or the same WKT2 text, else a
// GeoreferenceError naming both paths. ESRI_crs has no epoch, so it agrees on
// codes alone, and our `crs`'s epoch, if any, is kept. The body comes from
// 3DTILES_ellipsoid, else `body`; both, disagreeing, are refused. The area of
// interest is `areaOfInterest` when given (an override), else derived from
// the root tile's bounding volume: a region's degrees, or a box's or
// sphere's 27 points (centre, faces, edges, corners) through the root
// transform onto the body, when they span less than 180 degrees of
// longitude; otherwise there is none, as before.
//
// What the draft lacks, and this design needs (spec section 7.2), is a
// vendor tileset-level extension, BENTLEY_engineering_frame, in
// tileset.json's `extensions` (its old name, EXT_engineering_frame, is read
// for now with a warning: Khronos keeps EXT_ for extensions several vendors
// implement):
//
//   "extensions": {
//     "BENTLEY_engineering_frame": {
//       "name": "Mainline",                           (optional)
//       "body": "EARTH",                              (optional; or "MOON")
//       "crs": {                                      (optional; EXT_geospatial_crs's shape)
//         "format": "wkid",
//         "extensions": {
//           "EXT_geospatial_crs_wkid": { "authority": "EPSG", "wkid": 6420, "vcsWkid": 6360 }
//         }
//       },
//       "site": { "origin": [E0, N0, U0], "rotation": 0.218, "scale": 1.0000375 },
//       "areaOfInterest": { "west": -122.5, "south": 37.5, "east": -121.5, "north": 38.2 },
//       "placement": { "mode": "rigid", "anchor": [e, n, u] }   (or { "mode": "reprojected" }),
//       "pipeline": "+proj=pipeline +step …",          (optional: the pinned operation)
//       "geoidFallback": "EGM96", "fallbackSigma": 0.5 (optional; not with pipeline)
//     },
//     "BENTLEY_alignments": {                         (optional, beside it)
//       "alignments": [                               (at most 64)
//         { "name": "Mainline", "start": [E, N], "startAzimuth": 1.745,
//           "startStation": 10000,
//           "horizontal": [                           (at most 4,096 each)
//             { "type": "LINE", "length": 1000 },
//             { "type": "CLOTHOID", "length": 500, "startRadius": null, "endRadius": 5000 },
//             { "type": "CIRCULARARC", "length": 800, "radius": 5000 }
//           ],
//           "vertical": { "startStation": 10000, "startElevation": 120,
//             "segments": [
//               { "type": "CONSTANTGRADIENT", "length": 1000, "gradient": 0.01 },
//               { "type": "PARABOLICARC", "length": 800, "startGradient": 0.01, "endGradient": -0.02 }
//             ] } }
//       ]
//     }
//   }
//
// The segment types are IFC 4.3's IfcAlignmentHorizontalSegmentTypeEnum and
// IfcAlignmentVerticalSegmentTypeEnum values; a radius is signed as IFC's
// (positive curves left, counter-clockwise), and null is a tangent end.
// `startAzimuth` is ours (radians clockwise from grid north; IFC's
// StartDirection is anticlockwise from the x-axis), as are the stations.
// The old in-frame `alignments` (AlignmentDefinition's shape, kinds "line",
// "arc", "spiral", "grade", "parabola") is read for now with a warning.
//
// A rigid tileset's root `transform` is the rigid placement's matrix (call
// 13); `checkRigidTransform` (georeferenceTileset.ts) holds the two together.
// The glTF-level EXT_geospatial_crs and EXT_georeference aren't read: they
// carry no placement mode. The reader is this one module so it can follow
// the drafts as they change. Unknown fields are ignored; a malformed one
// throws a GeoreferenceError naming its JSON path, and nothing is guessed.
//
// This module is the parser alone, and imports nothing with side effects:
// `Tileset3D.load` imports it on demand, only for a tileset.json that has the
// extension, and a module with side-effecting imports (scene/Body.ts) would
// be kept in every bundle that re-exports it. So the bodies are passed in
// (`parseGeoreference`), and `readGeoreference`, which passes EARTH and MOON,
// is in georeferenceTileset.ts with `georeferenceTileset` and
// `checkRigidTransform`, which need the engineering modules.
import type { Cartographic } from "../math/ellipsoid.ts";
import type { Body } from "../scene/Body.ts";
import type {
  AlignmentDefinition,
  HorizontalElement,
  ProfileSegment,
  VerticalProfile,
} from "./alignment.ts";
import type { AreaOfInterest, CrsRef } from "./crs.ts";
import type { GeoidModel, SiteTransform } from "./EngineeringFrame.ts";
import type { GridCatalog } from "./gridCatalog.ts";
import { formatPipeline, parsePipeline, pipelineGrids } from "./pipeline.ts";
import { wkt2Problem } from "./wkt2.ts";

/** The tileset-level extension (a vendor name, owner, 2026-11-07). */
export const ENGINEERING_FRAME_EXTENSION = "BENTLEY_engineering_frame";
/** Its old name, read for now with RENAMED_WARNING. */
export const OLD_ENGINEERING_FRAME_EXTENSION = "EXT_engineering_frame";
/** The tileset-level alignments, beside the frame (IFC 4.3's segment types). */
export const ALIGNMENTS_EXTENSION = "BENTLEY_alignments";
/** Esri's released 3D Tiles 1.1 CRS extension. */
export const ESRI_CRS_EXTENSION = "ESRI_crs";
/** The 3D Tiles 2.0 draft's source CRS (CesiumGS/glTF#131). */
export const CRS_SOURCE_EXTENSION = "EXT_geospatial_crs_source";
/** 3D Tiles 1.1's body and ellipsoid. */
export const ELLIPSOID_EXTENSION = "3DTILES_ellipsoid";
/** The warning a declaration under the old name loads with. */
export const RENAMED_WARNING =
  "EXT_engineering_frame is renamed BENTLEY_engineering_frame";

const WKID_EXTENSION = "EXT_geospatial_crs_wkid";
const WKT2_EXTENSION = "EXT_geospatial_crs_wkt2";
/** The longest WKT2 read, in characters. */
const MAX_WKT2 = 65_536;
const MAX_ALIGNMENTS = 64;
/** The most horizontal elements, or profile segments, read per alignment. */
const MAX_ELEMENTS = 4096;
/** The longest name read (frame, alignment), in characters. */
const MAX_NAME = 256;
/** A registry name, as PROJ's authorities are: "EPSG", "IAU_2015", "ESRI". */
const AUTHORITY = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
/** The longest declared pipeline read, in characters. */
const MAX_PIPELINE = 4_096;
/** The most steps a declared pipeline may have. */
const MAX_STEPS = 32;
/** A grid's file name as PROJ-data's catalog writes them: no path, no scheme. */
const PLAIN_FILE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
/** Parameters a declared pipeline may not use: `init` reads PROJ's init files. */
const REFUSED_KEYS = ["init"];
/**
 * The operations a declared (untrusted) pipeline may use: an allowlist of
 * PROJ's conversions between units, axes and Cartesian coordinates, Helmert
 * and grid shifts (their grids checked), and its common projections. Not
 * `tinshift`, `defmodel`, `ob_tran` or anything else.
 */
const DECLARED_OPERATIONS = new Set([
  "unitconvert",
  "axisswap",
  "cart",
  "helmert",
  "molodensky",
  "noop",
  "push",
  "pop",
  "vgridshift",
  "hgridshift",
  "xyzgridshift",
  "deformation",
  "longlat",
  "latlong",
  "lonlat",
  "latlon",
  "geocent",
  "lcc",
  "tmerc",
  "etmerc",
  "utm",
  "merc",
  "webmerc",
  "stere",
  "sterea",
  "ups",
  "omerc",
  "somerc",
  "aea",
  "aeqd",
  "eqc",
  "eqdc",
  "laea",
  "cass",
  "poly",
  "krovak",
  "mod_krovak",
  "nzmg",
  "cea",
  "ortho",
  "gnom",
  "mill",
  "sinu",
  "moll",
  "robin",
  "eck4",
  "tcea",
  "labrd",
  "bonne",
]);
/**
 * The parameters a declared pipeline may use: those operations' numeric
 * and named parameters, and the grid keys (held to the catalog). Not
 * `datum` (it names grids implicitly), `init`, `file` or `model`.
 */
const DECLARED_KEYS = new Set([
  "ellps",
  "a",
  "b",
  "rf",
  "f",
  "R",
  "es",
  "e",
  "lat_0",
  "lon_0",
  "lat_1",
  "lat_2",
  "lat_ts",
  "lonc",
  "alpha",
  "gamma",
  "k",
  "k_0",
  "x_0",
  "y_0",
  "h",
  "zone",
  "south",
  "units",
  "to_meter",
  "no_uoff",
  "no_rot",
  "no_defs",
  "approx",
  "over",
  "pm",
  "towgs84",
  "xy_in",
  "xy_out",
  "z_in",
  "z_out",
  "t_in",
  "t_out",
  "order",
  "x",
  "y",
  "z",
  "rx",
  "ry",
  "rz",
  "s",
  "dx",
  "dy",
  "dz",
  "drx",
  "dry",
  "drz",
  "ds",
  "t_epoch",
  "t_obs",
  "dt",
  "convention",
  "exact",
  "abridged",
  "v_1",
  "v_2",
  "v_3",
  "v_4",
  "grids",
  "nadgrids",
  "geoidgrids",
  "xy_grids",
  "z_grids",
  "multiplier",
  "grid_ref",
]);
/** Keys whose values are names, not numbers. */
const NAMED_KEYS = new Set([
  "ellps",
  "units",
  "xy_in",
  "xy_out",
  "z_in",
  "z_out",
  "t_in",
  "t_out",
  "convention",
  "grid_ref",
  "pm",
]);
const GRID_VALUED = new Set([
  "grids",
  "nadgrids",
  "geoidgrids",
  "xy_grids",
  "z_grids",
]);
/** Keys whose values are comma-separated numbers. */
const LIST_KEYS = new Set(["towgs84", "order"]);
/** Helmert rotations and their rates: arc-seconds (per year). */
const ANGLE_KEYS = new Set(["rx", "ry", "rz", "drx", "dry", "drz"]);
/** Helmert scale and its rate: parts per million (per year). */
const SCALE_KEYS = new Set(["s", "ds"]);
/** A decimal number, as PROJ's parameters write them. */
const DECIMAL = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/**
 * A declared parameter's value is what its key takes: a grid list naming a
 * grid in every item (no empty item, no bare "@"); a name; or finite
 * decimal numbers within sane bounds (rotations and scale within ±1e6
 * arc-seconds and ppm, everything else within ±1e9), a list only for
 * `towgs84` and `order`.
 */
function checkDeclaredValue(key: string, value: string, path: string): void {
  if (GRID_VALUED.has(key)) {
    for (const item of value.split(",")) {
      if ((item.startsWith("@") ? item.slice(1) : item) === "") {
        throw new GeoreferenceError(
          path,
          `+${key} lists an item that names no grid`,
        );
      }
    }
    return;
  }
  if (NAMED_KEYS.has(key)) {
    return;
  }
  const items = value.split(",");
  if (items.length > 1 && !LIST_KEYS.has(key)) {
    throw new GeoreferenceError(path, `+${key} takes one number, not a list`);
  }
  const bound = ANGLE_KEYS.has(key) || SCALE_KEYS.has(key) ? 1e6 : 1e9;
  for (const item of items) {
    const n = DECIMAL.test(item) ? Number(item) : Number.NaN;
    if (!(Number.isFinite(n) && Math.abs(n) <= bound)) {
      throw new GeoreferenceError(
        path,
        `+${key} needs a finite number within ±${bound.toExponential(0)}; got ${shown(item)}`,
      );
    }
  }
}

/** A path, a parent directory, a drive or a scheme, in any value. */
const PATH_LIKE = /[/\\:]|\.\./;
const GEOID_MODELS: readonly GeoidModel[] = ["EGM96", "EGM2008"];
/** A decimal year, as the draft writes `epoch`. */
const DECIMAL_YEAR = /^\d{1,4}(\.\d+)?$/;
/** The declaration's JSON path from the tileset's root. */
// A plain literal: a template at the top level would count as a side effect
// to the bundler, keeping this module in bundles that never parse a
// declaration.
export const GEOREFERENCE_PATH = "extensions.BENTLEY_engineering_frame";
const OLD_PATH = "extensions.EXT_engineering_frame";
const ALIGNMENTS_PATH = "extensions.BENTLEY_alignments";
const ESRI_PATH = "extensions.ESRI_crs";
const SOURCE_PATH = "extensions.EXT_geospatial_crs_source";
const ELLIPSOID_PATH = "extensions.3DTILES_ellipsoid";
/** Where a derived area of interest comes from. */
const VOLUME_PATH = "root.boundingVolume";
/** Metres: how near 3DTILES_ellipsoid's radii must be a body's, per axis. */
const RADII_TOLERANCE = 0.01;
/** The largest EPSG code (Esri's numbering: larger wkids are ESRI's). */
const LAST_EPSG = 32_767;

/** A tileset's placement as declared: the mode, and a rigid one's anchor. */
export type DeclaredPlacement =
  | {
      readonly mode: "rigid";
      /** Design coordinates of the point drawn exactly (`placeRigid`). */
      readonly anchor: readonly [number, number, number];
    }
  | { readonly mode: "reprojected" };

/** Where a declaration's parts were read from: JSON paths from the root. */
export interface GeoreferenceSources {
  /** The frame extension: GEOREFERENCE_PATH, or the old name's. */
  readonly declaration: string;
  /**
   * The CRS object read: extensions.EXT_geospatial_crs_source,
   * extensions.ESRI_crs, or the declaration's `crs`.
   */
  readonly crs: string;
  /** The WKT2 string's path, when the CRS is WKT2. */
  readonly wkt2?: string;
  /** extensions.3DTILES_ellipsoid or the declaration's `body`; none: EARTH. */
  readonly body?: string;
  /** The declaration's `areaOfInterest`, or root.boundingVolume (derived). */
  readonly areaOfInterest?: string;
  /** extensions.BENTLEY_alignments, or the declaration's old `alignments`. */
  readonly alignments?: string;
}

/** A `BENTLEY_engineering_frame` declaration, read by `readGeoreference`. */
export interface TilesetGeoreference {
  readonly name?: string;
  /** 3DTILES_ellipsoid's body, else `body`'s; EARTH when neither says. */
  readonly body: Body;
  /** EXT_geospatial_crs_source's, else ESRI_crs's, else `crs`'s. */
  readonly crs: CrsRef;
  readonly site?: SiteTransform;
  readonly alignments?: readonly AlignmentDefinition[];
  readonly areaOfInterest?: AreaOfInterest;
  readonly placement: DeclaredPlacement;
  /**
   * The pinned operation, as `formatPipeline` writes it; its grids are plain
   * file names (`checkDeclaredGrids` holds them to a catalog).
   */
  readonly pipeline?: string;
  /** The geoid model design heights fall back to (never with `pipeline`). */
  readonly geoidFallback?: GeoidModel;
  /** The fallback's stated accuracy, metres; only with `geoidFallback`. */
  readonly fallbackSigma?: number;
  readonly sources: GeoreferenceSources;
  /** What loads but is out of date: the old name, in-frame alignments. */
  readonly warnings: readonly string[];
}

/**
 * A declaration that is malformed, or disagrees with the tileset: `path` is
 * the JSON path of the field at fault (from the tileset's root, such as
 * "extensions.BENTLEY_engineering_frame.placement.anchor").
 */
export class GeoreferenceError extends Error {
  readonly path: string;
  constructor(path: string, problem: string) {
    super(`${ENGINEERING_FRAME_EXTENSION}: ${path}: ${problem}`);
    this.name = "GeoreferenceError";
    this.path = path;
  }
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** What was found, without echoing untrusted text at length. */
function shown(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.length > 32
      ? `a string of ${value.length} characters`
      : JSON.stringify(value);
  }
  if (value === null) {
    return "null";
  }
  return Array.isArray(value) ? "an array" : typeof value;
}

function object(value: unknown, path: string): Json {
  if (!isObject(value)) {
    throw new GeoreferenceError(
      path,
      `must be an object (got ${shown(value)})`,
    );
  }
  return value;
}

function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new GeoreferenceError(
      path,
      `must be a finite number (got ${shown(value)})`,
    );
  }
  return value;
}

function positive(value: unknown, path: string): number {
  const n = finite(value, path);
  if (n <= 0) {
    throw new GeoreferenceError(path, `must be positive (got ${n})`);
  }
  return n;
}

function code(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new GeoreferenceError(
      path,
      `must be a positive integer (got ${shown(value)})`,
    );
  }
  return value;
}

function name(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new GeoreferenceError(
      path,
      `must be a non-empty string (got ${shown(value)})`,
    );
  }
  if (value.length > MAX_NAME) {
    throw new GeoreferenceError(
      path,
      `is ${value.length} characters; at most ${MAX_NAME} are read`,
    );
  }
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new GeoreferenceError(path, `must be an array (got ${shown(value)})`);
  }
  return value;
}

function numbers(value: unknown, length: number, path: string): number[] {
  const items = array(value, path);
  if (items.length !== length) {
    throw new GeoreferenceError(
      path,
      `must hold ${length} numbers (got ${items.length})`,
    );
  }
  return items.map((x, i) => finite(x, `${path}[${i}]`));
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  what: string,
): T {
  if (
    typeof value !== "string" ||
    !(allowed as readonly string[]).includes(value)
  ) {
    throw new GeoreferenceError(
      path,
      `unknown ${what} ${shown(value)} (expected ${allowed
        .map((a) => `"${a}"`)
        .join(" or ")})`,
    );
  }
  return value as T;
}

/** WKT's quoted text: doubled quotes escape a quote. */
const WKT_TEXT = '"((?:[^"]|"")*)"';
/** `PARAMETERFILE[name, file …]`, with WKT's [ or ( brackets. */
const PARAMETER_FILE = new RegExp(
  `PARAMETERFILE\\s*[[(]\\s*${WKT_TEXT}\\s*,\\s*${WKT_TEXT}`,
  "gi",
);

/**
 * The files an untrusted WKT2 names, checked before PROJ parses it: every
 * `PARAMETERFILE`'s file must be a plain file name (a catalog key, held to
 * the catalog by `checkDeclaredGrids`), never a path or URL that PROJ's
 * file lookup would follow; one it can't read is refused, and so is any
 * `EXTENSION` (WKT1's way to hand PROJ a string or grids). Returns the names.
 */
function wkt2Files(wkt2: string, path: string): string[] {
  if (/\bEXTENSION\s*[[(]/i.test(wkt2)) {
    throw new GeoreferenceError(
      path,
      "holds an EXTENSION, which a declared WKT2 may not use",
    );
  }
  const keywords = wkt2.match(/\bPARAMETERFILE\b/gi)?.length ?? 0;
  const files = [...wkt2.matchAll(PARAMETER_FILE)].map((m) =>
    m[2]!.replaceAll('""', '"'),
  );
  if (files.length !== keywords) {
    throw new GeoreferenceError(
      path,
      "holds a PARAMETERFILE whose name and file aren't two quoted texts",
    );
  }
  for (const file of files) {
    if (!PLAIN_FILE.test(file)) {
      throw new GeoreferenceError(
        path,
        `holds a PARAMETERFILE naming ${shown(file)}, which isn't a plain file name (a grid of the catalog)`,
      );
    }
  }
  return files;
}

function readCrs(value: unknown, path: string): CrsRef {
  const crs = object(value, path);
  const format = oneOf(
    crs.format,
    ["wkid", "wkt2"],
    `${path}.format`,
    "format",
  );
  const extensions = object(crs.extensions, `${path}.extensions`);
  if (format === "wkid") {
    const at = `${path}.extensions.${WKID_EXTENSION}`;
    const wkid = object(extensions[WKID_EXTENSION], at);
    const authority = wkid.authority;
    if (typeof authority !== "string" || !AUTHORITY.test(authority)) {
      throw new GeoreferenceError(
        `${at}.authority`,
        `must be a registry name such as "EPSG" (got ${shown(authority)})`,
      );
    }
    const ref: {
      format: "wkid";
      authority: string;
      wkid: number;
      vcsWkid?: number;
      epoch?: number;
    } = { format, authority, wkid: code(wkid.wkid, `${at}.wkid`) };
    if (wkid.vcsWkid !== undefined) {
      ref.vcsWkid = code(wkid.vcsWkid, `${at}.vcsWkid`);
    }
    if (wkid.epoch !== undefined) {
      const epoch = wkid.epoch;
      // The draft writes a decimal-year string, as is read here.
      if (typeof epoch === "string" && DECIMAL_YEAR.test(epoch)) {
        ref.epoch = Number(epoch);
      } else {
        throw new GeoreferenceError(
          `${at}.epoch`,
          `must be a decimal year such as "2019.81" (got ${shown(epoch)})`,
        );
      }
    }
    return ref;
  }
  const at = `${path}.extensions.${WKT2_EXTENSION}`;
  const companion = object(extensions[WKT2_EXTENSION], at);
  return { format, wkt2: readWkt2(companion.wkt2, `${at}.wkt2`) };
}

/**
 * An untrusted WKT2 string, wherever it is declared: at most MAX_WKT2
 * characters, trimmed, WKT2 in form (`wkt2Problem`), and naming only plain
 * PARAMETERFILE names (`wkt2Files`). Returned trimmed.
 */
function readWkt2(raw: unknown, path: string): string {
  if (typeof raw !== "string") {
    throw new GeoreferenceError(
      path,
      `must be a non-empty string (got ${shown(raw)})`,
    );
  }
  if (raw.length > MAX_WKT2) {
    throw new GeoreferenceError(
      path,
      `is ${raw.length.toLocaleString("en-US")} characters; at most ${MAX_WKT2.toLocaleString("en-US")} are read`,
    );
  }
  // Stored trimmed (a BOM, whitespace and NBSP are ECMAScript white space),
  // so the string checked here is the string PROJ parses.
  const wkt2 = raw.trim();
  if (wkt2.length === 0) {
    throw new GeoreferenceError(
      path,
      `must be a non-empty string (got ${shown(raw)})`,
    );
  }
  // The draft's "MUST be a Well-Known Text (version 2) string": anything
  // else (a PROJ string, AUTH:CODE, PROJJSON) proj_create would also accept.
  // georeferenceTileset then parses it with PROJ's strict WKT parser
  // (strictWkt2).
  const problem = wkt2Problem(wkt2);
  if (problem !== undefined) {
    throw new GeoreferenceError(path, problem);
  }
  wkt2Files(wkt2, path);
  return wkt2;
}

/** A CRS as read, and where from. */
interface ReadCrs {
  readonly crs: CrsRef;
  readonly path: string;
  readonly wkt2Path?: string;
  /** ESRI_crs can't state an epoch. */
  readonly hasEpoch: boolean;
}

const wkt2PathOf = (path: string, crs: CrsRef) =>
  crs.format === "wkt2"
    ? `${path}.extensions.${WKT2_EXTENSION}.wkt2`
    : undefined;

/** A CRS in EXT_geospatial_crs's shape (#131's, and our `crs`). */
function readCrsAt(value: unknown, path: string): ReadCrs {
  const crs = readCrs(value, path);
  const wkt2Path = wkt2PathOf(path, crs);
  return {
    crs,
    path,
    ...(wkt2Path !== undefined && { wkt2Path }),
    hasEpoch: true,
  };
}

/**
 * ESRI_crs's root object: `wkid` (and `vcsWkid`), or `wkt2`, never both (the
 * extension makes them mutually exclusive). Esri's WKT1 `wkt` isn't read. A
 * wkid up to 32767 is EPSG's, a larger one ESRI's, and a vcsWkid must be in
 * the same registry (a CrsRef names one).
 */
function readEsriCrs(value: unknown, path: string): ReadCrs {
  const esri = object(value, path);
  const codes = esri.wkid !== undefined || esri.vcsWkid !== undefined;
  if (esri.wkt2 !== undefined || esri.wkt !== undefined) {
    if (codes) {
      throw new GeoreferenceError(
        path,
        `has wkid or vcsWkid and ${esri.wkt2 !== undefined ? "wkt2" : "wkt"}, which ${ESRI_CRS_EXTENSION} makes mutually exclusive`,
      );
    }
    if (esri.wkt2 === undefined) {
      throw new GeoreferenceError(
        `${path}.wkt`,
        "is Esri WKT (WKT1), which isn't read: a declared CRS is a wkid or WKT2",
      );
    }
    const wkt2Path = `${path}.wkt2`;
    return {
      crs: { format: "wkt2", wkt2: readWkt2(esri.wkt2, wkt2Path) },
      path,
      wkt2Path,
      hasEpoch: false,
    };
  }
  const wkid = code(esri.wkid, `${path}.wkid`);
  const authority = wkid <= LAST_EPSG ? "EPSG" : "ESRI";
  const crs: {
    format: "wkid";
    authority: string;
    wkid: number;
    vcsWkid?: number;
  } = { format: "wkid", authority, wkid };
  if (esri.vcsWkid !== undefined) {
    const vcsWkid = code(esri.vcsWkid, `${path}.vcsWkid`);
    if ((vcsWkid <= LAST_EPSG ? "EPSG" : "ESRI") !== authority) {
      throw new GeoreferenceError(
        `${path}.vcsWkid`,
        `is ${vcsWkid <= LAST_EPSG ? "an EPSG" : "an ESRI"} code while wkid ${wkid} is ${authority === "EPSG" ? "an EPSG" : "an ESRI"} code; a pair from two registries isn't read`,
      );
    }
    crs.vcsWkid = vcsWkid;
  }
  return { crs, path, hasEpoch: false };
}

/** A CRS for a message, without echoing untrusted text. */
function shownCrsRef(crs: CrsRef): string {
  if (crs.format === "wkt2") {
    return `a WKT2 of ${crs.wkt2.length} characters`;
  }
  const codes = `${crs.authority}:${crs.wkid}${crs.vcsWkid === undefined ? "" : `+${crs.vcsWkid}`}`;
  return crs.epoch === undefined ? codes : `${codes} at epoch ${crs.epoch}`;
}

/**
 * Whether two declared CRSs are the same: the same registry (case aside),
 * codes and, when both can state one, epoch; or the same WKT2 text. A code
 * and a WKT2 never agree (telling would take PROJ).
 */
function sameCrs(a: ReadCrs, b: ReadCrs): boolean {
  const x = a.crs;
  const y = b.crs;
  if (x.format === "wkt2" || y.format === "wkt2") {
    return x.format === "wkt2" && y.format === "wkt2" && x.wkt2 === y.wkt2;
  }
  return (
    x.authority.toUpperCase() === y.authority.toUpperCase() &&
    x.wkid === y.wkid &&
    x.vcsWkid === y.vcsWkid &&
    (!a.hasEpoch || !b.hasEpoch || x.epoch === y.epoch)
  );
}

/**
 * The source CRS: EXT_geospatial_crs_source's, else ESRI_crs's, else the
 * declaration's `crs`. Every one present is read (and so screened), and
 * each must agree with the one used, else a GeoreferenceError naming both
 * paths. When ESRI_crs is used, our `crs`'s epoch (it has none) is kept.
 */
function readSourceCrs(
  extensions: Json,
  declaration: Json,
  root: string,
): ReadCrs {
  const found: ReadCrs[] = [];
  if (extensions[CRS_SOURCE_EXTENSION] !== undefined) {
    found.push(readCrsAt(extensions[CRS_SOURCE_EXTENSION], SOURCE_PATH));
  }
  if (extensions[ESRI_CRS_EXTENSION] !== undefined) {
    found.push(readEsriCrs(extensions[ESRI_CRS_EXTENSION], ESRI_PATH));
  }
  if (declaration.crs !== undefined) {
    found.push(readCrsAt(declaration.crs, `${root}.crs`));
  }
  const used = found[0];
  if (used === undefined) {
    throw new GeoreferenceError(
      `${root}.crs`,
      `is required when the tileset has neither ${CRS_SOURCE_EXTENSION} nor ${ESRI_CRS_EXTENSION}`,
    );
  }
  for (const other of found.slice(1)) {
    if (!sameCrs(used, other)) {
      throw new GeoreferenceError(
        other.path,
        `disagrees with ${used.path}: ${shownCrsRef(other.crs)} against ${shownCrsRef(used.crs)}; declare one CRS`,
      );
    }
  }
  const epoch = found.find(
    (f) => f.hasEpoch && f.crs.format === "wkid" && f.crs.epoch !== undefined,
  );
  if (
    !used.hasEpoch &&
    used.crs.format === "wkid" &&
    epoch?.crs.format === "wkid"
  ) {
    return { ...used, crs: { ...used.crs, epoch: epoch.crs.epoch! } };
  }
  return used;
}

function readSite(value: unknown, path: string): SiteTransform {
  const site = object(value, path);
  const [e, n, u] = numbers(site.origin, 3, `${path}.origin`);
  return {
    origin: [e!, n!, u!],
    rotation: finite(site.rotation, `${path}.rotation`),
    scale: positive(site.scale, `${path}.scale`),
  };
}

function readArea(value: unknown, path: string): AreaOfInterest {
  const area = object(value, path);
  const degrees = (key: string, limit: number) => {
    const x = finite(area[key], `${path}.${key}`);
    if (Math.abs(x) > limit) {
      throw new GeoreferenceError(
        `${path}.${key}`,
        `must be within ±${limit}° (got ${x})`,
      );
    }
    return x;
  };
  return {
    west: degrees("west", 180),
    south: degrees("south", 90),
    east: degrees("east", 180),
    north: degrees("north", 90),
  };
}

/**
 * 3DTILES_ellipsoid's body: its radii (metres) within RADII_TOLERANCE per
 * axis of EARTH's or MOON's ellipsoid, and its `body`, if given, naming
 * that body (case aside). "none", other radii, or a body naming another is
 * refused, naming the field.
 */
function readEllipsoid(
  value: unknown,
  path: string,
  bodies: GeoreferenceBodies,
): Body {
  const ellipsoid = object(value, path);
  const named =
    ellipsoid.body === undefined
      ? undefined
      : name(ellipsoid.body, `${path}.body`);
  if (named?.toLowerCase() === "none") {
    throw new GeoreferenceError(
      `${path}.body`,
      'is "none": the tileset says it isn\'t referenced to a body, so it has no engineering frame to place',
    );
  }
  const radii = numbers(ellipsoid.radii, 3, `${path}.radii`);
  const body = [bodies.EARTH, bodies.MOON].find((b) =>
    radii.every(
      (r, i) => Math.abs(r - b.ellipsoid.radii[i]!) <= RADII_TOLERANCE,
    ),
  );
  if (body === undefined) {
    throw new GeoreferenceError(
      `${path}.radii`,
      `[${radii.join(", ")}] m are neither the Earth's (WGS 84) nor the Moon's radii within ${RADII_TOLERANCE} m; only those bodies are placed`,
    );
  }
  if (named !== undefined && named.toLowerCase() !== body.name.toLowerCase()) {
    throw new GeoreferenceError(
      `${path}.body`,
      `names ${shown(named)}, but its radii are the ${body.name}'s`,
    );
  }
  return body;
}

const isNumbers = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((x) => typeof x === "number" && Number.isFinite(x));

const DEGREES = 180 / Math.PI;
/** Degrees wrapped into [-180, 180]. */
const wrapped = (degrees: number) =>
  degrees > 180 ? degrees - 360 : degrees < -180 ? degrees + 360 : degrees;

/**
 * The area of interest the root tile's bounding volume covers on `body`, or
 * undefined when it can't be told (no or a malformed volume or transform, a
 * point at the body's centre, or 180 degrees or more of longitude): a
 * region's own degrees; a box's or sphere's 27 points (centre, face and
 * edge middles, corners) through the root's transform. It only scopes
 * PROJ's choice of operation, as `areaOfInterest` does.
 */
function derivedArea(
  tilesetJson: Json,
  body: Body,
): AreaOfInterest | undefined {
  const tile = tilesetJson.root;
  if (!isObject(tile) || !isObject(tile.boundingVolume)) {
    return undefined;
  }
  const volume = tile.boundingVolume;
  if (volume.region !== undefined) {
    if (!isNumbers(volume.region, 6)) {
      return undefined;
    }
    const [west, south, east, north] = volume.region.map((x) => x * DEGREES);
    const ok =
      Math.abs(west!) <= 180 &&
      Math.abs(east!) <= 180 &&
      -90 <= south! &&
      south! <= north! &&
      north! <= 90;
    return ok
      ? { west: west!, south: south!, east: east!, north: north! }
      : undefined;
  }
  let centre: number[];
  let axes: number[][];
  if (isNumbers(volume.box, 12)) {
    const b = volume.box;
    centre = b.slice(0, 3);
    axes = [b.slice(3, 6), b.slice(6, 9), b.slice(9, 12)];
  } else if (isNumbers(volume.sphere, 4) && volume.sphere[3]! >= 0) {
    const r = volume.sphere[3]!;
    centre = volume.sphere.slice(0, 3);
    axes = [
      [r, 0, 0],
      [0, r, 0],
      [0, 0, r],
    ];
  } else {
    return undefined;
  }
  const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  let m = IDENTITY;
  if (tile.transform !== undefined) {
    if (!isNumbers(tile.transform, 16)) {
      return undefined;
    }
    m = tile.transform;
  }
  const lons: number[] = [];
  const lats: number[] = [];
  const at: Cartographic = { longitude: 0, latitude: 0, height: 0 };
  const point = new Float64Array(3);
  for (const i of [0, -1, 1]) {
    for (const j of [0, -1, 1]) {
      for (const k of [0, -1, 1]) {
        const p = [0, 1, 2].map(
          (c) =>
            centre[c]! + i * axes[0]![c]! + j * axes[1]![c]! + k * axes[2]![c]!,
        );
        for (let r = 0; r < 3; r++) {
          point[r] =
            m[r]! * p[0]! + m[4 + r]! * p[1]! + m[8 + r]! * p[2]! + m[12 + r]!;
        }
        const c = body.ellipsoid.cartesianToCartographic(point, at);
        if (
          c === undefined ||
          !Number.isFinite(c.longitude) ||
          !Number.isFinite(c.latitude)
        ) {
          return undefined;
        }
        lons.push(c.longitude * DEGREES);
        lats.push(c.latitude * DEGREES);
      }
    }
  }
  // Longitudes about the centre's (the first point), so an area across the
  // antimeridian stays one span (and west > east says so).
  const middle = lons[0]!;
  const offsets = lons.map((lon) => wrapped(lon - middle));
  const low = Math.min(...offsets);
  const high = Math.max(...offsets);
  if (!(high - low < 180)) {
    return undefined;
  }
  return {
    west: wrapped(middle + low),
    south: Math.max(-90, Math.min(...lats)),
    east: wrapped(middle + high),
    north: Math.min(90, Math.max(...lats)),
  };
}

/** A spiral's radius: JSON has no Infinity, so null is a tangent end. */
function radius(value: unknown, path: string): number {
  return value === null ? Infinity : nonZero(value, path);
}

function nonZero(value: unknown, path: string): number {
  const n = finite(value, path);
  if (n === 0) {
    throw new GeoreferenceError(path, "must not be 0");
  }
  return n;
}

/** At most MAX_ELEMENTS items. */
function elements(value: unknown, path: string): unknown[] {
  const items = array(value, path);
  if (items.length > MAX_ELEMENTS) {
    throw new GeoreferenceError(
      path,
      `holds ${items.length} items; at most ${MAX_ELEMENTS} are read`,
    );
  }
  return items;
}

function readElement(value: unknown, path: string): HorizontalElement {
  const element = object(value, path);
  const kind = oneOf(
    element.kind,
    ["line", "arc", "spiral"],
    `${path}.kind`,
    "kind",
  );
  const length = positive(element.length, `${path}.length`);
  if (kind === "line") {
    return { kind, length };
  }
  if (kind === "arc") {
    return { kind, length, radius: nonZero(element.radius, `${path}.radius`) };
  }
  return {
    kind,
    length,
    startRadius: radius(element.startRadius, `${path}.startRadius`),
    endRadius: radius(element.endRadius, `${path}.endRadius`),
  };
}

function readSegment(value: unknown, path: string): ProfileSegment {
  const segment = object(value, path);
  const kind = oneOf(
    segment.kind,
    ["grade", "parabola"],
    `${path}.kind`,
    "kind",
  );
  const length = positive(segment.length, `${path}.length`);
  return kind === "grade"
    ? { kind, length, grade: finite(segment.grade, `${path}.grade`) }
    : {
        kind,
        length,
        startGrade: finite(segment.startGrade, `${path}.startGrade`),
        endGrade: finite(segment.endGrade, `${path}.endGrade`),
      };
}

function readProfile(value: unknown, path: string): VerticalProfile {
  const profile = object(value, path);
  return {
    startStation: finite(profile.startStation, `${path}.startStation`),
    startElevation: finite(profile.startElevation, `${path}.startElevation`),
    segments: elements(profile.segments, `${path}.segments`).map((s, i) =>
      readSegment(s, `${path}.segments[${i}]`),
    ),
  };
}

function readAlignment(value: unknown, path: string): AlignmentDefinition {
  const alignment = object(value, path);
  const [e, n] = numbers(alignment.start, 2, `${path}.start`);
  const definition: {
    -readonly [K in keyof AlignmentDefinition]: AlignmentDefinition[K];
  } = {
    name: name(alignment.name, `${path}.name`),
    start: [e!, n!],
    startAzimuth: finite(alignment.startAzimuth, `${path}.startAzimuth`),
    startStation: finite(alignment.startStation, `${path}.startStation`),
    horizontal: elements(alignment.horizontal, `${path}.horizontal`).map(
      (h, i) => readElement(h, `${path}.horizontal[${i}]`),
    ),
  };
  if (alignment.vertical !== undefined) {
    definition.vertical = readProfile(alignment.vertical, `${path}.vertical`);
  }
  return definition;
}

/** Our kinds as IFC 4.3's segment types, and back. */
const HORIZONTAL_TYPES = {
  line: "LINE",
  arc: "CIRCULARARC",
  spiral: "CLOTHOID",
} as const;
const VERTICAL_TYPES = {
  grade: "CONSTANTGRADIENT",
  parabola: "PARABOLICARC",
} as const;

/** A BENTLEY_alignments horizontal segment. */
function readHorizontalSegment(
  value: unknown,
  path: string,
): HorizontalElement {
  const segment = object(value, path);
  const type = oneOf(
    segment.type,
    ["LINE", "CIRCULARARC", "CLOTHOID"],
    `${path}.type`,
    "IfcAlignmentHorizontalSegment type",
  );
  const length = positive(segment.length, `${path}.length`);
  if (type === "LINE") {
    return { kind: "line", length };
  }
  if (type === "CIRCULARARC") {
    return {
      kind: "arc",
      length,
      radius: nonZero(segment.radius, `${path}.radius`),
    };
  }
  return {
    kind: "spiral",
    length,
    startRadius: radius(segment.startRadius, `${path}.startRadius`),
    endRadius: radius(segment.endRadius, `${path}.endRadius`),
  };
}

/** A BENTLEY_alignments vertical segment. */
function readVerticalSegment(value: unknown, path: string): ProfileSegment {
  const segment = object(value, path);
  const type = oneOf(
    segment.type,
    ["CONSTANTGRADIENT", "PARABOLICARC"],
    `${path}.type`,
    "IfcAlignmentVerticalSegment type",
  );
  const length = positive(segment.length, `${path}.length`);
  return type === "CONSTANTGRADIENT"
    ? {
        kind: "grade",
        length,
        grade: finite(segment.gradient, `${path}.gradient`),
      }
    : {
        kind: "parabola",
        length,
        startGrade: finite(segment.startGradient, `${path}.startGradient`),
        endGrade: finite(segment.endGradient, `${path}.endGradient`),
      };
}

/** One BENTLEY_alignments alignment, as an `AlignmentDefinition`. */
function readIfcAlignment(value: unknown, path: string): AlignmentDefinition {
  const alignment = object(value, path);
  const [e, n] = numbers(alignment.start, 2, `${path}.start`);
  const definition: {
    -readonly [K in keyof AlignmentDefinition]: AlignmentDefinition[K];
  } = {
    name: name(alignment.name, `${path}.name`),
    start: [e!, n!],
    startAzimuth: finite(alignment.startAzimuth, `${path}.startAzimuth`),
    startStation: finite(alignment.startStation, `${path}.startStation`),
    horizontal: elements(alignment.horizontal, `${path}.horizontal`).map(
      (h, i) => readHorizontalSegment(h, `${path}.horizontal[${i}]`),
    ),
  };
  if (alignment.vertical !== undefined) {
    const at = `${path}.vertical`;
    const profile = object(alignment.vertical, at);
    definition.vertical = {
      startStation: finite(profile.startStation, `${at}.startStation`),
      startElevation: finite(profile.startElevation, `${at}.startElevation`),
      segments: elements(profile.segments, `${at}.segments`).map((s, i) =>
        readVerticalSegment(s, `${at}.segments[${i}]`),
      ),
    };
  }
  return definition;
}

/** At most MAX_ALIGNMENTS alignments, each read by `read`. */
function readAlignmentList(
  value: unknown,
  path: string,
  read: (value: unknown, path: string) => AlignmentDefinition,
): AlignmentDefinition[] {
  const items = array(value, path);
  if (items.length > MAX_ALIGNMENTS) {
    throw new GeoreferenceError(
      path,
      `holds ${items.length} alignments; at most ${MAX_ALIGNMENTS} are read`,
    );
  }
  return items.map((a, i) => read(a, `${path}[${i}]`));
}

/**
 * The `BENTLEY_alignments` extension object for `alignments`: IFC 4.3's
 * segment types, a spiral's infinite radius as null (JSON has no Infinity).
 * `parseGeoreference` reads it back to equal definitions.
 */
export function alignmentsExtension(
  alignments: readonly AlignmentDefinition[],
): { alignments: Record<string, unknown>[] } {
  const r = (x: number) => (Number.isFinite(x) ? x : null);
  return {
    alignments: alignments.map((a) => ({
      name: a.name,
      start: [a.start[0], a.start[1]],
      startAzimuth: a.startAzimuth,
      startStation: a.startStation,
      horizontal: a.horizontal.map((h) =>
        h.kind === "line"
          ? { type: HORIZONTAL_TYPES.line, length: h.length }
          : h.kind === "arc"
            ? { type: HORIZONTAL_TYPES.arc, length: h.length, radius: h.radius }
            : {
                type: HORIZONTAL_TYPES.spiral,
                length: h.length,
                startRadius: r(h.startRadius),
                endRadius: r(h.endRadius),
              },
      ),
      ...(a.vertical && {
        vertical: {
          startStation: a.vertical.startStation,
          startElevation: a.vertical.startElevation,
          segments: a.vertical.segments.map((v) =>
            v.kind === "grade"
              ? {
                  type: VERTICAL_TYPES.grade,
                  length: v.length,
                  gradient: v.grade,
                }
              : {
                  type: VERTICAL_TYPES.parabola,
                  length: v.length,
                  startGradient: v.startGrade,
                  endGradient: v.endGrade,
                },
          ),
        },
      }),
    })),
  };
}

/**
 * A declared pipeline, checked before PROJ sees it: a string of at most
 * MAX_PIPELINE characters and MAX_STEPS steps that `parsePipeline` reads and
 * `formatPipeline` writes back (its keys and values in their allowlists),
 * whose operations and parameters are in DECLARED_OPERATIONS and
 * DECLARED_KEYS (no `init`, `datum`, `file` or `model`), with no "/", "\",
 * ".." or ":" in any value, and whose grids are plain file names: no path
 * or URL ever reaches PROJ's file lookup. Returned as `formatPipeline`
 * writes it.
 */
function readPipeline(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new GeoreferenceError(
      path,
      `must be a non-empty string (got ${shown(value)})`,
    );
  }
  if (value.length > MAX_PIPELINE) {
    throw new GeoreferenceError(
      path,
      `is ${value.length} characters; at most ${MAX_PIPELINE} are read`,
    );
  }
  let text: string;
  let grids: readonly { name: string }[];
  try {
    const pipeline = parsePipeline(value);
    if (pipeline.steps.length > MAX_STEPS) {
      throw new GeoreferenceError(
        path,
        `has ${pipeline.steps.length} steps; at most ${MAX_STEPS} are read`,
      );
    }
    for (const step of pipeline.steps) {
      if (!DECLARED_OPERATIONS.has(step.operation)) {
        throw new GeoreferenceError(
          path,
          `may not use +proj=${step.operation} (a declaration may use only ${DECLARED_OPERATIONS.size} common operations)`,
        );
      }
    }
    for (const params of [
      pipeline.globals,
      ...pipeline.steps.map((step) => step.params),
    ]) {
      for (const [key, value] of Object.entries(params ?? {})) {
        if (REFUSED_KEYS.includes(key) || !DECLARED_KEYS.has(key)) {
          throw new GeoreferenceError(path, `may not use +${key}`);
        }
        if (typeof value === "string" && PATH_LIKE.test(value)) {
          throw new GeoreferenceError(
            path,
            `+${key} has a value with a path, a parent directory or a scheme ("/", "\\", ".." or ":")`,
          );
        }
        if (typeof value === "string") {
          checkDeclaredValue(key, value, path);
        }
      }
    }
    text = formatPipeline(pipeline);
    grids = pipelineGrids(pipeline);
  } catch (error) {
    if (error instanceof GeoreferenceError) {
      throw error;
    }
    throw new GeoreferenceError(
      path,
      `isn't a PROJ pipeline this reader accepts (${(error as Error).message.slice(0, 120)})`,
    );
  }
  for (const grid of grids) {
    if (!PLAIN_FILE.test(grid.name)) {
      throw new GeoreferenceError(
        path,
        `names a grid ${shown(grid.name)} that isn't a plain file name`,
      );
    }
  }
  return text;
}

/**
 * Throws a `GeoreferenceError` naming the field unless every grid a
 * declared pipeline names, and every file a declared WKT2's PARAMETERFILEs
 * name, is a current entry of `catalog` (not removed). Without a catalog,
 * such names can't be checked, so they are refused. A declaration that
 * names no grid passes.
 */
export function checkDeclaredGrids(
  georeference: TilesetGeoreference,
  catalog: GridCatalog | undefined,
): void {
  const root = georeference.sources.declaration;
  if (georeference.crs.format === "wkt2") {
    const path =
      georeference.sources.wkt2 ??
      `${root}.crs.extensions.${WKT2_EXTENSION}.wkt2`;
    const files = wkt2Files(georeference.crs.wkt2, path);
    if (files.length > 0 && catalog === undefined) {
      throw new GeoreferenceError(
        path,
        "names grid files that can't be checked without a grid catalog (place it with a GridSource)",
      );
    }
    for (const file of files) {
      const entry = catalog!.get(file);
      if (entry === undefined || entry.removed) {
        throw new GeoreferenceError(
          path,
          `holds a PARAMETERFILE naming ${shown(file)}, which isn't a current entry of the grid catalog`,
        );
      }
    }
  }
  if (georeference.pipeline === undefined) {
    return;
  }
  const path = `${root}.pipeline`;
  if (catalog === undefined) {
    throw new GeoreferenceError(
      path,
      "names grids that can't be checked without a grid catalog (place it with a GridSource)",
    );
  }
  for (const { name: grid } of pipelineGrids(
    parsePipeline(georeference.pipeline),
  )) {
    const entry = catalog.get(grid);
    if (entry === undefined || entry.removed) {
      throw new GeoreferenceError(
        path,
        `names the grid ${shown(grid)}, which isn't a current entry of the grid catalog`,
      );
    }
  }
}

function readPlacement(value: unknown, path: string): DeclaredPlacement {
  const placement = object(value, path);
  const mode = oneOf(
    placement.mode,
    ["rigid", "reprojected"],
    `${path}.mode`,
    "mode",
  );
  if (mode === "reprojected") {
    return { mode };
  }
  const [e, n, u] = numbers(placement.anchor, 3, `${path}.anchor`);
  return { mode, anchor: [e!, n!, u!] };
}

/** The bodies a declaration may name, as `parseGeoreference` maps them. */
export interface GeoreferenceBodies {
  readonly EARTH: Body;
  readonly MOON: Body;
}

/**
 * `readGeoreference` (georeferenceTileset.ts), with the bodies passed in:
 * the `BENTLEY_engineering_frame` declaration of a parsed tileset.json (or
 * the old `EXT_engineering_frame`, with RENAMED_WARNING), composed with the
 * tileset's EXT_geospatial_crs_source, ESRI_crs, 3DTILES_ellipsoid,
 * BENTLEY_alignments and root bounding volume; undefined when it has none.
 * Throws a `GeoreferenceError` naming the JSON path for an unknown mode or
 * format, no CRS anywhere, two CRSs or bodies that disagree, an ellipsoid
 * that is neither EARTH's nor MOON's, a missing `placement`, a non-finite
 * number, a `wkt2` (wherever declared) that isn't WKT2 in form
 * (`wkt2Problem`: a PROJ string, AUTH:CODE or PROJJSON) or is over 65,536
 * characters, or more than 64 alignments (or 4,096 elements in one), and
 * for both names, or both places for alignments, at once. Fields it doesn't
 * know are ignored.
 */
export function parseGeoreference(
  tilesetJson: unknown,
  bodies: GeoreferenceBodies,
): TilesetGeoreference | undefined {
  const { EARTH, MOON } = bodies;
  if (!isObject(tilesetJson) || !isObject(tilesetJson.extensions)) {
    return undefined;
  }
  const extensions = tilesetJson.extensions;
  const current = ENGINEERING_FRAME_EXTENSION in extensions;
  const old = OLD_ENGINEERING_FRAME_EXTENSION in extensions;
  if (!current && !old) {
    return undefined;
  }
  if (current && old) {
    throw new GeoreferenceError(
      OLD_PATH,
      `is ${GEOREFERENCE_PATH}'s old name, and both are present; keep only ${ENGINEERING_FRAME_EXTENSION}`,
    );
  }
  const root = current ? GEOREFERENCE_PATH : OLD_PATH;
  const warnings: string[] = old ? [RENAMED_WARNING] : [];
  const declaration = object(
    extensions[
      current ? ENGINEERING_FRAME_EXTENSION : OLD_ENGINEERING_FRAME_EXTENSION
    ],
    root,
  );
  const ours =
    declaration.body === undefined
      ? undefined
      : oneOf(declaration.body, ["EARTH", "MOON"], `${root}.body`, "body") ===
          "MOON"
        ? MOON
        : EARTH;
  let body = ours ?? EARTH;
  let bodyPath = ours === undefined ? undefined : `${root}.body`;
  if (extensions[ELLIPSOID_EXTENSION] !== undefined) {
    const theirs = readEllipsoid(
      extensions[ELLIPSOID_EXTENSION],
      ELLIPSOID_PATH,
      bodies,
    );
    if (ours !== undefined && ours !== theirs) {
      throw new GeoreferenceError(
        `${root}.body`,
        `says the ${ours.name}, but ${ELLIPSOID_PATH} has the ${theirs.name}'s radii; declare one body`,
      );
    }
    body = theirs;
    bodyPath = ELLIPSOID_PATH;
  }
  const crs = readSourceCrs(extensions, declaration, root);
  if (declaration.placement === undefined) {
    throw new GeoreferenceError(`${root}.placement`, "is required");
  }
  const sources: {
    -readonly [K in keyof GeoreferenceSources]: GeoreferenceSources[K];
  } = {
    declaration: root,
    crs: crs.path,
    ...(crs.wkt2Path !== undefined && { wkt2: crs.wkt2Path }),
    ...(bodyPath !== undefined && { body: bodyPath }),
  };
  const result: {
    -readonly [K in keyof TilesetGeoreference]: TilesetGeoreference[K];
  } = {
    body,
    crs: crs.crs,
    placement: readPlacement(declaration.placement, `${root}.placement`),
    sources,
    warnings,
  };
  if (declaration.pipeline !== undefined) {
    result.pipeline = readPipeline(declaration.pipeline, `${root}.pipeline`);
  }
  if (declaration.geoidFallback !== undefined) {
    const path = `${root}.geoidFallback`;
    result.geoidFallback = oneOf(
      declaration.geoidFallback,
      GEOID_MODELS,
      path,
      "geoid model",
    );
    if (result.pipeline !== undefined) {
      throw new GeoreferenceError(
        path,
        "doesn't apply with a pinned pipeline (declare the fallback CRS's pipeline instead)",
      );
    }
  }
  if (declaration.fallbackSigma !== undefined) {
    const path = `${root}.fallbackSigma`;
    const sigma = finite(declaration.fallbackSigma, path);
    if (!(sigma > 0)) {
      throw new GeoreferenceError(path, `must be positive (got ${sigma})`);
    }
    if (result.geoidFallback === undefined) {
      throw new GeoreferenceError(path, "applies only with geoidFallback");
    }
    result.fallbackSigma = sigma;
  }
  if (declaration.name !== undefined) {
    result.name = name(declaration.name, `${root}.name`);
  }
  if (declaration.site !== undefined) {
    result.site = readSite(declaration.site, `${root}.site`);
  }
  const inFrame = `${root}.alignments`;
  if (extensions[ALIGNMENTS_EXTENSION] !== undefined) {
    if (declaration.alignments !== undefined) {
      throw new GeoreferenceError(
        inFrame,
        `and ${ALIGNMENTS_PATH} are both present; keep only ${ALIGNMENTS_EXTENSION}`,
      );
    }
    const extension = object(extensions[ALIGNMENTS_EXTENSION], ALIGNMENTS_PATH);
    result.alignments = readAlignmentList(
      extension.alignments,
      `${ALIGNMENTS_PATH}.alignments`,
      readIfcAlignment,
    );
    sources.alignments = ALIGNMENTS_PATH;
  } else if (declaration.alignments !== undefined) {
    result.alignments = readAlignmentList(
      declaration.alignments,
      inFrame,
      readAlignment,
    );
    sources.alignments = inFrame;
    warnings.push(
      `${inFrame} is moved to ${ALIGNMENTS_PATH} (IFC 4.3 segment types); read from the old place for now`,
    );
  }
  if (declaration.areaOfInterest !== undefined) {
    result.areaOfInterest = readArea(
      declaration.areaOfInterest,
      `${root}.areaOfInterest`,
    );
    sources.areaOfInterest = `${root}.areaOfInterest`;
  } else {
    const area = derivedArea(tilesetJson, body);
    if (area !== undefined) {
      result.areaOfInterest = area;
      sources.areaOfInterest = VOLUME_PATH;
    }
  }
  return result;
}
