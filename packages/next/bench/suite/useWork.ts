import { useEffect, useState } from "react";
import { loadWork, type WorkSnapshot } from "./work.ts";

/**
 * The tracker's snapshot for the rail's count, the palette and the Work
 * page: one request shared by everyone asking at once, read again when
 * the window comes back to the front (item files change while Dyno is
 * open). `error` is the reason the board can't show it.
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
    addEventListener("focus", onFront);
    document.addEventListener("visibilitychange", onFront);
    return () => {
      live = false;
      removeEventListener("focus", onFront);
      document.removeEventListener("visibilitychange", onFront);
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
