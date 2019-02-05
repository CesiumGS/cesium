define([
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './Math'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        CesiumMath) {
    'use strict';

    /**
     * This projection use longitude and latitude expressed with the WGS84 and transforms them to Mercator using
     * the ellipsoidal (or spherical for spheroids) equations.
     *
     * @alias MercatorProjection
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid.
     *
     * @see GeographicProjection
     * @see WebMercatorProjection
     */
    function MercatorProjection(ellipsoid) {
        this._ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        this._semimajorAxis = this._ellipsoid.maximumRadius;
        this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;

        var semiminorAxis = this._ellipsoid.minimumRadius;
        var ratio = semiminorAxis / this._semimajorAxis;
        this._eccentricity = Math.sqrt(1.0 - (ratio * ratio));
    }

    defineProperties(MercatorProjection.prototype, {
        /**
         * Gets the {@link Ellipsoid}.
         *
         * @memberof MercatorProjection.prototype
         *
         * @type {Ellipsoid}
         * @readonly
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        }
    });

    /**
     * The maximum latitude (both North and South) supported by a Mercator
     * (EPSG:3395) projection. Technically, the Mercator projection is defined
     * for any latitude up to (but not including) 90 degrees, but it makes sense
     * to cut it off sooner because it grows exponentially with increasing latitude.
     *
     * @type {Number}
     */
    MercatorProjection.MaximumLatitude = CesiumMath.toRadians(89.5);

    /**
     * Converts geodetic ellipsoid coordinates, in radians, to the equivalent Mercator
     * X, Y, Z coordinates expressed in meters and returned in a {@link Cartesian3}. The height
     * is copied unmodified to the Z coordinate.
     *
     * @param {Cartographic} cartographic The cartographic coordinates in radians.
     * @param {Cartesian3} [result] The instance to which to copy the result, or undefined if a
     *        new instance should be created.
     * @returns {Cartesian3} The equivalent mercator X, Y, Z coordinates, in meters.
     */
    MercatorProjection.prototype.project = function(cartographic, result) {
        var semimajorAxis = this._semimajorAxis;
        var eccentricity = this._eccentricity;

        var x = cartographic.longitude * semimajorAxis;
        var y;
        var z = cartographic.height;

        // Clamp latitude to maximum range
        var latitude = CesiumMath.clamp(cartographic.latitude, -MercatorProjection.MaximumLatitude, MercatorProjection.MaximumLatitude);

        if (eccentricity === 0.0) { // spheroidal
            y = Math.log(Math.tan(CesiumMath.PI_OVER_FOUR + latitude * 0.5));
        } else {
            // Pages 44 from https://pubs.usgs.gov/pp/1395/report.pdf
            // And at https://github.com/OSGeo/proj.4/blob/master/src/projections/merc.cpp
            var eSinL = eccentricity * Math.sin(latitude);
            y = this._semimajorAxis * Math.log(Math.tan(CesiumMath.PI_OVER_FOUR + latitude * 0.5) * Math.pow((1 - eSinL) / (1 + eSinL), eccentricity * 0.5));
        }

        if (!defined(result)) {
            return new Cartesian3(x, y, z);
        }

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Converts Mercator X, Y coordinates, expressed in meters, to a {@link Cartographic}
     * containing geodetic ellipsoid coordinates. The Z coordinate is copied unmodified to the height.
     *
     * @param {Cartesian3} cartesian The mercator Cartesian position to unproject with height (z) in meters.
     * @param {Cartographic} [result] The instance to which to copy the result, or undefined if a
     *        new instance should be created.
     * @returns {Cartographic} The equivalent cartographic coordinates.
     */
    MercatorProjection.prototype.unproject = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        //>>includeEnd('debug');

        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var eccentricity = this._eccentricity;

        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude;
        var height = cartesian.z;

        if (eccentricity === 0.0) { // spheroidal
            latitude = Math.atan(Math.sinh(cartesian.y * oneOverEarthSemimajorAxis));
        } else {
            // Pages 44-45 from https://pubs.usgs.gov/pp/1395/report.pdf
            // And at https://github.com/OSGeo/proj.4/blob/master/src/projections/merc.cpp
            var halfEccentricity = eccentricity * 0.5;
            var y = cartesian.y;
            var t = Math.exp(- y * oneOverEarthSemimajorAxis);
            var newPhi = CesiumMath.PI_OVER_TWO - 2 * Math.atan(t);
            var phi;
            var maxIter = 15;
            do {
                phi = newPhi;
                var eSinPhi = eccentricity * Math.sin(phi);
                var atanComponent = t * Math.pow((1 - eSinPhi) / (1 + eSinPhi), halfEccentricity);
                newPhi = CesiumMath.PI_OVER_TWO - 2 * Math.atan(atanComponent);
            } while (!CesiumMath.equalsEpsilon(newPhi, phi, CesiumMath.EPSILON12) && --maxIter);

            latitude = newPhi;
        }

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }

        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    return MercatorProjection;
});
