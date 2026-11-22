// Cesium IR's JSON form, `cesium-ir/<major>.<minor>`: the normative
// interchange. The writer turns a program into a plain document; the checking
// reader turns a document (or its text) back into a program, or refuses it
// with an error that names the equation and the reason. The rules are in
// `FORMAT.md`; the schema (`cesium-ir-0.1.schema.json`) checks the shape.
//
// The reader never trusts the file. It checks that the version's major is
// its own, that every extension op is listed (and known), that every operand
// refers to an earlier equation, and it re-derives every type from the
// operands and refuses a mismatch with the declared one. What it returns is
// a program the builder and every pass can take as it is.

import { EXTENSIONS, type ExtensionTable } from "./extensions.ts";
import { OPS, typeOf, typeOfValue } from "./ops.ts";
import {
  IR_VERSION,
  RATES,
  VOCABULARY,
  type Eqn,
  type Id,
  type Input,
  type Program,
  type Rate,
  type Type,
  type Value,
} from "./types.ts";

const FORMAT_NAME = "cesium-ir";
const splitVersion = (v: string): [number, number] =>
  v
    .slice(FORMAT_NAME.length + 1)
    .split(".")
    .map(Number) as [number, number];

const TYPES: readonly Type[] = [
  "bool",
  "int",
  "float",
  "float2",
  "float3",
  "float4",
];
const LEAVES: ReadonlySet<string> = new Set(["input", "const", "literal"]);

/** A float64 as JSON holds it: finite numbers as they are, the rest as text. */
export type JsonNumber = number | "-0" | "NaN" | "Infinity" | "-Infinity";
export type JsonValue = boolean | JsonNumber | readonly JsonNumber[];

export interface JsonEquation {
  readonly op: string;
  /** Absent on `input`, `const` and `literal`. */
  readonly args?: readonly number[];
  readonly type: Type;
  readonly value?: JsonValue;
  readonly slot?: string;
  readonly index?: number;
}

export interface CirDocument {
  /** `cesium-ir/<major>.<minor>`. */
  readonly format: string;
  /** The name of the vocabulary the ops come from. */
  readonly vocabulary: string;
  /** The `cesium/` extension ops the equations use, sorted. */
  readonly extensions: readonly string[];
  readonly inputs: readonly Input[];
  readonly equations: readonly JsonEquation[];
  readonly outputs: readonly { readonly name: string; readonly id: number }[];
}

/** A file or a program the format refuses. `equation` is set when one is to blame. */
export class IrFormatError extends Error {
  readonly reason: string;
  readonly equation: number | undefined;
  readonly op: string | undefined;

  constructor(reason: string, equation?: number, op?: string) {
    const where =
      equation === undefined
        ? ""
        : `equation ${equation}${op === undefined ? "" : ` (${op})`}: `;
    super(`${FORMAT_NAME}: ${where}${reason}`);
    this.name = "IrFormatError";
    this.reason = reason;
    this.equation = equation;
    this.op = op;
  }
}

export interface FormatOptions {
  /** The extension ops to write and read. Default: what this build knows. */
  readonly extensions?: ExtensionTable;
  /**
   * The version the reader reads as. Default: `IR_VERSION`. It exists to test
   * the rules that apply from 1.0, which no build reads as yet.
   */
  readonly readsVersion?: string;
}

const encodeNumber = (x: number): JsonNumber =>
  Object.is(x, -0)
    ? "-0"
    : Number.isNaN(x)
      ? "NaN"
      : x === Infinity
        ? "Infinity"
        : x === -Infinity
          ? "-Infinity"
          : x;

function encodeValue(v: Value): JsonValue {
  if (typeof v === "boolean") {
    return v;
  }
  return typeof v === "number" ? encodeNumber(v) : v.map(encodeNumber);
}

/** `p` as a document. Refuses a program of another version or with an op it can't name. */
export function programToDocument(
  p: Program,
  options: FormatOptions = {},
): CirDocument {
  const table = options.extensions ?? EXTENSIONS;
  if (p.version !== IR_VERSION) {
    throw new IrFormatError(
      `can't write a program of version '${p.version}'; this writer writes '${IR_VERSION}'`,
    );
  }
  const used = new Set<string>();
  const equations = p.eqns.map((e, id): JsonEquation => {
    if (!LEAVES.has(e.op) && !OPS[e.op]) {
      if (!table[e.op]) {
        throw new IrFormatError(
          `op '${e.op}' is neither in ${VOCABULARY} nor a known extension`,
          id,
          e.op,
        );
      }
      used.add(e.op);
    }
    return {
      op: e.op,
      ...(LEAVES.has(e.op) ? {} : { args: [...e.args] }),
      type: e.type,
      ...(e.value === undefined ? {} : { value: encodeValue(e.value) }),
      ...(e.slot === undefined ? {} : { slot: e.slot }),
      ...(e.index === undefined ? {} : { index: e.index }),
    };
  });
  return {
    format: IR_VERSION,
    vocabulary: VOCABULARY,
    extensions: [...used].sort(),
    inputs: p.inputs.map(({ name, type, rate }) => ({ name, type, rate })),
    equations,
    outputs: p.outputs.map(({ name, id }) => ({ name, id })),
  };
}

/** `p` as JSON text, compact. */
export function writeProgram(p: Program, options?: FormatOptions): string {
  return JSON.stringify(programToDocument(p, options));
}

/** JSON text as a program, refusing what the format doesn't allow. */
export function readProgram(text: string, options?: FormatOptions): Program {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (error) {
    throw new IrFormatError(`isn't valid JSON (${(error as Error).message})`);
  }
  return programFromDocument(doc, options);
}

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

function decodeNumber(x: unknown): number | undefined {
  if (typeof x === "number") {
    return Number.isFinite(x) ? x : undefined;
  }
  switch (x) {
    case "-0":
      return -0;
    case "NaN":
      return NaN;
    case "Infinity":
      return Infinity;
    case "-Infinity":
      return -Infinity;
    default:
      return undefined;
  }
}

function decodeValue(x: unknown): Value | undefined {
  if (typeof x === "boolean") {
    return x;
  }
  if (Array.isArray(x)) {
    const lanes = x.map(decodeNumber);
    return lanes.length >= 2 &&
      lanes.length <= 4 &&
      lanes.every((l) => l !== undefined)
      ? lanes
      : undefined;
  }
  return decodeNumber(x);
}

/**
 * A document as a program. `doc` is untrusted. A file whose minor version is
 * newer than this reader's is read by what this reader knows: fields it
 * doesn't know are optional by the versioning rules, so it ignores them; an
 * op it doesn't know is refused.
 */
export function programFromDocument(
  doc: unknown,
  options: FormatOptions = {},
): Program {
  const table = options.extensions ?? EXTENSIONS;
  if (!isObject(doc)) {
    throw new IrFormatError("a file is a JSON object");
  }
  const format = doc.format;
  if (typeof format !== "string") {
    throw new IrFormatError("the file has no 'format' text");
  }
  const m = /^cesium-ir\/(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(format);
  if (!m) {
    throw new IrFormatError(
      `format '${format}' isn't 'cesium-ir/<major>.<minor>'`,
    );
  }
  const [major, minor] = [Number(m[1]), Number(m[2])];
  const readsVersion = options.readsVersion ?? IR_VERSION;
  const [FORMAT_MAJOR, FORMAT_MINOR] = splitVersion(readsVersion);
  // Experimental: any 0.x release may change the format, so a reader reads
  // exactly its own 0.x version, and refuses every other, older or newer.
  if (FORMAT_MAJOR === 0 && format !== readsVersion) {
    throw new IrFormatError(
      `unknown version '${format}'; this reader reads '${readsVersion}' only (0.x is experimental: any 0.x release may change the format)`,
    );
  }
  if (major !== FORMAT_MAJOR) {
    throw new IrFormatError(
      `unknown major version ${major} (format '${format}'); this reader reads major version ${FORMAT_MAJOR}`,
    );
  }
  // A newer minor may add optional fields; an equal or older one may not.
  const strict = minor <= FORMAT_MINOR;
  const unknownField = (
    obj: Record<string, unknown>,
    allowed: readonly string[],
    what: string,
    equation?: number,
    op?: string,
  ) => {
    const extra = Object.keys(obj).find((k) => !allowed.includes(k));
    if (strict && extra !== undefined) {
      throw new IrFormatError(
        `unknown field '${extra}' on ${what}`,
        equation,
        op,
      );
    }
  };

  unknownField(
    doc,
    ["format", "vocabulary", "extensions", "inputs", "equations", "outputs"],
    "the file",
  );
  if (doc.vocabulary !== VOCABULARY) {
    throw new IrFormatError(
      `vocabulary '${String(doc.vocabulary)}' isn't '${VOCABULARY}'`,
    );
  }

  const listed = new Set<string>();
  if (!Array.isArray(doc.extensions)) {
    throw new IrFormatError("'extensions' is a list of extension op names");
  }
  for (const name of doc.extensions as unknown[]) {
    if (typeof name !== "string" || !name.startsWith("cesium/")) {
      throw new IrFormatError(
        `extension ${JSON.stringify(name)} isn't a name starting 'cesium/'`,
      );
    }
    if (!table[name]) {
      throw new IrFormatError(
        `extension '${name}' isn't known to this reader (it reads ${readsVersion})`,
      );
    }
    listed.add(name);
  }

  if (!Array.isArray(doc.inputs)) {
    throw new IrFormatError("'inputs' is a list");
  }
  const inputs: Input[] = [];
  for (const [i, raw] of (doc.inputs as unknown[]).entries()) {
    if (
      !isObject(raw) ||
      typeof raw.name !== "string" ||
      raw.name === "" ||
      !TYPES.includes(raw.type as Type) ||
      !RATES.includes(raw.rate as Rate)
    ) {
      throw new IrFormatError(
        `input ${i} needs a name, a type (${TYPES.join(", ")}) and a rate (${RATES.join(", ")})`,
      );
    }
    unknownField(raw, ["name", "type", "rate"], `input ${i}`);
    if (inputs.some((x) => x.name === raw.name)) {
      throw new IrFormatError(`input '${raw.name}' is declared twice`);
    }
    inputs.push({
      name: raw.name,
      type: raw.type as Type,
      rate: raw.rate as Rate,
    });
  }

  if (!Array.isArray(doc.equations)) {
    throw new IrFormatError("'equations' is a list");
  }
  const eqns: Eqn[] = [];
  const slotAt = new Map<string, Id>();
  for (const [id, raw] of (doc.equations as unknown[]).entries()) {
    if (!isObject(raw) || typeof raw.op !== "string") {
      throw new IrFormatError("an equation is an object with an 'op'", id);
    }
    const op = raw.op;
    const refuse = (reason: string) => new IrFormatError(reason, id, op);
    const isLeaf = LEAVES.has(op);
    if (!isLeaf && !OPS[op]) {
      if (!op.startsWith("cesium/")) {
        throw refuse(
          `unknown op: it isn't in ${VOCABULARY} and doesn't start with 'cesium/'`,
        );
      }
      if (!listed.has(op)) {
        throw refuse(`extension op isn't listed in 'extensions'`);
      }
    }
    const isExtract = op.startsWith("math/extract");
    unknownField(
      raw,
      [
        "op",
        "type",
        ...(isLeaf ? [] : ["args"]),
        ...(op === "const" || op === "literal" ? ["value"] : []),
        ...(op === "literal" ? ["slot"] : []),
        ...(op === "input" || isExtract ? ["index"] : []),
      ],
      `${op}`,
      id,
      op,
    );

    const declared = raw.type as Type;
    if (!TYPES.includes(declared)) {
      throw refuse(`needs a 'type' (${TYPES.join(", ")})`);
    }

    // Operands: earlier equations only.
    let args: Id[] = [];
    if (!isLeaf) {
      if (!Array.isArray(raw.args)) {
        throw refuse("needs 'args', a list of equation numbers");
      }
      args = (raw.args as unknown[]).map((a, k) => {
        if (!Number.isInteger(a) || (a as number) < 0) {
          throw refuse(`operand ${k} isn't an equation number`);
        }
        if ((a as number) >= id) {
          throw refuse(
            `operand ${k} refers to equation ${a as number}, which doesn't come before it (a forward reference)`,
          );
        }
        return a as number;
      });
    }

    // The type the operands give.
    let derived: Type;
    let what = (t: Type) => `its operands give ${t}`;
    let value: Value | undefined;
    let slot: string | undefined;
    let index: number | undefined;
    if (raw.index !== undefined) {
      if (!Number.isInteger(raw.index) || (raw.index as number) < 0) {
        throw refuse(`'index' isn't a whole number from 0`);
      }
      index = raw.index as number;
    }
    if (op === "input") {
      if (index === undefined || index >= inputs.length) {
        throw refuse(
          `needs an 'index' of an input (the file has ${inputs.length} inputs)`,
        );
      }
      derived = inputs[index!]!.type;
      const name = inputs[index!]!.name;
      what = (t) => `input '${name}' is ${t}`;
    } else if (op === "const" || op === "literal") {
      value = decodeValue(raw.value);
      if (value === undefined) {
        throw refuse(
          "needs a 'value': a boolean, a number, or 2 to 4 numbers (-0, NaN, Infinity and -Infinity are text)",
        );
      }
      derived = typeOfValue(value!);
      what = (t) => `its value is ${t}`;
      if (op === "literal") {
        if (typeof raw.slot !== "string" || raw.slot === "") {
          throw refuse("a literal needs a 'slot', its place in the source");
        }
        slot = raw.slot as string;
        const first = slotAt.get(slot);
        if (first !== undefined) {
          throw refuse(
            `literal slot '${slot}' is already on equation ${first}`,
          );
        }
        slotAt.set(slot, id);
      }
    } else {
      const operandTypes = args.map((a) => eqns[a]!.type);
      try {
        derived = OPS[op]
          ? typeOf(op, operandTypes, index)
          : table[op]!.typeOf(operandTypes, index);
      } catch (error) {
        throw refuse((error as Error).message);
      }
    }
    if (derived !== declared) {
      throw refuse(`declared ${declared}, but ${what(derived)}`);
    }

    // The key order is the builder's, so a read program has the same shape key.
    eqns.push({
      op,
      args,
      type: declared,
      ...(value === undefined ? {} : { value }),
      ...(slot === undefined ? {} : { slot }),
      ...(index === undefined ? {} : { index }),
    });
  }

  if (!Array.isArray(doc.outputs)) {
    throw new IrFormatError("'outputs' is a list");
  }
  const outputs: { name: string; id: Id }[] = [];
  for (const [i, raw] of (doc.outputs as unknown[]).entries()) {
    if (!isObject(raw) || typeof raw.name !== "string" || raw.name === "") {
      throw new IrFormatError(`output ${i} needs a name and an equation 'id'`);
    }
    unknownField(raw, ["name", "id"], `output '${raw.name}'`);
    if (
      !Number.isInteger(raw.id) ||
      (raw.id as number) < 0 ||
      (raw.id as number) >= eqns.length
    ) {
      throw new IrFormatError(
        `output '${raw.name}' refers to equation ${JSON.stringify(raw.id)}, which doesn't exist (the file has ${eqns.length})`,
      );
    }
    if (outputs.some((o) => o.name === raw.name)) {
      throw new IrFormatError(`output '${raw.name}' is declared twice`);
    }
    outputs.push({ name: raw.name, id: raw.id as number });
  }

  return { version: IR_VERSION, inputs, eqns, outputs };
}
