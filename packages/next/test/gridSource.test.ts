// gridSource and loadGrids on the browser path, against a stub glue, a stub
// fetch and a stub PROJ (no PROJ data needed): the catalog is checked against
// its pins before it is parsed, every grid name is checked against it before
// anything is fetched, and a grid's bytes are checked against its catalog
// entry before they are written to the module's file system. PROJ's log level
// is lowered while operations are listed, and put back after.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listOperations, resolveOperation } from "../src/engineering/crs.ts";
import {
  gridSource,
  loadedGrids,
  loadGrids,
  loadProj,
  type ProjApi,
} from "../src/engineering/proj.ts";
import { PROJ_DATA_CATALOG } from "../src/engineering/projPins.ts";
import { sha256Hex } from "../src/io/sha256.ts";

const encode = (text: string) => new TextEncoder().encode(text);

// A module whose FS records what is written, and whose emnapiInit returns the
// test's stub PROJ.
const GLUE = `export default async () => ({
  FS: { writeFile: (path, data) => globalThis.__writes.push([path, data.length]) },
  emnapiInit: () => globalThis.__api,
});
`;

const filled = (length: number, value: number) =>
  new Uint8Array(length).fill(value);

/** The grids the stub catalog lists, and their bytes. */
const GRIDS: Record<string, Uint8Array> = {
  "g.tif": filled(100, 1),
  "late.tif": filled(50, 2),
  "old.tif": filled(10, 3),
};

const feature = async (name: string, removed = false) => ({
  type: "Feature",
  properties: {
    name,
    url: `https://cdn.proj.org/${name}`,
    sha256sum: await sha256Hex(GRIDS[name]!),
    file_size: GRIDS[name]!.length,
    source: "Stub Agency",
    version_added: "1.0",
    version_removed: removed ? "1.1" : null,
  },
  geometry: null,
});

const CATALOG = encode(
  JSON.stringify({
    type: "FeatureCollection",
    features: [
      await feature("g.tif"),
      await feature("late.tif"),
      await feature("old.tif", true),
    ],
  }),
);
const LICENSES = encode("filename,license\ng.tif,CC-BY-4.0\n");

/** Each stubbed file's bytes. */
const STUB: Record<string, Uint8Array> = {
  "proj_capi.mjs": encode(GLUE),
  "proj_capi.wasm": new Uint8Array([0, 0x61, 0x73, 0x6d]),
  "proj.db": new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65]),
  "files.geojson": CATALOG,
  "copyright_and_licenses.csv": LICENSES,
  ...GRIDS,
};

const pins = {
  "proj_capi.mjs": await sha256Hex(STUB["proj_capi.mjs"]!),
  "proj_capi.wasm": await sha256Hex(STUB["proj_capi.wasm"]!),
  "proj.db": await sha256Hex(STUB["proj.db"]!),
};
const catalogPins = {
  catalogSha256: await sha256Hex(CATALOG),
  licensesSha256: await sha256Hex(LICENSES),
};

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

/** PROJ's log levels as the stub keeps them (the binding's values). */
const PJ_LOG_NONE = 0;
const PJ_LOG_ERROR = 1;

describe("gridSource and loadGrids (browser path)", () => {
  let dir: string;
  let base: string;
  const urls: string[] = [];
  /** What the stub fetch serves, by file name (STUB otherwise). */
  let served: Record<string, Uint8Array>;
  /** [path, byte count] for each FS.writeFile. */
  let writes: [string, number][];
  /** Every proj_log_level call's argument, and the stub's current level. */
  let logCalls: number[];
  let level: number;
  /** What the stub's one candidate says about its grid: PROJ's cached answer. */
  let projSaysAvailable: boolean;
  let listFails: boolean;
  /** Where the stub's PROJ says it found a grid, when not by its bare name. */
  let foundAs: string | undefined;

  const stubApi = () =>
    ({
      PJ_LOG_NONE,
      PJ_PROJ_5: 1,
      proj_log_level: (next: number) => {
        logCalls.push(next);
        const previous = level;
        level = next;
        return previous;
      },
      // PROJ finds a grid where the module's file system has it, and names
      // it, as the WebAssembly build does, relative to the working directory.
      proj_grid_info: (name: string) => {
        const found = writes.some(([path]) => path === `/${name}`);
        return {
          gridname: found ? name : "",
          filename: found ? (foundAs ?? name) : "",
          format: found ? "gtiff" : "missing",
        };
      },
      proj_create: () => ({}),
      proj_get_name: () => "Candidate",
      proj_as_proj_string: () => "+proj=noop",
      proj_normalize_for_visualization: (o: unknown) => o,
      proj_create_operation_factory_context: () => ({}),
      proj_operation_factory_context_set_grid_availability_use: () => undefined,
      PROJ_GRID_AVAILABILITY_IGNORED: 2,
      proj_create_operations: () => {
        if (listFails) {
          throw new Error("out of memory");
        }
        return { length: () => 1, get: () => ({}) };
      },
      proj_coordoperation_get_grid_used_count: () => 1,
      proj_coordoperation_get_grid_used: () => ({
        short_name: "g.tif",
        available: projSaysAvailable,
      }),
      proj_coordoperation_get_accuracy: () => 0.5,
      // PROJ's answer, made when it first looked: no, for want of the grid.
      proj_coordoperation_is_instantiable: () => projSaysAvailable,
      proj_get_area_of_use: () => null,
      proj_coord: (x: number, y: number, z: number, t: number) => ({
        v: [x, y, z, t],
      }),
      proj_trans: (_: unknown, __: unknown, c: { v: number[] }) => c,
      PJ_FWD: 1,
      PJ_INV: -1,
    }) as unknown as ProjApi;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "frames-grids-"));
    base = pathToFileURL(`${dir}/`).href;
    urls.length = 0;
    served = {};
    writes = [];
    logCalls = [];
    level = PJ_LOG_ERROR;
    projSaysAvailable = false;
    listFails = false;
    foundAs = undefined;
    vi.stubGlobal("window", {});
    vi.stubGlobal("__writes", writes);
    vi.stubGlobal("__api", stubApi());
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      const bytes = served[nameOf(url)] ?? STUB[nameOf(url)];
      return bytes === undefined
        ? { ok: false, status: 404 }
        : { ok: true, arrayBuffer: async () => bytes.slice().buffer };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  const load = () => loadProj({ base, pins, importGlue });
  const source = () => gridSource({ base, ...catalogPins });
  const fetched = (name: string) => urls.filter((u) => nameOf(u) === name);
  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (e: unknown) => e as Error,
    );

  describe("gridSource", () => {
    it("parses the catalog it was given the hashes of, once per base", async () => {
      const a = await source();
      expect(a.base).toBe(base);
      expect(a.catalog.get("g.tif")?.bytes).toBe(100);
      expect(a.catalog.credit("g.tif")).toBe(
        `Stub Agency (CC-BY-4.0), via PROJ-data ${PROJ_DATA_CATALOG.version}`,
      );
      // The same base, spelled without its slash, shares the first read.
      expect(
        await gridSource({ base: base.slice(0, -1), ...catalogPins }),
      ).toBe(a);
      expect(fetched("files.geojson")).toHaveLength(1);
      expect(fetched("copyright_and_licenses.csv")).toHaveLength(1);
    });

    it("credits an overridden catalog with its own version", async () => {
      const other = await gridSource({ base, ...catalogPins, version: "9.9" });
      expect(other.catalog.version).toBe("9.9");
      expect(other.catalog.credit("g.tif")).toMatch(/via PROJ-data 9\.9$/);
    });

    it.each(["files.geojson", "copyright_and_licenses.csv"])(
      "refuses a %s with one byte changed, naming both hashes (Review Focus 2), and reads it again on a retry",
      async (name) => {
        const bad = corrupt(STUB[name]!, 3);
        served[name] = bad;
        const expected =
          name === "files.geojson"
            ? catalogPins.catalogSha256
            : catalogPins.licensesSha256;
        const error = await rejection(source());
        expect(error?.message).toBe(
          `PROJ: ${name} SHA-256 mismatch (expected ${expected}, got ${await sha256Hex(bad)})`,
        );
        delete served[name];
        expect((await source()).catalog.get("g.tif")).toBeDefined();
      },
    );

    it("checks against PROJ_DATA_CATALOG by default", async () => {
      const error = await rejection(gridSource({ base }));
      expect(error?.message).toMatch(
        new RegExp(
          `^PROJ: (files\\.geojson|copyright_and_licenses\\.csv) SHA-256 mismatch \\(expected (${PROJ_DATA_CATALOG.catalogSha256}|${PROJ_DATA_CATALOG.licensesSha256}), got `,
        ),
      );
    });

    it("refuses a version without the catalog hash it belongs to", async () => {
      await expect(gridSource({ base, version: "9.9" })).rejects.toThrow(
        /version.*catalogSha256/,
      );
    });

    it("reports the catalog's bytes through onProgress", async () => {
      const items: string[] = [];
      await gridSource({
        base,
        ...catalogPins,
        onProgress: (item) => items.push(item),
      });
      expect([...new Set(items)].sort()).toEqual([
        "copyright_and_licenses.csv",
        "files.geojson",
      ]);
    });
  });

  describe("loadGrids", () => {
    it("loads a catalog grid into the module's file system, once", async () => {
      const P = await load();
      const grids = await source();
      expect(loadedGrids(P).size).toBe(0);
      await loadGrids(P, grids, ["g.tif"]);
      expect(writes).toContainEqual(["/g.tif", 100]);
      expect([...loadedGrids(P)]).toEqual(["g.tif"]);
      // A name loaded already is a no-op.
      await loadGrids(P, grids, ["g.tif"]);
      expect(fetched("g.tif")).toHaveLength(1);
      expect(writes.filter(([path]) => path === "/g.tif")).toHaveLength(1);
    });

    it.each([
      ["../proj.db", /not a plain grid file name/],
      ["proj.db", /proj\.db is the name of one of PROJ's own files/],
      ["nope.tif", /nope\.tif is not in the PROJ-data .* catalog/],
      ["old.tif", /old\.tif is marked removed/],
      ["https://example.com/g.tif", /not a plain grid file name/],
      [".hidden.tif", /not a plain grid file name/],
      // Windows drops a trailing dot: this would be proj.db.
      ["proj.db.", /not a plain grid file name/],
      ["g.tif.", /not a plain grid file name/],
      ["PROJ.DB", /PROJ\.DB is the name of one of PROJ's own files/],
      ["Proj.Ini", /Proj\.Ini is the name of one of PROJ's own files/],
      ["g.tif.PARTIAL", /is the name of one of PROJ's own files/],
    ])("rejects %s before anything is fetched", async (name, message) => {
      const P = await load();
      const grids = await source();
      urls.length = 0;
      await expect(loadGrids(P, grids, ["g.tif", name])).rejects.toThrow(
        message,
      );
      // Not even the good name in the same call.
      expect(urls).toEqual([]);
      expect(writes.filter(([path]) => path !== "/proj.db")).toEqual([]);
    });

    it.each([
      [
        "truncated",
        (b: Uint8Array) => b.slice(0, 99),
        async (bad: Uint8Array, expected: string) =>
          `PROJ: g.tif is 99 bytes, not the catalog's 100 (SHA-256 expected ${expected}, got ${await sha256Hex(bad)})`,
      ],
      [
        // Reading stops at the catalog's size, so there is no whole hash.
        "longer",
        (b: Uint8Array) => Uint8Array.from([...b, 0]),
        async (_: Uint8Array, expected: string) =>
          `PROJ: g.tif is over the catalog's 100 bytes (SHA-256 expected ${expected}); the rest isn't read`,
      ],
    ])(
      "refuses %s bytes, writes nothing, and loads on a retry",
      async (_, change, message) => {
        const P = await load();
        const grids = await source();
        const bad = change(GRIDS["g.tif"]!);
        served["g.tif"] = bad;
        const error = await rejection(loadGrids(P, grids, ["g.tif"]));
        expect(error?.message).toBe(
          await message(bad, grids.catalog.get("g.tif")!.sha256),
        );
        expect(writes.some(([path]) => path === "/g.tif")).toBe(false);
        expect(loadedGrids(P).has("g.tif")).toBe(false);
        delete served["g.tif"];
        await loadGrids(P, grids, ["g.tif"]);
        expect(loadedGrids(P).has("g.tif")).toBe(true);
      },
    );

    it("refuses bytes of the right length and the wrong hash, writing nothing", async () => {
      const P = await load();
      const grids = await source();
      const bad = corrupt(GRIDS["g.tif"]!, 50);
      served["g.tif"] = bad;
      const error = await rejection(loadGrids(P, grids, ["g.tif"]));
      expect(error?.message).toBe(
        `PROJ: g.tif SHA-256 mismatch (expected ${grids.catalog.get("g.tif")!.sha256}, got ${await sha256Hex(bad)})`,
      );
      expect(writes.some(([path]) => path === "/g.tif")).toBe(false);
      expect(loadedGrids(P).size).toBe(0);
    });

    it("shares one fetch between concurrent calls for one name", async () => {
      const P = await load();
      const grids = await source();
      await Promise.all([
        loadGrids(P, grids, ["g.tif"]),
        loadGrids(P, grids, ["g.tif", "late.tif"]),
        loadGrids(P, grids, ["g.tif", "g.tif"]),
      ]);
      expect(fetched("g.tif")).toHaveLength(1);
      expect(fetched("late.tif")).toHaveLength(1);
      expect(writes.filter(([path]) => path === "/g.tif")).toHaveLength(1);
      expect([...loadedGrids(P)].sort()).toEqual(["g.tif", "late.tif"]);
    });

    it("reports each grid's bytes through the call's onProgress", async () => {
      const P = await load();
      const grids = await source();
      const calls: [string, number, number | undefined][] = [];
      await loadGrids(P, grids, ["late.tif"], {
        onProgress: (...c) => calls.push(c),
      });
      expect(calls.at(-1)).toEqual(["late.tif", 50, undefined]);
    });

    it("refuses PROJ's own names, even from an overridden catalog that lists them", async () => {
      const reserved = [
        "proj.db",
        "proj_capi.node",
        "proj_capi.wasm",
        "proj_capi.mjs",
        "owner",
        "files.geojson",
        "copyright_and_licenses.csv",
        "g.tif.partial",
        "proj.ini",
        "ITRF2014",
        "epsg",
        "tmp",
        "dev",
        // In any case: macOS's and Windows's file systems ignore it.
        "PROJ.DB",
        "Owner",
        "Proj_Capi.node",
        "g.tif.Partial",
        "PROJ.INI",
      ];
      const bytes = filled(10, 9);
      const listing = encode(
        JSON.stringify({
          type: "FeatureCollection",
          features: reserved.map((name) => ({
            type: "Feature",
            properties: {
              name,
              url: `https://cdn.proj.org/${name}`,
              sha256sum: "0".repeat(64),
              file_size: bytes.length,
              source: "Stub Agency",
            },
            geometry: null,
          })),
        }),
      );
      const other = `${base}other/`;
      served["files.geojson"] = listing;
      const P = await load();
      const grids = await gridSource({
        base: other,
        catalogSha256: await sha256Hex(listing),
        licensesSha256: catalogPins.licensesSha256,
        version: "9.9",
      });
      expect(grids.catalog.get("proj.db")).toBeDefined();
      urls.length = 0;
      for (const name of reserved) {
        await expect(loadGrids(P, grids, [name]), name).rejects.toThrow(
          `PROJ: ${name} is the name of one of PROJ's own files, not a grid's`,
        );
      }
      expect(urls).toEqual([]);
      expect(writes.filter(([path]) => path !== "/proj.db")).toEqual([]);
      expect(writes.filter(([path]) => path === "/proj.db")).toHaveLength(1);
    });

    it("refuses a grid PROJ finds anywhere but where it was written", async () => {
      const P = await load();
      const grids = await source();
      foundAs = "/home/web_user/.local/share/proj/g.tif";
      await expect(loadGrids(P, grids, ["g.tif"])).rejects.toThrow(
        "PROJ: g.tif was loaded at /g.tif, but PROJ finds /home/web_user/.local/share/proj/g.tif",
      );
      expect(loadedGrids(P).has("g.tif")).toBe(false);
      // By its absolute path, it counts.
      foundAs = "/g.tif";
      await loadGrids(P, grids, ["g.tif"]);
      expect(loadedGrids(P).has("g.tif")).toBe(true);
    });

    it("refuses a ProjApi that loadProj didn't return", async () => {
      const grids = await source();
      await expect(loadGrids(stubApi(), grids, ["g.tif"])).rejects.toThrow(
        /loadProj/,
      );
      expect(fetched("g.tif")).toEqual([]);
      expect(loadedGrids(stubApi()).size).toBe(0);
    });

    it("loads loadProj's grids through the catalog in base", async () => {
      const P = await loadProj({
        base,
        grids: ["g.tif"],
        pins,
        importGlue,
        catalogPins,
      });
      expect(loadedGrids(P).has("g.tif")).toBe(true);
      await expect(
        loadProj({ base, grids: ["nope.tif"], pins, importGlue, catalogPins }),
      ).rejects.toThrow(/nope\.tif is not in the PROJ-data/);
    });
  });

  describe("listing operations", () => {
    it("lowers PROJ's log level to PJ_LOG_NONE while listing, and restores it", async () => {
      const P = await load();
      const ref = { format: "wkid", authority: "EPSG", wkid: 2227 } as const;
      listOperations(P, ref, ref);
      expect(logCalls).toEqual([PJ_LOG_NONE, PJ_LOG_ERROR]);
      expect(level).toBe(PJ_LOG_ERROR);
      logCalls.length = 0;
      expect(() => resolveOperation(P, ref, "EPSG:4979")).toThrow(/g\.tif/);
      expect(logCalls).toEqual([PJ_LOG_NONE, PJ_LOG_ERROR]);
      // Restored when the listing fails, too.
      listFails = true;
      logCalls.length = 0;
      expect(() => listOperations(P, ref, ref)).toThrow(
        /could not list the operations/,
      );
      expect(logCalls).toEqual([PJ_LOG_NONE, PJ_LOG_ERROR]);
      expect(level).toBe(PJ_LOG_ERROR);
    });

    it("counts a grid available only once loadGrids has loaded it", async () => {
      const P = await load();
      const ref = { format: "wkid", authority: "EPSG", wkid: 2227 } as const;
      // PROJ says available (a grid it found somewhere of its own), but
      // loadGrids never loaded it: missing.
      projSaysAvailable = true;
      expect(listOperations(P, ref, ref)[0]!.missingGrids).toEqual(["g.tif"]);
      expect(() => resolveOperation(P, ref, "EPSG:4979")).toThrow(
        /missing: g\.tif/,
      );
      // PROJ's answer from before the load (it caches "unavailable" and
      // "not instantiable" per context), and the grid loaded since: PROJ
      // finds it now, so it counts.
      projSaysAvailable = false;
      await loadGrids(P, await source(), ["g.tif"]);
      const [candidate] = listOperations(P, ref, ref);
      expect(candidate!.missingGrids).toEqual([]);
      expect(candidate!.instantiable).toBe(true);
      const op = resolveOperation(P, ref, "EPSG:4979");
      expect(op.grids).toEqual(["g.tif"]);
      expect(op.accuracy).toBe(0.5);
    });

    it("tries the next candidate when one counted against PROJ's cached no still can't be created", async () => {
      // Candidate 0 reads g.tif, which PROJ cached as unavailable; PROJ can't
      // create its string even now. Candidate 1 needs no grid.
      const api = stubApi() as unknown as Record<string, unknown>;
      vi.stubGlobal("__api", {
        ...api,
        proj_create_operations: () => ({
          length: () => 2,
          get: (i: number) => ({ i }),
        }),
        proj_coordoperation_get_grid_used_count: (c: { i: number }) =>
          c.i === 0 ? 1 : 0,
        proj_coordoperation_is_instantiable: (c: { i: number }) => c.i === 1,
        proj_as_proj_string: (o: { i?: number; def?: string }) =>
          o.i !== undefined
            ? `+proj=cand${o.i}`
            : o.def === "+proj=cand0"
              ? null
              : (o.def ?? "+proj=noop"),
        proj_create: (def: string) => ({ def }),
        proj_get_name: (o: { i?: number; def?: string }) =>
          o.def === "+proj=cand0" ? null : `Candidate ${o.i ?? o.def}`,
      });
      const P = await load();
      await loadGrids(P, await source(), ["g.tif"]);
      const ref = { format: "wkid", authority: "EPSG", wkid: 2227 } as const;
      const [first, second] = listOperations(P, ref, ref);
      expect(first!.missingGrids).toEqual([]);
      expect(first!.instantiable).toBe(false);
      expect(second!.instantiable).toBe(true);
      expect(resolveOperation(P, ref, "EPSG:4979").pipeline).toBe(
        "+proj=cand1",
      );
    });
  });
});
