/*global define*/
/**
 * @exports Core/MercatorProjection
 */
define([
        './Math',
        './Cartesian3',
        './Ellipsoid'
    ], function(
        CesiumMath,
        Cartesian3,
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

        var radii = ellipsoid.getRadii();

        this._ellipsoid = ellipsoid;
        this._halfEquatorCircumference = Math.PI * (Math.max(radii.x, radii.y));
        this._quarterPolarCircumference = 0.5 * Math.PI * radii.z;
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
        // Scale to [-1, 1]
        var lon = cartographic.longitude / Math.PI;
        var lat = cartographic.latitude / CesiumMath.PI_OVER_TWO;

        // TODO: Deal with latitude outside ~(-85, 85) degrees
        return new Cartesian3(lon * this._halfEquatorCircumference, Math.log((1.0 + Math.sin(lat)) / Math.cos(lat)) * this._quarterPolarCircumference, cartographic.height);
    };

    return MercatorProjection;
});