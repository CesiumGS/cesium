import Cartesian2 from "./Cartesian2.js";
import Check from "./Check.js";
import defined from "./defined.js";

/**
 * Computes the 2D convex hull of a set of points using the
 * <a href="https://en.wikipedia.org/wiki/Graham_scan">Graham scan</a> algorithm.
 *
 * @namespace ConvexHull2D
 *
 * @private
 */
const ConvexHull2D = {};

/**
 * Finds the point with the lowest y-coordinate (and leftmost x as a tiebreaker).
 * @param {Cartesian2[]} points The input points.
 * @returns {number} The index of the pivot point.
 * @private
 */
function findPivotIndex(points) {
  let pivotIndex = 0;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const pivot = points[pivotIndex];
    if (p.y < pivot.y || (p.y === pivot.y && p.x < pivot.x)) {
      pivotIndex = i;
    }
  }
  return pivotIndex;
}

/**
 * Returns the cross product of vectors (O->A) and (O->B).
 * A positive value means counter-clockwise turn,
 * negative means clockwise, zero means collinear.
 *
 * @param {Cartesian2} o The origin point.
 * @param {Cartesian2} a The first point.
 * @param {Cartesian2} b The second point.
 * @returns {number} The cross product value.
 * @private
 */
function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Computes the squared distance between two 2D points.
 *
 * @param {Cartesian2} a The first point.
 * @param {Cartesian2} b The second point.
 * @returns {number} The squared distance.
 * @private
 */
function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Removes duplicate points that have the same x and y coordinates within
 * a given epsilon tolerance.
 *
 * @param {Cartesian2[]} points The input points.
 * @param {number} epsilon The tolerance for considering two points equal.
 * @returns {Cartesian2[]} A new array with duplicates removed.
 * @private
 */
function removeDuplicates(points, epsilon) {
  const epsilonSquared = epsilon * epsilon;
  const unique = [points[0]];
  for (let i = 1; i < points.length; i++) {
    let isDuplicate = false;
    for (let j = 0; j < unique.length; j++) {
      if (distanceSquared(points[i], unique[j]) < epsilonSquared) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      unique.push(points[i]);
    }
  }
  return unique;
}

/**
 * Computes the convex hull of a set of 2D points using the Graham scan algorithm.
 *
 * The result is an array of {@link Cartesian2} points forming the convex hull
 * in counter-clockwise order.
 *
 * @param {Cartesian2[]} points An array of {@link Cartesian2} points. Must contain at least 1 point.
 * @param {number} [epsilon=1e-12] Tolerance for degenerate/collinear point removal.
 * @returns {Cartesian2[]} A new array of {@link Cartesian2} points representing the convex hull
 *   in counter-clockwise order.
 *
 * @exception {DeveloperError} points is required.
 * @exception {DeveloperError} points must contain at least one point.
 *
 * @example
 * const points = [
 *   new Cesium.Cartesian2(0, 0),
 *   new Cesium.Cartesian2(1, 0),
 *   new Cesium.Cartesian2(1, 1),
 *   new Cesium.Cartesian2(0, 1),
 *   new Cesium.Cartesian2(0.5, 0.5), // interior point
 * ];
 * const hull = Cesium.ConvexHull2D.compute(points);
 * // hull will be the 4 corners in counter-clockwise order
 */
ConvexHull2D.compute = function (points, epsilon) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("points", points);
  Check.typeOf.number.greaterThanOrEquals("points.length", points.length, 1);
  //>>includeEnd('debug');

  if (!defined(epsilon)) {
    epsilon = 1e-12;
  }

  // Remove duplicate points
  const uniquePoints = removeDuplicates(points, epsilon);

  // Trivial cases
  if (uniquePoints.length === 1) {
    return [Cartesian2.clone(uniquePoints[0])];
  }
  if (uniquePoints.length === 2) {
    return [
      Cartesian2.clone(uniquePoints[0]),
      Cartesian2.clone(uniquePoints[1]),
    ];
  }

  // Find the pivot (lowest y, then leftmost x)
  const pivotIndex = findPivotIndex(uniquePoints);
  const pivot = uniquePoints[pivotIndex];

  // Build sorted array of non-pivot points by polar angle relative to pivot
  const sorted = [];
  for (let i = 0; i < uniquePoints.length; i++) {
    if (i !== pivotIndex) {
      sorted.push(uniquePoints[i]);
    }
  }

  sorted.sort(function (a, b) {
    const crossValue = cross(pivot, a, b);
    if (Math.abs(crossValue) < epsilon) {
      // Collinear: closer point first
      return distanceSquared(pivot, a) - distanceSquared(pivot, b);
    }
    // Counter-clockwise (positive cross) should come first
    return -crossValue;
  });

  // Remove collinear points that are closer to pivot, keeping the farthest
  const filtered = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const crossValue = cross(pivot, sorted[i - 1], sorted[i]);
    if (Math.abs(crossValue) < epsilon) {
      // Collinear: replace with the farther one
      filtered[filtered.length - 1] = sorted[i];
    } else {
      filtered.push(sorted[i]);
    }
  }

  // Need at least 2 non-pivot points for a polygon
  if (filtered.length < 2) {
    // All points are collinear
    const result = [Cartesian2.clone(pivot)];
    for (let i = 0; i < filtered.length; i++) {
      result.push(Cartesian2.clone(filtered[i]));
    }
    return result;
  }

  // Graham scan
  const stack = [pivot, filtered[0]];
  for (let i = 1; i < filtered.length; i++) {
    // Remove points that would make a clockwise turn
    while (
      stack.length > 1 &&
      cross(stack[stack.length - 2], stack[stack.length - 1], filtered[i]) <=
        epsilon
    ) {
      stack.pop();
    }
    stack.push(filtered[i]);
  }

  // Clone all results
  const result = new Array(stack.length);
  for (let i = 0; i < stack.length; i++) {
    result[i] = Cartesian2.clone(stack[i]);
  }
  return result;
};

export default ConvexHull2D;
