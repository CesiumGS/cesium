// The Viewer's warnings: kept once each, shown on the page and sent as events.
import type { ViewerWarning, Viewer } from "./Viewer.ts";
import type { FrameDataWarning } from "@cesium/next/frames";
import type { ViewerState } from "./viewerState.ts";

/** Warnings. */
export interface ViewerWarningsContext extends Pick<Viewer, "events"> {
  readonly state: Pick<ViewerState, "warningList" | "warnings_">;
}

/** Each warning kind in a few words, for the notice's collapsed line. */
const WARNING_SUMMARY: Readonly<Record<ViewerWarning["kind"], string>> = {
  frameDataFailed: "Frames data didn't load; the sky is approximate",
  loadFailed: "Frames data didn't load",
  eopEnded: "The Earth orientation data is out of date",
  leapSecondsExpired: "The leap-second table has expired",
};

/** Emits `name`; a listener that throws is reported, not passed on. */
export function emit<K extends "warning" | "warningsCleared">(
  viewer: ViewerWarningsContext,
  name: K,
  payload: K extends "warning" ? ViewerWarning : Viewer,
): void {
  try {
    viewer.events.emit(name, payload as never);
  } catch (error) {
    console.error(`Viewer: a "${name}" listener threw`, error);
  }
}

/** The notice's list, from `warnings`. */
export function showWarnings(viewer: ViewerWarningsContext): void {
  viewer.state.warnings_?.set(
    viewer.state.warningList.map((w) => ({
      message: w.message,
      summary: WARNING_SUMMARY[w.kind],
    })),
  );
}

/** Adds a warning: listed, shown, emitted and (with `log`) logged. */
export function warn(
  viewer: ViewerWarningsContext,
  warning: FrameDataWarning | ViewerWarning,
  log: boolean,
): void {
  const entry: ViewerWarning = {
    kind: warning.kind,
    message: warning.message,
  };
  viewer.state.warningList.push(entry);
  if (log) {
    console.warn(entry.message);
  }
  showWarnings(viewer);
  emit(viewer, "warning", entry);
}
