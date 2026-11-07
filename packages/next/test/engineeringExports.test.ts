// The package index exposes what an index-only caller needs to build an
// engineering frame, without pulling the browser WebAssembly runtime in.
//
// The index cannot be imported under vitest (it reaches the engine's basis
// transcoder), so the value exports are read from its source, and the type
// exports are checked by `tsc`, through the type-only import below.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  CrsRef,
  CrsUnits,
  GridFactors,
  GridSource,
  LoadProjOptions,
  OperationCandidate,
  ProjApi,
  RecordedOperation,
  ResolveOptions,
} from "../src/index.ts";

/** Compile-time only: each type is exported from the index. */
export type IndexTypes = [
  CrsRef,
  CrsUnits,
  GridFactors,
  GridSource,
  LoadProjOptions,
  OperationCandidate,
  ProjApi,
  RecordedOperation,
  ResolveOptions,
];

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("package index: engineering frames", () => {
  it("exports the loader, CRS and factor API", () => {
    const source = read("../src/index.ts");
    for (const name of [
      "loadProj",
      "gridSource",
      "loadGrids",
      "loadedGrids",
      "gridFactors",
      "resolveOperation",
      "listOperations",
      "crsUnits",
      "crsDefinition",
      "MOON_GEOGRAPHIC_CRS",
    ]) {
      expect(source, name).toMatch(
        new RegExp(
          `export \\{[^}]*\\b${name}\\b[^}]*\\} from "\\./engineering/`,
        ),
      );
    }
  });

  it("imports @emnapi/runtime only dynamically", () => {
    const source = read("../src/engineering/proj.ts");
    expect(source).not.toMatch(/^import[^;]*@emnapi\/runtime/m);
    expect(source).toMatch(/await import\("@emnapi\/runtime"\)/);
  });
});
