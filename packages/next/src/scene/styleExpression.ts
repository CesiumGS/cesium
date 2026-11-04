/**
 * 3D Tiles styling expressions (the 1.x `Cesium3DTileStyle` language)
 * compiled to WGSL over a feature's metadata (plan §3.4, feature styling).
 * Node-safe. Semantics follow 1.x's `Expression`: `rgb` takes bytes,
 * `hsl` a hue in [0, 1], `color` a CSS name or hex string and an alpha;
 * colors are RGBA in [0, 1] as written (sRGB).
 *
 * Every value is typed at compile time: number (f32), boolean, vec2–vec4
 * and color (vec4). Strings exist only as `color()`'s argument and
 * `${feature['name']}` keys; comparing string properties, regular
 * expressions and `undefined` checks need properties the GPU doesn't have
 * and are refused with an error naming them.
 *
 * The vector styling language's additions (vector/VectorStyle.ts) parse
 * here too: lengths and angles with units (`14px`, `2km`, `90deg`, read as
 * pixels, meters and degrees), `a ?? b` (`a` when it compiles: the GPU has
 * no undefined values), `match(v, k1, r1, …, default)`, and enum
 * properties (`StyleValue.enum`) compared with their names. Callers add
 * functions (`scale()`) and give string literals meaning (`options`).
 */

export type StyleType = "number" | "boolean" | "vec2" | "vec3" | "vec4";

/** A compiled expression: WGSL and its type. */
export interface StyleValue {
  wgsl: string;
  type: StyleType;
  /** An enum property's names, by index (its value is the index). */
  enum?: readonly string[];
}

/** A parsed expression. */
export type StyleNode = Node;

/** Extensions for a caller's language (the vector styling language). */
export interface StyleCompileOptions {
  /** Functions beyond 1.x's, given their arguments unevaluated. */
  functions?: Record<
    string,
    (args: StyleNode[], compile: (node: StyleNode) => StyleValue) => StyleValue
  >;
  /** A string literal's value outside `color()` (a shape's name, say). */
  string?: (value: string) => StyleValue | undefined;
}

/** What expressions read: each `${property}` as WGSL of a type. */
export type PropertyReader = (name: string) => StyleValue;

type Node =
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "string"; value: string }
  | { kind: "property"; name: string }
  | { kind: "unary"; op: string; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "ternary"; test: Node; then: Node; else: Node }
  | { kind: "call"; name: string; args: Node[] }
  | { kind: "member"; object: Node; name: string };

type Token =
  | { t: "number"; v: number }
  | { t: "string"; v: string }
  | { t: "property"; v: string }
  | { t: "name"; v: string }
  | { t: "op"; v: string }
  | { t: "end" };

const OPS = [
  "??",
  "===",
  "!==",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "=~",
  "!~",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "?",
  ":",
  "(",
  ")",
  ",",
  ".",
  "[",
  "]",
];

function fail(source: string, message: string): never {
  throw new Error(`Style expression "${source}": ${message}`);
}

/** `${name}`, `${feature.name}` and `${feature['name']}` to the name. */
function propertyName(inner: string, source: string): string {
  const s = inner.trim();
  const bracket = /^feature\s*\[\s*(['"])(.*)\1\s*\]$/.exec(s);
  if (bracket) {
    return bracket[2]!;
  }
  const dotted = /^feature\.(.+)$/.exec(s);
  if (dotted) {
    return dotted[1]!;
  }
  if (s === "feature" || s === "") {
    fail(source, `\${${inner}} isn't a property`);
  }
  return s;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (c === "$" && source[i + 1] === "{") {
      const end = source.indexOf("}", i);
      if (end < 0) {
        fail(source, "unclosed ${");
      }
      tokens.push({
        t: "property",
        v: propertyName(source.slice(i + 2, end), source),
      });
      i = end + 1;
    } else if (
      /[0-9]/.test(c) ||
      (c === "." && /[0-9]/.test(source[i + 1] ?? ""))
    ) {
      const m = /^(?:[0-9]*\.?[0-9]+|[0-9]+\.)(?:[eE][+-]?[0-9]+)?/.exec(
        source.slice(i),
      )!;
      i += m[0].length;
      // A unit (the vector language's lengths and angles): pixels,
      // meters and degrees.
      const unit = /^(px|mm|km|m|deg|rad|ms|s)(?![A-Za-z0-9_])/.exec(
        source.slice(i),
      );
      const scale = unit ? UNITS[unit[1]!]! : 1;
      tokens.push({ t: "number", v: Number(m[0]) * scale });
      i += unit ? unit[0].length : 0;
    } else if (c === "'" || c === '"') {
      const end = source.indexOf(c, i + 1);
      if (end < 0) {
        fail(source, "unclosed string");
      }
      tokens.push({ t: "string", v: source.slice(i + 1, end) });
      i = end + 1;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i))!;
      tokens.push({ t: "name", v: m[0] });
      i += m[0].length;
    } else {
      const rest = source.slice(i);
      const op = OPS.find((o) => rest.startsWith(o));
      if (!op) {
        fail(source, `unexpected "${c}"`);
      }
      tokens.push({ t: "op", v: op });
      i += op.length;
    }
  }
  tokens.push({ t: "end" });
  return tokens;
}

/** Units to pixels, meters, degrees and seconds (`mm` at 96 px an inch). */
const UNITS: Record<string, number> = {
  px: 1,
  mm: 96 / 25.4,
  m: 1,
  km: 1000,
  deg: 1,
  rad: 180 / Math.PI,
  s: 1,
  ms: 0.001,
};

/** Binary operators by precedence, loosest first (as JavaScript's). */
const LEVELS = [
  ["??", "||"],
  ["&&"],
  ["===", "!==", "==", "!=", "=~", "!~"],
  ["<", "<=", ">", ">="],
  ["+", "-"],
  ["*", "/", "%"],
];

export function parseStyleExpression(source: string): Node {
  const tokens = tokenize(source);
  let at = 0;
  const peek = () => tokens[at]!;
  const isOp = (v: string) => {
    const t = peek();
    return t.t === "op" && t.v === v;
  };
  const expect = (v: string) => {
    if (!isOp(v)) {
      fail(source, `expected "${v}"`);
    }
    at++;
  };
  const ternary = (): Node => {
    const test = binary(0);
    if (isOp("?")) {
      at++;
      const then = ternary();
      expect(":");
      return { kind: "ternary", test, then, else: ternary() };
    }
    return test;
  };
  const binary = (level: number): Node => {
    if (level === LEVELS.length) {
      return unary();
    }
    let left = binary(level + 1);
    for (;;) {
      const t = peek();
      if (t.t === "op" && LEVELS[level]!.includes(t.v)) {
        at++;
        left = { kind: "binary", op: t.v, left, right: binary(level + 1) };
      } else {
        return left;
      }
    }
  };
  const unary = (): Node => {
    const t = peek();
    if (t.t === "op" && (t.v === "!" || t.v === "-" || t.v === "+")) {
      at++;
      return { kind: "unary", op: t.v, arg: unary() };
    }
    return postfix(primary());
  };
  const postfix = (node: Node): Node => {
    while (isOp(".")) {
      at++;
      const t = peek();
      if (t.t !== "name") {
        fail(source, "expected a member name after .");
      }
      at++;
      node = { kind: "member", object: node, name: t.v };
    }
    return node;
  };
  const primary = (): Node => {
    const t = peek();
    at++;
    switch (t.t) {
      case "number":
        return { kind: "number", value: t.v };
      case "string":
        return { kind: "string", value: t.v };
      case "property":
        return { kind: "property", name: t.v };
      case "name": {
        if (t.v === "true" || t.v === "false") {
          return { kind: "boolean", value: t.v === "true" };
        }
        if (!isOp("(")) {
          if (t.v === "undefined" || t.v === "null") {
            fail(
              source,
              `${t.v} isn't supported on the GPU (missing values read 0)`,
            );
          }
          if (t.v === "Infinity") {
            return { kind: "number", value: Infinity };
          }
          if (t.v === "NaN") {
            return { kind: "number", value: NaN };
          }
          fail(source, `unknown name ${t.v}`);
        }
        at++;
        const args: Node[] = [];
        if (!isOp(")")) {
          args.push(ternary());
          while (isOp(",")) {
            at++;
            args.push(ternary());
          }
        }
        expect(")");
        return { kind: "call", name: t.v, args };
      }
      case "op":
        if (t.v === "(") {
          const inner = ternary();
          expect(")");
          return inner;
        }
        return fail(source, `unexpected "${t.v}"`);
      default:
        return fail(source, "unexpected end");
    }
  };
  const node = ternary();
  if (peek().t !== "end") {
    fail(source, "unexpected text after the expression");
  }
  return node;
}

/** A number as a WGSL f32 literal. */
export function f32(n: number): string {
  if (Number.isNaN(n)) {
    return "bitcast<f32>(0x7fc00000u)";
  }
  if (!Number.isFinite(n)) {
    return n > 0 ? "bitcast<f32>(0x7f800000u)" : "bitcast<f32>(0xff800000u)";
  }
  const s = String(n);
  return /[.eE]/.test(s) ? `${s}f` : `${s}.0f`;
}

const VEC: Record<StyleType, number> = {
  number: 1,
  boolean: 0,
  vec2: 2,
  vec3: 3,
  vec4: 4,
};
const vecType = (n: number): StyleType =>
  (["number", "number", "vec2", "vec3", "vec4"] as const)[n]!;
const wgslType = (t: StyleType) =>
  t === "number" ? "f32" : t === "boolean" ? "bool" : `${t}f`;

/** Component-wise functions (1.x's unary, binary, ternary tables). */
const COMPONENTWISE: Record<string, { args: number; wgsl: string }> = {
  abs: { args: 1, wgsl: "abs" },
  sqrt: { args: 1, wgsl: "sqrt" },
  cos: { args: 1, wgsl: "cos" },
  sin: { args: 1, wgsl: "sin" },
  tan: { args: 1, wgsl: "tan" },
  acos: { args: 1, wgsl: "acos" },
  asin: { args: 1, wgsl: "asin" },
  atan: { args: 1, wgsl: "atan" },
  radians: { args: 1, wgsl: "radians" },
  degrees: { args: 1, wgsl: "degrees" },
  sign: { args: 1, wgsl: "sign" },
  floor: { args: 1, wgsl: "floor" },
  ceil: { args: 1, wgsl: "ceil" },
  round: { args: 1, wgsl: "styleRound" },
  exp: { args: 1, wgsl: "exp" },
  exp2: { args: 1, wgsl: "exp2" },
  log: { args: 1, wgsl: "log" },
  log2: { args: 1, wgsl: "log2" },
  fract: { args: 1, wgsl: "fract" },
  atan2: { args: 2, wgsl: "atan2" },
  pow: { args: 2, wgsl: "pow" },
  min: { args: 2, wgsl: "min" },
  max: { args: 2, wgsl: "max" },
  clamp: { args: 3, wgsl: "clamp" },
  mix: { args: 3, wgsl: "mix" },
};

/**
 * WGSL helpers the compiled expressions may call: `styleRound` (1.x's
 * `Math.round`: halves up, unlike WGSL's to even) and `styleHsl` (1.x's
 * `Color.fromHsl`, hue in [0, 1]).
 */
export const STYLE_HELPERS = `fn styleRound(x: f32) -> f32 { return floor(x + 0.5); }
fn styleHslChannel(m1: f32, m2: f32, hue: f32) -> f32 {
  var h = hue;
  if (h < 0.0) { h += 1.0; }
  if (h > 1.0) { h -= 1.0; }
  if (h * 6.0 < 1.0) { return m1 + (m2 - m1) * 6.0 * h; }
  if (h * 2.0 < 1.0) { return m2; }
  if (h * 3.0 < 2.0) { return m1 + (m2 - m1) * (2.0 / 3.0 - h) * 6.0; }
  return m1;
}
fn styleHsl(h: f32, s: f32, l: f32, a: f32) -> vec4f {
  let hue = h % 1.0;
  if (s == 0.0) { return vec4f(l, l, l, a); }
  let m2 = select(l + s - l * s, l * (1.0 + s), l < 0.5);
  let m1 = 2.0 * l - m2;
  return vec4f(
    styleHslChannel(m1, m2, hue + 1.0 / 3.0),
    styleHslChannel(m1, m2, hue),
    styleHslChannel(m1, m2, hue - 1.0 / 3.0),
    a,
  );
}
`;

/** The CSS color names (as 1.x `Color.fromCssColorString`). */
const CSS: Record<string, string> = {
  aliceblue: "f0f8ff",
  antiquewhite: "faebd7",
  aqua: "00ffff",
  aquamarine: "7fffd4",
  azure: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "000000",
  blanchedalmond: "ffebcd",
  blue: "0000ff",
  blueviolet: "8a2be2",
  brown: "a52a2a",
  burlywood: "deb887",
  cadetblue: "5f9ea0",
  chartreuse: "7fff00",
  chocolate: "d2691e",
  coral: "ff7f50",
  cornflowerblue: "6495ed",
  cornsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "00ffff",
  darkblue: "00008b",
  darkcyan: "008b8b",
  darkgoldenrod: "b8860b",
  darkgray: "a9a9a9",
  darkgreen: "006400",
  darkgrey: "a9a9a9",
  darkkhaki: "bdb76b",
  darkmagenta: "8b008b",
  darkolivegreen: "556b2f",
  darkorange: "ff8c00",
  darkorchid: "9932cc",
  darkred: "8b0000",
  darksalmon: "e9967a",
  darkseagreen: "8fbc8f",
  darkslateblue: "483d8b",
  darkslategray: "2f4f4f",
  darkslategrey: "2f4f4f",
  darkturquoise: "00ced1",
  darkviolet: "9400d3",
  deeppink: "ff1493",
  deepskyblue: "00bfff",
  dimgray: "696969",
  dimgrey: "696969",
  dodgerblue: "1e90ff",
  firebrick: "b22222",
  floralwhite: "fffaf0",
  forestgreen: "228b22",
  fuchsia: "ff00ff",
  gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff",
  gold: "ffd700",
  goldenrod: "daa520",
  gray: "808080",
  green: "008000",
  greenyellow: "adff2f",
  grey: "808080",
  honeydew: "f0fff0",
  hotpink: "ff69b4",
  indianred: "cd5c5c",
  indigo: "4b0082",
  ivory: "fffff0",
  khaki: "f0e68c",
  lavender: "e6e6fa",
  lavenderblush: "fff0f5",
  lawngreen: "7cfc00",
  lemonchiffon: "fffacd",
  lightblue: "add8e6",
  lightcoral: "f08080",
  lightcyan: "e0ffff",
  lightgoldenrodyellow: "fafad2",
  lightgray: "d3d3d3",
  lightgreen: "90ee90",
  lightgrey: "d3d3d3",
  lightpink: "ffb6c1",
  lightsalmon: "ffa07a",
  lightseagreen: "20b2aa",
  lightskyblue: "87cefa",
  lightslategray: "778899",
  lightslategrey: "778899",
  lightsteelblue: "b0c4de",
  lightyellow: "ffffe0",
  lime: "00ff00",
  limegreen: "32cd32",
  linen: "faf0e6",
  magenta: "ff00ff",
  maroon: "800000",
  mediumaquamarine: "66cdaa",
  mediumblue: "0000cd",
  mediumorchid: "ba55d3",
  mediumpurple: "9370db",
  mediumseagreen: "3cb371",
  mediumslateblue: "7b68ee",
  mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc",
  mediumvioletred: "c71585",
  midnightblue: "191970",
  mintcream: "f5fffa",
  mistyrose: "ffe4e1",
  moccasin: "ffe4b5",
  navajowhite: "ffdead",
  navy: "000080",
  oldlace: "fdf5e6",
  olive: "808000",
  olivedrab: "6b8e23",
  orange: "ffa500",
  orangered: "ff4500",
  orchid: "da70d6",
  palegoldenrod: "eee8aa",
  palegreen: "98fb98",
  paleturquoise: "afeeee",
  palevioletred: "db7093",
  papayawhip: "ffefd5",
  peachpuff: "ffdab9",
  peru: "cd853f",
  pink: "ffc0cb",
  plum: "dda0dd",
  powderblue: "b0e0e6",
  purple: "800080",
  rebeccapurple: "663399",
  red: "ff0000",
  rosybrown: "bc8f8f",
  royalblue: "4169e1",
  saddlebrown: "8b4513",
  salmon: "fa8072",
  sandybrown: "f4a460",
  seagreen: "2e8b57",
  seashell: "fff5ee",
  sienna: "a0522d",
  silver: "c0c0c0",
  skyblue: "87ceeb",
  slateblue: "6a5acd",
  slategray: "708090",
  slategrey: "708090",
  snow: "fffafa",
  springgreen: "00ff7f",
  steelblue: "4682b4",
  tan: "d2b48c",
  teal: "008080",
  thistle: "d8bfd8",
  tomato: "ff6347",
  turquoise: "40e0d0",
  violet: "ee82ee",
  wheat: "f5deb3",
  white: "ffffff",
  whitesmoke: "f5f5f5",
  yellow: "ffff00",
  yellowgreen: "9acd32",
};

/** A CSS color (name, #rgb, #rrggbb, #rgba or #rrggbbaa) as RGBA in [0, 1]. */
export function cssColor(
  text: string,
): [number, number, number, number] | undefined {
  const s = text.trim().toLowerCase();
  if (s === "transparent") {
    return [0, 0, 0, 0];
  }
  let hex = CSS[s];
  if (!hex) {
    const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
    if (!m) {
      return undefined;
    }
    hex = m[1]!.length <= 4 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  }
  const byte = (k: number) =>
    k * 2 < hex!.length ? parseInt(hex!.slice(k * 2, k * 2 + 2), 16) : 255;
  return [byte(0) / 255, byte(1) / 255, byte(2) / 255, byte(3) / 255];
}

/** Compiles one expression to WGSL, reading properties with `read`. */
export function compileStyleExpression(
  source: string,
  read: PropertyReader,
  options: StyleCompileOptions = {},
): StyleValue {
  const compile = (node: Node): StyleValue => {
    switch (node.kind) {
      case "number":
        return { wgsl: f32(node.value), type: "number" };
      case "boolean":
        return { wgsl: String(node.value), type: "boolean" };
      case "string":
        return (
          options.string?.(node.value) ??
          fail(
            source,
            `string '${node.value}' outside color() (string properties aren't on the GPU)`,
          )
        );
      case "property":
        return read(node.name);
      case "unary": {
        const arg = compile(node.arg);
        if (node.op === "!") {
          if (arg.type !== "boolean") {
            fail(source, "! needs a boolean");
          }
          return { wgsl: `(!${arg.wgsl})`, type: "boolean" };
        }
        if (arg.type === "boolean") {
          fail(source, `${node.op} needs a number or vector`);
        }
        return {
          wgsl: node.op === "-" ? `(-${arg.wgsl})` : arg.wgsl,
          type: arg.type,
        };
      }
      case "binary": {
        if (node.op === "??") {
          // No undefined on the GPU: the left side, where it compiles.
          try {
            return compile(node.left);
          } catch {
            return compile(node.right);
          }
        }
        // An enum compared with a name: with its index.
        const named = (a: Node, b: Node) =>
          b.kind === "string" &&
          ["===", "!==", "==", "!="].includes(node.op) &&
          a.kind !== "string";
        if (named(node.left, node.right) || named(node.right, node.left)) {
          const [value, name] = named(node.left, node.right)
            ? [compile(node.left), node.right as { value: string }]
            : [compile(node.right), node.left as { value: string }];
          if (!value.enum) {
            fail(
              source,
              `string '${name.value}' compared with a value that isn't an enum (string properties aren't on the GPU)`,
            );
          }
          const index = value.enum.indexOf(name.value);
          const eq = index < 0 ? "false" : `(${value.wgsl} == ${f32(index)})`;
          return {
            wgsl: node.op.startsWith("!") ? `(!${eq})` : eq,
            type: "boolean",
          };
        }
        return binary(node.op, compile(node.left), compile(node.right));
      }
      case "ternary": {
        const test = compile(node.test);
        const then = compile(node.then);
        const other = compile(node.else);
        if (test.type !== "boolean") {
          fail(source, "?: needs a boolean condition");
        }
        if (then.type !== other.type) {
          fail(source, `?: branches differ (${then.type}, ${other.type})`);
        }
        return {
          wgsl: `select(${other.wgsl}, ${then.wgsl}, ${test.wgsl})`,
          type: then.type,
        };
      }
      case "member": {
        const object = compile(node.object);
        const n = VEC[object.type];
        const index = { x: 0, y: 1, z: 2, w: 3, r: 0, g: 1, b: 2, a: 3 }[
          node.name
        ];
        if (n < 2 || index === undefined || index >= n) {
          fail(source, `no member .${node.name} on a ${object.type}`);
        }
        return { wgsl: `${object.wgsl}[${index}]`, type: "number" };
      }
      case "call":
        return call(node.name, node.args);
    }
  };

  const binary = (op: string, a: StyleValue, b: StyleValue): StyleValue => {
    if (op === "=~" || op === "!~") {
      fail(source, "regular expressions need strings, which aren't on the GPU");
    }
    if (op === "&&" || op === "||") {
      if (a.type !== "boolean" || b.type !== "boolean") {
        fail(source, `${op} needs booleans`);
      }
      return { wgsl: `(${a.wgsl} ${op} ${b.wgsl})`, type: "boolean" };
    }
    if (op === "===" || op === "!==" || op === "==" || op === "!=") {
      if (a.type !== b.type) {
        // 1.x: strictly different types are never equal.
        return { wgsl: String(op === "!==" || op === "!="), type: "boolean" };
      }
      const eq =
        VEC[a.type] >= 2
          ? `all(${a.wgsl} == ${b.wgsl})`
          : `(${a.wgsl} == ${b.wgsl})`;
      return { wgsl: op.startsWith("!") ? `(!${eq})` : eq, type: "boolean" };
    }
    if (op === "<" || op === "<=" || op === ">" || op === ">=") {
      if (a.type !== "number" || b.type !== "number") {
        fail(source, `${op} needs numbers`);
      }
      return { wgsl: `(${a.wgsl} ${op} ${b.wgsl})`, type: "boolean" };
    }
    // Arithmetic: numbers, vectors of one size, or a vector and a number
    // for * and /.
    const na = VEC[a.type];
    const nb = VEC[b.type];
    if (na === 0 || nb === 0) {
      fail(source, `${op} needs numbers or vectors`);
    }
    if (na !== nb && !((op === "*" || op === "/") && (na === 1 || nb === 1))) {
      fail(source, `${op} on ${a.type} and ${b.type}`);
    }
    return {
      wgsl: `(${a.wgsl} ${op} ${b.wgsl})`,
      type: vecType(Math.max(na, nb)),
    };
  };

  const numbers = (name: string, args: Node[], count: number): string[] =>
    args
      .map((arg) => {
        const v = compile(arg);
        if (v.type !== "number") {
          fail(source, `${name} needs numbers`);
        }
        return v.wgsl;
      })
      .concat(
        args.length === count
          ? []
          : fail(source, `${name} needs ${count} arguments`),
      );

  const call = (name: string, args: Node[]): StyleValue => {
    const extension = options.functions?.[name];
    if (extension) {
      return extension(args, compile);
    }
    switch (name) {
      case "match": {
        // match(value, key, result, …, default): keys are numbers, or an
        // enum's names.
        if (args.length < 2 || args.length % 2 !== 0) {
          fail(source, "match(value, key, result, …, default)");
        }
        const value = compile(args[0]!);
        let out = compile(args[args.length - 1]!);
        for (let k = args.length - 3; k >= 1; k -= 2) {
          const key = args[k]!;
          let test: string;
          if (key.kind === "string") {
            const index = value.enum?.indexOf(key.value) ?? -1;
            if (!value.enum) {
              fail(source, `match: '${key.value}' against a non-enum value`);
            }
            test = index < 0 ? "false" : `(${value.wgsl} == ${f32(index)})`;
          } else {
            const kv = compile(key);
            if (kv.type !== value.type) {
              fail(source, "match: keys differ in type from the value");
            }
            test = `(${value.wgsl} == ${kv.wgsl})`;
          }
          const result = compile(args[k + 1]!);
          if (result.type !== out.type) {
            fail(source, `match: results differ (${result.type}, ${out.type})`);
          }
          out = {
            wgsl: `select(${out.wgsl}, ${result.wgsl}, ${test})`,
            type: out.type,
          };
        }
        return out;
      }
      case "color": {
        if (args.length === 0) {
          return { wgsl: "vec4f(1.0)", type: "vec4" };
        }
        const text = args[0]!;
        if (text.kind !== "string") {
          fail(source, "color() takes a CSS color string");
        }
        const rgba =
          cssColor(text.value) ?? fail(source, `unknown color '${text.value}'`);
        const alpha =
          args.length > 1
            ? numbers("color", args.slice(1), 1)[0]!
            : f32(rgba[3]);
        return {
          wgsl: `vec4f(${rgba.slice(0, 3).map(f32).join(", ")}, ${alpha})`,
          type: "vec4",
        };
      }
      case "rgb":
      case "rgba": {
        const n = numbers(name, args, name === "rgb" ? 3 : 4);
        const alpha = name === "rgb" ? "1.0f" : n[3]!;
        return {
          wgsl: `vec4f(${n
            .slice(0, 3)
            .map((x) => `${x} / 255.0`)
            .join(", ")}, ${alpha})`,
          type: "vec4",
        };
      }
      case "hsl":
      case "hsla": {
        const n = numbers(name, args, name === "hsl" ? 3 : 4);
        return {
          wgsl: `styleHsl(${n[0]}, ${n[1]}, ${n[2]}, ${name === "hsl" ? "1.0f" : n[3]})`,
          type: "vec4",
        };
      }
      case "vec2":
      case "vec3":
      case "vec4": {
        const size = Number(name[3]);
        const parts = args.map(compile);
        const total = parts.reduce((n, p) => n + VEC[p.type], 0);
        if (parts.some((p) => p.type === "boolean")) {
          fail(source, `${name} needs numbers or vectors`);
        }
        if (parts.length === 1 && parts[0]!.type === "number") {
          return { wgsl: `vec${size}f(${parts[0]!.wgsl})`, type: name };
        }
        if (total !== size) {
          fail(source, `${name} needs ${size} components`);
        }
        return {
          wgsl: `vec${size}f(${parts.map((p) => p.wgsl).join(", ")})`,
          type: name,
        };
      }
      case "length":
      case "normalize": {
        const [v] = args.map(compile);
        if (args.length !== 1 || VEC[v!.type] === 0) {
          fail(source, `${name} needs one number or vector`);
        }
        return name === "length"
          ? {
              wgsl:
                VEC[v!.type] === 1 ? `abs(${v!.wgsl})` : `length(${v!.wgsl})`,
              type: "number",
            }
          : {
              wgsl:
                VEC[v!.type] === 1
                  ? `sign(${v!.wgsl})`
                  : `normalize(${v!.wgsl})`,
              type: v!.type,
            };
      }
      case "distance":
      case "dot":
      case "cross": {
        const [a, b] = args.map(compile);
        if (args.length !== 2 || a!.type !== b!.type || VEC[a!.type] === 0) {
          fail(source, `${name} needs two numbers or vectors of one size`);
        }
        if (name === "cross") {
          if (a!.type !== "vec3") {
            fail(source, "cross needs vec3s");
          }
          return { wgsl: `cross(${a!.wgsl}, ${b!.wgsl})`, type: "vec3" };
        }
        if (VEC[a!.type] === 1) {
          return {
            wgsl:
              name === "dot"
                ? `(${a!.wgsl} * ${b!.wgsl})`
                : `abs(${a!.wgsl} - ${b!.wgsl})`,
            type: "number",
          };
        }
        return { wgsl: `${name}(${a!.wgsl}, ${b!.wgsl})`, type: "number" };
      }
      case "isNaN":
      case "isFinite": {
        const [v] = args.map(compile);
        if (args.length !== 1 || v!.type !== "number") {
          fail(source, `${name} needs a number`);
        }
        return name === "isNaN"
          ? { wgsl: `(${v!.wgsl} != ${v!.wgsl})`, type: "boolean" }
          : { wgsl: `(abs(${v!.wgsl}) <= 3.4028234e38)`, type: "boolean" };
      }
      case "Boolean": {
        const [v] = args.map(compile);
        if (v!.type === "boolean") {
          return v!;
        }
        if (v!.type !== "number") {
          fail(source, "Boolean needs a number or boolean");
        }
        return {
          wgsl: `(${v!.wgsl} != 0.0 && ${v!.wgsl} == ${v!.wgsl})`,
          type: "boolean",
        };
      }
      case "Number": {
        const [v] = args.map(compile);
        if (v!.type === "number") {
          return v!;
        }
        if (v!.type !== "boolean") {
          fail(source, "Number needs a number or boolean");
        }
        return { wgsl: `select(0.0f, 1.0f, ${v!.wgsl})`, type: "number" };
      }
    }
    const f = COMPONENTWISE[name];
    if (!f) {
      fail(source, `unknown function ${name}()`);
    }
    if (args.length !== f.args) {
      fail(source, `${name} needs ${f.args} argument${f.args > 1 ? "s" : ""}`);
    }
    const values = args.map(compile);
    // 1.x: component-wise on numbers or vectors of one size; min, max,
    // clamp and mix also take numbers with vectors.
    const size = Math.max(...values.map((v) => VEC[v.type]));
    if (
      values.some(
        (v) => VEC[v.type] === 0 || (VEC[v.type] !== size && VEC[v.type] !== 1),
      )
    ) {
      fail(source, `${name} needs numbers or vectors of one size`);
    }
    const type = vecType(size);
    const widen = (v: StyleValue) =>
      VEC[v.type] === size ? v.wgsl : `${wgslType(type)}(${v.wgsl})`;
    return { wgsl: `${f.wgsl}(${values.map(widen).join(", ")})`, type };
  };

  return compile(parseStyleExpression(source));
}
