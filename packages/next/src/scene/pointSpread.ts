// How a star's light spreads on the image, per observer: plain data, on its own so
// that the eye's point limit can read it without importing the observer's settings.
import type { Exposure } from "./observer.ts";

/**
 * How a star's light spreads on the image, in CSS pixels. A star's energy
 * doesn't change with it, only how it's shared among pixels.
 */
export interface PointSpread {
  /** The core's standard deviation. */
  core: number;
  /** A wider, fainter part: its standard deviation, and its share of the light. */
  wing?: { sigma: number; share: number };
}

/** The eye's point spread, CSS pixels. */
const EYE_SPREAD: PointSpread = { core: 0.85 };
/** A camera's point spread, CSS pixels. */
const CAMERA_SPREAD: PointSpread = { core: 0.55 };

/** The point spread an observer draws with: its own, or what its exposure implies. */
export function observerPointSpread(settings: {
  exposure: Exposure;
  pointSpread?: PointSpread;
}): PointSpread {
  return (
    settings.pointSpread ??
    ("eye" in settings.exposure ? EYE_SPREAD : CAMERA_SPREAD)
  );
}
