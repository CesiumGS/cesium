// The dev server's grid endpoint (`/proj-grids/`): PROJ-data's pinned catalog,
// its license table and the grids it lists, from the store's `grids/`. A grid
// not stored yet is fetched from cdn.proj.org the first time a page asks for
// it, through the one verified fetcher (verifiedDownload.mjs). Only a name
// that is exactly a current catalog key is served or fetched: no path
// traversal, no other origin, no redirects, the catalog's size as a cap, and
// error bodies that say nothing (the details go to the server log).
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { GridCatalog } from "../src/engineering/gridCatalog.ts";
import { RESERVED_NAMES } from "../src/engineering/projNode.ts";
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
 * The catalog entry for `name` when it may be served: a plain file name (the
 * brief's pattern, and Task 3's in proj.ts: it ends in a letter or digit),
 * no "..", none of PROJ's own file names or a `.partial` in any case, a
 * `.tif` or `.json`, and exactly a key of the catalog that isn't removed and
 * whose URL is cdn.proj.org's for that name.
 *
 * @param {string} name
 * @param {GridCatalog} catalog
 */
function servableGrid(name, catalog) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name) ||
    !/^(?:[A-Za-z0-9]|[A-Za-z0-9_][\w.-]*[A-Za-z0-9])$/.test(name) ||
    name.includes("..")
  ) {
    return undefined;
  }
  const lower = name.toLowerCase();
  if (RESERVED_NAMES.has(lower) || lower.endsWith(".partial")) {
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
 * Whether the `/frames-data` mount refuses `relative` (a path inside the
 * store, "/"- or platform-separated): anything under `grids/`, which only
 * `/proj-grids/` serves, and any `*.partial`. In any case, and with the
 * trailing dots and spaces Windows ignores.
 *
 * @param {string} relative
 */
export function framesDataExcludes(relative) {
  const segments = relative
    .split(/[\\/]/)
    .filter((s) => s !== "")
    .map((s) => s.replace(/[. ]+$/, "").toLowerCase());
  return (
    segments[0] === "grids" || segments.some((s) => s.endsWith(".partial"))
  );
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

/**
 * The store's grids, each verified against its catalog entry: `ensure(name)`
 * gives the path of a verified copy, hashing a stored one (once, until it
 * changes) and fetching a missing or mismatched one from cdn.proj.org.
 * Concurrent calls for one name share one fetch. A name that isn't servable
 * rejects with nothing fetched or written.
 *
 * @param {{ dir: string; catalog: GridCatalog; fetch?: typeof fetch; log?: (line: string) => void }} options
 */
export function createGridCache({
  dir,
  catalog,
  fetch: fetcher = fetch,
  log = () => {},
}) {
  /** @type {Map<string, Promise<string>>} */
  const pending = new Map();
  /** @type {Map<string, string>} */
  const verified = new Map();

  const settle = async (entry, path) => {
    const stored = signature(path);
    if (stored !== undefined) {
      if (verified.get(entry.name) === stored) {
        return path;
      }
      const size = statSync(path).size;
      const actual = size === entry.bytes ? await hashFile(path) : undefined;
      if (actual === entry.sha256 && signature(path) === stored) {
        verified.set(entry.name, stored);
        return path;
      }
      log(
        `${entry.name}: the stored copy doesn't match the catalog (${size} bytes, expected ${entry.bytes}; SHA-256 ${actual ?? "not computed"}, expected ${entry.sha256}); fetching it again`,
      );
    }
    verified.delete(entry.name);
    log(`${entry.name}: fetching ${ORIGIN}${entry.name}`);
    await verifiedDownload(`${ORIGIN}${entry.name}`, path, entry, {
      fetch: fetcher,
    });
    const fresh = signature(path);
    if (fresh !== undefined) {
      verified.set(entry.name, fresh);
    }
    log(`${entry.name}: stored, verified`);
    return path;
  };

  return {
    /** @param {string} name */
    ensure(name) {
      const entry = servableGrid(name, catalog);
      if (!entry) {
        return Promise.reject(
          new Error(
            `proj-grids: ${JSON.stringify(name)} is not a current grid of the PROJ-data ${catalog.version} catalog`,
          ),
        );
      }
      let shared = pending.get(name);
      if (!shared) {
        shared = settle(entry, join(dir, entry.name)).finally(() =>
          pending.delete(name),
        );
        pending.set(name, shared);
      }
      return shared;
    },
  };
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
 * memory; a grid through `cache`. An unknown name is a 404; a grid that
 * can't be fetched or verified is a 502 "grid unavailable", the details
 * logged.
 *
 * @param {{ catalog: GridCatalog; cache: { ensure(name: string): Promise<string> }; catalogBytes: Uint8Array; licensesBytes: Uint8Array; log: (line: string) => void }} options
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
    const entry = catalog.get(request.name);
    cache
      .ensure(request.name)
      .then((path) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", GRID_TYPES[extname(request.name)]);
        res.setHeader("Content-Length", entry.bytes);
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        createReadStream(path)
          .on("error", (error) => {
            log(`${request.name}: reading the stored copy failed: ${error}`);
            res.destroy();
          })
          .pipe(res);
      })
      .catch((error) => {
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
