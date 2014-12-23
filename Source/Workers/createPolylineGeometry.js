/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolylineGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolylineGeometry) {
    "use strict";

    function createPolylineGeometry(polylineGeometry) {
        if (defined(polylineGeometry.buffer)) {
            polylineGeometry = PolylineGeometry.unpack(polylineGeometry);
        }
        polylineGeometry._ellipsoid = Ellipsoid.clone(polylineGeometry._ellipsoid);
        return PolylineGeometry.createGeometry(polylineGeometry);
    }

    return createPolylineGeometry;
});
