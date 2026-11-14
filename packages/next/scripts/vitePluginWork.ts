import { execFileSync } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { queryWork, showItem } from "./work/query.mjs";

/**
 * The tracker's read API on Dyno's dev server (dev only; the board says
 * so when it is missing): `/work-api/query.json` is the snapshot and
 * `/work-api/item/CS-<n>.json` one item's text, both from
 * scripts/work/query.mjs, the one adapter between the board and the
 * tracker. Read-only, GET only, and only for the dev server's own pages.
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
      const send = (res: ServerResponse, status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      };
      server.middlewares.use(
        prefix,
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const site = req.headers["sec-fetch-site"];
          if (req.method !== "GET" || (site && site !== "same-origin")) {
            send(res, 403, { error: "read from Dyno's own pages only" });
            return;
          }
          const path = (req.url ?? "").split("?")[0] ?? "";
          try {
            if (path === "/query.json") {
              send(res, 200, queryWork(root));
              return;
            }
            const m = path.match(/^\/item\/(CS-[1-9]\d*)\.json$/);
            if (m) {
              const item = showItem(root, m[1]!);
              send(res, item ? 200 : 404, item ?? { error: "no such item" });
              return;
            }
          } catch (e) {
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
