import ArcType from "../Core/ArcType.js";
import defaultValue from "../Core/defaultValue.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolygonGeometry from "../Core/PolygonGeometry.js";

/**
 * No holes or complex polygons. TODO
 * @alias ClippingPolygon
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 *
 * TODO: Example
 */
function ClippingPolygon(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  // TODO: Check
  // TODO: At least three positions
  //>>includeEnd('debug');

  this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this.arcType = defaultValue(options.arcType, ArcType.GEODESIC);
  this.positions = options.positions;
}

Object.defineProperties(ClippingPolygon.prototype, {});

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
 * Computes a rectangle which encloses the polygon defined by the list of positions, including cases over the international date line and the poles.
 *
 * @param {Rectangle} [result] An object in which to store the result.
 *
 * @returns {Rectangle} The result rectangle
 */
ClippingPolygon.prototype.computeRectangle = function (result) {
  return PolygonGeometry.computeRectangleFromPositions(
    this.positions,
    this.ellipsoid,
    this.arcType,
    result
  );
};

export default ClippingPolygon;
