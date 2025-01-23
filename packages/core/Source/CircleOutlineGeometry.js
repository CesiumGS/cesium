import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import EllipseOutlineGeometry from "./EllipseOutlineGeometry.js";
import Ellipsoid from "./Ellipsoid.js";

/**
 * A description of the outline of a circle on the ellipsoid.
 *
 * @alias CircleOutlineGeometry
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3} options.center The circle's center point in the fixed frame.
 * @param {number} options.radius The radius in meters.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid the circle will be on.
 * @param {number} [options.height=0.0] The distance in meters between the circle and the ellipsoid surface.
 * @param {number} [options.granularity=0.02] The angular distance between points on the circle in radians.
 * @param {number} [options.extrudedHeight=0.0] The distance in meters between the circle's extruded face and the ellipsoid surface.
 * @param {number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom of an extruded circle.
 *
 * @exception {DeveloperError} radius must be greater than zero.
 * @exception {DeveloperError} granularity must be greater than zero.
 *
 * @see CircleOutlineGeometry.createGeometry
 * @see Packable
 *
 * @example
 * // Create a circle.
 * const circle = new Cesium.CircleOutlineGeometry({
 *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
 *   radius : 100000.0
 * });
 * const geometry = Cesium.CircleOutlineGeometry.createGeometry(circle);
 */
function CircleOutlineGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const radius = options.radius;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("radius", radius);
  //>>includeEnd('debug');

  const ellipseGeometryOptions = {
    center: options.center,
    semiMajorAxis: radius,
    semiMinorAxis: radius,
    ellipsoid: options.ellipsoid,
    height: options.height,
    extrudedHeight: options.extrudedHeight,
    granularity: options.granularity,
    numberOfVerticalLines: options.numberOfVerticalLines,
  };
  this._ellipseGeometry = new EllipseOutlineGeometry(ellipseGeometryOptions);
  this._workerName = "createCircleOutlineGeometry";
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
CircleOutlineGeometry.packedLength = EllipseOutlineGeometry.packedLength;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {CircleOutlineGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
CircleOutlineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  //>>includeEnd('debug');
  return EllipseOutlineGeometry.pack(
    value._ellipseGeometry,
    array,
    startingIndex,
  );
};

const scratchEllipseGeometry = new EllipseOutlineGeometry({
  center: new Cartesian3(),
  semiMajorAxis: 1.0,
  semiMinorAxis: 1.0,
});
const scratchOptions = {
  center: new Cartesian3(),
  radius: undefined,
  ellipsoid: Ellipsoid.clone(Ellipsoid.UNIT_SPHERE),
  height: undefined,
  extrudedHeight: undefined,
  granularity: undefined,
  numberOfVerticalLines: undefined,
  semiMajorAxis: undefined,
  semiMinorAxis: undefined,
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {CircleOutlineGeometry} [result] The object into which to store the result.
 * @returns {CircleOutlineGeometry} The modified result parameter or a new CircleOutlineGeometry instance if one was not provided.
 */
CircleOutlineGeometry.unpack = function (array, startingIndex, result) {
  const ellipseGeometry = EllipseOutlineGeometry.unpack(
    array,
    startingIndex,
    scratchEllipseGeometry,
  );
  scratchOptions.center = Cartesian3.clone(
    ellipseGeometry._center,
    scratchOptions.center,
  );
  scratchOptions.ellipsoid = Ellipsoid.clone(
    ellipseGeometry._ellipsoid,
    scratchOptions.ellipsoid,
  );
  scratchOptions.height = ellipseGeometry._height;
  scratchOptions.extrudedHeight = ellipseGeometry._extrudedHeight;
  scratchOptions.granularity = ellipseGeometry._granularity;
  scratchOptions.numberOfVerticalLines = ellipseGeometry._numberOfVerticalLines;

  if (!defined(result)) {
    scratchOptions.radius = ellipseGeometry._semiMajorAxis;
    return new CircleOutlineGeometry(scratchOptions);
  }

  scratchOptions.semiMajorAxis = ellipseGeometry._semiMajorAxis;
  scratchOptions.semiMinorAxis = ellipseGeometry._semiMinorAxis;
  result._ellipseGeometry = new EllipseOutlineGeometry(scratchOptions);
  return result;
};

/**
 * Computes the geometric representation of an outline of a circle on an ellipsoid, including its vertices, indices, and a bounding sphere.
 *
 * @param {CircleOutlineGeometry} circleGeometry A description of the circle.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
CircleOutlineGeometry.createGeometry = function (circleGeometry) {
  return EllipseOutlineGeometry.createGeometry(circleGeometry._ellipseGeometry);
};
export default CircleOutlineGeometry;
