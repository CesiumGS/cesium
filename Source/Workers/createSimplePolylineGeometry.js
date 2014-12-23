/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/SimplePolylineGeometry'
    ], function(
        defined,
        Ellipsoid,
        SimplePolylineGeometry) {
    "use strict";

    function createSimplePolylineGeometry(simplePolylineGeometry) {
        if (defined(simplePolylineGeometry.buffer)) {
            simplePolylineGeometry = SimplePolylineGeometry.unpack(simplePolylineGeometry);
        }
        simplePolylineGeometry._ellipsoid = Ellipsoid.clone(simplePolylineGeometry._ellipsoid);
        return SimplePolylineGeometry.createGeometry(simplePolylineGeometry);
    }

    return createSimplePolylineGeometry;
});
