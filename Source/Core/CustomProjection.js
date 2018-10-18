define([
        './Cartesian3',
        './Cartographic',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './getAbsoluteUri',
        './loadAndExecuteScript',
        '../ThirdParty/when'
    ], function(
        Cartesian3,
        Cartographic,
        Check,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        getAbsoluteUri,
        loadAndExecuteScript,
        when) {
    'use strict';

    var loadedProjectionFunctions = {};

    /**
     * MapProjection that uses custom project and unproject functions defined in an external file.
     *
     * The external file must contain a function named <code>createProjectionFunctions</code> that implements the
     * <code>CustomProjection~factory</code> interface to provide <code>CustomProjection~project</code> and
     * <code>CustomProjection~unproject</code> functions to a callback.
     *
     * Scenes using CustomProjection will default to MapMode2D.ROTATE instead of MapMode2D.INFINITE_SCROLL.
     *
     * @alias CustomProjection
     * @constructor
     *
     * @param {String} options.url The url of the external file.
     * @param {String} options.projectionName A name for this projection.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The MapProjection's ellipsoid.
     */
    function CustomProjection(url, projectionName, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('url', url);
        Check.typeOf.string('projectionName', projectionName);
        //>>includeEnd('debug');

        this._ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        this._project = undefined;
        this._unproject = undefined;

        this._projectionName = projectionName;

        var absoluteUrl = getAbsoluteUri(url);
        this._url = absoluteUrl;

        this._ready = false;
        this._readyPromise = buildCustomProjection(this, absoluteUrl, projectionName);
    }

    defineProperties(CustomProjection.prototype, {
        /**
         * Gets the {@link Ellipsoid}.
         *
         * @memberof CustomProjection.prototype
         *
         * @type {Ellipsoid}
         * @readonly
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },
        /**
         * Gets whether or not the projection evenly maps meridians to vertical lines.
         * No guarantee that a custom projection will be cylindrical about the equator.
         *
         * @memberof CustomProjection.prototype
         *
         * @type {Boolean}
         * @readonly
         * @private
         */
        isNormalCylindrical : {
            get : function() {
                return false;
            }
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
         *  var viewer = new Cesium.Viewer('cesiumContainer', {
         *      mapProjection : projection
         *   });
         * });
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },
        /**
         * Gets the absolute URL for the file that the CustomProjection is loading.
         *
         * @memberOf CustomProjection.prototype
         *
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },
        /**
         * Gets the name for this projection.
         *
         * @memberOf CustomProjection.prototype
         *
         * @type {String}
         * @readonly
         */
        projectionName : {
            get : function() {
                return this._projectionName;
            }
        }
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
    CustomProjection.prototype.project = function(cartographic, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('CustomProjection is not loaded. User CustomProjection.readyPromise or wait for CustomProjection.ready to be true.');
        }
        Check.defined('cartographic', cartographic);
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
    CustomProjection.prototype.unproject = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('CustomProjection is not loaded. User CustomProjection.readyPromise or wait for CustomProjection.ready to be true.');
        }
        Check.defined('cartesian', cartesian);
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartographic();
        }

        this._unproject(cartesian, result);
        return result;
    };

    function buildCustomProjection(customProjection, url, projectionName) {
        var fetch;
        var deferred = when.defer();
        if (defined(loadedProjectionFunctions[projectionName])) {
            loadedProjectionFunctions[projectionName](function(project, unproject) {
                customProjection._project = project;
                customProjection._unproject = unproject;
                customProjection._ready = true;
                deferred.resolve(customProjection);
            });

            return deferred;
        }

        if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) { // eslint-disable-line no-undef
            importScripts(url); // eslint-disable-line no-undef
            fetch = when.resolve();
        } else {
            fetch = loadAndExecuteScript(url);
        }

        fetch = fetch
            .then(function() {
                var localCreateProjectionFunctions = createProjectionFunctions; // eslint-disable-line no-undef
                loadedProjectionFunctions[projectionName] = localCreateProjectionFunctions;
                localCreateProjectionFunctions(function(project, unproject) {
                    customProjection._project = project;
                    customProjection._unproject = unproject;
                    customProjection._ready = true;
                    deferred.resolve();
                });

                return deferred.promise;
            })
            .then(function() {
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
     *          result.x = cartographic.longitude * 6378137.0;
     *          result.y = cartographic.latitude * 6378137.0;
     *          result.z = cartographic.height;
     *     }
     *
     *     function unproject(cartesian, result) {
     *          result.longitude = cartesian.x / 6378137.0;
     *          result.latitude = cartesian.y / 6378137.0;
     *          result.height = cartesian.z;
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
     * @param {Cartographic} cartographic A Cesium Cartographic type providing the latitude and longitude in radians and the height in meters.
     * @param {Cartesian3} result A Cesium Cartesian3 type onto which the projected x/y/z coordinate should be placed.
     * @example
     * function project(cartographic, result) {
     *      result.x = cartographic.longitude * 6378137.0;
     *      result.y = cartographic.latitude * 6378137.0;
     *      result.z = cartographic.height;
     * }
     */

    /**
     * Coordinates come from a Z-up space, so for example, a Geographic projection would unproject x/y coordinates in meters
     * to latitude and longitude, and z coordinates to altitudes in meters over the x/y plane.
     * @callback CustomProjection~unproject
     *
     * @param {Cartesian3} cartesian A x/y/z coordinate in projected space space.
     * @param {Cartographic} result A cartographic array onto which unprojected longitude and latitude in radians and height in meters coordinates should be placed.
     * @example
     * function unproject(cartesian, result) {
     *      result.longitude = cartesian.x / 6378137.0;
     *      result.latitude = cartesian.y / 6378137.0;
     *      result.height = cartesian.z;
     * }
     */

    return CustomProjection;
});
