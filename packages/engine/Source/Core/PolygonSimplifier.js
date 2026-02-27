import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import PolygonHierarchy from "./PolygonHierarchy.js";

/**
 * Simplifies polygons by reducing the number of vertices while preserving
 * the overall shape. Supports both 2D ({@link Cartesian2}) and 3D
 * ({@link Cartesian3}) point arrays, as well as {@link PolygonHierarchy}
 * objects.
 *
 * Implements the
 * <a href="https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm">
 * Ramer-Douglas-Peucker</a> algorithm.
 *
 * @namespace PolygonSimplifier
 *
 * @private
 */
const PolygonSimplifier = {};

/**
 * Computes the perpendicular distance from a point to the line segment
 * defined by `start` and `end` in 2D.
 *
 * @param {Cartesian2} point The point to test.
 * @param {Cartesian2} start The line segment start.
 * @param {Cartesian2} end The line segment end.
 * @returns {number} The perpendicular distance.
 * @private
 */
function perpendicularDistance2D(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0.0) {
    // start and end are the same point
    const px = point.x - start.x;
    const py = point.y - start.y;
    return Math.sqrt(px * px + py * py);
  }

  // Area of triangle (start, end, point) * 2 / length of base
  const area = Math.abs(
    dx * (start.y - point.y) - (start.x - point.x) * dy,
  );
  return area / Math.sqrt(lengthSquared);
}

/**
 * Computes the perpendicular distance from a 3D point to the line segment
 * defined by `start` and `end`.
 *
 * @param {Cartesian3} point The point to test.
 * @param {Cartesian3} start The line segment start.
 * @param {Cartesian3} end The line segment end.
 * @returns {number} The perpendicular distance.
 * @private
 */
const lineDirScratch = new Cartesian3();
const pointDirScratch = new Cartesian3();
const crossScratch = new Cartesian3();

function perpendicularDistance3D(point, start, end) {
  const lineDir = Cartesian3.subtract(end, start, lineDirScratch);
  const lineLengthSquared = Cartesian3.magnitudeSquared(lineDir);

  if (lineLengthSquared === 0.0) {
    return Cartesian3.distance(point, start);
  }

  const pointDir = Cartesian3.subtract(point, start, pointDirScratch);
  const crossProduct = Cartesian3.cross(lineDir, pointDir, crossScratch);
  return Cartesian3.magnitude(crossProduct) / Math.sqrt(lineLengthSquared);
}

/**
 * Applies the Douglas-Peucker algorithm to simplify a polyline/polygon ring
 * in 2D.
 *
 * @param {Cartesian2[]} points The input ring or polyline vertices.
 * @param {number} startIndex Start index (inclusive).
 * @param {number} endIndex End index (inclusive).
 * @param {number} tolerance The distance tolerance.
 * @param {boolean[]} keep Array of booleans indicating which points to keep.
 * @private
 */
function douglasPeucker2D(points, startIndex, endIndex, tolerance, keep) {
  let maxDistance = 0.0;
  let maxIndex = startIndex;

  for (let i = startIndex + 1; i < endIndex; i++) {
    const distance = perpendicularDistance2D(
      points[i],
      points[startIndex],
      points[endIndex],
    );
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    keep[maxIndex] = true;
    if (maxIndex - startIndex > 1) {
      douglasPeucker2D(points, startIndex, maxIndex, tolerance, keep);
    }
    if (endIndex - maxIndex > 1) {
      douglasPeucker2D(points, maxIndex, endIndex, tolerance, keep);
    }
  }
}

/**
 * Applies the Douglas-Peucker algorithm to simplify a polyline/polygon ring
 * in 3D.
 *
 * @param {Cartesian3[]} points The input ring or polyline vertices.
 * @param {number} startIndex Start index (inclusive).
 * @param {number} endIndex End index (inclusive).
 * @param {number} tolerance The distance tolerance.
 * @param {boolean[]} keep Array of booleans indicating which points to keep.
 * @private
 */
function douglasPeucker3D(points, startIndex, endIndex, tolerance, keep) {
  let maxDistance = 0.0;
  let maxIndex = startIndex;

  for (let i = startIndex + 1; i < endIndex; i++) {
    const distance = perpendicularDistance3D(
      points[i],
      points[startIndex],
      points[endIndex],
    );
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    keep[maxIndex] = true;
    if (maxIndex - startIndex > 1) {
      douglasPeucker3D(points, startIndex, maxIndex, tolerance, keep);
    }
    if (endIndex - maxIndex > 1) {
      douglasPeucker3D(points, maxIndex, endIndex, tolerance, keep);
    }
  }
}

/**
 * Filters a points array based on the keep flags.
 *
 * @param {Array} points The input points.
 * @param {boolean[]} keep Flags indicating which points to keep.
 * @param {Function} cloneFn Clone function for the point type.
 * @returns {Array} A new array of kept points.
 * @private
 */
function filterPoints(points, keep, cloneFn) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) {
      result.push(cloneFn(points[i]));
    }
  }
  return result;
}

/**
 * Simplifies a 2D polygon ring or polyline using the
 * Ramer-Douglas-Peucker algorithm.
 *
 * @param {Cartesian2[]} points An array of {@link Cartesian2} points representing a polygon ring or polyline.
 * @param {number} tolerance The maximum perpendicular distance tolerance. Points closer than this
 *   to the simplified line are removed.
 * @param {number} [minimumPoints=3] The minimum number of points to retain. The algorithm will
 *   not simplify below this count.
 * @returns {Cartesian2[]} A new simplified array of {@link Cartesian2} points.
 *
 * @exception {DeveloperError} points is required.
 * @exception {DeveloperError} tolerance is required and must be non-negative.
 *
 * @example
 * const simplified = Cesium.PolygonSimplifier.simplify2D(ringPoints, 0.00001);
 */
PolygonSimplifier.simplify2D = function (points, tolerance, minimumPoints) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("points", points);
  Check.typeOf.number("tolerance", tolerance);
  //>>includeEnd('debug');

  if (!defined(minimumPoints)) {
    minimumPoints = 3;
  }

  if (points.length <= minimumPoints) {
    const result = new Array(points.length);
    for (let i = 0; i < points.length; i++) {
      result[i] = Cartesian2.clone(points[i]);
    }
    return result;
  }

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  douglasPeucker2D(points, 0, points.length - 1, tolerance, keep);

  let result = filterPoints(points, keep, Cartesian2.clone);

  // If we simplified too aggressively, iteratively add back points
  // with the greatest distance until we reach minimumPoints
  if (result.length < minimumPoints) {
    // Fall back to evenly spaced points
    result = [];
    const step = Math.max(1, Math.floor(points.length / minimumPoints));
    for (let i = 0; i < points.length && result.length < minimumPoints; i += step) {
      result.push(Cartesian2.clone(points[i]));
    }
    // Ensure we have enough
    while (result.length < minimumPoints && result.length < points.length) {
      result.push(Cartesian2.clone(points[result.length]));
    }
  }

  return result;
};

/**
 * Simplifies a 3D polygon ring or polyline using the
 * Ramer-Douglas-Peucker algorithm.
 *
 * @param {Cartesian3[]} points An array of {@link Cartesian3} points representing a polygon ring or polyline.
 * @param {number} tolerance The maximum perpendicular distance tolerance in meters.
 *   Points closer than this to the simplified line are removed.
 * @param {number} [minimumPoints=3] The minimum number of points to retain.
 * @returns {Cartesian3[]} A new simplified array of {@link Cartesian3} points.
 *
 * @exception {DeveloperError} points is required.
 * @exception {DeveloperError} tolerance is required and must be non-negative.
 *
 * @example
 * const simplified = Cesium.PolygonSimplifier.simplify3D(positions, 1.0);
 */
PolygonSimplifier.simplify3D = function (points, tolerance, minimumPoints) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("points", points);
  Check.typeOf.number("tolerance", tolerance);
  //>>includeEnd('debug');

  if (!defined(minimumPoints)) {
    minimumPoints = 3;
  }

  if (points.length <= minimumPoints) {
    const result = new Array(points.length);
    for (let i = 0; i < points.length; i++) {
      result[i] = Cartesian3.clone(points[i]);
    }
    return result;
  }

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  douglasPeucker3D(points, 0, points.length - 1, tolerance, keep);

  let result = filterPoints(points, keep, Cartesian3.clone);

  if (result.length < minimumPoints) {
    result = [];
    const step = Math.max(1, Math.floor(points.length / minimumPoints));
    for (let i = 0; i < points.length && result.length < minimumPoints; i += step) {
      result.push(Cartesian3.clone(points[i]));
    }
    while (result.length < minimumPoints && result.length < points.length) {
      result.push(Cartesian3.clone(points[result.length]));
    }
  }

  return result;
};

/**
 * Simplifies a {@link PolygonHierarchy} by applying the Ramer-Douglas-Peucker
 * algorithm to the outer boundary and all hole rings. The simplification is
 * performed in geographic (longitude/latitude) space.
 *
 * @param {PolygonHierarchy} hierarchy The polygon hierarchy to simplify.
 * @param {number} tolerance The maximum perpendicular distance tolerance in radians.
 * @param {object} [options] Options object.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for geographic projection.
 * @param {number} [options.minimumPoints=3] Minimum number of points to retain per ring.
 * @returns {PolygonHierarchy} A new simplified {@link PolygonHierarchy}.
 *
 * @exception {DeveloperError} hierarchy is required.
 * @exception {DeveloperError} tolerance is required.
 *
 * @example
 * const simplified = Cesium.PolygonSimplifier.simplifyHierarchy(
 *   hierarchy,
 *   0.00001 // tolerance in radians (~1.1m at equator)
 * );
 */
PolygonSimplifier.simplifyHierarchy = function (hierarchy, tolerance, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("hierarchy", hierarchy);
  Check.typeOf.number("tolerance", tolerance);
  //>>includeEnd('debug');

  options = defined(options) ? options : {};
  const ellipsoid = defined(options.ellipsoid)
    ? options.ellipsoid
    : Ellipsoid.default;
  const minimumPoints = defined(options.minimumPoints)
    ? options.minimumPoints
    : 3;

  // Simplify outer ring
  const outerSimplified = simplifyCartesian3Ring(
    hierarchy.positions,
    tolerance,
    minimumPoints,
    ellipsoid,
  );

  // Simplify holes
  const holes = [];
  if (defined(hierarchy.holes)) {
    for (let i = 0; i < hierarchy.holes.length; i++) {
      const holeSimplified = PolygonSimplifier.simplifyHierarchy(
        hierarchy.holes[i],
        tolerance,
        options,
      );
      // Only keep holes that still have enough vertices
      if (holeSimplified.positions.length >= 3) {
        holes.push(holeSimplified);
      }
    }
  }

  return new PolygonHierarchy(outerSimplified, holes);
};

const cartographicScratch = new Cartographic();

/**
 * Simplifies a ring of Cartesian3 positions by projecting to geographic
 * coordinates, applying 2D simplification, and projecting back.
 *
 * @param {Cartesian3[]} positions The ring positions.
 * @param {number} tolerance Tolerance in radians.
 * @param {number} minimumPoints Minimum points to keep.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @returns {Cartesian3[]} Simplified positions.
 * @private
 */
function simplifyCartesian3Ring(positions, tolerance, minimumPoints, ellipsoid) {
  if (!defined(positions) || positions.length <= minimumPoints) {
    if (!defined(positions)) {
      return [];
    }
    const result = new Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      result[i] = Cartesian3.clone(positions[i]);
    }
    return result;
  }

  // Project to 2D (lon, lat)
  const points2D = new Array(positions.length);
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
    }
  }

  // Simplify in 2D
  const simplified2D = PolygonSimplifier.simplify2D(
    points2D,
    tolerance,
    minimumPoints,
  );

  // Project back to 3D at height = 0
  const result = new Array(simplified2D.length);
  for (let i = 0; i < simplified2D.length; i++) {
    result[i] = Cartesian3.fromRadians(
      simplified2D[i].x,
      simplified2D[i].y,
      0.0,
      ellipsoid,
    );
  }
  return result;
}

export default PolygonSimplifier;
