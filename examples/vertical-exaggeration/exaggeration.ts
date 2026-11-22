import {
  Ellipsoid,
  cartographic,
  verticalExaggeration,
  type PlacementParameter,
  type VerticalExaggeration,
} from "@cesium/next";
import {
  curvilinearFrame,
  curvilinearForward,
  curvilinearInverse,
  type FrameCatalog,
  type CurvilinearFrame,
} from "@cesium/next/frames";

/** The strongest exaggeration the slider reaches: heights drawn ten times as tall. */
export const MAX_EXAGGERATION = 10;

/** The name of the application's reference frame: the Earth's content, drawn exaggerated. */
export const FRAME_NAME = "Earth content (exaggerated)";

/** What the slider writes at first: a position from 0 to 1, for a multiplier of 1 to `MAX_EXAGGERATION`. */
export const scaleOf = (factor: number): number =>
  (factor - 1) / (MAX_EXAGGERATION - 1);

/** A point's geodetic position: radians, and meters above the WGS84 ellipsoid. */
export interface Geodetic {
  readonly longitude: number;
  readonly latitude: number;
  readonly height: number;
}

/**
 * The application's vertical exaggeration, all of it: a reference frame over
 * the Earth's content whose edge to ITRF is the deformation. The globe's
 * terrain, a tileset, a model and the pins are placed in it, so they keep
 * their true coordinates (ITRF's, heights above the WGS84 ellipsoid) and are
 * drawn through the edge; the camera stays at ITRF, where it sees them drawn,
 * and what is not under the frame (the Moon) is not touched. Nothing is set on
 * any item.
 */
export interface Exaggeration {
  /** The frame the Earth's content is placed in: its coordinates are ITRF's, its edge to ITRF multiplies heights by `factor`. */
  readonly frame: CurvilinearFrame<typeof FRAME_NAME>;
  /**
   * The helper at its full factor, `MAX_EXAGGERATION`: setting its `factor`
   * changes the curvilinear map itself and every route through it is refitted. The
   * slider never does; it moves `factor` below, one float.
   */
  readonly curvilinearMap: VerticalExaggeration;
  /** The multiplier in force; setting it writes the one float the slider writes. */
  factor: number;
  /** Where a true point (the frame's coordinates: ITRF's axes, m) is drawn, in ITRF, at the multiplier in force (`curvilinearForward`). */
  drawn(point: ArrayLike<number>, out?: Float64Array): Float64Array;
  /**
   * The true point drawn at `point` in ITRF, at the multiplier in force
   * (`curvilinearInverse`). A pick gives its true point itself (`truePick`), which is
   * read at the multiplier it was drawn at; this is for the application's own
   * drawn points.
   */
  truth(point: ArrayLike<number>, out?: Float64Array): Float64Array;
  /** The geodetic position of a point in ITRF. */
  geodetic(point: ArrayLike<number>): Geodetic;
}

/**
 * Builds the frame on `catalog` under its ITRF, its strength moved by
 * `scale` (a world's placement parameter over [0, 1]). The helper writes the
 * map's Jacobian and inverse, and tells the engine the curvilinear map scales heights
 * above the ellipsoid, so terrain is drawn exactly, with no fit.
 */
export function createExaggeration(
  catalog: FrameCatalog,
  scale: PlacementParameter,
): Exaggeration {
  const curvilinearMap: VerticalExaggeration = verticalExaggeration({
    factor: MAX_EXAGGERATION,
    scale,
  });
  const frame = curvilinearFrame(
    FRAME_NAME,
    catalog.get("ITRF"),
    curvilinearMap,
  );
  catalog.add(frame);
  // The multiplier in force: the curvilinear map's own factor at the slider's position.
  const factorNow = () => 1 + scale.value * (curvilinearMap.factor - 1);
  return {
    frame,
    curvilinearMap,
    get factor() {
      return factorNow();
    },
    set factor(factor: number) {
      scale.value = (factor - 1) / (curvilinearMap.factor - 1);
    },
    // The frame's curvilinear map, taken at the scale in force: what the engine draws.
    drawn: (point, out = new Float64Array(3)) =>
      curvilinearForward(frame.curvilinearMap, point, out),
    truth: (point, out = new Float64Array(3)) =>
      curvilinearInverse(frame.curvilinearMap, point, out),
    geodetic(point) {
      const c = Ellipsoid.WGS84.cartesianToCartographic(
        Float64Array.of(point[0]!, point[1]!, point[2]!),
        cartographic(),
      );
      if (!c) {
        throw new RangeError("a point at the Earth's center has no height");
      }
      return { longitude: c.longitude, latitude: c.latitude, height: c.height };
    },
  };
}
