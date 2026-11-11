/**
 * The API reference's data shapes and the plain logic around them: no React
 * and no JSON import, so test/apiReference.test.ts can use it. The data is
 * handbook/generated/reference.json, written by scripts/apiReference.mjs
 * (its header says what each field is).
 */
export interface RefParam {
  n: string;
  t: string;
  o?: 1;
  rest?: 1;
  def?: string;
  d?: string;
}
export interface RefSignature {
  tp?: string[];
  p: RefParam[];
  r?: string;
  rd?: string;
  d?: string;
  dep?: string;
}
export interface RefMember {
  n: string;
  k: "prop" | "method" | "accessor";
  t?: string;
  sigs?: RefSignature[];
  o?: 1;
  ro?: 1;
  st?: 1;
  d?: string;
  dep?: string;
  from?: string;
  fromId?: string;
}
export interface RefHeritage {
  t: string;
  id?: string;
}
export interface RefSymbol {
  id: string;
  name: string;
  entry: string;
  kind: string;
  tier: string;
  src: string;
  group: string;
  parent?: string;
  d?: string;
  dep?: string;
  ex?: string[];
  tags?: [string, string][];
  tp?: string[];
  ext?: RefHeritage[];
  impl?: RefHeritage[];
  extBy?: string[];
  implBy?: string[];
  priv?: 1;
  abs?: 1;
  ctors?: RefSignature[];
  members?: RefMember[];
  sigs?: RefSignature[];
  type?: string;
  value?: string;
  enum?: { n: string; v?: string; d?: string }[];
  ns?: string[];
}
export interface RefGroup {
  id: string;
  entry: string;
  title: string;
  blurb: string;
  count: number;
}
export interface RefEntry {
  id: string;
  title: string;
  import: string;
  blurb: string;
  count: number;
}
export interface Reference {
  entries: RefEntry[];
  groups: RefGroup[];
  unmapped: string[];
  symbols: RefSymbol[];
}

// ------------------------------------------------------------------ kinds

/** The kinds a reader filters by, in the order the chips show them. */
export const KINDS = [
  { id: "class", label: "Classes" },
  { id: "interface", label: "Interfaces" },
  { id: "type", label: "Types" },
  { id: "function", label: "Functions" },
  { id: "const", label: "Constants" },
  { id: "enum", label: "Enums" },
  { id: "namespace", label: "Namespaces" },
] as const;

/** The kind a symbol is listed and filtered under: the first of a merged kind. */
export const primaryKind = (symbol: RefSymbol): string =>
  symbol.kind.split("+")[0]!;

// ----------------------------------------------------------------- linking

/** Finds the exported symbol a bare name means, from within one entry point. */
export class Linker {
  private byName = new Map<string, RefSymbol[]>();
  private byId = new Map<string, RefSymbol>();

  constructor(
    symbols: readonly RefSymbol[],
    private entries: readonly string[],
  ) {
    for (const symbol of symbols) {
      this.byId.set(symbol.id, symbol);
      const list = this.byName.get(symbol.name) ?? [];
      list.push(symbol);
      this.byName.set(symbol.name, list);
    }
  }

  get(id: string): RefSymbol | undefined {
    return this.byId.get(id);
  }

  /** The id of `name` as seen from `entry`: its own entry first, then the core's. */
  resolve(name: string, entry: string): string | undefined {
    const list = this.byName.get(name);
    if (!list) {
      return undefined;
    }
    const order = (symbol: RefSymbol) =>
      symbol.entry === entry ? -1 : this.entries.indexOf(symbol.entry);
    return [...list].sort((a, b) => order(a) - order(b))[0]!.id;
  }
}

export interface TypeToken {
  text: string;
  id?: string;
}

const TYPE_TOKEN =
  /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g;

/**
 * Splits TypeScript text into plain runs and names that link to a symbol.
 * A name followed straight by a colon is a property or parameter name, not a type.
 */
export function tokenizeTypes(
  text: string,
  resolve: (name: string) => string | undefined,
): TypeToken[] {
  const out: TypeToken[] = [];
  let last = 0;
  const plain = (end: number) => {
    if (end > last) {
      out.push({ text: text.slice(last, end) });
    }
  };
  for (const match of text.matchAll(TYPE_TOKEN)) {
    const word = match[0];
    const start = match.index;
    if (!/^[A-Za-z_$]/.test(word)) {
      continue;
    }
    const isKey = /^\??:/.test(text.slice(start + word.length));
    const id = isKey ? undefined : resolve(word);
    if (id === undefined) {
      continue;
    }
    plain(start);
    out.push({ text: word, id });
    last = start + word.length;
  }
  plain(text.length);
  return out;
}

// -------------------------------------------------------------- signatures

const WIDTH = 88;

/** A parameter as written in a signature: `name?: Type`, `...name: Type`. */
export const paramText = (p: RefParam): string =>
  `${p.rest ? "..." : ""}${p.n}${p.o ? "?" : ""}: ${p.t}`;

/**
 * `prefix<T>(a: A, b?: B): R`, broken one parameter to a line when it is
 * longer than a line. `tail` follows the parameters, for example `: R`.
 */
export function signatureText(
  prefix: string,
  signature: RefSignature,
  { returns = true }: { returns?: boolean } = {},
): string {
  const generics = signature.tp?.length ? `<${signature.tp.join(", ")}>` : "";
  const tail = returns && signature.r !== undefined ? `: ${signature.r}` : "";
  const params = signature.p.map(paramText);
  const flat = `${prefix}${generics}(${params.join(", ")})${tail}`;
  if (flat.length <= WIDTH || params.length === 0) {
    return flat;
  }
  return `${prefix}${generics}(\n${params.map((p) => `  ${p},`).join("\n")}\n)${tail}`;
}

/** The import a reader would write for a symbol (a namespace's member imports the namespace). */
export function importLine(symbol: RefSymbol): string {
  const from =
    symbol.entry === "." ? "@cesium/next" : `@cesium/next/${symbol.entry}`;
  const typeOnly =
    !symbol.parent &&
    !symbol.kind
      .split("+")
      .some((k) =>
        ["class", "function", "const", "enum", "namespace"].includes(k),
      );
  const name = symbol.parent ? symbol.parent.split(".")[0] : symbol.name;
  return `import ${typeOnly ? "type " : ""}{ ${name} } from "${from}";`;
}

/** A declaration as it'd read in a `.d.ts`: the code block at the top of a symbol's page. */
export function declarationText(symbol: RefSymbol): string {
  const generics = symbol.tp?.length ? `<${symbol.tp.join(", ")}>` : "";
  const kinds = symbol.kind.split("+");
  const lines: string[] = [];
  const heritage = (keyword: string, list?: { t: string }[]) =>
    list?.length ? ` ${keyword} ${list.map((h) => h.t).join(", ")}` : "";
  if (kinds.includes("class")) {
    lines.push(
      `${symbol.abs ? "abstract " : ""}class ${symbol.name}${generics}${heritage("extends", symbol.ext)}${heritage("implements", symbol.impl)}`,
    );
  } else if (kinds.includes("interface")) {
    lines.push(
      `interface ${symbol.name}${generics}${heritage("extends", symbol.ext)}`,
    );
  }
  if (kinds.includes("type") && symbol.type !== undefined) {
    const body = symbol.type.startsWith("|")
      ? `\n  ${symbol.type.split("\n").join("\n  ")}`
      : ` ${symbol.type}`;
    lines.push(`type ${symbol.name}${generics} =${body}`);
  } else if (kinds.includes("type") && symbol.members) {
    lines.push(`type ${symbol.name}${generics} = { … }`);
  }
  if (kinds.includes("function") || (kinds.includes("const") && symbol.sigs)) {
    const keyword = kinds.includes("function") ? "function" : "const";
    for (const signature of symbol.sigs ?? []) {
      lines.push(
        keyword === "const"
          ? signatureText(`const ${symbol.name}: `, signature)
          : signatureText(`function ${symbol.name}`, signature),
      );
    }
  } else if (kinds.includes("const")) {
    const type = symbol.type ?? "unknown";
    lines.push(
      symbol.value !== undefined && symbol.value === type
        ? `const ${symbol.name} = ${symbol.value}`
        : `const ${symbol.name}: ${type}${symbol.value !== undefined ? ` = ${symbol.value}` : ""}`,
    );
  }
  if (kinds.includes("enum")) {
    lines.push(`enum ${symbol.name}`);
  }
  if (kinds.includes("namespace")) {
    lines.push(`namespace ${symbol.name}`);
  }
  return lines.join("\n");
}

/** A member in the one line a reader scans: `name?: Type`, or `name(a: A): R`. */
export function memberLines(member: RefMember): string[] {
  if (member.sigs?.length) {
    return member.sigs.map((s) => signatureText(member.n, s));
  }
  return [`${member.n}${member.o ? "?" : ""}: ${member.t ?? "unknown"}`];
}

// --------------------------------------------------------------------- docs

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; text: string };

/** Doc comment text as paragraphs, bullet lists and fenced code. */
export function parseDoc(text: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] | undefined;
  let fence: string[] | undefined;
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", text: paragraph.join(" ") });
    }
    if (list) {
      blocks.push({ kind: "ul", items: list });
    }
    paragraph = [];
    list = undefined;
  };
  for (const line of text.split("\n")) {
    if (fence) {
      if (line.trim().startsWith("```")) {
        blocks.push({ kind: "code", text: fence.join("\n") });
        fence = undefined;
      } else {
        fence.push(line);
      }
    } else if (line.trim().startsWith("```")) {
      flush();
      fence = [];
    } else if (line.trim() === "") {
      flush();
    } else if (/^\s*[-*] /.test(line)) {
      if (!list) {
        flush();
        list = [];
      }
      list.push(line.replace(/^\s*[-*] /, "").trim());
    } else if (list && /^\s+\S/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list) {
        flush();
      }
      paragraph.push(line.trim());
    }
  }
  if (fence) {
    blocks.push({ kind: "code", text: fence.join("\n") });
  }
  flush();
  return blocks;
}

export interface InlineToken {
  kind: "text" | "code" | "link";
  text: string;
  /** For a link: the `{@link}` target. */
  target?: string;
}

const INLINE = /`([^`]+)`|\{@link(?:code|plain)?\s+([^\s}]+)(?:\s+([^}]*))?\}/g;

/** Backticks and `{@link Name label}` in a line of doc text. */
export function parseInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) {
      out.push({ kind: "text", text: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      out.push({ kind: "code", text: match[1] });
    } else {
      out.push({
        kind: "link",
        text: match[3]?.trim() || match[2]!,
        target: match[2]!,
      });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    out.push({ kind: "text", text: text.slice(last) });
  }
  return out;
}

/** The first sentence of a doc comment, as plain text, for a list. */
export function summaryOf(doc: string | undefined, max = 170): string {
  if (!doc) {
    return "";
  }
  const first = doc
    .split(/\n\s*\n/)[0]!
    .replace(/\s+/g, " ")
    .trim();
  const plain = first
    .replace(
      /\{@link(?:code|plain)?\s+([^\s}]+)(?:\s+([^}]*))?\}/g,
      (_, a, b) => b?.trim() || a,
    )
    .replace(/`/g, "");
  const sentence = /^.*?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain;
  return sentence.length > max
    ? `${sentence.slice(0, max - 1).trimEnd()}…`
    : sentence;
}

// ------------------------------------------------------------------ search

export interface Match {
  symbol: RefSymbol;
  /** A member that matched, when the name didn't. */
  via?: string;
}

/**
 * The symbols a query and kind filter leave, best match first: names that
 * start with the query, then names that contain it, then symbols with a
 * member of that name. Without a query they stay in the reference's order.
 */
export function searchSymbols(
  symbols: readonly RefSymbol[],
  {
    query,
    kinds,
    group,
  }: { query: string; kinds: ReadonlySet<string>; group?: string },
): Match[] {
  const needle = query.trim().toLowerCase();
  const out: { match: Match; score: number }[] = [];
  for (const symbol of symbols) {
    if (group && symbol.group !== group) {
      continue;
    }
    if (kinds.size > 0 && !kinds.has(primaryKind(symbol))) {
      continue;
    }
    if (!needle) {
      out.push({ match: { symbol }, score: 0 });
      continue;
    }
    const name = symbol.name.toLowerCase();
    if (name === needle) {
      out.push({ match: { symbol }, score: 0 });
    } else if (name.startsWith(needle)) {
      out.push({ match: { symbol }, score: 1 });
    } else if (name.includes(needle)) {
      out.push({ match: { symbol }, score: 2 });
    } else {
      const names = [
        ...(symbol.members ?? []).filter((m) => !m.from).map((m) => m.n),
        ...(symbol.enum ?? []).map((m) => m.n),
      ];
      const via = names.find((n) => n.toLowerCase().includes(needle));
      if (via) {
        out.push({ match: { symbol, via }, score: 3 });
      }
    }
  }
  if (needle) {
    out.sort((a, b) => a.score - b.score);
  }
  return out.map((o) => o.match);
}

// ------------------------------------------------------------------- route

export type Route =
  | { view: "all" }
  | { view: "group"; id: string }
  | { view: "symbol"; id: string };

const GROUP_PREFIX = "group/";

/** `#/reference`, `#/reference/group/<id>` or `#/reference/<symbol id>`. */
export function parseRoute(hash: string): Route {
  const match = /^#\/reference(?:\/(.*))?$/.exec(hash);
  const rest = match?.[1];
  if (!rest) {
    return { view: "all" };
  }
  let decoded = rest;
  try {
    decoded = decodeURIComponent(rest);
  } catch {
    // Leave it as typed.
  }
  return decoded.startsWith(GROUP_PREFIX)
    ? { view: "group", id: decoded.slice(GROUP_PREFIX.length) }
    : { view: "symbol", id: decoded };
}

export function routeHash(route: Route): string {
  switch (route.view) {
    case "all":
      return "#/reference";
    case "group":
      return `#/reference/${GROUP_PREFIX}${route.id}`;
    case "symbol":
      return `#/reference/${route.id}`;
  }
}
