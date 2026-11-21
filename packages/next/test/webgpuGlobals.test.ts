// A browser without WebGPU has none of its globals (`GPUBufferUsage`,
// `GPUTextureUsage`, …), and the WebGL 2 fallback must still load the engine
// there: the WebGPU renderer's modules are in the engine's static imports.
// So nothing under `src/` may read one when its module loads (CS-35); a read
// inside a function, a method or an instance property runs only when the
// WebGPU renderer does.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
/** WebGPU's constants: values, not types. */
const GLOBALS =
  /^GPU(BufferUsage|TextureUsage|ShaderStage|MapMode|ColorWrite)$/;

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listTs(path);
    }
    return path.endsWith(".ts") && !path.endsWith(".d.ts") ? [path] : [];
  });
}

/** Reads of WebGPU's global values that run when `text`'s module loads, as "line name". */
export function loadTimeReads(text: string): string[] {
  const source = ts.createSourceFile(
    "m.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];
  const visit = (node: ts.Node, deferred: boolean) => {
    const staticField =
      ts.isPropertyDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);
    // A function body, and an instance property's initializer, run later.
    const later =
      deferred ||
      ts.isFunctionLike(node) ||
      (ts.isPropertyDeclaration(node) && !staticField);
    if (
      !later &&
      ts.isIdentifier(node) &&
      GLOBALS.test(node.text) &&
      !ts.isQualifiedName(node.parent) &&
      !ts.isTypeReferenceNode(node.parent)
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      found.push(`${line + 1} ${node.text}`);
    }
    ts.forEachChild(node, (child) => visit(child, later));
  };
  visit(source, false);
  return found;
}

it("no module under src/ reads a WebGPU global when it loads", () => {
  const found = listTs(join(root, "src")).flatMap((file) =>
    loadTimeReads(readFileSync(file, "utf8")).map(
      (read) => `${relative(root, file)}:${read}`,
    ),
  );
  expect(found).toEqual([]);
});

it("finds a read at load time, and not one inside a function or an instance property", () => {
  expect(
    loadTimeReads(
      [
        "const A = GPUBufferUsage.COPY_SRC;",
        "const lazy = () => GPUBufferUsage.COPY_DST;",
        "function f() { return GPUTextureUsage.COPY_SRC; }",
        "class C { x = GPUMapMode.READ; static y = GPUShaderStage.VERTEX; m() { return GPUColorWrite.ALL; } }",
        "let t: GPUBufferUsage;",
      ].join("\n"),
    ),
  ).toEqual(["1 GPUBufferUsage", "4 GPUShaderStage"]);
});
