// LightUSD's composed stage as plain prim records for CS-900's facts.
// LightUSD flattens a stage (NextFlattenSession) into one layer; its
// LayerDocument exports that layer as JSON, with each value as USDA text.
// Prim metadata (apiSchemas) isn't in the JSON, so the caller passes a
// lookup that asks the LayerDocument. Browser and Node alike. Spike code
// for CS-900; not part of @cesium/next.

import type { AttrRecord, PrimRecord, StageRecord } from "./facts.ts";

/** Token arrays longer than this are counted, not kept. */
const SHORT = 64;

interface JsonProperty {
  propertyType?: string;
  relationTargets?: string[];
  attribute?: { typeName?: string; hasValue?: boolean; value?: unknown };
}

interface JsonPrim {
  name?: string;
  typeName?: string;
  specifier?: string;
  properties?: Record<string, JsonProperty>;
  children?: Record<string, JsonPrim>;
}

interface JsonLayer {
  metas?: Record<string, unknown>;
  primSpecs?: Record<string, JsonPrim>;
}

/**
 * The elements of a USDA array's text, split at its top level: "[1, 2]",
 * "[(0, 0, 1), (1, 0, 0)]", "[\"a, b\", \"c\"]".
 */
export function usdaArrayElements(text: string): string[] {
  const s = text.trim();
  if (!s.startsWith("[") || !s.endsWith("]")) {
    return [];
  }
  const out: string[] = [];
  let depth = 0;
  let start = 1;
  let quote: string | undefined;
  for (let i = 1; i < s.length - 1; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === "\\") {
        i++;
      } else if (c === quote) {
        quote = undefined;
      }
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "(" || c === "[") {
      depth++;
    } else if (c === ")" || c === "]") {
      depth--;
    } else if (c === "," && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = s.slice(start, s.length - 1).trim();
  if (last !== "") {
    out.push(last);
  }
  return out;
}

const unquote = (t: string): string => {
  if (t.length >= 2 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0]) {
    try {
      return JSON.parse(t[0] === '"' ? t : `"${t.slice(1, -1)}"`) as string;
    } catch {
      return t.slice(1, -1);
    }
  }
  return t;
};

/** One attribute's USDA text as an AttrRecord. */
export function attrFromUsda(type: string, text: string): AttrRecord {
  if (type.endsWith("[]")) {
    const elements = usdaArrayElements(text);
    const base = type.slice(0, -2);
    if (/^u?int(64)?$/.test(base)) {
      return {
        type,
        count: elements.length,
        sum: elements.reduce((n, e) => n + Number(e), 0),
      };
    }
    if ((base === "token" || base === "string") && elements.length <= SHORT) {
      return { type, count: elements.length, value: elements.map(unquote) };
    }
    return { type, count: elements.length };
  }
  const t = text.trim();
  if (type === "asset") {
    return { type, value: t.replace(/^@+|@+$/g, "") };
  }
  if (type === "token" || type === "string") {
    return { type, value: unquote(t) };
  }
  if (type === "bool") {
    return { type, value: t === "1" || t === "true" };
  }
  const n = Number(t);
  return Number.isFinite(n) && t !== "" ? { type, value: n } : { type };
}

/**
 * LightUSD's flattened layer, from its JSON export, as records. Classes
 * (and what is under them) are left out, as a composed stage would.
 */
export function lightusdRecords(
  json: string,
  apiSchemas: (path: string) => readonly string[],
  errors: readonly string[] = [],
): StageRecord {
  const layer = JSON.parse(json) as JsonLayer;
  const metas = layer.metas ?? {};
  const prims: PrimRecord[] = [];
  const walk = (name: string, spec: JsonPrim, parent: string): void => {
    if (spec.specifier === "class") {
      return;
    }
    const path = `${parent}/${name}`;
    const attrs: Record<string, AttrRecord> = {};
    const rels: Record<string, string[]> = {};
    for (const [prop, p] of Object.entries(spec.properties ?? {})) {
      if (p.propertyType === "relationship") {
        rels[prop] = [...(p.relationTargets ?? [])];
        continue;
      }
      const a = p.attribute;
      const type = a?.typeName ?? "unknown";
      if (p.propertyType === "connection") {
        attrs[prop] = { type, connection: true };
      } else if (a?.hasValue && typeof a.value === "string") {
        attrs[prop] = attrFromUsda(type, a.value);
      }
    }
    prims.push({
      path,
      typeName: spec.typeName ?? "",
      apiSchemas: [...apiSchemas(path)],
      attrs,
      rels,
    });
    for (const [child, c] of Object.entries(spec.children ?? {})) {
      walk(child, c, path);
    }
  };
  for (const [name, spec] of Object.entries(layer.primSpecs ?? {})) {
    walk(name, spec, "");
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" && v !== "" ? v : null;
  return {
    upAxis: str(metas["upAxis"]),
    metersPerUnit:
      typeof metas["metersPerUnit"] === "number"
        ? metas["metersPerUnit"]
        : null,
    defaultPrim: str(metas["defaultPrim"]),
    prims,
    errors,
  };
}
