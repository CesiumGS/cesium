// The times the panel prints that move every frame while the clock plays
// (Task 4d): the page's time source (page.ts `createTimeSource`), given to
// the few lines that print them through a context, so only they render as
// the clock plays and the rest of the panel stays as it was.
import { createContext, useContext, useSyncExternalStore } from "react";
import type { LiveTime, TimeSource } from "./model.ts";

const NONE: LiveTime = { utc: "" };
const STILL: TimeSource = { subscribe: () => () => {}, get: () => NONE };

export const TimeContext = createContext<TimeSource>(STILL);

/** The clock's and the scenario's times, now. */
export function useLiveTime(): LiveTime {
  const source = useContext(TimeContext);
  return useSyncExternalStore(source.subscribe, source.get);
}
