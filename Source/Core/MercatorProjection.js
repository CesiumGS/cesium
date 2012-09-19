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
     * @alias MercatorProjection
     *
     * @constructor
     *
     * @immutable
     */
    var MercatorProjection = function(ellipsoid) {
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
    MercatorProjection.mercatorAngleToGeodeticLatitude = function(mercatorAngle) {
        return CesiumMath.PI_OVER_TWO - (2.0 * Math.atan(Math.exp(-mercatorAngle)));
    };

    MercatorProjection.geodeticLatitudeToMercatorAngle = function(latitude) {
        // Clamp the latitude coordinate to the valid Mercator bounds.
        if (latitude > MercatorProjection.MaximumLatitude) {
            latitude = MercatorProjection.MaximumLatitude;
        } else if (latitude < -MercatorProjection.MaximumLatitude) {
            latitude = -MercatorProjection.MaximumLatitude;
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
     *    MercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI)
     *
     * @type {Number}
     */
    MercatorProjection.MaximumLatitude = MercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI);

    /**
     * DOC_TBA
     * @memberof MercatorProjection
     */
    MercatorProjection.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * DOC_TBA
     * @memberof MercatorProjection
     */
    MercatorProjection.prototype.project = function(cartographic) {
        var semimajorAxis = this._semimajorAxis;
        return new Cartesian3(cartographic.longitude * semimajorAxis,
                              MercatorProjection.geodeticLatitudeToMercatorAngle(cartographic.latitude) * semimajorAxis,
                              cartographic.height);
    };

    /**
     * DOC_TBA
     * @memberof MercatorProjection
     */
    MercatorProjection.prototype.unproject = function(cartesian) {
        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude = MercatorProjection.mercatorAngleToGeodeticLatitude(cartesian.y * oneOverEarthSemimajorAxis);
        return new Cartographic(longitude, latitude, cartesian.z);
    };

    return MercatorProjection;
});