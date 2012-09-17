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
        // TODO: Deal with latitude outside ~(-85, 85) degrees
        var semimajorAxis = this._semimajorAxis;
        return new Cartesian3(cartographic.longitude * semimajorAxis,
                              Math.log(Math.tan((CesiumMath.PI_OVER_TWO + cartographic.latitude) * 0.5)) * semimajorAxis,
                              cartographic.height);
    };

    /**
     * DOC_TBA
     * @memberof MercatorProjection
     */
    MercatorProjection.prototype.unproject = function(cartesian) {
        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude = CesiumMath.PI_OVER_TWO - (2.0 * Math.atan(Math.exp(-cartesian.y * oneOverEarthSemimajorAxis)));
        return new Cartographic(longitude, latitude, cartesian.z);
    };

    return MercatorProjection;
});