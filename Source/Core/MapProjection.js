import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import DeveloperError from "./DeveloperError.js";
import Rectangle from "./Rectangle.js";

/**
 * Defines how geodetic ellipsoid coordinates ({@link Cartographic}) project to a
 * flat map like Cesium's 2D and Columbus View modes.
 *
 * @alias MapProjection
 * @constructor
 * @abstract
 *
 * @see GeographicProjection
 * @see WebMercatorProjection
 * @see CustomProjection
 * @see Proj4Projection
 * @see Matrix4Projection
 */
function MapProjection() {
  DeveloperError.throwInstantiationError();
}

Object.defineProperties(MapProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof MapProjection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: DeveloperError.throwInstantiationError,
  },
  /**
   * Gets whether or not the projection evenly maps meridians to vertical lines.
   * Projections that evenly map meridians to vertical lines (such as Web Mercator and Geographic) do not need
   * addition 2D vertex attributes and are more efficient to render.
   *
   * @memberof MapProjection.prototype
   *
   * @type {Boolean}
   * @readonly
   * @private
   */
  isNormalCylindrical: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Projects {@link Cartographic} coordinates, in radians, to projection-specific map coordinates, in meters.
 *
 * @memberof MapProjection
 * @function
 *
 * @param {Cartographic} cartographic The coordinates to project.
 * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
MapProjection.prototype.project = DeveloperError.throwInstantiationError;

/**
 * Returns a JSON object that can be messaged to a web worker.
 *
 * @memberof MapProjection
 * @function
 * @private
 * @returns {SerializedMapProjection} A JSON object from which the MapProjection can be rebuilt.
 */
MapProjection.prototype.serialize = DeveloperError.throwInstantiationError;

/**
 * Reconstructs a <code>MapProjection</object> object from the input JSON.
 *
 * @function
 * @private
 *
 * @param {SerializedMapProjection} serializedMapProjection A JSON object from which the MapProjection can be rebuilt.
 * @returns {Promise.<MapProjection>} A Promise that resolves to a MapProjection that is ready for use, or rejects if the SerializedMapProjection is malformed.
 */
MapProjection.deserialize = DeveloperError.throwInstantiationError;

/**
 * Unprojects projection-specific map {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
 * coordinates, in radians.
 *
 * @memberof MapProjection
 * @function
 *
 * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
 * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
MapProjection.prototype.unproject = DeveloperError.throwInstantiationError;

var maxcoordRectangleScratch = new Rectangle();
var rectangleCenterScratch = new Cartographic();
/**
 * Approximates the X/Y extents of a map projection in 2D.
 *
 * @function
 *
 * @param {MapProjection} mapProjection A map projection from cartographic coordinates to 2D space.
 * @param {Cartesian2} result result parameter.
 * @private
 */
MapProjection.approximateMaximumCoordinate = function (mapProjection, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("mapProjection", mapProjection);
  Check.defined("result", result);
  //>>includeEnd('debug');

  var projectedExtents = Rectangle.approximateProjectedExtents(
    {
      cartographicRectangle: Rectangle.MAX_VALUE,
      mapProjection: mapProjection,
    },
    maxcoordRectangleScratch
  );
  var projectedCenter = Rectangle.center(
    projectedExtents,
    rectangleCenterScratch
  );

  result.x = projectedCenter.longitude + projectedExtents.width * 0.5;
  result.y = projectedCenter.latitude + projectedExtents.height * 0.5;

  return result;
};

export default MapProjection;
