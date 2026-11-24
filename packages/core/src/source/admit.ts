/**
 * One way in for a source's push (CS-847, CS-1102 A): `admit` checks a
 * push once, at `SourceHost.changed`, and has three outcomes.
 *
 * - **A checked change** (`CheckedChange`): a value of a type only this
 *   module makes, built from what it checked, so a source changing its own
 *   object afterward changes nothing queued. The queue holds these alone,
 *   and the apply phase takes nothing else.
 * - **An invalidation of everything,** with why, for a known kind that is
 *   malformed in any way: a field of the wrong type, a field it doesn't
 *   know, arrays that don't agree in length. Its source loads committed
 *   state again, so nothing is lost but samples, which a reload doesn't
 *   bring back.
 * - **Nothing,** for a kind it doesn't know: the union is open (CS-831's
 *   S5), so later kinds don't break sources.
 *
 * Each field of a push is read once, into a local, then checked and
 * copied: a getter that answers differently later changes nothing, and a
 * symbol or non-enumerable field is refused as unknown. Arrays are read by
 * their length once and each entry once; samples' arrays and an op's
 * nested data are copied. Bounds (an invalidation's keys, a change set's
 * ops) are read from the checked value, and a change set's op count is
 * checked before its ops are copied.
 */
import {
  CHANGE_SET_FIELDS,
  DEFAULT_OPS,
  META_FIELDS,
  OP_FIELDS,
  checkChangeSet,
  type ChangeSet,
} from "./editing.ts";
import { own } from "./records.ts";
import type {
  ContentKey,
  InvalidateChange,
  SampleBatch,
  SourceExtent,
} from "./types.ts";

/** Held by this module alone: only it makes a checked change. */
const TOKEN = Symbol("CheckedChange");

/** A checked change's maker is this module's alone. */
abstract class Checked {
  constructor(token: symbol) {
    if (token !== TOKEN) {
      throw new TypeError("a checked change: only admit makes one.");
    }
  }
}

/** An invalidation `admit` checked: keys of strings, an extent of numbers, a version. */
export class CheckedInvalidation extends Checked implements InvalidateChange {
  readonly kind = "invalidate";
  readonly keys?: readonly ContentKey[];
  readonly region?: SourceExtent;
  readonly version?: string;

  constructor(
    token: symbol,
    keys: readonly ContentKey[] | undefined,
    region?: SourceExtent,
    version?: string,
  ) {
    super(token);
    if (keys !== undefined) {
      this.keys = keys;
    }
    if (region !== undefined) {
      this.region = region;
    }
    if (version !== undefined) {
      this.version = version;
    }
  }

  /** Whether it invalidates everything: neither keys nor a region. */
  get everything(): boolean {
    return this.keys === undefined && this.region === undefined;
  }
}

/** A change set `admit` checked (`checkChangeSet`): resolved against its content when it applies. */
export class CheckedFeatures extends Checked {
  readonly kind = "features";
  constructor(
    token: symbol,
    readonly changes: ChangeSet,
  ) {
    super(token);
  }
}

/** Samples `admit` checked: a time and a name for each, positions and values that agree. */
export class CheckedSamples extends Checked {
  readonly kind = "samples";
  constructor(
    token: symbol,
    readonly samples: SampleBatch,
  ) {
    super(token);
  }
}

/** What the queue and the apply phase take. */
export type CheckedChange =
  CheckedInvalidation | CheckedFeatures | CheckedSamples;

/** A push, admitted. */
export interface Admitted {
  readonly change: CheckedChange;
  /** Its ops, as the queue's bound counts them: a change set's, an invalidation's keys, else one. */
  readonly ops: number;
  /** Why a known kind was refused (naming no value): `change` is then an invalidation of everything. */
  readonly refused?: Error;
  /** What the refused push was. */
  readonly what?: "invalidation" | "change set" | "push of samples" | "push";
}

/** Most characters of an invalidation's `version`: a tag, an ETag or a time, never a payload. */
export const MAX_VERSION_LENGTH = 256;

/** `change` checked, an invalidation of everything for a malformed known kind, or undefined for a kind it doesn't know. */
export function admit(change: unknown): Admitted | undefined {
  if (!isRecord(change)) {
    return undefined;
  }
  let kind: unknown;
  try {
    kind = change.kind; // read once; the checks below don't read it again
  } catch (error) {
    // Malformed, not unknown: its kind can't be read. Reported.
    return refusal(error, "push");
  }
  if (kind !== "invalidate" && kind !== "features" && kind !== "samples") {
    return undefined;
  }
  try {
    const checked =
      kind === "invalidate"
        ? checkInvalidation(change)
        : kind === "features"
          ? checkFeatures(change)
          : checkSamples(change);
    return { change: checked, ops: opsOf(checked) };
  } catch (error) {
    return refusal(
      error,
      kind === "invalidate"
        ? "invalidation"
        : kind === "features"
          ? "change set"
          : "push of samples",
    );
  }
}

/** A malformed push: an invalidation of everything, with why. */
function refusal(
  error: unknown,
  what: NonNullable<Admitted["what"]>,
): Admitted {
  return {
    change: invalidation(),
    ops: 1,
    refused: error instanceof Error ? error : new TypeError("malformed."),
    what,
  };
}

/** An invalidation the engine makes itself: of `keys`, else of everything. */
export function invalidation(
  keys?: readonly ContentKey[],
): CheckedInvalidation {
  return new CheckedInvalidation(
    TOKEN,
    keys === undefined ? undefined : [...keys],
  );
}

function checkInvalidation(
  change: Record<string, unknown>,
): CheckedInvalidation {
  const fields = read(
    change,
    ["kind", "keys", "region", "version"],
    "an invalidation",
  );
  const keys = fields.get("keys");
  const region = fields.get("region");
  const version = fields.get("version");
  const checkedKeys =
    keys === undefined
      ? undefined
      : strings(keys, "an invalidation's keys are an array of strings.");
  if (
    version !== undefined &&
    (typeof version !== "string" || version.length > MAX_VERSION_LENGTH)
  ) {
    throw new TypeError(
      `an invalidation's version is a string of at most ${MAX_VERSION_LENGTH} characters.`,
    );
  }
  return new CheckedInvalidation(
    TOKEN,
    checkedKeys,
    region === undefined ? undefined : extent(region),
    version,
  );
}

/** Every field an op of any kind may have; `checkChangeSet` checks each kind's own. */
const OP_FIELD_NAMES = [
  ...new Set(Object.values(OP_FIELDS).flatMap((names) => [...names])),
];

function checkFeatures(change: Record<string, unknown>): CheckedFeatures {
  const changes = read(change, ["kind", "changes"], "a features push").get(
    "changes",
  );
  if (!isRecord(changes)) {
    throw new TypeError("change set: not an object.");
  }
  // Its envelope, each field read once; its ops counted, then each read
  // once and copied, nested data by structured clone: what is checked is
  // what is queued.
  const envelope = Object.fromEntries(
    read(changes, [...CHANGE_SET_FIELDS], "change set"),
  );
  const ops: unknown = envelope.ops;
  if (Array.isArray(ops)) {
    const count: number = ops.length;
    if (!(count <= DEFAULT_OPS)) {
      throw new TypeError("change set: more ops than its limit.");
    }
    const copied: unknown[] = [];
    for (let i = 0; i < count; i++) {
      const op: unknown = ops[i];
      copied.push(
        isRecord(op)
          ? Object.fromEntries(
              [...read(op, OP_FIELD_NAMES, `change set: op ${i}`)].map(
                ([name, value]) => [name, plainCopy(value)],
              ),
            )
          : op,
      );
    }
    envelope.ops = copied;
  }
  const meta: unknown = envelope.meta;
  if (isRecord(meta)) {
    envelope.meta = Object.fromEntries(
      read(meta, [...META_FIELDS], "change set: its meta"),
    );
  }
  checkChangeSet(envelope as unknown as ChangeSet);
  return new CheckedFeatures(TOKEN, envelope as unknown as ChangeSet);
}

/** An op's field's value: an object copied by structured clone (each getter read once), else as it is. */
function plainCopy(value: unknown): unknown {
  return typeof value === "object" && value !== null
    ? structuredClone(value)
    : value;
}

function checkSamples(change: Record<string, unknown>): CheckedSamples {
  const batch = read(change, ["kind", "samples"], "a push of samples").get(
    "samples",
  );
  if (!isRecord(batch)) {
    throw new TypeError("samples: not an object.");
  }
  const fields = read(
    batch,
    ["times", "names", "positions", "values"],
    "samples",
  );
  const times = fields.get("times");
  const positions = fields.get("positions");
  const values = fields.get("values");
  if (!(times instanceof Float64Array)) {
    throw new TypeError("samples: its times are a Float64Array.");
  }
  // Copies, so a buffer the source resizes or writes later changes nothing queued.
  const checkedTimes = new Float64Array(times);
  const count = checkedTimes.length;
  const names = strings(
    fields.get("names"),
    "samples: its names are strings, one per time.",
  );
  if (names.length !== count) {
    throw new TypeError("samples: its names are strings, one per time.");
  }
  const checkedPositions =
    positions === undefined
      ? undefined
      : finite(
          positions,
          count * 3,
          "samples: its positions are a Float64Array of finite numbers, three per time.",
        );
  let checkedValues: Record<string, Float64Array> | undefined;
  if (values !== undefined) {
    const message =
      "samples: its values are Float64Arrays of finite numbers, one per time.";
    if (!isRecord(values) || !plainKeys(values)) {
      throw new TypeError(message);
    }
    checkedValues = Object.fromEntries(
      Object.entries(values).map(([name, v]) => [
        name,
        finite(v, count, message),
      ]),
    );
  }
  return new CheckedSamples(TOKEN, {
    times: checkedTimes,
    names,
    ...(checkedPositions !== undefined ? { positions: checkedPositions } : {}),
    ...(checkedValues !== undefined ? { values: checkedValues } : {}),
  });
}

/** A copy of `value`, a Float64Array of `length` finite numbers, else throws `message`. */
function finite(value: unknown, length: number, message: string): Float64Array {
  if (!(value instanceof Float64Array)) {
    throw new TypeError(message);
  }
  const copy = new Float64Array(value);
  if (copy.length !== length || !copy.every(Number.isFinite)) {
    throw new TypeError(message);
  }
  return copy;
}

/** An extent (`SourceExtent`): known parts only, finite numbers, a string CRS and frame. */
function extent(value: unknown): SourceExtent {
  const where = "an invalidation's region";
  if (!isRecord(value)) {
    throw new TypeError(`${where} is an object.`);
  }
  const parts = read(value, ["region", "box", "time", "frame"], where);
  const region = parts.get("region");
  const box = parts.get("box");
  const time = parts.get("time");
  const frame = parts.get("frame");
  /** `part`'s `names` and those of `optional` it has, each read once, each a finite number. */
  const numbers = (
    part: unknown,
    names: readonly string[],
    optional: readonly string[] = [],
  ) => {
    if (!isRecord(part)) {
      throw new TypeError(`${where} has a part that isn't an object.`);
    }
    const got = read(part, [...names, ...optional], where);
    const entries = [...names, ...optional].flatMap(
      (name): [string, number][] => {
        const n = got.get(name);
        if (n === undefined && optional.includes(name)) {
          return [];
        }
        if (typeof n !== "number" || !Number.isFinite(n)) {
          throw new TypeError(`${where} has a number that isn't finite.`);
        }
        return [[name, n]];
      },
    );
    return Object.fromEntries(entries);
  };
  /** A box corner: its length and each number read once. */
  const triple = (v: unknown): [number, number, number] => {
    const message = `${where}'s box corners are three finite numbers.`;
    if (!Array.isArray(v)) {
      throw new TypeError(message);
    }
    const length: number = v.length;
    if (length !== 3) {
      throw new TypeError(message);
    }
    const out: unknown[] = [v[0], v[1], v[2]];
    if (!out.every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new TypeError(message);
    }
    return out as [number, number, number];
  };
  const out: {
    region?: SourceExtent["region"];
    box?: SourceExtent["box"];
    time?: SourceExtent["time"];
    frame?: string;
  } = {};
  if (region !== undefined) {
    out.region = numbers(
      region,
      ["west", "south", "east", "north"],
      ["minimumHeight", "maximumHeight"],
    ) as SourceExtent["region"];
  }
  if (box !== undefined) {
    if (!isRecord(box)) {
      throw new TypeError(`${where}'s box names its CRS.`);
    }
    const corners = read(box, ["crs", "min", "max"], where);
    const crs = corners.get("crs");
    if (typeof crs !== "string") {
      throw new TypeError(`${where}'s box names its CRS.`);
    }
    out.box = {
      crs,
      min: triple(corners.get("min")),
      max: triple(corners.get("max")),
    };
  }
  if (time !== undefined) {
    out.time = numbers(time, ["start", "stop"]) as SourceExtent["time"];
  }
  if (frame !== undefined) {
    if (typeof frame !== "string") {
      throw new TypeError(`${where}'s frame is a string.`);
    }
    out.frame = frame;
  }
  return out;
}

/** Its ops against the queue's bound (`MAX_QUEUED_CHANGES`), read from the checked value. */
function opsOf(change: CheckedChange): number {
  return change.kind === "features"
    ? Math.max(1, change.changes.ops.length)
    : change.kind === "invalidate"
      ? Math.max(1, change.keys?.length ?? 1)
      : 1;
}

/**
 * `record`'s fields, each read once (`kind` aside: `admit` read it), after
 * checking it has none `known` doesn't list: a symbol, a non-enumerable
 * field or another name is refused as unknown, naming no value.
 */
function read(
  record: Record<string, unknown>,
  known: readonly string[],
  where: string,
): Map<string, unknown> {
  if (!plainKeys(record)) {
    throw new TypeError(`${where} has a field it doesn't know.`);
  }
  const names = Object.keys(record);
  if (!names.every((name) => known.includes(name))) {
    throw new TypeError(`${where} has a field it doesn't know.`);
  }
  const out = new Map<string, unknown>();
  for (const name of names) {
    if (name !== "kind") {
      out.set(name, own(record, name));
    }
  }
  return out;
}

/** Whether every own key of `record` is a string and enumerable: no symbol, no hidden field. */
function plainKeys(record: object): boolean {
  const keys = Reflect.ownKeys(record);
  return (
    keys.every((key) => typeof key === "string") &&
    keys.length === Object.keys(record).length
  );
}

/** A copy of `value`, an array of strings (its length and each entry read once), else throws `message`. */
function strings(value: unknown, message: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(message);
  }
  const length: number = value.length;
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    const item: unknown = value[i];
    if (typeof item !== "string") {
      throw new TypeError(message);
    }
    out.push(item);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
