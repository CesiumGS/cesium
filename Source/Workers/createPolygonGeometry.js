/*global define*/
define(['../Core/PolygonGeometry',
        '../Core/Ellipsoid'
    ], function(
        PolygonGeometry,
        Ellipsoid) {
    "use strict";

    function createPolygonGeometry(polygonGeometry) {
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonGeometry;
});
