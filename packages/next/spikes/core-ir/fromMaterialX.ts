// Front end 3: a MaterialX node graph (XML) to the IR. Pattern nodes map to
// ops one by one; `texcoord` and `position` are per-vertex inputs and
// `geompropvalue` a per-feature one (a feature property, by its `geomprop`
// name). Every input value is a literal with the slot `node.input`, so
// editing a value is a uniform write and only an edit to a node's category
// or wiring changes the shape. A small XML reader covers what `.mtlx`
// files use (elements, attributes, comments); the browser's DOMParser
// would do in a page.

import {
  Builder,
  floatOf,
  width,
  type Id,
  type Program,
  type Type,
} from "./cir.ts";

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
}

export function parseXml(text: string): XmlElement {
  const root: XmlElement = { name: "#root", attrs: {}, children: [] };
  const stack = [root];
  const re =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[1]) {
      if (stack.pop()!.name !== m[1]) {
        throw new Error(`xml: unbalanced </${m[1]}>`);
      }
    } else if (m[2]) {
      const attrs: Record<string, string> = {};
      for (const a of m[3]!.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
        attrs[a[1]!] = a[2]!;
      }
      const el: XmlElement = { name: m[2], attrs, children: [] };
      stack.at(-1)!.children.push(el);
      if (!m[4]) {
        stack.push(el);
      }
    }
  }
  return root;
}

const MX_TYPES: Record<string, Type> = {
  float: "float",
  vector2: "float2",
  vector3: "float3",
  vector4: "float4",
  color3: "float3",
  color4: "float4",
};

/** Same-named inputs, one op (componentwise; a float operand is broadcast). */
const DIRECT: Record<string, [string, string[]]> = {
  add: ["math/add", ["in1", "in2"]],
  subtract: ["math/sub", ["in1", "in2"]],
  multiply: ["math/mul", ["in1", "in2"]],
  divide: ["math/div", ["in1", "in2"]],
  power: ["math/pow", ["in1", "in2"]],
  min: ["math/min", ["in1", "in2"]],
  max: ["math/max", ["in1", "in2"]],
  atan2: ["math/atan2", ["iny", "inx"]],
  absval: ["math/abs", ["in"]],
  sign: ["math/sign", ["in"]],
  floor: ["math/floor", ["in"]],
  ceil: ["math/ceil", ["in"]],
  sin: ["math/sin", ["in"]],
  cos: ["math/cos", ["in"]],
  tan: ["math/tan", ["in"]],
  sqrt: ["math/sqrt", ["in"]],
  exp: ["math/exp", ["in"]],
  ln: ["math/log", ["in"]],
  normalize: ["math/normalize", ["in"]],
  magnitude: ["math/length", ["in"]],
  dotproduct: ["math/dot", ["in1", "in2"]],
  crossproduct: ["math/cross", ["in1", "in2"]],
  clamp: ["math/clamp", ["in", "low", "high"]],
  smoothstep: ["math/smoothStep", ["low", "high", "in"]],
};

/** The graph's outputs as one program (every `<output>` of the first nodegraph). */
export function materialXProgram(text: string): Program {
  const doc = parseXml(text).children.find((e) => e.name === "materialx");
  const graph = doc?.children.find((e) => e.name === "nodegraph");
  if (!graph) {
    throw new Error("mtlx: no <nodegraph>");
  }
  const nodes = new Map(
    graph.children
      .filter((e) => e.name !== "output")
      .map((e) => [e.attrs.name!, e]),
  );
  const b = new Builder();
  const memo = new Map<string, Id>();
  const visiting = new Set<string>();

  const valueOf = (type: Type, text: string): number | number[] => {
    const xs = text.split(",").map(Number);
    return width(type) === 1 ? xs[0]! : xs;
  };
  const input = (node: XmlElement, name: string, want?: Type): Id => {
    const el = node.children.find(
      (c) => c.name === "input" && c.attrs.name === name,
    );
    if (!el) {
      throw new Error(`mtlx: ${node.attrs.name} has no input '${name}'`);
    }
    let id: Id;
    if (el.attrs.nodename) {
      id = lower(el.attrs.nodename);
    } else {
      const type = MX_TYPES[el.attrs.type ?? "float"] ?? "float";
      id = b.literal(
        `${node.attrs.name}.${name}`,
        valueOf(type, el.attrs.value ?? "0"),
      );
    }
    if (want && b.typeOf(id) !== want) {
      if (b.typeOf(id) !== "float") {
        throw new Error(
          `mtlx: ${node.attrs.name}.${name} is ${b.typeOf(id)}, wants ${want}`,
        );
      }
      id = b.splat(id, width(want));
    }
    return id;
  };

  const lower = (name: string): Id => {
    const found = memo.get(name);
    if (found !== undefined) {
      return found;
    }
    if (visiting.has(name)) {
      throw new Error(`mtlx: cycle through ${name}`);
    }
    visiting.add(name);
    const node = nodes.get(name);
    if (!node) {
      throw new Error(`mtlx: no node '${name}'`);
    }
    const type = MX_TYPES[node.attrs.type ?? "float"] ?? "float";
    const id = lowerNode(node, type);
    visiting.delete(name);
    memo.set(name, id);
    return id;
  };

  const lowerNode = (node: XmlElement, type: Type): Id => {
    const cat = node.name;
    const direct = DIRECT[cat];
    if (direct) {
      const [op, names] = direct;
      // Reductions and products take their operands' type; the rest the node's.
      const operand =
        op === "math/dot" || op === "math/length" ? undefined : type;
      const args = names.map((n) => input(node, n, operand));
      const w = Math.max(...args.map((a) => width(b.typeOf(a))));
      return b.op(
        op,
        args.map((a) => (width(b.typeOf(a)) < w ? b.splat(a, w) : a)),
      );
    }
    switch (cat) {
      case "constant":
        return input(node, "value", type);
      case "texcoord":
        return b.input("texcoord", "float2", "vertex");
      case "position":
        return b.input("position", "float3", "vertex");
      case "geompropvalue": {
        const prop = node.children.find((c) => c.attrs.name === "geomprop")
          ?.attrs.value;
        if (!prop) {
          throw new Error(`mtlx: ${node.attrs.name} has no geomprop`);
        }
        return b.input(prop, type, "feature");
      }
      case "mix":
        // MaterialX: bg (1 - mix) + fg mix.
        return b.op("math/mix", [
          input(node, "bg", type),
          input(node, "fg", type),
          input(node, "mix", type),
        ]);
      case "modulo": {
        // MaterialX's modulo is floored: x - y floor(x / y).
        const x = input(node, "in1", type);
        const y = input(node, "in2", type);
        return b.op("math/sub", [
          x,
          b.op("math/mul", [y, b.op("math/floor", [b.op("math/div", [x, y])])]),
        ]);
      }
      case "ifgreater":
        return b.op("math/select", [
          b.op("math/gt", [
            input(node, "value1", "float"),
            input(node, "value2", "float"),
          ]),
          input(node, "in1", type),
          input(node, "in2", type),
        ]);
      case "extract": {
        const v = input(node, "in");
        const idx = Number(
          node.children.find((c) => c.attrs.name === "index")?.attrs.value ?? 0,
        );
        return b.op(`math/extract${width(b.typeOf(v))}`, [v], idx);
      }
      case "convert": {
        const v = input(node, "in");
        return width(b.typeOf(v)) === 1 ? b.splat(v, width(type)) : v;
      }
      case "combine2":
      case "combine3":
      case "combine4": {
        const n = Number(cat.at(-1));
        return b.op(
          `math/combine${n}`,
          Array.from({ length: n }, (_, i) =>
            input(node, `in${i + 1}`, "float"),
          ),
        );
      }
      default:
        throw new Error(`mtlx: node category '${cat}' isn't in the spike`);
    }
  };

  const outs: Record<string, Id> = {};
  for (const o of graph.children.filter((e) => e.name === "output")) {
    outs[o.attrs.name!] = lower(o.attrs.nodename!);
  }
  void floatOf;
  return b.program(outs);
}

/** Edits as a live editor makes them, on the XML text. */
export const mtlxEdit = {
  /** A new value for `node.input`. */
  value(text: string, node: string, inputName: string, value: string): string {
    return replaceInNode(text, node, (body) =>
      body.replace(
        new RegExp(`(<input name="${inputName}"[^>]*value=")[^"]*(")`),
        `$1${value}$2`,
      ),
    );
  },
  /** A node's category, with the same inputs. */
  category(text: string, node: string, category: string): string {
    const re = new RegExp(`<(\\w+)( name="${node}"[^>]*>)([\\s\\S]*?)</\\1>`);
    return text.replace(re, `<${category}$2$3</${category}>`);
  },
  /** An input wired to another node. */
  wire(text: string, node: string, inputName: string, from: string): string {
    return replaceInNode(text, node, (body) =>
      body.replace(
        new RegExp(`<input name="${inputName}"[^>]*/>`),
        `<input name="${inputName}" type="float" nodename="${from}"/>`,
      ),
    );
  },
};

function replaceInNode(
  text: string,
  node: string,
  f: (body: string) => string,
): string {
  const re = new RegExp(`(<(\\w+) name="${node}"[^>]*>)([\\s\\S]*?)(</\\2>)`);
  return text.replace(
    re,
    (_, open: string, _cat: string, body: string, close: string) =>
      open + f(body) + close,
  );
}
