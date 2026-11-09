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

it("no published declaration carries an @internal member", () => {
  const options = libraryOptions("tsconfig.lib.json");
  const entries = [
    "src/index.ts",
    "src/time/index.ts",
    "src/frames/index.ts",
    "src/proj/index.ts",
    "src/measure/index.ts",
    "widgets/index.ts",
  ].map((entry) => join(root, entry));
  const program = ts.createProgram(entries, {
    ...options,
    rootDir: root,
    outDir: join(root, "dist-lib/never-written"),
    paths: {},
    noEmitOnError: false,
  });
  const emitted = new Map<string, string>();
  program.emit(
    undefined,
    (path, text) => {
      if (path.endsWith(".d.ts")) {
        const from = relative(join(root, "dist-lib/never-written"), path);
        emitted.set(from.split(sep).join("/"), text);
      }
    },
    undefined,
    true,
  );
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
