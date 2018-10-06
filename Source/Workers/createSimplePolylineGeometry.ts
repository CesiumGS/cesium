define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/SimplePolylineGeometry'
    ], function(
        defined,
        Ellipsoid,
        SimplePolylineGeometry) {
    'use strict';

    function createSimplePolylineGeometry(simplePolylineGeometry, offset) {
        if (defined(offset)) {
            simplePolylineGeometry = SimplePolylineGeometry.unpack(simplePolylineGeometry, offset);
        }
        simplePolylineGeometry._ellipsoid = Ellipsoid.clone(simplePolylineGeometry._ellipsoid);
        return SimplePolylineGeometry.createGeometry(simplePolylineGeometry);
    }

    return createSimplePolylineGeometry;
});
