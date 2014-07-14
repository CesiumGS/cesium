/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/SimplePolylineGeometry'
    ], function(
        Ellipsoid,
        SimplePolylineGeometry) {
    "use strict";

    function createSimplePolylineGeometry(simplePolylineGeometry) {
        simplePolylineGeometry._ellipsoid = Ellipsoid.clone(simplePolylineGeometry._ellipsoid);
        return SimplePolylineGeometry.createGeometry(simplePolylineGeometry);
    }

    return createSimplePolylineGeometry;
});
