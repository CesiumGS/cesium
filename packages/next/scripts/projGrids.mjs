// The dev server's grid endpoint (`/proj-grids/`): PROJ-data's pinned catalog,
// its license table and the grids it lists, from the store's `grids/`. A grid
// not stored yet is fetched from cdn.proj.org the first time a page asks for
// it, through the one verified fetcher (verifiedDownload.mjs). Only a name
// that is exactly a current catalog key is served or fetched: no path
// traversal, no other origin, no redirects, the catalog's size as a cap, and
// error bodies that say nothing (the details go to the server log).
import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, join, relative as relativePath, sep } from "node:path";
import { pipeline } from "node:stream";
import {
  GridCatalog,
  isPlainGridName,
} from "../src/engineering/gridCatalog.ts";
import { PROJ_DATA_CATALOG } from "../src/engineering/projPins.ts";
import { verifiedDownload } from "./verifiedDownload.mjs";

/** The one origin grids are fetched from. */
const ORIGIN = "https://cdn.proj.org/";
const CATALOG = "files.geojson";
const LICENSES = "copyright_and_licenses.csv";

/** The grid files PROJ reads, by extension: GeoTIFF grids and JSON TINs. */
const GRID_TYPES = { ".tif": "image/tiff", ".json": "application/json" };
const CATALOG_TYPES = {
  catalog: "application/geo+json",
  licenses: "text/csv",
};

/**
 * The catalog entry for `name` when it may be served: a grid's name by the
 * library's one rule (`isPlainGridName`: a bare file name ending in a letter
 * or digit, no "..", none of PROJ's own file names or a `.partial` in any
 * case), a `.tif` or `.json`, and exactly a key of the catalog that isn't
 * removed and whose URL is cdn.proj.org's for that name.
 *
 * @param {string} name
 * @param {GridCatalog} catalog
 */
function servableGrid(name, catalog) {
  if (!isPlainGridName(name)) {
    return undefined;
  }
  if (!Object.hasOwn(GRID_TYPES, extname(name))) {
    return undefined;
  }
  const entry = catalog.get(name);
  if (
    !entry ||
    entry.name !== name ||
    entry.removed ||
    entry.url !== `${ORIGIN}${name}`
  ) {
    return undefined;
  }
  return entry;
}

/**
 * What a request path after the prefix (`/<name>`, a query ignored) asks
 * for, or undefined when it names nothing servable. The path is decoded
 * once; a decoding error is undefined.
 *
 * @param {string} urlPath
 * @param {GridCatalog} catalog
 * @returns {{ kind: "catalog" | "licenses" | "grid"; name: string } | undefined}
 */
export function gridRequest(urlPath, catalog) {
  const raw = urlPath.split("?")[0] ?? "";
  if (!raw.startsWith("/")) {
    return undefined;
  }
  let name;
  try {
    name = decodeURIComponent(raw.slice(1));
  } catch {
    return undefined;
  }
  if (name === CATALOG) {
    return { kind: "catalog", name };
  }
  if (name === LICENSES) {
    return { kind: "licenses", name };
  }
  return servableGrid(name, catalog) ? { kind: "grid", name } : undefined;
}

/**
 * Whether the `/frames-data` mount refuses `relative` by its name (a path
 * inside the store, "/"- or platform-separated): anything under `grids/`,
 * which only `/proj-grids/` serves, and any `*.partial`. In any case, and
 * without an NTFS stream suffix (`:…`) or the trailing dots and spaces
 * Windows ignores. A first filter only: `framesDataExclusion` also checks
 * the file a path resolves to.
 *
 * @param {string} relative
 */
export function framesDataExcludes(relative) {
  const segments = relative
    .split(/[\\/]/)
    .filter((s) => s !== "")
    .map((s) =>
      s
        .split(":")[0]
        .replace(/[. ]+$/, "")
        .toLowerCase(),
    );
  return (
    segments[0] === "grids" || segments.some((s) => s.endsWith(".partial"))
  );
}

/**
 * The `/frames-data` mount's exclusion for the store at `root`, given an
 * absolute path inside it. A path is refused by its name
 * (`framesDataExcludes`) and, when it exists, by the file it resolves to
 * (`realpathSync.native`, which applies the file system's own case and
 * Unicode folding, and follows links): that must stay under the root's real
 * path, outside the root's real `grids/`, and not be a `*.partial`. A path
 * that exists but can't be resolved is refused.
 *
 * @param {string} root
 * @returns {(path: string) => boolean}
 */
export function framesDataExclusion(root) {
  return (path) => {
    const relative = relativePath(root, path);
    if (framesDataExcludes(relative)) {
      return true;
    }
    let realRoot;
    let real;
    try {
      realRoot = realpathSync.native(root);
      real = realpathSync.native(path);
    } catch {
      // Missing: nothing to serve, so nothing to refuse; else refuse.
      return existsSync(path);
    }
    if (real !== realRoot && !real.startsWith(realRoot + sep)) {
      return true;
    }
    let realGrids;
    try {
      realGrids = realpathSync.native(join(root, "grids"));
    } catch {
      realGrids = join(realRoot, "grids");
    }
    if (real === realGrids || real.startsWith(realGrids + sep)) {
      return true;
    }
    return framesDataExcludes(relativePath(realRoot, real));
  };
}

/** "size:mtime:ctime:inode": a stored file unchanged since it was verified. */
function signature(path) {
  try {
    const stat = statSync(path);
    return stat.isFile()
      ? `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.ino}`
      : undefined;
  } catch {
    return undefined;
  }
}

/** The SHA-256 of a file, streamed. */
function hashFile(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

/** The `code` of `ensure`'s rejection when a fetch was needed but not allowed. */
export const FETCH_NOT_ALLOWED = "PROJ_GRIDS_FETCH_NOT_ALLOWED";

/**
 * The store's grids, each verified against its catalog entry: `ensure(name)`
 * gives the path of a verified copy, hashing a stored one (once, until it
 * changes) and fetching a missing or mismatched one from cdn.proj.org.
 * Concurrent calls for one name share one fetch, and at most `maxFetches`
 * (default 2) fetches run at once; the rest wait their turn. With
 * `{ fetch: false }`, a call that would need a fetch rejects with `code`
 * FETCH_NOT_ALLOWED instead. A name that isn't servable rejects with nothing
 * fetched or written.
 *
 * @param {{ dir: string; catalog: GridCatalog; fetch?: typeof fetch; log?: (line: string) => void; maxFetches?: number }} options
 */
export function createGridCache({
  dir,
  catalog,
  fetch: fetcher = fetch,
  log = () => {},
  maxFetches = 2,
}) {
  /** @type {Map<string, Promise<string>>} */
  const pending = new Map();
  /** @type {Map<string, string>} */
  const verified = new Map();

  // A queue of upstream fetches, `maxFetches` at a time.
  let active = 0;
  /** @type {(() => void)[]} */
  const waiting = [];
  const acquire = () => {
    if (active < maxFetches) {
      active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiting.push(resolve));
  };
  const release = () => {
    const next = waiting.shift();
    if (next) {
      next();
    } else {
      active--;
    }
  };

  /** The path when the stored copy is verified, else undefined. */
  const verifyStored = async (entry, path) => {
    const stored = signature(path);
    if (stored === undefined) {
      return undefined;
    }
    if (verified.get(entry.name) === stored) {
      return path;
    }
    const size = statSync(path).size;
    const actual = size === entry.bytes ? await hashFile(path) : undefined;
    if (actual === entry.sha256 && signature(path) === stored) {
      verified.set(entry.name, stored);
      return path;
    }
    verified.delete(entry.name);
    log(
      `${entry.name}: the stored copy doesn't match the catalog (${size} bytes, expected ${entry.bytes}; SHA-256 ${actual ?? "not computed"}, expected ${entry.sha256}); not served`,
    );
    return undefined;
  };

  const fetchGrid = async (entry, path) => {
    await acquire();
    try {
      log(`${entry.name}: fetching ${ORIGIN}${entry.name}`);
      await verifiedDownload(`${ORIGIN}${entry.name}`, path, entry, {
        fetch: fetcher,
      });
    } finally {
      release();
    }
    const fresh = signature(path);
    if (fresh !== undefined) {
      verified.set(entry.name, fresh);
    }
    log(`${entry.name}: stored, verified`);
    return path;
  };

  return {
    /**
     * @param {string} name
     * @param {{ fetch?: boolean }} [options]
     */
    ensure(name, { fetch: mayFetch = true } = {}) {
      const entry = servableGrid(name, catalog);
      if (!entry) {
        return Promise.reject(
          new Error(
            `proj-grids: ${JSON.stringify(name)} is not a current grid of the PROJ-data ${catalog.version} catalog`,
          ),
        );
      }
      const path = join(dir, entry.name);
      const shared = pending.get(name);
      if (shared) {
        return shared;
      }
      if (!mayFetch) {
        return verifyStored(entry, path).then((found) => {
          if (found) {
            return found;
          }
          throw Object.assign(
            new Error(`${name}: not stored, and this request may not fetch it`),
            { code: FETCH_NOT_ALLOWED },
          );
        });
      }
      const settled = (async () =>
        (await verifyStored(entry, path)) ??
        (await fetchGrid(entry, path)))().finally(() => pending.delete(name));
      pending.set(name, settled);
      return settled;
    },
  };
}

/** A loopback address, as Node gives a socket's (IPv4, IPv6, or mapped). */
const isLoopback = (address) =>
  typeof address === "string" &&
  (address === "::1" || /^(?:::ffff:)?127\.\d+\.\d+\.\d+$/.test(address));

/**
 * Whether an `Origin` or `Referer` value names the request's own origin
 * (its `Host`): `"same"`, `"other"` (another origin, `null`, a repeated
 * header or one that doesn't parse), or undefined when it is absent.
 *
 * @param {string | string[] | undefined} value
 * @param {string | undefined} host
 */
function originOf(value, host) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || host === undefined) {
    return "other";
  }
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      url.host === host.toLowerCase()
      ? "same"
      : "other";
  } catch {
    return "other";
  }
}

/**
 * What a request may have: `fetch` (stored, or fetched on a miss), `stored`
 * (no upstream fetch) or `none`. By `Sec-Fetch-Site` when the request sends
 * it: `same-origin` or `none` (typed in the address bar) fetch, `same-site`
 * is stored, anything else none. Without it (curl, Node, and browsers too
 * old to send it: Safari before 16.4, Firefox before 90), by `Origin` and
 * `Referer`: either naming another origin is none, either naming this one
 * (the `Host`) fetches. With neither, only a client on this machine (a
 * loopback `remoteAddress`: curl, Node and the tests) may fetch on a miss;
 * any other is stored. What is left open is a page on this machine that an
 * old browser loads with no referrer, bounded by the fetch cap.
 *
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {string | undefined} remoteAddress
 * @returns {"fetch" | "stored" | "none"}
 */
export function gridAccess(headers, remoteAddress) {
  const site = headers["sec-fetch-site"];
  if (site !== undefined) {
    if (site === "same-origin" || site === "none") {
      return "fetch";
    }
    return site === "same-site" ? "stored" : "none";
  }
  const host = typeof headers.host === "string" ? headers.host : undefined;
  const origin = originOf(headers.origin, host);
  const referer = originOf(headers.referer, host);
  if (origin === "other" || referer === "other") {
    return "none";
  }
  if (origin === "same" || referer === "same") {
    return "fetch";
  }
  return isLoopback(remoteAddress) ? "fetch" : "stored";
}

/** A plain-text response that says nothing about why. */
function plain(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

/**
 * The endpoint's middleware, for a request path after the prefix: GET and
 * HEAD only; the catalog and the license table from the verified bytes in
 * memory; a grid through `cache`, as `gridAccess` allows (a cross-site
 * request, or a same-site one for a grid not stored, is a 403 "forbidden").
 * HEAD on a grid answers from the catalog's size, fetching nothing. An
 * unknown name is a 404; a grid that can't be fetched or verified is a 502
 * "grid unavailable", the details logged.
 *
 * @param {{ catalog: GridCatalog; cache: { ensure(name: string, options?: { fetch?: boolean }): Promise<string> }; catalogBytes: Uint8Array; licensesBytes: Uint8Array; log: (line: string) => void }} options
 */
export function createGridHandler({
  catalog,
  cache,
  catalogBytes,
  licensesBytes,
  log,
}) {
  return (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      plain(res, 405, "method not allowed");
      return;
    }
    const request = gridRequest(req.url ?? "/", catalog);
    if (!request) {
      plain(res, 404, "not found");
      return;
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (request.kind !== "grid") {
      const bytes = request.kind === "catalog" ? catalogBytes : licensesBytes;
      res.statusCode = 200;
      res.setHeader("Content-Type", CATALOG_TYPES[request.kind]);
      res.setHeader("Content-Length", bytes.byteLength);
      res.end(req.method === "HEAD" ? undefined : Buffer.from(bytes));
      return;
    }
    const access = gridAccess(req.headers, req.socket?.remoteAddress);
    if (access === "none") {
      plain(res, 403, "forbidden");
      return;
    }
    const entry = catalog.get(request.name);
    const headers = () => {
      res.statusCode = 200;
      res.setHeader("Content-Type", GRID_TYPES[extname(request.name)]);
      res.setHeader("Content-Length", entry.bytes);
    };
    if (req.method === "HEAD") {
      headers();
      res.end();
      return;
    }
    cache
      .ensure(request.name, { fetch: access === "fetch" })
      .then((path) => {
        headers();
        pipeline(createReadStream(path), res, (error) => {
          if (error && error.code !== "ERR_STREAM_PREMATURE_CLOSE") {
            log(`${request.name}: sending the stored copy failed: ${error}`);
          }
        });
      })
      .catch((error) => {
        if (error?.code === FETCH_NOT_ALLOWED) {
          plain(res, 403, "forbidden");
          return;
        }
        log(
          `${request.name}: unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
        plain(res, 502, "grid unavailable");
      });
  };
}

/**
 * `file` in `dir`, when it is exactly `expected`; else undefined, with why
 * logged (the file and both hashes or sizes).
 */
function pinnedFile(dir, file, expected, error) {
  let bytes;
  try {
    bytes = readFileSync(join(dir, file));
  } catch (cause) {
    error(`${file}: can't be read (${cause}); /proj-grids/ isn't mounted`);
    return undefined;
  }
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== expected.bytes || actual !== expected.sha256) {
    error(
      `${file}: ${bytes.byteLength} bytes with SHA-256 ${actual}, expected ${expected.bytes} bytes with ${expected.sha256} (PROJ-data ${PROJ_DATA_CATALOG.version}); /proj-grids/ isn't mounted`,
    );
    return undefined;
  }
  return bytes;
}

/**
 * The grid endpoint at `prefix`, serving `dir` (the store's `grids/`). It
 * mounts only when `files.geojson` and `copyright_and_licenses.csv` there
 * match their pins (PROJ_DATA_CATALOG); otherwise it logs why and serves
 * nothing.
 *
 * @param {string} prefix
 * @param {string} dir
 * @returns {import("vite").Plugin}
 */
export function projGridsPlugin(prefix, dir) {
  return {
    name: `proj-grids${prefix}`,
    configureServer(server) {
      const logger = server.config.logger;
      const error = (line) => logger.error(`[proj-grids] ${line}`);
      const catalogBytes = pinnedFile(
        dir,
        CATALOG,
        {
          sha256: PROJ_DATA_CATALOG.catalogSha256,
          bytes: PROJ_DATA_CATALOG.catalogBytes,
        },
        error,
      );
      const licensesBytes = pinnedFile(
        dir,
        LICENSES,
        {
          sha256: PROJ_DATA_CATALOG.licensesSha256,
          bytes: PROJ_DATA_CATALOG.licensesBytes,
        },
        error,
      );
      if (!catalogBytes || !licensesBytes) {
        return;
      }
      const decoder = new TextDecoder("utf-8", { fatal: true });
      const catalog = GridCatalog.parse(
        decoder.decode(catalogBytes),
        decoder.decode(licensesBytes),
      );
      const log = (line) => logger.info(`[proj-grids] ${line}`);
      const cache = createGridCache({ dir, catalog, log });
      server.middlewares.use(
        prefix,
        createGridHandler({
          catalog,
          cache,
          catalogBytes,
          licensesBytes,
          log: error,
        }),
      );
    },
  };
}
