// The report's package line (examples/frames-explorer/version.ts, R15): read
// from package.json at build time, never typed in by hand.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE } from "../examples/frames-explorer/version.ts";

describe("the report's package", () => {
  it("is package.json's name and version", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { name: string; version: string };
    expect(PACKAGE).toBe(`${pkg.name} ${pkg.version}`);
  });

  it("isn't typed into main.ts or the report's environment", () => {
    for (const file of ["main.ts", "pageReport.ts"]) {
      const source = readFileSync(
        new URL(`../examples/frames-explorer/${file}`, import.meta.url),
        "utf8",
      );
      expect(source).not.toMatch(/@cesium\/next \d/);
    }
  });
});
