/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/PolygonGeometry'
    ], function(
        Ellipsoid,
        PolygonGeometry) {
    "use strict";

    function createPolygonGeometry(polygonGeometry) {
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonGeometry;
});
