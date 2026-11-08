// The proj entry (`@cesium/next/proj`) exposes what an entry-only caller
// needs to build an engineering frame, without pulling the browser
// WebAssembly runtime in.
//
// The entry cannot be imported under vitest (it reaches the engine's basis
// transcoder through the core), so the value exports are read from its
// source, and the type exports are checked by `tsc`, through the type-only
// import below.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  AlignmentElement,
  DeclaredCrs,
  EngineeringFrameFallback,
  GeoidModel,
  GridCatalog,
  GridEntry,
  GridSource,
  LoadProjOptions,
  OperationCandidate,
  PickCamera,
  PJ,
  PjCoord,
  ProjApi,
  RecordedOperation,
  ResolveOptions,
} from "../src/proj/index.ts";
// The CRS data types the proj entry's functions name are the frames entry's
// (with the coordinate service; plan 5a's call 36).
import type { CrsRef, CrsUnits, GridFactors } from "../src/frames/index.ts";

/**
 * Compile-time only: each type is exported from the entry, among them the
 * types exported functions and fields name (`GridSource.catalog`,
 * `EngineeringFrame.fallback`, `TilesetGeoreference.otherCrs`, ProjApi's
 * handles). `build:lib` checks the rest mechanically
 * (scripts/checkDeclarations.mjs).
 */
export type IndexTypes = [
  AlignmentElement,
  CrsRef,
  CrsUnits,
  DeclaredCrs,
  EngineeringFrameFallback,
  GeoidModel,
  GridCatalog,
  GridEntry,
  GridFactors,
  GridSource,
  LoadProjOptions,
  OperationCandidate,
  PickCamera,
  PJ,
  PjCoord,
  ProjApi,
  RecordedOperation,
  ResolveOptions,
];

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("proj entry: engineering frames", () => {
  it("exports the loader, CRS and factor API", () => {
    const source = read("../src/proj/index.ts");
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
          `export \\{[^}]*\\b${name}\\b[^}]*\\} from "\\.\\./engineering/`,
        ),
      );
    }
  });

  it("doesn't export the frame's implementation details", () => {
    const source = read("../src/proj/index.ts");
    for (const name of [
      "parseGeoreference",
      "GeoreferenceBodies",
      "GEOREFERENCE_PATH",
      "RENAMED_WARNING",
      "OLD_ENGINEERING_FRAME_EXTENSION",
      "shownCrs",
      "crsObject",
    ]) {
      expect(source, name).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it("exports the frames explorer's two internals only as @internal", () => {
    expect(read("../src/proj/index.ts")).toMatch(
      /\/\/ @internal, both: [^\n]*\nexport \{ projTokenProblem \} from "\.\.\/engineering\/wkt2\.ts";\nexport \{ strictWkt2 \} from "\.\.\/engineering\/crs\.ts";/,
    );
    expect(read("../src/engineering/wkt2.ts")).toMatch(
      /@internal[^/]*\/\nexport function projTokenProblem/,
    );
    expect(read("../src/engineering/crs.ts")).toMatch(
      /@internal[^/]*\/\nexport function strictWkt2/,
    );
  });

  it("imports @emnapi/runtime only dynamically", () => {
    const source = read("../src/engineering/proj.ts");
    expect(source).not.toMatch(/^import[^;]*@emnapi\/runtime/m);
    expect(source).toMatch(/await import\("@emnapi\/runtime"\)/);
  });
});
