/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/PolygonOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        PolygonOutlineGeometry) {
    "use strict";

    function createPolygonOutlineGeometry(polygonGeometry) {
        if (defined(polygonGeometry.buffer)) {
            polygonGeometry = PolygonOutlineGeometry.unpack(polygonGeometry);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonOutlineGeometry;
});
