// Members tagged `@internal` stay out of the published declarations: other
// modules of the engine may reach them, a consumer's compiler must not. The
// flag is `stripInternal` in the build's declaration program
// (scripts/build/declarations.mjs). This emits every package's declarations
// as `npm run build` does, in memory, and reads them.
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import {
  declarationConfig,
  emitDeclarations as emitPackages,
} from "../scripts/build/declarations.mjs";

// Every package's declarations, by package folder and path under its
// dist/types (`core/scene/Engine.d.ts`).
const root = join(import.meta.dirname, "..", "packages");
/** TypeScript names files with forward slashes, whatever the platform. */
const slash = (path: string) => path.split(sep).join("/");

it("the declaration build strips internal members", () => {
  expect(declarationConfig().options.stripInternal).toBe(true);
});

// In memory only, under a folder no package uses.
const OUT = "never-written-declarations";

/** The umbrella's entry points, as the build emits them. */
const ENTRIES: Readonly<Record<string, string>> = {
  "@cesium/next": "cesium/index",
  "@cesium/next/time": "cesium/time",
  "@cesium/next/frames": "cesium/frames",
  "@cesium/next/crs": "cesium/crs",
  "@cesium/next/measure": "cesium/measure",
  "@cesium/next/ui": "cesium/ui",
};
/** The packages' entry points the umbrella's declarations import by name. */
const PACKAGE_ENTRIES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    ["core", "time", "frames", "crs", "measure", "ui"].map((name) => [
      `@cesium/${name}`,
      `${name}/index`,
    ]),
  ),
  ...Object.fromEntries(
    ["core", "frames", "crs"].map((name) => [
      `@cesium/${name}/internal`,
      `${name}/internal`,
    ]),
  ),
};

/** The declarations of every package, emitted in memory as the build does. */
function emitDeclarations(): {
  options: ts.CompilerOptions;
  entries: string[];
  emitted: Map<string, string>;
} {
  const { options } = declarationConfig();
  const emitted = new Map<string, string>();
  emitPackages({
    write: (folder, path, text) => emitted.set(`${folder}/${path}`, text),
  });
  const entries = Object.values(ENTRIES).map((entry) =>
    join(root, OUT, `${entry}.d.ts`),
  );
  return { options, entries, emitted };
}

it("no published declaration carries an @internal member", () => {
  const { emitted } = emitDeclarations();
  // The detector works only if the classes it names were emitted at all.
  const classes = {
    "core/scene/Engine.d.ts": "class Engine",
    "core/scene/World.d.ts": "class World",
    "core/streaming/Tileset3D.d.ts": "class Tileset3D",
    "core/scene/View.d.ts": "class View",
    "ui/Viewer.d.ts": "class Viewer",
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
        const from = slash(relative(join(root, OUT), entry));
        return `import * as e${i} from "./${from.replace(/\.d\.ts$/, ".js")}";\nvoid e${i};`;
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
