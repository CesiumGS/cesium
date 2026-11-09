// The Viewer's warnings: kept once each, shown on the page and sent as events.
import type { ViewerWarning, Viewer } from "./Viewer.ts";
import type { FrameDataWarning } from "@cesium/next/frames";

/** Each warning kind in a few words, for the notice's collapsed line. */
const WARNING_SUMMARY: Readonly<Record<ViewerWarning["kind"], string>> = {
  frameDataFailed: "Frames data didn't load; the sky is approximate",
  loadFailed: "Frames data didn't load",
  eopEnded: "The Earth orientation data is out of date",
  leapSecondsExpired: "The leap-second table has expired",
};

/** Emits `name`; a listener that throws is reported, not passed on. */
export function emit<K extends "warning" | "warningsCleared">(
  viewer: Viewer,
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
export function showWarnings(viewer: Viewer): void {
  viewer.warnings_?.set(
    viewer.warningList.map((w) => ({
      message: w.message,
      summary: WARNING_SUMMARY[w.kind],
    })),
  );
}

/** Adds a warning: listed, shown, emitted and (with `log`) logged. */
export function warn(
  viewer: Viewer,
  warning: FrameDataWarning | ViewerWarning,
  log: boolean,
): void {
  const entry: ViewerWarning = {
    kind: warning.kind,
    message: warning.message,
  };
  viewer.warningList.push(entry);
  if (log) {
    console.warn(entry.message);
  }
  showWarnings(viewer);
  emit(viewer, "warning", entry);
}
