// `@cesium/next/widgets` as a consumer of the built library sees it: the
// library built into a temporary directory, its widgets entry loaded as a
// module by its file (the way a page loads it), and its exports compared
// with the surface map. The widgets reach the engine only through the other
// entries' chunks, so the core must be in the build once.
import { readFileSync, readdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { installGpuGlobals } from "./fakeGpu.ts";

const root = join(import.meta.dirname, "..");
let outDir = "";

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "cesium-next-widgets-"));
  await build({
    root,
    configFile: join(root, "vite.lib.config.ts"),
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
  });
}, 120_000);
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

/** The widgets' values in the surface map (types and interfaces are erased). */
function surfaceValues(): string[] {
  return readFileSync(join(root, "api/surface.txt"), "utf8")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(([entry, , kind]) => entry === "widgets" && kind !== undefined)
    .filter(([, , kind]) => !/^(type|interface)(\+|$)/.test(kind!))
    .map(([, name]) => name!);
}

it("loads the widgets entry and exports Viewer and the rest of the surface", async () => {
  installGpuGlobals();
  const widgets = (await import(
    /* @vite-ignore */ pathToFileURL(join(outDir, "cesium-next-widgets.mjs"))
      .href
  )) as Record<string, unknown>;
  expect(typeof widgets.Viewer).toBe("function");
  expect(typeof (widgets.Viewer as { create?: unknown }).create).toBe(
    "function",
  );
  const names = surfaceValues();
  expect(names).toContain("Viewer");
  expect(Object.keys(widgets).sort()).toEqual([...names].sort());
});

it("builds the engine once: the widgets share the core's chunk", () => {
  const files = [
    ...readdirSync(outDir).filter((f) => f.endsWith(".mjs")),
    ...readdirSync(join(outDir, "assets"))
      .filter((f) => f.endsWith(".mjs"))
      .map((f) => `assets/${f}`),
  ];
  const holding = files.filter((f) =>
    // A message only the engine class throws (src/scene/Engine.ts).
    readFileSync(join(outDir, f), "utf8").includes(
      "At most 32 views can have view masks.",
    ),
  );
  expect(holding).toHaveLength(1);
});
