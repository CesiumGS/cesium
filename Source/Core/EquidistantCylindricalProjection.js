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
     * DOC_TBA
     * @alias EquidistantCylindricalProjection
     * @constructor
     *
     * @immutable
     */
    var EquidistantCylindricalProjection = function(ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        var radii = ellipsoid.getRadii();

        this._ellipsoid = ellipsoid;
        this._halfEquatorCircumference = Math.PI * (Math.max(radii.x, radii.y));
        this._quarterPolarCircumference = 0.5 * Math.PI * radii.z;
    };

    /**
     * DOC_TBA
     * @memberof EquidistantCylindricalProjection
     */
    EquidistantCylindricalProjection.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * DOC_TBA
     * @memberof EquidistantCylindricalProjection
     */
    EquidistantCylindricalProjection.prototype.project = function(cartographic) {
        // Scale to [-1, 1]
        var lon = cartographic.longitude / Math.PI;
        var lat = cartographic.latitude / CesiumMath.PI_OVER_TWO;

        // Actually this is the special case of equidistant cylindrical called the plate carree
        return new Cartesian3(lon * this._halfEquatorCircumference, lat * this._quarterPolarCircumference, cartographic.height);
    };

    /**
     * DOC_TBA
     * @memberof EquidistantCylindricalProjection
     */
    EquidistantCylindricalProjection.prototype.unproject = function(cartesian) {
        var lon = cartesian.x / this._halfEquatorCircumference;
        var lat = cartesian.y / this._quarterPolarCircumference;

        return new Cartographic(lon * Math.PI, lat * CesiumMath.PI_OVER_TWO, cartesian.z);
    };

    return EquidistantCylindricalProjection;
});
