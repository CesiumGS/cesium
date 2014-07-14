/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/PolylineGeometry'
    ], function(
        Ellipsoid,
        PolylineGeometry) {
    "use strict";

    function createPolylineGeometry(polylineGeometry) {
        polylineGeometry._ellipsoid = Ellipsoid.clone(polylineGeometry._ellipsoid);
        return PolylineGeometry.createGeometry(polylineGeometry);
    }

    return createPolylineGeometry;
});
