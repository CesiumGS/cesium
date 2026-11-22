import { useEffect, useState } from "react";
import type { WorkCount } from "../../scripts/workBoard.mjs";
import { loadWork, type WorkSnapshot } from "./work.ts";

/** How often a visible page reads again, for claims on other branches. */
const POLL_MS = 60_000;

/**
 * How soon a page reads again when the snapshot it got says some sources
 * are still being read, in case the dev server's word that they are in
 * (`work:changed`) doesn't reach it.
 */
const PENDING_MS = 3000;

/**
 * Keep one read fresh while the page is open: read now, again when an item
 * file changes or a read on the dev server brings something new (the dev
 * server says `work:changed`), when the window comes back to the front, and
 * every minute while it is visible (claims in other worktrees and branches
 * change without a file here). `read` shares one request among everyone
 * asking at once (sharedRead); `fresh` forgets its answer, so the next read
 * asks the dev server again.
 */
function useFresh<T>(
  shared: { read: () => Promise<T>; fresh: () => void; last?: T },
  again?: (value: T) => boolean,
): { value?: T; error?: Error } {
  const [state, setState] = useState<{ value?: T; error?: Error }>(() =>
    shared.last ? { value: shared.last } : {},
  );
  useEffect(() => {
    let live = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const read = () =>
      shared.read().then(
        (value) => {
          if (!live) {
            return;
          }
          setState({ value });
          clearTimeout(retry);
          if (again?.(value)) {
            retry = setTimeout(() => {
              shared.fresh();
              void read();
            }, PENDING_MS);
          }
        },
        (error: Error) => live && setState((s) => ({ ...s, error })),
      );
    void read();
    const onFront = () => {
      if (document.visibilityState === "visible") {
        void read();
      }
    };
    // Every page listening hears the change; the first one reads again,
    // and the others share its answer.
    const onChange = () => {
      shared.fresh();
      void read();
    };
    addEventListener("focus", onFront);
    document.addEventListener("visibilitychange", onFront);
    import.meta.hot?.on("work:changed", onChange);
    const poll = setInterval(onFront, POLL_MS);
    return () => {
      live = false;
      clearTimeout(retry);
      removeEventListener("focus", onFront);
      document.removeEventListener("visibilitychange", onFront);
      import.meta.hot?.off("work:changed", onChange);
      clearInterval(poll);
    };
  }, [shared, again]);
  return state;
}

/** Reads within this many milliseconds of the last share its answer. */
const FRESH_MS = 2000;

/**
 * One request shared by everyone asking within FRESH_MS of it, and the
 * last answer, for a page that mounts later. `fresh()` forgets the shared
 * request after half a second, so a burst of `work:changed` heard by every
 * listener still makes one request.
 */
function sharedRead<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  let readAt = 0;
  const shared = {
    last: undefined as T | undefined,
    read(): Promise<T> {
      if (pending && Date.now() - readAt < FRESH_MS) {
        return pending;
      }
      readAt = Date.now();
      pending = load().then((v) => (shared.last = v));
      return pending;
    },
    fresh() {
      if (Date.now() - readAt > 500) {
        readAt = 0;
      }
    },
  };
  return shared;
}

const snapshots = sharedRead(loadWork);
const stillReading = (s: WorkSnapshot) => Boolean(s.pending?.length);

/**
 * The tracker's whole snapshot, for the Work page: one request shared by
 * everyone asking at once. When the dev server answers before every source
 * is read (its first request), the snapshot names those in `pending`, and
 * this reads again when they are in. `error` is the reason the board can't
 * show it. Other pages read useWorkCount instead, so they never wait on or
 * start the whole read.
 */
export function useWork(): { snapshot?: WorkSnapshot; error?: Error } {
  const { value, error } = useFresh(snapshots, stillReading);
  return { snapshot: value, error };
}

/** The rail's count from the dev server, in the read API's version. */
async function loadCount(): Promise<WorkCount> {
  const response = await fetch("/work-api/count.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`the tracker API answered ${response.status}`);
  }
  const count = (await response.json()) as WorkCount;
  if (count.api_version !== 3) {
    throw new Error(
      `human-in-the-lead's read API is version ${String(count.api_version)}; this board reads version 3`,
    );
  }
  return count;
}

const counts = sharedRead(loadCount);

/**
 * The rail's count and the palette's list (`/work-api/count.json`): the
 * decisions the owner can answer now, and every item's ID, title and kind,
 * from one hitld read on the dev server and none of the live run's.
 */
export function useWorkCount(): { count?: WorkCount; error?: Error } {
  const { value, error } = useFresh(counts);
  return { count: value, error };
}
