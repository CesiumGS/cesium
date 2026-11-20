// Provider loads shared between frame catalogs over one store (CS-708). A
// catalog that carries an abort signal (the Viewer's always do) joins a load
// another catalog started for the same provider and store, instead of
// fetching the same files again: React's StrictMode, or a fast refresh,
// makes a viewer, disposes it and makes it again at once, and the second
// viewer's catalog finds the first one's load in flight.
//
// The shared load has its own abort controller. Each catalog's signal
// rejects only that catalog's wait; the load itself stops once every catalog
// sharing it has aborted, one task later, so a catalog made right after
// another was disposed (in the same tick) still finds it. A finished load
// stays shared while a catalog holds it, and is dropped (for the garbage
// collector) once none does. A failed load is never shared afterward: the
// next catalog tries again.
//
// A catalog without a signal never releases a load, so it loads on its own,
// as before: sharing with it would keep the data for the page's life.
//
// The store's manifest.json is fetched once for the provider loads over it
// (CS-706): it lives while any of them does, and its fetch stops with the
// last of them. A failed manifest is not kept either.
import type {
  FrameDataLoadOptions,
  FrameManifest,
} from "../ephemeris/frameRoles.ts";
import type { LoadProgress } from "../io/readWithProgress.ts";

interface SharedLoad {
  readonly promise: Promise<unknown>;
  readonly abort: AbortController;
  /** Catalogs whose signals haven't aborted. */
  holders: number;
  /** The release scheduled when the last holder aborted. */
  release: ReturnType<typeof setTimeout> | undefined;
  /** Progress callbacks of the holders that asked for progress. */
  readonly progress: Set<LoadProgress>;
}

const loads = new Map<string, SharedLoad>();

interface StoreManifest {
  readonly promise: Promise<FrameManifest>;
  readonly abort: AbortController;
  /** Provider loads over the store using it. */
  users: number;
}

/** Manifests by store, while provider loads over the store use them. */
const manifests = new Map<string, StoreManifest>();

/** The store's manifest for a new provider load, and its release. */
function useManifest(
  store: string,
  base: string,
): { promise: Promise<FrameManifest>; release(): void } {
  let manifest = manifests.get(store);
  if (!manifest) {
    const abort = new AbortController();
    const entry: StoreManifest = {
      // By dynamic import, as the providers that read it are loaded.
      promise: import("../ephemeris/frameRoles.ts").then((m) =>
        m.loadFrameManifest(base, abort.signal),
      ),
      abort,
      users: 0,
    };
    entry.promise.catch(() => {
      if (manifests.get(store) === entry) {
        manifests.delete(store);
      }
    });
    manifest = entry;
    manifests.set(store, entry);
  }
  const mine = manifest;
  mine.users++;
  let released = false;
  return {
    promise: mine.promise,
    release() {
      if (released) {
        return;
      }
      released = true;
      if (--mine.users === 0) {
        if (manifests.get(store) === mine) {
          manifests.delete(store);
        }
        mine.abort.abort();
      }
    },
  };
}

/** The store's URL made absolute where a page gives a base, so "./x/" and "/x/" meet. */
function storeUrl(base: string): string {
  let url = base;
  try {
    const page = (globalThis as { location?: { href?: string } }).location
      ?.href;
    url = page ? new URL(base, page).href : base;
  } catch {
    // Not a URL a page can resolve: the string as given.
  }
  return url.endsWith("/") ? url : `${url}/`;
}

function storeKey(provider: string, base: string): string {
  return `${provider} ${storeUrl(base)}`;
}

/**
 * `load`'s result for `provider` over the store at `base`, shared with the
 * other catalogs asking for it. `signal` rejects this caller's wait with its
 * reason; the shared load stops when every caller has aborted.
 * `onProgress` hears each file of a load this caller starts or joins (a load
 * started without progress doesn't stream, so a caller that joins it hears
 * nothing).
 */
export function sharedProviderLoad<T>(
  provider: string,
  base: string,
  signal: AbortSignal,
  onProgress: LoadProgress | undefined,
  load: (
    options: FrameDataLoadOptions,
    manifest: Promise<FrameManifest>,
  ) => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  const key = storeKey(provider, base);
  let shared = loads.get(key);
  if (!shared) {
    const manifest = useManifest(storeUrl(base), base);
    const abort = new AbortController();
    const progress = new Set<LoadProgress>();
    const options: FrameDataLoadOptions = { signal: abort.signal };
    if (onProgress) {
      options.onProgress = (item, received, total) => {
        for (const listener of progress) {
          listener(item, received, total);
        }
      };
    }
    const entry: SharedLoad = {
      promise: load(options, manifest.promise),
      abort,
      holders: 0,
      release: undefined,
      progress,
    };
    // A failure is the callers' to report; the next catalog loads afresh.
    entry.promise.catch(() => {
      manifest.release();
      if (loads.get(key) === entry) {
        loads.delete(key);
      }
    });
    // Stopped (its last holder gone): the manifest is no longer its.
    abort.signal.addEventListener("abort", () => manifest.release(), {
      once: true,
    });
    shared = entry;
    loads.set(key, entry);
  }
  const mine = shared;
  mine.holders++;
  if (mine.release !== undefined) {
    clearTimeout(mine.release);
    mine.release = undefined;
  }
  if (onProgress) {
    mine.progress.add(onProgress);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason);
      mine.progress.delete(onProgress!);
      if (--mine.holders === 0) {
        // One task later: a catalog made in the same tick takes it over.
        mine.release = setTimeout(() => {
          mine.release = undefined;
          if (mine.holders === 0) {
            if (loads.get(key) === mine) {
              loads.delete(key);
            }
            mine.abort.abort(signal.reason);
          }
        }, 0);
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });
    (mine.promise as Promise<T>).then(
      (value) => {
        mine.progress.delete(onProgress!);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        mine.progress.delete(onProgress!);
        reject(error);
      },
    );
  });
}

/** Loads shared now, by provider and store (for tests). */
export function sharedLoadCount(): number {
  return loads.size;
}

/** Store manifests held for provider loads now (for tests). */
export function sharedManifestCount(): number {
  return manifests.size;
}
