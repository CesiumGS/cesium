// The request seam (CS-809): every request the engine makes goes through
// `FetchProvider` (src/io/fetchProvider.ts), so a host's origin rules,
// proxy, credentials mode, hooks and the 401 renewal apply to all of them.
// Like test/seams.test.ts, this scans the sources, and the detector is first
// shown to flag a bypass, naming its line.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
/** Every package's src/ but the widgets' (2.0's src/ before CS-835). */
const srcs = readdirSync(join(root, "packages"))
  .filter((name) => name !== "ui")
  .map((name) => join(root, "packages", name, "src"))
  .filter((dir) => existsSync(dir));

/** The provider itself: its default transport is the global `fetch`. */
const PROVIDER = "packages/core/src/io/fetchProvider.ts";

/**
 * Files that still fetch directly, each with why. Each is another item's
 * to move onto the provider; a new file can't join without a reason here.
 */
const PENDING: Record<string, string> = {
  // CS-808 (outside data through a data-resource provider) owns these: the
  // frames data store, PROJ grids and sky packs move onto it, on top of
  // this provider.
  "packages/frames/src/ephemeris/frameRoles.ts": "CS-808",
  "packages/crs/src/engineering/proj.ts": "CS-808",
  "packages/core/src/atmosphere/skyPack.ts":
    "CS-808 (its default fetcher; the engine passes the provider's)",
};

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" || name === "generated" ? [] : files(path);
    }
    return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

const GLOBALS = new Set(["globalThis", "self", "window"]);

/**
 * Lines of `source` that reach the global `fetch`: a call, a reference
 * passed as a value (`{ fetch }`, `= fetch`, an argument), or
 * `globalThis.fetch` / `self.fetch` / `window.fetch`. Property names
 * (`source.fetch(...)`, `{ fetch: ... }`, a method named `fetch`), types
 * (`typeof fetch`) and a local named `fetch` (a variable, a parameter or a
 * destructured binding in an enclosing scope, which shadows the global) are
 * not requests.
 */
function directFetches(source: string, name = "source.ts"): number[] {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  const lines: number[] = [];
  const flag = (node: ts.Node) =>
    lines.push(file.getLineAndCharacterOfPosition(node.getStart()).line + 1);
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) {
      return;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "fetch" &&
      ts.isIdentifier(node.expression) &&
      GLOBALS.has(node.expression.text)
    ) {
      flag(node);
      return;
    }
    if (
      ts.isIdentifier(node) &&
      node.text === "fetch" &&
      isValue(node) &&
      !shadowed(node)
    ) {
      flag(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return lines;
}

/** Whether `name` declares `fetch`: an identifier, or a destructuring pattern holding one. */
function bindsFetch(name: ts.BindingName): boolean {
  if (ts.isIdentifier(name)) {
    return name.text === "fetch";
  }
  return name.elements.some(
    (element) => !ts.isOmittedExpression(element) && bindsFetch(element.name),
  );
}

/** Whether a scope node declares `fetch` itself (not in a nested scope). */
function declaresFetch(scope: ts.Node): boolean {
  if (ts.isFunctionLike(scope)) {
    return scope.parameters.some((p) => bindsFetch(p.name));
  }
  if (ts.isCatchClause(scope)) {
    return (
      scope.variableDeclaration !== undefined &&
      bindsFetch(scope.variableDeclaration.name)
    );
  }
  if (
    ts.isForStatement(scope) ||
    ts.isForOfStatement(scope) ||
    ts.isForInStatement(scope)
  ) {
    const init = scope.initializer;
    return (
      init !== undefined &&
      ts.isVariableDeclarationList(init) &&
      init.declarations.some((d) => bindsFetch(d.name))
    );
  }
  if (ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isModuleBlock(scope)) {
    return scope.statements.some(
      (statement) =>
        (ts.isVariableStatement(statement) &&
          statement.declarationList.declarations.some((d) =>
            bindsFetch(d.name),
          )) ||
        (ts.isFunctionDeclaration(statement) &&
          statement.name?.text === "fetch") ||
        (ts.isImportDeclaration(statement) &&
          statement.importClause?.namedBindings !== undefined &&
          ts.isNamedImports(statement.importClause.namedBindings) &&
          statement.importClause.namedBindings.elements.some(
            (e) => e.name.text === "fetch",
          )),
    );
  }
  return false;
}

/** Whether `fetch` here names a local that an enclosing scope declares, not the global. */
function shadowed(node: ts.Identifier): boolean {
  for (let scope = node.parent; scope; scope = scope.parent) {
    if (declaresFetch(scope)) {
      return true;
    }
  }
  return false;
}

/** Whether identifier `fetch` here is a read of a value, not a name. */
function isValue(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isShorthandPropertyAssignment(parent)) {
    return true;
  }
  if (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isMethodDeclaration(parent) && parent.name === node) ||
    (ts.isPropertyDeclaration(parent) && parent.name === node) ||
    (ts.isPropertySignature(parent) && parent.name === node) ||
    (ts.isMethodSignature(parent) && parent.name === node) ||
    (ts.isGetAccessor(parent) && parent.name === node) ||
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    (ts.isParameter(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) &&
      (parent.name === node || parent.propertyName === node)) ||
    (ts.isFunctionDeclaration(parent) && parent.name === node) ||
    ts.isImportSpecifier(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isTypeQueryNode(parent)
  ) {
    return false;
  }
  return true;
}

describe("the request seam", () => {
  it("the detector flags each kind of bypass, naming its line", () => {
    const planted = [
      "const a = await source.fetch(url);", // 1: a property: fine
      "const b = await fetch(url);", // 2
      "const c = await globalThis.fetch(url);", // 3
      "load(url, { fetch });", // 4
      "function f(get: typeof fetch = fetch) {}", // 5 (the default)
      "const d = { fetch: (u: string) => u };", // 6: a name: fine
      "class E { fetch() {} }", // 7: a name: fine
      "run(self.fetch);", // 8
      "function g({ fetch }: Host) { return fetch(url); }", // 9: its own: fine
      "const { pool, fetch: f } = options;", // 10: a property: fine
      "function h() { const fetch = make(); return { fetch }; }", // 11: fine
      "function k() { return fetch(url); }", // 12: the global
    ].join("\n");
    expect(directFetches(planted)).toEqual([2, 3, 4, 5, 8, 12]);
  });

  it("no source fetches directly outside the provider", () => {
    const found: string[] = [];
    for (const path of srcs.flatMap(files)) {
      const file = relative(root, path).split("\\").join("/");
      if (file === PROVIDER || file in PENDING) {
        continue;
      }
      for (const line of directFetches(readFileSync(path, "utf8"), file)) {
        found.push(`${file}:${line}`);
      }
    }
    // Each entry is a request that skips the host's rules and credentials:
    // use `engineFetch` (or `workerFetch` in a worker) instead.
    expect(found).toEqual([]);
  });

  it("each pending file still fetches directly (or leaves the list)", () => {
    for (const file of Object.keys(PENDING)) {
      expect(
        directFetches(readFileSync(join(root, file), "utf8"), file).length,
        `${file} no longer fetches directly: remove it from PENDING`,
      ).toBeGreaterThan(0);
    }
  });
});
