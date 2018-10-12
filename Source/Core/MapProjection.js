define([
        './Cartographic',
        './Cartesian3',
        './Check',
        './defineProperties',
        './defaultValue',
        './DeveloperError',
        './Math'
    ], function(
        Cartographic,
        Cartesian3,
        Check,
        defineProperties,
        defaultValue,
        DeveloperError,
        CesiumMath) {
    'use strict';

    /**
     * Defines how geodetic ellipsoid coordinates ({@link Cartographic}) project to a
     * flat map like Cesium's 2D and Columbus View modes.
     *
     * @alias MapProjection
     * @constructor
     *
     * @see GeographicProjection
     * @see WebMercatorProjection
     */
    function MapProjection() {
        DeveloperError.throwInstantiationError();
    }

    defineProperties(MapProjection.prototype, {
        /**
         * Gets the {@link Ellipsoid}.
         *
         * @memberof MapProjection.prototype
         *
         * @type {Ellipsoid}
         * @readonly
         */
        ellipsoid : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets whether or not the projection is cylindrical about the equator.
         * Projections that are cylindrical around the equator (such as Web Mercator and Geographic) do not need
         * addition 2D vertex attributes and are more efficient to render.
         *
         * @memberof MapProjection.prototype
         *
         * @type {Boolean}
         * @readonly
         * @private
         */
        isEquatorialCylindrical : {
            get : DeveloperError.throwInstantiationError
        }
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

    var maxCoordCartographicScratch = new Cartographic();
    /**
     * Approximates the extents of a map projection in 2D.
     *
     * @function
     *
     * @param {MapProjection} mapProjection A map projection from cartographic coordinates to 2D space.
     * @param {Cartesian3} [result] Optional result parameter.
     * @private
     */
    MapProjection.approximateMaximumCoordinate = function(mapProjection, result) {
        Check.defined('mapProjection', mapProjection);

        var maxCoord = defaultValue(result, new Cartesian3());
        var cartographicExtreme = maxCoordCartographicScratch;

        var halfMapWidth = 0.0;
        var halfMapHeight = 0.0;

        // Check the four corners of the projection and the four edge-centers.
        for (var x = -1; x < 2; x++) {
            for (var y = -1; y < 2; y++) {
                if (x === 0 && y === 0) {
                    continue;
                }

                cartographicExtreme.longitude = CesiumMath.PI * x;
                cartographicExtreme.latitude = CesiumMath.PI_OVER_TWO * y;
                mapProjection.project(cartographicExtreme, maxCoord);

                halfMapWidth = Math.max(halfMapWidth, Math.abs(maxCoord.x));
                halfMapHeight = Math.max(halfMapHeight, Math.abs(maxCoord.y));
            }
        }
        maxCoord.x = halfMapWidth;
        maxCoord.y = halfMapHeight;

        return maxCoord;
    };

    return MapProjection;
});
