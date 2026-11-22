// Members tagged `@internal` stay out of the published declarations: other
// modules of the engine may reach them, a consumer's compiler must not. The
// flag is `stripInternal` in both library configs. This emits the declarations
// of every entry point from one program, in memory, and reads them.
import { dirname, join, relative, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

// Every package's declarations, emitted from one program as the library
// build emits them (packages/cesium/tsconfig.lib.json), by path from packages/.
const root = join(import.meta.dirname, "..", "packages");
/** TypeScript names files with forward slashes, whatever the platform. */
const slash = (path: string) => path.split(sep).join("/");

function libraryConfig(config: string): ts.ParsedCommandLine {
  const path = join(root, "cesium", config);
  const { config: raw, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
  return ts.parseJsonConfigFileContent(raw, ts.sys, dirname(path));
}
const libraryOptions = (config: string) => libraryConfig(config).options;

it("the library config strips internal members", () => {
  expect(libraryOptions("tsconfig.lib.json").stripInternal).toBe(true);
});

// In memory only. Outside `dist-lib`, whose package.json would claim the
// package's name for anything under it: the check owes nothing to what's on disk.
const OUT = "never-written-declarations";

/** The umbrella's entry points, as the program below emits them. */
const ENTRIES: Readonly<Record<string, string>> = {
  "@cesium/next": "cesium/src/index",
  "@cesium/next/time": "cesium/src/time",
  "@cesium/next/frames": "cesium/src/frames",
  "@cesium/next/crs": "cesium/src/crs",
  "@cesium/next/measure": "cesium/src/measure",
  "@cesium/next/ui": "cesium/src/ui",
};
/** The packages' entry points the umbrella's declarations import by name. */
const PACKAGE_ENTRIES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    ["core", "time", "frames", "crs", "measure", "ui"].map((name) => [
      `@cesium/${name}`,
      `${name}/src/index`,
    ]),
  ),
  ...Object.fromEntries(
    ["core", "frames", "crs"].map((name) => [
      `@cesium/${name}/internal`,
      `${name}/src/internal`,
    ]),
  ),
};

/** The declarations of every entry point, emitted in memory from one program. */
function emitDeclarations(): {
  options: ts.CompilerOptions;
  entries: string[];
  emitted: Map<string, string>;
} {
  const { options, fileNames } = libraryConfig("tsconfig.lib.json");
  const entries = Object.values(ENTRIES).map((entry) =>
    join(root, `${entry}.ts`),
  );
  // Every file the library config includes, as `tsc -p` emits them: a file
  // reached only through node_modules (a package by name) isn't emitted.
  const program = ts.createProgram(fileNames, {
    ...options,
    rootDir: root,
    outDir: join(root, OUT),
    paths: {},
    noEmitOnError: false,
  });
  const emitted = new Map<string, string>();
  program.emit(
    undefined,
    (path, text) => {
      if (path.endsWith(".d.ts")) {
        const from = relative(join(root, OUT), path);
        emitted.set(from.split(sep).join("/"), text);
      }
    },
    undefined,
    true,
  );
  return { options, entries, emitted };
}

it("no published declaration carries an @internal member", () => {
  const { emitted } = emitDeclarations();
  // The detector works only if the classes it names were emitted at all.
  const classes = {
    "core/src/scene/Engine.d.ts": "class Engine",
    "core/src/scene/World.d.ts": "class World",
    "core/src/streaming/Tileset3D.d.ts": "class Tileset3D",
    "core/src/scene/View.d.ts": "class View",
    "ui/src/Viewer.d.ts": "class Viewer",
  };
  for (const [file, declaration] of Object.entries(classes)) {
    expect(emitted.get(file), file).toContain(declaration);
  }
  // Members that only the engine's other modules reach. Each is tagged
  // `@internal` where it is declared; a tag removed there, or a new member
  // added without one, would publish the type it holds, and the check above
  // reads only tags that survive, so it can't see either.
  const engineOnly = new Set([
    "raster",
    "scene",
    "state",
    "anchorState",
    "ctx",
  ]);
  const published: string[] = [];
  for (const file of Object.keys(classes)) {
    const source = ts.createSourceFile(
      file,
      emitted.get(file)!,
      ts.ScriptTarget.Latest,
      true,
    );
    ts.forEachChild(source, (node) => {
      if (!ts.isClassDeclaration(node)) {
        return;
      }
      for (const member of node.members) {
        const name = member.name?.getText();
        // A `private` member is emitted by name alone, with no type.
        const hidden = ts
          .getModifiers(member as ts.ClassElement & ts.HasModifiers)
          ?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword);
        if (!hidden && name !== undefined && engineOnly.has(name)) {
          published.push(`${file}: ${node.name?.text}.${name}`);
        }
      }
    });
  }
  expect(published).toEqual([]);
  const tagged: string[] = [];
  for (const [file, text] of emitted) {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      // A constructor's parameter keeps its comment; its property is gone.
      if (
        !ts.isParameter(node) &&
        ts.getJSDocTags(node).some((tag) => tag.tagName.text === "internal")
      ) {
        tagged.push(`${file}: ${node.getText().slice(0, 60)}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(tagged).toEqual([]);
}, 120_000);

it("the published declarations compile with skipLibCheck off", () => {
  const { options, entries, emitted } = emitDeclarations();
  // A consumer that imports every entry point, over the emitted declarations
  // alone: an exported declaration naming a stripped member is an error here.
  const consumer = slash(join(root, OUT, "consumer.ts"));
  const virtual = new Map<string, string>();
  for (const [file, text] of emitted) {
    virtual.set(slash(join(root, OUT, file)), text);
  }
  virtual.set(
    consumer,
    entries
      .map((entry, i) => {
        const from = relative(root, entry).split(sep).join("/");
        return `import * as e${i} from "./${from.replace(/\.ts$/, ".js")}";\nvoid e${i};`;
      })
      .join("\n"),
  );
  const host = ts.createCompilerHost({ ...options, skipLibCheck: false });
  const { fileExists, readFile, getSourceFile } = host;
  host.fileExists = (f) => virtual.has(f) || fileExists(f);
  const out = `${slash(join(root, OUT))}/`;
  const directoryExists = host.directoryExists?.bind(host);
  host.directoryExists = (d) =>
    `${slash(d)}/`.startsWith(out) || (directoryExists?.(d) ?? false);
  host.readFile = (f) => virtual.get(f) ?? readFile(f);
  host.getSourceFile = (f, languageVersion, ...rest) =>
    virtual.has(f)
      ? ts.createSourceFile(f, virtual.get(f)!, languageVersion, true)
      : getSourceFile(f, languageVersion, ...rest);
  const program = ts.createProgram(
    [consumer],
    {
      ...options,
      declaration: false,
      emitDeclarationOnly: false,
      noEmit: true,
      skipLibCheck: false,
      rootDir: undefined,
      // The packages' names are the declarations just emitted.
      paths: Object.fromEntries(
        Object.entries({ ...ENTRIES, ...PACKAGE_ENTRIES }).map(
          ([name, entry]) => [name, [slash(join(root, OUT, `${entry}.d.ts`))]],
        ),
      ),
      types: ["@webgpu/types"],
    },
    host,
  );
  for (const [name, entry] of Object.entries(ENTRIES)) {
    expect(
      ts.resolveModuleName(name, consumer, program.getCompilerOptions(), host)
        .resolvedModule?.resolvedFileName,
    ).toBe(slash(join(root, OUT, `${entry}.d.ts`)));
  }
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && virtual.has(d.file.fileName))
    .map(
      (d) =>
        `${relative(join(root, OUT), d.file!.fileName)}: ${ts.flattenDiagnosticMessageText(
          d.messageText,
          " ",
        )}`,
    );
  expect(errors).toEqual([]);
}, 240_000);
