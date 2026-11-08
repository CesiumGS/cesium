import {
  javascript,
  json,
  typescript,
} from "@codemirror/legacy-modes/mode/javascript";
import { shell } from "@codemirror/legacy-modes/mode/shell";

/**
 * Tokens for the handbook's code blocks, from the stream parsers the Slang
 * playground's editor is built on. Only these parsers reach the page: they
 * have no imports, and this small stream stands in for CodeMirror's, so no
 * editor comes with them. Tokens only split the text: joined, they are the
 * code exactly (test/handbookData.test.ts).
 */
export type CodeLanguage = "ts" | "js" | "json" | "shell" | "text";

export const LANGUAGE_NAMES: Record<CodeLanguage, string> = {
  ts: "TypeScript",
  js: "JavaScript",
  json: "JSON",
  shell: "Shell",
  text: "",
};

export interface CodeToken {
  text: string;
  /** Its class; undefined for plain text. */
  kind?: string;
}

interface Mode {
  startState?: (indentUnit: number) => unknown;
  token: (stream: LineStream, state: never) => string | null;
}

const MODES: Partial<Record<CodeLanguage, Mode>> = {
  ts: typescript as unknown as Mode,
  js: javascript as unknown as Mode,
  json: json as unknown as Mode,
  shell: shell as unknown as Mode,
};

/** What a parser's tag is, for colour. Anything else is plain text. */
const KINDS: Record<string, string> = {
  keyword: "keyword",
  comment: "comment",
  meta: "comment",
  string: "string",
  "string.special": "string",
  regexp: "string",
  quote: "string",
  number: "number",
  atom: "number",
  def: "type",
  type: "type",
  builtin: "type",
  property: "property",
  attribute: "property",
};

/** One line, with the part of CodeMirror's stream these parsers use. */
class LineStream {
  pos = 0;
  start = 0;
  constructor(readonly string: string) {}
  eol() {
    return this.pos >= this.string.length;
  }
  sol() {
    return this.pos === 0;
  }
  peek() {
    return this.string.charAt(this.pos) || undefined;
  }
  next() {
    return this.pos < this.string.length
      ? this.string.charAt(this.pos++)
      : undefined;
  }
  eat(match: string | RegExp | ((c: string) => boolean)) {
    const c = this.string.charAt(this.pos);
    const ok =
      typeof match === "string"
        ? c === match
        : c !== "" && (match instanceof RegExp ? match.test(c) : match(c));
    if (ok) {
      this.pos++;
      return c;
    }
    return undefined;
  }
  eatWhile(match: string | RegExp | ((c: string) => boolean)) {
    const start = this.pos;
    while (this.eat(match)) {
      // Each eat moves on.
    }
    return this.pos > start;
  }
  eatSpace() {
    const start = this.pos;
    while (/\s/.test(this.string.charAt(this.pos))) {
      this.pos++;
    }
    return this.pos > start;
  }
  skipToEnd() {
    this.pos = this.string.length;
  }
  backUp(n: number) {
    this.pos -= n;
  }
  column() {
    return this.start;
  }
  indentation() {
    return /^\s*/.exec(this.string)![0].length;
  }
  match(
    pattern: string | RegExp,
    consume = true,
    caseInsensitive = false,
  ): boolean | RegExpMatchArray | null {
    if (typeof pattern === "string") {
      const fold = (s: string) => (caseInsensitive ? s.toLowerCase() : s);
      const part = this.string.substring(this.pos, this.pos + pattern.length);
      if (fold(part) === fold(pattern)) {
        if (consume) {
          this.pos += pattern.length;
        }
        return true;
      }
      return null;
    }
    const m = this.string.slice(this.pos).match(pattern);
    if (m && m.index! > 0) {
      return null;
    }
    if (m && consume) {
      this.pos += m[0].length;
    }
    return m;
  }
  current() {
    return this.string.slice(this.start, this.pos);
  }
}

/** Splits `code` into tokens, without changing a character. */
export function highlight(code: string, language: CodeLanguage): CodeToken[] {
  const mode = MODES[language];
  if (!mode) {
    return [{ text: code }];
  }
  const out: CodeToken[] = [];
  const push = (text: string, kind?: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) {
      last.text += text;
    } else if (text !== "") {
      out.push({ text, ...(kind ? { kind } : {}) });
    }
  };
  const state = (mode.startState?.(2) ?? {}) as never;
  code.split("\n").forEach((line, i) => {
    if (i > 0) {
      push("\n");
    }
    const stream = new LineStream(line);
    while (!stream.eol()) {
      const before = stream.pos;
      stream.start = before;
      const tag = mode.token(stream, state);
      if (stream.pos === before) {
        // A parser must move on; if one doesn't, this one character is text.
        stream.pos++;
      }
      push(line.slice(before, stream.pos), tag ? KINDS[tag] : undefined);
    }
  });
  return out;
}
