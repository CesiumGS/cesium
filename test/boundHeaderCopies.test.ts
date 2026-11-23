// A source's headers are bound to its origin by identity (`bindToSource`,
// CS-966): the provider knows a bound view by the object itself. A copy
// (a spread, `Object.assign`, `new Headers(view)`, `Object.fromEntries`,
// `structuredClone`) is a plain record, which the provider takes as
// unbound, so it would go to whatever origin its request names. This scans
// packages/core/src for a copy of a headers record, and the detector is
// first shown to flag a planted one, naming its line.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(root, "packages", "core", "src");

/**
 * The provider's own copies, each with why. They copy an origin rule's
 * headers or the request it is building, never a source's.
 */
const ALLOWED: Record<string, readonly string[]> = {
  "packages/core/src/io/fetchProvider.ts": [
    // An origin rule's headers, the start of the request the hook sees.
    "...rule?.headers",
    // The request the hook returned, before the source's are added.
    "...outgoing.headers",
    // A proxy's origin rule, and the proxy's own headers.
    "...proxyRule.headers",
    "...proxyRule?.headers",
    "...proxy.headers?.(",
  ],
};

/** An expression naming a headers record: `headers`, `x.headers`, `x?.headers`. */
const HEADERS = String.raw`(?:[\w$]+(?:\??\.[\w$]+)*\??\.)?headers\b`;

const COPIES: readonly RegExp[] = [
  // Not `...(x.headers ? { headers: x.headers } : {})`: that passes the
  // view itself.
  new RegExp(String.raw`\.\.\.\s*\(?\s*${HEADERS}(?!\s*\?(?![?.]))`, "g"),
  new RegExp(String.raw`Object\.assign\s*\([^;]*?${HEADERS}`, "g"),
  new RegExp(String.raw`new\s+Headers\s*\(\s*${HEADERS}`, "g"),
  new RegExp(
    String.raw`Object\.fromEntries\s*\(\s*Object\.entries\s*\(\s*${HEADERS}`,
    "g",
  ),
  new RegExp(String.raw`structuredClone\s*\(\s*${HEADERS}`, "g"),
];

/** Lines of `source` that copy a headers record, but for `allowed`. */
function headerCopies(
  source: string,
  allowed: readonly string[] = [],
): number[] {
  const lines = new Set<number>();
  source.split("\n").forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, "");
    if (/^\s*\*/.test(code)) {
      return; // A doc comment's line.
    }
    for (const pattern of COPIES) {
      for (const match of code.matchAll(pattern)) {
        const text = code.slice(match.index);
        if (!allowed.some((entry) => text.startsWith(entry))) {
          lines.add(index + 1);
        }
      }
    }
  });
  return [...lines];
}

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "generated" ? [] : files(path);
    }
    return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

describe("bound headers are never copied (CS-966)", () => {
  it("the detector flags a planted copy of a bound view, naming its line", () => {
    const planted = [
      "const a = this.state.headers;",
      "const b = { ...this.state.headers };",
      "const c = Object.assign({}, options.headers, { X: '1' });",
      "const d = new Headers(init.headers);",
      "const e = Object.fromEntries(Object.entries(headers));",
      "const f = { ...(tileset.state.headers ?? {}) };",
      "const g = structuredClone(options?.headers);",
      "const j = { ...(state.headers ? { headers: state.headers } : {}) };",
      "fetch(url, { headers });",
      "// { ...state.headers } in a comment",
      " * `{ ...headers }` in a doc comment",
    ].join("\n");
    expect(headerCopies(planted)).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("an allowed copy passes only as written", () => {
    const source = [
      "const h = { ...rule?.headers };",
      "const i = { ...source.headers };",
    ].join("\n");
    expect(headerCopies(source, ["...rule?.headers"])).toEqual([2]);
  });

  it("packages/core/src copies no headers record but the provider's own", () => {
    const found: string[] = [];
    for (const path of files(SRC)) {
      const name = relative(root, path).split("\\").join("/");
      const lines = headerCopies(
        readFileSync(path, "utf8"),
        ALLOWED[name] ?? [],
      );
      found.push(...lines.map((line) => `${name}:${line}`));
    }
    expect(found).toEqual([]);
  });
});
