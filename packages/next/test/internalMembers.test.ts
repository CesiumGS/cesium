// Members tagged `@internal` stay out of the published declarations: other
// modules of the engine may reach them, a consumer's compiler must not. The
// flag is `stripInternal` in both library configs. This emits the declarations
// of every entry point from one program, in memory, and reads them.
import { dirname, join, relative, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

function libraryOptions(config: string): ts.CompilerOptions {
  const path = join(root, config);
  const { config: raw, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
  return ts.parseJsonConfigFileContent(raw, ts.sys, dirname(path)).options;
}

it("both library configs strip internal members", () => {
  expect(libraryOptions("tsconfig.lib.json").stripInternal).toBe(true);
  expect(libraryOptions("tsconfig.lib.widgets.json").stripInternal).toBe(true);
});

// In memory only. Outside `dist-lib`, whose package.json would claim the
// package's name for anything under it: the check owes nothing to what's on disk.
const OUT = "never-written-declarations";

/** The package's entry points, as the program below emits them. */
const ENTRIES: Readonly<Record<string, string>> = {
  "@cesium/next": "src/index",
  "@cesium/next/time": "src/time/index",
  "@cesium/next/frames": "src/frames/index",
  "@cesium/next/proj": "src/proj/index",
  "@cesium/next/measure": "src/measure/index",
};

/** The declarations of every entry point, emitted in memory from one program. */
function emitDeclarations(): {
  options: ts.CompilerOptions;
  entries: string[];
  emitted: Map<string, string>;
} {
  const options = libraryOptions("tsconfig.lib.json");
  const entries = [
    ...Object.values(ENTRIES).map((entry) => `${entry}.ts`),
    "widgets/index.ts",
  ].map((entry) => join(root, entry));
  const program = ts.createProgram(entries, {
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
    "src/scene/Engine.d.ts": "class Engine",
    "src/scene/World.d.ts": "class World",
    "src/streaming/Tileset3D.d.ts": "class Tileset3D",
    "src/scene/View.d.ts": "class View",
    "widgets/Viewer.d.ts": "class Viewer",
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
  const consumer = join(root, OUT, "consumer.ts");
  const virtual = new Map<string, string>();
  for (const [file, text] of emitted) {
    virtual.set(join(root, OUT, file), text);
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
  const out = join(root, OUT) + sep;
  const directoryExists = host.directoryExists?.bind(host);
  host.directoryExists = (d) =>
    (d + sep).startsWith(out) || (directoryExists?.(d) ?? false);
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
      // The widgets' `@cesium/next` is the declarations just emitted.
      paths: Object.fromEntries(
        Object.entries(ENTRIES).map(([name, entry]) => [
          name,
          [join(root, OUT, `${entry}.d.ts`)],
        ]),
      ),
      types: ["@webgpu/types"],
    },
    host,
  );
  for (const [name, entry] of Object.entries(ENTRIES)) {
    expect(
      ts.resolveModuleName(name, consumer, program.getCompilerOptions(), host)
        .resolvedModule?.resolvedFileName,
    ).toBe(join(root, OUT, `${entry}.d.ts`));
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
