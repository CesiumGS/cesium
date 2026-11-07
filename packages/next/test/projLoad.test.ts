// loadProj's browser path, against a stub glue module and a stub fetch (no PROJ
// data needed): `base` is normalized to end in "/" for URLs and the cache key,
// and the glue, the WebAssembly and proj.db are checked against their pins
// before any of them is used. The stubs pass their own bytes' hashes as
// `pins`, and import the glue from a data: URL of the verified bytes (Node's
// loader refuses the browser's blob: URLs).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadProj } from "../src/engineering/proj.ts";
import { PROJ_FILE_SHA256 } from "../src/engineering/projPins.ts";
import { sha256Hex } from "../src/io/sha256.ts";

// A module whose emnapiInit returns a marker object.
const GLUE = `globalThis.__glueLoads = (globalThis.__glueLoads ?? 0) + 1;
export default async (moduleArg) => ({
  arg: (globalThis.__glueArg = moduleArg),
  FS: { writeFile() {} },
  emnapiInit: () => ({ marker: "api" }),
});
`;

/** Each stubbed file's bytes, distinct so a swap of two files shows. */
const STUB: Record<string, Uint8Array> = {
  "proj_capi.mjs": new TextEncoder().encode(GLUE),
  "proj_capi.wasm": new Uint8Array([0, 0x61, 0x73, 0x6d]),
  "proj.db": new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65]),
};
const stubBytes = (name: string) => STUB[name] ?? new Uint8Array(4);

const pins = {
  "proj_capi.mjs": await sha256Hex(STUB["proj_capi.mjs"]!),
  "proj_capi.wasm": await sha256Hex(STUB["proj_capi.wasm"]!),
  "proj.db": await sha256Hex(STUB["proj.db"]!),
};

/**
 * Imports the verified glue from a data: URL of its bytes. A fragment per
 * import makes each a module of its own, so every test evaluates it afresh.
 */
let imports = 0;
const importGlue = (bytes: Uint8Array) =>
  import(
    /* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(bytes).toString("base64")}#${++imports}`
  );

/** The bytes with the one at `index` changed. */
const corrupt = (bytes: Uint8Array, index = 0) => {
  const copy = bytes.slice();
  copy[index]! ^= 0xff;
  return copy;
};

const nameOf = (url: string) => url.slice(url.lastIndexOf("/") + 1);

describe("loadProj (browser path)", () => {
  let dir: string;
  let base: string;
  const urls: string[] = [];
  /** What the stub fetch serves, by file name (the stub's bytes otherwise). */
  let served: Record<string, Uint8Array>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "frames-proj-"));
    base = pathToFileURL(`${dir}/`).href;
    urls.length = 0;
    served = {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("__glueLoads", 0);
    vi.stubGlobal("__glueArg", undefined);
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      const bytes = served[nameOf(url)] ?? stubBytes(nameOf(url));
      return {
        ok: true,
        arrayBuffer: async () => bytes.slice().buffer,
      };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  const glueLoads = () =>
    (globalThis as { __glueLoads?: number }).__glueLoads ?? 0;

  it("builds URLs and the cache key from a base with no trailing slash", async () => {
    const without = base.slice(0, -1);
    const a = await loadProj({
      base: without,
      grids: ["g.tif"],
      pins,
      importGlue,
    });
    // The glue and the WebAssembly too: loadProj fetches them so it can check
    // their bytes, and hands the WebAssembly to the glue so its bytes can be
    // reported (R9).
    expect(urls).toEqual([
      `${base}proj_capi.mjs`,
      `${base}proj_capi.wasm`,
      `${base}proj.db`,
      `${base}g.tif`,
    ]);
    // The same store under the other spelling shares the first load.
    expect(await loadProj({ base, grids: ["g.tif"], pins, importGlue })).toBe(
      a,
    );
    expect(glueLoads()).toBe(1);
  });

  it("reports each file's bytes against its Content-Length (R9)", async () => {
    const sizes: Record<string, number> = {
      "proj_capi.wasm": 5000,
      "proj.db": 12_000,
      "g.tif": 3000,
      "late.tif": 2500,
    };
    const content = (name: string) =>
      name === "proj_capi.mjs"
        ? STUB[name]!
        : new Uint8Array(sizes[name]!).fill(name.length);
    vi.stubGlobal("fetch", async (url: string) => {
      const bytes = content(nameOf(url));
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
    const sized = {
      "proj_capi.mjs": pins["proj_capi.mjs"],
      "proj_capi.wasm": await sha256Hex(content("proj_capi.wasm")),
      "proj.db": await sha256Hex(content("proj.db")),
    };
    const calls: [string, number, number | undefined][] = [];
    await loadProj({
      base,
      grids: ["g.tif"],
      onProgress: (...c) => calls.push(c),
      pins: sized,
      importGlue,
    });
    // A later call's grids report through that call's callback.
    const later: typeof calls = [];
    await loadProj({
      base,
      grids: ["late.tif"],
      onProgress: (...c) => later.push(c),
      pins: sized,
      importGlue,
    });
    const items = (list: typeof calls) => [...new Set(list.map((c) => c[0]))];
    // The glue is small and isn't reported, as before it was fetched here.
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
    // An ArrayBuffer, which the glue views rather than copies, holding the
    // whole body.
    const arg = (
      globalThis as {
        __glueArg?: {
          wasmBinary?: unknown;
          locateFile?: (path: string) => string;
        };
      }
    ).__glueArg;
    expect(arg?.wasmBinary).toBeInstanceOf(ArrayBuffer);
    expect((arg!.wasmBinary as ArrayBuffer).byteLength).toBe(
      sizes["proj_capi.wasm"],
    );
    // Run from a Blob URL, the glue can't resolve its files against its own
    // URL, so they are named in `base` (and never fetched: it has the bytes).
    expect(arg!.locateFile?.("proj_capi.wasm")).toBe(`${base}proj_capi.wasm`);
  });

  it.each(["proj.db", "proj_capi.wasm", "proj_capi.mjs"] as const)(
    "refuses a %s that doesn't match its pin, and loads on a retry",
    async (name) => {
      const bad = corrupt(STUB[name]!, 2);
      served[name] = bad;
      const escaped = name.replace(/\./g, "\\.");
      const refusal = loadProj({ base, pins, importGlue });
      await expect(refusal).rejects.toThrow(
        new RegExp(`^PROJ: ${escaped} SHA-256 mismatch`),
      );
      // The error names both hashes.
      await expect(refusal).rejects.toThrow(
        `PROJ: ${name} SHA-256 mismatch (expected ${pins[name]}, got ${await sha256Hex(bad)})`,
      );
      // Nothing of PROJ ran: the glue was never evaluated.
      expect(glueLoads()).toBe(0);
      // A refused load isn't memoized: with the right bytes, a retry loads.
      delete served[name];
      const api = await loadProj({ base, pins, importGlue });
      expect(api).toEqual({ marker: "api" });
      expect(glueLoads()).toBe(1);
    },
  );

  it("checks against PROJ_FILE_SHA256 by default", async () => {
    // The stubs' bytes can't match the real pins.
    const error = await loadProj({ base, importGlue }).then(
      () => undefined,
      (e: unknown) => e as Error,
    );
    const name = /^PROJ: (\S+) SHA-256 mismatch/.exec(
      error?.message ?? "",
    )?.[1];
    expect(name, error?.message).toMatch(/^proj(_capi\.mjs|_capi\.wasm|\.db)$/);
    expect(error!.message).toContain(
      `(expected ${PROJ_FILE_SHA256[name as keyof typeof PROJ_FILE_SHA256]}, got `,
    );
    expect(glueLoads()).toBe(0);
  });

  it("by default imports the glue from a Blob URL of the verified bytes", async () => {
    // Node's loader can't import blob: URLs, so this stands in for one: the
    // object URL resolves to a file holding the stub glue.
    const file = join(dir, "glue.mjs");
    writeFileSync(file, GLUE);
    const blobs: Blob[] = [];
    const created = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation((blob) => {
        blobs.push(blob as Blob);
        return pathToFileURL(file).href;
      });
    const revoked = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    expect(await loadProj({ base, pins })).toEqual({ marker: "api" });
    expect(created).toHaveBeenCalledTimes(1);
    expect(blobs[0]!.type).toBe("text/javascript");
    expect(new Uint8Array(await blobs[0]!.arrayBuffer())).toEqual(
      STUB["proj_capi.mjs"],
    );
    // The object URL is released once the module has loaded.
    expect(revoked).toHaveBeenCalledWith(pathToFileURL(file).href);
  });
});
