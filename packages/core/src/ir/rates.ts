// Rates, and the passes that read them: literals to uniforms, and constant
// hoisting by rate. An equation's rate is the highest of its operands'
// (uniform < feature < vertex < fragment); a leaf's is its input's, and a
// constant's or a literal's is uniform. An equation at the uniform rate that
// isn't a leaf is the same for every feature, vertex and fragment, so it is
// evaluated once, on the CPU, in float64, and the GPU reads it as a uniform.

import { Builder, shapeKey } from "./builder.ts";
import { evaluate } from "./evaluate.ts";
import {
  RATES,
  type Eqn,
  type Id,
  type Program,
  type Rate,
  type Value,
} from "./types.ts";

/** Each equation's rate, in program order. */
export function rates(p: Program): Rate[] {
  const out: Rate[] = new Array(p.eqns.length);
  const rank = (r: Rate) => RATES.indexOf(r);
  p.eqns.forEach((e, id) => {
    if (e.op === "input") {
      out[id] = p.inputs[e.index!]!.rate;
      return;
    }
    let r: Rate = "uniform";
    for (const a of e.args) {
      if (rank(out[a]!) > rank(r)) {
        r = out[a]!;
      }
    }
    out[id] = r;
  });
  return out;
}

export interface Uniforms {
  /** The program with every literal slot a uniform input named by its slot. */
  readonly program: Program;
  /** Each slot's value: the uniform's to write. */
  readonly values: Readonly<Record<string, Value>>;
  /** The program's shape: equal for programs that differ only in literal values. */
  readonly shapeKey: string;
}

/**
 * Every literal slot becomes a uniform input named by its slot, so a value
 * edit is a uniform write and the program (its shader and pipeline) stays
 * the same. A slot that has an input's name is refused.
 */
export function literalsToUniforms(p: Program): Uniforms {
  const names = new Set(p.inputs.map((i) => i.name));
  const inputs = [...p.inputs];
  const values: Record<string, Value> = {};
  const eqns: Eqn[] = p.eqns.map((e) => {
    if (e.op !== "literal") {
      return e;
    }
    const slot = e.slot!;
    if (names.has(slot)) {
      throw new Error(`literal slot '${slot}' has an input's name`);
    }
    names.add(slot);
    values[slot] = e.value!;
    inputs.push({ name: slot, type: e.type, rate: "uniform" });
    return { op: "input", args: [], type: e.type, index: inputs.length - 1 };
  });
  const program: Program = { ...p, inputs, eqns };
  return { program, values, shapeKey: shapeKey(p) };
}

export interface Hoisted {
  /**
   * The program with each hoisted equation replaced by a uniform input
   * (named `hoist<n>`, n its equation's id in the original).
   */
  readonly program: Program;
  /** The hoisted equations as a program of the uniform inputs alone: its outputs are the new uniforms' values. */
  readonly uniforms: Program;
  /** The new uniforms' names, in order. */
  readonly names: readonly string[];
}

/**
 * Constant hoisting by rate: each uniform-rate equation that isn't a leaf and
 * that a higher-rate equation (or an output) reads becomes a uniform input.
 * `uniforms` computes their values on the CPU, in float64 (`hoistedValues`).
 */
export function hoistUniforms(p: Program): Hoisted {
  const rate = rates(p);
  const leaf = (e: Eqn) =>
    e.op === "input" || e.op === "const" || e.op === "literal";
  const hoist = new Set<Id>();
  const mark = (id: Id) => {
    if (rate[id] === "uniform" && !leaf(p.eqns[id]!)) {
      hoist.add(id);
    }
  };
  p.eqns.forEach((e, id) => {
    if (rate[id] !== "uniform") {
      e.args.forEach(mark);
    }
  });
  p.outputs.forEach((o) => mark(o.id));
  const ids = [...hoist].sort((x, y) => x - y);
  const names = ids.map((id) => `hoist${id}`);
  const taken = new Set(p.inputs.map((i) => i.name));
  for (const n of names) {
    if (taken.has(n)) {
      throw new Error(`hoisting: an input is already named '${n}'`);
    }
  }
  const uniforms = Builder.from(p).program(
    Object.fromEntries(ids.map((id, i) => [names[i]!, id])),
  );
  // The rest: hoisted equations read their uniform instead.
  const b = new Builder();
  p.inputs.forEach((i) => b.input(i.name, i.type, i.rate));
  const map: Id[] = new Array(p.eqns.length);
  p.eqns.forEach((e, id) => {
    if (hoist.has(id)) {
      map[id] = b.input(`hoist${id}`, e.type, "uniform");
      return;
    }
    switch (e.op) {
      case "input":
        map[id] = b.input(
          p.inputs[e.index!]!.name,
          e.type,
          p.inputs[e.index!]!.rate,
        );
        return;
      case "const":
        map[id] = b.const(e.value!);
        return;
      case "literal":
        map[id] = b.literal(e.slot!, e.value!);
        return;
      default:
        map[id] = b.op(
          e.op,
          e.args.map((a) => map[a]!),
          e.index,
        );
    }
  });
  const program = b.program(
    Object.fromEntries(p.outputs.map((o) => [o.name, map[o.id]!])),
  );
  return { program, uniforms, names };
}

/** The hoisted uniforms' values for the uniform inputs' values, in float64. */
export function hoistedValues(
  h: Hoisted,
  uniformInputs: Readonly<Record<string, Value>>,
): Record<string, Value> {
  return evaluate(h.uniforms, uniformInputs);
}
