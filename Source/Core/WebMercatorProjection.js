/*global define*/
define([
        './Math',
        './Cartesian3',
        './Cartographic',
        './Ellipsoid'
    ], function(
        CesiumMath,
        Cartesian3,
        Cartographic,
        Ellipsoid) {
    "use strict";

    /**
     * @alias WebMercatorProjection
     *
     * @constructor
     *
     * @immutable
     */
    var WebMercatorProjection = function(ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        this._ellipsoid = ellipsoid;
        this._semimajorAxis = ellipsoid.getMaximumRadius();
        this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
    };

    /**
     *
     * @param mercatorAngle
     * @returns {Number}
     */
    WebMercatorProjection.mercatorAngleToGeodeticLatitude = function(mercatorAngle) {
        return CesiumMath.PI_OVER_TWO - (2.0 * Math.atan(Math.exp(-mercatorAngle)));
    };

    WebMercatorProjection.geodeticLatitudeToMercatorAngle = function(latitude) {
        // Clamp the latitude coordinate to the valid Mercator bounds.
        if (latitude > WebMercatorProjection.MaximumLatitude) {
            latitude = WebMercatorProjection.MaximumLatitude;
        } else if (latitude < -WebMercatorProjection.MaximumLatitude) {
            latitude = -WebMercatorProjection.MaximumLatitude;
        }
        var sinLatitude = Math.sin(latitude);
        return 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    };

    /**
     * The maximum latitude (both North and South) supported by a Web Mercator
     * (EPSG:3857) projection.  Technically, the Mercator projection is defined
     * for any latitude up to (but not including) 90 degrees, but it makes sense
     * to cut it off sooner because it grows exponentially with increasing latitude.
     * The logic behind this particular cutoff value, which is the one used by
     * Google Maps, Bing Maps, and Esri, is that it makes the projection
     * square.  That is, the extent is equal in the X and Y directions.
     *
     * The constant value is computed by calling:
     *    WebMercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI)
     *
     * @type {Number}
     */
    WebMercatorProjection.MaximumLatitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI);

    /**
     * DOC_TBA
     * @memberof WebMercatorProjection
     */
    WebMercatorProjection.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Converts geodetic ellipsoid coordinates to the equivalent web mercator
     * X, Y, Z coordinates expressed in meters and returned in a {@link Cartesian3}.
     *
     * @memberof WebMercatorProjection
     *
     * @param {Cartographic} cartographic The cartographic coordinates in radians.
     * @param {Cartesian3} result The instance to which to copy the result, or undefined if a
     *        new instance should be created.
     * @returns {Cartesian3} The equivalent web mercator X, Y, Z coordinates, in meters.
     */
    WebMercatorProjection.prototype.project = function(cartographic, result) {
        var semimajorAxis = this._semimajorAxis;
        var x = cartographic.longitude * semimajorAxis;
        var y = WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographic.latitude) * semimajorAxis;
        var z = cartographic.height;

        if (typeof result === 'undefined') {
            return new Cartesian3(x, y, z);
        }

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Converts web mercator X, Y coordinates, expressed in meters, to a {@link Cartographic}
     * containing geodetic ellipsoid coordinates.
     *
     * @memberof WebMercatorProjection
     *
     * @param {Cartesian2} cartesian The web mercator coordinates in meters.
     * @param {Cartographic} result The instance to which to copy the result, or undefined if a
     *        new instance should be created.
     * @returns {Cartographic} The equivalent cartographic coordinates.
     */
    WebMercatorProjection.prototype.unproject = function(cartesian, result) {
        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(cartesian.y * oneOverEarthSemimajorAxis);
        var height = cartesian.z;

        if (typeof result === 'undefined') {
            return new Cartographic(longitude, latitude, height);
        }

        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    return WebMercatorProjection;
});