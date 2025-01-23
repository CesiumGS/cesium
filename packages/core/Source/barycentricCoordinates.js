import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";

const scratchCartesian1 = new Cartesian3();
const scratchCartesian2 = new Cartesian3();
const scratchCartesian3 = new Cartesian3();

/**
 * Computes the barycentric coordinates for a point with respect to a triangle.
 *
 * @function
 *
 * @param {Cartesian2|Cartesian3} point The point to test.
 * @param {Cartesian2|Cartesian3} p0 The first point of the triangle, corresponding to the barycentric x-axis.
 * @param {Cartesian2|Cartesian3} p1 The second point of the triangle, corresponding to the barycentric y-axis.
 * @param {Cartesian2|Cartesian3} p2 The third point of the triangle, corresponding to the barycentric z-axis.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3|undefined} The modified result parameter or a new Cartesian3 instance if one was not provided. If the triangle is degenerate the function will return undefined.
 *
 * @example
 * // Returns Cartesian3.UNIT_X
 * const p = new Cesium.Cartesian3(-1.0, 0.0, 0.0);
 * const b = Cesium.barycentricCoordinates(p,
 *   new Cesium.Cartesian3(-1.0, 0.0, 0.0),
 *   new Cesium.Cartesian3( 1.0, 0.0, 0.0),
 *   new Cesium.Cartesian3( 0.0, 1.0, 1.0));
 */
function barycentricCoordinates(point, p0, p1, p2, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("point", point);
  Check.defined("p0", p0);
  Check.defined("p1", p1);
  Check.defined("p2", p2);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  // Implementation based on http://www.blackpawn.com/texts/pointinpoly/default.html.
  let v0;
  let v1;
  let v2;
  let dot00;
  let dot01;
  let dot02;
  let dot11;
  let dot12;

  if (!defined(p0.z)) {
    if (Cartesian2.equalsEpsilon(point, p0, CesiumMath.EPSILON14)) {
      return Cartesian3.clone(Cartesian3.UNIT_X, result);
    }
    if (Cartesian2.equalsEpsilon(point, p1, CesiumMath.EPSILON14)) {
      return Cartesian3.clone(Cartesian3.UNIT_Y, result);
    }
    if (Cartesian2.equalsEpsilon(point, p2, CesiumMath.EPSILON14)) {
      return Cartesian3.clone(Cartesian3.UNIT_Z, result);
    }

    v0 = Cartesian2.subtract(p1, p0, scratchCartesian1);
    v1 = Cartesian2.subtract(p2, p0, scratchCartesian2);
    v2 = Cartesian2.subtract(point, p0, scratchCartesian3);

    dot00 = Cartesian2.dot(v0, v0);
    dot01 = Cartesian2.dot(v0, v1);
    dot02 = Cartesian2.dot(v0, v2);
    dot11 = Cartesian2.dot(v1, v1);
    dot12 = Cartesian2.dot(v1, v2);
  } else {
    if (Cartesian3.equalsEpsilon(point, p0, CesiumMath.EPSILON14)) {
      return Cartesian3.clone(Cartesian3.UNIT_X, result);
    }
    if (Cartesian3.equalsEpsilon(point, p1, CesiumMath.EPSILON14)) {
      return Cartesian3.clone(Cartesian3.UNIT_Y, result);
    }
    if (Cartesian3.equalsEpsilon(point, p2, CesiumMath.EPSILON14)) {
      return Cartesian3.clone(Cartesian3.UNIT_Z, result);
    }

    v0 = Cartesian3.subtract(p1, p0, scratchCartesian1);
    v1 = Cartesian3.subtract(p2, p0, scratchCartesian2);
    v2 = Cartesian3.subtract(point, p0, scratchCartesian3);

    dot00 = Cartesian3.dot(v0, v0);
    dot01 = Cartesian3.dot(v0, v1);
    dot02 = Cartesian3.dot(v0, v2);
    dot11 = Cartesian3.dot(v1, v1);
    dot12 = Cartesian3.dot(v1, v2);
  }

  result.y = dot11 * dot02 - dot01 * dot12;
  result.z = dot00 * dot12 - dot01 * dot02;
  const q = dot00 * dot11 - dot01 * dot01;

  // Triangle is degenerate
  if (q === 0) {
    return undefined;
  }

  result.y /= q;
  result.z /= q;
  result.x = 1.0 - result.y - result.z;
  return result;
}
export default barycentricCoordinates;
