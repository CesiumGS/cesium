// Checks the library's emitted declarations (`dist-lib/types`, from
// `npm run build:lib`) for dangling references: a type that an exported
// declaration names (a parameter, a return, a field, a base class) which is
// declared in the package but not exported from `index.d.ts`, so a consumer
// can't write it down. Members tagged `@internal`, and private ones, are
// skipped: they aren't API.
//
//   node scripts/checkDeclarations.mjs [--only engineering,measure] [index.d.ts]
//
// `--only` reports only dangling types declared under, or named by an export
// declared under, those directories of the types (`build:lib` checks
// `engineering` and `measure`, which plan 4b audited; the rest of the API, ~100 types in scene, streaming, io and gpu,
// waits for plan 5's API review). Exits 1, listing each dangling type, where it is
// declared and an exported declaration that names it, when there are any.
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only =
  onlyAt >= 0 ? args.splice(onlyAt, 2)[1]?.split(",").filter(Boolean) : [];
const entry = resolve(root, args[0] ?? "dist-lib/types/index.d.ts");
const typesDir = dirname(entry);
const reported = (file) =>
  only.length === 0 ||
  only.some((dir) => file.split(sep).join("/").startsWith(`${dir}/`));

const program = ts.createProgram([entry], {
  noEmit: true,
  skipLibCheck: true,
  types: [],
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const index = program.getSourceFile(entry);
if (!index) {
  console.error(
    `checkDeclarations: no ${relative(root, entry)}; run build:lib`,
  );
  process.exit(2);
}

const ours = (declaration) =>
  !relative(typesDir, declaration.getSourceFile().fileName).startsWith("..");

const resolved = (symbol) =>
  symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;

/** Every symbol the index exports, namespaces (`export * as`) included. */
const exported = new Set();
const addExports = (moduleSymbol) => {
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const target = resolved(symbol);
    if (exported.has(target)) {
      continue;
    }
    exported.add(target);
    if (target.flags & ts.SymbolFlags.ValueModule) {
      addExports(target);
    }
  }
};
addExports(checker.getSymbolAtLocation(index));

const internal = (node) =>
  ts.getJSDocTags(node).some((tag) => tag.tagName.text === "internal");
const isPrivate = (node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.PrivateKeyword,
  );

/** Dangling type name → an exported declaration that names it. */
const dangling = new Map();
const visited = new Set();

function visit(node, owner) {
  if (internal(node) || isPrivate(node) || ts.isPrivateIdentifier(node)) {
    return;
  }
  let name;
  if (ts.isTypeReferenceNode(node)) {
    name = node.typeName;
  } else if (ts.isExpressionWithTypeArguments(node)) {
    name = node.expression;
  } else if (ts.isTypeQueryNode(node)) {
    name = node.exprName;
  } else if (ts.isImportTypeNode(node)) {
    name = node.qualifier ?? node;
  }
  if (name) {
    const symbol = checker.getSymbolAtLocation(
      ts.isQualifiedName(name) ? name.right : name,
    );
    if (symbol) {
      check(resolved(symbol), owner);
    }
  }
  ts.forEachChild(node, (child) => visit(child, owner));
}

function check(symbol, owner) {
  if (
    symbol.flags & ts.SymbolFlags.TypeParameter ||
    !(symbol.declarations ?? []).some(ours)
  ) {
    return;
  }
  if (!exported.has(symbol) && !dangling.has(symbol.name)) {
    const file = relative(
      typesDir,
      symbol.declarations.find(ours).getSourceFile().fileName,
    );
    if (reported(file) || reported(owner.file)) {
      dangling.set(symbol.name, { owner: owner.name, file });
    }
  }
  // A dangling type's own references are reachable too.
  if (!exported.has(symbol)) {
    walk(symbol, owner);
  }
}

function walk(symbol, owner) {
  if (visited.has(symbol)) {
    return;
  }
  visited.add(symbol);
  for (const declaration of symbol.declarations ?? []) {
    if (ours(declaration) && !internal(declaration)) {
      visit(declaration, owner);
    }
  }
}

for (const symbol of exported) {
  if (!(symbol.flags & ts.SymbolFlags.ValueModule)) {
    const declaration = (symbol.declarations ?? []).find(ours);
    const file = declaration
      ? relative(typesDir, declaration.getSourceFile().fileName)
      : "";
    walk(symbol, { name: symbol.name, file });
  }
}

if (dangling.size > 0) {
  console.error(
    `checkDeclarations: ${dangling.size} type(s) named by the API but not exported from index.d.ts:`,
  );
  for (const [name, { owner, file }] of [...dangling].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.error(`  ${name} (${file}, named by ${owner})`);
  }
  process.exit(1);
}
console.log(
  `checkDeclarations: ${exported.size} exports, no dangling type references${only.length > 0 ? ` into ${only.join(", ")}` : ""}`,
);
