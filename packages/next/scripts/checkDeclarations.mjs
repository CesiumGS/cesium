// Checks the library's emitted declarations (`dist-lib/types`, from
// `npm run build:lib`) for dangling references: a type that an exported
// declaration names (a parameter, a return, a field, a base class) which is
// declared in the package but exported from none of its entry points
// (package.json `exports`, each an `index.d.ts`), so a consumer can't write
// it down. Members tagged `@internal`, and private ones, are skipped: they
// aren't API.
//
//   node scripts/checkDeclarations.mjs [--only engineering,measure] [index.d.ts ...]
//
// The index files named are the ones whose exports are walked (default:
// every entry point's); a type exported by any entry point counts as
// exported.
//
// `--only` reports only dangling types declared under, or named by an export
// declared under, those directories of the types (`build:lib` checks
// `engineering` and `measure` from the proj and measure entries, which plan 4b
// audited; the rest of the API, ~100 types in scene, streaming, io and gpu,
// waits for plan 5's API review). Exits 1, listing each dangling type, where it is
// declared and an exported declaration that names it, when there are any.
import { readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only =
  onlyAt >= 0 ? args.splice(onlyAt, 2)[1]?.split(",").filter(Boolean) : [];
const typesDir = resolve(root, "dist-lib/types");
/** Each entry point's declarations: `./src/x/index.ts` -> `types/x/index.d.ts`. */
const entryPoints = Object.values(
  JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).exports,
).map((path) =>
  resolve(typesDir, relative("src", path).replace(/\.ts$/, ".d.ts")),
);
const walked =
  args.length > 0 ? args.map((path) => resolve(root, path)) : entryPoints;
const reported = (file) =>
  only.length === 0 ||
  only.some((dir) => file.split(sep).join("/").startsWith(`${dir}/`));

const program = ts.createProgram([...new Set([...entryPoints, ...walked])], {
  noEmit: true,
  skipLibCheck: true,
  types: [],
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const indexOf = (entry) => {
  const index = program.getSourceFile(entry);
  if (!index) {
    console.error(
      `checkDeclarations: no ${relative(root, entry)}; run build:lib`,
    );
    process.exit(2);
  }
  return index;
};

const ours = (declaration) =>
  !relative(typesDir, declaration.getSourceFile().fileName).startsWith("..");

const resolved = (symbol) =>
  symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;

/** Every symbol an index exports, namespaces (`export * as`) included. */
const exportsOf = (moduleSymbol, into = new Set()) => {
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const target = resolved(symbol);
    if (into.has(target)) {
      continue;
    }
    into.add(target);
    if (target.flags & ts.SymbolFlags.ValueModule) {
      exportsOf(target, into);
    }
  }
  return into;
};
/** What any entry point exports: a consumer can write each of these down. */
const exported = new Set();
for (const entry of entryPoints) {
  exportsOf(checker.getSymbolAtLocation(indexOf(entry)), exported);
}
/** What the named index files export: the API walked for dangling types. */
const roots = new Set();
for (const entry of walked) {
  exportsOf(checker.getSymbolAtLocation(indexOf(entry)), roots);
}

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

for (const symbol of roots) {
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
    `checkDeclarations: ${dangling.size} type(s) named by the API but exported from no entry point:`,
  );
  for (const [name, { owner, file }] of [...dangling].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.error(`  ${name} (${file}, named by ${owner})`);
  }
  process.exit(1);
}
console.log(
  `checkDeclarations: ${roots.size} exports walked (${walked.map((entry) => relative(typesDir, entry)).join(", ")}), no dangling type references${only.length > 0 ? ` into ${only.join(", ")}` : ""}`,
);
