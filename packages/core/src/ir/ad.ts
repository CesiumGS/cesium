// Forward-mode differentiation as an interpretation of a program. The tangent
// of every equation along one direction (a lane of one input) is built as new
// equations: the dual part of a dual number, kept symbolic, so a derivative is
// a program like any other. It can be evaluated in float64, bounded by
// intervals, or emitted. An equation that doesn't depend on the direction has
// no tangent at all (a zero tangent is no node), so the extra equations stay
// few. A Jacobian is one pass per input lane; a Hessian is forward over
// forward: the same pass again, over the Jacobian's equations.
//
// The rules are today's (`src/transform/ad.ts`), with KHR_interactivity's
// formulas for the composites (`clamp`, `mix`, `smoothStep`, `saturate`):
// each is differentiated through its definition, written out as equations.

import { Builder } from "./builder.ts";
import { width, type Id, type Program } from "./types.ts";

/** A direction: an input's name and, for a vector input, its lane. */
export interface Direction {
  readonly input: string;
  readonly lane?: number;
}

type Tangent = Id | null;

/**
 * The tangents of `outputs` along `wrt`, as equations of `b`. A zero
 * tangent is `null`: no equation. `b` holds the program's equations (see
 * `Builder.from`).
 */
export function jvp(
  b: Builder,
  outputs: readonly Id[],
  wrt: Direction,
): Tangent[] {
  const memo = new Map<Id, Tangent>();
  const op = (name: string, ...args: Id[]) => b.op(name, args);
  const k = (v: number, like: Id) => b.splat(b.const(v), width(b.typeOf(like)));
  const zero = (like: Id) => k(0, like);
  const orZero = (t: Tangent, like: Id) => t ?? zero(like);
  const add = (x: Tangent, y: Tangent): Tangent =>
    x === null ? y : y === null ? x : op("math/add", x, y);
  const sub = (x: Tangent, y: Tangent): Tangent =>
    y === null ? x : x === null ? op("math/neg", y) : op("math/sub", x, y);
  const neg = (x: Tangent): Tangent => (x === null ? null : op("math/neg", x));
  const mul = (t: Tangent, x: Id): Tangent =>
    t === null ? null : op("math/mul", t, x);
  const div = (t: Tangent, x: Id): Tangent =>
    t === null ? null : op("math/div", t, x);
  // A scalar select per lane: KHR's select takes one bool.
  const lanewise = (like: Id, f: (lane: (x: Id) => Id) => Id): Id => {
    const n = width(b.typeOf(like));
    if (n === 1) {
      return f((x) => x);
    }
    const lanes = Array.from({ length: n }, (_, i) =>
      f((x) => b.op(`math/extract${n}`, [x], i)),
    );
    return b.op(`math/combine${n}`, lanes);
  };

  const tangent = (id: Id): Tangent => {
    if (memo.has(id)) {
      return memo.get(id)!;
    }
    // A tangent that folds to a zero constant (a lane of a one-hot tangent,
    // say) is no tangent.
    let result = rule(id);
    if (result !== null) {
      const v = b.constOf(result);
      if (v === 0 || (Array.isArray(v) && v.every((x) => x === 0))) {
        result = null;
      }
    }
    memo.set(id, result);
    return result;
  };

  // min(a, c) or max(a, c): the tangent of the operand it picks, today's tie
  // rule (le for min, ge for max: a wins a tie).
  const pick = (name: "math/min" | "math/max", a: Id, c: Id): Tangent => {
    const ta = tangent(a);
    const tc = tangent(c);
    if (ta === null && tc === null) {
      return null;
    }
    const za = orZero(ta, a);
    const zc = orZero(tc, c);
    const cmp = name === "math/min" ? "math/le" : "math/ge";
    return lanewise(a, (lane) =>
      op("math/select", op(cmp, lane(a), lane(c)), lane(za), lane(zc)),
    );
  };

  // KHR's clamp, min(max(x, min(lo, hi)), max(lo, hi)), as equations.
  const clampOf = (x: Id, lo: Id, hi: Id): Id =>
    op(
      "math/min",
      op("math/max", x, op("math/min", lo, hi)),
      op("math/max", lo, hi),
    );

  const rule = (id: Id): Tangent => {
    const e = b.eqns[id]!;
    const [a, c, d] = e.args as [Id, Id, Id];
    switch (e.op) {
      case "const":
      case "literal":
        return null;
      case "input": {
        const input = b.inputs[e.index!]!;
        if (input.name !== wrt.input) {
          return null;
        }
        const n = width(input.type);
        const lane = wrt.lane ?? 0;
        if (lane >= n) {
          throw new RangeError(`input '${input.name}' has no lane ${lane}`);
        }
        return b.const(
          n === 1
            ? 1
            : Array.from({ length: n }, (_, i) => (i === lane ? 1 : 0)),
        );
      }
      case "math/floor":
      case "math/ceil":
      case "math/trunc":
      case "math/round":
      case "math/sign":
      case "math/eq":
      case "math/lt":
      case "math/le":
      case "math/gt":
      case "math/ge":
      case "math/and":
      case "math/or":
      case "math/not":
      case "type/boolToFloat":
      case "type/intToFloat":
        // Piecewise constant: the derivative is its piece's (zero).
        return null;
      case "math/select": {
        const tt = tangent(c);
        const tf = tangent(d);
        return tt === null && tf === null
          ? null
          : op("math/select", a, orZero(tt, c), orZero(tf, d));
      }
      case "math/min":
      case "math/max":
        return pick(e.op, a, c);
      case "math/clamp":
        return tangent(clampOf(a, c, d));
      case "math/saturate":
        return tangent(clampOf(a, k(0, a), k(1, a)));
      case "math/mix": {
        // (1 - t) a + t b
        const one = k(1, d);
        return tangent(
          op(
            "math/add",
            op("math/mul", op("math/sub", one, d), a),
            op("math/mul", d, c),
          ),
        );
      }
      case "math/smoothStep": {
        // t = saturate((x - min(e0, e1)) / |e1 - e0|), t² (3 - 2t)
        const t = clampOf(
          op(
            "math/div",
            op("math/sub", d, op("math/min", a, c)),
            op("math/abs", op("math/sub", c, a)),
          ),
          k(0, d),
          k(1, d),
        );
        return tangent(
          op(
            "math/mul",
            op("math/mul", t, t),
            op("math/sub", k(3, t), op("math/mul", k(2, t), t)),
          ),
        );
      }
      default:
        break;
    }
    if (e.op.startsWith("math/combine")) {
      const ts = e.args.map(tangent);
      return ts.every((t) => t === null)
        ? null
        : b.op(
            e.op,
            ts.map((t, i) => orZero(t, e.args[i]!)),
          );
    }
    if (e.op.startsWith("math/extract")) {
      const t = tangent(a);
      return t === null ? null : b.op(e.op, [t], e.index);
    }
    const ta = tangent(a);
    const tc = c === undefined ? null : tangent(c);
    switch (e.op) {
      case "math/neg":
        return neg(ta);
      case "math/fract":
        return ta;
      case "math/add":
        return add(ta, tc);
      case "math/sub":
        return sub(ta, tc);
      case "math/mul":
        return add(mul(ta, c), mul(tc, a));
      case "math/div":
        // d(a / c) = (da - (a / c) dc) / c
        return div(sub(ta, mul(tc, id)), c);
      case "math/rem":
        // a - trunc(a / c) c, with trunc's tangent zero
        return sub(ta, mul(tc, op("math/trunc", op("math/div", a, c))));
      case "math/abs":
        return mul(ta, op("math/sign", a));
      case "math/sqrt":
        return div(ta, op("math/mul", k(2, id), id));
      case "math/cbrt":
        return div(ta, op("math/mul", k(3, id), op("math/mul", id, id)));
      case "math/exp":
        return mul(ta, id);
      case "math/log":
        return div(ta, a);
      case "math/log2":
        return div(ta, op("math/mul", a, k(Math.LN2, a)));
      case "math/log10":
        return div(ta, op("math/mul", a, k(Math.LN10, a)));
      case "math/sin":
        return mul(ta, op("math/cos", a));
      case "math/cos":
        return neg(mul(ta, op("math/sin", a)));
      case "math/tan":
        return mul(ta, op("math/add", k(1, id), op("math/mul", id, id)));
      case "math/atan":
        return div(ta, op("math/add", k(1, a), op("math/mul", a, a)));
      case "math/asin":
        return div(
          ta,
          op("math/sqrt", op("math/sub", k(1, a), op("math/mul", a, a))),
        );
      case "math/acos":
        return neg(
          div(
            ta,
            op("math/sqrt", op("math/sub", k(1, a), op("math/mul", a, a))),
          ),
        );
      case "math/sinh":
        return mul(ta, op("math/cosh", a));
      case "math/cosh":
        return mul(ta, op("math/sinh", a));
      case "math/tanh":
        return mul(ta, op("math/sub", k(1, id), op("math/mul", id, id)));
      case "math/atan2": {
        // atan2(y, x): (x dy - y dx) / (x² + y²)
        const r2 = op("math/add", op("math/mul", a, a), op("math/mul", c, c));
        return div(sub(mul(ta, c), mul(tc, a)), r2);
      }
      case "math/pow": {
        // d(a^c) = c a^(c - 1) da + a^c ln(a) dc
        const viaBase =
          ta === null
            ? null
            : mul(
                ta,
                op(
                  "math/mul",
                  c,
                  op("math/pow", a, op("math/sub", c, k(1, c))),
                ),
              );
        const viaExponent =
          tc === null ? null : mul(tc, op("math/mul", id, op("math/log", a)));
        return add(viaBase, viaExponent);
      }
      case "math/dot":
        return add(
          ta === null ? null : op("math/dot", ta, c),
          tc === null ? null : op("math/dot", a, tc),
        );
      case "math/length":
        // (a · da) / |a|
        return ta === null ? null : op("math/div", op("math/dot", a, ta), id);
      case "math/normalize": {
        // (da - n (n · da)) / |a|
        if (ta === null) {
          return null;
        }
        const n = width(e.type);
        const along = op("math/mul", id, b.splat(op("math/dot", id, ta), n));
        return op(
          "math/div",
          op("math/sub", ta, along),
          b.splat(op("math/length", a), n),
        );
      }
      case "math/cross":
        return add(
          ta === null ? null : op("math/cross", ta, c),
          tc === null ? null : op("math/cross", a, tc),
        );
      default:
        throw new Error(`jvp: no tangent rule for '${e.op}'`);
    }
  };

  return outputs.map(tangent);
}

/** The tangents of `outputs` along `wrt`, with a zero tangent as a zero constant. */
export function differentiate(
  b: Builder,
  outputs: readonly Id[],
  wrt: Direction,
): Id[] {
  return jvp(b, outputs, wrt).map(
    (t, i) => t ?? b.splat(b.const(0), width(b.typeOf(outputs[i]!))),
  );
}

const lanesOf = (p: Program, name: string): number => {
  const input = p.inputs.find((x) => x.name === name);
  if (!input) {
    throw new Error(`no input '${name}'`);
  }
  return width(input.type);
};

const outputIds = (p: Program, names?: readonly string[]): Id[] =>
  (names ?? p.outputs.map((o) => o.name)).map((n) => {
    const o = p.outputs.find((x) => x.name === n);
    if (!o) {
      throw new Error(`no output '${n}'`);
    }
    return o.id;
  });

/** The name of a derivative output: `q/p.0` is ∂q/∂p₀, `q/p.0/p.1` is ∂²q/∂p₀∂p₁, `q/t` is ∂q/∂t. */
export function derivativeName(
  output: string,
  ...wrt: readonly Direction[]
): string {
  return [
    output,
    ...wrt.map((d) =>
      d.lane === undefined ? d.input : `${d.input}.${d.lane}`,
    ),
  ].join("/");
}

const directions = (p: Program, input: string): Direction[] => {
  const n = lanesOf(p, input);
  return n === 1
    ? [{ input }]
    : Array.from({ length: n }, (_, lane) => ({ input, lane }));
};

/**
 * The Jacobian of `outputs` (default: all) along every lane of input `wrt`,
 * as a program: one output per output and lane, `q/p.j` (∂q/∂p_j, of q's
 * type).
 */
export function jacobianProgram(
  p: Program,
  wrt: string,
  outputs?: readonly string[],
): Program {
  const b = Builder.from(p);
  const names = outputs ?? p.outputs.map((o) => o.name);
  const ids = outputIds(p, names);
  const out: Record<string, Id> = {};
  for (const dir of directions(p, wrt)) {
    differentiate(b, ids, dir).forEach((t, i) => {
      out[derivativeName(names[i]!, dir)] = t;
    });
  }
  return b.program(out);
}

/**
 * The Hessian of `outputs` along input `wrt`, forward over forward: each
 * Jacobian column differentiated again. One output per output and pair of
 * lanes, `q/p.j/p.k`; the two orders of a pair are one equation.
 */
export function hessianProgram(
  p: Program,
  wrt: string,
  outputs?: readonly string[],
): Program {
  const b = Builder.from(p);
  const names = outputs ?? p.outputs.map((o) => o.name);
  const ids = outputIds(p, names);
  const dirs = directions(p, wrt);
  const columns = dirs.map((dir) => differentiate(b, ids, dir));
  const out: Record<string, Id> = {};
  dirs.forEach((dj, j) => {
    for (let m = j; m < dirs.length; m++) {
      const dm = dirs[m]!;
      differentiate(b, columns[j]!, dm).forEach((t, i) => {
        out[derivativeName(names[i]!, dj, dm)] = t;
        out[derivativeName(names[i]!, dm, dj)] = t;
      });
    }
  });
  // Outputs in lane order: q/p.0/p.0, q/p.0/p.1, ...
  const ordered: Record<string, Id> = {};
  for (const name of names) {
    for (const dj of dirs) {
      for (const dm of dirs) {
        const key = derivativeName(name, dj, dm);
        ordered[key] = out[key]!;
      }
    }
  }
  return b.program(ordered);
}

/**
 * The derivatives of `outputs` along each input in `wrt` (parameters: scalar
 * inputs, or a vector input's every lane), as a program: `q/t` per output
 * and parameter.
 */
export function parameterProgram(
  p: Program,
  wrt: readonly string[],
  outputs?: readonly string[],
): Program {
  const b = Builder.from(p);
  const names = outputs ?? p.outputs.map((o) => o.name);
  const ids = outputIds(p, names);
  const out: Record<string, Id> = {};
  for (const input of wrt) {
    for (const dir of directions(p, input)) {
      differentiate(b, ids, dir).forEach((t, i) => {
        out[derivativeName(names[i]!, dir)] = t;
      });
    }
  }
  return b.program(out);
}
