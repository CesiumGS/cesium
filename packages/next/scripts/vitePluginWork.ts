import { execFileSync } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { join } from "node:path";
import {
  HitldUnavailable,
  claimsElsewhere,
  findItems,
  queryWork,
  showItem,
  stateHistory,
  type WorkElsewhere,
} from "./workBoard.mjs";

/** How long claims found elsewhere are reused (hitld reads every branch). */
const ELSEWHERE_MS = 30_000;

/**
 * The tracker's read API on Dyno's dev server (dev only; the board says
 * so when it is missing): `/work-api/query.json` is the snapshot and
 * `/work-api/item/CS-<n>.json` one item's text, both from
 * scripts/workBoard.mjs, the one adapter between the board and
 * human-in-the-lead's read API (`hitld work query --json`, version 3).
 * When hitld is missing or answers in another version, the board says
 * so. Read-only, GET only, and only for the dev server's own pages.
 * When an item file changes, open pages hear `work:changed` and read
 * again; claims in other worktrees and branches are read at most every
 * 30 s.
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
      let elsewhere: { at: number; claims: WorkElsewhere[] } | undefined;
      const claims = async () => {
        if (!elsewhere || Date.now() - elsewhere.at > ELSEWHERE_MS) {
          elsewhere = { at: Date.now(), claims: await claimsElsewhere(root) };
        }
        return elsewhere.claims;
      };
      // The history changes only with a commit: kept per HEAD.
      let history:
        { head: string; events: ReturnType<typeof stateHistory> } | undefined;
      const events = () => {
        const head = execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }).trim();
        if (history?.head !== head) {
          history = { head, events: stateHistory(root) };
        }
        return history.events;
      };
      const workDir = join(root, "packages", "next", "work");
      server.watcher.add(workDir);
      const changed = (file: string) => {
        if (file.startsWith(workDir) && file.endsWith(".md")) {
          server.ws.send({ type: "custom", event: "work:changed" });
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
              send(
                res,
                200,
                await queryWork(root, {
                  elsewhere: await claims(),
                  history: events(),
                }),
              );
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
              // hitld missing, or another read API version: the page says so.
              send(res, 503, { error: e.message, hitld: false });
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
