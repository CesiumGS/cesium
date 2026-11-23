import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * AGENTS.md's GPU-safety rule: every shader loop is bounded by a constant,
 * never by a count read from a buffer or a uniform, with an early `break`
 * on the data's count: `for (uint i = 0u; i < CONSTANT; i++) { if (i >=
 * count) break; … }`. A hung shader resets the GPU for every app on the
 * machine, and a count from content (a tile's outline, a model's parts) is
 * not to be trusted to be small.
 *
 * The check reads every `.slang` under `packages/core/src`, `examples`
 * and `parity` (generated folders aside), comments and strings blanked,
 * and refuses:
 *
 * - any `while` or `do` loop: only a `for` names its bound in its header;
 * - a `for` that declares no loop variable in its first clause;
 * - a `for` whose condition has no `&&`-joined term comparing the loop
 *   variable with a constant expression;
 * - a step that isn't `++`, `--`, or a compound assignment by a constant
 *   expression, that doesn't move (`+= 0u`, `*= 1u`), that moves away
 *   from the bound (`i < N` with `i--`, or `i += -1`), or that grows a
 *   product or a shift from 0;
 * - a step that can pass the type's end and wrap: a `uint` counting down
 *   by more than 1 (`s -= 2u` against `> 0u` steps from 1 past 0), and
 *   counting up past the most a `uint` or `int` holds (`i <= 0xFFFFFFFFu`
 *   is never false);
 * - `i >= 0` on a `uint` loop variable (never false);
 * - a body that assigns the loop variable, or passes it to an `out` or
 *   `inout` parameter (the engine's functions, `Interlocked…`,
 *   `GetDimensions`).
 *
 * A constant expression is numeric literals, the casts `uint`, `int` and
 * `float`, arithmetic, bit and shift operators, parentheses, and names
 * declared `static const` (at file or function scope) or `#define` in the
 * scanned sources, whose every value is itself a constant expression, and
 * declared nowhere else as a variable (typed, `let` or `var`), a
 * parameter or a field. A member (`params.count`), an element
 * (`counts[i]`), a call, or a plain variable is not one. Further terms
 * (`&& any(through > 1e-3)`) may only end a loop sooner, so they're
 * allowed. The wrap checks need the bound's value: a float constant, or
 * a name given two values, leaves them unchecked.
 *
 * `unclampedIndices` below checks the other half of the rule: that a
 * buffer index in a loop that data reaches is clamped.
 */

const repo = fileURLToPath(new URL("..", import.meta.url));
const src = join(repo, "packages", "core", "src");
/** Where Slang lives: the engine's, the examples' stages and the parity pages'. */
const roots = [src, join(repo, "examples"), join(repo, "parity")];

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" || name === "generated" ? [] : files(path);
    }
    return name.endsWith(".slang") ? [path] : [];
  });
}

/** `source` with comments and strings blanked (newlines kept, so offsets keep lines). */
function blank(source: string): string {
  const spaces = (c: string) => c.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, spaces)
    .replace(/\/\/[^\n]*/g, spaces)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, spaces);
}

/** A Slang source, by a name for the messages. */
export interface SlangSource {
  readonly name: string;
  readonly code: string;
}

const SCALAR =
  "(?:u?int|float|half|double|bool|int64_t|uint64_t)(?:[1-4](?:x[1-4])?)?";

/** Constant names and, where one value is known, their values. */
export type SlangConstants = ReadonlyMap<string, number | undefined>;

/**
 * Names declared `static const` or `#define` in `sources` whose every
 * value is a constant expression (literals and such names: not
 * `params.count`), and declared nowhere else (a variable, a `let` or `var`,
 * a parameter, a field) under the same name, with their values.
 */
export function slangConstants(
  sources: readonly SlangSource[],
): SlangConstants {
  const values = new Map<string, string[]>();
  const other = new Set<string>();
  const add = (name: string, value: string) =>
    values.set(name, [...(values.get(name) ?? []), value.trim()]);
  // `static const T NAME = value;` (an array, `NAME[n]`, is never a bound).
  const constant = new RegExp(
    `\\bstatic\\s+const\\s+(?:${SCALAR}|\\w+)\\s+(\\w+)\\s*(\\[)?[^=;]*(?:=([^;]*))?;`,
    "g",
  );
  // `#define NAME value`, not a macro with parameters.
  const define = /^[ \t]*#define[ \t]+(\w+)(\()?[ \t]*([^\n]*)/gm;
  // A typed declaration: a scalar or vector type, then a name, then `=`, `;`,
  // `,`, `)`, `[` or `:` (a semantic); `const` before it makes a constant.
  const declared = new RegExp(
    `(\\bconst\\s+)?\\b${SCALAR}\\s+(\\w+)\\s*(?=[=;,)\\[:])`,
    "g",
  );
  for (const { code } of sources) {
    const text = blank(code);
    for (const m of text.matchAll(constant)) {
      if (!m[2]) {
        add(m[1]!, m[3] ?? "");
      }
    }
    for (const m of text.matchAll(define)) {
      if (!m[2]) {
        add(m[1]!, m[3]!);
      }
    }
    for (const m of text.matchAll(declared)) {
      const before = text.slice(Math.max(0, m.index - 16), m.index);
      if (
        !m[1] &&
        !/\bstatic\s+$/.test(before) &&
        !/\bconst\s+$/.test(before)
      ) {
        other.add(m[2]!);
      }
    }
    for (const m of text.matchAll(/\b(?:let|var)\s+(\w+)/g)) {
      other.add(m[1]!);
    }
  }
  // A name is a constant once each of its values is a constant expression
  // of the constants found so far.
  const constants = new Map<string, number | undefined>();
  for (let grew = true; grew;) {
    grew = false;
    for (const [name, texts] of values) {
      if (
        !constants.has(name) &&
        !other.has(name) &&
        texts.every((t) => isConstantExpression(t, constants))
      ) {
        const known = texts.map((t) => constantValue(t, constants));
        constants.set(
          name,
          known.every((v) => v !== undefined && v === known[0])
            ? known[0]
            : undefined,
        );
        grew = true;
      }
    }
  }
  return constants;
}

const NUMBER =
  /^(?:0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)[uUlLfFhH]*$/;

/** Whether `expression` is a constant expression (see the top). */
export function isConstantExpression(
  expression: string,
  constants: SlangConstants,
): boolean {
  const text = expression.trim();
  if (text === "") {
    return false;
  }
  const tokens = text.match(
    /0[xX][0-9a-fA-F]+[uU]?|\d+\.?\d*(?:[eE][+-]?\d+)?[uUlLfFhH]*|\.\d+[uUfFhH]*|\w+|<<|>>|\S/g,
  )!;
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]!;
    if (NUMBER.test(t)) {
      continue;
    }
    if (/^\w+$/.test(t)) {
      if (/^(?:uint|int|float)$/.test(t) && tokens[k + 1] === "(") {
        continue;
      }
      if (constants.has(t)) {
        continue;
      }
      return false;
    }
    if (!/^(?:\+|-|\*|\/|%|<<|>>|&|\||\^|~|\(|\))$/.test(t)) {
      return false;
    }
  }
  return true;
}

/**
 * The value of a constant expression, or undefined where it can't be told
 * (a float, a name of two values, an operator it doesn't take). `uint(` and
 * `int(` truncate; arithmetic is exact (no 32-bit wrap): the checks below
 * compare it with the types' limits.
 */
export function constantValue(
  expression: string,
  constants: SlangConstants,
): number | undefined {
  const tokens =
    expression
      .trim()
      .match(
        /0[xX][0-9a-fA-F]+[uU]?|\d+\.?\d*(?:[eE][+-]?\d+)?[uUlLfFhH]*|\.\d+[uUfFhH]*|\w+|<<|>>|\S/g,
      ) ?? [];
  let at = 0;
  const peek = () => tokens[at];
  const bits = (a: number, b: number, op: (x: bigint, y: bigint) => bigint) =>
    Number.isInteger(a) && Number.isInteger(b)
      ? Number(op(BigInt(a), BigInt(b)))
      : NaN;
  const binary = (
    next: () => number | undefined,
    ops: Record<string, (a: number, b: number) => number>,
  ) => {
    return (): number | undefined => {
      let left = next();
      while (peek() !== undefined && peek()! in ops) {
        const op = ops[tokens[at++]!]!;
        const right = next();
        left =
          left === undefined || right === undefined
            ? undefined
            : op(left, right);
      }
      return left;
    };
  };
  const primary = (): number | undefined => {
    const t = tokens[at++];
    if (t === undefined) {
      return undefined;
    }
    if (t === "(") {
      const v = or();
      at++; // ")"
      return v;
    }
    if (t === "-" || t === "+" || t === "~") {
      const v = primary();
      return v === undefined
        ? undefined
        : t === "-"
          ? -v
          : t === "~"
            ? ~v >>> 0
            : v;
    }
    if (/^(?:uint|int|float)$/.test(t) && peek() === "(") {
      at++;
      const v = or();
      at++;
      return v === undefined ? undefined : t === "float" ? v : Math.trunc(v);
    }
    if (NUMBER.test(t)) {
      return Number(
        /^0[xX]/.test(t)
          ? t.replace(/[uU]$/, "")
          : t.replace(/[uUlLfFhH]+$/, ""),
      );
    }
    return constants.get(t);
  };
  const multiply = binary(primary, {
    "*": (a, b) => a * b,
    "/": (a, b) =>
      Number.isInteger(a) && Number.isInteger(b) ? Math.trunc(a / b) : a / b,
    "%": (a, b) => a % b,
  });
  const add = binary(multiply, { "+": (a, b) => a + b, "-": (a, b) => a - b });
  const shift = binary(add, {
    "<<": (a, b) => a * 2 ** b,
    ">>": (a, b) => Math.floor(a / 2 ** b),
  });
  const and = binary(shift, { "&": (a, b) => bits(a, b, (x, y) => x & y) });
  const xor = binary(and, { "^": (a, b) => bits(a, b, (x, y) => x ^ y) });
  const or: () => number | undefined = binary(xor, {
    "|": (a, b) => bits(a, b, (x, y) => x | y),
  });
  const value = or();
  return at === tokens.length && value !== undefined && Number.isFinite(value)
    ? value
    : undefined;
}

/** Splits `text` at `separator` where it is outside parentheses and brackets. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === "(" || c === "[") {
      depth++;
    } else if (c === ")" || c === "]") {
      depth--;
    } else if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(text.slice(start, i));
      start = i + separator.length;
      i += separator.length - 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** The index just past the bracket matching the one at `open`. */
function matching(text: string, open: number): number {
  const opener = text[open]!;
  const closer = opener === "(" ? ")" : "}";
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === opener) {
      depth++;
    } else if (text[i] === closer) {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return text.length;
}

/** A loop statement's body from `at` (just past its header): a block, or one statement. */
function bodyFrom(text: string, at: number): string {
  let i = at;
  while (i < text.length && /\s/.test(text[i]!)) {
    i++;
  }
  // Attributes before a nested loop (`[ForceUnroll]`).
  let parens = 0;
  for (; i < text.length; i++) {
    const c = text[i]!;
    if (c === "(") {
      parens++;
    } else if (c === ")") {
      parens--;
    } else if (parens === 0 && c === "{") {
      return text.slice(at, matching(text, i));
    } else if (parens === 0 && c === ";") {
      return text.slice(at, i + 1);
    }
  }
  return text.slice(at);
}

const GROWS = new Set(["++", "+=", "*=", "<<="]);
const SHRINKS = new Set(["--", "-=", "/=", ">>="]);

const UINT_MAX = 0xffffffff;
const INT_MAX = 0x7fffffff;
/** The comparison `bound op i` read as `i op' bound`. */
const FLIPPED: Record<string, string> = {
  "<": ">",
  "<=": ">=",
  ">": "<",
  ">=": "<=",
};

/**
 * Per function name, the argument positions it assigns (`out` and `inout`
 * parameters): the engine's own functions, and the built-ins that write
 * an argument (`Interlocked…`'s, all of them; `GetDimensions` is a method).
 */
type Assigners = ReadonlyMap<string, ReadonlySet<number>>;

/** Why the `for` header `init; condition; step` and its body break the rule, or undefined. */
function forProblem(
  header: string,
  body: string,
  constants: SlangConstants,
  assigners: Assigners,
): string | undefined {
  const clauses = splitTop(header, ";");
  if (clauses.length !== 3) {
    return "a for header without three clauses";
  }
  const [init, condition, step] = clauses.map((c) => c.trim()) as [
    string,
    string,
    string,
  ];
  const declaration = new RegExp(
    `^(${SCALAR})\\s+(\\w+)\\s*=\\s*([\\s\\S]+)$`,
  ).exec(init);
  if (!declaration) {
    return "no loop variable declared in the first clause";
  }
  const type = declaration[1]!;
  const unsigned = type.startsWith("uint");
  const integer = /^u?int/.test(type);
  const variable = declaration[2]!;
  const start = declaration[3]!.trim();
  const v = variable.replace(/\W/g, "\\$&");
  let comparison: string | undefined;
  let bound = "";
  for (const term of splitTop(condition, "&&")) {
    const t = term
      .trim()
      .replace(/^\((.*)\)$/s, "$1")
      .trim();
    const left = new RegExp(`^${v}\\s*(<=|<|>=|>)\\s*([\\s\\S]+)$`).exec(t);
    const right = new RegExp(`^([\\s\\S]+?)\\s*(<=|<|>=|>)\\s*${v}$`).exec(t);
    if (left && isConstantExpression(left[2]!, constants)) {
      [comparison, bound] = [left[1]!, left[2]!.trim()];
      break;
    }
    if (right && isConstantExpression(right[1]!, constants)) {
      [comparison, bound] = [FLIPPED[right[2]!]!, right[1]!.trim()];
      break;
    }
  }
  if (!comparison) {
    return `the condition \`${condition}\` doesn't bound \`${variable}\` by a constant`;
  }
  const direction = comparison.startsWith("<") ? "up" : "down";
  const limit = constantValue(bound, constants);
  if (unsigned && comparison === ">=" && limit !== undefined && limit <= 0) {
    return `\`${variable} >= 0\` on a uint is never false`;
  }
  const unary = new RegExp(
    `^(?:${v}\\s*(\\+\\+|--)|(\\+\\+|--)\\s*${v})$`,
  ).exec(step);
  const compound = new RegExp(
    `^${v}\\s*(\\+=|-=|\\*=|/=|<<=|>>=)\\s*([\\s\\S]+)$`,
  ).exec(step);
  let op: string;
  let amount: number | undefined = 1;
  if (unary) {
    op = unary[1] ?? unary[2]!;
  } else if (compound && isConstantExpression(compound[2]!, constants)) {
    op = compound[1]!;
    amount = constantValue(compound[2]!, constants);
  } else {
    return `the step \`${step}\` isn't by a constant`;
  }
  // A negative step counts the other way.
  if ((op === "+=" || op === "-=") && amount !== undefined && amount < 0) {
    op = op === "+=" ? "-=" : "+=";
    amount = -amount;
  }
  if (
    amount !== undefined &&
    (((op === "+=" || op === "-=" || op === "<<=" || op === ">>=") &&
      amount === 0) ||
      ((op === "*=" || op === "/=") && amount <= 1))
  ) {
    return `the step \`${step}\` doesn't move \`${variable}\``;
  }
  if ((direction === "up" ? GROWS : SHRINKS).has(op) === false) {
    return `the step \`${step}\` moves away from the bound`;
  }
  if ((op === "*=" || op === "<<=") && /^0[uU]?$/.test(start)) {
    return `\`${variable}\` grows by \`${op}\` from 0`;
  }
  // Steps that pass the type's end wrap around and never meet the bound.
  if (unsigned && op === "-=" && (amount === undefined || amount > 1)) {
    return `\`${step}\` on a uint can step past 0 and wrap: count down by 1`;
  }
  const most = unsigned ? UINT_MAX : INT_MAX;
  if (integer && direction === "up" && limit !== undefined) {
    const last = comparison === "<" ? limit - 1 : limit;
    if (
      (op === "++" || op === "+=") &&
      amount !== undefined &&
      last + amount > most
    ) {
      return comparison === "<="
        ? `\`${variable} <= ${bound}\` is never false: the step wraps`
        : `\`${variable}\` can step past \`${bound}\` and wrap`;
    }
    if (op === "<<=" && last * 2 > most) {
      return `\`${variable}\` can shift past \`${bound}\` to 0`;
    }
  }
  if (integer && direction === "down" && !unsigned && limit !== undefined) {
    if (comparison === ">=" ? limit <= -INT_MAX - 1 : limit < -INT_MAX - 1) {
      return `\`${variable} ${comparison} ${bound}\` is never false`;
    }
  }
  const assigned = new RegExp(
    `(?<![\\w.])${v}\\s*(?:=(?!=)|\\+=|-=|\\*=|/=|%=|<<=|>>=|&=|\\|=|\\^=|\\+\\+|--)|(?:\\+\\+|--)\\s*${v}(?!\\w)`,
  );
  if (assigned.test(body)) {
    return `the body assigns \`${variable}\``;
  }
  // A call that writes the loop variable through an out or inout parameter.
  for (const m of body.matchAll(/(\.\s*)?\b(\w+)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const args = splitTop(
      body.slice(open + 1, matching(body, open) - 1),
      ",",
    ).map((a) => a.trim());
    const writes =
      m[1] && m[2] === "GetDimensions"
        ? new Set(args.map((_, k) => k))
        : m[1]
          ? undefined
          : /^Interlocked/.test(m[2]!)
            ? new Set(args.map((_, k) => k))
            : assigners.get(m[2]!);
    const k = args.indexOf(variable);
    if (writes && k >= 0 && writes.has(k)) {
      return `the body passes \`${variable}\` to \`${m[2]}\`, which assigns it`;
    }
  }
  return undefined;
}

/** Every loop in `sources` that breaks the rule, as `name:line: why`. */
export function unboundedLoops(sources: readonly SlangSource[]): string[] {
  const constants = slangConstants(sources);
  const assigners = new Map<string, Set<number>>();
  for (const { name, code } of sources) {
    for (const f of slangFunctions(name, blank(code))) {
      f.params.forEach((p, k) => {
        if (p.modifier === "out" || p.modifier === "inout") {
          assigners.set(f.name, (assigners.get(f.name) ?? new Set()).add(k));
        }
      });
    }
  }
  const problems: string[] = [];
  for (const { name, code } of sources) {
    const text = blank(code);
    const lineOf = (at: number) => text.slice(0, at).split("\n").length;
    for (const m of text.matchAll(/\b(for|while|do)\b/g)) {
      const at = m.index;
      if (m[1] !== "for") {
        problems.push(
          `${name}:${lineOf(at)}: a ${m[1]} loop; use a for bounded by a constant`,
        );
        continue;
      }
      const open = text.indexOf("(", at);
      if (open < 0 || text.slice(at + 3, open).trim() !== "") {
        problems.push(`${name}:${lineOf(at)}: a for without a header`);
        continue;
      }
      const close = matching(text, open);
      const header = text.slice(open + 1, close - 1);
      const problem = forProblem(
        header,
        bodyFrom(text, close),
        constants,
        assigners,
      );
      if (problem) {
        problems.push(`${name}:${lineOf(at)}: ${problem}`);
      }
    }
  }
  return problems;
}

/** A function definition in a Slang source. */
interface SlangFunction {
  readonly name: string;
  readonly source: string;
  readonly params: readonly {
    readonly name: string;
    readonly type: string;
    readonly modifier: string;
    readonly semantic: boolean;
  }[];
  /** The body, braces included, in the blanked text. */
  readonly body: string;
  /** Where the body starts in the blanked text. */
  readonly at: number;
}

const KEYWORDS = new Set([
  "if",
  "for",
  "while",
  "do",
  "switch",
  "return",
  "else",
  "case",
]);
const BUFFER_TYPE = /^(?:RW)?(?:StructuredBuffer|ByteAddressBuffer)\b/;
const CLAMPS = new Set(["min", "clamp", "clampIndex", "clampSpan"]);

/** Every function definition (`type name(params) {`) in the blanked `text`. */
function slangFunctions(source: string, text: string): SlangFunction[] {
  const found: SlangFunction[] = [];
  for (const m of text.matchAll(/\b(\w+)\s*\(/g)) {
    const name = m[1]!;
    if (KEYWORDS.has(name)) {
      continue;
    }
    const before = text.slice(Math.max(0, m.index - 64), m.index);
    if (
      !/(?:\w|>|\])\s+$/.test(before) ||
      /\b(?:return|new)\s+$/.test(before)
    ) {
      continue;
    }
    const open = m.index + m[0].length - 1;
    const close = matching(text, open);
    const after = /^\s*(?::\s*\w+\s*)?\{/.exec(text.slice(close));
    if (!after) {
      continue;
    }
    const brace = close + after[0].length - 1;
    const params = splitTop(text.slice(open + 1, close - 1), ",")
      .map((p) => p.trim())
      .filter((p) => p !== "")
      .map((p) => {
        const d =
          /^(?:(in|out|inout|const|uniform)\s+)?(?:nointerpolation\s+)?([\w<>,\s]+?)\s+(\w+)\s*(?:\[[^\]]*\])?\s*(:\s*\w+)?$/.exec(
            p,
          );
        return {
          name: d?.[3] ?? "",
          type: (d?.[2] ?? "").trim(),
          modifier: d?.[1] ?? "",
          semantic: /^:\s*SV_/.test((d?.[4] ?? "").trim()),
        };
      });
    found.push({
      name,
      source,
      params,
      body: text.slice(brace, matching(text, brace)),
      at: brace,
    });
  }
  return found;
}

/** A call `name(args)` or a subscript `name[index]` at `start` to `end`. */
interface Use {
  readonly kind: "call" | "index";
  readonly name: string;
  readonly inner: string;
  readonly start: number;
  readonly end: number;
}

/** Every call and subscript in `expression`, nested ones too, in order. */
function* uses(expression: string): Generator<Use> {
  for (const m of expression.matchAll(/(?<![\w.])(\w+)\s*([([])/g)) {
    const open = m.index + m[0].length - 1;
    const close = matchingAny(expression, open);
    yield {
      kind: m[2] === "(" ? "call" : "index",
      name: m[1]!,
      inner: expression.slice(open + 1, close - 1),
      start: m.index,
      end: close,
    };
  }
}

/** `matching` for `(`, `[` and `{`. */
function matchingAny(text: string, open: number): number {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const opener = text[open]!;
  const closer = pairs[opener]!;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === opener) {
      depth++;
    } else if (text[i] === closer) {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return text.length;
}

/** What a value comes from: data (a buffer or a uniform), a buffer's length, or neither. */
type Origin = "data" | "length" | "clean";

function either(a: Origin, b: Origin): Origin {
  if (a === "data" || b === "data") {
    return "data";
  }
  return a === "length" || b === "length" ? "length" : "clean";
}

/** The statements' end in `text` from `at`: the next `;` or unmatched `)` outside brackets. */
function expressionEnd(text: string, at: number): number {
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    const c = text[i]!;
    if (c === "(" || c === "[" || c === "{") {
      depth++;
    } else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) {
        return i;
      }
      depth--;
    } else if (depth === 0 && (c === ";" || c === ",")) {
      return i;
    }
  }
  return text.length;
}

/**
 * Every buffer index in a loop body that data reaches, unclamped: the
 * check behind "every buffer index read from data is clamped" (AGENTS.md,
 * GPU safety), as `name:line: why`.
 *
 * Data is a buffer's element (`words[at]`, `counters[0].load()`), a
 * uniform's field (`params.count`, a `ConstantBuffer` or `uniform`), an
 * entry point's input that isn't a system value (a vertex attribute), a
 * function's parameter (its caller's value is unknown), or a call to a
 * function that reads data. It flows through assignments to locals, a
 * struct's fields and out parameters, without regard to their order.
 *
 * A clamp ends it: `min(x, n)` with `n` a constant expression or a
 * buffer's length (`GetDimensions`, or a value made from only those),
 * `clamp(x, lo, n)` the same, and bounds.slang's `clampIndex(x, n)` and
 * `clampSpan(x, width, n)`. A local assigned only from clamps, constants,
 * lengths and loop counters is clean, and so is the same plus a constant
 * offset: `words[s + 6u]` with `s` clamped to the length less the piece's
 * 8 words.
 *
 * In every `for` body it refuses:
 *
 * - a subscript of a buffer (global, or a buffer parameter) whose index
 *   data reaches, unless a condition in the same function compares that
 *   very index with a length (`if (row >= rowCount) continue;`, a
 *   loop's `break`);
 * - a call, with an argument data reaches, to an engine function that
 *   isn't safe itself: one with such a subscript anywhere in its body, its
 *   own parameters taken as data, or such a call.
 *
 * It can't see: whether a clamp's bound is the right buffer's length, or
 * leaves room for the offsets added after it; an index grown by a counter
 * under a data-driven branch (`count++` up to a uniform's cap); reads
 * outside loop bodies that aren't in a function called from one; texture
 * loads; and data through a global variable or a function's return of a
 * struct field it didn't read itself. WebGPU's robust buffer access still
 * keeps every such read defined: this is a second line, not the only one.
 */
export function unclampedIndices(sources: readonly SlangSource[]): string[] {
  const constants = slangConstants(sources);
  const buffers = new Set<string>();
  const uniforms = new Set<string>();
  const functions = new Map<string, SlangFunction[]>();
  const texts = new Map<string, string>();
  const imports = new Map<string, Set<string>>();
  for (const { name, code } of sources) {
    const text = blank(code);
    texts.set(name, text);
    imports.set(
      name,
      new Set([...text.matchAll(/^\s*import\s+(\w+)\s*;/gm)].map((m) => m[1]!)),
    );
    for (const m of text.matchAll(
      /\b(?:RW)?(?:StructuredBuffer|ByteAddressBuffer)\b(?:\s*<(?:[^<>]|<[^<>]*>)*>)?\s+(\w+)\s*[;[]/g,
    )) {
      buffers.add(m[1]!);
    }
    for (const m of text.matchAll(
      /\b(?:ConstantBuffer|ParameterBlock)\s*<[^>]*>\s+(\w+)\s*;/g,
    )) {
      uniforms.add(m[1]!);
    }
    for (const m of text.matchAll(
      /^\s*(?:\[[^\]]*\]\s*)*uniform\s+\w+\s+(\w+)\s*;/gm,
    )) {
      uniforms.add(m[1]!);
    }
    for (const f of slangFunctions(name, text)) {
      functions.set(f.name, [...(functions.get(f.name) ?? []), f]);
    }
  }

  /** The functions a call of `name` in `from` may reach: its own file's, else an imported module's. */
  function resolve(from: SlangFunction, name: string): SlangFunction[] {
    const all = functions.get(name) ?? [];
    const own = all.filter((f) => f.source === from.source);
    if (own.length > 0) {
      return own;
    }
    const imported = imports.get(from.source) ?? new Set<string>();
    const reached = all.filter((f) =>
      imported.has(f.source.replace(/^.*\//, "").replace(/\.slang$/, "")),
    );
    return reached.length > 0 ? reached : all;
  }

  /**
   * A function's parameters that carry data, at a call: all of them (no
   * call known) or those whose argument does.
   */
  type Carried = readonly boolean[] | undefined;
  const keyOf = (f: SlangFunction, carried: Carried) =>
    `${f.source}:${f.at}:${carried?.map(Number).join("") ?? "all"}`;

  /** The origins of every name a function assigns or takes, to a fixed point. */
  const originsOf = new Map<string, Map<string, Origin>>();

  const reads = new Map<SlangFunction, boolean>();

  /** Whether `f` yields data even from clean arguments: it reads a buffer or a uniform. */
  function readsDataIn(f: SlangFunction): boolean {
    const known = reads.get(f);
    if (known !== undefined) {
      return known;
    }
    reads.set(f, false); // a cycle adds nothing
    const result =
      [...uses(f.body)].some(
        (u) =>
          (u.kind === "index" && isBuffer(f, u.name)) ||
          (u.kind === "call" && readsData(f, u.name)),
      ) ||
      /\.\s*(?:load|add|exchange|max|min)\s*\(/.test(f.body) ||
      [...uniforms].some((n) =>
        new RegExp(`(?<![\\w.])${n}\\s*\\.`).test(f.body),
      );
    reads.set(f, result);
    return result;
  }

  /** Whether a call of `name` in `from` yields data even from clean arguments. */
  function readsData(from: SlangFunction, name: string): boolean {
    return resolve(from, name).some((f) => f !== from && readsDataIn(f));
  }

  /** Whether a call of `name` in `from` returns a buffer's length. */
  function measures(from: SlangFunction, name: string): boolean {
    const reached = resolve(from, name);
    return (
      reached.length > 0 &&
      !readsData(from, name) &&
      reached.every((f) => /\.\s*GetDimensions\s*\(/.test(f.body))
    );
  }

  function isBuffer(f: SlangFunction, name: string): boolean {
    const param = f.params.find((p) => p.name === name);
    return param ? BUFFER_TYPE.test(param.type) : buffers.has(name);
  }

  function origin(
    f: SlangFunction,
    names: Map<string, Origin>,
    expression: string,
  ): Origin {
    const text = expression.trim();
    if (text === "" || isConstantExpression(text, constants)) {
      return "clean";
    }
    let result: Origin = "clean";
    let rest = text;
    let covered = 0;
    for (const u of uses(text)) {
      if (u.end <= covered) {
        continue; // inside a call or a subscript already taken
      }
      covered = u.end;
      rest =
        rest.slice(0, u.start) +
        " ".repeat(u.end - u.start) +
        rest.slice(u.end);
      const args = splitTop(u.inner, ",");
      if (u.kind === "index") {
        result = either(
          result,
          isBuffer(f, u.name)
            ? "data"
            : either(names.get(u.name) ?? "clean", origin(f, names, u.inner)),
        );
        continue;
      }
      if (CLAMPS.has(u.name)) {
        const bound = (b: string) =>
          origin(f, names, b) === "length" ||
          isConstantExpression(b, constants);
        if (
          u.name === "min" &&
          args.every(bound) &&
          args.some((b) => origin(f, names, b) === "length")
        ) {
          result = either(result, "length"); // the least of lengths
          continue;
        }
        const bounds = u.name === "min" ? args : [args[args.length - 1] ?? ""];
        if (bounds.some(bound)) {
          continue;
        }
      }
      let call: Origin = readsData(f, u.name)
        ? "data"
        : measures(f, u.name)
          ? "length"
          : "clean";
      for (const a of args) {
        call = either(call, origin(f, names, a));
      }
      result = either(result, call);
    }
    // The names outside those calls and subscripts.
    for (const m of rest.matchAll(/(?<![\w.])([A-Za-z_]\w*)(\s*\.\s*\w+)?/g)) {
      const name = m[1]!;
      if (uniforms.has(name) && m[2]) {
        result = either(result, "data");
      } else if (names.has(name)) {
        result = either(result, names.get(name)!);
      }
    }
    if (/\.\s*(?:load|add|exchange)\s*\(/.test(text)) {
      result = either(result, "data");
    }
    return result;
  }

  function originsIn(f: SlangFunction, carried: Carried): Map<string, Origin> {
    const key = keyOf(f, carried);
    const cached = originsOf.get(key);
    if (cached) {
      return cached;
    }
    const names = new Map<string, Origin>();
    originsOf.set(key, names);
    const body = f.body;
    const assignments = [
      ...body.matchAll(
        /(?<![\w.])(\w+)((?:\s*\.\s*\w+|\s*\[[^\]]*\])*)\s*(=|\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\|=|\^=)(?!=)/g,
      ),
    ].filter((m) => !isBuffer(f, m[1]!));
    const rhs = (m: RegExpMatchArray) => {
      const start = m.index! + m[0].length;
      const value = body.slice(start, expressionEnd(body, start));
      const index = m[2]?.includes("[")
        ? m[2].replace(/^[^[]*\[|\][^\]]*$/g, "")
        : "";
      return [value, index] as const;
    };
    const dataParams = f.params.flatMap((p, k) =>
      p.name !== "" &&
      !BUFFER_TYPE.test(p.type) &&
      !p.semantic &&
      (carried?.[k] ?? true)
        ? [p.name]
        : [],
    );
    // First the lengths: GetDimensions' outputs, then every name assigned
    // only from lengths and constants (every other name taken as data).
    const lengths = new Set<string>();
    for (const m of body.matchAll(/\.\s*GetDimensions\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      for (const a of splitTop(
        body.slice(open + 1, matching(body, open) - 1),
        ",",
      )) {
        if (/^\s*\w+\s*$/.test(a)) {
          lengths.add(a.trim());
        }
      }
    }
    for (let grew = true; grew;) {
      grew = false;
      const pessimistic = new Map<string, Origin>(
        [...assignments.map((m) => m[1]!), ...dataParams].map((n) => [
          n,
          "data",
        ]),
      );
      for (const n of lengths) {
        pessimistic.set(n, "length");
      }
      for (const name of new Set(assignments.map((m) => m[1]!))) {
        if (lengths.has(name) || dataParams.includes(name)) {
          continue;
        }
        const all = assignments.filter((m) => m[1] === name);
        if (
          all.every((m) => {
            const [value, index] = rhs(m);
            return index === "" && origin(f, pessimistic, value) === "length";
          })
        ) {
          lengths.add(name);
          grew = true;
        }
      }
    }
    // Then data, from nothing up: a name is data once any assignment, out
    // parameter or the call's argument for it carries data.
    for (const n of lengths) {
      names.set(n, "length");
    }
    for (const n of dataParams) {
      names.set(n, "data");
    }
    for (let pass = 0, changed = true; changed && pass < 64; pass++) {
      changed = false;
      const set = (name: string, o: Origin) => {
        if (lengths.has(name) || o !== "data" || names.get(name) === "data") {
          return;
        }
        names.set(name, "data");
        changed = true;
      };
      for (const m of assignments) {
        const [value, index] = rhs(m);
        set(m[1]!, either(origin(f, names, value), origin(f, names, index)));
      }
      // Out parameters of the engine's functions.
      for (const u of uses(body)) {
        const callee = u.kind === "call" ? resolve(f, u.name)[0] : undefined;
        if (!callee) {
          continue;
        }
        const args = splitTop(u.inner, ",").map((a) => a.trim());
        let o: Origin = readsData(f, u.name) ? "data" : "clean";
        for (const a of args) {
          o = either(o, origin(f, names, a));
        }
        callee.params.forEach((p, k) => {
          const target = /^(\w+)/.exec(args[k] ?? "")?.[1];
          if ((p.modifier === "out" || p.modifier === "inout") && target) {
            set(target, o);
          }
        });
      }
    }
    return names;
  }

  /** Why an index `index` into a buffer in `f` isn't clamped, or undefined. */
  function indexProblem(
    f: SlangFunction,
    carried: Carried,
    index: string,
  ): string | undefined {
    const names = originsIn(f, carried);
    if (origin(f, names, index) !== "data") {
      return undefined;
    }
    const text = index.trim().replace(/\s+/g, " ");
    const e = text.replace(/\W/g, "\\$&").replace(/\\ /g, "\\s*");
    for (const m of f.body.matchAll(
      new RegExp(
        `(?<![\\w.])${e}\\s*(>=|<)\\s*(\\w+)|(\\w+)\\s*(<=|>)\\s*${e}(?![\\w(\\[])`,
        "g",
      ),
    )) {
      if (names.get(m[2] ?? m[3]!) === "length") {
        return undefined;
      }
    }
    return `the index \`${text}\` comes from data, unclamped`;
  }

  const safety = new Map<string, string | undefined>();

  /** Why `f` isn't safe to call with data in `carried` (see above), or undefined. */
  function unsafe(f: SlangFunction, carried: Carried): string | undefined {
    const key = keyOf(f, carried);
    if (safety.has(key)) {
      return safety.get(key);
    }
    safety.set(key, undefined);
    let problem: string | undefined;
    for (const u of uses(f.body)) {
      problem = siteProblem(f, carried, u);
      if (problem) {
        break;
      }
    }
    safety.set(key, problem);
    return problem;
  }

  function siteProblem(
    f: SlangFunction,
    carried: Carried,
    u: Use,
  ): string | undefined {
    if (u.kind === "index") {
      return isBuffer(f, u.name)
        ? indexProblem(f, carried, u.inner)
        : undefined;
    }
    if (CLAMPS.has(u.name) || KEYWORDS.has(u.name)) {
      return undefined;
    }
    const names = originsIn(f, carried);
    const data = splitTop(u.inner, ",").map(
      (a) => origin(f, names, a) === "data",
    );
    if (!data.includes(true)) {
      return undefined;
    }
    for (const callee of resolve(f, u.name)) {
      const why = callee === f ? undefined : unsafe(callee, data);
      if (why) {
        return `\`${u.name}\` takes data, and in it ${why}`;
      }
    }
    return undefined;
  }

  const problems = new Set<string>();
  for (const { name } of sources) {
    const text = texts.get(name)!;
    const lineOf = (at: number) => text.slice(0, at).split("\n").length;
    const defined = [...functions.values()]
      .flat()
      .filter((f) => f.source === name);
    for (const m of text.matchAll(/\bfor\s*\(/g)) {
      const f = defined.find(
        (d) => d.at <= m.index && m.index < d.at + d.body.length,
      );
      if (!f) {
        continue;
      }
      const open = m.index + m[0].length - 1;
      const close = matching(text, open);
      const body = bodyFrom(text, close);
      for (const u of uses(body)) {
        if (u.kind === "call" && KEYWORDS.has(u.name)) {
          continue;
        }
        const why = siteProblem(f, undefined, u);
        if (why) {
          problems.add(`${name}:${lineOf(close + u.start)}: ${why}`);
        }
      }
    }
  }
  return [...problems];
}

function engineSources(): SlangSource[] {
  return roots.flatMap((root) =>
    files(root).map((path) => ({
      name: relative(repo, path),
      code: readFileSync(path, "utf8"),
    })),
  );
}

describe("Slang loops are bounded by constants (AGENTS.md, GPU safety)", () => {
  it("finds the engine's, the examples' and the parity pages' Slang sources", () => {
    const names = engineSources().map((s) => s.name);
    expect(
      names.filter((n) => n.startsWith("packages/")).length,
    ).toBeGreaterThan(40);
    expect(names.some((n) => n.startsWith("examples/"))).toBe(true);
    expect(names.some((n) => n.startsWith("parity/"))).toBe(true);
  });

  it("every loop is bounded by a constant", () => {
    expect(unboundedLoops(engineSources())).toEqual([]);
  });

  it("every buffer index in a loop that data reaches is clamped", () => {
    expect(unclampedIndices(engineSources())).toEqual([]);
  });

  const planted = (body: string, extra = ""): string[] =>
    unboundedLoops([
      {
        name: "planted.slang",
        code: `static const uint MAX_ITEMS = 64u;
#define MAX_TAPS 8
struct Params { uint count; uint2 stride; };
ConstantBuffer<Params> params;
StructuredBuffer<uint> counts;
${extra}
void main(uint n, uint3 id) {
  static const int STEPS = 30;
  ${body}
}`,
      },
    ]);

  it("accepts a constant bound with an early break on the data's count", () => {
    expect(
      planted(
        `for (uint i = 0u; i < MAX_ITEMS; i++) { if (i >= params.count) { break; } }`,
      ),
    ).toEqual([]);
    expect(planted(`for (int i = 0; i < STEPS; i++) {}`)).toEqual([]);
    expect(planted(`for (uint i = 0u; i < MAX_TAPS * 2u; i++) {}`)).toEqual([]);
    expect(
      planted(`for (uint t = id.x; t < uint(MAX_ITEMS * 4); t += 64u) {}`),
    ).toEqual([]);
    expect(planted(`for (int k = 11; k >= 0; k--) {}`)).toEqual([]);
    expect(planted(`for (uint s = 32u; s > 0u; s >>= 1u) {}`)).toEqual([]);
    expect(planted(`for (uint s = 1u; s < MAX_ITEMS; s <<= 1u) {}`)).toEqual(
      [],
    );
    expect(planted(`for (uint i = 1u; i < 10u && n > 3u; i++) {}`)).toEqual([]);
    expect(
      planted(`for (uint i = 0u; i < 3u; i++)
        for (uint j = 0u; j < 3u; j++) { n += i * j; }`),
    ).toEqual([]);
  });

  it("refuses a loop bounded by a uniform's or a buffer's count", () => {
    expect(planted(`for (uint i = 0u; i < params.count; i++) {}`)).toEqual([
      "planted.slang:9: the condition `i < params.count` doesn't bound `i` by a constant",
    ]);
    expect(planted(`for (uint i = 0u; i < counts[0]; i++) {}`)).toHaveLength(1);
    expect(planted(`for (uint i = 0u; i < n; i++) {}`)).toHaveLength(1);
    expect(planted(`for (uint i = 0u; i < min(n, 4u); i++) {}`)).toHaveLength(
      1,
    );
    expect(
      planted(`for (uint i = 0u; i + 1u <= MAX_ITEMS; i++) {}`),
    ).toHaveLength(1);
    expect(planted(`for (uint i = 0u; n < MAX_ITEMS; i++) {}`)).toHaveLength(1);
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS || n > 0u; i++) {}`),
    ).toHaveLength(1);
  });

  it("refuses while and do loops", () => {
    expect(planted(`while (n != 0u) { n = counts[n]; }`)).toEqual([
      "planted.slang:9: a while loop; use a for bounded by a constant",
    ]);
    expect(planted(`do { n--; } while (n > 0u);`)).toHaveLength(2);
  });

  it("refuses a step by data, away from the bound, or a product from 0", () => {
    expect(
      planted(`for (uint x = id.x; x < MAX_ITEMS; x += params.stride.x) {}`),
    ).toEqual([
      "planted.slang:9: the step `x += params.stride.x` isn't by a constant",
    ]);
    expect(planted(`for (uint i = 0u; i < MAX_ITEMS; i--) {}`)).toHaveLength(1);
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS; i *= 2u) {}`),
    ).toHaveLength(1);
    expect(planted(`for (uint k = 11u; k >= 0u; k--) {}`)).toEqual([
      "planted.slang:9: `k >= 0` on a uint is never false",
    ]);
  });

  it("refuses a body that assigns the loop variable", () => {
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS; i++) { i = counts[i]; }`),
    ).toEqual(["planted.slang:9: the body assigns `i`"]);
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS; i++) { if (n > 0u) i--; }`),
    ).toHaveLength(1);
    // A member of the same name is another thing.
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS; i++) { params2.i = 1u; }`),
    ).toEqual([]);
  });

  it("refuses a loop with no declared variable", () => {
    expect(planted(`uint i = 0u; for (; i < MAX_ITEMS; i++) {}`)).toHaveLength(
      1,
    );
  });

  it("takes a name for a constant only when nothing else declares it", () => {
    // `MAX_ITEMS` is also a field here: it might be read from a buffer.
    expect(
      planted(
        `for (uint i = 0u; i < MAX_ITEMS; i++) {}`,
        `struct Other { uint MAX_ITEMS; };`,
      ),
    ).toHaveLength(1);
    expect(
      planted(`static const uint N = 4u; for (uint i = 0u; i < N; i++) {}`),
    ).toEqual([]);
  });

  it("takes a name for a constant only when its value is a constant expression", () => {
    expect(
      planted(
        `for (uint i = 0u; i < FROM_DATA; i++) {}`,
        `static const uint FROM_DATA = params.count;`,
      ),
    ).toHaveLength(1);
    expect(
      planted(
        `for (uint i = 0u; i < FROM_UNIFORM; i++) {}`,
        `#define FROM_UNIFORM params.count`,
      ),
    ).toHaveLength(1);
    expect(
      planted(
        `for (uint i = 0u; i < TWICE; i++) {}`,
        `static const uint TWICE = MAX_ITEMS * 2u;`,
      ),
    ).toEqual([]);
  });

  it("refuses a constant's name that a let or var shadows", () => {
    expect(
      planted(`let MAX_ITEMS = n; for (uint i = 0u; i < MAX_ITEMS; i++) {}`),
    ).toHaveLength(1);
    expect(
      planted(
        `var MAX_TAPS = counts[0]; for (uint i = 0u; i < MAX_TAPS; i++) {}`,
      ),
    ).toHaveLength(1);
  });

  it("refuses a step that doesn't move, counts the wrong way, or wraps", () => {
    expect(planted(`for (uint i = 0u; i < MAX_ITEMS; i += 0u) {}`)).toEqual([
      "planted.slang:9: the step `i += 0u` doesn't move `i`",
    ]);
    expect(
      planted(`for (uint i = 1u; i < MAX_ITEMS; i *= 1u) {}`),
    ).toHaveLength(1);
    expect(planted(`for (int i = 0; i < STEPS; i += -1) {}`)).toEqual([
      "planted.slang:9: the step `i += -1` moves away from the bound",
    ]);
    // 7, 5, 3, 1, then 1 - 2 wraps to 4294967295, still > 0.
    expect(planted(`for (uint s = 7u; s > 0u; s -= 2u) {}`)).toEqual([
      "planted.slang:9: `s -= 2u` on a uint can step past 0 and wrap: count down by 1",
    ]);
    expect(planted(`for (int s = 7; s > 0; s -= 2) {}`)).toEqual([]);
    expect(planted(`for (uint i = 0u; i <= 0xFFFFFFFFu; i++) {}`)).toEqual([
      "planted.slang:9: `i <= 0xFFFFFFFFu` is never false: the step wraps",
    ]);
    expect(
      planted(`for (uint i = 0u; i < 0xFFFFFFFFu; i += 2u) {}`),
    ).toHaveLength(1);
    expect(planted(`for (int i = 0; i <= 2147483647; i++) {}`)).toHaveLength(1);
    expect(
      planted(`for (uint s = 1u; s < 0xFFFFFFFFu; s <<= 1u) {}`),
    ).toHaveLength(1);
    expect(planted(`for (uint i = 0u; i < 0xFFFFFFFFu; i++) {}`)).toEqual([]);
  });

  it("refuses a body that passes the loop variable to an out or inout parameter", () => {
    const bump = `void bump(inout uint x) { x += 1u; }\nuint twice(uint x) { return 2u * x; }`;
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS; i++) { bump(i); }`, bump),
    ).toEqual([
      "planted.slang:10: the body passes `i` to `bump`, which assigns it",
    ]);
    expect(
      planted(
        `for (uint i = 0u; i < MAX_ITEMS; i++) { InterlockedAdd(n, 1u, i); }`,
      ),
    ).toHaveLength(1);
    expect(
      planted(`for (uint i = 0u; i < MAX_ITEMS; i++) { n = twice(i); }`, bump),
    ).toEqual([]);
  });

  it("ignores loops in comments", () => {
    expect(planted(`// while (true) {}\n /* for (;;) {} */`)).toEqual([]);
  });
});

describe("buffer indices that data reaches are clamped (AGENTS.md, GPU safety)", () => {
  const bounds = {
    name: "packages/core/src/shaders/bounds.slang",
    code: readFileSync(join(src, "shaders", "bounds.slang"), "utf8"),
  };
  const planted = (body: string, extra = ""): string[] =>
    unclampedIndices([
      bounds,
      {
        name: "planted.slang",
        code: `import bounds;
static const uint MAX_ITEMS = 64u;
struct Params { uint count; uint base; };
struct Record { uint first; uint count; };
ConstantBuffer<Params> params;
StructuredBuffer<uint> offsets;
StructuredBuffer<Record> records;
StructuredBuffer<float> words;
RWStructuredBuffer<float> written;
${extra}
[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) {
  uint count, stride;
  words.GetDimensions(count, stride);
  ${body}
}`,
      },
    ]);
  const loop = (inner: string) =>
    `for (uint i = 0u; i < MAX_ITEMS; i++) { if (i >= params.count) { break; } ${inner} }`;

  it("refuses an index in a loop from a buffer, a uniform or a record", () => {
    expect(planted(loop(`float x = words[offsets[0] + i];`))).toEqual([
      "planted.slang:16: the index `offsets[0] + i` comes from data, unclamped",
    ]);
    expect(planted(loop(`float x = words[params.base + i];`))).toHaveLength(1);
    expect(
      planted(
        `Record r = records[id.x]; uint at = r.first; ${loop(`float x = words[at + i];`)}`,
      ),
    ).toHaveLength(1);
    // A uniform is no buffer's length.
    expect(
      planted(loop(`float x = words[min(offsets[0] + i, params.count - 1u)];`)),
    ).toHaveLength(1);
  });

  it("refuses a write, and a helper that takes data and doesn't clamp it", () => {
    expect(planted(loop(`written[offsets[i]] = 1.0;`))).toHaveLength(1);
    const read = `float read(StructuredBuffer<float> w, uint at) { return w[at]; }`;
    expect(
      planted(loop(`float x = read(words, offsets[0] + i);`), read),
    ).toEqual([
      "planted.slang:16: `read` takes data, and in it the index `at` comes from data, unclamped",
    ]);
  });

  it("accepts a clamp to a buffer's length or a constant, a guard, and a loop counter", () => {
    expect(
      planted(loop(`float x = words[min(offsets[0] + i, count - 1u)];`)),
    ).toEqual([]);
    expect(
      planted(loop(`float x = words[clampIndex(offsets[0] + i, count)];`)),
    ).toEqual([]);
    expect(
      planted(
        `uint at = clampSpan(params.base, MAX_ITEMS, count); ${loop(`float x = words[at + i];`)}`,
      ),
    ).toEqual([]);
    expect(
      planted(
        loop(
          `uint at = offsets[i]; if (at >= count) { continue; } written[at] = 1.0;`,
        ),
      ),
    ).toEqual([]);
    expect(
      planted(loop(`float x = words[min(offsets[i], MAX_ITEMS - 1u)];`)),
    ).toEqual([]);
    expect(planted(loop(`float x = words[i];`))).toEqual([]);
    const read = `float read(StructuredBuffer<float> w, uint at) {
  uint n, stride;
  w.GetDimensions(n, stride);
  return w[clampIndex(at, n)];
}`;
    expect(
      planted(loop(`float x = read(words, offsets[0] + i);`), read),
    ).toEqual([]);
  });

  it("can't see an index a counter grows under a data-driven branch", () => {
    // `n` only counts up to a uniform's cap: no assignment carries data, so
    // the check takes it for clean. Such a write needs a guard by hand
    // (glare.slang's sources, `count + 1u >= sourceRows`).
    expect(
      planted(
        `uint n = 0u; ${loop(`if (words[i] > 0.0) { written[n] = 1.0; n++; }`)}`,
      ),
    ).toEqual([]);
  });
});
