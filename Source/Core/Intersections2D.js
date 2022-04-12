import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Contains functions for operating on 2D triangles.
 *
 * @namespace Intersections2D
 */
const Intersections2D = {};

/**
 * Splits a 2D triangle at given axis-aligned threshold value and returns the resulting
 * polygon on a given side of the threshold.  The resulting polygon may have 0, 1, 2,
 * 3, or 4 vertices.
 *
 * @param {Number} threshold The threshold coordinate value at which to clip the triangle.
 * @param {Boolean} keepAbove true to keep the portion of the triangle above the threshold, or false
 *                            to keep the portion below.
 * @param {Number} u0 The coordinate of the first vertex in the triangle, in counter-clockwise order.
 * @param {Number} u1 The coordinate of the second vertex in the triangle, in counter-clockwise order.
 * @param {Number} u2 The coordinate of the third vertex in the triangle, in counter-clockwise order.
 * @param {Number[]} [result] The array into which to copy the result.  If this parameter is not supplied,
 *                            a new array is constructed and returned.
 * @returns {Number[]} The polygon that results after the clip, specified as a list of
 *                     vertices.  The vertices are specified in counter-clockwise order.
 *                     Each vertex is either an index from the existing list (identified as
 *                     a 0, 1, or 2) or -1 indicating a new vertex not in the original triangle.
 *                     For new vertices, the -1 is followed by three additional numbers: the
 *                     index of each of the two original vertices forming the line segment that
 *                     the new vertex lies on, and the fraction of the distance from the first
 *                     vertex to the second one.
 *
 * @example
 * const result = Cesium.Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.2, 0.6, 0.4);
 * // result === [2, 0, -1, 1, 0, 0.25, -1, 1, 2, 0.5]
 */
Intersections2D.clipTriangleAtAxisAlignedThreshold = function (
  threshold,
  keepAbove,
  u0,
  u1,
  u2,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(threshold)) {
    throw new DeveloperError("threshold is required.");
  }
  if (!defined(keepAbove)) {
    throw new DeveloperError("keepAbove is required.");
  }
  if (!defined(u0)) {
    throw new DeveloperError("u0 is required.");
  }
  if (!defined(u1)) {
    throw new DeveloperError("u1 is required.");
  }
  if (!defined(u2)) {
    throw new DeveloperError("u2 is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = [];
  } else {
    result.length = 0;
  }

  let u0Behind;
  let u1Behind;
  let u2Behind;
  if (keepAbove) {
    u0Behind = u0 < threshold;
    u1Behind = u1 < threshold;
    u2Behind = u2 < threshold;
  } else {
    u0Behind = u0 > threshold;
    u1Behind = u1 > threshold;
    u2Behind = u2 > threshold;
  }

  const numBehind = u0Behind + u1Behind + u2Behind;

  let u01Ratio;
  let u02Ratio;
  let u12Ratio;
  let u10Ratio;
  let u20Ratio;
  let u21Ratio;

  if (numBehind === 1) {
    if (u0Behind) {
      u01Ratio = (threshold - u0) / (u1 - u0);
      u02Ratio = (threshold - u0) / (u2 - u0);

      result.push(1);

      result.push(2);

      if (u02Ratio !== 1.0) {
        result.push(-1);
        result.push(0);
        result.push(2);
        result.push(u02Ratio);
      }

      if (u01Ratio !== 1.0) {
        result.push(-1);
        result.push(0);
        result.push(1);
        result.push(u01Ratio);
      }
    } else if (u1Behind) {
      u12Ratio = (threshold - u1) / (u2 - u1);
      u10Ratio = (threshold - u1) / (u0 - u1);

      result.push(2);

      result.push(0);

      if (u10Ratio !== 1.0) {
        result.push(-1);
        result.push(1);
        result.push(0);
        result.push(u10Ratio);
      }

      if (u12Ratio !== 1.0) {
        result.push(-1);
        result.push(1);
        result.push(2);
        result.push(u12Ratio);
      }
    } else if (u2Behind) {
      u20Ratio = (threshold - u2) / (u0 - u2);
      u21Ratio = (threshold - u2) / (u1 - u2);

      result.push(0);

      result.push(1);

      if (u21Ratio !== 1.0) {
        result.push(-1);
        result.push(2);
        result.push(1);
        result.push(u21Ratio);
      }

      if (u20Ratio !== 1.0) {
        result.push(-1);
        result.push(2);
        result.push(0);
        result.push(u20Ratio);
      }
    }
  } else if (numBehind === 2) {
    if (!u0Behind && u0 !== threshold) {
      u10Ratio = (threshold - u1) / (u0 - u1);
      u20Ratio = (threshold - u2) / (u0 - u2);

      result.push(0);

      result.push(-1);
      result.push(1);
      result.push(0);
      result.push(u10Ratio);

      result.push(-1);
      result.push(2);
      result.push(0);
      result.push(u20Ratio);
    } else if (!u1Behind && u1 !== threshold) {
      u21Ratio = (threshold - u2) / (u1 - u2);
      u01Ratio = (threshold - u0) / (u1 - u0);

      result.push(1);

      result.push(-1);
      result.push(2);
      result.push(1);
      result.push(u21Ratio);

      result.push(-1);
      result.push(0);
      result.push(1);
      result.push(u01Ratio);
    } else if (!u2Behind && u2 !== threshold) {
      u02Ratio = (threshold - u0) / (u2 - u0);
      u12Ratio = (threshold - u1) / (u2 - u1);

      result.push(2);

      result.push(-1);
      result.push(0);
      result.push(2);
      result.push(u02Ratio);

      result.push(-1);
      result.push(1);
      result.push(2);
      result.push(u12Ratio);
    }
  } else if (numBehind !== 3) {
    // Completely in front of threshold
    result.push(0);
    result.push(1);
    result.push(2);
  }
  // else Completely behind threshold

  return result;
};

/**
 * Compute the barycentric coordinates of a 2D position within a 2D triangle.
 *
 * @param {Number} x The x coordinate of the position for which to find the barycentric coordinates.
 * @param {Number} y The y coordinate of the position for which to find the barycentric coordinates.
 * @param {Number} x1 The x coordinate of the triangle's first vertex.
 * @param {Number} y1 The y coordinate of the triangle's first vertex.
 * @param {Number} x2 The x coordinate of the triangle's second vertex.
 * @param {Number} y2 The y coordinate of the triangle's second vertex.
 * @param {Number} x3 The x coordinate of the triangle's third vertex.
 * @param {Number} y3 The y coordinate of the triangle's third vertex.
 * @param {Cartesian3} [result] The instance into to which to copy the result.  If this parameter
 *                     is undefined, a new instance is created and returned.
 * @returns {Cartesian3} The barycentric coordinates of the position within the triangle.
 *
 * @example
 * const result = Cesium.Intersections2D.computeBarycentricCoordinates(0.0, 0.0, 0.0, 1.0, -1, -0.5, 1, -0.5);
 * // result === new Cesium.Cartesian3(1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0);
 */
Intersections2D.computeBarycentricCoordinates = function (
  x,
  y,
  x1,
  y1,
  x2,
  y2,
  x3,
  y3,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(x)) {
    throw new DeveloperError("x is required.");
  }
  if (!defined(y)) {
    throw new DeveloperError("y is required.");
  }
  if (!defined(x1)) {
    throw new DeveloperError("x1 is required.");
  }
  if (!defined(y1)) {
    throw new DeveloperError("y1 is required.");
  }
  if (!defined(x2)) {
    throw new DeveloperError("x2 is required.");
  }
  if (!defined(y2)) {
    throw new DeveloperError("y2 is required.");
  }
  if (!defined(x3)) {
    throw new DeveloperError("x3 is required.");
  }
  if (!defined(y3)) {
    throw new DeveloperError("y3 is required.");
  }
  //>>includeEnd('debug');

  const x1mx3 = x1 - x3;
  const x3mx2 = x3 - x2;
  const y2my3 = y2 - y3;
  const y1my3 = y1 - y3;
  const inverseDeterminant = 1.0 / (y2my3 * x1mx3 + x3mx2 * y1my3);
  const ymy3 = y - y3;
  const xmx3 = x - x3;
  const l1 = (y2my3 * xmx3 + x3mx2 * ymy3) * inverseDeterminant;
  const l2 = (-y1my3 * xmx3 + x1mx3 * ymy3) * inverseDeterminant;
  const l3 = 1.0 - l1 - l2;

  if (defined(result)) {
    result.x = l1;
    result.y = l2;
    result.z = l3;
    return result;
  }
  return new Cartesian3(l1, l2, l3);
};

/**
 * Compute the intersection between 2 line segments
 *
 * @param {Number} x00 The x coordinate of the first line's first vertex.
 * @param {Number} y00 The y coordinate of the first line's first vertex.
 * @param {Number} x01 The x coordinate of the first line's second vertex.
 * @param {Number} y01 The y coordinate of the first line's second vertex.
 * @param {Number} x10 The x coordinate of the second line's first vertex.
 * @param {Number} y10 The y coordinate of the second line's first vertex.
 * @param {Number} x11 The x coordinate of the second line's second vertex.
 * @param {Number} y11 The y coordinate of the second line's second vertex.
 * @param {Cartesian2} [result] The instance into to which to copy the result. If this parameter
 *                     is undefined, a new instance is created and returned.
 * @returns {Cartesian2} The intersection point, undefined if there is no intersection point or lines are coincident.
 *
 * @example
 * const result = Cesium.Intersections2D.computeLineSegmentLineSegmentIntersection(0.0, 0.0, 0.0, 2.0, -1, 1, 1, 1);
 * // result === new Cesium.Cartesian2(0.0, 1.0);
 */
Intersections2D.computeLineSegmentLineSegmentIntersection = function (
  x00,
  y00,
  x01,
  y01,
  x10,
  y10,
  x11,
  y11,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("x00", x00);
  Check.typeOf.number("y00", y00);
  Check.typeOf.number("x01", x01);
  Check.typeOf.number("y01", y01);
  Check.typeOf.number("x10", x10);
  Check.typeOf.number("y10", y10);
  Check.typeOf.number("x11", x11);
  Check.typeOf.number("y11", y11);
  //>>includeEnd('debug');

  const numerator1A = (x11 - x10) * (y00 - y10) - (y11 - y10) * (x00 - x10);
  const numerator1B = (x01 - x00) * (y00 - y10) - (y01 - y00) * (x00 - x10);
  const denominator1 = (y11 - y10) * (x01 - x00) - (x11 - x10) * (y01 - y00);

  // If denominator = 0, then lines are parallel. If denominator = 0 and both numerators are 0, then coincident
  if (denominator1 === 0) {
    return;
  }

  const ua1 = numerator1A / denominator1;
  const ub1 = numerator1B / denominator1;

  if (ua1 >= 0 && ua1 <= 1 && ub1 >= 0 && ub1 <= 1) {
    if (!defined(result)) {
      result = new Cartesian2();
    }

    result.x = x00 + ua1 * (x01 - x00);
    result.y = y00 + ua1 * (y01 - y00);

    return result;
  }
};
export default Intersections2D;
