/*global define*/
define(['../Core/PolygonOutlineGeometry',
        '../Core/Ellipsoid'
    ], function(
        PolygonOutlineGeometry,
        Ellipsoid) {
    "use strict";

    function createPolygonOutlineGeometry(polygonGeometry) {
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return PolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createPolygonOutlineGeometry;
});
