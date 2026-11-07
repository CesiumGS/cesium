import { describe, expect, it } from "vitest";
import { worksWithoutRuns } from "../bench/suite/withoutRuns.ts";

describe("Dyno views on a machine with no runs", () => {
  it("shows Scenes and a scene's page: the catalog's scenes are static", () => {
    expect(worksWithoutRuns("/scenes")).toBe(true);
    expect(worksWithoutRuns("/scenes/osm-philadelphia")).toBe(true);
  });

  it("keeps the other run-free views", () => {
    for (const path of [
      "/explorer",
      "/viewer",
      "/images",
      "/examples/frames-explorer",
      "/start",
      "/lab",
    ]) {
      expect(worksWithoutRuns(path)).toBe(true);
    }
  });

  it("sends views that need runs to the guided first run", () => {
    for (const path of ["/", "/runs", "/trends", "/alerts", "/scenesx"]) {
      expect(worksWithoutRuns(path)).toBe(false);
    }
  });
});
