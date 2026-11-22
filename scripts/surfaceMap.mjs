// The generated surface map of the public API: one line per export of each
// entry point, with its kind and its tier, so a review of the API reads as a
// diff of `api/surface.txt`. `memberRows` lists the public members of chosen
// classes and interfaces the same way, for the protocol table's per-name
// checks (src/thread/protocol.ts); it never changes the map's text.
//
//   node scripts/surfaceMap.mjs [--write]
//
// Without `--write` it prints the map. With it, it writes `api/surface.txt`.
// The entries are the `package.json` `exports` (key `.` is entry `.`,
// `./time` is entry `time`, `./widgets` is entry `widgets`, and so on). A tier comes from the
// declaration's TSDoc tag: `@stable`, `@experimental` or `@internal`; `-` when
// it has none. A namespace (`export * as vec3`) lists its members as
// `vec3.add`, each with its own kind and tier.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The package whose entry points the map lists. */
const defaultRoot = resolve(repo, "packages", "next");
const TIERS = ["stable", "experimental", "internal"];
const HEADER = "entry\tname\tkind\ttier";

/** The entry name to source file map: the package's `exports`. */
export const packageEntries = (root) => {
  const { exports = {} } = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  const entries = {};
  for (const [key, target] of Object.entries(exports)) {
    const file =
      typeof target === "string"
        ? target
        : (target.types ?? target.import ?? target.default);
    if (typeof file === "string") {
      entries[key === "." ? "." : key.slice(2)] = file;
    }
  }
  return entries;
};

/** The repo's compiler options, with nothing emitted. */
export const compilerOptions = (root) => {
  const path = resolve(root, "tsconfig.json");
  const { config } = ts.readConfigFile(path, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  return { ...parsed.options, noEmit: true };
};

const KINDS = [
  ["class", ts.SymbolFlags.Class],
  ["function", ts.SymbolFlags.Function],
  ["enum", ts.SymbolFlags.Enum],
  ["const", ts.SymbolFlags.Variable],
  ["interface", ts.SymbolFlags.Interface],
  ["type", ts.SymbolFlags.TypeAlias],
  ["namespace", ts.SymbolFlags.Module],
];

/** Every kind the symbol has, in a fixed order (`const`, then `type`, say). */
export const kindsOf = (symbol, name) => {
  const kinds = KINDS.filter(([, flag]) => symbol.flags & flag).map(
    ([kind]) => kind,
  );
  if (kinds.length === 0) {
    throw new Error(
      `surfaceMap: ${name} has an unrecognized kind (symbol flags ${symbol.flags})`,
    );
  }
  return kinds;
};

/** The tier tag found on any declaration of the symbol; `-` without one. */
export const tierOf = (symbol, name) => {
  const found = new Set();
  for (const declaration of symbol.declarations ?? []) {
    for (const tag of ts.getJSDocTags(declaration)) {
      if (TIERS.includes(tag.tagName.text)) {
        found.add(tag.tagName.text);
      }
    }
  }
  if (found.size > 1) {
    throw new Error(
      `surfaceMap: ${name} has declarations with different tiers (${[...found].join(", ")})`,
    );
  }
  return [...found][0] ?? "-";
};

/** One TypeScript program over the entry files, and its type checker. */
const openProgram = (root, files) => {
  const program = ts.createProgram(
    Object.values(files).map((file) => resolve(root, file)),
    compilerOptions(root),
  );
  return { program, checker: program.getTypeChecker() };
};

/** The module symbol of an entry file. */
const moduleOf = (program, checker, root, entry, file) => {
  const source = program.getSourceFile(resolve(root, file));
  const moduleSymbol = source && checker.getSymbolAtLocation(source);
  if (!moduleSymbol) {
    throw new Error(`surfaceMap: no module at ${file} (entry ${entry})`);
  }
  return moduleSymbol;
};

/**
 * The header line, then a tab-separated line per export, sorted by entry and
 * then name.
 * @param {{ root?: string, entries?: Record<string, string> }} [options]
 */
export function surfaceLines({ root = defaultRoot, entries } = {}) {
  const files = entries ?? packageEntries(root);
  const { program, checker } = openProgram(root, files);
  const rows = [];

  const list = (entry, prefix, moduleSymbol, seen) => {
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported;
      const name = `${prefix}${exported.name}`;
      const kinds = kindsOf(symbol, name);
      rows.push({
        entry,
        name,
        line: `${entry}\t${name}\t${kinds.join("+")}\t${tierOf(symbol, name)}`,
      });
      if (kinds.includes("namespace") && !seen.has(symbol)) {
        list(entry, `${name}.`, symbol, new Set(seen).add(symbol));
      }
    }
  };

  for (const [entry, file] of Object.entries(files)) {
    const moduleSymbol = moduleOf(program, checker, root, entry, file);
    list(entry, "", moduleSymbol, new Set([moduleSymbol]));
  }

  const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  rows.sort((a, b) => order(a.entry, b.entry) || order(a.name, b.name));
  return [HEADER, ...rows.map((row) => row.line)];
}

/** Whether a declaration is private, protected or a `#private` name. */
const hidden = (declaration) =>
  (ts.getCombinedModifierFlags(declaration) &
    (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !==
    0 ||
  (declaration.name !== undefined && ts.isPrivateIdentifier(declaration.name));

/**
 * The public members of the given classes and interfaces, one row each, sorted
 * by entry, owner and name: the properties, accessors and methods of its
 * instances (its own and inherited), and for a class its static members,
 * written `static.name`. `callable` tells whether the member can be called (a
 * method, or a property whose type is a function).
 * @param {{ entry: string, name: string }[]} owners
 * @param {{ root?: string, entries?: Record<string, string> }} [options]
 */
export function memberRows(owners, { root = defaultRoot, entries } = {}) {
  const files = entries ?? packageEntries(root);
  const { program, checker } = openProgram(root, files);
  const modules = new Map();
  const exportsOf = (entry) => {
    if (!modules.has(entry)) {
      const file = files[entry];
      if (file === undefined) {
        throw new Error(`surfaceMap: no entry ${entry}`);
      }
      const moduleSymbol = moduleOf(program, checker, root, entry, file);
      modules.set(
        entry,
        new Map(
          checker.getExportsOfModule(moduleSymbol).map((e) => [e.name, e]),
        ),
      );
    }
    return modules.get(entry);
  };
  const rows = [];
  const describe = (entry, owner, symbol, prefix) => {
    const declaration = symbol.declarations?.[0];
    if (declaration === undefined || hidden(declaration)) {
      return;
    }
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    rows.push({
      entry,
      owner,
      name: `${prefix}${symbol.name}`,
      callable: checker.getNonNullableType(type).getCallSignatures().length > 0,
    });
  };
  for (const { entry, name } of owners) {
    const exported = exportsOf(entry).get(name);
    if (exported === undefined) {
      continue;
    }
    const symbol =
      exported.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exported)
        : exported;
    const declared = checker.getDeclaredTypeOfSymbol(symbol);
    for (const property of checker.getPropertiesOfType(declared)) {
      describe(entry, name, property, "");
    }
    const declaration = symbol.declarations?.[0];
    if (symbol.flags & ts.SymbolFlags.Class && declaration !== undefined) {
      const constructorType = checker.getTypeOfSymbolAtLocation(
        symbol,
        declaration,
      );
      for (const property of checker.getPropertiesOfType(constructorType)) {
        if (property.name !== "prototype") {
          describe(entry, name, property, "static.");
        }
      }
    }
  }
  const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return rows.sort(
    (a, b) =>
      order(a.entry, b.entry) ||
      order(a.owner, b.owner) ||
      order(a.name, b.name),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = `${surfaceLines().join("\n")}\n`;
  if (process.argv.includes("--write")) {
    writeFileSync(resolve(repo, "api/surface.txt"), text);
  } else {
    process.stdout.write(text);
  }
}
