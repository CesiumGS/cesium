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
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only =
  onlyAt >= 0 ? args.splice(onlyAt, 2)[1]?.split(",").filter(Boolean) : [];
const typesDir = resolve(root, "dist-lib/types");
const entries = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
).exports;
/**
 * An entry point's declarations: `./src/x/index.ts` -> `types/x/index.d.ts`,
 * and the widgets' `./widgets/index.ts` -> `types/widgets/index.d.ts`.
 */
const declarationsOf = (path) =>
  resolve(
    typesDir,
    path.replace(/^\.\/(src\/)?/, "").replace(/\.ts$/, ".d.ts"),
  );
const entryPoints = Object.values(entries).map(declarationsOf);
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
  // No `paths`: the widgets' declarations import the entry points by the
  // package's name, and `dist-lib/package.json` has to be what resolves them.
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
/**
 * What a TypeScript project that has the built folder as the package
 * `@cesium/next` writes. Each `@ts-expect-error` fails the check if the type
 * it names resolved to `any`, as one that couldn't be found does under
 * `skipLibCheck`.
 */
const CONSUMER = `import { Emitter } from "@cesium/next";
import { Clock } from "@cesium/next/time";
import { Viewer, type ViewerOptions } from "@cesium/next/widgets";

const options: ViewerOptions = { clock: new Clock({ mode: "paused" }) };
// @ts-expect-error a number is not a Clock
const wrong: ViewerOptions = { clock: 5 };
const viewer: Promise<Viewer> = Viewer.create(document.body, options);
const events: Emitter<object> = Emitter.prototype;
void viewer.then((v) =>
  // @ts-expect-error "warnings" is not one of the viewer's events
  v.events.on("warnings", () => undefined),
);
void [wrong, events];
`;

/**
 * Checks the built folder as a consumer meets it, with no \`paths\`: a project
 * with \`dist-lib\` as \`node_modules/@cesium/next\` imports Viewer from
 * \`@cesium/next/widgets\`, and every \`@cesium/next\` import in the emitted
 * declarations resolves, by \`dist-lib/package.json\`, to emitted declarations.
 */
function checkConsumer() {
  const work = mkdtempSync(join(tmpdir(), "cesium-next-consumer-"));
  const problems = [];
  try {
    mkdirSync(join(work, "node_modules/@cesium"), { recursive: true });
    symlinkSync(
      resolve(root, "dist-lib"),
      join(work, "node_modules/@cesium/next"),
      "dir",
    );
    const file = join(work, "consumer.ts");
    writeFileSync(file, CONSUMER);
    const options = {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    };
    const consumer = ts.createProgram([file], options);
    for (const diagnostic of ts.getPreEmitDiagnostics(consumer)) {
      problems.push(
        `consumer.ts: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
      );
    }
    // Under `skipLibCheck` an unresolved import in a declaration is silent.
    for (const source of consumer.getSourceFiles()) {
      if (relative(typesDir, source.fileName).startsWith("..")) {
        continue;
      }
      for (const statement of source.statements) {
        const specifier =
          (ts.isImportDeclaration(statement) ||
            ts.isExportDeclaration(statement)) &&
          statement.moduleSpecifier &&
          ts.isStringLiteral(statement.moduleSpecifier)
            ? statement.moduleSpecifier.text
            : "";
        if (!specifier.startsWith("@cesium/next")) {
          continue;
        }
        const target = ts.resolveModuleName(
          specifier,
          source.fileName,
          options,
          ts.sys,
        ).resolvedModule?.resolvedFileName;
        if (!target || relative(typesDir, target).startsWith("..")) {
          problems.push(
            `${relative(typesDir, source.fileName)}: "${specifier}" does not resolve to the built declarations (${target ?? "not found"})`,
          );
        }
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  if (problems.length > 0) {
    console.error(
      `checkDeclarations: a consumer of dist-lib as @cesium/next can't use its types:\n  ${problems.join("\n  ")}`,
    );
    process.exit(1);
  }
}
checkConsumer();

console.log(
  `checkDeclarations: ${roots.size} exports walked (${walked.map((entry) => relative(typesDir, entry)).join(", ")}), no dangling type references, and a consumer of dist-lib as @cesium/next resolves them${only.length > 0 ? ` into ${only.join(", ")}` : ""}`,
);
