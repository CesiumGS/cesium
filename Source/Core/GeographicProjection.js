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
     * @alias GeographicProjection
     * @constructor
     *
     * @immutable
     */
    var GeographicProjection = function(ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        this._ellipsoid = ellipsoid;
        this._semimajorAxis = ellipsoid.getMaximumRadius();
        this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
    };

    /**
     * DOC_TBA
     * @memberof GeographicProjection
     */
    GeographicProjection.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * DOC_TBA
     * @memberof GeographicProjection
     */
    GeographicProjection.prototype.project = function(cartographic) {
        // Actually this is the special case of equidistant cylindrical called the plate carree
        var semimajorAxis = this._semimajorAxis;
        return new Cartesian3(cartographic.longitude * semimajorAxis,
                              cartographic.latitude * semimajorAxis,
                              cartographic.height);
    };

    /**
     * DOC_TBA
     * @memberof GeographicProjection
     */
    GeographicProjection.prototype.unproject = function(cartesian) {
        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude = cartesian.y * oneOverEarthSemimajorAxis;
        return new Cartographic(longitude, latitude, cartesian.z);
    };

    return GeographicProjection;
});
