import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import FeatureDetection from "./FeatureDetection.js";
import getAbsoluteUri from "./getAbsoluteUri.js";
import isDataUri from "./isDataUri.js";
import loadAndExecuteScript from "./loadAndExecuteScript.js";
import MapProjectionType from "./MapProjectionType.js";
import RuntimeError from "./RuntimeError.js";
import SerializedMapProjection from "./SerializedMapProjection.js";
import when from "../ThirdParty/when.js";

/**
 * {@link MapProjection} that uses custom project and unproject functions defined in user code.
 *
 * User code may be provided via a URL to an external JavaScript source or via data URI on supported platforms.
 *
 * The user code must contain a function named <code>createProjectionFunctions</code> that implements the
 * <code>CustomProjection~factory</code> interface to provide <code>CustomProjection~project</code> and
 * <code>CustomProjection~unproject</code> functions to a callback.
 *
 * Scenes using CustomProjection will default to <code>MapMode2D.ROTATE</code> instead of <code>MapMode2D.INFINITE_SCROLL</code>.
 *
 * @alias CustomProjection
 * @constructor
 *
 * @param {String} url The url of the custom code.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The MapProjection's ellipsoid.
 *
 * @see MapProjection
 * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Map%20Projections.html|Map Projections Demo}
 */
function CustomProjection(url, ellipsoid) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("url", url);
  // importScripts does not work with data URIs in Internet Explorer
  if (FeatureDetection.isInternetExplorer() && isDataUri(url)) {
    throw new DeveloperError(
      "data URI projection code is not supported in Internet Explorer"
    );
  }
  //>>includeEnd('debug');

  this._ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  this._project = undefined;
  this._unproject = undefined;

  var absoluteUrl = getAbsoluteUri(url);
  this._url = absoluteUrl;

  this._ready = false;
  this._readyPromise = buildCustomProjection(this, absoluteUrl);
}

/**
 * Returns a JSON object that can be messaged to a web worker.
 *
 * @private
 * @returns {SerializedMapProjection} A JSON object from which the MapProjection can be rebuilt.
 */
CustomProjection.prototype.serialize = function () {
  var json = {
    url: this.url,
    ellipsoid: Ellipsoid.pack(this.ellipsoid, []),
  };
  return new SerializedMapProjection(MapProjectionType.CUSTOM, json);
};

/**
 * Reconstructs a <code>CustomProjection</object> from the input JSON.
 *
 * @private
 * @param {SerializedMapProjection} serializedMapProjection A JSON object from which the MapProjection can be rebuilt.
 * @returns {Promise.<CustomProjection>} A Promise that resolves to a MapProjection that is ready for use, or rejects if the SerializedMapProjection is malformed.
 */
CustomProjection.deserialize = function (serializedMapProjection) {
  var json = serializedMapProjection.json;
  var projection = new CustomProjection(
    json.url,
    Ellipsoid.unpack(json.ellipsoid)
  );
  return projection.readyPromise;
};

Object.defineProperties(CustomProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof CustomProjection.prototype
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
   * Gets whether or not the projection evenly maps meridians to vertical lines.
   * This is not guaranteed for custom projections and is assumed false.
   *
   * @memberof CustomProjection.prototype
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
   * Gets the promise that will be resolved when the CustomProjection's resources are done loading.
   *
   * @memberof CustomProjection.prototype
   *
   * @type {Promise.<CustomProjection>}
   * @readonly
   *
   * @example
   * customProjection.readyPromise.then(function(projection) {
   *     var viewer = new Cesium.Viewer('cesiumContainer', {
   *         mapProjection : projection
   *     });
   * });
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * Gets a value indicating whether or not the projection is ready for use.
   * @memberof CustomProjection.prototype
   * @type {Boolean}
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets the absolute URL for the JavaScript source that the CustomProjection is loading.
   *
   * @memberOf CustomProjection.prototype
   *
   * @type {String}
   * @readonly
   */
  url: {
    get: function () {
      return this._url;
    },
  },
});

/**
 * Projects a set of {@link Cartographic} coordinates, in radians, to map coordinates, in meters based on
 * the specified projection.
 *
 * @param {Cartographic} cartographic The coordinates to project.
 * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
CustomProjection.prototype.project = function (cartographic, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "CustomProjection is not loaded. Use CustomProjection.readyPromise or wait for CustomProjection.ready to be true."
    );
  }
  Check.defined("cartographic", cartographic);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  this._project(cartographic, result);
  return result;
};

/**
 * Unprojects a set of projected {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
 * coordinates, in radians based on the specified projection.
 *
 * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
 * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
 *        undefined, a new instance is created and returned.
 * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
 *          created and returned.
 */
CustomProjection.prototype.unproject = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "CustomProjection is not loaded. Use CustomProjection.readyPromise or wait for CustomProjection.ready to be true."
    );
  }
  Check.defined("cartesian", cartesian);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartographic();
  }

  this._unproject(cartesian, result);
  return result;
};

function buildCustomProjection(customProjection, url) {
  var fetch;
  var deferred = when.defer();
  var useCache = !isDataUri(url);
  if (useCache && defined(CustomProjection._loadedProjectionFunctions[url])) {
    CustomProjection._loadedProjectionFunctions[url](function (
      project,
      unproject
    ) {
      customProjection._project = project;
      customProjection._unproject = unproject;
      customProjection._ready = true;
      deferred.resolve(customProjection);
    });

    return deferred.promise;
  }

  // Clear createProjectionFunctions, if it already exists
  try {
    // eslint-disable-next-line no-undef
    createProjectionFunctions = undefined;
    // eslint-disable-next-line no-empty
  } catch (e) {}

  if (
    typeof WorkerGlobalScope !== "undefined" &&
    // eslint-disable-next-line no-undef
    self instanceof WorkerGlobalScope
  ) {
    // eslint-disable-next-line no-undef
    importScripts(url);
    fetch = when.resolve();
  } else {
    fetch = loadAndExecuteScript(url).otherwise(function () {
      return when.reject(
        new RuntimeError("Unable to load projection source from " + url)
      );
    });
  }

  fetch = fetch
    .then(function () {
      try {
        // eslint-disable-next-line no-undef
        if (!defined(createProjectionFunctions)) {
          throw new Error();
        }
      } catch (e) {
        return deferred.reject(
          new RuntimeError(
            "projection code missing createProjectionFunctions function"
          )
        );
      }
      // eslint-disable-next-line no-undef
      var localCreateProjectionFunctions = createProjectionFunctions;
      // eslint-disable-next-line no-undef
      createProjectionFunctions = undefined;
      if (useCache) {
        CustomProjection._loadedProjectionFunctions[
          url
        ] = localCreateProjectionFunctions;
      }
      localCreateProjectionFunctions(function (project, unproject) {
        var ready = true;
        if (!defined(project)) {
          ready = false;
          deferred.reject(
            new RuntimeError("projection code missing project function")
          );
        }
        if (!defined(unproject)) {
          ready = false;
          deferred.reject(
            new RuntimeError("projection code missing unproject function")
          );
        }

        customProjection._project = project;
        customProjection._unproject = unproject;
        customProjection._ready = ready;
        deferred.resolve();
      });

      return deferred.promise;
    })
    .then(function () {
      return customProjection;
    });

  return fetch;
}

/**
 * A function used to generate functions for a custom MapProjection.
 * This function must be named <code>createProjectionFunctions</code>.
 * @callback CustomProjection~factory
 *
 * @param {Function} callback A callback that takes <code>CustomProjection~project</code> and <code>CustomProjection~unproject</code> functions as arguments.
 * @example
 * function createProjectionFunctions(callback) {
 *     function project(cartographic, result) {
 *         result.x = cartographic.longitude * 6378137.0;
 *         result.y = cartographic.latitude * 6378137.0;
 *         result.z = cartographic.height;
 *     }
 *
 *     function unproject(cartesian, result) {
 *         result.longitude = cartesian.x / 6378137.0;
 *         result.latitude = cartesian.y / 6378137.0;
 *         result.height = cartesian.z;
 *     }
 *
 *     callback(project, unproject);
 * }
 */

/**
 * A function that projects a cartographic coordinate to x/y/z meter coordinates in 2.5D space.
 * For example, a Geographic projection would project latitude and longitude to the X/Y plane and the altitude to Z.
 * @callback CustomProjection~project
 *
 * @param {Cartographic} cartographic A Cesium {@link Cartographic} type providing the latitude and longitude in radians and the height in meters.
 * @param {Cartesian3} result A Cesium {@link Cartesian3} type onto which the projected x/y/z coordinates should be placed.
 * @example
 * function project(cartographic, result) {
 *     result.x = cartographic.longitude * 6378137.0;
 *     result.y = cartographic.latitude * 6378137.0;
 *     result.z = cartographic.height;
 * }
 */

/**
 * A function that unprojects x/y/z meter coordinates in 2.5D space to cartographic coordinates.
 *
 * Coordinates come from a Z-up space, so for example, a Geographic projection would unproject x/y coordinates in meters
 * to latitude and longitude, and z coordinates to altitudes in meters over the x/y plane.
 * @callback CustomProjection~unproject
 *
 * @param {Cartesian3} cartesian A Cesium {@link Cartesian3} type containing a x/y/z coordinates in projected space.
 * @param {Cartographic} result A Cesium {@link Cartographic} type onto which unprojected longitude and latitude in radians and height in meters should be placed.
 * @example
 * function unproject(cartesian, result) {
 *     result.longitude = cartesian.x / 6378137.0;
 *     result.latitude = cartesian.y / 6378137.0;
 *     result.height = cartesian.z;
 * }
 */

// exposed for testing
CustomProjection._loadedProjectionFunctions = {};
export default CustomProjection;
