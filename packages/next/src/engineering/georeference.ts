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
// What the draft lacks, and this design needs (spec section 7.2), is added
// on top as a proposed tileset-level extension, EXT_engineering_frame, in
// tileset.json's `extensions`:
//
//   "extensions": {
//     "EXT_engineering_frame": {
//       "name": "Mainline",                           (optional)
//       "body": "EARTH",                              (optional; or "MOON")
//       "crs": {                                      (EXT_geospatial_crs's shape)
//         "format": "wkid",
//         "extensions": {
//           "EXT_geospatial_crs_wkid": { "authority": "EPSG", "wkid": 6420, "vcsWkid": 6360 }
//         }
//       },
//       "site": { "origin": [E0, N0, U0], "rotation": 0.218, "scale": 1.0000375 },
//       "alignments": [ AlignmentDefinition, ... ],   (at most 64; a spiral's
//                                                     null radius is a tangent end)
//       "areaOfInterest": { "west": -122.5, "south": 37.5, "east": -121.5, "north": 38.2 },
//       "placement": { "mode": "rigid", "anchor": [e, n, u] }   (or { "mode": "reprojected" })
//     }
//   }
//
// A rigid tileset's root `transform` is the rigid placement's matrix (call
// 13); `checkRigidTransform` holds the two together. The glTF-level
// EXT_geospatial_crs and EXT_georeference aren't read: they carry no
// placement mode. The reader is this one module so it can follow the draft as
// it changes. Unknown fields are ignored; a malformed one throws a
// GeoreferenceError naming its JSON path, and nothing is guessed.
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import type {
  AlignmentDefinition,
  HorizontalElement,
  ProfileSegment,
  VerticalProfile,
} from "./alignment.ts";
import type { AreaOfInterest, CrsRef } from "./crs.ts";
import { EngineeringFrame, type SiteTransform } from "./EngineeringFrame.ts";
import {
  placeReprojected,
  placeRigid,
  type TilesetPlacement,
} from "./placement.ts";
import type { GridSource } from "./proj.ts";
import type { ProjApi } from "./projApi.ts";

/** The proposed tileset-level extension (held item 4: its name is the owner's). */
export const ENGINEERING_FRAME_EXTENSION = "EXT_engineering_frame";

const WKID_EXTENSION = "EXT_geospatial_crs_wkid";
const WKT2_EXTENSION = "EXT_geospatial_crs_wkt2";
/** The longest WKT2 read, in characters. */
const MAX_WKT2 = 65_536;
const MAX_ALIGNMENTS = 64;
/** The longest name read (frame, alignment), in characters. */
const MAX_NAME = 256;
/** A registry name, as PROJ's authorities are: "EPSG", "IAU_2015", "ESRI". */
const AUTHORITY = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
/** A decimal year, as the draft writes `epoch`. */
const DECIMAL_YEAR = /^\d{1,4}(\.\d+)?$/;
const ROOT = `extensions.${ENGINEERING_FRAME_EXTENSION}`;
/** Metres: the drawn anchor's tolerance in `checkRigidTransform`. */
const ANCHOR_TOLERANCE = 1e-3;
/** Relative: a column's tolerance in `checkRigidTransform`. */
const COLUMN_TOLERANCE = 1e-9;

/** A tileset's placement as declared: the mode, and a rigid one's anchor. */
export type DeclaredPlacement =
  | {
      readonly mode: "rigid";
      /** Design coordinates of the point drawn exactly (`placeRigid`). */
      readonly anchor: readonly [number, number, number];
    }
  | { readonly mode: "reprojected" };

/** An `EXT_engineering_frame` declaration, read by `readGeoreference`. */
export interface TilesetGeoreference {
  readonly name?: string;
  /** EARTH unless the declaration says "MOON". */
  readonly body: Body;
  readonly crs: CrsRef;
  readonly site?: SiteTransform;
  readonly alignments?: readonly AlignmentDefinition[];
  readonly areaOfInterest?: AreaOfInterest;
  readonly placement: DeclaredPlacement;
}

/**
 * A declaration that is malformed, or disagrees with the tileset: `path` is
 * the JSON path of the field at fault (from the tileset's root, such as
 * "extensions.EXT_engineering_frame.placement.anchor").
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
      // The draft writes a decimal-year string; a number is taken too.
      if (typeof epoch === "string" && DECIMAL_YEAR.test(epoch)) {
        ref.epoch = Number(epoch);
      } else if (typeof epoch === "number") {
        ref.epoch = finite(epoch, `${at}.epoch`);
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
  const wkt2 = companion.wkt2;
  if (typeof wkt2 !== "string" || wkt2.length === 0) {
    throw new GeoreferenceError(
      `${at}.wkt2`,
      `must be a non-empty string (got ${shown(wkt2)})`,
    );
  }
  if (wkt2.length > MAX_WKT2) {
    throw new GeoreferenceError(
      `${at}.wkt2`,
      `is ${wkt2.length.toLocaleString("en-US")} characters; at most ${MAX_WKT2.toLocaleString("en-US")} are read`,
    );
  }
  return { format, wkt2 };
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

/** A spiral's radius: JSON has no Infinity, so null is a tangent end. */
function radius(value: unknown, path: string): number {
  return value === null ? Infinity : finite(value, path);
}

function readElement(value: unknown, path: string): HorizontalElement {
  const element = object(value, path);
  const kind = oneOf(
    element.kind,
    ["line", "arc", "spiral"],
    `${path}.kind`,
    "kind",
  );
  const length = finite(element.length, `${path}.length`);
  if (kind === "line") {
    return { kind, length };
  }
  if (kind === "arc") {
    return { kind, length, radius: finite(element.radius, `${path}.radius`) };
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
  const length = finite(segment.length, `${path}.length`);
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
    segments: array(profile.segments, `${path}.segments`).map((s, i) =>
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
    horizontal: array(alignment.horizontal, `${path}.horizontal`).map((h, i) =>
      readElement(h, `${path}.horizontal[${i}]`),
    ),
  };
  if (alignment.vertical !== undefined) {
    definition.vertical = readProfile(alignment.vertical, `${path}.vertical`);
  }
  return definition;
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

/**
 * The `EXT_engineering_frame` declaration of a parsed tileset.json, or
 * undefined when it has none. Throws a `GeoreferenceError` naming the JSON
 * path for an unknown mode or format, a missing `crs` or `placement`, a
 * non-finite number, a WKT2 over 65,536 characters, or more than 64
 * alignments. Fields it doesn't know are ignored.
 */
export function readGeoreference(
  tilesetJson: unknown,
): TilesetGeoreference | undefined {
  if (!isObject(tilesetJson) || !isObject(tilesetJson.extensions)) {
    return undefined;
  }
  if (!(ENGINEERING_FRAME_EXTENSION in tilesetJson.extensions)) {
    return undefined;
  }
  const declaration = object(
    tilesetJson.extensions[ENGINEERING_FRAME_EXTENSION],
    ROOT,
  );
  const body =
    declaration.body === undefined
      ? EARTH
      : oneOf(declaration.body, ["EARTH", "MOON"], `${ROOT}.body`, "body") ===
          "MOON"
        ? MOON
        : EARTH;
  if (declaration.crs === undefined) {
    throw new GeoreferenceError(`${ROOT}.crs`, "is required");
  }
  if (declaration.placement === undefined) {
    throw new GeoreferenceError(`${ROOT}.placement`, "is required");
  }
  const result: {
    -readonly [K in keyof TilesetGeoreference]: TilesetGeoreference[K];
  } = {
    body,
    crs: readCrs(declaration.crs, `${ROOT}.crs`),
    placement: readPlacement(declaration.placement, `${ROOT}.placement`),
  };
  if (declaration.name !== undefined) {
    result.name = name(declaration.name, `${ROOT}.name`);
  }
  if (declaration.site !== undefined) {
    result.site = readSite(declaration.site, `${ROOT}.site`);
  }
  if (declaration.alignments !== undefined) {
    const path = `${ROOT}.alignments`;
    const items = array(declaration.alignments, path);
    if (items.length > MAX_ALIGNMENTS) {
      throw new GeoreferenceError(
        path,
        `holds ${items.length} alignments; at most ${MAX_ALIGNMENTS} are read`,
      );
    }
    result.alignments = items.map((a, i) => readAlignment(a, `${path}[${i}]`));
  }
  if (declaration.areaOfInterest !== undefined) {
    result.areaOfInterest = readArea(
      declaration.areaOfInterest,
      `${ROOT}.areaOfInterest`,
    );
  }
  return result;
}

/**
 * Throws a `GeoreferenceError` naming `placement.anchor` unless a rigid
 * tileset's root transform is its placement's matrix: the root transform
 * must draw the anchor within 1 mm of `placement.displayed(anchor)`, and each
 * of its columns must be within 1e-9 (relative to that column's length) of
 * `rigid.matrix`'s.
 */
export function checkRigidTransform(
  placement: TilesetPlacement,
  rootTransform: Mat4,
): void {
  const rigid = placement.rigid;
  if (placement.mode !== "rigid" || rigid === undefined) {
    throw new Error("checkRigidTransform: the placement isn't rigid");
  }
  const path = `${ROOT}.placement.anchor`;
  const a = rigid.anchor;
  const m = rootTransform;
  const shownAt = placement.displayed(a);
  let gap = 0;
  for (let i = 0; i < 3; i++) {
    const drawn =
      m[i]! * a[0]! + m[4 + i]! * a[1]! + m[8 + i]! * a[2]! + m[12 + i]!;
    gap = Math.hypot(gap, drawn - shownAt[i]!);
  }
  if (!(gap <= ANCHOR_TOLERANCE)) {
    throw new GeoreferenceError(
      path,
      `the root transform draws the anchor ${gap.toPrecision(3)} m from where its rigid placement does (at most ${ANCHOR_TOLERANCE} m)`,
    );
  }
  for (let c = 0; c < 4; c++) {
    let difference = 0;
    let length = 0;
    for (let r = 0; r < 4; r++) {
      const expected = rigid.matrix[4 * c + r]!;
      difference = Math.hypot(difference, m[4 * c + r]! - expected);
      length = Math.hypot(length, expected);
    }
    const relative = difference / length;
    if (!(relative <= COLUMN_TOLERANCE)) {
      throw new GeoreferenceError(
        path,
        `the root transform's column ${c} differs from the rigid placement's at the anchor by ${relative.toPrecision(3)} relative (at most ${COLUMN_TOLERANCE})`,
      );
    }
  }
}

const isIdentity = (m: ArrayLike<number>) => {
  for (let i = 0; i < 16; i++) {
    if (m[i] !== (i % 5 === 0 ? 1 : 0)) {
      return false;
    }
  }
  return true;
};

/**
 * Places a tileset by its `EXT_engineering_frame` declaration: loads the
 * frame (`EngineeringFrame.load`, named by the declaration, else the
 * tileset's URL), builds the declared placement, checks a rigid one against
 * `tileset.root.transform` (`checkRigidTransform`), and sets
 * `tileset.placement`. PROJ is used here, never by `Tileset3D.load`.
 *
 * Refuses, with an error and a `warnings` entry, a tileset that declares
 * nothing (no placement is guessed), one whose `modelMatrix` isn't the
 * identity (`root.transform` includes it, and a later change would leave the
 * placement no longer what is drawn), and a rigid anchor the root transform
 * disagrees with.
 */
export async function georeferenceTileset(
  tileset: Tileset3D,
  options: { readonly proj: ProjApi; readonly grids?: GridSource },
): Promise<TilesetPlacement> {
  const refuse = (error: Error): never => {
    tileset.warnings.add(error.message);
    throw error;
  };
  const declared = tileset.georeference;
  if (declared === undefined) {
    return refuse(
      new Error(
        `georeferenceTileset: ${tileset.url} has no readable ${ENGINEERING_FRAME_EXTENSION} declaration; no placement is guessed`,
      ),
    );
  }
  if (!isIdentity(tileset.modelMatrix)) {
    return refuse(
      new Error(
        `georeferenceTileset: ${tileset.url} has a modelMatrix other than the identity, so its declared placement wouldn't be what is drawn; place it without one`,
      ),
    );
  }
  const frame = await EngineeringFrame.load(
    {
      name: declared.name ?? tileset.url,
      body: declared.body,
      crs: declared.crs,
      ...(declared.site ? { site: declared.site } : {}),
      ...(declared.alignments ? { alignments: declared.alignments } : {}),
      ...(declared.areaOfInterest
        ? { areaOfInterest: declared.areaOfInterest }
        : {}),
    },
    options.grids
      ? { proj: options.proj, grids: options.grids }
      : { proj: options.proj },
  );
  const placement =
    declared.placement.mode === "rigid"
      ? placeRigid(frame, declared.placement.anchor)
      : placeReprojected(frame);
  if (placement.mode === "rigid") {
    try {
      checkRigidTransform(placement, tileset.root.transform);
    } catch (error) {
      return refuse(error as Error);
    }
  }
  tileset.placement = placement;
  return placement;
}
