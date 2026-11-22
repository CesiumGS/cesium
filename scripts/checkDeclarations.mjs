// Checks the packages' published declarations, as a consumer installs them
// (CS-612): each folder named is an unpacked package (its package.json and
// dist/, as `npm pack` writes them; scripts/build.mjs passes every package).
//
//   node scripts/checkDeclarations.mjs [--only crs/engineering,measure,ui] <package folder> ...
//
// 1. Dangling references: a type that an exported declaration names (a
//    parameter, a return, a field, a base class) which is declared in a
//    package but exported from none of the packages' public entry points
//    (package.json `exports`; an `./internal` entry is for siblings, not
//    applications, so it doesn't count), so a consumer can't write it down.
//    Members tagged `@internal`, and private ones, are skipped: they aren't
//    API.
// 2. Resolution: every `@cesium/*` import and every relative import in the
//    declarations resolves, with no `paths` and no source condition, to
//    declarations in the packages named, the way a consumer's compiler
//    resolves them through node_modules.
// 3. A consumer's program, which imports the umbrella's entries and uses a
//    few of their types, compiles.
//
// `--only` reports only dangling types declared under, or named by an export
// declared under, those folders (`<package folder>/<path under dist/types>`):
// the parts the API review has audited (crs's engineering, measure, ui). The
// rest of the API waits for the API review (CS-102).
//
// Exits 1, listing each problem, when there are any. Dangling types the owner
// hasn't decided on yet (PENDING) are listed, with the question, and don't
// fail the check; any other one does.
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * Dangling types that would need a public export, which is a change to the
 * public names, so the owner's call (CS-612's report). Until it is made they
 * are reported here, not failed on: each by its name and the file that
 * declares it, so another type of the same name still fails.
 */
export const PENDING = [
  {
    name: "Route",
    file: "core/camera/route.d.ts",
    why: "exported only from @cesium/core/internal",
  },
  {
    name: "RouteStep",
    file: "core/camera/route.d.ts",
    why: "exported only from @cesium/core/internal",
  },
  {
    name: "Recordable",
    file: "ui/inspectable.d.ts",
    why: "exported from no entry",
  },
];

/** TypeScript names files with forward slashes, whatever the platform. */
const slash = (path) => path.split(sep).join("/");

/**
 * What a TypeScript project that installed the packages writes. Each
 * `@ts-expect-error` fails the check if the type it names resolved to `any`,
 * as one that couldn't be found does under `skipLibCheck`.
 */
const CONSUMER = `import { Emitter } from "@cesium/next";
import { Clock } from "@cesium/next/time";
import { Viewer, type ViewerOptions } from "@cesium/next/ui";

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
 * Checks the unpacked packages in `folders`. Returns the problems and the
 * pending dangling types found; prints nothing.
 * @param {string[]} folders
 * @param {{ only?: string[] }} [options]
 */
export function checkDeclarations(folders, { only = [] } = {}) {
  const work = mkdtempSync(join(tmpdir(), "cesium-declarations-"));
  const problems = [];
  const pending = [];
  try {
    // node_modules/@cesium/<name> -> each unpacked package, by its name.
    const packages = folders.map((folder) => {
      const dir = resolve(folder);
      if (!statSync(dir).isDirectory()) {
        throw new Error(`checkDeclarations: ${folder} is not a folder`);
      }
      const manifest = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8"),
      );
      // The name places the link: only a first-party package name, so it
      // can't point outside the scratch folder.
      const name = String(manifest.name);
      if (!/^@cesium\/[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new Error(
          `checkDeclarations: ${folder}/package.json names "${name}", not an @cesium package`,
        );
      }
      const link = join(work, "node_modules", "@cesium", name.slice("@cesium/".length));
      mkdirSync(join(link, ".."), { recursive: true });
      symlinkSync(dir, link, "dir");
      return { dir: link, manifest, folder: basename(dir) };
    });
    const typesOf = (pkg) => slash(join(pkg.dir, "dist", "types"));
    /** The package folder and path under dist/types of a declaration file. */
    const located = (file) => {
      const name = slash(file);
      for (const pkg of packages) {
        const types = `${typesOf(pkg)}/`;
        if (name.startsWith(types)) {
          return `${pkg.folder}/${name.slice(types.length)}`;
        }
      }
      return undefined;
    };
    const consumer = join(work, "consumer.ts");
    writeFileSync(consumer, CONSUMER);
    // Every entry, by specifier, and whether it is public.
    const entries = packages.flatMap((pkg) =>
      Object.keys(pkg.manifest.exports ?? {})
        .filter((key) => key !== "./package.json")
        .map((key) => ({
          specifier: key === "." ? pkg.manifest.name : `${pkg.manifest.name}${key.slice(1)}`,
          public: !key.endsWith("/internal"),
        })),
    );
    const entriesFile = join(work, "entries.ts");
    writeFileSync(
      entriesFile,
      entries
        .map((e, i) => `export * as e${i} from ${JSON.stringify(e.specifier)};`)
        .join("\n"),
    );
    const options = {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      // Through node_modules, as installed: the links are the packages.
      preserveSymlinks: true,
    };
    const program = ts.createProgram([consumer, entriesFile], options);
    const checker = program.getTypeChecker();

    // 3. The consumer compiles.
    for (const diagnostic of ts.getPreEmitDiagnostics(
      program,
      program.getSourceFile(consumer),
    )) {
      problems.push(
        `consumer.ts: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
      );
    }

    // 2. Every import in the declarations resolves to built declarations.
    for (const source of program.getSourceFiles()) {
      const where = located(source.fileName);
      if (where === undefined) {
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
        if (!specifier.startsWith(".") && !specifier.startsWith("@cesium/")) {
          continue;
        }
        const target = ts.resolveModuleName(
          specifier,
          source.fileName,
          options,
          ts.sys,
        ).resolvedModule?.resolvedFileName;
        if (!target || located(target) === undefined) {
          problems.push(
            `${where}: "${specifier}" does not resolve to the packages' declarations (${target ?? "not found"})`,
          );
        }
      }
    }

    // 1. Dangling references.
    const resolved = (symbol) =>
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
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
    const moduleOf = (specifier) => {
      const file = ts.resolveModuleName(specifier, consumer, options, ts.sys)
        .resolvedModule?.resolvedFileName;
      const source = file && program.getSourceFile(file);
      const symbol = source && checker.getSymbolAtLocation(source);
      if (!symbol) {
        problems.push(`${specifier}: its declarations don't load`);
      }
      return symbol;
    };
    /** What any public entry exports: a consumer can write each down. */
    const exported = new Set();
    /** What the public entries export: the API walked for dangling types. */
    const roots = new Set();
    for (const entry of entries) {
      // An ./internal entry is for siblings: what it names isn't walked.
      const symbol = entry.public ? moduleOf(entry.specifier) : undefined;
      if (symbol) {
        exportsOf(symbol, roots);
        exportsOf(symbol, exported);
      }
    }
    const ours = (declaration) =>
      located(declaration.getSourceFile().fileName) !== undefined;
    const reported = (file) =>
      only.length === 0 || only.some((dir) => file.startsWith(`${dir}/`));
    const internal = (node) =>
      ts.getJSDocTags(node).some((tag) => tag.tagName.text === "internal");
    const isPrivate = (node) =>
      ts.canHaveModifiers(node) &&
      (ts.getModifiers(node) ?? []).some(
        (m) => m.kind === ts.SyntaxKind.PrivateKeyword,
      );
    const dangling = new Map();
    // Per kind of owner, so a type first reached from an unreported owner is
    // still walked, and reported, from a reported one.
    const visited = { true: new Set(), false: new Set() };
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
      if (!exported.has(symbol)) {
        const file = located(
          symbol.declarations.find(ours).getSourceFile().fileName,
        );
        // Keyed by name and declaring file, as PENDING is: a dangling type
        // that shares a name with a pending one is still recorded.
        const key = `${symbol.name}\0${file}`;
        if (!dangling.has(key) && (reported(file) || reported(owner.file))) {
          dangling.set(key, { name: symbol.name, owner: owner.name, file });
        }
      }
      // A dangling type's own references are reachable too.
      if (!exported.has(symbol)) {
        walk(symbol, owner);
      }
    }
    function walk(symbol, owner) {
      const seen = visited[reported(owner.file)];
      if (seen.has(symbol)) {
        return;
      }
      seen.add(symbol);
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
          ? located(declaration.getSourceFile().fileName)
          : "";
        walk(symbol, { name: symbol.name, file });
      }
    }
    for (const { name, owner, file } of [...dangling.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file),
    )) {
      const line = `${name} (${file}, named by ${owner})`;
      const held = PENDING.find((p) => p.name === name && p.file === file);
      if (held) {
        pending.push(`${line}: ${held.why}`);
      } else {
        problems.push(
          `a type named by the API but exported from no public entry: ${line}`,
        );
      }
    }
    return {
      problems,
      pending,
      walked: roots.size,
      entries: entries.map((e) => e.specifier),
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyAt = args.indexOf("--only");
  const only =
    onlyAt >= 0 ? (args.splice(onlyAt, 2)[1]?.split(",").filter(Boolean) ?? []) : [];
  if (args.length === 0) {
    console.error(
      "usage: node scripts/checkDeclarations.mjs [--only dirs] <unpacked package folder> ...",
    );
    process.exit(2);
  }
  const { problems, pending, walked, entries } = checkDeclarations(args, {
    only,
  });
  for (const line of pending) {
    console.warn(
      `checkDeclarations: pending the owner's call (a public export), not failed on: ${line}`,
    );
  }
  if (problems.length > 0) {
    console.error(
      `checkDeclarations: ${problems.length} problem(s) in the packed declarations:\n  ${problems.join("\n  ")}`,
    );
    process.exit(1);
  }
  console.log(
    `checkDeclarations: ${walked} exports walked over ${entries.length} entries (${entries.join(", ")}); no dangling type references${only.length > 0 ? ` in ${only.join(", ")}` : ""}, every @cesium and relative import resolves to the packed declarations, and a consumer's program compiles`,
  );
}
