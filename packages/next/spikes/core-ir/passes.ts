// Spike (a): rates, literals to uniforms, and the versioned JSON form.

import {
  IR_VERSION,
  OPS,
  RATES,
  typeOf,
  type Eqn,
  type Id,
  type Input,
  type Program,
  type Rate,
  type TableDecl,
  type Type,
  type Value,
} from "./cir.ts";

/** Each equation's rate: the highest of its operands' (leaves: their own). */
export function rates(p: Program): Rate[] {
  const out: Rate[] = [];
  p.eqns.forEach((e, id) => {
    if (e.op === "input") {
      out[id] = p.inputs[e.index!]!.rate;
    } else if (e.args.length === 0) {
      out[id] = "uniform";
    } else {
      out[id] = e.args
        .map((a) => out[a]!)
        .reduce((x, y) => (RATES.indexOf(x) >= RATES.indexOf(y) ? x : y));
    }
  });
  return out;
}

export interface Hoisted {
  /** The program with each literal replaced by a uniform input `k<n>`. */
  readonly program: Program;
  /** The uniforms' values, in input order after the program's own inputs. */
  readonly values: Record<string, Value>;
  /** By literal slot: its uniform's name, for edits that change a value. */
  readonly slots: Record<string, string>;
  /**
   * The program's shape without its literal values: equal keys mean one
   * shader and one pipeline, and an edit that keeps the key is a uniform
   * write.
   */
  readonly key: string;
}

/** Literals become uniform inputs (owner's decision 8, 2026-11-13). */
export function hoistLiterals(p: Program): Hoisted {
  const inputs: Input[] = [...p.inputs];
  const values: Record<string, Value> = {};
  const slots: Record<string, string> = {};
  const eqns = p.eqns.map((e): Eqn => {
    if (e.op !== "literal") {
      return e;
    }
    const name = `k${Object.keys(values).length}`;
    inputs.push({ name, type: e.type, rate: "uniform" });
    values[name] = e.value!;
    slots[e.slot!] = name;
    return { op: "input", args: [], type: e.type, index: inputs.length - 1 };
  });
  const program: Program = { ...p, inputs, eqns };
  return { program, values, slots, key: shapeKey(program) };
}

/** The program as JSON with no literal values (uniform inputs keep only types). */
export function shapeKey(p: Program): string {
  return JSON.stringify([
    p.inputs.map((i) => [i.type, i.rate, i.rate === "uniform" ? "" : i.name]),
    p.eqns.map((e) => [
      e.op,
      e.type,
      e.args,
      e.index ?? null,
      e.table ?? null,
      e.op === "const" ? e.value : null,
    ]),
    (p.tables ?? []).map((t) => [t.name, t.columns, t.rows]),
    p.outputs.map((o) => o.id),
  ]);
}

// ---------------------------------------------------------------- JSON

/**
 * The interchange form. `version` names the IR's schema; `vocabulary`
 * names the op set the names come from; `extensions` lists the non-standard
 * ops used, so a reader refuses what it doesn't know before reading it.
 */
export interface ProgramJson {
  readonly version: string;
  readonly vocabulary: string;
  readonly extensions: readonly string[];
  readonly inputs: readonly Input[];
  readonly tables?: readonly TableDecl[];
  readonly eqns: readonly (readonly [
    string,
    Type,
    readonly Id[],
    Record<string, unknown>?,
  ])[];
  readonly outputs: Readonly<Record<string, Id>>;
}

export function toJson(p: Program): ProgramJson {
  return {
    version: p.version,
    vocabulary: "KHR_interactivity",
    extensions: [
      ...new Set(
        p.eqns.map((e) => e.op).filter((op) => op.startsWith("cesium/")),
      ),
    ],
    inputs: p.inputs,
    ...(p.tables ? { tables: p.tables } : {}),
    eqns: p.eqns.map((e) => {
      const extra: Record<string, unknown> = {};
      if (e.value !== undefined) {
        extra.value = e.value;
      }
      if (e.slot !== undefined) {
        extra.slot = e.slot;
      }
      if (e.index !== undefined) {
        extra.index = e.index;
      }
      if (e.table !== undefined) {
        extra.table = e.table;
      }
      return Object.keys(extra).length > 0
        ? [e.op, e.type, e.args, extra]
        : [e.op, e.type, e.args];
    }),
    outputs: Object.fromEntries(p.outputs.map((o) => [o.name, o.id])),
  };
}

const SUPPORTED_MAJOR = IR_VERSION.split("/")[1]!.split(".")[0]!;

/**
 * Reads and checks the JSON form: a known major version, known ops and
 * extensions, operands before use, and every type re-derived.
 */
export function fromJson(json: ProgramJson): Program {
  const [name, ver] = json.version.split("/");
  if (name !== "cesium-ir" || ver?.split(".")[0] !== SUPPORTED_MAJOR) {
    throw new Error(`unsupported IR version '${json.version}'`);
  }
  for (const ext of json.extensions) {
    if (!OPS[ext]) {
      throw new Error(`unknown extension op '${ext}'`);
    }
  }
  const eqns: Eqn[] = json.eqns.map(([op, type, args, extra], id) => {
    if (!OPS[op]) {
      throw new Error(`eqn ${id}: unknown op '${op}'`);
    }
    if (op.startsWith("cesium/") && !json.extensions.includes(op)) {
      throw new Error(`eqn ${id}: '${op}' isn't in extensions`);
    }
    if (args.some((a) => !Number.isInteger(a) || a < 0 || a >= id)) {
      throw new Error(`eqn ${id}: an operand isn't an earlier equation`);
    }
    const e: Eqn = { op, type, args, ...(extra ?? {}) };
    return e;
  });
  eqns.forEach((e, id) => {
    if (e.args.length === 0) {
      if (e.op === "input" && json.inputs[e.index!]?.type !== e.type) {
        throw new Error(`eqn ${id}: input type differs from its declaration`);
      }
      return;
    }
    const derived = typeOf(
      e.op,
      e.args.map((a) => eqns[a]!.type),
      e.index,
    );
    if (derived !== e.type) {
      throw new Error(
        `eqn ${id}: type ${e.type}, but ${e.op} gives ${derived}`,
      );
    }
  });
  const outputs = Object.entries(json.outputs).map(([n, id]) => {
    if (!eqns[id]) {
      throw new Error(`output '${n}' isn't an equation`);
    }
    return { name: n, id };
  });
  const tables = json.tables ?? [];
  eqns.forEach((e, id) => {
    if (e.table !== undefined) {
      const t = tables.find((x) => x.name === e.table);
      if (!t || e.index === undefined || e.index >= t.columns.length) {
        throw new Error(`eqn ${id}: no table column ${e.table}[${e.index}]`);
      }
    }
  });
  return {
    version: json.version,
    inputs: json.inputs,
    ...(json.tables ? { tables: json.tables } : {}),
    eqns,
    outputs,
  };
}
