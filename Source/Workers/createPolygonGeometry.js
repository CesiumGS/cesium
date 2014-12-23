/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolygonGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolygonGeometry) {
    "use strict";

    function createPolygonGeometry(polygonGeometry) {
        if (defined(polygonGeometry.buffer)) {
            polygonGeometry = PolygonGeometry.unpack(polygonGeometry);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonGeometry;
});
