// The ray seam's detector (test/seams.test.ts, spec section 7.10): the
// examples and `measure` reach rays only through the query interface. It
// reads modules through the TypeScript checker, so it follows what an
// import or a name resolves to, not how it is spelled: an alias, a
// namespace import, a re-export from the package's index, a destructured
// or bracketed member, a tile under another variable's name.
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "src");

/** The modules the seam keeps to itself, and the one it answers through. */
export const RAY_MODULES = {
  terrainRay: join(src, "globe", "terrainRay.ts"),
  drawBackend: join(src, "query", "drawBackend.ts"),
  terrainBackend: join(src, "query", "terrainBackend.ts"),
  queries: join(src, "query", "queries.ts"),
  tile: join(src, "streaming", "Tile.ts"),
  worldRays: join(src, "scene", "world", "rays.ts"),
} as const;

/** What `terrainBackend.ts` may give the examples and `measure`. */
const ALLOWED_FROM_TERRAIN_BACKEND = new Set(["terrainQueries"]);
/** A tileset's ray targets: its CPU triangles, read for rays. */
const RAY_TARGETS = new Set(["terrainRayTarget", "rayTarget"]);

const OPTIONS: ts.CompilerOptions = {
  noEmit: true,
  skipLibCheck: true,
  types: [],
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  strict: true,
};

/**
 * A program over `roots`, with `virtual` modules (path → text) served as
 * if on disk (the detector's own snippets).
 */
export function rayProgram(
  roots: readonly string[],
  virtual: Readonly<Record<string, string>> = {},
): ts.Program {
  const host = ts.createCompilerHost(OPTIONS, true);
  const getSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  host.getSourceFile = (name, version, ...rest) =>
    name in virtual
      ? ts.createSourceFile(name, virtual[name]!, version, true)
      : getSourceFile(name, version, ...rest);
  host.fileExists = (name) => name in virtual || fileExists(name);
  host.readFile = (name) => virtual[name] ?? readFile(name);
  return ts.createProgram([...roots, ...Object.keys(virtual)], OPTIONS, host);
}

/**
 * Lines of `file` that reach rays around the query interface (`rays`), and
 * lines that read or keep a tileset's retained geometry (`retained`,
 * apart: a module may keep geometry for something other than rays).
 *
 * Rays:
 * - any import or re-export of `src/globe/terrainRay.ts` or
 *   `src/query/drawBackend.ts` (static, dynamic or a type), and anything
 *   from `src/query/terrainBackend.ts` but `terrainQueries`;
 * - any name that resolves to `castTerrainRay`, to a declaration of
 *   `drawBackend.ts`, or to one of `terrainBackend.ts` but
 *   `terrainQueries`, however it was imported (an alias, a namespace, the
 *   package's index);
 * - any member named `castRays` (dotted, bracketed or destructured) that
 *   isn't the query interface's (`SpatialQueries.castRays`);
 * - any member named `terrainRayTarget` or `rayTarget`.
 *
 * Retained: a member named `geometry` of a value whose type is a tile
 * (`Tile`), dotted, bracketed or destructured, whatever the variable is
 * called; and `retainGeometry` named.
 */
export function rayBypasses(
  program: ts.Program,
  file: ts.SourceFile,
): { rays: number[]; retained: number[] } {
  const checker = program.getTypeChecker();
  const rays = new Set<number>();
  const retained = new Set<number>();
  const line = (node: ts.Node) =>
    file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
  const same = (a: string, b: string) => resolve(a) === resolve(b);

  const resolveModule = (specifier: string): string | undefined =>
    ts.resolveModuleName(specifier, file.fileName, OPTIONS, ts.sys)
      .resolvedModule?.resolvedFileName;
  const forbiddenModule = (path: string | undefined) =>
    path !== undefined &&
    (same(path, RAY_MODULES.terrainRay) ||
      same(path, RAY_MODULES.drawBackend) ||
      same(path, RAY_MODULES.worldRays));

  /** Whether a declaration is one the seam keeps to itself. */
  const forbidden = (declaration: ts.Declaration, name: string): boolean => {
    const at = declaration.getSourceFile().fileName;
    return (
      (same(at, RAY_MODULES.terrainRay) && name === "castTerrainRay") ||
      same(at, RAY_MODULES.drawBackend) ||
      (same(at, RAY_MODULES.terrainBackend) &&
        !ALLOWED_FROM_TERRAIN_BACKEND.has(name))
    );
  };
  const resolved = (symbol: ts.Symbol): ts.Symbol =>
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;

  /** The declarations of member `name` on the type of `object`. */
  const member = (
    object: ts.Node,
    name: string,
  ): ts.Declaration[] | undefined => {
    const type = checker.getTypeAtLocation(object).getNonNullableType();
    const types = type.isUnion() ? type.types : [type];
    const found: ts.Declaration[] = [];
    let any = false;
    for (const t of types) {
      const property = t.getProperty(name);
      if (property) {
        found.push(...(resolved(property).declarations ?? []));
      } else if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
        any = true;
      }
    }
    return any && found.length === 0 ? undefined : found;
  };
  const isTile = (object: ts.Node): boolean => {
    const type = checker.getTypeAtLocation(object).getNonNullableType();
    const types = type.isUnion() ? type.types : [type];
    return types.some((t) => {
      const symbol = t.getSymbol();
      return (
        symbol?.name === "Tile" &&
        (symbol.declarations ?? []).some((d) =>
          same(d.getSourceFile().fileName, RAY_MODULES.tile),
        )
      );
    });
  };

  /** A member access of `name` on `object`, at `at`. */
  const access = (object: ts.Node, name: string, at: ts.Node) => {
    if (name === "castRays") {
      const declarations = member(object, name);
      const ours =
        declarations !== undefined &&
        declarations.length > 0 &&
        declarations.every((d) =>
          same(d.getSourceFile().fileName, RAY_MODULES.queries),
        );
      if (!ours) {
        rays.add(line(at));
      }
    } else if (RAY_TARGETS.has(name)) {
      rays.add(line(at));
    } else if (name === "geometry" && isTile(object)) {
      retained.add(line(at));
    } else if (name === "retainGeometry") {
      retained.add(line(at));
    }
  };

  const visit = (node: ts.Node): void => {
    // Imports and re-exports, by what they resolve to.
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const path = resolveModule(node.moduleSpecifier.text);
      if (forbiddenModule(path)) {
        rays.add(line(node));
      } else if (path && same(path, RAY_MODULES.terrainBackend)) {
        const names: string[] = [];
        let whole = false;
        if (ts.isImportDeclaration(node)) {
          const clause = node.importClause;
          whole = clause?.name !== undefined || clause === undefined;
          const bindings = clause?.namedBindings;
          if (bindings && ts.isNamespaceImport(bindings)) {
            whole = true;
          } else if (bindings) {
            for (const e of bindings.elements) {
              names.push((e.propertyName ?? e.name).text);
            }
          }
        } else {
          const clause = node.exportClause;
          if (!clause || ts.isNamespaceExport(clause)) {
            whole = true;
          } else {
            for (const e of clause.elements) {
              names.push((e.propertyName ?? e.name).text);
            }
          }
        }
        if (whole || names.some((n) => !ALLOWED_FROM_TERRAIN_BACKEND.has(n))) {
          rays.add(line(node));
        }
      }
    }
    // Dynamic imports and import types.
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const path = resolveModule(node.arguments[0].text);
      if (
        forbiddenModule(path) ||
        (path !== undefined && same(path, RAY_MODULES.terrainBackend))
      ) {
        rays.add(line(node));
      }
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal) &&
      forbiddenModule(resolveModule(node.argument.literal.text))
    ) {
      rays.add(line(node));
    }
    // Names, by the declaration they resolve to.
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol) {
        const target = resolved(symbol);
        for (const d of target.declarations ?? []) {
          if (forbidden(d, target.name)) {
            rays.add(line(node));
            break;
          }
        }
      }
    }
    // Members: dotted, bracketed, destructured.
    if (ts.isPropertyAccessExpression(node)) {
      access(node.expression, node.name.text, node);
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      access(node.expression, node.argumentExpression.text, node);
    } else if (ts.isObjectBindingPattern(node)) {
      for (const e of node.elements) {
        const name = e.propertyName ?? e.name;
        if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
          access(node, name.text, e);
        }
      }
    } else if (
      (ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "retainGeometry"
    ) {
      retained.add(line(node));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);
  return { rays: sorted(rays), retained: sorted(retained) };
}
