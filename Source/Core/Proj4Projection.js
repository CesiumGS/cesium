define([
        './Cartesian3',
        './Cartographic',
        './Math',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './oneTimeWarning',
        './Rectangle',
        '../ThirdParty/proj4-2.5.0'
    ], function(
        Cartesian3,
        Cartographic,
        CesiumMath,
        Check,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        oneTimeWarning,
        Rectangle,
        proj4) {
    'use strict';

    // proj4 may crash with absolute extents
    var smallerThanMax = Rectangle.fromDegrees(-180.0 + CesiumMath.EPSILON7, -90.0 + CesiumMath.EPSILON7, 180 - CesiumMath.EPSILON7, 90 - CesiumMath.EPSILON7);

    /**
     * MapProjection using proj4js. This projection is only to be used with Ellipsoid.WGS84.
     * Users should exercise caution when using local-area projections, as local area projections
     * may produce unexpected results outside their valid boundaries in Cartographic space (wgs84Bounds).
     * These boundaries may be looked up at spatialreference.org.
     *
     * Scenes using Proj4Projection will default to MapMode2D.ROTATE instead of MapMode2D.INFINITE_SCROLL.
     *
     * @alias Proj4Projection
     * @constructor
     *
     * @param {String} [wellKnownText] proj4js well known text specifying the projection. Defaults to EPSG:3857, web mercator.
     * @param {Number} [heightScale=1.0] Scale to convert from heights in meters to the projection's units.
     * @param {Rectangle} [wgs84Bounds] Cartographic bounds over which the projection is valid. Cartographic points will be clamped to these bounds prior to projection.
     */
    function Proj4Projection(wellKnownText, heightScale, wgs84Bounds) {
        this.ellipsoid = Ellipsoid.WGS84;

        var wkt = defaultValue(wellKnownText, 'EPSG:3857'); // web mercator

        this._projection = proj4(wkt);
        this._wkt = wkt;

        heightScale = defaultValue(heightScale, 1.0);
        this._heightScale = heightScale;
        this._inverseHeightScale = 1.0 / heightScale;

        wgs84Bounds = defaultValue(wgs84Bounds, smallerThanMax);

        this._wgs84Bounds = Rectangle.clone(wgs84Bounds);
    }

    defineProperties(Proj4Projection.prototype, {
        /**
         * The well-known-text string used to initialize proj4js.
         * @memberof Proj4Projection.prototype
         * @type {String}
         * @readonly
         */
        wellKnownText: {
            get: function() {
                return this._wkt;
            }
        },
        /**
         * The scale for converting from heights in meters to the projection's units.
         * @memberof Proj4Projection.prototype
         * @type {Number}
         * @readonly
         */
        heightScale: {
            get: function() {
                return this._heightScale;
            }
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
        isNormalCylindrical : {
            get : function() {
                return false;
            }
        },
        /**
         * The bounds in Cartographic coordinates over which this projection is valid.
         * @memberof Proj4Projection.prototype
         * @type {Rectangle}
         * @readonly
         */
        wgs84Bounds : {
            get : function() {
                return this._wgs84Bounds;
            }
        }
    });

    var scratchProjectionArray = [0.0, 0.0];
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
    Proj4Projection.prototype.project = function(cartographic, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('cartographic', cartographic);
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian3();
        }

        var wgs84Bounds = this.wgs84Bounds;
        scratchProjectionArray[0] = CesiumMath.toDegrees(CesiumMath.clamp(cartographic.longitude, wgs84Bounds.west, wgs84Bounds.east));
        scratchProjectionArray[1] = CesiumMath.toDegrees(CesiumMath.clamp(cartographic.latitude, wgs84Bounds.south, wgs84Bounds.north));

        var projected;
        try {
            projected = this._projection.forward(scratchProjectionArray);
        } catch(e) {
            // Log a warning the first time a projection fails
            oneTimeWarning('proj4js-project', 'proj4js forward failed for ' + scratchProjectionArray + ' with projection ' + this._wkt);
            projected = [0.0, 0.0];
        }

        result.x = projected[0];
        result.y = projected[1];
        result.z = cartographic.height * this._heightScale;

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
    Proj4Projection.prototype.unproject = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('cartesian', cartesian);
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartographic();
        }
        scratchProjectionArray[0] = cartesian.x;
        scratchProjectionArray[1] = cartesian.y;

        var projected;
        try {
            projected = this._projection.inverse(scratchProjectionArray);
        } catch(e) {
            // Log a warning the first time a projection fails
            oneTimeWarning('proj4js-unproject', 'proj4js inverse failed for ' + scratchProjectionArray + ' with projection ' + this._wkt);
            projected = [0.0, 0.0];
        }

        result.longitude = CesiumMath.toRadians(projected[0]);
        result.latitude = CesiumMath.toRadians(projected[1]);
        result.height = cartesian.z * this._inverseHeightScale;

        return result;
    };

    return Proj4Projection;
});
