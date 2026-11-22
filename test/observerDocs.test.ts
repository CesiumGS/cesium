// The sky and observer plan's docs (Task 19): what the README names, the handbook's
// date and its rule about sky data, and the paper it cites.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8");
/** The day this task was done. */
const TASK_DAY = "2026-11-09";

/** Value exports (not types) of the observer, stages, pack and its panel. */
const NAMES = [
  "DAYLIGHT_EXPOSURE",
  "EYE",
  "UNITLESS_EXPOSURE",
  "PostStage",
  "PostStageError",
  "astrophotoCurveStage",
  "cameraGlare",
  "cameraObserver",
  "createPostStage",
  "ev100ToScale",
  "eyeGlare",
  "eyeLimitStage",
  "eyeObserver",
  "observerPointSpread",
  "scaleToEv100",
  "attachObserverPanel",
];

describe("the README", () => {
  const readme = read("README.md");
  const surface = read("api/surface.txt");

  it("names each value export of the observer, stages and pack that the surface lists", () => {
    for (const name of NAMES) {
      expect(surface, `${name} is in the surface`).toMatch(
        new RegExp(`\\t${name}\\t(const|function|class)\\t`),
      );
      expect(readme, name).toContain(name);
    }
  });

  it("says a pack isn't shipped, and names the commands", () => {
    expect(readme).toMatch(/never shipped/);
    expect(readme).toContain("npm run sky");
    expect(readme).toContain("setSkyPack");
  });
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === "dist") {
      return [];
    }
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("the handbook", () => {
  it("has a scene tab checked no earlier than this task, and says observer", () => {
    const scene = read("handbook/src/tabs/scene.tsx");
    const days = [...scene.matchAll(/on="(\d{4}-\d{2}-\d{2})"/g)].map(
      (m) => m[1]!,
    );
    expect(days.length).toBeGreaterThan(0);
    expect(days.sort().at(-1)! >= TASK_DAY).toBe(true);
    expect(scene).toContain("observer");
  });

  it("holds no image, file or string derived from a pack", () => {
    const all = files(join(root, "handbook"));
    for (const path of all) {
      expect(path, "no pack binary").not.toMatch(/\.(bin|exr)$/);
      if (/\.(ts|tsx|css|html|json|md)$/.test(path)) {
        const text = readFileSync(path, "utf8");
        expect(text, path).not.toContain("CSKY");
        expect(text, path).not.toContain("sky-pack");
      }
    }
  });

  it("cites the paper, with the date it was read and what couldn't be", () => {
    const sources = read("handbook/src/sources.ts");
    const block = sources.slice(sources.indexOf("smallerThanPixels"));
    expect(block).toContain("Smaller than Pixels");
    expect(block).toMatch(/checked: "\d{4}-\d{2}-\d{2}"/);
    expect(block).toContain("wasn't");
  });
});
