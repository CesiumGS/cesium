import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import type { Plugin } from "vite";
import {
  RECORD_COLUMNS,
  RECORD_HEADER,
  RECORD_HEADER_NAME,
} from "../widgets/recorderRows.ts";

/** The largest body accepted, bytes: 500 ms of rows is a few KB. */
export const MAX_RECORD_BYTES = 256 * 1024;
/** Rows in one body, and characters in one cell. */
export const MAX_RECORD_ROWS = 2000;
export const MAX_CELL_CHARS = 600;
const CELL = /^[\w.+= -]*$/;
/** The largest frame image accepted, bytes. */
export const MAX_FRAME_BYTES = 12 * 1024 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Recordings (page ids) one dev server keeps, frames each, and bytes in all. */
export const MAX_RECORDINGS = 64;
export const MAX_FRAMES = 2000;
export const MAX_SESSION_BYTES = 2 * 1024 ** 3;

/**
 * Whether a request comes from the dev server's own pages: it carries the
 * recorder's header (so a cross-origin one needed a preflight, never
 * granted), and the browser says it's same-origin where it says anything.
 */
export function fromOwnPage(headers: {
  [name: string]: string | string[] | undefined;
}): boolean {
  if (headers[RECORD_HEADER_NAME.toLowerCase()] !== "1") {
    return false;
  }
  const site = headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin") {
    return false;
  }
  const origin = headers.origin;
  const host = headers.host;
  if (typeof origin === "string" && typeof host === "string") {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return true;
}

/** A tick index from a query value: a whole number from 0 to 2^31, else undefined. */
export function parseTick(text: string | null | undefined): number | undefined {
  return /^\d{1,10}$/.test(text ?? "") && Number(text) < 2 ** 31
    ? Number(text)
    : undefined;
}

/** Whether the bytes begin as a PNG. */
export function isPng(bytes: Uint8Array): boolean {
  return PNG_MAGIC.every((b, i) => bytes[i] === b);
}

/** Where a tick's frame image goes: `<recording name>/frame-<tick>.png` in `directory`. */
export function framePath(
  directory: string,
  csvName: string,
  tick: number,
): string | undefined {
  const folder = pathInside(directory, csvName.replace(/\.csv$/, ""));
  return folder ? join(folder, `frame-${tick}.png`) : undefined;
}

/** INSPECTOR_RECORD_DIR, else ~/.cesium-bench/inspector (the setup store). */
export function recordDirectory(): string {
  return (
    process.env.INSPECTOR_RECORD_DIR ??
    join(homedir(), ".cesium-bench", "inspector")
  );
}

/** A page id as a file-name part: letters, digits, `_` and `-`, at most 32. */
export function sanitizePageId(id: string | null | undefined): string {
  const clean = (id ?? "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 32);
  return clean === "" ? "page" : clean;
}

/** `<ISO start>-<page id>.csv`, the colons dropped so Windows accepts it. */
export function recordFileName(start: Date, pageId: string): string {
  const iso = start
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replace(/:/g, "-");
  return `${iso}-${sanitizePageId(pageId)}.csv`;
}

/**
 * The file's path inside `directory`, or undefined when it would land
 * anywhere else (it never does for a name `recordFileName` made).
 */
export function pathInside(
  directory: string,
  name: string,
): string | undefined {
  const base = resolve(directory);
  const path = resolve(base, name);
  return basename(path) === name && path.startsWith(base + sep)
    ? path
    : undefined;
}

/**
 * A body's rows when it is rows of the recorder's columns and nothing
 * else: numbers and short names, as many cells as columns, within the
 * limits. A string says what was wrong.
 */
export function checkBody(text: string): string[] | string {
  if (text.length > MAX_RECORD_BYTES) {
    return "body too large";
  }
  const rows = text.split("\n").filter((l) => l !== "");
  if (rows.length === 0) {
    return "no rows";
  }
  if (rows.length > MAX_RECORD_ROWS) {
    return "too many rows";
  }
  for (const row of rows) {
    const cells = row.split(",");
    if (cells.length !== RECORD_COLUMNS.length) {
      return "wrong number of columns";
    }
    for (const cell of cells) {
      if (cell.length > MAX_CELL_CHARS || !CELL.test(cell)) {
        return "a cell is not a number or a short name";
      }
    }
  }
  return rows;
}

/**
 * Dev server only: POST `/__record?page=<id>` appends the body's rows to
 * `<directory>/<ISO start>-<page id>.csv` (the header written once, when
 * the first body of a page id arrives) and points `latest.csv` at it.
 * Nothing here runs in a build.
 */
export function recordEndpoint(directory = recordDirectory()): Plugin {
  const files = new Map<string, string>();
  const frames = new Map<string, number>();
  let written = 0;
  return {
    name: "record-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__record", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        // Replies are fixed plain text: nothing from the request or an
        // exception is echoed (exceptions go to the dev server's log).
        const fail = (status: number, message: string) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.end(message);
        };
        const broke = (e: unknown) => {
          server.config.logger.error(`record endpoint: ${String(e)}`);
          fail(500, "could not write the recording");
        };
        if (!fromOwnPage(req.headers)) {
          fail(403, "not from this dev server's pages");
          return;
        }
        if (written > MAX_SESSION_BYTES) {
          fail(507, "recording limit reached; restart the dev server");
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        const page = sanitizePageId(url.searchParams.get("page"));
        if (url.pathname === "/frame") {
          const tick = parseTick(url.searchParams.get("tick"));
          const csv = files.get(page);
          if (req.headers["content-type"] !== "image/png") {
            fail(415, "frames are image/png");
            return;
          }
          if ((frames.get(page) ?? 0) >= MAX_FRAMES) {
            fail(429, "frame limit for this recording reached");
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          req.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size <= MAX_FRAME_BYTES) {
              chunks.push(chunk);
            }
          });
          req.on("end", () => {
            const bytes = Buffer.concat(chunks);
            const path =
              tick !== undefined && csv
                ? framePath(directory, csv, tick)
                : undefined;
            if (size > MAX_FRAME_BYTES) {
              fail(413, "image too large");
            } else if (!path || !isPng(bytes)) {
              fail(400, "bad tick, unknown page or not a PNG");
            } else {
              try {
                mkdirSync(join(path, ".."), { recursive: true });
                writeFileSync(path, bytes);
                frames.set(page, (frames.get(page) ?? 0) + 1);
                written += bytes.length;
                res.statusCode = 204;
                res.end();
              } catch (e) {
                broke(e);
              }
            }
          });
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        let over = false;
        req.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RECORD_BYTES) {
            over = true;
            return;
          }
          chunks.push(chunk);
        });
        req.on("end", () => {
          if (over) {
            fail(413, "body too large");
            return;
          }
          const rows = checkBody(Buffer.concat(chunks).toString("utf8"));
          if (typeof rows === "string") {
            fail(400, rows);
            return;
          }
          try {
            mkdirSync(directory, { recursive: true });
            let name = files.get(page);
            const fresh = name === undefined;
            if (fresh && files.size >= MAX_RECORDINGS) {
              fail(429, "recording limit reached; restart the dev server");
              return;
            }
            name ??= recordFileName(new Date(), page);
            const path = pathInside(directory, name);
            if (!path) {
              fail(400, "bad page id");
              return;
            }
            if (fresh) {
              files.set(page, name);
              writeFileSync(path, `${RECORD_HEADER}\n`);
              point(directory, name);
            }
            const text = `${rows.join("\n")}\n`;
            appendFileSync(path, text);
            written += text.length;
            res.statusCode = 204;
            res.setHeader("X-Record-File", name);
            res.end();
          } catch (e) {
            broke(e);
          }
        });
      });
    },
  };
}

/** `latest.csv` follows the newest recording: a symlink, or a copy where links aren't allowed. */
function point(directory: string, name: string): void {
  const latest = join(directory, "latest.csv");
  try {
    if (existsSync(latest)) {
      unlinkSync(latest);
    }
    symlinkSync(name, latest);
  } catch {
    copyFileSync(join(directory, name), latest);
  }
}
