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
export default async (moduleArg) => ({
  arg: (globalThis.__glueArg = moduleArg),
  FS: { writeFile() {} },
  emnapiInit: () => ({ marker: "api" }),
});
`,
    );
    urls.length = 0;
    vi.stubGlobal("window", {});
    vi.stubGlobal("__glueLoads", 0);
    vi.stubGlobal("__glueArg", undefined);
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
    // The WebAssembly too: loadProj fetches it and hands it to the glue, so its
    // bytes can be reported (R9).
    expect(urls).toEqual([
      `${withSlash}proj_capi.wasm`,
      `${withSlash}proj.db`,
      `${withSlash}g.tif`,
    ]);
    // The same store under the other spelling shares the first load.
    expect(await loadProj({ base: withSlash, grids: ["g.tif"] })).toBe(a);
    expect((globalThis as { __glueLoads?: number }).__glueLoads).toBe(1);
  });

  it("reports each file's bytes against its Content-Length (R9)", async () => {
    const sizes: Record<string, number> = {
      "proj_capi.wasm": 5000,
      "proj.db": 12_000,
      "g.tif": 3000,
      "late.tif": 2500,
    };
    vi.stubGlobal("fetch", async (url: string) => {
      const name = url.slice(url.lastIndexOf("/") + 1);
      const bytes = new Uint8Array(sizes[name]!).fill(7);
      let offset = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset >= bytes.length) {
            controller.close();
            return;
          }
          controller.enqueue(bytes.slice(offset, offset + 1024));
          offset += 1024;
        },
      });
      return new Response(body, {
        headers: { "Content-Length": String(bytes.length) },
      });
    });
    const calls: [string, number, number | undefined][] = [];
    const base = pathToFileURL(`${dir}/`).href;
    await loadProj({
      base,
      grids: ["g.tif"],
      onProgress: (...c) => calls.push(c),
    });
    // A later call's grids report through that call's callback.
    const later: typeof calls = [];
    await loadProj({
      base,
      grids: ["late.tif"],
      onProgress: (...c) => later.push(c),
    });
    const items = (list: typeof calls) => [...new Set(list.map((c) => c[0]))];
    expect(items(calls).sort()).toEqual(["g.tif", "proj.db", "proj_capi.wasm"]);
    expect(items(later)).toEqual(["late.tif"]);
    for (const [name, size] of Object.entries(sizes)) {
      const list = [...calls, ...later].filter((c) => c[0] === name);
      expect(list[0]![1], name).toBe(0);
      for (let i = 1; i < list.length; i++) {
        expect(list[i]![1]).toBeGreaterThan(list[i - 1]![1]);
      }
      expect(list.at(-1)).toEqual([name, size, size]);
    }
    // The glue gets the fetched WebAssembly instead of fetching it itself.
    const arg = (globalThis as { __glueArg?: { wasmBinary?: Uint8Array } })
      .__glueArg;
    expect(arg?.wasmBinary?.byteLength).toBe(sizes["proj_capi.wasm"]);
  });
});
