// Every package's published declarations (CS-612): one `.d.ts` per source
// file, in each package's dist/types/, with members tagged `@internal`
// stripped (`stripInternal`).
//
//   emitDeclarations({ write })   emits them; `write(packageName, path, text)`
//                                 receives each file, path relative to dist/types
//
// Why one program and not `tsc --build`. Under project references a package
// is type-checked against its siblings' emitted declarations, and the
// packages reach each other's `@internal` members (Engine.device,
// Tileset3D.state and the rest), so stripping them breaks every dependent's
// build. One program over every package's sources (the way the library's
// declarations were emitted before CS-612) type-checks each package against
// its siblings' sources and emits each file once, keeping sibling imports by
// package name. `tsc --build` stays the type check (`npm run typecheck`).
//
// CS-883's exception. A package's `./internal` entry publishes names for its
// siblings that aren't the stable API; a name it re-exports keeps its
// declaration even when it is tagged `@internal` (the subpath is outside the
// stable API by its name), or the entry's declarations would re-export
// nothing. Only that declaration's tag is ignored, nothing else in its file.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const packagesDir = join(repo, "packages");
/** TypeScript names files with forward slashes, whatever the platform. */
const slash = (path) => path.split(sep).join("/");

/** The folders under packages/ that hold a package. */
export function packageDirs() {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesDir, entry.name))
    .filter((dir) => {
      try {
        return readdirSync(dir).includes("package.json");
      } catch {
        return false;
      }
    });
}

/** A package's name, from its package.json. */
function readManifestName(dir) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name;
}

/** A package's tsconfig.json, parsed. */
function parsedConfig(dir) {
  const path = join(dir, "tsconfig.json");
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, dir);
}

/**
 * The program's options and files: core's compiler options, with the
 * references' settings off, and the union of every package's sources.
 */
export function declarationConfig(dirs = packageDirs()) {
  const parsed = dirs.map(parsedConfig);
  // One program, so one set of libraries and global types: core's, which
  // every other package builds on. Each package's own libraries must be
  // among them, or the program would check it against more than it has.
  const coreAt = dirs.findIndex(
    (dir) => readManifestName(dir) === "@cesium/core",
  );
  if (coreAt < 0) {
    throw new Error("declarations: no @cesium/core among the packages");
  }
  const base = parsed[coreAt].options;
  const libs = new Set(base.lib ?? []);
  for (const [i, p] of parsed.entries()) {
    const extra = (p.options.lib ?? []).filter((lib) => !libs.has(lib));
    if (extra.length > 0) {
      throw new Error(
        `declarations: ${dirs[i]}'s tsconfig.json has libraries core's doesn't (${extra.join(", ")}); one program emits every package`,
      );
    }
  }
  const options = {
    ...base,
    composite: false,
    incremental: false,
    tsBuildInfoFile: undefined,
    declarationMap: false,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    stripInternal: true,
    noEmitOnError: true,
    rootDir: packagesDir,
    outDir: join(packagesDir, ".declarations"),
  };
  const fileNames = [...new Set(parsed.flatMap((p) => p.fileNames))];
  return { options, fileNames };
}

/** The `@internal` tags of what each `./internal` entry re-exports. */
function internalEntryTags(program) {
  const checker = program.getTypeChecker();
  /** file name → the [start, end) of each `@internal` tag to ignore. */
  const tags = new Map();
  for (const dir of packageDirs()) {
    const entry = slash(join(dir, "src", "internal.ts"));
    const source = program.getSourceFile(entry);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
      continue;
    }
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported;
      for (const declaration of symbol.declarations ?? []) {
        // The tag sits on the statement (a `const` declares in a list).
        const statement = ts.isVariableDeclaration(declaration)
          ? declaration.parent.parent
          : declaration;
        for (const tag of ts.getJSDocTags(statement)) {
          if (tag.tagName.text !== "internal") {
            continue;
          }
          const file = statement.getSourceFile().fileName;
          const list = tags.get(file) ?? [];
          list.push([tag.tagName.getStart() - 1, tag.tagName.getEnd()]);
          tags.set(file, list);
        }
      }
    }
  }
  return tags;
}

/** `text` with each range blanked to spaces, so positions don't move. */
function blank(text, ranges) {
  let out = text;
  for (const [start, end] of ranges) {
    out = out.slice(0, start) + " ".repeat(end - start) + out.slice(end);
  }
  return out;
}

/**
 * Emits every package's declarations. Throws, listing the diagnostics, when
 * the program has errors. Each file is passed to `write` with its package's
 * folder name and its path under that package's dist/types.
 * @param {{ write: (packageFolder: string, path: string, text: string) => void, dirs?: string[] }} options
 * @returns {{ files: number, kept: string[] }} how many files were emitted, and the `@internal` names kept for `./internal` entries
 */
export function emitDeclarations({ write, dirs }) {
  const { options, fileNames } = declarationConfig(dirs);
  const host = ts.createCompilerHost(options);
  const first = ts.createProgram(fileNames, options, host);
  const diagnostics = ts.getPreEmitDiagnostics(first);
  if (diagnostics.length > 0) {
    throw new Error(
      `declarations: the packages don't type-check:\n${ts.formatDiagnostics(diagnostics, host)}`,
    );
  }
  const tags = internalEntryTags(first);
  const kept = [...tags.keys()].map((file) => slash(relative(repo, file)));
  // The files whose re-exported names keep their declarations, with their
  // tags blanked; every other file is the first program's.
  const { getSourceFile } = host;
  host.getSourceFile = (file, languageVersion, ...rest) => {
    const ranges = tags.get(slash(file));
    if (!ranges) {
      return getSourceFile(file, languageVersion, ...rest);
    }
    return ts.createSourceFile(
      file,
      blank(ts.sys.readFile(file) ?? "", ranges),
      languageVersion,
      true,
    );
  };
  const program =
    tags.size > 0 ? ts.createProgram(fileNames, options, host, first) : first;
  let files = 0;
  const outDir = slash(options.outDir);
  const result = program.emit(
    undefined,
    (path, text) => {
      if (!path.endsWith(".d.ts")) {
        return;
      }
      // <outDir>/<package>/src/<path>.d.ts
      const [folder, src, ...rest] = slash(relative(outDir, path)).split("/");
      if (src !== "src" || rest.length === 0) {
        throw new Error(`declarations: ${path} is outside a package's src/`);
      }
      write(folder, rest.join("/"), text);
      files++;
    },
    undefined,
    true,
  );
  if (result.diagnostics.length > 0) {
    throw new Error(
      `declarations: ${ts.formatDiagnostics(result.diagnostics, host)}`,
    );
  }
  return { files, kept };
}
