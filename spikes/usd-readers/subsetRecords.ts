// The TypeScript subset reader (CS-833's spike) as plain prim records for
// CS-900's facts. Browser and Node alike. Spike code for CS-900; not part
// of @cesium/next.

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

/** Whether an array holds only strings, once per array, for the same reason. */
const allStrings = new WeakMap<readonly Value[], boolean>();

function stringsOnly(value: readonly Value[]): boolean {
  let only = allStrings.get(value);
  if (only === undefined) {
    only = value.every((x) => typeof x === "string");
    allStrings.set(value, only);
  }
  return only;
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

function attrRecord(typeName: string, value: Value | undefined): AttrRecord {
  const type = typeName || "unknown";
  if (isArray(value)) {
    const n = value.data.length / Math.max(1, value.tuple);
    if (value.data instanceof Int32Array || value.data instanceof Uint32Array) {
      return { type, count: n, sum: sumOf(value.data) };
    }
    return { type, count: n };
  }
  if (Array.isArray(value)) {
    const strings = stringsOnly(value);
    return strings && value.length <= SHORT
      ? { type, count: value.length, value: value as string[] }
      : { type, count: value.length };
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
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
  const walk = (p: Prim): void => {
    if (p.specifier === "class") {
      return;
    }
    if (p.path !== "/") {
      const attrs: Record<string, AttrRecord> = {};
      const rels: Record<string, string[]> = {};
      for (const [name, prop] of p.props) {
        if (prop.kind === "relationship") {
          rels[name] = [...prop.targets];
        } else if (prop.value !== undefined || prop.targets.length > 0) {
          attrs[name] = {
            ...attrRecord(prop.typeName ?? "", prop.value),
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
  walk(root);
  return {
    upAxis: str("upAxis"),
    metersPerUnit: typeof num === "number" ? num : null,
    defaultPrim: str("defaultPrim"),
    prims,
    errors,
  };
}
