// The dev server's grid endpoint (scripts/projGrids.mjs), against a small
// catalog, a temporary directory and a stub fetch: a name that isn't exactly
// a current catalog key is a 404 with nothing fetched or written; a grid is
// fetched once from cdn.proj.org, verified and stored, then served from disk;
// bytes that don't match the catalog are never stored or served.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GridCatalog } from "../src/engineering/gridCatalog.ts";
import { HOSTILE_GRID_NAMES } from "./hostileGridNames.ts";
import {
  createGridCache,
  createGridHandler,
  framesDataExcludes,
  framesDataExclusion,
  gridAccess,
  gridRequest,
  projGridsPlugin,
} from "../scripts/projGrids.mjs";

const hash = (b: Uint8Array): string =>
  createHash("sha256").update(b).digest("hex");
const filled = (length: number, value: number) =>
  new Uint8Array(length).fill(value);

const GOOD = filled(4096, 7);
const TIN = new TextEncoder().encode('{"type":"tin"}');
const GOOD2 = filled(2048, 5);
const GOOD3 = filled(1024, 6);

const feature = (
  name: string,
  bytes: Uint8Array,
  extra: Record<string, unknown> = {},
) => ({
  type: "Feature",
  properties: {
    name,
    url: `https://cdn.proj.org/${name}`,
    source: "Test agency",
    file_size: bytes.length,
    sha256sum: hash(bytes),
    ...extra,
  },
  geometry: null,
});

// A hostile catalog, too: it lists names that are never servable. (One
// listing PROJ's own names or a `*.partial` can't be parsed: GridCatalog.parse
// refuses it, by the grid-name rule the endpoint shares.)
const CATALOG_JSON = JSON.stringify({
  type: "FeatureCollection",
  features: [
    feature("good.tif", GOOD),
    feature("good2.tif", GOOD2),
    feature("good3.tif", GOOD3),
    feature("tin.json", TIN),
    feature("gone.tif", GOOD, { version_removed: "1.20" }),
    feature("elsewhere.tif", GOOD, {
      url: "https://example.com/elsewhere.tif",
    }),
    feature("README.txt", GOOD),
  ],
});
const LICENSES_CSV = "filename,license\ngood.tif,CC-BY-4.0\n";
const catalog = GridCatalog.parse(CATALOG_JSON, LICENSES_CSV, "test");

/** Review Focus 1's names, and more, as request paths after the prefix. */
const HOSTILE = [
  "/../proj.db",
  "/..%2fproj.db",
  "/%2e%2e%2fmanifest.json",
  "/%2E%2E%2Fmanifest.json",
  "/%252e%252e%252fmanifest.json",
  "/proj.db",
  "/PROJ.DB",
  "/x.tif.partial",
  "/good.tif.partial",
  "/https://example.com/a.tif",
  "/https%3A%2F%2Fexample.com%2Fa.tif",
  "/nope.tif",
  "/gone.tif",
  "/elsewhere.tif",
  "/README.txt",
  "/trailing.",
  "/GOOD.TIF",
  "/good.tif/",
  "/good.tif%00",
  "/sub/good.tif",
  "/%E0%A4%A",
  "/",
  "",
  "/manifest.json",
  "/.good.tif",
  // The one rule's names (hostileGridNames.ts), but the catalog's own two
  // files, which the endpoint serves as such.
  ...HOSTILE_GRID_NAMES.filter(
    (name) => name !== "files.geojson" && name !== "copyright_and_licenses.csv",
  ).map((name) => `/${encodeURIComponent(name)}`),
];

describe("gridRequest", () => {
  it("names the catalog, the license table and current grids", () => {
    expect(gridRequest("/files.geojson", catalog)).toEqual({
      kind: "catalog",
      name: "files.geojson",
    });
    expect(gridRequest("/copyright_and_licenses.csv", catalog)).toEqual({
      kind: "licenses",
      name: "copyright_and_licenses.csv",
    });
    expect(gridRequest("/good.tif", catalog)).toEqual({
      kind: "grid",
      name: "good.tif",
    });
    expect(gridRequest("/good.tif?import", catalog)).toEqual({
      kind: "grid",
      name: "good.tif",
    });
    expect(gridRequest("/tin.json", catalog)).toEqual({
      kind: "grid",
      name: "tin.json",
    });
  });

  it.each(HOSTILE)("refuses %j", (path) => {
    expect(gridRequest(path, catalog)).toBeUndefined();
  });
});

describe("framesDataExcludes", () => {
  it.each([
    "grids",
    "grids/files.geojson",
    "grids/us_nga_egm96_15.tif",
    "GRIDS/files.geojson",
    "Grids./files.geojson",
    "grids /x.tif",
    "proj/x.tif.partial",
    "x.PARTIAL",
    "proj/us_noaa_g2018u0.tif.1234.partial",
    "proj/x.partial.",
  ])("excludes %j", (path) => {
    expect(framesDataExcludes(path)).toBe(true);
  });

  it.each([
    "manifest.json",
    "proj/files.geojson",
    "proj/us_noaa_g2018u0.tif",
    "gridsx/a.tif",
    "partial",
  ])("keeps %j", (path) => {
    expect(framesDataExcludes(path)).toBe(false);
  });
});

/** A stub fetch: records each call and answers with `answer(url, init)`. */
function stubFetch(
  answer: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return answer(url, init);
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

let dir: string;
let server: Server | undefined;
let lines: string[];
const log = (line: string) => lines.push(line);
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "proj-grids-"));
  lines = [];
});
afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server!.close(resolve));
    server = undefined;
  }
  rmSync(dir, { recursive: true, force: true });
});

/** The handler on a local HTTP server; returns its base URL. */
async function serve(fetcher: typeof fetch): Promise<string> {
  const cache = createGridCache({ dir, catalog, fetch: fetcher, log });
  const handler = createGridHandler({
    catalog,
    cache,
    catalogBytes: new TextEncoder().encode(CATALOG_JSON),
    licensesBytes: new TextEncoder().encode(LICENSES_CSV),
    log,
  });
  server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 418;
      res.end();
    }),
  );
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

describe("the grid endpoint", () => {
  it.each(HOSTILE.filter((p) => p.startsWith("/")))(
    "%j is a 404, with nothing fetched or written",
    async (path) => {
      const { calls, fetcher } = stubFetch(() => new Response(GOOD));
      const base = await serve(fetcher);
      // Sent as is: fetch would otherwise resolve the dot segments.
      const status = await new Promise<number>((resolve, reject) => {
        const req = request(
          { host: "127.0.0.1", port: new URL(base).port, path },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode!));
          },
        );
        req.on("error", reject);
        req.end();
      });
      expect(status).toBe(404);
      expect(calls).toHaveLength(0);
      expect(readdirSync(dir)).toEqual([]);
    },
  );

  it("fetches a miss once, verifies and stores it, then serves it from disk", async () => {
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const first = await fetch(`${base}/good.tif`);
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/tiff");
    expect(first.headers.get("content-length")).toBe(String(GOOD.length));
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(GOOD);
    expect(calls.map((c) => c.url)).toEqual(["https://cdn.proj.org/good.tif"]);
    expect(calls[0]!.init?.redirect).toBe("error");
    expect(new Uint8Array(readFileSync(join(dir, "good.tif")))).toEqual(GOOD);
    expect(readdirSync(dir)).toEqual(["good.tif"]);

    const second = await fetch(`${base}/good.tif`);
    expect(second.status).toBe(200);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(GOOD);
    expect(calls).toHaveLength(1);
  });

  it("answers HEAD from the catalog's size, with no body and no fetch", async () => {
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const head = await fetch(`${base}/good.tif`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("image/tiff");
    expect(head.headers.get("content-length")).toBe(String(GOOD.length));
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    expect(calls).toHaveLength(0);
    expect(readdirSync(dir)).toEqual([]);
  });

  it.each(["cross-site", "same-site"])(
    "refuses a %s request for a grid not stored: a generic 403, nothing fetched",
    async (site) => {
      const { calls, fetcher } = stubFetch(() => new Response(GOOD));
      const base = await serve(fetcher);
      for (const method of ["GET", "HEAD"]) {
        const response = await fetch(`${base}/good.tif`, {
          method,
          headers: { "Sec-Fetch-Site": site },
        });
        expect(response.status).toBe(
          site === "same-site" && method === "HEAD" ? 200 : 403,
        );
        if (response.status === 403 && method === "GET") {
          expect(await response.text()).toBe("forbidden");
        }
      }
      expect(calls).toHaveLength(0);
      expect(readdirSync(dir)).toEqual([]);
    },
  );

  it("serves a stored grid same-site but not cross-site", async () => {
    writeFileSync(join(dir, "good.tif"), GOOD);
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const sameSite = await fetch(`${base}/good.tif`, {
      headers: { "Sec-Fetch-Site": "same-site" },
    });
    expect(sameSite.status).toBe(200);
    expect(new Uint8Array(await sameSite.arrayBuffer())).toEqual(GOOD);
    const crossSite = await fetch(`${base}/good.tif`, {
      headers: { "Sec-Fetch-Site": "cross-site" },
    });
    expect(crossSite.status).toBe(403);
    expect(await crossSite.text()).toBe("forbidden");
    expect(calls).toHaveLength(0);
  });

  it("refuses a same-site request for a stored copy that doesn't match, without fetching", async () => {
    writeFileSync(join(dir, "good.tif"), filled(GOOD.length, 9));
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const response = await fetch(`${base}/good.tif`, {
      headers: { "Sec-Fetch-Site": "same-site" },
    });
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("without Sec-Fetch-Site, refuses another origin's request and fetches for this one's", async () => {
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const others: Record<string, string>[] = [
      { Origin: "https://evil.example" },
      { Referer: "https://evil.example/page" },
    ];
    for (const headers of others) {
      const response = await fetch(`${base}/good.tif`, { headers });
      expect(response.status, JSON.stringify(headers)).toBe(403);
    }
    expect(calls).toHaveLength(0);
    const response = await fetch(`${base}/good.tif`, {
      headers: { Referer: `${base}/examples/frames-explorer/` },
    });
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it.each(["same-origin", "none"])(
    "fetches on a miss for a %s request",
    async (site) => {
      const { calls, fetcher } = stubFetch(() => new Response(GOOD));
      const base = await serve(fetcher);
      const response = await fetch(`${base}/good.tif`, {
        headers: { "Sec-Fetch-Site": site },
      });
      expect(response.status).toBe(200);
      expect(calls).toHaveLength(1);
    },
  );

  it("serves a TIN grid as JSON, and the catalog and licenses from memory", async () => {
    const { calls, fetcher } = stubFetch(() => new Response(TIN));
    const base = await serve(fetcher);
    const tin = await fetch(`${base}/tin.json`);
    expect(tin.headers.get("content-type")).toBe("application/json");
    expect(await tin.text()).toBe('{"type":"tin"}');
    const geojson = await fetch(`${base}/files.geojson`);
    expect(geojson.status).toBe(200);
    expect(geojson.headers.get("content-type")).toBe("application/geo+json");
    expect(geojson.headers.get("content-length")).toBe(
      String(new TextEncoder().encode(CATALOG_JSON).length),
    );
    expect(await geojson.text()).toBe(CATALOG_JSON);
    const csv = await fetch(`${base}/copyright_and_licenses.csv`);
    expect(csv.headers.get("content-type")).toBe("text/csv");
    expect(await csv.text()).toBe(LICENSES_CSV);
    expect(calls).toHaveLength(1);
  });

  it("refuses other methods with a 405", async () => {
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const post = await fetch(`${base}/good.tif`, { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
    expect(calls).toHaveLength(0);
  });

  it("refuses upstream bytes with the wrong hash: a generic 502, no file, and the next request fetches again", async () => {
    const bad = filled(GOOD.length, 8);
    const { calls, fetcher } = stubFetch(() => new Response(bad));
    const base = await serve(fetcher);
    const first = await fetch(`${base}/good.tif`);
    expect(first.status).toBe(502);
    expect(await first.text()).toBe("grid unavailable");
    expect(readdirSync(dir)).toEqual([]);
    // The details go to the log: the file and both hashes.
    const detail = lines.join("\n");
    expect(detail).toContain("good.tif");
    expect(detail).toContain(hash(GOOD));
    expect(detail).toContain(hash(bad));

    const second = await fetch(`${base}/good.tif`);
    expect(second.status).toBe(502);
    expect(calls).toHaveLength(2);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("aborts upstream past the catalog's byte count", async () => {
    let cancelled = false;
    let sent = 0;
    const endless = () =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(c) {
            sent += 1024;
            c.enqueue(filled(1024, 7));
          },
          cancel() {
            cancelled = true;
          },
        }),
      );
    const { fetcher } = stubFetch(endless);
    const base = await serve(fetcher);
    const response = await fetch(`${base}/good.tif`);
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("grid unavailable");
    expect(cancelled).toBe(true);
    expect(sent).toBeLessThan(GOOD.length + 4 * 1024);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("refetches over a stored copy that doesn't match the catalog", async () => {
    writeFileSync(join(dir, "good.tif"), filled(GOOD.length, 9));
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    const response = await fetch(`${base}/good.tif`);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(GOOD);
    expect(calls).toHaveLength(1);
    expect(new Uint8Array(readFileSync(join(dir, "good.tif")))).toEqual(GOOD);
  });

  it("never serves a stored copy that doesn't match when upstream fails too", async () => {
    const corrupt = filled(GOOD.length, 9);
    writeFileSync(join(dir, "good.tif"), corrupt);
    const { fetcher } = stubFetch(() => new Response(null, { status: 503 }));
    const base = await serve(fetcher);
    const response = await fetch(`${base}/good.tif`);
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("grid unavailable");
  });

  it("re-verifies a stored copy that changed after it was verified", async () => {
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const base = await serve(fetcher);
    expect((await fetch(`${base}/good.tif`)).status).toBe(200);
    writeFileSync(join(dir, "good.tif"), filled(GOOD.length + 1, 9));
    const again = await fetch(`${base}/good.tif`);
    expect(again.status).toBe(200);
    expect(new Uint8Array(await again.arrayBuffer())).toEqual(GOOD);
    expect(calls).toHaveLength(2);
  });

  it("doesn't follow a redirect", async () => {
    // A real server that redirects, reached through the stub (the origin
    // is fixed), with Node's own fetch and the options it was given.
    let followed = 0;
    const target = createServer((req, res) => {
      if (req.url === "/moved") {
        followed++;
        res.end(Buffer.from(GOOD));
        return;
      }
      res.statusCode = 302;
      res.setHeader("Location", "/moved");
      res.end();
    });
    await new Promise<void>((resolve) =>
      target.listen(0, "127.0.0.1", resolve),
    );
    const port = (target.address() as AddressInfo).port;
    try {
      const { calls, fetcher } = stubFetch((_url, init) =>
        fetch(`http://127.0.0.1:${port}/grid`, init),
      );
      const base = await serve(fetcher);
      const response = await fetch(`${base}/good.tif`);
      expect(response.status).toBe(502);
      expect(await response.text()).toBe("grid unavailable");
      expect(calls).toHaveLength(1);
      expect(followed).toBe(0);
      expect(readdirSync(dir)).toEqual([]);
    } finally {
      await new Promise((resolve) => target.close(resolve));
    }
  });
});

describe("gridAccess", () => {
  const HOST = "localhost:5190";
  it.each([
    ["same-origin", "fetch"],
    ["none", "fetch"],
    ["same-site", "stored"],
    ["cross-site", "none"],
    ["", "none"],
    ["bogus", "none"],
    [["same-origin", "cross-site"], "none"],
  ] as const)("Sec-Fetch-Site %j gives %j", (site, access) => {
    const headers = {
      host: HOST,
      "sec-fetch-site": site as string | string[],
    };
    // Origin and Referer don't override it, nor does a loopback client.
    expect(gridAccess(headers, "127.0.0.1")).toBe(access);
    expect(
      gridAccess(
        { ...headers, origin: "http://localhost:5190" },
        "203.0.113.9",
      ),
    ).toBe(access);
  });

  // Without Sec-Fetch-Site: curl, Node, and Safari before 16.4 or Firefox
  // before 90.
  it.each([
    // Neither Origin nor Referer: only a client on this machine fetches.
    [{}, "127.0.0.1", "fetch"],
    [{}, "127.4.5.6", "fetch"],
    [{}, "::1", "fetch"],
    [{}, "::ffff:127.0.0.1", "fetch"],
    [{}, "203.0.113.9", "stored"],
    [{}, "::ffff:192.168.1.2", "stored"],
    [{}, undefined, "stored"],
    // This origin, by Origin or Referer, fetches from anywhere.
    [{ origin: "http://localhost:5190" }, "203.0.113.9", "fetch"],
    [
      { referer: "http://localhost:5190/examples/frames-explorer/" },
      "203.0.113.9",
      "fetch",
    ],
    [{ referer: "https://LOCALHOST:5190/x" }, "127.0.0.1", "fetch"],
    // Another origin, by either, is refused, even from this machine.
    [{ origin: "https://evil.example" }, "127.0.0.1", "none"],
    [{ referer: "https://evil.example/page" }, "127.0.0.1", "none"],
    [{ origin: "http://localhost:5191" }, "127.0.0.1", "none"],
    [{ origin: "null" }, "127.0.0.1", "none"],
    [{ origin: "not a url" }, "127.0.0.1", "none"],
    [{ referer: "file:///Users/x/page.html" }, "127.0.0.1", "none"],
    [
      { origin: ["http://localhost:5190", "http://localhost:5190"] },
      "127.0.0.1",
      "none",
    ],
    [
      { origin: "http://localhost:5190", referer: "https://evil.example/" },
      "127.0.0.1",
      "none",
    ],
  ] as const)("%j from %j gives %j", (extra, address, access) => {
    const headers = { host: HOST, ...extra } as Record<
      string,
      string | string[] | undefined
    >;
    expect(gridAccess(headers, address)).toBe(access);
  });

  it("refuses an Origin or Referer when the request has no Host to compare", () => {
    expect(gridAccess({ origin: "http://localhost:5190" }, "127.0.0.1")).toBe(
      "none",
    );
  });
});

describe("framesDataExclusion", () => {
  let store: string;
  let outside: string;
  beforeEach(() => {
    store = join(dir, "store");
    outside = join(dir, "outside");
    mkdirSync(join(store, "grids"), { recursive: true });
    mkdirSync(join(store, "proj"), { recursive: true });
    mkdirSync(outside);
    writeFileSync(join(store, "grids", "files.geojson"), "{}");
    writeFileSync(join(store, "proj", "a.tif"), "a");
    writeFileSync(join(store, "proj", "x.tif.1234.partial"), "x");
    writeFileSync(join(store, "manifest.json"), "{}");
    writeFileSync(join(outside, "secret.txt"), "s");
  });

  /** Skips the test unless the file system resolves `path` (folding it). */
  const needs = (path: string, skip: (note: string) => void) => {
    if (!existsSync(path)) {
      skip(`this file system doesn't resolve ${path}`);
    }
  };
  const link = (target: string, path: string, skip: (note: string) => void) => {
    try {
      symlinkSync(target, path);
    } catch {
      skip("this file system can't make a symlink here");
    }
  };

  it("keeps the store's other files, and a path that doesn't exist", () => {
    const exclude = framesDataExclusion(store);
    expect(exclude(join(store, "manifest.json"))).toBe(false);
    expect(exclude(join(store, "proj", "a.tif"))).toBe(false);
    expect(exclude(join(store, "proj", "missing.tif"))).toBe(false);
  });

  it("refuses grids/ and *.partial by name, existing or not", () => {
    const exclude = framesDataExclusion(store);
    expect(exclude(join(store, "grids", "files.geojson"))).toBe(true);
    expect(exclude(join(store, "grids", "missing.tif"))).toBe(true);
    expect(exclude(join(store, "proj", "x.tif.1234.partial"))).toBe(true);
    expect(exclude(join(store, "grids::$INDEX_ALLOCATION", "x"))).toBe(true);
  });

  it("refuses gridſ/ where the file system folds it to grids/", (ctx) => {
    const path = join(store, "grid\u017f", "files.geojson");
    needs(path, (note) => ctx.skip(note));
    // By name it passes: only the real path catches it.
    expect(framesDataExcludes("grid\u017f/files.geojson")).toBe(false);
    expect(framesDataExclusion(store)(path)).toBe(true);
  });

  it("refuses GRIDS/ where the file system ignores case", (ctx) => {
    const path = join(store, "GRIDS", "files.geojson");
    needs(path, (note) => ctx.skip(note));
    expect(framesDataExclusion(store)(path)).toBe(true);
  });

  it("refuses a symlink into grids/", (ctx) => {
    const path = join(store, "proj", "catalog.json");
    link(join(store, "grids", "files.geojson"), path, (note) => ctx.skip(note));
    expect(framesDataExclusion(store)(path)).toBe(true);
  });

  it("refuses a symlinked directory that leads into grids/", (ctx) => {
    const path = join(store, "g");
    link(join(store, "grids"), path, (note) => ctx.skip(note));
    expect(framesDataExclusion(store)(join(path, "files.geojson"))).toBe(true);
  });

  it("refuses a symlink to a *.partial", (ctx) => {
    const path = join(store, "proj", "b.tif");
    link(join(store, "proj", "x.tif.1234.partial"), path, (note) =>
      ctx.skip(note),
    );
    expect(framesDataExclusion(store)(path)).toBe(true);
  });

  it("refuses a symlink out of the store", (ctx) => {
    const path = join(store, "proj", "c.txt");
    link(join(outside, "secret.txt"), path, (note) => ctx.skip(note));
    expect(framesDataExclusion(store)(path)).toBe(true);
  });
});

describe("createGridCache", () => {
  it("runs at most two upstream fetches at once, queueing the rest", async () => {
    const bodies: Record<string, Uint8Array<ArrayBuffer>> = {
      "https://cdn.proj.org/good.tif": GOOD,
      "https://cdn.proj.org/good2.tif": GOOD2,
      "https://cdn.proj.org/good3.tif": GOOD3,
    };
    let inFlight = 0;
    let most = 0;
    const releases: (() => void)[] = [];
    const { calls, fetcher } = stubFetch(async (url) => {
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise<void>((resolve) => releases.push(resolve));
      inFlight--;
      return new Response(bodies[url]);
    });
    const cache = createGridCache({ dir, catalog, fetch: fetcher, log });
    const all = Promise.all(
      ["good.tif", "good2.tif", "good3.tif"].map((n) => cache.ensure(n)),
    );
    const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
    await settle();
    expect(calls).toHaveLength(2);
    releases.shift()!();
    await settle();
    expect(calls).toHaveLength(3);
    while (releases.length > 0) {
      releases.shift()!();
      await settle();
    }
    expect(await all).toEqual(
      ["good.tif", "good2.tif", "good3.tif"].map((n) => join(dir, n)),
    );
    expect(most).toBe(2);
  });

  it("frees a fetch's slot when it fails", async () => {
    const { calls, fetcher } = stubFetch(
      () => new Response(null, { status: 503 }),
    );
    const cache = createGridCache({
      dir,
      catalog,
      fetch: fetcher,
      log,
      maxFetches: 1,
    });
    await expect(cache.ensure("good.tif")).rejects.toThrow();
    await expect(cache.ensure("good2.tif")).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it("with { fetch: false }, serves a stored copy and refuses a miss", async () => {
    writeFileSync(join(dir, "good.tif"), GOOD);
    const { calls, fetcher } = stubFetch(() => new Response(GOOD2));
    const cache = createGridCache({ dir, catalog, fetch: fetcher, log });
    expect(await cache.ensure("good.tif", { fetch: false })).toBe(
      join(dir, "good.tif"),
    );
    await expect(cache.ensure("good2.tif", { fetch: false })).rejects.toThrow(
      /may not fetch/,
    );
    expect(calls).toHaveLength(0);
    expect(existsSync(join(dir, "good2.tif"))).toBe(false);
  });

  it("shares one fetch between concurrent ensure calls", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { calls, fetcher } = stubFetch(async () => {
      await gate;
      return new Response(GOOD);
    });
    const cache = createGridCache({ dir, catalog, fetch: fetcher, log });
    const a = cache.ensure("good.tif");
    const b = cache.ensure("good.tif");
    release();
    expect(await a).toBe(join(dir, "good.tif"));
    expect(await b).toBe(join(dir, "good.tif"));
    expect(calls).toHaveLength(1);
  });

  it.each([
    "nope.tif",
    "gone.tif",
    "elsewhere.tif",
    "README.txt",
    ...HOSTILE_GRID_NAMES,
  ])("refuses %j without fetching or writing", async (name) => {
    const { calls, fetcher } = stubFetch(() => new Response(GOOD));
    const cache = createGridCache({ dir, catalog, fetch: fetcher, log });
    await expect(cache.ensure(name)).rejects.toThrow();
    expect(calls).toHaveLength(0);
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe("projGridsPlugin", () => {
  const fakeServer = () => {
    const use = vi.fn();
    const error = vi.fn();
    return {
      server: {
        middlewares: { use },
        config: { logger: { info: vi.fn(), warn: vi.fn(), error } },
      },
      use,
      error,
    };
  };

  it("doesn't mount when the catalog doesn't match its pin, and logs why", () => {
    writeFileSync(join(dir, "files.geojson"), CATALOG_JSON);
    writeFileSync(join(dir, "copyright_and_licenses.csv"), LICENSES_CSV);
    const { server: fake, use, error } = fakeServer();
    const plugin = projGridsPlugin("/proj-grids", dir);
    (plugin.configureServer as (s: unknown) => void)(fake);
    expect(use).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    const message = String(error.mock.calls[0]![0]);
    expect(message).toContain("files.geojson");
    expect(message).toContain(hash(new TextEncoder().encode(CATALOG_JSON)));
  });

  it("doesn't mount without the license table", () => {
    writeFileSync(join(dir, "files.geojson"), CATALOG_JSON);
    const { server: fake, use, error } = fakeServer();
    const plugin = projGridsPlugin("/proj-grids", dir);
    (plugin.configureServer as (s: unknown) => void)(fake);
    expect(use).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(existsSync(join(dir, "copyright_and_licenses.csv"))).toBe(false);
  });
});
