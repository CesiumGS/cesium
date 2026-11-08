// Styling never loads the Slang compiler (about 8 MB with its WebAssembly):
// a `FeatureStyle` compiles 1.x's language to WGSL in TypeScript, and
// only `CustomShader.fromSlang` imports src/scene/slang.ts, dynamically.
// Two guards: the style runs through the engine with the Slang modules
// replaced by ones that record being loaded, and the files a style, the
// engine's entry and the widgets import statically never reach them.
// scripts/checkBundle.mjs checks the same of the built chunks.
import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { FeatureStyle } from "../src/scene/FeatureStyle.ts";
import { styleScene } from "./styleScene.ts";

const loaded = vi.hoisted(() => [] as string[]);
vi.mock("../src/scene/slang.ts", () => {
  loaded.push("src/scene/slang.ts");
  return {};
});
vi.mock("../src/scene/slangWorker.ts", () => {
  loaded.push("src/scene/slangWorker.ts");
  return {};
});

const SLANG_FILES = ["src/scene/slang.ts", "src/scene/slangWorker.ts"];
const root = normalize(join(import.meta.dirname, ".."));

describe("styling without Slang", () => {
  it("creates and uses a style, strings included, without loading Slang", async () => {
    const scene = await styleScene({
      count: 2,
      columns: { name: ["Main St", "Oak Ave"], Height: [10, 20] },
    });
    const style = new FeatureStyle({
      defines: { main: "${name} === 'Main St'" },
      show: "${Height} > 5 && ${name} !== 'Elm Ct'",
      color: {
        conditions: [
          ["${main}", "color('red')"],
          ["true", "color('white')"],
        ],
      },
    });
    scene.setShader(style.shader);
    await scene.settle();
    // It was used: the engine compiled it.
    expect(scene.created.pipelines).toContain("feature style opaque");
    expect(loaded).toEqual([]);
  });

  it("sees a load when a shader does come from Slang", async () => {
    // Without this, the check above would pass for a mock that never
    // records: `fromSlang` imports the module dynamically, so it does.
    const { CustomShader } = await import("../src/scene/CustomShader.ts");
    await expect(
      CustomShader.fromSlang("void fragmentMain() {}"),
    ).rejects.toThrow();
    expect(loaded).toEqual(["src/scene/slang.ts"]);
    loaded.length = 0;
  });
});

/** The files `start` imports statically (type imports and `import()` aside). */
function staticImports(
  start: string,
  read: (file: string) => string,
): string[] {
  const seen = new Set([start]);
  const queue = [start];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    const source = ts.createSourceFile(
      file,
      read(file),
      ts.ScriptTarget.Latest,
    );
    for (const node of source.statements) {
      const specifier =
        (ts.isImportDeclaration(node) &&
          node.importClause?.isTypeOnly !== true) ||
        (ts.isExportDeclaration(node) && !node.isTypeOnly)
          ? node.moduleSpecifier
          : undefined;
      if (!specifier || !ts.isStringLiteral(specifier)) {
        continue;
      }
      if (!specifier.text.startsWith(".")) {
        continue;
      }
      // `./x.ts?worker&url` is the file x.ts.
      const to = relative(
        root,
        join(root, dirname(file), specifier.text.replace(/\?.*$/, "")),
      ).replaceAll("\\", "/");
      if (to.endsWith(".ts") && !seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  return [...seen].sort();
}

const readFile = (file: string) => readFileSync(join(root, file), "utf8");

describe("what loads with the page", () => {
  it.each([
    "src/scene/FeatureStyle.ts",
    "src/scene/CustomShader.ts",
    "src/index.ts",
    "widgets/index.ts",
  ])("%s imports Slang's modules by no static import", (entry) => {
    const reached = staticImports(entry, readFile);
    expect(reached.filter((f) => SLANG_FILES.includes(f))).toEqual([]);
  });

  it("sees a static import of Slang's compiler, directly or through another file", () => {
    const files: Record<string, string> = {
      "src/scene/FeatureStyle.ts": 'import { a } from "./helper.ts";',
      "src/scene/helper.ts": 'import { compileSlang } from "./slang.ts";',
      "src/scene/slang.ts":
        'import url from "./slangWorker.ts?worker&url"; export const compileSlang = 1;',
      "src/scene/slangWorker.ts": "",
      "src/scene/CustomShader.ts":
        'export const x = () => import("./slang.ts");',
    };
    const read = (file: string) => files[file] ?? "";
    expect(
      staticImports("src/scene/FeatureStyle.ts", read).filter((f) =>
        SLANG_FILES.includes(f),
      ),
    ).toEqual(["src/scene/slang.ts", "src/scene/slangWorker.ts"]);
    // The dynamic import, as CustomShader has it, is not one.
    expect(staticImports("src/scene/CustomShader.ts", read)).toEqual([
      "src/scene/CustomShader.ts",
    ]);
  });
});
