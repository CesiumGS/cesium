import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import ConvexHull2D from "./ConvexHull2D.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import PolygonHierarchy from "./PolygonHierarchy.js";

/**
 * Extracts 2D polygon boundaries from 3D positions by projecting
 * them onto the ellipsoid surface and computing convex hulls.
 *
 * @namespace PolygonBoundaryExtractor
 *
 * @private
 */
const PolygonBoundaryExtractor = {};

const cartographicScratch = new Cartographic();

/**
 * Extracts a 2D convex hull polygon from an array of 3D positions
 * by projecting them onto the ellipsoid surface and computing the
 * convex hull in geographic (longitude/latitude) space.
 *
 * This produces only a convex approximation, which may not accurately
 * represent L-shaped or concave features.
 *
 * @param {Cartesian3[]} positions An array of vertex positions in ECEF (world) coordinates.
 * @param {object} [options] Options object.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for geographic projection.
 * @returns {{hierarchy: PolygonHierarchy, minHeight: number, maxHeight: number}|undefined}
 *   An object containing the convex hull boundary and cartographic height range,
 *   or `undefined` if fewer than 3 unique positions are provided.
 *
 * @exception {DeveloperError} positions is required.
 * @exception {DeveloperError} positions must contain at least 3 points.
 *
 * @example
 * const result = Cesium.PolygonBoundaryExtractor.convexHullFromPositions(positions);
 * // result.hierarchy, result.minHeight, result.maxHeight
 */
PolygonBoundaryExtractor.convexHullFromPositions = function (
  positions,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  Check.typeOf.number.greaterThanOrEquals(
    "positions.length",
    positions.length,
    3,
  );
  //>>includeEnd('debug');

  options = defined(options) ? options : {};
  const ellipsoid = defined(options.ellipsoid)
    ? options.ellipsoid
    : Ellipsoid.default;

  // Project to 2D (lon, lat) and track height range
  const points2D = new Array(positions.length);
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < positions.length; i++) {
    const carto = Cartographic.fromCartesian(
      positions[i],
      ellipsoid,
      cartographicScratch,
    );
    if (!defined(carto)) {
      points2D[i] = new Cartesian2(0, 0);
    } else {
      points2D[i] = new Cartesian2(carto.longitude, carto.latitude);
      if (carto.height < minHeight) {
        minHeight = carto.height;
      }
      if (carto.height > maxHeight) {
        maxHeight = carto.height;
      }
    }
  }

  // Compute convex hull in 2D
  const hull2D = ConvexHull2D.compute(points2D);

  if (hull2D.length < 3) {
    return undefined;
  }

  // Convert back to Cartesian3 on the ellipsoid surface (height = 0)
  const hullPositions = new Array(hull2D.length);
  for (let i = 0; i < hull2D.length; i++) {
    hullPositions[i] = Cartesian3.fromRadians(
      hull2D[i].x,
      hull2D[i].y,
      0.0,
      ellipsoid,
    );
  }

  return {
    hierarchy: new PolygonHierarchy(hullPositions),
    minHeight: minHeight,
    maxHeight: maxHeight,
  };
};

export default PolygonBoundaryExtractor;
