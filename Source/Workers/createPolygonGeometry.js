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

    function createPolygonGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = PolygonGeometry.unpack(polygonGeometry, offset);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonGeometry;
});
