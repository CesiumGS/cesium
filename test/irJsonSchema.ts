// A small JSON Schema checker for the tests, so the format's schema is
// exercised without a validator dependency. It reads the subset the schema
// uses: $ref into $defs, type, const, enum, anyOf, oneOf, required,
// properties, additionalProperties (false only), items, minItems, maxItems,
// minimum, maximum, minLength, pattern and uniqueItems. A keyword it doesn't
// know throws, so the schema can't grow past what is checked.

type Schema = Record<string, unknown>;

const KNOWN = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "title",
  "description",
  "type",
  "const",
  "enum",
  "anyOf",
  "oneOf",
  "required",
  "properties",
  "additionalProperties",
  "items",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "minLength",
  "pattern",
  "uniqueItems",
]);

const typeOf = (v: unknown): string =>
  v === null
    ? "null"
    : Array.isArray(v)
      ? "array"
      : Number.isInteger(v)
        ? "integer"
        : typeof v;

const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** The errors of `value` against `schema` (the root, with its $defs), each with its path. */
export function validateSchema(schema: Schema, value: unknown): string[] {
  const errors: string[] = [];
  const resolve = (ref: string): Schema => {
    const name = /^#\/\$defs\/(.+)$/.exec(ref)?.[1];
    const found = name
      ? (schema.$defs as Record<string, Schema> | undefined)?.[name]
      : undefined;
    if (!found) {
      throw new Error(`can't resolve $ref '${ref}'`);
    }
    return found;
  };

  function check(s: Schema, v: unknown, path: string): string[] {
    const out: string[] = [];
    for (const key of Object.keys(s)) {
      if (!KNOWN.has(key)) {
        throw new Error(`the checker doesn't know the keyword '${key}'`);
      }
    }
    if (s.$ref !== undefined) {
      return check(resolve(s.$ref as string), v, path);
    }
    if (s.type !== undefined) {
      const t = typeOf(v);
      const ok = t === s.type || (s.type === "number" && t === "integer");
      if (!ok) {
        out.push(`${path}: expected ${String(s.type)}, got ${t}`);
        return out;
      }
    }
    if ("const" in s && !same(v, s.const)) {
      out.push(`${path}: expected ${JSON.stringify(s.const)}`);
    }
    if (s.enum && !(s.enum as unknown[]).some((e) => same(e, v))) {
      out.push(`${path}: ${JSON.stringify(v)} isn't one of the allowed values`);
    }
    if (s.anyOf) {
      const ok = (s.anyOf as Schema[]).some(
        (b) => check(b, v, path).length === 0,
      );
      if (!ok) {
        out.push(`${path}: matches none of the alternatives`);
      }
    }
    if (s.oneOf) {
      const matches = (s.oneOf as Schema[]).filter(
        (b) => check(b, v, path).length === 0,
      ).length;
      if (matches !== 1) {
        out.push(`${path}: matches ${matches} of the alternatives, not one`);
      }
    }
    if (typeof v === "number") {
      if (typeof s.minimum === "number" && v < s.minimum) {
        out.push(`${path}: below ${s.minimum}`);
      }
      if (typeof s.maximum === "number" && v > s.maximum) {
        out.push(`${path}: above ${s.maximum}`);
      }
    }
    if (typeof v === "string") {
      if (typeof s.minLength === "number" && v.length < s.minLength) {
        out.push(`${path}: shorter than ${s.minLength}`);
      }
      if (typeof s.pattern === "string" && !new RegExp(s.pattern).test(v)) {
        out.push(`${path}: doesn't match ${s.pattern}`);
      }
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === "number" && v.length < s.minItems) {
        out.push(`${path}: fewer than ${s.minItems} items`);
      }
      if (typeof s.maxItems === "number" && v.length > s.maxItems) {
        out.push(`${path}: more than ${s.maxItems} items`);
      }
      if (
        s.uniqueItems &&
        new Set(v.map((x) => JSON.stringify(x))).size !== v.length
      ) {
        out.push(`${path}: items repeat`);
      }
      if (s.items) {
        v.forEach((x, i) =>
          out.push(...check(s.items as Schema, x, `${path}/${i}`)),
        );
      }
    }
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      for (const key of (s.required as string[] | undefined) ?? []) {
        if (!(key in obj)) {
          out.push(`${path}: missing '${key}'`);
        }
      }
      const props = (s.properties as Record<string, Schema> | undefined) ?? {};
      for (const [key, x] of Object.entries(obj)) {
        if (props[key]) {
          out.push(...check(props[key], x, `${path}/${key}`));
        } else if (s.additionalProperties === false) {
          out.push(`${path}: unknown field '${key}'`);
        }
      }
    }
    return out;
  }

  errors.push(...check(schema, value, "$"));
  return errors;
}
