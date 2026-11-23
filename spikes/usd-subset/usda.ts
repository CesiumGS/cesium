// A reader for USDA, OpenUSD's text layer format, into the same specs as the
// USDC reader. It covers layer and prim metadata, prims with their
// specifiers, types and list-edited metadata, variant sets, attributes with
// default values, connections and time samples, and relationships. It keeps
// what it doesn't understand as `undecoded`, by name, rather than failing.
// Spike code for CS-833 and CS-843; not part of @cesium/next.

import { Budget, MAX_FIELD_NAME, MAX_PATH } from "./budget.ts";
import type { Layer, ListOp, Spec, SpecType, Value } from "./layer.ts";

type Tok =
  | { t: "str"; v: string }
  | { t: "asset"; v: string }
  | { t: "path"; v: string }
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "p"; v: string };

const PUNCT = new Set(["(", ")", "{", "}", "[", "]", "=", ",", ";", ":"]);
/** The deepest nesting of values (lists, tuples, dictionaries) the parser follows. */
const MAX_VALUE_DEPTH = 64;
/** The deepest nesting of prims and variants the parser follows: more than the composer descends into. */
const MAX_PRIM_DEPTH = 1024;

/** The tokens of a USDA text, each charged to the budget: two units, and one per 16 characters. */
function tokenize(text: string, budget: Budget): Tok[] {
  const raw: Tok[] = [];
  const out = {
    push(t: Tok): void {
      // Two units: every token of a layer is held until it's parsed.
      budget.charge(2 + (typeof t.v === "string" ? t.v.length >>> 4 : 0));
      raw.push(t);
    },
  };
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i]!;
    if (ch === "#") {
      while (i < n && text[i] !== "\n") {
        i++;
      }
      continue;
    }
    if (ch <= " ") {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const triple = text.startsWith(ch.repeat(3), i);
      const q = triple ? ch.repeat(3) : ch;
      i += q.length;
      let s = "";
      while (i < n && !text.startsWith(q, i)) {
        if (text[i] === "\\" && i + 1 < n) {
          const e = text[i + 1]!;
          s += e === "n" ? "\n" : e === "t" ? "\t" : e;
          i += 2;
        } else {
          s += text[i++];
        }
      }
      i += q.length;
      out.push({ t: "str", v: s });
      continue;
    }
    if (ch === "@") {
      const triple = text.startsWith("@@@", i);
      const q = triple ? "@@@" : "@";
      const end = text.indexOf(q, i + q.length);
      if (end < 0) {
        throw new Error("usda: unterminated asset path");
      }
      out.push({ t: "asset", v: text.slice(i + q.length, end) });
      i = end + q.length;
      continue;
    }
    if (ch === "<") {
      const end = text.indexOf(">", i);
      if (end < 0) {
        throw new Error("usda: unterminated path");
      }
      out.push({ t: "path", v: text.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (PUNCT.has(ch)) {
      out.push({ t: "p", v: ch });
      i++;
      continue;
    }
    const numMatch = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(
      text.slice(i, i + 64),
    );
    if (numMatch && (ch !== "-" || /[\d.]/.test(text[i + 1] ?? ""))) {
      out.push({ t: "num", v: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    const idMatch = /^[A-Za-z_][\w:.[\]]*/.exec(text.slice(i, i + 256));
    if (idMatch) {
      let id = idMatch[0];
      // "float3[]" keeps its brackets; a trailing "[" that opens a list doesn't.
      while (id.endsWith("[") || (id.endsWith("]") && !id.endsWith("[]"))) {
        id = id.slice(0, -1);
      }
      if (id === "inf" || id === "nan") {
        out.push({ t: "num", v: id === "inf" ? Infinity : NaN });
      } else {
        out.push({ t: "id", v: id });
      }
      i += id.length;
      continue;
    }
    if (ch === "-" && text.startsWith("-inf", i)) {
      out.push({ t: "num", v: -Infinity });
      i += 4;
      continue;
    }
    throw new Error(`usda: unexpected "${ch}" at ${i}`);
  }
  return raw;
}

const LIST_OPS = new Set(["prepend", "append", "add", "delete", "reorder"]);
const SPECIFIERS = new Set(["def", "over", "class"]);
/** Metadata keys whose USDA names differ from Sdf's field names. */
const FIELD_NAMES: Record<string, string> = {
  doc: "documentation",
  inherits: "inheritPaths",
  variants: "variantSelection",
  variantSets: "variantSetNames",
  rel: "targetPaths",
};

const TUPLES: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
};

/** Components per element from a type name: float3 3, matrix4d 16, quatf 4, texCoord2f 2. */
function tupleOf(type: string): number {
  const base = type.replace(/\[\]$/, "");
  const m = /^matrix(\d)d$/.exec(base);
  if (m) {
    return Number(m[1]) ** 2;
  }
  if (base.startsWith("quat")) {
    return 4;
  }
  const d = /(\d)[dfhi]$/.exec(base);
  return d ? (TUPLES[d[1]!] ?? 1) : 1;
}

function flatten(v: Value, out: number[]): boolean {
  if (typeof v === "number") {
    out.push(v);
    return true;
  }
  if (Array.isArray(v)) {
    return (v as Value[]).every((x) => flatten(x, out));
  }
  return false;
}

class Parser {
  readonly toks: Tok[];
  readonly budget: Budget;
  i = 0;
  /** How deep the parser is in values, and in prims and variants. */
  valueDepth = 0;
  primDepth = 0;
  /** Inside a reference or payload field, where a bare path is an internal arc. */
  inArcs = false;
  readonly specs = new Map<string, Spec>();
  readonly undecoded = new Map<string, number>();
  constructor(toks: Tok[], budget: Budget) {
    this.toks = toks;
    this.budget = budget;
  }

  peek(k = 0): Tok | undefined {
    return this.toks[this.i + k];
  }
  next(): Tok {
    const t = this.toks[this.i++];
    if (!t) {
      throw new Error("usda: unexpected end");
    }
    return t;
  }
  isP(v: string, k = 0): boolean {
    const t = this.peek(k);
    return t?.t === "p" && t.v === v;
  }
  isId(v: string, k = 0): boolean {
    const t = this.peek(k);
    return t?.t === "id" && t.v === v;
  }
  expectP(v: string): void {
    const t = this.next();
    if (t.t !== "p" || t.v !== v) {
      throw new Error(
        `usda: expected "${v}", got ${t.t} "${String(t.v)}" near token ${this.i}`,
      );
    }
  }
  str(): string {
    const t = this.next();
    if (t.t !== "str") {
      throw new Error(`usda: expected a string, got ${t.t}`);
    }
    return t.v;
  }
  skipUndecoded(type: string): Value {
    this.undecoded.set(type, (this.undecoded.get(type) ?? 0) + 1);
    return { kind: "undecoded", type };
  }

  /** A dictionary key, refused past MAX_PATH: it becomes a property name, which V8 hashes. */
  key(name: string): string {
    if (name.length > MAX_PATH) {
      throw new Error(`usda: a key longer than ${MAX_PATH} characters`);
    }
    return name;
  }

  spec(path: string, type: SpecType): Spec {
    if (path.length > MAX_PATH) {
      throw new Error(`usda: a path longer than ${MAX_PATH} characters`);
    }
    // Paths grow with nesting: a long name repeated down a deep namespace is charged by length.
    this.budget.text(path);
    let s = this.specs.get(path);
    if (!s) {
      this.budget.keep();
      s = { type, fields: new Map() };
      this.specs.set(path, s);
    }
    return s;
  }

  /** A value: number, string, token, asset (with an optional prim path: an arc), path, list, tuple or dictionary. */
  value(): Value {
    const t = this.next();
    switch (t.t) {
      case "num":
      case "str":
        return t.v;
      case "path":
        // In a reference or payload, a bare path is an internal arc: </A>.
        return this.inArcs
          ? this.arcTail({ kind: "arc", asset: "", primPath: t.v })
          : t.v;
      case "asset": {
        const p = this.peek();
        if (p?.t === "path") {
          this.i++;
          return this.arcTail({ kind: "arc", asset: t.v, primPath: p.v });
        }
        return t.v;
      }
      case "id":
        if (t.v === "true") {
          return true;
        }
        if (t.v === "false") {
          return false;
        }
        if (t.v === "None") {
          return null;
        }
        return t.v;
      case "p":
        if (t.v === "[") {
          return this.seq("]");
        }
        if (t.v === "(") {
          return this.seq(")");
        }
        if (t.v === "{") {
          return this.dict();
        }
    }
    throw new Error(`usda: unexpected ${t.t} "${String(t.v)}" in a value`);
  }
  /** A reference may carry a layer offset or custom data in parentheses; the reader steps over them. */
  arcTail(arc: Value): Value {
    if (this.isP("(")) {
      this.skipBalanced();
    }
    return arc;
  }
  /** Guards the parser's recursion: a hostile file can nest without end. */
  deeper(): void {
    if (++this.valueDepth > MAX_VALUE_DEPTH) {
      throw new Error(`usda: values nested deeper than ${MAX_VALUE_DEPTH}`);
    }
  }
  seq(close: string): Value[] {
    this.deeper();
    const out: Value[] = [];
    while (!this.isP(close)) {
      out.push(this.value());
      if (this.isP(",")) {
        this.i++;
      }
    }
    this.i++;
    this.valueDepth--;
    return out;
  }
  dict(): Value {
    this.deeper();
    const out: Record<string, Value> = {};
    while (!this.isP("}")) {
      // `type key = value`, or `key: value` in time samples.
      const first = this.next();
      if (this.isP(":")) {
        this.i++;
        out[this.key(String(first.v))] = this.value();
      } else {
        const key = this.next();
        const name = key.t === "str" || key.t === "id" ? key.v : String(key.v);
        this.expectP("=");
        out[this.key(name)] = this.value();
      }
      if (this.isP(",") || this.isP(";")) {
        this.i++;
      }
    }
    this.i++;
    this.valueDepth--;
    return out;
  }
  skipBalanced(): void {
    let depth = 0;
    do {
      const t = this.next();
      if (t.t === "p" && (t.v === "(" || t.v === "[" || t.v === "{")) {
        depth++;
      }
      if (t.t === "p" && (t.v === ")" || t.v === "]" || t.v === "}")) {
        depth--;
      }
    } while (depth > 0);
  }

  /** `( key = value ... )` into a spec's fields, with list ops. */
  metadata(spec: Spec): void {
    this.expectP("(");
    while (!this.isP(")")) {
      if (this.peek()?.t === "str") {
        spec.fields.set("documentation", this.str());
        continue;
      }
      let op: string | undefined;
      if (
        this.peek()?.t === "id" &&
        LIST_OPS.has(String(this.peek()?.v)) &&
        this.peek(1)?.t === "id"
      ) {
        op = String(this.next().v);
      }
      const key = String(this.next().v);
      if (key.length > MAX_FIELD_NAME) {
        throw new Error(
          `usda: a metadata name longer than ${MAX_FIELD_NAME} characters`,
        );
      }
      if (!this.isP("=")) {
        continue;
      } // A bare key: no value.
      this.i++;
      const field = FIELD_NAMES[key] ?? key;
      this.inArcs = field === "references" || field === "payload";
      const v = this.value();
      this.inArcs = false;
      if (op === "reorder") {
        continue;
      }
      spec.fields.set(field, this.withOp(spec.fields.get(field), op, v, field));
      if (this.isP(";")) {
        this.i++;
      }
    }
    this.i++;
  }

  /** Arcs are list ops in Sdf; a bare value is explicit. */
  withOp(
    prev: Value | undefined,
    op: string | undefined,
    v: Value,
    field: string,
  ): Value {
    const listy = [
      "apiSchemas",
      "references",
      "payload",
      "inheritPaths",
      "specializes",
      "variantSetNames",
      "subLayers",
      "targetPaths",
      "connectionPaths",
    ].includes(field);
    if (!listy) {
      return v;
    }
    const items = Array.isArray(v) ? (v as Value[]) : v === null ? [] : [v];
    const base: { -readonly [K in keyof ListOp]: ListOp[K] } =
      typeof prev === "object" &&
      prev !== null &&
      "kind" in prev &&
      prev.kind === "listOp"
        ? { ...(prev as ListOp) }
        : { kind: "listOp" };
    if (op === "prepend") {
      base.prepended = items;
    } else if (op === "append") {
      base.appended = items;
    } else if (op === "add") {
      base.added = items;
    } else if (op === "delete") {
      base.deleted = items;
    } else {
      base.explicit = items;
    }
    return base;
  }

  layer(): void {
    const root = this.spec("/", "pseudoRoot");
    if (this.isP("(")) {
      this.metadata(root);
    }
    while (this.peek()) {
      this.prim("/");
    }
  }

  childPath(parent: string, name: string): string {
    if (parent === "/") {
      return `/${name}`;
    }
    return parent.endsWith("}") ? parent + name : `${parent}/${name}`;
  }

  prim(parentPath: string): void {
    const spec0 = this.next();
    if (spec0.t !== "id" || !SPECIFIERS.has(spec0.v)) {
      throw new Error(
        `usda: expected def, over or class, got "${String(spec0.v)}"`,
      );
    }
    let typeName: string | undefined;
    if (this.peek()?.t === "id") {
      typeName = String(this.next().v);
    }
    const name = this.str();
    const path = this.childPath(parentPath, name);
    const spec = this.spec(path, "prim");
    spec.fields.set("specifier", spec0.v);
    if (typeName) {
      spec.fields.set("typeName", typeName);
    }
    if (this.isP("(")) {
      this.metadata(spec);
    }
    this.expectP("{");
    this.body(path);
    this.expectP("}");
  }

  body(path: string): void {
    if (++this.primDepth > MAX_PRIM_DEPTH) {
      throw new Error(`usda: prims nested deeper than ${MAX_PRIM_DEPTH}`);
    }
    while (!this.isP("}")) {
      const t = this.peek();
      if (!t) {
        throw new Error("usda: unterminated prim");
      }
      if (t.t === "id" && SPECIFIERS.has(t.v)) {
        this.prim(path);
        continue;
      }
      if (this.isId("variantSet")) {
        this.variantSet(path);
        continue;
      }
      if (this.isId("reorder")) {
        // `reorder nameChildren = [...]` or `reorder properties = [...]`.
        this.i += 2;
        this.expectP("=");
        this.value();
        continue;
      }
      this.property(path);
    }
    this.primDepth--;
  }

  variantSet(path: string): void {
    this.i++; // variantSet
    const setName = this.str();
    this.expectP("=");
    this.expectP("{");
    this.spec(`${path}{${setName}=}`, "variantSet");
    while (!this.isP("}")) {
      const sel = this.str();
      const vpath = `${path}{${setName}=${sel}}`;
      const vspec = this.spec(vpath, "variant");
      if (this.isP("(")) {
        this.metadata(vspec);
      }
      this.expectP("{");
      this.body(vpath);
      this.expectP("}");
    }
    this.i++;
  }

  property(path: string): void {
    let op: string | undefined;
    if (this.peek()?.t === "id" && LIST_OPS.has(String(this.peek()?.v))) {
      op = String(this.next().v);
    }
    let custom = false;
    let variability: string | undefined;
    for (;;) {
      if (this.isId("custom")) {
        custom = true;
        this.i++;
      } else if (
        this.isId("uniform") ||
        this.isId("varying") ||
        this.isId("config")
      ) {
        variability = String(this.next().v);
      } else {
        break;
      }
    }
    const typeTok = this.next();
    if (typeTok.t !== "id") {
      throw new Error(
        `usda: expected a property type, got ${typeTok.t} "${String(typeTok.v)}"`,
      );
    }
    const nameTok = this.next();
    const rawName = String(nameTok.v);
    if (typeTok.v === "rel") {
      const spec = this.spec(`${path}.${rawName}`, "relationship");
      if (custom) {
        spec.fields.set("custom", true);
      }
      if (this.isP("=")) {
        this.i++;
        const v = this.value();
        spec.fields.set(
          "targetPaths",
          this.withOp(spec.fields.get("targetPaths"), op, v, "targetPaths"),
        );
      }
      if (this.isP("(")) {
        this.metadata(spec);
      }
      return;
    }
    // Suffixes: name.connect, name.timeSamples, name.spline.
    const suffix = /\.(connect|timeSamples|spline)$/.exec(rawName);
    const name = suffix ? rawName.slice(0, -suffix[0].length) : rawName;
    const spec = this.spec(`${path}.${name}`, "attribute");
    spec.fields.set("typeName", typeTok.v);
    if (custom) {
      spec.fields.set("custom", true);
    }
    if (variability) {
      spec.fields.set("variability", variability);
    }
    if (!this.isP("=")) {
      if (this.isP("(")) {
        this.metadata(spec);
      }
      return;
    }
    this.i++;
    if (suffix?.[1] === "connect") {
      const v = this.value();
      spec.fields.set(
        "connectionPaths",
        this.withOp(
          spec.fields.get("connectionPaths"),
          op,
          v,
          "connectionPaths",
        ),
      );
    } else if (suffix) {
      this.value();
      spec.fields.set(suffix[1]!, this.skipUndecoded(suffix[1]!));
    } else {
      spec.fields.set("default", this.typed(typeTok.v, this.value()));
    }
    if (this.isP("(")) {
      this.metadata(spec);
    }
  }

  /** Numeric arrays become flat typed arrays, as the USDC reader gives them. */
  typed(type: string, v: Value): Value {
    if (!type.endsWith("[]") || !Array.isArray(v)) {
      return v;
    }
    const base = type.slice(0, -2);
    if (["token", "string", "asset", "bool"].includes(base)) {
      return v;
    }
    const flat: number[] = [];
    if (!flatten(v, flat)) {
      return v;
    }
    const tuple = tupleOf(type);
    const isInt = /^(int|uint|uchar|int64|uint64)\d?$/.test(base);
    return {
      kind: "array",
      type: base,
      tuple,
      data: isInt ? Int32Array.from(flat) : Float64Array.from(flat),
    };
  }
}

export function isUsda(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.subarray(0, 5)) === "#usda";
}

export function readUsda(bytes: Uint8Array, budget = new Budget()): Layer {
  const text = new TextDecoder().decode(bytes);
  const p = new Parser(tokenize(text, budget), budget);
  p.layer();
  return { format: "usda", specs: p.specs, undecoded: p.undecoded };
}
