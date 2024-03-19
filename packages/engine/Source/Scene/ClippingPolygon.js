import Check from "../Core/Check.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
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
 * @param {PolygonHierarchy} options.hierarchy TODO
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84]
 *
 * TODO: Example
 */
function ClippingPolygon(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.hierarchy", options.hierarchy);
  Check.typeOf.number.greaterThanOrEquals(
    "options.hierarchy.positions",
    options.hierarchy.positions,
    3
  );
  //>>includeEnd('debug');

  this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this.hierarchy = options.hierarchy;
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
      const hierarchy = this.hierarchy;
      let length = hierarchy.positions.length;
      let holes = hierarchy.holes;
      while (holes.positions.length > 0) {
        length += holes.positions.length;
        holes = holes.holes;
      }
      return length;
    },
  },
  /**
   * Returns the outer ring of positions.
   *
   * @memberof ClippingPolygon.prototype
   * @type {Cartesian3[]}
   * @readonly
   */
  outerPositions: {
    get: function () {
      return this.hierarchy.positions;
    },
  },
});

/**
 * Clones the ClippingPolygon without setting its ownership.
 * @param {ClippingPolygon} clippingPolygon The ClippingPolygon to be cloned
 * @param {ClippingPolygon} [result] The object on which to store the cloned parameters.
 * @returns {ClippingPolygon} a clone of the input ClippingPolygon
 */
ClippingPolygon.clone = function (clippingPlane, result) {
  // TODO
};

/**
 * Computes a cartographic rectangle which encloses the polygon defined by the list of positions, including cases over the international date line and the poles.
 *
 * @param {Rectangle} [result] An object in which to store the result.
 *
 * @returns {Rectangle} The result rectangle
 */
ClippingPolygon.prototype.computeRectangle = function (result) {
  return PolygonGeometry.computeRectangleFromPositions(
    this.hierarchy.positions,
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
  const rectangle = PolygonGeometry.computeRectangleFromPositions(
    this.hierarchy.positions,
    this.ellipsoid,
    undefined,
    scratchRectangle
  );

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
