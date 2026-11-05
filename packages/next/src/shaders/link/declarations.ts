/**
 * A WGSL unit's top-level declarations, read from its source (plan §3.4,
 * step 5's linker): names, kinds, lines, functions' parameter and result
 * types, bindings. It reads; it never rewrites. Comments and the bodies
 * of functions and structs are skipped by depth, so it needs no grammar
 * beyond the declarations' heads.
 */

export type DeclarationKind =
  | "fn"
  | "struct"
  | "var"
  | "const"
  | "override"
  | "alias"
  | "const_assert"
  | "directive";

export interface Declaration {
  kind: DeclarationKind;
  /** Its name (a directive's keyword: `enable`, `requires`, `diagnostic`). */
  name: string;
  /** 1-based, in the unit. */
  line: number;
  /** A function's parameter types, spaces removed (`ptr<function,VsOut>`). */
  params?: string[];
  /** A function's result type, spaces removed; undefined for none. */
  result?: string;
  /** A function's or binding's attributes by name (`group`: "2"). */
  attributes?: Record<string, string>;
}

const DIRECTIVES = new Set(["enable", "requires", "diagnostic"]);
const KINDS = new Set<string>([
  "fn",
  "struct",
  "var",
  "const",
  "override",
  "alias",
  "const_assert",
]);

/** The source with comments blanked out (lines and columns kept). */
export function blankComments(source: string): string {
  let out = "";
  let i = 0;
  let block = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (block > 0) {
      if (two === "/*") {
        block++;
        out += "  ";
        i += 2;
      } else if (two === "*/") {
        block--;
        out += "  ";
        i += 2;
      } else {
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
    } else if (two === "/*") {
      block = 1;
      out += "  ";
      i += 2;
    } else if (two === "//") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i++;
      }
    } else {
      out += source[i];
      i++;
    }
  }
  return out;
}

interface Token {
  text: string;
  line: number;
}

function tokens(source: string): Token[] {
  const out: Token[] = [];
  const re = /[A-Za-z_][A-Za-z0-9_]*|\d[\w.]*|->|\S/g;
  const lines: number[] = [];
  let line = 1;
  for (let i = 0; i < source.length; i++) {
    lines.push(line);
    if (source[i] === "\n") {
      line++;
    }
  }
  for (const m of source.matchAll(re)) {
    out.push({ text: m[0], line: lines[m.index] ?? line });
  }
  return out;
}

const OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Tokens from `start` up to the one closing the bracket at `start`. */
function balanced(t: Token[], start: number): number {
  const open = t[start]!.text;
  const close = OPEN[open]!;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i]!.text === open) {
      depth++;
    } else if (t[i]!.text === close) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return t.length - 1;
}

/** Top-level comma-separated parts of t[from, to), as joined text. */
function splitTop(t: Token[], from: number, to: number): string[] {
  const parts: string[] = [];
  let depth = 0;
  let angle = 0;
  let current = "";
  for (let i = from; i < to; i++) {
    const s = t[i]!.text;
    if (s === "(" || s === "[" || s === "{") {
      depth++;
    } else if (s === ")" || s === "]" || s === "}") {
      depth--;
    } else if (s === "<") {
      angle++;
    } else if (s === ">") {
      angle--;
    }
    if (s === "," && depth === 0 && angle === 0) {
      parts.push(current);
      current = "";
    } else {
      current += s;
    }
  }
  if (current !== "") {
    parts.push(current);
  }
  return parts;
}

/** A parameter's type: what follows its name's colon, attributes dropped. */
function parameterType(part: string): string {
  const withoutAttributes = part.replace(/@[A-Za-z_]+(\([^)]*\))?/g, "");
  const colon = withoutAttributes.indexOf(":");
  return colon < 0 ? withoutAttributes : withoutAttributes.slice(colon + 1);
}

/** A WGSL unit's top-level declarations, in source order. */
export function declarations(source: string): Declaration[] {
  const t = tokens(blankComments(source));
  const out: Declaration[] = [];
  let attributes: Record<string, string> = {};
  let i = 0;
  while (i < t.length) {
    const s = t[i]!.text;
    if (s === "@") {
      const name = t[i + 1]?.text ?? "";
      let value = "";
      let next = i + 2;
      if (t[next]?.text === "(") {
        const end = balanced(t, next);
        value = t
          .slice(next + 1, end)
          .map((x) => x.text)
          .join("");
        next = end + 1;
      }
      attributes[name] = value;
      i = next;
      continue;
    }
    if (DIRECTIVES.has(s) && out.every((d) => d.kind === "directive")) {
      out.push({ kind: "directive", name: s, line: t[i]!.line });
      while (i < t.length && t[i]!.text !== ";") {
        i++;
      }
      i++;
      attributes = {};
      continue;
    }
    if (!KINDS.has(s)) {
      // Not a declaration's start (stray tokens): skip, brackets whole.
      i = OPEN[s] ? balanced(t, i) + 1 : i + 1;
      attributes = {};
      continue;
    }
    const kind = s as DeclarationKind;
    const line = t[i]!.line;
    let j = i + 1;
    // `var<storage, read>`: the address space before the name.
    if (kind === "var" && t[j]?.text === "<") {
      while (j < t.length && t[j]!.text !== ">") {
        j++;
      }
      j++;
    }
    const name = kind === "const_assert" ? "" : (t[j]?.text ?? "");
    const declaration: Declaration = { kind, name, line };
    if (Object.keys(attributes).length > 0) {
      declaration.attributes = attributes;
    }
    if (kind === "fn") {
      const open = j + 1;
      const close = balanced(t, open);
      declaration.params = splitTop(t, open + 1, close).map(parameterType);
      let k = close + 1;
      if (t[k]?.text === "->") {
        let result = "";
        k++;
        while (k < t.length && t[k]!.text !== "{") {
          // A result's attributes (`@location(0)`, `@builtin(position)`).
          if (t[k]!.text === "@") {
            k += 2;
            if (t[k]?.text === "(") {
              k = balanced(t, k) + 1;
            }
            continue;
          }
          result += t[k]!.text;
          k++;
        }
        declaration.result = result;
      }
      i = balanced(t, k) + 1;
    } else if (kind === "struct") {
      let k = j + 1;
      while (k < t.length && t[k]!.text !== "{") {
        k++;
      }
      i = balanced(t, k) + 1;
      if (t[i]?.text === ";") {
        i++;
      }
    } else {
      // To the declaration's semicolon, brackets whole.
      let k = j;
      while (k < t.length && t[k]!.text !== ";") {
        k = OPEN[t[k]!.text] ? balanced(t, k) + 1 : k + 1;
      }
      i = k + 1;
    }
    out.push(declaration);
    attributes = {};
  }
  return out;
}
