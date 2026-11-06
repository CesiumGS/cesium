// Overlay accuracy lines (R8): the legend's and the overlay row's one line.
// Plain functions, imported by the main thread.

/**
 * The distortion overlay's line: its placement on the globe (the recorded
 * operation's `text` from main.ts, empty when there is none), then what the
 * contours come from. The placement leads, so the compact legend shows the
 * figure (S-I7).
 */
export function distortionAccuracy(placement: string): string {
  const where =
    placement === ""
      ? "placement not stated"
      : placement.startsWith("not bounded")
        ? `placement ${placement}`
        : `placed ${placement}`;
  return `${where}; contours from PROJ's scale factors`;
}
