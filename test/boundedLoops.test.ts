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
 * The check reads every `packages/core/src/**\/*.slang`, comments and
 * strings blanked, and refuses:
 *
 * - any `while` or `do` loop: only a `for` names its bound in its header;
 * - a `for` that declares no loop variable in its first clause;
 * - a `for` whose condition has no `&&`-joined term comparing the loop
 *   variable with a constant expression;
 * - a step that isn't `++`, `--`, or a compound assignment by a constant
 *   expression, or that moves away from the bound (`i < N` with `i--`),
 *   or grows a product or a shift from 0;
 * - `i >= 0` on a `uint` loop variable (never false);
 * - a body that assigns the loop variable.
 *
 * A constant expression is numeric literals, the casts `uint`, `int` and
 * `float`, arithmetic, bit and shift operators, parentheses, and names
 * declared `static const` (at file or function scope) or `#define` in the
 * scanned sources and declared nowhere else as a variable, a parameter or
 * a field. A member (`params.count`), an element (`counts[i]`), a call, or
 * a plain variable is not one. Further terms (`&& any(through > 1e-3)`)
 * may only end a loop sooner, so they're allowed.
 */

const repo = fileURLToPath(new URL("..", import.meta.url));
const src = join(repo, "packages", "core", "src");

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

/**
 * Names declared `static const` or `#define` in `sources` and declared
 * nowhere else (a variable, a parameter, a field) under the same name.
 */
export function slangConstants(sources: readonly SlangSource[]): Set<string> {
  const constants = new Set<string>();
  const other = new Set<string>();
  const constant = new RegExp(
    `\\bstatic\\s+const\\s+(?:${SCALAR}|\\w+)\\s+(\\w+)`,
    "g",
  );
  const define = /^[ \t]*#define[ \t]+(\w+)/gm;
  // A typed declaration: a scalar or vector type, then a name, then `=`, `;`,
  // `,`, `)`, `[` or `:` (a semantic); `const` before it makes a constant.
  const declared = new RegExp(
    `(\\bconst\\s+)?\\b${SCALAR}\\s+(\\w+)\\s*(?=[=;,)\\[:])`,
    "g",
  );
  for (const { code } of sources) {
    const text = blank(code);
    for (const m of text.matchAll(constant)) {
      constants.add(m[1]!);
    }
    for (const m of text.matchAll(define)) {
      constants.add(m[1]!);
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
  }
  for (const name of other) {
    constants.delete(name);
  }
  return constants;
}

const NUMBER =
  /^(?:0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)[uUlLfFhH]*$/;

/** Whether `expression` is a constant expression (see the top). */
export function isConstantExpression(
  expression: string,
  constants: ReadonlySet<string>,
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

/** Why the `for` header `init; condition; step` and its body break the rule, or undefined. */
function forProblem(
  header: string,
  body: string,
  constants: ReadonlySet<string>,
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
  const variable = declaration[2]!;
  const start = declaration[3]!.trim();
  const v = variable.replace(/\W/g, "\\$&");
  let direction: "up" | "down" | undefined;
  let boundZero = false;
  for (const term of splitTop(condition, "&&")) {
    const t = term
      .trim()
      .replace(/^\((.*)\)$/s, "$1")
      .trim();
    const left = new RegExp(`^${v}\\s*(<=|<|>=|>)\\s*([\\s\\S]+)$`).exec(t);
    const right = new RegExp(`^([\\s\\S]+?)\\s*(<=|<|>=|>)\\s*${v}$`).exec(t);
    if (left && isConstantExpression(left[2]!, constants)) {
      direction = left[1]!.startsWith("<") ? "up" : "down";
      boundZero = left[1] === ">=" && /^0[uU]?$/.test(left[2]!.trim());
      break;
    }
    if (right && isConstantExpression(right[1]!, constants)) {
      direction = right[2]!.startsWith(">") ? "up" : "down";
      boundZero = right[2] === "<=" && /^0[uU]?$/.test(right[1]!.trim());
      break;
    }
  }
  if (!direction) {
    return `the condition \`${condition}\` doesn't bound \`${variable}\` by a constant`;
  }
  if (boundZero && type.startsWith("uint")) {
    return `\`${variable} >= 0\` on a uint is never false`;
  }
  const unary = new RegExp(
    `^(?:${v}\\s*(\\+\\+|--)|(\\+\\+|--)\\s*${v})$`,
  ).exec(step);
  const compound = new RegExp(
    `^${v}\\s*(\\+=|-=|\\*=|/=|<<=|>>=)\\s*([\\s\\S]+)$`,
  ).exec(step);
  let op: string;
  if (unary) {
    op = unary[1] ?? unary[2]!;
  } else if (compound && isConstantExpression(compound[2]!, constants)) {
    op = compound[1]!;
  } else {
    return `the step \`${step}\` isn't by a constant`;
  }
  if ((direction === "up" ? GROWS : SHRINKS).has(op) === false) {
    return `the step \`${step}\` moves away from the bound`;
  }
  if ((op === "*=" || op === "<<=") && /^0[uU]?$/.test(start)) {
    return `\`${variable}\` grows by \`${op}\` from 0`;
  }
  const assigned = new RegExp(
    `(?<![\\w.])${v}\\s*(?:=(?!=)|\\+=|-=|\\*=|/=|%=|<<=|>>=|&=|\\|=|\\^=|\\+\\+|--)|(?:\\+\\+|--)\\s*${v}(?!\\w)`,
  );
  if (assigned.test(body)) {
    return `the body assigns \`${variable}\``;
  }
  return undefined;
}

/** Every loop in `sources` that breaks the rule, as `name:line: why`. */
export function unboundedLoops(sources: readonly SlangSource[]): string[] {
  const constants = slangConstants(sources);
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
      const problem = forProblem(header, bodyFrom(text, close), constants);
      if (problem) {
        problems.push(`${name}:${lineOf(at)}: ${problem}`);
      }
    }
  }
  return problems;
}

function engineSources(): SlangSource[] {
  return files(src).map((path) => ({
    name: relative(src, path),
    code: readFileSync(path, "utf8"),
  }));
}

describe("Slang loops are bounded by constants (AGENTS.md, GPU safety)", () => {
  it("finds the engine's Slang sources", () => {
    expect(engineSources().length).toBeGreaterThan(40);
  });

  it("every loop in packages/core/src is bounded by a constant", () => {
    expect(unboundedLoops(engineSources())).toEqual([]);
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

  it("ignores loops in comments", () => {
    expect(planted(`// while (true) {}\n /* for (;;) {} */`)).toEqual([]);
  });
});
