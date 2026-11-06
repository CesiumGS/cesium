import type { AnyRouter } from "@tanstack/react-router";
import type { Dispose, ExampleRun } from "../../../examples/types.ts";

/**
 * The pure parts of how the Examples page hosts an example: its URL
 * params (the route's search params, scoped to the example) and what its
 * `run` returned. Kept apart from the React so they can be tested alone.
 */

export type Params = Readonly<Record<string, string>>;

/**
 * Search params as string params: the router parses values as JSON, so
 * `?n=1.50` is the number 1.5 and comes back as "1.5" (`1e3` as "1000");
 * objects, booleans, null and empty values are not an example's. Strings
 * written by `setParams` round-trip (the router quotes numeric-looking ones).
 */
export function searchToParams(search: Readonly<Record<string, unknown>>) {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string" && value !== "") {
      params[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      params[key] = String(value);
    }
  }
  return params;
}

/** `current` with `next` applied: `undefined` removes a key. */
export function mergeParams(
  current: Params,
  next: Readonly<Record<string, string | undefined>>,
): Params {
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

const same = (a: Params, b: Params) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
};

/**
 * An example's params: what it set and what the URL holds. `commit` writes
 * them to the URL (replacing the history entry); `sync` takes what the
 * router reports, and tells the watchers only when it is news, so an
 * example hears of back and forward but not of its own `setParams`.
 */
export function createParamsStore(
  initial: Params,
  commit: (params: Params) => void,
) {
  let current = initial;
  const watchers = new Set<(params: Params) => void>();
  return {
    get params() {
      return current;
    },
    setParams(next: Readonly<Record<string, string | undefined>>) {
      const merged = mergeParams(current, next);
      if (!same(merged, current)) {
        current = merged;
        commit(merged);
      }
    },
    watch(callback: (params: Params) => void) {
      watchers.add(callback);
      return () => void watchers.delete(callback);
    },
    sync(params: Params) {
      if (!same(params, current)) {
        current = params;
        for (const callback of [...watchers]) {
          callback(params);
        }
      }
    },
    close() {
      watchers.clear();
    },
  };
}

/** What `run` returned, as `{ dispose, panel? }`. */
export function normalizeRun(returned: Dispose | ExampleRun): ExampleRun {
  return typeof returned === "function" ? { dispose: returned } : returned;
}

/**
 * `context.link`: an absolute URL that opens example `id` with exactly
 * `params` (undefined and empty ones dropped), built by the router, so it
 * follows Dyno's history (the hash) and search format, and resolved
 * against `base`, the page's address.
 */
export function exampleLink(
  router: AnyRouter,
  id: string,
  params: Readonly<Record<string, string | undefined>>,
  base: string,
): string {
  const search: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search[key] = value;
    }
  }
  const { href } = router.buildLocation({
    to: "/examples/$id",
    params: { id },
    search,
  });
  return new URL(router.history.createHref(href), base).href;
}
