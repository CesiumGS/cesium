// Cesium IR's types: the program structure. A program is typed inputs with a
// rate, typed single-assignment equations in dependency order, and named
// outputs. Types are glTF KHR_interactivity's (matrices come later).

// The program structure's version, and the JSON form's (`json.ts`): `cesium-ir/<major>.<minor>`.
export const IR_VERSION = "cesium-ir/1.0";
export const VOCABULARY = "KHR_interactivity";

export type Type = "bool" | "int" | "float" | "float2" | "float3" | "float4";
export type Rate = "uniform" | "feature" | "vertex" | "fragment";
export const RATES: readonly Rate[] = [
  "uniform",
  "feature",
  "vertex",
  "fragment",
];

/** An equation's index in its program. */
export type Id = number;

export interface Input {
  readonly name: string;
  readonly type: Type;
  readonly rate: Rate;
}

/** A value: a number, a vector, or a boolean. */
export type Value = number | readonly number[] | boolean;

export interface Eqn {
  readonly op: string;
  readonly args: readonly Id[];
  readonly type: Type;
  /** `const`: its value. `literal`: its value, and `slot` names its place. */
  readonly value?: Value;
  readonly slot?: string;
  /** `input`: the input's index. `math/extract*`: the component. */
  readonly index?: number;
}

export interface Program {
  readonly version: string;
  readonly inputs: readonly Input[];
  readonly eqns: readonly Eqn[];
  readonly outputs: readonly { readonly name: string; readonly id: Id }[];
}

/** Lanes in a type. */
export function width(type: Type): number {
  switch (type) {
    case "float2":
      return 2;
    case "float3":
      return 3;
    case "float4":
      return 4;
    default:
      return 1;
  }
}

/** The float type of `n` lanes. */
export function floatOf(n: number): Type {
  const t = (["float", "float2", "float3", "float4"] as const)[n - 1];
  if (!t) {
    throw new Error(`no float type of width ${n}`);
  }
  return t;
}

export const isFloat = (t: Type): boolean => t.startsWith("float");
