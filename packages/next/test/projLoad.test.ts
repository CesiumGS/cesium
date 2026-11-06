// loadProj's browser path, against a stub glue module and a stub fetch (no PROJ
// data needed): `base` is normalized to end in "/" for URLs and the cache key.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadProj } from "../src/engineering/proj.ts";

describe("loadProj (browser path)", () => {
  let dir: string;
  const urls: string[] = [];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "frames-proj-"));
    // A module whose emnapiInit returns a marker object.
    writeFileSync(
      join(dir, "proj_capi.mjs"),
      `globalThis.__glueLoads = (globalThis.__glueLoads ?? 0) + 1;
export default async () => ({
  FS: { writeFile() {} },
  emnapiInit: () => ({ marker: "api" }),
});
`,
    );
    urls.length = 0;
    vi.stubGlobal("window", {});
    vi.stubGlobal("__glueLoads", 0);
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("builds URLs and the cache key from a base with no trailing slash", async () => {
    const withSlash = pathToFileURL(`${dir}/`).href;
    const without = withSlash.slice(0, -1);
    const a = await loadProj({ base: without, grids: ["g.tif"] });
    expect(urls).toEqual([`${withSlash}proj.db`, `${withSlash}g.tif`]);
    // The same store under the other spelling shares the first load.
    expect(await loadProj({ base: withSlash, grids: ["g.tif"] })).toBe(a);
    expect((globalThis as { __glueLoads?: number }).__glueLoads).toBe(1);
  });
});
