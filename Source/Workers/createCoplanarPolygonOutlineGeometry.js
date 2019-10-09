define([
        '../Core/CoplanarPolygonOutlineGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        CoplanarPolygonOutlineGeometry,
        defined,
        Ellipsoid) {
    'use strict';

    function createCoplanarPolygonOutlineGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonOutlineGeometry.unpack(polygonGeometry, offset);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return CoplanarPolygonOutlineGeometry.createGeometry(polygonGeometry);
    }

    return createCoplanarPolygonOutlineGeometry;
});
