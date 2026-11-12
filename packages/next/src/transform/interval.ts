// Natural interval extension of an IR program: bounds of the outputs over a
// box of positions and parameter ranges. Monotone ops map the endpoints
// (tight); sin, cos and tan find the extrema inside the interval by period
// checks; products and quotients take the extreme corners. Dependency between
// the operands is ignored (the usual overestimate of the natural extension).
// There is no outward rounding: the bounds are exact up to the final ulp.

import type { IrProgram, Op } from "./ir.ts";

export interface Interval {
  readonly lo: number;
  readonly hi: number;
}

export interface Box {
  readonly min: ArrayLike<number>;
  readonly max: ArrayLike<number>;
}

/** A parameter's range: a value, `[lo, hi]` or an interval. */
export type ParamRange = number | readonly [number, number] | Interval;

const TWO_PI = 2 * Math.PI;
const WHOLE: Interval = { lo: -Infinity, hi: Infinity };
const NOTHING: Interval = { lo: NaN, hi: NaN };
const FALSE: Interval = { lo: 0, hi: 0 };
const TRUE: Interval = { lo: 1, hi: 1 };
const MAYBE: Interval = { lo: 0, hi: 1 };

const iv = (lo: number, hi: number): Interval => ({ lo, hi });

function hull(a: Interval, b: Interval): Interval {
  // An empty side (NaN: outside the op's domain) adds nothing.
  if (Number.isNaN(a.lo)) {
    return b;
  }
  if (Number.isNaN(b.lo)) {
    return a;
  }
  return iv(Math.min(a.lo, b.lo), Math.max(a.hi, b.hi));
}

/** Product with 0 × ±∞ taken as 0. */
function times(x: number, y: number): number {
  return x === 0 || y === 0 ? 0 : x * y;
}

function mul(a: Interval, b: Interval): Interval {
  const products = [
    times(a.lo, b.lo),
    times(a.lo, b.hi),
    times(a.hi, b.lo),
    times(a.hi, b.hi),
  ];
  return iv(Math.min(...products), Math.max(...products));
}

function reciprocal(b: Interval): Interval {
  if (b.lo > 0 || b.hi < 0) {
    return iv(1 / b.hi, 1 / b.lo);
  }
  if (b.lo === 0 && b.hi > 0) {
    return iv(1 / b.hi, Infinity);
  }
  if (b.hi === 0 && b.lo < 0) {
    return iv(-Infinity, 1 / b.lo);
  }
  return WHOLE;
}

function monotone(f: (x: number) => number, a: Interval): Interval {
  return iv(f(a.lo), f(a.hi));
}

function abs(a: Interval): Interval {
  if (a.lo >= 0) {
    return a;
  }
  if (a.hi <= 0) {
    return iv(-a.hi, -a.lo);
  }
  return iv(0, Math.max(-a.lo, a.hi));
}

function min(a: Interval, b: Interval): Interval {
  return iv(Math.min(a.lo, b.lo), Math.min(a.hi, b.hi));
}

function max(a: Interval, b: Interval): Interval {
  return iv(Math.max(a.lo, b.lo), Math.max(a.hi, b.hi));
}

/** Is there an `offset + 2πk` in [lo, hi] (k an integer)? */
function hasPeak(lo: number, hi: number, offset: number, period: number) {
  return (
    Math.ceil((lo - offset) / period) <= Math.floor((hi - offset) / period)
  );
}

function sin(a: Interval): Interval {
  if (
    !Number.isFinite(a.lo) ||
    !Number.isFinite(a.hi) ||
    a.hi - a.lo >= TWO_PI
  ) {
    return iv(-1, 1);
  }
  const s0 = Math.sin(a.lo);
  const s1 = Math.sin(a.hi);
  return iv(
    hasPeak(a.lo, a.hi, -Math.PI / 2, TWO_PI) ? -1 : Math.min(s0, s1),
    hasPeak(a.lo, a.hi, Math.PI / 2, TWO_PI) ? 1 : Math.max(s0, s1),
  );
}

function cos(a: Interval): Interval {
  if (
    !Number.isFinite(a.lo) ||
    !Number.isFinite(a.hi) ||
    a.hi - a.lo >= TWO_PI
  ) {
    return iv(-1, 1);
  }
  const c0 = Math.cos(a.lo);
  const c1 = Math.cos(a.hi);
  return iv(
    hasPeak(a.lo, a.hi, Math.PI, TWO_PI) ? -1 : Math.min(c0, c1),
    hasPeak(a.lo, a.hi, 0, TWO_PI) ? 1 : Math.max(c0, c1),
  );
}

function tan(a: Interval): Interval {
  if (
    !Number.isFinite(a.lo) ||
    !Number.isFinite(a.hi) ||
    hasPeak(a.lo, a.hi, Math.PI / 2, Math.PI)
  ) {
    return WHOLE;
  }
  return monotone(Math.tan, a);
}

function atan2(y: Interval, x: Interval): Interval {
  const touchesCut = x.lo < 0 && y.lo <= 0 && y.hi >= 0;
  const containsOrigin = x.lo <= 0 && x.hi >= 0 && y.lo <= 0 && y.hi >= 0;
  if (touchesCut || containsOrigin) {
    return iv(-Math.PI, Math.PI);
  }
  const angles = [
    Math.atan2(y.lo, x.lo),
    Math.atan2(y.lo, x.hi),
    Math.atan2(y.hi, x.lo),
    Math.atan2(y.hi, x.hi),
  ];
  return iv(Math.min(...angles), Math.max(...angles));
}

function pow(a: Interval, b: Interval): Interval {
  if (b.lo === b.hi) {
    const n = b.lo;
    if (n === 0) {
      return TRUE;
    }
    if (Number.isInteger(n)) {
      const even = n % 2 === 0;
      if (n > 0) {
        return monotone((x) => Math.pow(x, n), even ? abs(a) : a);
      }
      if (a.lo <= 0 && a.hi >= 0) {
        return WHOLE;
      }
      const base = even ? abs(a) : a;
      return iv(Math.pow(base.hi, n), Math.pow(base.lo, n));
    }
    if (a.hi < 0) {
      return NOTHING;
    }
    const base = iv(Math.max(a.lo, 0), a.hi);
    return n > 0
      ? monotone((x) => Math.pow(x, n), base)
      : iv(Math.pow(base.hi, n), Math.pow(base.lo, n));
  }
  if (a.lo > 0) {
    const t = mul(b, monotone(Math.log, a));
    return monotone(Math.exp, t);
  }
  return WHOLE;
}

/** 1 if the interval is surely nonzero, 0 if surely zero, else undefined. */
function truth(a: Interval): boolean | undefined {
  if (a.lo > 0 || a.hi < 0) {
    return true;
  }
  return a.lo === 0 && a.hi === 0 ? false : undefined;
}

function flag(value: boolean | undefined): Interval {
  return value === undefined ? MAYBE : value ? TRUE : FALSE;
}

function lessThan(a: Interval, b: Interval, orEqual: boolean): Interval {
  if (orEqual ? a.hi <= b.lo : a.hi < b.lo) {
    return TRUE;
  }
  if (orEqual ? a.lo > b.hi : a.lo >= b.hi) {
    return FALSE;
  }
  return MAYBE;
}

function equal(a: Interval, b: Interval): Interval {
  if (a.lo === a.hi && b.lo === b.hi && a.lo === b.lo) {
    return TRUE;
  }
  return a.hi < b.lo || b.hi < a.lo ? FALSE : MAYBE;
}

function not(a: Interval): Interval {
  const t = truth(a);
  return flag(t === undefined ? undefined : !t);
}

function clamp(x: Interval, lo: Interval, hi: Interval): Interval {
  return min(max(x, lo), hi);
}

function smoothCurve(s: number): number {
  return s * s * (3 - 2 * s);
}

function apply(op: Op, a: Interval, b: Interval, c: Interval): Interval {
  switch (op) {
    case "neg":
      return iv(-a.hi, -a.lo);
    case "abs":
      return abs(a);
    case "sqrt":
      return a.hi < 0
        ? NOTHING
        : monotone(Math.sqrt, iv(Math.max(a.lo, 0), a.hi));
    case "exp":
      return monotone(Math.exp, a);
    case "log":
      return a.hi < 0
        ? NOTHING
        : iv(a.lo > 0 ? Math.log(a.lo) : -Infinity, Math.log(a.hi));
    case "sin":
      return sin(a);
    case "cos":
      return cos(a);
    case "tan":
      return tan(a);
    case "atan":
      return monotone(Math.atan, a);
    case "asin":
      return a.lo > 1 || a.hi < -1
        ? NOTHING
        : monotone(Math.asin, iv(Math.max(a.lo, -1), Math.min(a.hi, 1)));
    case "acos": {
      if (a.lo > 1 || a.hi < -1) {
        return NOTHING;
      }
      const x = iv(Math.max(a.lo, -1), Math.min(a.hi, 1));
      return iv(Math.acos(x.hi), Math.acos(x.lo));
    }
    case "sinh":
      return monotone(Math.sinh, a);
    case "tanh":
      return monotone(Math.tanh, a);
    case "cosh":
      return a.lo >= 0
        ? monotone(Math.cosh, a)
        : a.hi <= 0
          ? iv(Math.cosh(a.hi), Math.cosh(a.lo))
          : iv(1, Math.max(Math.cosh(a.lo), Math.cosh(a.hi)));
    case "floor":
      return monotone(Math.floor, a);
    case "ceil":
      return monotone(Math.ceil, a);
    case "sign":
      return monotone(Math.sign, a);
    case "fract": {
      const base = Math.floor(a.lo);
      return Math.floor(a.hi) === base
        ? iv(a.lo - base, a.hi - base)
        : iv(0, 1);
    }
    case "not":
      return not(a);
    case "add":
      return iv(a.lo + b.lo, a.hi + b.hi);
    case "sub":
      return iv(a.lo - b.hi, a.hi - b.lo);
    case "mul":
      return mul(a, b);
    case "div":
      return mul(a, reciprocal(b));
    case "min":
      return min(a, b);
    case "max":
      return max(a, b);
    case "pow":
      return pow(a, b);
    case "atan2":
      return atan2(a, b);
    case "lt":
      return lessThan(a, b, false);
    case "le":
      return lessThan(a, b, true);
    case "gt":
      return lessThan(b, a, false);
    case "ge":
      return lessThan(b, a, true);
    case "eq":
      return equal(a, b);
    case "ne":
      return not(equal(a, b));
    case "and": {
      const ta = truth(a);
      const tb = truth(b);
      return flag(
        ta === false || tb === false
          ? false
          : ta === true && tb === true
            ? true
            : undefined,
      );
    }
    case "or": {
      const ta = truth(a);
      const tb = truth(b);
      return flag(
        ta === true || tb === true
          ? true
          : ta === false && tb === false
            ? false
            : undefined,
      );
    }
    case "select": {
      const t = truth(a);
      return t === undefined ? hull(b, c) : t ? b : c;
    }
    case "clamp":
      return clamp(a, b, c);
    case "mix": {
      // a (1 - t) + b t; for t in [0, 1] the hull of a and b is tighter.
      const left = mul(a, iv(1 - c.hi, 1 - c.lo));
      const right = mul(b, c);
      const direct = iv(left.lo + right.lo, left.hi + right.hi);
      return c.lo >= 0 && c.hi <= 1
        ? iv(
            Math.max(direct.lo, Math.min(a.lo, b.lo)),
            Math.min(direct.hi, Math.max(a.hi, b.hi)),
          )
        : direct;
    }
    case "smoothstep": {
      // a, b are the edges and c the argument; the curve is monotone on [0, 1].
      const ratio = mul(
        iv(c.lo - a.hi, c.hi - a.lo),
        reciprocal(iv(b.lo - a.hi, b.hi - a.lo)),
      );
      return monotone(smoothCurve, clamp(ratio, FALSE, TRUE));
    }
    default:
      throw new Error(`interval: op '${op}' has no operands`);
  }
}

function toInterval(range: ParamRange): Interval {
  if (typeof range === "number") {
    return iv(range, range);
  }
  if (Array.isArray(range)) {
    return iv(range[0]!, range[1]!);
  }
  return range as Interval;
}

/** Bounds of each output of `program` over `box` and the parameter ranges. */
export function evaluateInterval(
  program: IrProgram,
  box: Box,
  params: Readonly<Record<string, ParamRange>> = {},
): Interval[] {
  const values: Interval[] = [];
  for (const node of program.nodes) {
    const [a, b, c] = node.args.map((id) => values[id]!);
    switch (node.op) {
      case "const":
        values.push(iv(node.value, node.value));
        break;
      case "pos":
        values.push(iv(box.min[node.value]!, box.max[node.value]!));
        break;
      case "param": {
        const range = params[node.name];
        if (range === undefined) {
          throw new Error(`parameter '${node.name}' has no range`);
        }
        values.push(toInterval(range));
        break;
      }
      default:
        values.push(apply(node.op, a!, b ?? WHOLE, c ?? WHOLE));
    }
  }
  return program.outputs.map((out) => values[out]!);
}
