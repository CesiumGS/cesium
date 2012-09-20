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
        return Math.log(Math.tan((CesiumMath.PI_OVER_TWO + latitude) * 0.5));
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
     * DOC_TBA
     * @memberof MercatorProjection
     */
    WebMercatorProjection.prototype.project = function(cartographic) {
        var semimajorAxis = this._semimajorAxis;
        return new Cartesian3(cartographic.longitude * semimajorAxis,
                WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographic.latitude) * semimajorAxis,
                              cartographic.height);
    };

    /**
     * DOC_TBA
     * @memberof WebMercatorProjection
     */
    WebMercatorProjection.prototype.unproject = function(cartesian) {
        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(cartesian.y * oneOverEarthSemimajorAxis);
        return new Cartographic(longitude, latitude, cartesian.z);
    };

    return WebMercatorProjection;
});