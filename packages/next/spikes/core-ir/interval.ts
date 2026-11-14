// Spike (a): interval evaluation as an interpretation of the IR: bounds of
// every output over ranges of the inputs (the natural interval extension,
// lane by lane; booleans are [0, 0], [1, 1] or [0, 1]). No outward
// rounding, as today's `transform/interval.ts`.

import { clampRow, searchRows, tableOf, width, type Program } from "./cir.ts";

export interface Iv {
  readonly lo: number;
  readonly hi: number;
}
export type Lanes = readonly Iv[];

const iv = (lo: number, hi: number): Iv => ({ lo, hi });
const WHOLE = iv(-Infinity, Infinity);
const TWO_PI = 2 * Math.PI;

const times = (x: number, y: number) => (x === 0 || y === 0 ? 0 : x * y);
function mul(a: Iv, b: Iv): Iv {
  const p = [
    times(a.lo, b.lo),
    times(a.lo, b.hi),
    times(a.hi, b.lo),
    times(a.hi, b.hi),
  ];
  return iv(Math.min(...p), Math.max(...p));
}
function div(a: Iv, b: Iv): Iv {
  if (b.lo > 0 || b.hi < 0) {
    return mul(a, iv(1 / b.hi, 1 / b.lo));
  }
  return WHOLE;
}
const monotone = (f: (x: number) => number) => (a: Iv) => iv(f(a.lo), f(a.hi));

/** sin over [lo, hi]: endpoints, plus ±1 where a peak lies inside. */
function sinIv(a: Iv, phase = 0): Iv {
  if (a.hi - a.lo >= TWO_PI) {
    return iv(-1, 1);
  }
  const f = (x: number) => Math.sin(x + phase);
  let lo = Math.min(f(a.lo), f(a.hi));
  let hi = Math.max(f(a.lo), f(a.hi));
  const has = (target: number) => {
    const k = Math.ceil((a.lo + phase - target) / TWO_PI);
    return target + k * TWO_PI <= a.hi + phase;
  };
  if (has(Math.PI / 2)) {
    hi = 1;
  }
  if (has(-Math.PI / 2)) {
    lo = -1;
  }
  return iv(lo, hi);
}

function scalar(op: string, a: Iv, b: Iv, c: Iv): Iv {
  switch (op) {
    case "math/neg":
      return iv(-a.hi, -a.lo);
    case "math/abs":
      return a.lo >= 0
        ? a
        : a.hi <= 0
          ? iv(-a.hi, -a.lo)
          : iv(0, Math.max(-a.lo, a.hi));
    case "math/sqrt":
      return iv(Math.sqrt(Math.max(a.lo, 0)), Math.sqrt(a.hi));
    case "math/exp":
    case "math/log":
    case "math/atan":
    case "math/floor":
    case "math/ceil":
    case "math/trunc":
    case "math/sign":
    case "math/tanh":
    case "math/sinh":
    case "math/cbrt":
      return monotone(
        {
          "math/exp": Math.exp,
          "math/log": Math.log,
          "math/atan": Math.atan,
          "math/floor": Math.floor,
          "math/ceil": Math.ceil,
          "math/trunc": Math.trunc,
          "math/sign": Math.sign,
          "math/tanh": Math.tanh,
          "math/sinh": Math.sinh,
          "math/cbrt": Math.cbrt,
        }[op]!,
      )(a);
    case "math/fract":
      return Math.floor(a.lo) === Math.floor(a.hi)
        ? iv(a.lo - Math.floor(a.lo), a.hi - Math.floor(a.hi))
        : iv(0, 1);
    case "math/saturate":
      return iv(Math.min(Math.max(a.lo, 0), 1), Math.min(Math.max(a.hi, 0), 1));
    case "math/sin":
      return sinIv(a);
    case "math/cos":
      return sinIv(a, Math.PI / 2);
    case "math/add":
      return iv(a.lo + b.lo, a.hi + b.hi);
    case "math/sub":
      return iv(a.lo - b.hi, a.hi - b.lo);
    case "math/mul":
      return mul(a, b);
    case "math/div":
      return div(a, b);
    case "math/min":
      return iv(Math.min(a.lo, b.lo), Math.min(a.hi, b.hi));
    case "math/max":
      return iv(Math.max(a.lo, b.lo), Math.max(a.hi, b.hi));
    case "math/clamp": {
      // min(max(a, min(b, c)), max(b, c)), each monotone
      const lo = scalar("math/min", b, c, c);
      const hi = scalar("math/max", b, c, c);
      return scalar("math/min", scalar("math/max", a, lo, c), hi, c);
    }
    case "math/mix":
      // (1 - c) a + c b
      return scalar("math/add", mul(iv(1 - c.hi, 1 - c.lo), a), mul(c, b), c);
    case "math/pow":
      if (a.lo > 0) {
        const p = [a.lo ** b.lo, a.lo ** b.hi, a.hi ** b.lo, a.hi ** b.hi];
        return iv(Math.min(...p), Math.max(...p));
      }
      return WHOLE;
    case "math/atan2":
      return iv(-Math.PI, Math.PI);
    case "math/smoothStep": {
      // monotone in x for e0 < e1 fixed
      // Rising in c for fixed edges (KHR orders them); else anywhere in [0, 1].
      const s = (x: number) => {
        const t = Math.min(
          Math.max((x - Math.min(a.lo, b.lo)) / Math.abs(b.lo - a.lo), 0),
          1,
        );
        return t * t * (3 - 2 * t);
      };
      return a.lo === a.hi && b.lo === b.hi ? iv(s(c.lo), s(c.hi)) : iv(0, 1);
    }
    case "math/lt":
      return a.hi < b.lo ? iv(1, 1) : a.lo >= b.hi ? iv(0, 0) : iv(0, 1);
    case "math/le":
      return a.hi <= b.lo ? iv(1, 1) : a.lo > b.hi ? iv(0, 0) : iv(0, 1);
    case "math/gt":
      return scalar("math/lt", b, a, c);
    case "math/ge":
      return scalar("math/le", b, a, c);
    case "math/eq":
      return a.lo === a.hi && b.lo === b.hi && a.lo === b.lo
        ? iv(1, 1)
        : a.hi < b.lo || b.hi < a.lo
          ? iv(0, 0)
          : iv(0, 1);
    case "math/and":
      return iv(Math.min(a.lo, b.lo), Math.min(a.hi, b.hi));
    case "math/or":
      return iv(Math.max(a.lo, b.lo), Math.max(a.hi, b.hi));
    case "math/not":
      return iv(1 - a.hi, 1 - a.lo);
    default:
      throw new Error(`spike: no interval rule for '${op}'`);
  }
}

const point = (v: number) => iv(v, v);
const hull = (a: Iv, b: Iv) => iv(Math.min(a.lo, b.lo), Math.max(a.hi, b.hi));

/** Bounds of each output, lane by lane, with inputs given as lanes of intervals. */
export function evaluateInterval(
  p: Program,
  inputs: Readonly<Record<string, Lanes>>,
  tables: Readonly<Record<string, readonly number[]>> = {},
): Record<string, Lanes> {
  const v: Lanes[] = [];
  p.eqns.forEach((e, id) => {
    const args = e.args.map((a) => v[a]!);
    const [a, b, c] = args;
    switch (e.op) {
      case "const":
      case "literal": {
        const x = e.value!;
        v[id] =
          typeof x === "number"
            ? [point(x)]
            : typeof x === "boolean"
              ? [point(x ? 1 : 0)]
              : x.map(point);
        return;
      }
      case "input": {
        const name = p.inputs[e.index!]!.name;
        const x = inputs[name];
        if (!x) {
          throw new Error(`input '${name}' has no range`);
        }
        v[id] = x;
        return;
      }
      case "cesium/search": {
        // Monotone in the key: the rows of its ends.
        const t = tableOf(p, e.table!);
        const data = tableData(tables, t.name);
        v[id] = [
          iv(
            searchRows(data, t, e.index!, a![0]!.lo),
            searchRows(data, t, e.index!, a![0]!.hi),
          ),
        ];
        return;
      }
      case "cesium/tableGet": {
        // The hull of the column over the rows the index may be.
        const t = tableOf(p, e.table!);
        const data = tableData(tables, t.name);
        const stride = t.columns.length;
        let lo = Infinity;
        let hi = -Infinity;
        for (let r = clampRow(a![0]!.lo, t); r <= clampRow(a![0]!.hi, t); r++) {
          const x = data[r * stride + e.index!]!;
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
        }
        v[id] = [iv(lo, hi)];
        return;
      }
      case "type/intToFloat":
        v[id] = a!;
        return;
      case "math/select": {
        const cond = a![0]!;
        v[id] =
          cond.lo === 1
            ? b!
            : cond.hi === 0
              ? c!
              : b!.map((x, i) => hull(x, c![i]!));
        return;
      }
      case "type/boolToFloat":
        v[id] = a!;
        return;
      case "math/dot": {
        v[id] = [
          a!
            .map((x, i) => mul(x, b![i]!))
            .reduce((s, x) => scalar("math/add", s, x, s)),
        ];
        return;
      }
      case "math/length": {
        const sq = a!.map((x) => {
          const m = mul(x, x);
          return x.lo <= 0 && x.hi >= 0 ? iv(0, m.hi) : m;
        });
        const sum = sq.reduce((s, x) => scalar("math/add", s, x, s));
        v[id] = [scalar("math/sqrt", sum, sum, sum)];
        return;
      }
      case "math/normalize":
        v[id] = a!.map(() => iv(-1, 1));
        return;
      case "math/cross": {
        const t = (i: number, j: number) =>
          scalar("math/sub", mul(a![i]!, b![j]!), mul(a![j]!, b![i]!), WHOLE);
        v[id] = [t(1, 2), t(2, 0), t(0, 1)];
        return;
      }
      default:
        break;
    }
    if (e.op.startsWith("math/combine")) {
      v[id] = args.map((x) => x[0]!);
      return;
    }
    if (e.op.startsWith("math/extract")) {
      v[id] = [a![e.index!]!];
      return;
    }
    const n = width(e.type); // bool: one lane
    v[id] = Array.from({ length: n }, (_, i) =>
      scalar(e.op, a![i]!, b?.[i] ?? WHOLE, c?.[i] ?? WHOLE),
    );
  });
  return Object.fromEntries(p.outputs.map((o) => [o.name, v[o.id]!]));
}

function tableData(
  tables: Readonly<Record<string, readonly number[]>>,
  name: string,
): readonly number[] {
  const d = tables[name];
  if (!d) {
    throw new Error(`table '${name}' has no data`);
  }
  return d;
}

function nextDown(x: number): number {
  if (!Number.isFinite(x) || x === 0) {
    return x === 0 ? -Number.MIN_VALUE : x;
  }
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, x);
  b.setBigInt64(0, b.getBigInt64(0) + (x > 0 ? -1n : 1n));
  return b.getFloat64(0);
}

/**
 * Bounds as `evaluateInterval`'s, with lane `lane` of input `input` split at
 * every breakpoint of the tables the program searches (each search's key is
 * taken to be that lane), so each piece reads one row per table and no
 * branch is hulled with another piece's: intervals across segment
 * boundaries without the overestimate of hulling rows.
 */
export function evaluateIntervalSplit(
  p: Program,
  inputs: Readonly<Record<string, Lanes>>,
  tables: Readonly<Record<string, readonly number[]>>,
  input: string,
  lane: number,
): { bounds: Record<string, Lanes>; pieces: number } {
  const range = inputs[input]![lane]!;
  const cuts = new Set<number>();
  for (const e of p.eqns) {
    if (e.op === "cesium/search") {
      const t = tableOf(p, e.table!);
      const data = tableData(tables, t.name);
      for (let r = 0; r < t.rows; r++) {
        const x = data[r * t.columns.length + e.index!]!;
        if (x > range.lo && x <= range.hi) {
          cuts.add(x);
        }
      }
    }
  }
  const edges = [range.lo, ...[...cuts].sort((x, y) => x - y), range.hi];
  let out: Record<string, Lanes> | undefined;
  let pieces = 0;
  for (let k = 0; k + 1 < edges.length; k++) {
    const last = k + 2 === edges.length;
    const piece = iv(edges[k]!, last ? edges[k + 1]! : nextDown(edges[k + 1]!));
    if (piece.lo > piece.hi) {
      continue;
    }
    const lanes = inputs[input]!.map((x, i) => (i === lane ? piece : x));
    const b = evaluateInterval(p, { ...inputs, [input]: lanes }, tables);
    pieces++;
    out = out
      ? Object.fromEntries(
          Object.entries(out).map(([n, ls]) => [
            n,
            ls.map((x, i) => hull(x, b[n]![i]!)),
          ]),
        )
      : b;
  }
  return { bounds: out!, pieces };
}
