define([
        '../ThirdParty/proj4',
        './Cartesian3',
        './Cartographic',
        './Math',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid'
    ], function(
        proj4,
        Cartesian3,
        Cartographic,
        CesiumMath,
        Check,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid) {
    'use strict';

    /**
     * MapProjection using proj4js. This projection is only to be used with Ellipsoid.WGS84.
     * Users should exercise caution when using local-area projections, as local area projections
     * may produce unexpected results outside their specified boundaries.
     *
     * Assumes Ellipsoid WGS84.
     *
     * @alias Proj4Projection
     * @constructor
     *
     * @param {String} [wellKnownText] proj4js well known text specifying the projection. Defaults to EPSG:3857, web mercator.
     * @param {Number} [heightScale=1.0] Scale to convert from heights in meters to the projection's units.
     */
    function Proj4Projection(wellKnownText, heightScale) {
        this.ellipsoid = Ellipsoid.WGS84;

        var wkt = defaultValue(wellKnownText, 'EPSG:3857'); // web mercator
        this._wkt = wkt;
        this._projection = proj4(wkt);
        this._forwardFailed = false;
        this._inverseFailed = false;

        heightScale = defaultValue(heightScale, 1.0);
        this._heightScale = heightScale;
        this._inverseHeightScale = 1.0 / heightScale;
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
         */
        heightScale: {
            get: function() {
                return this._heightScale;
            }
        },
        /**
         * Gets whether or not the projection is cylindrical about the equator.
         * Not all Proj4 projections are cylindrical about the equator.
         *
         * @memberof Proj4Projection.prototype
         *
         * @type {Boolean}
         * @readonly
         * @private
         */
        isEquatorialCylindrical : {
            get : function() {
                return false;
            }
        }
    });

    var projectionArray = [0, 0];
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

        // without clamp proj4 might crash
        projectionArray[0] = CesiumMath.clamp(CesiumMath.toDegrees(cartographic.longitude), -180 + CesiumMath.EPSILON7, 180 - CesiumMath.EPSILON7);
        projectionArray[1] = CesiumMath.clamp(CesiumMath.toDegrees(cartographic.latitude), -90 + CesiumMath.EPSILON7, 90 - CesiumMath.EPSILON7);

        var projected;
        try {
            projected = this._projection.forward(projectionArray);
        } catch(e) {
            if (!this._forwardFailed) {
                // Log a warning the first time a projection fails
                console.warn('proj4js forward failed for ' + projectionArray + ' with projection ' + this._wkt);
                this._forwardFailed = true;
            }
            projected = [0, 0];
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
        projectionArray[0] = cartesian.x;
        projectionArray[1] = cartesian.y;

        var projected;
        try {
            projected = this._projection.inverse(projectionArray);
        } catch(e) {
            if (!this._inverseFailed) {
                // Log a warning the first time a projection fails
                console.warn('proj4js inverse failed for ' + projectionArray + ' with projection ' + this._wkt);
                this._inverseFailed = true;
            }
            projected = [0, 0];
        }

        result.longitude = CesiumMath.toRadians(projected[0]);
        result.latitude = CesiumMath.toRadians(projected[1]);
        result.height = cartesian.z * this._inverseHeightScale;

        return result;
    };

    return Proj4Projection;
});
