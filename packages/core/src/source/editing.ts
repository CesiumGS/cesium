/**
 * CS-831's three pieces in the seam (docs/design/editing.md, "What the seam must
 * carry in alpha.1"): what a source can write (`WriteCapabilities`,
 * `READ_ONLY`), change sets (`ChangeSet`, extended per CS-861: patch
 * updates, per-operation versions, an explicit `overwrite`, geometry in a
 * named CRS, provisional IDs, partial results and typed conflicts), and how
 * one is committed (`SourceWriter`, `CommitResult`).
 *
 * The serialized form (CS-862) is JSON tagged with a format name and a 0.x
 * version, experimental until a second writer exists: `changeSetToJson` and
 * `changeSetFromJson`. Stable IDs are 64-bit, so the JSON holds them as
 * decimal strings. At 0.x a field it doesn't know is refused, not passed
 * through: a writer's newer field would otherwise be lost silently. Numbers
 * are finite and never -0, since JSON can't carry NaN or the infinities and
 * reads "-0" back as 0's sign only by accident: what is checked round-trips.
 */
import type { StableId } from "../scene/identity.ts";
import type { PlainValue } from "./types.ts";

/**
 * What a source can write. Capabilities are a hint for the interface, not
 * authority: the server decides what a user may write.
 * @experimental
 */
export interface WriteCapabilities {
  readonly update: boolean;
  readonly insert: boolean;
  readonly delete: boolean;
  /** How a stale edit is detected: a version per feature, one per source, or none. */
  readonly versioned: "feature" | "source" | false;
  /** A change set applies whole or not at all. */
  readonly transactions: boolean;
  /** It pushes others' changes (`features` or `invalidate`), so they show without a reload. */
  readonly live: boolean;
  /** It merges concurrent edits itself (a CRDT, a rebasing service): a stale base never conflicts. */
  readonly merges: boolean;
  /** Edits reach its content later, after a rebuild such as re-tiling. */
  readonly deferred: boolean;
  /** The properties an edit may change, when not all; and whether geometry is editable. */
  readonly editable?: {
    readonly geometry: boolean;
    readonly properties?: readonly string[];
  };
}

/**
 * What every source declares until it can write.
 * @experimental
 */
export const READ_ONLY: WriteCapabilities = Object.freeze({
  update: false,
  insert: false,
  delete: false,
  versioned: false,
  transactions: false,
  live: false,
  merges: false,
  deferred: false,
});

/**
 * Whether `write` allows no edit at all (`READ_ONLY`'s flags, `live` aside).
 * @experimental
 */
export function isReadOnly(write: WriteCapabilities): boolean {
  return !write.update && !write.insert && !write.delete;
}

/**
 * Coordinates in a named CRS, in double precision. Never render-space coordinates.
 * @experimental
 */
export interface GeometryData {
  /** "EPSG:4979", "EPSG:4978", or the source's CRS. */
  readonly crs: string;
  readonly type:
    | "Point"
    | "LineString"
    | "Polygon"
    | "MultiPoint"
    | "MultiLineString"
    | "MultiPolygon"
    | "Mesh";
  /** GeoJSON's nesting for vector types; a mesh's arrays for "Mesh". */
  readonly coordinates: PlainValue;
}

/**
 * A whole feature.
 * @experimental
 */
export interface FeatureData {
  readonly properties?: Readonly<Record<string, PlainValue>>;
  readonly geometry?: GeometryData;
}

/**
 * Only what changed: properties set (or removed, as null), and the geometry if it changed.
 * @experimental
 */
export interface FeaturePatch {
  readonly properties?: Readonly<Record<string, PlainValue | null>>;
  readonly geometry?: GeometryData;
}

/**
 * One operation of a change set.
 * @experimental
 */
export type ChangeOp =
  /** `id` is provisional, made by the client; the commit maps it to the source's (`CommitResult.ids`). */
  | {
      readonly op: "insert";
      readonly id: StableId;
      readonly feature: FeatureData;
    }
  | {
      readonly op: "update";
      readonly id: StableId;
      /** The feature's version it was made against (`versioned: "feature"`). */
      readonly base?: string;
      readonly patch: FeaturePatch;
      readonly before?: FeaturePatch;
      /** Skips the concurrency check: a person chose it, and it's recorded. */
      readonly overwrite?: true;
    }
  | {
      readonly op: "delete";
      readonly id: StableId;
      readonly base?: string;
      readonly before?: FeatureData;
      readonly overwrite?: true;
    };

/**
 * A list of operations on features, with the version it was made against:
 * plain data, to undo, redo, replay and send.
 * @experimental
 */
export interface ChangeSet {
  /** Unique; also the idempotency key and the echo filter. */
  readonly id: string;
  /** The content's ID. */
  readonly source: string;
  /** The source version it was made against (`versioned: "source"`). */
  readonly base?: string;
  readonly ops: readonly ChangeOp[];
  readonly meta?: {
    readonly author?: string;
    readonly time?: string;
    readonly note?: string;
  };
}

/**
 * A feature's current version, as a writer reads it.
 * @experimental
 */
export interface FeatureVersion {
  readonly id: StableId;
  readonly version?: string;
  /** Absent: deleted, or never existed. */
  readonly feature?: FeatureData;
}

/**
 * Why an operation wasn't applied. `reason` is the server's words, without
 * user data or credentials.
 * @experimental
 */
export interface Conflict {
  readonly id: StableId;
  readonly kind: "changed" | "deleted" | "exists" | "forbidden" | "invalid";
  /** Index into the change set's ops. */
  readonly op: number;
  readonly mine: ChangeOp;
  readonly base?: FeatureVersion;
  readonly theirs?: FeatureVersion;
  readonly reason?: string;
}

/**
 * A commit's outcome: applied, applied in part (no transactions), or
 * refused. `ids` maps each insert's provisional ID (as a decimal string)
 * to the source's.
 * @experimental
 */
export type CommitResult =
  | {
      readonly ok: true;
      readonly version: string;
      readonly ids?: Readonly<Record<string, StableId>>;
    }
  | {
      readonly ok: "partial";
      readonly version: string;
      readonly applied: readonly number[];
      readonly conflicts: readonly Conflict[];
      readonly ids?: Readonly<Record<string, StableId>>;
    }
  | { readonly ok: false; readonly conflicts: readonly Conflict[] };

/**
 * A source's way back.
 * @experimental
 */
export interface SourceWriter {
  commit(
    changes: ChangeSet,
    init: { readonly signal?: AbortSignal },
  ): Promise<CommitResult>;
  /** The current versions of these features, to rebase on or to learn whether a lost commit landed. */
  read?(
    ids: readonly StableId[],
    init: { readonly signal?: AbortSignal },
  ): Promise<readonly FeatureVersion[]>;
}

// ---------------------------------------------------------------------------
// The serialized form (CS-862): experimental at 0.x

/**
 * The serialized change set's format name.
 * @experimental
 */
export const CHANGE_SET_FORMAT = "cesium-change-set";

/**
 * Its version: 0.x, experimental until a second writer exists (CS-862).
 * @experimental
 */
export const CHANGE_SET_VERSION = "0.1.0";

/**
 * What a change set from outside may hold before it's refused.
 * @experimental
 */
export interface ChangeSetLimits {
  /** Most operations. Default 10 000. */
  readonly ops?: number;
  /** Most UTF-16 code units of JSON text. Default 16 MiB worth. */
  readonly chars?: number;
}

const DEFAULT_OPS = 10_000;
const DEFAULT_CHARS = 16 * 1024 * 1024;
const MAX_ID = (1n << 64n) - 1n;
/** How deep a property value nests before it's refused. */
const MAX_DEPTH = 32;

/** The fields each part of a change set may have (0.x: no others). */
const ENVELOPE_FIELDS = new Set(["format", "version", "changeSet"]);
const CHANGE_SET_FIELDS = new Set(["id", "source", "base", "ops", "meta"]);
const META_FIELDS = new Set(["author", "time", "note"]);
const OP_FIELDS: Readonly<Record<ChangeOp["op"], ReadonlySet<string>>> = {
  insert: new Set(["op", "id", "feature"]),
  update: new Set(["op", "id", "base", "patch", "before", "overwrite"]),
  delete: new Set(["op", "id", "base", "before", "overwrite"]),
};
const FEATURE_FIELDS = new Set(["properties", "geometry"]);
const GEOMETRY_FIELDS = new Set(["crs", "type", "coordinates"]);

/**
 * `changes` as JSON text: `{ format, version, changeSet }`, with each stable
 * ID a decimal string.
 * @experimental
 */
export function changeSetToJson(changes: ChangeSet): string {
  checkChangeSet(changes);
  return JSON.stringify(
    {
      format: CHANGE_SET_FORMAT,
      version: CHANGE_SET_VERSION,
      changeSet: changes,
    },
    (_key, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
  );
}

/**
 * Reads JSON text that `changeSetToJson` wrote (or another writer of
 * version 0.x). Throws a `TypeError` naming what's wrong, never echoing
 * property values: change sets carry user data.
 * @experimental
 */
export function changeSetFromJson(
  text: string,
  limits: ChangeSetLimits = {},
): ChangeSet {
  if (text.length > (limits.chars ?? DEFAULT_CHARS)) {
    throw new TypeError("change set: the text is longer than its limit.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("change set: not JSON.");
  }
  if (!isRecord(parsed) || parsed.format !== CHANGE_SET_FORMAT) {
    throw new TypeError(`change set: the format isn't "${CHANGE_SET_FORMAT}".`);
  }
  const version = parsed.version;
  if (typeof version !== "string" || !/^0\.\d+\.\d+$/.test(version)) {
    // Never the value itself: the text is from outside.
    throw new TypeError(
      `change set: its version isn't 0.x; this reads ${CHANGE_SET_VERSION}.`,
    );
  }
  checkFields(parsed, ENVELOPE_FIELDS, "change set: the envelope");
  const raw = parsed.changeSet;
  if (!isRecord(raw) || !Array.isArray(raw.ops)) {
    throw new TypeError("change set: it has no ops.");
  }
  // Before any op is read: a long list costs nothing to refuse.
  checkOpCount(raw.ops.length, limits);
  const changes = {
    ...raw,
    ops: raw.ops.map((op: unknown, index: number) => {
      if (!isRecord(op)) {
        throw new TypeError(`change set: op ${index} isn't an object.`);
      }
      return { ...op, id: idFrom(op.id, index) };
    }),
  } as unknown as ChangeSet;
  checkChangeSet(changes, limits);
  return changes;
}

/**
 * Throws a `TypeError` unless `changes` is a well-formed change set within
 * `limits`: what a feed's change sets go through before they apply. The
 * message names the operation and field, never a value.
 * @experimental
 */
export function checkChangeSet(
  changes: ChangeSet,
  limits: ChangeSetLimits = {},
): void {
  if (!isRecord(changes)) {
    throw new TypeError("change set: not an object.");
  }
  if (typeof changes.id !== "string" || changes.id.length === 0) {
    throw new TypeError("change set: its id is a non-empty string.");
  }
  if (typeof changes.source !== "string" || changes.source.length === 0) {
    throw new TypeError("change set: its source is a non-empty string.");
  }
  if (changes.base !== undefined && typeof changes.base !== "string") {
    throw new TypeError("change set: its base is a string.");
  }
  checkFields(changes, CHANGE_SET_FIELDS, "change set");
  if (changes.meta !== undefined) {
    if (!isRecord(changes.meta)) {
      throw new TypeError("change set: its meta is an object.");
    }
    checkFields(changes.meta, META_FIELDS, "change set: its meta");
    for (const [name, value] of Object.entries(changes.meta)) {
      if (value !== undefined && typeof value !== "string") {
        throw new TypeError(`change set: its meta's ${name} is a string.`);
      }
    }
  }
  if (!Array.isArray(changes.ops)) {
    throw new TypeError("change set: its ops are an array.");
  }
  checkOpCount(changes.ops.length, limits);
  changes.ops.forEach((op, index) => checkOp(op, index));
}

function checkOpCount(count: number, limits: ChangeSetLimits): void {
  if (count > (limits.ops ?? DEFAULT_OPS)) {
    throw new TypeError(`change set: ${count} ops, more than its limit.`);
  }
}

/** Throws naming the first field of `record` not in `known` (its name only, up to 64 characters). */
function checkFields(
  record: object,
  known: ReadonlySet<string>,
  where: string,
): void {
  for (const name of Object.keys(record)) {
    if (!known.has(name)) {
      throw new TypeError(
        `${where} has a field it doesn't know (${JSON.stringify(name.slice(0, 64))}); 0.x refuses it.`,
      );
    }
  }
}

function checkOp(op: ChangeOp, index: number): void {
  const where = `change set: op ${index}`;
  if (!isRecord(op)) {
    throw new TypeError(`${where} isn't an object.`);
  }
  if (typeof op.id !== "bigint" || op.id <= 0n || op.id > MAX_ID) {
    throw new TypeError(
      `${where}: its id is a stable ID (a 64-bit bigint, not 0).`,
    );
  }
  if (Object.hasOwn(OP_FIELDS, op.op)) {
    checkFields(op, OP_FIELDS[op.op], where);
  }
  switch (op.op) {
    case "insert":
      checkFeature(op.feature, `${where}'s feature`);
      return;
    case "update":
      checkVersion(op.base, where);
      checkPatch(op.patch, `${where}'s patch`);
      if (op.before !== undefined) {
        checkPatch(op.before, `${where}'s before`);
      }
      checkOverwrite(op.overwrite, where);
      return;
    case "delete":
      checkVersion(op.base, where);
      if (op.before !== undefined) {
        checkFeature(op.before, `${where}'s before`);
      }
      checkOverwrite(op.overwrite, where);
      return;
    default:
      throw new TypeError(
        `${where}: its op is "insert", "update" or "delete".`,
      );
  }
}

function checkVersion(base: unknown, where: string): void {
  if (base !== undefined && typeof base !== "string") {
    throw new TypeError(`${where}: its base is a string.`);
  }
}

function checkOverwrite(overwrite: unknown, where: string): void {
  if (overwrite !== undefined && overwrite !== true) {
    throw new TypeError(`${where}: overwrite is true or absent.`);
  }
}

function checkFeature(feature: unknown, where: string): void {
  if (!isRecord(feature)) {
    throw new TypeError(`${where} is an object.`);
  }
  checkFields(feature, FEATURE_FIELDS, where);
  if (feature.properties !== undefined) {
    if (!isRecord(feature.properties)) {
      throw new TypeError(`${where}'s properties are an object.`);
    }
    for (const [name, value] of Object.entries(feature.properties)) {
      checkPlain(
        value,
        `${where}'s property ${JSON.stringify(name.slice(0, 64))}`,
        0,
      );
    }
  }
  if (feature.geometry !== undefined) {
    checkGeometry(feature.geometry, where);
  }
}

/**
 * Throws unless `value` is a `PlainValue` that round-trips through JSON:
 * strings, finite numbers other than -0, booleans, null, and arrays and
 * plain objects of them, nested at most `MAX_DEPTH` deep. Names no value.
 */
function checkPlain(value: unknown, where: string, depth: number): void {
  if (depth > MAX_DEPTH) {
    throw new TypeError(`${where} nests deeper than ${MAX_DEPTH}.`);
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new TypeError(
        `${where} holds a number JSON can't carry (NaN, an infinity or -0).`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      checkPlain(item, where, depth + 1);
    }
    return;
  }
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    for (const item of Object.values(value)) {
      checkPlain(item, where, depth + 1);
    }
    return;
  }
  throw new TypeError(
    `${where} isn't a plain value (a string, number, boolean, null, array or object of them).`,
  );
}

function checkPatch(patch: unknown, where: string): void {
  checkFeature(patch, where);
}

const GEOMETRY_TYPES = new Set([
  "Point",
  "LineString",
  "Polygon",
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon",
  "Mesh",
]);

function checkGeometry(geometry: unknown, where: string): void {
  if (
    !isRecord(geometry) ||
    typeof geometry.crs !== "string" ||
    geometry.crs.length === 0
  ) {
    throw new TypeError(`${where}'s geometry names its CRS.`);
  }
  if (!GEOMETRY_TYPES.has(geometry.type as string)) {
    throw new TypeError(`${where}'s geometry type isn't one it takes.`);
  }
  checkFields(geometry, GEOMETRY_FIELDS, `${where}'s geometry`);
  checkPlain(geometry.coordinates, `${where}'s coordinates`, 0);
}

function idFrom(value: unknown, index: number): bigint {
  if (typeof value !== "string" || !/^[1-9]\d{0,19}$/.test(value)) {
    throw new TypeError(
      `change set: op ${index}: its id is a stable ID in decimal.`,
    );
  }
  return BigInt(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
