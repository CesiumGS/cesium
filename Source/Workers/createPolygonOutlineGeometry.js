/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/PolygonOutlineGeometry'
    ], function(
        Ellipsoid,
        PolygonOutlineGeometry) {
    "use strict";

    function createPolygonOutlineGeometry(polygonGeometry) {
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonOutlineGeometry;
});
