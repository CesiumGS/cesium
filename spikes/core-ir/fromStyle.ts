// Front end 1: a 1.x / 3D Tiles style expression to the IR, through today's
// parser (`parseStyleExpression`). Properties are per-feature float inputs.
// Every number written in the expression is a literal with a slot (its path
// in the syntax tree), so changing `> 50` to `> 60` keeps the shape and is a
// uniform write. Colors are as written (sRGB), as 1.x's `evaluateColor`.
// The spike covers numbers, booleans, colors and vectors; string ids,
// regular expressions and `match()` stay with today's compiler.

import {
  cssColor,
  parseStyleExpression,
  type StyleNode,
} from "../../packages/next/src/scene/styleExpression.ts";
import { Builder, width, type Id, type Program } from "./cir.ts";

const UNARY_1X: Record<string, string> = {
  abs: "math/abs",
  sqrt: "math/sqrt",
  sin: "math/sin",
  cos: "math/cos",
  tan: "math/tan",
  asin: "math/asin",
  acos: "math/acos",
  atan: "math/atan",
  sign: "math/sign",
  floor: "math/floor",
  ceil: "math/ceil",
  exp: "math/exp",
  log: "math/log",
  log2: "math/log2",
  fract: "math/fract",
  normalize: "math/normalize",
  length: "math/length",
};
const BINARY_1X: Record<string, string> = {
  min: "math/min",
  max: "math/max",
  pow: "math/pow",
  atan2: "math/atan2",
  dot: "math/dot",
  cross: "math/cross",
};

export function lowerStyle(b: Builder, source: string, path = "s"): Id {
  const ast = parseStyleExpression(source);
  const fail = (m: string): never => {
    throw new Error(`style "${source}": ${m}`);
  };
  // Lifts a float to the other operand's width (1.x: vec * number).
  const broadcast = (x: Id, y: Id): [Id, Id] => {
    const [nx, ny] = [width(b.typeOf(x)), width(b.typeOf(y))];
    return nx === ny
      ? [x, y]
      : nx === 1
        ? [b.splat(x, ny), y]
        : [x, b.splat(y, nx)];
  };
  const go = (n: StyleNode, at: string): Id => {
    switch (n.kind) {
      case "number":
        return b.literal(at, n.value);
      case "boolean":
        return b.const(n.value);
      case "property":
        return b.input(n.name, "float", "feature");
      case "string":
        return fail("strings outside color() aren't in the spike");
      case "unary": {
        const x = go(n.arg, `${at}.0`);
        return n.op === "!"
          ? b.op("math/not", [x])
          : n.op === "-"
            ? b.op("math/neg", [x])
            : x;
      }
      case "binary": {
        const l = go(n.left, `${at}.0`);
        const r = go(n.right, `${at}.1`);
        switch (n.op) {
          case "&&":
            return b.op("math/and", [l, r]);
          case "||":
            return b.op("math/or", [l, r]);
          case "===":
          case "==":
            return b.op("math/eq", [l, r]);
          case "!==":
          case "!=":
            return b.op("math/not", [b.op("math/eq", [l, r])]);
          case "<":
            return b.op("math/lt", [l, r]);
          case "<=":
            return b.op("math/le", [l, r]);
          case ">":
            return b.op("math/gt", [l, r]);
          case ">=":
            return b.op("math/ge", [l, r]);
          default: {
            const op = {
              "+": "math/add",
              "-": "math/sub",
              "*": "math/mul",
              "/": "math/div",
              "%": "math/rem",
            }[n.op];
            if (!op) {
              fail(`operator ${n.op} isn't in the spike`);
            }
            return b.op(op!, broadcast(l, r));
          }
        }
      }
      case "ternary":
        return b.op("math/select", [
          go(n.test, `${at}.0`),
          go(n.then, `${at}.1`),
          go(n.else, `${at}.2`),
        ]);
      case "call": {
        const args = (k: number) =>
          n.args.map((a, i) => go(a, `${at}.${i}`)).slice(0, k);
        if (n.name === "color") {
          const first = n.args[0];
          if (first?.kind !== "string") {
            fail("color() takes a CSS string");
          }
          const rgba =
            cssColor((first as { value: string }).value) ??
            fail("unknown color");
          const rgb = b.literal(`${at}.rgb`, rgba.slice(0, 3));
          const alpha = n.args[1]
            ? go(n.args[1], `${at}.1`)
            : b.literal(`${at}.a`, rgba[3]);
          return b.op(
            "math/combine4",
            [0, 1, 2].map((i) => b.op("math/extract3", [rgb], i)).concat(alpha),
          );
        }
        if (n.name === "rgb" || n.name === "rgba") {
          const xs = args(4).map((x, i) =>
            i < 3 ? b.op("math/div", [x, b.const(255)]) : x,
          );
          if (n.name === "rgb") {
            xs.push(b.const(1));
          }
          return b.op("math/combine4", xs);
        }
        if (/^vec[234]$/.test(n.name)) {
          const k = Number(n.name[3]);
          const xs = args(k);
          return xs.length === 1
            ? b.splat(xs[0]!, k)
            : b.op(`math/combine${k}`, xs);
        }
        if (n.name === "round") {
          // 1.x: Math.round, which is floor(x + 0.5), not KHR's half away from zero.
          const [x] = args(1);
          return b.op("math/floor", [
            b.op("math/add", [x!, b.splat(b.const(0.5), width(b.typeOf(x!)))]),
          ]);
        }
        if (n.name === "clamp" || n.name === "mix") {
          const [x, lo, hi] = args(3);
          const w = width(b.typeOf(x!));
          const lift = (y: Id) => b.splat(y, width(b.typeOf(y)) === 1 ? w : 1);
          return b.op(`math/${n.name}`, [x!, lift(lo!), lift(hi!)]);
        }
        const un = UNARY_1X[n.name];
        if (un) {
          return b.op(un, args(1));
        }
        const bin = BINARY_1X[n.name];
        if (bin) {
          return b.op(bin, broadcast(...(args(2) as [Id, Id])));
        }
        return fail(`function ${n.name}() isn't in the spike`);
      }
      case "member": {
        const x = go(n.object, `${at}.0`);
        const i = "xyzwrgba".indexOf(n.name) % 4;
        if (n.name.length !== 1 || i < 0) {
          fail(`member .${n.name} isn't in the spike`);
        }
        return b.op(`math/extract${width(b.typeOf(x))}`, [x], i);
      }
    }
  };
  return go(ast, path);
}

/** A style's `show` and `color` as one program. */
export function styleProgram(style: {
  show?: string;
  color?: string;
}): Program {
  const b = new Builder();
  const outs: Record<string, Id> = {};
  if (style.show) {
    outs.show = lowerStyle(b, style.show, "show");
  }
  if (style.color) {
    outs.color = lowerStyle(b, style.color, "color");
  }
  return b.program(outs);
}
