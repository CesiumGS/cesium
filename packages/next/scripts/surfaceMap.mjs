// The generated surface map of the public API: one line per export of each
// entry point, with its kind and its tier, so a review of the API reads as a
// diff of `api/surface.txt`.
//
//   node scripts/surfaceMap.mjs [--write]
//
// Without `--write` it prints the map. With it, it writes `api/surface.txt`.
// The entries are the `package.json` `exports` (key `.` is entry `.`,
// `./time` is entry `time`, and so on) plus the widgets. A tier comes from the
// declaration's TSDoc tag: `@stable`, `@experimental` or `@internal`; `-` when
// it has none. A namespace (`export * as vec3`) lists its members as
// `vec3.add`, each with its own kind and tier.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIERS = ["stable", "experimental", "internal"];
const HEADER = "entry\tname\tkind\ttier";

/** The entry name to source file map: the package's `exports`, then the widgets. */
const packageEntries = (root) => {
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
  entries.widgets = "widgets/index.ts";
  return entries;
};

/** The repo's compiler options, with nothing emitted. */
const compilerOptions = (root) => {
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
const kindsOf = (symbol, name) => {
  const kinds = KINDS.filter(([, flag]) => symbol.flags & flag).map(
    ([kind]) => kind,
  );
  if (kinds.length === 0) {
    throw new Error(
      `surfaceMap: ${name} has an unrecognised kind (symbol flags ${symbol.flags})`,
    );
  }
  return kinds;
};

/** The tier tag found on any declaration of the symbol; `-` without one. */
const tierOf = (symbol, name) => {
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

/**
 * The header line, then a tab-separated line per export, sorted by entry and
 * then name.
 * @param {{ root?: string, entries?: Record<string, string> }} [options]
 */
export function surfaceLines({ root = defaultRoot, entries } = {}) {
  const files = entries ?? packageEntries(root);
  const program = ts.createProgram(
    Object.values(files).map((file) => resolve(root, file)),
    compilerOptions(root),
  );
  const checker = program.getTypeChecker();
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
    const source = program.getSourceFile(resolve(root, file));
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
      throw new Error(`surfaceMap: no module at ${file}`);
    }
    list(entry, "", moduleSymbol, new Set([moduleSymbol]));
  }

  const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  rows.sort((a, b) => order(a.entry, b.entry) || order(a.name, b.name));
  return [HEADER, ...rows.map((row) => row.line)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = `${surfaceLines().join("\n")}\n`;
  if (process.argv.includes("--write")) {
    writeFileSync(resolve(defaultRoot, "api/surface.txt"), text);
  } else {
    process.stdout.write(text);
  }
}
