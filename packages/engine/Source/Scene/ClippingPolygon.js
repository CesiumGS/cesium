import Check from "../Core/Check.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import CesiumMath from "../Core/Math.js";
import PolygonGeometry from "../Core/PolygonGeometry.js";
import Rectangle from "../Core/Rectangle.js";

/**
 * A geodesic polygon to be used with {@link ClippingPlaneCollection} for selectively hiding regions in a model, a 3D tileset, or the globe.
 * @alias ClippingPolygon
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions A list of three or more Cartesian coordinates defining the outer ring of the clipping polygon.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84]
 *
 * @example
 * const positions = Cesium.Cartesian3.fromRadiansArray([
 *     -1.3194369277314022,
 *     0.6988062530900625,
 *     -1.31941,
 *     0.69879,
 *     -1.3193955980204217,
 *     0.6988091578771254,
 *     -1.3193931220959367,
 *     0.698743632490865,
 *     -1.3194358224045408,
 *     0.6987471965556998,
 * ]);
 *
 * const polygon = new Cesium.ClippingPolygon({
 *     positions: positions
 * });
 */
function ClippingPolygon(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.positions", options.positions);
  Check.typeOf.number.greaterThanOrEquals(
    "options.positions.length",
    options.positions.length,
    3
  );
  //>>includeEnd('debug');

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._positions = [...options.positions];
}

Object.defineProperties(ClippingPolygon.prototype, {
  /**
   * Returns the total number of positions in the polygon, include any holes.
   *
   * @memberof ClippingPolygon.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._positions.length;
    },
  },
  /**
   * Returns the outer ring of positions.
   *
   * @memberof ClippingPolygon.prototype
   * @type {Cartesian3[]}
   * @readonly
   */
  positions: {
    get: function () {
      return this._positions;
    },
  },
  /**
   * Returns the ellipsoid used to project the polygon onto surfaces when clipping.
   *
   * @memberof ClippingPolygon.prototype
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },
});

/**
 * Clones the ClippingPolygon without setting its ownership.
 * @param {ClippingPolygon} polygon The ClippingPolygon to be cloned
 * @param {ClippingPolygon} [result] The object on which to store the cloned parameters.
 * @returns {ClippingPolygon} a clone of the input ClippingPolygon
 */
ClippingPolygon.clone = function (polygon, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new ClippingPolygon({
      positions: polygon.positions,
      ellipsoid: polygon.ellipsoid,
    });
  }

  result._ellipsoid = polygon.ellipsoid;
  result._positions.length = 0;
  result._positions.push(...polygon.positions);
  return result;
};

/**
 * Compares the provided ClippingPolygons and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Plane} left The first polygon.
 * @param {Plane} right The second polygon.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
ClippingPolygon.equals = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  return (
    left.ellipsoid.equals(right.ellipsoid) && left.positions === right.positions
  );
};

/**
 * Computes a cartographic rectangle which encloses the polygon defined by the list of positions, including cases over the international date line and the poles.
 *
 * @param {Rectangle} [result] An object in which to store the result.
 * @returns {Rectangle} The result rectangle
 */
ClippingPolygon.prototype.computeRectangle = function (result) {
  return PolygonGeometry.computeRectangleFromPositions(
    this.positions,
    this.ellipsoid,
    undefined,
    result
  );
};

const scratchRectangle = new Rectangle();
const spherePointScratch = new Cartesian3();
/**
 * Computes a rectangle with the spherical extents that encloses the polygon defined by the list of positions, including cases over the international date line and the poles.
 *
 * @private
 *
 * @param {Rectangle} [result] An object in which to store the result.
 * @returns {Rectangle} The result rectangle with spherical extents.
 */
ClippingPolygon.prototype.computeSphericalExtents = function (result) {
  if (!defined(result)) {
    result = new Rectangle();
  }

  const rectangle = this.computeRectangle(scratchRectangle);

  let spherePoint = Cartographic.toCartesian(
    Rectangle.southwest(rectangle),
    this.ellipsoid,
    spherePointScratch
  );

  // Project into plane with vertical for latitude
  let magXY = Math.sqrt(
    spherePoint.x * spherePoint.x + spherePoint.y * spherePoint.y
  );

  // Use fastApproximateAtan2 for alignment with shader
  let sphereLatitude = CesiumMath.fastApproximateAtan2(magXY, spherePoint.z);
  let sphereLongitude = CesiumMath.fastApproximateAtan2(
    spherePoint.x,
    spherePoint.y
  );

  result.south = sphereLatitude;
  result.west = sphereLongitude;

  spherePoint = Cartographic.toCartesian(
    Rectangle.northeast(rectangle),
    this.ellipsoid,
    spherePointScratch
  );

  // Project into plane with vertical for latitude
  magXY = Math.sqrt(
    spherePoint.x * spherePoint.x + spherePoint.y * spherePoint.y
  );

  // Use fastApproximateAtan2 for alignment with shader
  sphereLatitude = CesiumMath.fastApproximateAtan2(magXY, spherePoint.z);
  sphereLongitude = CesiumMath.fastApproximateAtan2(
    spherePoint.x,
    spherePoint.y
  );

  result.north = sphereLatitude;
  result.east = sphereLongitude;

  return result;
};

export default ClippingPolygon;
