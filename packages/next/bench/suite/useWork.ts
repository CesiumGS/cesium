import { useEffect, useState } from "react";
import { loadWork, type WorkSnapshot } from "./work.ts";

/** How often a visible page reads again, for claims on other branches. */
const POLL_MS = 60_000;

/**
 * The tracker's snapshot for the rail's count, the palette and the Work
 * page: one request shared by everyone asking at once. It reads again when
 * an item file changes (the dev server says `work:changed`), when the
 * window comes back to the front, and every minute while it is visible
 * (claims in other worktrees and branches change without a file here).
 * `error` is the reason the board can't show it.
 */
export function useWork(): { snapshot?: WorkSnapshot; error?: Error } {
  const [state, setState] = useState<{
    snapshot?: WorkSnapshot;
    error?: Error;
  }>(() => (last ? { snapshot: last } : {}));
  useEffect(() => {
    let live = true;
    const read = () =>
      shared().then(
        (snapshot) => live && setState({ snapshot }),
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
      if (Date.now() - readAt > 500) {
        readAt = 0;
      }
      void read();
    };
    addEventListener("focus", onFront);
    document.addEventListener("visibilitychange", onFront);
    import.meta.hot?.on("work:changed", onChange);
    const poll = setInterval(onFront, POLL_MS);
    return () => {
      live = false;
      removeEventListener("focus", onFront);
      document.removeEventListener("visibilitychange", onFront);
      import.meta.hot?.off("work:changed", onChange);
      clearInterval(poll);
    };
  }, []);
  return state;
}

let last: WorkSnapshot | undefined;
let pending: Promise<WorkSnapshot> | undefined;
let readAt = 0;
/** Reads within this many milliseconds of the last share its answer. */
const FRESH_MS = 2000;

function shared(): Promise<WorkSnapshot> {
  if (pending && Date.now() - readAt < FRESH_MS) {
    return pending;
  }
  readAt = Date.now();
  pending = loadWork().then((s) => (last = s));
  return pending;
}
