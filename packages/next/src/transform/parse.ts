// A small tokenizer and recursive-descent parser for the restricted JS an
// application writes as a transform function (plan 2026-11-12, task 2; owner,
// 2026-11-11: plain JS, parsed from `fn.toString()`, never evaluated, so it is
// CSP-safe and the CPU path is the function itself). The source becomes an AST
// and the AST is interpreted symbolically into the IR: `const`/`let` locals,
// unrolled `for` loops with constant bounds, `if`/`else` and ternaries (both
// sides built and merged with `select`, unless the condition is constant).
//
// Accepted: an arrow function, `function` expression or method with
// `(p, params)` or `(p, params, out)` (a 4th parameter is bound to undefined,
// so `if (jacobian)` guards fold away); `p[0]`/`p[1]`/`p[2]`, `p.x`/`p.y`/`p.z`,
// `const [x, y, z] = p`; `params.name`, `params["name"]`, `const { a, b: c } =
// params` (also as the parameter pattern); numbers (`.5`, `1e3`, hex), `true`,
// `false`; `+ - * / **`, `< <= > >= == != === !==`, `&& || !` on booleans,
// `?:`, comma expressions, `void 0`, `!0`/`!1`; locals with `= += -= *= /= **=`,
// `++`/`--`; 3-element array literals; `out[i] = …; return out`;
// `Math.PI|E|LN2|LN10|LOG2E|LOG10E|SQRT2|SQRT1_2` and `Math.abs sqrt exp log
// log2 log10 sin cos tan atan asin acos sinh cosh tanh floor ceil sign trunc
// min max pow atan2 hypot`. That is also what minifiers emit from such code.
//
// Refused, with the construct and its line:column (line 1 is the first line
// of the function's source): free variables other than `Math`, calls to
// anything but `Math.*`, object literals, `this`, `new`, nested functions,
// strings, `%`, bitwise operators, `typeof`, loops other than constant `for`,
// `break`/`continue`, `try`, optional chaining, spread, templates, and
// assignment to the parameters `p`, `params` and `out` themselves.

import { Ir, type IrProgram, type NodeId, type Op } from "./ir.ts";

export class TransformParseError extends Error {
  constructor(
    /** The refused construct. */
    readonly construct: string,
    readonly line: number,
    readonly column: number,
    detail: string,
  ) {
    super(`Unsupported ${construct} at ${line}:${column}: ${detail}`);
    this.name = "TransformParseError";
  }
}

interface Pos {
  readonly line: number;
  readonly col: number;
}

function fail(construct: string, at: Pos, detail: string): never {
  throw new TransformParseError(construct, at.line, at.col, detail);
}

const PURE =
  "transform functions are pure: only their parameters and Math are in scope";

// Tokens.

interface Token extends Pos {
  readonly type: "num" | "str" | "id" | "punct" | "eof";
  readonly text: string;
  readonly num: number;
  /** A line break lies between the previous token and this one. */
  readonly nl: boolean;
}

const PUNCTUATORS = [
  ">>>=",
  "...",
  "===",
  "!==",
  "**=",
  "<<=",
  ">>=",
  ">>>",
  "&&=",
  "||=",
  "??=",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "?.",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "**",
  ..."{}()[];,<>+-*/%&|^!~?:=.",
];

const NUMBER =
  /0[xX][0-9a-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?/y;
const IDENT = /[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*/uy;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  let nl = false;
  const here = (at: number): Pos => ({ line, col: at - lineStart + 1 });
  const push = (
    type: Token["type"],
    text: string,
    at: number,
    num = 0,
  ): void => {
    tokens.push({ type, text, num, nl, ...here(at) });
    nl = false;
  };
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === "\n") {
      line++;
      lineStart = ++i;
      nl = true;
    } else if (/\s/.test(ch)) {
      i++;
    } else if (src.startsWith("//", i)) {
      while (i < src.length && src[i] !== "\n") {
        i++;
      }
    } else if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) {
        fail("comment", here(i), "unterminated /* comment");
      }
      for (let k = i; k < end; k++) {
        if (src[k] === "\n") {
          line++;
          lineStart = k + 1;
          nl = true;
        }
      }
      i = end + 2;
    } else if (ch === '"' || ch === "'") {
      let k = i + 1;
      while (k < src.length && src[k] !== ch && src[k] !== "\n") {
        k += src[k] === "\\" ? 2 : 1;
      }
      if (src[k] !== ch) {
        fail("string literal", here(i), "unterminated string");
      }
      push("str", src.slice(i + 1, k), i);
      i = k + 1;
    } else if (ch === "`") {
      fail("template literal", here(i), "strings are not part of the subset");
    } else if (
      /[0-9]/.test(ch) ||
      (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))
    ) {
      NUMBER.lastIndex = i;
      const text = NUMBER.exec(src)![0];
      if (text.endsWith("n")) {
        fail("BigInt literal", here(i), "numbers are float64");
      }
      push("num", text, i, Number(text.replaceAll("_", "")));
      i += text.length;
    } else {
      IDENT.lastIndex = i;
      const id = IDENT.exec(src);
      if (id) {
        push("id", id[0], i);
        i += id[0].length;
        continue;
      }
      const at = i;
      const punct = PUNCTUATORS.find(
        (candidate) =>
          src.startsWith(candidate, at) &&
          !(candidate === "?." && /[0-9]/.test(src[at + 2] ?? "")),
      );
      if (!punct) {
        fail(`character '${ch}'`, here(i), "not part of the subset");
      }
      push("punct", punct, i);
      i += punct.length;
    }
  }
  push("eof", "", i);
  return tokens;
}

// The AST.

type Expr = Pos &
  (
    | { k: "num"; v: number }
    | { k: "bool"; v: boolean }
    | { k: "str"; v: string }
    | { k: "id"; name: string }
    | { k: "member"; obj: Expr; prop: string | Expr }
    | { k: "call"; callee: Expr; args: Expr[] }
    | { k: "array"; items: Expr[] }
    | { k: "unary"; op: string; arg: Expr }
    | { k: "binary"; op: string; l: Expr; r: Expr }
    | { k: "logical"; op: string; l: Expr; r: Expr }
    | { k: "cond"; test: Expr; a: Expr; b: Expr }
    | { k: "assign"; op: string; target: Expr; value: Expr }
    | { k: "update"; op: string; prefix: boolean; target: Expr }
    | { k: "seq"; items: Expr[] }
  );

type Pattern = Pos &
  (
    | { k: "id"; name: string }
    | { k: "array"; items: (string | null)[] }
    | { k: "object"; props: { key: string; name: string }[] }
  );

type Stmt = Pos &
  (
    | {
        k: "var";
        kind: "const" | "let";
        decls: { target: Pattern; init: Expr | null }[];
      }
    | { k: "expr"; e: Expr }
    | { k: "return"; e: Expr | null }
    | { k: "if"; test: Expr; then: Stmt; else: Stmt | null }
    | {
        k: "for";
        init: Stmt | null;
        test: Expr | null;
        update: Expr | null;
        body: Stmt;
      }
    | { k: "block"; body: Stmt[] }
    | { k: "empty" }
  );

interface FunctionAst extends Pos {
  readonly params: Pattern[];
  readonly body: Stmt[];
}

const BINARY_PRECEDENCE: Readonly<Record<string, number>> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "===": 3,
  "!==": 3,
  "<": 4,
  "<=": 4,
  ">": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

const REFUSED_OPERATORS: Readonly<Record<string, string>> = {
  "|": "bitwise operators are not supported",
  "^": "bitwise operators are not supported",
  "&": "bitwise operators are not supported",
  "<<": "bitwise operators are not supported",
  ">>": "bitwise operators are not supported",
  ">>>": "bitwise operators are not supported",
  "~": "bitwise operators are not supported",
  "??": "nullish coalescing is not supported",
  "%=": "'%' is not supported",
  "<<=": "bitwise operators are not supported",
  ">>=": "bitwise operators are not supported",
  ">>>=": "bitwise operators are not supported",
  "&=": "bitwise operators are not supported",
  "|=": "bitwise operators are not supported",
  "^=": "bitwise operators are not supported",
  "&&=": "logical assignment is not supported",
  "||=": "logical assignment is not supported",
  "??=": "logical assignment is not supported",
};

const ASSIGNMENT = new Set(["=", "+=", "-=", "*=", "/=", "**="]);

const REFUSED_WORDS: Readonly<Record<string, string>> = {
  this: PURE,
  new: "objects are not supported",
  null: "there is no null; use numbers",
  function: "nested functions are not supported; inline the math",
  class: "classes are not supported",
  typeof: "only numbers are supported",
  delete: "objects are not supported",
  await: "functions are synchronous",
  yield: "generators are not supported",
  super: "classes are not supported",
  import: "imports are not supported",
  async: "functions are synchronous",
  while: "only `for` loops with constant bounds are supported",
  do: "only `for` loops with constant bounds are supported",
  switch: "use ternaries or if/else",
  try: "exceptions are not supported",
  throw: "exceptions are not supported",
  break: "loops are unrolled; break is not supported",
  continue: "loops are unrolled; continue is not supported",

  with: "not supported",
  debugger: "not supported",
  in: "only numbers are supported",
  instanceof: "only numbers are supported",
  export: "export is not part of a function",
};

class Parser {
  private i = 0;

  constructor(private readonly toks: Token[]) {}

  private get t(): Token {
    return this.toks[this.i]!;
  }

  private peek(): Token {
    return this.toks[Math.min(this.i + 1, this.toks.length - 1)]!;
  }

  private next(): Token {
    const token = this.t;
    if (token.type !== "eof") {
      this.i++;
    }
    return token;
  }

  private isP(text: string): boolean {
    return this.t.type === "punct" && this.t.text === text;
  }

  private isId(text: string): boolean {
    return this.t.type === "id" && this.t.text === text;
  }

  private eatP(text: string): boolean {
    if (this.isP(text)) {
      this.i++;
      return true;
    }
    return false;
  }

  private expectP(text: string): void {
    if (!this.eatP(text)) {
      this.unexpected(`expected '${text}'`);
    }
  }

  private unexpected(detail: string): never {
    const token = this.t;
    const name =
      token.type === "eof" ? "end of source" : `token '${token.text}'`;
    if (token.type === "punct" && REFUSED_OPERATORS[token.text]) {
      fail(`operator '${token.text}'`, token, REFUSED_OPERATORS[token.text]!);
    }
    if (token.type === "punct" && token.text === "=>") {
      fail(
        "nested arrow function",
        token,
        "nested functions are not supported",
      );
    }
    return fail(name, token, detail);
  }

  private identifier(): string {
    if (this.t.type !== "id" || REFUSED_WORDS[this.t.text] !== undefined) {
      this.unexpected("expected a name");
    }
    return this.next().text;
  }

  parseFunction(): FunctionAst {
    const start = this.t;
    let params: Pattern[];
    let body: Stmt[];
    if (this.isId("async")) {
      fail("async function", start, "functions are synchronous");
    }
    if (this.isId("function")) {
      this.next();
      if (this.isP("*")) {
        fail("generator function", this.t, "generators are not supported");
      }
      if (this.t.type === "id") {
        this.next();
      }
      params = this.parseParams();
      body = this.parseBlockBody();
    } else if (this.t.type === "id" && this.peek().text === "=>") {
      params = [this.parsePattern(false)];
      this.expectP("=>");
      body = this.parseArrowBody();
    } else if (
      this.t.type === "id" &&
      this.peek().type === "punct" &&
      this.peek().text === "("
    ) {
      this.next();
      params = this.parseParams();
      body = this.parseBlockBody();
    } else if (this.isP("(")) {
      params = this.parseParams();
      this.expectP("=>");
      body = this.parseArrowBody();
    } else {
      this.unexpected(
        "expected an arrow function, a function expression or a method",
      );
    }
    this.eatP(";");
    if (this.t.type !== "eof") {
      this.unexpected("expected the end of the function");
    }
    return { params, body, line: start.line, col: start.col };
  }

  private parseArrowBody(): Stmt[] {
    if (this.isP("{")) {
      return this.parseBlockBody();
    }
    const at = this.t;
    return [
      { k: "return", e: this.parseExpression(), line: at.line, col: at.col },
    ];
  }

  private parseParams(): Pattern[] {
    this.expectP("(");
    const params: Pattern[] = [];
    while (!this.isP(")")) {
      if (this.isP("...")) {
        fail("rest parameter", this.t, "parameters are (p, params[, out])");
      }
      params.push(this.parsePattern(true));
      if (this.isP("=")) {
        fail("default parameter value", this.t, "defaults are not supported");
      }
      if (!this.eatP(",")) {
        break;
      }
    }
    this.expectP(")");
    return params;
  }

  private parsePattern(allowDestructuring: boolean): Pattern {
    const at = this.t;
    if (this.isP("[") && allowDestructuring) {
      this.next();
      const items: (string | null)[] = [];
      while (!this.isP("]")) {
        if (this.isP(",")) {
          this.next();
          items.push(null);
          continue;
        }
        if (this.isP("...")) {
          fail("rest element", this.t, "not supported");
        }
        if (this.isP("[") || this.isP("{")) {
          fail("nested destructuring", this.t, "not supported");
        }
        items.push(this.identifier());
        if (this.isP("=")) {
          fail("default value", this.t, "defaults are not supported");
        }
        if (!this.eatP(",")) {
          break;
        }
      }
      this.expectP("]");
      return { k: "array", items, line: at.line, col: at.col };
    }
    if (this.isP("{") && allowDestructuring) {
      this.next();
      const props: { key: string; name: string }[] = [];
      while (!this.isP("}")) {
        if (this.isP("...")) {
          fail("rest element", this.t, "not supported");
        }
        const keyToken = this.t;
        const key =
          keyToken.type === "str" ? this.next().text : this.identifier();
        let name = key;
        if (this.eatP(":")) {
          if (this.isP("[") || this.isP("{")) {
            fail("nested destructuring", this.t, "not supported");
          }
          name = this.identifier();
        } else if (keyToken.type === "str") {
          this.unexpected("expected ':' after a string key");
        }
        if (this.isP("=")) {
          fail("default value", this.t, "defaults are not supported");
        }
        props.push({ key, name });
        if (!this.eatP(",")) {
          break;
        }
      }
      this.expectP("}");
      return { k: "object", props, line: at.line, col: at.col };
    }
    return { k: "id", name: this.identifier(), line: at.line, col: at.col };
  }

  private parseBlockBody(): Stmt[] {
    this.expectP("{");
    const body: Stmt[] = [];
    while (!this.isP("}")) {
      if (this.t.type === "eof") {
        this.unexpected("expected '}'");
      }
      body.push(this.parseStatement());
    }
    this.expectP("}");
    return body;
  }

  private endStatement(): void {
    if (this.eatP(";") || this.isP("}") || this.t.type === "eof" || this.t.nl) {
      return;
    }
    this.unexpected("expected ';'");
  }

  private parseStatement(): Stmt {
    const at = this.t;
    const pos = { line: at.line, col: at.col };
    if (this.isP("{")) {
      return { k: "block", body: this.parseBlockBody(), ...pos };
    }
    if (this.eatP(";")) {
      return { k: "empty", ...pos };
    }
    if (at.type === "id") {
      switch (at.text) {
        case "const":
        case "let":
        case "var": {
          const decl = this.parseVar();
          this.endStatement();
          return decl;
        }
        case "return": {
          this.next();
          let e: Expr | null = null;
          if (!(
            this.isP(";") ||
            this.isP("}") ||
            this.t.type === "eof" ||
            this.t.nl
          )) {
            e = this.parseExpression();
          }
          this.endStatement();
          return { k: "return", e, ...pos };
        }
        case "if": {
          this.next();
          this.expectP("(");
          const test = this.parseExpression();
          this.expectP(")");
          const then = this.parseStatement();
          let otherwise: Stmt | null = null;
          if (this.isId("else")) {
            this.next();
            otherwise = this.parseStatement();
          }
          return { k: "if", test, then, else: otherwise, ...pos };
        }
        case "for":
          return this.parseFor();
        default:
          if (REFUSED_WORDS[at.text] !== undefined && at.text !== "this") {
            fail(`'${at.text}' statement`, at, REFUSED_WORDS[at.text]!);
          }
          if (this.peek().type === "punct" && this.peek().text === ":") {
            fail("label", at, "labels are not supported");
          }
      }
    }
    const e = this.parseExpression();
    this.endStatement();
    return this.expressionStatement(e);
  }

  /** `c && a`, `c || a` and `c ? a : b` as statements are conditionals; commas are sequences. */
  private expressionStatement(e: Expr): Stmt {
    const pos = { line: e.line, col: e.col };
    switch (e.k) {
      case "seq":
        return {
          k: "block",
          body: e.items.map((item) => this.expressionStatement(item)),
          ...pos,
        };
      case "logical":
        return {
          k: "if",
          test: e.op === "&&" ? e.l : { k: "unary", op: "!", arg: e.l, ...pos },
          then: this.expressionStatement(e.r),
          else: null,
          ...pos,
        };
      case "cond":
        return {
          k: "if",
          test: e.test,
          then: this.expressionStatement(e.a),
          else: this.expressionStatement(e.b),
          ...pos,
        };
      default:
        return { k: "expr", e, ...pos };
    }
  }

  private parseVar(): Stmt {
    const at = this.next();
    const kind = at.text === "const" ? "const" : "let";
    const decls: { target: Pattern; init: Expr | null }[] = [];
    do {
      const target = this.parsePattern(true);
      let init: Expr | null = null;
      if (this.eatP("=")) {
        init = this.parseAssign();
      } else if (kind === "const" || target.k !== "id") {
        this.unexpected("expected an initializer");
      }
      decls.push({ target, init });
    } while (this.eatP(","));
    return { k: "var", kind, decls, line: at.line, col: at.col };
  }

  private parseFor(): Stmt {
    const at = this.next();
    this.expectP("(");
    let init: Stmt | null = null;
    if (!this.isP(";")) {
      if (this.isId("const") || this.isId("let") || this.isId("var")) {
        init = this.parseVar();
      } else {
        init = this.expressionStatement(this.parseExpression());
      }
    }
    if (this.isId("of") || this.isId("in")) {
      fail(
        `for...${this.t.text}`,
        this.t,
        "only `for (let i = 0; i < N; i++)` is supported",
      );
    }
    this.expectP(";");
    const test = this.isP(";") ? null : this.parseExpression();
    this.expectP(";");
    const update = this.isP(")") ? null : this.parseExpression();
    this.expectP(")");
    const body = this.parseStatement();
    return { k: "for", init, test, update, body, line: at.line, col: at.col };
  }

  // Expressions, lowest to highest precedence.

  private parseExpression(): Expr {
    const first = this.parseAssign();
    if (!this.isP(",")) {
      return first;
    }
    const items = [first];
    while (this.eatP(",")) {
      items.push(this.parseAssign());
    }
    return { k: "seq", items, line: first.line, col: first.col };
  }

  private parseAssign(): Expr {
    const left = this.parseConditional();
    const op = this.t;
    if (op.type === "punct" && ASSIGNMENT.has(op.text)) {
      if (left.k !== "id" && left.k !== "member") {
        fail(
          "assignment target",
          op,
          "only variables and elements can be assigned",
        );
      }
      this.next();
      const value = this.parseAssign();
      return {
        k: "assign",
        op: op.text,
        target: left,
        value,
        line: op.line,
        col: op.col,
      };
    }
    if (op.type === "punct" && REFUSED_OPERATORS[op.text] !== undefined) {
      this.unexpected("");
    }
    return left;
  }

  private parseConditional(): Expr {
    const test = this.parseBinary(1);
    if (!this.isP("?")) {
      return test;
    }
    this.next();
    const a = this.parseAssign();
    this.expectP(":");
    const b = this.parseAssign();
    return { k: "cond", test, a, b, line: test.line, col: test.col };
  }

  private parseBinary(minPrecedence: number): Expr {
    let left = this.parseUnary();
    for (;;) {
      const op = this.t;
      if (op.type === "id" && (op.text === "in" || op.text === "instanceof")) {
        fail(`operator '${op.text}'`, op, REFUSED_WORDS[op.text]!);
      }
      if (op.type !== "punct") {
        return left;
      }
      if (REFUSED_OPERATORS[op.text] !== undefined && !op.text.endsWith("=")) {
        fail(`operator '${op.text}'`, op, REFUSED_OPERATORS[op.text]!);
      }
      const precedence = BINARY_PRECEDENCE[op.text];
      if (precedence === undefined || precedence < minPrecedence) {
        return left;
      }
      this.next();
      const right = this.parseBinary(precedence + 1);
      left = {
        k: op.text === "&&" || op.text === "||" ? "logical" : "binary",
        op: op.text,
        l: left,
        r: right,
        line: op.line,
        col: op.col,
      };
    }
  }

  private parseUnary(): Expr {
    const op = this.t;
    if (op.type === "punct" && ["+", "-", "!"].includes(op.text)) {
      this.next();
      return {
        k: "unary",
        op: op.text,
        arg: this.parseUnary(),
        line: op.line,
        col: op.col,
      };
    }
    if (op.type === "punct" && (op.text === "++" || op.text === "--")) {
      this.next();
      return {
        k: "update",
        op: op.text,
        prefix: true,
        target: this.parseUnary(),
        line: op.line,
        col: op.col,
      };
    }
    if (op.type === "punct" && op.text === "~") {
      fail("operator '~'", op, REFUSED_OPERATORS["~"]!);
    }
    if (op.type === "id" && op.text === "void") {
      this.next();
      return {
        k: "unary",
        op: "void",
        arg: this.parseUnary(),
        line: op.line,
        col: op.col,
      };
    }
    const base = this.parsePostfix();
    if (this.isP("**")) {
      const star = this.next();
      return {
        k: "binary",
        op: "**",
        l: base,
        r: this.parseUnary(),
        line: star.line,
        col: star.col,
      };
    }
    return base;
  }

  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    for (;;) {
      const at = this.t;
      if (this.eatP(".")) {
        if (this.t.type !== "id") {
          this.unexpected("expected a property name");
        }
        e = {
          k: "member",
          obj: e,
          prop: this.next().text,
          line: at.line,
          col: at.col,
        };
      } else if (this.eatP("[")) {
        const prop = this.parseExpression();
        this.expectP("]");
        e = { k: "member", obj: e, prop, line: at.line, col: at.col };
      } else if (this.eatP("(")) {
        const args: Expr[] = [];
        while (!this.isP(")")) {
          if (this.isP("...")) {
            fail("spread argument", this.t, "not supported");
          }
          args.push(this.parseAssign());
          if (!this.eatP(",")) {
            break;
          }
        }
        this.expectP(")");
        e = { k: "call", callee: e, args, line: at.line, col: at.col };
      } else if (this.isP("?.")) {
        fail("optional chaining", at, "not supported");
      } else if ((this.isP("++") || this.isP("--")) && !at.nl) {
        this.next();
        e = {
          k: "update",
          op: at.text,
          prefix: false,
          target: e,
          line: at.line,
          col: at.col,
        };
      } else {
        return e;
      }
    }
  }

  private parsePrimary(): Expr {
    const at = this.t;
    const pos = { line: at.line, col: at.col };
    switch (at.type) {
      case "num":
        this.next();
        return { k: "num", v: at.num, ...pos };
      case "str":
        this.next();
        return { k: "str", v: at.text, ...pos };
      case "id": {
        if (at.text === "true" || at.text === "false") {
          this.next();
          return { k: "bool", v: at.text === "true", ...pos };
        }
        const reason = REFUSED_WORDS[at.text];
        if (reason !== undefined) {
          fail(`'${at.text}'`, at, reason);
        }
        this.next();
        if (this.isP("=>")) {
          fail(
            "nested arrow function",
            at,
            "nested functions are not supported",
          );
        }
        return { k: "id", name: at.text, ...pos };
      }
      case "punct":
        if (at.text === "(") {
          this.next();
          const e = this.parseExpression();
          this.expectP(")");
          return e;
        }
        if (at.text === "[") {
          this.next();
          const items: Expr[] = [];
          while (!this.isP("]")) {
            if (this.isP(",")) {
              fail("array hole", this.t, "not supported");
            }
            if (this.isP("...")) {
              fail("spread element", this.t, "not supported");
            }
            items.push(this.parseAssign());
            if (!this.eatP(",")) {
              break;
            }
          }
          this.expectP("]");
          return { k: "array", items, ...pos };
        }
        if (at.text === "{") {
          fail(
            "object literal",
            at,
            "objects are not supported; return an array [x, y, z]",
          );
        }
        break;
      default:
        break;
    }
    return this.unexpected("expected an expression");
  }
}

// Interpretation into the IR.

type Val =
  | { t: "num"; n: NodeId }
  | { t: "bool"; n: NodeId }
  | { t: "vec"; c: readonly (NodeId | null)[]; ro: boolean }
  | { t: "params" }
  | { t: "undef" };

interface Binding {
  kind: "const" | "let" | "param" | "out";
  val: Val;
}

type Scope = Map<string, Binding>;

interface State {
  scopes: Scope[];
  ret: Val | undefined;
  done: NodeId;
}

const UNDEF: Val = { t: "undef" };
const MAX_ITERATIONS = 1024;

const MATH_UNARY: Readonly<Record<string, Op>> = {
  abs: "abs",
  sqrt: "sqrt",
  exp: "exp",
  log: "log",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  atan: "atan",
  asin: "asin",
  acos: "acos",
  sinh: "sinh",
  cosh: "cosh",
  tanh: "tanh",
  floor: "floor",
  ceil: "ceil",
  sign: "sign",
};

const MATH_CONSTANTS: Readonly<Record<string, number>> = {
  PI: Math.PI,
  E: Math.E,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  SQRT2: Math.SQRT2,
  SQRT1_2: Math.SQRT1_2,
};

const ARITHMETIC: Readonly<Record<string, Op>> = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "**": "pow",
};

const COMPARISON: Readonly<Record<string, Op>> = {
  "<": "lt",
  "<=": "le",
  ">": "gt",
  ">=": "ge",
  "==": "eq",
  "===": "eq",
  "!=": "ne",
  "!==": "ne",
};

function describe(val: Val): string {
  switch (val.t) {
    case "vec":
      return "an array";
    case "params":
      return "the params object";
    case "undef":
      return "undefined";
    default:
      return "a number";
  }
}

function sameVal(a: Val, b: Val): boolean {
  if (a.t !== b.t) {
    return false;
  }
  if (a.t === "vec" && b.t === "vec") {
    return a.c.every((id, k) => id === b.c[k]);
  }
  if ("n" in a && "n" in b) {
    return a.n === b.n;
  }
  return true;
}

class Interpreter {
  private readonly ir = new Ir();
  private scopes: Scope[] = [new Map()];
  private ret: Val | undefined;
  private done: NodeId = this.ir.constant(0);

  run(fn: FunctionAst): IrProgram {
    this.bindParameters(fn);
    for (const stmt of fn.body) {
      this.exec(stmt);
    }
    if (this.ret === undefined) {
      fail("function without a return", fn, "return [x, y, z]");
    }
    if (this.ir.constOf(this.done) !== 1) {
      fail("path without a return", fn, "every path must return [x, y, z]");
    }
    return this.ir.program((this.ret as Val & { t: "vec" }).c as NodeId[]);
  }

  private bindParameters(fn: FunctionAst): void {
    const ir = this.ir;
    const [first, second, third] = fn.params;
    if (first) {
      const p: Val = {
        t: "vec",
        c: [ir.pos(0), ir.pos(1), ir.pos(2)],
        ro: true,
      };
      if (first.k === "id") {
        this.declare(first.name, "param", p);
      } else if (first.k === "array") {
        this.bindPattern(first, p, "let");
      } else {
        fail(
          "object pattern for the position",
          first,
          "the position is an array [x, y, z]",
        );
      }
    }
    if (second) {
      if (second.k === "id") {
        this.declare(second.name, "param", { t: "params" });
      } else if (second.k === "object") {
        this.bindPattern(second, { t: "params" }, "let");
      } else {
        fail(
          "array pattern for the parameters",
          second,
          "params is an object: use params.name or { name }",
        );
      }
    }
    if (third) {
      if (third.k !== "id") {
        fail(
          "destructured out parameter",
          third,
          "out is an array to write into",
        );
      }
      this.declare(third.name, "out", {
        t: "vec",
        c: [null, null, null],
        ro: false,
      });
    }
    for (const extra of fn.params.slice(3)) {
      if (extra.k !== "id") {
        fail("destructured parameter", extra, "not supported");
      }
      this.declare(extra.name, "param", UNDEF);
    }
  }

  // Scopes and state.

  private declare(name: string, kind: Binding["kind"], val: Val): void {
    this.scopes.at(-1)!.set(name, { kind, val });
  }

  private lookup(name: string): Binding | undefined {
    for (let k = this.scopes.length - 1; k >= 0; k--) {
      const found = this.scopes[k]!.get(name);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private scoped(body: () => void): void {
    this.scopes.push(new Map());
    body();
    this.scopes.pop();
  }

  private snapshot(): State {
    return {
      scopes: this.scopes.map(
        (scope) =>
          new Map([...scope].map(([name, b]) => [name, { ...b }] as const)),
      ),
      ret: this.ret,
      done: this.done,
    };
  }

  private restore(state: State): void {
    this.scopes = state.scopes;
    this.ret = state.ret;
    this.done = state.done;
  }

  /** Run both sides from the same state, then merge the two end states under `c`. */
  private fork<T>(
    c: NodeId,
    at: Pos,
    onTrue: () => T,
    onFalse: () => T,
  ): [T, T] {
    const before = this.snapshot();
    const whenTrue = onTrue();
    const afterTrue = this.snapshot();
    this.restore(before);
    const whenFalse = onFalse();
    const base = this.snapshot();
    base.scopes.forEach((scope, level) => {
      for (const [name, binding] of afterTrue.scopes[level]!) {
        const other = scope.get(name);
        if (other && !sameVal(binding.val, other.val)) {
          other.val = this.merge(c, binding.val, other.val, at);
        }
      }
    });
    this.restore(base);
    const tRet = afterTrue.ret;
    this.ret =
      tRet === undefined || base.ret === undefined
        ? (tRet ?? base.ret)
        : this.merge(c, tRet, base.ret, at);
    this.done = this.ir.op("select", c, afterTrue.done, base.done);
    return [whenTrue, whenFalse];
  }

  private merge(c: NodeId, a: Val, b: Val, at: Pos): Val {
    const ir = this.ir;
    if (sameVal(a, b)) {
      return a;
    }
    if (a.t === "vec" && b.t === "vec") {
      return {
        t: "vec",
        c: a.c.map((x, k) => {
          const y = b.c[k]!;
          if (x === null || y === null) {
            return x === y
              ? null
              : fail(
                  "array assigned in one branch only",
                  at,
                  "assign every element on every path",
                );
          }
          return ir.op("select", c, x, y);
        }),
        ro: a.ro && b.ro,
      };
    }
    if (a.t === "bool" && b.t === "bool") {
      return { t: "bool", n: ir.op("select", c, a.n, b.n) };
    }
    if (
      (a.t === "num" || a.t === "bool") &&
      (b.t === "num" || b.t === "bool")
    ) {
      return { t: "num", n: ir.op("select", c, a.n, b.n) };
    }
    return fail(
      `branches giving ${describe(a)} and ${describe(b)}`,
      at,
      "both sides of a condition must give the same kind of value",
    );
  }

  // Statements.

  private exec(stmt: Stmt): void {
    switch (stmt.k) {
      case "empty":
        return;
      case "expr":
        this.eval(stmt.e);
        return;
      case "block":
        this.scoped(() => stmt.body.forEach((s) => this.exec(s)));
        return;
      case "var":
        for (const { target, init } of stmt.decls) {
          const val = init ? this.value(init) : UNDEF;
          this.bindPattern(target, val, stmt.kind);
        }
        return;
      case "return": {
        const val = stmt.e ? this.eval(stmt.e) : UNDEF;
        if (val.t !== "vec" || val.c.includes(null)) {
          fail(
            val.t === "vec"
              ? "return of an unassigned array"
              : `return of ${describe(val)}`,
            stmt,
            "return an array [x, y, z] (or fill out and return it)",
          );
        }
        this.ret =
          this.ret === undefined
            ? val
            : this.merge(this.done, this.ret, val, stmt);
        this.done = this.ir.constant(1);
        return;
      }
      case "if": {
        const c = this.condition(this.eval(stmt.test), stmt.test);
        const known = this.ir.constOf(c);
        if (known !== undefined) {
          const taken = known !== 0 ? stmt.then : stmt.else;
          if (taken) {
            this.exec(taken);
          }
          return;
        }
        this.fork(
          c,
          stmt,
          () => {
            this.exec(stmt.then);
          },
          () => {
            if (stmt.else) {
              this.exec(stmt.else);
            }
          },
        );
        return;
      }
      case "for": {
        this.scoped(() => {
          if (stmt.init) {
            this.exec(stmt.init);
          }
          for (let count = 0; ; count++) {
            if (!stmt.test) {
              fail(
                "for loop without a condition",
                stmt,
                "loops need constant bounds",
              );
            }
            const test = this.ir.constOf(
              this.condition(this.eval(stmt.test), stmt.test),
            );
            if (test === undefined) {
              fail(
                "loop with a non-constant bound",
                stmt.test,
                "loops are unrolled: bounds must be constants",
              );
            }
            if (test === 0) {
              break;
            }
            if (count >= MAX_ITERATIONS) {
              fail(
                `loop over ${MAX_ITERATIONS} iterations`,
                stmt,
                "loops are unrolled",
              );
            }
            this.exec(stmt.body);
            if (stmt.update) {
              this.eval(stmt.update);
            }
          }
        });
      }
    }
  }

  /** The value of an initializer or assigned expression: arrays are not aliased. */
  private value(e: Expr): Val {
    const val = this.eval(e);
    if (val.t === "vec" && !val.ro && e.k === "id") {
      fail(
        "aliasing an array",
        e,
        `copy it: [${e.name}[0], ${e.name}[1], ${e.name}[2]]`,
      );
    }
    return val;
  }

  private bindPattern(pattern: Pattern, val: Val, kind: "const" | "let"): void {
    switch (pattern.k) {
      case "id":
        this.declare(pattern.name, kind, val);
        return;
      case "array":
        if (val.t !== "vec") {
          fail(
            "array destructuring",
            pattern,
            `${describe(val)} is not an array`,
          );
        }
        if (pattern.items.length > 3) {
          fail(
            "array destructuring of more than 3 elements",
            pattern,
            "positions have 3 elements",
          );
        }
        pattern.items.forEach((name, k) => {
          const c = val.c[k];
          if (name !== null) {
            if (c === null || c === undefined) {
              fail(
                "read of an unassigned element",
                pattern,
                `element ${k} has no value yet`,
              );
            }
            this.declare(name, kind, { t: "num", n: c });
          }
        });
        return;
      case "object":
        if (val.t !== "params") {
          fail(
            "object destructuring",
            pattern,
            `only the params object can be destructured, not ${describe(val)}`,
          );
        }
        for (const { key, name } of pattern.props) {
          this.declare(name, kind, { t: "num", n: this.ir.param(key) });
        }
    }
  }

  // Values.

  private num(val: Val, at: Pos): NodeId {
    if (val.t === "num" || val.t === "bool") {
      return val.n;
    }
    return fail(`${describe(val)} used as a number`, at, "expected a number");
  }

  /** A 0/1 node for a value used as a condition. */
  private condition(val: Val, at: Pos): NodeId {
    switch (val.t) {
      case "bool":
        return val.n;
      case "num":
        return this.ir.op("ne", val.n, this.ir.constant(0));
      case "undef":
        return this.ir.constant(0);
      default:
        return fail(
          `${describe(val)} used as a condition`,
          at,
          "expected a number or a comparison",
        );
    }
  }

  private eval(e: Expr): Val {
    const ir = this.ir;
    switch (e.k) {
      case "num":
        return { t: "num", n: ir.constant(e.v) };
      case "bool":
        return { t: "bool", n: ir.constant(e.v ? 1 : 0) };
      case "str":
        return fail(
          "string literal",
          e,
          'strings are only allowed as params["name"]',
        );
      case "id": {
        const binding = this.lookup(e.name);
        if (binding) {
          return binding.val;
        }
        if (e.name === "undefined") {
          return UNDEF;
        }
        if (e.name === "Math") {
          return fail(
            "'Math' as a value",
            e,
            "use Math.<function>(…) or Math.<CONSTANT>",
          );
        }
        return fail(`free variable '${e.name}'`, e, PURE);
      }
      case "member":
        return this.member(e);
      case "call":
        return this.call(e);
      case "array": {
        if (e.items.length !== 3) {
          fail(
            `array literal of ${e.items.length} elements`,
            e,
            "only 3-vectors [x, y, z] are supported",
          );
        }
        const c = e.items.map((item) => this.num(this.eval(item), item));
        return { t: "vec", c, ro: false };
      }
      case "unary":
        return this.unary(e);
      case "binary": {
        const op = e.op;
        if (op === "%") {
          fail("operator '%'", e, "use a - b * Math.floor(a / b)");
        }
        const l = this.eval(e.l);
        const r = this.eval(e.r);
        const compare = COMPARISON[op];
        if (compare) {
          return {
            t: "bool",
            n: ir.op(compare, this.num(l, e.l), this.num(r, e.r)),
          };
        }
        return this.arithmetic(op, l, r, e);
      }
      case "logical": {
        const l = this.eval(e.l);
        if (l.t === "undef") {
          return e.op === "&&" ? l : this.eval(e.r);
        }
        if (l.t !== "bool") {
          fail(
            `'${e.op}' on ${describe(l)}`,
            e,
            "the result would be a value, not a boolean; compare explicitly (x !== 0)",
          );
        }
        const known = ir.constOf(l.n);
        if (known !== undefined && (known !== 0) === (e.op === "||")) {
          return l;
        }
        const r = this.eval(e.r);
        if (r.t !== "bool") {
          fail(
            `'${e.op}' on ${describe(r)}`,
            e,
            "the result would be a value, not a boolean; compare explicitly (x !== 0)",
          );
        }
        return { t: "bool", n: ir.op(e.op === "&&" ? "and" : "or", l.n, r.n) };
      }
      case "cond": {
        const c = this.condition(this.eval(e.test), e.test);
        const known = ir.constOf(c);
        if (known !== undefined) {
          return this.eval(known !== 0 ? e.a : e.b);
        }
        const [a, b] = this.fork(
          c,
          e,
          () => this.eval(e.a),
          () => this.eval(e.b),
        );
        return this.merge(c, a, b, e);
      }
      case "assign":
        return this.assign(e);
      case "update": {
        const old = this.eval(e.target);
        const after = this.assign({
          k: "assign",
          op: e.op === "++" ? "+=" : "-=",
          target: e.target,
          value: { k: "num", v: 1, line: e.line, col: e.col },
          line: e.line,
          col: e.col,
        });
        return e.prefix ? after : old;
      }
      case "seq": {
        let last: Val = UNDEF;
        for (const item of e.items) {
          last = this.eval(item);
        }
        return last;
      }
    }
  }

  private isMath(e: Expr): boolean {
    return e.k === "id" && e.name === "Math" && !this.lookup("Math");
  }

  /** The index or name a member access selects. */
  private key(e: Expr & { k: "member" }): string | number {
    if (typeof e.prop === "string") {
      return e.prop;
    }
    if (e.prop.k === "str") {
      return e.prop.v;
    }
    const index = this.ir.constOf(this.num(this.eval(e.prop), e.prop));
    if (index === undefined || !Number.isInteger(index)) {
      fail(
        "non-constant index",
        e.prop,
        "p[i] needs a constant index 0, 1 or 2",
      );
    }
    return index;
  }

  private member(e: Expr & { k: "member" }): Val {
    if (this.isMath(e.obj)) {
      const name = this.key(e);
      const value = MATH_CONSTANTS[name as string];
      if (value === undefined) {
        fail(
          `'Math.${name}'`,
          e,
          "only Math.PI, E, LN2, LN10, LOG2E, LOG10E, SQRT2 and SQRT1_2 are constants",
        );
      }
      return { t: "num", n: this.ir.constant(value) };
    }
    const obj = this.eval(e.obj);
    const key = this.key(e);
    if (obj.t === "params") {
      if (typeof key !== "string") {
        fail("indexed params", e, "read parameters by name: params.name");
      }
      return { t: "num", n: this.ir.param(key) };
    }
    if (obj.t === "vec") {
      const index = typeof key === "number" ? key : "xyz".indexOf(key);
      if (key === "length") {
        return { t: "num", n: this.ir.constant(3) };
      }
      if (typeof key === "string" && (key.length !== 1 || index < 0)) {
        fail(
          `property '${key}' of an array`,
          e,
          "use [0], [1], [2] or .x, .y, .z",
        );
      }
      const c = obj.c[index];
      if (c === undefined) {
        fail(`element ${index}`, e, "positions have elements 0 to 2");
      }
      if (c === null) {
        fail(
          "read of an unassigned element",
          e,
          `element ${index} has no value yet`,
        );
      }
      return { t: "num", n: c };
    }
    return fail(
      `property access on ${describe(obj)}`,
      e,
      "only p[i], params.name and Math.* are supported",
    );
  }

  private call(e: Expr & { k: "call" }): Val {
    const callee = e.callee;
    if (callee.k === "member" && this.isMath(callee.obj)) {
      const name = String(this.key(callee));
      const args = e.args.map((arg) => this.num(this.eval(arg), arg));
      return { t: "num", n: this.mathCall(name, args, e) };
    }
    if (callee.k === "id") {
      return fail(
        `call to '${callee.name}'`,
        e,
        `only Math.* can be called, not user functions: inline the math (${PURE}). A minifier alias of Math.pow looks like this too: it lowers ** below ES2016, so target ES2016 or newer`,
      );
    }
    if (callee.k === "member" && typeof callee.prop === "string") {
      return fail(
        `call to method '.${callee.prop}()'`,
        e,
        "only Math.* can be called",
      );
    }
    return fail("call expression", e, "only Math.* can be called");
  }

  private mathCall(name: string, args: NodeId[], at: Pos): NodeId {
    const ir = this.ir;
    const need = (count: number) => {
      if (args.length !== count) {
        fail(
          `Math.${name} with ${args.length} arguments`,
          at,
          `expected ${count}`,
        );
      }
    };
    const unary = MATH_UNARY[name];
    if (unary) {
      need(1);
      return ir.op(unary, args[0]!);
    }
    switch (name) {
      case "min":
      case "max":
        if (args.length === 0) {
          need(2);
        }
        return args.reduce((acc, arg) => ir.op(name, acc, arg));
      case "pow":
        need(2);
        return ir.op("pow", args[0]!, args[1]!);
      case "atan2":
        need(2);
        return ir.op("atan2", args[0]!, args[1]!);
      case "hypot": {
        if (args.length === 0) {
          need(1);
        }
        const squares = args.map((a) => ir.op("mul", a, a));
        return ir.op(
          "sqrt",
          squares.reduce((acc, s) => ir.op("add", acc, s)),
        );
      }
      case "log2":
      case "log10":
        need(1);
        return ir.op(
          "div",
          ir.op("log", args[0]!),
          ir.constant(name === "log2" ? Math.LN2 : Math.LN10),
        );
      case "trunc":
        need(1);
        return ir.op(
          "select",
          ir.op("lt", args[0]!, ir.constant(0)),
          ir.op("ceil", args[0]!),
          ir.op("floor", args[0]!),
        );
      default:
        return fail(
          `'Math.${name}'`,
          at,
          "not in the subset (round, cbrt, random and others are refused)",
        );
    }
  }

  private unary(e: Expr & { k: "unary" }): Val {
    const ir = this.ir;
    const arg = this.eval(e.arg);
    switch (e.op) {
      case "-":
        return { t: "num", n: ir.op("neg", this.num(arg, e.arg)) };
      case "+":
        return { t: "num", n: this.num(arg, e.arg) };
      case "!":
        return { t: "bool", n: ir.op("not", this.condition(arg, e.arg)) };
      default:
        return UNDEF;
    }
  }

  private arithmetic(op: string, l: Val, r: Val, at: Pos): Val {
    const code = ARITHMETIC[op];
    if (!code) {
      fail(`operator '${op}'`, at, "not supported");
    }
    return { t: "num", n: this.ir.op(code, this.num(l, at), this.num(r, at)) };
  }

  private assign(e: Expr & { k: "assign" }): Val {
    const target = e.target;
    const compute = (old: Val): Val =>
      e.op === "="
        ? this.value(e.value)
        : this.arithmetic(e.op.slice(0, -1), old, this.eval(e.value), e);
    if (target.k === "id") {
      const binding = this.lookup(target.name);
      if (!binding) {
        fail(`assignment to free variable '${target.name}'`, target, PURE);
      }
      this.checkWritable(target.name, binding, target, "");
      binding.val = compute(binding.val);
      return binding.val;
    }
    if (target.k !== "member") {
      return fail(
        "assignment target",
        e,
        "only variables and elements can be assigned",
      );
    }
    if (this.isMath(target.obj)) {
      fail("assignment to Math", target, "Math is read-only");
    }
    if (target.obj.k !== "id") {
      fail(
        "assignment to an element of an expression",
        target,
        "assign to out[i] or a local array's element",
      );
    }
    const name = target.obj.name;
    const binding = this.lookup(name);
    if (!binding) {
      fail(`assignment to free variable '${name}'`, target, PURE);
    }
    this.checkWritable(name, binding, target, "[…] or .x");
    const key = this.key(target);
    const index = typeof key === "number" ? key : "xyz".indexOf(key);
    const vec = binding.val;
    if (vec.t !== "vec" || !Number.isInteger(index) || index < 0 || index > 2) {
      fail(
        "assignment to a property",
        target,
        "only elements 0 to 2 of an array can be assigned",
      );
    }
    const old = vec.c[index] ?? null;
    if (old === null && e.op !== "=") {
      fail(
        "read of an unassigned element",
        target,
        `element ${index} has no value yet`,
      );
    }
    const next = this.num(
      compute(old === null ? UNDEF : { t: "num", n: old }),
      e,
    );
    const c = vec.c.slice();
    c[index] = next;
    binding.val = { t: "vec", c, ro: false };
    return { t: "num", n: next };
  }

  private checkWritable(
    name: string,
    binding: Binding,
    at: Pos,
    element: string,
  ): void {
    if (binding.kind === "param") {
      fail(
        `assignment to parameter '${name}'`,
        at,
        `${PURE}; copy it into a local first`,
      );
    }
    if (binding.kind === "out" && !element) {
      fail(
        `assignment to parameter '${name}'`,
        at,
        `write its elements: ${name}[0] = …`,
      );
    }
    if (binding.kind === "const" && !element) {
      fail(`assignment to const '${name}'`, at, "declare it with let");
    }
  }
}

/** Something to parse: source text, or a function (its `toString()`; never called). */
export type TransformSource = string | ((...args: never[]) => unknown);

/**
 * The IR program (3 outputs) of a restricted-JS transform function. The
 * function is read from its source and never evaluated. Errors are
 * `TransformParseError`s naming the refused construct and its `line:column`.
 */
export function parseTransform(source: TransformSource): IrProgram {
  const text =
    typeof source === "string"
      ? source
      : Function.prototype.toString.call(source);
  const ast = new Parser(tokenize(text)).parseFunction();
  return new Interpreter().run(ast);
}
