import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import MapProjectionType from "./MapProjectionType.js";
import Rectangle from "./Rectangle.js";
import SerializedMapProjection from "./SerializedMapProjection.js";
import when from "../ThirdParty/when.js";
import proj4 from "../ThirdParty/proj4-2.6.0.js";

var UNBOUNDED = new Rectangle(
  Number.NEGATIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  Number.POSITIVE_INFINITY,
  Number.POSITIVE_INFINITY
);

/**
 * MapProjection using PROJ.4 style well-known-text.
 * Users should use the <code>options.wgs84Bounds</code> parameter when using local-area projections,
 * as local area projections may produce unexpected results outside their valid boundaries
 * in Cartographic space. These unexpected results may cause computation errors elsewhere in Cesium.
 *
 * {@link Globe.cartographicLimitRectangle} may also be useful for reducing
 * visual artifacts due to clamping of coordinates to the <code>options.wgs84Bounds</code>.
 *
 * Scenes using Proj4Projection will default to <code>MapMode2D.ROTATE</code> instead of <code>MapMode2D.INFINITE_SCROLL</code>.
 *
 * @alias Proj4Projection
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.wellKnownText proj4-style well known text specifying the projection. Defaults to well-known-text for EPSG:3857, web mercator.
 * @param {Number} [options.heightScale=1.0] Scale to convert from heights in meters to the projection's units.
 * @param {Rectangle} [options.wgs84Bounds] Cartographic bounds over which the projection is valid. Cartographic points will be clamped to these bounds prior to projection.
 * @param {Rectangle} [options.projectedBounds] Projected bounds over which the inverse projection is valid. Projected points will be clamped to these bounds prior to unprojection.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 *
 * @see MapProjection
 * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Map%20Projections.html|Map Projections Demo}
 */
function Proj4Projection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.wellKnownText", options.wellKnownText);
  //>>includeEnd('debug');

  var wkt = options.wellKnownText;
  var heightScale = defaultValue(options.heightScale, 1.0);
  var wgs84Bounds = defaultValue(options.wgs84Bounds, Rectangle.MAX_VALUE);
  var projectedBounds = defaultValue(options.projectedBounds, UNBOUNDED);

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._projection = proj4(wkt);
  this._wkt = wkt;

  this._heightScale = heightScale;
  this._inverseHeightScale = 1.0 / heightScale;

  this._wgs84Bounds = Rectangle.clone(wgs84Bounds);
  this._projectedBounds = Rectangle.clone(projectedBounds);
}

/**
 * Returns a JSON object that can be messaged to a web worker.
 *
 * @private
 * @returns {SerializedMapProjection} A JSON object from which the MapProjection can be rebuilt.
 */
Proj4Projection.prototype.serialize = function () {
  var json = {
    wellKnownText: this.wellKnownText,
    ellipsoid: Ellipsoid.pack(this.ellipsoid, []),
    wgs84Bounds: Rectangle.pack(this.wgs84Bounds, []),
    projectedBounds: Rectangle.pack(this.projectedBounds, []),
    heightScale: this.heightScale,
  };

  return new SerializedMapProjection(MapProjectionType.PROJ4, json);
};

/**
 * Reconstructs a <code>Proj4Projection</object> from the input JSON.
 *
 * @private
 * @param {SerializedMapProjection} serializedMapProjection A JSON object from which the MapProjection can be rebuilt.
 * @returns {Promise.<Proj4Projection>} A Promise that resolves to a MapProjection that is ready for use, or rejects if the SerializedMapProjection is malformed.
 */
Proj4Projection.deserialize = function (serializedMapProjection) {
  var json = serializedMapProjection.json;
  var ellipsoid = Ellipsoid.unpack(json.ellipsoid);
  var wgs84Bounds = Rectangle.unpack(json.wgs84Bounds);
  var projectedBounds = Rectangle.unpack(json.projectedBounds);
  return when.resolve(
    new Proj4Projection({
      wellKnownText: json.wellKnownText,
      ellipsoid: ellipsoid,
      wgs84Bounds: wgs84Bounds,
      projectedBounds: projectedBounds,
      heightScale: json.heightScale,
    })
  );
};

Object.defineProperties(Proj4Projection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof Proj4Projection.prototype
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
   * The well-known-text string for the projection.
   * @memberof Proj4Projection.prototype
   * @type {String}
   * @readonly
   */
  wellKnownText: {
    get: function () {
      return this._wkt;
    },
  },

  /**
   * The scale for converting from heights in meters to the projection's units.
   * @memberof Proj4Projection.prototype
   * @type {Number}
   * @readonly
   */
  heightScale: {
    get: function () {
      return this._heightScale;
    },
  },

  /**
   * Gets whether or not the projection evenly maps meridians to vertical lines.
   * Not all Proj4 projections are cylindrical about the equator.
   *
   * @memberof Proj4Projection.prototype
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

  /**
   * The bounds in Cartographic coordinates over which this projection is valid.
   * @memberof Proj4Projection.prototype
   * @type {Rectangle}
   * @readonly
   */
  wgs84Bounds: {
    get: function () {
      return this._wgs84Bounds;
    },
  },

  /**
   * The bounds in projected coordinates over which this projection is valid.
   * @memberof Proj4Projection.prototype
   * @type {Rectangle}
   * @readonly
   */
  projectedBounds: {
    get: function () {
      return this._projectedBounds;
    },
  },
});

var scratchProjectionArray = [0.0, 0.0];
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
Proj4Projection.prototype.project = function (cartographic, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartographic", cartographic);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  var wgs84Bounds = this.wgs84Bounds;
  scratchProjectionArray[0] = CesiumMath.toDegrees(
    CesiumMath.clamp(cartographic.longitude, wgs84Bounds.west, wgs84Bounds.east)
  );
  scratchProjectionArray[1] = CesiumMath.toDegrees(
    CesiumMath.clamp(
      cartographic.latitude,
      wgs84Bounds.south,
      wgs84Bounds.north
    )
  );

  var projected = this._projection.forward(scratchProjectionArray);

  result.x = projected[0];
  result.y = projected[1];
  result.z = cartographic.height * this._heightScale;

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
Proj4Projection.prototype.unproject = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesian", cartesian);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartographic();
  }
  var projectedBounds = this.projectedBounds;

  scratchProjectionArray[0] = CesiumMath.clamp(
    cartesian.x,
    projectedBounds.west,
    projectedBounds.east
  );
  scratchProjectionArray[1] = CesiumMath.clamp(
    cartesian.y,
    projectedBounds.south,
    projectedBounds.north
  );

  var unprojected = this._projection.inverse(scratchProjectionArray);

  result.longitude = CesiumMath.toRadians(unprojected[0]);
  result.latitude = CesiumMath.toRadians(unprojected[1]);
  result.height = cartesian.z * this._inverseHeightScale;

  return result;
};

export default Proj4Projection;
