define([
        './Cartographic',
        './Cartesian3',
        './Check',
        './defineProperties',
        './defaultValue',
        './DeveloperError',
        './Math',
        './Rectangle'
    ], function(
        Cartographic,
        Cartesian3,
        Check,
        defineProperties,
        defaultValue,
        DeveloperError,
        CesiumMath,
        Rectangle) {
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
        isNormalCylindrical : {
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

    var maxcoordRectangleScratch = new Rectangle();
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
        var projectedExtents = Rectangle.approximateProjectedExtents(Rectangle.MAX_VALUE, mapProjection, maxcoordRectangleScratch);

        maxCoord.x = projectedExtents.width * 0.5;
        maxCoord.y = projectedExtents.height * 0.5;

        return maxCoord;
    };

    return MapProjection;
});
