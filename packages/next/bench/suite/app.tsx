import "./dyno.css";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routes.tsx";
import { ThemeRoot } from "./theme.tsx";

/**
 * Dyno's entry: a TanStack Router app on hash history (/#/overview?…),
 * so the dev server and a static build serve one page, under StrataKit's
 * Root (theme.tsx).
 *
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

// A query before the hash (/?x=1#/viewer?asset=2) is not Dyno's: hash
// history appends it to the hash's own, so the last search param took it
// on ("2?x=1", NaN as a number; a NaN `at` sent the camera to NaN and hung
// the page). Dropped before the router reads the location.
if (location.search) {
  history.replaceState(history.state, "", location.pathname + location.hash);
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
    <ThemeRoot>
      <RouterProvider router={router} />
    </ThemeRoot>
  </StrictMode>,
);
