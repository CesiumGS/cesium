// Interval evaluation as an interpretation of a program: bounds of every
// output over ranges of the inputs. It is the natural interval extension,
// lane by lane, with today's rules (`src/transform/interval.ts`): monotone
// ops map the endpoints; sin, cos and tan find the extrema inside the
// interval by period checks; products and quotients take the extreme
// corners. Dependency between operands is ignored (the usual overestimate).
// There is no outward rounding: the bounds are exact up to the final ulp.
// A boolean lane is [0, 0] (false), [1, 1] (true) or [0, 1] (either). An
// empty interval (NaN, NaN) is a value outside an op's domain; a hull
// ignores it.
//
// Breakpoint splitting (`evaluateIntervalSplit`) cuts one input lane's
// range wherever a branch condition changes, so no piece hulls two
// branches. CS-56 adds a table search's breakpoints through `breakpoints`.

import { Builder } from "./builder.ts";
import { jvp } from "./ad.ts";
import { evaluate } from "./evaluate.ts";
import { width, type Id, type Program, type Value } from "./types.ts";

export interface Interval {
  readonly lo: number;
  readonly hi: number;
}

/** An input's range: a point, one interval, or one interval per lane. */
export type Range = number | Interval | readonly Interval[];

const TWO_PI = 2 * Math.PI;
const iv = (lo: number, hi: number): Interval => ({ lo, hi });
const WHOLE = iv(-Infinity, Infinity);
const NOTHING = iv(NaN, NaN);
const FALSE = iv(0, 0);
const TRUE = iv(1, 1);
const MAYBE = iv(0, 1);

export function hull(a: Interval, b: Interval): Interval {
  if (Number.isNaN(a.lo)) {
    return b;
  }
  if (Number.isNaN(b.lo)) {
    return a;
  }
  return iv(Math.min(a.lo, b.lo), Math.max(a.hi, b.hi));
}

/** Product with 0 × ±∞ taken as 0. */
const times = (x: number, y: number): number =>
  x === 0 || y === 0 ? 0 : x * y;

function mul(a: Interval, b: Interval): Interval {
  const p = [
    times(a.lo, b.lo),
    times(a.lo, b.hi),
    times(a.hi, b.lo),
    times(a.hi, b.hi),
  ];
  return iv(Math.min(...p), Math.max(...p));
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

const monotone = (f: (x: number) => number, a: Interval): Interval =>
  iv(f(a.lo), f(a.hi));

function abs(a: Interval): Interval {
  if (a.lo >= 0) {
    return a;
  }
  if (a.hi <= 0) {
    return iv(-a.hi, -a.lo);
  }
  return iv(0, Math.max(-a.lo, a.hi));
}

const min = (a: Interval, b: Interval): Interval =>
  iv(Math.min(a.lo, b.lo), Math.min(a.hi, b.hi));
const max = (a: Interval, b: Interval): Interval =>
  iv(Math.max(a.lo, b.lo), Math.max(a.hi, b.hi));
const add = (a: Interval, b: Interval): Interval =>
  iv(a.lo + b.lo, a.hi + b.hi);
const sub = (a: Interval, b: Interval): Interval =>
  iv(a.lo - b.hi, a.hi - b.lo);

/** Is there an `offset + k period` in [lo, hi] (k an integer)? */
const hasPeak = (lo: number, hi: number, offset: number, period: number) =>
  Math.ceil((lo - offset) / period) <= Math.floor((hi - offset) / period);

const unbounded = (a: Interval) =>
  !Number.isFinite(a.lo) || !Number.isFinite(a.hi);

function sin(a: Interval): Interval {
  if (unbounded(a) || a.hi - a.lo >= TWO_PI) {
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
  if (unbounded(a) || a.hi - a.lo >= TWO_PI) {
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
  if (unbounded(a) || hasPeak(a.lo, a.hi, Math.PI / 2, Math.PI)) {
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
    return monotone(Math.exp, mul(b, monotone(Math.log, a)));
  }
  return WHOLE;
}

/** True if surely nonzero, false if surely zero, else undefined. */
function truth(a: Interval): boolean | undefined {
  if (a.lo > 0 || a.hi < 0) {
    return true;
  }
  return a.lo === 0 && a.hi === 0 ? false : undefined;
}

const flag = (t: boolean | undefined): Interval =>
  t === undefined ? MAYBE : t ? TRUE : FALSE;

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

// KHR's clamp, min(max(a, min(b, c)), max(b, c)): each step monotone.
const clamp = (a: Interval, b: Interval, c: Interval): Interval =>
  min(max(a, min(b, c)), max(b, c));

const smoothCurve = (t: number): number => t * t * (3 - 2 * t);

function log(a: Interval, f: (x: number) => number): Interval {
  return a.hi < 0 ? NOTHING : iv(a.lo > 0 ? f(a.lo) : -Infinity, f(a.hi));
}

function rem(a: Interval, b: Interval): Interval {
  // |a % b| < |b|, with a's sign; a itself when |a| is below every |b|.
  const m = Math.max(Math.abs(b.lo), Math.abs(b.hi));
  const least = b.lo > 0 ? b.lo : b.hi < 0 ? -b.hi : 0;
  if (Math.max(Math.abs(a.lo), Math.abs(a.hi)) < least) {
    return a;
  }
  return iv(
    a.lo >= 0 ? 0 : Math.max(a.lo, -m),
    a.hi <= 0 ? 0 : Math.min(a.hi, m),
  );
}

/** One lane of a componentwise op (unary, binary, ternary, compare, logic). */
function lane(op: string, a: Interval, b: Interval, c: Interval): Interval {
  switch (op) {
    case "math/neg":
      return iv(-a.hi, -a.lo);
    case "math/abs":
      return abs(a);
    case "math/sqrt":
      return a.hi < 0
        ? NOTHING
        : monotone(Math.sqrt, iv(Math.max(a.lo, 0), a.hi));
    case "math/cbrt":
      return monotone(Math.cbrt, a);
    case "math/exp":
      return monotone(Math.exp, a);
    case "math/log":
      return log(a, Math.log);
    case "math/log2":
      return log(a, Math.log2);
    case "math/log10":
      return log(a, Math.log10);
    case "math/sin":
      return sin(a);
    case "math/cos":
      return cos(a);
    case "math/tan":
      return tan(a);
    case "math/atan":
      return monotone(Math.atan, a);
    case "math/asin":
      return a.lo > 1 || a.hi < -1
        ? NOTHING
        : monotone(Math.asin, iv(Math.max(a.lo, -1), Math.min(a.hi, 1)));
    case "math/acos": {
      if (a.lo > 1 || a.hi < -1) {
        return NOTHING;
      }
      const x = iv(Math.max(a.lo, -1), Math.min(a.hi, 1));
      return iv(Math.acos(x.hi), Math.acos(x.lo));
    }
    case "math/sinh":
      return monotone(Math.sinh, a);
    case "math/tanh":
      return monotone(Math.tanh, a);
    case "math/cosh":
      return a.lo >= 0
        ? monotone(Math.cosh, a)
        : a.hi <= 0
          ? iv(Math.cosh(a.hi), Math.cosh(a.lo))
          : iv(1, Math.max(Math.cosh(a.lo), Math.cosh(a.hi)));
    case "math/floor":
      return monotone(Math.floor, a);
    case "math/ceil":
      return monotone(Math.ceil, a);
    case "math/trunc":
      return monotone(Math.trunc, a);
    case "math/round":
      return monotone((x) => Math.sign(x) * Math.round(Math.abs(x)), a);
    case "math/sign":
      return monotone(Math.sign, a);
    case "math/fract": {
      const base = Math.floor(a.lo);
      return Math.floor(a.hi) === base
        ? iv(a.lo - base, a.hi - base)
        : iv(0, 1);
    }
    case "math/saturate":
      return clamp(a, FALSE, TRUE);
    case "math/add":
      return add(a, b);
    case "math/sub":
      return sub(a, b);
    case "math/mul":
      return mul(a, b);
    case "math/div":
      return mul(a, reciprocal(b));
    case "math/rem":
      return rem(a, b);
    case "math/min":
      return min(a, b);
    case "math/max":
      return max(a, b);
    case "math/pow":
      return pow(a, b);
    case "math/atan2":
      return atan2(a, b);
    case "math/clamp":
      return clamp(a, b, c);
    case "math/mix": {
      // (1 - t) a + t b; for t in [0, 1] the hull of a and b is tighter.
      const left = mul(iv(1 - c.hi, 1 - c.lo), a);
      const right = mul(c, b);
      const direct = add(left, right);
      return c.lo >= 0 && c.hi <= 1
        ? iv(
            Math.max(direct.lo, Math.min(a.lo, b.lo)),
            Math.min(direct.hi, Math.max(a.hi, b.hi)),
          )
        : direct;
    }
    case "math/smoothStep": {
      // t = saturate((x - min(e0, e1)) / |e1 - e0|): the curve rises on [0, 1].
      const ratio = mul(sub(c, min(a, b)), reciprocal(abs(sub(b, a))));
      return monotone(smoothCurve, clamp(ratio, FALSE, TRUE));
    }
    case "math/lt":
      return lessThan(a, b, false);
    case "math/le":
      return lessThan(a, b, true);
    case "math/gt":
      return lessThan(b, a, false);
    case "math/ge":
      return lessThan(b, a, true);
    case "math/eq":
      return equal(a, b);
    case "math/and": {
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
    case "math/or": {
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
    case "math/not":
      return not(a);
    default:
      throw new Error(`interval: no rule for '${op}'`);
  }
}

const square = (x: Interval): Interval => pow(x, iv(2, 2));

const point = (v: number): Interval => iv(v, v);

function valueLanes(v: Value): Interval[] {
  return typeof v === "number"
    ? [point(v)]
    : typeof v === "boolean"
      ? [v ? TRUE : FALSE]
      : v.map(point);
}

function rangeLanes(r: Range, n: number, name: string): readonly Interval[] {
  const lanes =
    typeof r === "number"
      ? [point(r)]
      : Array.isArray(r)
        ? (r as readonly Interval[])
        : [r as Interval];
  if (lanes.length !== n) {
    throw new Error(
      `input '${name}' has ${n} lanes, its range ${lanes.length}`,
    );
  }
  return lanes;
}

/** Bounds of every equation's lanes, in program order. */
function allBounds(
  p: Program,
  ranges: Readonly<Record<string, Range>>,
): (readonly Interval[])[] {
  const v: (readonly Interval[])[] = new Array(p.eqns.length);
  p.eqns.forEach((e, id) => {
    const args = e.args.map((x) => v[x]!);
    const [a, b, c] = args;
    switch (e.op) {
      case "const":
      case "literal":
        v[id] = valueLanes(e.value!);
        return;
      case "input": {
        const input = p.inputs[e.index!]!;
        const r = ranges[input.name];
        if (r === undefined) {
          throw new Error(`input '${input.name}' has no range`);
        }
        v[id] = rangeLanes(r, width(input.type), input.name);
        return;
      }
      case "math/select": {
        const t = truth(a![0]!);
        v[id] =
          t === undefined ? b!.map((x, i) => hull(x, c![i]!)) : t ? b! : c!;
        return;
      }
      case "type/boolToFloat":
      case "type/intToFloat":
        v[id] = a!;
        return;
      case "math/dot":
        v[id] = [a!.map((x, i) => mul(x, b![i]!)).reduce((s, x) => add(s, x))];
        return;
      case "math/length": {
        const sum = a!.map(square).reduce((s, x) => add(s, x));
        v[id] = [lane("math/sqrt", sum, WHOLE, WHOLE)];
        return;
      }
      case "math/normalize": {
        // Each lane over the length, within [-1, 1]; 0 where the length may be 0.
        const sum = a!.map(square).reduce((s, x) => add(s, x));
        const len = lane("math/sqrt", sum, WHOLE, WHOLE);
        v[id] = a!.map((x) => {
          const q = mul(x, reciprocal(len));
          const lo = Math.max(q.lo, -1);
          const hi = Math.min(q.hi, 1);
          return len.lo > 0 ? iv(lo, hi) : iv(Math.min(lo, 0), Math.max(hi, 0));
        });
        return;
      }
      case "math/cross": {
        const t = (i: number, j: number) =>
          sub(mul(a![i]!, b![j]!), mul(a![j]!, b![i]!));
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
    const n = width(e.type);
    v[id] = Array.from({ length: n }, (_, i) =>
      lane(e.op, a![i]!, b?.[i] ?? WHOLE, c?.[i] ?? WHOLE),
    );
  });
  return v;
}

/** Bounds of each output, lane by lane, over the inputs' ranges (by name). */
export function evaluateInterval(
  p: Program,
  ranges: Readonly<Record<string, Range>>,
): Record<string, readonly Interval[]> {
  const v = allBounds(p, ranges);
  return Object.fromEntries(p.outputs.map((o) => [o.name, v[o.id]!]));
}

/** Where to cut a lane's range: points inside it (CS-56's table breakpoints come through here). */
export type Breakpoints = (
  p: Program,
  ranges: Readonly<Record<string, Range>>,
  input: string,
  lane: number,
) => readonly number[];

export interface SplitOptions {
  /** The input whose lane is split. */
  readonly input: string;
  /** Its lane (default 0). */
  readonly lane?: number;
  /** More breakpoints beside the branch conditions' (tables, from CS-56). */
  readonly breakpoints?: Breakpoints;
  /** At most this many interval evaluations to find the conditions' breakpoints (default 4096). */
  readonly budget?: number;
}

export interface SplitBounds {
  readonly bounds: Record<string, readonly Interval[]>;
  /** The cuts, in order: a piece ends below one and the next starts at it. */
  readonly cuts: readonly number[];
  readonly pieces: number;
}

function nextDown(x: number): number {
  if (x === 0) {
    return -Number.MIN_VALUE;
  }
  if (!Number.isFinite(x)) {
    return x;
  }
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  view.setBigInt64(0, view.getBigInt64(0) + (x > 0 ? -1n : 1n));
  return view.getFloat64(0);
}

const COMPARE = new Set([
  "math/lt",
  "math/le",
  "math/gt",
  "math/ge",
  "math/eq",
]);

/**
 * The branch conditions that depend on `input`'s `lane` and on no other
 * input lane with a range wider than a point: those whose change a cut of
 * that lane alone can isolate. A comparison's dependence is read from its
 * operands' tangents (a zero tangent is no node).
 */
function conditionsOn(
  p: Program,
  ranges: Readonly<Record<string, Range>>,
  input: string,
  laneIndex: number,
): Id[] {
  const compares = p.eqns.flatMap((e, id) => (COMPARE.has(e.op) ? [id] : []));
  if (compares.length === 0) {
    return [];
  }
  const b = Builder.from(p);
  const operands = compares.flatMap((id) => p.eqns[id]!.args);
  const dependsOn = (dir: { input: string; lane?: number }) =>
    jvp(b, operands, dir).map((t) => t !== null);
  const along = dependsOn({ input, lane: laneIndex });
  const elsewhere = new Array<boolean>(operands.length).fill(false);
  for (const inp of p.inputs) {
    const r = ranges[inp.name];
    if (r === undefined) {
      continue;
    }
    const lanes = rangeLanes(r, width(inp.type), inp.name);
    lanes.forEach((x, l) => {
      if ((inp.name === input && l === laneIndex) || x.lo === x.hi) {
        return;
      }
      dependsOn({ input: inp.name, lane: l }).forEach((d, i) => {
        elsewhere[i] ||= d;
      });
    });
  }
  return compares.filter(
    (_, n) =>
      (along[2 * n]! || along[2 * n + 1]!) &&
      !elsewhere[2 * n]! &&
      !elsewhere[2 * n + 1]!,
  );
}

const midpoint = (x: Interval): number =>
  Number.isFinite(x.lo) && Number.isFinite(x.hi)
    ? x.lo + (x.hi - x.lo) / 2
    : x.lo;

/**
 * Where the branch conditions on `input`'s `lane` change inside `range`:
 * interval-guided root isolation. A sub-range where every such condition is
 * decided holds no change; one where a condition may change is halved until
 * its ends are adjacent floats, and there the float64 values place the cut.
 */
function conditionCuts(
  p: Program,
  ranges: Readonly<Record<string, Range>>,
  input: string,
  laneIndex: number,
  range: Interval,
  budget: number,
): number[] {
  const conditions = conditionsOn(p, ranges, input, laneIndex);
  if (
    conditions.length === 0 ||
    !(range.lo < range.hi) ||
    !Number.isFinite(range.hi - range.lo)
  ) {
    return [];
  }
  const b = Builder.from(p);
  const probe = b.program(
    Object.fromEntries(conditions.map((id, i) => [`c${i}`, id])),
  );
  const decl = p.inputs.find((x) => x.name === input)!;
  const n = width(decl.type);
  const withLane = (x: Interval): Record<string, Range> => {
    const lanes = rangeLanes(ranges[input]!, n, input).map((r, l) =>
      l === laneIndex ? x : r,
    );
    return { ...ranges, [input]: n === 1 ? lanes[0]! : lanes };
  };
  // Point values for the float64 evaluator: other inputs at their midpoints
  // (the conditions don't depend on them).
  const pointAt = (x: number): Record<string, Value> => {
    const values: Record<string, Value> = {};
    for (const inp of p.inputs) {
      const r = ranges[inp.name];
      if (r === undefined) {
        continue;
      }
      const lanes = rangeLanes(r, width(inp.type), inp.name).map((y, l) =>
        inp.name === input && l === laneIndex ? x : midpoint(y),
      );
      values[inp.name] =
        inp.type === "bool"
          ? lanes[0]! !== 0
          : lanes.length === 1
            ? lanes[0]!
            : lanes;
    }
    return values;
  };
  const decide = (x: number): string =>
    JSON.stringify(Object.values(evaluate(probe, pointAt(x))));
  const cuts: number[] = [];
  let left = budget;
  const visit = (lo: number, hi: number): void => {
    if (left-- <= 0) {
      return;
    }
    const bounds = evaluateInterval(probe, withLane(iv(lo, hi)));
    if (Object.values(bounds).every((c) => truth(c[0]!) !== undefined)) {
      return;
    }
    const mid = lo + (hi - lo) / 2;
    if (mid <= lo || mid >= hi) {
      // Adjacent floats: the conditions change at hi if their values do.
      if (decide(lo) !== decide(hi)) {
        cuts.push(hi);
      }
      return;
    }
    visit(lo, mid);
    visit(mid, hi);
  };
  visit(range.lo, range.hi);
  return cuts;
}

/**
 * Bounds as `evaluateInterval`'s, with one input lane's range cut wherever a
 * branch condition on it changes (and at `breakpoints`), so each piece
 * takes one branch of every such condition. The result is the hull of the
 * pieces' bounds. A condition that also depends on another ranged input
 * isn't cut on: its pieces hull its branches, as without splitting.
 */
export function evaluateIntervalSplit(
  p: Program,
  ranges: Readonly<Record<string, Range>>,
  options: SplitOptions,
): SplitBounds {
  const laneIndex = options.lane ?? 0;
  const decl = p.inputs.find((x) => x.name === options.input);
  if (!decl) {
    throw new Error(`no input '${options.input}'`);
  }
  const n = width(decl.type);
  const given = ranges[options.input];
  if (given === undefined) {
    throw new Error(`input '${options.input}' has no range`);
  }
  const lanes = rangeLanes(given, n, options.input);
  const range = lanes[laneIndex]!;
  const found = new Set<number>(
    conditionCuts(
      p,
      ranges,
      options.input,
      laneIndex,
      range,
      options.budget ?? 4096,
    ),
  );
  for (const x of options.breakpoints?.(p, ranges, options.input, laneIndex) ??
    []) {
    found.add(x);
  }
  const cuts = [...found]
    .filter((x) => x > range.lo && x <= range.hi)
    .sort((x, y) => x - y);
  const edges = [range.lo, ...cuts, range.hi];
  let out: Record<string, readonly Interval[]> | undefined;
  let pieces = 0;
  for (let k = 0; k + 1 < edges.length; k++) {
    const last = k + 2 === edges.length;
    const piece = iv(edges[k]!, last ? edges[k + 1]! : nextDown(edges[k + 1]!));
    if (piece.lo > piece.hi) {
      continue;
    }
    const pieceLanes = lanes.map((x, l) => (l === laneIndex ? piece : x));
    const bounds = evaluateInterval(p, {
      ...ranges,
      [options.input]: n === 1 ? pieceLanes[0]! : pieceLanes,
    });
    pieces++;
    out = out
      ? Object.fromEntries(
          Object.entries(out).map(([name, ls]) => [
            name,
            ls.map((x, i) => hull(x, bounds[name]![i]!)),
          ]),
        )
      : bounds;
  }
  return { bounds: out!, cuts, pieces };
}
