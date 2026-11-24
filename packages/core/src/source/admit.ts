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
 * Bounds (an invalidation's keys, a change set's ops) are read from the
 * checked value. A change set's nested feature data is checked here and
 * held by reference, as a sink holds a batch: a source doesn't change it
 * once pushed.
 */
import { checkChangeSet, type ChangeSet } from "./editing.ts";
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
  readonly what?: "invalidation" | "change set" | "push of samples";
}

/** `change` checked, an invalidation of everything for a malformed known kind, or undefined for a kind it doesn't know. */
export function admit(change: unknown): Admitted | undefined {
  let kind: unknown;
  try {
    kind = isRecord(change) ? change.kind : undefined;
  } catch {
    return undefined;
  }
  if (kind !== "invalidate" && kind !== "features" && kind !== "samples") {
    return undefined;
  }
  try {
    const record = change as Record<string, unknown>;
    const checked =
      kind === "invalidate"
        ? checkInvalidation(record)
        : kind === "features"
          ? checkFeatures(record)
          : checkSamples(record);
    return { change: checked, ops: opsOf(checked) };
  } catch (error) {
    return {
      change: invalidation(),
      ops: 1,
      refused: error instanceof Error ? error : new TypeError("malformed."),
      what:
        kind === "invalidate"
          ? "invalidation"
          : kind === "features"
            ? "change set"
            : "push of samples",
    };
  }
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
  fields(change, ["kind", "keys", "region", "version"], "an invalidation");
  const { keys, region, version } = change;
  const checkedKeys: unknown[] | undefined = Array.isArray(keys)
    ? [...(keys as unknown[])]
    : undefined;
  if (
    (keys !== undefined && checkedKeys === undefined) ||
    !(checkedKeys ?? []).every((k) => typeof k === "string")
  ) {
    throw new TypeError("an invalidation's keys are an array of strings.");
  }
  if (version !== undefined && typeof version !== "string") {
    throw new TypeError("an invalidation's version is a string.");
  }
  return new CheckedInvalidation(
    TOKEN,
    checkedKeys as ContentKey[] | undefined,
    region === undefined ? undefined : extent(region),
    version,
  );
}

function checkFeatures(change: Record<string, unknown>): CheckedFeatures {
  fields(change, ["kind", "changes"], "a features push");
  const changes = change.changes;
  // Its envelope and ops, copied: what is checked is what is queued.
  const copy = isRecord(changes)
    ? {
        ...changes,
        ...(Array.isArray(changes.ops)
          ? {
              ops: (changes.ops as unknown[]).map((op) =>
                isRecord(op) ? { ...op } : op,
              ),
            }
          : {}),
      }
    : changes;
  checkChangeSet(copy as ChangeSet);
  return new CheckedFeatures(TOKEN, copy as ChangeSet);
}

function checkSamples(change: Record<string, unknown>): CheckedSamples {
  fields(change, ["kind", "samples"], "a push of samples");
  const batch = change.samples;
  if (!isRecord(batch)) {
    throw new TypeError("samples: not an object.");
  }
  fields(batch, ["times", "names", "positions", "values"], "samples");
  const { times, names, positions, values } = batch;
  if (!(times instanceof Float64Array)) {
    throw new TypeError("samples: its times are a Float64Array.");
  }
  const count = times.length;
  const checkedNames = Array.isArray(names) ? [...(names as unknown[])] : [];
  if (
    !Array.isArray(names) ||
    checkedNames.length !== count ||
    !checkedNames.every((n) => typeof n === "string")
  ) {
    throw new TypeError("samples: its names are strings, one per time.");
  }
  if (
    positions !== undefined &&
    !(positions instanceof Float64Array && positions.length === count * 3)
  ) {
    throw new TypeError(
      "samples: its positions are a Float64Array, three per time.",
    );
  }
  let checkedValues: Record<string, Float64Array> | undefined;
  if (values !== undefined) {
    const entries = isRecord(values) ? Object.entries(values) : [];
    if (
      !isRecord(values) ||
      !entries.every(([, v]) => v instanceof Float64Array && v.length === count)
    ) {
      throw new TypeError(
        "samples: its values are Float64Arrays, one per time.",
      );
    }
    checkedValues = Object.fromEntries(entries) as Record<string, Float64Array>;
  }
  return new CheckedSamples(TOKEN, {
    times,
    names: checkedNames as string[],
    ...(positions !== undefined ? { positions } : {}),
    ...(checkedValues !== undefined ? { values: checkedValues } : {}),
  });
}

/** An extent (`SourceExtent`): known parts only, finite numbers, a string CRS and frame. */
function extent(value: unknown): SourceExtent {
  const where = "an invalidation's region";
  if (!isRecord(value)) {
    throw new TypeError(`${where} is an object.`);
  }
  fields(value, ["region", "box", "time", "frame"], where);
  const { region, box, time, frame } = value;
  /** `part`'s `names` and those of `optional` it has, each a finite number. */
  const numbers = (
    part: unknown,
    names: readonly string[],
    optional: readonly string[] = [],
  ) => {
    if (!isRecord(part)) {
      throw new TypeError(`${where} has a part that isn't an object.`);
    }
    fields(part, [...names, ...optional], where);
    const entries = [...names, ...optional].flatMap(
      (name): [string, number][] => {
        const n = own(part, name);
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
  const triple = (v: unknown): [number, number, number] => {
    if (
      !Array.isArray(v) ||
      v.length !== 3 ||
      !v.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      throw new TypeError(`${where}'s box corners are three finite numbers.`);
    }
    return [v[0], v[1], v[2]] as [number, number, number];
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
    if (!isRecord(box) || typeof box.crs !== "string") {
      throw new TypeError(`${where}'s box names its CRS.`);
    }
    fields(box, ["crs", "min", "max"], where);
    out.box = { crs: box.crs, min: triple(box.min), max: triple(box.max) };
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

/** Throws naming `where` when `record` has a field `known` doesn't list (never the field's value). */
function fields(
  record: Record<string, unknown>,
  known: readonly string[],
  where: string,
): void {
  if (!Object.keys(record).every((name) => known.includes(name))) {
    throw new TypeError(`${where} has a field it doesn't know.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
