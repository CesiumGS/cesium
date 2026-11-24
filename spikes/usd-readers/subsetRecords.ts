// The TypeScript subset reader (CS-833's spike) as plain prim records for
// CS-900's facts. Browser and Node alike. Spike code for CS-900; not part
// of @cesium/next.
//
// Building the records, and what the facts then do with each one, is
// charged to the stage's budget (CS-1153 A): each record, each value it
// keeps, and each label string the facts will join and hash. When the
// budget runs out, the records stop where they are, and the stop message
// leads the errors.

import { MAX_PATH, WorkLimit } from "../usd-subset/budget.ts";
import type { Prim, Stage } from "../usd-subset/compose.ts";
import { isArray, type Value } from "../usd-subset/layer.ts";
import type { AttrRecord, PrimRecord, StageRecord } from "./facts.ts";

/** Token arrays longer than this are counted, not kept. */
const SHORT = 64;

/**
 * Integer arrays' sums, once per array: a class's array is shared by every
 * prim that inherits it, and a hostile file can have thousands inherit a
 * large one. The composer charged its budget for the prims, not for this.
 */
const sums = new WeakMap<ArrayLike<number>, number>();

/**
 * A string array's characters, once per array, for the same reason; -1 when
 * it isn't kept: not all strings, or one longer than MAX_PATH, which V8
 * would hash by its length alone when the facts put it in a set.
 */
const keptChars = new WeakMap<readonly Value[], number>();

function charsKept(value: readonly Value[]): number {
  let chars = keptChars.get(value);
  if (chars === undefined) {
    chars = 0;
    for (const x of value) {
      if (typeof x !== "string" || x.length > MAX_PATH) {
        chars = -1;
        break;
      }
      chars += x.length;
    }
    keptChars.set(value, chars);
  }
  return chars;
}

function sumOf(data: Int32Array | Uint32Array): number {
  let sum = sums.get(data);
  if (sum === undefined) {
    sum = 0;
    for (const x of data) {
      sum += x;
    }
    sums.set(data, sum);
  }
  return sum;
}

function attrRecord(
  typeName: string,
  value: Value | undefined,
  stage: Stage,
): AttrRecord {
  const type = typeName || "unknown";
  if (isArray(value)) {
    const n = value.data.length / Math.max(1, value.tuple);
    if (value.data instanceof Int32Array || value.data instanceof Uint32Array) {
      return { type, count: n, sum: sumOf(value.data) };
    }
    return { type, count: n };
  }
  if (Array.isArray(value)) {
    const chars = value.length <= SHORT ? charsKept(value) : -1;
    if (chars < 0) {
      return { type, count: value.length };
    }
    // The facts read every kept string, for every prim that has it.
    stage.budget.chars(chars);
    return { type, count: value.length, value: value as string[] };
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "string") {
      stage.budget.text(value);
    }
    return { type, value };
  }
  return { type };
}

/** The composed stage as records: every prim but classes and the pseudo-root. */
export function subsetRecords(
  stage: Stage,
  root: Prim,
  errors: readonly string[] = [],
): StageRecord {
  const fields = stage.layer(stage.root)?.specs.get("/")?.fields;
  const str = (k: string): string | null => {
    const v = fields?.get(k);
    return typeof v === "string" && v !== "" ? v : null;
  };
  const num = fields?.get("metersPerUnit");
  const prims: PrimRecord[] = [];
  const budget = stage.budget;
  const walk = (p: Prim): void => {
    if (p.specifier === "class") {
      return;
    }
    if (p.path !== "/") {
      // The record, its two maps and its schema list.
      budget.keep(2);
      budget.charge(p.apiSchemas.length);
      for (const s of p.apiSchemas) {
        // The facts join each label with its taxonomy and hash the result.
        if (s.startsWith("SemanticsLabelsAPI:")) {
          budget.chars((s.length + 1) * SHORT);
        }
      }
      const attrs: Record<string, AttrRecord> = {};
      const rels: Record<string, string[]> = {};
      for (const [name, prop] of p.props) {
        budget.keep();
        if (prop.kind === "relationship") {
          budget.charge(prop.targets.length);
          rels[name] = [...prop.targets];
        } else if (prop.value !== undefined || prop.targets.length > 0) {
          attrs[name] = {
            ...attrRecord(prop.typeName ?? "", prop.value, stage),
            ...(prop.targets.length > 0 ? { connection: true } : {}),
          };
        }
      }
      prims.push({
        path: p.path,
        typeName: p.typeName,
        apiSchemas: [...p.apiSchemas],
        attrs,
        rels,
      });
    }
    for (const c of p.children) {
      walk(c);
    }
  };
  try {
    walk(root);
  } catch (e) {
    // Out of budget: the records made so far stand.
    if (!(e instanceof WorkLimit)) {
      throw e;
    }
  }
  return {
    upAxis: str("upAxis"),
    metersPerUnit: typeof num === "number" ? num : null,
    defaultPrim: str("defaultPrim"),
    prims,
    // The stop leads, whether the stage or the records ran the budget out.
    errors:
      budget.exhausted && !errors.includes(budget.message)
        ? [budget.message, ...errors]
        : errors,
  };
}
