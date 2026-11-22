// The Work page's words (CS-787). Order replaced the Plan view (CS-749), so
// nothing the page shows may call a view by the old name. Comments keep it
// where they say what Order replaced; only strings and text that reach the
// page count here.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const SUITE = join(import.meta.dirname, "..", "bench", "suite");

/** Every `.ts` and `.tsx` file under `dir`. */
function sourcesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      return sourcesUnder(path);
    }
    return /\.tsx?$/.test(e.name) ? [path] : [];
  });
}

/**
 * The text a source file can put on a page: its string and template
 * literals and its JSX text, never its comments.
 */
function uiStrings(source: string, fileName: string): string[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out.push(node.text);
    } else if (ts.isJsxText(node)) {
      out.push(node.getText(file));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

const OLD_NAME = /\bplan view\b/i;

describe("the Work page's words (CS-787)", () => {
  it("finds a string and JSX text, and skips a comment", () => {
    const sample = [
      "// The Plan view, in a line comment.",
      "/** The Plan view, in a doc comment. */",
      'export const label = "Open the Plan view";',
      "export const tip = `The Plan view needs ${1} slot`;",
      "export const page = <p>See the Plan view</p>;",
    ].join("\n");
    const words = uiStrings(sample, "sample.tsx").filter((w) =>
      OLD_NAME.test(w),
    );
    expect(words).toHaveLength(3);
    const quiet = "// The Plan view.\nexport const x = 'Order';";
    expect(uiStrings(quiet, "quiet.ts").some((w) => OLD_NAME.test(w))).toBe(
      false,
    );
  });

  it("never calls a view the Plan view in its UI strings", () => {
    const files = sourcesUnder(SUITE);
    // The scan must see the page's code, or it passes by seeing nothing.
    expect(files.some((f) => f.endsWith("workOrder.tsx"))).toBe(true);
    const found = files.flatMap((f) =>
      uiStrings(readFileSync(f, "utf8"), f)
        .filter((w) => OLD_NAME.test(w))
        .map((w) => `${relative(SUITE, f)}: ${w.trim().slice(0, 60)}`),
    );
    expect(found).toEqual([]);
  });
});
