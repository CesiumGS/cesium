import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import MapProjectionType from "./MapProjectionType.js";
import Matrix4 from "./Matrix4.js";
import SerializedMapProjection from "./SerializedMapProjection.js";
import when from "../ThirdParty/when.js";

/**
 * MapProjection that uses a {@link Matrix4} to map from longitude/latitude/altitude to projected coordinates.
 * Projection is performed by multiplying the longitude/latitude/altitude coordinate as a 4-vector with the matrix
 * and dividing by the w value of the result. The 4-vector is as follows:
 *   x : longitude
 *   y : latitude
 *   z : altitude
 *   w : 1.0
 *
 * Altitude is in meters. Longitude/Latitude may be provided to the vector as degrees (default) or radians.
 *
 * Scenes using Matrix4Projection will default to <code>MapMode2D.ROTATE</code> instead of <code>MapMode2D.INFINITE_SCROLL</code>.
 *
 * @alias Matrix4Projection
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Matrix4} options.matrix A 4x4 matrix.
 * @param {Boolean} [options.degrees=true] When true, the matrix is assumed to operate on longitude/latitude in degrees
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 *
 * @see MapProjection
 * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Map%20Projections.html|Map Projections Demo}
 */
function Matrix4Projection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.matrix", options.matrix);
  //>>includeEnd('debug');

  this._matrix = Matrix4.clone(options.matrix);
  this._inverse = Matrix4.inverse(options.matrix, new Matrix4());
  this._degrees = defaultValue(options.degrees, true);
  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._radiansMultiplier = this._degrees ? CesiumMath.DEGREES_PER_RADIAN : 1.0;
}

Object.defineProperties(Matrix4Projection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof Matrix4Projection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },

  /**
   * Gets the projection's matrix.
   * @memberof Matrix4Projection.prototype
   * @type {Matrix4}
   * @readonly
   */
  matrix: {
    get: function () {
      return this._matrix;
    },
  },

  /**
   * Gets whether or not the matrix assumes longitude and latitude are values in degrees
   * @memberof Matrix4Projection.prototype
   * @type {Boolean}
   * @readonly
   */
  degrees: {
    get: function () {
      return this._degrees;
    },
  },

  /**
   * Gets whether or not the projection evenly maps meridians to vertical lines.
   * Not all Matrix4 projections are cylindrical about the equator.
   *
   * @memberof Matrix4Projection.prototype
   *
   * @type {Boolean}
   * @readonly
   * @private
   */
  isNormalCylindrical: {
    get: function () {
      return false;
    },
  },
});

/**
 * Returns a JSON object that can be messaged to a web worker.
 *
 * @private
 * @returns {SerializedMapProjection} A JSON object from which the MapProjection can be rebuilt.
 */
Matrix4Projection.prototype.serialize = function () {
  var json = {
    packedMatrix: Matrix4.pack(this.matrix, []),
    degrees: this.degrees,
    packedEllipsoid: Ellipsoid.pack(this.ellipsoid, []),
  };

  return new SerializedMapProjection(MapProjectionType.MATRIX4, json);
};

/**
 * Reconstructs a <code>Matrix4Projection</object> from the input JSON.
 *
 * @private
 * @param {SerializedMapProjection} serializedMapProjection A JSON object from which the MapProjection can be rebuilt.
 * @returns {Promise.<Proj4Projection>} A Promise that resolves to a MapProjection that is ready for use, or rejects if the SerializedMapProjection is malformed.
 */
Matrix4Projection.deserialize = function (serializedMapProjection) {
  var json = serializedMapProjection.json;
  return when.resolve(
    new Matrix4Projection({
      matrix: Matrix4.unpack(json.packedMatrix),
      degrees: json.degrees,
      ellipsoid: Ellipsoid.unpack(json.packedEllipsoid),
    })
  );
};

var projectionCartesian4Scratch = new Cartesian4();
/**
 * Projects a {@link Cartographic} coordinate, in radians, to map coordinates in meters based on
 * the specified projection.
 *
 * @param {Cartographic} cartographic The coordinates to project.
 * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
Matrix4Projection.prototype.project = function (cartographic, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartographic", cartographic);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  var vec4 = projectionCartesian4Scratch;
  var multiplier = this._radiansMultiplier;
  vec4.x = cartographic.longitude * multiplier;
  vec4.y = cartographic.latitude * multiplier;
  vec4.z = cartographic.height;
  vec4.w = 1.0;

  vec4 = Matrix4.multiplyByVector(this.matrix, vec4, vec4);

  Cartesian3.fromElements(vec4.x, vec4.y, vec4.z, result);
  Cartesian3.divideByScalar(result, vec4.w, result);

  return result;
};

/**
 * Unprojects a projected {@link Cartesian3} coordinates in meters, to {@link Cartographic}
 * coordinates in radians based on the specified projection.
 *
 * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
 * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
Matrix4Projection.prototype.unproject = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesian", cartesian);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartographic();
  }

  var vec4 = Cartesian4.fromElements(
    cartesian.x,
    cartesian.y,
    cartesian.z,
    1.0,
    projectionCartesian4Scratch
  );
  vec4 = Matrix4.multiplyByVector(this._inverse, vec4, vec4);

  var multiplier = 1.0 / (this._radiansMultiplier * vec4.w);

  result.longitude = vec4.x * multiplier;
  result.latitude = vec4.y * multiplier;
  result.height = vec4.z;

  return result;
};
export default Matrix4Projection;
