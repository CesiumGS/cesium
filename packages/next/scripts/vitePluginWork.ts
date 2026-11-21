import { execFileSync } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { join } from "node:path";
import {
  ChangesRefused,
  HitldUnavailable,
  UNAVAILABLE_TEXT,
  boardReader,
  changesReader,
  findItems,
  showItem,
} from "./workBoard.mjs";

/** Pages hear of reads that came in behind an answer at most this often. */
const CHANGED_MS = 250;

/**
 * The tracker's read API on Dyno's dev server (dev only; the board says
 * so when it is missing), from scripts/workBoard.mjs, the one adapter
 * between the board and human-in-the-lead's read API
 * (`hitld work query --json`, version 3). When hitld is missing or answers
 * in another version, the board says so. Read-only, GET only, and only for
 * the dev server's own pages.
 *
 *   /work-api/query.json      the board's snapshot (boardReader's query):
 *                             each read is kept until what it reads changes,
 *                             so a warm request runs no hitld process. On
 *                             the first request the slow sources are waited
 *                             for at most 1.5 s; the snapshot names any still
 *                             reading in `pending`.
 *   /work-api/count.json      the rail's count and the palette's list
 *                             (countOf): `owner_decisions` and `items`
 *                             ({ id, title, kind }), from one hitld read.
 *                             Pages other than Work read only this.
 *   /work-api/changes.json?commit=<hex> or ?date=<YYYY-MM-DD…>
 *                             what changed in the tracker from that point
 *                             to HEAD, from git (CS-747; changesReader):
 *                             kept per HEAD and point. A refused point
 *                             answers 400 with fixed words.
 *   /work-api/find.json?q=    full-text search over every item.
 *   /work-api/item/CS-<n>.json  one item's text.
 *
 * Open pages hear `work:changed` when an item file changes, and when a read
 * behind an answer brings something new (a slow source's first read, a
 * claim on another branch, a ledger event), and read again.
 */
export function workApi(prefix = "/work-api"): Plugin {
  return {
    name: "work-api",
    apply: "serve",
    configureServer(server) {
      const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd: server.config.root,
        encoding: "utf8",
      }).trim();
      let telling: ReturnType<typeof setTimeout> | undefined;
      const tell = () => {
        telling ??= setTimeout(() => {
          telling = undefined;
          server.ws.send({ type: "custom", event: "work:changed" });
        }, CHANGED_MS);
      };
      const board = boardReader(root, { onChange: tell });
      const changes = changesReader(root);
      const workDir = join(root, "packages", "next", "work");
      server.watcher.add(workDir);
      const changed = (file: string) => {
        board.changed(file);
        if (file.startsWith(workDir) && file.endsWith(".md")) {
          tell();
        }
      };
      server.watcher.on("change", changed);
      server.watcher.on("add", changed);
      server.watcher.on("unlink", changed);
      const send = (res: ServerResponse, status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      };
      server.middlewares.use(
        prefix,
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const site = req.headers["sec-fetch-site"];
          if (req.method !== "GET" || (site && site !== "same-origin")) {
            send(res, 403, { error: "read from Dyno's own pages only" });
            return;
          }
          const path = (req.url ?? "").split("?")[0] ?? "";
          try {
            if (path === "/query.json") {
              send(res, 200, await board.query());
              return;
            }
            if (path === "/count.json") {
              send(res, 200, await board.count());
              return;
            }
            if (path === "/changes.json") {
              const q = new URLSearchParams(
                (req.url ?? "").split("?")[1] ?? "",
              );
              const commit = q.get("commit")?.slice(0, 64);
              const date = q.get("date")?.slice(0, 40);
              try {
                send(
                  res,
                  200,
                  await changes.read(
                    commit !== undefined ? { commit } : { date: date ?? "" },
                  ),
                );
              } catch (e) {
                if (!(e instanceof ChangesRefused)) {
                  throw e;
                }
                send(res, 400, { error: e.message, reason: e.reason });
              }
              return;
            }
            if (path === "/find.json") {
              const q = new URLSearchParams((req.url ?? "").split("?")[1] ?? "")
                .get("q")
                ?.slice(0, 200);
              send(res, 200, await findItems(root, q ?? ""));
              return;
            }
            const m = path.match(/^\/item\/(CS-[1-9]\d*)\.json$/);
            if (m) {
              const item = await showItem(root, m[1]!);
              send(res, item ? 200 : 404, item ?? { error: "no such item" });
              return;
            }
          } catch (e) {
            if (e instanceof HitldUnavailable) {
              // hitld missing, another read API version, or failing: the
              // page gets fixed words for the reason, the log the detail.
              server.config.logger.error(`work-api: ${e.message}`);
              send(res, 503, {
                error: UNAVAILABLE_TEXT[e.reason],
                hitld: false,
              });
              return;
            }
            // The detail goes to the dev server's terminal, not the page.
            server.config.logger.error(`work-api: ${String(e)}`);
            send(res, 500, {
              error: "the tracker couldn't be read; see the dev server's log",
            });
            return;
          }
          next();
        },
      );
    },
  };
}
