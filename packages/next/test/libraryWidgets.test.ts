// `@cesium/next/widgets` as a consumer of the built library sees it: the
// library built into a temporary directory, its widgets entry loaded as a
// module by its file (the way a page loads it), and its exports compared
// with the surface map. The widgets reach the engine only through the other
// entries' chunks, so the core must be in the build once.
import { readFileSync, readdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { sp } from "../src/time/erfa/s06Table.ts";
import { xyp } from "../src/time/erfa/xy06Table.ts";
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

/** An entry's values in the surface map (types and interfaces are erased). */
function surfaceValues(entryName: string): string[] {
  return readFileSync(join(root, "api/surface.txt"), "utf8")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(([entry, , kind]) => entry === entryName && kind !== undefined)
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
  const names = surfaceValues("widgets");
  expect(names).toContain("Viewer");
  expect(Object.keys(widgets).sort()).toEqual([...names].sort());
});

it("the frames entry, built behind its own module, still exports its surface", async () => {
  installGpuGlobals();
  const frames = (await import(
    /* @vite-ignore */ pathToFileURL(join(outDir, "cesium-next-frames.mjs"))
      .href
  )) as Record<string, unknown>;
  expect(Object.keys(frames).sort()).toEqual(surfaceValues("frames").sort());
});

it("builds the engine once: the widgets share the core's chunk", () => {
  const holding = builtFiles().filter((f) =>
    // A message only the engine class throws (src/scene/Engine.ts).
    readFileSync(join(outDir, f), "utf8").includes(
      "At most 32 views can have view masks.",
    ),
  );
  expect(holding).toHaveLength(1);
});

/** Every built module file, as paths in the build (`assets/x.mjs`). */
function builtFiles(): string[] {
  return [
    ...readdirSync(outDir).filter((f) => f.endsWith(".mjs")),
    ...readdirSync(join(outDir, "assets"))
      .filter((f) => f.endsWith(".mjs"))
      .map((f) => `assets/${f}`),
  ];
}

/** The modules a page loads with `entry`: its static imports, transitively. */
function eagerFiles(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    const code = readFileSync(join(outDir, file), "utf8");
    // `import{a}from"./x.mjs"`, `export{a}from"./x.mjs"` and `import"./x.mjs"`
    // (minified); a dynamic `import("./x.mjs")` has a parenthesis, so no match.
    for (const match of code.matchAll(
      /(?:import|export)\s*(?:[^'";(]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+)["']/g,
    )) {
      queue.push(posix.normalize(posix.join(posix.dirname(file), match[1]!)));
    }
  }
  return [...seen];
}

// Plan 5a's call 32, for the library: a page that loads the widgets entry
// and only creates a Viewer must not download the IAU series or the DAF
// reader, which the precise frames load by import(). `checkBundle` builds an
// application page, where tree shaking hides what a no-bundler page gets:
// every static import of every chunk.
it("the widgets entry loads no X, Y or s series and no DAF reader with the page", () => {
  const markers = [
    // The first coefficients of the X and Y and the s series, as printed.
    String(xyp[1]),
    String(sp[1]).replace(/^0\./, "."),
    // The DAF reader's file-record id (src/ephemeris/daf.ts).
    "DAF/SPK",
  ];
  const holding = (files: string[]) =>
    markers.map((marker) =>
      files.filter((f) =>
        readFileSync(join(outDir, f), "utf8").includes(marker),
      ),
    );
  const eager = eagerFiles("cesium-next-widgets.mjs");
  expect(eager).toContain("cesium-next-widgets.mjs");
  expect(holding(eager)).toEqual([[], [], []]);
  // Built, and loaded where the precise frames ask for them.
  for (const files of holding(builtFiles())) {
    expect(files.length).toBeGreaterThan(0);
  }
  // The frames entry itself carries them, as its exports need them.
  for (const files of holding(eagerFiles("cesium-next-frames.mjs"))) {
    expect(files.length).toBeGreaterThan(0);
  }
});
