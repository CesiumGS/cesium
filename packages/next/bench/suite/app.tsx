import "@radix-ui/themes/styles.css";
import "./dyno.css";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routes.tsx";

/**
 * Dyno's entry: a TanStack Router app on hash history
 * (the dev server's root, /#/workspace?…), so the dev server and a static build serve
 * one page. Links from before the router (results.html?tab=explore&…)
 * are carried over to their routes.
 */

const LEGACY_TABS: Record<string, string> = {
  workspace: "/workspace",
  trends: "/workspace",
  alerts: "/alerts",
  log: "/runs",
  compare: "/compare",
  report: "/report",
  scenes: "/scenes",
  explore: "/explorer",
  images: "/images",
  sweeps: "/sweeps",
  hardware: "/hardware",
};
/** Old query keys that became a route's search params. */
const LEGACY_KEYS: Record<string, string> = { ws: "scene", sp: "scene" };

const legacy = new URLSearchParams(location.search);
const tab = legacy.get("tab");
if (tab && !location.hash) {
  legacy.delete("tab");
  const search = new URLSearchParams();
  for (const [key, value] of legacy) {
    search.set(LEGACY_KEYS[key] ?? key, value);
  }
  const query = search.toString();
  history.replaceState(
    null,
    "",
    `${location.pathname}#${LEGACY_TABS[tab] ?? "/workspace"}${query ? `?${query}` : ""}`,
  );
}

/**
 * Search params as plain strings (the default parses JSON, which turns
 * "2.0" into 2); each route's validateSearch types them.
 */
function parseSearch(query: string): Record<string, unknown> {
  return Object.fromEntries(new URLSearchParams(query));
}
function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

const router = createRouter({
  routeTree,
  parseSearch,
  stringifySearch,
  history: createHashHistory(),
  defaultPreload: "intent",
  // Show the loading state only for waits long enough to notice.
  defaultPendingMs: 150,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
