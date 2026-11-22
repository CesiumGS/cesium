// Dyno's engine grammar after 1.x's source left the branch (CS-611): 1.x runs
// only as a release, and stored results keep their old ids readable.
import { describe, expect, it } from "vitest";
import {
  PINNED_1X,
  engineLabel,
  engineOf,
  parseEngine,
  parseId,
  setupOf,
} from "../bench/suite/engines.mjs";

describe("1.x in Dyno's engine grammar", () => {
  it("refuses the in-tree build and git refs, naming the pinned release", () => {
    for (const spec of ["1.x", "1.x@v1.140", "1.x+sse=8"]) {
      expect(() => parseEngine(spec)).toThrow(
        new RegExp(
          `use ${PINNED_1X.replaceAll(".", "\\.")} \\(the pinned cesium-1x\\)`,
        ),
      );
    }
  });

  it("takes releases and 2.0 as before", () => {
    expect(parseEngine(PINNED_1X).source).toEqual({
      kind: "release",
      version: PINNED_1X,
    });
    expect(parseEngine("2.0@main").source).toEqual({
      kind: "ref",
      ref: "main",
    });
    expect(parseEngine("2.0").source).toEqual({ kind: "tree" });
  });

  it("still reads the ids older results recorded", () => {
    expect(parseId("1.x@main").source).toEqual({ kind: "ref", ref: "main" });
    expect(engineOf("1.x@main")).toBe("1.x");
    expect(setupOf("1.x@main")).toBe("1.x");
    expect(engineLabel("1.x@main")).toBe("1.x · main");
  });
});
