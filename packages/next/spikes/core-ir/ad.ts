// Spike (a): forward-mode autodiff as an interpretation of the IR. The
// tangent of each equation along one direction of one input is built as new
// equations (a jvp, as JAX's), so a derivative is a program like any other:
// evaluated in float64, bounded by intervals, or emitted as WGSL.

import { Builder, width, type Id, type Program } from "./cir.ts";

type T = Id | null; // null: a zero tangent

/**
 * The tangents of `outputs` along `direction` of input `wrt` (a unit
 * vector's lane for vector inputs), as equations of `b`.
 */
export function jvp(
  b: Builder,
  program: Program,
  outputs: readonly Id[],
  wrt: string,
  lane = 0,
): Id[] {
  const memo = new Map<Id, T>();
  const zero = (id: Id) => {
    const n = width(b.typeOf(id));
    return b.const(n === 1 ? 0 : Array(n).fill(0));
  };
  const op = (name: string, ...args: Id[]) => b.op(name, args);
  const add = (x: T, y: T): T =>
    x === null ? y : y === null ? x : op("math/add", x, y);
  const sub = (x: T, y: T): T =>
    y === null ? x : x === null ? op("math/neg", y) : op("math/sub", x, y);
  const mul = (t: T, x: Id): T => (t === null ? null : op("math/mul", t, x));
  const div = (t: T, x: Id): T => (t === null ? null : op("math/div", t, x));
  const k = (v: number, like: Id) => b.splat(b.const(v), width(b.typeOf(like)));
  const orZero = (t: T, like: Id) => t ?? zero(like);

  const tangent = (id: Id): T => {
    if (!memo.has(id)) {
      memo.set(id, rule(id));
    }
    return memo.get(id)!;
  };

  const rule = (id: Id): T => {
    const e = b.eqns[id]!;
    const [a, c, d] = e.args as [Id, Id, Id];
    switch (e.op) {
      case "const":
      case "literal":
        return null;
      case "input": {
        const input = program.inputs[e.index!]!;
        if (input.name !== wrt) {
          return null;
        }
        const n = width(input.type);
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
      case "cesium/search":
      case "cesium/tableGet":
        // Search and table reads are piecewise constant in their operand: the
        // derivative of a piecewise function is its piece's, one-sided at a
        // breakpoint as the CPU's choice.
        return null;
      case "math/neg": {
        const t = tangent(a);
        return t === null ? null : op("math/neg", t);
      }
      case "math/abs":
        return mul(tangent(a), op("math/sign", a));
      case "math/fract":
        return tangent(a);
      case "math/add":
        return add(tangent(a), tangent(c));
      case "math/sub":
        return sub(tangent(a), tangent(c));
      case "math/mul":
        return add(mul(tangent(a), c), mul(tangent(c), a));
      case "math/div": {
        // (a' - (a / c) c') / c
        const ta = tangent(a);
        const tc = tangent(c);
        return div(sub(ta, mul(tc, id)), c);
      }
      case "math/sqrt":
        return div(tangent(a), op("math/mul", k(2, id), id));
      case "math/exp":
        return mul(tangent(a), id);
      case "math/log":
        return div(tangent(a), a);
      case "math/sin":
        return mul(tangent(a), op("math/cos", a));
      case "math/cos":
        return mul(tangent(a), op("math/neg", op("math/sin", a)));
      case "math/tan": {
        const sec = op("math/div", k(1, a), op("math/cos", a));
        return mul(tangent(a), op("math/mul", sec, sec));
      }
      case "math/atan":
        return div(tangent(a), op("math/add", k(1, a), op("math/mul", a, a)));
      case "math/atan2": {
        // atan2(y, x)' = (x y' - y x') / (x² + y²)
        const r2 = op("math/add", op("math/mul", a, a), op("math/mul", c, c));
        return div(sub(mul(tangent(a), c), mul(tangent(c), a)), r2);
      }
      case "math/pow": {
        // y = a^c: y' = c a^(c-1) a' + y ln(a) c'
        const ta = tangent(a);
        const tc = tangent(c);
        const first = mul(
          ta,
          op("math/mul", c, op("math/pow", a, op("math/sub", c, k(1, c)))),
        );
        const second = mul(tc, op("math/mul", id, op("math/log", a)));
        return add(first, second);
      }
      case "math/min":
      case "math/max": {
        if (width(e.type) !== 1) {
          throw new Error(`spike: no tangent for vector ${e.op}`);
        }
        const pick = op(e.op === "math/min" ? "math/le" : "math/ge", a, c);
        return op(
          "math/select",
          pick,
          orZero(tangent(a), a),
          orZero(tangent(c), c),
        );
      }
      case "math/select": {
        const tt = tangent(c);
        const tf = tangent(d);
        return tt === null && tf === null
          ? null
          : op("math/select", a, orZero(tt, c), orZero(tf, d));
      }
      case "math/clamp": {
        if (width(e.type) !== 1) {
          throw new Error("spike: no tangent for vector math/clamp");
        }
        const inside = op(
          "math/and",
          op("math/gt", a, op("math/min", c, d)),
          op("math/lt", a, op("math/max", c, d)),
        );
        const ta = tangent(a);
        return ta === null ? null : op("math/select", inside, ta, zero(a));
      }
      case "math/saturate": {
        const inside = op(
          "math/and",
          op("math/gt", a, b.const(0)),
          op("math/lt", a, b.const(1)),
        );
        const ta = tangent(a);
        return ta === null ? null : op("math/select", inside, ta, zero(a));
      }
      case "math/mix": {
        // (1 - t) a + t c: a' (1 - t) + c' t + (c - a) t'
        const t = d;
        const one = k(1, t);
        return add(
          add(mul(tangent(a), op("math/sub", one, t)), mul(tangent(c), t)),
          mul(tangent(t), op("math/sub", c, a)),
        );
      }
      case "math/smoothStep": {
        // s = sat((x - min(e0, e1)) / |e1 - e0|), y = s²(3 - 2s): y' = 6 s (1 - s) s'
        const s = op(
          "math/saturate",
          op(
            "math/div",
            op("math/sub", d, op("math/min", a, c)),
            op("math/abs", op("math/sub", c, a)),
          ),
        );
        const sT = jvpOf(s);
        const six = k(6, s);
        return mul(
          sT,
          op("math/mul", six, op("math/mul", s, op("math/sub", k(1, s), s))),
        );
      }
      case "math/dot":
        return add(mul1(tangent(a), c, "dot"), mul1(tangent(c), a, "dot"));
      case "math/length":
        // (a · a') / |a|
        return div(mul1(tangent(a), a, "dot"), id);
      case "math/normalize": {
        // (a' - n (n · a')) / |a|
        const ta = tangent(a);
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
      case "math/cross": {
        const ta = tangent(a);
        const tc = tangent(c);
        return add(
          ta === null ? null : op("math/cross", ta, c),
          tc === null ? null : op("math/cross", a, tc),
        );
      }
      default:
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
        throw new Error(`spike: no tangent rule for '${e.op}'`);
    }
  };

  // smoothstep's rule differentiates its own expansion, built on the fly.
  const jvpOf = (id: Id): T => tangent(id);
  const mul1 = (t: T, x: Id, _: "dot"): T =>
    t === null ? null : op("math/dot", t, x);

  return outputs.map((o) => orZero(tangent(o), o));
}

/**
 * The Jacobian of a float3 output `out` with respect to float3 input `wrt`,
 * as a program whose outputs are its columns `J0`, `J1`, `J2` (∂out/∂wrt_i).
 */
export function jacobianProgram(p: Program, out: string, wrt: string): Program {
  const b = Builder.from(p);
  const o = p.outputs.find((x) => x.name === out)!.id;
  const cols: Record<string, Id> = {};
  for (let i = 0; i < 3; i++) {
    cols[`J${i}`] = jvp(b, p, [o], wrt, i)[0]!;
  }
  return b.program(cols);
}
